import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaulierJobs } from '../../../hooks/useHaulier';
import haulierService from '../../../api/haulierService';

type JobStatus = 'OPEN' | 'BOOKED' | 'IN_TRANSIT' | 'COMPLETED';

type QuoteRow = {
  quoteId: string;
  jobId: string;
  supplierId: string;
  supplier?: {
    name?: string;
    photoUrl?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    avgRating?: number | null;
    completedJobs?: number;
  } | null;
  quoteAmount: number;
  currency: string;
  status: string;
  createdAt?: string;
};

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
    accent: 'from-[#1066b1]/100 via-[#1066b1] to-rose-500',
    tone: 'bg-[#1066b1]/10 text-[#0a4a8f] border-[#1066b1]/15',
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Step 2 · Handover</p>
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

/* ── Bids Panel ─────────────────────────────────────────────────────────────── */

const quoteBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-blue-100 text-blue-700';
  if (s === 'SELECTED') return 'bg-emerald-100 text-emerald-700';
  if (s === 'REJECTED') return 'bg-red-100 text-red-700';
  if (s === 'WITHDRAWN') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-500';
};

interface BidsPanelProps {
  jobId: string;
  jobRef: string;
  quotes: QuoteRow[];
  loading: boolean;
  error: string;
  actionLoading: string | null;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  onClose: () => void;
}

