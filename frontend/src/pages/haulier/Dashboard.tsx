import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useHaulierOverview } from '../../hooks/useHaulier';
import haulierService from '../../api/haulierService';
import type { LiveDelivery } from '../../types';

/* ── Signature Modal ─────────────────────────────────────────────────────────── */
type SigPoint = { x: number; y: number };

const DashboardSignModal: React.FC<{
  job: { jobId: string; jobReference: string };
  onClose: () => void;
  onSigned: (jobId: string) => void;
}> = ({ job, onClose, onSigned }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<SigPoint | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPos = (e: React.MouseEvent | React.TouchEvent): SigPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); drawing.current = true; lastPt.current = getPos(e); setHasStrokes(true); };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pt = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPt.current!.x, lastPt.current!.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastPt.current = pt;
  };
  const end = () => { drawing.current = false; lastPt.current = null; };
  const clear = () => { canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasStrokes(false); };

  const submit = async () => {
    if (!canvasRef.current || !hasStrokes) return;
    setLoading(true); setError('');
    try {
      await haulierService.submitDigitalSignature({ jobId: job.jobId, signatureData: canvasRef.current.toDataURL('image/png') });
      onSigned(job.jobId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Step 2 · Handover</p>
            <h2 className="text-xl font-black text-[#041627]">Haulier Signature</h2>
            <p className="text-sm text-slate-500">Job: <span className="font-bold">{job.jobReference}</span></p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="mb-3 text-sm text-[#44474C]">Draw your signature to confirm dispatch officer vehicle release.</p>
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
          <canvas ref={canvasRef} width={560} height={200} className="w-full cursor-crosshair touch-none"
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />
          {!hasStrokes && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm italic text-slate-300 select-none">Draw your signature here</p>}
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-slate-400">DISPATCH OFFICER CONFIRMATION OF VEHICLE RELEASE</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        <div className="mt-5 flex gap-3">
          <button onClick={clear} disabled={loading} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-40">Clear</button>
          <button onClick={() => void submit()} disabled={loading || !hasStrokes} className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:opacity-40">
            {loading ? 'Submitting…' : 'Confirm Signature'}
          </button>
        </div>
      </div>
    </div>
  );
};

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

const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB')}`;

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

type HandoverInfo = {
  jobId: string;
  jobReference: string;
  route: string;
  driverSigned: boolean;
  haulierSigned: boolean;
  driverSignedAt?: string | null;
  haulierSignedAt?: string | null;
  loading: boolean;
};

const HaulierOverview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useHaulierOverview();
  const [mapData, setMapData] = useState<ActiveMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [handoverRows, setHandoverRows] = useState<HandoverInfo[]>([]);
  const [sigModalJob, setSigModalJob] = useState<{ jobId: string; jobReference: string } | null>(null);

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

  // Load handover status for every payment-secured / in-transit job
  useEffect(() => {
    const jobs = (data as DashboardData | null)?.activeJobs ?? [];
    if (!jobs.length) { setHandoverRows([]); return; }
    let cancelled = false;

    // seed with loading placeholders
    const seed: HandoverInfo[] = jobs
      .filter((j) => j.jobId)
      .map((j) => ({
        jobId: j.jobId!,
        jobReference: j.jobReference,
        route: `${stripLocation(j.pickupLocation)} → ${stripLocation(j.dropLocation)}`,
        driverSigned: false,
        haulierSigned: false,
        loading: true,
      }));
    if (!cancelled) setHandoverRows(seed);

    void Promise.all(
      seed.map(async (row) => {
        try {
          const s = await haulierService.getHandoverStatus(row.jobId) as {
            driverSigned?: boolean;
            haulierSigned?: boolean;
            driverSignedAt?: string | null;
            haulierSignedAt?: string | null;
          };
          return { ...row, driverSigned: Boolean(s?.driverSigned), haulierSigned: Boolean(s?.haulierSigned), driverSignedAt: s?.driverSignedAt, haulierSignedAt: s?.haulierSignedAt, loading: false };
        } catch {
          return { ...row, loading: false };
        }
      }),
    ).then((rows) => { if (!cancelled) setHandoverRows(rows); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
      {/* Signature modal */}
      {sigModalJob && (
        <DashboardSignModal
          job={sigModalJob}
          onClose={() => setSigModalJob(null)}
          onSigned={(jobId) => {
            setSigModalJob(null);
            setHandoverRows((prev) =>
              prev.map((r) => r.jobId === jobId ? { ...r, haulierSigned: true, haulierSignedAt: new Date().toISOString() } : r)
            );
          }}
        />
      )}

      {/* ── Vehicle Handover Sign ───────────────────────────────────────────── */}
      {handoverRows.length > 0 && (
        <section className="overflow-hidden rounded-2xl border-2 border-[#1066b1] bg-white shadow-[0_12px_35px_rgba(245,158,11,0.12)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#1066b1]/15 bg-[#1066b1]/10 px-4 py-3 sm:px-6 sm:py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1066b1] text-white">
              <span className="material-symbols-outlined text-sm">draw</span>
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-[#062f5e] text-base sm:text-lg">Vehicle Handover Signatures</h2>
              <p className="text-xs sm:text-sm text-[#0a4a8f]">Sign each active job to authorise vehicle release.</p>
            </div>
            {handoverRows.filter((r) => !r.haulierSigned).length > 0 && (
              <span className="rounded-full bg-[#1066b1] px-2.5 py-1 text-xs font-black text-white shrink-0">
                {handoverRows.filter((r) => !r.haulierSigned).length} pending
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {handoverRows.map((row) => (
              <div key={row.jobId} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 ${!row.haulierSigned ? 'bg-[#1066b1]/10/30' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-[#041627] text-sm">{row.jobReference}</p>
                    {row.driverSigned && !row.haulierSigned && (
                      <span className="rounded-full bg-[#1066b1]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0a4a8f]">Driver signed</span>
                    )}
                    {row.haulierSigned && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">Both signed ✓</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{row.route}</p>
                  <div className="mt-1.5 flex gap-3 text-xs">
                    <span className={`flex items-center gap-1 font-semibold ${row.driverSigned ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-sm">{row.driverSigned ? 'check_circle' : 'radio_button_unchecked'}</span>
                      Driver
                    </span>
                    <span className={`flex items-center gap-1 font-semibold ${row.haulierSigned ? 'text-emerald-600' : 'text-[#1066b1]'}`}>
                      <span className="material-symbols-outlined text-sm">{row.haulierSigned ? 'check_circle' : 'pending'}</span>
                      You
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {row.loading ? (
                    <span className="text-xs text-slate-400">Loading…</span>
                  ) : row.haulierSigned ? (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Signed {row.haulierSignedAt && <span className="font-normal text-emerald-500">{new Date(row.haulierSignedAt).toLocaleDateString('en-GB')}</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSigModalJob({ jobId: row.jobId, jobReference: row.jobReference })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0a4a8f] active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">draw</span>
                      Sign Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-5 sm:px-6 sm:py-7 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#1066b1]">Haulier Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">Fleet Overview</h1>
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
          <h3 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-[#041627] truncate">{formatCurrency(stats.totalSpend)}</h3>
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
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Fleet Use</p>
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
                <h3 className="text-base sm:text-xl font-black tracking-tight text-[#041627] truncate">Live Fleet Tracking</h3>
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
            ) : (
              <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyToDelivery delivery={selectedDelivery} />
                {selectedDelivery?.pickupLat != null && selectedDelivery?.pickupLng != null && (
                  <Marker position={[selectedDelivery.pickupLat, selectedDelivery.pickupLng]} icon={pickupIcon}>
                    <Popup><div className="min-w-[160px] text-sm"><p className="font-black text-[#041627]">Pickup</p><p className="text-slate-500">{selectedDelivery.pickupLocation ?? 'Pickup location'}</p></div></Popup>
                  </Marker>
                )}
                {selectedDelivery?.currentLocation && (
                  <Marker position={[selectedDelivery.currentLocation.latitude, selectedDelivery.currentLocation.longitude]} icon={truckIcon}>
                    <Popup>
                      <div className="min-w-[180px] text-sm">
                        <p className="font-black text-[#041627]">{selectedDelivery.jobRef ?? selectedDelivery.jobId}</p>
                        <p className="text-slate-500">{selectedDelivery.driver?.name ?? 'Driver not assigned'}</p>
                        <p className="mt-1 text-xs text-slate-500">{selectedDelivery.currentLocation.lastUpdatedAt ? new Date(selectedDelivery.currentLocation.lastUpdatedAt).toLocaleString('en-IN') : 'No ping'}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {selectedDelivery?.dropLat != null && selectedDelivery?.dropLng != null && (
                  <Marker position={[selectedDelivery.dropLat, selectedDelivery.dropLng]} icon={destinationIcon}>
                    <Popup><div className="min-w-[160px] text-sm"><p className="font-black text-[#041627]">Destination</p><p className="text-slate-500">{selectedDelivery.dropLocation ?? 'Drop location'}</p></div></Popup>
                  </Marker>
                )}
                {routePoints.length >= 2 && (
                  <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9 }} />
                )}
              </MapContainer>
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Critical Alerts</h3>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
                <span className="material-symbols-outlined text-rose-600 text-base shrink-0">warning</span>
                <div>
                  <p className="text-sm font-black text-[#041627]">TRK-119 Delay</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#44474C]">Severe traffic on M25. ETA +45m.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="material-symbols-outlined text-[#44474C] text-base shrink-0">info</span>
                <div>
                  <p className="text-sm font-black text-[#041627]">Maintenance Due</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#44474C]">FLT-09 needs oil service in 250mi.</p>
                </div>
              </div>
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
                <tr key={job.id} className={`transition hover:bg-slate-50/70 ${handoverRows.some((r) => r.jobId === job.jobId && !r.haulierSigned) ? 'bg-[#1066b1]/10/60' : job.paymentRequired ? 'bg-[#1066b1]/10/40' : ''}`}>
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
                    ) : handoverRows.some((r) => r.jobId === job.jobId && !r.haulierSigned) ? (
                      <button
                        onClick={() => { if (job.jobId) setSigModalJob({ jobId: job.jobId, jobReference: job.id }); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1066b1] bg-[#1066b1]/10 px-3 py-2 text-xs font-black text-[#083d7a] shadow-sm transition hover:bg-[#1066b1] hover:text-white active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">draw</span>
                        Sign Handover
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
                ) : handoverRows.some((r) => r.jobId === job.jobId && !r.haulierSigned) ? (
                  <button
                    onClick={() => { if (job.jobId) setSigModalJob({ jobId: job.jobId, jobReference: job.id }); }}
                    className="inline-flex items-center gap-1 rounded-xl border-2 border-[#1066b1] bg-white px-3 py-2 text-xs font-black text-[#083d7a] hover:bg-[#1066b1] hover:text-white transition"
                  >
                    <span className="material-symbols-outlined text-sm">draw</span>
                    Sign
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
