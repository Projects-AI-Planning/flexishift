import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useHaulierOverview } from '../../hooks/useHaulier';
import haulierService from '../../api/haulierService';
import { useAuth } from '../../hooks/useAuth';
import { fmtMoney } from '../../utils/currency';
import type { LiveDelivery } from '../../types';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

function makeGIcon(color: string, emoji?: string): google.maps.Icon {
  const content = emoji
    ? `<text x="15" y="20" text-anchor="middle" font-size="13">${emoji}</text>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2.5"/>${content}</svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 30, height: 30 } as google.maps.Size,
    anchor: { x: 15, y: 15 } as google.maps.Point,
  };
}

const TRUCK_ICON       = makeGIcon('#2563eb', '🚚');
const PICKUP_ICON      = makeGIcon('#f59e0b');
const DESTINATION_ICON = makeGIcon('#10b981');

interface DashboardData {
  summary?: {
    totalSpentThisMonth?: number;
    totalActiveJobs?: number;
    bookedAwaitingPayment?: number;
    openJobsWithQuotes?: number;
  };
  activeJobs?: Array<{
    jobId?: string;
    jobReference: string;
    pickupLocation?: string | { address?: string | null } | null;
    dropLocation?: string | { address?: string | null } | null;
    driverName?: string;
    status: string;
    delay?: string;
    goodsType?: string;
    weightKg?: number;
    distanceKm?: number;
    jobDate?: string;
    timeSlot?: string;
    agreedAmount?: number;
    paymentRequired?: boolean;
    paymentStatus?: string;
  }>;
}

type ActiveMapData = {
  totalActiveDeliveries: number;
  deliveries: LiveDelivery[];
};

const formatCurrency = (value: number, currency?: string) => fmtMoney(value, currency);

const toneForStatus = (status?: string) => {
  if (!status) return 'bg-[#1066b1]/15 text-[#083d7a]';
  const normalized = status.toLowerCase();
  if (normalized.includes('in_transit')) return 'bg-emerald-100 text-emerald-800';
  if (normalized.includes('completed')) return 'bg-slate-100 text-[#44474C]';
  if (normalized.includes('booked')) return 'bg-blue-100 text-blue-800';
  return 'bg-[#1066b1]/15 text-[#083d7a]';
};

const stripLocation = (location?: string | { address?: string | null } | null) => {
  if (!location) return 'Unknown location';
  if (typeof location === 'string') return location || 'Unknown location';
  return location.address || 'Unknown location';
};

// Google Maps equivalent of FlyToDelivery — handled via mapRef.panTo() in the main component

const HaulierOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.currency;
  const { data, loading, error, refresh } = useHaulierOverview();
  const [mapData, setMapData] = useState<ActiveMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  // Recent notifications for Critical Alerts section
  type RecentNotif = { notificationId: string; type: string; title: string; message: string; createdAt?: string | null; isRead: boolean };
  const [recentNotifs, setRecentNotifs] = useState<RecentNotif[]>([]);

  const dashboardData = useMemo(() => data as DashboardData | null, [data]);
  const summary = dashboardData?.summary ?? {};

  const stats = useMemo(() => ({
    totalSpend: summary.totalSpentThisMonth ?? 0,
    activeShipments: summary.totalActiveJobs ?? 0,
    bookedAwaitingPayment: summary.bookedAwaitingPayment ?? 0,
    pendingQuotes: summary.openJobsWithQuotes ?? 0,
    fleetUtilization: summary.totalActiveJobs ? 85 : 0,
  }), [summary]);

  const activeJobs = useMemo(() => {
    return (dashboardData?.activeJobs ?? []).map((job) => {
      const pickup = stripLocation(job.pickupLocation);
      const drop = stripLocation(job.dropLocation);

      return {
        id: job.jobReference,
        jobId: job.jobId,
        route: `${pickup} → ${drop}`,
        type: job.goodsType ?? 'Freight',
        driver: job.driverName || 'Unassigned',
        status: (job.status || 'pending').toUpperCase(),
        eta: job.jobDate ?? 'Today',
        delay: job.delay,
        statusColor: toneForStatus(job.status),
        paymentRequired: job.paymentRequired ?? false,
        agreedAmount: job.agreedAmount,
        distanceKm: job.distanceKm,
      };
    });
  }, [dashboardData]);

  const loadMap = useCallback(async () => {
    setMapLoading(true);
    try {
      const result = await haulierService.getActiveMapData();
      const deliveries = Array.isArray(result?.deliveries) ? result.deliveries : [];
      const safeResult = {
        totalActiveDeliveries: result?.totalActiveDeliveries ?? deliveries.length,
        deliveries,
      };
      setMapData(safeResult);
      setMapError(null);

      const first = deliveries.find((delivery: LiveDelivery) => delivery.currentLocation) ?? deliveries[0] ?? null;
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

  useEffect(() => {
    haulierService.getNotifications({ page: 1, limit: 5 })
      .then((res: unknown) => {
        const r = res as { notifications?: RecentNotif[]; items?: RecentNotif[] };
        setRecentNotifs(r.notifications ?? r.items ?? []);
      })
      .catch(() => { /* silently fail */ });
  }, []);

  const deliveries = mapData?.deliveries ?? [];
  const selectedDelivery = deliveries.find((delivery) => delivery.jobId === selectedDeliveryId) ?? deliveries[0] ?? null;

  const { isLoaded: mapIsLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GMAPS_KEY });
  const dashMapRef = useRef<google.maps.Map | null>(null);
  const [dashMapReady, setDashMapReady] = useState(false);
  const [activeMapInfo, setActiveMapInfo] = useState<'pickup' | 'truck' | 'drop' | null>(null);

  const routePoints = useMemo<google.maps.LatLngLiteral[]>(() => {
    if (!selectedDelivery) return [];
    const pts: google.maps.LatLngLiteral[] = [];
    if (selectedDelivery.pickupLat != null && selectedDelivery.pickupLng != null)
      pts.push({ lat: selectedDelivery.pickupLat, lng: selectedDelivery.pickupLng });
    if (selectedDelivery.currentLocation)
      pts.push({ lat: selectedDelivery.currentLocation.latitude, lng: selectedDelivery.currentLocation.longitude });
    if (selectedDelivery.dropLat != null && selectedDelivery.dropLng != null)
      pts.push({ lat: selectedDelivery.dropLat, lng: selectedDelivery.dropLng });
    return pts;
  }, [selectedDelivery]);

  const mapCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (selectedDelivery?.currentLocation)
      return { lat: selectedDelivery.currentLocation.latitude, lng: selectedDelivery.currentLocation.longitude };
    if (selectedDelivery?.pickupLat != null && selectedDelivery?.pickupLng != null)
      return { lat: selectedDelivery.pickupLat, lng: selectedDelivery.pickupLng };
    if (selectedDelivery?.dropLat != null && selectedDelivery?.dropLng != null)
      return { lat: selectedDelivery.dropLat, lng: selectedDelivery.dropLng };
    return { lat: 20.5937, lng: 78.9629 };
  }, [selectedDelivery]);

  // Pan map when selected delivery changes
  useEffect(() => {
    if (!dashMapRef.current) return;
    dashMapRef.current.panTo(mapCenter);
  }, [mapCenter]);

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 sm:h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[300px] sm:h-[420px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const liveCount = deliveries.filter((delivery) => Boolean(delivery.currentLocation)).length;

  return (
    <div className="relative w-full space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 overflow-x-hidden">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-5 sm:px-6 sm:py-7 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#1066b1]">Haulier Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">Operations Overview</h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-300">Real-time status of your logistics operations.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/haulier/post-job')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-3 py-2.5 text-xs sm:text-sm font-black text-white transition hover:bg-[#1066b1]"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Post New Job
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="rounded-xl bg-blue-50 p-2 text-primary">
              <span className="material-symbols-outlined text-lg sm:text-xl">payments</span>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">+12.5%</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Spend</p>
          <h3 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-[#041627] truncate">{formatCurrency(stats.totalSpend, userCurrency)}</h3>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-3">
            <div className="rounded-xl bg-[#1066b1]/10 p-2 text-[#0d55a0] w-fit">
              <span className="material-symbols-outlined text-lg sm:text-xl">package_2</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active Jobs</p>
          <h3 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-[#041627]">{String(stats.activeShipments).padStart(2, '0')}</h3>
          {stats.bookedAwaitingPayment > 0 && (
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-[#0d55a0]">{stats.bookedAwaitingPayment} need payment</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-3">
            <div className="rounded-xl bg-slate-100 p-2 text-[#44474C] w-fit">
              <span className="material-symbols-outlined text-lg sm:text-xl">request_quote</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Pending Quotes</p>
          <h3 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-[#041627]">{String(stats.pendingQuotes).padStart(2, '0')}</h3>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
              <span className="material-symbols-outlined text-lg sm:text-xl">speed</span>
            </div>
            <span className="rounded-full bg-[#1066b1]/10 px-2 py-0.5 text-[10px] font-black text-[#0a4a8f]">Optimal</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">On Time Rate</p>
          <h3 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-[#041627]">{stats.fleetUtilization}%</h3>
        </article>
      </section>

      {/* ── Map + Quick Actions ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="rounded-xl bg-[#1066b1]/10 p-1.5 text-[#1066b1] shrink-0">
                <span className="material-symbols-outlined text-lg">map</span>
              </span>
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-black tracking-tight text-[#041627] truncate">Live Tracking</h3>
                <p className="hidden sm:block text-xs text-slate-500">Live map powered by active delivery coordinates.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {liveCount} Live
            </div>
          </div>

          <div className="relative h-[240px] sm:h-[360px] lg:h-[460px] xl:h-[500px] bg-slate-100">
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-center text-rose-700">
                  <p className="font-black">{mapError}</p>
                  <button onClick={() => void loadMap()} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
                </div>
              </div>
            ) : mapLoading && !mapData ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-5 text-center backdrop-blur">
                  <span className="material-symbols-outlined text-3xl text-slate-400 block mb-2">location_on</span>
                  <p className="font-black text-[#041627] text-sm">Loading map…</p>
                </div>
              </div>
            ) : mapIsLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={6}
                options={{ mapTypeControl: false, streetViewControl: false, styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }] }}
                onLoad={(map) => { dashMapRef.current = map; setDashMapReady(true); }}
              >
                {dashMapReady && (<>
                {selectedDelivery?.pickupLat != null && selectedDelivery?.pickupLng != null && (
                  <>
                    <Marker position={{ lat: selectedDelivery.pickupLat, lng: selectedDelivery.pickupLng }} icon={PICKUP_ICON} onClick={() => setActiveMapInfo('pickup')} />
                    {activeMapInfo === 'pickup' && <InfoWindow position={{ lat: selectedDelivery.pickupLat, lng: selectedDelivery.pickupLng }} onCloseClick={() => setActiveMapInfo(null)}><div className="min-w-[160px] text-sm"><p className="font-black text-[#041627]">Pickup</p><p className="text-slate-500">{selectedDelivery.pickupLocation ?? 'Pickup location'}</p></div></InfoWindow>}
                  </>
                )}
                {selectedDelivery?.currentLocation && (
                  <>
                    <Marker position={{ lat: selectedDelivery.currentLocation.latitude, lng: selectedDelivery.currentLocation.longitude }} icon={TRUCK_ICON} onClick={() => setActiveMapInfo('truck')} />
                    {activeMapInfo === 'truck' && <InfoWindow position={{ lat: selectedDelivery.currentLocation.latitude, lng: selectedDelivery.currentLocation.longitude }} onCloseClick={() => setActiveMapInfo(null)}><div className="min-w-[180px] text-sm"><p className="font-black text-[#041627]">{selectedDelivery.jobRef ?? selectedDelivery.jobId}</p><p className="text-slate-500">{selectedDelivery.driver?.name ?? 'Driver not assigned'}</p><p className="mt-1 text-xs text-slate-500">{selectedDelivery.currentLocation.lastUpdatedAt ? new Date(selectedDelivery.currentLocation.lastUpdatedAt).toLocaleString('en-US') : 'No ping'}</p></div></InfoWindow>}
                  </>
                )}
                {selectedDelivery?.dropLat != null && selectedDelivery?.dropLng != null && (
                  <>
                    <Marker position={{ lat: selectedDelivery.dropLat, lng: selectedDelivery.dropLng }} icon={DESTINATION_ICON} onClick={() => setActiveMapInfo('drop')} />
                    {activeMapInfo === 'drop' && <InfoWindow position={{ lat: selectedDelivery.dropLat, lng: selectedDelivery.dropLng }} onCloseClick={() => setActiveMapInfo(null)}><div className="min-w-[160px] text-sm"><p className="font-black text-[#041627]">Destination</p><p className="text-slate-500">{selectedDelivery.dropLocation ?? 'Drop location'}</p></div></InfoWindow>}
                  </>
                )}
                {routePoints.length >= 2 && (
                  <Polyline path={routePoints.filter(p => p != null)} options={{ strokeColor: '#2563eb', strokeWeight: 4, strokeOpacity: 0.9 }} />
                )}
                </>)}
              </GoogleMap>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>
            )}
            <div className="absolute bottom-3 left-3 z-[450] rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Legend</p>
              <div className="space-y-1 text-xs font-medium text-[#44474C]">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" /><span>Vehicle</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#1066b1] shrink-0" /><span>Pickup</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" /><span>Dest.</span></div>
              </div>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-4 sm:gap-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 sm:p-6 text-white shadow-lg">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Quick Action</p>
              <h3 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">Need a fast quote?</h3>
              <p className="mt-2 text-xs sm:text-sm leading-5 text-slate-300">Post a new job and get responses in under 15 minutes.</p>
              <button
                onClick={() => navigate('/haulier/post-job')}
                className="mt-4 w-full rounded-xl bg-[#1066b1] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1066b1]"
              >
                Post New Job
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[120px] text-white/5">conversion_path</span>
          </div>

          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Notifications</h3>
              <button onClick={() => navigate('/haulier/notifications')} className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="material-symbols-outlined text-2xl text-slate-300">notifications_none</span>
                  <p className="mt-2 text-xs text-slate-400">No recent notifications</p>
                </div>
              ) : (
                recentNotifs.map((n) => {
                  const isAlert = /EXPIRE|REJECT|WARN|DISPUTE|CRITICAL/i.test(n.type);
                  return (
                    <div key={n.notificationId} className={`flex gap-3 rounded-xl border p-3 ${isAlert ? 'border-rose-100 bg-rose-50' : 'border-slate-100 bg-slate-50'} ${!n.isRead ? 'ring-1 ring-primary/20' : ''}`}>
                      <span className={`material-symbols-outlined text-base shrink-0 ${isAlert ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isAlert ? 'warning' : 'notifications'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black text-[#041627] truncate">{n.title}</p>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#44474C] line-clamp-2">{n.message}</p>
                        {n.createdAt && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* ── Payment Pending Banner ───────────────────────────────────────────── */}
      {activeJobs.some((j) => j.paymentRequired) && (
        <section className="rounded-2xl border border-[#1066b1]/25 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="material-symbols-outlined text-[#0d55a0] shrink-0">lock_open</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#062f5e]">
                {activeJobs.filter((j) => j.paymentRequired).length} job{activeJobs.filter((j) => j.paymentRequired).length > 1 ? 's' : ''} awaiting payment
              </p>
              <p className="mt-0.5 text-xs text-[#0a4a8f]">Payment must be secured before the driver can start.</p>
            </div>
            <button
              onClick={() => navigate('/haulier/jobs')}
              className="inline-flex items-center gap-1.5 self-start rounded-xl bg-[#1066b1] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1066b1] sm:self-auto shrink-0"
            >
              View Booked
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      {/* ── Active Shipments ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-5">
          <div>
            <h3 className="text-base sm:text-xl font-black tracking-tight text-[#041627]">Active Shipments</h3>
            <p className="text-xs text-slate-400 mt-0.5">Booked, in-transit, and payment-secured jobs</p>
          </div>
          <button onClick={refresh} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-50 hover:text-[#041627]">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Goods / Driver</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                    No active shipments. Post a job to get started.
                  </td>
                </tr>
              ) : activeJobs.map((job) => (
                <tr key={job.id} className={`transition hover:bg-slate-50/70 ${job.paymentRequired ? 'bg-[#1066b1]/10/40' : ''}`}>
                  <td className="px-6 py-5">
                    <p className="font-black text-[#041627] text-sm">{job.id}</p>
                    {job.distanceKm != null && (
                      <p className="text-[10px] text-slate-400">{job.distanceKm} km</p>
                    )}
                  </td>
                  <td className="px-6 py-5 max-w-[200px]">
                    <p className="text-sm font-bold text-[#041627] truncate">{job.route.split(' → ')[0]}</p>
                    <p className="text-[10px] text-slate-300">▼</p>
                    <p className="text-sm text-slate-500 truncate">{job.route.split(' → ')[1]}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-[#041627]">{job.type}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[8px] font-black text-[#44474C]">
                        {job.driver.charAt(0)}
                      </div>
                      <span className="text-xs text-slate-500">{job.driver}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${job.statusColor}`}>
                      {job.status}
                    </span>
                    {job.paymentRequired && (
                      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#0d55a0]">Payment Required</p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-[#041627]">{job.eta}</span>
                    {job.delay && <div className="text-[10px] font-bold text-rose-600">{job.delay}</div>}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {job.paymentRequired ? (
                      <button
                        onClick={() => navigate(`/haulier/payments/create?jobId=${job.jobId}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">lock</span>
                        Secure Payment
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/haulier/tracking')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#44474C] hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        Track
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {activeJobs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No active shipments. Post a job to get started.</p>
          ) : activeJobs.map((job) => (
            <div key={job.id} className={`px-4 py-4 space-y-3 ${job.paymentRequired ? 'bg-[#1066b1]/10/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-sm text-[#041627]">{job.id}</p>
                  {job.distanceKm != null && <p className="text-[10px] text-slate-400">{job.distanceKm} km</p>}
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${job.statusColor}`}>
                  {job.status}
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-0.5">
                <p className="font-bold text-[#041627] truncate">{job.route.split(' → ')[0]}</p>
                <p className="text-slate-400 text-xs">▼</p>
                <p className="truncate">{job.route.split(' → ')[1]}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[#44474C]">{job.type}</p>
                  <p className="text-xs text-slate-400">{job.driver}</p>
                </div>
                {job.paymentRequired ? (
                  <button
                    onClick={() => navigate(`/haulier/payments/create?jobId=${job.jobId}`)}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Pay
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/haulier/tracking')}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#44474C]"
                  >
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    Track
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => navigate('/haulier/jobs')}
            className="inline-flex items-center gap-2 text-sm font-black text-primary transition hover:text-[#041627]"
          >
            View All Jobs
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </section>

    </div>
  );
};

export default HaulierOverview;
