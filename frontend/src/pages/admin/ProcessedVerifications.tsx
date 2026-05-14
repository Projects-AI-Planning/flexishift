import React, { useState } from 'react';
import { useAdminProcessedVerifications } from '../../hooks/useAdmin';
import type { ProcessedDocument, ProcessedVerification } from '../../types';

const statusConfig = {
  approved: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-700', icon: 'check_circle' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', icon: 'cancel' },
};

const ProcessedVerificationsPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, role: '', status: '', limit: 10 });
  const { data, loading, error } = useAdminProcessedVerifications(params);

  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'driver': return 'bg-blue-100 text-blue-700';
      case 'haulier': return 'bg-amber-100 text-amber-700';
      case 'firm': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-[#44474C]';
    }
  };

  const getStatusCounts = () => {
    if (!data?.processedVerifications) return { approved: 0, rejected: 0 };
    let approved = 0, rejected = 0;
    data.processedVerifications.forEach((u) => {
      u.documents.forEach((d) => {
        if (d.status === 'approved') approved++;
        else if (d.status === 'rejected') rejected++;
      });
    });
    return { approved, rejected };
  };

  const counts = getStatusCounts();

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Processed Verifications</h2>
          <p className="text-on-surface-variant font-medium">Documents that have been approved or rejected by admins.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {counts.approved} Approved
          </div>
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">cancel</span>
            {counts.rejected} Rejected
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <select
            value={params.role}
            onChange={(e) => setParams({ ...params, role: e.target.value, page: 1 })}
            className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Roles</option>
            <option value="driver">Driver</option>
            <option value="haulier">Haulier</option>
          </select>
          <select
            value={params.status}
            onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
            className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Outcomes</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 font-bold md:ml-auto">
          {data?.total ?? 0} users with processed documents
        </p>
      </div>

      {/* Results */}
      <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {(data?.processedVerifications as ProcessedVerification[])?.map((user) => (
          <div key={user.userId} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-hidden">
            {/* User Row — click to expand */}
            <button
              onClick={() => toggleExpand(user.userId)}
              className="w-full p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-primary text-sm shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-primary text-sm">{user.name}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {/* Doc count badges */}
                <div className="hidden md:flex items-center gap-2">
                  {user.documents.filter((d) => d.status === 'approved').length > 0 && (
                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {user.documents.filter((d) => d.status === 'approved').length} approved
                    </span>
                  )}
                  {user.documents.filter((d) => d.status === 'rejected').length > 0 && (
                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {user.documents.filter((d) => d.status === 'rejected').length} rejected
                    </span>
                  )}
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${expandedUser === user.userId ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {/* Expanded Documents */}
            {expandedUser === user.userId && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {(user.documents as ProcessedDocument[]).map((doc) => {
                  const cfg = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.approved;
                  return (
                    <div key={doc.documentId} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <span className={`material-symbols-outlined text-xl ${cfg.text}`}>{cfg.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{doc.documentType}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                            {doc.reviewedAt && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Reviewed {new Date(doc.reviewedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {doc.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              Reason: {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-primary font-bold rounded-lg text-xs hover:bg-slate-50 transition-all w-fit shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        View Document
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {(!data || data.processedVerifications.length === 0) && !loading && (
          <div className="bg-slate-50 p-12 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
            <p className="text-sm font-bold text-slate-400">No processed verifications yet</p>
            <p className="text-xs text-slate-400 mt-1">Approved and rejected documents will appear here.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold">Showing {data.processedVerifications.length} of {data.total} users</p>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="px-4 py-2 text-xs font-black text-primary bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={!data || data.processedVerifications.length < (params.limit || 10)}
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              className="px-4 py-2 text-xs font-black text-white bg-primary rounded-lg shadow-md shadow-primary/20 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessedVerificationsPage;
