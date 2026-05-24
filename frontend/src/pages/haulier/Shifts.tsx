import React, { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';

type ShiftStatus = 'OPEN' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  dailyRate?: number;
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
  createdAt?: string;
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

const QuotesPanel: React.FC<QuotesPanelProps> = ({
  shiftRef, shift, quotes, loading, error, actionLoading, onAccept, onClose,
}) => {
  const pendingQuotes = quotes.filter((q) => q.status.toUpperCase() === 'PENDING');
  const otherQuotes   = quotes.filter((q) => q.status.toUpperCase() !== 'PENDING');
  const reqOpt = REQUIREMENT_OPTIONS.find((o) => o.value === shift.requirementType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Driver Quotes</p>
              <h2 className="text-xl font-black text-[#041627]">{shiftRef}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Shift details card */}
          <div className="mt-4 rounded-2xl bg-[#041627] p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1066b1]" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Pickup</p>
                  <p className="text-sm font-bold text-white">{shift.pickupAddress ?? shift.location ?? '—'}</p>
                </div>
              </div>
              <div className="ml-[5px] h-4 w-px bg-white/20" />
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Drop-off</p>
                  <p className="text-sm font-bold text-white">{shift.dropAddress ?? '—'}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-white/8 p-3">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Start</p>
                <p className="text-[11px] font-black text-white">{shift.startDate}</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">End</p>
                <p className="text-[11px] font-black text-white">{shift.endDate}</p>
              </div>
              <div className="text-center border-r border-white/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Days</p>
                <p className="text-[11px] font-black text-white">{shift.totalDays}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-0.5">Type</p>
                <p className="text-[11px] font-black text-white">{reqOpt?.label ?? shift.requirementType}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1066b1] border-t-transparent" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {!loading && !error && quotes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <span className="material-symbols-outlined text-2xl text-slate-400">inbox</span>
              </span>
              <p className="font-black text-[#44474C]">No quotes yet</p>
              <p className="text-sm text-slate-400">Drivers haven't submitted any quotes for this shift.</p>
            </div>
          )}

          {!loading && pendingQuotes.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pending Review · {pendingQuotes.length}
              </p>
              <div className="space-y-3">
                {pendingQuotes.map((q) => (
                  <QuoteCard
                    key={q.quoteId}
                    quote={q}
                    actionLoading={actionLoading}
                    onAccept={onAccept}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && otherQuotes.length > 0 && (
            <div className={pendingQuotes.length > 0 ? 'mt-6' : ''}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Previous · {otherQuotes.length}
              </p>
              <div className="space-y-3">
                {otherQuotes.map((q) => (
                  <QuoteCard
                    key={q.quoteId}
                    quote={q}
                    actionLoading={actionLoading}
                    onAccept={onAccept}
                  />
                ))}
              </div>
            </div>
          )}
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

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, actionLoading, onAccept }) => {
  const isPending  = quote.status.toUpperCase() === 'PENDING';
  const isWorking  = actionLoading === quote.quoteId;

  return (
    <div className={`rounded-2xl border p-4 transition ${isPending ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/10 text-[#1066b1] font-black text-sm">
          {quote.driverName ? quote.driverName.charAt(0).toUpperCase() : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-[#041627] truncate">{quote.driverName ?? 'Driver'}</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${quoteBadge(quote.status)}`}>
              {quote.status}
            </span>
          </div>

          {quote.notes && (
            <p className="mt-1 text-xs text-slate-500">{quote.notes}</p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xl font-black text-[#1066b1]">
                ${Number(quote.amountPerDay).toLocaleString('en-US')}<span className="text-sm font-bold text-slate-400">/day</span>
              </p>
              <p className="text-xs text-slate-400">Total: ${Number(quote.totalAmount).toLocaleString('en-US')}</p>
            </div>
            {quote.createdAt && (
              <p className="text-[10px] text-slate-400">
                {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {isPending && (
        <div className="mt-3 border-t border-slate-100 pt-3">
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

/* ── Main Component ─────────────────────────────────────────────────────────── */

const HaulierShiftsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [activeStatus, setActiveStatus] = useState<ShiftStatus>('OPEN');
  const [page, setPage] = useState(1);
  const [allShifts, setAllShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');

  /* Quotes panel state */
  const [quotesShiftId, setQuotesShiftId]   = useState<string | null>(null);
  const [quotesShift, setQuotesShift]        = useState<ShiftItem | null>(null);
  const [quotes, setQuotes]                  = useState<QuoteItem[]>([]);
  const [quotesLoading, setQuotesLoading]    = useState(false);
  const [quotesError, setQuotesError]        = useState('');
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);

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

  useEffect(() => { loadShifts(); }, []);

  const filteredShifts = useMemo(
    () => allShifts.filter((s) => s.status.toUpperCase() === activeStatus),
    [allShifts, activeStatus],
  );

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / PAGE_SIZE));
  const pagedShifts = filteredShifts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeSection = SECTIONS.find((s) => s.key === activeStatus) ?? SECTIONS[0];

  const openCount      = allShifts.filter((s) => s.status.toUpperCase() === 'OPEN').length;
  const completedCount = allShifts.filter((s) => s.status.toUpperCase() === 'COMPLETED').length;

  /* Form helpers */
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
      setSuccess('Shift posted! Drivers can now view and submit quotes.');
      setForm(defaultForm);
      setShowForm(false);
      await loadShifts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shift');
    } finally {
      setActionLoading(false);
    }
  };

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
      setSuccess('Quote accepted — shift is now booked.');
      await loadShifts();
    } catch (err) {
      setQuotesError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  /* Row actions */
  const handleCompleteDay = async (shiftId: string) => {
    setActionLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await haulierService.completeShiftDay(shiftId);
      setSuccess('Day marked complete.');
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

  const today = new Date().toISOString().split('T')[0];
  const totalDaysPreview =
    form.startDate && form.endDate && form.endDate >= form.startDate
      ? Math.floor((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000) + 1
      : null;

  /* Column count for empty state colspan */
  const colCount =
    activeStatus === 'OPEN'        ? 6 :
    activeStatus === 'BOOKED'      ? 7 :
    activeStatus === 'IN_PROGRESS' ? 7 :
    activeStatus === 'COMPLETED'   ? 6 :
    /* CANCELLED */                  6;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">

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

      {/* Post shift form */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="relative w-full max-w-2xl bg-white shadow-2xl min-h-full p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">New Shift</p>
                <h2 className="text-xl font-black text-[#041627]">Post a Shift</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePost} className="space-y-6">
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
                          active ? 'border-[#1066b1] bg-[#1066b1]/5 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
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
                <input type="number" min={1} max={24} value={form.hoursPerDay} onChange={set('hoursPerDay')} required placeholder="8" className={inputCls} style={{ maxWidth: '240px' }} />
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label text="Pickup Location" required />
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">trip_origin</span>
                    <input type="text" value={form.pickupAddress} onChange={set('pickupAddress')} required placeholder="e.g. Andheri Industrial Zone, Mumbai" className={inputCls + ' pl-9'} />
                  </div>
                </div>
                <div>
                  <Label text="Drop-off Location" required />
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">place</span>
                    <input type="text" value={form.dropAddress} onChange={set('dropAddress')} required placeholder="e.g. Bhiwandi Warehouse, Thane" className={inputCls + ' pl-9'} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label text="Additional Notes" hint="(optional)" />
                <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Any specific requirements, schedule details, equipment needed…" className={inputCls + ' resize-none'} />
              </div>

              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <p className="text-sm font-bold text-red-700">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={actionLoading} className="flex-1 sm:flex-none sm:px-10 bg-[#1066b1] hover:bg-[#0e57a0] disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-colors shadow-sm">
                  {actionLoading ? 'Posting…' : 'Post Shift'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="flex-1 sm:flex-none sm:px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
            onClick={() => setShowForm(true)}
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
              onClick={() => setShowForm(true)}
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
                {activeStatus !== 'OPEN' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Progress</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                {activeStatus !== 'CANCELLED' && activeStatus !== 'COMPLETED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
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

                    {/* Progress (all tabs except OPEN) */}
                    {activeStatus !== 'OPEN' && (
                      <td className="px-6 py-5 min-w-[160px]">
                        <p className="text-sm font-black text-[#041627]">
                          {shift.daysCompleted}
                          <span className="text-slate-400 text-xs font-bold">/{shift.totalDays}</span>
                        </p>
                        <div className="mt-1.5 h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${activeStatus === 'CANCELLED' ? 'bg-red-400' : 'bg-[#1066b1]'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {shift.dailyRate && shift.daysCompleted > 0 && (
                          <p className={`text-xs font-black mt-1 ${activeStatus === 'CANCELLED' ? 'text-slate-500' : 'text-[#1066b1]'}`}>
                            {activeStatus === 'CANCELLED'
                              ? `Partial: $${(shift.dailyRate * shift.daysCompleted).toLocaleString()}`
                              : `$${shift.dailyRate.toLocaleString()}/day`}
                          </p>
                        )}
                        {shift.dailyRate && shift.daysCompleted === 0 && (
                          <p className="text-xs font-black text-[#1066b1] mt-1">${shift.dailyRate.toLocaleString()}/day</p>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(shift.status)}`}>
                        {shift.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    {activeStatus !== 'CANCELLED' && activeStatus !== 'COMPLETED' && (
                      <td className="px-6 py-5 min-w-[180px]">
                        {activeStatus === 'OPEN' ? (
                          <button
                            onClick={() => openQuotesPanel(shift)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1066b1]/30 bg-[#1066b1]/8 px-3 py-2 text-xs font-black text-[#1066b1] transition hover:bg-[#1066b1] hover:text-white"
                          >
                            <span className="material-symbols-outlined text-[15px]">gavel</span>
                            View Quotes
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {canComplete && (
                              <button
                                onClick={() => handleCompleteDay(shift.shiftId)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                Complete Day {shift.daysCompleted + 1}
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
                        {activeStatus === 'OPEN' ? 'Post a new shift to start receiving quotes.' : 'Try another tab to see shifts with a different status.'}
                      </p>
                      {activeStatus === 'OPEN' && (
                        <button onClick={() => setShowForm(true)} className="mt-1 rounded-2xl bg-[#1066b1] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0e57a0]">
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
