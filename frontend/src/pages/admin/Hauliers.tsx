import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminUsers } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import client from '../../api/client';
import type { User } from '../../types';
import SetUserPasswordModal, { AdminPasswordField } from '../../components/SetUserPasswordModal';

interface HaulierUser extends User {
  haulierProfile?: {
    companyName: string;
    gstNumber: string;
    companyAddress?: string;
    coverageArea?: string;
  };
  organisationDocument?: {
    docId: string;
    status: string;
    fileUrl: string;
    customName?: string | null;
    rejectionReason?: string | null;
  } | null;
}

interface PendingHaulier {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  companyAddress?: string;
  vatNumber?: string;
  organisationNumber?: string;
  country?: string;
  joinedAt?: string;
  photoUrl?: string | null;
  organisationDocument?: {
    docId: string;
    status: string;
    fileUrl: string;
    customName?: string | null;
  } | null;
}

const HauliersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>(
    searchParams.get('tab') === 'pending' ? 'pending' : 'all'
  );
  const [params, setParams] = useState({ page: 1, role: 'haulier', status: '', search: '', limit: 10 });
  const { data, loading, error, refresh } = useAdminUsers(params);
  const [selectedUser, setSelectedUser] = useState<HaulierUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<HaulierUser | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Pending approval hauliers
  const [pendingData, setPendingData] = useState<{ items: PendingHaulier[]; total: number } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [selectedPending, setSelectedPending] = useState<PendingHaulier | null>(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await client.get('/admin/hauliers/pending', { params: { page: pendingPage, per_page: 10 } });
      setPendingData(res.data?.data ?? { items: [], total: 0 });
    } catch {
      setPendingData({ items: [], total: 0 });
    } finally {
      setPendingLoading(false);
    }
  }, [pendingPage]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
  }, [activeTab, fetchPending]);

  const handleApprove = async (userId: string) => {
    setApproving(userId);
    try {
      await adminService.approveHaulier(userId);
      await fetchPending();
      setIsPendingModalOpen(false);
      setSelectedPending(null);
    } catch {
      alert('Failed to approve haulier');
    } finally {
      setApproving(null);
    }
  };

  // Approve / reject the haulier's organisation registration document (from the pending view)
  const [docReviewing, setDocReviewing] = useState(false);
  const handleDocReview = async (action: 'approve' | 'reject') => {
    const doc = selectedPending?.organisationDocument;
    if (!doc) return;
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Reason for rejecting this document?') ?? '';
      if (!reason.trim()) return;
    }
    setDocReviewing(true);
    try {
      if (action === 'approve') await adminService.approveDocument(doc.docId);
      else await adminService.rejectDocument(doc.docId, reason.trim());
      // Reflect the new status locally + refresh the pending list
      setSelectedPending(prev => prev?.organisationDocument
        ? { ...prev, organisationDocument: { ...prev.organisationDocument, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } }
        : prev);
      await fetchPending();
    } catch {
      alert(`Failed to ${action} document`);
    } finally {
      setDocReviewing(false);
    }
  };

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
      alert('Failed to update haulier status');
    }
  };

  const viewProfile = async (userId: string) => {
    try {
      const user = await adminService.getUserProfile(userId);
      setSelectedUser(user);
      setIsModalOpen(true);
    } catch {
      alert('Failed to fetch haulier profile');
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {successMessage && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-xl text-sm font-bold">
          <span className="material-symbols-outlined text-green-600">check_circle</span>
          {successMessage}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Hauliers</h2>
          <p className="text-on-surface-variant font-medium">Manage haulier companies and freight operators.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg text-sm font-bold text-amber-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            Total: {data?.total ?? 0} Hauliers
          </div>
          {(pendingData?.total ?? 0) > 0 && (
            <div className="bg-[#1066b1]/10 border border-[#1066b1]/20 px-4 py-2 rounded-lg text-sm font-bold text-[#1066b1] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">hourglass_top</span>
              {pendingData?.total} Pending
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          All Hauliers
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Pending Approval
          {(pendingData?.total ?? 0) > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingData?.total}</span>
          )}
        </button>
      </div>

      {/* ── ALL HAULIERS TAB ── */}
      {activeTab === 'all' && (
        <>
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full min-w-[160px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Search hauliers by name, email, or company..."
                value={params.search}
                onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <select
              value={params.status}
              onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
              className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Coverage Area</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="w-40 px-3 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.items as HaulierUser[])?.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border border-amber-200 flex items-center justify-center font-bold text-amber-700">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-primary text-sm">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-primary">{user.haulierProfile?.companyName || 'N/A'}</p>
                        {user.haulierProfile?.gstNumber && (
                          <p className="text-xs text-slate-400">GST: {user.haulierProfile.gstNumber}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {user.haulierProfile?.coverageArea || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          user.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="inline-flex flex-nowrap items-center justify-end">
                          <button
                            onClick={() => viewProfile(user.userId)}
                            className="p-1.5 text-primary hover:bg-slate-100 rounded-lg transition-colors shrink-0" title="View Profile">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            onClick={() => setPasswordUser(user)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0" title="Set Password">
                            <span className="material-symbols-outlined text-[18px]">key</span>
                          </button>
                          {user.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusUpdate(user.userId, 'ACTIVE')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors shrink-0" title="Activate">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          )}
                          {user.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusUpdate(user.userId, 'SUSPENDED')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Suspend">
                              <span className="material-symbols-outlined text-[18px]">block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">
                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">local_shipping</span>
                        No hauliers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-bold">Showing {data?.items.length || 0} of {data?.total || 0} hauliers</p>
              <div className="flex gap-2">
                <button disabled={params.page === 1} onClick={() => setParams({ ...params, page: params.page - 1 })}
                  className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">Previous</button>
                <button disabled={!data || data.items.length < (params.limit || 10)} onClick={() => setParams({ ...params, page: params.page + 1 })}
                  className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── PENDING APPROVAL TAB ── */}
      {activeTab === 'pending' && (
        <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${pendingLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Haulier Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registered</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingData?.items.map((h) => (
                  <tr key={h.userId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-700">
                          {h.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{h.name}</p>
                          <p className="text-xs text-slate-500">{h.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{h.phone || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{h.companyName || 'N/A'}</p>
                      {h.vatNumber && <p className="text-xs text-slate-400">VAT: {h.vatNumber}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {h.joinedAt ? new Date(h.joinedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedPending(h); setIsPendingModalOpen(true); }}
                          className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-colors" title="View Details">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button
                          onClick={() => handleApprove(h.userId)}
                          disabled={approving === h.userId}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-black transition-colors disabled:opacity-50">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          {approving === h.userId ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pendingLoading && (pendingData?.items.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">check_circle</span>
                      No hauliers pending approval
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-bold">Showing {pendingData?.items.length || 0} of {pendingData?.total || 0} pending</p>
            <div className="flex gap-2">
              <button disabled={pendingPage === 1} onClick={() => setPendingPage(p => p - 1)}
                className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Previous</button>
              <button disabled={!pendingData || pendingData.items.length < 10} onClick={() => setPendingPage(p => p + 1)}
                className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* All Hauliers Profile Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">Haulier Profile</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl sm:text-3xl font-black text-amber-700 border-2 border-amber-200">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-primary">{selectedUser.name}</h4>
                  {selectedUser.haulierProfile?.companyName && (
                    <p className="text-[#44474C] font-bold text-sm">{selectedUser.haulierProfile.companyName}</p>
                  )}
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Haulier</p>
                  <span className={`mt-2 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedUser.status}
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
                  <AdminPasswordField onChangePassword={() => setPasswordUser(selectedUser)} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.joinedAt ? new Date(selectedUser.joinedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Name</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Number</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.gstNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Address</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.companyAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coverage Area</p>
                    <p className="text-sm font-bold text-primary">{selectedUser.haulierProfile?.coverageArea || 'N/A'}</p>
                  </div>
                </div>

                {/* Organisation registration document (optional, for verification) */}
                {selectedUser.organisationDocument && (
                  <div className="mt-5 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Organisation Registration Document</p>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          selectedUser.organisationDocument.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          selectedUser.organisationDocument.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{selectedUser.organisationDocument.status}</span>
                      </div>
                      <a
                        href={selectedUser.organisationDocument.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1066b1] px-3 py-2 text-xs font-black text-white hover:bg-[#0d55a0] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        View Document
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setPasswordUser(selectedUser)}
                  className="bg-slate-50 text-slate-700 px-6 py-2 rounded-xl font-black text-sm hover:bg-slate-100 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">key</span>
                  Set Password
                </button>
                {selectedUser.status === 'ACTIVE' ? (
                  <button onClick={() => handleStatusUpdate(selectedUser.userId, 'SUSPENDED')}
                    className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-red-100 transition-colors">
                    Suspend Account
                  </button>
                ) : (
                  <button onClick={() => handleStatusUpdate(selectedUser.userId, 'ACTIVE')}
                    className="bg-green-50 text-green-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-green-100 transition-colors">
                    Activate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Haulier Detail Modal */}
      {isPendingModalOpen && selectedPending && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">Haulier Registration Details</h3>
              <button onClick={() => setIsPendingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status banner */}
              <div className="bg-[#1066b1]/5 border border-[#1066b1]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#1066b1]">hourglass_top</span>
                <p className="text-sm font-bold text-[#1066b1]">Waiting for admin approval</p>
              </div>

              {/* Identity row */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#1066b1]/20 shrink-0">
                  {selectedPending.photoUrl ? (
                    <img src={selectedPending.photoUrl} alt={selectedPending.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1066b1]/10 flex items-center justify-center text-2xl font-black text-[#1066b1]">
                      {selectedPending.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-black text-primary">{selectedPending.name}</h4>
                  <p className="text-slate-500 text-sm">{selectedPending.email}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Registered {selectedPending.joinedAt ? new Date(selectedPending.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">person</span>Personal Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.phone || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Country</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.country || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">business</span>Company Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Name</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.companyName || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Organisation Number</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.organisationNumber || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VAT Number</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.vatNumber || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Address</p>
                    <p className="text-sm font-bold text-primary">{selectedPending.companyAddress || <span className="text-slate-400 font-normal">Not provided</span>}</p>
                  </div>
                </div>
              </div>

              {/* Organisation registration document (optional, for verification) */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">description</span>Organisation Document
                </p>
                {selectedPending.organisationDocument ? (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        selectedPending.organisationDocument.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        selectedPending.organisationDocument.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{selectedPending.organisationDocument.status}</span>
                      <a
                        href={selectedPending.organisationDocument.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-black text-white hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        View Document
                      </a>
                    </div>
                    {/* Approve / Reject the document (only while still pending) */}
                    {selectedPending.organisationDocument.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleDocReview('approve')}
                          disabled={docReviewing}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Approve Document
                        </button>
                        <button
                          onClick={() => void handleDocReview('reject')}
                          disabled={docReviewing}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">cancel</span>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4">No organisation document provided.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setIsPendingModalOpen(false)}
                  className="px-5 py-2 rounded-xl font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Close
                </button>
                <button
                  onClick={() => handleApprove(selectedPending.userId)}
                  disabled={approving === selectedPending.userId}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  {approving === selectedPending.userId ? 'Approving...' : 'Approve Haulier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {passwordUser && (
        <SetUserPasswordModal
          userId={passwordUser.userId}
          userName={passwordUser.name}
          roleLabel="Haulier"
          onClose={() => setPasswordUser(null)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 4000);
          }}
        />
      )}
    </div>
  );
};

export default HauliersPage;
