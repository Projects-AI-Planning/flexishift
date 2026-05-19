import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import haulierService from '../../api/haulierService';

type DriverScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type DriverScheduleBlock = {
  blockStart: string;
  blockEnd: string;
  reason?: string | null;
};

type DriverRow = {
  driverId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isVerified: boolean;
  profileComplete: boolean;
  avgRating: number;
  completedJobs: number;
  joinedAt?: string | null;
  vehicleType?: string | null;
  vehicleRegistration?: string | null;
  licenseNumber?: string | null;
  companyName?: string | null;
  coverageArea?: string | null;
  availabilityToday: boolean;
  availabilitySlots: number;
  availabilityBlocks: number;
  schedule?: {
    slots: DriverScheduleSlot[];
    blocks: DriverScheduleBlock[];
  };
};

type AssignmentRow = {
  driverId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType?: string | null;
  vehicleRegistration?: string | null;
  licenseNumber?: string | null;
  assignedAt: string;
  note?: string | null;
};

type DriversResponse = {
  items?: DriverRow[];
  total?: number;
  page?: number;
  perPage?: number;
  summary?: {
    totalDrivers?: number;
    availableToday?: number;
    verifiedDrivers?: number;
  };
};

type AssignmentsResponse = {
  items?: AssignmentRow[];
  total?: number;
};

const statusTone = (status: string) => {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'SUSPENDED') return 'bg-red-100 text-red-700';
  return 'bg-[#1066b1]/15 text-[#0a4a8f]';
};

