import { useMemo, useState } from 'react';
import { useAdminJobs, useAdminStats } from '../../../hooks/useAdmin';
import type { Job } from '../../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Jobs' },
  { value: 'OPEN', label: 'Open' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'PAYMENT_SECURED', label: 'Payment Secured' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DISPUTED', label: 'Disputed' },
];

const fmtMoney = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
    : '—';

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'in_transit') return 'bg-blue-100 text-blue-700';
  if (normalized === 'disputed') return 'bg-orange-100 text-orange-700';
  if (normalized === 'cancelled') return 'bg-rose-100 text-rose-700';
  if (normalized === 'payment_secured' || normalized === 'booked') return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-[#44474C]';
};

export default function JobsAnalyticsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({ page: 1, limit: 25, status, search }),
    [search, status],
  );

  const { data, loading, error, refresh } = useAdminJobs(params);
  const { stats } = useAdminStats();

  const items = data?.items ?? [];
  const totalOpen = items.filter((job) => job.status.toUpperCase() !== 'COMPLETED' && job.status.toUpperCase() !== 'CANCELLED').length;
  const totalRevenue = items.reduce((sum, job) => sum + (job.agreedAmount ?? 0), 0);

  const statusCounts = items.reduce<Record<string, number>>((acc, job) => {
    const key = job.status.toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Total Jobs', value: String(stats?.totalJobs ?? data?.total ?? 0) },
    { label: 'Open / Active', value: String(stats?.openJobs ?? totalOpen) },
    { label: 'Completed', value: String(stats?.completedJobs ?? 0) },
    { label: 'Revenue in view', value: fmtMoney(totalRevenue) },
  ];

  const chartSeries = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const chartMax = Math.max(...chartSeries.map((item) => item.value), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Reports & Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Job Analytics</h1>
          <p className="text-on-surface-variant font-medium">Monitor platform job flow and status distribution from the backend.</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
            <h3 className="mt-2 text-3xl font-black text-primary">{card.value}</h3>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Status Mix</h2>
          <p className="text-sm text-slate-500">Jobs currently loaded from the monitor endpoint.</p>
          <div className="mt-5 space-y-3">
            {Object.entries(statusCounts).length > 0 ? (
              Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(key)}`}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-lg font-black text-primary">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No job data in the current view.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Recent Jobs</h2>
              <p className="text-sm text-slate-500">Results from `/dashboard/admin/jobs/monitor`.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job ref or location"
                className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`mt-5 overflow-x-auto rounded-2xl border border-slate-100 ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Job</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((job: Job) => {
                  const pickup = typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address;
                  const drop = typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address;
                  const tone = statusTone(job.status);

                  return (
                    <tr key={job.jobId} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-black text-primary">{job.jobRef}</p>
                        <p className="text-xs text-slate-500">{job.goodsType ?? 'Goods data unavailable'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-medium text-[#44474C]">{pickup ?? 'Pickup unavailable'}</p>
                        <p className="text-xs text-slate-400">→ {drop ?? 'Drop unavailable'}</p>
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-[#041627]">{fmtMoney(job.agreedAmount)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone}`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                      No jobs match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-primary">Job Status Chart</h2>
            <p className="text-sm text-slate-500">Current distribution of jobs loaded from the monitor endpoint.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Visible rows: {items.length}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {chartSeries.length > 0 ? chartSeries.map((item) => {
            const height = Math.max(8, (item.value / chartMax) * 220);
            return (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <div className="flex h-[240px] w-full items-end rounded-2xl bg-slate-50 p-3">
                  <div className={`w-full rounded-xl ${statusTone(item.label)} shadow-lg`} style={{ height: `${height}px` }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm font-black text-primary">{item.value}</p>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No chart data available yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
