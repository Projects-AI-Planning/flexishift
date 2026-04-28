import React from 'react';
import { User, Shield, Bell, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Account Settings</h1>
        <p className="text-gray-500">Manage your profile, security, and preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">{user?.name}</h2>
            <p className="text-sm text-gray-400">{user?.role} Account • {user?.email}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wider mb-4">
              <User size={16} className="text-amber" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input type="text" defaultValue={user?.name} className="w-full p-2 border border-gray-100 rounded bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
                <input type="email" defaultValue={user?.email} className="w-full p-2 border border-gray-100 rounded bg-gray-50/50" disabled />
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wider mb-4">
              <Shield size={16} className="text-amber" /> Security
            </h3>
            <button className="text-sm font-bold text-blue-600 hover:underline">Change Password</button>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wider mb-4">
              <Bell size={16} className="text-amber" /> Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-navy focus:ring-navy" />
                <span className="text-sm text-gray-600 font-medium">Email notifications for load updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-navy focus:ring-navy" />
                <span className="text-sm text-gray-600 font-medium">In-app alerts for critical payments</span>
              </label>
            </div>
          </section>
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button className="bg-navy text-white px-6 py-2 rounded-lg font-bold shadow-md hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
