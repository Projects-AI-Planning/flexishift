import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GoogleMap,
  Marker,
  Polyline,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import haulierService from '../../api/haulierService';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

type ActiveJob = {
  jobId: string;
  jobRef?: string;
  title?: string;
  status?: string;
  pickupAddress?: string;
  dropAddress?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropLat?: number | null;
  dropLng?: number | null;
  selectedSupplier?: {
    id?: string;
    name?: string;
    phone?: string;
  } | null;
};

type LiveTracking = {
  trackingId: string;
  jobId: string;
  jobReference: string;
  driver?: {
    driverId: string;
    name: string;
    phone: string;
    vehicleNumber?: string | null;
    vehicleType?: string | null;
  } | null;
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  status: string;
  lastUpdatedAt?: string | null;
};

type TrackingHistory = {
  jobId: string;
  jobReference: string;
  locationHistory: Array<{
    latitude: number;
    longitude: number;
    timestamp: string | null;
  }>;
  totalPoints: number;
  startedAt?: string | null;
  completedAt?: string | null;
};

type EtaData = {
  jobId: string;
  jobReference: string;
  destination?: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  currentLocation?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  eta?: string;
  originalETA?: string | null;
  isDelayed?: boolean;
  delayMinutes?: number;
  lastCalculatedAt?: string | null;
};

const statusTone = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('deliver')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('transit') || normalized.includes('active')) return 'bg-blue-100 text-blue-700';
  return 'bg-[#1066b1]/15 text-[#0a4a8f]';
};

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString('en-US') : 'N/A');

function haversineM(a: {latitude: number; longitude: number}, b: {latitude: number; longitude: number}) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sin2));
}

// Fetch road-snapped route from Google Directions via backend
async function fetchRoadRoute(
  waypoints: Array<{latitude: number; longitude: number}>,
  signal?: AbortSignal,
): Promise<google.maps.LatLngLiteral[]> {
  if (waypoints.length < 2) return [];
  const origin = waypoints[0];
  const dest   = waypoints[waypoints.length - 1];
  const wps    = waypoints.slice(1, -1).map(w => ({ lat: w.latitude, lng: w.longitude }));
  try {
    const result = await haulierService.getRoute(
      origin.latitude, origin.longitude,
      dest.latitude, dest.longitude,
      wps.length ? wps : undefined,
    );
    return (result.coordinates ?? []).map((c: {latitude: number; longitude: number}) => ({
      lat: c.latitude,
      lng: c.longitude,
    }));
  } catch {
    return [];
  }
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 54.5, lng: -3.0 };
const GOOGLE_MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
};

const TRUCK_ICON = {
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="17" fill="#1d4ed8" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="16">🚚</text></svg>'
  ),
  scaledSize: { width: 40, height: 40 } as google.maps.Size,
  anchor: { x: 20, y: 20 } as google.maps.Point,
};

const PICKUP_ICON = {
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="12" fill="#16a34a" stroke="white" stroke-width="2.5"/><text x="15" y="20" text-anchor="middle" font-size="13">📦</text></svg>'
  ),
  scaledSize: { width: 30, height: 30 } as google.maps.Size,
  anchor: { x: 15, y: 15 } as google.maps.Point,
};

const DROP_ICON = {
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="12" fill="#dc2626" stroke="white" stroke-width="2.5"/><text x="15" y="20" text-anchor="middle" font-size="13">🏁</text></svg>'
  ),
  scaledSize: { width: 30, height: 30 } as google.maps.Size,
  anchor: { x: 15, y: 15 } as google.maps.Point,
};

const HISTORY_ICON = {
  path: 0, // google.maps.SymbolPath.CIRCLE resolved at runtime
  fillColor: '#f59e0b',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 5,
};

type ActiveShift = {
  shiftId: string;
  shiftRef?: string;
  status?: string;
  location?: string;
  pickupAddress?: string;
  dropAddress?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropLat?: number | null;
  dropLng?: number | null;
  driver?: { name?: string; phone?: string } | null;
  daysCompleted?: number;
  totalDays?: number;
};

