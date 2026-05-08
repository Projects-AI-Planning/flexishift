import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import haulierService from '../../api/haulierService';

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const VEHICLE_TYPES = [
  { value: 'VAN',           label: 'Van',              icon: 'local_shipping' },
  { value: '7.5T LORRY',    label: '7.5T Lorry',       icon: 'local_shipping' },
  { value: '18T LORRY',     label: '18T Lorry',        icon: 'local_shipping' },
  { value: 'ARTIC',         label: 'Articulated',      icon: 'local_shipping' },
  { value: 'FLATBED',       label: 'Flatbed',          icon: 'local_shipping' },
  { value: 'CURTAINSIDER',  label: 'Curtainsider',     icon: 'local_shipping' },
  { value: 'TIPPER',        label: 'Tipper',           icon: 'local_shipping' },
  { value: 'REFRIGERATED',  label: 'Refrigerated',     icon: 'ac_unit' },
];

const TIME_SLOTS = [
  { value: 'MORNING',   label: 'Morning',   sub: '06:00 – 12:00', icon: 'wb_sunny' },
  { value: 'AFTERNOON', label: 'Afternoon', sub: '12:00 – 18:00', icon: 'light_mode' },
  { value: 'EVENING',   label: 'Evening',   sub: '18:00 – 22:00', icon: 'nights_stay' },
  { value: 'FULL_DAY',  label: 'Full Day',  sub: '06:00 – 22:00', icon: 'schedule' },
];

const GOODS_SUGGESTIONS = [
  'Palletised Goods', 'Machinery', 'Refrigerated Food', 'Building Materials',
  'Electronics', 'Automotive Parts', 'Chemicals', 'Furniture', 'Textiles',
];

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface FormState {
  pickupAddress: string;
  dropAddress: string;
  goodsType: string;
  weightKg: string;
  vehicleType: string;
  jobDate: string;
  timeSlot: string;
  specialInstructions: string;
}

interface CreatedJob {
  jobRef: string;
  loadCode?: string;
  distanceKm?: number;
  durationMin?: number;
  pickup: string;
  drop: string;
  jobId?: string;
}

const EMPTY: FormState = {
  pickupAddress: '',
  dropAddress: '',
  goodsType: '',
  weightKg: '',
  vehicleType: 'VAN',
  jobDate: '',
  timeSlot: 'MORNING',
  specialInstructions: '',
};

/* ─── Shared styles ──────────────────────────────────────────────────────────── */

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm ' +
  'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ' +
  'placeholder:text-slate-400 text-slate-800';

const Label: React.FC<{ text: string; required?: boolean; hint?: string }> = ({ text, required, hint }) => (
  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
    {text}
    {required && <span className="text-red-500 ml-0.5">*</span>}
    {hint && <span className="ml-2 normal-case font-medium text-slate-400 tracking-normal">{hint}</span>}
  </label>
);

/* ─── Step indicator ─────────────────────────────────────────────────────────── */