const BidsPanel: React.FC<BidsPanelProps> = ({
  jobRef, quotes, loading, error, actionLoading, onApprove, onReject, onClose,
}) => {
  const activeQuotes = quotes.filter((q) => q.status.toUpperCase() === 'ACTIVE');
  const otherQuotes = quotes.filter((q) => q.status.toUpperCase() !== 'ACTIVE');

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Driver Bids</p>
            <h2 className="text-xl font-black text-[#041627]">{jobRef}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {!loading && !error && quotes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <span className="material-symbols-outlined text-2xl text-slate-400">inbox</span>
              </span>
              <p className="font-black text-[#44474C]">No bids yet</p>
              <p className="text-sm text-slate-400">Drivers haven't submitted any quotes for this job.</p>
            </div>
          )}

          {!loading && activeQuotes.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pending Review · {activeQuotes.length}
              </p>
              <div className="space-y-3">
                {activeQuotes.map((q) => (
                  <BidCard
                    key={q.quoteId}
                    quote={q}
                    actionLoading={actionLoading}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && otherQuotes.length > 0 && (
            <div className={activeQuotes.length > 0 ? 'mt-6' : ''}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Previous · {otherQuotes.length}
              </p>
              <div className="space-y-3">
                {otherQuotes.map((q) => (
                  <BidCard
                    key={q.quoteId}
                    quote={q}
                    actionLoading={actionLoading}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BidCardProps {
  quote: QuoteRow;
  actionLoading: string | null;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
}

const BidCard: React.FC<BidCardProps> = ({ quote, actionLoading, onApprove, onReject }) => {
  const isActive = quote.status.toUpperCase() === 'ACTIVE';
  const isWorking = actionLoading === quote.quoteId;
  const sup = quote.supplier;

  return (
    <div className={`rounded-2xl border p-4 transition ${isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/10 text-[#1066b1] font-black text-sm">
          {sup?.name ? sup.name.charAt(0).toUpperCase() : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-[#041627] truncate">{sup?.name ?? 'Unknown Driver'}</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${quoteBadge(quote.status)}`}>
              {quote.status}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
            {sup?.vehicleType && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                {sup.vehicleType}
              </span>
            )}
            {sup?.vehicleNumber && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                {sup.vehicleNumber}
              </span>
            )}
            {sup?.avgRating != null && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-400">star</span>
                {Number(sup.avgRating).toFixed(1)}
              </span>
            )}
            {sup?.completedJobs != null && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                {sup.completedJobs} jobs
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xl font-black text-[#1066b1]">
              {quote.currency === 'INR' ? '₹' : quote.currency} {Number(quote.quoteAmount).toLocaleString('en-IN')}
            </p>
            {quote.createdAt && (
              <p className="text-[10px] text-slate-400">
                {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => onApprove(quote.quoteId)}
            disabled={!!actionLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            )}
            Approve
          </button>
          <button
            onClick={() => onReject(quote.quoteId)}
            disabled={!!actionLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            )}
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────────── */

const HaulierJobsSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<JobStatus>('OPEN');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, per_page: PAGE_SIZE, status: activeStatus }), [page, activeStatus]);
  const { data, loading, error, refresh } = useHaulierJobs(params);

  const jobs = (data?.jobs as HaulierJobRow[] | undefined) ?? [];
  const activeSection = SECTIONS.find((s) => s.key === activeStatus) ?? SECTIONS[0];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  /* Handover status map: jobId → HandoverState */
  const [handoverMap, setHandoverMap] = useState<Record<string, HandoverState>>({});

  /* Bids panel state */
  const [bidsJobId, setBidsJobId] = useState<string | null>(null);
  const [bidsJobRef, setBidsJobRef] = useState('');
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);

  /* Signature modal state */
  const [signingJobId, setSigningJobId] = useState<string | null>(null);
  const [signingJobRef, setSigningJobRef] = useState('');
  const [sigLoading, setSigLoading] = useState(false);
  const [sigError, setSigError] = useState('');

  /* Fetch handover status for every in-transit job */
  const fetchHandoverStatuses = useCallback(async (jobList: HaulierJobRow[]) => {
    if (activeStatus !== 'IN_TRANSIT') return;
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
  }, [activeStatus]);

  useEffect(() => {
    if (jobs.length) void fetchHandoverStatuses(jobs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeStatus]);

  /* Load bids for a job */
  const openBidsPanel = useCallback(async (jobId: string, jobRef: string) => {
    setBidsJobId(jobId);
    setBidsJobRef(jobRef);
    setQuotes([]);
    setQuotesError('');
    setQuotesLoading(true);
    try {
      const res = await haulierService.listQuotesForJob(jobId) as { items?: QuoteRow[]; total?: number } | QuoteRow[] | null;
      const items: QuoteRow[] = (Array.isArray(res) ? res : res?.items) ?? [];
      setQuotes(items);
    } catch {
      setQuotesError('Failed to load bids. Please try again.');
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  const closeBidsPanel = useCallback(() => {
    setBidsJobId(null);
    setBidsJobRef('');
    setQuotes([]);
    setQuotesError('');
  }, []);

  const handleApproveQuote = useCallback(async (quoteId: string) => {
    if (!bidsJobId) return;
    setQuoteActionLoading(quoteId);
    try {
      await haulierService.acceptQuote(bidsJobId, quoteId);
      closeBidsPanel();
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to approve bid.';
      setQuotesError(msg);
    } finally {
      setQuoteActionLoading(null);
    }
  }, [bidsJobId, closeBidsPanel, refresh]);

  const handleRejectQuote = useCallback(async (quoteId: string) => {
    if (!bidsJobId) return;
    setQuoteActionLoading(quoteId);
    try {
      await haulierService.rejectQuote(bidsJobId, quoteId);
      setQuotes((prev) => prev.map((q) => q.quoteId === quoteId ? { ...q, status: 'REJECTED' } : q));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to reject bid.';
      setQuotesError(msg);
    } finally {
      setQuoteActionLoading(null);
    }
  }, [bidsJobId]);

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
      {/* Bids panel */}
      {bidsJobId && (
        <BidsPanel
          jobId={bidsJobId}
          jobRef={bidsJobRef}
          quotes={quotes}
          loading={quotesLoading}
          error={quotesError}
          actionLoading={quoteActionLoading}
          onApprove={handleApproveQuote}
          onReject={handleRejectQuote}
          onClose={closeBidsPanel}
        />
      )}

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
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#1066b1]/50">My Jobs</p>
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
      {activeStatus === 'IN_TRANSIT' && pendingSignCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#1066b1]/40 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/15">
            <span className="material-symbols-outlined text-[#0d55a0]">draw</span>
          </span>
          <div className="flex-1">
            <p className="font-black text-[#062f5e]">
              {pendingSignCount === 1
                ? '1 job needs your handover signature'
                : `${pendingSignCount} jobs need your handover signature`}
            </p>
            <p className="text-sm text-[#0a4a8f]">
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
            onClick={() => { setActiveStatus(s.key); setPage(1); }}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              activeStatus === s.key
                ? 'border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'border-slate-200 bg-white text-[#44474C] hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
        {activeStatus === 'OPEN' && (
          <button
            onClick={() => navigate('/haulier/post-job')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1066b1]/100 px-4 py-3 text-sm font-black text-white transition hover:bg-[#1066b1]"
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
            <p className="text-sm text-slate-500">{String(data?.total ?? 0)} jobs found</p>
          </div>
          {activeStatus === 'OPEN' && (
            <button
              onClick={() => navigate('/haulier/post-job')}
              className="hidden rounded-2xl bg-[#1066b1]/100 px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1066b1] md:inline-flex"
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
                {activeStatus === 'OPEN' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Bids</th>
                )}
                {activeStatus === 'BOOKED' && (
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
                    className={`transition hover:bg-slate-50/70 ${needsMySign ? 'bg-[#1066b1]/10/40' : isPaymentSecured ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${needsMySign ? 'bg-[#1066b1]/15 text-[#0a4a8f]' : isPaymentSecured ? 'bg-emerald-100 text-emerald-700' : activeSection.tone}`}>
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

                    {/* Open: view bids column */}
                    {activeStatus === 'OPEN' && (
                      <td className="px-6 py-5">
                        <button
                          onClick={() => openBidsPanel(job.jobId, job.jobReference ?? job.jobRef ?? job.jobId)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#1066b1]/30 bg-[#1066b1]/8 px-3 py-2 text-xs font-black text-[#1066b1] transition hover:bg-[#1066b1] hover:text-white"
                        >
                          <span className="material-symbols-outlined text-[15px]">gavel</span>
                          View Bids
                        </button>
                      </td>
                    )}

                    {/* Booked: payment column */}
                    {activeStatus === 'BOOKED' && (
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
                              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1066b1] bg-[#1066b1]/10 px-3 py-2 text-xs font-black text-[#083d7a] shadow-sm transition hover:bg-[#1066b1] hover:text-white"
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
                  <td colSpan={activeStatus === 'OPEN' || activeStatus === 'BOOKED' || activeStatus === 'IN_TRANSIT' ? 7 : 6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-2xl text-slate-400">search_off</span>
                      </div>
                      <p className="font-black text-[#44474C]">No {activeSection.label.toLowerCase()} jobs found</p>
                      <p className="text-sm text-slate-400">
                        {activeStatus === 'OPEN' ? 'Post a new job to start receiving quotes.' : 'Try another tab to see jobs with a different status.'}
                      </p>
                      {activeStatus === 'OPEN' && (
                        <button onClick={() => navigate('/haulier/post-job')} className="mt-1 rounded-2xl bg-[#1066b1]/100 px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1066b1]">
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
