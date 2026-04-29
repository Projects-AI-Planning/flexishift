import React, { useState } from 'react';
import { useHaulierJobs } from '../../hooks/useHaulier';
import type { Job } from '../../types';

type JobLocation = string | Job['pickupLocation'];

type ExtendedJob = Omit<Job, 'pickupLocation' | 'dropLocation'> & {
  jobReference: string;
  pickupLocation: JobLocation;
  dropLocation: JobLocation;
};

const HaulierJobsPage: React.FC = () => {
  const [params] = useState({ page: 1 });
  const { data, loading, error } = useHaulierJobs(params);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Active Shipments</h2>
          <p className="text-on-surface-variant font-medium">Tracking and managing your assigned freight.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Data
          </button>
          <button className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-amber-400 transition-colors shadow-md flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Post New Job
          </button>
        </div>
      </div>

      {/* Shipments Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] overflow-hidden border border-slate-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.jobs as ExtendedJob[])?.map((job) => (
                <tr key={job.jobId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-primary">
                        {typeof job.pickupLocation === 'string' ? job.pickupLocation : job.pickupLocation?.address} → {typeof job.dropLocation === 'string' ? job.dropLocation : job.dropLocation?.address}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Freight</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-500 font-mono">#{job.jobReference}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary text-[8px]">
                        {job.driver?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm text-primary font-bold">{job.driver?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-primary">£{job.agreedAmount || '0.00'}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      job.status === 'in_transit' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HaulierJobsPage;
