import { useState, useMemo } from 'react';
import { useResolvedDisputes } from '../../hooks/useAdmin';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function ResolvedDisputesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const params = useMemo(() => ({ search: search || undefined, page, limit }), [search, page]);
  const { data, loading, error, refresh } = useResolvedDisputes(params);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const resolutionDays = (raisedAt: string, resolvedAt?: string) => {
    if (!resolvedAt) return null;
    const diff = new Date(resolvedAt).getTime() - new Date(raisedAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#041627]">Resolved Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Disputes that have been resolved and closed</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {data && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {data.total} resolved
            </span>
          )}
          <button onClick={refresh} className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
        <input
          type="text"
          placeholder="Search by job ref..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Job Ref', 'Dispute Reason', 'Haulier', 'Driver', 'Amount', 'Raised', 'Resolved', 'Resolution Time'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items.map((d) => {
                const timeTaken = resolutionDays(d.createdAt, d.resolvedAt);
                return (
                  <tr key={d.disputeId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-primary">{d.jobReference}</td>
                    <td className="px-5 py-4">
                      <span className="bg-gray-100 text-[#44474C] text-xs font-medium px-2 py-1 rounded-full">
                        {(d.disputeReason ?? 'Unknown').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#041627]">{d.haulier?.name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{d.haulier?.phone ?? ''}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#041627]">{d.driver?.name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{d.driver?.phone ?? ''}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-[#44474C]">{fmt(d.totalAmount ?? 0)}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {d.resolvedAt ? (
                        <span className="text-emerald-700 font-medium">{new Date(d.resolvedAt).toLocaleDateString()}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {timeTaken ? (
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{timeTaken}</span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-2">✅</div>
                    <p>No resolved disputes found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-[#44474C]">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