type ShiftDriverLocation = {
  driverId?: string;
  driverName?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function TrackingMap({
  liveLocation,
  historyPoints,
  destination,
  pickup,
}: {
  liveLocation: { latitude: number; longitude: number } | null;
  historyPoints: Array<{ latitude: number; longitude: number; timestamp: string | null }>;
  destination: { address?: string | null; latitude?: number | null; longitude?: number | null } | null | undefined;
  pickup: { address?: string | null; latitude?: number | null; longitude?: number | null } | null | undefined;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady,   setMapReady]   = useState(false);
  const [roadFuture, setRoadFuture] = useState<google.maps.LatLngLiteral[]>([]);
  const [roadTrail,  setRoadTrail]  = useState<google.maps.LatLngLiteral[]>([]);
  const [activeInfo, setActiveInfo] = useState<'live' | 'pickup' | 'drop' | null>(null);

  const lastFutureOrigin = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTrailKey = useRef<string>('');

  // Fly to driver when live position changes
  useEffect(() => {
    if (!liveLocation || !mapRef.current) return;
    mapRef.current.panTo({ lat: liveLocation.latitude, lng: liveLocation.longitude });
  }, [liveLocation?.latitude, liveLocation?.longitude]);

  // Future route: current → destination
  useEffect(() => {
    if (!liveLocation || !destination?.latitude || !destination?.longitude) { setRoadFuture([]); return; }
    const last = lastFutureOrigin.current;
    if (last && haversineM(last, liveLocation) < 200) return;
    const ctrl = new AbortController();
    lastFutureOrigin.current = liveLocation;
    fetchRoadRoute([liveLocation, { latitude: destination.latitude, longitude: destination.longitude }], ctrl.signal)
      .then(setRoadFuture).catch(() => {});
    return () => ctrl.abort();
  }, [liveLocation, destination]);

  // Trail: pickup → history points → current
  useEffect(() => {
    const hasPickup = pickup?.latitude != null && pickup?.longitude != null;
    const hasLive   = liveLocation != null;
    if (!hasPickup && !hasLive) { setRoadTrail([]); return; }
    const waypoints: Array<{ latitude: number; longitude: number }> = [];
    if (hasPickup) waypoints.push({ latitude: pickup!.latitude!, longitude: pickup!.longitude! });
    if (historyPoints.length > 0) {
      const step = Math.max(1, Math.floor(historyPoints.length / 8));
      for (let i = 0; i < historyPoints.length; i += step)
        waypoints.push({ latitude: historyPoints[i].latitude, longitude: historyPoints[i].longitude });
    }
    if (hasLive) waypoints.push(liveLocation!);
    if (waypoints.length < 2) { setRoadTrail([]); return; }
    const key = `${waypoints.length}:${liveLocation?.latitude?.toFixed(3)}:${liveLocation?.longitude?.toFixed(3)}`;
    if (key === lastTrailKey.current) return;
    const ctrl = new AbortController();
    lastTrailKey.current = key;
    fetchRoadRoute(waypoints, ctrl.signal).then(setRoadTrail).catch(() => setRoadTrail([]));
    return () => ctrl.abort();
  }, [historyPoints, liveLocation, pickup]);

  const mapCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (liveLocation) return { lat: liveLocation.latitude, lng: liveLocation.longitude };
    if (historyPoints.length > 0) return { lat: historyPoints[0].latitude, lng: historyPoints[0].longitude };
    if (destination?.latitude != null && destination?.longitude != null)
      return { lat: destination.latitude, lng: destination.longitude };
    return DEFAULT_CENTER;
  }, [destination, liveLocation, historyPoints]);

  const straightTrail = useMemo<google.maps.LatLngLiteral[]>(() => {
    const pts = historyPoints.map(p => ({ lat: p.latitude, lng: p.longitude }));
    if (liveLocation) pts.push({ lat: liveLocation.latitude, lng: liveLocation.longitude });
    return pts;
  }, [historyPoints, liveLocation]);

  const straightFuture = useMemo<google.maps.LatLngLiteral[]>(() => {
    if (!liveLocation || !destination?.latitude || !destination?.longitude) return [];
    return [{ lat: liveLocation.latitude, lng: liveLocation.longitude }, { lat: destination.latitude, lng: destination.longitude }];
  }, [liveLocation, destination]);

  const displayTrail  = roadTrail.length  > 1 ? roadTrail  : straightTrail;
  const displayFuture = roadFuture.length > 1 ? roadFuture : straightFuture;

  if (!liveLocation && historyPoints.length === 0 && !destination?.latitude) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        No coordinates available for this job yet.
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={mapCenter}
      zoom={12}
      options={GOOGLE_MAP_OPTIONS}
      onLoad={(map) => { mapRef.current = map; setMapReady(true); }}
    >
      {mapReady && (<>
      {/* Travelled path */}
      {displayTrail.length > 1 && (
        <Polyline path={displayTrail.filter(p => p != null)} options={{ strokeColor: '#2563eb', strokeWeight: 5, strokeOpacity: 0.85 }} />
      )}
      {/* Future path */}
      {displayFuture.length > 1 && (
        <Polyline path={displayFuture.filter(p => p != null)} options={{ strokeColor: '#93c5fd', strokeWeight: 3, strokeOpacity: 0.6 }} />
      )}
      {/* History dots */}
      {historyPoints.map((point, index) => (
        <Marker
          key={`${point.latitude}-${point.longitude}-${index}`}
          position={{ lat: point.latitude, lng: point.longitude }}
          icon={HISTORY_ICON as unknown as google.maps.Icon}
          title={`Point ${index + 1} — ${formatTime(point.timestamp)}`}
        />
      ))}
      {/* Pickup */}
      {pickup?.latitude != null && pickup?.longitude != null && (
        <>
          <Marker position={{ lat: pickup.latitude, lng: pickup.longitude }} icon={PICKUP_ICON as google.maps.Icon} onClick={() => setActiveInfo('pickup')} />
          {activeInfo === 'pickup' && (
            <InfoWindow position={{ lat: pickup.latitude, lng: pickup.longitude }} onCloseClick={() => setActiveInfo(null)}>
              <div className="min-w-[160px] text-sm"><p className="font-black text-emerald-700">Pickup Point</p><p className="text-slate-500">{pickup.address ?? 'Pickup location'}</p></div>
            </InfoWindow>
          )}
        </>
      )}
      {/* Destination */}
      {destination?.latitude != null && destination?.longitude != null && (
        <>
          <Marker position={{ lat: destination.latitude, lng: destination.longitude }} icon={DROP_ICON as google.maps.Icon} onClick={() => setActiveInfo('drop')} />
          {activeInfo === 'drop' && (
            <InfoWindow position={{ lat: destination.latitude, lng: destination.longitude }} onCloseClick={() => setActiveInfo(null)}>
              <div className="min-w-[160px] text-sm"><p className="font-black text-red-700">Destination</p><p className="text-slate-500">{destination.address ?? 'Drop-off location'}</p></div>
            </InfoWindow>
          )}
        </>
      )}
      {/* Live driver */}
      {liveLocation && (
        <>
          <Marker position={{ lat: liveLocation.latitude, lng: liveLocation.longitude }} icon={TRUCK_ICON as google.maps.Icon} onClick={() => setActiveInfo('live')} />
          {activeInfo === 'live' && (
            <InfoWindow position={{ lat: liveLocation.latitude, lng: liveLocation.longitude }} onCloseClick={() => setActiveInfo(null)}>
              <div className="min-w-[180px] text-sm"><p className="font-black text-blue-700">Driver — Live GPS</p><p className="text-slate-500">{liveLocation.latitude.toFixed(5)}, {liveLocation.longitude.toFixed(5)}</p></div>
            </InfoWindow>
          )}
        </>
      )}
      </>)}
    </GoogleMap>
  );
}

