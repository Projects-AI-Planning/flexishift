import { useMemo, useState } from 'react';
import { useAdminRevenue, useAdminStats } from '../../../hooks/useAdmin';

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

export default function RevenueAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const params = useMemo(
    () => ({ period: 'monthly', month: String(selectedMonth), year: String(selectedYear) }),
    [selectedMonth, selectedYear],
  );

  const { data, loading, error, refresh } = useAdminRevenue(params);
  const { stats } = useAdminStats();
  const periodLabel = data?.period ?? `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  const rows = [
    { label: 'Gross Transaction Volume', value: fmt(data?.totalRevenue ?? 0), accent: false },
    { label: `Platform Commission (${data?.commissionRate ?? '5%'})`, value: fmt(data?.platformCommission ?? 0), accent: false },
    { label: 'Refunds Issued', value: fmt(data?.totalRefunds ?? 0), accent: false },
    { label: 'Net Platform Revenue', value: fmt(data?.netRevenue ?? 0), accent: true },
  ];

  const chartSeries = [
    { label: 'Gross', value: data?.totalRevenue ?? 0, tone: 'bg-slate-900' },
    { label: 'Commission', value: data?.platformCommission ?? 0, tone: 'bg-emerald-500' },
    { label: 'Refunds', value: data?.totalRefunds ?? 0, tone: 'bg-rose-500' },
    { label: 'Net', value: data?.netRevenue ?? 0, tone: 'bg-sky-500' },
  ];
  const chartMax = Math.max(...chartSeries.map((item) => item.value), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Reports & Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Revenue Analytics</h1>
          <p className="text-on-surface-variant font-medium">Backend-driven monthly revenue and commission reporting.</p>
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
            onClick={refresh}
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
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Gross Transaction Volume</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{fmt(data?.totalRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">From released payments for the selected period.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Platform Commission</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-700">{fmt(data?.platformCommission ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Commission rate: {data?.commissionRate ?? '5%'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Refunds</p>
          <h3 className="mt-2 text-3xl font-black text-rose-600">{fmt(data?.totalRefunds ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Refunds issued against platform transactions.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Net Revenue</p>
          <h3 className="mt-2 text-3xl font-black text-sky-700">{fmt(data?.netRevenue ?? 0)}</h3>
          <p className="mt-2 text-xs text-slate-500">Commission minus refunds for the selected period.</p>
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
              All-time revenue: {fmt(data?.allTimeRevenue ?? 0)}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Metric</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.label} className={row.accent ? 'bg-emerald-50' : ''}>
                    <td className={`px-4 py-4 font-medium ${row.accent ? 'text-emerald-900' : 'text-[#44474C]'}`}>
                      {row.label}
                    </td>
                    <td className={`px-4 py-4 text-right font-mono font-bold ${row.accent ? 'text-emerald-700' : 'text-[#041627]'}`}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Platform Snapshot</h2>
          <p className="text-sm text-slate-500">Live counters from admin stats.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Users</p>
              <p className="mt-1 text-2xl font-black text-primary">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active Jobs</p>
              <p className="mt-1 text-2xl font-black text-primary">{stats?.openJobs ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Pending Documents</p>
              <p className="mt-1 text-2xl font-black text-primary">{stats?.pendingDocuments ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-primary">Revenue Visual</h2>
            <p className="text-sm text-slate-500">Simple backend-driven comparison of the key revenue components.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Selected period: {periodLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
          {chartSeries.map((item) => {
            const height = Math.max(8, (item.value / chartMax) * 220);
            return (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <div className="flex h-[240px] w-full items-end rounded-2xl bg-slate-50 p-3">
                  <div className={`w-full rounded-xl ${item.tone} shadow-lg`} style={{ height: `${height}px` }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-primary">{fmt(item.value)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
