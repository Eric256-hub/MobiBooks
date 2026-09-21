import { useState, useEffect } from 'react';
import { Receipt, Check, AlertCircle } from 'lucide-react';
import { supabase, type Expense } from '@/lib/supabase';
import { formatUGX, formatDate, toLocalDateInput } from '@/lib/format';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Textarea,
  LoadingSpinner,
  ErrorState,
} from '@/components/ui';

const CATEGORIES = [
  'Stock Purchase',
  'Transport',
  'Rent',
  'Utilities',
  'Salaries',
  'Packaging',
  'Food',
  'Other',
];

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  const [form, setForm] = useState({
    category: 'Stock Purchase',
    amount: '',
    description: '',
    expense_date: toLocalDateInput(new Date()),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .limit(5);

    if (error) {
      setError(error.message);
    } else {
      setRecentExpenses(data || []);
    }

    setLoading(false);
  }

  async function saveExpense() {
    setFormError('');
    setSuccess(false);

    const amount = parseInt(form.amount);

    if (isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid amount');
      return;
    }

    setSaving(true);

    try {
      // Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setFormError('You must be logged in to record an expense.');
        return;
      }

      const expenseDate = new Date(
        form.expense_date +
          'T' +
          new Date().toTimeString().slice(0, 8)
      ).toISOString();

      // Save expense belonging to the logged-in user
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          category: form.category,
          amount: amount,
          description: form.description.trim() || null,
          expense_date: expenseDate,
        });

      if (error) throw error;

      setSuccess(true);

      setForm({
        category: 'Stock Purchase',
        amount: '',
        description: '',
        expense_date: toLocalDateInput(new Date()),
      });

      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save expense'
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

  return (
    <div>
      <PageHeader
        title="Record an Expense"
        subtitle="Enter the details of money you spent on your business"
      />

      {/* Success message */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <Check
            size={20}
            className="text-emerald-600"
          />

          <p className="text-emerald-700 font-medium">
            Expense saved successfully!
          </p>
        </div>
      )}

      {/* Error message */}
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

        {/* Expense form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="space-y-4">

              {/* Category */}
              <Select
                label="Expense Category"
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
                required
              />

              {/* Amount */}
              <Input
                label="Amount (Ugx)"
                type="number"
                value={form.amount}
                onChange={(v) =>
                  setForm({
                    ...form,
                    amount: v,
                  })
                }
                placeholder="0"
                min="0"
                required
              />

              {/* Description */}
              <Textarea
                label="Description (optional)"
                value={form.description}
                onChange={(v) =>
                  setForm({
                    ...form,
                    description: v,
                  })
                }
                placeholder="What was this expense for?"
              />

              {/* Date */}
              <Input
                label="Date"
                type="date"
                value={form.expense_date}
                onChange={(v) =>
                  setForm({
                    ...form,
                    expense_date: v,
                  })
                }
                required
              />

              {/* Save expense */}
              <Button
                onClick={saveExpense}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2"
              >
                <Receipt size={20} />

                {saving
                  ? 'Saving...'
                  : 'Save Expense'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent expenses */}
        <div>
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">
              Recent Expenses
            </h3>

            {recentExpenses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No expenses recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-700 text-sm">
                        {e.category}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatDate(e.expense_date)}
                      </p>
                    </div>

                    <span className="font-bold text-rose-600 text-sm">
                      {formatUGX(e.amount)}
                    </span>
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