import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import haulierService from '../../api/haulierService';

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

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const liveIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:38px;height:38px;border-radius:999px;background:#1d4ed8;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(29,78,216,.35);font-size:18px;animation:pulse 2s infinite;">🚚</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

const pickupIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:999px;background:#16a34a;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(22,163,74,.3);font-size:13px;">📦</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const dropIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:999px;background:#dc2626;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(220,38,38,.3);font-size:13px;">🏁</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const historyIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:999px;background:#f59e0b;border:2px solid #fff;box-shadow:0 4px 10px rgba(245,158,11,.3);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

const statusTone = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('deliver')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('transit') || normalized.includes('active')) return 'bg-blue-100 text-blue-700';
  return 'bg-[#1066b1]/15 text-[#0a4a8f]';
};

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString('en-US') : 'N/A');

function FlyToCenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, 13, { duration: 1.2 });
  }, [center, map]);
  return null;
}

// Fetch road-snapped route from OSRM between two or more waypoints.
// OSRM returns coordinates as [lng, lat]; Leaflet needs [lat, lng].
async function fetchRoadRoute(
  waypoints: Array<{ latitude: number; longitude: number }>,
  signal?: AbortSignal,
): Promise<[number, number][]> {
  if (waypoints.length < 2) return [];
  const coords = waypoints.map((w) => `${w.longitude},${w.latitude}`).join(';');
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('OSRM error');
  const data = await res.json() as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };
  const raw = data.routes?.[0]?.geometry?.coordinates;
  if (!raw) throw new Error('No route');
  return raw.map(([lng, lat]) => [lat, lng]);
}

