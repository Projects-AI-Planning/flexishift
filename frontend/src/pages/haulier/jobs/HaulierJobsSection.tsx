import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaulierJobs } from '../../../hooks/useHaulier';
import haulierService from '../../../api/haulierService';

type JobStatus = 'OPEN' | 'BOOKED' | 'IN_TRANSIT' | 'COMPLETED';

type HaulierJobRow = {
  jobId: string;
  jobRef?: string;
  jobReference?: string;
  loadCode?: string;
  status: string;
  createdAt?: string;
  jobDate?: string;
  pickupAddress?: string;
  pickupLocation?: string;
  dropAddress?: string;
  dropLocation?: string;
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number;
  distanceKm?: number;
  timeSlot?: string;
  updatedAt?: string;
};

type HandoverState = {
  driverSigned: boolean;
  haulierSigned: boolean;
  driverSignedAt?: string | null;
  haulierSignedAt?: string | null;
};

type SectionMeta = {
  key: JobStatus;
  label: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  tone: string;
};

const SECTIONS: SectionMeta[] = [
  {
    key: 'OPEN',
    label: 'Open',
    title: 'Open Jobs',
    description: 'Jobs waiting to be reviewed, quoted, or booked.',
    icon: 'inventory_2',
    accent: 'from-blue-600 via-sky-600 to-cyan-500',
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    key: 'BOOKED',
    label: 'Booked',
    title: 'Booked Jobs',
    description: 'Jobs that have been reserved and are moving through the workflow.',
    icon: 'event_available',
    accent: 'from-indigo-600 via-violet-600 to-fuchsia-500',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    title: 'In Transit Jobs',
    description: 'Jobs currently moving with active handover or live tracking.',
    icon: 'local_shipping',
    accent: 'from-emerald-600 via-teal-600 to-cyan-500',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    title: 'Completed Jobs',
    description: 'Jobs that have been delivered and closed out.',
    icon: 'check_circle',
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
];

const PAGE_SIZE = 10;

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status: string) => status.replace(/_/g, ' ');

const statusBadge = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (normalized === 'BOOKED') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'IN_TRANSIT') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (normalized === 'CANCELLED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-[#44474C]';
};

const routeForStatus = (status: JobStatus) => {
  switch (status) {
    case 'BOOKED': return '/haulier/jobs/booked';
    case 'IN_TRANSIT': return '/haulier/jobs/transit';
    case 'COMPLETED': return '/haulier/jobs/completed';
    case 'OPEN':
    default: return '/haulier/jobs/open';
  }
};

/* ── Signature Canvas Modal ─────────────────────────────────────────────────── */
type Point = { x: number; y: number };

