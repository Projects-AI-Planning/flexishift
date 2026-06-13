import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import haulierService from '../../api/haulierService';
import { useAuth } from '../../hooks/useAuth';

/* ─── Constants ──────────────────────────────────────────────────────────────── */

/** Map a custom "HH:MM" time to the backend TimeSlot enum value. */
function timeToSlot(time: string): string {
  const h = parseInt(time.split(':')[0] ?? '0', 10);
  if (h >= 6  && h < 12) return 'MORNING';
  if (h >= 12 && h < 18) return 'AFTERNOON';
  if (h >= 18 && h < 22) return 'EVENING';
  return 'NIGHT';
}

const REQUIREMENT_OPTIONS = [
  { value: 'DRIVER_ONLY',       label: 'Driver Only',       desc: 'You provide the truck — hire a driver.',        icon: 'person'         },
  { value: 'TRUCK_WITH_DRIVER', label: 'Truck with Driver', desc: 'Driver brings their own truck.',                icon: 'local_shipping' },
  { value: 'TRUCK_ONLY',        label: 'Truck Only',        desc: 'Hire the vehicle — no driver services needed.', icon: 'garage'         },
];

/* ─── Types ──────────────────────────────────────────────────────────────────── */


interface FormState {
  goodsType:           string;
  reportingLocation:   string;
  startDate:           string;
  hoursPerDay:         string;
  timeSlot:            string;
  specialInstructions: string;
  requirementType:     string;
}

interface CreatedShift {
  shiftRef:  string;
  startDate: string;
  loadCode?: string;
  reportingLocation: string;
}

