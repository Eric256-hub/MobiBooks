import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatUGX } from '@/lib/format';

type StatementMode = 'trader' | 'reviewer' | 'officer' | 'admin';

type StatementRequest = {
  id: string;
  trader_id: string;
  reviewer_id: string | null;
  sacco_id: string;
  status: string;
  period_from: string;
  period_to: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  entry_count: number;
  reason: string | null;
  statement_code: string | null;
  content_hash: string | null;
  created_at: string;
  decided_at: string | null;
};

type Sacco = { id: string; name: string; branch: string | null };
type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  created_at: string;
};

const money = (value: number) => formatUGX(Number(value || 0));
const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

function Summary({ request }: { request: StatementRequest }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {[
        ['Revenue', request.total_revenue],
        ['Cost of goods', request.total_cost],
        ['Gross profit', request.gross_profit],
        ['Expenses', request.total_expenses],
        ['Net profit', request.net_profit],
      ].map(([label, value]) => (
        <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{money(Number(value))}</p>
        </div>
      ))}
    </div>
  );
}

export default function Statements({ mode }: { mode: StatementMode }) {
  const [requests, setRequests] = useState<StatementRequest[]>([]);
  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedSacco, setSelectedSacco] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState(today());
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'admin') {
        const { data, error: queryError } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (queryError) throw queryError;
        setAuditLogs((data || []) as AuditLog[]);
      } else {
        const query = supabase
          .from('statement_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (mode === 'officer') query.eq('status', 'approved');
        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        setRequests((data || []) as StatementRequest[]);
      }

      if (mode === 'trader') {
        const [{ data: saccoData, error: saccoError }, { data: profile, error: profileError }] = await Promise.all([
          supabase.from('saccos').select('id, name, branch').order('name'),
          supabase.from('profiles').select('sacco_id').single(),
        ]);
        if (saccoError) throw saccoError;
        if (profileError) throw profileError;
        const availableSaccos = (saccoData || []) as Sacco[];
        setSaccos(availableSaccos);
        const assignedSacco = (profile as { sacco_id: string | null } | null)?.sacco_id;
        setSelectedSacco(assignedSacco || '');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load statement information.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!selectedSacco) throw new Error('Select the SACCO that should receive this statement.');
      const { data, error: rpcError } = await supabase.rpc('submit_statement', {
        p_from: periodFrom,
        p_to: periodTo,
        p_sacco: selectedSacco,
      });
      if (rpcError) throw rpcError;
      setNotice(`Your statement request was submitted. Reference: ${String(data)}`);
      setPeriodFrom('');
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Statement request could not be submitted.');
    } finally {
      setSaving(false);
    }
  }

  async function decideRequest(id: string, approve: boolean) {
    const reason = approve ? null : (rejectReasons[id] || '').trim();
    if (!approve && !reason) {
      setError('Enter a reason before rejecting this request.');
      return;
    }
    const confirmed = window.confirm(approve
      ? 'Approve this statement and make it available to the assigned SACCO?'
      : 'Reject this statement request?');
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('decide_statement', {
        p_id: id,
        p_approve: approve,
        p_reason: reason,
      });
      if (rpcError) throw rpcError;
      setNotice(approve ? 'Statement approved successfully.' : 'Statement rejected.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to process this request.');
    } finally {
      setSaving(false);
    }
  }

  const heading = {
    trader: 'Verified Business Statements',
    reviewer: 'Statement Review Queue',
    officer: 'Approved SACCO Statements',
    admin: 'Audit Logs',
  }[mode];

  const subtitle = {
    trader: 'Request a verified summary of your recorded business activity.',
    reviewer: 'Review submitted trader statements and record a decision.',
    officer: 'Read-only access to statements approved for your SACCO.',
    admin: 'Review recorded administrative and statement workflow actions.',
  }[mode];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {mode === 'officer' ? <Building2 className="text-emerald-600" /> : mode === 'admin' ? <ShieldCheck className="text-emerald-600" /> : <FileCheck2 className="text-emerald-600" />}
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{heading}</h1>
          </div>
          <p className="mt-1 text-slate-500">{subtitle}</p>
        </div>
        <button onClick={() => void loadData()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      {mode === 'trader' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Request a verified statement</h2>
          <p className="mt-1 text-sm text-slate-500">The database checks the date range and requires at least 10 sales and expense entries across a period of at least 14 days.</p>
          <form onSubmit={submitRequest} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Period from
              <input required type="date" max={periodTo || today()} value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Period to
              <input required type="date" max={today()} min={periodFrom || undefined} value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              SACCO
              <select required disabled value={selectedSacco} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-slate-700">
                <option value="">{selectedSacco ? 'Assigned SACCO' : 'No SACCO assigned to your profile'}</option>
                {saccos.filter((sacco) => sacco.id === selectedSacco).map((sacco) => <option key={sacco.id} value={sacco.id}>{sacco.name}{sacco.branch ? ` — ${sacco.branch}` : ''}</option>)}
              </select>
              <span className="mt-1 block text-xs text-amber-700">The SACCO is taken from your profile. If none is assigned, contact the administrator before requesting a statement.</span>
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving || loading || !periodFrom || !selectedSacco} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Submitting…' : 'Submit statement request'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500">Loading…</div>
      ) : mode === 'admin' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Recent audit activity</h2><p className="text-sm text-slate-500">Latest 100 records visible to administrators.</p></div>
          {auditLogs.length === 0 ? <p className="p-8 text-center text-slate-500">No audit records found.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{auditLogs.map((log) => <tr key={log.id}><td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td><td className="px-4 py-3">{log.entity || '—'}</td><td className="px-4 py-3 font-mono text-xs">{log.user_id || '—'}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <FileCheck2 className="mx-auto text-slate-300" size={42} />
          <p className="mt-3 font-semibold text-slate-700">{mode === 'trader' ? 'No statement requests yet' : mode === 'reviewer' ? 'No submitted requests waiting for review' : 'No approved statements available'}</p>
          <p className="mt-1 text-sm text-slate-500">When a statement is available, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{request.statement_code || `Request ${request.id.slice(0, 8)}`}</h2>
                    <StatusPill status={request.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Period: {request.period_from} to {request.period_to} · {request.entry_count} entries</p>
                  {mode !== 'trader' && <p className="mt-1 text-xs text-slate-400">Trader ID: {request.trader_id}</p>}
                </div>
                <div className="text-sm text-slate-500">Submitted {new Date(request.created_at).toLocaleString()}</div>
              </div>
              <Summary request={request} />
              {request.reason && <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><strong>Decision note:</strong> {request.reason}</div>}
              {mode === 'officer' && request.content_hash && <div className="break-all rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Integrity hash (SHA-256):</strong><br />{request.content_hash}</div>}
              {mode === 'reviewer' && request.status === 'submitted' && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                  <label className="text-sm font-medium text-slate-700">Rejection reason (required only when rejecting)
                    <textarea value={rejectReasons[request.id] || ''} onChange={(event) => setRejectReasons((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Explain why this request cannot be approved…" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void decideRequest(request.id, true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={16} /> Approve statement</button>
                    <button onClick={() => void decideRequest(request.id, false)} disabled={saving || !(rejectReasons[request.id] || '').trim()} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"><XCircle size={16} /> Reject request</button>
                  </div>
                </div>
              )}
              {mode === 'trader' && request.status === 'submitted' && <p className="flex items-center gap-2 text-sm text-amber-700"><Clock3 size={16} /> Waiting for reviewer decision.</p>}
              {mode === 'trader' && request.status === 'approved' && <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><BadgeCheck size={16} /> Approved and assigned statement code: {request.statement_code || 'Pending code'}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
