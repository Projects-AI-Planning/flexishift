import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaulierJobs } from '../../../hooks/useHaulier';

type JobStatus = 'OPEN' | 'BOOKED' | 'IN_TRANSIT' | 'COMPLETED';

type HaulierJobRow = {
  jobId: string;
  jobRef?: string;
  jobReference?: string;
  loadCode?: string;
  status: string;
  createdAt?: string;
  jobDate?: string;
  pickupAddress?: string;
  pickupLocation?: string;
  dropAddress?: string;
  dropLocation?: string;
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number;
  distanceKm?: number;
  timeSlot?: string;
  updatedAt?: string;
};

type SectionMeta = {
  key: JobStatus;
  label: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  tone: string;
};

const SECTIONS: SectionMeta[] = [
  {
    key: 'OPEN',
    label: 'Open',
    title: 'Open Jobs',
    description: 'Jobs waiting to be reviewed, quoted, or booked.',
    icon: 'inventory_2',
    accent: 'from-blue-600 via-sky-600 to-cyan-500',
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    key: 'BOOKED',
    label: 'Booked',
    title: 'Booked Jobs',
    description: 'Jobs that have been reserved and are moving through the workflow.',
    icon: 'event_available',
    accent: 'from-indigo-600 via-violet-600 to-fuchsia-500',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    title: 'In Transit Jobs',
    description: 'Jobs currently moving with active handover or live tracking.',
    icon: 'local_shipping',
    accent: 'from-emerald-600 via-teal-600 to-cyan-500',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    title: 'Completed Jobs',
    description: 'Jobs that have been delivered and closed out.',
    icon: 'check_circle',
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
];

const PAGE_SIZE = 10;

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status: string) => status.replace(/_/g, ' ');

