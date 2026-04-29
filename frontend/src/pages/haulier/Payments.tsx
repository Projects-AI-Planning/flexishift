import React, { useState } from 'react';
import { useHaulierPayments } from '../../hooks/useHaulier';
import { Payment } from '../../types';

interface ExtendedPayment extends Payment {
  bookingId: string;
}

const HaulierPaymentsPage: React.FC = () => {
  const [params] = useState({ page: 1 });
  const { data, loading, error } = useHaulierPayments(params);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Financial Hub</h2>
          <p className="text-on-surface-variant font-medium">Manage your payments, invoices, and billing methods.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Download Statement
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 group hover:border-amber-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Total Spent</p>
          <h3 className="text-4xl font-black text-primary mt-1">£{(data?.totalSpent || 0).toLocaleString()}</h3>
        </div>

        <div className="bg-primary text-white p-6 rounded-xl shadow-lg border border-slate-700/30 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <span className="material-symbols-outlined">hourglass_empty</span>
              </div>
            </div>
            <p className="text-white/60 font-bold uppercase tracking-wider text-[10px]">In Escrow</p>
            <h3 className="text-4xl font-black text-white mt-1">£{(data?.escrowAmount || 0).toLocaleString()}</h3>
          </div>
          <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-white/5 text-[160px] pointer-events-none group-hover:scale-110 transition-transform duration-700">security</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Pending Invoices</p>
          <h3 className="text-4xl font-black text-primary mt-1">{data?.pendingInvoicesCount || 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Transaction History */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Transaction History</h3>
              <div className="flex gap-2">
                <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-primary">Booking ID</th>
                    <th className="px-6 py-4 text-primary">Date</th>
                    <th className="px-6 py-4 text-primary">Amount</th>
                    <th className="px-6 py-4 text-primary">Status</th>
                    <th className="px-6 py-4 text-right text-primary">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.payments as ExtendedPayment[])?.map((payment) => (
                    <tr key={payment.paymentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">#{payment.bookingId.substring(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-black text-primary">£{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          payment.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-primary hover:text-navy transition-colors">
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Payment Methods */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-6">Payment Methods</h3>
              <div className="space-y-4">
                {data?.paymentMethods?.map((method: any) => (
                  <div key={method.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <span className="material-symbols-outlined">credit_card</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">•••• {method.last4}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{method.brand} • {method.isDefault ? 'Primary' : 'Backup'}</p>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
                <button className="w-full p-4 rounded-xl border border-dashed border-white/20 text-white/60 text-sm font-bold flex items-center justify-center gap-2 hover:border-white/40 hover:text-white transition-all mt-4">
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                  Add New Method
                </button>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -bottom-12 -right-12 text-white/5 text-[200px] pointer-events-none">account_balance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HaulierPaymentsPage;
