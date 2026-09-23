import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  X,
} from 'lucide-react';
import { supabase, type Product } from '@/lib/supabase';
import { formatUGX } from '@/lib/format';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
} from '@/components/ui';

const CATEGORIES = [
  'Food',
  'Drinks',
  'Household',
  'Toiletries',
  'Stationery',
  'Other',
];

const UNITS = [
  'Piece',
  'Kg',
  'Gram',
  'Litre',
  'Bottle',
  'Water Bottle',
  'Pack',
  'Box',
  'Bag',
  'Sack',
  'Pair',
  'Set',
  'Other',
];

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: 'Food',
    customCategory: '',
    unit: 'Piece',
    customUnit: '',
    buying_price: '',
    selling_price: '',
    quantity: '',
    min_stock_level: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in to view inventory.');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products'
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingProduct(null);

    setForm({
      name: '',
      category: 'Food',
      customCategory: '',
      unit: 'Piece',
      customUnit: '',
      buying_price: '',
      selling_price: '',
      quantity: '',
      min_stock_level: '',
    });

    setFormError('');
    setShowForm(true);
  }

  function openEditForm(p: Product) {
    setEditingProduct(p);

    const savedCategory = p.category || 'Other';
    const savedUnit = p.unit || 'Piece';

    const isStandardCategory = CATEGORIES.includes(savedCategory);
    const isStandardUnit = UNITS.includes(savedUnit);

    setForm({
      name: p.name,
      category: isStandardCategory ? savedCategory : 'Other',
      customCategory: isStandardCategory ? '' : savedCategory,
      unit: isStandardUnit ? savedUnit : 'Other',
      customUnit: isStandardUnit ? '' : savedUnit,
      buying_price: String(p.buying_price),
      selling_price: String(p.selling_price),
      quantity: String(p.quantity),
      min_stock_level: String(p.min_stock_level),
    });

    setFormError('');
    setShowForm(true);
  }

  async function saveProduct() {
    setFormError('');
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError(
        'You must be logged in to save a product.'
      );
      return;
    }

    const buyingPrice = parseInt(form.buying_price);
    const sellingPrice = parseInt(form.selling_price);
    const quantity = parseInt(form.quantity);
    const minStock = parseInt(form.min_stock_level);

    const finalCategory =
      form.category === 'Other'
        ? form.customCategory.trim()
        : form.category;

    const finalUnit =
      form.unit === 'Other'
        ? form.customUnit.trim()
        : form.unit;

    if (!form.name.trim()) {
      setFormError('Product name is required');
      return;
    }

    if (!finalCategory) {
      setFormError('Enter a custom category');
      return;
    }

    if (!finalUnit) {
      setFormError('Enter a custom unit');
      return;
    }

    if (isNaN(buyingPrice) || buyingPrice < 0) {
      setFormError('Enter a valid buying price');
      return;
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setFormError('Enter a valid selling price');
      return;
    }

    if (sellingPrice < buyingPrice) {
      setFormError(
        'Selling price cannot be lower than buying price'
      );
      return;
    }

    if (isNaN(quantity) || quantity < 0) {
      setFormError('Enter a valid quantity');
      return;
    }

    if (isNaN(minStock) || minStock < 0) {
      setFormError('Enter a valid minimum stock level');
      return;
    }

    setSaving(true);

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: form.name.trim(),
            category: finalCategory,
            unit: finalUnit,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            min_stock_level: minStock,
          })
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            name: form.name.trim(),
            category: finalCategory,
            unit: finalUnit,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            quantity_sold: 0,
            min_stock_level: minStock,
            is_sample: false,
          });

        if (error) {
          throw error;
        }
      }

      setShowForm(false);
      setEditingProduct(null);

      setForm({
        name: '',
        category: 'Food',
        customCategory: '',
        unit: 'Piece',
        customUnit: '',
        buying_price: '',
        selling_price: '',
        quantity: '',
        min_stock_level: '',
      });

      await loadProducts();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save product'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(p: Product) {
    if (
      !confirm(
        `Delete "${p.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert('You must be logged in to delete a product.');
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', p.id)
      .eq('user_id', user.id);

    if (error) {
      alert('Failed to delete: ' + error.message);
      return;
    }

    await loadProducts();
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (p.unit || '')
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Manage your products and stock"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <Button
          onClick={openAddForm}
          className="flex items-center gap-2 justify-center"
        >
          <Plus size={20} />
          Add Product
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          title="No products found"
          description={
            search
              ? 'Try changing your search.'
              : 'Add your first product to start managing inventory.'
          }
          action={
            !search ? (
              <Button
                onClick={openAddForm}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                Add Product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Product
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Category
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Unit
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Buying Price
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Selling Price
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Profit Made
                  </th>

                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Stock
                  </th>

                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => {
                  const isLowStock =
                    p.quantity <= p.min_stock_level;

                  const quantitySold =
                    Number(p.quantity_sold || 0);

                  const profitPerUnit =
                    Number(p.selling_price || 0) -
                    Number(p.buying_price || 0);

                  const profitMade =
                    profitPerUnit * quantitySold;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Package
                              size={20}
                              className="text-emerald-600"
                            />
                          </div>

                          <div>
                            <p className="font-medium text-slate-800">
                              {p.name}
                            </p>

                            {p.description && (
                              <p className="text-xs text-slate-500">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <Badge variant="default">
                          {p.category || 'Other'}
                        </Badge>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {p.unit || 'Piece'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {formatUGX(p.buying_price)}
                          <span className="text-xs text-slate-400">
                            {' '}
                            / {p.unit || 'Piece'}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-800">
                          {formatUGX(p.selling_price)}
                          <span className="text-xs text-slate-400">
                            {' '}
                            / {p.unit || 'Piece'}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatUGX(profitMade)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {quantitySold.toLocaleString()}{' '}
                            {p.unit || 'Piece'} sold
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isLowStock && (
                            <AlertTriangle
                              size={17}
                              className="text-amber-500"
                            />
                          )}

                          <div>
                            <p
                              className={`text-sm font-medium ${
                                isLowStock
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {p.quantity} {p.unit || 'Piece'}
                            </p>

                            <p className="text-xs text-slate-400">
                              Min: {p.min_stock_level}{' '}
                              {p.unit || 'Piece'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(p)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Edit product"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProduct(p)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Delete product"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Enter the product and stock details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <Input
                label="Product Name"
                value={form.name}
                onChange={(v) =>
                  setForm({
                    ...form,
                    name: v,
                  })
                }
                placeholder="e.g. Cassava Flour"
              />

              <Select
                label="Category"
                value={form.category}
                onChange={(v) =>
                  setForm({
                    ...form,
                    category: v,
                  })
                }
                options={CATEGORIES.map(
                  (c) => ({
                    value: c,
                    label: c,
                  })
                )}
              />

              {form.category === 'Other' && (
                <Input
                  label="Custom Category"
                  value={form.customCategory}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      customCategory: v,
                    })
                  }
                  placeholder="Enter your category"
                />
              )}

              <Select
                label="Unit"
                value={form.unit}
                onChange={(v) =>
                  setForm({
                    ...form,
                    unit: v,
                  })
                }
                options={UNITS.map(
                  (u) => ({
                    value: u,
                    label: u,
                  })
                )}
              />

              {form.unit === 'Other' && (
                <Input
                  label="Custom Unit"
                  value={form.customUnit}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      customUnit: v,
                    })
                  }
                  placeholder="e.g. Tray, Crate, Bundle"
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Buying Price"
                  type="number"
                  value={form.buying_price}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      buying_price: v,
                    })
                  }
                  placeholder="0"
                />

                <Input
                  label="Selling Price"
                  type="number"
                  value={form.selling_price}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      selling_price: v,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      quantity: v,
                    })
                  }
                  placeholder="0"
                />

                <Input
                  label="Minimum Stock Level"
                  type="number"
                  value={form.min_stock_level}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      min_stock_level: v,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-200 bg-slate-50">
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                onClick={saveProduct}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                    ? 'Update Product'
                    : 'Save Product'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}