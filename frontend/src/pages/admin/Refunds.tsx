import React, { useState } from 'react';
import { useAdminPayments } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { AdminPayment } from '../../types';

const fmt = (val: number, cur = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur === 'INR' ? 'INR' : 'GBP' }).format(val);

const EMPTY_FORM = { refundAmount: '', reason: '', refundTo: '' };

const RefundsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: 'REFUNDED', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminPayments(params);

  // Modal for processing a new refund
  const [refundTarget, setRefundTarget] = useState<AdminPayment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalRefunded = data?.items.reduce((s, p) => s + p.amount, 0) ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amount = parseFloat(form.refundAmount);
    if (!amount || amount <= 0) { setFormError('Enter a valid refund amount.'); return; }
    if (!form.reason.trim()) { setFormError('Reason is required.'); return; }
    if (!form.refundTo.trim()) { setFormError('Refund recipient is required.'); return; }
    if (!refundTarget) return;

    setSubmitting(true);
    try {
      await adminService.processRefund(refundTarget.jobId, {
        refundAmount: amount,
        reason: form.reason,
        refundTo: form.refundTo,
      });
      setRefundTarget(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Failed to process refund. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Refunds</h2>
          <p className="text-on-surface-variant font-medium">Payment refund history and refund processing.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg text-sm font-bold text-purple-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">undo</span>
            {data?.total ?? 0} Refunds
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">currency_pound</span>
            {fmt(totalRefunded)} Refunded
          </div>
        </div>
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

      {/* Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Refund Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Escrowed On</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Refunded On</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.items.map((p: AdminPayment) => (
                <tr key={p.paymentId} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm text-purple-600">undo</span>
                      </div>
                      <div>
                        <p className="font-black text-primary text-sm">{p.jobRef || '—'}</p>
                        <p className="text-[10px] text-slate-400">{p.paymentId.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary">{p.haulier?.name || '—'}</p>
                    {p.haulier?.phone && <p className="text-xs text-slate-400">{p.haulier.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary">{p.driver?.name || '—'}</p>
                    {p.driver?.phone && <p className="text-xs text-slate-400">{p.driver.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-purple-700">{fmt(p.amount, p.currency)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {p.escrowedAt ? new Date(p.escrowedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {p.releasedAt ? new Date(p.releasedAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                      REFUNDED
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">undo</span>
                    No refunds processed yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} refunds</p>
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
      </div>

      {/* Process Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-primary">Process Refund</h3>
                <p className="text-xs text-slate-400 mt-0.5">Job: {refundTarget.jobRef}</p>
              </div>
              <button onClick={() => { setRefundTarget(null); setForm(EMPTY_FORM); setFormError(''); }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Summary */}
            <div className="mx-6 mt-5 bg-slate-50 rounded-xl p-4 flex justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Haulier</p>
                <p className="text-sm font-bold text-primary">{refundTarget.haulier?.name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Amount</p>
                <p className="text-sm font-black text-primary">{fmt(refundTarget.amount, refundTarget.currency)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Refund Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">£</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundTarget.amount}
                    value={form.refundAmount}
                    onChange={(e) => setForm({ ...form, refundAmount: e.target.value })}
                    placeholder={refundTarget.amount.toFixed(2)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Refund Recipient</label>
                <input
                  required
                  value={form.refundTo}
                  onChange={(e) => setForm({ ...form, refundTo: e.target.value })}
                  placeholder="Haulier / Driver name or account"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason for Refund</label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Describe why this refund is being issued..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setRefundTarget(null); setForm(EMPTY_FORM); setFormError(''); }}
                  className="px-5 py-2 text-sm font-black text-[#44474C] bg-slate-100 rounded-xl hover:bg-slate-200"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-black text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  Issue Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsPage;
