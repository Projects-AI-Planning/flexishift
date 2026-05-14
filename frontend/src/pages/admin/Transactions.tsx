import React, { useState } from 'react';
import { useAdminPayments } from '../../hooks/useAdmin';
import type { AdminPayment } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Transactions' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ESCROWED', label: 'Escrowed' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'FAILED', label: 'Failed' },
];

const statusStyle: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  escrowed: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  released: { bg: 'bg-green-100',  text: 'text-green-700' },
  refunded: { bg: 'bg-purple-100', text: 'text-purple-700' },
  failed:   { bg: 'bg-red-100',    text: 'text-red-700' },
};

const fmt = (val: number, cur = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur === 'INR' ? 'INR' : 'GBP' }).format(val);

const TransactionsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: '', search: '', limit: 10 });
  const { data, loading, error } = useAdminPayments(params);

  const totalVolume = data?.items.reduce((s, p) => s + p.amount, 0) ?? 0;

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Transactions</h2>
          <p className="text-on-surface-variant font-medium">All payment transactions across the platform.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            {data?.total ?? 0} Transactions
          </div>
          <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-lg text-sm font-bold text-green-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">payments</span>
            {fmt(totalVolume)} (this page)
          </div>
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full min-w-[160px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by job reference..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={params.status}
          onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
          className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.items.map((p: AdminPayment) => {
                const style = statusStyle[p.status.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-[#44474C]' };
                return (
                  <tr key={p.paymentId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                          <span className={`material-symbols-outlined text-sm ${style.text}`}>payments</span>
                        </div>
                        <div>
                          <p className="font-black text-primary text-xs">{p.paymentId.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-400">{p.currency}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-primary text-sm">{p.jobRef || '—'}</p>
                      {p.pickupLocation && (
                        <p className="text-xs text-slate-400 truncate max-w-[120px]">{p.pickupLocation}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{p.haulier?.name || '—'}</p>
                      {p.haulier?.phone && <p className="text-xs text-slate-400">{p.haulier.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{p.driver?.name || 'Unassigned'}</p>
                      {p.driver?.phone && <p className="text-xs text-slate-400">{p.driver.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-primary">{fmt(p.amount, p.currency)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">payments</span>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} transactions</p>
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
    </div>
  );
};

export default TransactionsPage;
