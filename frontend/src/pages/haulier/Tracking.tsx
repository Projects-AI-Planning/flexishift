import { useCallback, useEffect, useMemo, useState } from 'react';
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
  html: '<div style="width:34px;height:34px;border-radius:999px;background:#1d4ed8;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(29,78,216,.25);font-size:16px;">🚚</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const historyIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:24px;height:24px;border-radius:999px;background:#f59e0b;border:2px solid #fff;box-shadow:0 8px 18px rgba(245,158,11,.28);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

const statusTone = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('deliver')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('transit') || normalized.includes('active')) return 'bg-blue-100 text-blue-700';
  return 'bg-[#1066b1]/15 text-[#0a4a8f]';
};

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A');

function FlyToCenter({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.flyTo(center, 11, { duration: 1.1 });
  }, [center, map]);

  return null;
}

function TrackingMap({
  liveLocation,
  historyPoints,
  destination,
}: {
  liveLocation: { latitude: number; longitude: number } | null;
  historyPoints: Array<{ latitude: number; longitude: number; timestamp: string | null }>;
  destination: { latitude?: number | null; longitude?: number | null } | null | undefined;
}) {
  const route = useMemo(() => historyPoints.map((point) => [point.latitude, point.longitude] as [number, number]), [historyPoints]);
  const mapCenter = useMemo<[number, number] | null>(() => {
    if (liveLocation) return [liveLocation.latitude, liveLocation.longitude];
    if (route.length > 0) return route[0];
    if (destination?.latitude != null && destination?.longitude != null) return [destination.latitude, destination.longitude];
    return null;
  }, [destination, liveLocation, route]);

  if (!mapCenter) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        No coordinates are available for this job yet.
      </div>
    );
  }

  return (
    <MapContainer center={mapCenter} zoom={11} className="h-full w-full rounded-3xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToCenter center={mapCenter} />

      {route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
        />
      )}

      {historyPoints.map((point, index) => (
        <Marker key={`${point.latitude}-${point.longitude}-${index}`} position={[point.latitude, point.longitude]} icon={historyIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-black text-primary">History point {index + 1}</p>
              <p className="text-slate-500">{formatTime(point.timestamp)}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {liveLocation && (
        <Marker position={[liveLocation.latitude, liveLocation.longitude]} icon={liveIcon}>
          <Popup>
            <div className="min-w-[180px] text-sm">
              <p className="font-black text-primary">Live GPS position</p>
              <p className="text-slate-500">Latest backend coordinate</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

export default function HaulierTrackingPage() {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [live, setLive] = useState<LiveTracking | null>(null);
  const [history, setHistory] = useState<TrackingHistory | null>(null);
  const [eta, setEta] = useState<EtaData | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

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
        haulierService.getTrackingHistory(jobId, { page: 1, limit: 20 }),
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

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId) {
      void loadTracking(selectedJobId);
    }
  }, [loadTracking, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    const timer = window.setInterval(() => {
      void loadTracking(selectedJobId);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadTracking, selectedJobId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Operations</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Live Tracking</h1>
          <p className="text-on-surface-variant font-medium">Track active jobs with backend live location, ETA, and history data.</p>
        </div>
        <button
          onClick={() => void loadTracking(selectedJobId)}
          disabled={!selectedJobId}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Active Jobs</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{jobs.length}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tracking Points</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{history?.totalPoints ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">ETA</p>
          <h3 className="mt-2 text-2xl font-black text-primary">{eta?.eta ? new Date(eta.eta).toLocaleString('en-IN') : 'N/A'}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-primary">Active Jobs</h2>
              <p className="text-sm text-slate-500">Select a job to view tracking data.</p>
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
        </aside>

        <main className="space-y-6">
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
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Updated</p>
                  <p className="mt-2 text-sm font-black text-primary">{formatTime(live?.lastUpdatedAt)}</p>
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
                  <p className="text-sm text-slate-500">Current GPS position and route history from the backend.</p>
                </div>
                {loadingDetails && <span className="text-xs font-black text-slate-400">Refreshing...</span>}
              </div>

              <div className="mt-5 h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <TrackingMap
                  liveLocation={live?.currentLocation ?? null}
                  historyPoints={historyPoints}
                  destination={eta?.destination}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-primary">ETA Details</h3>
              <p className="text-sm text-slate-500">Backend-calculated ETA and delay state.</p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Estimated Arrival</p>
                  <p className="mt-2 text-sm font-black text-primary">{eta?.eta ? new Date(eta.eta).toLocaleString('en-IN') : 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Original ETA</p>
                  <p className="mt-2 text-sm font-black text-primary">{eta?.originalETA ? new Date(eta.originalETA).toLocaleString('en-IN') : 'N/A'}</p>
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
                <p className="text-sm text-slate-500">Ordered route points from the backend history endpoint.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {history?.totalPoints ?? 0} points
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Latitude</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Longitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(history?.locationHistory ?? []).map((point, index) => (
                    <tr key={`${point.timestamp ?? index}-${index}`}>
                      <td className="px-4 py-4 text-[#44474C]">{formatTime(point.timestamp)}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.latitude}</td>
                      <td className="px-4 py-4 font-black text-primary">{point.longitude}</td>
                    </tr>
                  ))}
                  {!loadingDetails && (history?.locationHistory.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No tracking points available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}