const EMPTY: FormState = {
  goodsType:           '',
  reportingLocation:   '',
  startDate:           '',
  hoursPerDay:         '8',
  timeSlot:            '',
  specialInstructions: '',
  requirementType:     'TRUCK_WITH_DRIVER',
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

/* ─── Address autocomplete input ─────────────────────────────────────────────── */

interface AddrSuggestion { description: string; placeId: string; isGoogle?: boolean; lat?: number | null; lng?: number | null; }

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({ value, onChange, placeholder }) => {
  const [inputVal, setInputVal]       = useState(value);
  const [suggestions, setSuggestions] = useState<AddrSuggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const debounceRef                   = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef                  = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setInputVal(value); }, [value]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await haulierService.addressAutocomplete(v);
        setSuggestions(res.predictions ?? []);
        setOpen(true);
      } catch { /* ignore */ }
    }, 350);
  };

  const selectSuggestion = async (s: AddrSuggestion) => {
    setOpen(false);
    setLoading(true);
    try {
      let lat: number | undefined, lng: number | undefined, address = s.description;
      if (s.lat != null && s.lng != null) {
        lat = s.lat; lng = s.lng;
      } else if (s.placeId && s.isGoogle) {
        const geo = await haulierService.getPlaceDetails(s.placeId);
        lat = geo.lat; lng = geo.lng; address = geo.formattedAddress ?? s.description;
      } else {
        const geo = await haulierService.validateAddress(s.description);
        lat = geo.lat; lng = geo.lng; address = geo.formattedAddress ?? s.description;
      }
      setInputVal(address);
      onChange(address, lat, lng);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleBlur = async () => {
    setTimeout(async () => {
      if (!open && inputVal.trim() && inputVal !== value) {
        setLoading(true);
        try {
          const geo = await haulierService.validateAddress(inputVal.trim());
          const address = geo.formattedAddress ?? inputVal.trim();
          setInputVal(address);
          onChange(address, geo.lat, geo.lng);
        } catch { /* ignore */ } finally { setLoading(false); }
      }
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">location_on</span>
        <input
          className={`${inputCls} pl-10 pr-8`}
          placeholder={placeholder ?? 'Search location…'}
          value={inputVal}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm animate-spin material-symbols-outlined text-base">progress_activity</span>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => selectSuggestion(s)}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-[#041627] border-b border-slate-100 last:border-0"
            >
              <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">location_on</span>
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─── Step indicator ─────────────────────────────────────────────────────────── */

const STEPS = ['Cargo & Schedule', 'Review'];

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done   = current > n;
      const active = current === n;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all
              ${done   ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' :
                active ? 'bg-primary text-white shadow-primary/30 shadow-md ring-4 ring-primary/10' :
                         'bg-slate-100 text-slate-400'}`}>
              {done ? <span className="material-symbols-outlined text-base">check</span> : n}
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

const PostShiftPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep]           = useState(2);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [reportingCoords, setReportingCoords] = useState<{ lat?: number; lng?: number }>({});
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated]     = useState<CreatedShift | null>(null);

  const _now  = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  /** Returns true if the user-chosen "HH:MM" time has already passed today. */
  const isTimePassed = (time: string): boolean => {
    if (!time) return false;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  };

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setError('');
    };

  /* ── Validation ── */
  const validate = (): string => {
    if (step === 2) {
      if (!form.requirementType)              return 'Please select a requirement type.';
      if (!form.goodsType.trim())             return 'Goods type is required.';
      if (!form.reportingLocation.trim())     return 'Reporting location is required.';
      if (!form.startDate)                    return 'Start date is required.';
      if (form.startDate < today)             return 'Start date cannot be in the past.';
      if (!form.hoursPerDay || Number(form.hoursPerDay) < 1 || Number(form.hoursPerDay) > 12)
        return 'Shift hours must be between 1 and 12.';
      if (!form.timeSlot)                     return 'Please select a delivery time.';
      if (form.startDate === today && isTimePassed(form.timeSlot))
        return 'The selected start time has already passed for today. Please choose a later time.';
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

  /* ── Submit ── */
  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await haulierService.createShift({
        requirementType:     form.requirementType,
        startDate:           form.startDate,
        endDate:             form.startDate,
        hoursPerDay:         Number(form.hoursPerDay),
        goodsType:           form.goodsType.trim(),
        reportingLocation:   form.reportingLocation.trim(),
        reportingLat:        reportingCoords.lat,
        reportingLng:        reportingCoords.lng,
        jobTime:             form.timeSlot,
        specialInstructions: form.specialInstructions.trim(),
      }) as { shiftRef?: string; startDate?: string; loadCode?: string; reportingLocation?: string; };

      setCreated({
        shiftRef:          res?.shiftRef  ?? 'N/A',
        startDate:         res?.startDate ?? form.startDate,
        loadCode:          res?.loadCode,
        reportingLocation: res?.reportingLocation ?? form.reportingLocation,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; response?: { data?: { message?: string; detail?: string } } };
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        const r = err.response;
        setError(r?.data?.message ?? r?.data?.detail ?? 'Failed to post shift. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Refresh approval status from server on mount ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (user?.role !== 'HAULIER' && user?.role !== 'FIRM') return;
    if (user?.isAdminApproved) return;
    import('../../api/client').then(({ default: client }) => {
      client.get('/profile/me').then((res) => {
        const approved = res.data?.data?.isAdminApproved;
        if (approved === true) updateUser({ isAdminApproved: true });
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── SUCCESS SCREEN ── */
  if (created) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6 animate-in fade-in duration-700">
        {/* Left — confirmation card */}
        <div className="bg-gradient-to-br from-[#1066b1] to-[#0a4a8f] rounded-3xl p-8 flex flex-col items-center text-center gap-6 shadow-[0_20px_50px_rgba(16,102,177,0.2)]">
          <div className="w-20 h-20 rounded-full bg-white/20 ring-8 ring-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Shift Posted!</h2>
            <p className="text-blue-100/90 mt-1.5 font-medium text-sm">
              Your shift is live — drivers can now view and submit quotes.
            </p>
          </div>
          <div className="w-full space-y-3">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-left backdrop-blur-sm">
              <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-widest mb-1">Shift Reference</p>
              <p className="text-2xl font-black text-white font-mono tracking-tight">{created.shiftRef}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-center">
                <p className="text-[9px] font-black text-blue-100/60 uppercase tracking-widest mb-0.5">Date</p>
                <p className="text-xs font-black text-white">{new Date(created.startDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-center">
                <p className="text-[9px] font-black text-blue-100/60 uppercase tracking-widest mb-0.5">Hours</p>
                <p className="text-xs font-black text-white">{form.hoursPerDay}h</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full mt-auto">
            <button
              onClick={() => navigate('/haulier/shifts')}
              className="w-full flex items-center justify-center gap-2 bg-white text-[#1066b1] py-3.5 rounded-xl font-black text-sm transition-all hover:bg-blue-50 shadow-xl shadow-black/10 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">event_note</span>
              View My Shifts
            </button>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/haulier/jobs')}
                className="flex-1 bg-white/15 border border-white/20 text-white py-3 rounded-xl font-black text-sm hover:bg-white/25 transition-colors"
              >
                View Jobs
              </button>
              <button
                onClick={() => {
                  setCreated(null);
                  setForm(EMPTY);
                  setReportingCoords({});
                  setStep(2);
                  setError('');
                }}
                className="flex-1 bg-[#0a4a8f]/40 border border-white/10 text-white py-3 rounded-xl font-black text-sm hover:bg-[#0a4a8f]/60 transition-colors"
              >
                Post Another
              </button>
            </div>
          </div>
        </div>

        {/* Right — details */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Shift Details</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Quotes from drivers typically arrive within 30 minutes. You'll be notified when drivers respond.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
                <p className="text-sm font-bold text-[#44474C]">{new Date(created.startDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Hours</p>
                <p className="text-sm font-bold text-[#44474C]">{form.hoursPerDay}h</p>
              </div>
            </div>
          </div>

          {created.reportingLocation && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Location</p>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100 shrink-0 mt-1" />
                <p className="text-sm font-bold text-[#44474C]">{created.reportingLocation}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
            <span className="material-symbols-outlined text-blue-500 shrink-0 text-base mt-0.5">notifications_active</span>
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              You'll receive a notification as soon as a driver submits a quote. Go to <strong>My Shifts</strong> to review and accept offers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── PENDING ADMIN APPROVAL ── */
  if (user?.isAdminApproved === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(16,102,177,0.12)] border border-[#1066b1]/20 p-10 max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#1066b1]/10 ring-8 ring-[#1066b1]/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[#1066b1] text-4xl">hourglass_top</span>
          </div>
          <h2 className="text-2xl font-black text-primary mb-3">Waiting for Admin Approval</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Your haulier account is currently under review by the admin. Once approved, you will be able to post shifts.
          </p>
          <div className="mt-6 bg-[#1066b1]/5 border border-[#1066b1]/20 rounded-2xl px-5 py-4 text-sm text-[#1066b1] font-medium flex items-center gap-3">
            <span className="material-symbols-outlined text-[#1066b1] text-lg shrink-0">info</span>
            You will be notified as soon as your account is approved.
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="space-y-6">

      {/* Page header + step bar */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(26,43,60,0.06)] border border-slate-100 px-4 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight sm:text-2xl">Post a New Shift</h2>
          <p className="text-slate-500 font-medium mt-0.5 text-sm">
            Schedule a shift and receive quotes from our driver network.
          </p>
        </div>
        <div className="shrink-0">
          <StepBar current={step - 1} />
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 overflow-hidden">

        {/* ── STEP 2: Cargo & Schedule ── */}
        {step === 2 && (
          <div>
            <div className="bg-gradient-to-r from-[#1066b1]/10 to-[#1066b1]/10 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1066b1] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#041627]">Cargo & Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">Describe what needs to be shipped and set the shift schedule.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-8">

              {/* ── Requirement Type ── */}
              <div>
                <Label text="Requirement Type" required />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  {REQUIREMENT_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, requirementType: r.value }))}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                        form.requirementType === r.value
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        form.requirementType === r.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined text-base">{r.icon}</span>
                      </div>
                      <div>
                        <p className={`font-black text-sm ${form.requirementType === r.value ? 'text-primary' : 'text-[#041627]'}`}>
                          {r.label}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">{r.desc}</p>
                      </div>
                      {form.requirementType === r.value && (
                        <span className="material-symbols-outlined text-primary text-base self-end ml-auto -mt-2">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Section divider: Cargo ── */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-[#1066b1]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#1066b1] text-sm">inventory_2</span>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cargo Details</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Goods Type */}
              <div>
                <Label text="Goods Type" required />
                <input
                  className={inputCls}
                  placeholder="e.g. Fuel, Palletised Goods, Machinery…"
                  value={form.goodsType}
                  onChange={set('goodsType')}
                  autoComplete="off"
                />
              </div>

              {/* Reporting Location */}
              <div>
                <Label text="Reporting Location" required />
                <AddressAutocompleteInput
                  value={form.reportingLocation}
                  onChange={(address, lat, lng) => {
                    setForm(f => ({ ...f, reportingLocation: address }));
                    setReportingCoords({ lat, lng });
                  }}
                  placeholder="Search for reporting location…"
                />
              </div>

              {/* ── Section divider: Schedule ── */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">calendar_month</span>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Schedule</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Shift Date / Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label text="Shift Date" required />
                  <input
                    className={inputCls}
                    type="date"
                    min={today}
                    value={form.startDate}
                    onChange={set('startDate')}
                  />
                </div>
                <div>
                  <Label text="Shift Hours" required hint="1–12" />
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={12}
                    placeholder="8"
                    value={form.hoursPerDay}
                    onChange={set('hoursPerDay')}
                  />
                </div>
              </div>

              {/* Deliver By — daily delivery deadline */}
              <div>
                <Label text="Deliver By" required hint="daily delivery deadline" />
                <div className="relative max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">schedule</span>
                  <input
                    type="time"
                    className={`${inputCls} pl-10 font-mono tracking-widest ${
                      form.timeSlot
                        ? form.startDate === today && isTimePassed(form.timeSlot)
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-primary/40 bg-primary/5 text-primary font-black'
                        : ''
                    }`}
                    value={form.timeSlot}
                    onChange={set('timeSlot')}
                  />
                </div>
                {form.timeSlot && form.startDate === today && isTimePassed(form.timeSlot) && (
                  <p className="mt-1.5 text-[11px] text-red-500 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    This time has already passed today.
                  </p>
                )}
                {form.timeSlot && !(form.startDate === today && isTimePassed(form.timeSlot)) && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Delivery window: <span className="font-bold text-slate-600">{timeToSlot(form.timeSlot).charAt(0) + timeToSlot(form.timeSlot).slice(1).toLowerCase()}</span>
                  </p>
                )}
              </div>

              {/* Special instructions */}
              <div>
                <Label text="Special Instructions" />
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
              <div className="grid grid-cols-1 gap-5">

                {/* Cargo & Schedule section */}
                <ReviewSection title="Cargo & Schedule" icon="inventory_2" iconBg="bg-[#1066b1]/10" iconColor="text-[#1066b1]">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                    <ReviewRow label="Requirement"        value={REQUIREMENT_OPTIONS.find(r => r.value === form.requirementType)?.label ?? form.requirementType} />
                    <ReviewRow label="Goods Type"         value={form.goodsType} />
                  </div>
                  {form.reportingLocation && (
                    <div className="pt-3 border-t border-slate-100 mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reporting Location</p>
                      <p className="text-sm text-[#44474C]">{form.reportingLocation}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                    <ReviewRow label="Shift Date"  value={form.startDate ? new Date(form.startDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                    <ReviewRow label="Shift Hours" value={form.hoursPerDay ? `${form.hoursPerDay}h` : '—'} />
                    <ReviewRow label="Deliver By"  value={form.timeSlot || '—'} />
                  </div>
                  {form.specialInstructions && (
                    <div className="pt-3 border-t border-slate-100 mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Special Instructions</p>
                      <p className="text-sm text-[#44474C]">{form.specialInstructions}</p>
                    </div>
                  )}
                  <button onClick={() => setStep(2)} className="text-xs text-primary font-bold hover:underline">Edit Details</button>
                </ReviewSection>
              </div>

              <div className="bg-white border border-[#1066b1]/25 rounded-xl px-4 py-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#1066b1] shrink-0 text-base mt-0.5">bolt</span>
                <p className="text-xs text-[#083d7a] font-medium leading-relaxed">
                  Once posted, your shift will be visible to our network of verified drivers. You'll receive quotes within minutes and can accept the best offer.
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

        {/* Footer nav */}
        <div className="px-4 sm:px-8 py-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
          <button
            onClick={step === 2 ? () => navigate('/haulier/shifts') : back}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-[#44474C] bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {step === 2 ? '← Back to Shifts' : '← Back'}
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
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black text-white bg-[#1066b1] hover:bg-[#1066b1]/90 transition-colors shadow-lg shadow-[#1066b1]/20 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
            >
              {submitting
                ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Posting…</>
                : <><span className="material-symbols-outlined text-sm">send</span> Post Shift</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

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

export default PostShiftPage;
