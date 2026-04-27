import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { Users, Truck, FileText, Banknote } from 'lucide-react';

type Stats = {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  totalRevenue: number;
  pendingDocuments: number;
};

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-navy">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(err => setError('Failed to load statistics'));
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!stats) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Admin Overview</h1>
        <p className="text-gray-500">Welcome back to the FreightFlex control center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={<Users size={24} className="text-blue-600" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Open Jobs" 
          value={stats.openJobs} 
          icon={<Truck size={24} className="text-amber" />} 
          color="bg-amber/10"
        />
        <StatCard 
          title="Pending Documents" 
          value={stats.pendingDocuments} 
          icon={<FileText size={24} className="text-purple-600" />} 
          color="bg-purple-50"
        />
        <StatCard 
          title="Total Revenue" 
          value={`£${stats.totalRevenue.toLocaleString()}`} 
          icon={<Banknote size={24} className="text-green-600" />} 
          color="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-navy mb-4">Job Status Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completed</span>
                <span>{stats.completedJobs} / {stats.totalJobs}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(stats.completedJobs / stats.totalJobs) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Open</span>
                <span>{stats.openJobs} / {stats.totalJobs}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-amber h-2 rounded-full" 
                  style={{ width: `${(stats.openJobs / stats.totalJobs) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
