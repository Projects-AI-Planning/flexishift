import React from 'react';
import { useAdminExpiredDocuments } from '../../hooks/useAdmin';
import type { ExpiredDoc } from '../../hooks/useAdmin';

const DOC_TYPE_LABELS: Record<string, string> = {
  DRIVING_LICENCE: 'Driving Licence',
  VEHICLE_REG: 'Vehicle Registration',
  VEHICLE_INSURANCE: 'Vehicle Insurance',
  COMPANY_REG: 'Company Registration',
  FLEET_INSURANCE: 'Fleet Insurance',
  OTHER: 'Other',
};

const getRoleBadge = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'driver': return 'bg-blue-100 text-blue-700';
    case 'haulier': return 'bg-amber-100 text-amber-700';
    case 'firm': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-[#44474C]';
  }
};

const ExpiredDocumentsPage: React.FC = () => {
  const { data, loading, error, refresh } = useAdminExpiredDocuments();

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Expired Documents</h2>
          <p className="text-on-surface-variant font-medium">
            Approved documents whose expiry date has passed. Drivers with expired docs are blocked from jobs/shifts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">event_busy</span>
            {data?.total ?? 0} Expired
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-primary font-bold rounded-lg text-sm hover:bg-slate-50 transition-all"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {(data?.items as ExpiredDoc[])?.map((doc) => (
          <div key={doc.documentId} className="bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: doc info + driver info */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl text-red-500">event_busy</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-primary text-sm">
                      {doc.customName ?? DOC_TYPE_LABELS[doc.docType] ?? doc.docType.replace(/_/g, ' ')}
                    </p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-[#1066b1]/10 text-[#0a4a8f]'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.expiryDate && (
                    <p className="text-xs text-red-600 font-bold mt-0.5">
                      Expired: {new Date(doc.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-primary text-xs shrink-0">
                      {doc.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-primary text-xs">{doc.userName}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${getRoleBadge(doc.userRole)}`}>
                          {doc.userRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{doc.userEmail}</p>
                      {doc.userPhone && <p className="text-[10px] text-slate-400">{doc.userPhone}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: view button */}
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
          </div>
        ))}

        {(!data || data.items.length === 0) && !loading && (
          <div className="bg-slate-50 p-12 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">check_circle</span>
            <p className="text-sm font-bold text-slate-400">No expired documents</p>
            <p className="text-xs text-slate-400 mt-1">All approved documents are within their validity period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiredDocumentsPage;
