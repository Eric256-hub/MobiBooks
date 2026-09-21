import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Check,
  AlertCircle,
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

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date: toLocalDateInput(new Date()),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [prodRes, salesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true }),

        supabase
          .from('sales')
          .select('*')
          .order('sale_date', { ascending: false })
          .limit(5),
      ]);

      if (prodRes.error) {
        throw prodRes.error;
      }

      if (salesRes.error) {
        throw salesRes.error;
      }

      setProducts((prodRes.data || []) as Product[]);
      setRecentSales((salesRes.data || []) as Sale[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedProduct = products.find(
    (product) => product.id === form.product_id
  );

  const qty = parseInt(form.quantity) || 0;

  const unitPrice =
    parseInt(form.unit_price) || 0;

  const total = qty * unitPrice;

  const profitPerUnit = selectedProduct
    ? unitPrice -
      Number(selectedProduct.buying_price)
    : 0;

  const saleProfit = profitPerUnit * qty;

  function onProductChange(id: string) {
    const product = products.find(
      (item) => item.id === id
    );

    setForm({
      ...form,
      product_id: id,
      unit_price: product
        ? String(product.selling_price)
        : '',
    });

    setFormError('');
    setSuccess(false);
  }

  async function saveSale() {
    setFormError('');
    setSuccess(false);

    if (!form.product_id) {
      setFormError('Please select a product');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setFormError('Enter a valid quantity');
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      setFormError('Enter a valid selling price');
      return;
    }

    if (!selectedProduct) {
      setFormError('Product not found');
      return;
    }

    const currentStock = Number(
      selectedProduct.quantity || 0
    );

    if (qty > currentStock) {
      setFormError(
        `Only ${currentStock} in stock. You cannot sell more than available.`
      );
      return;
    }

    const buyingPrice = Number(
      selectedProduct.buying_price || 0
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
      // Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          'You must be logged in to record a sale.'
        );
      }

      // Calculate values
      const newQuantity =
        currentStock - qty;

      const currentQuantitySold = Number(
        selectedProduct.quantity_sold || 0
      );

      const newQuantitySold =
        currentQuantitySold + qty;

      const calculatedProfit =
        (unitPrice - buyingPrice) * qty;

      const saleDate = new Date(
        `${form.sale_date}T${new Date()
          .toTimeString()
          .slice(0, 8)}`
      ).toISOString();

      /*
       * STEP 1
       * Save the sale
       */
      const { data: savedSale, error: saleError } =
        await supabase
          .from('sales')
          .insert({
            user_id: user.id,
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            quantity: qty,
            unit_price: unitPrice,
            total_amount: total,
            profit_amount: calculatedProfit,
            sale_date: saleDate,
            is_sample: false,
          })
          .select()
          .single();

      if (saleError) {
        throw saleError;
      }

      if (!savedSale) {
        throw new Error(
          'The sale could not be saved.'
        );
      }

      /*
       * STEP 2
       * Update stock and quantity sold.
       *
       * We update by product ID rather than requiring
       * user_id to match. This also supports older
       * products that were created before user_id
       * was being saved.
       */
      const {
        data: updatedProduct,
        error: updateError,
      } = await supabase
        .from('products')
        .update({
          quantity: newQuantity,
          quantity_sold: newQuantitySold,
        })
        .eq('id', selectedProduct.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedProduct) {
        throw new Error(
          'The sale was saved, but the product stock could not be updated.'
        );
      }

      /*
       * SUCCESS
       */
      setSuccess(true);

      setForm({
        product_id: '',
        quantity: '',
        unit_price: '',
        sale_date: toLocalDateInput(
          new Date()
        ),
      });

      await loadData();
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
    return <ErrorState message={error} />;
  }

  const availableProducts =
    products.filter(
      (product) =>
        Number(product.quantity) > 0
    );

  return (
    <div>
      <PageHeader
        title="Record a Sale"
        subtitle="Enter the details of what you sold today"
      />

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
              Profit was recorded and stock was
              updated.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2">
          <Card className="p-6">

            <div className="space-y-4">

              <Select
                label="Select Product"
                value={form.product_id}
                onChange={onProductChange}
                options={availableProducts.map(
                  (product) => ({
                    value: product.id,
                    label: `${product.name} (${product.quantity} in stock)`,
                  })
                )}
                placeholder="-- Choose a product --"
                required
              />

              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <div className="px-4 py-3 rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Available Stock
                    </span>

                    <p className="font-bold text-slate-700 mt-1">
                      {selectedProduct.quantity}
                    </p>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Buying Price
                    </span>

                    <p className="font-bold text-slate-700 mt-1">
                      {formatUGX(
                        Number(
                          selectedProduct.buying_price
                        )
                      )}
                    </p>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500">
                      Selling Price
                    </span>

                    <p className="font-bold text-emerald-600 mt-1">
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
                      unit_price: value,
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

              <div className="px-4 py-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-emerald-800">
                    Total Sale
                  </span>

                  <span className="text-2xl font-bold text-emerald-700">
                    {formatUGX(total)}
                  </span>
                </div>
              </div>

              {selectedProduct && qty > 0 && (
                <div className="px-4 py-4 rounded-xl bg-blue-50 border border-blue-200">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-base font-semibold text-blue-800">
                        Profit From This Sale
                      </p>

                      <p className="text-xs text-blue-600 mt-1">
                        {formatUGX(
                          profitPerUnit
                        )}{' '}
                        profit per unit × {qty}
                      </p>
                    </div>

                    <span className="text-2xl font-bold text-blue-700">
                      {formatUGX(saleProfit)}
                    </span>

                  </div>

                </div>
              )}

              <Button
                onClick={saveSale}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />

                {saving
                  ? 'Saving...'
                  : 'Save Sale'}
              </Button>

            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5">

            <h3 className="font-bold text-slate-800 mb-4">
              Recent Sales
            </h3>

            {recentSales.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No sales recorded yet
              </p>
            ) : (
              <div className="space-y-3">

                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-3 border-b border-slate-100 last:border-0"
                  >

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="font-medium text-slate-700 text-sm">
                          {sale.product_name}
                        </p>

                        <p className="text-xs text-slate-400">
                          Qty: {sale.quantity} @{' '}
                          {formatUGX(
                            Number(
                              sale.unit_price
                            )
                          )}
                        </p>
                      </div>

                      <span className="font-bold text-emerald-600 text-sm">
                        {formatUGX(
                          Number(
                            sale.total_amount
                          )
                        )}
                      </span>

                    </div>

                    <div className="mt-2 flex items-center justify-between">

                      <span className="text-xs text-slate-400">
                        Profit
                      </span>

                      <span className="text-xs font-semibold text-blue-600">
                        {formatUGX(
                          Number(
                            sale.profit_amount || 0
                          )
                        )}
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </Card>
        </div>

      </div>
    </div>
  );
}