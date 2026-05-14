import React, { useState } from 'react';
import { useAdminJobs } from '../../hooks/useAdmin';
import type { Job } from '../../types';

const complianceStep = (val: string) => {
  if (val === 'completed') return { icon: 'check_circle', color: 'text-green-500' };
  if (val === 'submitted') return { icon: 'schedule', color: 'text-amber-500' };
  return { icon: 'radio_button_unchecked', color: 'text-slate-300' };
};

const ActiveJobsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: 'ACTIVE', limit: 10 });
  const { data, loading, error } = useAdminJobs(params);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  const inTransit = data?.items.filter((j) => j.status === 'in_transit').length ?? 0;
  const paymentSecured = data?.items.filter((j) => j.status === 'payment_secured').length ?? 0;
  const withDispute = data?.items.filter((j) => j.hasDispute).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Active Jobs</h2>
          <p className="text-on-surface-variant font-medium">Jobs currently in transit or with secured payment awaiting dispatch.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg text-xs font-black text-blue-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            {inTransit} In Transit
          </div>
          <div className="bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg text-xs font-black text-purple-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">lock</span>
            {paymentSecured} Payment Secured
          </div>
          {withDispute > 0 && (
            <div className="bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg text-xs font-black text-orange-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">warning</span>
              {withDispute} Disputes
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className={`grid grid-cols-1 xl:grid-cols-2 gap-5 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {data?.items.map((job: Job) => {
          const pickup = typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address;
          const drop = typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address;
          const isInTransit = job.status === 'in_transit';

          return (
            <div key={job.jobId} className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.06)] border overflow-hidden ${job.hasDispute ? 'border-orange-200' : isInTransit ? 'border-blue-100' : 'border-slate-50'}`}>
              {/* Top Bar */}
              <div className={`px-5 py-3 flex items-center justify-between ${isInTransit ? 'bg-blue-50' : 'bg-purple-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${isInTransit ? 'text-blue-600' : 'text-purple-600'}`}>
                    {isInTransit ? 'local_shipping' : 'lock'}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isInTransit ? 'text-blue-700' : 'text-purple-700'}`}>
                    {isInTransit ? 'In Transit' : 'Payment Secured'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {job.hasDispute && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">warning</span>
                      Dispute
                    </span>
                  )}
                  <span className="font-black text-primary text-sm">{job.jobRef}</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Route */}
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="w-0.5 h-8 bg-slate-200"></span>
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
                      <p className="text-sm font-bold text-primary truncate">{pickup || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop-off</p>
                      <p className="text-sm font-bold text-primary truncate">{drop || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Haulier</p>
                    <p className="text-sm font-bold text-primary truncate">{job.haulier?.name || '—'}</p>
                    {job.haulier?.phone && <p className="text-xs text-slate-400">{job.haulier.phone}</p>}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</p>
                    <p className="text-sm font-bold text-primary truncate">{job.driver?.name || 'Unassigned'}</p>
                    {job.driver?.vehicleType && <p className="text-xs text-slate-400">{job.driver.vehicleType}</p>}
                  </div>
                </div>

                {/* Compliance Steps */}
                {job.complianceStatus && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Compliance Progress</p>
                    <div className="flex items-center gap-2">
                      {(['loadCode', 'handover', 'delivery'] as const).map((step, i) => {
                        const val = job.complianceStatus![step];
                        const cfg = complianceStep(val);
                        const labels = ['Load Code', 'Handover', 'Delivery'];
                        return (
                          <React.Fragment key={step}>
                            <div className="flex flex-col items-center gap-1">
                              <span className={`material-symbols-outlined text-sm ${cfg.color}`}>{cfg.icon}</span>
                              <span className="text-[9px] font-bold text-slate-400">{labels[i]}</span>
                            </div>
                            {i < 2 && <span className="flex-1 h-0.5 bg-slate-100"></span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                    <p className="text-sm font-black text-primary">
                      {job.agreedAmount != null ? `£${job.agreedAmount.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Date</p>
                    <p className="text-sm font-bold text-primary">
                      {job.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && data?.items.length === 0 && (
          <div className="col-span-2 bg-slate-50 p-12 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">local_shipping</span>
            <p className="text-sm font-bold text-slate-400">No active jobs at the moment</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} active jobs</p>
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
  );
};

export default ActiveJobsPage;
