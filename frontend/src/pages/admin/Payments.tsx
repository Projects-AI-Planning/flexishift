import React from 'react';
import { useAdminRevenue } from '../../hooks/useAdmin';

const PaymentsPage: React.FC = () => {
  const { data, loading, error } = useAdminRevenue();

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Revenue Reports</h2>
          <p className="text-on-surface-variant font-medium">Platform transaction overview and financial health.</p>
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
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Total Transaction Volume</p>
          <h3 className="text-4xl font-black text-primary mt-1">£{(data?.totalRevenue || 0).toLocaleString()}</h3>
        </div>

        <div className="bg-primary text-white p-6 rounded-xl shadow-lg border border-slate-700/30 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
            </div>
            <p className="text-white/60 font-bold uppercase tracking-wider text-[10px]">Platform Revenue (5%)</p>
            <h3 className="text-4xl font-black text-white mt-1">£{((data?.totalRevenue || 0) * 0.05).toLocaleString()}</h3>
          </div>
          <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-white/5 text-[160px] pointer-events-none group-hover:scale-110 transition-transform duration-700">monetization_on</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">history</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Pending Payouts</p>
          <h3 className="text-4xl font-black text-primary mt-1">£{(12450).toLocaleString()}</h3>
        </div>
      </div>

      {/* Transaction Table Mock (to be implemented with specific API) */}
      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-primary">Recent Transactions</h3>
          <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
            View All
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 text-primary">Reference</th>
                <th className="px-6 py-4 text-primary">Date</th>
                <th className="px-6 py-4 text-primary">Amount</th>
                <th className="px-6 py-4 text-primary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">#TXN-9021</td>
                <td className="px-6 py-4 text-sm text-slate-500">12 Oct 2023</td>
                <td className="px-6 py-4 font-black text-primary">£2,450.00</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs">Success</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
