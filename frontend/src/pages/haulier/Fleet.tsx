import React, { useState } from 'react';

type Vehicle = {
  id: string;
  plate: string;
  type: string;
  status: string;
  driver: string;
  statusColor: string;
};

type Driver = {
  id: number;
  name: string;
  license: string;
  status: string;
  statusColor: string;
  phone: string;
  avatar: string;
};

const useFleet = () => {
  const [data] = useState<{ vehicles: Vehicle[]; drivers: Driver[] }>({
    vehicles: [
      {
        id: '1',
        plate: 'LX72 BNX',
        type: '40ft Curtainsider',
        status: 'On Route',
        driver: 'M. Thompson',
        statusColor: 'bg-blue-100 text-blue-700',
      },
      {
        id: '2',
        plate: 'FF68 FLEX',
        type: 'Refrigerated Unit',
        status: 'Available',
        driver: 'S. Richards',
        statusColor: 'bg-green-100 text-green-700',
      },
      {
        id: '3',
        plate: 'WA21 GHY',
        type: '7.5t Box Truck',
        status: 'Maintenance',
        driver: 'N/A',
        statusColor: 'bg-red-100 text-red-700',
      },
    ],
    drivers: [
      {
        id: 1,
        name: 'Mark Thompson',
        license: 'C+E (Class 1)',
        status: 'Active',
        statusColor: 'bg-green-100 text-green-700',
        phone: '+44 7700 900123',
        avatar: 'https://i.pravatar.cc/150?u=mark',
      },
      {
        id: 2,
        name: 'Sarah Richards',
        license: 'C+E (Class 1)',
        status: 'On Break',
        statusColor: 'bg-amber-100 text-amber-700',
        phone: '+44 7700 900456',
        avatar: 'https://i.pravatar.cc/150?u=sarah',
      },
      {
        id: 3,
        name: 'James Wilson',
        license: 'C (Class 2)',
        status: 'Active',
        statusColor: 'bg-green-100 text-green-700',
        phone: '+44 7700 900789',
        avatar: 'https://i.pravatar.cc/150?u=james',
      },
    ],
  });
  const [loading] = useState(false);
  return { data, loading };
};

const FleetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const { data, loading } = useFleet();
  const { vehicles, drivers } = data;

  if (loading) {
    return <div className="p-8 animate-pulse text-primary font-bold">Loading Fleet...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Fleet & Personnel</h2>
          <p className="text-on-surface-variant font-medium">
            Manage your vehicles and driver assignments.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Fleet
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white shadow-md transition-colors hover:opacity-90">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {activeTab === 'vehicles' ? 'Add Vehicle' : 'Add Driver'}
          </button>
        </div>
      </div>

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`rounded-lg px-6 py-2 text-sm font-black transition-all ${
            activeTab === 'vehicles'
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-primary'
          }`}
        >
          Vehicles
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`rounded-lg px-6 py-2 text-sm font-black transition-all ${
            activeTab === 'drivers'
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-primary'
          }`}
        >
          Drivers
        </button>
      </div>

      {activeTab === 'vehicles' ? (
        <div className="overflow-hidden rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Registration
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Current Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Assigned Driver
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicles.map((v) => (
                  <tr key={v.id} className="text-sm transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-primary">
                          <span className="material-symbols-outlined">local_shipping</span>
                        </div>
                        <span className="font-black uppercase tracking-tight text-primary">
                          {v.plate}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{v.type}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${v.statusColor}`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{v.driver}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 transition-colors hover:text-primary">
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
        <div className="overflow-hidden rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Driver Details
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    License Type
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Availability
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map((d) => (
                  <tr key={d.id} className="text-sm transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-amber-500">
                          <img src={d.avatar} alt={d.name} />
                        </div>
                        <span className="font-black text-primary">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{d.license}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${d.statusColor}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">{d.phone}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 transition-colors hover:text-primary">
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
