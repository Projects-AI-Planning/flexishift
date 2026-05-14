import React, { useState } from 'react';
import { useAdminPayments } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { AdminPayment } from '../../types';

const fmt = (val: number, cur = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur === 'INR' ? 'INR' : 'GBP' }).format(val);

const EscrowPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: 'ESCROWED', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminPayments(params);

  const [releasing, setReleasing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const totalEscrowed = data?.items.reduce((s, p) => s + p.amount, 0) ?? 0;

  const handleRelease = async (payment: AdminPayment) => {
    setReleasing(payment.paymentId);
    try {
      await adminService.releaseEscrow(payment.jobId);
      refresh();
    } catch {
      alert('Failed to release escrow. Please try again.');
    } finally {
      setReleasing(null);
      setConfirmId(null);
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight sm:text-2xl lg:text-3xl">Escrow</h2>
          <p className="text-on-surface-variant font-medium">Payments held in escrow pending job delivery confirmation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-sm font-bold text-blue-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">lock</span>
            {data?.total ?? 0} In Escrow
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
            {fmt(totalEscrowed)} Held
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
        <p className="text-sm text-blue-700 font-medium">
          Escrow funds are held until the haulier confirms delivery. Release transfers funds directly to the driver's bank account. This action cannot be undone.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by job reference..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Cards */}
      <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {data?.items.map((p: AdminPayment) => (
          <div key={p.paymentId} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-blue-100 overflow-x-auto">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left — job/payment details */}
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600">lock</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-primary text-sm">{p.jobRef || '—'}</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      ESCROWED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Payment ID: {p.paymentId.slice(0, 12).toUpperCase()}
                  </p>
                  {p.escrowedAt && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Escrowed on {new Date(p.escrowedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Middle — parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Haulier</p>
                  <p className="text-sm font-bold text-primary">{p.haulier?.name || '—'}</p>
                  {p.haulier?.phone && <p className="text-xs text-slate-400">{p.haulier.phone}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Driver</p>
                  <p className="text-sm font-bold text-primary">{p.driver?.name || 'Unassigned'}</p>
                  {p.driver?.phone && <p className="text-xs text-slate-400">{p.driver.phone}</p>}
                </div>
              </div>

              {/* Right — amount + action */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                  <p className="text-xl font-black text-primary">{fmt(p.amount, p.currency)}</p>
                </div>
                {confirmId === p.paymentId ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-2 text-xs font-black text-[#44474C] bg-slate-100 rounded-lg hover:bg-slate-200"
                    >Cancel</button>
                    <button
                      onClick={() => handleRelease(p)}
                      disabled={releasing === p.paymentId}
                      className="px-3 py-2 text-xs font-black text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {releasing === p.paymentId && (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      )}
                      Confirm Release
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(p.paymentId)}
                    className="px-4 py-2 text-xs font-black text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">send_money</span>
                    Release
                  </button>
                )}
              </div>
            </div>

            {/* Route bar */}
            {(p.pickupLocation || p.dropLocation) && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="material-symbols-outlined text-sm text-green-500">location_on</span>
                <span className="truncate">{p.pickupLocation || '—'}</span>
                <span className="material-symbols-outlined text-sm text-slate-300">arrow_forward</span>
                <span className="truncate">{p.dropLocation || '—'}</span>
                <span className="material-symbols-outlined text-sm text-red-400">flag</span>
              </div>
            )}
          </div>
        ))}

        {!loading && data?.items.length === 0 && (
          <div className="bg-slate-50 p-12 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">lock_open</span>
            <p className="text-sm font-bold text-slate-400">No funds currently in escrow</p>
            <p className="text-xs text-slate-400 mt-1">Escrowed payments will appear here after verification.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} escrow records</p>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >Previous</button>
            <button
              disabled={!data || data.items.length < params.limit}
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowPage;
