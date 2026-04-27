import React from 'react';
import { Truck, Users, Activity, Plus } from 'lucide-react';

const FleetPage: React.FC = () => {
  const vehicles = [
    { id: '1', plate: 'LX72 BNX', type: '40ft Curtainsider', status: 'ON_ROUTE', driver: 'M. Thompson' },
    { id: '2', plate: 'FF68 FLEX', type: 'Refrigerated Unit', status: 'AVAILABLE', driver: 'S. Richards' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-navy">Fleet Management</h1>
          <p className="text-gray-500">Track and manage your vehicles and driver assignments.</p>
        </div>
        <button className="bg-navy text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md hover:bg-navy/90">
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-gray-50 rounded-lg text-navy">
                <Truck size={24} />
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                v.status === 'ON_ROUTE' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
              }`}>
                {v.status.replace('_', ' ')}
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-navy uppercase">{v.plate}</h3>
              <p className="text-sm text-gray-500">{v.type}</p>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-50 text-sm">
              <Users size={16} className="text-gray-400" />
              <span className="text-gray-600 font-medium">{v.driver}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FleetPage;
