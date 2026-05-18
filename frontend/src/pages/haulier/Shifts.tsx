import React, { useEffect, useState } from 'react';
import haulierService from '../../api/haulierService';

type Tab = 'post' | 'list';
type RequirementType = 'DRIVER_ONLY' | 'TRUCK_WITH_DRIVER' | 'TRUCK_ONLY';

interface ShiftItem {
  shiftId: string;
  shiftRef: string;
  requirementType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  hoursPerDay: number;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  notes?: string;
  status: string;
  daysCompleted: number;
  selectedDriverId?: string;
}

interface QuoteItem {
  quoteId: string;
  driverName?: string;
  driverId: string;
  amountPerDay: number;
  totalAmount: number;
  status: string;
  notes?: string;
}

const REQUIREMENT_OPTIONS: { value: RequirementType; label: string; desc: string; icon: string }[] = [
  { value: 'DRIVER_ONLY',       label: 'Driver Only',       desc: 'You provide the truck — hire a driver.',        icon: 'person' },
  { value: 'TRUCK_WITH_DRIVER', label: 'Truck with Driver', desc: 'Driver brings their own truck.',                 icon: 'local_shipping' },
  { value: 'TRUCK_ONLY',        label: 'Truck Only',        desc: 'Hire the vehicle — no driver services needed.',  icon: 'garage' },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: 'Open',        cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  BOOKED:      { label: 'Booked',      cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  COMPLETED:   { label: 'Completed',   cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  CANCELLED:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
};

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm ' +
  'focus:ring-2 focus:ring-[#1066b1]/20 focus:border-[#1066b1] outline-none transition-all ' +
  'placeholder:text-slate-400 text-[#041627] font-medium';

const Label: React.FC<{ text: string; required?: boolean; hint?: string }> = ({ text, required, hint }) => (
  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
    {text}
    {required && <span className="text-red-500 ml-0.5">*</span>}
    {hint && <span className="ml-2 normal-case font-medium text-slate-400 tracking-normal">{hint}</span>}
  </label>
);

const defaultForm = {
  requirementType: 'TRUCK_WITH_DRIVER' as RequirementType,
  startDate: '',
  endDate: '',
  hoursPerDay: '8',
  pickupAddress: '',
  dropAddress: '',
  notes: '',
};

const HaulierShiftsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('list');
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quotesMap, setQuotesMap] = useState<Record<string, QuoteItem[]>>({});

  const loadShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await haulierService.listMyShifts();
      setShifts((data?.items ?? []) as ShiftItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, []);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setFormError('');
    };

  const validate = (): string => {
    if (!form.requirementType) return 'Please select a requirement type.';
    if (!form.startDate) return 'Start date is required.';
    if (!form.endDate) return 'End date is required.';
    if (form.endDate < form.startDate) return 'End date must be on or after start date.';
    if (!form.hoursPerDay || Number(form.hoursPerDay) < 1 || Number(form.hoursPerDay) > 24)
      return 'Hours per day must be between 1 and 24.';
    if (!form.pickupAddress.trim()) return 'Pickup address is required.';
    if (!form.dropAddress.trim()) return 'Drop-off address is required.';
    return '';
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setActionLoading(true);
    setFormError('');
    setSuccess(null);
    try {
      await haulierService.createShift({
        requirementType: form.requirementType,
        startDate: form.startDate,
        endDate: form.endDate,
        hoursPerDay: Number(form.hoursPerDay),
        pickupAddress: form.pickupAddress.trim(),
        dropAddress: form.dropAddress.trim(),
        notes: form.notes.trim() || undefined,
      });
      setSuccess('Shift posted! Drivers can now view and quote on it.');
      setForm(defaultForm);
      setTab('list');
      await loadShifts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shift');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpand = async (shiftId: string) => {
    if (expandedId === shiftId) { setExpandedId(null); return; }
    setExpandedId(shiftId);
    if (!quotesMap[shiftId]) {
      try {
        const data = await haulierService.listShiftQuotes(shiftId);
        setQuotesMap(prev => ({ ...prev, [shiftId]: (data?.items ?? []) as QuoteItem[] }));
      } catch {
        setQuotesMap(prev => ({ ...prev, [shiftId]: [] }));
      }
    }
  };

  const handleAcceptQuote = async (shiftId: string, quoteId: string) => {
    setActionLoading(true);
    setSuccess(null);
    try {
      await haulierService.acceptShiftQuote(shiftId, quoteId);
      setSuccess('Quote accepted — shift is now booked.');
      await loadShifts();
      const data = await haulierService.listShiftQuotes(shiftId);
      setQuotesMap(prev => ({ ...prev, [shiftId]: (data?.items ?? []) as QuoteItem[] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDay = async (shiftId: string) => {
    setActionLoading(true);
    setSuccess(null);
    try {
      await haulierService.completeShiftDay(shiftId);
      setSuccess('Day marked complete. Driver payment has been triggered.');
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete day');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (shiftId: string) => {
    if (!window.confirm('Cancel this shift? This cannot be undone.')) return;
    setActionLoading(true);
    setSuccess(null);
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

  const today = new Date().toISOString().split('T')[0];
  const totalDaysPreview =
    form.startDate && form.endDate && form.endDate >= form.startDate
      ? Math.floor((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000) + 1
      : null;

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#041627]">Shift Scheduling</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Book drivers or vehicles across multiple consecutive days
          </p>
        </div>
        <button
          onClick={() => { setTab(tab === 'post' ? 'list' : 'post'); setFormError(''); setSuccess(null); setError(null); }}
          className="inline-flex items-center gap-2 bg-[#1066b1] hover:bg-[#0e57a0] text-white font-black text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">
            {tab === 'post' ? 'arrow_back' : 'add'}
          </span>
          {tab === 'post' ? 'My Shifts' : 'Post a Shift'}
        </button>
      </div>

      {/* ── Global banners ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-red-500 text-base mt-0.5">error</span>
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5">check_circle</span>
          <p className="text-sm font-bold text-emerald-700">{success}</p>
        </div>
      )}

      {/* ══════════════════ POST SHIFT FORM ══════════════════════════════════ */}
      {tab === 'post' && (
        <form onSubmit={handlePost} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(26,43,60,0.08)] border border-slate-100 p-6 sm:p-8 space-y-6">

          {/* Requirement type */}
          <div>
            <Label text="Requirement Type" required />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {REQUIREMENT_OPTIONS.map(opt => {
                const active = form.requirementType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, requirementType: opt.value })); setFormError(''); }}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      active
                        ? 'border-[#1066b1] bg-[#1066b1]/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl mt-0.5 ${active ? 'text-[#1066b1]' : 'text-slate-400'}`}>
                      {opt.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-black ${active ? 'text-[#1066b1]' : 'text-[#041627]'}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Start Date" required />
              <input type="date" min={today} value={form.startDate} onChange={set('startDate')} required className={inputCls} />
            </div>
            <div>
              <Label text="End Date" required />
              <input type="date" min={form.startDate || today} value={form.endDate} onChange={set('endDate')} required className={inputCls} />
            </div>
          </div>

          {/* Duration preview */}
          {totalDaysPreview && (
            <div className="flex items-center gap-3 bg-[#1066b1]/5 border border-[#1066b1]/15 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[#1066b1] text-base">event_available</span>
              <p className="text-sm font-bold text-[#1066b1]">
                {totalDaysPreview} day{totalDaysPreview !== 1 ? 's' : ''} scheduled
                {form.hoursPerDay ? ` · ${Number(form.hoursPerDay) * totalDaysPreview} total hours` : ''}
              </p>
            </div>
          )}

          {/* Hours per day */}
          <div>
            <Label text="Working Hours per Day" required />
            <input
              type="number"
              min={1}
              max={24}
              value={form.hoursPerDay}
              onChange={set('hoursPerDay')}
              required
              placeholder="8"
              className={inputCls}
              style={{ maxWidth: '240px' }}
            />
          </div>

          {/* Pickup + Drop addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Pickup Location" required />
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                  trip_origin
                </span>
                <input
                  type="text"
                  value={form.pickupAddress}
                  onChange={set('pickupAddress')}
                  required
                  placeholder="e.g. Andheri Industrial Zone, Mumbai"
                  className={inputCls + ' pl-9'}
                />
              </div>
            </div>
            <div>
              <Label text="Drop-off Location" required />
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                  place
                </span>
                <input
                  type="text"
                  value={form.dropAddress}
                  onChange={set('dropAddress')}
                  required
                  placeholder="e.g. Bhiwandi Warehouse, Thane"
                  className={inputCls + ' pl-9'}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label text="Additional Notes" hint="(optional)" />
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Any specific requirements, schedule details, equipment needed…"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Form error */}
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-base">error</span>
              <p className="text-sm font-bold text-red-700">{formError}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 sm:flex-none sm:px-10 bg-[#1066b1] hover:bg-[#0e57a0] disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-colors shadow-sm"
            >
              {actionLoading ? 'Posting…' : 'Post Shift'}
            </button>
            <button
              type="button"
              onClick={() => { setTab('list'); setFormError(''); }}
              className="flex-1 sm:flex-none sm:px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════ SHIFTS LIST ══════════════════════════════════════ */}
      {tab === 'list' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 shadow-[0_4px_20px_rgba(26,43,60,0.06)]">
              <div className="w-8 h-8 border-3 border-[#1066b1]/20 border-t-[#1066b1] rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400">Loading shifts…</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(26,43,60,0.06)] p-16 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1066b1]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1066b1] text-3xl">event_available</span>
              </div>
              <div>
                <p className="text-base font-black text-[#041627]">No shifts scheduled yet</p>
                <p className="text-sm text-slate-500 font-medium mt-1">Post a multi-day shift and drivers will submit quotes.</p>
              </div>
              <button
                onClick={() => setTab('post')}
                className="mt-2 bg-[#1066b1] hover:bg-[#0e57a0] text-white font-black text-sm px-6 py-2.5 rounded-xl transition-colors"
              >
                Post Your First Shift
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map(shift => {
                const quotes = quotesMap[shift.shiftId] ?? [];
                const isExpanded = expandedId === shift.shiftId;
                const statusCfg = STATUS_CONFIG[shift.status] ?? { label: shift.status, cls: 'bg-slate-100 text-slate-600' };
                const canComplete = ['BOOKED', 'IN_PROGRESS'].includes(shift.status) && shift.daysCompleted < shift.totalDays;
                const canCancel = !['COMPLETED', 'CANCELLED'].includes(shift.status);
                const progress = shift.totalDays > 0 ? (shift.daysCompleted / shift.totalDays) * 100 : 0;
                const reqOpt = REQUIREMENT_OPTIONS.find(o => o.value === shift.requirementType);

                return (
                  <div key={shift.shiftId} className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(26,43,60,0.06)] overflow-hidden">

                    {/* Card body */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">

                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl bg-[#1066b1]/8 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#1066b1] text-lg">
                            {reqOpt?.icon ?? 'event_available'}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-base font-black text-[#041627] font-mono">{shift.shiftRef}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          {shift.pickupAddress ? (
                            <div className="mt-0.5 space-y-0.5">
                              <p className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-emerald-500">trip_origin</span>
                                {shift.pickupAddress}
                              </p>
                              <p className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-red-400">place</span>
                                {shift.dropAddress}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-700 mt-0.5">{shift.location}</p>
                          )}
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">calendar_today</span>
                              {shift.startDate} → {shift.endDate}
                            </span>
                            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              {shift.totalDays} day(s) · {shift.hoursPerDay}h/day
                            </span>
                            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">{reqOpt?.icon ?? 'person'}</span>
                              {reqOpt?.label ?? shift.requirementType}
                            </span>
                          </div>
                          {shift.notes && (
                            <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">{shift.notes}</p>
                          )}
                        </div>

                        {/* Progress counter (if active) */}
                        {!['OPEN', 'CANCELLED'].includes(shift.status) && (
                          <div className="text-right shrink-0 hidden sm:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Days done</p>
                            <p className="text-2xl font-black text-[#041627] mt-0.5">
                              {shift.daysCompleted}
                              <span className="text-slate-400 text-sm font-bold">/{shift.totalDays}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {['BOOKED', 'IN_PROGRESS', 'COMPLETED'].includes(shift.status) && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                            <span className="text-xs font-bold text-slate-500">{shift.daysCompleted}/{shift.totalDays} days</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1066b1] rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <button
                          onClick={() => toggleExpand(shift.shiftId)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          {isExpanded ? 'Hide Quotes' : `Quotes${quotes.length ? ` (${quotes.length})` : ''}`}
                        </button>

                        {canComplete && (
                          <button
                            onClick={() => handleCompleteDay(shift.shiftId)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Complete Day {shift.daysCompleted + 1}
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancel(shift.shiftId)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-xs">cancel</span>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quotes panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-5 sm:px-6 py-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                          Driver Quotes
                        </p>
                        {quotes.length === 0 ? (
                          <p className="text-sm text-slate-400 font-medium">No quotes received yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {quotes.map(q => (
                              <div key={q.quoteId} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#041627] truncate">{q.driverName ?? 'Driver'}</p>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    ₹{q.amountPerDay.toLocaleString()}/day
                                    <span className="text-slate-400 mx-1">·</span>
                                    Total ₹{q.totalAmount.toLocaleString()}
                                  </p>
                                  {q.notes && <p className="text-xs text-slate-400 mt-0.5">{q.notes}</p>}
                                </div>
                                <div className="flex items-center gap-2 ml-4 shrink-0">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    q.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                                    q.status === 'REJECTED' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {q.status}
                                  </span>
                                  {q.status === 'PENDING' && shift.status === 'OPEN' && (
                                    <button
                                      onClick={() => handleAcceptQuote(shift.shiftId, q.quoteId)}
                                      disabled={actionLoading}
                                      className="text-xs font-black px-3 py-1.5 rounded-lg bg-[#1066b1] text-white hover:bg-[#0e57a0] transition-colors disabled:opacity-50"
                                    >
                                      Accept
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HaulierShiftsPage;
