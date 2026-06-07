import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaulierJobs } from '../../../hooks/useHaulier';
import haulierService from '../../../api/haulierService';
import { fmtMoney } from '../../../utils/currency';
import ConfirmModal from '../../../components/ConfirmModal';

type JobStatus = 'OPEN' | 'BOOKED' | 'IN_TRANSIT' | 'COMPLETED' | 'EXPIRED';

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
    driverAvailability?: string | null;
    truckCapacity?: string | null;
    equipmentDetails?: Array<{ id?: number; capacityLitres?: string | number }> | null;
  } | null;
  quoteAmount: number;
  driverAmount?: number;
  platformFee?: number;
  totalAmount?: number;
  currency: string;
  status: string;
  createdAt?: string;
  deliverBy?: string | null;
  stopEtas?: Array<{ order: number; eta: string }> | null;
  job?: {
    pickupLocation?: string;
    dropLocation?: string;
    jobDate?: string;
    goodsType?: string;
    weightKg?: number | null;
    vehicleType?: string;
    timeSlot?: string;
    distanceKm?: number | null;
  } | null;
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
  agreedAmount?: number;
  currency?: string;
  quoteCount?: number;
};

type HandoverState = {
  driverSigned: boolean;
  haulierSigned: boolean;
  driverSignedAt?: string | null;
  haulierSignedAt?: string | null;
};

type JobDetail = {
  jobId: string;
  jobReference?: string;
  jobRef?: string;
  status: string;
  pickupLocation?: string;
  pickupAddress?: string;
  dropLocation?: string;
  dropAddress?: string;
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number | null;
  distanceKm?: number | null;
  timeSlot?: string;
  jobDate?: string;
  loadCode?: string;
  accessCode?: string;
  agreedAmount?: number | null;
  currency?: string;
  createdAt?: string;
  specialInstructions?: string;
  compartmentCount?: number | null;
  totalCapacity?: string;
  totalLitres?: number | null;
  compartmentDetails?: Array<{
    compartment?: number | null;
    contents?: string | null;
    quantity?: number | null;
    unit?: string | null;
    stopLabel?: string | null;
  }> | null;
  driverRequirement?: string;
  stops?: Array<{
    order?: number;
    address?: string;
    litres?: number | null;
    compartment?: number | null;
    isFinalDestination?: boolean;
  }>;
  driver?: {
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  } | null;
};

type SectionMeta = {
  key: JobStatus;
  label: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
};

const SECTIONS: SectionMeta[] = [
  {
    key: 'OPEN',
    label: 'Open',
    title: 'Open Jobs',
    description: 'Jobs waiting to be reviewed, quoted, or booked.',
    icon: 'inventory_2',
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    key: 'BOOKED',
    label: 'Booked',
    title: 'Booked Jobs',
    description: 'Jobs that have been reserved and are moving through the workflow.',
    icon: 'event_available',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    title: 'Active Trip',
    description: 'Jobs currently moving with active handover or live tracking.',
    icon: 'local_shipping',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    title: 'Completed Jobs',
    description: 'Jobs that have been delivered and closed out.',
    icon: 'check_circle',
    tone: 'bg-[#1066b1]/10 text-[#0a4a8f] border-[#1066b1]/15',
  },
  {
    key: 'EXPIRED',
    label: 'Expired',
    title: 'Expired Jobs',
    description: 'Open jobs whose date has passed without a driver being booked.',
    icon: 'schedule_send',
    tone: 'bg-orange-50 text-orange-600 border-orange-100',
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

const statusLabel = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'DELIVERY_SUBMITTED') return 'Awaiting Approval';
  return status.replace(/_/g, ' ');
};

