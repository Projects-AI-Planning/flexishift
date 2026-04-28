import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { Truck, MapPin, Calendar, MoreVertical, Search, Filter } from 'lucide-react';

type Job = {
  jobId: string;
  jobRef: string;
  status: string;
  createdAt: string;
};

const AdminJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/jobs')
      .then(res => {
        setJobs(res.data.data.items);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div>Loading jobs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-navy">Global Job Monitor</h1>
          <p className="text-gray-500">Oversee all active and historical freight movements.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Reference..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-bold text-navy text-xs uppercase tracking-widest">Reference</th>
              <th className="p-4 font-bold text-navy text-xs uppercase tracking-widest">Date Created</th>
              <th className="p-4 font-bold text-navy text-xs uppercase tracking-widest">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {jobs.map((job) => (
              <tr key={job.jobId} className="hover:bg-gray-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded text-navy">
                      <Truck size={16} />
                    </div>
                    <span className="font-bold text-navy">{job.jobRef}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-500 flex items-center gap-2">
                  <Calendar size={14} />
                  {new Date(job.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                    job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                    job.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-gray-300 hover:text-navy">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminJobsPage;
