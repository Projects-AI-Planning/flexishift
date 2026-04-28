import React from 'react';

const AdminJobsPage: React.FC = () => {
  const shipments = [
    {
      id: 'SHP-92834-TX',
      type: 'Industrial Parts',
      weight: '12,400 lbs',
      origin: 'Houston, TX',
      destination: 'Chicago, IL',
      status: 'On Schedule',
      statusColor: 'bg-green-100 text-green-700 border-green-200',
      currentLocation: 'St. Louis, MO',
      eta: 'Mar 14, 04:30 PM',
      driver: 'Alex R.',
      icon: 'local_shipping'
    },
    {
      id: 'SHP-88210-FL',
      type: 'Produce (Reefer)',
      weight: '40,000 lbs',
      origin: 'Miami, FL',
      destination: 'Atlanta, GA',
      status: 'Delayed (2h)',
      statusColor: 'bg-red-100 text-red-700 border-red-200',
      currentLocation: 'Heavy Traffic Jct 75',
      eta: 'Mar 14, 08:45 PM',
      driver: 'Sarah J.',
      icon: 'ac_unit'
    },
    {
      id: 'SHP-10023-CA',
      type: 'Electronics',
      weight: '4,200 lbs',
      origin: 'Oakland, CA',
      destination: 'Phoenix, AZ',
      status: 'At Pickup',
      statusColor: 'bg-blue-100 text-blue-700 border-blue-200',
      currentLocation: 'Loading: Dock B-12',
      eta: 'Mar 15, 09:00 AM',
      driver: 'Michael T.',
      icon: 'inventory'
    },
    {
      id: 'SHP-77215-WA',
      type: 'Building Mats',
      weight: '38,000 lbs',
      origin: 'Seattle, WA',
      destination: 'Portland, OR',
      status: 'On Schedule',
      statusColor: 'bg-green-100 text-green-700 border-green-200',
      currentLocation: 'Olympia, WA',
      eta: 'Mar 14, 02:15 PM',
      driver: 'Chris W.',
      icon: 'architecture'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Active Shipments</h2>
          <p className="text-on-surface-variant font-medium">Real-time tracking of 42 active freight movements.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">download</span>
            Export List
          </button>
          <button className="flex items-center gap-2 bg-amber-500 px-4 py-2 rounded-lg text-sm font-black text-primary hover:bg-amber-400 transition-colors shadow-md">
            <span className="material-symbols-outlined text-lg">add</span>
            New Shipment
          </button>
        </div>
      </div>

      {/* Filters & Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex flex-wrap items-center gap-6 border border-slate-50">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status Filter</label>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold">All Shipments</button>
              <button className="px-4 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-100">In Transit</button>
              <button className="px-4 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-100">Delayed</button>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100 hidden lg:block"></div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Vehicle Type</label>
            <select className="border border-slate-100 bg-slate-50 rounded-lg text-xs font-bold py-1.5 pr-8 focus:ring-primary outline-none">
              <option>All Vehicles</option>
              <option>Heavy Duty Truck</option>
              <option>Sprinter Van</option>
              <option>Reefer</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Sort by:</span>
            <button className="text-xs font-black text-primary flex items-center gap-1">
              ETA Ascending
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
          </div>
        </div>
        <div className="bg-primary p-6 rounded-xl shadow-lg text-white flex flex-col justify-center">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">On-Time Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-black">94.2%</span>
            <span className="text-xs text-amber-500 font-bold mb-1">↑ 2.1%</span>
          </div>
        </div>
      </div>

      {/* Shipment Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="bg-white rounded-xl shadow-[0px_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden hover:shadow-md transition-all group">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                    <span className="material-symbols-outlined text-2xl">{shipment.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-primary tracking-tight">{shipment.id}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${shipment.statusColor}`}>
                        {shipment.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">{shipment.type} • {shipment.weight}</p>
                  </div>
                </div>
                <button className="text-slate-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div className="w-0.5 h-8 bg-slate-100"></div>
                      <div className="w-2 h-2 rounded-full border-2 border-slate-200"></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</p>
                        <p className="text-sm font-bold text-primary">{shipment.origin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination</p>
                        <p className="text-sm font-bold text-primary">{shipment.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 rounded-xl overflow-hidden bg-slate-50 h-32 relative group/map">
                  <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                     <span className="material-symbols-outlined text-4xl text-slate-300">map</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm text-primary border border-white/50">
                    CURRENT: {shipment.currentLocation}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ETA</p>
                    <p className={`text-sm font-black ${shipment.status.includes('Delayed') ? 'text-red-600' : 'text-primary'}`}>
                      {shipment.eta}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${shipment.driver}`} alt={shipment.driver} />
                      </div>
                      <p className="text-sm font-bold text-primary">{shipment.driver}</p>
                    </div>
                  </div>
                </div>
                <button className="text-xs font-black text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-wider">
                  Live Tracking
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <p className="text-sm text-slate-500 font-medium">Showing <span className="font-bold text-primary">1 - 4</span> of <span className="font-bold text-primary">42</span> shipments</p>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-primary disabled:opacity-40" disabled>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">1</button>
          <button className="w-10 h-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center font-bold text-sm text-primary">2</button>
          <button className="w-10 h-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center font-bold text-sm text-primary">3</button>
          <button className="w-10 h-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminJobsPage;