const statusBadge = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (normalized === 'BOOKED') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'IN_TRANSIT') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'DELIVERY_SUBMITTED') return 'bg-amber-100 text-amber-700 border border-amber-200';
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
  savedEsig?: string | null;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ jobReference, onSave, onCancel, loading, error, savedEsig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [useSaved, setUseSaved] = useState(!!savedEsig);

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

  const handleConfirm = () => {
    if (useSaved && savedEsig) {
      onSave(savedEsig);
    } else if (canvasRef.current && hasStrokes) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const canConfirm = useSaved ? !!savedEsig : hasStrokes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
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

        {/* Tab toggle — only shown when a saved e-sig exists */}
        {savedEsig && (
          <div className="mt-4 flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            <button
              onClick={() => setUseSaved(true)}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition ${useSaved ? 'bg-white shadow text-[#1066b1]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Use Saved E-Signature
            </button>
            <button
              onClick={() => setUseSaved(false)}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition ${!useSaved ? 'bg-white shadow text-[#1066b1]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Draw New Signature
            </button>
          </div>
        )}

        {/* Saved e-signature preview */}
        {useSaved && savedEsig ? (
          <div className="mt-4">
            <div className="overflow-hidden rounded-2xl border-2 border-[#1066b1]/30 bg-slate-50">
              <img src={savedEsig} alt="Saved e-signature" className="h-40 w-full object-contain" />
            </div>
            <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-[#1066b1]">
              Saved E-Signature · From Profile
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {!savedEsig && (
              <p className="mb-3 text-sm font-medium text-[#44474C]">
                Draw your signature below to confirm dispatch officer vehicle release.
              </p>
            )}
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
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
        )}

        <div className="mt-5 flex gap-3">
          {!useSaved && (
            <button
              onClick={clear}
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-40"
            >
              Clear
            </button>
          )}
          {useSaved && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={loading || !canConfirm}
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
  jobId, jobRef, quotes, loading, error, actionLoading, onApprove, onReject, onClose,
}) => {
  const activeQuotes = quotes.filter((q) => q.status.toUpperCase() === 'ACTIVE');
  const otherQuotes = quotes.filter((q) => q.status.toUpperCase() !== 'ACTIVE');

  const [detail, setDetail] = React.useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(true);

  React.useEffect(() => {
    setDetailLoading(true);
    haulierService.getJobDetails(jobId)
      .then((d) => {
        console.log('[BidsPanel] compartmentDetails:', (d as JobDetail).compartmentDetails);
        setDetail(d as JobDetail);
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [jobId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Job & Bids</p>
            <h2 className="text-xl font-black text-[#041627]">{jobRef}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Job Details ── */}
          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!detailLoading && detail && (
            <>
              {/* Route card */}
              <div className="rounded-2xl bg-[#041627] p-5 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1066b1]" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Pickup</p>
                      <p className="text-sm font-bold text-white">{detail.pickupLocation ?? detail.pickupAddress ?? '—'}</p>
                    </div>
                  </div>
                  {detail.stops && detail.stops.filter(s => !s.isFinalDestination).map((stop, i) => (
                    <React.Fragment key={i}>
                      <div className="ml-[5px] h-4 w-px bg-white/20" />
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-[6px] font-black text-white/70">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Stop {i + 1}</p>
                          <p className="text-sm font-bold text-white truncate">{stop.address ?? '—'}</p>
                          {(stop.litres != null || stop.compartment != null) && (
                            <div className="mt-0.5 flex gap-3 text-[10px] text-white/40">
                              {stop.litres != null && <span>{stop.litres} L</span>}
                              {stop.compartment != null && <span>Comp. {stop.compartment}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="ml-[5px] h-4 w-px bg-white/20" />
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Drop-off</p>
                      <p className="text-sm font-bold text-white">{detail.dropLocation ?? detail.dropAddress ?? '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/8 p-3">
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Date</p>
                    <p className="text-[11px] font-black text-white">
                      {detail.jobDate ? new Date(detail.jobDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Cargo</p>
                    <p className="text-[11px] font-black text-white">{detail.goodsType ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Distance</p>
                    <p className="text-[11px] font-black text-white">{detail.distanceKm != null ? `${detail.distanceKm} km` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Job info grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Info</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {detail.timeSlot && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Slot</p>
                      <p className="font-bold text-[#041627]">{detail.timeSlot}</p>
                    </div>
                  )}
                  {detail.weightKg != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Weight</p>
                      <p className="font-bold text-[#041627]">{detail.weightKg} kg</p>
                    </div>
                  )}
                  {detail.totalCapacity && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Capacity</p>
                      <p className="font-bold text-[#041627]">{detail.totalCapacity}</p>
                    </div>
                  )}
                  {detail.totalLitres != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Litres</p>
                      <p className="font-bold text-[#041627]">{detail.totalLitres} L</p>
                    </div>
                  )}
                  {detail.compartmentCount != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compartments</p>
                      <p className="font-bold text-[#041627]">{detail.compartmentCount}</p>
                    </div>
                  )}
                  {detail.driverRequirement && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Requirement</p>
                      <p className="font-bold text-[#041627]">{detail.driverRequirement}</p>
                    </div>
                  )}
                </div>
                {detail.specialInstructions && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Special Instructions</p>
                    <p className="text-sm text-[#44474C]">{detail.specialInstructions}</p>
                  </div>
                )}
              </div>


              {/* Compartment Breakdown */}
              {detail.compartmentDetails && detail.compartmentDetails.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compartment Breakdown</p>
                  <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    <div className="hidden sm:grid sm:grid-cols-[32px_1fr_72px_48px_1fr] gap-3 px-3 py-2 bg-slate-50">
                      {['#', 'Contents', 'Qty', 'Unit', 'Destination'].map(h => (
                        <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {detail.compartmentDetails.map((c, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[32px_1fr_72px_48px_1fr] gap-2 sm:gap-3 px-3 py-2.5 bg-white items-center">
                        <div className="w-6 h-6 rounded-md bg-[#1066b1]/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-[#1066b1]">{c.compartment ?? i + 1}</span>
                        </div>
                        <p className="text-sm font-bold text-[#041627]">{c.contents || '—'}</p>
                        <p className="text-sm font-black text-[#1066b1]">{c.quantity ?? '—'}</p>
                        <p className="text-xs text-slate-500 font-bold">{c.unit || '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{c.stopLabel || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Codes */}
              {false && (detail.loadCode || detail.accessCode) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Codes</p>
                  {detail.loadCode && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Load Code</p>
                        <p className="font-mono text-base font-black text-[#041627]">{detail.loadCode}</p>
                      </div>
                      <button onClick={() => { void navigator.clipboard.writeText(detail.loadCode ?? ''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                  {detail.accessCode && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Access Code</p>
                        <p className="font-mono text-base font-black text-[#041627]">{detail.accessCode}</p>
                      </div>
                      <button onClick={() => { void navigator.clipboard.writeText(detail.accessCode ?? ''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver Bids</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* ── Bids ── */}
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {!loading && !error && quotes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
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
                  <BidCard key={q.quoteId} quote={q} actionLoading={actionLoading} onApprove={onApprove} onReject={onReject} driverRequirement={detail?.driverRequirement} />
                ))}
              </div>
            </div>
          )}

          {!loading && otherQuotes.length > 0 && (
            <div className={activeQuotes.length > 0 ? 'mt-4' : ''}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Previous · {otherQuotes.length}
              </p>
              <div className="space-y-3">
                {otherQuotes.map((q) => (
                  <BidCard key={q.quoteId} quote={q} actionLoading={actionLoading} onApprove={onApprove} onReject={onReject} driverRequirement={detail?.driverRequirement} />
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
  driverRequirement?: string;
}

const BidCard: React.FC<BidCardProps> = ({ quote, actionLoading, onApprove, onReject, driverRequirement }) => {
  const isActive = quote.status.toUpperCase() === 'ACTIVE';
  const isWorking = actionLoading === quote.quoteId;
  const sup = quote.supplier;
  const isDriverOnly = (driverRequirement ?? '').toUpperCase() === 'DRIVER_ONLY';

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
            {!isDriverOnly && sup?.vehicleType && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                {sup.vehicleType}
              </span>
            )}
            {!isDriverOnly && sup?.vehicleNumber && (
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

          {/* Truck info — hidden when job requires driver only */}
          {!isDriverOnly && (sup?.driverAvailability === 'TRUCK_ONLY' || sup?.driverAvailability === 'DRIVER_WITH_TRUCK') && (
            <div className="mt-2 rounded-xl border border-[#1066b1]/20 bg-[#1066b1]/5 px-3 py-2 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#1066b1]">
                {sup.driverAvailability === 'TRUCK_ONLY' ? 'Truck Only' : 'Driver with Truck'}
              </p>

              {/* Stats: Capacity + Compartment count */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white border border-[#1066b1]/15 px-2.5 py-1.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#1066b1]/70 mb-0.5">Capacity</p>
                  <p className="text-xs font-black text-[#041627]">{sup.truckCapacity ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-white border border-[#1066b1]/15 px-2.5 py-1.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#1066b1]/70 mb-0.5">Compartments</p>
                  <p className="text-xs font-black text-[#041627]">
                    {sup.equipmentDetails && sup.equipmentDetails.length > 0 ? sup.equipmentDetails.length : '—'}
                  </p>
                </div>
              </div>

              {/* Individual compartment chips */}
              {sup.equipmentDetails && sup.equipmentDetails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sup.equipmentDetails.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#1066b1]/20 px-2 py-0.5 text-[10px] font-bold text-[#041627]">
                      <span className="text-[#1066b1] font-black">C{i + 1}</span>
                      {c.capacityLitres ? `${c.capacityLitres} L` : '—'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deliver By & Stop ETAs — always visible */}
          <div className="mt-3 rounded-xl border border-[#1066b1]/15 bg-[#1066b1]/5 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#1066b1]">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                Deliver By
              </span>
              <span className="text-xs font-black text-[#041627]">
                {quote.deliverBy
                  ? new Date(quote.deliverBy).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                  : '—'}
              </span>
            </div>
            {quote.stopEtas && quote.stopEtas.length > 0 && (
              <div className="border-t border-[#1066b1]/15 pt-2 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#1066b1] mb-1">Stop ETAs</p>
                {quote.stopEtas.map((s) => (
                  <div key={s.order} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Stop {s.order}</span>
                    <span className="font-black text-[#041627]">{s.eta}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-[#1066b1]/15 bg-[#1066b1]/5 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
                Driver Bid
              </span>
              <span className="font-bold">{fmtMoney(Number(quote.driverAmount ?? quote.quoteAmount), quote.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">percent</span>
                Platform Fee (12.5%)
              </span>
              <span className="font-semibold">{fmtMoney(Number(quote.platformFee ?? (quote.quoteAmount * 0.125)), quote.currency)}</span>
            </div>
            <div className="border-t border-[#1066b1]/20 pt-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-[#041627] uppercase tracking-wide">Total</span>
              <span className="text-lg font-black text-[#1066b1]">{fmtMoney(Number(quote.totalAmount ?? (quote.quoteAmount * 1.125)), quote.currency)}</span>
            </div>
          </div>
          {quote.createdAt && (
            <p className="mt-1.5 text-right text-[10px] text-slate-400">
              {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
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
              <span className="material-symbols-outlined text-[16px]">payments</span>
            )}
            Approve & Pay
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

/* ── Driver Rating Modal ────────────────────────────────────────────────────── */

interface DriverRatingModalProps {
  jobId: string;
  driverId: string;
  driverName: string;
  onClose: () => void;
}

const DriverRatingModal: React.FC<DriverRatingModalProps> = ({ jobId, driverId, driverName, onClose }) => {
  const [stars, setStars] = React.useState(0);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const isLowRating = stars > 0 && stars <= 2;
  const reasonMissing = isLowRating && reason.trim().length === 0;
  const canSubmit = stars > 0 && !reasonMissing;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await haulierService.submitRating({ jobId, ratedUserId: driverId, starRating: stars, review: reason.trim() || undefined });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit rating.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Rate Your Driver</p>
            <h2 className="text-lg font-black text-[#041627]">{driverName}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
            <p className="text-base font-black text-[#041627]">Rating submitted!</p>
            <p className="text-sm text-slate-500">Thank you for your feedback.</p>
            <button onClick={onClose} className="mt-2 w-full rounded-xl bg-[#1066b1] py-3 text-sm font-black text-white hover:bg-[#0d55a0]">Close</button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Stars */}
            <div>
              <p className="text-sm font-black text-[#041627] mb-2">Overall Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setStars(s)} className="text-3xl transition-transform hover:scale-110">
                    <span className={s <= stars ? 'text-amber-400' : 'text-slate-200'}>★</span>
                  </button>
                ))}
                {stars > 0 && (
                  <span className="ml-2 self-center text-sm font-bold text-slate-500">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][stars]}
                  </span>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className={`rounded-xl border p-3 transition-colors ${isLowRating ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-black text-[#041627]">
                  {isLowRating ? 'Reason' : 'Comment'}
                  {isLowRating && <span className="text-red-500"> *</span>}
                </p>
                {isLowRating && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-600">Required</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-2">
                {isLowRating
                  ? 'Please explain what went wrong so we can improve.'
                  : 'Optional — share any additional feedback about this driver.'}
              </p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder={isLowRating ? 'e.g. Late arrival, poor communication, goods damaged...' : 'Great driver, punctual and professional...'}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20"
              />
              {reasonMissing && (
                <p className="mt-1 text-xs font-semibold text-red-600">A reason is required for ratings of 1–2 stars.</p>
              )}
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">Skip</button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex-1 rounded-xl bg-[#1066b1] py-3 text-sm font-black text-white hover:bg-[#0d55a0] disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Stroke Signature Renderer ─────────────────────────────────────────────── */

type StrokePoint = { x: number; y: number };

const StrokeSignature: React.FC<{ data: string; className?: string }> = ({ data, className }) => {
  let strokes: StrokePoint[][] = [];
  let isUrl = false;
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) strokes = parsed as StrokePoint[][];
    else isUrl = true;
  } catch {
    isUrl = true;
  }

  if (isUrl) {
    return <img src={data} alt="Recipient signature" className={`object-contain ${className ?? ''}`} />;
  }

  const W = 300;
  const H = 120;
  const paths = strokes.map((stroke) =>
    stroke.length < 2
      ? ''
      : stroke.reduce((acc, pt, i) => acc + (i === 0 ? `M${pt.x},${pt.y}` : ` L${pt.x},${pt.y}`), '')
  ).filter(Boolean);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className ?? 'w-full h-24'}
      style={{ background: 'transparent' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="#1C2E45" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
};

/* ── Delivery Review Panel ──────────────────────────────────────────────────── */

type DeliveryDetails = {
  jobId: string;
  jobRef?: string;
  pickupLocation?: string;
  dropLocation?: string;
  deliverySubmitted: boolean;
  deliverySubmittedAt?: string;
  deliveryPhotos?: string[];
  deliveryNotes?: string;
  recipientName?: string;
  recipientSignatureUrl?: string;
  step3Approved: boolean;
  disputed: boolean;
  driver?: {
    userId?: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  } | null;
  payment?: {
    amount?: number;
    currency?: string;
    status?: string;
    escrowedAt?: string;
  } | null;
};

interface DeliveryReviewPanelProps {
  jobId: string;
  jobRef: string;
  onApprove: () => Promise<void>;
  onDispute: (reason: string) => Promise<void>;
  onClose: () => void;
  onApproveSuccess?: (driverId: string, driverName: string) => void;
}

const DeliveryReviewPanel: React.FC<DeliveryReviewPanelProps> = ({
  jobId, jobRef, onApprove, onDispute, onClose, onApproveSuccess,
}) => {
  const [details, setDetails] = React.useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [approving, setApproving] = React.useState(false);
  const [disputing, setDisputing] = React.useState(false);
  const [disputeReason, setDisputeReason] = React.useState('');
  const [showDisputeForm, setShowDisputeForm] = React.useState(false);
  const [actionDone, setActionDone] = React.useState<'approved' | 'disputed' | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    haulierService.getDeliveryDetails(jobId)
      .then((d) => setDetails(d as DeliveryDetails))
      .catch(() => setError('Failed to load delivery details.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleApprove = () => {
    setShowReleaseConfirm(true);
  };

  const executeApprove = async () => {
    setApproving(true);
    setError('');
    try {
      await onApprove();
      setShowReleaseConfirm(false);
      setActionDone('approved');
      if (onApproveSuccess && details?.driver?.userId) {
        onApproveSuccess(details.driver.userId, details.driver.name ?? 'the driver');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to approve delivery.';
      setError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) { setError('Please enter a reason for the dispute.'); return; }
    setDisputing(true);
    setError('');
    try {
      await onDispute(disputeReason.trim());
      setActionDone('disputed');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to raise dispute.';
      setError(msg);
    } finally {
      setDisputing(false);
    }
  };

  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <>
      {/* ── Release Payment Confirmation Modal ── */}
      <ConfirmModal
        open={showReleaseConfirm}
        title="Approve Delivery &amp; Release Payment"
        message={`You are about to approve delivery for job ${jobRef} and release the escrowed funds to the driver.`}
        details={[
          { label: 'Job Ref', value: jobRef },
          { label: 'Driver', value: details?.driver?.name ?? '—' },
          { label: 'Action', value: 'Approve delivery + release payment' },
        ]}
        confirmLabel="Yes, Release Payment"
        cancelLabel="Cancel"
        icon="payments"
        loading={approving}
        onConfirm={() => void executeApprove()}
        onCancel={() => { if (!approving) setShowReleaseConfirm(false); }}
      />

    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Delivery Review</p>
            <h2 className="text-xl font-black text-[#041627]">{jobRef}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && !actionDone && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {/* Success state — approved */}
          {actionDone === 'approved' && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1066b1]/10">
                <span className="material-symbols-outlined text-4xl text-[#1066b1]">verified</span>
              </div>
              <p className="text-xl font-black text-[#041627]">Delivery Approved</p>
              <p className="text-sm text-slate-500">
                Payment has been released and transferred to the driver's account.
              </p>
              <button onClick={onClose} className="mt-4 rounded-2xl bg-[#1066b1] px-8 py-3 text-sm font-black text-white">
                Close
              </button>
            </div>
          )}

          {/* Success state — disputed */}
          {actionDone === 'disputed' && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <span className="material-symbols-outlined text-4xl text-amber-500">report</span>
              </div>
              <p className="text-xl font-black text-[#041627]">Dispute Raised</p>
              <p className="text-sm text-slate-500">
                The admin team has been notified. Payment remains on hold pending review.
              </p>
              <button onClick={onClose} className="mt-4 rounded-2xl bg-slate-900 px-8 py-3 text-sm font-black text-white">
                Close
              </button>
            </div>
          )}

          {!loading && details && !actionDone && (
            <>
              {/* Payment on hold card */}
              {details.payment && (
                <div className="rounded-2xl bg-[#041627] p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Payment On Hold</p>
                  <p className="text-3xl font-black text-white">
                    {fmtMoney(Number(details.payment.amount ?? 0), details.payment.currency)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-black text-amber-300">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      SECURED
                    </span>
                    {details.payment.escrowedAt && (
                      <span className="text-[10px] text-white/40">since {fmt(details.payment.escrowedAt)}</span>
                    )}
                  </div>
                  <div className="mt-3 h-px bg-white/10" />
                  <div className="mt-3 flex gap-4 text-[11px] text-white/50">
                    {details.pickupLocation && <span>From: <span className="text-white/80 font-semibold">{details.pickupLocation}</span></span>}
                    {details.dropLocation && <span>To: <span className="text-white/80 font-semibold">{details.dropLocation}</span></span>}
                  </div>
                </div>
              )}

              {/* Driver info */}
              {details.driver && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Driver</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/10 text-[#1066b1] font-black text-sm">
                      {details.driver.name ? details.driver.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-black text-[#041627]">{details.driver.name ?? 'Unknown'}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {details.driver.vehicleType && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                            {details.driver.vehicleType}
                          </span>
                        )}
                        {details.driver.vehicleNumber && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                            {details.driver.vehicleNumber}
                          </span>
                        )}
                        {details.driver.phone && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">phone</span>
                            {details.driver.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery info */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Submitted</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <span className="text-sm font-bold text-[#041627]">{fmt(details.deliverySubmittedAt)}</span>
                </div>

                {/* Recipient name */}
                {details.recipientName && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Received By</p>
                    <p className="text-sm font-bold text-[#041627]">{details.recipientName}</p>
                  </div>
                )}

                {details.deliveryNotes && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Driver Notes</p>
                    <p className="text-sm text-[#44474C]">{details.deliveryNotes}</p>
                  </div>
                )}

                {/* Delivery photos */}
                {details.deliveryPhotos && details.deliveryPhotos.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Delivery Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {details.deliveryPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-slate-200">
                          <img
                            src={url}
                            alt={`Delivery photo ${i + 1}`}
                            className="h-32 w-full object-cover transition group-hover:opacity-80"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="material-symbols-outlined text-white drop-shadow text-2xl">open_in_new</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                    <span className="material-symbols-outlined text-base">image_not_supported</span>
                    No delivery photos uploaded
                  </div>
                )}

                {/* Recipient signature */}
                {details.recipientSignatureUrl && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recipient Signature</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <StrokeSignature data={details.recipientSignatureUrl} className="w-full h-24" />
                    </div>
                  </div>
                )}
              </div>

              {/* Dispute form — hidden */}
              {false && showDisputeForm && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm font-black text-amber-800">Reason for Dispute</p>
                  <textarea
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none resize-none focus:border-amber-400"
                    rows={3}
                    placeholder="Describe the issue with this delivery…"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  />
                  {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setError(''); }}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDispute}
                      disabled={disputing}
                      className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {disputing ? 'Submitting…' : 'Submit Dispute'}
                    </button>
                  </div>
                </div>
              )}

              {error && !showDisputeForm && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && details && !actionDone && !showDisputeForm && (
          <div className="shrink-0 border-t border-slate-100 px-6 py-5 space-y-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1066b1] py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0d55a0] disabled:opacity-50"
            >
              {approving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="material-symbols-outlined text-base">payments</span>
              )}
              {approving ? 'Processing…' : 'Approve & Release Payment'}
            </button>
            {/* Raise a Dispute — hidden
            <button
              onClick={() => { setShowDisputeForm(true); setError(''); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
            >
              <span className="material-symbols-outlined text-base">report</span>
              Raise a Dispute
            </button>
            */}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

/* ── Job Detail Panel ───────────────────────────────────────────────────────── */

interface JobDetailPanelProps {
  jobId: string;
  jobRef: string;
  onClose: () => void;
}

type HandoverDetail = {
  checklistSubmitted?: boolean;
  checklistData?: Record<string, boolean> | null;
  driverSigned?: boolean;
  driverSignedAt?: string | null;
  driverSignatureUrl?: string | null;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
  conditionPhotos?: string[];
};

const CHECKLIST_LABELS: Record<string, string> = {
  lightsSignals: 'Lights & Signals',
  tirePressure:  'Tyre Pressure',
  fluidLevels:   'Fluid Levels',
  bodyDamage:    'Body Damage OK',
};

const JobDetailPanel: React.FC<JobDetailPanelProps> = ({ jobId, jobRef, onClose }) => {
  const [detail, setDetail] = React.useState<JobDetail | null>(null);
  const [handover, setHandover] = React.useState<HandoverDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      haulierService.getJobDetails(jobId),
      haulierService.getHandoverStatus(jobId).catch(() => null),
    ])
      .then(([d, h]) => {
        console.log('[JobDetail] compartmentDetails:', (d as JobDetail).compartmentDetails);
        setDetail(d as JobDetail);
        setHandover(h as HandoverDetail | null);
      })
      .catch(() => setError('Failed to load job details.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const ref = detail?.jobReference ?? detail?.jobRef ?? jobRef;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Job Details</p>
            <h2 className="text-xl font-black text-[#041627]">{ref}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {!loading && detail && (
            <>
              {/* Route card */}
              <div className="rounded-2xl bg-[#041627] p-5 space-y-3">
                <div className="space-y-1.5">
                  {/* Pickup */}
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1066b1]" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Pickup</p>
                      <p className="text-sm font-bold text-white">{detail.pickupLocation ?? detail.pickupAddress ?? '—'}</p>
                    </div>
                  </div>

                  {/* Intermediate stops */}
                  {detail.stops && detail.stops.filter(s => !s.isFinalDestination).map((stop, i) => (
                    <React.Fragment key={i}>
                      <div className="ml-[5px] h-4 w-px bg-white/20" />
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-[6px] font-black text-white/70">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Stop {i + 1}</p>
                          <p className="text-sm font-bold text-white truncate">{stop.address ?? '—'}</p>
                          {(stop.litres != null || stop.compartment != null) && (
                            <div className="mt-0.5 flex gap-3 text-[10px] text-white/40">
                              {stop.litres != null && <span>{stop.litres} L</span>}
                              {stop.compartment != null && <span>Comp. {stop.compartment}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Drop-off */}
                  <div className="ml-[5px] h-4 w-px bg-white/20" />
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Drop-off</p>
                      <p className="text-sm font-bold text-white">{detail.dropLocation ?? detail.dropAddress ?? '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/8 p-3">
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Date</p>
                    <p className="text-[11px] font-black text-white">
                      {detail.jobDate ? new Date(detail.jobDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Cargo</p>
                    <p className="text-[11px] font-black text-white">{detail.goodsType ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Distance</p>
                    <p className="text-[11px] font-black text-white">{detail.distanceKm != null ? `${detail.distanceKm} km` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Status + amount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(detail.status)}`}>
                    {statusLabel(detail.status)}
                  </span>
                </div>
                {detail.agreedAmount != null && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Amount</p>
                    <p className="text-xl font-black text-[#1066b1]">{fmtMoney(Number(detail.agreedAmount), detail.currency)}</p>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Info</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {detail.timeSlot && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Slot</p>
                      <p className="font-bold text-[#041627]">{detail.timeSlot}</p>
                    </div>
                  )}
                  {detail.weightKg != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Weight</p>
                      <p className="font-bold text-[#041627]">{detail.weightKg} kg</p>
                    </div>
                  )}
                  {detail.totalCapacity && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Capacity</p>
                      <p className="font-bold text-[#041627]">{detail.totalCapacity}</p>
                    </div>
                  )}
                  {detail.totalLitres != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Litres</p>
                      <p className="font-bold text-[#041627]">{detail.totalLitres} L</p>
                    </div>
                  )}
                  {detail.compartmentCount != null && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compartments</p>
                      <p className="font-bold text-[#041627]">{detail.compartmentCount}</p>
                    </div>
                  )}
                  {detail.driverRequirement && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Requirement</p>
                      <p className="font-bold text-[#041627]">{detail.driverRequirement}</p>
                    </div>
                  )}
                  {detail.createdAt && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Posted</p>
                      <p className="font-bold text-[#041627]">{formatDate(detail.createdAt)}</p>
                    </div>
                  )}
                </div>
                {detail.specialInstructions && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Special Instructions</p>
                    <p className="text-sm text-[#44474C]">{detail.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* Compartment Breakdown */}
              {detail.compartmentDetails && detail.compartmentDetails.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compartment Breakdown</p>
                  <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    <div className="hidden sm:grid sm:grid-cols-[32px_1fr_72px_48px_1fr] gap-3 px-3 py-2 bg-slate-50">
                      {['#', 'Contents', 'Qty', 'Unit', 'Destination'].map(h => (
                        <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {detail.compartmentDetails.map((c, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[32px_1fr_72px_48px_1fr] gap-2 sm:gap-3 px-3 py-2.5 bg-white items-center">
                        <div className="w-6 h-6 rounded-md bg-[#1066b1]/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-[#1066b1]">{c.compartment ?? i + 1}</span>
                        </div>
                        <p className="text-sm font-bold text-[#041627]">{c.contents || '—'}</p>
                        <p className="text-sm font-black text-[#1066b1]">{c.quantity ?? '—'}</p>
                        <p className="text-xs text-slate-500 font-bold">{c.unit || '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{c.stopLabel || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Codes */}
              {false && (detail.loadCode || detail.accessCode) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Codes</p>
                  {detail.loadCode && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Load Code</p>
                        <p className="font-mono text-base font-black text-[#041627]">{detail.loadCode}</p>
                      </div>
                      <button onClick={() => { void navigator.clipboard.writeText(detail.loadCode ?? ''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                  {detail.accessCode && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Access Code</p>
                        <p className="font-mono text-base font-black text-[#041627]">{detail.accessCode}</p>
                      </div>
                      <button onClick={() => { void navigator.clipboard.writeText(detail.accessCode ?? ''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned driver */}
              {detail.driver && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assigned Driver</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/10 text-[#1066b1] font-black text-sm">
                      {detail.driver.name ? detail.driver.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-black text-[#041627]">{detail.driver.name ?? 'Unknown'}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {detail.driver.vehicleType && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                            {detail.driver.vehicleType}
                          </span>
                        )}
                        {detail.driver.vehicleNumber && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                            {detail.driver.vehicleNumber}
                          </span>
                        )}
                        {detail.driver.phone && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">phone</span>
                            {detail.driver.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Handover record */}
              {handover && (handover.checklistSubmitted || handover.driverSigned || (handover.conditionPhotos && handover.conditionPhotos.length > 0)) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1066b1]">fact_check</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Handover Record</p>
                  </div>

                  {/* Signature status */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl px-3 py-2.5 text-center ${handover.driverSigned ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Driver Signed</p>
                      {handover.driverSigned ? (
                        <>
                          <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                          {handover.driverSignedAt && (
                            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              {new Date(handover.driverSignedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-base">pending</span>
                      )}
                    </div>
                    <div className={`rounded-xl px-3 py-2.5 text-center ${handover.haulierSigned ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Haulier Signed</p>
                      {handover.haulierSigned ? (
                        <>
                          <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                          {handover.haulierSignedAt && (
                            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              {new Date(handover.haulierSignedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-base">pending</span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle checklist */}
                  {handover.checklistData && Object.keys(handover.checklistData).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vehicle Checklist</p>
                      <div className="space-y-1.5">
                        {Object.entries(handover.checklistData).map(([key, passed]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <span className="text-sm font-semibold text-[#44474C]">
                              {CHECKLIST_LABELS[key] ?? key}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
                              <span className="material-symbols-outlined text-[14px]">{passed ? 'check_circle' : 'cancel'}</span>
                              {passed ? 'OK' : 'Issue'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Driver signature image */}
                  {handover.driverSignatureUrl && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Driver Signature</p>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img
                          src={handover.driverSignatureUrl}
                          alt="Driver signature"
                          className="h-24 w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Condition photos */}
                  {handover.conditionPhotos && handover.conditionPhotos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Vehicle Condition Photos · {handover.conditionPhotos.length}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {handover.conditionPhotos.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative block overflow-hidden rounded-xl border border-slate-200"
                          >
                            <img
                              src={url}
                              alt={`Condition photo ${i + 1}`}
                              className="h-32 w-full object-cover transition group-hover:opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <span className="material-symbols-outlined text-white drop-shadow text-2xl">open_in_new</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────────── */

interface HaulierJobsSectionProps {
  status?: JobStatus;
  allowPostJob?: boolean;
}

const HaulierJobsSection: React.FC<HaulierJobsSectionProps> = ({ status: initialStatus }) => {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<JobStatus>(initialStatus ?? 'OPEN');
  const [page, setPage] = useState(1);
  const today = useMemo(() => new Date(new Date().toDateString()), []);
  const isJobExpired = (j: HaulierJobRow) =>
    j.status?.toUpperCase() === 'OPEN' && !!j.jobDate && new Date(j.jobDate + 'T00:00:00') < today;

  const apiStatus = activeStatus === 'EXPIRED' ? 'OPEN' : activeStatus;
  const params = useMemo(() => ({ page, per_page: PAGE_SIZE, status: apiStatus }), [page, apiStatus]);
  const { data, loading, error, refresh } = useHaulierJobs(params);

  const rawJobs = (data?.jobs as HaulierJobRow[] | undefined) ?? [];
  const jobs = useMemo(() => {
    if (activeStatus === 'EXPIRED') return rawJobs.filter(isJobExpired);
    if (activeStatus === 'OPEN') return rawJobs.filter((j) => !isJobExpired(j));
    return rawJobs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawJobs, activeStatus, today]);
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

  /* Delivery review panel state */
  const [deliveryReviewJobId, setDeliveryReviewJobId] = useState<string | null>(null);
  const [deliveryReviewJobRef, setDeliveryReviewJobRef] = useState('');

  /* Haulier saved e-signature (fetched once for the signing modal) */
  const [haulierEsig, setHaulierEsig] = useState<string | null>(null);
  useEffect(() => {
    haulierService.getMe().then((user: { profile?: { esignatureData?: string | null } | null }) => {
      const esig = user?.profile?.esignatureData;
      if (esig) setHaulierEsig(esig);
    }).catch(() => undefined);
  }, []);

  /* Driver rating modal state */
  const [driverRating, setDriverRating] = useState<{ jobId: string; driverId: string; driverName: string } | null>(null);

  /* Job detail panel state */
  const [viewJobId, setViewJobId] = useState<string | null>(null);
  const [viewJobRef, setViewJobRef] = useState('');

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
      navigate(`/haulier/payments/create?jobId=${bidsJobId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to approve bid.';
      setQuotesError(msg);
    } finally {
      setQuoteActionLoading(null);
    }
  }, [bidsJobId, closeBidsPanel, navigate]);

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

  const handleApproveDelivery = async (jobId: string) => {
    await haulierService.approveDelivery(jobId, { bookingId: jobId, approvalNote: 'Delivery approved via dashboard.' });
    refresh();
  };

  const handleDisputeDelivery = async (jobId: string, reason: string) => {
    await haulierService.disputeDelivery(jobId, { disputeReason: reason });
    refresh();
  };

  const openDeliveryReview = (jobId: string, jobRef: string) => {
    setDeliveryReviewJobId(jobId);
    setDeliveryReviewJobRef(jobRef);
  };

  const closeDeliveryReview = () => {
    setDeliveryReviewJobId(null);
    setDeliveryReviewJobRef('');
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
          savedEsig={haulierEsig}
        />
      )}

      {/* Delivery review panel */}
      {deliveryReviewJobId && (
        <DeliveryReviewPanel
          jobId={deliveryReviewJobId}
          jobRef={deliveryReviewJobRef}
          onApprove={() => handleApproveDelivery(deliveryReviewJobId)}
          onDispute={(reason) => handleDisputeDelivery(deliveryReviewJobId, reason)}
          onClose={closeDeliveryReview}
          onApproveSuccess={(driverId, driverName) => {
            closeDeliveryReview();
            setDriverRating({ jobId: deliveryReviewJobId, driverId, driverName });
          }}
        />
      )}

      {/* Driver rating modal */}
      {driverRating && (
        <DriverRatingModal
          jobId={driverRating.jobId}
          driverId={driverRating.driverId}
          driverName={driverRating.driverName}
          onClose={() => setDriverRating(null)}
        />
      )}

      {/* Job detail panel */}
      {viewJobId && (
        <JobDetailPanel
          jobId={viewJobId}
          jobRef={viewJobRef}
          onClose={() => { setViewJobId(null); setViewJobRef(''); }}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">My Jobs</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#041627]">{activeSection.title}</h1>
          <p className="text-sm font-medium text-slate-500">{activeSection.description}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-black text-[#041627]">{String(data?.total ?? jobs.length).padStart(2, '0')}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Page</p>
            <p className="mt-1 text-2xl font-black text-[#041627]">{page} / {totalPages}</p>
          </div>
        </div>
      </div>

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
                {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Schedule</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                {activeStatus === 'OPEN' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Bids</th>
                )}
                {activeStatus === 'BOOKED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Payment</th>
                )}
                {activeStatus === 'IN_TRANSIT' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
                )}
                {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">View</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const isPaymentSecured = job.status?.toUpperCase() === 'PAYMENT_SECURED';
                const needsPayment = !isPaymentSecured && ['BOOKED', 'PAYMENT_PENDING'].includes(job.status?.toUpperCase() ?? '');
                const isDelivered = job.status?.toUpperCase() === 'DELIVERY_SUBMITTED';
                const handover = handoverMap[job.jobId];
                const needsMySign = handover?.driverSigned && !handover?.haulierSigned;
                const bothSigned = handover?.driverSigned && handover?.haulierSigned;

                return (
                  <tr
                    key={job.jobId}
                    className={`transition hover:bg-slate-50/70 ${needsMySign || isDelivered ? 'bg-[#1066b1]/10/40' : isPaymentSecured ? 'bg-emerald-50/30' : ''}`}
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
                          {false && job.loadCode ? (
                            <button
                              onClick={() => { void navigator.clipboard.writeText(job.loadCode ?? ''); }}
                              className="flex items-center gap-1 mt-0.5 group"
                              title="Click to copy load code"
                            >
                              <span className="font-mono text-xs font-black text-primary">{job.loadCode}</span>
                              <span className="material-symbols-outlined text-[11px] text-slate-400 group-hover:text-primary">content_copy</span>
                            </button>
                          ) : (
                            false && <p className="text-xs text-slate-400">No load code</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[260px]">
                      <p className="text-sm font-bold text-[#041627] truncate">{job.pickupLocation ?? job.pickupAddress ?? 'N/A'}</p>
                      <p className="text-[10px] text-slate-300 my-1">▼</p>
                      <p className="text-sm text-slate-500 truncate">{job.dropLocation ?? job.dropAddress ?? 'N/A'}</p>
                    </td>
                    {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-[#1066b1]">
                          {fmtMoney(Number(job.agreedAmount ?? 0), job.currency)}
                        </p>
                        <p className="text-xs text-slate-400">{job.goodsType ?? 'N/A'}</p>
                      </td>
                    )}
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
                        <div className="flex flex-col gap-1.5">
                          {(job.quoteCount ?? 0) === 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                              <span className="material-symbols-outlined text-[11px]">info</span>
                              No Quotes Yet
                            </span>
                          )}
                          <button
                            onClick={() => openBidsPanel(job.jobId, job.jobReference ?? job.jobRef ?? job.jobId)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1066b1]/30 bg-[#1066b1]/8 px-3 py-2 text-xs font-black text-[#1066b1] transition hover:bg-[#1066b1] hover:text-white"
                          >
                            <span className="material-symbols-outlined text-[15px]">gavel</span>
                            {(job.quoteCount ?? 0) > 0 ? `${job.quoteCount} Bid${(job.quoteCount ?? 0) > 1 ? 's' : ''}` : 'View Bids'}
                          </button>
                        </div>
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
                            {false && job.loadCode && (
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

                    {/* In-Transit: actions */}
                    {activeStatus === 'IN_TRANSIT' && (
                      <td className="px-6 py-5 min-w-[180px]">
                        {isDelivered ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                              Driver Delivered
                            </div>
                            <button
                              onClick={() => openDeliveryReview(job.jobId, job.jobReference ?? job.jobRef ?? job.jobId)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#0d55a0]"
                            >
                              <span className="material-symbols-outlined text-sm">rate_review</span>
                              Review & Release
                            </button>
                          </div>
                        ) : needsMySign ? (
                          <button
                            onClick={() => openSignModal(job.jobId, job.jobReference ?? job.jobRef ?? job.jobId)}
                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1066b1] bg-[#1066b1]/10 px-3 py-2 text-xs font-black text-[#083d7a] shadow-sm transition hover:bg-[#1066b1] hover:text-white"
                          >
                            <span className="material-symbols-outlined text-sm">draw</span>
                            Sign Handover
                          </button>
                        ) : bothSigned ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                              <span className="text-xs font-black text-emerald-700">Both signed</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {handover.haulierSignedAt ? new Date(handover.haulierSignedAt).toLocaleString('en-US') : ''}
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

                    {/* View button — all tabs except OPEN and EXPIRED */}
                    {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                      <td className="px-6 py-5">
                        <button
                          onClick={() => { setViewJobId(job.jobId); setViewJobRef(job.jobReference ?? job.jobRef ?? job.jobId); }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-[#44474C] transition hover:border-[#1066b1]/40 hover:bg-[#1066b1]/8 hover:text-[#1066b1]"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          View
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={activeStatus === 'OPEN' ? 6 : activeStatus === 'BOOKED' || activeStatus === 'IN_TRANSIT' ? 8 : activeStatus === 'EXPIRED' ? 5 : 7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-2xl text-slate-400">search_off</span>
                      </div>
                      <p className="font-black text-[#44474C]">No {activeSection.label.toLowerCase()} jobs found</p>
                      <p className="text-sm text-slate-400">
                        {activeStatus === 'OPEN'
                          ? 'Post a new job to start receiving quotes.'
                          : activeStatus === 'EXPIRED'
                          ? 'No expired jobs — all open jobs are still within their date.'
                          : 'Try another tab to see jobs with a different status.'}
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
