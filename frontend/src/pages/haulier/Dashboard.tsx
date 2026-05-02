import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useHaulierOverview } from '../../hooks/useHaulier';
import haulierService from '../../api/haulierService';
import type { LiveDelivery } from '../../types';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:34px;height:34px;border-radius:999px;background:#2563eb;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(37,99,235,.26);font-size:16px;">🚚</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const pickupIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:999px;background:#f59e0b;border:3px solid #fff;box-shadow:0 8px 20px rgba(245,158,11,.24);"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

const destinationIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:999px;background:#10b981;border:3px solid #fff;box-shadow:0 8px 20px rgba(16,185,129,.24);"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

interface DashboardData {
  summary: {
    totalSpentThisMonth: number;
    totalActiveJobs: number;
    openJobsWithQuotes: number;
  };
  activeJobs: Array<{
    jobReference: string;
    pickupLocation: string | { address: string };
    dropLocation: string | { address: string };
    driverName?: string;
    status: string;
    delay?: string;
  }>;
}

type ActiveMapData = {
  totalActiveDeliveries: number;
  deliveries: LiveDelivery[];
};

const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB')}`;

const toneForStatus = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('in_transit')) return 'bg-emerald-100 text-emerald-800';
  if (normalized.includes('completed')) return 'bg-slate-100 text-slate-700';
  if (normalized.includes('booked')) return 'bg-blue-100 text-blue-800';
  return 'bg-amber-100 text-amber-800';
};

const stripLocation = (location: string | { address: string }) =>
  typeof location === 'string' ? location : location.address;

function FlyToDelivery({ delivery }: { delivery: LiveDelivery | null }) {
  const map = useMap();

  useEffect(() => {
    if (delivery?.currentLocation) {
      map.flyTo([delivery.currentLocation.latitude, delivery.currentLocation.longitude], 12, {
        duration: 1,
      });
      return;
    }

    if (delivery?.pickupLat != null && delivery?.pickupLng != null) {
      map.flyTo([delivery.pickupLat, delivery.pickupLng], 10, {
        duration: 1,
      });
    }
  }, [delivery, map]);

  return null;
}

