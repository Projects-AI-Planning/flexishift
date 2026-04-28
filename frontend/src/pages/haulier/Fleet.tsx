import React, { useState, useEffect } from 'react';

// Mock hook for structural consistency
const useFleet = () => {
  const [data, setData] = useState<any>({
    vehicles: [
      { id: '1', plate: 'LX72 BNX', type: '40ft Curtainsider', status: 'On Route', driver: 'M. Thompson', statusColor: 'bg-blue-100 text-blue-700' },
      { id: '2', plate: 'FF68 FLEX', type: 'Refrigerated Unit', status: 'Available', driver: 'S. Richards', statusColor: 'bg-green-100 text-green-700' },
      { id: '3', plate: 'WA21 GHY', type: '7.5t Box Truck', status: 'Maintenance', driver: 'N/A', statusColor: 'bg-red-100 text-red-700' },
    ],
    drivers: [
      { id: 1, name: 'Mark Thompson', license: 'C+E (Class 1)', status: 'Active', statusColor: 'bg-green-100 text-green-700', phone: '+44 7700 900123', avatar: 'https://i.pravatar.cc/150?u=mark' },
      { id: 2, name: 'Sarah Richards', license: 'C+E (Class 1)', status: 'On Break', statusColor: 'bg-amber-100 text-amber-700', phone: '+44 7700 900456', avatar: 'https://i.pravatar.cc/150?u=sarah' },
      { id: 3, name: 'James Wilson', license: 'C (Class 2)', status: 'Active', statusColor: 'bg-green-100 text-green-700', phone: '+44 7700 900789', avatar: 'https://i.pravatar.cc/150?u=james' },
    ]
  });
  const [loading, setLoading] = useState(false);
  return { data, loading };
};

const FleetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const { data, loading } = useFleet();

  if (loading) return <div className="p-8 animate-pulse text-primary font-bold">Loading Fleet...</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Fleet & Personnel</h2>
          <p className="text-on-surface-variant font-medium">Manage your vehicles and driver assignments.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Fleet
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 transition-colors shadow-md flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {activeTab === 'vehicles' ? 'Add Vehicle' : 'Add Driver'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('vehicles')}
          className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'vehicles' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Vehicles
        </button>
        <button 
          onClick={() => setActiveTab('drivers')}
          className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'drivers' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Drivers
        </button>
      </div>

      {activeTab === 'vehicles' ? (
        /* Vehicles Table */
        <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned Driver</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">local_shipping</span>
                        </div>
                        <span className="font-black text-primary tracking-tight uppercase">{v.plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{v.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${v.statusColor}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{v.driver}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Drivers (User Management) Table */
        <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">License Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Availability</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-amber-500 overflow-hidden">
                          <img src={d.avatar} alt={d.name} />
                        </div>
                        <span className="font-black text-primary">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{d.license}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${d.statusColor}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{d.phone}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetPage;
