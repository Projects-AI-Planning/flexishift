import React, { useCallback, useEffect, useState } from 'react';
import haulierService from '../../api/haulierService';

type HaulierDispute = {
  disputeId: string;
  jobId: string;
  jobReference: string;
  status: string;
  disputeReason?: string | null;
  raisedAt?: string | null;
  paymentOnHold?: number | null;
  currency?: string | null;
  evidencePhotos?: string[] | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  driver?: {
    name?: string | null;
    phone?: string | null;
    vehicleNumber?: string | null;
  } | null;
};

const formatDate = (value?: string | null) => (
  value ? new Date(value).toLocaleString('en-IN') : 'N/A'
);

const HaulierDisputesPage: React.FC = () => {
  const [items, setItems] = useState<HaulierDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await haulierService.listDisputes({ page: 1, limit: 50 }) as {
        items?: HaulierDispute[];
        total?: number;
      };
      setItems(result.items ?? []);
      setTotal(result.total ?? 0);
      setError('');
    } catch {
      setError('Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">Disputes</h2>
          <p className="text-on-surface-variant font-medium">Driver-reported job issues that need admin review.</p>
        </div>
        <button
          onClick={() => void fetchDisputes()}
          disabled={loading}
          className="w-fit rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Open Disputes</p>
          <p className="text-3xl font-black text-[#041627]">{loading ? '...' : total}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment On Hold</p>
          <p className="text-3xl font-black text-[#1066b1]">
            ₹{items.reduce((sum, item) => sum + Number(item.paymentOnHold ?? 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
          <p className="text-lg font-black text-amber-700">Under Review</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className={`space-y-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <p className="font-black text-[#44474C]">No disputes found</p>
            <p className="mt-1 text-sm text-slate-400">Driver-reported issues will appear here once submitted.</p>
          </div>
        ) : items.map((item) => (
          <div key={item.disputeId} className="rounded-xl border border-slate-50 bg-white p-5 shadow-[0_4px_12px_rgba(26,43,60,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-lg font-black text-primary">{item.jobReference}</p>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                    Under Review
                  </span>
                </div>
                <p className="max-w-3xl text-sm font-semibold text-[#44474C]">
                  {item.disputeReason ?? 'No reason provided.'}
                </p>
                {!!item.evidencePhotos?.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.evidencePhotos.map((url, index) => (
                      <a
                        key={`${item.disputeId}-${url}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        title={`Evidence ${index + 1}`}
                      >
                        <img src={url} alt={`Issue evidence ${index + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="font-black uppercase tracking-widest text-slate-400">Driver</p>
                    <p className="mt-1 font-bold text-primary">{item.driver?.name ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-widest text-slate-400">Reported</p>
                    <p className="mt-1 font-bold text-primary">{formatDate(item.raisedAt)}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-widest text-slate-400">Pickup</p>
                    <p className="mt-1 font-bold text-primary truncate">{item.pickupLocation ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-widest text-slate-400">Drop</p>
                    <p className="mt-1 font-bold text-primary truncate">{item.dropLocation ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-xl bg-[#1066b1]/10 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0a4a8f]">Held Amount</p>
                <p className="mt-1 text-xl font-black text-primary">
                  ₹{Number(item.paymentOnHold ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HaulierDisputesPage;
