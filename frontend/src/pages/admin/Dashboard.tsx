import { useMemo } from 'react';
import { useAdminStats } from '../../hooks/useAdmin';

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const StatCard = ({
  label,
  value,
  note,
  accent,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  accent: 'slate' | 'emerald' | 'amber' | 'blue';
  icon: string;
}) => {
  const accentClasses = {
    slate: 'bg-slate-900 text-white',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <div className={`rounded-3xl border p-4 shadow-sm sm:p-6 ${accentClasses[accent]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${accent === 'slate' ? 'text-white/60' : 'text-slate-400'}`}>
            {label}
          </p>
          <h3 className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight ${accent === 'slate' ? 'text-white' : 'text-primary'}`}>
            {value}
          </h3>
          <p className={`mt-2 text-xs ${accent === 'slate' ? 'text-white/55' : 'text-slate-500'}`}>{note}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent === 'slate' ? 'bg-white/10' : 'bg-white'}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { stats, loading, error, refresh } = useAdminStats();

  const derived = useMemo(() => {
    if (!stats) return null;
    const completionRate = pct(stats.completedJobs, stats.totalJobs);
    const openRate = pct(stats.openJobs, stats.totalJobs);
    const revenuePerUser = stats.totalUsers > 0 ? Math.round(stats.totalRevenue / stats.totalUsers) : 0;
    return { completionRate, openRate, revenuePerUser };
  }, [stats]);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>;
  }

  if (loading || !stats || !derived) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const chartMax = Math.max(stats.totalUsers, stats.totalJobs, stats.pendingDocuments, 1);
  const bars = [
    { label: 'Users', value: stats.totalUsers, tone: 'bg-slate-900' },
    { label: 'Jobs', value: stats.totalJobs, tone: 'bg-blue-600' },
    { label: 'Completed', value: stats.completedJobs, tone: 'bg-emerald-500' },
    { label: 'Open', value: stats.openJobs, tone: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-4 py-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-6 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.18),transparent_35%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Admin Dashboard</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl md:text-5xl">Operational overview for FreightFlex</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              A clean snapshot of platform activity based entirely on the backend stats payload. No placeholder records, no invented entries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#041627] transition hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10">
              <span className="material-symbols-outlined text-sm">file_download</span>
              Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          note="All registered platform accounts."
          accent="slate"
          icon="groups"
        />
        <StatCard
          label="Active Users"
          value={stats.activeUsers.toLocaleString()}
          note={`${pct(stats.activeUsers, stats.totalUsers)}% of total users`}
          accent="emerald"
          icon="person_check"
        />
        <StatCard
          label="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          note={`${stats.completedJobs.toLocaleString()} completed jobs tracked`}
          accent="blue"
          icon="local_shipping"
        />
        <StatCard
          label="Pending Documents"
          value={stats.pendingDocuments.toLocaleString()}
          note="Documents awaiting admin review."
          accent="amber"
          icon="description"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-primary">Platform Health</h2>
              <p className="text-sm text-slate-500">Derived from live backend counters.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Revenue per user: {fmtCurrency(derived.revenuePerUser)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Job Completion Rate</p>
              <p className="mt-2 text-3xl font-black text-[#041627]">{derived.completionRate}%</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${derived.completionRate}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open Job Ratio</p>
              <p className="mt-2 text-3xl font-black text-[#041627]">{derived.openRate}%</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${derived.openRate}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Platform Revenue</p>
              <p className="mt-2 text-3xl font-black text-[#041627]">{fmtCurrency(stats.totalRevenue)}</p>
              <p className="mt-2 text-xs text-slate-500">From released payments only.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-primary">Data Distribution</h3>
                <p className="text-xs text-slate-500">Small visual summary using the real counts already in the dashboard.</p>
              </div>
              <div className="text-xs font-bold text-slate-500">Live stats</div>
            </div>

            <div className="mt-5 flex h-56 items-end gap-3">
              {bars.map((bar) => {
                const height = Math.max(24, (bar.value / chartMax) * 180);
                return (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-3">
                    <div className="flex h-full w-full items-end rounded-2xl bg-white p-3 shadow-sm">
                      <div className={`w-full rounded-xl ${bar.tone}`} style={{ height: `${height}px` }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{bar.label}</p>
                      <p className="mt-1 text-sm font-black text-primary">{bar.value.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-primary">Quick Summary</h2>
          <p className="text-sm text-slate-500">Same entries, cleaner presentation.</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#44474C]">Open Jobs</span>
                <span className="text-lg font-black text-amber-600">{stats.openJobs.toLocaleString()}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${derived.openRate}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#44474C]">Completed Jobs</span>
                <span className="text-lg font-black text-emerald-700">{stats.completedJobs.toLocaleString()}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${derived.completionRate}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#44474C]">Pending Documents</span>
                <span className="text-lg font-black text-blue-700">{stats.pendingDocuments.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Pending review queue for admin verification.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#44474C]">Total Revenue</span>
                <span className="text-lg font-black text-[#041627]">{fmtCurrency(stats.totalRevenue)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Aggregate revenue from released payments.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
