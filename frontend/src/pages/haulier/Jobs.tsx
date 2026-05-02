import React, { useState, useCallback } from 'react';
import { useHaulierJobs } from '../../hooks/useHaulier';
import haulierService from '../../api/haulierService';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type ApiJob = {
  jobId: string;
  jobRef?: string;
  jobReference?: string;
  pickupAddress?: string;
  pickupLocation?: string;
  dropAddress?: string;
  dropLocation?: string;
  status?: string;
  distanceKm?: number;
  goodsType?: string;
  weightKg?: number;
  vehicleType?: string;
  vehicleTypeRequired?: string;
  jobDate?: string;
};

type Quote = {
  quoteId: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  quoteAmount?: number;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
};

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const VEHICLE_TYPES = [
  'VAN', '7.5T LORRY', '18T LORRY', 'ARTIC',
  'FLATBED', 'CURTAINSIDER', 'TIPPER', 'REFRIGERATED',
];

const TIME_SLOTS = [
  { value: 'MORNING',   label: 'Morning (06:00–12:00)' },
  { value: 'AFTERNOON', label: 'Afternoon (12:00–18:00)' },
  { value: 'EVENING',   label: 'Evening (18:00–22:00)' },
  { value: 'FULL_DAY',  label: 'Full Day' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN:               'bg-blue-100 text-blue-700',
  BOOKED:             'bg-indigo-100 text-indigo-700',
  IN_TRANSIT:         'bg-emerald-100 text-emerald-700',
  COMPLETED:          'bg-green-100 text-green-700',
  CANCELLED:          'bg-red-100 text-red-700',
  DISPUTED:           'bg-orange-100 text-orange-700',
  PAYMENT_PENDING:    'bg-amber-100 text-amber-700',
  PAYMENT_SECURED:    'bg-teal-100 text-teal-700',
  DELIVERY_SUBMITTED: 'bg-purple-100 text-purple-700',
};

/* ─── Form state ──────────────────────────────────────────────────────────────── */

interface FormState {
  pickupAddress: string;
  dropAddress: string;
  goodsType: string;
  weightKg: string;
  vehicleType: string;
  jobDate: string;
  timeSlot: string;
}

const EMPTY: FormState = {
  pickupAddress: '',
  dropAddress: '',
  goodsType: '',
  weightKg: '',
  vehicleType: 'VAN',
  jobDate: '',
  timeSlot: 'MORNING',
};

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm ' +
  'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400';

const selectCls =
  'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm ' +
  'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all';

const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
    {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const StepDot: React.FC<{ n: number; current: number; label: string }> = ({ n, current, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
      current > n  ? 'bg-emerald-500 text-white' :
      current === n ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                     'bg-slate-100 text-slate-400'
    }`}>
      {current > n
        ? <span className="material-symbols-outlined text-sm">check</span>
        : n}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${current === n ? 'text-primary' : 'text-slate-400'}`}>
      {label}
    </span>
  </div>
);

/* ─── Quotes panel ────────────────────────────────────────────────────────────── */

const QuotesPanel: React.FC<{ jobId: string; jobStatus?: string; onAccepted: () => void }> = ({
  jobId, jobStatus, onAccepted,
}) => {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await haulierService.listQuotesForJob(jobId) as { items?: Quote[]; quotes?: Quote[] };
      setQuotes(res?.items ?? res?.quotes ?? []);
    } catch {
      setError('Failed to load quotes.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  React.useEffect(() => { void load(); }, [load]);

  const accept = async (quoteId: string) => {
    setAccepting(quoteId);
    setError('');
    try {
      await haulierService.acceptQuote(jobId, quoteId);
      onAccepted();
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to accept quote.');
    } finally {
      setAccepting(null);
    }
  };

  if (loading) return (
    <div className="py-4 flex justify-center">
      <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
    </div>
  );

  if (error) return (
    <div className="py-3 px-4 bg-red-50 text-red-600 text-sm font-semibold rounded-xl">{error}</div>
  );

  if (!quotes?.length) return (
    <div className="py-4 text-center text-sm text-slate-400 font-medium">
      No quotes received yet. Drivers will bid on this job.
    </div>
  );

  return (
    <div className="space-y-3">
      {quotes.map(q => {
        const amount = q.quoteAmount ?? q.amount ?? 0;
        const currency = q.currency ?? 'INR';
        const isActive = (q.status ?? '').toUpperCase() === 'ACTIVE';
        const canAccept = jobStatus?.toUpperCase() === 'OPEN' && isActive;

        return (
          <div key={q.quoteId} className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base text-primary">person</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">
                  {q.supplierName ?? 'Driver'}
                </p>
                {q.supplierPhone && (
                  <p className="text-xs text-slate-400">{q.supplierPhone}</p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-base font-black text-primary">
                {currency} {Number(amount).toLocaleString()}
              </p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isActive ? 'bg-blue-100 text-blue-700' :
                (q.status ?? '').toUpperCase() === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {q.status ?? 'active'}
              </span>
            </div>

            {canAccept && (
              <button
                onClick={() => void accept(q.quoteId)}
                disabled={accepting === q.quoteId}
                className="shrink-0 bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {accepting === q.quoteId
                  ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-sm">check_circle</span>
                }
                Accept
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─── Main component ──────────────────────────────────────────────────────────── */

const HaulierJobsPage: React.FC = () => {
  const [params] = useState({ page: 1 });
  const { data, loading, error, refresh } = useHaulierJobs(params);
  const jobs = data?.jobs ?? [];

  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  /* post modal */
  const [isOpen,     setIsOpen]     = useState(false);
  const [step,       setStep]       = useState(1);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [formError,  setFormError]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created,    setCreated]    = useState<{
    jobRef: string; loadCode?: string; distanceKm?: number;
    pickup: string; drop: string;
  } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const validateStep = (): string => {
    if (step === 1) {
      if (!form.pickupAddress.trim()) return 'Pickup address is required.';
      if (!form.dropAddress.trim())   return 'Drop-off address is required.';
    }
    if (step === 2) {
      if (!form.goodsType.trim())                        return 'Goods type is required.';
      if (!form.weightKg || Number(form.weightKg) <= 0)  return 'Enter a valid weight.';
      if (!form.jobDate)                                 return 'Job date is required.';
      if (form.jobDate < today)                          return 'Job date cannot be in the past.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await haulierService.createJob({
        pickupAddress: form.pickupAddress.trim(),
        dropAddress:   form.dropAddress.trim(),
        goodsType:     form.goodsType.trim(),
        weightKg:      parseFloat(form.weightKg),
        vehicleType:   form.vehicleType,
        jobDate:       form.jobDate,
        timeSlot:      form.timeSlot,
      }) as {
        jobRef?: string; jobReference?: string; loadCode?: string;
        distanceKm?: number; pickupAddress?: string; dropAddress?: string;
        pickupLocation?: string; dropLocation?: string;
      };
      setCreated({
        jobRef:     res?.jobRef ?? res?.jobReference ?? 'N/A',
        loadCode:   res?.loadCode,
        distanceKm: res?.distanceKm,
        pickup:     res?.pickupLocation ?? res?.pickupAddress ?? form.pickupAddress,
        drop:       res?.dropLocation ?? res?.dropAddress ?? form.dropAddress,
      });
      refresh();
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { message?: string; detail?: string } } })?.response;
      setFormError(r?.data?.message ?? r?.data?.detail ?? 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal  = () => { setStep(1); setForm(EMPTY); setFormError(''); setCreated(null); setIsOpen(true); };
  const closeModal = () => { setIsOpen(false); setStep(1); setForm(EMPTY); setFormError(''); setCreated(null); };

  if (error) return (
    <div className="p-8 text-red-600 font-bold bg-red-50 rounded-xl border border-red-200">{error}</div>
  );

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Active Shipments</h2>
          <p className="text-on-surface-variant font-medium">Manage jobs and review driver quotes.</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-amber-400 transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Post New Job
        </button>
      </div>

      {/* Jobs list */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] overflow-hidden border border-slate-100 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>

        {jobs.length === 0 && !loading ? (
          <div className="px-6 py-20 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-slate-400">local_shipping</span>
            </div>
            <p className="font-black text-slate-600">No shipments yet</p>
            <p className="text-sm text-slate-400">Post your first job to get quotes from drivers.</p>
            <button
              onClick={openModal}
              className="mt-1 bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-amber-400 transition-colors"
            >
              Post New Job
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {jobs.map(job => {
              const j = job as ApiJob;
              const jobId    = j.jobId;
              const ref      = j.jobReference ?? j.jobRef ?? jobId;
              const pickup   = j.pickupLocation ?? j.pickupAddress ?? '';
              const drop     = j.dropLocation ?? j.dropAddress ?? '';
              const statusKey = (j.status ?? '').toUpperCase();
              const isOpen   = statusKey === 'OPEN';
              const expanded = expandedJob === jobId;

              return (
                <div key={jobId}>
                  {/* Job row */}
                  <div
                    className="px-6 py-5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setExpandedJob(expanded ? null : jobId)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Route */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary truncate">{pickup || '—'}</p>
                        <p className="text-xs text-slate-400 truncate">
                          <span className="text-slate-300">→</span> {drop || '—'}
                        </p>
                      </div>
                      {/* Ref */}
                      <div className="hidden sm:block w-32 shrink-0">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-0.5">Ref</p>
                        <p className="text-sm font-mono text-slate-600">#{ref}</p>
                      </div>
                      {/* Goods */}
                      <div className="hidden md:block w-32 shrink-0">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-0.5">Goods</p>
                        <p className="text-sm text-slate-600">{j.goodsType ?? '—'}</p>
                      </div>
                      {/* Status */}
                      <div className="shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLORS[statusKey] ?? 'bg-slate-100 text-slate-600'}`}>
                          {(j.status ?? '').replace(/_/g, ' ')}
                        </span>
                      </div>
                      {/* Chevron */}
                      <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Quotes panel */}
                  {expanded && (
                    <div className="px-6 pb-5 pt-1 bg-slate-50/50 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          Driver Quotes
                        </p>
                        {isOpen && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Click Accept to book a driver
                          </span>
                        )}
                      </div>
                      <QuotesPanel
                        jobId={jobId}
                        jobStatus={j.status}
                        onAccepted={() => { refresh(); setExpandedJob(null); }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── POST JOB MODAL ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh]">

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-primary">Post New Job</h3>
                <p className="text-xs text-slate-400 mt-0.5">Fill in the details — we'll find drivers for you.</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!created && (
              <div className="px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-4 inset-x-0 h-0.5 bg-slate-100" />
                  <div className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-300" style={{ width: step === 1 ? '0%' : '100%' }} />
                  <StepDot n={1} current={step} label="Route" />
                  <StepDot n={2} current={step} label="Cargo" />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {created ? (
                <div className="flex flex-col items-center text-center gap-5 py-2">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-primary">Job Posted!</h4>
                    <p className="text-sm text-slate-500 mt-1">Your job is live — drivers are being notified now.</p>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-left">
                    <Row label="Job Reference" value={<span className="font-mono text-primary">{created.jobRef}</span>} />
                    {created.loadCode && <Row label="Load Code" value={<span className="font-mono text-primary">{created.loadCode}</span>} />}
                    {created.distanceKm != null && <Row label="Route Distance" value={`${created.distanceKm} km`} />}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <Row label="Pickup"   value={created.pickup} small />
                      <Row label="Drop-off" value={created.drop}   small />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Quotes typically arrive within 15 minutes.</p>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className="space-y-4">
                      <SectionHead icon="location_on" iconBg="bg-blue-50" iconColor="text-blue-600" title="Pickup Location" />
                      <div>
                        <Label text="Pickup Address" required />
                        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="e.g. 14 Industrial Way, Manchester" value={form.pickupAddress} onChange={set('pickupAddress')} />
                      </div>
                      <div className="h-px bg-slate-100" />
                      <SectionHead icon="flag" iconBg="bg-red-50" iconColor="text-red-500" title="Drop-off Location" />
                      <div>
                        <Label text="Drop-off Address" required />
                        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="e.g. Warehouse B, Leeds" value={form.dropAddress} onChange={set('dropAddress')} />
                      </div>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-4">
                      <SectionHead icon="inventory_2" iconBg="bg-amber-50" iconColor="text-amber-600" title="Cargo & Schedule" />
                      <div>
                        <Label text="Goods Type" required />
                        <input className={inputCls} placeholder="e.g. Palletised Goods, Machinery" value={form.goodsType} onChange={set('goodsType')} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label text="Weight (kg)" required />
                          <input className={inputCls} type="number" min="1" placeholder="e.g. 1200" value={form.weightKg} onChange={set('weightKg')} />
                        </div>
                        <div>
                          <Label text="Vehicle Type" required />
                          <select className={selectCls} value={form.vehicleType} onChange={set('vehicleType')}>
                            {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label text="Job Date" required />
                          <input className={inputCls} type="date" min={today} value={form.jobDate} onChange={set('jobDate')} />
                        </div>
                        <div>
                          <Label text="Time Slot" required />
                          <select className={selectCls} value={form.timeSlot} onChange={set('timeSlot')}>
                            {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {formError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                      <span className="material-symbols-outlined text-sm text-red-500 mt-0.5 shrink-0">error</span>
                      <p className="text-sm text-red-600 font-semibold">{formError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-5 border-t border-slate-100 shrink-0 flex justify-between items-center gap-3">
              {created ? (
                <button onClick={closeModal} className="w-full bg-primary text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition-colors">Done</button>
              ) : (
                <>
                  <button
                    onClick={() => { setFormError(''); step === 1 ? closeModal() : setStep(1); }}
                    className="px-5 py-3 text-sm font-black text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {step === 1 ? (
                    <button onClick={next} className="px-6 py-3 text-sm font-black text-white bg-primary rounded-xl hover:opacity-90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                      Next <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => void submit()}
                      disabled={submitting}
                      className="px-6 py-3 text-sm font-black text-slate-900 bg-amber-500 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20 min-w-[120px] justify-center"
                    >
                      {submitting
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Posting…</>
                        : <><span className="material-symbols-outlined text-sm">send</span> Post Job</>
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Shared helpers ──────────────────────────────────────────────────────────── */

const SectionHead: React.FC<{ icon: string; iconBg: string; iconColor: string; title: string }> = ({ icon, iconBg, iconColor, title }) => (
  <div className="flex items-center gap-2">
    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
      <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
    </div>
    <p className="font-black text-slate-700 text-sm">{title}</p>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode; small?: boolean }> = ({ label, value, small }) => (
  <div className="flex justify-between items-start gap-3">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
    <span className={`${small ? 'text-xs' : 'text-sm'} font-bold text-slate-700 text-right`}>{value}</span>
  </div>
);

export default HaulierJobsPage;