const WS_BASE = (import.meta.env.VITE_API_URL as string ?? 'http://localhost:8000/api/v1')
  .replace(/^http/, 'ws')
  .replace(/\/api\/v1\/?$/, '');

export default function HaulierTrackingPage() {
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GMAPS_KEY });
  const [searchParams] = useSearchParams();

  const urlTab     = searchParams.get('tab') as 'jobs' | 'shifts' | null;
  const urlShiftId = searchParams.get('shiftId') ?? '';
  const urlJobId   = searchParams.get('jobId') ?? '';

  const [tab, setTab] = useState<'jobs' | 'shifts'>(urlTab === 'shifts' ? 'shifts' : 'jobs');

  const [jobs, setJobs]                       = useState<ActiveJob[]>([]);
  const [selectedJobId, setSelectedJobId]     = useState(urlJobId);
  const [live, setLive]                       = useState<LiveTracking | null>(null);
  const [history, setHistory]                 = useState<TrackingHistory | null>(null);
  const [eta, setEta]                         = useState<EtaData | null>(null);
  const [loadingJobs, setLoadingJobs]         = useState(true);
  const [loadingDetails, setLoadingDetails]   = useState(false);
  const [error, setError]                     = useState('');
  const [wsConnected, setWsConnected]         = useState(false);
  const [lastWsUpdate, setLastWsUpdate]       = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [shifts, setShifts]                           = useState<ActiveShift[]>([]);
  const [selectedShiftId, setSelectedShiftId]         = useState(urlShiftId);
  const [shiftLoc, setShiftLoc]                       = useState<ShiftDriverLocation | null>(null);
  const [loadingShifts, setLoadingShifts]             = useState(false);
  const [shiftWsConnected, setShiftWsConnected]       = useState(false);
  const [shiftLastUpdate, setShiftLastUpdate]         = useState<string | null>(null);
  const shiftWsRef = useRef<WebSocket | null>(null);

  const selectedJob = useMemo(() => jobs.find(j => j.jobId === selectedJobId) ?? null, [jobs, selectedJobId]);
  const historyPoints = history?.locationHistory ?? [];

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const result = await haulierService.getActiveJobs({ page: 1, limit: 20 });
      const items = (result.items ?? result.jobs ?? []) as ActiveJob[];
      setJobs(items);
      setSelectedJobId(c => c || urlJobId || items[0]?.jobId || '');
      setError('');
    } catch (err: unknown) {
      const r = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(r.response?.data?.message || r.response?.data?.detail || 'Failed to load active jobs.');
    } finally { setLoadingJobs(false); }
  }, []);

  const loadTracking = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setLoadingDetails(true);
    try {
      const [liveData, historyData, etaData] = await Promise.all([
        haulierService.getLiveDriverLocation(jobId),
        haulierService.getTrackingHistory(jobId, { page: 1, limit: 50 }),
        haulierService.getETA(jobId),
      ]);
      setLive(liveData); setHistory(historyData); setEta(etaData); setError('');
    } catch (err: unknown) {
      const r = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(r.response?.data?.message || r.response?.data?.detail || 'Failed to load tracking details.');
      setLive(null); setHistory(null); setEta(null);
    } finally { setLoadingDetails(false); }
  }, []);

  // WebSocket for real-time location
  useEffect(() => {
    if (!selectedJobId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/jobs/${selectedJobId}/tracking?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onopen  = () => setWsConnected(true);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'tracking_update' && msg.lat != null && msg.lng != null) {
          const now = new Date().toISOString();
          setLastWsUpdate(now);
          setLive(prev => prev
            ? { ...prev, currentLocation: { latitude: msg.lat, longitude: msg.lng }, lastUpdatedAt: msg.recorded_at ?? now }
            : { trackingId: '', jobId: selectedJobId, jobReference: '', currentLocation: { latitude: msg.lat, longitude: msg.lng }, status: 'IN_TRANSIT', lastUpdatedAt: msg.recorded_at ?? now });
          setHistory(prev => {
            if (!prev) return prev;
            const last = prev.locationHistory[prev.locationHistory.length - 1];
            if (last?.latitude === msg.lat && last?.longitude === msg.lng) return prev;
            return { ...prev, locationHistory: [...prev.locationHistory, { latitude: msg.lat, longitude: msg.lng, timestamp: msg.recorded_at ?? now }], totalPoints: prev.totalPoints + 1 };
          });
        }
      } catch { /* ignore */ }
    };
    ws.onclose  = () => { setWsConnected(false); wsRef.current = null; };
    ws.onerror  = () => setWsConnected(false);
    return () => { ws.close(); wsRef.current = null; setWsConnected(false); };
  }, [selectedJobId]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => { if (selectedJobId) void loadTracking(selectedJobId); }, [loadTracking, selectedJobId]);
  useEffect(() => {
    if (!selectedJobId) return;
    const t = window.setInterval(() => void loadTracking(selectedJobId), 30000);
    return () => window.clearInterval(t);
  }, [loadTracking, selectedJobId]);

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const result = await haulierService.listMyShifts() as { shifts?: ActiveShift[] } | ActiveShift[];
      const items: ActiveShift[] = Array.isArray(result) ? result : ((result as { shifts?: ActiveShift[] }).shifts ?? []);
      const active = items.filter(s => ['BOOKED', 'IN_PROGRESS'].includes((s.status ?? '').toUpperCase()));
      setShifts(active);
      setSelectedShiftId(cur => cur || urlShiftId || active[0]?.shiftId || '');
    } catch { /* ignore */ } finally { setLoadingShifts(false); }
  }, []);

  const loadShiftLocation = useCallback(async (shiftId: string) => {
    if (!shiftId) return;
    try { setShiftLoc((await haulierService.getShiftDriverLocation(shiftId)) as ShiftDriverLocation); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab !== 'shifts' || !selectedShiftId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/shifts/${selectedShiftId}/tracking?token=${encodeURIComponent(token)}`);
    shiftWsRef.current = ws;
    ws.onopen  = () => setShiftWsConnected(true);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'tracking_update' && msg.lat != null && msg.lng != null) {
          setShiftLastUpdate(new Date().toISOString());
          setShiftLoc(prev => ({ ...prev, latitude: msg.lat, longitude: msg.lng }));
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => { setShiftWsConnected(false); shiftWsRef.current = null; };
    ws.onerror = () => setShiftWsConnected(false);
    return () => { ws.close(); shiftWsRef.current = null; setShiftWsConnected(false); };
  }, [tab, selectedShiftId]);

  useEffect(() => {
    if (tab !== 'shifts' || !selectedShiftId) return;
    void loadShiftLocation(selectedShiftId);
    const t = window.setInterval(() => void loadShiftLocation(selectedShiftId), 10000);
    return () => window.clearInterval(t);
  }, [tab, selectedShiftId, loadShiftLocation]);

  useEffect(() => { if (tab === 'shifts') void loadShifts(); }, [tab, loadShifts]);

  const selectedShift     = useMemo(() => shifts.find(s => s.shiftId === selectedShiftId) ?? null, [shifts, selectedShiftId]);
  const shiftLiveLocation = useMemo(() =>
    shiftLoc?.latitude != null && shiftLoc.longitude != null
      ? { latitude: shiftLoc.latitude!, longitude: shiftLoc.longitude! }
      : null,
    [shiftLoc]);

  const pickupForMap = useMemo(() => {
    const job = selectedJob;
    if (job?.pickupLat != null && job?.pickupLng != null)
      return { address: job.pickupAddress, latitude: job.pickupLat, longitude: job.pickupLng };
    return null;
  }, [selectedJob]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Operations</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Live Tracking</h1>
          <p className="text-on-surface-variant font-medium">Real-time driver location, route history, and ETA.</p>
        </div>
        <div className="flex items-center gap-3">
          {wsConnected && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          )}
          <button onClick={() => void loadTracking(selectedJobId)} disabled={!selectedJobId}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">refresh</span> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 self-start w-fit">
        {(['jobs', 'shifts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-black transition ${tab === t ? 'bg-white shadow text-[#1066b1]' : 'text-slate-400 hover:text-slate-600'}`}>
            {t === 'jobs' ? 'Jobs' : 'Shifts'}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{tab === 'jobs' ? 'Active Jobs' : 'Active Shifts'}</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{tab === 'jobs' ? jobs.length : shifts.length}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tracking Points</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{tab === 'jobs' ? (history?.totalPoints ?? 0) : (shiftLiveLocation ? '1' : '0')}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{tab === 'jobs' ? 'ETA' : 'Last Update'}</p>
          <h3 className="mt-2 text-2xl font-black text-primary">
            {tab === 'jobs' ? (eta?.eta ? new Date(eta.eta).toLocaleString('en-US') : 'N/A') : (shiftLastUpdate ? new Date(shiftLastUpdate).toLocaleTimeString() : 'N/A')}
          </h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {tab === 'jobs' ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-black text-primary">Active Jobs</h2><p className="text-sm text-slate-500">Select a job to view live tracking.</p></div>
                {loadingJobs && <span className="text-xs font-black text-slate-400">Loading...</span>}
              </div>
              <div className="mt-5 space-y-3">
                {jobs.map(job => (
                  <button key={job.jobId} onClick={() => setSelectedJobId(job.jobId)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selectedJobId === job.jobId ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-primary">{job.jobRef ?? job.title ?? job.jobId}</p>
                        <p className="mt-1 text-xs text-slate-500">{job.pickupAddress ?? 'Pickup not set'} → {job.dropAddress ?? 'Drop not set'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(job.status)}`}>{job.status ?? 'ACTIVE'}</span>
                    </div>
                  </button>
                ))}
                {!loadingJobs && jobs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No active jobs found.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-black text-primary">Active Shifts</h2><p className="text-sm text-slate-500">Select a shift to track the driver.</p></div>
                {loadingShifts && <span className="text-xs font-black text-slate-400">Loading...</span>}
              </div>
              <div className="mt-5 space-y-3">
                {shifts.map(shift => (
                  <button key={shift.shiftId} onClick={() => { setSelectedShiftId(shift.shiftId); setShiftLoc(null); setShiftLastUpdate(null); }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selectedShiftId === shift.shiftId ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-primary">{shift.shiftRef ?? shift.shiftId}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Day {(shift.daysCompleted ?? 0) + 1} of {shift.totalDays ?? '?'}{shift.driver?.name ? ` · ${shift.driver.name}` : ''}</p>
                        {shift.location && <p className="mt-0.5 text-xs text-slate-400 truncate">{shift.location}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(shift.status)}`}>{shift.status ?? 'ACTIVE'}</span>
                    </div>
                  </button>
                ))}
                {!loadingShifts && shifts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No active shifts found.</div>
                )}
              </div>
            </>
          )}
        </aside>

        <main className="space-y-6">
          {tab === 'shifts' && (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div><h2 className="text-lg font-black text-primary">Selected Shift</h2><p className="text-sm text-slate-500">{selectedShift?.shiftRef ?? 'Choose an active shift to begin tracking.'}</p></div>
                  {selectedShift && (
                    <div className="flex items-center gap-2">
                      {shiftWsConnected && <span className="text-[10px] font-black text-emerald-600">● Live</span>}
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(selectedShift.status)}`}>{selectedShift.status ?? 'ACTIVE'}</span>
                    </div>
                  )}
                </div>
                {selectedShift ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Driver</p><p className="mt-2 text-sm font-black text-primary">{shiftLoc?.driverName ?? selectedShift.driver?.name ?? 'N/A'}</p><p className="text-xs text-slate-500">{selectedShift.driver?.phone ?? '—'}</p></div>
                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Update</p><p className="mt-2 text-sm font-black text-primary">{shiftLastUpdate ? formatTime(shiftLastUpdate) : 'No location yet'}</p>{shiftWsConnected && <p className="text-[10px] text-emerald-600 font-black mt-0.5">● Real-time</p>}</div>
                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Day Progress</p><p className="mt-2 text-sm font-black text-primary">Day {(selectedShift.daysCompleted ?? 0) + 1} of {selectedShift.totalDays ?? '?'}</p></div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No active shift selected.</div>
                )}
              </div>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-black text-primary">Live Map</h3><p className="text-sm text-slate-500">{shiftWsConnected ? 'Updates in real-time via WebSocket.' : 'Polling every 10 seconds.'}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1"><span className="text-sm">🚚</span> Driver (live)</span>
                </div>
                <div className="mt-4 h-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  {isLoaded ? (
                    <TrackingMap liveLocation={shiftLiveLocation} historyPoints={[]} destination={null} pickup={null} />
                  ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>}
                </div>
              </section>
            </>
          )}

          {tab === 'jobs' && (<>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div><h2 className="text-lg font-black text-primary">Selected Job</h2><p className="text-sm text-slate-500">{selectedJob?.jobRef ?? 'Choose an active job to begin tracking.'}</p></div>
              {selectedJob && <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(selectedJob.status)}`}>{selectedJob.status ?? 'ACTIVE'}</span>}
            </div>
            {selectedJob ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Driver</p><p className="mt-2 text-sm font-black text-primary">{live?.driver?.name ?? selectedJob.selectedSupplier?.name ?? 'N/A'}</p><p className="text-xs text-slate-500">{live?.driver?.phone ?? selectedJob.selectedSupplier?.phone ?? 'No phone'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Update</p><p className="mt-2 text-sm font-black text-primary">{lastWsUpdate ? formatTime(lastWsUpdate) : formatTime(live?.lastUpdatedAt)}</p>{wsConnected && <p className="text-[10px] text-emerald-600 font-black mt-0.5">● Real-time</p>}</div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Destination</p><p className="mt-2 text-sm font-black text-primary">{eta?.destination?.address ?? selectedJob.dropAddress ?? 'N/A'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Delay</p><p className="mt-2 text-sm font-black text-primary">{eta?.isDelayed ? `${eta.delayMinutes ?? 0} min delayed` : 'On time'}</p></div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{loadingJobs ? 'Loading active jobs...' : 'No active job selected.'}</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="text-lg font-black text-primary">Live Map</h3><p className="text-sm text-slate-500">{wsConnected ? 'Updates in real-time via WebSocket.' : 'Polling every 30 seconds.'}</p></div>
                {loadingDetails && <span className="text-xs font-black text-slate-400">Refreshing...</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1"><span className="text-sm">🚚</span> Driver</span>
                <span className="flex items-center gap-1"><span className="text-sm">📦</span> Pickup</span>
                <span className="flex items-center gap-1"><span className="text-sm">🏁</span> Drop-off</span>
                <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 rounded-full bg-blue-500" /> Travelled</span>
                <span className="flex items-center gap-1"><span className="inline-block w-5 h-0 border-t-2 border-dashed border-blue-300" /> Remaining</span>
              </div>
              <div className="mt-4 h-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                {isLoaded ? (
                  <TrackingMap liveLocation={live?.currentLocation ?? null} historyPoints={historyPoints} destination={eta?.destination} pickup={pickupForMap} />
                ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-primary">ETA Details</h3>
              <p className="text-sm text-slate-500">Backend-calculated ETA and delay state.</p>
              <div className="mt-5 space-y-3">
                {[
                  {label: 'Estimated Arrival', value: eta?.eta ? new Date(eta.eta).toLocaleString('en-US') : 'N/A'},
                  {label: 'Original ETA',      value: eta?.originalETA ? new Date(eta.originalETA).toLocaleString('en-US') : 'N/A'},
                  {label: 'Last Calculated',   value: formatTime(eta?.lastCalculatedAt)},
                ].map(r => (
                  <div key={r.label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{r.label}</p>
                    <p className="mt-2 text-sm font-black text-primary">{r.value}</p>
                  </div>
                ))}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Delay Status</p>
                  <p className={`mt-2 text-sm font-black ${eta?.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {eta?.isDelayed ? `⚠ ${eta.delayMinutes ?? 0} min behind schedule` : '✓ On time'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-black text-primary">Tracking History</h3><p className="text-sm text-slate-500">Route points received from the driver.</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">{history?.totalPoints ?? 0} points</span>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    {['#', 'Timestamp', 'Latitude', 'Longitude'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...(history?.locationHistory ?? [])].reverse().map((point, index) => (
                    <tr key={`${point.timestamp ?? index}-${index}`} className={index === 0 ? 'bg-blue-50/50' : ''}>
                      <td className="px-4 py-4 text-xs text-slate-400 font-bold">{(history?.locationHistory.length ?? 0) - index}{index === 0 && <span className="ml-1 text-[10px] text-blue-600 font-black">LATEST</span>}</td>
                      <td className="px-4 py-4 text-[#44474C]">{formatTime(point.timestamp)}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.latitude.toFixed(6)}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.longitude.toFixed(6)}</td>
                    </tr>
                  ))}
                  {!loadingDetails && (history?.locationHistory.length ?? 0) === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No tracking points yet. Journey begins after handover.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </>)}
        </main>
      </section>
    </div>
  );
}
