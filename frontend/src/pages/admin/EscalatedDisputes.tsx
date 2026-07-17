import { useState, useMemo } from 'react';
import { useEscalatedDisputes } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { Dispute } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function urgencyColor(hours: number) {
  if (hours >= 168) return 'bg-red-600 text-white';
  if (hours >= 96) return 'bg-red-100 text-red-700';
  return 'bg-orange-100 text-orange-700';
}

export default function EscalatedDisputesPage() {
  const [page, setPage] = useState(1);
  const limit = 12;

  const params = useMemo(() => ({ page, limit }), [page]);
  const { data, loading, error, refresh } = useEscalatedDisputes(params);

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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#041627]">Escalated Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Disputes open for more than 48 hours — require urgent attention</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {data && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {data.total} escalated
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

      {/* Urgency banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-red-500 text-xl">🚨</span>
        <p className="text-red-700 text-sm font-medium">
          These disputes have exceeded the 48-hour SLA. Resolve them immediately to unblock escrowed payments.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-8 bg-gray-200 rounded w-1/3 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.items.map((d) => {
            const hours = d.hoursOpen ?? 0;
            return (
              <div key={d.disputeId} className="bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-primary">{d.jobReference}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Raised {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${urgencyColor(hours)}`}>
                    {hours}h open
                  </span>
                </div>

                {/* Reason */}
                <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
                  {(d.disputeReason ?? 'Reason not specified').replace(/_/g, ' ')}
                </div>

                {/* Route */}
                {(d.pickupLocation || d.dropLocation) && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex gap-1.5 items-start">
                      <span className="text-green-500 mt-0.5">●</span>
                      <span className="line-clamp-1">{d.pickupLocation ?? '—'}</span>
                    </div>
                    <div className="flex gap-1.5 items-start">
                      <span className="text-red-500 mt-0.5">●</span>
                      <span className="line-clamp-1">{d.dropLocation ?? '—'}</span>
                    </div>
                  </div>
                )}

                {/* Parties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Haulier</p>
                    <p className="font-semibold text-blue-800 truncate">{d.haulier?.name ?? '—'}</p>
                    <p className="text-blue-600">{d.haulier?.phone ?? ''}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Driver</p>
                    <p className="font-semibold text-indigo-800 truncate">{d.driver?.name ?? '—'}</p>
                    <p className="text-indigo-600">{d.driver?.phone ?? ''}</p>
                  </div>
                </div>

                {/* Amount + Action */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">On Hold</p>
                    <p className="font-bold text-orange-600">{fmt(d.totalAmount ?? 0)}</p>
                  </div>
                  <button
                    onClick={() => openModal(d)}
                    className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Resolve Now
                  </button>
                </div>
              </div>
            );
          })}
          {data.items.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-lg font-medium text-gray-500">No escalated disputes</p>
              <p className="text-sm mt-1">All disputes are being handled within SLA.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#44474C]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <div>
                <h3 className="text-xl font-bold text-[#041627]">Resolve Escalated Dispute</h3>
                <p className="text-sm text-red-600 font-medium mt-0.5">
                  Open for {selected.hoursOpen ?? 0}h — {selected.jobReference}
                </p>
              </div>
            </div>

            {selected.pickupLocation && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-[#44474C] space-y-1">
                <div>📍 <span className="font-medium">From:</span> {selected.pickupLocation}</div>
                <div>🏁 <span className="font-medium">To:</span> {selected.dropLocation}</div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Resolution Type</label>
              <select value={resolution.resolution} onChange={(e) => setResolution((r) => ({ ...r, resolution: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary">
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
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
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
