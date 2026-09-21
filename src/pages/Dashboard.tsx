import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  AlertTriangle,
  ArrowRight,
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
  isSameDay,
} from '@/lib/format';
import {
  PageHeader,
  StatCard,
  Card,
  LoadingSpinner,
  ErrorState,
  Badge,
  EmptyState,
} from '@/components/ui';

type Page =
  | 'dashboard'
  | 'sales'
  | 'expenses'
  | 'inventory'
  | 'transactions'
  | 'reports';

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (p: Page) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      // Make sure there is a logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('You must be logged in to view the dashboard.');
        return;
      }

      const [prodRes, salesRes, expRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('sales')
          .select('*')
          .order('sale_date', { ascending: false }),

        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (salesRes.error) throw salesRes.error;
      if (expRes.error) throw expRes.error;

      setProducts(prodRes.data || []);
      setSales(salesRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const today = new Date();

  // Today's sales
  const todaySales = sales.filter((s) =>
    isSameDay(s.sale_date, today)
  );

  // Today's expenses
  const todayExpenses = expenses.filter((e) =>
    isSameDay(e.expense_date, today)
  );

  // Today's totals
  const todaySalesTotal = todaySales.reduce(
    (sum, s) => sum + s.total_amount,
    0
  );

  const todayExpensesTotal = todayExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const todayBalance =
    todaySalesTotal - todayExpensesTotal;

  // Inventory statistics
  const totalProducts = products.length;

  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.min_stock_level
  );

  // Recent sales
  const recentSales = sales
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      type: 'sale' as const,
      date: s.sale_date,
      description: s.product_name,
      quantity: s.quantity,
      amount: s.total_amount,
    }));

  // Recent expenses
  const recentExpenses = expenses
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      type: 'expense' as const,
      date: e.expense_date,
      description: e.description || e.category,
      quantity: null,
      amount: e.amount,
    }));

  // Combine transactions
  const recentTransactions = [
    ...recentSales,
    ...recentExpenses,
  ]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your business summary for today"
      />

      {/* Today's stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Today's Sales"
          value={formatUGX(todaySalesTotal)}
          icon={<TrendingUp size={24} />}
          color="emerald"
        />

        <StatCard
          label="Today's Expenses"
          value={formatUGX(todayExpensesTotal)}
          icon={<TrendingDown size={24} />}
          color="rose"
        />

        <StatCard
          label="Today's Estimated Balance"
          value={formatUGX(todayBalance)}
          icon={<Wallet size={24} />}
          color="blue"
        />
      </div>

      {/* Stock statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Total Products"
          value={String(totalProducts)}
          icon={<Package size={24} />}
          color="slate"
        />

        <StatCard
          label="Low-Stock Products"
          value={String(lowStockProducts.length)}
          icon={<AlertTriangle size={24} />}
          color="amber"
        />
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <Card className="p-5 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-amber-600 flex-shrink-0 mt-0.5"
              size={20}
            />

            <div>
              <h3 className="font-semibold text-amber-800">
                Low Stock Warning
              </h3>

              <p className="text-sm text-amber-700 mt-1">
                {lowStockProducts.length} product
                {lowStockProducts.length > 1
                  ? 's are'
                  : ' is'}{' '}
                running low on stock:
              </p>

              <ul className="mt-2 space-y-1">
                {lowStockProducts.map((p) => (
                  <li
                    key={p.id}
                    className="text-sm text-amber-800"
                  >
                    {p.name} — {p.quantity} left
                    (minimum is {p.min_stock_level})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => onNavigate('sales')}
          className="flex items-center justify-between p-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          <span className="font-semibold">
            Record a Sale
          </span>

          <ArrowRight size={20} />
        </button>

        <button
          onClick={() => onNavigate('expenses')}
          className="flex items-center justify-between p-4 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors"
        >
          <span className="font-semibold">
            Record an Expense
          </span>

          <ArrowRight size={20} />
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-700 text-white hover:bg-slate-800 transition-colors"
        >
          <span className="font-semibold">
            Add a Product
          </span>

          <ArrowRight size={20} />
        </button>
      </div>

      {/* Recent transactions */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">
            Recent Transactions
          </h3>

          <button
            onClick={() => onNavigate('transactions')}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState message="No transactions yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      t.type === 'sale'
                        ? 'bg-emerald-100'
                        : 'bg-rose-100'
                    }`}
                  >
                    {t.type === 'sale' ? (
                      <TrendingUp
                        size={18}
                        className="text-emerald-600"
                      />
                    ) : (
                      <TrendingDown
                        size={18}
                        className="text-rose-600"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {t.description}
                    </p>

                    <p className="text-xs text-slate-400">
                      {formatDateTime(t.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.quantity !== null && (
                    <Badge color="slate">
                      Qty: {t.quantity}
                    </Badge>
                  )}

                  <span
                    className={`font-bold text-sm ${
                      t.type === 'sale'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {t.type === 'sale' ? '+' : '-'}
                    {formatUGX(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}