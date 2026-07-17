import React, { useMemo, useState } from 'react';
import { useAdminPayments, useAdminRevenue } from '../../hooks/useAdmin';
import type { AdminPayment } from '../../types';

const fmt = (val: number, cur = 'INR') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: cur === 'INR' ? 'INR' : 'GBP',
    maximumFractionDigits: 0,
  }).format(val);

const statusTone: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  escrowed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  released: { bg: 'bg-green-100', text: 'text-green-700' },
  refunded: { bg: 'bg-purple-100', text: 'text-purple-700' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
};

const PaymentsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: '', search: '', limit: 10 });
  const revenueParams = useMemo(() => ({ period: 'monthly' }), []);
  const escrowParams = useMemo(() => ({ page: 1, status: 'ESCROWED', limit: 10 }), []);
  const {
    data: paymentData,
    loading: paymentsLoading,
    error: paymentsError,
    refresh: refreshPayments,
  } = useAdminPayments(params);
  const {
    data: revenueData,
    loading: revenueLoading,
    error: revenueError,
    refresh: refreshRevenue,
  } = useAdminRevenue(revenueParams);
  const { data: escrowData } = useAdminPayments(escrowParams);

  const totalVolume = paymentData?.items.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const escrowVolume = escrowData?.items.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const releasedCount = paymentData?.items.filter((payment) => payment.status === 'RELEASED').length ?? 0;

  const revenueSummary = useMemo(() => ({
    totalTransactionValue: revenueData?.totalRevenue ?? 0,
    platformCommission: revenueData?.platformCommission ?? 0,
    totalRefunds: revenueData?.totalRefunds ?? 0,
    netRevenue: revenueData?.netRevenue ?? 0,
    allTimeRevenue: revenueData?.allTimeRevenue ?? 0,
    allTimeTransactions: revenueData?.allTimeTransactions ?? 0,
    commissionRate: revenueData?.commissionRate ?? '5%',
    period: revenueData?.period ?? 'current period',
  }), [revenueData]);

  const error = paymentsError ?? revenueError;

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Payment Control</h2>
          <p className="text-on-surface-variant font-medium">
            Backend-driven revenue, escrow, and release oversight.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              refreshPayments();
              refreshRevenue();
            }}
            className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 ${(paymentsLoading || revenueLoading) ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Transaction Volume</p>
          <h3 className="text-4xl font-black text-primary mt-1">{fmt(totalVolume)}</h3>
          <p className="text-xs text-slate-500 mt-2">Current page of payment records from the backend.</p>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-700/30 relative overflow-hidden">
          <p className="text-white/60 font-bold uppercase tracking-wider text-[10px]">Platform Revenue</p>
          <h3 className="text-4xl font-black text-white mt-1">{fmt(revenueSummary.platformCommission)}</h3>
          <p className="text-white/60 text-xs mt-2">Commission rate {revenueSummary.commissionRate} for {revenueSummary.period}.</p>
          <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-white/5 text-[160px] pointer-events-none">account_balance_wallet</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Escrow Held</p>
          <h3 className="text-4xl font-black text-primary mt-1">{fmt(escrowVolume)}</h3>
          <p className="text-xs text-slate-500 mt-2">{escrowData?.total ?? 0} payments waiting for approval.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Released Payments</p>
          <h3 className="text-4xl font-black text-primary mt-1">{releasedCount}</h3>
          <p className="text-xs text-slate-500 mt-2">{revenueSummary.allTimeTransactions} released transactions all time.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 shrink-0">lock</span>
        <p className="text-sm text-blue-700 font-medium">
          Escrow is released only after delivery approval. This screen reads the live payment ledger and revenue summary from the backend.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-6">
        <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${(paymentsLoading || revenueLoading) ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="px-4 py-4 sm:px-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-primary">Recent Payments</h3>
              <p className="text-sm text-slate-500">Latest payment records returned by `/dashboard/admin/payments/list`.</p>
            </div>
            <div className="relative w-full md:w-72">
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

          <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'ESCROWED', label: 'Escrowed' },
              { value: 'RELEASED', label: 'Released' },
              { value: 'REFUNDED', label: 'Refunded' },
              { value: 'FAILED', label: 'Failed' },
            ].map((option) => (
              <button
                key={option.value || 'all'}
                onClick={() => setParams({ ...params, status: option.value, page: 1 })}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-colors ${
                  params.status === option.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-50 text-[#44474C] border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job / Parties</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Escrowed</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Released</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paymentData?.items.map((payment: AdminPayment) => {
                  const tone = statusTone[payment.status.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-[#44474C]' };
                  return (
                    <tr key={payment.paymentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-primary text-sm">{payment.paymentId.slice(0, 10).toUpperCase()}</p>
                        <p className="text-xs text-slate-400">{payment.currency}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-primary text-sm">{payment.jobRef || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{payment.haulier?.name || 'Haulier N/A'} / {payment.driver?.name || 'Driver N/A'}</p>
                        {payment.pickupLocation && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{payment.pickupLocation}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-primary">{fmt(payment.amount, payment.currency)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {payment.escrowedAt ? new Date(payment.escrowedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {payment.releasedAt ? new Date(payment.releasedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!paymentsLoading && paymentData?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">payments</span>
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-bold">
              Showing {paymentData?.items.length || 0} of {paymentData?.total || 0} payments
            </p>
            <div className="flex gap-2">
              <button
                disabled={params.page === 1}
                onClick={() => setParams({ ...params, page: params.page - 1 })}
                className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={!paymentData || paymentData.items.length < params.limit}
                onClick={() => setParams({ ...params, page: params.page + 1 })}
                className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 p-6">
            <h3 className="text-xl font-black text-primary">Revenue Summary</h3>
            <p className="text-sm text-slate-500 mt-1">Monthly backend totals and release performance.</p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Value</p>
                <p className="mt-1 text-2xl font-black text-primary">{fmt(revenueSummary.totalTransactionValue)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Commission</p>
                <p className="mt-1 text-2xl font-black text-primary">{fmt(revenueSummary.platformCommission)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Refunds</p>
                <p className="mt-1 text-2xl font-black text-primary">{fmt(revenueSummary.totalRefunds)}</p>
              </div>
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Revenue</p>
                <p className="mt-1 text-2xl font-black">{fmt(revenueSummary.netRevenue)}</p>
                <p className="text-xs text-white/50 mt-1">All time revenue: {fmt(revenueSummary.allTimeRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 p-6">
            <h3 className="text-xl font-black text-primary">Escrow Queue</h3>
            <p className="text-sm text-slate-500 mt-1">Payments currently waiting for delivery approval.</p>

            <div className="mt-5 space-y-3">
              {escrowData?.items.slice(0, 5).map((payment) => (
                <div key={payment.paymentId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-primary truncate">{payment.jobRef}</p>
                      <p className="text-xs text-slate-500 truncate">{payment.haulier?.name || 'Haulier N/A'} - {payment.driver?.name || 'Driver N/A'}</p>
                    </div>
                    <p className="text-sm font-black text-blue-700">{fmt(payment.amount, payment.currency)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Escrowed {payment.escrowedAt ? new Date(payment.escrowedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              ))}

              {!escrowData?.items.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No escrowed payments are currently waiting for approval.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
