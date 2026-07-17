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

const EMPTY_FORM = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', role: 'DRIVER', status: 'ACTIVE' };

const UsersPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, role: '', status: '', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminUsers(params);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const selectedRole = selectedUser?.role?.toLowerCase();

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      if (newStatus === 'ACTIVE') {
        await adminService.activateUser(userId, { reason: 'Admin activation', notifyUser: true });
      } else if (newStatus === 'SUSPENDED') {
        await adminService.suspendUser(userId, { reason: 'Admin suspension', suspensionDuration: 'indefinite', notifyUser: true });
      }
      refresh();
      if (selectedUser?.userId === userId) {
        const updatedUser = await adminService.getUserProfile(userId);
        setSelectedUser(updatedUser);
      }
    } catch {
      alert('Failed to update user status');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }
    setCreateLoading(true);
    try {
      await adminService.createUser({
        fullName: createForm.fullName,
        email: createForm.email,
        phone: createForm.phone,
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
      });
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">User Management</h2>
          <p className="text-on-surface-variant font-medium">Manage and verify platform participants.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
          <button
            onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(''); setIsCreateOpen(true); }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 transition-colors shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add New User
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full min-w-[160px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value })}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={params.role}
            onChange={(e) => setParams({ ...params, role: e.target.value })}
            className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Roles</option>
            <option value="driver">Driver</option>
            <option value="haulier">Haulier</option>
            <option value="admin">Admin</option>
          </select>
          <select 
            value={params.status}
            onChange={(e) => setParams({ ...params, status: e.target.value })}
            className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.items as ExtendedUser[])?.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center font-bold text-primary">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-primary text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-[#44474C] bg-slate-100 px-3 py-1 rounded-lg">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      user.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => viewProfile(user.userId)}
                        className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors" title="View Profile">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      {user.status !== 'ACTIVE' && (
                        <button 
                          onClick={() => handleStatusUpdate(user.userId, 'ACTIVE')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activate">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        </button>
                      )}
                      {user.status !== 'SUSPENDED' && (
                        <button 
                          onClick={() => handleStatusUpdate(user.userId, 'SUSPENDED')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Suspend">
                          <span className="material-symbols-outlined text-sm">block</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} users</p>
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

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">Create New User</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                  <input
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="+44 7700 000000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="DRIVER">Driver</option>
                    <option value="HAULIER">Haulier</option>
                    <option value="FIRM">Firm</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Password</label>
                  <input
                    required
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm Password</label>
                  <input
                    required
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Repeat password"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
              {createError && (
                <p className="text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2 text-sm font-black text-[#44474C] bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 text-sm font-black text-white bg-primary rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">User Profile</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl sm:text-3xl font-black text-primary border-2 border-slate-200">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-primary">{selectedUser.name}</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">{selectedUser.role}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      selectedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedUser.status}
                    </span>
                  </div>
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

              <div className="mt-12 flex justify-end gap-3 pt-6 border-t border-slate-100">
                {selectedUser.status === 'ACTIVE' ? (
                  <button 
                    onClick={() => handleStatusUpdate(selectedUser.userId, 'SUSPENDED')}
                    className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-red-100 transition-colors">
                    Suspend Account
                  </button>
                ) : (
                  <button 
                    onClick={() => handleStatusUpdate(selectedUser.userId, 'ACTIVE')}
                    className="bg-green-50 text-green-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-green-100 transition-colors">
                    Activate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
