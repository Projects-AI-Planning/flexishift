import { useState, useMemo } from 'react';
import { useActiveDisputes } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { Dispute } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function ActiveDisputesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const params = useMemo(() => ({ search: search || undefined, page, limit }), [search, page]);
  const { data, loading, error, refresh } = useActiveDisputes(params);

  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState({
    resolution: 'release_full_payment',
    refundAmount: 0,
    releaseAmount: 0,
    adminNote: '',
    notifyBothParties: true,
  });
  const [resolving, setResolving] = useState(false);

  const openModal = (d: Dispute) => {
    setSelected(d);
    setResolution((r) => ({ ...r, releaseAmount: d.totalAmount ?? 0 }));
  };

  const handleResolve = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      await adminService.resolveDispute(selected.jobId, resolution);
      setSelected(null);
      refresh();
    } catch {
      alert('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#041627]">Active Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Disputes currently under admin review</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {data && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {data.total} open
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
                {['Job Ref', 'Dispute Reason', 'Haulier', 'Driver', 'Amount on Hold', 'Raised', 'Action'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items.map((d) => (
                <tr key={d.disputeId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-primary">{d.jobReference}</td>
                  <td className="px-5 py-4">
                    <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
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
                  <td className="px-5 py-4 font-bold text-orange-600">{fmt(d.totalAmount ?? 0)}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openModal(d)}
                      className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-2">⚖️</div>
                    <p>No active disputes found.</p>
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

      {/* Resolution Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 lg:p-8 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-[#041627]">Resolve Dispute</h3>
              <p className="text-sm text-gray-500 mt-1">
                Job: <span className="font-semibold text-primary">{selected.jobReference}</span> &nbsp;·&nbsp; On hold: <span className="font-semibold text-orange-600">{fmt(selected.totalAmount ?? 0)}</span>
              </p>
            </div>

            {selected.pickupLocation && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-[#44474C] space-y-1">
                <div>📍 <span className="font-medium">From:</span> {selected.pickupLocation}</div>
                <div>🏁 <span className="font-medium">To:</span> {selected.dropLocation}</div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Resolution Type</label>
              <select
                value={resolution.resolution}
                onChange={(e) => setResolution((r) => ({ ...r, resolution: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="release_full_payment">Release Full Payment to Driver</option>
                <option value="full_refund">Full Refund to Haulier</option>
                <option value="partial_refund">Partial Refund / Split</option>
              </select>
            </div>

            {resolution.resolution === 'partial_refund' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Refund to Haulier (₹)</label>
                  <input type="number" value={resolution.refundAmount} onChange={(e) => setResolution((r) => ({ ...r, refundAmount: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Release to Driver (₹)</label>
                  <input type="number" value={resolution.releaseAmount} onChange={(e) => setResolution((r) => ({ ...r, releaseAmount: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Admin Note</label>
              <textarea rows={3} value={resolution.adminNote} onChange={(e) => setResolution((r) => ({ ...r, adminNote: e.target.value }))}
                placeholder="Explain the reason for this resolution..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={handleResolve} disabled={resolving}
                className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
              <button onClick={() => setSelected(null)}
                className="px-6 bg-gray-100 text-[#44474C] font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
