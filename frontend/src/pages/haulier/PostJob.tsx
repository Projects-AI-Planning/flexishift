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

const SLOT_END_HOURS: Record<string, number> = {
  MORNING: 12, AFTERNOON: 18, EVENING: 22, FULL_DAY: 22,
};

const DRIVER_REQUIREMENTS = [
  {
    value: 'DRIVER_ONLY',
    label: 'Driver Only',
    desc: 'Hire a driver — you provide the truck.',
    icon: 'person',
  },
  {
    value: 'DRIVER_WITH_TRUCK',
    label: 'Truck with Driver',
    desc: 'Hire a driver who brings their own truck.',
    icon: 'local_shipping',
  },
  {
    value: 'TRUCK_ONLY',
    label: 'Truck Only',
    desc: 'Hire a truck — no driver services needed.',
    icon: 'garage',
  },
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
  driverRequirement: string;
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
  driverRequirement: 'DRIVER_WITH_TRUCK',
};

/* ─── Shared styles ──────────────────────────────────────────────────────────── */

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm ' +
  'focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ' +
  'placeholder:text-slate-400 text-[#041627]';

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

  const isSlotExpired = (slot: string): boolean => {
    const endHour = SLOT_END_HOURS[slot];
    if (endHour === undefined) return false;
    return new Date().getHours() >= endHour;
  };

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
      if (!form.driverRequirement)                       return 'Please select a driver requirement.';
      if (!form.goodsType.trim())                        return 'Goods type is required.';
      if (!form.weightKg || Number(form.weightKg) <= 0)  return 'Enter a valid weight greater than 0.';
      if (!form.jobDate)                                 return 'Job date is required.';
      if (form.jobDate < today)                          return 'Job date cannot be in the past.';
      if (form.jobDate === today && isSlotExpired(form.timeSlot))
        return 'The selected time slot has already passed for today. Please choose a later slot.';
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
        pickupAddress:     form.pickupAddress.trim(),
        dropAddress:       form.dropAddress.trim(),
        goodsType:         form.goodsType.trim(),
        weightKg:          parseFloat(form.weightKg),
        vehicleType:       form.vehicleType,
        jobDate:           form.jobDate,
        timeSlot:          form.timeSlot,
        driverRequirement: form.driverRequirement,
      }) as {
        jobId?: string; jobReference?: string; loadCode?: string;
        distanceKm?: number; durationMin?: number;
        pickupLocation?: string; dropLocation?: string;
      };
      setCreated({
        jobRef:      res?.jobReference ?? 'N/A',
        loadCode:    res?.loadCode,
        distanceKm:  res?.distanceKm,
        durationMin: res?.durationMin,
        pickup:      res?.pickupLocation ?? form.pickupAddress,
        drop:        res?.dropLocation   ?? form.dropAddress,
        jobId:       res?.jobId,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; response?: { data?: { message?: string; detail?: string } } };
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        const r = err.response;
        setError(r?.data?.message ?? r?.data?.detail ?? 'Failed to post job. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SUCCESS SCREEN ── */
  if (created) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6">
        {/* Left: celebration card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Job Posted!</h2>
            <p className="text-emerald-100 mt-1.5 font-medium text-sm">
              Your freight job is live — drivers are being notified now.
            </p>
          </div>
          <div className="w-full space-y-3">
            <div className="bg-white/15 border border-white/20 rounded-xl p-4 text-left">
              <p className="text-[10px] font-black text-emerald-100/70 uppercase tracking-widest mb-1">Job Reference</p>
              <p className="text-2xl font-black text-white font-mono">{created.jobRef}</p>
            </div>
            {created.loadCode && (
              <div className="bg-white/15 border border-white/20 rounded-xl p-4 text-left">
                <p className="text-[10px] font-black text-emerald-100/70 uppercase tracking-widest mb-1">Load Code</p>
                <p className="text-2xl font-black text-white font-mono">{created.loadCode}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full mt-auto">
            <button
              onClick={() => navigate('/haulier/jobs')}
              className="flex-1 bg-white text-emerald-700 py-3 rounded-xl font-black text-sm hover:bg-emerald-50 transition-colors"
            >
              View My Jobs
            </button>
            <button
              onClick={() => { setCreated(null); setForm(EMPTY); setStep(1); setError(''); }}
              className="flex-1 bg-white/15 border border-white/20 text-white py-3 rounded-xl font-black text-sm hover:bg-white/25 transition-colors"
            >
              Post Another
            </button>
          </div>
        </div>

        {/* Right: details */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Job Details</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Quotes typically arrive within 15 minutes. You'll be notified when drivers respond.</p>
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
                <div className="flex-1 bg-white border border-[#1066b1]/15 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#1066b1]">schedule</span>
                  <div>
                    <p className="text-[10px] font-black text-[#1066b1] uppercase tracking-widest">Est. Duration</p>
                    <p className="font-black text-[#0a4a8f]">{Math.round(created.durationMin / 60 * 10) / 10} hrs</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* route */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100 shrink-0 mt-1" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pickup</p>
                  <p className="text-sm font-bold text-[#44474C]">{created.pickup}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 shrink-0 mt-1" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Drop-off</p>
                  <p className="text-sm font-bold text-[#44474C]">{created.drop}</p>
                </div>
              </div>
            </div>
          </div>

          {/* info */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
            <span className="material-symbols-outlined text-blue-500 shrink-0 text-base mt-0.5">notifications_active</span>
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              You'll receive a notification as soon as a driver submits a quote. Go to <strong>My Jobs</strong> to review and accept offers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="space-y-6">

      {/* page header + step bar */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(26,43,60,0.06)] border border-slate-100 px-4 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight sm:text-2xl">Post a New Job</h2>
          <p className="text-slate-500 font-medium mt-0.5 text-sm">
            Fill in your shipment details and receive quotes from our driver network.
          </p>
        </div>
        <div className="shrink-0">
          <StepBar current={step} />
        </div>
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
                  <h3 className="text-lg font-black text-[#041627]">Route Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Enter pickup and drop-off addresses. We'll calculate the route automatically.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6">
              {/* Pickup + Drop-off side by side on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xs">my_location</span>
                    </span>
                    <h4 className="font-black text-[#44474C]">Pickup Location</h4>
                  </div>
                  <div>
                    <Label text="Pickup Address" required />
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={4}
                      placeholder="e.g. 14 Industrial Way, Manchester, M1 2AB, United Kingdom"
                      value={form.pickupAddress}
                      onChange={set('pickupAddress')}
                    />
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Include street, city, and postcode for best results.</p>
                  </div>
                </div>

                {/* Drop-off */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xs">flag</span>
                    </span>
                    <h4 className="font-black text-[#44474C]">Drop-off Location</h4>
                  </div>
                  <div>
                    <Label text="Drop-off Address" required />
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={4}
                      placeholder="e.g. Warehouse B, Leeds Distribution Park, Leeds, LS1 4AP"
                      value={form.dropAddress}
                      onChange={set('dropAddress')}
                    />
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Include street, city, and postcode for best results.</p>
                  </div>
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
            <div className="bg-gradient-to-r from-[#1066b1]/10 to-[#1066b1]/10 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1066b1]/100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#041627] text-sm">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#041627]">Cargo & Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">Describe what needs to be shipped and when.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-7">

              {/* Driver Requirement */}
              <div>
                <Label text="Driver Requirement" required />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  {DRIVER_REQUIREMENTS.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, driverRequirement: r.value }))}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                        form.driverRequirement === r.value
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        form.driverRequirement === r.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined text-base">{r.icon}</span>
                      </div>
                      <div>
                        <p className={`font-black text-sm ${form.driverRequirement === r.value ? 'text-primary' : 'text-[#041627]'}`}>
                          {r.label}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">{r.desc}</p>
                      </div>
                      {form.driverRequirement === r.value && (
                        <span className="material-symbols-outlined text-primary text-base self-end ml-auto -mt-2">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#1066b1]/10 hover:text-[#0a4a8f] font-medium transition-colors"
                        onMouseDown={() => { setForm(f => ({ ...f, goodsType: s })); setShowSuggestions(false); }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Weight + Vehicle + Date — 3 columns on large screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              </div>

              {/* Time slot */}
              <div>
                <Label text="Collection Time Slot" required />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {TIME_SLOTS.map(t => {
                    const expired = form.jobDate === today && isSlotExpired(t.value);
                    const selected = form.timeSlot === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        disabled={expired}
                        onClick={() => !expired && setForm(f => ({ ...f, timeSlot: t.value }))}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          expired
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                            : selected
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-xl ${expired ? 'text-slate-300' : selected ? 'text-primary' : 'text-slate-400'}`}>
                          {t.icon}
                        </span>
                        <div>
                          <p className={`font-black text-sm ${expired ? 'text-slate-400' : selected ? 'text-primary' : 'text-[#44474C]'}`}>{t.label}</p>
                          <p className={`text-[10px] font-medium ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                            {expired ? 'Passed for today' : t.sub}
                          </p>
                        </div>
                        {selected && !expired && (
                          <span className="material-symbols-outlined text-primary text-base ml-auto">check_circle</span>
                        )}
                      </button>
                    );
                  })}
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
                  <h3 className="text-lg font-black text-[#041627]">Review & Confirm</h3>
                  <p className="text-xs text-slate-500 font-medium">Check all details before posting to the network.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-5">
              {/* Route + Cargo side by side on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Route */}
                <ReviewSection title="Route" icon="route" iconBg="bg-blue-50" iconColor="text-blue-500">
                  <div className="space-y-3 flex-1 min-w-0 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200 shrink-0 mt-1" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
                        <p className="text-sm font-bold text-[#44474C] leading-snug">{form.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 shrink-0 mt-1" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop-off</p>
                        <p className="text-sm font-bold text-[#44474C] leading-snug">{form.dropAddress}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary font-bold hover:underline">Edit Route</button>
                </ReviewSection>

                {/* Cargo summary */}
                <ReviewSection title="Cargo & Schedule" icon="inventory_2" iconBg="bg-[#1066b1]/10" iconColor="text-[#1066b1]">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                    <ReviewRow label="Requirement" value={DRIVER_REQUIREMENTS.find(r => r.value === form.driverRequirement)?.label ?? form.driverRequirement} />
                    <ReviewRow label="Goods Type"  value={form.goodsType} />
                    <ReviewRow label="Weight"      value={`${form.weightKg} kg`} />
                    <ReviewRow label="Vehicle"     value={VEHICLE_TYPES.find(v => v.value === form.vehicleType)?.label ?? form.vehicleType} />
                    <ReviewRow label="Date"        value={form.jobDate} />
                    <ReviewRow label="Time Slot"   value={TIME_SLOTS.find(t => t.value === form.timeSlot)?.label ?? form.timeSlot} />
                  </div>
                  {form.specialInstructions && (
                    <div className="pt-3 border-t border-slate-100 mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Special Instructions</p>
                      <p className="text-sm text-[#44474C]">{form.specialInstructions}</p>
                    </div>
                  )}
                  <button onClick={() => setStep(2)} className="text-xs text-primary font-bold hover:underline">Edit Cargo</button>
                </ReviewSection>
              </div>

              {/* notice */}
              <div className="bg-white border border-[#1066b1]/25 rounded-xl px-4 py-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#1066b1] shrink-0 text-base mt-0.5">bolt</span>
                <p className="text-xs text-[#083d7a] font-medium leading-relaxed">
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
        <div className="px-4 sm:px-8 py-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
          <button
            onClick={step === 1 ? () => navigate('/haulier') : back}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-[#44474C] bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={next}
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black text-white bg-primary hover:opacity-90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Continue
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black text-white bg-[#1066b1]/100 hover:bg-[#1066b1] transition-colors shadow-lg shadow-[#1066b1]/20 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
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
      <p className="text-xs font-black text-[#44474C] uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-[#44474C] mt-0.5">{value || '—'}</p>
  </div>
);

export default PostJobPage;
