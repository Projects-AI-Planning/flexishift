import React from 'react';
import { Truck, MapPin, Clock, Calendar } from 'lucide-react';

const HaulierOverview: React.FC = () => {
  // Mock data for haulier - in a real app, fetch from backend
  const activeJobs = [
    { id: '1', ref: 'LD-4521', pickup: 'London', dropoff: 'Manchester', date: '2026-04-28', status: 'IN_TRANSIT' },
    { id: '2', ref: 'LD-4522', pickup: 'Birmingham', dropoff: 'Glasgow', date: '2026-04-29', status: 'CONFIRMED' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Haulier Dashboard</h1>
        <p className="text-gray-500">Manage your fleet and active shipments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Active Shipments</p>
          <p className="text-3xl font-bold text-navy">2</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Pending Invoices</p>
          <p className="text-3xl font-bold text-navy">£1,450</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Average Rating</p>
          <p className="text-3xl font-bold text-navy">4.9/5</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-navy mb-4">Active & Upcoming Jobs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeJobs.map(job => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-navy">{job.ref}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    job.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-amber" />
                    <div>
                      <p className="text-gray-400 text-xs">Pickup</p>
                      <p className="font-semibold">{job.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-gray-300" />
                    <div>
                      <p className="text-gray-400 text-xs">Delivery</p>
                      <p className="font-semibold">{job.dropoff}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{job.date}</span>
                  </div>
                  <button className="text-navy font-bold hover:text-amber transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HaulierOverview;
