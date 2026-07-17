import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import haulierService from '../../api/haulierService';

// ── Razorpay types ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color: string };
}

interface RazorpayInstance {
  open: () => void;
}

const loadRazorpayScript = (): Promise<void> => {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
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

interface PaymentMethodItem {
  methodId: string;
  type?: string;
  accountNumber?: string;
}

interface SpendSummary {
  totalSpent?: number;
  period?: string;
}

interface MethodFormState {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
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
  paymentStatus?: string | null;
}

interface PaymentOrder {
  paymentId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (value?: number | null) =>
  value != null ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const methodTail = (methodId: string) => {
  const parts = methodId.split('_');
  const tail = parts[parts.length - 1] || methodId;
  return tail.length > 4 ? tail.slice(-4) : tail;
};

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
  { key: 'escrow',   label: 'Escrow',   icon: 'security' },
  { key: 'history',  label: 'History',  icon: 'receipt_long' },
  { key: 'invoices', label: 'Invoices', icon: 'description' },
  { key: 'methods',  label: 'Methods',  icon: 'account_balance' },
];

const getTabFromPath = (pathname: string): PaymentTab => {
  if (pathname.includes('/escrow'))   return 'escrow';
  if (pathname.includes('/history'))  return 'history';
  if (pathname.includes('/invoices')) return 'invoices';
  if (pathname.includes('/methods'))  return 'methods';
  return 'create';
};

// ── Create Payment Tab ──────────────────────────────────────────────────────

const CreatePaymentTab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get('jobId');

  const [jobs, setJobs] = useState<BookedJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [payingJobId, setPayingJobId] = useState<string | null>(null);
  const [payError, setPayError] = useState('');
  const [successJobIds, setSuccessJobIds] = useState<Set<string>>(new Set());
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await haulierService.listAllBookings({ per_page: 100 }) as {
        items?: BookedJob[];
        total?: number;
      };
      const all = result.items ?? [];
      // Show jobs where payment has not yet been secured (BOOKED or stuck PAYMENT_PENDING)
      const pending = all.filter(
        (j) =>
          (j.status === 'BOOKED' || j.status === 'PAYMENT_PENDING') &&
          j.paymentStatus !== 'ESCROWED' &&
          j.paymentStatus !== 'RELEASED',
      );
      setJobs(pending);
      setTotalJobs(pending.length);
      setFetchError('');
    } catch {
      setFetchError('Failed to load booked jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if (preselectedJobId && !loading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [preselectedJobId, loading]);

  const handleSecurePayment = async (job: BookedJob) => {
    setPayingJobId(job.bookingId);
    setPayError('');
    try {
      const order = await haulierService.initiatePayment({ bookingId: job.bookingId }) as PaymentOrder;

      if (order.keyId === 'mock_rzp_key') {
        // Razorpay not configured — simulate payment in sandbox mode
        await haulierService.verifyPayment({
          razorpayOrderId: order.gatewayOrderId,
          razorpayPaymentId: `mock_pay_${Date.now()}`,
          razorpaySignature: 'mock_signature',
        });
        setSuccessJobIds((prev) => new Set(prev).add(job.bookingId));
        setJobs((prev) => prev.filter((j) => j.bookingId !== job.bookingId));
        setPayingJobId(null);
        return;
      }

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR',
        order_id: order.gatewayOrderId,
        name: 'FreightFlex',
        description: `Secure payment for job ${job.jobRef}`,
        handler: async (response) => {
          try {
            await haulierService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setSuccessJobIds((prev) => new Set(prev).add(job.bookingId));
            setJobs((prev) => prev.filter((j) => j.bookingId !== job.bookingId));
          } catch {
            setPayError(`Payment verification failed for ${job.jobRef}. Contact support if amount was deducted.`);
          } finally {
            setPayingJobId(null);
          }
        },
        modal: { ondismiss: () => setPayingJobId(null) },
        theme: { color: '#1A2B3C' },
      });
      rzp.open();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; detail?: string } } };
      const detail =
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.detail ||
        'Please try again.';
      setPayError(`Failed to initiate payment: ${detail}`);
      setPayingJobId(null);
    }
  };

  const pendingJobs = jobs.filter((j) => !successJobIds.has(j.bookingId));

  return (
    <div className="space-y-6">
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
          <strong>How it works:</strong> Click &ldquo;Secure Payment&rdquo; on a job to lock funds in escrow via Razorpay.
          Once secured, the driver can enter the load code and begin the trip. Payment releases to the driver after delivery is approved.
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
            <p className="text-xs text-emerald-600 mt-0.5">
              The driver(s) can now verify the load code and start their trip.
            </p>
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
            <p className="text-xs text-slate-400 mt-0.5">Select a job below to secure payment via Razorpay</p>
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
              const isHighlighted = job.bookingId === preselectedJobId;
              const isPaying = payingJobId === job.bookingId;
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
                          <span className="rounded-full bg-[#1066b1]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0a4a8f]">
                            Payment Pending
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
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-1 text-xs">
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Goods</p>
                          <p className="font-bold text-[#44474C]">{job.goodsType ?? '—'}</p>
                        </div>
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Vehicle</p>
                          <p className="font-bold text-[#44474C]">{job.vehicleType ?? '—'}</p>
                        </div>
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Date</p>
                          <p className="font-bold text-[#44474C]">{fmtDate(job.jobDate)}</p>
                        </div>
                        <div>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Amount</p>
                          <p className="font-bold text-[#44474C]">{job.agreedAmount != null ? fmtMoney(job.agreedAmount) : '—'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => void handleSecurePayment(job)}
                        disabled={isPaying || payingJobId !== null}
                        className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all shadow-md ${
                          isPaying
                            ? 'bg-indigo-400 text-white cursor-wait'
                            : payingJobId !== null
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isPaying ? 'hourglass_top' : 'lock'}
                        </span>
                        {isPaying ? 'Opening…' : 'Secure Payment'}
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
  const [items, setItems] = useState<EscrowPaymentItem[]>([]);
  const [summary, setSummary] = useState<SpendSummary>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
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

  const escrowTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total Spent {summary.period ? `- ${summary.period}` : ''}
          </p>
          <p className="text-4xl font-black text-primary">{loading ? '...' : fmtMoney(summary.totalSpent)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Spend summary from backend</p>
        </div>
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-6 relative overflow-hidden">
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-white/10 text-[140px] pointer-events-none">lock</span>
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Funds in Escrow</p>
          <p className="text-4xl font-black">{loading ? '...' : fmtMoney(escrowTotal)}</p>
          <p className="text-indigo-200 text-xs mt-2 font-medium">Held until delivery is approved — {total} active escrow record{total !== 1 ? 's' : ''}.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-4">
        <span className="material-symbols-outlined text-indigo-500 shrink-0 text-base mt-0.5">info</span>
        <p className="text-xs text-indigo-800 font-medium leading-relaxed">
          Payments are held in escrow once a job is fully paid. Funds are released to the driver after you approve delivery.
        </p>
      </div>

      <div className={`bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-[0_2px_8px_rgba(26,43,60,0.05)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {error ? (
          <div className="p-6 text-red-600 text-sm font-semibold">{error}</div>
        ) : items.length === 0 && !loading ? (
          <Empty icon="security" title="No funds in escrow" sub="Escrow payments appear here once you secure payment for a booked job." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Ref', 'Route', 'Goods', 'Amount', 'Escrowed On', 'Status'].map((header) => (
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
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(item.escrowedAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_STYLES[item.status?.toUpperCase()] || 'bg-slate-100 text-[#44474C]'}`}>
                        {item.status}
                      </span>
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

// ── History Tab ─────────────────────────────────────────────────────────────

const HistoryTab: React.FC = () => {
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
          { label: 'In Escrow', value: totalEscrowed, money: true, color: 'text-indigo-600' },
          { label: 'This Page', value: items.length, money: false, color: 'text-[#44474C]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_4px_rgba(26,43,60,0.04)]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>
              {loading ? '...' : stat.money ? fmtMoney(stat.value as number) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Filter</label>
        {['', 'ESCROWED', 'RELEASED', 'REFUNDED', 'PENDING'].map((status) => (
          <button
            key={status || 'ALL'}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${statusFilter === status ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-slate-200 text-[#44474C] hover:border-slate-300'}`}
          >
            {status || 'All'}
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
                  {['Job Ref', 'Route', 'Amount', 'Currency', 'Status', 'Escrowed', 'Released', 'Created'].map((h) => (
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
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(item.amount)}</td>
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
                    <td className="px-5 py-4 text-sm font-black text-primary">{fmtMoney(invoice.amount)}</td>
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

const MethodsTab: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState<MethodFormState>({ accountName: '', accountNumber: '', ifscCode: '' });

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await haulierService.listPaymentMethods() as { methods?: PaymentMethodItem[] };
      setMethods(res.methods ?? []);
    } catch {
      setFormError('Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMethods(); }, [fetchMethods]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.accountName.trim() || !form.accountNumber.trim() || !form.ifscCode.trim()) {
      setFormError('All three fields are required.');
      return;
    }
    setSaving(true);
    try {
      await haulierService.addPaymentMethod({
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
      });
      setForm({ accountName: '', accountNumber: '', ifscCode: '' });
      setFormSuccess('Payment method added successfully.');
      await fetchMethods();
    } catch {
      setFormError('Failed to add payment method.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    setDeleting(methodId);
    try {
      await haulierService.deletePaymentMethod(methodId);
      await fetchMethods();
    } catch {
      setFormError('Failed to remove payment method.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
        <h3 className="text-lg font-black text-[#041627] mb-1">Add Bank Account</h3>
        <p className="text-xs text-slate-500 mb-5">
          Add a bank account to receive released payments after delivery approval.
        </p>

        <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'accountName' as const, label: 'Account Name', placeholder: 'Company / holder name' },
              { key: 'accountNumber' as const, label: 'Account Number', placeholder: '1234567890' },
              { key: 'ifscCode' as const, label: 'IFSC Code', placeholder: 'ABCD0123456' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#041627] placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
            ))}
          </div>

          {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}
          {formSuccess && <p className="text-xs font-semibold text-emerald-600">{formSuccess}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">{saving ? 'hourglass_top' : 'add_circle'}</span>
            {saving ? 'Saving…' : 'Add Account'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(26,43,60,0.04)]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Saved Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">{loading ? '…' : methods.length} bank account{methods.length !== 1 ? 's' : ''} linked</p>
          </div>
          <button onClick={() => void fetchMethods()} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#44474C] hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span className="text-sm font-bold">Loading…</span>
          </div>
        ) : methods.length === 0 ? (
          <Empty icon="account_balance" title="No accounts linked" sub="Add a bank account above to receive payouts when jobs complete." />
        ) : (
          <div className="divide-y divide-slate-100">
            {methods.map((method) => (
              <div key={method.methodId} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <span className="material-symbols-outlined text-lg text-indigo-600">account_balance</span>
                  </div>
                  <div>
                    <p className="font-black text-[#041627] text-sm">**** **** {methodTail(method.methodId)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                      {(method.type || 'bank_account').replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleDelete(method.methodId)}
                  disabled={deleting === method.methodId}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">{deleting === method.methodId ? 'hourglass_top' : 'delete'}</span>
                  {deleting === method.methodId ? 'Removing…' : 'Remove'}
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
        <p className="text-slate-500 font-medium mt-1">Secure job payments, manage escrow, view history, and configure bank accounts.</p>
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
