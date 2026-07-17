import React, { useState } from 'react';
import { useAdminJobs } from '../../hooks/useAdmin';
import type { Job } from '../../types';

const CompletedJobsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: 'COMPLETED', search: '', limit: 10 });
  const { data, loading, error } = useAdminJobs(params);

  const totalRevenue = data?.items.reduce((sum, j) => sum + (j.agreedAmount ?? 0), 0) ?? 0;

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Completed Jobs</h2>
          <p className="text-on-surface-variant font-medium">Successfully delivered freight jobs.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-lg text-sm font-bold text-green-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {data?.total ?? 0} Completed
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">payments</span>
            £{totalRevenue.toLocaleString()} (this page)
          </div>
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by job ref, pickup or drop location..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goods</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount Paid</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.items.map((job: Job) => {
                const pickup = typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address;
                const drop = typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address;
                const allDone = job.complianceStatus
                  ? Object.values(job.complianceStatus).every((v) => v === 'completed')
                  : false;
                return (
                  <tr key={job.jobId} className="hover:bg-green-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sm text-green-600">check</span>
                        </div>
                        <div>
                          <p className="font-black text-primary text-sm">{job.jobRef || '—'}</p>
                          {job.loadCode && <p className="text-xs text-slate-400">{job.loadCode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[180px]">
                      <p className="text-xs font-bold text-[#44474C] truncate">{pickup || 'N/A'}</p>
                      <p className="text-[10px] text-slate-300 my-0.5">▼</p>
                      <p className="text-xs text-slate-500 truncate">{drop || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{job.haulier?.name || '—'}</p>
                      {job.haulier?.phone && <p className="text-xs text-slate-400">{job.haulier.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{job.driver?.name || '—'}</p>
                      {job.driver?.vehicleNumber && <p className="text-xs text-slate-400">{job.driver.vehicleNumber}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#44474C] font-medium">{job.goodsType || '—'}</p>
                      {job.weightKg != null && <p className="text-xs text-slate-400">{job.weightKg} kg</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-green-700">
                        {job.agreedAmount != null ? `£${job.agreedAmount.toLocaleString()}` : '—'}
                      </p>
                      {job.paymentStatus && (
                        <p className="text-[10px] font-black uppercase text-green-500">{job.paymentStatus}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {job.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {allDone ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <span className="material-symbols-outlined text-[10px]">verified</span>
                          Complete
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 w-fit">
                          Partial
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">check_circle</span>
                    No completed jobs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} completed jobs</p>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
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

export default CompletedJobsPage;
