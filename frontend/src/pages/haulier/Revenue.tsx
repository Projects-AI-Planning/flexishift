import { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, index) => currentYear - index);

const fmt = (value: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type RevenueReport = {
  period?: string;
  summary?: {
    totalRevenue?: number;
    releasedRevenue?: number;
    escrowedRevenue?: number;
    pendingRevenue?: number;
    refunds?: number;
    netRevenue?: number;
    averagePerLoad?: number;
    completedJobs?: number;
    currency?: string;
  };
  breakdown?: Array<{ label: string; value: number }>;
  items?: Array<{
    paymentId: string;
    jobId: string;
    jobReference: string;
    route?: string;
    amount: number;
    currency: string;
    status: string;
    jobStatus: string;
    releasedAt?: string;
    createdAt?: string;
  }>;
};

export default function HaulierRevenuePage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(
    () => ({ period: 'monthly', month: String(selectedMonth), year: String(selectedYear) }),
    [selectedMonth, selectedYear],
  );

  const load = async () => {
    setLoading(true);
    try {
      const result = await haulierService.getRevenueAnalytics(params);
      setData(result as RevenueReport);
      setError('');
    } catch (err: unknown) {
      const response = err as {
        response?: {
          data?: { message?: string; detail?: string };
        };
      };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setError(message ? `Failed to load revenue: ${message}` : 'Failed to load revenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params]);

  const summary = data?.summary ?? {};
  const breakdown = data?.breakdown ?? [];
  const items = data?.items ?? [];
  const chartMax = Math.max(...breakdown.map((item) => item.value), 1);
  const periodLabel = data?.period ?? `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Reports & Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Revenue Analytics</h1>
          <p className="text-on-surface-variant font-medium">Backend-driven earnings, released payments, and monthly revenue view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Current period</p>
          <p className="mt-1 text-sm font-medium text-[#44474C]">Showing data for {periodLabel}</p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Revenue</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{fmt(summary.totalRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">All earnings shown for the selected month.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Released</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-700">{fmt(summary.releasedRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Released into your account.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Escrowed</p>
          <h3 className="mt-2 text-3xl font-black text-[#0a4a8f]">{fmt(summary.escrowedRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Payments waiting in escrow.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Net Revenue</p>
          <h3 className="mt-2 text-3xl font-black text-sky-700">{fmt(summary.netRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Released minus refunds.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-primary">Revenue Breakdown</h2>
              <p className="text-sm text-slate-500">Backend summary for {periodLabel}.</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Average per load: {fmt(summary.averagePerLoad ?? 0)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
            {breakdown.map((item) => {
              const height = Math.max(8, (item.value / chartMax) * 220);
              return (
                <div key={item.label} className="flex flex-col items-center gap-3">
                  <div className="flex h-[240px] w-full items-end rounded-2xl bg-slate-50 p-3">
                    <div className="w-full rounded-xl bg-slate-900 shadow-lg" style={{ height: `${height}px` }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="mt-1 text-sm font-black text-primary">{fmt(item.value)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Completed Loads</h2>
          <p className="text-sm text-slate-500">Jobs that have contributed to revenue.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Completed Jobs</p>
              <p className="mt-1 text-2xl font-black text-primary">{summary.completedJobs ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Refunds</p>
              <p className="mt-1 text-2xl font-black text-primary">{fmt(summary.refunds ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Currency</p>
              <p className="mt-1 text-2xl font-black text-primary">{summary.currency ?? 'INR'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-primary">Recent Revenue Entries</h2>
            <p className="text-sm text-slate-500">Latest released or pending revenue from your loads.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Selected period: {periodLabel}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Job Ref</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length ? items.map((item) => (
                <tr key={item.paymentId}>
                  <td className="px-4 py-4 font-medium text-[#44474C]">{item.jobReference}</td>
                  <td className="px-4 py-4 text-[#44474C]">{item.route ?? 'N/A'}</td>
                  <td className="px-4 py-4 text-[#44474C]">{item.status.replace('_', ' ')}</td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#041627]">{fmt(item.amount, item.currency)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    No revenue entries available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