const statusBadge = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (normalized === 'BOOKED') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'IN_TRANSIT') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (normalized === 'CANCELLED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

const routeForStatus = (status: JobStatus) => {
  switch (status) {
    case 'BOOKED':
      return '/haulier/jobs/booked';
    case 'IN_TRANSIT':
      return '/haulier/jobs/transit';
    case 'COMPLETED':
      return '/haulier/jobs/completed';
    case 'OPEN':
    default:
      return '/haulier/jobs/open';
  }
};

interface HaulierJobsSectionProps {
  status: JobStatus;
  allowPostJob?: boolean;
}

const HaulierJobsSection: React.FC<HaulierJobsSectionProps> = ({ status, allowPostJob = false }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({
    page,
    per_page: PAGE_SIZE,
    status,
  }), [page, status]);

  const { data, loading, error, refresh } = useHaulierJobs(params);

  const jobs = (data?.jobs as HaulierJobRow[] | undefined) ?? [];
  const activeSection = SECTIONS.find((section) => section.key === status) ?? SECTIONS[0];

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const handleRefresh = () => {
    refresh();
  };

  const openCount = jobs.filter((job) => job.status.toUpperCase() === 'OPEN').length;
  const completedCount = jobs.filter((job) => job.status.toUpperCase() === 'COMPLETED').length;

  return (
    <div className="space-y-8">
      <section className={`relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br ${activeSection.accent} px-6 py-7 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:px-8`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-200">My Jobs</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
              {activeSection.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-white/80 md:text-base">
              {activeSection.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm lg:w-[420px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Visible</p>
              <p className="mt-1 text-lg font-black">{String(data?.total ?? jobs.length).padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Page</p>
              <p className="mt-1 text-lg font-black">{page} / {totalPages}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            onClick={() => navigate(routeForStatus(section.key))}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              status === section.key
                ? 'border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
            {section.label}
          </button>
        ))}
        {allowPostJob && (
          <button
            onClick={() => navigate('/haulier/post-job')}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Post New Job
          </button>
        )}
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-primary/40 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Jobs on page</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{String(jobs.length).padStart(2, '0')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Open</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{String(openCount).padStart(2, '0')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Completed</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{String(completedCount).padStart(2, '0')}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)] ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">{activeSection.title}</h2>
            <p className="text-sm text-slate-500">Backend filtered by `status={status}` for your haulier account.</p>
          </div>
          {allowPostJob && (
            <button
              onClick={() => navigate('/haulier/post-job')}
              className="hidden rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-400 md:inline-flex"
            >
              Post New Job
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Goods</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Schedule</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                {status === 'BOOKED' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Payment</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const isPaymentSecured = job.status?.toUpperCase() === 'PAYMENT_SECURED';
                const needsPayment = !isPaymentSecured && ['BOOKED', 'PAYMENT_PENDING'].includes(job.status?.toUpperCase() ?? '');
                return (
                <tr key={job.jobId} className={`transition hover:bg-slate-50/70 ${isPaymentSecured ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isPaymentSecured ? 'bg-emerald-100 text-emerald-700' : activeSection.tone}`}>
                        <span className="material-symbols-outlined text-base">{isPaymentSecured ? 'verified' : activeSection.icon}</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{job.jobReference ?? job.jobRef}</p>
                        {job.loadCode ? (
                          <button
                            onClick={() => { void navigator.clipboard.writeText(job.loadCode ?? ''); }}
                            className="flex items-center gap-1 mt-0.5 group"
                            title="Click to copy load code"
                          >
                            <span className="font-mono text-xs font-black text-primary">{job.loadCode}</span>
                            <span className="material-symbols-outlined text-[11px] text-slate-400 group-hover:text-primary">content_copy</span>
                          </button>
                        ) : (
                          <p className="text-xs text-slate-400">No load code</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-[260px]">
                    <p className="text-sm font-bold text-slate-900 truncate">{job.pickupLocation ?? job.pickupAddress ?? 'N/A'}</p>
                    <p className="text-[10px] text-slate-300 my-1">▼</p>
                    <p className="text-sm text-slate-500 truncate">{job.dropLocation ?? job.dropAddress ?? 'N/A'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-900">{job.goodsType ?? 'N/A'}</p>
                    {job.weightKg != null && <p className="text-xs text-slate-400">{job.weightKg} kg</p>}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-900">{job.vehicleType ?? 'N/A'}</p>
                    {job.distanceKm != null && <p className="text-xs text-slate-400">{job.distanceKm} km</p>}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-900">{formatDate(job.jobDate)}</p>
                    {job.timeSlot && <p className="text-xs text-slate-400">{statusLabel(job.timeSlot)}</p>}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(job.status)}`}>
                      {statusLabel(job.status)}
                    </span>
                    <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(job.createdAt)}</p>
                    {allowPostJob && job.status === 'OPEN' && (
                      <p className="mt-1 text-xs font-black uppercase tracking-wider text-blue-600">Ready for quotes</p>
                    )}
                  </td>
                  {status === 'BOOKED' && (
                    <td className="px-6 py-5">
                      {isPaymentSecured ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                            <span className="text-xs font-black text-emerald-700">Payment Secured</span>
                          </div>
                          {job.loadCode && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Load Code — Share with driver</p>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-emerald-800">{job.loadCode}</span>
                                <button
                                  onClick={() => { void navigator.clipboard.writeText(job.loadCode ?? ''); }}
                                  className="text-emerald-500 hover:text-emerald-700"
                                  title="Copy"
                                >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : needsPayment ? (
                        <button
                          onClick={() => navigate(`/haulier/payments/create?jobId=${job.jobId}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">lock</span>
                          Secure Payment
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
                );
              })}

              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={status === 'BOOKED' ? 7 : 6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-2xl text-slate-400">search_off</span>
                      </div>
                      <p className="font-black text-slate-700">No {activeSection.label.toLowerCase()} jobs found</p>
                      <p className="text-sm text-slate-400">
                        {allowPostJob ? 'Post a new job to start receiving quotes.' : 'Try another section to see jobs with a different status.'}
                      </p>
                      {allowPostJob && (
                        <button
                          onClick={() => navigate('/haulier/post-job')}
                          className="mt-1 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-400"
                        >
                          Post New Job
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs font-bold text-slate-500">
            Showing {jobs.length} of {data?.total ?? 0} jobs
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HaulierJobsSection;
