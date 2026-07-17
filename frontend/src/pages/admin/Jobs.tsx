import React, { useState, useCallback } from 'react';
import { useAdminJobs } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { Job } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Jobs' },
  { value: 'OPEN', label: 'Open' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { value: 'PAYMENT_SECURED', label: 'Payment Secured' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERY_SUBMITTED', label: 'Delivery Submitted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'in_transit') return 'bg-blue-100 text-blue-700';
  if (s === 'open') return 'bg-amber-100 text-amber-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-700';
  if (s === 'disputed') return 'bg-orange-100 text-orange-700';
  if (s === 'payment_secured' || s === 'booked') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-[#44474C]';
};

const bidStatusBadge = (status: string) => {
  const s = (status || '').toString().toLowerCase();
  if (s === 'accepted') return 'bg-green-100 text-green-700';
  if (s === 'rejected' || s === 'withdrawn') return 'bg-red-100 text-red-700';
  if (s === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

interface Quote {
  quoteId: string;
  quoteAmount: number;
  currency?: string;
  status: string;
  createdAt?: string;
  supplier?: {
    name?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    avgRating?: number;
    completedJobs?: number;
  };
}

interface ExtendedJob extends Job {
  quoteCount?: number;
  jobReference?: string;
}

const BidsPanel: React.FC<{ jobId: string; jobRef: string; onClose: () => void }> = ({ jobId, jobRef, onClose }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setLoading(true);
    adminService.getJobQuotes(jobId)
      .then((data: { items?: Quote[] }) => {
        setQuotes(data?.items ?? []);
      })
      .catch(() => setError('Failed to load bids.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-black text-primary text-lg">Driver Bids</h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Job Ref: {jobRef}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
            </div>
          )}
          {!loading && error && (
            <p className="text-center text-red-500 font-bold py-8">{error}</p>
          )}
          {!loading && !error && quotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">gavel</span>
              <p className="text-sm font-bold text-slate-400">No bids yet</p>
              <p className="text-xs text-slate-400 mt-1">No drivers have submitted a bid for this job.</p>
            </div>
          )}
          {!loading && !error && quotes.length > 0 && (
            <div className="space-y-3">
              {quotes.map((q) => (
                <div key={q.quoteId} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                      {(q.supplier?.name ?? 'D').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-primary text-sm">{q.supplier?.name ?? 'Unknown Driver'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {q.supplier?.vehicleType && (
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {q.supplier.vehicleType}
                          </span>
                        )}
                        {q.supplier?.avgRating != null && (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">star</span>
                            {q.supplier.avgRating.toFixed(1)}
                          </span>
                        )}
                        {q.supplier?.completedJobs != null && (
                          <span className="text-[10px] text-slate-400">{q.supplier.completedJobs} jobs done</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-black text-primary text-base">
                      {q.currency ?? '£'}{Number(q.quoteAmount).toLocaleString()}
                    </p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${bidStatusBadge(q.status)}`}>
                      {String(q.status).replace(/_/g, ' ')}
                    </span>
                    {q.createdAt && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && quotes.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs text-slate-500 font-bold">{quotes.length} bid{quotes.length !== 1 ? 's' : ''} submitted</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminJobsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: '', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminJobs(params);
  const [selectedJob, setSelectedJob] = useState<{ jobId: string; jobRef: string } | null>(null);

  const openBids = useCallback((job: ExtendedJob) => {
    setSelectedJob({ jobId: job.jobId, jobRef: job.jobRef || job.jobReference || job.jobId });
  }, []);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {selectedJob && (
        <BidsPanel
          jobId={selectedJob.jobId}
          jobRef={selectedJob.jobRef}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">All Jobs</h2>
          <p className="text-on-surface-variant font-medium">Monitor all freight jobs and driver bids on the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Total: {data?.total ?? 0} Jobs
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full min-w-[160px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by job ref, pickup or drop location..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={params.status}
          onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
          className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Jobs Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Bids</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.items as ExtendedJob[])?.map((job) => {
                const pickup = typeof job.pickupLocation === 'string' ? job.pickupLocation : (job.pickupLocation as any)?.address;
                const drop = typeof job.dropLocation === 'string' ? job.dropLocation : (job.dropLocation as any)?.address;
                const date = job.jobDate || job.createdAt;
                const quoteCount = (job as ExtendedJob).quoteCount ?? 0;
                return (
                  <tr key={job.jobId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-primary text-sm">{job.jobRef || (job as ExtendedJob).jobReference || '—'}</p>
                      {job.goodsType && <p className="text-xs text-slate-400">{job.goodsType}</p>}
                      {date && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(date).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-6 py-4 max-w-[180px]">
                      <p className="text-xs text-[#44474C] font-bold truncate">{pickup || 'N/A'}</p>
                      <div className="flex items-center gap-1 my-0.5">
                        <span className="material-symbols-outlined text-[10px] text-slate-300">arrow_downward</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{drop || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{job.haulier?.name || '—'}</p>
                      {job.haulier?.phone && <p className="text-xs text-slate-400">{job.haulier.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{job.driver?.name || 'Unassigned'}</p>
                      {(job.driver as any)?.vehicleType && <p className="text-xs text-slate-400">{(job.driver as any).vehicleType}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-primary">
                        {job.agreedAmount != null ? `£${Number(job.agreedAmount).toLocaleString()}` : '—'}
                      </p>
                      {job.paymentStatus && (
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{job.paymentStatus}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {quoteCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-black text-xs px-2.5 py-1 rounded-full">
                          <span className="material-symbols-outlined text-xs">gavel</span>
                          {quoteCount}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">0 bids</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full w-fit ${statusBadge(job.status)}`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                        {job.hasDispute && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 w-fit flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">warning</span>
                            Dispute
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openBids(job)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black text-primary border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        title="View driver bids"
                      >
                        <span className="material-symbols-outlined text-sm">gavel</span>
                        View Bids
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && (data?.items?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">local_shipping</span>
                    No jobs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items?.length || 0} of {data?.total || 0} jobs</p>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >Previous</button>
            <button
              disabled={!data || data.items.length < params.limit}
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminJobsPage;
