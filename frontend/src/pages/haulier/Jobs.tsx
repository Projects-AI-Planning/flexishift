import React, { useState } from 'react';
import { useHaulierJobs } from '../../hooks/useHaulier';
import haulierService from '../../api/haulierService';
import type { Job } from '../../types';

type JobLocation = string | Job['pickupLocation'];

type ExtendedJob = Omit<Job, 'pickupLocation' | 'dropLocation'> & {
  jobReference: string;
  pickupLocation: JobLocation;
  dropLocation: JobLocation;
};

const VEHICLE_TYPES = ['VAN', '7.5T LORRY', '18T LORRY', 'ARTIC', 'FLATBED', 'CURTAINSIDER', 'TIPPER', 'REFRIGERATED'];
const TIME_SLOTS = [
  { value: 'MORNING', label: 'Morning (06:00–12:00)' },
  { value: 'AFTERNOON', label: 'Afternoon (12:00–18:00)' },
  { value: 'EVENING', label: 'Evening (18:00–22:00)' },
  { value: 'FULL_DAY', label: 'Full Day' },
];

const EMPTY_FORM = {
  pickupAddress: '', pickupLat: '', pickupLng: '',
  dropAddress: '', dropLat: '', dropLng: '',
  goodsType: '', weightKg: '', vehicleType: 'VAN',
  jobDate: '', timeSlot: 'MORNING',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  BOOKED: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_SECURED: 'bg-teal-100 text-teal-700',
  DELIVERY_SUBMITTED: 'bg-purple-100 text-purple-700',
};

type FormData = typeof EMPTY_FORM;

