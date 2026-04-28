import React, { useState } from 'react';
import { useAdminJobs } from '../../hooks/useAdmin';

const AdminJobsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: '' });
  const { data, loading, error } = useAdminJobs(params);

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Jobs Monitor</h2>
          <p className="text-on-surface-variant font-medium">Real-time tracking of platform freight movements.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">download</span>
            Export List
          </button>
        </div>
      </div>

      {/* Filters & Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex flex-wrap items-center gap-6 border border-slate-50">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status Filter</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setParams({ ...params, status: '' })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!params.status ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
              >
                All Jobs
              </button>
              <button 
                onClick={() => setParams({ ...params, status: 'OPEN' })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${params.status === 'OPEN' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
              >
                Open
              </button>
              <button 
                onClick={() => setParams({ ...params, status: 'IN_TRANSIT' })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${params.status === 'IN_TRANSIT' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
              >
                In Transit
              </button>
              <button 
                onClick={() => setParams({ ...params, status: 'DELIVERED' })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${params.status === 'DELIVERED' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
              >
                Delivered
              </button>
            </div>
          </div>
        </div>
        <div className="bg-primary p-6 rounded-xl shadow-lg text-white flex flex-col justify-center">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Live Jobs</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-black">{data?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* Shipment Grid */}
      <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {data?.items.map((shipment: any) => (
          <div key={shipment.jobId} className="bg-white rounded-xl shadow-[0px_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden hover:shadow-md transition-all group">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                    <span className="material-symbols-outlined text-2xl">local_shipping</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-primary tracking-tight">{shipment.jobReference}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        shipment.status === 'completed' || shipment.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' : 
                        shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {shipment.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">Job ID: {shipment.jobId}</p>
                  </div>
                </div>
              </div>

              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</p>
                      <p className="text-sm font-bold text-primary truncate">{shipment.pickupLocation?.address || shipment.pickupLocation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination</p>
                      <p className="text-sm font-bold text-primary truncate">{shipment.dropLocation?.address || shipment.dropLocation || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-50 h-32 relative">
                   <div className="absolute inset-0 flex items-center justify-center">
                     <span className="material-symbols-outlined text-4xl text-slate-200">map</span>
                   </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                    <p className="text-sm font-black text-primary">{shipment.jobDate ? new Date(shipment.jobDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary text-[8px]">
                        {shipment.driver?.name?.charAt(0) || '?'}
                      </div>
                      <p className="text-sm font-bold text-primary">{shipment.driver?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
                <button className="text-xs font-black text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-wider">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <p className="text-sm text-slate-500 font-medium">Showing <span className="font-bold text-primary">{data?.items.length || 0}</span> jobs</p>
        <div className="flex gap-2">
          <button 
            disabled={params.page === 1}
            onClick={() => setParams({ ...params, page: params.page - 1 })}
            className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-primary disabled:opacity-40"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button 
            disabled={!data || data.items.length < 10}
            onClick={() => setParams({ ...params, page: params.page + 1 })}
            className="w-10 h-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center text-primary disabled:opacity-40"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminJobsPage;
