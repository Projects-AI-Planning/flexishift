import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import haulierService from '../../api/haulierService';

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

type FleetEquipmentItem = {
  equipmentId: string;
  name: string;
  category: string;
  serialNumber?: string | null;
  status: string;
  assignedVehicle?: string | null;
  lastServiceDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type FleetData = {
  vehicles: Vehicle[];
  drivers: Driver[];
};

type EquipmentFormState = {
  name: string;
  category: string;
  serialNumber: string;
  status: string;
  assignedVehicle: string;
  lastServiceDate: string;
  notes: string;
};

const useFleet = () => {
  const [data] = useState<FleetData>({
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
        statusColor: 'bg-[#1066b1]/15 text-[#0a4a8f]',
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

const EQUIPMENT_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_USE: 'bg-blue-100 text-blue-700',
  NEEDS_SERVICE: 'bg-[#1066b1]/15 text-[#0a4a8f]',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
};

const EQUIPMENT_CATEGORIES = ['Safety', 'Tracking', 'Maintenance', 'Cargo Securing', 'Other'];

const FleetPage: React.FC = () => {
  const location = useLocation();
  const activeTab = useMemo(() => {
    if (location.pathname.startsWith('/haulier/fleet/equipment')) return 'equipment';
    if (location.pathname.startsWith('/haulier/fleet/drivers')) return 'drivers';
    return 'vehicles';
  }, [location.pathname]);

  const { data, loading } = useFleet();
  const { vehicles, drivers } = data;

  const [equipment, setEquipment] = useState<FleetEquipmentItem[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentFormState>({
    name: '',
    category: 'Safety',
    serialNumber: '',
    status: 'AVAILABLE',
    assignedVehicle: '',
    lastServiceDate: '',
    notes: '',
  });

  const fetchEquipment = useCallback(async () => {
    setEquipmentLoading(true);
    try {
      const result = await haulierService.listFleetEquipment() as {
        items?: FleetEquipmentItem[];
        total?: number;
      };
      setEquipment(result.items ?? []);
      setEquipmentError('');
    } catch {
      setEquipmentError('Failed to load fleet equipment.');
    } finally {
      setEquipmentLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      category: 'Safety',
      serialNumber: '',
      status: 'AVAILABLE',
      assignedVehicle: '',
      lastServiceDate: '',
      notes: '',
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        serialNumber: form.serialNumber.trim() || undefined,
        status: form.status,
        assignedVehicle: form.assignedVehicle.trim() || undefined,
        lastServiceDate: form.lastServiceDate || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        await haulierService.updateFleetEquipment(editingId, payload);
      } else {
        await haulierService.addFleetEquipment(payload);
      }
      resetForm();
      await fetchEquipment();
    } catch {
      setEquipmentError('Failed to save equipment.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: FleetEquipmentItem) => {
    setEditingId(item.equipmentId);
    setForm({
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber ?? '',
      status: item.status,
      assignedVehicle: item.assignedVehicle ?? '',
      lastServiceDate: item.lastServiceDate ? item.lastServiceDate.slice(0, 10) : '',
      notes: item.notes ?? '',
    });
  };

  const deleteItem = async (equipmentId: string) => {
    try {
      await haulierService.deleteFleetEquipment(equipmentId);
      await fetchEquipment();
      if (editingId === equipmentId) resetForm();
    } catch {
      setEquipmentError('Failed to delete equipment.');
    }
  };

  const equipmentStats = {
    total: equipment.length,
    available: equipment.filter((item) => item.status === 'AVAILABLE').length,
    serviceDue: equipment.filter((item) => item.status === 'NEEDS_SERVICE' || item.status === 'OUT_OF_SERVICE').length,
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-primary font-bold">Loading Fleet...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Fleet & Personnel</h2>
          <p className="text-on-surface-variant font-medium">
            Manage your vehicles, drivers, and equipment inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Fleet
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white shadow-md transition-colors hover:opacity-90">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {activeTab === 'equipment' ? 'Add Equipment' : activeTab === 'vehicles' ? 'Add Vehicle' : 'Add Driver'}
          </button>
        </div>
      </div>

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        <NavLink
          to="/haulier/fleet/vehicles"
          className={({ isActive }) => `rounded-lg px-6 py-2 text-sm font-black transition-all ${isActive ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Vehicles
        </NavLink>
        <NavLink
          to="/haulier/fleet/drivers"
          className={({ isActive }) => `rounded-lg px-6 py-2 text-sm font-black transition-all ${isActive ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Drivers
        </NavLink>
        <NavLink
          to="/haulier/fleet/equipment"
          className={({ isActive }) => `rounded-lg px-6 py-2 text-sm font-black transition-all ${isActive ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Equipment
        </NavLink>
      </div>

      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Equipment</p>
              <p className="text-3xl font-black text-primary">{equipmentLoading ? '...' : equipmentStats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Available</p>
              <p className="text-3xl font-black text-emerald-600">{equipmentLoading ? '...' : equipmentStats.available}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Service Due</p>
              <p className="text-3xl font-black text-[#0d55a0]">{equipmentLoading ? '...' : equipmentStats.serviceDue}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <div className={`overflow-x-auto rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)] ${equipmentLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-primary">Equipment Inventory</h3>
                    <p className="text-xs text-slate-400 mt-1">Backend-backed equipment records for your fleet.</p>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="text-sm font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    Clear Form
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[720px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Name', 'Category', 'Serial', 'Status', 'Vehicle', 'Service Date', 'Actions'].map((header) => (
                          <th key={header} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {equipmentError && (
                        <tr>
                          <td colSpan={7} className="px-6 py-6 text-red-600 text-sm font-semibold">
                            {equipmentError}
                          </td>
                        </tr>
                      )}
                      {!equipmentError && equipment.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <p className="font-black text-[#44474C]">No equipment added yet</p>
                            <p className="text-sm text-slate-400 mt-1">Use the form on the right to create your first item.</p>
                          </td>
                        </tr>
                      )}
                      {equipment.map((item) => (
                        <tr key={item.equipmentId} className="text-sm transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-primary">{item.name}</td>
                          <td className="px-6 py-4 font-medium text-[#44474C]">{item.category}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{item.serialNumber || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${EQUIPMENT_STATUS_STYLES[item.status] || 'bg-slate-100 text-[#44474C]'}`}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-500">{item.assignedVehicle || '—'}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">{item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => startEdit(item)}
                                className="text-slate-400 transition-colors hover:text-primary"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => void deleteItem(item.equipmentId)}
                                className="text-slate-400 transition-colors hover:text-red-600"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className="rounded-xl bg-slate-900 text-white p-6 shadow-xl">
                <div className="mb-5">
                  <h3 className="text-xl font-bold">{editingId ? 'Edit Equipment' : 'Add Equipment'}</h3>
                  <p className="text-xs text-white/60 mt-1">Save equipment details to the backend profile store.</p>
                </div>

                <form className="space-y-3" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Name</label>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      placeholder="Fire extinguisher"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      {EQUIPMENT_CATEGORIES.map((category) => (
                        <option key={category} value={category} className="text-[#041627]">{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Serial Number</label>
                    <input
                      value={form.serialNumber}
                      onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      placeholder="EQ-1024"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      {['AVAILABLE', 'IN_USE', 'NEEDS_SERVICE', 'OUT_OF_SERVICE'].map((status) => (
                        <option key={status} value={status} className="text-[#041627]">
                          {status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Assigned Vehicle</label>
                    <input
                      value={form.assignedVehicle}
                      onChange={(event) => setForm((current) => ({ ...current, assignedVehicle: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      placeholder="LX72 BNX"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Last Service Date</label>
                    <input
                      type="date"
                      value={form.lastServiceDate}
                      onChange={(event) => setForm((current) => ({ ...current, lastServiceDate: event.target.value }))}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      className="w-full min-h-[92px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      placeholder="Service reminder, location, condition..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#1066b1]/100 px-4 py-3 text-sm font-black text-white hover:bg-[#1066b1] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Equipment' : 'Create Equipment'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vehicles' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Registration</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Current Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Driver</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
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
                        <span className="font-black uppercase tracking-tight text-primary">{v.plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#44474C]">{v.type}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${v.statusColor}`}>{v.status}</span>
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
      ) : activeTab === 'drivers' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">License Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Availability</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contact</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map((d) => (
                  <tr key={d.id} className="text-sm transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#1066b1]">
                          <img src={d.avatar} alt={d.name} />
                        </div>
                        <span className="font-black text-primary">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#44474C]">{d.license}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${d.statusColor}`}>{d.status}</span>
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
      ) : null}
    </div>
  );
};

export default FleetPage;
