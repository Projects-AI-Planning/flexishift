import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import adminService from '../../api/adminService';
import type { LiveDelivery } from '../../types';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:30px;height:30px;border-radius:999px;background:#f59e0b;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.18);font-size:15px;">🚚</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const selectedTruckIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:999px;background:#1d4ed8;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(29,78,216,.28);font-size:17px;">🚚</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

type LiveTrackingData = {
  totalActive: number;
  deliveries: LiveDelivery[];
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (amount?: number | null) => (typeof amount === 'number' ? currency.format(amount) : '—');

const formatLastSeen = (value?: string | null) => {
  if (!value) return 'No ping';
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return 'No ping';

  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
};

const formatCoordinate = (value?: number | null) =>
  typeof value === 'number' ? value.toFixed(4) : '—';

function FlyToSelection({ delivery }: { delivery: LiveDelivery | null }) {
  const map = useMap();

  useEffect(() => {
    if (!delivery?.currentLocation) return;
    map.flyTo([delivery.currentLocation.latitude, delivery.currentLocation.longitude], 13, {
      duration: 1.1,
    });
  }, [delivery, map]);

  return null;
}

export default function LiveTrackingPage() {
  const [data, setData] = useState<LiveTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  const fetchData = useCallback(async () => {
    try {
      const result = await adminService.getAdminLiveTracking();
      setData(result);
      setError(null);
      setLastRefreshed(new Date());

      const currentSelectedJobId = selectedJobIdRef.current;
      if (currentSelectedJobId) {
        const refreshedSelected = result.deliveries.find((delivery) => delivery.jobId === currentSelectedJobId);
        if (!refreshedSelected && result.deliveries.length > 0) {
          setSelectedJobId(result.deliveries[0].jobId);
        }
      } else if (result.deliveries.length > 0) {
        setSelectedJobId(result.deliveries[0].jobId);
      }
    } catch {
      setError('Failed to load live tracking data from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => {
      void fetchData();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const deliveries = data?.deliveries ?? [];
  const deliveriesWithLocation = useMemo(
    () => deliveries.filter((delivery) => Boolean(delivery.currentLocation)),
    [deliveries],
  );
  const deliveriesWithoutLocation = useMemo(
    () => deliveries.filter((delivery) => !delivery.currentLocation),
    [deliveries],
  );

  const selectedDelivery = useMemo(
    () => deliveries.find((delivery) => delivery.jobId === selectedJobId) ?? null,
    [deliveries, selectedJobId],
  );

  const mapCenter: [number, number] = useMemo(() => {
    const firstTracked = deliveriesWithLocation[0];
    if (firstTracked?.currentLocation) {
      return [firstTracked.currentLocation.latitude, firstTracked.currentLocation.longitude];
    }

    const firstKnown = deliveries.find((delivery) => delivery.pickupLat != null && delivery.pickupLng != null);
    if (firstKnown?.pickupLat != null && firstKnown.pickupLng != null) {
      return [firstKnown.pickupLat, firstKnown.pickupLng];
    }

    return [20.5937, 78.9629];
  }, [deliveries, deliveriesWithLocation]);

  const selectedShare = selectedDelivery?.currentLocation
    ? `${formatCoordinate(selectedDelivery.currentLocation.latitude)}, ${formatCoordinate(selectedDelivery.currentLocation.longitude)}`
    : 'No active GPS ping';

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[780px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex shrink-0 flex-col gap-4 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Admin Dashboard</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-[#041627] sm:text-2xl">Live Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time tracking data loaded from the backend live-tracking endpoint.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Active Jobs</p>
            <p className="mt-1 text-lg font-black text-[#041627]">{data?.totalActive ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">GPS Online</p>
            <p className="mt-1 text-lg font-black text-emerald-600">{deliveriesWithLocation.length}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden xl:grid xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex h-[220px] flex-shrink-0 flex-col border-b border-slate-200 bg-white xl:h-auto xl:flex-1 xl:min-h-0 xl:border-b-0 xl:border-r">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tracked Deliveries</p>
            <p className="mt-1 text-sm text-slate-500">Select a job to focus the map and details.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            )}

            {!loading && deliveries.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="text-3xl">🚛</div>
                <p className="mt-3 text-sm font-bold text-[#44474C]">No active deliveries</p>
                <p className="mt-1 text-xs text-slate-500">
                  Once a job moves to transit and receives a GPS ping, it will appear here.
                </p>
              </div>
            )}

            {!loading && deliveries.length > 0 && (
              <div className="space-y-2">
                {deliveriesWithLocation.map((delivery) => {
                  const active = delivery.jobId === selectedJobId;
                  return (
                    <button
                      key={delivery.jobId}
                      onClick={() => setSelectedJobId(delivery.jobId)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#041627]">{delivery.jobRef}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {delivery.driver?.name ?? 'Driver not assigned'}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Live
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <p className="truncate">{delivery.dropLocation ?? 'Destination unavailable'}</p>
                        <p>
                          {selectedJobId === delivery.jobId ? 'Selected' : 'Last ping'}: {formatLastSeen(delivery.currentLocation?.lastUpdatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {deliveriesWithoutLocation.map((delivery) => {
                  const active = delivery.jobId === selectedJobId;
                  return (
                    <button
                      key={delivery.jobId}
                      onClick={() => setSelectedJobId(delivery.jobId)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-amber-200 bg-amber-50 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 opacity-90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#041627]">{delivery.jobRef}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {delivery.driver?.name ?? 'Driver not assigned'}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          No GPS
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <p className="truncate">{delivery.dropLocation ?? 'Destination unavailable'}</p>
                        <p>No location ping yet</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="relative flex-1 min-h-[320px] overflow-hidden bg-slate-100">
          <div className="absolute inset-x-0 top-0 z-[450] flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                Auto refresh every 30 seconds
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                Last refreshed {lastRefreshed ? lastRefreshed.toLocaleTimeString() : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {deliveriesWithLocation.length} live GPS updates
            </div>
          </div>

          <div className="absolute inset-0 pt-14">
            <MapContainer center={mapCenter} zoom={5} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToSelection delivery={selectedDelivery} />

              {deliveriesWithLocation.map((delivery) => (
                <Marker
                  key={delivery.jobId}
                  position={[delivery.currentLocation!.latitude, delivery.currentLocation!.longitude]}
                  icon={delivery.jobId === selectedJobId ? selectedTruckIcon : truckIcon}
                  eventHandlers={{
                    click: () => setSelectedJobId(delivery.jobId),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px] space-y-1 text-sm">
                      <p className="font-bold text-[#041627]">{delivery.jobRef}</p>
                      <p className="text-[#44474C]">{delivery.driver?.name ?? 'Driver not assigned'}</p>
                      <p className="text-xs text-slate-500">
                        {delivery.driver?.vehicleNumber ?? 'Vehicle not assigned'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatLastSeen(delivery.currentLocation?.lastUpdatedAt)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {deliveries.length > 0 && !deliveriesWithLocation.length && !loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-900/35 p-6 backdrop-blur-sm">
              <div className="max-w-md rounded-3xl border border-white/20 bg-white p-6 text-center shadow-2xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                  🚚
                </div>
                <p className="mt-4 text-lg font-black text-[#041627]">No GPS coordinates yet</p>
                <p className="mt-2 text-sm text-[#44474C]">
                  There are {data?.totalActive ?? 0} active deliveries, but the backend has not received a live location ping yet.
                </p>
              </div>
            </div>
          )}

          {selectedDelivery && (
            <div className="absolute bottom-0 left-0 right-0 z-[460] border-t border-slate-200 bg-white/98 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-[#041627]">{selectedDelivery.jobRef}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {selectedDelivery.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDelivery.pickupLocation ?? 'Pickup unavailable'} → {selectedDelivery.dropLocation ?? 'Destination unavailable'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedJobId(null)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#44474C] transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 px-5 py-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Driver</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">{selectedDelivery.driver?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{selectedDelivery.driver?.phone ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Vehicle</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">
                    {selectedDelivery.driver?.vehicleNumber ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDelivery.driver?.vehicleType ?? selectedDelivery.vehicleType ?? '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Haulier</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">{selectedDelivery.haulier?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{selectedDelivery.haulier?.phone ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Last Ping</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">
                    {formatLastSeen(selectedDelivery.currentLocation?.lastUpdatedAt)}
                  </p>
                  <p className="text-xs text-slate-500">{selectedShare}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 px-5 py-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Goods</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">{selectedDelivery.goodsType ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {selectedDelivery.weightKg != null ? `${selectedDelivery.weightKg} kg` : 'Weight unavailable'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Amount</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">{formatCurrency(selectedDelivery.agreedAmount)}</p>
                  <p className="text-xs text-slate-500">Agreed booking amount</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Job Date</p>
                  <p className="mt-1 text-sm font-bold text-[#041627]">
                    {selectedDelivery.jobDate ? new Date(selectedDelivery.jobDate).toLocaleDateString() : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Backend job schedule date</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
