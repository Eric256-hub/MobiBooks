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

import {
  supabase,
  type Product,
} from '@/lib/supabase';

type ProductForm = {
  name: string;
  category: string;
  description: string;
  buying_price: string;
  selling_price: string;
  quantity: string;
  min_stock_level: string;
};

const formatUGX = (amount: number) =>
  `UGX ${new Intl.NumberFormat('en-UG').format(
    Math.round(amount)
  )}`;

export default function Products() {
  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [error, setError] = useState('');

  const [form, setForm] =
    useState<ProductForm>({
      name: '',
      category: '',
      description: '',
      buying_price: '',
      selling_price: '',
      quantity: '',
      min_stock_level: '5',
    });

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
        throw new Error(
          'You must be logged in.'
        );
      }

      const { data, error: fetchError } =
        await supabase
          .from('products')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

      if (fetchError) {
        throw fetchError;
      }

      setProducts(
        (data || []) as Product[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load products.'
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      category: '',
      description: '',
      buying_price: '',
      selling_price: '',
      quantity: '',
      min_stock_level: '5',
    });

    setEditingProduct(null);
    setShowForm(false);
    setError('');
  }

  function openAddForm() {
    setEditingProduct(null);

    setForm({
      name: '',
      category: '',
      description: '',
      buying_price: '',
      selling_price: '',
      quantity: '',
      min_stock_level: '5',
    });

    setError('');
    setShowForm(true);
  }

  function openEditForm(
    product: Product
  ) {
    setEditingProduct(product);

    setForm({
      name: product.name,
      category: product.category || '',
      description:
        product.description || '',
      buying_price: String(
        product.buying_price
      ),
      selling_price: String(
        product.selling_price
      ),
      quantity: String(
        product.quantity
      ),
      min_stock_level: String(
        product.min_stock_level || 5
      ),
    });

    setError('');
    setShowForm(true);
  }

  function updateForm(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');

    const name = form.name.trim();
    const category =
      form.category.trim();

    const description =
      form.description.trim();

    const buyingPrice = Number(
      form.buying_price
    );

    const sellingPrice = Number(
      form.selling_price
    );

    const quantity = Number(
      form.quantity
    );

    const minStockLevel = Number(
      form.min_stock_level
    );

    if (!name) {
      setError(
        'Please enter a product name.'
      );
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
        'Selling price cannot be below buying price.'
      );
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      setError(
        'Please enter a valid quantity.'
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

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          'You must be logged in.'
        );
      }

      if (editingProduct) {
        /*
         * EDIT PRODUCT
         *
         * Do NOT change quantity_sold here.
         * Sales already control that value.
         */
        const {
          data,
          error: updateError,
        } = await supabase
          .from('products')
          .update({
            name,
            category:
              category || null,
            description:
              description || null,
            buying_price:
              buyingPrice,
            selling_price:
              sellingPrice,
            quantity,
            min_stock_level:
              minStockLevel,
          })
          .eq(
            'id',
            editingProduct.id
          )
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setProducts(
          (previous) =>
            previous.map(
              (product) =>
                product.id ===
                editingProduct.id
                  ? (data as Product)
                  : product
            )
        );
      } else {
        /*
         * ADD PRODUCT
         *
         * IMPORTANT:
         * Save the logged-in user's ID.
         */
        const {
          data,
          error: insertError,
        } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            name,
            category:
              category || null,
            description:
              description || null,
            buying_price:
              buyingPrice,
            selling_price:
              sellingPrice,
            quantity,
            quantity_sold: 0,
            min_stock_level:
              minStockLevel,
            is_sample: false,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setProducts(
          (previous) => [
            data as Product,
            ...previous,
          ]
        );
      }

      resetForm();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : editingProduct
          ? 'Failed to update the product.'
          : 'Failed to add the product.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    product: Product
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${product.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const {
        error: deleteError,
      } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) {
        throw deleteError;
      }

      setProducts(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== product.id
          )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete the product.'
      );
    }
  }

  const filteredProducts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(query) ||
          (product.category || '')
            .toLowerCase()
            .includes(query) ||
          (product.description || '')
            .toLowerCase()
            .includes(query)
      );
    }, [products, search]);

  const totalProducts =
    products.length;

  const totalStock =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.quantity || 0
        ),
      0
    );

  const totalStockValue =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.buying_price || 0
        ) *
          Number(
            product.quantity || 0
          ),
      0
    );

  const totalProfit =
    products.reduce(
      (total, product) => {
        const profitPerUnit =
          Number(
            product.selling_price || 0
          ) -
          Number(
            product.buying_price || 0
          );

        const quantitySold =
          Number(
            product.quantity_sold || 0
          );

        return (
          total +
          profitPerUnit *
            quantitySold
        );
      },
      0
    );

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Products
          </h1>

          <p className="text-slate-500 mt-1">
            Manage products, stock,
            prices and profitability.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-3 rounded-xl"
        >
          <Plus size={20} />
          Add Product
        </button>

      </div>

      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">

          <AlertTriangle
            size={20}
            className="flex-shrink-0 mt-0.5"
          />

          <p className="text-sm">
            {error}
          </p>

          <button
            onClick={() =>
              setError('')
            }
            className="ml-auto"
          >
            <X size={18} />
          </button>

        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">
            Total Products
          </p>

          <p className="text-2xl font-bold text-slate-800 mt-1">
            {totalProducts}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">
            Units Remaining
          </p>

          <p className="text-2xl font-bold text-slate-800 mt-1">
            {totalStock}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">
            Stock Value
          </p>

          <p className="text-xl font-bold text-slate-800 mt-1">
            {formatUGX(
              totalStockValue
            )}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">
            Total Profit Made
          </p>

          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatUGX(
              totalProfit
            )}
          </p>
        </div>

      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">

        <div className="relative">

          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />

        </div>

      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />

            <p className="text-slate-500 mt-4">
              Loading products...
            </p>
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div className="py-16 text-center px-6">

            <Package
              size={48}
              className="mx-auto text-slate-300"
            />

            <h3 className="text-lg font-semibold text-slate-700 mt-4">
              {search
                ? 'No products found'
                : 'No products yet'}
            </h3>

            <p className="text-slate-500 mt-1">
              {search
                ? 'Try a different search term.'
                : 'Add your first product to start managing stock.'}
            </p>

            {!search && (
              <button
                onClick={
                  openAddForm
                }
                className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-medium"
              >
                <Plus size={18} />
                Add Product
              </button>
            )}

          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden lg:block overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">

                    <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="text-right px-5 py-4 text-sm font-semibold text-slate-600">
                      Buying Price
                    </th>

                    <th className="text-right px-5 py-4 text-sm font-semibold text-slate-600">
                      Selling Price
                    </th>

                    <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600">
                      Remaining
                    </th>

                    <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600">
                      Sold
                    </th>

                    <th className="text-right px-5 py-4 text-sm font-semibold text-slate-600">
                      Profit Made
                    </th>

                    <th className="text-right px-5 py-4 text-sm font-semibold text-slate-600">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredProducts.map(
                    (product) => {

                      const profitPerUnit =
                        Number(
                          product.selling_price
                        ) -
                        Number(
                          product.buying_price
                        );

                      const profitMade =
                        profitPerUnit *
                        Number(
                          product.quantity_sold ||
                            0
                        );

                      const lowStock =
                        Number(
                          product.quantity
                        ) <=
                        Number(
                          product.min_stock_level ||
                            5
                        );

                      return (
                        <tr
                          key={
                            product.id
                          }
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">

                            <div className="font-semibold text-slate-800">
                              {product.name}
                            </div>

                            {product.category && (
                              <div className="text-xs text-slate-400 mt-1">
                                {product.category}
                              </div>
                            )}

                          </td>

                          <td className="px-5 py-4 text-right text-slate-700">
                            {formatUGX(
                              Number(
                                product.buying_price
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatUGX(
                              Number(
                                product.selling_price
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">

                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                lowStock
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >

                              {lowStock && (
                                <AlertTriangle
                                  size={14}
                                />
                              )}

                              {product.quantity}

                            </span>

                          </td>

                          <td className="px-5 py-4 text-center font-medium text-slate-700">
                            {product.quantity_sold ||
                              0}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                            {formatUGX(
                              profitMade
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <div className="flex items-center justify-end gap-2">

                              <button
                                onClick={() =>
                                  openEditForm(
                                    product
                                  )
                                }
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                                title="Edit product"
                              >
                                <Edit3
                                  size={18}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    product
                                  )
                                }
                                className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                title="Delete product"
                              >
                                <Trash2
                                  size={18}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* MOBILE */}
            <div className="lg:hidden divide-y divide-slate-100">

              {filteredProducts.map(
                (product) => {

                  const profitPerUnit =
                    Number(
                      product.selling_price
                    ) -
                    Number(
                      product.buying_price
                    );

                  const profitMade =
                    profitPerUnit *
                    Number(
                      product.quantity_sold ||
                        0
                    );

                  const lowStock =
                    Number(
                      product.quantity
                    ) <=
                    Number(
                      product.min_stock_level ||
                        5
                    );

                  return (
                    <div
                      key={
                        product.id
                      }
                      className="p-5"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="font-semibold text-slate-800">
                            {product.name}
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            {product.description ||
                              'No description'}
                          </p>

                        </div>

                        <div className="flex gap-1">

                          <button
                            onClick={() =>
                              openEditForm(
                                product
                              )
                            }
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                          >
                            <Edit3
                              size={18}
                            />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                product
                              )
                            }
                            className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2
                              size={18}
                            />
                          </button>

                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-5">

                        <div>
                          <p className="text-xs text-slate-500">
                            Buying Price
                          </p>

                          <p className="font-semibold text-slate-800 mt-1">
                            {formatUGX(
                              Number(
                                product.buying_price
                              )
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Selling Price
                          </p>

                          <p className="font-semibold text-slate-800 mt-1">
                            {formatUGX(
                              Number(
                                product.selling_price
                              )
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Remaining
                          </p>

                          <span
                            className={`inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-sm font-medium ${
                              lowStock
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {lowStock && (
                              <AlertTriangle
                                size={13}
                              />
                            )}

                            {product.quantity}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Quantity Sold
                          </p>

                          <p className="font-semibold text-slate-800 mt-1">
                            {product.quantity_sold ||
                              0}
                          </p>
                        </div>

                        <div className="col-span-2">

                          <p className="text-xs text-slate-500">
                            Profit Made
                          </p>

                          <p className="font-semibold text-emerald-600 mt-1">
                            {formatUGX(
                              profitMade
                            )}
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          </>
        )}

      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={resetForm}
          />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Enter the product information.
                </p>

              </div>

              <button
                onClick={
                  resetForm
                }
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="p-6 space-y-5"
            >

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name
                </label>

                <input
                  type="text"
                  value={
                    form.name
                  }
                  onChange={(event) =>
                    updateForm(
                      'name',
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. Cassava Flour"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>

                  <input
                    type="text"
                    value={
                      form.category
                    }
                    onChange={(event) =>
                      updateForm(
                        'category',
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Food"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.min_stock_level
                    }
                    onChange={(event) =>
                      updateForm(
                        'min_stock_level',
                        event.target
                          .value
                      )
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    updateForm(
                      'description',
                      event.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Describe the product..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Buying Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.buying_price
                    }
                    onChange={(event) =>
                      updateForm(
                        'buying_price',
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. 2000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Selling Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.selling_price
                    }
                    onChange={(event) =>
                      updateForm(
                        'selling_price',
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. 2500"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    form.quantity
                  }
                  onChange={(event) =>
                    updateForm(
                      'quantity',
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. 100"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {form.buying_price &&
                form.selling_price && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">

                    <p className="text-sm text-emerald-700">
                      Expected profit per unit
                    </p>

                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {formatUGX(
                        Number(
                          form.selling_price
                        ) -
                          Number(
                            form.buying_price
                          )
                      )}
                    </p>

                  </div>
                )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium"
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
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