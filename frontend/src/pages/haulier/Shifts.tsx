import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import haulierService from '../../api/haulierService';
import { fmtMoney } from '../../utils/currency';
import ConfirmModal from '../../components/ConfirmModal';
import SignatureRenderer from '../../components/SignatureRenderer';

// ── Stripe types (CDN-loaded Stripe.js) ──────────────────────────────────────
declare global { interface Window { Stripe?: (pk: string) => StripeInst; } }
interface StripeCardEl { mount(el: HTMLElement): void; unmount(): void; on(ev: string, fn: (e: { error?: { message: string } }) => void): void; }
interface StripeInst { elements(o?: object): { create(t: 'card', o?: object): StripeCardEl }; confirmCardPayment(cs: string, d?: { payment_method: string | { card: StripeCardEl } }): Promise<{ paymentIntent?: { id: string; status: string }; error?: { message: string } }>; }
const loadStripe = (): Promise<void> => {
  if (window.Stripe) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = () => res();
    s.onerror = () => rej(new Error('Stripe.js failed to load'));
    document.body.appendChild(s);
  });
};

type ShiftStatus = 'OPEN' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'HANDOVER';
type RequirementType = 'DRIVER_ONLY' | 'TRUCK_WITH_DRIVER' | 'TRUCK_ONLY';

interface StopItem {
  address:       string;
  lat?:          number;
  lng?:          number;
  order?:        number;
  deliveryTime?: string;
  isFinalDestination?: boolean;
}

interface CompartmentDetailItem {
  compartment: number;
  contents:    string;
  quantity:    number;
  unit:        string;
  stopId?:     string;
  stopLabel?:  string;
}

interface ShiftItem {
  shiftId:             string;
  shiftRef:            string;
  requirementType:     string;
  startDate:           string;
  endDate:             string;
  totalDays:           number;
  hoursPerDay:         number;
  pickupAddress?:      string;
  dropAddress?:        string;
  location?:           string;
  goodsType?:          string;
  totalCapacity?:      number;
  compartments?:       number;
  compartmentDetails?: CompartmentDetailItem[];
  stops?:              StopItem[];
  accessCode?:         string;
  loadCode?:           string;
  jobTime?:            string;
  specialInstructions?: string;
  distanceKm?:         number;
  durationMin?:        number;
  notes?:              string;
  status:                  string;
  daysCompleted:           number;
  dailyRate?:              number;
  currency?:               string;
  selectedDriverId?:       string;
  currentDayEscrowed?:     boolean;
  handoverSubmitted?:      boolean;
  handoverHaulierSigned?:  boolean;
  handoverHaulierSignedAt?: string | null;
  quoteCount?:             number;
}

interface QuoteItem {
  quoteId: string;
  driverName?: string;
  driverId: string;
  amountPerDay: number;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt?: string;
  currency?: string;
}

const REQUIREMENT_OPTIONS: { value: RequirementType; label: string; desc: string; icon: string }[] = [
  { value: 'DRIVER_ONLY',       label: 'Driver Only',       desc: 'You provide the truck — hire a driver.',        icon: 'person' },
  { value: 'TRUCK_WITH_DRIVER', label: 'Truck with Driver', desc: 'Driver brings their own truck.',                 icon: 'local_shipping' },
  { value: 'TRUCK_ONLY',        label: 'Truck Only',        desc: 'Hire the vehicle — no driver services needed.',  icon: 'garage' },
];

type SectionMeta = {
  key: ShiftStatus;
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
    title: 'Open Shifts',
    description: 'Shifts awaiting driver quotes.',
    icon: 'event_available',
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    key: 'BOOKED',
    label: 'Booked',
    title: 'Booked Shifts',
    description: 'Shifts with a confirmed driver, not yet started.',
    icon: 'how_to_reg',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    title: 'Active Shifts',
    description: 'Shifts currently underway.',
    icon: 'local_shipping',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    title: 'Completed Shifts',
    description: 'Shifts that have been fully worked.',
    icon: 'check_circle',
    tone: 'bg-[#1066b1]/10 text-[#0a4a8f] border-[#1066b1]/15',
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    title: 'Cancelled Shifts',
    description: 'Shifts that were cancelled.',
    icon: 'cancel',
    tone: 'bg-red-50 text-red-600 border-red-100',
  },
  {
    key: 'EXPIRED',
    label: 'Expired',
    title: 'Expired Shifts',
    description: 'Open shifts whose start date has passed without a driver being booked.',
    icon: 'schedule_send',
    tone: 'bg-orange-50 text-orange-600 border-orange-100',
  },
  {
    key: 'HANDOVER',
    label: 'Handover',
    title: 'Shift Handovers',
    description: 'Pre-trip vehicle handover records submitted by drivers.',
    icon: 'fact_check',
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
];

const PAGE_SIZE = 10;

const statusBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'OPEN')        return 'bg-blue-100 text-blue-700';
  if (s === 'BOOKED')      return 'bg-indigo-100 text-indigo-700';
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700';
  if (s === 'COMPLETED')   return 'bg-green-100 text-green-700';
  if (s === 'CANCELLED')   return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-500';
};

const quoteBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'PENDING')   return 'bg-blue-100 text-blue-700';
  if (s === 'ACCEPTED')  return 'bg-emerald-100 text-emerald-700';
  if (s === 'REJECTED')  return 'bg-red-100 text-red-700';
  if (s === 'WITHDRAWN') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-500';
};


/* ── Shift Day Payment Modal ────────────────────────────────────────────────── */

interface ShiftDayPaymentOrder {
  paymentId:       string;
  dayNumber:       number;
  totalDays:       number;
  gatewayOrderId:  string;
  clientSecret:    string;
  amount:          number;
  currency:        string;
  publishableKey:  string;
  driverAmount:    number;
  platformFee:     number;
}

interface ShiftPaymentModalProps {
  shiftRef: string;
  shiftId:  string;
  order:    ShiftDayPaymentOrder;
  onSuccess: () => void;
  onCancel:  () => void;
  onError:   (msg: string) => void;
}

