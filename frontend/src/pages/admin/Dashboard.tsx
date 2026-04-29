import React from 'react';
import { useAdminStats } from '../../hooks/useAdmin';

const AdminDashboard: React.FC = () => {
  const { stats, loading, error } = useAdminStats();

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;
  if (loading || !stats) return <div className="p-8 animate-pulse text-primary font-bold">Loading Platform Core...</div>;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Logistics Core</h2>
          <p className="text-on-surface-variant font-medium">System dashboard for real-time fleet operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-primary">
            <span className="material-symbols-outlined text-sm">file_download</span>
            Export Data
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Platform Overview (KPI Bento Grid) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 group hover:border-amber-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">person</span>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] font-bold">trending_up</span>
              +12%
            </span>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Total Users</p>
          <h3 className="text-4xl font-black text-primary mt-1">{stats.totalUsers.toLocaleString()}</h3>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-4/5"></div>
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 group hover:border-amber-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">query_stats</span>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] font-bold">trending_up</span>
              +8%
            </span>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Active Jobs</p>
          <h3 className="text-4xl font-black text-primary mt-1">{stats.openJobs}</h3>
          <div className="mt-4 flex gap-1 h-8 items-end">
            <div className="bg-primary-container/20 h-4 w-full rounded-sm"></div>
            <div className="bg-primary-container/40 h-6 w-full rounded-sm"></div>
            <div className="bg-primary-container/20 h-3 w-full rounded-sm"></div>
            <div className="bg-primary-container/60 h-8 w-full rounded-sm"></div>
            <div className="bg-primary-container h-5 w-full rounded-sm"></div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-primary-container p-6 rounded-xl shadow-xl border border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl text-white">payments</span>
          </div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <span className="material-symbols-outlined">currency_pound</span>
            </div>
            <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] font-bold">trending_up</span>
              +24%
            </span>
          </div>
          <p className="text-white/60 font-bold uppercase tracking-wider text-[10px] relative z-10">Monthly Revenue</p>
          <h3 className="text-4xl font-black text-white mt-1 relative z-10">£{(stats.totalRevenue / 1000).toFixed(1)}k</h3>
          <p className="text-white/40 text-[10px] mt-2 relative z-10">Projected £{(stats.totalRevenue / 1000 * 1.1).toFixed(1)}k by month end</p>
        </div>
      </section>

      {/* Main Workspace Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Analytics & User Table */}
        <div className="xl:col-span-8 space-y-8">
          {/* Analytics Chart Placeholder */}
          <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-primary">Revenue Trends</h3>
                <p className="text-sm text-on-surface-variant">Transaction volume over the last 30 days</p>
              </div>
              <div className="flex bg-slate-50 rounded-lg p-1">
                <button className="px-3 py-1 text-xs font-bold bg-white shadow-sm rounded-md text-primary">30D</button>
                <button className="px-3 py-1 text-xs font-medium text-slate-500">90D</button>
                <button className="px-3 py-1 text-xs font-medium text-slate-500">1Y</button>
              </div>
            </div>
            {/* Simplified SVG Chart Representation */}
            <div className="h-64 w-full relative flex items-end justify-between px-2">
              <div className="absolute inset-0 flex flex-col justify-between py-2 border-l border-b border-slate-100">
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
              </div>
              <div className="relative w-full h-full flex items-end">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                  <path d="M0,180 Q100,160 200,100 T400,120 T600,40 T800,60" fill="none" stroke="#041627" strokeWidth="4" strokeLinecap="round"></path>
                  <path d="M0,180 Q100,160 200,100 T400,120 T600,40 T800,60 V200 H0 Z" fill="url(#chart-grad)" opacity="0.1"></path>
                  <defs>
                    <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#041627"></stop>
                      <stop offset="100%" stopColor="transparent"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              <span>01 Oct</span>
              <span>10 Oct</span>
              <span>20 Oct</span>
              <span>30 Oct</span>
            </div>
          </div>

          {/* User Management Table */}
          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">User Management</h3>
              <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                View All
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-primary">Name</th>
                    <th className="px-6 py-4 text-primary">Joined</th>
                    <th className="px-6 py-4 text-primary">Role</th>
                    <th className="px-6 py-4 text-primary">Status</th>
                    <th className="px-6 py-4 text-right text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=julian" alt="Julian Reed" />
                      </div>
                      <span className="font-bold text-slate-900">Julian Reed</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">12 Oct 2023</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">Driver</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=elena" alt="Elena Vance" />
                      </div>
                      <span className="font-bold text-slate-900">Elena Vance</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">14 Oct 2023</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">Haulier</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pending</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Live Feed */}
        <div className="xl:col-span-4 space-y-8">
          {/* Pending Verifications */}
          <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-amber-500">shield_person</span>
              <h3 className="text-xl font-bold text-primary">Pending Reviews</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden">
                    <img className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=marcus" alt="Marcus Thorne" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-primary">Marcus Thorne</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Driver Credentials</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-primary text-white text-[10px] font-bold py-2 rounded uppercase tracking-wider hover:opacity-90">Review</button>
                  <button className="px-3 border border-outline-variant rounded hover:bg-white text-primary">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden">
                    <img className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-primary">Sarah Jenkins</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Insurance Docs</p>
                  </div>
                </div>
                <button className="w-full bg-primary text-white text-[10px] font-bold py-2 rounded uppercase tracking-wider hover:opacity-90">Review Credentials</button>
              </div>
            </div>
          </div>

          {/* Live Job Monitor */}
          <div className="bg-slate-900 p-6 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Live Monitor</h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                <div className="flex items-start gap-4 pb-4 border-b border-slate-800">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-amber-500">local_shipping</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-white text-sm">#FF-9021</p>
                      <span className="text-[9px] font-black bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded">IN TRANSIT</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Manchester → London</p>
                    <div className="mt-2 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-2/3"></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-slate-800">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-slate-500">bookmark</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-white text-sm">#FF-9025</p>
                      <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">BOOKED</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Birmingham → Cardiff</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 py-2 border border-slate-700 text-slate-400 text-xs font-bold rounded hover:bg-slate-800 transition-colors">
                Expand Live Feed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