// Haversine distance in metres between two lat/lng points
function haversineM(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sin2));
}

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
  // Road-snapped future route (current → destination)
  const [roadFuture, setRoadFuture] = useState<[number, number][]>([]);
  // Road-snapped full route (pickup → …GPS points… → current)
  const [roadTrail, setRoadTrail] = useState<[number, number][]>([]);

  const lastFutureOrigin = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTrailKey = useRef<string>('');

  // Fetch future route whenever driver moves >200 m or destination changes
  useEffect(() => {
    if (!liveLocation || !destination?.latitude || !destination?.longitude) {
      setRoadFuture([]);
      return;
    }
    const last = lastFutureOrigin.current;
    if (last && haversineM(last, liveLocation) < 200) return;

    const ctrl = new AbortController();
    lastFutureOrigin.current = liveLocation;

    fetchRoadRoute(
      [liveLocation, { latitude: destination.latitude, longitude: destination.longitude }],
      ctrl.signal,
    )
      .then(setRoadFuture)
      .catch(() => { /* silently fall back to straight line */ });

    return () => ctrl.abort();
  }, [liveLocation, destination]);

  // Fetch full trail route: pickup → sampled GPS points → current location.
  // Only re-fetches when the point count or current location (>200 m) changes.
  useEffect(() => {
    const hasPickup = pickup?.latitude != null && pickup?.longitude != null;
    const hasLive = liveLocation != null;
    if (!hasPickup && !hasLive) { setRoadTrail([]); return; }

    // Build waypoints: pickup (if known) + up to 8 sampled history points + current
    const waypoints: Array<{ latitude: number; longitude: number }> = [];
    if (hasPickup) waypoints.push({ latitude: pickup!.latitude!, longitude: pickup!.longitude! });

    // Sample at most 8 points from history to stay within OSRM URL limits
    if (historyPoints.length > 0) {
      const step = Math.max(1, Math.floor(historyPoints.length / 8));
      for (let i = 0; i < historyPoints.length; i += step) {
        waypoints.push({ latitude: historyPoints[i].latitude, longitude: historyPoints[i].longitude });
      }
    }
    if (hasLive) waypoints.push(liveLocation!);

    if (waypoints.length < 2) { setRoadTrail([]); return; }

    const key = `${waypoints.length}:${liveLocation?.latitude?.toFixed(3)}:${liveLocation?.longitude?.toFixed(3)}`;
    if (key === lastTrailKey.current) return;

    const ctrl = new AbortController();
    lastTrailKey.current = key;

    fetchRoadRoute(waypoints, ctrl.signal)
      .then(setRoadTrail)
      .catch(() => setRoadTrail([]));

    return () => ctrl.abort();
  }, [historyPoints, liveLocation, pickup]);

  const mapCenter = useMemo<[number, number] | null>(() => {
    if (liveLocation) return [liveLocation.latitude, liveLocation.longitude];
    if (historyPoints.length > 0) return [historyPoints[0].latitude, historyPoints[0].longitude];
    if (destination?.latitude != null && destination?.longitude != null)
      return [destination.latitude, destination.longitude];
    return null;
  }, [destination, liveLocation, historyPoints]);

  // Fallback straight-line trail used only when OSRM hasn't responded yet
  const straightTrail = useMemo<[number, number][]>(() => {
    const pts = historyPoints.map((p) => [p.latitude, p.longitude] as [number, number]);
    if (liveLocation) pts.push([liveLocation.latitude, liveLocation.longitude]);
    return pts;
  }, [historyPoints, liveLocation]);

  // Fallback straight future line
  const straightFuture = useMemo<[number, number][]>(() => {
    if (!liveLocation || !destination?.latitude || !destination?.longitude) return [];
    return [[liveLocation.latitude, liveLocation.longitude], [destination.latitude, destination.longitude]];
  }, [liveLocation, destination]);

  const displayTrail = roadTrail.length > 1 ? roadTrail : straightTrail;
  const displayFuture = roadFuture.length > 1 ? roadFuture : straightFuture;

  if (!mapCenter) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        No coordinates available for this job yet.
      </div>
    );
  }

  return (
    <MapContainer center={mapCenter} zoom={12} className="h-full w-full rounded-3xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToCenter center={liveLocation ? [liveLocation.latitude, liveLocation.longitude] : null} />

      {/* Road-snapped travelled path */}
      {displayTrail.length > 1 && (
        <Polyline
          positions={displayTrail}
          pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }}
        />
      )}

      {/* Road-snapped future path — dashed line to destination */}
      {displayFuture.length > 1 && (
        <Polyline
          positions={displayFuture}
          pathOptions={{ color: '#93c5fd', weight: 3, opacity: 0.75, dashArray: '8 6' }}
        />
      )}

      {/* History trail dots */}
      {historyPoints.map((point, index) => (
        <Marker
          key={`${point.latitude}-${point.longitude}-${index}`}
          position={[point.latitude, point.longitude]}
          icon={historyIcon}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-bold text-slate-700">Point {index + 1}</p>
              <p className="text-slate-500">{formatTime(point.timestamp)}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Pickup marker */}
      {pickup?.latitude != null && pickup?.longitude != null && (
        <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon}>
          <Popup>
            <div className="min-w-[160px] text-sm">
              <p className="font-black text-emerald-700">Pickup Point</p>
              <p className="text-slate-500">{pickup.address ?? 'Pickup location'}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destination?.latitude != null && destination?.longitude != null && (
        <Marker position={[destination.latitude, destination.longitude]} icon={dropIcon}>
          <Popup>
            <div className="min-w-[160px] text-sm">
              <p className="font-black text-red-700">Destination</p>
              <p className="text-slate-500">{destination.address ?? 'Drop-off location'}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Live driver position */}
      {liveLocation && (
        <Marker position={[liveLocation.latitude, liveLocation.longitude]} icon={liveIcon}>
          <Popup>
            <div className="min-w-[180px] text-sm">
              <p className="font-black text-primary">Driver — Live GPS</p>
              <p className="text-slate-500">
                {liveLocation.latitude.toFixed(5)}, {liveLocation.longitude.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

const WS_BASE = (import.meta.env.VITE_API_URL as string ?? 'http://localhost:8000/api/v1')
  .replace(/^http/, 'ws')
  .replace(/\/api\/v1\/?$/, '');

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

export default function HaulierTrackingPage() {
  const [tab, setTab] = useState<'jobs' | 'shifts'>('jobs');

  // ── Job tracking state ─────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [live, setLive] = useState<LiveTracking | null>(null);
  const [history, setHistory] = useState<TrackingHistory | null>(null);
  const [eta, setEta] = useState<EtaData | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [lastWsUpdate, setLastWsUpdate] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ── Shift tracking state ───────────────────────────────────────────────────
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [shiftLoc, setShiftLoc] = useState<ShiftDriverLocation | null>(null);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftWsConnected, setShiftWsConnected] = useState(false);
  const [shiftLastUpdate, setShiftLastUpdate] = useState<string | null>(null);
  const shiftWsRef = useRef<WebSocket | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const historyPoints = history?.locationHistory ?? [];

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const result = await haulierService.getActiveJobs({ page: 1, limit: 20 });
      const items = (result.items ?? result.jobs ?? []) as ActiveJob[];
      setJobs(items);
      setSelectedJobId((current) => current || items[0]?.jobId || '');
      setError('');
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(response.response?.data?.message || response.response?.data?.detail || 'Failed to load active jobs.');
    } finally {
      setLoadingJobs(false);
    }
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
      setLive(liveData);
      setHistory(historyData);
      setEta(etaData);
      setError('');
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(response.response?.data?.message || response.response?.data?.detail || 'Failed to load tracking details.');
      setLive(null);
      setHistory(null);
      setEta(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // WebSocket for real-time location updates
  useEffect(() => {
    if (!selectedJobId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${WS_BASE}/ws/jobs/${selectedJobId}/tracking?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'tracking_update' && msg.lat != null && msg.lng != null) {
          const now = new Date().toISOString();
          setLastWsUpdate(now);
          // Update live location directly — no polling round-trip needed
          setLive((prev) =>
            prev
              ? {
                  ...prev,
                  currentLocation: { latitude: msg.lat, longitude: msg.lng },
                  lastUpdatedAt: msg.recorded_at ?? now,
                }
              : {
                  trackingId: '',
                  jobId: selectedJobId,
                  jobReference: '',
                  currentLocation: { latitude: msg.lat, longitude: msg.lng },
                  status: 'IN_TRANSIT',
                  lastUpdatedAt: msg.recorded_at ?? now,
                },
          );
          // Also append to history points for the trail
          setHistory((prev) => {
            if (!prev) return prev;
            const alreadyLast =
              prev.locationHistory.length > 0 &&
              prev.locationHistory[prev.locationHistory.length - 1].latitude === msg.lat &&
              prev.locationHistory[prev.locationHistory.length - 1].longitude === msg.lng;
            if (alreadyLast) return prev;
            return {
              ...prev,
              locationHistory: [
                ...prev.locationHistory,
                { latitude: msg.lat, longitude: msg.lng, timestamp: msg.recorded_at ?? now },
              ],
              totalPoints: prev.totalPoints + 1,
            };
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [selectedJobId]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId) {
      void loadTracking(selectedJobId);
    }
  }, [loadTracking, selectedJobId]);

  // Fallback polling every 30s (WebSocket handles real-time; poll keeps history/ETA fresh)
  useEffect(() => {
    if (!selectedJobId) return;
    const timer = window.setInterval(() => {
      void loadTracking(selectedJobId);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadTracking, selectedJobId]);

  // ── Shift effects ─────────────────────────────────────────────────────────

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const result = await haulierService.listMyShifts() as { shifts?: ActiveShift[] } | ActiveShift[];
      const items: ActiveShift[] = Array.isArray(result) ? result : ((result as { shifts?: ActiveShift[] }).shifts ?? []);
      const active = items.filter((s) => ['BOOKED', 'IN_PROGRESS'].includes((s.status ?? '').toUpperCase()));
      setShifts(active);
      setSelectedShiftId((cur) => cur || active[0]?.shiftId || '');
    } catch { /* ignore */ } finally {
      setLoadingShifts(false);
    }
  }, []);

  const loadShiftLocation = useCallback(async (shiftId: string) => {
    if (!shiftId) return;
    try {
      const data = await haulierService.getShiftDriverLocation(shiftId);
      setShiftLoc(data as ShiftDriverLocation);
    } catch { /* ignore */ }
  }, []);

  // Shift WebSocket for real-time location
  useEffect(() => {
    if (tab !== 'shifts' || !selectedShiftId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const url = `${WS_BASE}/ws/shifts/${selectedShiftId}/tracking?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    shiftWsRef.current = ws;
    ws.onopen = () => setShiftWsConnected(true);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'tracking_update' && msg.lat != null && msg.lng != null) {
          const now = new Date().toISOString();
          setShiftLastUpdate(now);
          setShiftLoc((prev) => ({ ...prev, latitude: msg.lat, longitude: msg.lng }));
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => { setShiftWsConnected(false); shiftWsRef.current = null; };
    ws.onerror = () => setShiftWsConnected(false);
    return () => { ws.close(); shiftWsRef.current = null; setShiftWsConnected(false); };
  }, [tab, selectedShiftId]);

  // Shift polling fallback (10s — same interval as driver push)
  useEffect(() => {
    if (tab !== 'shifts' || !selectedShiftId) return;
    void loadShiftLocation(selectedShiftId);
    const timer = window.setInterval(() => void loadShiftLocation(selectedShiftId), 10000);
    return () => window.clearInterval(timer);
  }, [tab, selectedShiftId, loadShiftLocation]);

  useEffect(() => {
    if (tab === 'shifts') void loadShifts();
  }, [tab, loadShifts]);

  const selectedShift = useMemo(
    () => shifts.find((s) => s.shiftId === selectedShiftId) ?? null,
    [shifts, selectedShiftId],
  );

  const shiftLiveLocation = useMemo(
    () => (shiftLoc?.latitude != null && shiftLoc.longitude != null
      ? { latitude: shiftLoc.latitude!, longitude: shiftLoc.longitude! }
      : null),
    [shiftLoc],
  );

  // ── Build pickup location from job + eta data for the map
  const pickupForMap = useMemo(() => {
    const job = selectedJob;
    if (job?.pickupLat != null && job?.pickupLng != null) {
      return { address: job.pickupAddress, latitude: job.pickupLat, longitude: job.pickupLng };
    }
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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={() => void loadTracking(selectedJobId)}
            disabled={!selectedJobId}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* ── Tab toggle ────────────────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 self-start w-fit">
        <button
          onClick={() => setTab('jobs')}
          className={`rounded-lg px-5 py-2 text-sm font-black transition ${tab === 'jobs' ? 'bg-white shadow text-[#1066b1]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Jobs
        </button>
        <button
          onClick={() => setTab('shifts')}
          className={`rounded-lg px-5 py-2 text-sm font-black transition ${tab === 'shifts' ? 'bg-white shadow text-[#1066b1]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Shifts
        </button>
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
            {tab === 'jobs'
              ? (eta?.eta ? new Date(eta.eta).toLocaleString('en-US') : 'N/A')
              : (shiftLastUpdate ? new Date(shiftLastUpdate).toLocaleTimeString() : 'N/A')}
          </h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Sidebar: job or shift list ─────────────────────────────────────── */}
        <aside className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {tab === 'jobs' ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-primary">Active Jobs</h2>
                  <p className="text-sm text-slate-500">Select a job to view live tracking.</p>
                </div>
                {loadingJobs && <span className="text-xs font-black text-slate-400">Loading...</span>}
              </div>
              <div className="mt-5 space-y-3">
                {jobs.map((job) => (
                  <button
                    key={job.jobId}
                    onClick={() => setSelectedJobId(job.jobId)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedJobId === job.jobId
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-primary">{job.jobRef ?? job.title ?? job.jobId}</p>
                        <p className="mt-1 text-xs text-slate-500">{job.pickupAddress ?? 'Pickup not set'} → {job.dropAddress ?? 'Drop not set'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(job.status)}`}>
                        {job.status ?? 'ACTIVE'}
                      </span>
                    </div>
                  </button>
                ))}
                {!loadingJobs && jobs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No active jobs found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-primary">Active Shifts</h2>
                  <p className="text-sm text-slate-500">Select a shift to track the driver.</p>
                </div>
                {loadingShifts && <span className="text-xs font-black text-slate-400">Loading...</span>}
              </div>
              <div className="mt-5 space-y-3">
                {shifts.map((shift) => (
                  <button
                    key={shift.shiftId}
                    onClick={() => { setSelectedShiftId(shift.shiftId); setShiftLoc(null); setShiftLastUpdate(null); }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedShiftId === shift.shiftId
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-primary">{shift.shiftRef ?? shift.shiftId}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Day {(shift.daysCompleted ?? 0) + 1} of {shift.totalDays ?? '?'}
                          {shift.driver?.name ? ` · ${shift.driver.name}` : ''}
                        </p>
                        {shift.location && <p className="mt-0.5 text-xs text-slate-400 truncate">{shift.location}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(shift.status)}`}>
                        {shift.status ?? 'ACTIVE'}
                      </span>
                    </div>
                  </button>
                ))}
                {!loadingShifts && shifts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No active shifts found.
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <main className="space-y-6">
          {/* ── Shift tracking panel ──────────────────────────────────────────── */}
          {tab === 'shifts' && (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-primary">Selected Shift</h2>
                    <p className="text-sm text-slate-500">{selectedShift?.shiftRef ?? 'Choose an active shift to begin tracking.'}</p>
                  </div>
                  {selectedShift && (
                    <div className="flex items-center gap-2">
                      {shiftWsConnected && <span className="text-[10px] font-black text-emerald-600">● Live</span>}
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(selectedShift.status)}`}>
                        {selectedShift.status ?? 'ACTIVE'}
                      </span>
                    </div>
                  )}
                </div>
                {selectedShift ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Driver</p>
                      <p className="mt-2 text-sm font-black text-primary">{shiftLoc?.driverName ?? selectedShift.driver?.name ?? 'N/A'}</p>
                      <p className="text-xs text-slate-500">{selectedShift.driver?.phone ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Update</p>
                      <p className="mt-2 text-sm font-black text-primary">{shiftLastUpdate ? formatTime(shiftLastUpdate) : 'No location yet'}</p>
                      {shiftWsConnected && <p className="text-[10px] text-emerald-600 font-black mt-0.5">● Real-time</p>}
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Day Progress</p>
                      <p className="mt-2 text-sm font-black text-primary">
                        Day {(selectedShift.daysCompleted ?? 0) + 1} of {selectedShift.totalDays ?? '?'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No active shift selected.
                  </div>
                )}
              </div>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-primary">Live Map</h3>
                    <p className="text-sm text-slate-500">
                      {shiftWsConnected ? 'Updates in real-time via WebSocket.' : 'Polling every 10 seconds.'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1"><span className="text-sm">🚚</span> Driver (live)</span>
                </div>
                <div className="mt-4 h-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <TrackingMap
                    liveLocation={shiftLiveLocation}
                    historyPoints={[]}
                    destination={null}
                    pickup={null}
                  />
                </div>
              </section>
            </>
          )}

          {/* ── Job tracking panel ────────────────────────────────────────────── */}
          {tab === 'jobs' && (<>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-black text-primary">Selected Job</h2>
                <p className="text-sm text-slate-500">{selectedJob?.jobRef ?? 'Choose an active job to begin tracking.'}</p>
              </div>
              {selectedJob && (
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(selectedJob.status)}`}>
                  {selectedJob.status ?? 'ACTIVE'}
                </span>
              )}
            </div>

            {selectedJob ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Driver</p>
                  <p className="mt-2 text-sm font-black text-primary">{live?.driver?.name ?? selectedJob.selectedSupplier?.name ?? 'N/A'}</p>
                  <p className="text-xs text-slate-500">{live?.driver?.phone ?? selectedJob.selectedSupplier?.phone ?? 'No phone available'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Update</p>
                  <p className="mt-2 text-sm font-black text-primary">
                    {lastWsUpdate ? formatTime(lastWsUpdate) : formatTime(live?.lastUpdatedAt)}
                  </p>
                  {wsConnected && <p className="text-[10px] text-emerald-600 font-black mt-0.5">● Real-time</p>}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Destination</p>
                  <p className="mt-2 text-sm font-black text-primary">{eta?.destination?.address ?? selectedJob.dropAddress ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Delay</p>
                  <p className="mt-2 text-sm font-black text-primary">
                    {eta?.isDelayed ? `${eta.delayMinutes ?? 0} min delayed` : 'On time'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                {loadingJobs ? 'Loading active jobs...' : 'No active job selected.'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-primary">Live Map</h3>
                  <p className="text-sm text-slate-500">
                    {wsConnected ? 'Updates in real-time via WebSocket.' : 'Polling every 30 seconds.'}
                  </p>
                </div>
                {loadingDetails && <span className="text-xs font-black text-slate-400">Refreshing...</span>}
              </div>

              {/* Map legend */}
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1"><span className="text-sm">🚚</span> Driver (live)</span>
                <span className="flex items-center gap-1"><span className="text-sm">📦</span> Pickup</span>
                <span className="flex items-center gap-1"><span className="text-sm">🏁</span> Drop-off</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0.5 rounded-full bg-blue-500" />
                  Travelled
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0 border-t-2 border-dashed border-blue-300" />
                  Remaining
                </span>
              </div>

              <div className="mt-4 h-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <TrackingMap
                  liveLocation={live?.currentLocation ?? null}
                  historyPoints={historyPoints}
                  destination={eta?.destination}
                  pickup={pickupForMap}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-primary">ETA Details</h3>
              <p className="text-sm text-slate-500">Backend-calculated ETA and delay state.</p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Estimated Arrival</p>
                  <p className="mt-2 text-sm font-black text-primary">{eta?.eta ? new Date(eta.eta).toLocaleString('en-US') : 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Original ETA</p>
                  <p className="mt-2 text-sm font-black text-primary">{eta?.originalETA ? new Date(eta.originalETA).toLocaleString('en-US') : 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Delay Status</p>
                  <p className={`mt-2 text-sm font-black ${eta?.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {eta?.isDelayed ? `⚠ ${eta.delayMinutes ?? 0} min behind schedule` : '✓ On time'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Calculated</p>
                  <p className="mt-2 text-sm font-black text-primary">{formatTime(eta?.lastCalculatedAt)}</p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-primary">Tracking History</h3>
                <p className="text-sm text-slate-500">Route points received from the driver.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {history?.totalPoints ?? 0} points
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">#</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Latitude</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Longitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...(history?.locationHistory ?? [])].reverse().map((point, index) => (
                    <tr key={`${point.timestamp ?? index}-${index}`} className={index === 0 ? 'bg-blue-50/50' : ''}>
                      <td className="px-4 py-4 text-xs text-slate-400 font-bold">
                        {(history?.locationHistory.length ?? 0) - index}
                        {index === 0 && <span className="ml-1 text-[10px] text-blue-600 font-black">LATEST</span>}
                      </td>
                      <td className="px-4 py-4 text-[#44474C]">{formatTime(point.timestamp)}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.latitude.toFixed(6)}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.longitude.toFixed(6)}</td>
                    </tr>
                  ))}
                  {!loadingDetails && (history?.locationHistory.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No tracking points yet. Journey begins after handover.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </>)} {/* end tab === 'jobs' */}
        </main>
      </section>
    </div>
  );
}
