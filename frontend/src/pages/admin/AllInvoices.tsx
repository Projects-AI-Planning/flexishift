import React, { useState } from 'react';
import { useAdminInvoices } from '../../hooks/useAdmin';
import type { AdminInvoice } from '../../types';

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ESCROWED', label: 'Escrowed' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PENDING', label: 'Pending' },
];

const paymentStatusStyle: Record<string, { bg: string; text: string }> = {
  escrowed: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  released: { bg: 'bg-green-100',  text: 'text-green-700' },
  refunded: { bg: 'bg-purple-100', text: 'text-purple-700' },
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  failed:   { bg: 'bg-red-100',    text: 'text-red-700' },
};

const jobStatusStyle: Record<string, string> = {
  completed:            'text-green-600',
  in_transit:           'text-blue-600',
  delivery_submitted:   'text-indigo-600',
  cancelled:            'text-red-500',
};

const fmt = (val: number, cur = 'INR') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: cur === 'INR' ? 'INR' : 'GBP',
    maximumFractionDigits: 2,
  }).format(val);

const AllInvoicesPage: React.FC = () => {
  const [params, setParams] = useState({
    page: 1, search: '', paymentStatus: '', limit: 10,
  });
  const { data, loading, error } = useAdminInvoices(params);

  const [preview, setPreview] = useState<AdminInvoice | null>(null);

  const totalValue = data?.items.reduce((s, inv) => s + inv.amount, 0) ?? 0;

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">All Invoices</h2>
          <p className="text-on-surface-variant font-medium">Generated invoices for completed and in-progress jobs.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            {data?.total ?? 0} Invoices
          </div>
          <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-lg text-sm font-bold text-green-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">payments</span>
            {fmt(totalValue)} (this page)
          </div>
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
          value={params.paymentStatus}
          onChange={(e) => setParams({ ...params, paymentStatus: e.target.value, page: 1 })}
          className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
        >
          {PAYMENT_STATUS_OPTIONS.map((o) => (
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Invoice / Job</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goods</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.items.map((inv: AdminInvoice) => {
                const pStyle = paymentStatusStyle[inv.paymentStatus.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-[#44474C]' };
                const jColor = jobStatusStyle[inv.jobStatus] ?? 'text-slate-500';
                return (
                  <tr key={inv.jobId} className="hover:bg-slate-50/50 transition-colors">
                    {/* Invoice / Job */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-amber-600 text-lg">receipt_long</span>
                        </div>
                        <div>
                          <p className="font-black text-primary text-sm">{inv.jobRef}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-wide ${jColor}`}>
                            {inv.jobStatus.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Haulier */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{inv.haulier?.name || '—'}</p>
                      {inv.haulier?.email && (
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{inv.haulier.email}</p>
                      )}
                    </td>
                    {/* Route */}
                    <td className="px-6 py-4 max-w-[160px]">
                      <p className="text-xs font-bold text-[#44474C] truncate">{inv.pickupLocation || '—'}</p>
                      <p className="text-[10px] text-slate-300 my-0.5">▼</p>
                      <p className="text-xs text-slate-500 truncate">{inv.dropLocation || '—'}</p>
                    </td>
                    {/* Goods */}
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {inv.goodsType || '—'}
                    </td>
                    {/* Amount */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-primary">{fmt(inv.amount, inv.currency)}</p>
                    </td>
                    {/* Job Date */}
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {inv.jobDate ? new Date(inv.jobDate).toLocaleDateString() : '—'}
                    </td>
                    {/* Payment status */}
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreview(inv)}
                          className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Open Invoice"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                        <a
                          href={`/api/v1/invoices/download/${inv.jobId}`}
                          className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">receipt_long</span>
                    No invoices found
                    <p className="text-xs mt-1">Invoices are generated automatically when a job payment is secured.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">
            Showing {data?.items.length || 0} of {data?.total || 0} invoices
          </p>
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

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-primary">Invoice Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">{preview.jobRef}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Amount highlight */}
              <div className="bg-amber-50 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Invoice Amount</p>
                  <p className="text-3xl font-black text-primary mt-1">{fmt(preview.amount, preview.currency)}</p>
                </div>
                <span className="material-symbols-outlined text-5xl text-amber-200">receipt_long</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Reference</p>
                  <p className="text-sm font-bold text-primary">{preview.jobRef}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Status</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                    paymentStatusStyle[preview.paymentStatus.toLowerCase()]?.bg ?? 'bg-slate-100'
                  } ${paymentStatusStyle[preview.paymentStatus.toLowerCase()]?.text ?? 'text-[#44474C]'}`}>
                    {preview.paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Haulier</p>
                  <p className="text-sm font-bold text-primary">{preview.haulier?.name || '—'}</p>
                  {preview.haulier?.email && <p className="text-xs text-slate-400">{preview.haulier.email}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Date</p>
                  <p className="text-sm font-bold text-primary">
                    {preview.jobDate ? new Date(preview.jobDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup</p>
                  <p className="text-sm font-bold text-primary">{preview.pickupLocation || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Drop-off</p>
                  <p className="text-sm font-bold text-primary">{preview.dropLocation || '—'}</p>
                </div>
                {preview.goodsType && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Goods Type</p>
                    <p className="text-sm font-bold text-primary">{preview.goodsType}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm font-bold text-primary">
                    {new Date(preview.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <a
                  href={preview.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-primary font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open PDF
                </a>
                <a
                  href={`/api/v1/invoices/download/${preview.jobId}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:opacity-90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllInvoicesPage;
