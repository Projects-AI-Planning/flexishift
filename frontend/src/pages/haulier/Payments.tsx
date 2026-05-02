import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import haulierService from '../../api/haulierService';

interface EscrowPaymentItem {
  paymentId: string;
  jobId: string;
  jobRef: string;
  pickupAddress?: string;
  dropAddress?: string;
  goodsType?: string;
  amount: number;
  currency: string;
  status: string;
  escrowedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

interface InvoiceItem {
  jobId: string;
  jobRef: string;
  invoiceUrl?: string;
  amount?: number;
  currency: string;
}

interface PaymentMethodItem {
  methodId: string;
  type?: string;
  accountNumber?: string;
}

interface SpendSummary {
  totalSpent?: number;
  period?: string;
}

interface MethodFormState {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
}

const fmtMoney = (value?: number | null) =>
  value != null ? `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const methodTail = (methodId: string) => {
  const parts = methodId.split('_');
  const tail = parts[parts.length - 1] || methodId;
  return tail.length > 4 ? tail.slice(-4) : tail;
};

const STATUS_STYLES: Record<string, string> = {
  ESCROWED: 'bg-indigo-100 text-indigo-700',
  RELEASED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REFUNDED: 'bg-red-100 text-red-700',
  FAILED: 'bg-slate-100 text-slate-600',
};

const Empty: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
      <span className="material-symbols-outlined text-3xl text-slate-400">{icon}</span>
    </div>
    <div>
      <p className="font-black text-slate-600">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  </div>
);

const TAB_LINKS = [
  { to: '/haulier/payments/escrow', label: 'Escrow', icon: 'security' },
  { to: '/haulier/payments/history', label: 'History', icon: 'receipt_long' },
  { to: '/haulier/payments/invoices', label: 'Invoices', icon: 'description' },
];

const EscrowTab: React.FC = () => {
  const [items, setItems] = useState<EscrowPaymentItem[]>([]);
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [summary, setSummary] = useState<SpendSummary>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [savingMethod, setSavingMethod] = useState(false);
  const [methodError, setMethodError] = useState('');
  const [methodSuccess, setMethodSuccess] = useState('');
  const [form, setForm] = useState<MethodFormState>({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
  });
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, methodsRes, summaryRes] = await Promise.all([
        haulierService.getPaymentHistory({ status: 'ESCROWED', page, per_page: PER_PAGE }),
        haulierService.listPaymentMethods(),
        haulierService.getSpendSummary(),
      ]);

      const historyData = historyRes as {
        items?: EscrowPaymentItem[];
        total?: number;
      };
      const methodsData = methodsRes as {
        methods?: PaymentMethodItem[];
      };
      const summaryData = summaryRes as SpendSummary & {
        summary?: SpendSummary;
      };

      setItems(historyData.items ?? []);
      setTotal(historyData.total ?? 0);
      setMethods(methodsData.methods ?? []);
      setSummary({
        totalSpent: summaryData.totalSpent ?? summaryData.summary?.totalSpent ?? 0,
        period: summaryData.period ?? summaryData.summary?.period,
      });
      setError('');
    } catch {
      setError('Failed to load escrow data.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const escrowTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleAddMethod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMethodError('');
    setMethodSuccess('');
    if (!form.accountName || !form.accountNumber || !form.ifscCode) {
      setMethodError('Please fill in all three fields.');
      return;
    }

    setSavingMethod(true);
    try {
      await haulierService.addPaymentMethod({
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
      });
      setForm({ accountName: '', accountNumber: '', ifscCode: '' });
      setMethodSuccess('Payment method added.');
      await fetchData();
    } catch {
      setMethodError('Failed to add payment method.');
    } finally {
      setSavingMethod(false);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    try {
      await haulierService.deletePaymentMethod(methodId);
      await fetchData();
    } catch {
      setMethodError('Failed to delete payment method.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total Spent {summary.period ? `- ${summary.period}` : ''}
          </p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : fmtMoney(summary.totalSpent)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Spend summary from backend</p>
        </div>
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-6 relative overflow-hidden">
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-white/10 text-[140px] pointer-events-none">lock</span>
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Funds in Escrow</p>
          <p className="text-4xl font-black">{loading ? '...' : fmtMoney(escrowTotal)}</p>
          <p className="text-indigo-200 text-xs mt-2 font-medium">Held until delivery is approved.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saved Payment Methods</p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : methods.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Linked bank accounts</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-4">
        <span className="material-symbols-outlined text-indigo-500 shrink-0 text-base mt-0.5">info</span>
        <p className="text-xs text-indigo-800 font-medium leading-relaxed">
          Payments are held in escrow once a job is fully paid. Add a bank account here to receive released payments.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {error ? (
              <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
            ) : items.length === 0 && !loading ? (
              <Empty icon="security" title="No funds in escrow" sub="Escrow payments will appear here once you book a job and make payment." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Job Ref', 'Route', 'Goods', 'Amount', 'Escrowed On', 'Status'].map((header) => (
                        <th key={header} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item) => (
                      <tr key={item.paymentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{item.jobRef || '—'}</td>
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="text-xs font-bold text-slate-700 truncate">{item.pickupAddress || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">→ {item.dropAddress || '—'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{item.goodsType || '—'}</td>
                        <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount)}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{fmtDate(item.escrowedAt)}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              STATUS_STYLES[item.status?.toUpperCase()] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {total > PER_PAGE && (
            <div className="flex justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <span className="px-4 py-2 text-sm font-bold text-slate-500">
                Page {page} of {Math.ceil(total / PER_PAGE)}
              </span>
              <button
                disabled={page >= Math.ceil(total / PER_PAGE)}
                onClick={() => setPage((value) => value + 1)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-5">
              <div>
                <h3 className="text-xl font-black mb-2">Payment Methods</h3>
                <p className="text-white/60 text-sm">
                  Add the three backend fields to connect a bank account for payouts.
                </p>
              </div>

              <form className="space-y-3" onSubmit={handleAddMethod}>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                    Account Name
                  </label>
                  <input
                    value={form.accountName}
                    onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    placeholder="Company / account holder"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                    Account Number
                  </label>
                  <input
                    value={form.accountNumber}
                    onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                    IFSC Code
                  </label>
                  <input
                    value={form.ifscCode}
                    onChange={(event) => setForm((current) => ({ ...current, ifscCode: event.target.value }))}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    placeholder="ABCD0123456"
                  />
                </div>

                {methodError && <p className="text-xs font-semibold text-red-300">{methodError}</p>}
                {methodSuccess && <p className="text-xs font-semibold text-emerald-300">{methodSuccess}</p>}

                <button
                  type="submit"
                  disabled={savingMethod}
                  className="w-full p-4 rounded-xl border border-dashed border-white/20 text-white/80 text-sm font-black flex items-center justify-center gap-2 hover:border-white/40 hover:text-white transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">
                    {savingMethod ? 'hourglass_top' : 'add_circle'}
                  </span>
                  {savingMethod ? 'Saving...' : 'Add New Method'}
                </button>
              </form>

              <div className="space-y-3">
                {methods.length === 0 ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-sm font-bold">No payment methods saved yet.</p>
                    <p className="text-xs text-white/50 mt-1">Add one using the three fields above.</p>
                  </div>
                ) : (
                  methods.map((method) => (
                    <div
                      key={method.methodId}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 group hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">**** {methodTail(method.methodId)}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">
                            {(method.type || 'bank_account').replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMethod(method.methodId)}
                        className="opacity-80 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white"
                        aria-label="Delete payment method"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <span className="material-symbols-outlined absolute -bottom-12 -right-12 text-white/5 text-[200px] pointer-events-none">
              account_balance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryTab: React.FC = () => {
  const [items, setItems] = useState<EscrowPaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: PER_PAGE };
      if (statusFilter) params.status = statusFilter;
      const response = await haulierService.getPaymentHistory(params) as {
        items?: EscrowPaymentItem[];
        total?: number;
      };
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setError('');
    } catch {
      setError('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPaid = items.filter((item) => item.status === 'RELEASED').reduce((sum, item) => sum + item.amount, 0);
  const totalEscrowed = items.filter((item) => item.status === 'ESCROWED').reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: total, money: false, color: 'text-primary' },
          { label: 'Released', value: totalPaid, money: true, color: 'text-emerald-600' },
          { label: 'In Escrow', value: totalEscrowed, money: true, color: 'text-indigo-600' },
          { label: 'This Page', value: items.length, money: false, color: 'text-slate-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_4px_rgba(26,43,60,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>
              {loading ? '...' : stat.money ? fmtMoney(stat.value as number) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Status</label>
        {['', 'ESCROWED', 'RELEASED', 'REFUNDED', 'PENDING'].map((status) => (
          <button
            key={status || 'ALL'}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
              statusFilter === status
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="receipt_long" title="No payment records" sub="Your transaction history will appear here once jobs are paid." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Route', 'Amount', 'Currency', 'Status', 'Escrowed', 'Released', 'Date'].map((header) => (
                    <th key={header} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.paymentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{item.jobRef || '—'}</td>
                    <td className="px-5 py-4 max-w-[180px]">
                      <p className="text-xs font-bold text-slate-700 truncate">{item.pickupAddress || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">→ {item.dropAddress || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{item.currency}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          STATUS_STYLES[item.status?.toUpperCase()] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.escrowedAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.releasedAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">
            Page {page} of {Math.ceil(total / PER_PAGE)}
          </span>
          <button
            disabled={page >= Math.ceil(total / PER_PAGE)}
            onClick={() => setPage((value) => value + 1)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const InvoicesTab: React.FC = () => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await haulierService.listInvoices({ page, per_page: PER_PAGE }) as {
        items?: InvoiceItem[];
        total?: number;
      };
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setError('');
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Invoices</p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : total}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-amber-500 text-3xl">description</span>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Auto-Generated</p>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Invoices are generated when a job payment is secured. Download them as PDF for your records.
            </p>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="description" title="No invoices yet" sub="Invoices are generated automatically when payment is secured for a job." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Amount', 'Currency', 'Invoice', 'Download'].map((header) => (
                    <th key={header} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((invoice) => (
                  <tr key={invoice.jobId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{invoice.jobRef}</td>
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(invoice.amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{invoice.currency}</td>
                    <td className="px-5 py-4">
                      {invoice.invoiceUrl ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                          <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.invoiceUrl ? (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black hover:opacity-90 transition-colors shadow-sm shadow-primary/20"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          PDF
                        </a>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await haulierService.downloadInvoicePDF(invoice.jobId);
                              await fetchData();
                            } catch {
                              setError('Failed to generate invoice.');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">
            Page {page} of {Math.ceil(total / PER_PAGE)}
          </span>
          <button
            disabled={page >= Math.ceil(total / PER_PAGE)}
            onClick={() => setPage((value) => value + 1)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const HaulierPaymentsPage: React.FC = () => {
  const location = useLocation();
  const activeTab = TAB_LINKS.find((tab) => location.pathname.startsWith(tab.to))?.label ?? 'Escrow';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-primary tracking-tight">Payments</h2>
        <p className="text-slate-500 font-medium mt-1">Manage escrow, transaction history, and invoices.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 inline-flex gap-1 shadow-[0_2px_8px_rgba(26,43,60,0.05)]">
        {TAB_LINKS.map((tab) => {
          const isActive = location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-xs font-black uppercase tracking-widest">Payments</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-xs font-black uppercase tracking-widest text-primary">{activeTab}</span>
      </div>

      {location.pathname.startsWith('/haulier/payments/escrow') && <EscrowTab />}
      {location.pathname.startsWith('/haulier/payments/history') && <HistoryTab />}
      {location.pathname.startsWith('/haulier/payments/invoices') && <InvoicesTab />}
      {location.pathname === '/haulier/payments' && <EscrowTab />}
    </div>
  );
};

export default HaulierPaymentsPage;