const availabilityTone = (available: boolean) => (
  available ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-[#44474C]'
);

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DriverDetails: React.FC<{
  driver: DriverRow;
  assigned: boolean;
  onClose: () => void;
  onAssign: (driverId: string) => Promise<void>;
  onUnassign: (driverId: string) => Promise<void>;
}> = ({ driver, assigned, onClose, onAssign, onUnassign }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-xl font-black text-primary">{driver.name}</h3>
          <p className="text-xs font-medium text-slate-400">{driver.email}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-6">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone</p>
            <p className="font-bold text-primary">{driver.phone}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle</p>
            <p className="font-bold text-primary">{driver.vehicleType || '—'}</p>
            <p className="text-xs text-slate-400">{driver.vehicleRegistration || 'No registration set'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">License</p>
            <p className="font-bold text-primary">{driver.licenseNumber || '—'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coverage Area</p>
            <p className="font-bold text-primary">{driver.coverageArea || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Availability</p>
            <p className="font-bold text-primary">{driver.availabilityToday ? 'Available today' : 'Unavailable today'}</p>
            <p className="text-xs text-slate-400">{driver.availabilitySlots} slots, {driver.availabilityBlocks} blocks</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Performance</p>
            <p className="font-bold text-primary">{driver.avgRating.toFixed(1)} / 5</p>
            <p className="text-xs text-slate-400">{driver.completedJobs} completed jobs</p>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 flex gap-3 justify-end">
        {assigned ? (
          <button
            onClick={() => void onUnassign(driver.driverId)}
            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100 transition-colors"
          >
            Unassign Driver
          </button>
        ) : (
          <button
            onClick={() => void onAssign(driver.driverId)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-sm shadow-primary/20 hover:opacity-90 transition-colors"
          >
            Assign Driver
          </button>
        )}
      </div>
    </div>
  </div>
);

const DriversPage: React.FC = () => {
  const location = useLocation();
  const activeTab = useMemo(
    () => (location.pathname.startsWith('/haulier/drivers/schedule') ? 'schedule' : 'all'),
    [location.pathname],
  );

  const [items, setItems] = useState<DriverRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [summary, setSummary] = useState({ totalDrivers: 0, availableToday: 0, verifiedDrivers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [availability, setAvailability] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const PER_PAGE = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, assignmentsRes] = await Promise.all([
        haulierService.listHaulierDrivers({
          search: search || undefined,
          vehicle_type: vehicleType || undefined,
          availability: availability || undefined,
          page,
          per_page: PER_PAGE,
        }),
        haulierService.listDriverAssignments(),
      ]);
      const drivers = driversRes as DriversResponse;
      const assigned = assignmentsRes as AssignmentsResponse;

      setItems(drivers.items ?? []);
      setAssignments(assigned.items ?? []);
      setTotal(drivers.total ?? 0);
      setSummary({
        totalDrivers: drivers.summary?.totalDrivers ?? 0,
        availableToday: drivers.summary?.availableToday ?? 0,
        verifiedDrivers: drivers.summary?.verifiedDrivers ?? 0,
      });
      setError('');
    } catch {
      setError('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, [availability, page, search, vehicleType]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const assignedIds = useMemo(() => new Set(assignments.map((item) => item.driverId)), [assignments]);
  const vehicleTypes = useMemo(() => {
    const values = new Set(items.map((item) => item.vehicleType).filter(Boolean) as string[]);
    return Array.from(values).sort();
  }, [items]);

  const refresh = async () => {
    await fetchData();
  };

  const handleAssign = async (driverId: string) => {
    setBusyAction(true);
    try {
      await haulierService.assignDriver({ driverId });
      await refresh();
      if (selectedDriver?.driverId === driverId) {
        setSelectedDriver(null);
      }
    } catch {
      setError('Failed to assign driver.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleUnassign = async (driverId: string) => {
    setBusyAction(true);
    try {
      await haulierService.unassignDriver(driverId);
      await refresh();
      if (selectedDriver?.driverId === driverId) {
        setSelectedDriver(null);
      }
    } catch {
      setError('Failed to unassign driver.');
    } finally {
      setBusyAction(false);
    }
  };

  const assignedRows = assignments.map((assignment) => {
    const driver = items.find((item) => item.driverId === assignment.driverId);
    return {
      ...assignment,
      availabilityToday: driver?.availabilityToday ?? true,
      availabilitySlots: driver?.availabilitySlots ?? 0,
      availabilityBlocks: driver?.availabilityBlocks ?? 0,
      schedule: driver?.schedule ?? { slots: [], blocks: [] },
    };
  });

  const renderSchedule = (driver: {
    driverId: string;
    name: string;
    vehicleType?: string | null;
    vehicleRegistration?: string | null;
    assignedAt: string;
    note?: string | null;
    availabilityToday: boolean;
    availabilitySlots: number;
    availabilityBlocks: number;
    schedule: { slots: DriverScheduleSlot[]; blocks: DriverScheduleBlock[] };
  }) => {
    const activeSlots = driver.schedule.slots.filter((slot) => slot.isActive);
    return (
      <div key={driver.driverId} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-black text-primary">{driver.name}</p>
            <p className="text-xs text-slate-400">{driver.vehicleType || 'No vehicle'} · {driver.vehicleRegistration || 'No registration'}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${availabilityTone(driver.availabilityToday)}`}>
            {driver.availabilityToday ? 'Available' : 'Busy'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {activeSlots.length ? activeSlots.map((slot) => (
            <span
              key={`${driver.driverId}-${slot.dayOfWeek}-${slot.startTime}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#44474C]"
            >
              {dayLabels[slot.dayOfWeek]} {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
            </span>
          )) : (
            <span className="text-xs text-slate-400">No weekly slots configured</span>
          )}
        </div>

        {!!driver.schedule.blocks.length && (
          <div className="mt-4 rounded-xl bg-white border border-[#1066b1]/15 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0d55a0] mb-2">Blocks</p>
            <div className="space-y-2">
              {driver.schedule.blocks.map((block) => (
                <div key={`${driver.driverId}-${block.blockStart}`} className="text-xs text-[#083d7a] font-medium">
                  {block.blockStart} to {block.blockEnd}{block.reason ? ` · ${block.reason}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned</p>
            <p className="text-sm font-bold text-primary">{new Date(driver.assignedAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => void handleUnassign(driver.driverId)}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
          >
            Unassign
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">Drivers</h2>
          <p className="text-on-surface-variant font-medium">Browse active drivers, assign them to your roster, and review availability.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50">
            <span className="material-symbols-outlined text-sm">download</span>
            Export List
          </button>
        </div>
      </div>

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        <NavLink
          to="/haulier/drivers/all"
          className={({ isActive }) => `rounded-lg px-6 py-2 text-sm font-black transition-all ${isActive && activeTab === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          All Drivers
        </NavLink>
        <NavLink
          to="/haulier/drivers/schedule"
          className={({ isActive }) => `rounded-lg px-6 py-2 text-sm font-black transition-all ${isActive && activeTab === 'schedule' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Schedule
        </NavLink>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers', value: summary.totalDrivers },
          { label: 'Available Today', value: summary.availableToday, accent: 'text-emerald-600' },
          { label: 'Verified Drivers', value: summary.verifiedDrivers, accent: 'text-primary' },
          { label: 'Assigned Roster', value: assignments.length, accent: 'text-indigo-600' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className={`text-3xl font-black ${card.accent ?? 'text-[#041627]'}`}>{loading ? '...' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-50 bg-white p-4 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full rounded-lg border border-slate-100 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={vehicleType}
            onChange={(event) => {
              setVehicleType(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Vehicle Types</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Availability</option>
            <option value="available">Available Today</option>
            <option value="busy">Busy Today</option>
          </select>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-xl border border-slate-50 bg-white shadow-[0_4px_12px_rgba(26,43,60,0.05)] ${loading || busyAction ? 'opacity-60 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-sm font-semibold text-red-600">{error}</div>
        ) : activeTab === 'schedule' ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary">Roster Schedule</h3>
                <p className="text-xs text-slate-400">Assigned drivers with weekly availability from backend records.</p>
              </div>
              <button
                onClick={() => void refresh()}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-[#44474C] hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>
            {assignedRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
                <p className="font-black text-[#44474C]">No assigned drivers yet</p>
                <p className="text-sm text-slate-400 mt-1">Assign drivers from the All Drivers tab to build a roster.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {assignedRows.map(renderSchedule)}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {['Driver Details', 'Vehicle Type', 'Rating', 'Availability', 'Status', 'Coverage', 'Roster'].map((header) => (
                    <th key={header} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">No drivers found</td>
                  </tr>
                ) : items.map((driver) => {
                  const assigned = assignedIds.has(driver.driverId);
                  return (
                    <tr key={driver.driverId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-primary">{driver.name}</p>
                            <p className="text-xs text-slate-400">{driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#44474C]">{driver.vehicleType || '—'}</td>
                      <td className="px-6 py-4 text-sm font-black text-primary">{driver.avgRating.toFixed(1)} / 5</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${availabilityTone(driver.availabilityToday)}`}>
                        {driver.availabilityToday ? 'Available' : 'Busy'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#44474C]">{driver.coverageArea || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDriver(driver)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-[#44474C] hover:bg-slate-200"
                          >
                            Details
                          </button>
                          {assigned ? (
                            <button
                              onClick={() => void handleUnassign(driver.driverId)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
                            >
                              Unassign
                            </button>
                          ) : (
                            <button
                              onClick={() => void handleAssign(driver.driverId)}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white shadow-sm shadow-primary/20 hover:opacity-90"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#44474C] hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">
            Page {page} of {Math.max(1, Math.ceil(total / PER_PAGE))}
          </span>
          <button
            disabled={page >= Math.ceil(total / PER_PAGE)}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#44474C] hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selectedDriver && (
        <DriverDetails
          driver={selectedDriver}
          assigned={assignedIds.has(selectedDriver.driverId)}
          onClose={() => setSelectedDriver(null)}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
        />
      )}
    </div>
  );
};

export default DriversPage;
