import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  TrendingUp,
  DollarSign,
  Boxes,
  X,
} from 'lucide-react';

import {
  supabase,
  type Product,
  type Sale,
} from '@/lib/supabase';

import { formatUGX } from '@/lib/format';

type ProductRow = Product & {
  description?: string | null;
};

type ProductForm = {
  name: string;
  category: string;
  description: string;
  buyingPrice: string;
  sellingPrice: string;
  quantity: string;
  minStockLevel: string;
};

type SaleSummary = {
  quantitySold: number;
  profit: number;
};

const emptyForm: ProductForm = {
  name: '',
  category: '',
  description: '',
  buyingPrice: '',
  sellingPrice: '',
  quantity: '',
  minStockLevel: '5',
};

function Products() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductRow | null>(null);

  const [form, setForm] = useState<ProductForm>(emptyForm);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [productsRes, salesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true }),

        supabase
          .from('sales')
          .select(
            'id, user_id, product_id, product_name, quantity, unit_price, total_amount, profit_amount, sale_date, is_sample, created_at'
          )
          .order('sale_date', { ascending: false }),
      ]);

      if (productsRes.error) {
        throw productsRes.error;
      }

      if (salesRes.error) {
        throw salesRes.error;
      }

      setProducts((productsRes.data || []) as ProductRow[]);
      setSales((salesRes.data || []) as Sale[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * IMPORTANT:
   * Sold quantity and profit are calculated from the SALES table.
   *
   * This means Products does not depend on products.quantity_sold
   * being updated correctly after every sale.
   */
  const salesByProduct = useMemo(() => {
    const summary: Record<string, SaleSummary> = {};

    for (const sale of sales) {
      if (!sale.product_id) continue;

      if (!summary[sale.product_id]) {
        summary[sale.product_id] = {
          quantitySold: 0,
          profit: 0,
        };
      }

      const quantity = Number(sale.quantity || 0);

      summary[sale.product_id].quantitySold += quantity;

      /*
       * Use the stored profit_amount when available.
       *
       * For old sales where profit_amount was 0,
       * calculate the profit from the product's current buying price.
       */
      let saleProfit = Number(sale.profit_amount || 0);

      if (saleProfit === 0) {
        const product = products.find(
          (p) => p.id === sale.product_id
        );

        if (product) {
          saleProfit =
            (Number(sale.unit_price || 0) -
              Number(product.buying_price || 0)) *
            quantity;
        }
      }

      summary[sale.product_id].profit += saleProfit;
    }

    return summary;
  }, [sales, products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        (product.category || '')
          .toLowerCase()
          .includes(term) ||
        (product.description || '')
          .toLowerCase()
          .includes(term)
      );
    });
  }, [products, search]);

  const totals = useMemo(() => {
    let unitsRemaining = 0;
    let stockValue = 0;
    let totalProfit = 0;
    let totalSold = 0;

    for (const product of products) {
      const quantity = Number(product.quantity || 0);
      const buyingPrice = Number(product.buying_price || 0);

      const saleSummary = salesByProduct[product.id] || {
        quantitySold: 0,
        profit: 0,
      };

      unitsRemaining += quantity;
      stockValue += quantity * buyingPrice;
      totalSold += saleSummary.quantitySold;
      totalProfit += saleSummary.profit;
    }

    return {
      totalProducts: products.length,
      unitsRemaining,
      stockValue,
      totalSold,
      totalProfit,
    };
  }, [products, salesByProduct]);

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEditModal(product: ProductRow) {
    setEditingProduct(product);

    setForm({
      name: product.name || '',
      category: product.category || '',
      description: product.description || '',
      buyingPrice: String(product.buying_price ?? ''),
      sellingPrice: String(product.selling_price ?? ''),
      quantity: String(product.quantity ?? ''),
      minStockLevel: String(product.min_stock_level ?? 5),
    });

    setError('');
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function updateForm(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      const name = form.name.trim();
      const category = form.category.trim();
      const description = form.description.trim();

      const buyingPrice = Number(form.buyingPrice);
      const sellingPrice = Number(form.sellingPrice);
      const quantity = Number(form.quantity);
      const minStockLevel = Number(form.minStockLevel);

      if (!name) {
        throw new Error('Product name is required.');
      }

      if (
        !Number.isFinite(buyingPrice) ||
        buyingPrice < 0
      ) {
        throw new Error('Enter a valid buying price.');
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        throw new Error('Enter a valid selling price.');
      }

      if (
        !Number.isFinite(quantity) ||
        quantity < 0
      ) {
        throw new Error('Enter a valid quantity.');
      }

      if (
        !Number.isFinite(minStockLevel) ||
        minStockLevel < 0
      ) {
        throw new Error('Enter a valid minimum stock level.');
      }

      if (editingProduct) {
        const { data, error: updateError } = await supabase
          .from('products')
          .update({
            name,
            category: category || null,
            description: description || null,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            min_stock_level: minStockLevel,
          })
          .eq('id', editingProduct.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        if (!data) {
          throw new Error(
            'Product could not be updated.'
          );
        }
      } else {
        const {
          data: {
            user,
          },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            'You must be logged in to add a product.'
          );
        }

        const { data, error: insertError } =
          await supabase
            .from('products')
            .insert({
              user_id: user.id,
              name,
              category: category || null,
              description: description || null,
              buying_price: buyingPrice,
              selling_price: sellingPrice,
              quantity,
              quantity_sold: 0,
              min_stock_level: minStockLevel,
              is_sample: false,
            })
            .select()
            .single();

        if (insertError) {
          throw insertError;
        }

        if (!data) {
          throw new Error(
            'Product could not be added.'
          );
        }
      }

      closeModal();
      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save product.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: ProductRow) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis will remove the product from your product list. Existing sales transactions will not be deleted.`
    );

    if (!confirmed) return;

    try {
      setError('');

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) {
        throw deleteError;
      }

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete product.'
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Package
            size={40}
            className="mx-auto text-emerald-600"
          />
          <p className="mt-4 text-slate-600">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Products
          </h1>

          <p className="mt-1 text-slate-500">
            Manage your products, stock, sales and profits.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <div className="flex-1 text-sm">
            {error}
          </div>

          <button
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Products
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {totals.totalProducts}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Units Remaining
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {totals.unitsRemaining}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Boxes size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Stock Value
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatUGX(totals.stockValue)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Profit
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-600">
                {formatUGX(totals.totalProfit)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Package
            size={42}
            className="mx-auto text-slate-300"
          />

          <h3 className="mt-4 text-lg font-semibold text-slate-800">
            {search
              ? 'No products found'
              : 'No products yet'}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {search
              ? 'Try a different search term.'
              : 'Add your first product to start managing inventory.'}
          </p>

          {!search && (
            <button
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Buying Price
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Selling Price
                    </th>

                    <th className="text-center px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Remaining
                    </th>

                    <th className="text-center px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sold
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Profit Made
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const summary =
                      salesByProduct[product.id] || {
                        quantitySold: 0,
                        profit: 0,
                      };

                    const quantity =
                      Number(product.quantity || 0);

                    const minStock =
                      Number(
                        product.min_stock_level || 0
                      );

                    const lowStock =
                      quantity <= minStock;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {product.name}
                            </p>

                            {product.description && (
                              <p className="mt-1 text-xs text-slate-400 max-w-xs truncate">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.category || '—'}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          {formatUGX(
                            Number(product.buying_price || 0)
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-800">
                          {formatUGX(
                            Number(product.selling_price || 0)
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-10 px-2.5 py-1 rounded-full text-sm font-semibold ${
                              lowStock
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {quantity}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                          {summary.quantitySold}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">
                          {formatUGX(summary.profit)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                openEditModal(product)
                              }
                              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="Edit product"
                            >
                              <Pencil size={18} />
                            </button>

                            <button
                              onClick={() =>
                                deleteProduct(product)
                              }
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Delete product"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredProducts.map((product) => {
              const summary =
                salesByProduct[product.id] || {
                  quantitySold: 0,
                  profit: 0,
                };

              const quantity =
                Number(product.quantity || 0);

              const minStock =
                Number(product.min_stock_level || 0);

              const lowStock =
                quantity <= minStock;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {product.name}
                      </h3>

                      <p className="text-sm text-slate-500 mt-1">
                        {product.category || 'No category'}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          openEditModal(product)
                        }
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() =>
                          deleteProduct(product)
                        }
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">
                        Buying Price
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatUGX(
                          Number(product.buying_price || 0)
                        )}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">
                        Selling Price
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatUGX(
                          Number(product.selling_price || 0)
                        )}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">
                        Remaining
                      </p>
                      <p
                        className={`mt-1 font-semibold ${
                          lowStock
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {quantity}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">
                        Sold
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {summary.quantitySold}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-700">
                      Profit Made
                    </p>

                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      {formatUGX(summary.profit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {editingProduct
                    ? 'Update the product information.'
                    : 'Add a new product to your inventory.'}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveProduct}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Product Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    updateForm('name', e.target.value)
                  }
                  placeholder="e.g. Cassava flour"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Category
                  </label>

                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      updateForm(
                        'category',
                        e.target.value
                      )
                    }
                    placeholder="e.g. Food"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) =>
                      updateForm(
                        'minStockLevel',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateForm(
                      'description',
                      e.target.value
                    )
                  }
                  placeholder="Optional product description"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none resize-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Buying Price (UGX)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.buyingPrice}
                    onChange={(e) =>
                      updateForm(
                        'buyingPrice',
                        e.target.value
                      )
                    }
                    placeholder="2000"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Selling Price (UGX)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      updateForm(
                        'sellingPrice',
                        e.target.value
                      )
                    }
                    placeholder="2500"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Quantity in Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(e) =>
                    updateForm(
                      'quantity',
                      e.target.value
                    )
                  }
                  placeholder="100"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {editingProduct && (
                  <p className="mt-2 text-xs text-slate-500">
                    Current remaining stock:{' '}
                    {editingProduct.quantity}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                    ? 'Save Changes'
                    : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;