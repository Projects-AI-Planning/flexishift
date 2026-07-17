import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../api/adminService';

const DOC_TYPE_LABELS: Record<string, string> = {
  DRIVING_LICENCE: 'Driving Licence',
  VEHICLE_REG: 'Vehicle Registration (RC)',
  VEHICLE_INSURANCE: 'Vehicle Insurance',
  COMPANY_REG: 'Company Registration',
  FLEET_INSURANCE: 'Fleet Insurance',
};

interface PendingDoc {
  documentId: string;
  docType: string;
  fileUrl: string;
  status: string;
  rejectionReason?: string;
  createdAt?: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userPhone?: string;
}

interface RejectModalProps {
  docId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const RejectModal: React.FC<RejectModalProps> = ({ docId, onClose, onSubmitted }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Please enter a rejection reason.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await adminService.rejectDocument(docId, reason.trim());
      onSubmitted();
    } catch {
      setError('Failed to reject document. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-red-50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">cancel</span>
            <h3 className="font-black text-red-900 text-lg">Reject Document</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-red-100 transition-colors">
            <span className="material-symbols-outlined text-red-400">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#44474C] font-medium">
            The driver will see this reason in their app. Please be clear and specific so they know exactly what to fix before resubmitting.
          </p>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              rows={4}
              placeholder="e.g. Document is blurry and unreadable. Please upload a clearer photo with all details visible."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#041627] placeholder-slate-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
            />
            {error && <p className="text-xs text-red-600 font-bold mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-[#44474C] font-bold rounded-xl text-sm hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-black rounded-xl text-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Rejecting…</>
            ) : (
              <><span className="material-symbols-outlined text-sm">cancel</span> Reject Document</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminService.listPendingDocuments({ page: 1, limit: 50 });
      setDocs(result?.items ?? []);
      setTotal(result?.total ?? 0);
    } catch {
      setError('Failed to load pending documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const handleApprove = async (docId: string) => {
    try {
      await adminService.approveDocument(docId);
      void fetchDocs();
    } catch {
      alert('Failed to approve document');
    }
  };

  if (error) return (
    <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl flex items-center gap-3">
      <span className="material-symbols-outlined">error</span>
      {error}
      <button onClick={fetchDocs} className="ml-2 underline text-red-700">Retry</button>
    </div>
  );

  // Group documents by user
  const byUser = docs.reduce<Record<string, { userName: string; userEmail: string; userRole: string; userPhone?: string; docs: PendingDoc[] }>>((acc, doc) => {
    const key = doc.userEmail || doc.documentId;
    if (!acc[key]) {
      acc[key] = { userName: doc.userName, userEmail: doc.userEmail, userRole: doc.userRole, userPhone: doc.userPhone, docs: [] };
    }
    acc[key].docs.push(doc);
    return acc;
  }, {});

  const userEntries = Object.entries(byUser);

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {rejectDocId && (
        <RejectModal
          docId={rejectDocId}
          onClose={() => setRejectDocId(null)}
          onSubmitted={() => { setRejectDocId(null); void fetchDocs(); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight sm:text-2xl lg:text-3xl">Compliance & Verifications</h2>
          <p className="text-on-surface-variant font-medium">Review and approve supplier credentials to maintain platform safety.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {total} Pending Reviews
          </div>
          <button
            onClick={fetchDocs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-primary font-bold rounded-lg text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Guidelines */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-4 rounded-xl shadow-lg border border-slate-700/30 sm:p-6">
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

        {/* Right: Pending Documents */}
        <div className={`lg:col-span-8 space-y-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {loading && docs.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
            </div>
          )}

          {!loading && userEntries.length === 0 && (
            <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
              <p className="text-sm font-bold text-slate-400">No pending reviews</p>
              <p className="text-xs text-slate-400 mt-1">All compliance requests have been processed.</p>
            </div>
          )}

          {userEntries.map(([key, { userName, userEmail, userRole, docs: userDocs }]) => (
            <div key={key} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto">
              {/* User header */}
              <div className="px-4 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center sm:px-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-primary">{userName}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {userRole} • {userEmail}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  {userDocs.length} doc{userDocs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Documents */}
              <div className="px-4 py-4 space-y-4 sm:px-6">
                {userDocs.map((doc) => (
                  <div key={doc.documentId} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined text-2xl">description</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">
                          {DOC_TYPE_LABELS[doc.docType] ?? doc.docType.replace(/_/g, ' ')}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-amber-600">
                            {doc.status}
                          </span>
                          {doc.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              · {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                        title="Approve"
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                      <button
                        onClick={() => setRejectDocId(doc.documentId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <span className="material-symbols-outlined">cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