const HaulierOverview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useHaulierOverview();
  const [mapData, setMapData] = useState<ActiveMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  const dashboardData = useMemo(() => data as DashboardData | null, [data]);

  const stats = useMemo(() => ({
    totalSpend: dashboardData?.summary.totalSpentThisMonth ?? 0,
    activeShipments: dashboardData?.summary.totalActiveJobs ?? 0,
    pendingQuotes: dashboardData?.summary.openJobsWithQuotes ?? 0,
    fleetUtilization: dashboardData?.summary.totalActiveJobs ? 85 : 0,
  }), [dashboardData]);

  const activeJobs = useMemo(() => {
    return (dashboardData?.activeJobs ?? []).map((job) => {
      const pickup = stripLocation(job.pickupLocation);
      const drop = stripLocation(job.dropLocation);

      return {
        id: job.jobReference,
        route: `${pickup} -> ${drop}`,
        type: 'Freight',
        driver: job.driverName || 'Unassigned',
        status: job.status.toUpperCase(),
        eta: 'Today',
        delay: job.delay,
        statusColor: toneForStatus(job.status),
      };
    });
  }, [dashboardData]);

  const loadMap = useCallback(async () => {
    setMapLoading(true);
    try {
      const result = await haulierService.getActiveMapData();
      setMapData(result);
      setMapError(null);

      const first = result.deliveries.find((delivery: LiveDelivery) => delivery.currentLocation) ?? result.deliveries[0] ?? null;
      setSelectedDeliveryId((current) => current ?? first?.jobId ?? null);
    } catch {
      setMapError('Failed to load live fleet map data.');
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMap();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadMap]);

  const deliveries = mapData?.deliveries ?? [];
  const selectedDelivery = deliveries.find((delivery) => delivery.jobId === selectedDeliveryId) ?? deliveries[0] ?? null;

  const routePoints = useMemo(() => {
    if (!selectedDelivery) return [] as [number, number][];
    const points: [number, number][] = [];
    if (selectedDelivery.pickupLat != null && selectedDelivery.pickupLng != null) {
      points.push([selectedDelivery.pickupLat, selectedDelivery.pickupLng]);
    }
    if (selectedDelivery.currentLocation) {
      points.push([selectedDelivery.currentLocation.latitude, selectedDelivery.currentLocation.longitude]);
    }
    if (selectedDelivery.dropLat != null && selectedDelivery.dropLng != null) {
      points.push([selectedDelivery.dropLat, selectedDelivery.dropLng]);
    }
    return points;
  }, [selectedDelivery]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedDelivery?.currentLocation) {
      return [selectedDelivery.currentLocation.latitude, selectedDelivery.currentLocation.longitude];
    }
    if (selectedDelivery?.pickupLat != null && selectedDelivery?.pickupLng != null) {
      return [selectedDelivery.pickupLat, selectedDelivery.pickupLng];
    }
    if (selectedDelivery?.dropLat != null && selectedDelivery?.dropLng != null) {
      return [selectedDelivery.dropLat, selectedDelivery.dropLng];
    }
    return [20.5937, 78.9629];
  }, [selectedDelivery]);

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[520px] animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const liveCount = deliveries.filter((delivery) => Boolean(delivery.currentLocation)).length;

  return (
    <div className="relative space-y-8 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-[-90px] h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute left-[-120px] top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:px-8">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">Haulier Dashboard</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
              Fleet Overview
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-300 md:text-base">
              Real-time status of your logistics operations.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/haulier/post-job')}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Post New Job
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-start justify-between">
            <div className="rounded-2xl bg-blue-50 p-3 text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              +12.5%
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Spend</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {formatCurrency(stats.totalSpend)}
          </h3>
        </article>

        <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-start justify-between">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <span className="material-symbols-outlined">package_2</span>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active Shipments</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {String(stats.activeShipments).padStart(2, '0')}
          </h3>
        </article>

        <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-start justify-between">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <span className="material-symbols-outlined">request_quote</span>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Pending Quotes</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {String(stats.pendingQuotes).padStart(2, '0')}
          </h3>
        </article>

        <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-start justify-between">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-500">
              <span className="material-symbols-outlined">speed</span>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
              Optimal
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fleet Utilization</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {stats.fleetUtilization}%
          </h3>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-amber-50 p-2 text-amber-500">
                <span className="material-symbols-outlined text-xl">map</span>
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-950">Live Fleet Tracking</h3>
                <p className="text-sm text-slate-500">Realistic live map powered by active delivery coordinates.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {liveCount} Trucks Live
            </div>
          </div>

          <div className="relative h-[540px] bg-slate-100">
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-8 py-7 text-center text-rose-700 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-lg font-black">{mapError}</p>
                  <button
                    onClick={() => void loadMap()}
                    className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : mapLoading && !mapData ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-8 py-7 text-center shadow-[0_16px_50px_rgba(15,23,42,0.12)] backdrop-blur">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <p className="text-lg font-black text-slate-950">Map loading...</p>
                  <p className="mt-1 text-sm text-slate-500">Fetching live delivery coordinates from the backend.</p>
                </div>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyToDelivery delivery={selectedDelivery} />

                {selectedDelivery?.pickupLat != null && selectedDelivery?.pickupLng != null && (
                  <Marker position={[selectedDelivery.pickupLat, selectedDelivery.pickupLng]} icon={pickupIcon}>
                    <Popup>
                      <div className="min-w-[180px] text-sm">
                        <p className="font-black text-slate-950">Pickup</p>
                        <p className="text-slate-500">{selectedDelivery.pickupLocation ?? 'Pickup location'}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {selectedDelivery?.currentLocation && (
                  <Marker position={[selectedDelivery.currentLocation.latitude, selectedDelivery.currentLocation.longitude]} icon={truckIcon}>
                    <Popup>
                      <div className="min-w-[200px] text-sm">
                        <p className="font-black text-slate-950">{selectedDelivery.jobRef ?? selectedDelivery.jobId}</p>
                        <p className="text-slate-500">{selectedDelivery.driver?.name ?? 'Driver not assigned'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedDelivery.currentLocation.lastUpdatedAt ? new Date(selectedDelivery.currentLocation.lastUpdatedAt).toLocaleString('en-IN') : 'No ping'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {selectedDelivery?.dropLat != null && selectedDelivery?.dropLng != null && (
                  <Marker position={[selectedDelivery.dropLat, selectedDelivery.dropLng]} icon={destinationIcon}>
                    <Popup>
                      <div className="min-w-[180px] text-sm">
                        <p className="font-black text-slate-950">Destination</p>
                        <p className="text-slate-500">{selectedDelivery.dropLocation ?? 'Drop location'}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {routePoints.length >= 2 && (
                  <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9 }} />
                )}
              </MapContainer>
            )}

            <div className="absolute bottom-5 left-5 z-[450] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Map Legend</p>
              <div className="mt-2 space-y-2 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>Vehicle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Destination</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Quick Action</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">Need a fast quote?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Post a new job to our network and get responses in under 15 minutes.
              </p>
              <button
                onClick={() => navigate('/haulier/post-job')}
                className="mt-6 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
              >
                Post New Job
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-[160px] text-white/5">
              conversion_path
            </span>
          </div>

          <div className="flex-1 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Critical Alerts</h3>
            <div className="mt-6 space-y-4">
              <div className="flex gap-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <span className="material-symbols-outlined text-rose-600">warning</span>
                <div>
                  <p className="text-sm font-black text-slate-950">TRK-119 Delay</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Severe traffic on M25. ETA impacted by +45m.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="material-symbols-outlined text-slate-700">info</span>
                <div>
                  <p className="text-sm font-black text-slate-950">Maintenance Due</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    FLT-09 requires oil service in 250mi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h3 className="text-xl font-black tracking-tight text-slate-950">Active Shipments</h3>
          <button className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeJobs.map((job) => (
                <tr key={job.id} className="transition hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-950">{job.route}</span>
                      <span className="text-xs text-slate-500">{job.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-mono text-slate-500">#{job.id}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700">
                        {job.driver.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{job.driver}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${job.statusColor}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-sm font-bold text-slate-900">{job.eta}</span>
                    {job.delay && <div className="text-[10px] font-bold text-rose-600">{job.delay}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
          <button className="inline-flex items-center gap-2 text-sm font-black text-primary transition hover:text-slate-950">
            View All Active Shipments
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default HaulierOverview;
