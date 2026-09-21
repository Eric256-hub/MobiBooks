import { useState, useEffect } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  RotateCcw,
} from 'lucide-react';

import {
  supabase,
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
  Badge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  StatCard,
} from '@/components/ui';

type FilterType = 'all' | 'sale' | 'expense';

type Tx = {
  id: string;
  type: 'sale' | 'expense';
  date: string;
  description: string;
  quantity: number | null;
  amount: number;
};

export default function Transactions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] =
    useState<FilterType>('all');

  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [salesRes, expRes] =
        await Promise.all([
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

      if (salesRes.error) {
        throw salesRes.error;
      }

      if (expRes.error) {
        throw expRes.error;
      }

      setSales(salesRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load transactions'
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Combine sales and expenses into one
   * chronological transaction list.
   */
  const allTransactions: Tx[] = [
    ...sales.map((sale) => ({
      id: sale.id,
      type: 'sale' as const,
      date: sale.sale_date,
      description: sale.product_name,
      quantity: sale.quantity,
      amount: Number(sale.total_amount || 0),
    })),

    ...expenses.map((expense) => ({
      id: expense.id,
      type: 'expense' as const,
      date: expense.expense_date,
      description:
        expense.description ||
        expense.category,
      quantity: null,
      amount: Number(expense.amount || 0),
    })),
  ].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );

  /*
   * Apply filters.
   */
  const filteredTransactions =
    allTransactions.filter((transaction) => {
      // Transaction type
      if (
        filterType !== 'all' &&
        transaction.type !== filterType
      ) {
        return false;
      }

      // Date
      if (filterDate) {
        const selectedDate = new Date(
          `${filterDate}T00:00:00`
        );

        const transactionDate = new Date(
          transaction.date
        );

        if (
          transactionDate.getDate() !==
            selectedDate.getDate() ||
          transactionDate.getMonth() !==
            selectedDate.getMonth() ||
          transactionDate.getFullYear() !==
            selectedDate.getFullYear()
        ) {
          return false;
        }
      }

      // Search
      if (
        search.trim() &&
        !transaction.description
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });

  /*
   * Filtered summary totals.
   */
  const filteredSalesTotal =
    filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'sale'
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

  const filteredExpensesTotal =
    filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense'
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

  const filteredBalance =
    filteredSalesTotal -
    filteredExpensesTotal;

  /*
   * Reset all filters.
   */
  function resetFilters() {
    setSearch('');
    setFilterType('all');
    setFilterDate('');
  }

  const hasFilters =
    search.trim() !== '' ||
    filterType !== 'all' ||
    filterDate !== '';

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div>
      <PageHeader
        title="Transaction History"
        subtitle="All your sales and expenses in one place"
      />

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Sales"
          value={formatUGX(
            filteredSalesTotal
          )}
          icon={
            <TrendingUp size={24} />
          }
          color="emerald"
        />

        <StatCard
          label="Expenses"
          value={formatUGX(
            filteredExpensesTotal
          )}
          icon={
            <TrendingDown size={24} />
          }
          color="rose"
        />

        <StatCard
          label="Balance"
          value={formatUGX(
            filteredBalance
          )}
          icon={<Wallet size={24} />}
          color="blue"
        />
      </div>

      {/* FILTERS */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Type filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setFilterType('all')
                }
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>

              <button
                onClick={() =>
                  setFilterType('sale')
                }
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  filterType === 'sale'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sales
              </button>

              <button
                onClick={() =>
                  setFilterType('expense')
                }
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  filterType === 'expense'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Expenses
              </button>
            </div>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(event) =>
                setFilterDate(
                  event.target.value
                )
              }
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:ml-auto"
            />

            {/* Reset */}
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* RESULT COUNT */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          Showing{' '}
          <span className="font-semibold text-slate-700">
            {filteredTransactions.length}
          </span>{' '}
          transaction
          {filteredTransactions.length !== 1
            ? 's'
            : ''}
        </p>

        {hasFilters && (
          <p className="text-xs text-slate-400">
            Filters applied
          </p>
        )}
      </div>

      {/* TRANSACTION LIST */}
      <Card className="p-5">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            message={
              hasFilters
                ? 'No transactions match your filters.'
                : 'No transactions recorded yet.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-sm font-semibold text-slate-500 pb-3 pr-4">
                    Date
                  </th>

                  <th className="text-left text-sm font-semibold text-slate-500 pb-3 pr-4">
                    Type
                  </th>

                  <th className="text-left text-sm font-semibold text-slate-500 pb-3 pr-4">
                    Description
                  </th>

                  <th className="text-right text-sm font-semibold text-slate-500 pb-3 pr-4">
                    Qty
                  </th>

                  <th className="text-right text-sm font-semibold text-slate-500 pb-3">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(
                  (transaction) => (
                    <tr
                      key={`${transaction.type}-${transaction.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(
                          transaction.date
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        {transaction.type ===
                        'sale' ? (
                          <Badge color="emerald">
                            <span className="flex items-center gap-1">
                              <TrendingUp
                                size={12}
                              />
                              Sale
                            </span>
                          </Badge>
                        ) : (
                          <Badge color="rose">
                            <span className="flex items-center gap-1">
                              <TrendingDown
                                size={12}
                              />
                              Expense
                            </span>
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                        {transaction.description}
                      </td>

                      <td className="py-3 pr-4 text-sm text-slate-600 text-right">
                        {transaction.quantity !==
                        null
                          ? transaction.quantity
                          : '—'}
                      </td>

                      <td
                        className={`py-3 text-sm font-bold text-right ${
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
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}