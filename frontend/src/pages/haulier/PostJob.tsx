import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import haulierService from '../../api/haulierService';
import RouteMapStep, { type RouteStepData } from './RouteMapStep';

/* ─── Constants ──────────────────────────────────────────────────────────────── */

/** Map a custom "HH:MM" time to the backend TimeSlot enum value. */
function timeToSlot(time: string): string {
  const h = parseInt(time.split(':')[0] ?? '0', 10);
  if (h >= 6  && h < 12) return 'MORNING';
  if (h >= 12 && h < 18) return 'AFTERNOON';
  if (h >= 18 && h < 22) return 'EVENING';
  return 'NIGHT';
}

const DRIVER_REQUIREMENTS = [
  { value: 'DRIVER_ONLY',       label: 'Driver Only',      desc: 'Hire a driver — you provide the truck.',          icon: 'person'         },
  { value: 'DRIVER_WITH_TRUCK', label: 'Truck with Driver', desc: 'Hire a driver who brings their own truck.',       icon: 'local_shipping' },
  { value: 'TRUCK_ONLY',        label: 'Truck Only',        desc: 'Hire a truck — no driver services needed.',       icon: 'garage'         },
];

/* ─── Haversine helper (straight-line km between two coords) ─────────────────── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}


/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface StopEntry { id: string; address: string; lat?: number; lng?: number; goodsType?: string; litres?: string; }

// stopDeliveryTimes: maps stop.id → "HH:MM" for intermediate stops, 'final' → "HH:MM" for drop-off

interface CompartmentDetail {
  contents:  string;
  quantity:  string;
  unit:      string;
  stopId:    string;
}

interface FormState {
  pickupAddress:       string;
  dropAddress:         string;
  goodsType:           string;
  totalCapacity:       string;
  compartments:        string;
  jobDate:             string;
  timeSlot:            string;
  specialInstructions: string;
  driverRequirement:   string;
  accessCode:          string;
  loadCode:            string;
  accessCode:          string;
  totalLitres:         string;
}

interface RouteCoords {
  pickupLat?:  number;
  pickupLng?:  number;
  dropLat?:    number;
  dropLng?:    number;
  distanceKm?: number;
  durationMin?: number;
}

interface CreatedJob {
  jobRef:       string;
  loadCode?:    string;
  distanceKm?:  number;
  durationMin?: number;
  pickup:       string;
  drop:         string;
  jobId?:       string;
}

const EMPTY: FormState = {
  pickupAddress:       '',
  dropAddress:         '',
  goodsType:           '',
  totalCapacity:       '',
  compartments:        '',
  jobDate:             '',
  timeSlot:            '',
  specialInstructions: '',
  driverRequirement:   'DRIVER_WITH_TRUCK',
  accessCode:          '',
  loadCode:            '',
  accessCode:          '',
  totalLitres:         '',
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

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [stops, setStops]         = useState<StopEntry[]>([]);
  const [compartmentDetails, setCompartmentDetails] = useState<CompartmentDetail[]>([]);
  const [routeCoords, setRouteCoords] = useState<RouteCoords>({});
  const [stopDeliveryTimes, setStopDeliveryTimes] = useState<Record<string, string>>({});
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated]     = useState<CreatedJob | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');

  const _now  = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  /* ── Auto-compute delivery date + per-stop delivery times ── */
  useEffect(() => {
    if (!form.jobDate || !routeCoords.durationMin || !form.timeSlot) {
      setDeliveryDate('');
      setStopDeliveryTimes({});
      return;
    }
    // Use exact "HH:MM" time entered by user
    const departure = new Date(`${form.jobDate}T${form.timeSlot}:00`);
    const totalMs    = routeCoords.durationMin * 60 * 1000;

    // ── Final delivery date ──
    const arrival = new Date(departure.getTime() + totalMs);
    const y = arrival.getFullYear();
    const m = String(arrival.getMonth() + 1).padStart(2, '0');
    const d = String(arrival.getDate()).padStart(2, '0');
    setDeliveryDate(`${y}-${m}-${d}`);

    // ── Per-stop delivery times via proportional Haversine distance ──
    const pLat = routeCoords.pickupLat;
    const pLng = routeCoords.pickupLng;
    const dLat = routeCoords.dropLat;
    const dLng = routeCoords.dropLng;
    const validStops = stops.filter(s => s.lat != null && s.lng != null);

    if (!pLat || !pLng || !dLat || !dLng || validStops.length === 0) {
      // No intermediate stops — just set final time
      setStopDeliveryTimes({ final: fmtTime(arrival) });
      return;
    }

    // Build point chain: pickup → stops → drop
    const chain = [
      { lat: pLat, lng: pLng },
      ...validStops.map(s => ({ lat: s.lat!, lng: s.lng! })),
      { lat: dLat, lng: dLng },
    ];

    // Cumulative straight-line distances along the chain
    const cumDist: number[] = [0];
    for (let i = 1; i < chain.length; i++) {
      cumDist.push(cumDist[i - 1] + haversineKm(chain[i - 1].lat, chain[i - 1].lng, chain[i].lat, chain[i].lng));
    }
    const totalDist = cumDist[cumDist.length - 1];

    const times: Record<string, string> = {};

    if (totalDist > 0) {
      // Intermediate stops (chain indices 1 … n-1)
      validStops.forEach((s, i) => {
        const proportion = cumDist[i + 1] / totalDist;
        times[s.id] = fmtTime(new Date(departure.getTime() + proportion * totalMs));
      });
    }

    // Final destination always = departure + full duration
    times['final'] = fmtTime(arrival);

    setStopDeliveryTimes(times);
  }, [form.jobDate, form.timeSlot, routeCoords, stops]);

  /* ── Sync compartment detail rows with count ── */
  useEffect(() => {
    const count = Math.max(0, parseInt(form.compartments) || 0);
    setCompartmentDetails(prev =>
      Array.from({ length: count }, (_, i) =>
        prev[i] ?? { contents: '', quantity: '', unit: 'L', stopId: 'final' }
      )
    );
  }, [form.compartments]);

  /* ── Route map callback ── */
  const handleRouteChange = useCallback((data: RouteStepData) => {
    setForm(f => ({
      ...f,
      pickupAddress: data.pickupAddress,
      dropAddress:   data.dropAddress,
    }));
    setStops(data.stops);
    setRouteCoords({
      pickupLat:   data.pickupLat,
      pickupLng:   data.pickupLng,
      dropLat:     data.dropLat,
      dropLng:     data.dropLng,
      distanceKm:  data.distanceKm,
      durationMin: data.durationMin,
    });
  }, []);

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
    if (step === 1) {
      if (!form.pickupAddress.trim()) return 'Please select a pickup location on the map.';
      if (!form.dropAddress.trim())   return 'Please select a drop-off location on the map.';
      if (!routeCoords.pickupLat)     return 'Please choose a pickup address from the suggestions.';
      if (!routeCoords.dropLat)       return 'Please choose a drop-off address from the suggestions.';
    }
    if (step === 2) {
      if (!form.driverRequirement)          return 'Please select a driver requirement.';
      if (!form.goodsType.trim())           return 'Goods type is required.';
      if (!form.totalCapacity)              return 'Total capacity is required.';
      if (parseFloat(form.totalCapacity) <= 0) return 'Total capacity must be greater than 0.';
      if (!form.compartments)               return 'Number of compartments is required.';
      if (parseInt(form.compartments) < 1)  return 'Compartments must be at least 1.';
      for (let i = 0; i < compartmentDetails.length; i++) {
        const c = compartmentDetails[i];
        if (!c.contents.trim())     return `Compartment ${i + 1}: contents are required.`;
        if (!c.quantity)            return `Compartment ${i + 1}: quantity is required.`;
        if (parseFloat(c.quantity) <= 0) return `Compartment ${i + 1}: quantity must be greater than 0.`;
        if (!c.stopId)              return `Compartment ${i + 1}: please select a destination stop.`;
      }
      if (stops.length > 0) {
        for (let i = 0; i < stops.length; i++) {
        }
      }
      if (!form.jobDate)                    return 'Collection date is required.';
      if (form.jobDate < today)             return 'Collection date cannot be in the past.';
      if (!form.timeSlot)                   return 'Please select a delivery time.';
      if (form.jobDate === today && isTimePassed(form.timeSlot))
        return 'The selected delivery time has already passed for today. Please choose a later time.';
      if (!form.accessCode.trim())          return 'Access code is required.';
      if (form.accessCode.trim().length < 4) return 'Access code must be at least 4 characters.';
      if (!form.loadCode.trim())            return 'Load code is required.';
      if (form.loadCode.trim().length < 4)  return 'Load code must be at least 4 characters.';
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
      const res = await haulierService.createJob({
        pickupAddress:     form.pickupAddress.trim(),
        pickupLat:         routeCoords.pickupLat,
        pickupLng:         routeCoords.pickupLng,
        dropAddress:       form.dropAddress.trim(),
        dropLat:           routeCoords.dropLat,
        dropLng:           routeCoords.dropLng,
        goodsType:         form.goodsType.trim(),
        totalCapacity:     form.totalCapacity ? parseFloat(form.totalCapacity) : undefined,
        compartments:      form.compartments ? parseInt(form.compartments, 10) : undefined,
        compartmentDetails: compartmentDetails.map((c, i) => ({
          compartment: i + 1,
          contents:    c.contents.trim(),
          quantity:    parseFloat(c.quantity),
          unit:        c.unit,
          stopId:      c.stopId,
          stopLabel:   c.stopId === 'final'
            ? `Final Destination: ${form.dropAddress}`
            : (() => { const idx = stops.findIndex(s => s.id === c.stopId); return `Stop ${idx + 1}: ${stops[idx]?.address ?? ''}`; })(),
        })),
        jobDate:           form.jobDate,
        estimatedDelivery: deliveryDate || undefined,
        timeSlot:          timeToSlot(form.timeSlot),
        jobTime:           form.timeSlot,
        driverRequirement: form.driverRequirement,
        stops:             stops.map((s, i) => ({
          address:      s.address,
          lat:          s.lat,
          lng:          s.lng,
          order:        i + 1,
          ...(stopDeliveryTimes[s.id] ? { deliveryTime: stopDeliveryTimes[s.id] } : {}),
        })),
        finalDeliveryTime: stopDeliveryTimes['final'] || undefined,
        specialInstructions: form.specialInstructions.trim(),
        accessCode:          form.accessCode.trim().toUpperCase(),
        loadCode:            form.loadCode.trim().toUpperCase(),
      }) as {
        jobId?: string; jobReference?: string; loadCode?: string;
        distanceKm?: number; durationMin?: number;
        pickupLocation?: string; dropLocation?: string;
      };
      setCreated({
        jobRef:      res?.jobReference ?? 'N/A',
        loadCode:    res?.loadCode,
        distanceKm:  res?.distanceKm  ?? routeCoords.distanceKm,
        durationMin: res?.durationMin ?? routeCoords.durationMin,
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
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6 animate-in fade-in duration-700">
        <div className="bg-gradient-to-br from-[#1066b1] to-[#0a4a8f] rounded-3xl p-8 flex flex-col items-center text-center gap-6 shadow-[0_20px_50px_rgba(16,102,177,0.2)]">
          <div className="w-20 h-20 rounded-full bg-white/20 ring-8 ring-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Job Posted!</h2>
            <p className="text-blue-100/90 mt-1.5 font-medium text-sm">
              Your freight job is live — drivers are being notified now.
            </p>
          </div>
          <div className="w-full space-y-3">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-left backdrop-blur-sm">
              <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-widest mb-1">Job Reference</p>
              <p className="text-2xl font-black text-white font-mono tracking-tight">{created.jobRef}</p>
            </div>
            {created.loadCode && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-left backdrop-blur-sm">
                <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-widest mb-1">Load Code</p>
                <p className="text-2xl font-black text-white font-mono tracking-tight">{created.loadCode}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full mt-auto">
            <button
              onClick={() => navigate(`/haulier/payments${created.jobId ? `?jobId=${created.jobId}` : ''}`)}
              className="w-full flex items-center justify-center gap-2 bg-white text-[#1066b1] py-3.5 rounded-xl font-black text-sm transition-all hover:bg-blue-50 shadow-xl shadow-black/10 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">lock</span>
              Secure Payment
            </button>
            <p className="text-[10px] text-blue-100/60 font-bold uppercase tracking-widest">
              Note: Secure payment after accepting a bid
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/haulier/jobs')}
                className="flex-1 bg-white/15 border border-white/20 text-white py-3 rounded-xl font-black text-sm hover:bg-white/25 transition-colors"
              >
                View Jobs
              </button>
              <button
                onClick={() => { setCreated(null); setForm(EMPTY); setStops([]); setCompartmentDetails([]); setRouteCoords({}); setStopDeliveryTimes({}); setStep(1); setError(''); }}
                className="flex-1 bg-[#0a4a8f]/40 border border-white/10 text-white py-3 rounded-xl font-black text-sm hover:bg-[#0a4a8f]/60 transition-colors"
              >
                Post New
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-[#041627]">Job Details</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Quotes typically arrive within 15 minutes. You'll be notified when drivers respond.</p>
          </div>
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</p>
            <div className="space-y-3">
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

      {/* Page header + step bar */}
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

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 overflow-hidden">

        {/* ── STEP 1: Route (Google Maps) ── */}
        {step === 1 && (
          <div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1066b1] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">route</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#041627]">Plan Your Route</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Search locations using Google Maps. Add stops between pickup and drop-off — route updates live.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8">
              <RouteMapStep onChange={handleRouteChange} />
            </div>
          </div>
        )}

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
                  <p className="text-xs text-slate-500 font-medium">Describe what needs to be shipped and when.</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-8">

              {/* ── Driver Requirement ── */}
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

              {/* ── Section divider: Cargo ── */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-[#1066b1]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#1066b1] text-sm">inventory_2</span>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cargo Details</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Goods Type / Total Capacity / Compartments — one row */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_140px] gap-4">
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
                <div>
                  <Label text="Total Capacity" required hint="L / kg" />
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={form.totalCapacity}
                    onChange={set('totalCapacity')}
                  />
                </div>
                <div>
                  <Label text="Compartments" required hint="no." />
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 3"
                    value={form.compartments}
                    onChange={set('compartments')}
                  />
                </div>
              </div>

              {/* Compartment details — shown when count > 0 */}
              {compartmentDetails.length > 0 && (
                <div>
                  <Label text="Compartment Details" required hint="what goes in each compartment" />
                  <div className="mt-1 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    <div className="hidden sm:grid sm:grid-cols-[44px_1fr_110px_76px_1fr] gap-3 px-4 py-2 bg-slate-50">
                      {['#', 'Contents', 'Qty', 'Unit', 'Destination Stop'].map(h => (
                        <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {compartmentDetails.map((c, i) => {
                      const stopOptions = [
                        ...stops.map((s, si) => ({ value: s.id, label: `Stop ${si + 1}: ${s.address.length > 32 ? s.address.slice(0, 32) + '…' : s.address}` })),
                        { value: 'final', label: `Final: ${form.dropAddress ? (form.dropAddress.length > 32 ? form.dropAddress.slice(0, 32) + '…' : form.dropAddress) : 'Final Destination'}` },
                      ];
                      const upd = (field: keyof CompartmentDetail) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                        setCompartmentDetails(prev => prev.map((x, j) => j === i ? { ...x, [field]: e.target.value } : x));
                      return (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-[44px_1fr_110px_76px_1fr] gap-3 px-4 py-3 bg-white items-center">
                          <div className="w-8 h-8 rounded-lg bg-[#1066b1]/10 flex items-center justify-center">
                            <span className="text-xs font-black text-[#1066b1]">{i + 1}</span>
                          </div>
                          <input
                            className={inputCls}
                            placeholder="e.g. Petrol, Diesel…"
                            value={c.contents}
                            onChange={upd('contents')}
                          />
                          <input
                            className={inputCls}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="2000"
                            value={c.quantity}
                            onChange={upd('quantity')}
                          />
                          <select className={inputCls} value={c.unit} onChange={upd('unit')}>
                            <option value="L">L</option>
                            <option value="kg">kg</option>
                            <option value="t">t</option>
                            <option value="units">units</option>
                          </select>
                          <select className={inputCls} value={c.stopId} onChange={upd('stopId')}>
                            {stopOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* ── Section divider: Schedule ── */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">calendar_month</span>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Schedule</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Collection Date + Estimated Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <Label text="Est. Delivery Date" hint="auto-calculated" />
                  <div className={`${inputCls} flex items-center gap-2 ${deliveryDate ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-50'}`}>
                    <span className={`material-symbols-outlined text-base shrink-0 ${deliveryDate ? 'text-emerald-500' : 'text-slate-300'}`}>
                      event_available
                    </span>
                    <span className="text-sm font-semibold truncate">
                      {deliveryDate
                        ? new Date(deliveryDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Set route & date first'}
                    </span>
                  </div>
                  {deliveryDate && (
                    <p className="mt-1.5 text-[10px] text-slate-400">Based on route duration from Step 1.</p>
                  )}
                </div>
              </div>

              {/* Access Code + Load Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label text="Access Code" required hint="e.g. gate or site entry code" />
                  <input
                    className={`${inputCls} font-mono tracking-widest uppercase`}
                    placeholder="e.g. GATE4321"
                    value={form.accessCode}
                    maxLength={20}
                    onChange={e => setForm(f => ({ ...f, accessCode: e.target.value.toUpperCase() }))}
                  />
                  <p className="mt-1.5 text-[10px] text-slate-400">Share with the driver to access the pickup site.</p>
                </div>
                <div>
                  <Label text="Load Code" required hint="shared with driver at pickup" />
                  <input
                    className={`${inputCls} font-mono tracking-widest uppercase`}
                    placeholder="e.g. ABC12345"
                    value={form.loadCode}
                    maxLength={20}
                    onChange={e => setForm(f => ({ ...f, loadCode: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              {/* Deliver By — custom time picker */}
              <div>
                <Label text="Deliver By" required hint="expected delivery time" />
                <div className="relative max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">schedule</span>
                  <input
                    type="time"
                    className={`${inputCls} pl-10 font-mono tracking-widest ${
                      form.timeSlot
                        ? form.jobDate === today && isTimePassed(form.timeSlot)
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-primary/40 bg-primary/5 text-primary font-black'
                        : ''
                    }`}
                    value={form.timeSlot}
                    onChange={set('timeSlot')}
                  />
                </div>
                {form.timeSlot && form.jobDate === today && isTimePassed(form.timeSlot) && (
                  <p className="mt-1.5 text-[11px] text-red-500 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    This time has already passed today.
                  </p>
                )}
                {form.timeSlot && !(form.jobDate === today && isTimePassed(form.timeSlot)) && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Mapped to time window: <span className="font-bold text-slate-600">{timeToSlot(form.timeSlot).charAt(0) + timeToSlot(form.timeSlot).slice(1).toLowerCase()}</span>
                  </p>
                )}
              </div>

              {/* ── Per-Stop Delivery Time Slots (ETA pre-filled, editable) ── */}
              {(stops.length > 0 || form.dropAddress) && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-amber-500 text-sm">schedule_send</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Delivery Time Slots</p>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] text-slate-400 font-medium italic">ETA pre-filled · editable</span>
                  </div>

                  {!form.jobDate || !routeCoords.durationMin ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="material-symbols-outlined text-slate-300 text-base">info</span>
                      <p className="text-xs text-slate-400 font-medium">Set a collection date and time to see ETA-based delivery slots at each stop.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 bg-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Time</span>
                      </div>
                      {stops.map((s, i) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-[#44474C] truncate block">
                                {s.address || `Stop ${i + 1}`}
                              </span>
                              {stopDeliveryTimes[s.id] && (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  Slot: {timeToSlot(stopDeliveryTimes[s.id]).charAt(0) + timeToSlot(stopDeliveryTimes[s.id]).slice(1).toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <input
                              type="time"
                              className="border border-amber-200 bg-amber-50 text-amber-700 font-black text-sm rounded-lg px-3 py-1.5 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-300"
                              value={stopDeliveryTimes[s.id] ?? ''}
                              onChange={e =>
                                setStopDeliveryTimes(prev => ({ ...prev, [s.id]: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                      {form.dropAddress && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-white text-xs">flag</span>
                            </span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-[#44474C] truncate block">
                                {form.dropAddress}
                              </span>
                              {stopDeliveryTimes['final'] && (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Slot: {timeToSlot(stopDeliveryTimes['final']).charAt(0) + timeToSlot(stopDeliveryTimes['final']).slice(1).toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <input
                              type="time"
                              className="border border-emerald-200 bg-emerald-50 text-emerald-700 font-black text-sm rounded-lg px-3 py-1.5 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-300"
                              value={stopDeliveryTimes['final'] ?? ''}
                              onChange={e =>
                                setStopDeliveryTimes(prev => ({ ...prev, final: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Pre-filled from ETA (departure + route duration). Adjust each stop's delivery time slot as needed.
                  </p>
                </div>
              )}

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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Route section */}
                <ReviewSection title="Route" icon="route" iconBg="bg-blue-50" iconColor="text-blue-500">
                  <div className="space-y-3 mb-3">
                    <RoutePoint color="bg-blue-500 ring-blue-200" label="Pickup"   value={form.pickupAddress} />
                    {stops.map((s, i) => (
                      <RoutePoint
                        key={s.id}
                        color="bg-amber-400 ring-amber-100"
                        label={`Stop ${i + 1}`}
                        value={s.address}
                        deliveryTime={stopDeliveryTimes[s.id]}
                      />
                    ))}
                    <RoutePoint
                      color="bg-red-500 ring-red-200"
                      label="Drop-off"
                      value={form.dropAddress}
                      deliveryTime={stopDeliveryTimes['final']}
                    />
                  </div>
                  {(routeCoords.distanceKm || routeCoords.durationMin) && (
                    <div className="flex gap-3 mb-3 pt-3 border-t border-slate-100">
                      {routeCoords.distanceKm && (
                        <div className="flex-1 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distance</p>
                          <p className="text-sm font-black text-[#1066b1]">{routeCoords.distanceKm} km</p>
                        </div>
                      )}
                      {routeCoords.durationMin && (
                        <div className="flex-1 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Time</p>
                          <p className="text-sm font-black text-[#1066b1]">{Math.round(routeCoords.durationMin / 60 * 10) / 10} hrs</p>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => setStep(1)} className="text-xs text-primary font-bold hover:underline">Edit Route</button>
                </ReviewSection>

                {/* Cargo section */}
                <ReviewSection title="Cargo & Schedule" icon="inventory_2" iconBg="bg-[#1066b1]/10" iconColor="text-[#1066b1]">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                    <ReviewRow label="Requirement"     value={DRIVER_REQUIREMENTS.find(r => r.value === form.driverRequirement)?.label ?? form.driverRequirement} />
                    <ReviewRow label="Goods Type"      value={form.goodsType} />
                    <ReviewRow label="Total Capacity"  value={form.totalCapacity ? `${form.totalCapacity} L/kg` : '—'} />
                    <ReviewRow label="Compartments"    value={form.compartments || '—'} />
                  </div>
                  {compartmentDetails.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Compartment Breakdown</p>
                      <div className="space-y-1.5">
                        {compartmentDetails.map((c, i) => {
                          const stopLabel = c.stopId === 'final'
                            ? (form.dropAddress || 'Final Destination')
                            : (() => { const idx = stops.findIndex(s => s.id === c.stopId); return `Stop ${idx + 1}: ${stops[idx]?.address ?? ''}`; })();
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-6 h-6 rounded bg-[#1066b1]/10 flex items-center justify-center font-black text-[#1066b1] shrink-0">{i + 1}</span>
                              <span className="font-semibold text-[#44474C]">{c.contents || '—'}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-bold text-[#1066b1]">{c.quantity} {c.unit}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-slate-500 truncate">{stopLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                    <ReviewRow label="Collection Date"  value={form.jobDate} />
                    <ReviewRow label="Est. Delivery"   value={deliveryDate ? new Date(deliveryDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                    <ReviewRow label="Deliver By"      value={form.timeSlot || '—'} />
                    {form.accessCode && <ReviewRow label="Access Code" value={form.accessCode} />}
                    <ReviewRow label="Load Code"       value={form.loadCode} />
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

        {/* Footer nav */}
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
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black text-white bg-[#1066b1] hover:bg-[#1066b1]/90 transition-colors shadow-lg shadow-[#1066b1]/20 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
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

const RoutePoint: React.FC<{ color: string; label: string; value: string; deliveryTime?: string }> = ({ color, label, value, deliveryTime }) => (
  <div className="flex items-start gap-3">
    <span className={`w-2.5 h-2.5 rounded-full ring-2 shrink-0 mt-1 ${color}`} />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-[#44474C] leading-snug">{value || '—'}</p>
      {deliveryTime && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-amber-500 text-xs">schedule</span>
          <span className="text-[11px] font-bold text-amber-600">{deliveryTime}</span>
        </div>
      )}
    </div>
  </div>
);

export default PostJobPage;
