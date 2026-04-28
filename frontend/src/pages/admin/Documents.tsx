import React, { useState } from 'react';
import { useAdminVerifications } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';

const DocumentsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1 });
  const { data, loading, error, refresh } = useAdminVerifications(params);

  const handleApprove = async (docId: string) => {
    try {
      await adminService.approveDocument(docId);
      refresh();
    } catch (err) {
      alert('Failed to approve document');
    }
  };

  const handleReject = async (docId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await adminService.rejectDocument(docId, reason);
      refresh();
    } catch (err) {
      alert('Failed to reject document');
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Compliance & Verifications</h2>
          <p className="text-on-surface-variant font-medium">Review and approve supplier credentials to maintain platform safety.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {data?.totalPending || 0} Pending Reviews
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Guidelines & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-6 rounded-xl shadow-lg border border-slate-700/30">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-amber-500">verified_user</span>
              <h3 className="text-xl font-bold">Verification Protocol</h3>
            </div>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Images must be clear, legible and in color.
              </li>
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Format: JPG, PNG, or PDF (max 10MB).
              </li>
              <li className="flex gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                Names must exactly match the user profile.
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Pending Review List */}
        <div className={`lg:col-span-8 space-y-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {data?.pendingVerifications.map((request: any) => (
            <div key={request.supplierId} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-primary">
                    {request.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-primary">{request.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{request.role} • Joined {request.joinedAt ? new Date(request.joinedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {request.documents.map((doc: any) => (
                  <div key={doc.documentId} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600`}>
                        <span className="material-symbols-outlined text-2xl">description</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">{doc.documentType}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black uppercase text-amber-600`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none px-4 py-2 border border-slate-200 text-primary font-bold rounded-lg text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Document
                      </a>
                      <button 
                        onClick={() => handleApprove(doc.documentId)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                      <button 
                        onClick={() => handleReject(doc.documentId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined">cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!data || data.pendingVerifications.length === 0) && !loading && (
            <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
              <p className="text-sm font-bold text-slate-400">No more pending reviews</p>
              <p className="text-xs text-slate-400 mt-1">You've caught up with all compliance requests.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
