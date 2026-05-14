import React, { useState } from 'react';
import { useAdminDisputes } from '../../hooks/useAdmin';
import adminService from '../../api/adminService';
import type { Dispute } from '../../types';

interface ExtendedDispute extends Dispute {
  jobReference: string;
  disputeReason: string;
  reportedBy: string;
  totalAmount: number;
}

const DisputesPage: React.FC = () => {
  const [params, setParams] = useState({ page: 1, status: 'under_review' });
  const { data, loading, error, refresh } = useAdminDisputes(params);
  const [selectedDispute, setSelectedDispute] = useState<ExtendedDispute | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolution: 'release_full_payment',
    refundAmount: 0,
    releaseAmount: 0,
    adminNote: '',
    notifyBothParties: true
  });

  const handleResolve = async () => {
    if (!selectedDispute) return;
    try {
      await adminService.resolveDispute(selectedDispute.disputeId, resolutionData);
      setIsModalOpen(false);
      refresh();
    } catch {
      alert('Failed to resolve dispute');
    }
  };

  if (error) return <div className="p-8 text-red-500 font-bold bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary tracking-tight">Disputes Overview</h2>
          <p className="text-on-surface-variant font-medium">Review and resolve platform delivery disputes.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setParams({ ...params, status: 'under_review' })}
          className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${params.status === 'under_review' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Under Review
        </button>
        <button 
          onClick={() => setParams({ ...params, status: 'resolved' })}
          className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${params.status === 'resolved' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          Resolved
        </button>
      </div>

      {/* Disputes Table */}
      <div className={`bg-white rounded-xl shadow-[0_4px_12px_rgba(26,43,60,0.05)] border border-slate-50 overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reported By</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.items as ExtendedDispute[])?.map((dispute) => (
                <tr key={dispute.disputeId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{dispute.jobReference}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                      {dispute.disputeReason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-primary">{dispute.reportedBy}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(dispute.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setResolutionData({ ...resolutionData, releaseAmount: dispute.totalAmount });
                        setIsModalOpen(true);
                      }}
                      className="bg-primary text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity">
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {isModalOpen && selectedDispute && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 lg:p-8">
            <h3 className="text-2xl font-black text-primary mb-2">Resolve Dispute</h3>
            <p className="text-on-surface-variant font-medium mb-8">Job: {selectedDispute.jobReference} | Amount: £{selectedDispute.totalAmount}</p>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resolution Type</label>
                <select 
                  value={resolutionData.resolution}
                  onChange={(e) => setResolutionData({ ...resolutionData, resolution: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="release_full_payment">Release Full Payment to Driver</option>
                  <option value="full_refund">Full Refund to Haulier</option>
                  <option value="partial_refund">Partial Refund / Split</option>
                </select>
              </div>

              {resolutionData.resolution === 'partial_refund' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refund to Haulier (£)</label>
                    <input 
                      type="number"
                      value={resolutionData.refundAmount}
                      onChange={(e) => setResolutionData({ ...resolutionData, refundAmount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Release to Driver (£)</label>
                    <input 
                      type="number"
                      value={resolutionData.releaseAmount}
                      onChange={(e) => setResolutionData({ ...resolutionData, releaseAmount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admin Note</label>
                <textarea 
                  value={resolutionData.adminNote}
                  onChange={(e) => setResolutionData({ ...resolutionData, adminNote: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Explain the reason for this resolution..."
                ></textarea>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={handleResolve}
                className="flex-1 bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
              >
                Confirm Resolution
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 sm:px-8 bg-slate-100 text-primary font-black py-4 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputesPage;