const StepIndicator: React.FC<{ step: number; current: number; label: string }> = ({ step, current, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
      current > step ? 'bg-green-500 text-white' :
      current === step ? 'bg-primary text-white shadow-lg shadow-primary/30' :
      'bg-slate-100 text-slate-400'
    }`}>
      {current > step ? <span className="material-symbols-outlined text-sm">check</span> : step}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${current === step ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
  </div>
);

const Field: React.FC<{
  label: string; required?: boolean; children: React.ReactNode; half?: boolean;
}> = ({ label, required, children, half }) => (
  <div className={half ? 'flex-1' : ''}>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all";
const selectCls = "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none";

const HaulierJobsPage: React.FC = () => {
  const [params] = useState({ page: 1 });
  const { data, loading, error, refresh } = useHaulierJobs(params);

  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successJob, setSuccessJob] = useState<{ jobRef: string; loadCode?: string } | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const today = new Date().toISOString().split('T')[0];

  const validateStep = () => {
    if (step === 1) {
      if (!form.pickupAddress.trim()) return 'Pickup address is required';
      if (!form.pickupLat || !form.pickupLng) return 'Pickup coordinates are required';
    }
    if (step === 2) {
      if (!form.dropAddress.trim()) return 'Drop-off address is required';
      if (!form.dropLat || !form.dropLng) return 'Drop-off coordinates are required';
    }
    if (step === 3) {
      if (!form.goodsType.trim()) return 'Goods type is required';
      if (!form.weightKg || Number(form.weightKg) <= 0) return 'Valid weight is required';
      if (!form.jobDate) return 'Job date is required';
      if (form.jobDate < today) return 'Job date cannot be in the past';
    }
    return '';
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const result = await haulierService.createJob({
        pickupAddress: form.pickupAddress,
        pickupLat: parseFloat(form.pickupLat),
        pickupLng: parseFloat(form.pickupLng),
        dropAddress: form.dropAddress,
        dropLat: parseFloat(form.dropLat),
        dropLng: parseFloat(form.dropLng),
        goodsType: form.goodsType,
        weightKg: parseFloat(form.weightKg),
        vehicleType: form.vehicleType,
        jobDate: form.jobDate,
        timeSlot: form.timeSlot,
      });
      setSuccessJob({ jobRef: result?.jobRef ?? 'N/A', loadCode: result?.loadCode });
      refresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      setFormError(msg?.message ?? msg?.detail ?? 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsPostJobOpen(false);
    setStep(1);
    setForm(EMPTY_FORM);
    setFormError('');
    setSuccessJob(null);
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Active Shipments</h2>
          <p className="text-on-surface-variant font-medium">Tracking and managing your assigned freight.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Data
          </button>
          <button
            onClick={() => { setIsPostJobOpen(true); setStep(1); setForm(EMPTY_FORM); setFormError(''); setSuccessJob(null); }}
            className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-amber-400 transition-colors shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Post New Job
          </button>
        </div>
      </div>

      {/* Quick-quote banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-slate-900">bolt</span>
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-800 text-sm">Need a fast quote?</p>
          <p className="text-xs text-slate-600 font-medium">Post a new job to our network and get responses in under 15 minutes.</p>
        </div>
        <button
          onClick={() => { setIsPostJobOpen(true); setStep(1); setForm(EMPTY_FORM); setFormError(''); setSuccessJob(null); }}
          className="shrink-0 bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-amber-400 transition-colors"
        >
          Post New Job
        </button>
      </div>

      {/* Shipments Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] overflow-hidden border border-slate-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.jobs as ExtendedJob[])?.length ? (
                (data?.jobs as ExtendedJob[]).map((job) => (
                  <tr key={job.jobId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">
                          {typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address}
                          {' → '}
                          {typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Freight</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 font-mono">#{job.jobReference ?? job.jobRef}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary text-[8px]">
                          {job.driver?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm text-primary font-bold">{job.driver?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-primary">£{job.agreedAmount ?? '—'}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLORS[job.status.toUpperCase()] ?? 'bg-slate-100 text-slate-600'}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-slate-400">local_shipping</span>
                      </div>
                      <p className="font-black text-slate-600">No shipments yet</p>
                      <p className="text-sm text-slate-400">Post your first job to get quotes from drivers.</p>
                      <button
                        onClick={() => setIsPostJobOpen(true)}
                        className="mt-1 bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-amber-400 transition-colors"
                      >
                        Post New Job
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Post New Job Modal ─────────────────────────────────────────────── */}
      {isPostJobOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] flex flex-col">

            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-primary">Post New Job</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Fill in the details to request quotes.</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Step indicator */}
            {!successJob && (
              <div className="px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 z-0" />
                  <div
                    className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-300"
                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                  />
                  <StepIndicator step={1} current={step} label="Pickup" />
                  <StepIndicator step={2} current={step} label="Drop-off" />
                  <StepIndicator step={3} current={step} label="Cargo" />
                </div>
              </div>
            )}

            {/* Modal body */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* ── SUCCESS ── */}
              {successJob ? (
                <div className="flex flex-col items-center text-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 border-2 border-green-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-primary">Job Posted!</h4>
                    <p className="text-sm text-slate-500 mt-1">Your job is now live and accepting quotes from drivers.</p>
                  </div>
                  <div className="w-full bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Reference</span>
                      <span className="text-sm font-black text-primary font-mono">{successJob.jobRef}</span>
                    </div>
                    {successJob.loadCode && (
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load Code</span>
                        <span className="text-sm font-black text-primary font-mono">{successJob.loadCode}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Quotes typically arrive within 15 minutes.</p>
                </div>
              ) : (

                <div className="space-y-4">

                  {/* ── STEP 1: Pickup ── */}
                  {step === 1 && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-blue-600">location_on</span>
                        </div>
                        <p className="font-black text-slate-700 text-sm">Pickup Location</p>
                      </div>
                      <Field label="Pickup Address" required>
                        <input
                          className={inputCls}
                          placeholder="e.g. 14 Industrial Way, Manchester, M1 2AB"
                          value={form.pickupAddress}
                          onChange={set('pickupAddress')}
                        />
                      </Field>
                      <div className="flex gap-3">
                        <Field label="Latitude" required half>
                          <input
                            className={inputCls}
                            type="number"
                            step="any"
                            placeholder="e.g. 53.4808"
                            value={form.pickupLat}
                            onChange={set('pickupLat')}
                          />
                        </Field>
                        <Field label="Longitude" required half>
                          <input
                            className={inputCls}
                            type="number"
                            step="any"
                            placeholder="e.g. -2.2426"
                            value={form.pickupLng}
                            onChange={set('pickupLng')}
                          />
                        </Field>
                      </div>
                      <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                        Use Google Maps or similar to find coordinates — right-click a location and copy the lat/lng.
                      </p>
                    </>
                  )}

                  {/* ── STEP 2: Drop-off ── */}
                  {step === 2 && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-red-500">flag</span>
                        </div>
                        <p className="font-black text-slate-700 text-sm">Drop-off Location</p>
                      </div>
                      <Field label="Drop-off Address" required>
                        <input
                          className={inputCls}
                          placeholder="e.g. Warehouse B, Leeds, LS1 4AP"
                          value={form.dropAddress}
                          onChange={set('dropAddress')}
                        />
                      </Field>
                      <div className="flex gap-3">
                        <Field label="Latitude" required half>
                          <input
                            className={inputCls}
                            type="number"
                            step="any"
                            placeholder="e.g. 53.8008"
                            value={form.dropLat}
                            onChange={set('dropLat')}
                          />
                        </Field>
                        <Field label="Longitude" required half>
                          <input
                            className={inputCls}
                            type="number"
                            step="any"
                            placeholder="e.g. -1.5491"
                            value={form.dropLng}
                            onChange={set('dropLng')}
                          />
                        </Field>
                      </div>
                      <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                        Use Google Maps or similar to find coordinates — right-click a location and copy the lat/lng.
                      </p>
                    </>
                  )}

                  {/* ── STEP 3: Cargo & Schedule ── */}
                  {step === 3 && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-amber-600">inventory_2</span>
                        </div>
                        <p className="font-black text-slate-700 text-sm">Cargo & Schedule</p>
                      </div>
                      <Field label="Goods Type" required>
                        <input
                          className={inputCls}
                          placeholder="e.g. Palletised Goods, Machinery, Food"
                          value={form.goodsType}
                          onChange={set('goodsType')}
                        />
                      </Field>
                      <div className="flex gap-3">
                        <Field label="Weight (kg)" required half>
                          <input
                            className={inputCls}
                            type="number"
                            min="1"
                            placeholder="e.g. 1200"
                            value={form.weightKg}
                            onChange={set('weightKg')}
                          />
                        </Field>
                        <Field label="Vehicle Type" required half>
                          <select className={selectCls} value={form.vehicleType} onChange={set('vehicleType')}>
                            {VEHICLE_TYPES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="flex gap-3">
                        <Field label="Job Date" required half>
                          <input
                            className={inputCls}
                            type="date"
                            min={today}
                            value={form.jobDate}
                            onChange={set('jobDate')}
                          />
                        </Field>
                        <Field label="Time Slot" required half>
                          <select className={selectCls} value={form.timeSlot} onChange={set('timeSlot')}>
                            {TIME_SLOTS.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {/* Error */}
                  {formError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                      <span className="material-symbols-outlined text-sm text-red-500">error</span>
                      <p className="text-sm text-red-600 font-bold">{formError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-6 border-t border-slate-100 shrink-0 flex justify-between items-center">
              {successJob ? (
                <button
                  onClick={closeModal}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-black text-sm hover:opacity-90 transition-colors"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setFormError(''); step === 1 ? closeModal() : setStep((s) => s - 1); }}
                    className="px-5 py-2.5 text-sm font-black text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {step < 3 ? (
                    <button
                      onClick={nextStep}
                      className="px-6 py-2.5 text-sm font-black text-white bg-primary rounded-xl hover:opacity-90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      Next
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-2.5 text-sm font-black text-slate-900 bg-amber-500 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                      Post Job
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

export default HaulierJobsPage;
