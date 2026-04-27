import React, { useEffect, useState } from 'react';
import { Banknote, History, Lock, ShieldCheck, Download, Filter, MoreVertical, CreditCard, Landmark, Wallet } from 'lucide-react';

const PaymentsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy">Financial Management</h1>
          <p className="text-gray-500 mt-1">Manage secure escrow payments and review carrier transaction history.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-200 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <Download size={18} /> Export Statement
          </button>
          <button className="px-4 py-2 bg-navy text-white rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md">
            <CreditCard size={18} /> Add Payment Method
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Stats & History */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">In Escrow</p>
              <p className="text-2xl font-black text-navy">€12,450.00</p>
              <div className="mt-2 text-xs text-amber font-bold">+34% vs last month</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Released (MTD)</p>
              <p className="text-2xl font-black text-navy">€48,200.00</p>
              <div className="mt-2 text-xs text-green-600 font-bold">12 jobs completed</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Invoices</p>
              <p className="text-2xl font-black text-navy">€2,150.00</p>
              <div className="mt-2 text-xs text-amber-600 font-bold">Requires attention</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                <History className="text-amber" size={20} /> Transaction History
              </h3>
              <div className="flex gap-2">
                <select className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber">
                  <option>Last 30 Days</option>
                  <option>Last Quarter</option>
                  <option>Custom Range</option>
                </select>
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-white transition-colors">
                  <Filter size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Reference</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                    <th className="px-6 py-4 border-b border-gray-100"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-navy text-sm">Oct 24, 2023</p>
                      <p className="text-[10px] text-gray-400 uppercase">09:42 AM</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-navy text-sm">#FR-88123-AA</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter truncate max-w-[120px]">BlueSky Transporters</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-navy">€2,450.00</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Released</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-300 hover:text-navy"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 transition-colors bg-amber/5">
                    <td className="px-6 py-4 border-l-4 border-amber">
                      <p className="font-bold text-navy text-sm">Oct 23, 2023</p>
                      <p className="text-[10px] text-gray-400 uppercase">02:15 PM</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-navy text-sm">#FR-99105-CH</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter truncate max-w-[120px]">EuroConnect Logistics</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-navy">€980.00</td>
                    <td className="px-6 py-4">
                      <span className="bg-amber/10 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Escrowed</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-300 hover:text-navy"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Payment Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden sticky top-24">
            <div className="bg-navy p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-amber text-navy px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Escrow Hold</span>
                <span className="text-gray-400 font-mono text-xs">Job #FR-99203-BX</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Secure Authorization</h3>
              <p className="text-gray-400 text-xs">Funds will be held in escrow until delivery confirmation.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-100">
                  <Truck className="text-navy" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Supplier</p>
                  <p className="text-sm font-bold text-navy">RapidWay Logistics Ltd.</p>
                  <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                    <ShieldCheck size={12} /> Verified Partner
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Freight Total</span>
                    <span className="font-semibold text-navy">€1,100.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">VAT (21%)</span>
                    <span className="font-semibold text-navy">€231.00</span>
                  </div>
                  <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                    <span className="font-bold text-navy">Total Amount</span>
                    <span className="text-2xl font-black text-navy tracking-tighter">€1,356.00</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-amber hover:bg-amber/90 text-navy font-black py-4 rounded-xl shadow-lg shadow-amber/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                <Lock size={18} /> Confirm & Hold
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
