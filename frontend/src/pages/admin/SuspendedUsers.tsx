import React, { useState } from 'react';
import { useAdminUsers } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { User } from '../../types';

interface ExtendedUser extends User {
  haulierProfile?: {
    companyName: string;
    gstNumber: string;
  };
  driverProfile?: {
    vehicleType: string;
    licenseVerified: boolean;
  };
}

const SuspendedUsersPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, role: '', status: 'SUSPENDED', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminUsers(params);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const selectedRole = selectedUser?.role?.toLowerCase();

  const handleActivate = async (userId: string) => {
    try {
      await adminService.activateUser(userId, { reason: 'Admin reactivation', notifyUser: true });
      refresh();
      if (selectedUser?.userId === userId) {
        setIsModalOpen(false);
      }
    } catch {
      alert('Failed to activate user');
    }
  };

  const viewProfile = async (userId: string) => {
    try {
      const user = await adminService.getUserProfile(userId);
      setSelectedUser(user);
      setIsModalOpen(true);
    } catch {
      alert('Failed to fetch user profile');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'driver': return 'bg-blue-100 text-blue-700';
      case 'haulier': return 'bg-amber-100 text-amber-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-[#44474C]';
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Suspended Users</h2>
          <p className="text-on-surface-variant font-medium">Review and manage accounts that have been suspended.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg text-sm font-bold text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">block</span>
            Suspended: {data?.total ?? 0} Accounts
          </div>
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search suspended users by name, email, or ID..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={params.role}
          onChange={(e) => setParams({ ...params, role: e.target.value, page: 1 })}
          className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Roles</option>
          <option value="driver">Driver</option>
          <option value="haulier">Haulier</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Suspended Users Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Suspended On</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.items as ExtendedUser[])?.map((user) => (
                <tr key={user.userId} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 overflow-hidden border border-red-200 flex items-center justify-center font-bold text-red-500">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-primary text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {user.role?.toLowerCase() === 'haulier' && user.haulierProfile?.companyName
                      ? user.haulierProfile.companyName
                      : user.role?.toLowerCase() === 'driver' && user.driverProfile?.vehicleType
                      ? user.driverProfile.vehicleType
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => viewProfile(user.userId)}
                        className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors" title="View Profile">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      <button
                        onClick={() => handleActivate(user.userId)}
                        className="px-3 py-1.5 text-xs font-black text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Reinstate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">check_circle</span>
                    No suspended users — all accounts are in good standing
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} suspended accounts</p>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={!data || data.items.length < (params.limit || 10)}
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">Suspended Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Suspension Banner */}
              <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">block</span>
                <p className="text-sm font-bold text-red-700">This account is currently suspended and cannot access the platform.</p>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-red-100 flex items-center justify-center text-2xl sm:text-3xl font-black text-red-500 border-2 border-red-200">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-primary">{selectedUser.name}</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">{selectedUser.role}</p>
                  <span className="mt-2 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    SUSPENDED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.joinedAt ? new Date(selectedUser.joinedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {selectedRole === 'haulier' && (
                    <>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Name</p>
                        <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Number</p>
                        <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.gstNumber || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {selectedRole === 'driver' && (
                    <>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Type</p>
                        <p className="text-sm font-bold text-primary">{selectedUser.driverProfile?.vehicleType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">License Verified</p>
                        <p className="text-sm font-bold text-primary">{selectedUser.driverProfile?.licenseVerified ? 'Yes' : 'No'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-sm font-black text-[#44474C] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Close
                </button>
                <button
                  onClick={() => handleActivate(selectedUser.userId)}
                  className="bg-green-50 text-green-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-green-100 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Reinstate Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuspendedUsersPage;
