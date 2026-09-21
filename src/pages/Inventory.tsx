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
      const { data, error } = await supabase
        .from('products')
        .select('*')
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

    setForm({
      name: p.name,
      category: p.category,
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

    // Get logged-in user
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

    // Validate product name
    if (!form.name.trim()) {
      setFormError('Product name is required');
      return;
    }

    // Validate buying price
    if (isNaN(buyingPrice) || buyingPrice < 0) {
      setFormError('Enter a valid buying price');
      return;
    }

    // Validate selling price
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setFormError('Enter a valid selling price');
      return;
    }

    // Validate quantity
    if (isNaN(quantity) || quantity < 0) {
      setFormError('Enter a valid quantity');
      return;
    }

    // Validate minimum stock
    if (isNaN(minStock) || minStock < 0) {
      setFormError('Enter a valid minimum stock level');
      return;
    }

    setSaving(true);

    try {
      if (editingProduct) {
        // Update only the logged-in user's product
        const { error } = await supabase
          .from('products')
          .update({
            name: form.name.trim(),
            category: form.category,
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
        // Create a new product belonging to the logged-in user
        const { error } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            name: form.name.trim(),
            category: form.category,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            min_stock_level: minStock,
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

    // Get logged-in user
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
      p.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      p.category
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

      {/* Search and Add Product */}
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

      {/* Product List */}
      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            message={
              search
                ? 'No products match your search'
                : 'No products yet. Tap "Add Product" to start.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const isLow =
              p.quantity <= p.min_stock_level;

            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isLow
                          ? 'bg-amber-100'
                          : 'bg-emerald-100'
                      }`}
                    >
                      <Package
                        size={20}
                        className={
                          isLow
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">
                        {p.name}
                      </h3>

                      <p className="text-sm text-slate-500">
                        {p.category}
                      </p>
                    </div>
                  </div>

                  {p.is_sample && (
                    <Badge color="blue">
                      Demo
                    </Badge>
                  )}
                </div>

                {/* Product information */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div>
                    <p className="text-slate-400">
                      Buying Price
                    </p>
                    <p className="font-semibold text-slate-700">
                      {formatUGX(p.buying_price)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">
                      Selling Price
                    </p>
                    <p className="font-semibold text-slate-700">
                      {formatUGX(p.selling_price)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">
                      In Stock
                    </p>
                    <p
                      className={`font-semibold ${
                        isLow
                          ? 'text-amber-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {p.quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">
                      Min. Level
                    </p>
                    <p className="font-semibold text-slate-700">
                      {p.min_stock_level}
                    </p>
                  </div>
                </div>

                {/* Low stock warning */}
                {isLow && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-50">
                    <AlertTriangle
                      size={16}
                      className="text-amber-600"
                    />

                    <span className="text-sm text-amber-700 font-medium">
                      Low stock — restock soon
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => openEditForm(p)}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Pencil size={16} />
                    Edit
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() => deleteProduct(p)}
                    className="flex items-center justify-center px-4"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <Card className="w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingProduct
                  ? 'Edit Product'
                  : 'Add Product'}
              </h3>

              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form error */}
            {formError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Product Name"
                value={form.name}
                onChange={(v) =>
                  setForm({
                    ...form,
                    name: v,
                  })
                }
                placeholder="e.g. Sugar (1kg)"
                required
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
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Buying Price (Ugx)"
                  type="number"
                  value={form.buying_price}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      buying_price: v,
                    })
                  }
                  placeholder="0"
                  min="0"
                  required
                />

                <Input
                  label="Selling Price (Ugx)"
                  type="number"
                  value={form.selling_price}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      selling_price: v,
                    })
                  }
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity in Stock"
                  type="number"
                  value={form.quantity}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      quantity: v,
                    })
                  }
                  placeholder="0"
                  min="0"
                  required
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
                  placeholder="5"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Modal buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button
                onClick={saveProduct}
                disabled={saving}
                className="flex-1"
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                    ? 'Update'
                    : 'Add Product'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}