interface SignatureModalProps {
  jobReference: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ jobReference, onSave, onCancel, loading, error }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPt.current = getPos(e);
    setHasStrokes(true);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pt = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPt.current = pt;
  };

  const end = () => { drawing.current = false; lastPt.current = null; };

  const clear = () => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStrokes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Step 2 · Handover</p>
            <h2 className="text-xl font-black text-[#041627]">Haulier Signature</h2>
            <p className="text-sm text-slate-500">Job: {jobReference}</p>
          </div>
          <button onClick={onCancel} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="mb-3 mt-4 text-sm font-medium text-[#44474C]">
          Draw your signature below to confirm dispatch officer vehicle release.
        </p>

        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
          <canvas
            ref={canvasRef}
            width={560}
            height={200}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
          {!hasStrokes && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm italic text-slate-300 select-none">
              Draw your signature here
            </p>
          )}
        </div>

        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-slate-400">
          DISPATCH OFFICER CONFIRMATION OF VEHICLE RELEASE
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={clear}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            onClick={() => { if (canvasRef.current && hasStrokes) onSave(canvasRef.current.toDataURL('image/png')); }}
            disabled={loading || !hasStrokes}
            className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            {loading ? 'Submitting…' : 'Confirm Signature'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────────── */
interface HaulierJobsSectionProps {
  status: JobStatus;
  allowPostJob?: boolean;
}

const HaulierJobsSection: React.FC<HaulierJobsSectionProps> = ({ status, allowPostJob = false }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, per_page: PAGE_SIZE, status }), [page, status]);
  const { data, loading, error, refresh } = useHaulierJobs(params);

  const jobs = (data?.jobs as HaulierJobRow[] | undefined) ?? [];
  const activeSection = SECTIONS.find((s) => s.key === status) ?? SECTIONS[0];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  /* Handover status map: jobId → HandoverState */
  const [handoverMap, setHandoverMap] = useState<Record<string, HandoverState>>({});

  /* Signature modal state */
  const [signingJobId, setSigningJobId] = useState<string | null>(null);
  const [signingJobRef, setSigningJobRef] = useState('');
  const [sigLoading, setSigLoading] = useState(false);
  const [sigError, setSigError] = useState('');

  /* Fetch handover status for every in-transit job */
  const fetchHandoverStatuses = useCallback(async (jobList: HaulierJobRow[]) => {
    if (status !== 'IN_TRANSIT') return;
    const results = await Promise.allSettled(
      jobList.map(async (job) => {
        const res = await haulierService.getHandoverStatus(job.jobId) as {
          driverSigned?: boolean;
          haulierSigned?: boolean;
          driverSignedAt?: string | null;
          haulierSignedAt?: string | null;
        };
        return { jobId: job.jobId, state: res };
      }),
    );
    const map: Record<string, HandoverState> = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        map[r.value.jobId] = {
          driverSigned: Boolean(r.value.state?.driverSigned),
          haulierSigned: Boolean(r.value.state?.haulierSigned),
          driverSignedAt: r.value.state?.driverSignedAt,
          haulierSignedAt: r.value.state?.haulierSignedAt,
        };
      }
    });
    setHandoverMap(map);
  }, [status]);

  useEffect(() => {
    if (jobs.length) void fetchHandoverStatuses(jobs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status]);

  const pendingSignCount = Object.values(handoverMap).filter(
    (h) => h.driverSigned && !h.haulierSigned,
  ).length;

  /* Submit haulier signature */
  const handleSign = async (dataUrl: string) => {
    if (!signingJobId) return;
    setSigLoading(true);
    setSigError('');
    try {
      await haulierService.submitDigitalSignature({ jobId: signingJobId, signatureData: dataUrl });
      setSigningJobId(null);
      // Optimistic update
      setHandoverMap((prev) => ({
        ...prev,
        [signingJobId]: { ...prev[signingJobId], haulierSigned: true, haulierSignedAt: new Date().toISOString() },
      }));
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to submit. Please try again.';
      setSigError(msg);
    } finally {
      setSigLoading(false);
    }
  };

  const openSignModal = (jobId: string, jobRef: string) => {
    setSigError('');
    setSigningJobId(jobId);
    setSigningJobRef(jobRef);
  };

  const openCount = jobs.filter((j) => j.status.toUpperCase() === 'OPEN').length;
  const completedCount = jobs.filter((j) => j.status.toUpperCase() === 'COMPLETED').length;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Signature modal */}
      {signingJobId && (
        <SignatureModal
          jobReference={signingJobRef}
          onSave={handleSign}
          onCancel={() => setSigningJobId(null)}
          loading={sigLoading}
          error={sigError}
        />
      )}

      {/* Hero header */}
      <section className={`relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br ${activeSection.accent} px-4 py-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-6 md:px-8 sm:py-7`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)', backgroundSize: '18px 18px' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-200">My Jobs</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">{activeSection.title}</h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-white/80 md:text-base">{activeSection.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm lg:w-[420px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Visible</p>
              <p className="mt-1 text-lg font-black">{String(data?.total ?? jobs.length).padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Page</p>
              <p className="mt-1 text-lg font-black">{page} / {totalPages}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Signature required banner ── */}
      {status === 'IN_TRANSIT' && pendingSignCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <span className="material-symbols-outlined text-amber-600">draw</span>
          </span>
          <div className="flex-1">
            <p className="font-black text-amber-900">
              {pendingSignCount === 1
                ? '1 job needs your handover signature'
                : `${pendingSignCount} jobs need your handover signature`}
            </p>
            <p className="text-sm text-amber-700">
              The driver has completed the checklist and signed. Look for the <strong>Sign Handover</strong> button in the rows below.
            </p>
          </div>
        </div>
      )}

      {/* Nav tabs */}
      <section className="flex flex-wrap gap-3">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => navigate(routeForStatus(s.key))}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              status === s.key
                ? 'border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'border-slate-200 bg-white text-[#44474C] hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
        {allowPostJob && (
          <button
            onClick={() => navigate('/haulier/post-job')}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-[#041627] transition hover:bg-amber-400"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Post New Job
          </button>
        )}
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#44474C] transition hover:border-primary/40 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Jobs on page</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">{String(jobs.length).padStart(2, '0')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">{String(openCount).padStart(2, '0')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Completed</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">{String(completedCount).padStart(2, '0')}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      {/* Jobs table */}
      <section className={`overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)] ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#041627] sm:text-xl">{activeSection.title}</h2>
            <p className="text-sm text-slate-500">Filtered by status = {status}</p>
          </div>
          {allowPostJob && (
            <button
              onClick={() => navigate('/haulier/post-job')}
              className="hidden rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-[#041627] transition hover:bg-amber-400 md:inline-flex"
            >
              Post New Job
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Goods</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Schedule</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                {status === 'BOOKED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Payment</th>
                )}
                {status === 'IN_TRANSIT' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Handover</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const isPaymentSecured = job.status?.toUpperCase() === 'PAYMENT_SECURED';
                const needsPayment = !isPaymentSecured && ['BOOKED', 'PAYMENT_PENDING'].includes(job.status?.toUpperCase() ?? '');
                const handover = handoverMap[job.jobId];
                const needsMySign = handover?.driverSigned && !handover?.haulierSigned;
                const bothSigned = handover?.driverSigned && handover?.haulierSigned;

                return (
                  <tr
                    key={job.jobId}
                    className={`transition hover:bg-slate-50/70 ${needsMySign ? 'bg-amber-50/40' : isPaymentSecured ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${needsMySign ? 'bg-amber-100 text-amber-700' : isPaymentSecured ? 'bg-emerald-100 text-emerald-700' : activeSection.tone}`}>
                          <span className="material-symbols-outlined text-base">
                            {needsMySign ? 'draw' : isPaymentSecured ? 'verified' : activeSection.icon}
                          </span>
                        </div>
                        <div>
                          <p className="font-black text-[#041627]">{job.jobReference ?? job.jobRef}</p>
                          {job.loadCode ? (
                            <button
                              onClick={() => { void navigator.clipboard.writeText(job.loadCode ?? ''); }}
                              className="flex items-center gap-1 mt-0.5 group"
                              title="Click to copy load code"
                            >
                              <span className="font-mono text-xs font-black text-primary">{job.loadCode}</span>
                              <span className="material-symbols-outlined text-[11px] text-slate-400 group-hover:text-primary">content_copy</span>
                            </button>
                          ) : (
                            <p className="text-xs text-slate-400">No load code</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[260px]">
                      <p className="text-sm font-bold text-[#041627] truncate">{job.pickupLocation ?? job.pickupAddress ?? 'N/A'}</p>
                      <p className="text-[10px] text-slate-300 my-1">▼</p>
                      <p className="text-sm text-slate-500 truncate">{job.dropLocation ?? job.dropAddress ?? 'N/A'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#041627]">{job.goodsType ?? 'N/A'}</p>
                      {job.weightKg != null && <p className="text-xs text-slate-400">{job.weightKg} kg</p>}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#041627]">{job.vehicleType ?? 'N/A'}</p>
                      {job.distanceKm != null && <p className="text-xs text-slate-400">{job.distanceKm} km</p>}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#041627]">{formatDate(job.jobDate)}</p>
                      {job.timeSlot && <p className="text-xs text-slate-400">{statusLabel(job.timeSlot)}</p>}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(job.status)}`}>
                        {statusLabel(job.status)}
                      </span>
                      <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(job.createdAt)}</p>
                    </td>

                    {/* Booked: payment column */}
                    {status === 'BOOKED' && (
                      <td className="px-6 py-5">
                        {isPaymentSecured ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                              <span className="text-xs font-black text-emerald-700">Payment Secured</span>
                            </div>
                            {job.loadCode && (
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Load Code</p>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-black text-emerald-800">{job.loadCode}</span>
                                  <button onClick={() => { void navigator.clipboard.writeText(job.loadCode ?? ''); }} className="text-emerald-500 hover:text-emerald-700" title="Copy">
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : needsPayment ? (
                          <button
                            onClick={() => navigate(`/haulier/payments/create?jobId=${job.jobId}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">lock</span>
                            Secure Payment
                          </button>
                        ) : null}
                      </td>
                    )}

                    {/* In-Transit: handover signature column */}
                    {status === 'IN_TRANSIT' && (
                      <td className="px-6 py-5 min-w-[180px]">
                        {!handover ? (
                          <span className="text-xs text-slate-400">Checking…</span>
                        ) : needsMySign ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                              <span className="text-xs font-bold text-emerald-700">Driver signed</span>
                            </div>
                            <button
                              onClick={() => openSignModal(job.jobId, job.jobReference ?? job.jobRef ?? job.jobId)}
                              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 shadow-sm transition hover:bg-amber-400 hover:text-white"
                            >
                              <span className="material-symbols-outlined text-sm">draw</span>
                              Sign Handover
                            </button>
                          </div>
                        ) : bothSigned ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                              <span className="text-xs font-black text-emerald-700">Both signed</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {handover.haulierSignedAt ? new Date(handover.haulierSignedAt).toLocaleString('en-IN') : ''}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-slate-400 text-sm">schedule</span>
                            <span className="text-xs text-slate-500">Awaiting driver</span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={status === 'BOOKED' || status === 'IN_TRANSIT' ? 7 : 6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-2xl text-slate-400">search_off</span>
                      </div>
                      <p className="font-black text-[#44474C]">No {activeSection.label.toLowerCase()} jobs found</p>
                      <p className="text-sm text-slate-400">
                        {allowPostJob ? 'Post a new job to start receiving quotes.' : 'Try another section to see jobs with a different status.'}
                      </p>
                      {allowPostJob && (
                        <button onClick={() => navigate('/haulier/post-job')} className="mt-1 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-[#041627] transition hover:bg-amber-400">
                          Post New Job
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-bold text-slate-500">Showing {jobs.length} of {data?.total ?? 0} jobs</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((c) => Math.max(1, c - 1))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#44474C] transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((c) => c + 1)} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HaulierJobsSection;
