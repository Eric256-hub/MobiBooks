import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

import { supabase, type Product } from '@/lib/supabase';
import { formatUGX } from '@/lib/format';
import {
  PageHeader,
  Card,
  LoadingSpinner,
  ErrorState,
  EmptyState,
} from '@/components/ui';

type ProductWithUnit = Product & {
  unit?: string | null;
  quantity_sold?: number | null;
};

type ProductForm = {
  name: string;
  category: string;
  customCategory: string;
  unit: string;
  customUnit: string;
  description: string;
  buying_price: string;
  selling_price: string;
  quantity: string;
  min_stock_level: string;
};

const CATEGORY_GROUPS = [
  {
    label: 'Food & Agriculture',
    options: [
      'Food & Beverages',
      'Grocery',
      'Agriculture',
      'Restaurant & Food Services',
    ],
  },
  {
    label: 'Retail & Consumer',
    options: [
      'Clothing & Fashion',
      'Cosmetics & Beauty',
      'Household Items',
      'Stationery & Books',
      'General Merchandise',
    ],
  },
  {
    label: 'Technology & Trade',
    options: [
      'Electronics',
      'Hardware & Construction',
      'Automotive',
      'Mobile Money & Airtime',
    ],
  },
  {
    label: 'Health & Other Services',
    options: ['Pharmacy & Health', 'Other'],
  },
];

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(
  (group) => group.options
);

const UNITS_BY_CATEGORY: Record<string, string[]> = {
  'Food & Beverages': [
    'Kg',
    'Gram',
    'Litre',
    'Bottle',
    'Water Bottle',
    'Piece',
    'Pack',
    'Box',
    'Bag',
    'Sack',
  ],

  Grocery: [
    'Kg',
    'Gram',
    'Litre',
    'Bottle',
    'Water Bottle',
    'Piece',
    'Pack',
    'Box',
    'Bag',
    'Sack',
  ],

  Agriculture: [
    'Kg',
    'Gram',
    'Litre',
    'Bag',
    'Sack',
    'Piece',
    'Crate',
    'Bundle',
  ],

  'Restaurant & Food Services': [
    'Plate',
    'Cup',
    'Bottle',
    'Water Bottle',
    'Piece',
    'Serving',
    'Kg',
    'Litre',
  ],

  'Clothing & Fashion': [
    'Piece',
    'Pair',
    'Set',
    'Dozen',
  ],

  'Cosmetics & Beauty': [
    'Piece',
    'Bottle',
    'Tube',
    'Jar',
    'Pack',
    'Box',
  ],

  'Household Items': [
    'Piece',
    'Pair',
    'Set',
    'Pack',
    'Box',
    'Litre',
    'Kg',
    'Water Bottle',
  ],

  'Stationery & Books': [
    'Piece',
    'Pack',
    'Box',
    'Dozen',
    'Ream',
    'Set',
  ],

  'General Merchandise': [
    'Piece',
    'Pair',
    'Pack',
    'Box',
    'Set',
    'Kg',
    'Litre',
    'Bottle',
    'Water Bottle',
  ],

  Electronics: [
    'Piece',
    'Pair',
    'Set',
    'Box',
  ],

  'Hardware & Construction': [
    'Piece',
    'Kg',
    'Metre',
    'Roll',
    'Bag',
    'Box',
    'Pack',
    'Set',
  ],

  Automotive: [
    'Piece',
    'Litre',
    'Kg',
    'Pair',
    'Set',
    'Box',
  ],

  'Mobile Money & Airtime': [
    'Transaction',
    'Airtime',
    'Voucher',
  ],

  'Pharmacy & Health': [
    'Piece',
    'Tablet',
    'Capsule',
    'Bottle',
    'Box',
    'Pack',
    'Tube',
  ],

  Other: [
    'Piece',
    'Kg',
    'Gram',
    'Litre',
    'Metre',
    'Bottle',
    'Water Bottle',
    'Box',
    'Pack',
    'Bag',
    'Set',
  ],
};

const DEFAULT_UNITS = [
  'Piece',
  'Kg',
  'Gram',
  'Litre',
  'Metre',
  'Bottle',
  'Water Bottle',
  'Box',
  'Pack',
  'Bag',
  'Set',
];