const ShiftPaymentModal: React.FC<ShiftPaymentModalProps> = ({
  shiftRef, shiftId, order, onSuccess, onCancel, onError,
}) => {
  const cardRef     = useRef<HTMLDivElement>(null);
  const mountedRef  = useRef<StripeCardEl | null>(null);
  const [stripe, setStripe]         = useState<StripeInst | null>(null);
  const [card, setCard]             = useState<StripeCardEl | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cardError, setCardError]   = useState('');
  const isTest = order.publishableKey.startsWith('pk_test');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadStripe();
        if (!alive) return;
        const si = window.Stripe!(order.publishableKey);
        setStripe(si);
        if (cardRef.current) {
          const el = si.elements().create('card', {
            style: { base: { fontSize: '15px', color: '#041627', '::placeholder': { color: '#94a3b8' } } },
          });
          el.mount(cardRef.current);
          el.on('change', (e) => setCardError(e.error?.message ?? ''));
          setCard(el);
          mountedRef.current = el;
        }
      } catch { onError('Failed to load payment SDK. Please refresh and try again.'); }
    })();
    return () => { alive = false; mountedRef.current?.unmount(); mountedRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!stripe || !card) return;
    setConfirming(true);
    setCardError('');
    try {
      const result = await stripe.confirmCardPayment(order.clientSecret, { payment_method: { card } });
      if (result.error) { setCardError(result.error.message); setConfirming(false); return; }
      const status = result.paymentIntent?.status;
      if (status === 'requires_capture' || status === 'succeeded') {
        await haulierService.verifyShiftDayPayment(shiftId, order.dayNumber, result.paymentIntent!.id);
        onSuccess();
      } else {
        setCardError(`Unexpected payment status: ${status ?? 'unknown'}`);
        setConfirming(false);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onError(e.response?.data?.message ?? e.message ?? 'Payment failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1066b1] to-[#0a4a8f] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Daily Payment</p>
              <h3 className="text-lg font-black text-white font-mono">{shiftRef}</h3>
              <p className="text-sm font-bold text-white/70 mt-0.5">
                Day {order.dayNumber} of {order.totalDays}
              </p>
            </div>
            <button onClick={onCancel} disabled={confirming} className="rounded-full p-1.5 text-white/60 hover:bg-white/15 transition-colors disabled:opacity-40">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Fee breakdown */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Day {order.dayNumber} Breakdown</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 border-b border-slate-50 bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1066b1] text-[15px]">person</span>
                <span className="text-sm font-bold text-[#041627]">Driver Fee</span>
              </div>
              <span className="text-sm font-black text-[#1066b1]">{fmtMoney(order.driverAmount, order.currency)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 border-b border-slate-50 bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[15px]">bolt</span>
                <span className="text-sm font-bold text-[#041627]">Platform Fee <span className="text-slate-400 font-medium">(12.5%)</span></span>
              </div>
              <span className="text-sm font-black text-amber-600">{fmtMoney(order.platformFee, order.currency)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3.5 bg-[#1066b1]/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1066b1] text-[15px]">calculate</span>
                <span className="text-sm font-black text-[#041627]">Today's Charge</span>
              </div>
              <span className="text-base font-black text-[#041627]">{fmtMoney(order.amount, order.currency)}</span>
            </div>
          </div>

          {/* Test mode banner */}
          {isTest && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">science</span>
              <div className="text-xs text-amber-800">
                <p className="font-black mb-0.5">Test Mode</p>
                <p>Use <span className="font-mono font-black">4242 4242 4242 4242</span>, any future expiry, any CVC.</p>
              </div>
            </div>
          )}

          {/* Card input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card Details</label>
            <div ref={cardRef} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 min-h-[46px]" />
            {cardError && <p className="text-xs font-semibold text-red-600">{cardError}</p>}
          </div>

          {/* Escrow notice */}
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-sm text-indigo-400 mt-0.5 shrink-0">lock</span>
            <span>Funds are held securely in escrow and released to the driver when you mark the day complete.</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={confirming}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-[#44474C] hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={() => void handleConfirm()} disabled={confirming || !stripe || !card}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1066b1] py-3 text-sm font-black text-white hover:bg-[#0e57a0] transition-colors shadow-md shadow-[#1066b1]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-base">{confirming ? 'hourglass_top' : 'lock'}</span>
              {confirming ? 'Processing…' : `Pay ${fmtMoney(order.amount, order.currency)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Quotes Panel ───────────────────────────────────────────────────────────── */

interface QuotesPanelProps {
  shiftRef: string;
  shift: ShiftItem;
  quotes: QuoteItem[];
  loading: boolean;
  error: string;
  actionLoading: string | null;
  onAccept: (quoteId: string) => void;
  onClose: () => void;
}

const SectionTitle: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="material-symbols-outlined text-[#1066b1] text-base">{icon}</span>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const QuotesPanel: React.FC<QuotesPanelProps> = ({
  shiftRef, shift, quotes, loading, error, actionLoading, onAccept, onClose,
}) => {
  const pendingQuotes = quotes.filter((q) => q.status.toUpperCase() === 'PENDING');
  const otherQuotes   = quotes.filter((q) => q.status.toUpperCase() !== 'PENDING');
  const reqOpt = REQUIREMENT_OPTIONS.find((o) => o.value === shift.requirementType);
  const intermStops = (shift.stops ?? []).filter(s => !s.isFinalDestination);

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">

        {/* ── Header ── */}
        <div className="border-b border-slate-100 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Shift Details &amp; Quotes</p>
              <h2 className="text-xl font-black text-[#041627] font-mono">{shiftRef}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(shift.status)}`}>
                {shift.status.replace(/_/g, ' ')}
              </span>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ─ Route card (dark) ─ */}
          <div className="rounded-2xl bg-[#041627] p-5 space-y-4">
            {/* Pickup → Stops → Drop */}
            <div className="space-y-0">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0 mt-1">
                  <span className="h-3 w-3 rounded-full bg-[#1066b1] ring-2 ring-[#1066b1]/40" />
                  <span className="w-px flex-1 bg-white/15 min-h-[20px]" />
                </div>
                <div className="pb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Pickup</p>
                  <p className="text-sm font-bold text-white leading-snug">{shift.pickupAddress ?? shift.location ?? '—'}</p>
                </div>
              </div>

              {/* Intermediate stops */}
              {intermStops.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 mt-1">
                    <span className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                    <span className="w-px flex-1 bg-white/15 min-h-[20px]" />
                  </div>
                  <div className="pb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Stop {i + 1}</p>
                    <p className="text-sm font-bold text-white leading-snug">{s.address}</p>
                    {s.deliveryTime && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-amber-400 text-xs">schedule</span>
                        <span className="text-[11px] font-bold text-amber-400">Est. {s.deliveryTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Drop */}
              <div className="flex items-start gap-3">
                <span className="h-3 w-3 rounded-full bg-red-400 ring-2 ring-red-400/40 shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Drop-off</p>
                  <p className="text-sm font-bold text-white leading-snug">{shift.dropAddress ?? '—'}</p>
                  {(() => {
                    const fin = (shift.stops ?? []).find(s => s.isFinalDestination);
                    return fin?.deliveryTime ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-emerald-400 text-xs">schedule</span>
                        <span className="text-[11px] font-bold text-emerald-400">Est. {fin.deliveryTime}</span>
                      </div>
                    ) : null;
                  })()}
                  {/* Final-destination cargo */}
                  {(() => {
                    const finalCargo = (shift.compartmentDetails ?? []).filter(c =>
                      c.stopLabel?.startsWith('Final Destination:')
                    );
                    return finalCargo.length > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        {finalCargo.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center text-[10px] font-black text-white/70 shrink-0">
                              {c.compartment}
                            </span>
                            <span className="text-[11px] text-white/60">{c.contents}</span>
                            <span className="text-[11px] font-black text-white/80 ml-auto">{Number(c.quantity).toLocaleString()} {c.unit}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Distance / Duration */}
            {(shift.distanceKm != null || shift.durationMin != null) && (
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                {shift.distanceKm != null && (
                  <div className="rounded-xl bg-white/8 px-3 py-2.5 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Distance</p>
                    <p className="text-sm font-black text-white">{shift.distanceKm} km</p>
                  </div>
                )}
                {shift.durationMin != null && (
                  <div className="rounded-xl bg-white/8 px-3 py-2.5 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Est. Drive Time</p>
                    <p className="text-sm font-black text-white">{Math.round(shift.durationMin / 60 * 10) / 10} hrs</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─ Schedule ─ */}
          <div>
            <SectionTitle icon="calendar_month" label="Schedule" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Start</p>
                <p className="text-sm font-black text-emerald-800">{fmtDate(shift.startDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">End</p>
                <p className="text-sm font-black text-[#041627]">{fmtDate(shift.endDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Days</p>
                <p className="text-sm font-black text-[#041627]">{shift.totalDays}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Hrs/Day</p>
                <p className="text-sm font-black text-[#041627]">{shift.hoursPerDay}h</p>
              </div>
            </div>
            {shift.jobTime && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[#1066b1] text-base">schedule</span>
                <span className="font-bold text-[#041627]">Start time:</span>
                <span className="font-mono font-black text-[#1066b1]">{shift.jobTime}</span>
              </div>
            )}
          </div>

          {/* ─ Requirement ─ */}
          <div>
            <SectionTitle icon="person_search" label="Requirement" />
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1066b1]/10 shrink-0">
                <span className="material-symbols-outlined text-[#1066b1] text-base">{reqOpt?.icon ?? 'person'}</span>
              </div>
              <div>
                <p className="font-black text-[#041627] text-sm">{reqOpt?.label ?? shift.requirementType}</p>
                <p className="text-xs text-slate-400">{reqOpt?.desc ?? ''}</p>
              </div>
            </div>
          </div>

          {/* ─ Cargo ─ */}
          {(shift.goodsType || shift.totalCapacity != null || shift.compartments != null || shift.dailyRate != null) && (
            <div>
              <SectionTitle icon="inventory_2" label="Cargo &amp; Rate" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shift.goodsType && (
                  <div className="col-span-2 sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Goods Type</p>
                    <p className="text-sm font-bold text-[#041627]">{shift.goodsType}</p>
                  </div>
                )}
                {shift.totalCapacity != null && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Capacity</p>
                    <p className="text-sm font-bold text-[#041627]">{Number(shift.totalCapacity).toLocaleString()} L</p>
                  </div>
                )}
                {shift.compartments != null && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Compartments</p>
                    <p className="text-sm font-bold text-[#041627]">{shift.compartments}</p>
                  </div>
                )}
                {shift.dailyRate != null && (
                  <div className="col-span-2 sm:col-span-2 rounded-xl bg-[#1066b1]/5 border border-[#1066b1]/20 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#1066b1]/60 mb-0.5">Your Daily Rate</p>
                    <p className="text-base font-black text-[#1066b1]">
                      {fmtMoney(Number(shift.dailyRate), shift.currency)}<span className="text-sm font-bold text-slate-400">/day</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Compartment Details ─ */}
          {shift.compartmentDetails && shift.compartmentDetails.length > 0 && (
            <div>
              <SectionTitle icon="view_column" label="Compartment Breakdown" />
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                <div className="hidden sm:grid sm:grid-cols-[36px_1fr_90px_60px_1fr] gap-3 px-4 py-2 bg-slate-50">
                  {['#', 'Contents', 'Qty', 'Unit', 'Destination'].map(h => (
                    <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                  ))}
                </div>
                {shift.compartmentDetails.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[36px_1fr_90px_60px_1fr] gap-2 sm:gap-3 px-4 py-3 bg-white items-center">
                    <div className="w-7 h-7 rounded-lg bg-[#1066b1]/10 flex items-center justify-center">
                      <span className="text-[11px] font-black text-[#1066b1]">{c.compartment ?? i + 1}</span>
                    </div>
                    <p className="text-sm font-bold text-[#041627]">{c.contents || '—'}</p>
                    <p className="text-sm text-[#1066b1] font-black">{c.quantity}</p>
                    <p className="text-xs text-slate-500 font-bold">{c.unit}</p>
                    <p className="text-xs text-slate-500 truncate">{c.stopLabel || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ Intermediate Stops (with delivery times + per-stop cargo) ─ */}
          {intermStops.length > 0 && (
            <div>
              <SectionTitle icon="add_location_alt" label="Intermediate Stops" />
              <div className="space-y-3">
                {intermStops.map((s, i) => {
                  const stopCargo = (shift.compartmentDetails ?? []).filter(c =>
                    c.stopLabel?.startsWith(`Stop ${i + 1}:`)
                  );
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                      {/* Stop header row */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-[11px] font-black shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium text-[#44474C] truncate">{s.address}</span>
                        </div>
                        {s.deliveryTime && (
                          <div className="flex items-center gap-1.5 shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                            <span className="material-symbols-outlined text-amber-500 text-[13px]">schedule</span>
                            <span className="text-xs font-black text-amber-700">{s.deliveryTime}</span>
                          </div>
                        )}
                      </div>
                      {/* Per-stop cargo breakdown */}
                      {stopCargo.length > 0 && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {stopCargo.map((c, ci) => (
                            <div key={ci} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-md bg-[#1066b1]/10 flex items-center justify-center text-[10px] font-black text-[#1066b1] shrink-0">
                                  {c.compartment}
                                </span>
                                <span className="text-sm font-medium text-[#44474C]">{c.contents}</span>
                              </div>
                              <span className="text-sm font-black text-[#1066b1] shrink-0">
                                {Number(c.quantity).toLocaleString()} {c.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ Codes ─ */}
          {(shift.accessCode || shift.loadCode) && (
            <div>
              <SectionTitle icon="key" label="Codes" />
              <div className="grid grid-cols-2 gap-3">
                {shift.accessCode && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Access Code</p>
                    <p className="font-mono font-black text-[#1066b1] text-base tracking-widest">{shift.accessCode}</p>
                  </div>
                )}
                {shift.loadCode && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Load Code</p>
                    <p className="font-mono font-black text-[#1066b1] text-base tracking-widest">{shift.loadCode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Special Instructions ─ */}
          {shift.specialInstructions && (
            <div>
              <SectionTitle icon="assignment" label="Special Instructions" />
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-sm text-[#44474C] leading-relaxed">{shift.specialInstructions}</p>
              </div>
            </div>
          )}

          {/* ─ Notes ─ */}
          {shift.notes && (
            <div>
              <SectionTitle icon="notes" label="Notes" />
              <p className="text-sm text-slate-600 leading-relaxed">{shift.notes}</p>
            </div>
          )}

          {/* ══════════ DIVIDER ══════════ */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
              <span className="material-symbols-outlined text-[#1066b1] text-base">gavel</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Quotes</p>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ─ Quotes ─ */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {!loading && !error && quotes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <span className="material-symbols-outlined text-2xl text-slate-400">inbox</span>
              </span>
              <p className="font-black text-[#44474C]">No quotes yet</p>
              <p className="text-sm text-slate-400">Drivers haven't submitted any quotes for this shift.</p>
            </div>
          )}

          {!loading && pendingQuotes.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pending Review · {pendingQuotes.length}
              </p>
              <div className="space-y-3">
                {pendingQuotes.map((q) => (
                  <QuoteCard key={q.quoteId} quote={q} actionLoading={actionLoading} onAccept={onAccept} />
                ))}
              </div>
            </div>
          )}

          {!loading && otherQuotes.length > 0 && (
            <div className={pendingQuotes.length > 0 ? 'mt-4' : ''}>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Previous · {otherQuotes.length}
              </p>
              <div className="space-y-3">
                {otherQuotes.map((q) => (
                  <QuoteCard key={q.quoteId} quote={q} actionLoading={actionLoading} onAccept={onAccept} />
                ))}
              </div>
            </div>
          )}

          {/* bottom padding */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};

interface QuoteCardProps {
  quote: QuoteItem;
  actionLoading: string | null;
  onAccept: (quoteId: string) => void;
}

const PLATFORM_FEE_RATE = 0.125; // 12.5 %

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, actionLoading, onAccept }) => {
  const isPending  = quote.status.toUpperCase() === 'PENDING';
  const isWorking  = actionLoading === quote.quoteId;

  const driverFeePerDay  = Number(quote.amountPerDay);
  const platformFeePerDay = Math.round(driverFeePerDay * PLATFORM_FEE_RATE * 100) / 100;
  const totalPerDay      = driverFeePerDay + platformFeePerDay;

  const driverTotal   = Number(quote.totalAmount);
  const platformTotal = Math.round(driverTotal * PLATFORM_FEE_RATE * 100) / 100;
  const grandTotal    = driverTotal + platformTotal;

  // Derive number of days from totalAmount ÷ amountPerDay
  const numDays = driverFeePerDay > 0 ? Math.round(driverTotal / driverFeePerDay) : 1;

  return (
    <div className={`rounded-2xl border p-4 transition ${isPending ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}>
      {/* Driver header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/10 text-[#1066b1] font-black text-sm">
          {quote.driverName ? quote.driverName.charAt(0).toUpperCase() : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="font-black text-[#041627] truncate">{quote.driverName ?? 'Driver'}</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${quoteBadge(quote.status)}`}>
                {quote.status}
              </span>
            </div>
            {quote.createdAt && (
              <p className="text-[10px] text-slate-400 shrink-0">
                {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {quote.notes && (
            <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{quote.notes}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Fee breakdown table */}
      <div className="mt-3 rounded-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 bg-slate-50 px-4 py-2 border-b border-slate-100">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fee</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Per Day</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">{numDays} Day{numDays !== 1 ? 's' : ''}</span>
        </div>

        {/* Driver fee row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1066b1] text-[15px]">person</span>
            <span className="text-sm font-bold text-[#041627]">Driver Fee</span>
          </div>
          <span className="text-sm font-black text-[#1066b1] text-right">{fmtMoney(driverFeePerDay, quote.currency)}</span>
          <span className="text-sm font-black text-[#1066b1] text-right">{fmtMoney(driverTotal, quote.currency)}</span>
        </div>

        {/* Platform fee row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[15px]">bolt</span>
            <span className="text-sm font-bold text-[#041627]">Platform Fee <span className="text-slate-400 font-medium">(12.5%)</span></span>
          </div>
          <span className="text-sm font-black text-amber-600 text-right">{fmtMoney(platformFeePerDay, quote.currency)}</span>
          <span className="text-sm font-black text-amber-600 text-right">{fmtMoney(platformTotal, quote.currency)}</span>
        </div>

        {/* Total row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-3 bg-[#1066b1]/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1066b1] text-[15px]">calculate</span>
            <span className="text-sm font-black text-[#041627]">Total</span>
          </div>
          <span className="text-sm font-black text-[#041627] text-right">{fmtMoney(totalPerDay, quote.currency)}<span className="text-[10px] text-slate-400 font-bold">/day</span></span>
          <span className="text-base font-black text-[#041627] text-right">{fmtMoney(grandTotal, quote.currency)}</span>
        </div>
      </div>

      {isPending && (
        <div className="mt-3">
          <button
            onClick={() => onAccept(quote.quoteId)}
            disabled={!!actionLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            )}
            Accept Quote
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Signature Canvas (haulier counter-sign for shift handover) ─────────────── */

type Point = { x: number; y: number };

function ShiftSignatureCanvas({
  shiftRef,
  onSave,
  onCancel,
  loading,
  error,
  savedSignature,
}: {
  shiftRef:        string;
  onSave:          (dataUrl: string) => void;
  onCancel:        () => void;
  loading:         boolean;
  error:           string;
  savedSignature?: string | null;
}) {
  // 'saved' = show saved sig preview; 'draw' = show canvas
  const [mode, setMode]           = React.useState<'saved' | 'draw'>(savedSignature ? 'saved' : 'draw');
  const canvasRef                 = React.useRef<HTMLCanvasElement>(null);
  const drawing                   = React.useRef(false);
  const lastPoint                 = React.useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes] = React.useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current   = true;
    lastPoint.current = getPos(e);
    setHasStrokes(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPoint.current = pos;
  };

  const endDraw = () => {
    drawing.current   = false;
    lastPoint.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (mode === 'saved' && savedSignature) { onSave(savedSignature); return; }
    if (!canvasRef.current || !hasStrokes) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#1066b1] to-[#0a4a8f] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Shift Handover</p>
              <h2 className="text-xl font-black text-white font-mono">{shiftRef}</h2>
              <p className="text-sm text-white/70 mt-0.5">Haulier Counter-Signature</p>
            </div>
            <button onClick={onCancel} disabled={loading}
              className="rounded-full p-2 text-white/60 transition hover:bg-white/15 disabled:opacity-40">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* ── MODE: saved signature ── */}
          {mode === 'saved' && savedSignature ? (
            <>
              <p className="text-sm text-slate-500">
                Your saved e-signature is ready. Tap <strong>Sign with This</strong> to confirm, or draw a new one.
              </p>

              {/* Saved sig preview */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#1066b1]/40 bg-[#f0f7ff]">
                <img
                  src={savedSignature}
                  alt="Your saved e-signature"
                  className="max-h-36 w-full object-contain p-4"
                />
                <span className="absolute right-3 top-3 rounded-md bg-[#1066b1]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1066b1]">
                  Saved
                </span>
              </div>

              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-slate-400">
                AUTHORISING OFFICER — SHIFT VEHICLE RELEASE
              </p>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">{error}</p>
              )}

              {/* Primary action row */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('draw')}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Draw New
                </button>
                <button
                  onClick={save}
                  disabled={loading}
                  className="flex-[2] rounded-2xl bg-[#1066b1] py-3 text-sm font-black text-white shadow-md shadow-[#1066b1]/20 transition hover:bg-[#0e57a0] disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting…
                    </span>
                  ) : (
                    '✓  Sign with This'
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ── MODE: draw canvas ── */
            <>
              <p className="text-sm text-slate-500">
                Sign below to confirm you have reviewed the driver's pre-trip handover and authorise departure.
              </p>

              {/* "← Use Saved" link when a saved sig exists */}
              {savedSignature && (
                <button
                  onClick={() => { clear(); setMode('saved'); }}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#1066b1]/30 bg-[#1066b1]/5 py-2 text-xs font-black text-[#1066b1] transition hover:bg-[#1066b1]/10 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  Use Saved E-Signature
                </button>
              )}

              {/* Canvas */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={180}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasStrokes && (
                  <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300 select-none">
                    Draw your signature here
                  </p>
                )}
              </div>

              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-slate-400">
                AUTHORISING OFFICER — SHIFT VEHICLE RELEASE
              </p>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={clear}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={save}
                  disabled={loading || !hasStrokes}
                  className="flex-[2] rounded-2xl bg-[#1066b1] py-3 text-sm font-black text-white shadow-md shadow-[#1066b1]/20 transition hover:bg-[#0e57a0] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting…
                    </span>
                  ) : (
                    'Confirm Signature'
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Shift Handover Panel ────────────────────────────────────────────────────── */

const CHECKLIST_LABELS: Record<string, string> = {
  lightsSignals: 'Lights & Signals',
  tirePressure:  'Tyre Pressure',
  fluidLevels:   'Fluid Levels',
  bodyDamage:    'Body Damage OK',
};

interface ShiftHandoverPanelProps {
  shiftId: string;
  shiftRef: string;
  onClose: () => void;
}

const ShiftHandoverPanel: React.FC<ShiftHandoverPanelProps> = ({ shiftId, shiftRef, onClose }) => {
  const [data, setData] = useState<{
    handoverSubmitted: boolean;
    handoverSubmittedAt: string | null;
    checklistData: Record<string, boolean>;
    photoUrls: string[];
    driverSignatureData: string | null;
    handoverHaulierSigned: boolean;
    handoverHaulierSignedAt: string | null;
    handoverHaulierSignatureData: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    haulierService.getShiftHandoverStatus(shiftId)
      .then((d) => setData(d as typeof data))
      .catch(() => setError('Failed to load handover details.'))
      .finally(() => setLoading(false));
  }, [shiftId]);

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Shift Handover</p>
            <h2 className="text-xl font-black text-[#041627] font-mono">{shiftRef}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}
          {!loading && data && (
            <>
              {/* Signature status */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl border px-4 py-3 text-center ${data.handoverSubmitted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Driver Submitted</p>
                  {data.handoverSubmitted ? (
                    <>
                      <span className="material-symbols-outlined text-emerald-600 text-base block">verified</span>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">{fmt(data.handoverSubmittedAt)}</p>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-base block">pending</span>
                  )}
                </div>
                <div className={`rounded-2xl border px-4 py-3 text-center ${data.handoverHaulierSigned ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Haulier Signed</p>
                  {data.handoverHaulierSigned ? (
                    <>
                      <span className="material-symbols-outlined text-emerald-600 text-base block">verified</span>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">{fmt(data.handoverHaulierSignedAt)}</p>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-base block">pending</span>
                  )}
                </div>
              </div>

              {/* Vehicle checklist */}
              {data.checklistData && Object.keys(data.checklistData).length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1066b1]">fact_check</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Checklist</p>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(data.checklistData).map(([key, passed]) => (
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

              {/* Driver signature */}
              {data.driverSignatureData && data.driverSignatureData !== 'driver_signed' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1066b1]">draw</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver Signature</p>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <SignatureRenderer data={data.driverSignatureData} height={96} className="w-full" />
                  </div>
                </div>
              )}
              {data.driverSignatureData === 'driver_signed' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-600">draw</span>
                  <p className="text-sm font-black text-emerald-800">Driver Signed</p>
                </div>
              )}

              {/* Vehicle condition photos */}
              {data.photoUrls && data.photoUrls.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1066b1]">photo_camera</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Vehicle Condition Photos · {data.photoUrls.length}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {data.photoUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-slate-200">
                        <img src={url} alt={`Condition photo ${i + 1}`} className="h-32 w-full object-cover transition group-hover:opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <span className="material-symbols-outlined text-white drop-shadow text-2xl">open_in_new</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Haulier signature */}
              {data.handoverHaulierSignatureData && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#1066b1]">verified</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Haulier Counter-Signature</p>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <SignatureRenderer data={data.handoverHaulierSignatureData} height={96} className="w-full" />
                  </div>
                </div>
              )}

              {!data.handoverSubmitted && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300">assignment_late</span>
                  <p className="font-black text-slate-400">No handover submitted yet</p>
                  <p className="text-sm text-slate-400">The driver hasn't completed the pre-trip handover checklist.</p>
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

const HaulierShiftsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<ShiftStatus>('OPEN');
  const [page, setPage] = useState(1);
  const [allShifts, setAllShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* Release payment confirm modal */
  const [releaseConfirm, setReleaseConfirm] = useState<{ shiftId: string; dayNum: number; shiftRef: string } | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  /* Quotes panel state */
  const [quotesShiftId, setQuotesShiftId]   = useState<string | null>(null);
  const [quotesShift, setQuotesShift]        = useState<ShiftItem | null>(null);
  const [quotes, setQuotes]                  = useState<QuoteItem[]>([]);
  const [quotesLoading, setQuotesLoading]    = useState(false);
  const [quotesError, setQuotesError]        = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);

  /* Day payment modal state */
  const [payingEntry, setPayingEntry] = useState<{
    shift: ShiftItem; order: ShiftDayPaymentOrder;
  } | null>(null);
  const [dayPaymentLoading, setDayPaymentLoading] = useState<string | null>(null); // shiftId

  /* Handover signature modal */
  const [signModalShift, setSignModalShift] = useState<ShiftItem | null>(null);
  const [signLoading,    setSignLoading]    = useState(false);
  const [signError,      setSignError]      = useState('');
  const [savedEsignature, setSavedEsignature] = useState<string | null>(null);

  /* Shift handover panel */
  const [handoverShift, setHandoverShift] = useState<{ shiftId: string; shiftRef: string } | null>(null);

  /* Driver live-tracking panel */

  const loadShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await haulierService.listMyShifts();
      setAllShifts((data?.items ?? []) as ShiftItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
    // Load saved e-signature from profile
    haulierService.getMe().then((me: { profile?: { esignatureData?: string | null } | null }) => {
      if (me?.profile?.esignatureData) setSavedEsignature(me.profile.esignatureData);
    }).catch(() => undefined);
  }, []);

  const today = useMemo(() => new Date(new Date().toDateString()), []);
  const isShiftExpired = (s: ShiftItem) =>
    s.status.toUpperCase() === 'OPEN' && new Date(s.startDate + 'T00:00:00') < today;

  const filteredShifts = useMemo(() => {
    if (activeStatus === 'EXPIRED')
      return allShifts.filter(isShiftExpired);
    if (activeStatus === 'OPEN')
      return allShifts.filter((s) => s.status.toUpperCase() === 'OPEN' && !isShiftExpired(s));
    if (activeStatus === 'HANDOVER')
      return allShifts.filter((s) => s.handoverSubmitted);
    return allShifts.filter((s) => s.status.toUpperCase() === activeStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allShifts, activeStatus, today]);

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / PAGE_SIZE));
  const pagedShifts = filteredShifts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeSection = SECTIONS.find((s) => s.key === activeStatus) ?? SECTIONS[0];

  const openCount      = allShifts.filter((s) => s.status.toUpperCase() === 'OPEN').length;
  const completedCount = allShifts.filter((s) => s.status.toUpperCase() === 'COMPLETED').length;

  /* Quotes panel */
  const openQuotesPanel = async (shift: ShiftItem) => {
    setQuotesShiftId(shift.shiftId);
    setQuotesShift(shift);
    setQuotes([]);
    setQuotesError('');
    setQuotesLoading(true);
    try {
      const data = await haulierService.listShiftQuotes(shift.shiftId);
      setQuotes((data?.items ?? []) as QuoteItem[]);
    } catch {
      setQuotesError('Failed to load quotes. Please try again.');
    } finally {
      setQuotesLoading(false);
    }
  };

  const closeQuotesPanel = () => {
    setQuotesShiftId(null);
    setQuotesShift(null);
    setQuotes([]);
    setQuotesError('');
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!quotesShiftId) return;
    setQuoteActionLoading(quoteId);
    try {
      await haulierService.acceptShiftQuote(quotesShiftId, quoteId);
      closeQuotesPanel();
      setSuccess('Quote accepted — shift is now booked. Pay for Day 1 to start the shift.');
      await loadShifts();
    } catch (err) {
      setQuotesError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  /* Day payment */
  const handlePayDay = async (shift: ShiftItem) => {
    setDayPaymentLoading(shift.shiftId);
    setError(null);
    try {
      const order = await haulierService.createShiftDayPayment(shift.shiftId);
      setPayingEntry({ shift, order: order as ShiftDayPaymentOrder });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? (err instanceof Error ? err.message : 'Failed to initiate payment'));
    } finally {
      setDayPaymentLoading(null);
    }
  };

  const handleDayPaymentSuccess = async () => {
    const day = payingEntry?.order.dayNumber;
    setPayingEntry(null);
    setSuccess(`Day ${day} payment secured in escrow. Click "Complete & Release Payment" at end of day to release funds to the driver.`);
    await loadShifts();
  };

  /* Row actions */
  const handleCompleteDay = (shiftId: string, dayNum: number, shiftRef: string) => {
    setReleaseConfirm({ shiftId, dayNum, shiftRef });
  };

  const executeCompleteDay = async () => {
    if (!releaseConfirm) return;
    const { shiftId, dayNum } = releaseConfirm;
    setReleaseLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await haulierService.completeShiftDay(shiftId);
      setReleaseConfirm(null);
      setSuccess(`Day ${dayNum} completed — payment released to driver successfully.`);
      await loadShifts();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? (err instanceof Error ? err.message : 'Failed to complete day'));
    } finally {
      setReleaseLoading(false);
    }
  };

  /** Open the signature canvas modal for the chosen shift */
  const openSignModal = (shift: ShiftItem) => {
    setSignModalShift(shift);
    setSignError('');
  };

  /** Called when the haulier confirms their drawn signature */
  const handleHaulierSignShift = async (signatureDataUrl: string) => {
    if (!signModalShift) return;
    setSignLoading(true);
    setSignError('');
    try {
      await haulierService.signShiftHandover(signModalShift.shiftId, signatureDataUrl);
      setSignModalShift(null);
      setSuccess(`Handover signed for ${signModalShift.shiftRef} — driver can now start their trip.`);
      await loadShifts();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
      setSignError(e.response?.data?.message ?? e.response?.data?.detail ?? (err instanceof Error ? err.message : 'Failed to sign handover. Please try again.'));
    } finally {
      setSignLoading(false);
    }
  };

  const handleCancel = async (shiftId: string) => {
    if (!window.confirm('Cancel this shift? This cannot be undone.')) return;
    setActionLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await haulierService.cancelShift(shiftId);
      setSuccess('Shift cancelled.');
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel shift');
    } finally {
      setActionLoading(false);
    }
  };

  /* Column count for empty state colspan */
  const colCount =
    activeStatus === 'OPEN'        ? 6 :
    activeStatus === 'BOOKED'      ? 7 :
    activeStatus === 'IN_PROGRESS' ? 7 :
    activeStatus === 'EXPIRED'     ? 5 :
    activeStatus === 'HANDOVER'    ? 7 :
    activeStatus === 'COMPLETED'   ? 6 :
    /* CANCELLED */                  6;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">

      {/* ── Release Payment Confirm Modal ── */}
      <ConfirmModal
        open={!!releaseConfirm}
        title="Complete &amp; Release Payment"
        message={`You are about to complete Day ${releaseConfirm?.dayNum} of shift ${releaseConfirm?.shiftRef} and release the escrowed funds to the driver.`}
        details={releaseConfirm ? [
          { label: 'Shift Ref', value: releaseConfirm.shiftRef },
          { label: 'Day', value: `Day ${releaseConfirm.dayNum}` },
          { label: 'Action', value: 'Complete day + release payment' },
        ] : []}
        confirmLabel="Yes, Release Payment"
        cancelLabel="Cancel"
        icon="payments"
        loading={releaseLoading}
        onConfirm={() => void executeCompleteDay()}
        onCancel={() => { if (!releaseLoading) setReleaseConfirm(null); }}
      />

      {/* ── Shift Handover Panel ── */}
      {handoverShift && (
        <ShiftHandoverPanel
          shiftId={handoverShift.shiftId}
          shiftRef={handoverShift.shiftRef}
          onClose={() => setHandoverShift(null)}
        />
      )}

      {/* ── Handover signature modal ── */}
      {signModalShift && (
        <ShiftSignatureCanvas
          shiftRef={signModalShift.shiftRef}
          onSave={handleHaulierSignShift}
          onCancel={() => { setSignModalShift(null); setSignError(''); }}
          loading={signLoading}
          error={signError}
          savedSignature={savedEsignature}
        />
      )}

      {/* Quotes panel */}
      {quotesShiftId && quotesShift && (
        <QuotesPanel
          shiftRef={quotesShift.shiftRef}
          shift={quotesShift}
          quotes={quotes}
          loading={quotesLoading}
          error={quotesError}
          actionLoading={quoteActionLoading}
          onAccept={handleAcceptQuote}
          onClose={closeQuotesPanel}
        />
      )}

      {/* Day payment modal */}
      {payingEntry && (
        <ShiftPaymentModal
          shiftRef={payingEntry.shift.shiftRef}
          shiftId={payingEntry.shift.shiftId}
          order={payingEntry.order}
          onSuccess={() => void handleDayPaymentSuccess()}
          onCancel={() => setPayingEntry(null)}
          onError={(msg) => { setPayingEntry(null); setError(msg); }}
        />
      )}


      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">My Shifts</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#041627]">{activeSection.title}</h1>
          <p className="text-sm font-medium text-slate-500">{activeSection.description}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-black text-[#041627]">{String(allShifts.length).padStart(2, '0')}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Page</p>
            <p className="mt-1 text-2xl font-black text-[#041627]">{page} / {totalPages}</p>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <section className="flex flex-wrap gap-3">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setActiveStatus(s.key); setPage(1); }}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              activeStatus === s.key
                ? 'border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'border-slate-200 bg-white text-[#44474C] hover:border-[#1066b1]/40 hover:text-[#1066b1]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
        {activeStatus === 'OPEN' && (
          <button
            onClick={() => navigate('/haulier/shifts/post')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1066b1] px-4 py-3 text-sm font-black text-white transition hover:bg-[#0e57a0]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Post New Shift
          </button>
        )}
        <button
          onClick={loadShifts}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#44474C] transition hover:border-[#1066b1]/40 hover:text-[#1066b1]"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Shifts on page</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">{String(pagedShifts.length).padStart(2, '0')}</p>
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

      {/* Global banners */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5">check_circle</span>
          <p className="text-sm font-bold text-emerald-700">{success}</p>
        </div>
      )}

      {/* Shifts table */}
      <section className={`overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)] ${loading || actionLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#041627] sm:text-xl">{activeSection.title}</h2>
            <p className="text-sm text-slate-500">{filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} found</p>
          </div>
          {activeStatus === 'OPEN' && (
            <button
              onClick={() => navigate('/haulier/shifts/post')}
              className="hidden rounded-2xl bg-[#1066b1] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0e57a0] md:inline-flex"
            >
              Post New Shift
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Shift Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Requirement</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Schedule</th>
                {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                  <th className="pl-6 pr-14 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-200">Progress</th>
                )}
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                {activeStatus !== 'CANCELLED' && activeStatus !== 'COMPLETED' && activeStatus !== 'EXPIRED' && (
                  <th className="pl-10 pr-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedShifts.map((shift) => {
                const reqOpt   = REQUIREMENT_OPTIONS.find((o) => o.value === shift.requirementType);
                const canComplete = ['BOOKED', 'IN_PROGRESS'].includes(shift.status.toUpperCase()) && shift.daysCompleted < shift.totalDays;
                const canCancel   = !['COMPLETED', 'CANCELLED'].includes(shift.status.toUpperCase());
                const progress    = shift.totalDays > 0 ? (shift.daysCompleted / shift.totalDays) * 100 : 0;

                return (
                  <tr key={shift.shiftId} className="transition hover:bg-slate-50/70">
                    {/* Shift Ref */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${activeSection.tone}`}>
                          <span className="material-symbols-outlined text-base">{activeSection.icon}</span>
                        </div>
                        <p className="font-black text-[#041627] font-mono">{shift.shiftRef}</p>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-6 py-5 max-w-[240px]">
                      <p className="text-sm font-bold text-[#041627] truncate">{shift.pickupAddress ?? shift.location ?? 'N/A'}</p>
                      <p className="text-[10px] text-slate-300 my-1">▼</p>
                      <p className="text-sm text-slate-500 truncate">{shift.dropAddress ?? '—'}</p>
                    </td>

                    {/* Requirement */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-base">{reqOpt?.icon ?? 'person'}</span>
                        <p className="text-sm font-bold text-[#041627]">{reqOpt?.label ?? shift.requirementType}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{shift.hoursPerDay}h/day</p>
                    </td>

                    {/* Schedule */}
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#041627]">{shift.startDate}</p>
                      <p className="text-xs text-slate-400">→ {shift.endDate}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{shift.totalDays} day{shift.totalDays !== 1 ? 's' : ''}</p>
                    </td>

                    {/* Progress (all tabs except OPEN and EXPIRED) */}
                    {activeStatus !== 'OPEN' && activeStatus !== 'EXPIRED' && (
                      <td className="pl-6 pr-14 py-5 min-w-[210px] border-r border-slate-100">
                        <p className="text-sm font-black text-[#041627]">
                          {shift.daysCompleted}
                          <span className="text-slate-400 text-xs font-bold">/{shift.totalDays}</span>
                        </p>
                        <div className="mt-1.5 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${activeStatus === 'CANCELLED' ? 'bg-red-400' : 'bg-[#1066b1]'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {shift.dailyRate && shift.daysCompleted > 0 && (
                          <p className={`text-xs font-black mt-1 ${activeStatus === 'CANCELLED' ? 'text-slate-500' : 'text-[#1066b1]'}`}>
                            {activeStatus === 'CANCELLED'
                              ? `Partial: ${fmtMoney(shift.dailyRate * shift.daysCompleted, shift.currency)}`
                              : `${fmtMoney(shift.dailyRate, shift.currency)}/day`}
                          </p>
                        )}
                        {shift.dailyRate && shift.daysCompleted === 0 && (
                          <p className="text-xs font-black text-[#1066b1] mt-1">{fmtMoney(shift.dailyRate, shift.currency)}/day</p>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(shift.status)}`}>
                        {shift.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    {activeStatus !== 'CANCELLED' && activeStatus !== 'COMPLETED' && activeStatus !== 'EXPIRED' && (
                      <td className="pl-10 pr-6 py-5 min-w-[210px]">
                        {activeStatus === 'OPEN' ? (
                          <div className="flex flex-col gap-1.5">
                            {(shift.quoteCount ?? 0) === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                                <span className="material-symbols-outlined text-[11px]">info</span>
                                No Quotes Yet
                              </span>
                            )}
                            <button
                              onClick={() => openQuotesPanel(shift)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1066b1]/30 bg-[#1066b1]/8 px-3 py-2 text-xs font-black text-[#1066b1] transition hover:bg-[#1066b1] hover:text-white"
                            >
                              <span className="material-symbols-outlined text-[15px]">gavel</span>
                              {(shift.quoteCount ?? 0) > 0 ? `${shift.quoteCount} Quote${(shift.quoteCount ?? 0) > 1 ? 's' : ''}` : 'View Quotes'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 mt-3">
                            {/* Pay Day N — shown when day is not yet escrowed */}
                            {canComplete && !shift.currentDayEscrowed && (
                              <button
                                onClick={() => void handlePayDay(shift)}
                                disabled={dayPaymentLoading === shift.shiftId || !!actionLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-3 py-2 text-xs font-black text-white transition hover:bg-[#0e57a0] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {dayPaymentLoading === shift.shiftId
                                  ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  : <span className="material-symbols-outlined text-[15px]">payment</span>}
                                Pay Day {shift.daysCompleted + 1}
                              </button>
                            )}
                            {/* Complete & Release Payment — shown when that day's payment is escrowed */}
                            {canComplete && shift.currentDayEscrowed && (
                              <button
                                onClick={() => handleCompleteDay(shift.shiftId, shift.daysCompleted + 1, shift.shiftRef)}
                                disabled={!!actionLoading || releaseLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-300"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                Complete &amp; Release Payment
                              </button>
                            )}
                            {/* Sign Handover — driver has submitted; haulier must counter-sign */}
                            {shift.handoverSubmitted && !shift.handoverHaulierSigned && (
                              <button
                                onClick={() => openSignModal(shift)}
                                disabled={!!actionLoading || signLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                              >
                                <span className="material-symbols-outlined text-[15px]">draw</span>
                                Sign Handover
                              </button>
                            )}
                            {/* Handover signed badge */}
                            {shift.handoverHaulierSigned && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">
                                <span className="material-symbols-outlined text-[15px]">verified</span>
                                Handover Signed
                              </span>
                            )}
                            {/* View Handover details — only in the Handover tab */}
                            {activeStatus === 'HANDOVER' && shift.handoverSubmitted && (
                              <button
                                onClick={() => setHandoverShift({ shiftId: shift.shiftId, shiftRef: shift.shiftRef })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-[#44474C] transition hover:border-[#1066b1]/40 hover:bg-[#1066b1]/8 hover:text-[#1066b1]"
                              >
                                <span className="material-symbols-outlined text-[15px]">fact_check</span>
                                View Handover
                              </button>
                            )}
                            {/* Track Driver — available for IN_PROGRESS shifts with a driver */}
                            {shift.status.toUpperCase() === 'IN_PROGRESS' && shift.selectedDriverId && (
                              <button
                                onClick={() => navigate(`/haulier/tracking?tab=shifts&shiftId=${shift.shiftId}`)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-3 py-2 text-xs font-black text-white transition hover:bg-[#0e57a0]"
                              >
                                <span className="material-symbols-outlined text-[15px]">location_on</span>
                                Track Driver
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => handleCancel(shift.shiftId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                              >
                                <span className="material-symbols-outlined text-[15px]">cancel</span>
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {!loading && pagedShifts.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-2xl text-slate-400">search_off</span>
                      </div>
                      <p className="font-black text-[#44474C]">No {activeSection.label.toLowerCase()} shifts found</p>
                      <p className="text-sm text-slate-400">
                        {activeStatus === 'OPEN'
                          ? 'Post a new shift to start receiving quotes.'
                          : activeStatus === 'EXPIRED'
                          ? 'No expired shifts — all open shifts are still active.'
                          : 'Try another tab to see shifts with a different status.'}
                      </p>
                      {activeStatus === 'OPEN' && (
                        <button onClick={() => navigate('/haulier/shifts/post')} className="mt-1 rounded-2xl bg-[#1066b1] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0e57a0]">
                          Post New Shift
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
          <p className="text-xs font-bold text-slate-500">Showing {pagedShifts.length} of {filteredShifts.length} shifts</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((c) => Math.max(1, c - 1))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#44474C] transition hover:border-[#1066b1]/40 hover:text-[#1066b1] disabled:cursor-not-allowed disabled:opacity-50">
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

export default HaulierShiftsPage;