const STEPS = ['Route', 'Cargo & Schedule', 'Review'];

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done = current > n;
      const active = current === n;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all
              ${done   ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' :
                active ? 'bg-primary text-white shadow-primary/30 shadow-md ring-4 ring-primary/10' :
                         'bg-slate-100 text-slate-400'}`}>
              {done
                ? <span className="material-symbols-outlined text-base">check</span>
                : n}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap
              ${active ? 'text-primary' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mt-[-12px] mx-2 transition-all
              ${current > n + 1 ? 'bg-emerald-400' : current > n ? 'bg-primary' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Main page ──────────────────────────────────────────────────────────────── */

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedJob | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setError('');
    };

  /* validation per step */
  const validate = (): string => {
    if (step === 1) {
      if (!form.pickupAddress.trim()) return 'Pickup address is required.';
      if (!form.dropAddress.trim())   return 'Drop-off address is required.';
      if (form.pickupAddress.trim().length < 5) return 'Please enter a full pickup address.';
      if (form.dropAddress.trim().length < 5)   return 'Please enter a full drop-off address.';
    }
    if (step === 2) {
      if (!form.goodsType.trim())                     return 'Goods type is required.';
      if (!form.weightKg || Number(form.weightKg) <= 0) return 'Enter a valid weight greater than 0.';
      if (!form.jobDate)                              return 'Job date is required.';
      if (form.jobDate < today)                       return 'Job date cannot be in the past.';
    }
    return '';
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    setSubmitting(true);
    setError('');
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
        jobId?: string; jobRef?: string; loadCode?: string;
        distanceKm?: number; durationMin?: number;
        pickupAddress?: string; dropAddress?: string;
      };
      setCreated({
        jobRef:      res?.jobRef ?? 'N/A',
        loadCode:    res?.loadCode,
        distanceKm:  res?.distanceKm,
        durationMin: res?.durationMin,
        pickup:      res?.pickupAddress ?? form.pickupAddress,
        drop:        res?.dropAddress   ?? form.dropAddress,
        jobId:       res?.jobId,
      });
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { message?: string; detail?: string } } })?.response;
      setError(r?.data?.message ?? r?.data?.detail ?? 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SUCCESS SCREEN ── */
  if (created) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 overflow-hidden">
          {/* green banner */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 sm:px-8 py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
            </div>
            <h2 className="text-3xl font-black text-white">Job Posted!</h2>
            <p className="text-emerald-100 mt-1.5 font-medium">
              Your freight job is live — drivers are being notified now.
            </p>
          </div>

          {/* details */}
          <div className="px-4 sm:px-8 py-8 space-y-6">
            {/* ref + load code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Reference</p>
                <p className="text-xl font-black text-primary font-mono">{created.jobRef}</p>
              </div>
              {created.loadCode && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Load Code</p>
                  <p className="text-xl font-black text-primary font-mono">{created.loadCode}</p>
                </div>
              )}
            </div>

            {/* route stats */}
            {(created.distanceKm != null || created.durationMin != null) && (
              <div className="flex gap-4">
                {created.distanceKm != null && (
                  <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">route</span>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Distance</p>
                      <p className="font-black text-blue-700">{created.distanceKm} km</p>
                    </div>
                  </div>
                )}
                {created.durationMin != null && (
                  <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500">schedule</span>
                    <div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Est. Duration</p>
                      <p className="font-black text-amber-700">{Math.round(created.durationMin / 60 * 10) / 10} hrs</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* route */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</p>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                  <span className="w-0.5 h-8 bg-slate-300" />
                  <span className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />
                </div>
                <div className="space-y-4 flex-1 min-w-0">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pickup</p>
                    <p className="text-sm font-bold text-slate-700">{created.pickup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Drop-off</p>
                    <p className="text-sm font-bold text-slate-700">{created.drop}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Quotes typically arrive within 15 minutes. You'll be notified when drivers respond.
            </p>

            {/* actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/haulier/jobs')}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition-colors"
              >
                View My Jobs
              </button>
              <button
                onClick={() => { setCreated(null); setForm(EMPTY); setStep(1); setError(''); }}
                className="flex-1 bg-amber-500 text-slate-900 py-3 rounded-xl font-black text-sm hover:bg-amber-400 transition-colors"
              >
                Post Another Job
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* page title */}
      <div>
        <h2 className="text-3xl font-black text-primary tracking-tight">Post a New Job</h2>
        <p className="text-slate-500 font-medium mt-1">
          Fill in your shipment details and receive quotes from our driver network.
        </p>
      </div>

      {/* step bar */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(26,43,60,0.06)] border border-slate-100 px-4 sm:px-8 py-6">
        <StepBar current={step} />
      </div>

      {/* form card */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 overflow-hidden">

        {/* ── STEP 1: Route ── */}
        {step === 1 && (
          <div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">route</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Route Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Enter pickup and drop-off addresses. We'll calculate the route automatically.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-8">
              {/* Pickup */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-xs">my_location</span>
                  </span>
                  <h4 className="font-black text-slate-700">Pickup Location</h4>
                </div>
                <div>
                  <Label text="Pickup Address" required />
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="e.g. 14 Industrial Way, Manchester, M1 2AB, United Kingdom"
                    value={form.pickupAddress}
                    onChange={set('pickupAddress')}
                  />
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Include street, city, and postcode for best results.</p>
                </div>
              </div>

              {/* connector */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-100" />
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400 text-sm">arrow_downward</span>
                </div>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Drop-off */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-xs">flag</span>
                  </span>
                  <h4 className="font-black text-slate-700">Drop-off Location</h4>
                </div>
                <div>
                  <Label text="Drop-off Address" required />
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="e.g. Warehouse B, Leeds Distribution Park, Leeds, LS1 4AP"
                    value={form.dropAddress}
                    onChange={set('dropAddress')}
                  />
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Include street, city, and postcode for best results.</p>
                </div>
              </div>

              {/* info box */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
                <span className="material-symbols-outlined text-blue-500 shrink-0 text-base mt-0.5">info</span>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  We automatically geocode your addresses using OpenStreetMap and calculate the exact driving distance and estimated duration. No manual coordinate entry needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Cargo & Schedule ── */}
        {step === 2 && (
          <div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-slate-900 text-sm">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Cargo & Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">Describe what needs to be shipped and when.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-7">
              {/* Goods type */}
              <div className="relative">
                <Label text="Goods Type" required />
                <input
                  className={inputCls}
                  placeholder="e.g. Palletised Goods, Refrigerated Food, Machinery…"
                  value={form.goodsType}
                  onChange={set('goodsType')}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {GOODS_SUGGESTIONS.filter(s => s.toLowerCase().includes(form.goodsType.toLowerCase())).slice(0, 6).map(s => (
                      <button
                        key={s}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 hover:text-amber-700 font-medium transition-colors"
                        onMouseDown={() => { setForm(f => ({ ...f, goodsType: s })); setShowSuggestions(false); }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Weight + Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label text="Total Weight" required hint="(kg)" />
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="e.g. 1200"
                    value={form.weightKg}
                    onChange={set('weightKg')}
                  />
                </div>
                <div>
                  <Label text="Vehicle Required" required />
                  <select className={inputCls} value={form.vehicleType} onChange={set('vehicleType')}>
                    {VEHICLE_TYPES.map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Job date */}
              <div>
                <Label text="Collection Date" required />
                <input
                  className={inputCls}
                  type="date"
                  min={today}
                  value={form.jobDate}
                  onChange={set('jobDate')}
                />
              </div>

              {/* Time slot */}
              <div>
                <Label text="Collection Time Slot" required />
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, timeSlot: t.value }))}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        form.timeSlot === t.value
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-xl ${form.timeSlot === t.value ? 'text-primary' : 'text-slate-400'}`}>
                        {t.icon}
                      </span>
                      <div>
                        <p className={`font-black text-sm ${form.timeSlot === t.value ? 'text-primary' : 'text-slate-700'}`}>{t.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{t.sub}</p>
                      </div>
                      {form.timeSlot === t.value && (
                        <span className="material-symbols-outlined text-primary text-base ml-auto">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <Label text="Special Instructions" hint="(optional)" />
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="e.g. Tail-lift required, fragile items, access restrictions…"
                  value={form.specialInstructions}
                  onChange={set('specialInstructions')}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">fact_check</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Review & Confirm</h3>
                  <p className="text-xs text-slate-500 font-medium">Check all details before posting to the network.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6">
              {/* Route */}
              <ReviewSection title="Route" icon="route" iconBg="bg-blue-50" iconColor="text-blue-500">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                    <span className="w-0.5 h-8 bg-slate-200" />
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
                      <p className="text-sm font-bold text-slate-700 leading-snug">{form.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop-off</p>
                      <p className="text-sm font-bold text-slate-700 leading-snug">{form.dropAddress}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary font-bold hover:underline shrink-0">Edit</button>
                </div>
              </ReviewSection>

              {/* Cargo */}
              <ReviewSection title="Cargo" icon="inventory_2" iconBg="bg-amber-50" iconColor="text-amber-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                  <ReviewRow label="Goods Type" value={form.goodsType} />
                  <ReviewRow label="Weight" value={`${form.weightKg} kg`} />
                  <ReviewRow label="Vehicle" value={VEHICLE_TYPES.find(v => v.value === form.vehicleType)?.label ?? form.vehicleType} />
                  <ReviewRow label="Date" value={form.jobDate} />
                  <ReviewRow label="Time Slot" value={TIME_SLOTS.find(t => t.value === form.timeSlot)?.label ?? form.timeSlot} />
                </div>
                {form.specialInstructions && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Special Instructions</p>
                    <p className="text-sm text-slate-700">{form.specialInstructions}</p>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setStep(2)} className="text-xs text-primary font-bold hover:underline">Edit</button>
                </div>
              </ReviewSection>

              {/* notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-500 shrink-0 text-base mt-0.5">bolt</span>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Once posted, your job will be visible to our network of verified drivers. You'll receive quotes within minutes and can accept the best offer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-8 mb-0 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
            <span className="material-symbols-outlined text-red-500 shrink-0 text-base mt-0.5">error</span>
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-8 py-6 border-t border-slate-100 flex justify-between items-center gap-4">
          <button
            onClick={step === 1 ? () => navigate('/haulier') : back}
            className="px-6 py-3 rounded-xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={next}
              className="px-8 py-3 rounded-xl text-sm font-black text-white bg-primary hover:opacity-90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              Continue
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="px-8 py-3 rounded-xl text-sm font-black text-slate-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 min-w-[150px] justify-center"
            >
              {submitting
                ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Posting…</>
                : <><span className="material-symbols-outlined text-sm">send</span> Post Job</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Review sub-components ──────────────────────────────────────────────────── */

const ReviewSection: React.FC<{
  title: string; icon: string; iconBg: string; iconColor: string;
  children: React.ReactNode;
}> = ({ title, icon, iconBg, iconColor, children }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <div className={`flex items-center gap-2 px-5 py-3 ${iconBg} border-b border-slate-200`}>
      <span className={`material-symbols-outlined text-base ${iconColor}`}>{icon}</span>
      <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-700 mt-0.5">{value || '—'}</p>
  </div>
);

export default PostJobPage;
