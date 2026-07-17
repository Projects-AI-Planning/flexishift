import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Shield, Bell, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import adminService from '../../api/adminService';
import type { SystemConfig } from '../../types';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await adminService.getSystemConfig();
      setConfig(data);
    } catch {
      console.error('Failed to fetch system config');
    }
  }, []);

  useEffect(() => {
    if (isAdmin && !hasFetched.current) {
      hasFetched.current = true;
      fetchConfig();
    }
  }, [isAdmin, fetchConfig]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setLoading(true);
      await adminService.updateSystemConfig(config);
      alert('System configuration updated successfully');
    } catch {
      alert('Failed to update system configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">System Settings</h2>
        <p className="text-on-surface-variant font-medium">Manage your profile and platform configurations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-50 flex items-center gap-6">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {user?.name?.[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-black text-primary">{user?.name}</h3>
            <p className="text-sm text-on-surface-variant font-bold uppercase tracking-wider">{user?.role} Account • {user?.email}</p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8 space-y-12">
          {/* Personal Info */}
          <section>
            <h4 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-6">
              <User size={16} className="text-amber-500" /> Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input type="text" defaultValue={user?.name} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" defaultValue={user?.email} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none" disabled />
              </div>
            </div>
          </section>

          {/* Admin System Config */}
          {isAdmin && config && (
            <section className="pt-8 border-t border-slate-50">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-6">
                <SettingsIcon size={16} className="text-amber-500" /> Platform Configuration
              </h4>
              <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Commission Rate (%)</label>
                  <input 
                    type="text" 
                    value={config.commissionRate} 
                    onChange={(e) => setConfig({ ...config, commissionRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">OTP Expiry (Minutes)</label>
                  <input 
                    type="number" 
                    value={config.otpExpiryMinutes} 
                    onChange={(e) => setConfig({ ...config, otpExpiryMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dispute Resolution Window (Hours)</label>
                  <input 
                    type="number" 
                    value={config.disputeResolutionHours} 
                    onChange={(e) => setConfig({ ...config, disputeResolutionHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary" 
                    />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={config.maintenanceMode} 
                        onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </div>
                    <span className="text-sm font-bold text-primary uppercase tracking-wider">Maintenance Mode</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <button 
                    disabled={loading}
                    type="submit"
                    className="bg-primary text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update System Config'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Security */}
          <section className="pt-8 border-t border-slate-50">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-6">
              <Shield size={16} className="text-amber-500" /> Security & Access
            </h4>
            <div className="flex gap-4">
              <button className="text-sm font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-xl hover:bg-blue-100 transition-colors">Change Password</button>
              <button className="text-sm font-black text-red-600 bg-red-50 px-6 py-2 rounded-xl hover:bg-red-100 transition-colors">Deactivate Account</button>
            </div>
          </section>

          {/* Notifications */}
          <section className="pt-8 border-t border-slate-50">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-6">
              <Bell size={16} className="text-amber-500" /> Notifications
            </h4>
            <div className="space-y-4">
              <label className="flex items-center gap-4 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-200 text-primary focus:ring-primary" />
                <span className="text-sm text-primary font-bold">Email notifications for new bookings and job updates</span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-200 text-primary focus:ring-primary" />
                <span className="text-sm text-primary font-bold">SMS alerts for critical platform events</span>
              </label>
            </div>
          </section>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button className="bg-primary text-white px-10 py-4 rounded-xl font-black text-sm shadow-xl hover:opacity-90 transition-all active:scale-95">
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
