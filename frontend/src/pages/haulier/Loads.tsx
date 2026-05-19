import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import haulierService from '../../api/haulierService';

type Section = 'matching' | 'bids' | 'awarded';

type SupplierMatch = {
  supplierId: string;
  name?: string;
  email?: string;
  phone?: string;
  avgRating?: number;
  completedJobs?: number;
  distanceKm?: number;
  vehicleType?: string;
  vehicleRegistration?: string;
  licenseNumber?: string;
  coverageArea?: string;
};

type MatchingLoad = {
  jobId: string;
  jobReference: string;
  loadCode?: string;
  status: string;
  pickupLocation?: string;
  dropLocation?: string;
  goodsType?: string;
  vehicleType?: string;
  jobDate?: string;
  timeSlot?: string;
  matchCount: number;
  topMatches: SupplierMatch[];
};

type BidQuote = {
  quoteId: string;
  supplierId: string;
  supplierName?: string;
  supplierPhone?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type BidsLoad = {
  jobId: string;
  jobReference: string;
  loadCode?: string;
  status: string;
  pickupLocation?: string;
  dropLocation?: string;
  goodsType?: string;
  vehicleType?: string;
  jobDate?: string;
  timeSlot?: string;
  quoteCount: number;
  activeQuoteCount: number;
  lowestQuote?: number | null;
  selectedQuote?: BidQuote | null;
  quotes: BidQuote[];
};

type AwardedLoad = {
  jobId: string;
  jobReference: string;
  loadCode?: string;
  status: string;
  pickupLocation?: string;
  dropLocation?: string;
  goodsType?: string;
  vehicleType?: string;
  jobDate?: string;
  timeSlot?: string;
  agreedAmount?: number;
  paymentStatus?: string;
  selectedSupplier?: {
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  } | null;
  currentStage?: string;
  hasPayment?: boolean;
  quoteCount?: number;
};

const sections: Array<{ key: Section; label: string; path: string; icon: string }> = [
  { key: 'matching', label: 'Matching', path: '/haulier/loads/matching', icon: 'target' },
  { key: 'bids', label: 'Bids', path: '/haulier/loads/bids', icon: 'contract_edit' },
  { key: 'awarded', label: 'Awarded', path: '/haulier/loads/awarded', icon: 'task_alt' },
];

const money = (value?: number | null) => (value == null ? 'N/A' : `INR ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const prettyDate = (value?: string) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

const badgeClass = (status: string) => {
  const key = status.toLowerCase();
  if (['open', 'booked', 'payment_secured'].includes(key)) return 'bg-emerald-100 text-emerald-700';
  if (['completed'].includes(key)) return 'bg-blue-100 text-blue-700';
  if (['disputed', 'cancelled'].includes(key)) return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-[#44474C]';
};

const HaulierLoadsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection: Section = useMemo(() => {
    if (location.pathname.includes('/bids')) return 'bids';
    if (location.pathname.includes('/awarded')) return 'awarded';
    return 'matching';
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [items, setItems] = useState<MatchingLoad[] | BidsLoad[] | AwardedLoad[]>([]);

  const [searchDraft, setSearchDraft] = useState('');
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState('');
  const [radiusDraft, setRadiusDraft] = useState('50');
  const [statusDraft, setStatusDraft] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    vehicleType: '',
    radiusKm: '50',
    status: '',
  });

  useEffect(() => {
    setSearchDraft(filters.search);
    setVehicleTypeDraft(filters.vehicleType);
    setRadiusDraft(filters.radiusKm);
    setStatusDraft(filters.status);
  }, [filters]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          search: filters.search || undefined,
          vehicle_type: filters.vehicleType || undefined,
          radius_km: filters.radiusKm ? Number(filters.radiusKm) : undefined,
          status: filters.status || undefined,
        } as Record<string, unknown>;

        const result = activeSection === 'matching'
          ? await haulierService.getLoadMatching(params)
          : activeSection === 'bids'
            ? await haulierService.getLoadBids(params)
            : await haulierService.getLoadAwarded(params);

        if (!mounted) return;
        setItems((result?.items ?? []) as MatchingLoad[] | BidsLoad[] | AwardedLoad[]);
        setSummary(result?.summary ?? {});
        setError('');
        setErrorDetail('');
      } catch (err: unknown) {
        if (!mounted) return;
        setError('Failed to load load-management data.');
        const response = err as {
          response?: {
            status?: number;
            data?: { message?: string; detail?: string };
          };
        };
        const status = response.response?.status;
        const backendMessage = response.response?.data?.message || response.response?.data?.detail;
        if (status) {
          setErrorDetail(`Backend responded with ${status}${backendMessage ? `: ${backendMessage}` : ''}`);
        } else {
          setErrorDetail('Check whether the backend is running and whether your session is still authenticated.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      mounted = false;
    };
  }, [activeSection, filters]);

  const applyFilters = () => {
    setFilters({
      search: searchDraft.trim(),
      vehicleType: vehicleTypeDraft.trim(),
      radiusKm: radiusDraft.trim() || '50',
      status: statusDraft.trim(),
    });
  };

  const retry = () => {
    setError('');
    setErrorDetail('');
    setFilters(current => ({ ...current }));
  };

  const activeMeta = sections.find(section => section.key === activeSection) ?? sections[0];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.24)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.22),_transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-[#1066b1]/50">
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              Load Management
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Matching, bids, and awarded loads</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Browse open loads, inspect incoming bids, and track awarded jobs from the same backend-backed view.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">Section</p>
              <p className="mt-1 text-lg font-black">{activeMeta.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">Items</p>
              <p className="mt-1 text-lg font-black">{summary.openLoads ?? summary.jobsWithBids ?? summary.awardedLoads ?? items.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => navigate(section.path)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
              activeSection === section.key
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white text-[#44474C] border border-slate-200 hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <input
          value={searchDraft}
          onChange={e => setSearchDraft(e.target.value)}
          placeholder="Search by job ref, route, or goods"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          value={vehicleTypeDraft}
          onChange={e => setVehicleTypeDraft(e.target.value)}
          placeholder="Vehicle type"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
        />
        {activeSection === 'matching' ? (
          <input
            value={radiusDraft}
            onChange={e => setRadiusDraft(e.target.value)}
            placeholder="Radius km"
            inputMode="numeric"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          />
        ) : (
          <input
            value={statusDraft}
            onChange={e => setStatusDraft(e.target.value)}
            placeholder="Status filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          />
        )}
        <button
          onClick={applyFilters}
          className="rounded-2xl bg-[#1066b1]/100 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#1066b1]"
        >
          Apply Filters
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <div>{error}</div>
          {errorDetail && <div className="mt-1 text-xs font-medium text-red-600">{errorDetail}</div>}
          <button
            onClick={retry}
            className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">{summary.openLoads ?? summary.jobsWithBids ?? summary.awardedLoads ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Secondary</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">
            {summary.withMatches ?? summary.activeQuotes ?? summary.inTransit ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Average</p>
          <p className="mt-2 text-2xl font-black text-[#041627]">
            {summary.avgMatchesPerLoad ?? summary.selectedLoads ?? summary.completed ?? 0}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
          Loading loads...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-black text-[#041627]">No records found</p>
          <p className="mt-2 text-sm text-slate-500">Try a different filter or switch to another load section.</p>
        </div>
      ) : activeSection === 'matching' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {(items as MatchingLoad[]).map(load => (
            <article key={load.jobId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open load</p>
                  <h3 className="mt-1 text-xl font-black text-[#041627]">{load.jobReference}</h3>
                  <p className="mt-1 text-sm text-slate-500">{load.pickupLocation} to {load.dropLocation}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(load.status)}`}>
                  {load.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Goods</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.goodsType ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vehicle</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.vehicleType ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Job date</p>
                  <p className="mt-1 font-bold text-[#041627]">{prettyDate(load.jobDate)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Matches</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.matchCount}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Top matches</p>
                <div className="mt-3 space-y-3">
                  {load.topMatches.length ? load.topMatches.map(match => (
                    <div key={match.supplierId} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#041627]">{match.name ?? 'Unnamed supplier'}</p>
                          <p className="text-sm text-slate-500">{match.vehicleType ?? 'Vehicle N/A'} {match.vehicleRegistration ? `- ${match.vehicleRegistration}` : ''}</p>
                        </div>
                        <p className="text-xs font-black text-[#0d55a0]">{match.distanceKm?.toFixed(1) ?? '0.0'} km</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{match.email ?? 'No email'} {match.phone ? `- ${match.phone}` : ''}</p>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No matching suppliers in range.
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : activeSection === 'bids' ? (
        <div className="space-y-4">
          {(items as BidsLoad[]).map(load => (
            <article key={load.jobId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Bid board</p>
                  <h3 className="mt-1 text-xl font-black text-[#041627]">{load.jobReference}</h3>
                  <p className="mt-1 text-sm text-slate-500">{load.pickupLocation} to {load.dropLocation}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(load.status)}`}>{load.status}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                    {load.quoteCount} quotes
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Goods</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.goodsType ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vehicle</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.vehicleType ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lowest active quote</p>
                  <p className="mt-1 font-bold text-[#041627]">{money(load.lowestQuote ?? null)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.selectedQuote ? load.selectedQuote.supplierName : 'Not selected'}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {(load.quotes ?? []).map(quote => (
                  <div key={quote.quoteId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#041627]">{quote.supplierName ?? 'Supplier'}</p>
                        <p className="text-sm text-slate-500">{quote.supplierPhone ?? 'No phone'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <p className="text-xs text-slate-500">Submitted {prettyDate(quote.createdAt)}</p>
                      <p className="text-lg font-black text-primary">{money(quote.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(items as AwardedLoad[]).map(load => (
            <article key={load.jobId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Awarded load</p>
                  <h3 className="mt-1 text-xl font-black text-[#041627]">{load.jobReference}</h3>
                  <p className="mt-1 text-sm text-slate-500">{load.pickupLocation} to {load.dropLocation}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(load.status)}`}>{load.status}</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    {load.paymentStatus ?? 'payment pending'}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supplier</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.selectedSupplier?.name ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
                  <p className="mt-1 font-bold text-[#041627]">{money(load.agreedAmount ?? null)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stage</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.currentStage ?? load.status}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quotes</p>
                  <p className="mt-1 font-bold text-[#041627]">{load.quoteCount ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-[#44474C]">
                <p><span className="font-black text-[#041627]">Vehicle:</span> {load.selectedSupplier?.vehicleType ?? 'N/A'} {load.selectedSupplier?.vehicleNumber ? `- ${load.selectedSupplier.vehicleNumber}` : ''}</p>
                <p className="mt-1"><span className="font-black text-[#041627]">Contact:</span> {load.selectedSupplier?.phone ?? 'N/A'}</p>
                <p className="mt-1"><span className="font-black text-[#041627]">Job date:</span> {prettyDate(load.jobDate)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default HaulierLoadsPage;
