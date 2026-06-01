import { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';
import SignatureRenderer from '../../components/SignatureRenderer';

type JobSummary = {
  jobId: string;
  jobReference: string;
  status: string;
  pickupLocation?: string;
  dropLocation?: string;
  driver?: { name?: string; phone?: string } | null;
};

type HandoverStatus = {
  checklistSubmitted?: boolean;
  checklistData?: Record<string, boolean> | null;
  driverSigned?: boolean;
  driverSignedAt?: string | null;
  driverSignatureUrl?: string | null;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
  step1Completed?: boolean;
  step1CompletedAt?: string | null;
  conditionPhotos?: string[];
};

type DeliveryStatus = {
  submitted?: boolean;
  notes?: string | null;
};

type HandoverDetail = {
  handover?: HandoverStatus;
  delivery?: DeliveryStatus;
  photos: Array<{ url?: string }>;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US') : 'N/A';

const CHECKLIST_ITEMS = [
  { key: 'lightsSignals', label: 'Lights & Signals' },
  { key: 'tirePressure', label: 'Tyre Pressure' },
  { key: 'fluidLevels', label: 'Fluid Levels' },
  { key: 'bodyDamage', label: 'Body Damage OK' },
] as const;

export default function HaulierHandoverPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HandoverDetail>({ photos: [] });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [active, pending] = await Promise.all([
        haulierService.getActiveJobs({ page: 1, limit: 50 }),
        haulierService.getPendingApprovalJobs({ page: 1, limit: 50 }),
      ]);
      const all = [
        ...((active as { jobs?: JobSummary[] })?.jobs ?? []),
        ...((pending as { jobs?: JobSummary[] })?.jobs ?? []),
      ] as JobSummary[];
      setJobs(all);
      setSelectedJobId((prev) => prev ?? all[0]?.jobId ?? null);
      setError('');
    } catch {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadJobs(); }, []);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.jobId === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    const jobId = selectedJob?.jobId;
    if (!jobId) return;
    let mounted = true;
    setDetailLoading(true);
    Promise.all([
      haulierService.getHandoverStatus(jobId),
      haulierService.getDeliveryStatus(jobId),
      haulierService.viewHandoverPhotos(jobId),
    ])
      .then(([handover, delivery, photos]) => {
        if (!mounted) return;
        setDetail({
          handover: handover as HandoverStatus,
          delivery: delivery as DeliveryStatus,
          photos: ((photos as { photos?: Array<{ url?: string }> })?.photos ?? []) as Array<{ url?: string }>,
        });
      })
      .catch(() => { if (mounted) setDetail({ photos: [] }); })
      .finally(() => { if (mounted) setDetailLoading(false); });
    return () => { mounted = false; };
  }, [selectedJob?.jobId]);

  const photos = detail.handover?.conditionPhotos?.length
    ? detail.handover.conditionPhotos
    : detail.photos.map((p) => p.url).filter(Boolean) as string[];

  const hasData =
    detail.handover?.checklistSubmitted ||
    (detail.handover?.conditionPhotos?.length ?? 0) > 0 ||
    photos.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">My Jobs</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-primary">Handover</h1>
          <p className="text-on-surface-variant font-medium">Driver-submitted vehicle condition, photos and signature per job.</p>
        </div>
        <button
          onClick={() => void loadJobs()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Job list ── */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Jobs</h2>
              <p className="text-xs text-slate-500">Select a job to view handover details</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
              {jobs.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No active jobs found.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {jobs.map((job) => (
                <button
                  key={job.jobId}
                  onClick={() => setSelectedJobId(job.jobId)}
                  className={`w-full rounded-2xl p-3 text-left transition-all ${
                    selectedJobId === job.jobId
                      ? 'bg-[#1066b1] text-white shadow-md shadow-[#1066b1]/20'
                      : 'border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-black ${selectedJobId === job.jobId ? 'text-white/70' : 'text-slate-400'}`}>
                    {job.jobReference}
                  </p>
                  <p className={`text-sm font-bold truncate ${selectedJobId === job.jobId ? 'text-white' : 'text-primary'}`}>
                    {job.pickupLocation ?? 'Unknown'} → {job.dropLocation ?? 'Unknown'}
                  </p>
                  {job.driver?.name && (
                    <p className={`text-xs mt-0.5 ${selectedJobId === job.jobId ? 'text-white/70' : 'text-slate-500'}`}>
                      {job.driver.name}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Handover detail ── */}
        <section className="space-y-6">
          {!selectedJob ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">assignment</span>
              <p className="mt-2 text-sm text-slate-400">Select a job to view its handover details.</p>
            </div>
          ) : (
            <>
              {/* Job info card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{selectedJob.jobReference}</p>
                    <h2 className="text-lg font-black text-primary mt-0.5">
                      {selectedJob.pickupLocation ?? 'N/A'} → {selectedJob.dropLocation ?? 'N/A'}
                    </h2>
                    {selectedJob.driver?.name && (
                      <p className="text-sm text-slate-500 mt-1">
                        Driver: <span className="font-bold text-[#44474C]">{selectedJob.driver.name}</span>
                        {selectedJob.driver.phone && <span className="ml-2 text-slate-400">{selectedJob.driver.phone}</span>}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
                    detail.handover?.haulierSigned
                      ? 'bg-emerald-100 text-emerald-700'
                      : detail.handover?.driverSigned
                      ? 'bg-blue-100 text-blue-700'
                      : detail.handover?.checklistSubmitted
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {detail.handover?.haulierSigned
                      ? 'Fully Signed'
                      : detail.handover?.driverSigned
                      ? 'Driver Signed'
                      : detail.handover?.checklistSubmitted
                      ? 'Checklist Done'
                      : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Handover details */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-primary">Handover Details</h3>
                  <p className="text-sm text-slate-500">Vehicle condition checklist, photos and signature submitted by the driver.</p>
                </div>

                {detailLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-100" />)}
                  </div>
                ) : !hasData ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-slate-300">inventory</span>
                    <p className="mt-2 text-sm text-slate-400">Driver has not submitted handover details yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Checklist */}
                    {detail.handover?.checklistData && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Vehicle Condition Checklist</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CHECKLIST_ITEMS.map(({ key, label }) => {
                            const checked = Boolean(detail.handover?.checklistData?.[key]);
                            return (
                              <div
                                key={key}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                                  checked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}
                              >
                                <span className={`material-symbols-outlined text-base ${checked ? 'text-green-600' : 'text-red-500'}`}>
                                  {checked ? 'check_circle' : 'cancel'}
                                </span>
                                <span className={`text-sm font-bold ${checked ? 'text-green-800' : 'text-red-700'}`}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Condition photos */}
                    {photos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
                          Condition Photos ({photos.length})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {photos.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`Photo ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Driver signature */}
                    {detail.handover?.driverSigned && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Driver Signature</p>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          {detail.handover.driverSignatureUrl && !detail.handover.driverSignatureUrl.startsWith('driver_signed') ? (
                            <SignatureRenderer data={detail.handover.driverSignatureUrl} height={96} />
                          ) : (
                            <p className="text-sm font-bold text-slate-600">
                              Signed digitally at {formatDate(detail.handover.driverSignedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Haulier signature status */}
                    {detail.handover?.haulierSigned && (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-600">verified</span>
                        <div>
                          <p className="text-sm font-black text-emerald-800">Haulier Signed</p>
                          <p className="text-xs text-emerald-700">{formatDate(detail.handover.haulierSignedAt)}</p>
                        </div>
                      </div>
                    )}

                    {/* Delivery notes */}
                    {detail.delivery?.notes && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Delivery Notes</p>
                        <p className="text-sm font-semibold text-[#44474C] bg-slate-50 rounded-xl px-4 py-3">
                          {detail.delivery.notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
