import { useMemo, useState } from 'react';
import { useAdminStats, useAdminUsers } from '../../../hooks/useAdmin';
import type { User } from '../../../types';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'driver', label: 'Driver' },
  { value: 'haulier', label: 'Haulier' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function UsersAnalyticsPage() {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({ page: 1, limit: 25, role, status, search }),
    [role, search, status],
  );

  const { data, loading, error, refresh } = useAdminUsers(params);
  const { stats } = useAdminStats();

  const items = data?.items ?? [];
  const roleCounts = items.reduce<Record<string, number>>((acc, user) => {
    const key = user.role.toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const activeCount = items.filter((user) => user.status === 'ACTIVE').length;
  const suspendedCount = items.filter((user) => user.status === 'SUSPENDED').length;
  const chartSeries = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const chartMax = Math.max(...chartSeries.map((item) => item.value), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Reports & Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">User Analytics</h1>
          <p className="text-on-surface-variant font-medium">Role and account distribution from the backend user list.</p>
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
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Users</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{stats?.totalUsers ?? data?.total ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active Accounts</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-700">{stats?.activeUsers ?? activeCount}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Suspended Accounts</p>
          <h3 className="mt-2 text-3xl font-black text-rose-600">{suspendedCount}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Pending Docs</p>
          <h3 className="mt-2 text-3xl font-black text-amber-600">{stats?.pendingDocuments ?? 0}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Role Mix</h2>
          <p className="text-sm text-slate-500">Loaded from the admin users endpoint.</p>
          <div className="mt-5 space-y-3">
            {Object.keys(roleCounts).length > 0 ? (
              Object.entries(roleCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{key}</span>
                      <span className="text-lg font-black text-primary">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No users match the current filters.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">User Snapshot</h2>
              <p className="text-sm text-slate-500">Search and filter backend users in one place.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((user: User) => (
                  <tr key={user.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-black text-primary">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#44474C]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : user.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                      No users match the selected filters.
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
            <h2 className="text-lg font-black text-primary">Role Distribution Chart</h2>
            <p className="text-sm text-slate-500">Current role mix from the filtered admin user list.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Active accounts in view: {activeCount}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
          {chartSeries.length > 0 ? chartSeries.map((item) => {
            const height = Math.max(8, (item.value / chartMax) * 220);
            return (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <div className="flex h-[240px] w-full items-end rounded-2xl bg-slate-50 p-3">
                  <div
                    className={`w-full rounded-xl ${
                      item.label === 'admin'
                        ? 'bg-slate-900'
                        : item.label === 'haulier'
                          ? 'bg-amber-500'
                          : 'bg-primary'
                    } shadow-lg`}
                    style={{ height: `${height}px` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-primary">{item.value}</p>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No role distribution data available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
