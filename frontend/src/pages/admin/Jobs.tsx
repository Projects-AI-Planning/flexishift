import React, { useState } from 'react';
import { useAdminJobs } from '../../hooks/useAdmin';
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
  const s = status.toLowerCase();
  if (s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'in_transit') return 'bg-blue-100 text-blue-700';
  if (s === 'open') return 'bg-amber-100 text-amber-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-700';
  if (s === 'disputed') return 'bg-orange-100 text-orange-700';
  if (s === 'payment_secured' || s === 'booked') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
};

const AdminJobsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: '', search: '', limit: 10 });
  const { data, loading, error } = useAdminJobs(params);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">All Jobs</h2>
          <p className="text-on-surface-variant font-medium">Monitor and manage all freight jobs on the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Total: {data?.total ?? 0} Jobs
          </div>
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
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
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.items.map((job: Job) => {
                const pickup = typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address;
                const drop = typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address;
                const date = job.jobDate || job.createdAt;
                return (
                  <tr key={job.jobId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-primary text-sm">{job.jobRef || '—'}</p>
                      {job.goodsType && <p className="text-xs text-slate-400">{job.goodsType}</p>}
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-xs text-slate-600 font-bold truncate">{pickup || 'N/A'}</p>
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
                      {job.driver?.vehicleType && <p className="text-xs text-slate-400">{job.driver.vehicleType}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-primary">
                        {job.agreedAmount != null ? `£${job.agreedAmount.toLocaleString()}` : '—'}
                      </p>
                      {job.paymentStatus && (
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{job.paymentStatus}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {date ? new Date(date).toLocaleDateString() : 'N/A'}
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
                  </tr>
                );
              })}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
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
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} jobs</p>
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
