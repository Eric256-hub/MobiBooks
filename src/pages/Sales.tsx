import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Check,
  AlertCircle,
  Plus,
  ArrowLeft,
  TrendingUp,
  Package,
  CalendarDays,
} from 'lucide-react';

import {
  supabase,
  type Product,
  type Sale,
} from '@/lib/supabase';

import {
  formatUGX,
  toLocalDateInput,
} from '@/lib/format';

import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  LoadingSpinner,
  ErrorState,
} from '@/components/ui';

import type { DashboardPeriod } from '@/App';

type Props = {
  period: DashboardPeriod;
  onPeriodChange: (
    period: DashboardPeriod
  ) => void;
};

function getPeriodStart(
  period: DashboardPeriod
) {
  const now = new Date();

  if (period === 'today') {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  if (period === 'week') {
    const day = now.getDay();

    const difference =
      day === 0 ? 6 : day - 1;

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - difference
    );
  }

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
}

function isWithinPeriod(
  dateValue: string,
  period: DashboardPeriod
) {
  return (
    new Date(dateValue) >=
    getPeriodStart(period)
  );
}

function periodLabel(
  period: DashboardPeriod
) {
  if (period === 'today') return 'Today';
  if (period === 'week') return 'This Week';
  return 'This Month';
}

export default function Sales({
  period,
  onPeriodChange,
}: Props) {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [products, setProducts] =
    useState<Product[]>([]);

  const [allSales, setAllSales] =
    useState<Sale[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date:
      toLocalDateInput(new Date()),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [
        prodRes,
        salesRes,
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('sales')
          .select('*')
          .order('sale_date', {
            ascending: false,
          }),
      ]);

      if (prodRes.error)
        throw prodRes.error;

      if (salesRes.error)
        throw salesRes.error;

      setProducts(
        (prodRes.data ||
          []) as Product[]
      );

      setAllSales(
        (salesRes.data ||
          []) as Sale[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load sales'
      );
    } finally {
      setLoading(false);
    }
  }

  const periodSales = useMemo(
    () =>
      allSales.filter((sale) =>
        isWithinPeriod(
          sale.sale_date,
          period
        )
      ),
    [allSales, period]
  );

  const totalSales =
    periodSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total_amount || 0
        ),
      0
    );

  const totalProfit =
    periodSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.profit_amount || 0
        ),
      0
    );

  const totalQuantity =
    periodSales.reduce(
      (sum, sale) =>
        sum +
        Number(sale.quantity || 0),
      0
    );

  const selectedProduct =
    products.find(
      (product) =>
        product.id ===
        form.product_id
    );

  const qty =
    parseInt(form.quantity) || 0;

  const unitPrice =
    parseInt(form.unit_price) || 0;

  const total =
    qty * unitPrice;

  const profitPerUnit =
    selectedProduct
      ? unitPrice -
        Number(
          selectedProduct.buying_price
        )
      : 0;

  const saleProfit =
    profitPerUnit * qty;

  function onProductChange(
    id: string
  ) {
    const product =
      products.find(
        (item) => item.id === id
      );

    setForm({
      ...form,
      product_id: id,
      unit_price: product
        ? String(
            product.selling_price
          )
        : '',
    });

    setFormError('');
    setSuccess(false);
  }

  async function saveSale() {
    setFormError('');
    setSuccess(false);

    if (!form.product_id) {
      setFormError(
        'Please select a product'
      );
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setFormError(
        'Enter a valid quantity'
      );
      return;
    }

    if (
      isNaN(unitPrice) ||
      unitPrice <= 0
    ) {
      setFormError(
        'Enter a valid selling price'
      );
      return;
    }

    if (!selectedProduct) {
      setFormError(
        'Product not found'
      );
      return;
    }

    const currentStock =
      Number(
        selectedProduct.quantity || 0
      );

    if (qty > currentStock) {
      setFormError(
        `Only ${currentStock} in stock. You cannot sell more than available.`
      );
      return;
    }

    const buyingPrice =
      Number(
        selectedProduct.buying_price ||
          0
      );

    if (unitPrice < buyingPrice) {
      setFormError(
        `The selling price cannot be below the buying price of ${formatUGX(
          buyingPrice
        )}.`
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          'You must be logged in to record a sale.'
        );
      }

      const newQuantity =
        currentStock - qty;

      const currentQuantitySold =
        Number(
          selectedProduct.quantity_sold ||
            0
        );

      const newQuantitySold =
        currentQuantitySold + qty;

      const calculatedProfit =
        (unitPrice - buyingPrice) *
        qty;

      const saleDate =
        new Date(
          `${form.sale_date}T${new Date()
            .toTimeString()
            .slice(0, 8)}`
        ).toISOString();

      const {
        data: savedSale,
        error: saleError,
      } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          product_id:
            selectedProduct.id,
          product_name:
            selectedProduct.name,
          quantity: qty,
          unit_price: unitPrice,
          total_amount: total,
          profit_amount:
            calculatedProfit,
          sale_date: saleDate,
          is_sample: false,
        })
        .select()
        .single();

      if (saleError)
        throw saleError;

      if (!savedSale) {
        throw new Error(
          'The sale could not be saved.'
        );
      }

      const {
        data: updatedProduct,
        error: updateError,
      } = await supabase
        .from('products')
        .update({
          quantity: newQuantity,
          quantity_sold:
            newQuantitySold,
        })
        .eq(
          'id',
          selectedProduct.id
        )
        .select()
        .single();

      if (updateError)
        throw updateError;

      if (!updatedProduct) {
        throw new Error(
          'The sale was saved, but the product stock could not be updated.'
        );
      }

      setSuccess(true);

      setForm({
        product_id: '',
        quantity: '',
        unit_price: '',
        sale_date:
          toLocalDateInput(
            new Date()
          ),
      });

      await loadData();

      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 1200);
    } catch (err) {
      console.error(err);

      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save sale'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorState message={error} />
    );
  }

  const availableProducts =
    products.filter(
      (product) =>
        Number(product.quantity) > 0
    );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <PageHeader
          title="Sales"
          subtitle="Track and manage your business sales"
        />

        <Button
          onClick={() => {
            setShowForm(true);
            setFormError('');
            setSuccess(false);
          }}
          className="flex items-center justify-center gap-2"
        >
          <Plus size={19} />
          Record New Sale
        </Button>
      </div>

      {/* PERIOD FILTER */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm flex w-full sm:w-fit">
        {(
          [
            ['today', 'Today'],
            ['week', 'This Week'],
            ['month', 'This Month'],
          ] as [
            DashboardPeriod,
            string
          ][]
        ).map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() =>
                onPeriodChange(
                  value
                )
              }
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                period === value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {periodLabel(period)} Sales
              </p>

              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatUGX(totalSales)}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShoppingCart
                size={21}
                className="text-emerald-600"
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Items Sold
              </p>

              <p className="text-2xl font-bold text-slate-900 mt-2">
                {totalQuantity}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package
                size={21}
                className="text-blue-600"
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Estimated Profit
              </p>

              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatUGX(totalProfit)}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
              <TrendingUp
                size={21}
                className="text-violet-600"
              />
            </div>
          </div>
        </Card>

      </div>

      {/* FORM */}
      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Record New Sale
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Enter the product and sale details.
              </p>
            </div>

            <button
              onClick={() =>
                setShowForm(false)
              }
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={16} />
              Back to Sales
            </button>
          </div>

          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <Check
                size={20}
                className="text-emerald-600"
              />

              <div>
                <p className="text-emerald-700 font-medium">
                  Sale saved successfully!
                </p>

                <p className="text-sm text-emerald-600">
                  Profit was recorded and stock was updated.
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
              <AlertCircle
                size={20}
                className="text-rose-600"
              />

              <p className="text-rose-700 font-medium">
                {formError}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="space-y-4">
              <Select
                label="Select Product"
                value={form.product_id}
                onChange={
                  onProductChange
                }
                options={availableProducts.map(
                  (product) => ({
                    value:
                      product.id,
                    label: `${product.name} (${product.quantity} in stock)`,
                  })
                )}
                placeholder="-- Choose a product --"
                required
              />

              {selectedProduct && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="px-3 py-3 rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Stock
                    </span>

                    <p className="font-bold text-slate-700 mt-1">
                      {selectedProduct.quantity}
                    </p>
                  </div>

                  <div className="px-3 py-3 rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Buying
                    </span>

                    <p className="font-bold text-slate-700 mt-1 text-sm">
                      {formatUGX(
                        Number(
                          selectedProduct.buying_price
                        )
                      )}
                    </p>
                  </div>

                  <div className="px-3 py-3 rounded-xl bg-emerald-50">
                    <span className="text-xs text-slate-500">
                      Selling
                    </span>

                    <p className="font-bold text-emerald-600 mt-1 text-sm">
                      {formatUGX(
                        Number(
                          selectedProduct.selling_price
                        )
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity Sold"
                  type="number"
                  value={form.quantity}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      quantity: value,
                    })
                  }
                  placeholder="0"
                  min="1"
                  required
                />

                <Input
                  label="Selling Price (UGX)"
                  type="number"
                  value={form.unit_price}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      unit_price:
                        value,
                    })
                  }
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={form.sale_date}
                onChange={(value) =>
                  setForm({
                    ...form,
                    sale_date: value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-4">

              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                    <ShoppingCart
                      size={19}
                      className="text-emerald-600"
                    />
                  </div>

                  <div>
                    <p className="font-semibold text-emerald-800">
                      Sale Summary
                    </p>

                    <p className="text-xs text-emerald-600">
                      Review before saving
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Quantity
                    </span>

                    <span className="font-semibold text-slate-800">
                      {qty}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Unit Price
                    </span>

                    <span className="font-semibold text-slate-800">
                      {formatUGX(
                        unitPrice
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-emerald-200 flex justify-between items-center">
                    <span className="font-semibold text-emerald-800">
                      Total Sale
                    </span>

                    <span className="text-2xl font-bold text-emerald-700">
                      {formatUGX(total)}
                    </span>
                  </div>

                  {selectedProduct &&
                    qty > 0 && (
                      <div className="pt-3 border-t border-emerald-200 flex justify-between">
                        <span className="text-sm text-blue-700">
                          Estimated Profit
                        </span>

                        <span className="font-bold text-blue-700">
                          {formatUGX(
                            saleProfit
                          )}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              <Button
                onClick={saveSale}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3"
              >
                <ShoppingCart size={20} />

                {saving
                  ? 'Saving...'
                  : 'Save Sale'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* SALES TABLE */}
      {!showForm && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {periodLabel(period)} Sales
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  All sales recorded during this period.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays size={17} />
                {periodSales.length}{' '}
                records
              </div>
            </div>
          </div>

          {periodSales.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <ShoppingCart
                  size={28}
                  className="text-slate-400"
                />
              </div>

              <h3 className="font-semibold text-slate-700 mt-4">
                No sales recorded
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                There are no sales recorded for{' '}
                {periodLabel(period).toLowerCase()}.
              </p>

              <Button
                onClick={() =>
                  setShowForm(true)
                }
                className="mt-5 inline-flex items-center gap-2"
              >
                <Plus size={17} />
                Record New Sale
              </Button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                        Product
                      </th>

                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                        Qty
                      </th>

                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                        Unit Price
                      </th>

                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                        Total
                      </th>

                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                        Profit
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {periodSales.map(
                      (sale) => (
                        <tr
                          key={sale.id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-700">
                                {sale.product_name}
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(
                                  sale.sale_date
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  }
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right font-medium text-slate-700">
                            {sale.quantity}
                          </td>

                          <td className="px-6 py-4 text-right text-slate-600">
                            {formatUGX(
                              Number(
                                sale.unit_price
                              )
                            )}
                          </td>

                          <td className="px-6 py-4 text-right font-bold text-emerald-600">
                            {formatUGX(
                              Number(
                                sale.total_amount
                              )
                            )}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold text-blue-600">
                            {formatUGX(
                              Number(
                                sale.profit_amount ||
                                  0
                              )
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                      <td
                        colSpan={3}
                        className="px-6 py-5 text-right font-bold text-emerald-800"
                      >
                        TOTAL SALES
                      </td>

                      <td className="px-6 py-5 text-right text-xl font-bold text-emerald-700">
                        {formatUGX(
                          totalSales
                        )}
                      </td>

                      <td className="px-6 py-5 text-right font-bold text-blue-700">
                        {formatUGX(
                          totalProfit
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden divide-y divide-slate-100">
                {periodSales.map(
                  (sale) => (
                    <div
                      key={sale.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-700">
                            {sale.product_name}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(
                              sale.sale_date
                            ).toLocaleDateString()}
                          </p>
                        </div>

                        <p className="font-bold text-emerald-600">
                          {formatUGX(
                            Number(
                              sale.total_amount
                            )
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div>
                          <p className="text-xs text-slate-400">
                            Quantity
                          </p>

                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {sale.quantity}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Unit Price
                          </p>

                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {formatUGX(
                              Number(
                                sale.unit_price
                              )
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Profit
                          </p>

                          <p className="text-sm font-semibold text-blue-600 mt-1">
                            {formatUGX(
                              Number(
                                sale.profit_amount ||
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <div className="p-5 bg-emerald-50">
                  <div className="flex justify-between">
                    <span className="font-bold text-emerald-800">
                      TOTAL SALES
                    </span>

                    <span className="text-xl font-bold text-emerald-700">
                      {formatUGX(
                        totalSales
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-blue-700">
                      Total Profit
                    </span>

                    <span className="font-bold text-blue-700">
                      {formatUGX(
                        totalProfit
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}