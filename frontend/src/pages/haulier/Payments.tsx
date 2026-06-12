import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import haulierService from '../../api/haulierService';
import { fmtMoney as fmtCurrency } from '../../utils/currency';
import { useAuth } from '../../hooks/useAuth';

// ── Stripe types (CDN-loaded Stripe.js) ─────────────────────────────────────

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

interface StripeCardElement {
  mount: (el: HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (e: { error?: { message: string } }) => void) => void;
}

interface StripeElements {
  create: (type: 'card', options?: object) => StripeCardElement;
}

interface StripePaymentIntentResult {
  paymentIntent?: { id: string; status: string };
  error?: { message: string };
}

interface StripeInstance {
  elements: (options?: object) => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data?: { payment_method: string | { card: StripeCardElement } },
  ) => Promise<StripePaymentIntentResult>;
}

const loadStripeScript = (): Promise<void> => {
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Stripe.js failed to load'));
    document.body.appendChild(script);
  });
};

// ── Shared types ────────────────────────────────────────────────────────────

interface EscrowPaymentItem {
  paymentId: string;
  jobId: string;
  jobRef: string;
  pickupAddress?: string;
  dropAddress?: string;
  goodsType?: string;
  amount: number;
  currency: string;
  status: string;
  escrowedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

interface InvoiceItem {
  jobId: string;
  jobRef: string;
  invoiceUrl?: string;
  amount?: number;
  currency: string;
}

interface SpendSummary {
  totalSpent?: number;
  period?: string;
}

interface BookedJob {
  bookingId: string;
  jobRef: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number;
  distanceKm?: number;
  jobDate?: string;
  timeSlot?: string;
  agreedAmount?: number | null;
  currency?: string;
  paymentStatus?: string | null;
  isShift?: boolean;   // true when this payable item is a single-day shift, not a job
}

interface PaymentOrder {
  paymentId: string;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;       // driver's quoted amount (Stripe charge)
  driverAmount?: number;
  platformFee?: number;
  vatAmount?: number;
  totalAmount?: number; // quote + platform fee + VAT (invoice total)
  currency: string;
  publishableKey: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (value?: number | null, currency?: string) =>
  value != null ? fmtCurrency(value, currency) : '—';

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES: Record<string, string> = {
  ESCROWED: 'bg-indigo-100 text-indigo-700',
  RELEASED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-[#1066b1]/15 text-[#0a4a8f]',
  REFUNDED: 'bg-red-100 text-red-700',
  FAILED: 'bg-slate-100 text-[#44474C]',
};

const Empty: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
      <span className="material-symbols-outlined text-3xl text-slate-400">{icon}</span>
    </div>
    <div>
      <p className="font-black text-[#44474C]">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  </div>
);

type PaymentTab = 'create' | 'escrow' | 'history' | 'invoices' | 'methods';

const PAYMENT_TABS: { key: PaymentTab; label: string; icon: string }[] = [
  { key: 'create',   label: 'Pay Now',  icon: 'payments' },
  { key: 'escrow',   label: 'Secured',  icon: 'security' },
  { key: 'history',  label: 'History',  icon: 'receipt_long' },
  { key: 'invoices', label: 'Invoices', icon: 'description' },
  { key: 'methods',  label: 'Payment Setup',  icon: 'add_card' },
];

const getTabFromPath = (pathname: string): PaymentTab => {
  if (pathname.includes('/escrow'))   return 'escrow';
  if (pathname.includes('/history'))  return 'history';
  if (pathname.includes('/invoices')) return 'invoices';
  if (pathname.includes('/methods'))  return 'methods';
  return 'create';
};

// ── Stripe Payment Modal ─────────────────────────────────────────────────────

interface StripeModalProps {
  job: BookedJob;
  order: PaymentOrder;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

const StripePaymentModal: React.FC<StripeModalProps> = ({ job, order, onSuccess, onCancel, onError }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mountedCardRef = useRef<StripeCardElement | null>(null);
  const [stripeInstance, setStripeInstance] = useState<StripeInstance | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cardError, setCardError] = useState('');
  const isTest = order.publishableKey.startsWith('pk_test');

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        await loadStripeScript();
        if (!active) return;
        const stripe = window.Stripe!(order.publishableKey);
        setStripeInstance(stripe);
        if (cardRef.current) {
          const elements = stripe.elements();
          const card = elements.create('card', {
            style: {
              base: { fontSize: '15px', color: '#041627', '::placeholder': { color: '#94a3b8' } },
            },
          });
          card.mount(cardRef.current);
          card.on('change', (e) => setCardError(e.error?.message ?? ''));
          setCardElement(card);
          mountedCardRef.current = card;
        }
      } catch {
        onError('Failed to load payment SDK. Please refresh and try again.');
      }
    };
    void init();
    return () => {
      active = false;
      mountedCardRef.current?.unmount();
      mountedCardRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!stripeInstance || !cardElement) return;
    setConfirming(true);
    setCardError('');
    try {
      const result = await stripeInstance.confirmCardPayment(
        order.clientSecret,
        { payment_method: { card: cardElement } },
      );
      if (result.error) {
        setCardError(result.error.message);
        setConfirming(false);
        return;
      }
      const status = result.paymentIntent?.status;
      if (status === 'requires_capture' || status === 'succeeded') {
        if (job.isShift) {
          await haulierService.verifyShiftPayment(job.bookingId, result.paymentIntent!.id);
        } else {
          await haulierService.verifyPayment({ paymentIntentId: result.paymentIntent!.id });
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-[#041627]">Secure Payment</h3>
          <button onClick={onCancel} disabled={confirming} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-40">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-slate-500">Job</span>
            <span className="font-mono font-black text-[#041627]">{job.jobRef}</span>
          </div>
          {order.driverAmount != null && (
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-500">Driver Quote</span>
              <span className="font-black text-[#041627]">{fmtMoney(order.driverAmount, order.currency)}</span>
            </div>
          )}
          {order.platformFee != null && (
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-500">Platform Fee (12.5%)</span>
              <span className="font-black text-[#44474C]">{fmtMoney(order.platformFee, order.currency)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
            <span className="font-bold text-slate-500">Total You Pay</span>
            <span className="text-base font-black text-primary">
              {fmtMoney(order.totalAmount ?? order.amount, order.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-slate-500">Currency</span>
            <span className="font-black text-[#041627]">{order.currency.toUpperCase()}</span>
          </div>
        </div>

        {isTest && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">science</span>
            <div className="text-xs text-amber-800">
              <p className="font-black mb-0.5">Test Mode</p>
              <p className="font-medium">
                Use card <span className="font-mono font-black">4242 4242 4242 4242</span>, any future expiry, any 3-digit CVC.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card Details</label>
          <div ref={cardRef} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 min-h-[46px]" />
          {cardError && <p className="text-xs font-semibold text-red-600">{cardError}</p>}
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-sm text-indigo-400 mt-0.5 shrink-0">lock</span>
          <span>Funds are held securely and released to the driver only after delivery is approved.</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={confirming} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-[#44474C] hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={confirming || !stripeInstance || !cardElement}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">{confirming ? 'hourglass_top' : 'lock'}</span>
            {confirming ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Create Payment Tab ──────────────────────────────────────────────────────

const CreatePaymentTab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get('jobId');
  const preselectedShiftId = searchParams.get('shiftId');

  const [jobs, setJobs] = useState<BookedJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [payingJobId, setPayingJobId] = useState<string | null>(null);
  const [payError, setPayError] = useState('');
  const [successJobIds, setSuccessJobIds] = useState<Set<string>>(new Set());
  const [activeOrder, setActiveOrder] = useState<{ job: BookedJob; order: PaymentOrder } | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await haulierService.listAllBookings({ per_page: 100 }) as {
        items?: BookedJob[];
        total?: number;
      };
      const all = result.items ?? [];
      
      // If we have a preselected jobId from URL, we should also check if it's in OPEN jobs
      let openJob: BookedJob | null = null;
      if (preselectedJobId) {
        const found = all.find(j => j.bookingId === preselectedJobId);
        if (!found) {
          try {
            const jobRes = await haulierService.getJobDetails(preselectedJobId);
            if (jobRes && jobRes.status === 'OPEN') {
              openJob = {
                bookingId: jobRes.jobId,
                jobRef: jobRes.jobReference || jobRes.jobRef,
                status: 'OPEN',
                pickupAddress: jobRes.pickupLocation || jobRes.pickupAddress,
                dropAddress: jobRes.dropLocation || jobRes.dropAddress,
                goodsType: jobRes.goodsType,
                vehicleType: jobRes.vehicleTypeRequired || jobRes.vehicleType,
                weightKg: jobRes.weightKg,
                distanceKm: jobRes.distanceKm,
                jobDate: jobRes.jobDate,
                timeSlot: jobRes.timeSlot,
                agreedAmount: null,
                paymentStatus: null
              };
            }
          } catch (e) {
            console.error("Failed to fetch open job details", e);
          }
        }
      }

      const pending = all.filter(
        (j) =>
          (j.status === 'BOOKED' || j.status === 'PAYMENT_PENDING') &&
          j.paymentStatus !== 'ESCROWED' &&
          j.paymentStatus !== 'RELEASED',
      );
      
      if (openJob && !pending.find(j => j.bookingId === openJob!.bookingId)) {
        pending.unshift(openJob);
      }

      // Single-day shift payment (job-style): if redirected here with ?shiftId=,
      // load that shift and show it as a payable item alongside jobs.
      if (preselectedShiftId) {
        try {
          const shift = await haulierService.getShiftDetails(preselectedShiftId);
          const payStatus = shift?.paymentStatus as string | null | undefined;
          if (shift && payStatus !== 'ESCROWED' && payStatus !== 'RELEASED') {
            pending.unshift({
              bookingId: shift.shiftId,
              jobRef: shift.shiftRef,
              status: shift.status,
              pickupAddress: shift.reportingLocation || shift.pickupAddress,
              dropAddress: shift.dropAddress,
              goodsType: shift.goodsType,
              jobDate: shift.startDate,
              timeSlot: shift.jobTime,
              agreedAmount: shift.dailyRate ?? null,
              currency: shift.currency,
              paymentStatus: payStatus ?? null,
              isShift: true,
            });
          }
        } catch (e) {
          console.error('Failed to fetch shift for payment', e);
        }
      }

      setJobs(pending);
      setTotalJobs(pending.length);
      setFetchError('');
    } catch {
      setFetchError('Failed to load booked jobs.');
    } finally {
      setLoading(false);
    }
  }, [preselectedJobId, preselectedShiftId]);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if ((preselectedJobId || preselectedShiftId) && !loading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [preselectedJobId, preselectedShiftId, loading]);

  const handleSecurePayment = async (job: BookedJob) => {
    setPayingJobId(job.bookingId);
    setPayError('');
    try {
      let order: PaymentOrder;
      if (job.isShift) {
        const s = await haulierService.initiateShiftPayment(job.bookingId);
        // Map the shift order into the shared PaymentOrder shape used by the modal.
        order = {
          paymentId: s.paymentId,
          paymentIntentId: s.gatewayOrderId,
          clientSecret: s.clientSecret,
          amount: s.amount,
          driverAmount: s.driverAmount,
          platformFee: s.platformFee,
          totalAmount: s.amount,
          currency: s.currency,
          publishableKey: s.publishableKey,
        };
      } else {
        order = await haulierService.initiatePayment({ bookingId: job.bookingId }) as PaymentOrder;
      }
      setActiveOrder({ job, order });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
      const detail =
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.detail ||
        axiosErr?.message ||
        'Please try again.';
      setPayError(`Failed to initiate payment: ${detail}`);
    } finally {
      setPayingJobId(null);
    }
  };

  const pendingJobs = jobs.filter((j) => !successJobIds.has(j.bookingId));

  return (
    <div className="space-y-6">
      {activeOrder && (
        <StripePaymentModal
          job={activeOrder.job}
          order={activeOrder.order}
          onSuccess={() => {
            setSuccessJobIds((prev) => new Set(prev).add(activeOrder.job.bookingId));
            setJobs((prev) => prev.filter((j) => j.bookingId !== activeOrder.job.bookingId));
            setActiveOrder(null);
          }}
          onCancel={() => setActiveOrder(null)}
          onError={(msg) => { setPayError(msg); setActiveOrder(null); }}
        />
      )}
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-6 relative overflow-hidden">
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-white/10 text-[140px] pointer-events-none">payments</span>
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Awaiting Payment</p>
          <p className="text-4xl font-black">{loading ? '...' : pendingJobs.length}</p>
          <p className="text-indigo-200 text-xs mt-2 font-medium">Booked jobs without secured payment</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Booked</p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : totalJobs}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Jobs in BOOKED status</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Secured This Session</p>
            <p className="text-4xl font-black text-emerald-700">{successJobIds.size}</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-white border border-[#1066b1]/25 rounded-xl px-4 py-4">
        <span className="material-symbols-outlined text-[#1066b1] shrink-0 text-base mt-0.5">info</span>
        <div className="text-xs text-[#083d7a] font-medium leading-relaxed">
          <strong>How it works:</strong> Click &ldquo;Secure Payment&rdquo; on a job to lock funds via Stripe.
          Once secured, the driver can begin the trip. Payment releases to the driver after delivery is approved.
        </div>
      </div>

      {/* Success banner */}
      {successJobIds.size > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
          <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
          <div>
            <p className="text-sm font-black text-emerald-700">
              {successJobIds.size} payment{successJobIds.size > 1 ? 's' : ''} secured successfully
            </p>
            {false && <p className="text-xs text-emerald-600 mt-0.5">
              The driver(s) can now verify the load code and start their trip.
            </p>}
          </div>
        </div>
      )}

      {/* Pay error */}
      {payError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-red-500 text-lg">error</span>
          <p className="text-sm font-semibold text-red-700">{payError}</p>
          <button
            onClick={() => setPayError('')}
            className="ml-auto text-red-400 hover:text-red-600"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Jobs list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(26,43,60,0.05)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Booked Jobs — Payment Pending</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select a job below to secure payment via Stripe</p>
          </div>
          <button
            onClick={() => void fetchJobs()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#44474C] hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
            <span className="text-sm font-bold">Loading jobs…</span>
          </div>
        ) : fetchError ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{fetchError}</div>
        ) : pendingJobs.length === 0 ? (
          <Empty
            icon="task_alt"
            title="All payments secured"
            sub="No booked jobs are awaiting payment. Check back after new bookings are made."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingJobs.map((job) => {
              const isHighlighted = job.bookingId === preselectedJobId || job.bookingId === preselectedShiftId;
              const isPaying = payingJobId === job.bookingId;
              const isOpen = job.status === 'OPEN';
              
              return (
                <div
                  key={job.bookingId}
                  id={`job-${job.bookingId}`}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={`p-5 transition-colors ${isHighlighted ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50/60'}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isHighlighted ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        <span className={`material-symbols-outlined text-lg ${isHighlighted ? 'text-indigo-600' : 'text-slate-500'}`}>
                          local_shipping
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-base font-black text-[#041627]">{job.jobRef}</span>
                          {isHighlighted && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                              Selected
                            </span>
                          )}
                          <span className={`rounded-full ${isOpen ? 'bg-amber-100 text-amber-700' : 'bg-[#1066b1]/15 text-[#0a4a8f]'} px-2 py-0.5 text-[10px] font-black uppercase tracking-widest`}>
                            {isOpen ? 'Awaiting Bids' : 'Payment Pending'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          <div className="flex items-start gap-1.5">
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400"></span>
                            <p className="text-sm font-bold text-[#44474C]">{job.pickupAddress ?? 'Pickup N/A'}</p>
                          </div>
                          <div className="ml-[5px] h-3 w-px bg-slate-200"></div>
                          <div className="flex items-start gap-1.5">
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400"></span>
                            <p className="text-sm text-slate-500">{job.dropAddress ?? 'Drop N/A'}</p>
                          </div>
                        </div>
                        {isOpen && (
                          <p className="mt-2 text-xs font-medium text-amber-600 italic">
                            Next step: Accept a bid to secure payment.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-1 text-xs">
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Goods</p>
                          <p className="font-bold text-[#44474C]">{job.goodsType ?? '—'}</p>
                        </div>

                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Date</p>
                          <p className="font-bold text-[#44474C]">{fmtDate(job.jobDate)}</p>
                        </div>
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Amount</p>
                          <p className="font-bold text-[#44474C]">{job.agreedAmount != null ? fmtMoney(job.agreedAmount, job.currency) : '—'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => void handleSecurePayment(job)}
                        disabled={isPaying || payingJobId !== null || isOpen}
                        className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all shadow-md ${
                          isOpen
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : isPaying
                            ? 'bg-indigo-400 text-white cursor-wait'
                            : payingJobId !== null
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isPaying ? 'hourglass_top' : isOpen ? 'info' : 'lock'}
                        </span>
                        {isPaying ? 'Opening…' : isOpen ? 'Awaiting Bids' : 'Secure Payment'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Escrow Tab ───────────────────────────────────────────────────────────────

const EscrowTab: React.FC = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency;
  const [items, setItems] = useState<EscrowPaymentItem[]>([]);
  const [summary, setSummary] = useState<SpendSummary>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState('');
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, summaryRes] = await Promise.all([
        haulierService.getPaymentHistory({ status: 'ESCROWED', page, per_page: PER_PAGE }),
        haulierService.getSpendSummary(),
      ]);

      const historyData = historyRes as { items?: EscrowPaymentItem[]; total?: number };
      const summaryData = summaryRes as SpendSummary & { summary?: SpendSummary };

      setItems(historyData.items ?? []);
      setTotal(historyData.total ?? 0);
      setSummary({
        totalSpent: summaryData.totalSpent ?? summaryData.summary?.totalSpent ?? 0,
        period: summaryData.period ?? summaryData.summary?.period,
      });
      setError('');
    } catch {
      setError('Failed to load escrow data.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleRefund = async (jobId: string, jobRef: string) => {
    if (!window.confirm(`Request a refund for job #${jobRef}? This will cancel the escrow and return funds to your account.`)) return;
    setRefundingId(jobId);
    setRefundError('');
    try {
      await haulierService.requestRefund(jobId);
      void fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Refund request failed. Please try again.';
      setRefundError(msg);
    } finally {
      setRefundingId(null);
    }
  };

  const escrowTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total Spent {summary.period ? `- ${summary.period}` : ''}
          </p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : fmtMoney(summary.totalSpent, items[0]?.currency ?? userCurrency)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Spend summary from backend</p>
        </div>
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-6 relative overflow-hidden">
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-white/10 text-[140px] pointer-events-none">lock</span>
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Secured Funds</p>
          <p className="text-4xl font-black">{loading ? '...' : fmtMoney(escrowTotal, items[0]?.currency ?? userCurrency)}</p>
          <p className="text-indigo-200 text-xs mt-2 font-medium">Held until delivery is approved — {total} active record{total !== 1 ? 's' : ''}.</p>
        </div>
      </div>

      {refundError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {refundError}
        </div>
      )}

      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-4">
        <span className="material-symbols-outlined text-indigo-500 shrink-0 text-base mt-0.5">info</span>
        <p className="text-xs text-indigo-800 font-medium leading-relaxed">
          Payments are secured once a job is fully paid. Funds are released to the driver after you approve delivery.
        </p>
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="security" title="No secured payments" sub="Secured payments appear here once you pay for a booked job." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Route', 'Goods', 'Amount', 'Secured On', 'Status' /* , 'Actions' — refund column hidden, not removed */].map((header) => (
                    <th key={header} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.paymentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{item.jobRef || '—'}</td>
                    <td className="px-5 py-4 max-w-[180px]">
                      <p className="text-xs font-bold text-[#44474C] truncate">{item.pickupAddress || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">→ {item.dropAddress || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#44474C] font-medium">{item.goodsType || '—'}</td>
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount, item.currency)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.escrowedAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_STYLES[item.status?.toUpperCase()] || 'bg-slate-100 text-[#44474C]'}`}>
                        {item.status}
                      </span>
                    </td>
                    {/* Refund column hidden (kept for future use, not removed)
                    <td className="px-5 py-4">
                      {item.status?.toUpperCase() === 'ESCROWED' && (
                        <button
                          onClick={() => void handleRefund(item.jobId, item.jobRef)}
                          disabled={refundingId === item.jobId}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                        >
                          {refundingId === item.jobId
                            ? <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined text-xs">undo</span>}
                          Refund
                        </button>
                      )}
                    </td>
                    */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((v) => v - 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Prev</button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">Page {page} of {Math.ceil(total / PER_PAGE)}</span>
          <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage((v) => v + 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  );
};

// ── History Tab ─────────────────────────────────────────────────────────────

const HistoryTab: React.FC = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency;
  const [items, setItems] = useState<EscrowPaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: PER_PAGE };
      if (statusFilter) params.status = statusFilter;
      const response = await haulierService.getPaymentHistory(params) as { items?: EscrowPaymentItem[]; total?: number };
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setError('');
    } catch {
      setError('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalPaid = items.filter((i) => i.status === 'RELEASED').reduce((s, i) => s + i.amount, 0);
  const totalEscrowed = items.filter((i) => i.status === 'ESCROWED').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: total, money: false, color: 'text-primary' },
          { label: 'Released', value: totalPaid, money: true, color: 'text-emerald-600' },
          { label: 'Secured', value: totalEscrowed, money: true, color: 'text-indigo-600' },
          { label: 'This Page', value: items.length, money: false, color: 'text-[#44474C]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_4px_rgba(26,43,60,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>
              {loading ? '...' : stat.money ? fmtMoney(stat.value as number, items[0]?.currency ?? userCurrency) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Filter</label>
        {[
          {value: '',          label: 'All'},
          {value: 'ESCROWED',  label: 'Secured'},
          {value: 'RELEASED',  label: 'Released'},
          {value: 'REFUNDED',  label: 'Refunded'},
          {value: 'PENDING',   label: 'Pending'},
        ].map(({value, label}) => (
          <button
            key={value || 'ALL'}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${statusFilter === value ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-slate-200 text-[#44474C] hover:border-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="receipt_long" title="No payment records" sub="Your transaction history will appear here once jobs are paid." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Route', 'Amount', 'Currency', 'Status', 'Secured On', 'Released', 'Created'].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.paymentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{item.jobRef || '—'}</td>
                    <td className="px-5 py-4 max-w-[180px]">
                      <p className="text-xs font-bold text-[#44474C] truncate">{item.pickupAddress || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">→ {item.dropAddress || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount, item.currency)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{item.currency}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_STYLES[item.status?.toUpperCase()] || 'bg-slate-100 text-[#44474C]'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.escrowedAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.releasedAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((v) => v - 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Prev</button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">Page {page} of {Math.ceil(total / PER_PAGE)}</span>
          <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage((v) => v + 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  );
};

// ── Invoices Tab ─────────────────────────────────────────────────────────────

const InvoicesTab: React.FC = () => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await haulierService.listInvoices({ page, per_page: PER_PAGE }) as { items?: InvoiceItem[]; total?: number };
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setError('');
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Invoices</p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : total}</p>
        </div>
        <div className="bg-gradient-to-br from-[#1066b1]/10 to-[#1066b1]/10 border border-[#1066b1]/25 rounded-2xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-[#1066b1] text-3xl">description</span>
          <div>
            <p className="text-[10px] font-black text-[#0d55a0] uppercase tracking-widest mb-0.5">Auto-Generated</p>
            <p className="text-xs text-[#083d7a] font-medium leading-relaxed">
              Invoices are generated when a job payment is secured. Download as PDF for your records.
            </p>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="description" title="No invoices yet" sub="Invoices are generated automatically when payment is secured for a job." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Amount', 'Currency', 'Invoice', 'Download'].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((invoice) => (
                  <tr key={invoice.jobId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-primary">#{invoice.jobRef}</td>
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(invoice.amount, invoice.currency)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{invoice.currency}</td>
                    <td className="px-5 py-4">
                      {invoice.invoiceUrl ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#1066b1]/15 text-[#0a4a8f]">
                          <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.invoiceUrl ? (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black hover:opacity-90 transition-colors shadow-sm shadow-primary/20"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          PDF
                        </a>
                      ) : (
                        <button
                          onClick={async () => {
                            try { await haulierService.downloadInvoicePDF(invoice.jobId); await fetchData(); }
                            catch { setError('Failed to generate invoice.'); }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[#44474C] text-xs font-black hover:bg-slate-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((v) => v - 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Prev</button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">Page {page} of {Math.ceil(total / PER_PAGE)}</span>
          <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage((v) => v + 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-[#44474C] disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  );
};

// ── Methods Tab ──────────────────────────────────────────────────────────────

// ── Saved card type ──────────────────────────────────────────────────────────

interface SavedCard {
  paymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string;
}

const CARD_BRAND_ICON: Record<string, string> = {
  Visa: 'credit_card',
  Mastercard: 'credit_card',
  Amex: 'credit_card',
  Discover: 'credit_card',
};

const MethodsTab: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mountedCardRef = useRef<StripeCardElement | null>(null);
  const [stripeInstance, setStripeInstance] = useState<StripeInstance | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await haulierService.listSavedCards() as { cards?: SavedCard[] };
      setCards(res.cards ?? []);
    } catch {
      setError('Failed to load saved cards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCards(); }, [fetchCards]);

  // Mount Stripe card element when form opens
  useEffect(() => {
    if (!showForm) {
      mountedCardRef.current?.unmount();
      mountedCardRef.current = null;
      setCardElement(null);
      setStripeInstance(null);
      setCardError('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadStripeScript();
        if (cancelled) return;
        const intent = await haulierService.createSetupIntent() as { clientSecret: string; publishableKey: string };
        if (cancelled || !cardRef.current) return;
        const stripe = window.Stripe!(intent.publishableKey);
        setStripeInstance(stripe);
        // Store client_secret for confirmCardSetup
        (cardRef.current as any).__clientSecret = intent.clientSecret;
        const elements = stripe.elements();
        const card = elements.create('card', {
          style: { base: { fontSize: '15px', color: '#041627', fontFamily: 'inherit', '::placeholder': { color: '#94a3b8' } } },
          hidePostalCode: true,
        });
        card.mount(cardRef.current);
        card.on('change', (e) => setCardError(e.error?.message ?? ''));
        setCardElement(card);
        mountedCardRef.current = card;
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load card form.');
      }
    })();
    return () => { cancelled = true; };
  }, [showForm]);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeInstance || !cardElement || !cardRef.current) return;
    const clientSecret = (cardRef.current as any).__clientSecret as string;
    setSaving(true);
    setCardError('');
    setError('');
    try {
      const result = await (stripeInstance as any).confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (result.error) {
        setCardError(result.error.message ?? 'Card setup failed.');
      } else {
        setSuccess('Card saved successfully.');
        setShowForm(false);
        await fetchCards();
      }
    } catch {
      setCardError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pmId: string) => {
    setDeleting(pmId);
    setError('');
    try {
      await haulierService.deleteSavedCard(pmId);
      await fetchCards();
    } catch {
      setError('Failed to remove card.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header card ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-black text-[#041627] mb-1">Payment Setup</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Save a card to pay for jobs. Your card details are encrypted and stored securely by Stripe — FlexiShift never sees your full card number.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
            <span className="material-symbols-outlined text-sm text-slate-400">lock</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stripe Secured</span>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-4">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            <p className="text-xs font-semibold text-emerald-700">{success}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
            <span className="material-symbols-outlined text-sm text-red-500">error</span>
            <p className="text-xs font-semibold text-red-600">{error}</p>
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => { setSuccess(''); setError(''); setShowForm(true); }}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">add_card</span>
            Add New Card
          </button>
        ) : (
          <form onSubmit={(e) => void handleSaveCard(e)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Card Details</label>
              <div
                ref={cardRef}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 min-h-[46px] transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
              />
              {cardError && <p className="mt-1.5 text-xs font-semibold text-red-600">{cardError}</p>}
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              Test card: <span className="font-mono font-black text-slate-600">4242 4242 4242 4242</span> · any future date · any 3-digit CVC
            </p>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !stripeInstance || !cardElement}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">{saving ? 'hourglass_top' : 'save'}</span>
                {saving ? 'Saving…' : !stripeInstance ? 'Loading…' : 'Save Card'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Saved cards list ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Saved Cards</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading ? '…' : `${cards.length} card${cards.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <button
            onClick={() => void fetchCards()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#44474C] hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span className="text-sm font-bold">Loading…</span>
          </div>
        ) : cards.length === 0 ? (
          <Empty icon="credit_card" title="No cards saved" sub="Add a card above to pay for jobs quickly." />
        ) : (
          <div className="divide-y divide-slate-100">
            {cards.map((card) => (
              <div key={card.paymentMethodId} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <span className="material-symbols-outlined text-lg text-primary">
                      {CARD_BRAND_ICON[card.brand] ?? 'credit_card'}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-[#041627] text-sm">
                      {card.brand} •••• {card.last4}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {card.funding} · Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleDelete(card.paymentMethodId)}
                  disabled={deleting === card.paymentMethodId}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">
                    {deleting === card.paymentMethodId ? 'hourglass_top' : 'delete'}
                  </span>
                  {deleting === card.paymentMethodId ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Page shell ───────────────────────────────────────────────────────────────

const HaulierPaymentsPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<PaymentTab>(() => getTabFromPath(location.pathname));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">Payments</h2>
        <p className="text-slate-500 font-medium mt-1">Secure job payments, view payment history, and configure bank accounts.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 inline-flex gap-1 shadow-[0_2px_8px_rgba(26,43,60,0.05)] flex-wrap">
        {PAYMENT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-500 hover:text-[#041627] hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'create'   && <CreatePaymentTab />}
      {activeTab === 'escrow'   && <EscrowTab />}
      {activeTab === 'history'  && <HistoryTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'methods'  && <MethodsTab />}
    </div>
  );
};

export default HaulierPaymentsPage;
