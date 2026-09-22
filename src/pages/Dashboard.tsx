import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Receipt,
  Plus,
  BarChart3,
  Activity,
} from 'lucide-react';

import {
  supabase,
  type Product,
  type Sale,
  type Expense,
} from '@/lib/supabase';

import {
  formatUGX,
  formatDateTime,
} from '@/lib/format';

import {
  PageHeader,
  Card,
  LoadingSpinner,
  ErrorState,
  Badge,
} from '@/components/ui';

import type {
  Page,
  DashboardPeriod,
} from '@/App';

type Props = {
  onNavigate: (
    page: Page,
    period?: DashboardPeriod
  ) => void;

  selectedPeriod: DashboardPeriod;

  onPeriodChange: (
    period: DashboardPeriod
  ) => void;
};

type PeriodSale = Sale & {
  product_name?: string;
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
  const date = new Date(dateValue);
  const start = getPeriodStart(period);

  return date >= start;
}

function periodLabel(
  period: DashboardPeriod
) {
  if (period === 'today') return 'Today';
  if (period === 'week') return 'This Week';
  return 'This Month';
}

export default function Dashboard({
  onNavigate,
  selectedPeriod,
  onPeriodChange,
}: Props) {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [products, setProducts] =
    useState<Product[]>([]);

  const [sales, setSales] =
    useState<PeriodSale[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'You must be logged in.'
        );
      }

      const [
        productsRes,
        salesRes,
        expensesRes,
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

        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', {
            ascending: false,
          }),
      ]);

      if (productsRes.error)
        throw productsRes.error;

      if (salesRes.error)
        throw salesRes.error;

      if (expensesRes.error)
        throw expensesRes.error;

      setProducts(
        (productsRes.data ||
          []) as Product[]
      );

      setSales(
        (salesRes.data ||
          []) as PeriodSale[]
      );

      setExpenses(
        (expensesRes.data ||
          []) as Expense[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load dashboard'
      );
    } finally {
      setLoading(false);
    }
  }

  const periodSales = useMemo(
    () =>
      sales.filter((sale) =>
        isWithinPeriod(
          sale.sale_date,
          selectedPeriod
        )
      ),
    [sales, selectedPeriod]
  );

  const periodExpenses = useMemo(
    () =>
      expenses.filter((expense) =>
        isWithinPeriod(
          expense.expense_date,
          selectedPeriod
        )
      ),
    [expenses, selectedPeriod]
  );

  const totalSales = periodSales.reduce(
    (sum, sale) =>
      sum +
      Number(sale.total_amount || 0),
    0
  );

  const totalExpenses =
    periodExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );

  const totalProfit =
    periodSales.reduce(
      (sum, sale) =>
        sum +
        Number(sale.profit_amount || 0),
      0
    );

  const balance =
    totalSales - totalExpenses;

  const quantitySold =
    periodSales.reduce(
      (sum, sale) =>
        sum +
        Number(sale.quantity || 0),
      0
    );

  const lowStockProducts =
    products.filter(
      (product) =>
        Number(product.quantity || 0) <=
        Number(
          product.min_stock_level || 0
        )
    );

  const topProducts = useMemo(() => {
    const grouped: Record<
      string,
      {
        name: string;
        quantity: number;
        total: number;
      }
    > = {};

    periodSales.forEach((sale) => {
      const name =
        sale.product_name ||
        'Unknown Product';

      if (!grouped[name]) {
        grouped[name] = {
          name,
          quantity: 0,
          total: 0,
        };
      }

      grouped[name].quantity +=
        Number(sale.quantity || 0);

      grouped[name].total +=
        Number(
          sale.total_amount || 0
        );
    });

    return Object.values(grouped)
      .sort(
        (a, b) =>
          b.total - a.total
      )
      .slice(0, 5);
  }, [periodSales]);

  const recentTransactions = useMemo(() => {
    const saleTransactions =
      periodSales.map((sale) => ({
        id: sale.id,
        type: 'sale' as const,
        name:
          sale.product_name ||
          'Sale',
        amount: Number(
          sale.total_amount || 0
        ),
        date: sale.sale_date,
      }));

    const expenseTransactions =
      periodExpenses.map((expense) => ({
        id: expense.id,
        type: 'expense' as const,
        name:
          expense.description ||
          'Expense',
        amount: Number(
          expense.amount || 0
        ),
        date: expense.expense_date,
      }));

    return [
      ...saleTransactions,
      ...expenseTransactions,
    ]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, 6);
  }, [
    periodSales,
    periodExpenses,
  ]);

  const chartData = useMemo(() => {
    const grouped: Record<
      string,
      number
    > = {};

    periodSales.forEach((sale) => {
      const date =
        new Date(
          sale.sale_date
        ).toLocaleDateString(
          undefined,
          {
            month: 'short',
            day: 'numeric',
          }
        );

      grouped[date] =
        (grouped[date] || 0) +
        Number(
          sale.total_amount || 0
        );
    });

    return Object.entries(grouped)
      .slice(-7);
  }, [periodSales]);

  const maxChartValue =
    Math.max(
      ...chartData.map(
        ([, value]) => value
      ),
      1
    );

  function greeting() {
    const hour =
      new Date().getHours();

    if (hour < 12)
      return 'Good morning';

    if (hour < 17)
      return 'Good afternoon';

    return 'Good evening';
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorState message={error} />
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <PageHeader
            title={`${greeting()} 👋`}
            subtitle="Here's what's happening with your business."
          />
        </div>

        {/* PERIOD SELECTOR */}
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm flex w-full xl:w-auto">
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
            ([value, label]) => {
              const active =
                selectedPeriod ===
                value;

              return (
                <button
                  key={value}
                  onClick={() =>
                    onPeriodChange(
                      value
                    )
                  }
                  className={`flex-1 xl:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* SALES */}
        <button
          onClick={() =>
            onNavigate(
              'sales',
              selectedPeriod
            )
          }
          className="text-left"
        >
          <Card className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {periodLabel(
                    selectedPeriod
                  )}{' '}
                  Sales
                </p>

                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatUGX(
                    totalSales
                  )}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ShoppingCart
                  size={21}
                  className="text-emerald-600"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {periodSales.length}{' '}
                transaction
                {periodSales.length !==
                1
                  ? 's'
                  : ''}
              </span>

              <ArrowRight
                size={16}
                className="text-slate-400"
              />
            </div>
          </Card>
        </button>

        {/* EXPENSES */}
        <button
          onClick={() =>
            onNavigate(
              'expenses',
              selectedPeriod
            )
          }
          className="text-left"
        >
          <Card className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {periodLabel(
                    selectedPeriod
                  )}{' '}
                  Expenses
                </p>

                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatUGX(
                    totalExpenses
                  )}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center">
                <Receipt
                  size={21}
                  className="text-rose-600"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {periodExpenses.length}{' '}
                expense
                {periodExpenses.length !==
                1
                  ? 's'
                  : ''}
              </span>

              <ArrowRight
                size={16}
                className="text-slate-400"
              />
            </div>
          </Card>
        </button>

        {/* BALANCE */}
        <button
          onClick={() =>
            onNavigate(
              'reports',
              selectedPeriod
            )
          }
          className="text-left"
        >
          <Card className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Estimated Balance
                </p>

                <p
                  className={`text-2xl font-bold mt-2 ${
                    balance >= 0
                      ? 'text-slate-900'
                      : 'text-rose-600'
                  }`}
                >
                  {formatUGX(balance)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet
                  size={21}
                  className="text-blue-600"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Sales minus expenses
              </span>

              <ArrowRight
                size={16}
                className="text-slate-400"
              />
            </div>
          </Card>
        </button>

        {/* PROFIT */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Estimated Profit
              </p>

              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatUGX(
                  totalProfit
                )}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
              <TrendingUp
                size={21}
                className="text-violet-600"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Activity size={14} />
            {quantitySold} items sold
          </div>
        </Card>

      </div>

      {/* PERFORMANCE + TOP PRODUCTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* CHART */}
        <Card className="xl:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">
                Sales Performance
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Sales activity for{' '}
                {periodLabel(
                  selectedPeriod
                ).toLowerCase()}
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BarChart3
                size={19}
                className="text-emerald-600"
              />
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <BarChart3
                size={38}
                className="text-slate-300"
              />

              <p className="mt-3 font-medium text-slate-500">
                No sales data yet
              </p>

              <p className="text-sm text-slate-400 mt-1">
                Record a sale to see your performance.
              </p>
            </div>
          ) : (
            <div className="h-56 flex items-end gap-3">
              {chartData.map(
                ([label, value]) => {
                  const height =
                    Math.max(
                      (value /
                        maxChartValue) *
                        100,
                      5
                    );

                  return (
                    <div
                      key={label}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                    >
                      <span className="text-[10px] text-slate-500 truncate max-w-full">
                        {formatUGX(
                          value
                        )}
                      </span>

                      <div
                        className="w-full max-w-12 bg-emerald-500 rounded-t-lg hover:bg-emerald-600 transition-all"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${label}: ${formatUGX(value)}`}
                      />

                      <span className="text-[10px] text-slate-400">
                        {label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </Card>

        {/* TOP PRODUCTS */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">
                Top Products
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Best performing products
              </p>
            </div>

            <TrendingUp
              size={20}
              className="text-emerald-600"
            />
          </div>

          {topProducts.length === 0 ? (
            <div className="py-10 text-center">
              <Package
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="text-sm text-slate-400 mt-3">
                No product sales yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map(
                (product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm truncate">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {product.quantity}{' '}
                        units sold
                      </p>
                    </div>

                    <p className="text-sm font-bold text-emerald-600">
                      {formatUGX(
                        product.total
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

      </div>

      {/* LOW STOCK + RECENT */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LOW STOCK */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">
                Inventory Alerts
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Products that need attention
              </p>
            </div>

            <AlertTriangle
              size={20}
              className={
                lowStockProducts.length
                  ? 'text-amber-500'
                  : 'text-slate-300'
              }
            />
          </div>

          {lowStockProducts.length ===
          0 ? (
            <div className="py-8 text-center">
              <Package
                size={36}
                className="mx-auto text-emerald-400"
              />

              <p className="font-medium text-slate-600 mt-3">
                Stock levels look good
              </p>

              <p className="text-sm text-slate-400 mt-1">
                No products are currently low in stock.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts
                .slice(0, 5)
                .map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100"
                  >
                    <div>
                      <p className="font-medium text-slate-700 text-sm">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Minimum: {product.min_stock_level}
                      </p>
                    </div>

                    <Badge>
                      {product.quantity} left
                    </Badge>
                  </div>
                ))}

              <button
                onClick={() =>
                  onNavigate(
                    'inventory'
                  )
                }
                className="w-full mt-2 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-2"
              >
                View Inventory
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </Card>

        {/* RECENT TRANSACTIONS */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">
                Recent Activity
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Latest business transactions
              </p>
            </div>

            <button
              onClick={() =>
                onNavigate(
                  'transactions',
                  selectedPeriod
                )
              }
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          {recentTransactions.length ===
          0 ? (
            <div className="py-8 text-center">
              <Activity
                size={36}
                className="mx-auto text-slate-300"
              />

              <p className="text-sm text-slate-400 mt-3">
                No recent transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(
                (transaction) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        transaction.type ===
                        'sale'
                          ? 'bg-emerald-50'
                          : 'bg-rose-50'
                      }`}
                    >
                      {transaction.type ===
                      'sale' ? (
                        <TrendingUp
                          size={17}
                          className="text-emerald-600"
                        />
                      ) : (
                        <TrendingDown
                          size={17}
                          className="text-rose-600"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {transaction.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatDateTime(
                          transaction.date
                        )}
                      </p>
                    </div>

                    <span
                      className={`text-sm font-bold ${
                        transaction.type ===
                        'sale'
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {transaction.type ===
                      'sale'
                        ? '+'
                        : '-'}
                      {formatUGX(
                        transaction.amount
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

      </div>

      {/* QUICK ACTIONS */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800">
              Quick Actions
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Manage your business quickly
            </p>
          </div>

          <Plus
            size={20}
            className="text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          <button
            onClick={() =>
              onNavigate(
                'sales',
                selectedPeriod
              )
            }
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingCart
                size={19}
                className="text-emerald-600"
              />
            </div>

            <div>
              <p className="font-semibold text-slate-700">
                Record Sale
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                Add a new sale
              </p>
            </div>
          </button>

          <button
            onClick={() =>
              onNavigate(
                'expenses',
                selectedPeriod
              )
            }
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <Receipt
                size={19}
                className="text-rose-600"
              />
            </div>

            <div>
              <p className="font-semibold text-slate-700">
                Record Expense
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                Add a business expense
              </p>
            </div>
          </button>

          <button
            onClick={() =>
              onNavigate(
                'products'
              )
            }
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package
                size={19}
                className="text-blue-600"
              />
            </div>

            <div>
              <p className="font-semibold text-slate-700">
                Add Product
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                Add stock to inventory
              </p>
            </div>
          </button>

        </div>
      </Card>

    </div>
  );
}