import React from 'react';
import { NavLink } from 'react-router-dom';

const HaulierOverview: React.FC = () => {
  // Mock data for demo
  const stats = {
    totalSpend: 12450.00,
    activeShipments: 8,
    pendingQuotes: 3,
    fleetUtilization: 85
  };

  const activeJobs = [
    { id: 'SHP-9921', route: 'London → Birmingham', type: 'General Freight', driver: 'David Wilson', status: 'ON TIME', eta: '14:30 Today', statusColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'SHP-8840', route: 'Manchester → Glasgow', type: 'Cold Chain', driver: 'Sarah Jenkins', status: 'DELAYED', eta: '18:15 Today', statusColor: 'bg-red-100 text-red-800', delay: '+45 min' },
    { id: 'SHP-7712', route: 'Bristol → Cardiff', type: 'Pallets (12)', driver: 'Michael Reed', status: 'EN ROUTE', eta: 'Tomorrow, 09:00', statusColor: 'bg-amber-100 text-amber-800' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Fleet Overview</h2>
          <p className="text-on-surface-variant font-medium">Real-time status of your logistics operations</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg font-bold text-primary flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span> Export Report
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border-l-4 border-primary">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+12.5%</span>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Total Spend</p>
          <h3 className="text-3xl font-black text-primary mt-1">£{stats.totalSpend.toLocaleString()}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border-l-4 border-amber-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <span className="material-symbols-outlined">package_2</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Active Shipments</p>
          <h3 className="text-3xl font-black text-primary mt-1">{stats.activeShipments.toString().padStart(2, '0')}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border-l-4 border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="material-symbols-outlined">request_quote</span>
            </div>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Pending Quotes</p>
          <h3 className="text-3xl font-black text-primary mt-1">{stats.pendingQuotes.toString().padStart(2, '0')}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border-l-4 border-blue-400">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <span className="material-symbols-outlined">speed</span>
            </div>
            <span className="text-xs font-bold text-amber-600">Optimal</span>
          </div>
          <p className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Fleet Utilization</p>
          <h3 className="text-3xl font-black text-primary mt-1">{stats.fleetUtilization}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Live Fleet Map */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500">map</span>
              <h3 className="text-xl font-bold text-primary">Live Fleet Tracking</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-on-surface-variant">4 Trucks Live</span>
            </div>
          </div>
          <div className="relative flex-1 bg-slate-50 overflow-hidden">
            {/* Map Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white/50 backdrop-blur rounded-2xl border border-white/20 shadow-2xl">
                <span className="material-symbols-outlined text-6xl text-primary/20 mb-4 block">location_on</span>
                <p className="text-primary font-bold">Map Interface Loading...</p>
                <p className="text-xs text-on-surface-variant mt-1">Integrating with Google Maps API</p>
              </div>
            </div>
            
            {/* Floating Map Markers */}
            <div className="absolute top-1/4 left-1/3 animate-bounce">
              <div className="bg-primary text-white p-2 rounded-lg shadow-xl flex items-center gap-2 border border-amber-500">
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                <span className="text-[10px] font-bold">TRK-402</span>
              </div>
            </div>
            <div className="absolute top-1/2 right-1/4">
              <div className="bg-primary text-white p-2 rounded-lg shadow-xl flex items-center gap-2 border border-amber-500">
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                <span className="text-[10px] font-bold">TRK-119</span>
              </div>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-lg">
              <h4 className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Map Legend</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="text-[10px]">On Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-[10px]">Stationary</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Module: Quick Metrics / Alerts */}
        <div className="flex flex-col gap-6">
          <div className="bg-primary text-white p-8 rounded-xl shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Need a fast quote?</h3>
              <p className="text-white/70 text-sm mb-6">Post a new job to our network and get responses in under 15 minutes.</p>
              <button className="w-full bg-amber-500 text-slate-900 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors shadow-lg">
                Post New Job
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-white/5 text-[160px] pointer-events-none group-hover:scale-110 transition-transform duration-700">conversion_path</span>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex-1">
            <h3 className="font-bold uppercase text-[10px] tracking-widest text-on-surface-variant mb-6">Critical Alerts</h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <div>
                  <p className="text-sm font-bold text-primary">TRK-119 Delay</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">Severe traffic on M25. ETA impacted by +45m.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="material-symbols-outlined text-primary">info</span>
                <div>
                  <p className="text-sm font-bold text-primary">Maintenance Due</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">FLT-09 requires oil service in 250mi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Shipments Table */}
      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-primary">Active Shipments</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-primary">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-widest text-right">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-primary">{job.route}</span>
                      <span className="text-xs text-on-surface-variant">{job.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant font-mono">#{job.id}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${job.driver}`} alt={job.driver} />
                      </div>
                      <span className="text-sm text-primary font-medium">{job.driver}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${job.statusColor}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-sm font-bold text-primary">{job.eta}</span>
                    {job.delay && <div className="text-[10px] text-red-600 font-bold">{job.delay}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button className="text-sm font-bold text-primary hover:underline flex items-center gap-2">
            View All Active Shipments <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HaulierOverview;