const EMPTY_FORM: ProductForm = {
  name: '',
  category: '',
  customCategory: '',
  unit: 'Piece',
  customUnit: '',
  description: '',
  buying_price: '',
  selling_price: '',
  quantity: '',
  min_stock_level: '5',
};

function getUnitsForCategory(category: string) {
  return UNITS_BY_CATEGORY[category] || DEFAULT_UNITS;
}

function createEmptyForm(): ProductForm {
  return {
    ...EMPTY_FORM,
    unit: getUnitsForCategory('').includes('Piece')
      ? 'Piece'
      : DEFAULT_UNITS[0],
  };
}

export default function Products() {
  const [products, setProducts] = useState<ProductWithUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductWithUnit | null>(null);

  const [form, setForm] = useState<ProductForm>(
    createEmptyForm()
  );

  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to view your products.');
        return;
      }

      const { data, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (productsError) {
        throw productsError;
      }

      setProducts((data || []) as ProductWithUnit[]);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(
        err?.message ||
          'Failed to load products. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingProduct(null);
    setForm(createEmptyForm());
    setShowModal(true);
  }

  function openEditModal(product: ProductWithUnit) {
    const savedCategory = product.category || '';
    const savedUnit = product.unit || 'Piece';

    const categoryIsPredefined =
      ALL_CATEGORIES.includes(savedCategory);

    const selectedCategory = categoryIsPredefined
      ? savedCategory
      : 'Other';

    const customCategory = categoryIsPredefined
      ? ''
      : savedCategory;

    const categoryUnits = getUnitsForCategory(
      selectedCategory
    );

    const unitIsPredefined =
      categoryUnits.includes(savedUnit);

    const selectedUnit = unitIsPredefined
      ? savedUnit
      : 'Other';

    const customUnit = unitIsPredefined
      ? ''
      : savedUnit;

    setEditingProduct(product);

    setForm({
      name: product.name || '',
      category: selectedCategory,
      customCategory,
      unit: selectedUnit,
      customUnit,
      description: product.description || '',
      buying_price: String(product.buying_price ?? ''),
      selling_price: String(product.selling_price ?? ''),
      quantity: String(product.quantity ?? ''),
      min_stock_level: String(
        product.min_stock_level ?? 5
      ),
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setForm(createEmptyForm());
  }

  function handleCategoryChange(category: string) {
    const units = getUnitsForCategory(category);

    setForm((current) => ({
      ...current,
      category,
      customCategory:
        category === 'Other'
          ? current.customCategory
          : '',
      unit: units.includes(current.unit)
        ? current.unit
        : units[0] || 'Piece',
      customUnit:
        category === 'Other'
          ? current.customUnit
          : '',
    }));
  }

  function handleUnitChange(unit: string) {
    setForm((current) => ({
      ...current,
      unit,
      customUnit:
        unit === 'Other'
          ? current.customUnit
          : '',
    }));
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

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          'Your session has expired. Please log in again.'
        );
        return;
      }

      const name = form.name.trim();

      const category =
        form.category === 'Other'
          ? form.customCategory.trim()
          : form.category.trim();

      const unit =
        form.unit === 'Other'
          ? form.customUnit.trim()
          : form.unit.trim();

      const description =
        form.description.trim() || null;

      const buyingPrice = Number(
        form.buying_price
      );

      const sellingPrice = Number(
        form.selling_price
      );

      const quantity = Number(form.quantity);

      const minStockLevel = Number(
        form.min_stock_level
      );

      if (!name) {
        setError('Please enter the product name.');
        return;
      }

      if (!category) {
        setError(
          'Please select a category or enter a custom category.'
        );
        return;
      }

      if (!unit) {
        setError(
          'Please select a unit or enter a custom unit.'
        );
        return;
      }

      if (
        form.category === 'Other' &&
        !form.customCategory.trim()
      ) {
        setError('Please enter your custom category.');
        return;
      }

      if (
        form.unit === 'Other' &&
        !form.customUnit.trim()
      ) {
        setError('Please enter your custom unit.');
        return;
      }

      if (
        !Number.isFinite(buyingPrice) ||
        buyingPrice < 0
      ) {
        setError(
          'Please enter a valid buying price.'
        );
        return;
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        setError(
          'Please enter a valid selling price.'
        );
        return;
      }

      if (sellingPrice < buyingPrice) {
        setError(
          'Selling price cannot be lower than buying price.'
        );
        return;
      }

      if (!Number.isFinite(quantity) || quantity < 0) {
        setError(
          'Please enter a valid current stock quantity.'
        );
        return;
      }

      if (
        !Number.isFinite(minStockLevel) ||
        minStockLevel < 0
      ) {
        setError(
          'Please enter a valid minimum stock level.'
        );
        return;
      }

      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name,
            category,
            unit,
            description,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            min_stock_level: minStockLevel,
            user_id: user.id,
          })
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            name,
            category,
            unit,
            description,
            buying_price: buyingPrice,
            selling_price: sellingPrice,
            quantity,
            quantity_sold: 0,
            min_stock_level: minStockLevel,
            is_sample: false,
          });

        if (insertError) {
          throw insertError;
        }
      }

      await loadProducts();
      closeModal();
    } catch (err: any) {
      console.error('Error saving product:', err);

      setError(
        err?.message ||
          'Failed to save product. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          'Your session has expired. Please log in again.'
        );
        return;
      }

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      setProducts((current) =>
        current.filter(
          (product) => product.id !== deleteId
        )
      );

      setDeleteId(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);

      setError(
        err?.message ||
          'Failed to delete product. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      const values = [
        product.name,
        product.category,
        product.unit,
        product.description,
      ];

      return values.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [products, search]);

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.quantity || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity || 0) <=
      Number(product.min_stock_level || 0)
  ).length;

  const totalStockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.quantity || 0) *
        Number(product.buying_price || 0),
    0
  );

  const totalProfitMade = products.reduce(
    (total, product) => {
      const buyingPrice = Number(
        product.buying_price || 0
      );

      const sellingPrice = Number(
        product.selling_price || 0
      );

      const quantitySold = Number(
        product.quantity_sold || 0
      );

      const profitPerUnit =
        sellingPrice - buyingPrice;

      return (
        total +
        profitPerUnit * quantitySold
      );
    },
    0
  );

  const availableUnits = getUnitsForCategory(
    form.category
  );

  return (
    <div className="space-y-6">
      {/* HEADER + ADD PRODUCT BUTTON */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Products"
          description="Manage your products, prices, stock and units."
        />

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {error && (
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={loadProducts}
        />
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Package size={24} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Products
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {totalProducts}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-500">
              Total Stock
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalStock.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-500">
              Low Stock
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                lowStockProducts > 0
                  ? 'text-amber-600'
                  : 'text-gray-900'
              }`}
            >
              {lowStockProducts}
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-500">
              Stock Value
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatUGX(totalStockValue)}
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-500">
              Profit Made
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-600">
              {formatUGX(totalProfitMade)}
            </p>
          </div>
        </Card>
      </div>

      {/* SEARCH */}
      <Card>
        <div className="relative">
          <Search
            size={19}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search products, categories, units..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </Card>

      {/* PRODUCTS TABLE */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                search
                  ? 'No products found'
                  : 'No products yet'
              }
              message={
                search
                  ? 'Try a different search term.'
                  : 'Add your first product to start managing your stock.'
              }
              action={
                !search ? (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Plus size={18} />
                    Add Product
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Product
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Unit
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Buying Price
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Selling Price
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Profit Made
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stock
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map((product) => {
                  const quantity = Number(
                    product.quantity || 0
                  );

                  const minimum = Number(
                    product.min_stock_level || 0
                  );

                  const buyingPrice = Number(
                    product.buying_price || 0
                  );

                  const sellingPrice = Number(
                    product.selling_price || 0
                  );

                  const quantitySold = Number(
                    product.quantity_sold || 0
                  );

                  const profitMade =
                    (sellingPrice - buyingPrice) *
                    quantitySold;

                  const isLowStock =
                    quantity <= minimum;

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Package size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {product.name}
                            </p>

                            {product.description && (
                              <p className="max-w-xs truncate text-xs text-gray-500">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {product.category || '—'}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {product.unit || 'Piece'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                        {formatUGX(
                          buyingPrice
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatUGX(
                          sellingPrice
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatUGX(
                              profitMade
                            )}
                          </p>

                          <p className="text-xs text-gray-400">
                            {quantitySold.toLocaleString()}{' '}
                            {product.unit || 'Piece'} sold
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isLowStock
                                ? 'text-amber-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {quantity.toLocaleString()}
                          </span>

                          <span className="text-xs text-gray-500">
                            {product.unit || 'Piece'}
                          </span>

                          {isLowStock && (
                            <AlertTriangle
                              size={16}
                              className="text-amber-500"
                            />
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(product)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit product"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteId(product.id)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingProduct
                    ? 'Update your product information and stock.'
                    : 'Add a product to your inventory.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {/* PRODUCT NAME */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Product Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      'name',
                      event.target.value
                    )
                  }
                  placeholder="e.g. Cassava Flour"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              {/* CATEGORY + UNIT */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      handleCategoryChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    <option value="">
                      Select category
                    </option>

                    {CATEGORY_GROUPS.map((group) => (
                      <optgroup
                        key={group.label}
                        label={group.label}
                      >
                        {group.options.map(
                          (category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          )
                        )}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Unit
                  </label>

                  <select
                    value={form.unit}
                    onChange={(event) =>
                      handleUnitChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    {availableUnits.map((unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {unit}
                      </option>
                    ))}

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>
              </div>

              {/* CUSTOM CATEGORY */}
              {form.category === 'Other' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Custom Category
                  </label>

                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={(event) =>
                      updateForm(
                        'customCategory',
                        event.target.value
                      )
                    }
                    placeholder="Enter your category"
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              )}

              {/* CUSTOM UNIT */}
              {form.unit === 'Other' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Custom Unit
                  </label>

                  <input
                    type="text"
                    value={form.customUnit}
                    onChange={(event) =>
                      updateForm(
                        'customUnit',
                        event.target.value
                      )
                    }
                    placeholder="e.g. Basin, Bucket, Tray"
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />

                  <p className="mt-1.5 text-xs text-gray-500">
                    Enter the unit you normally use to
                    sell or measure this product.
                  </p>
                </div>
              )}

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Description
                  <span className="ml-1 font-normal text-gray-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      'description',
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Add a short description..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* PRICES */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Buying Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      UGX
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.buying_price}
                      onChange={(event) =>
                        updateForm(
                          'buying_price',
                          event.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-200 py-3 pl-14 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Selling Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      UGX
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.selling_price}
                      onChange={(event) =>
                        updateForm(
                          'selling_price',
                          event.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-200 py-3 pl-14 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* PRICING PREVIEW */}
              {(form.buying_price ||
                form.selling_price) && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Profit Per{' '}
                        {form.unit === 'Other'
                          ? form.customUnit ||
                            'Unit'
                          : form.unit}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Selling price minus buying price
                      </p>
                    </div>

                    <p className="text-lg font-bold text-emerald-600">
                      {formatUGX(
                        Math.max(
                          0,
                          Number(
                            form.selling_price || 0
                          ) -
                            Number(
                              form.buying_price || 0
                            )
                        )
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* STOCK */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Current Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(event) =>
                      updateForm(
                        'quantity',
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />

                  <p className="mt-1.5 text-xs text-gray-500">
                    Measured in{' '}
                    {form.unit === 'Other'
                      ? form.customUnit ||
                        'your custom unit'
                      : form.unit}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Minimum Stock Level
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_stock_level}
                    onChange={(event) =>
                      updateForm(
                        'min_stock_level',
                        event.target.value
                      )
                    }
                    placeholder="5"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />

                  <p className="mt-1.5 text-xs text-gray-500">
                    You'll be alerted when stock reaches
                    this level.
                  </p>
                </div>
              </div>

              {/* ERROR INSIDE MODAL */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
                    : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              Delete Product?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              This will permanently remove the product
              from your inventory. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}