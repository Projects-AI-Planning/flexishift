import { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';

type JobSummary = {
  jobId: string;
  jobReference: string;
  status: string;
  pickupLocation?: string;
  dropLocation?: string;
  driver?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  } | null;
  complianceStatus?: Record<string, string>;
  deliveryProof?: {
    deliveryPhotoUrl?: string | null;
    recipientSignatureUrl?: string | null;
    deliveryNotes?: string | null;
    submittedAt?: string | null;
  };
};

type FullCompliance = {
  job_ref?: string;
  job_status?: string;
  load_code_verified?: boolean;
  load_code_verified_at?: string | null;
  step1_handover_completed?: boolean;
  step1_completed_at?: string | null;
  step2_delivery_submitted?: boolean;
  step2_completed_at?: string | null;
  step3_approved?: boolean;
  step3_approved_at?: string | null;
  disputed?: boolean;
  disputed_at?: string | null;
  dispute_reason?: string | null;
};

type LoadCodeStatus = {
  verified?: boolean;
  verifiedAt?: string | null;
};

type HandoverStatus = {
  checklistSubmitted?: boolean;
  driverSigned?: boolean;
  driverSignedAt?: string | null;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
  step1Completed?: boolean;
  step1CompletedAt?: string | null;
};

type DeliveryStatus = {
  submitted?: boolean;
  submittedAt?: string | null;
  approved?: boolean;
  approvedAt?: string | null;
  disputed?: boolean;
  disputedAt?: string | null;
  notes?: string | null;
};

const badge = (ok: boolean) => (ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600');

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString('en-IN') : 'N/A');

const stepTone = (done?: boolean, active?: boolean) => {
  if (done) return 'bg-emerald-500 text-white';
  if (active) return 'bg-amber-500 text-white';
  return 'bg-slate-100 text-slate-400';
};

export default function HaulierCompliancePage() {
  const [section, setSection] = useState<'active' | 'pending'>('active');
  const [activeJobs, setActiveJobs] = useState<JobSummary[]>([]);
  const [pendingJobs, setPendingJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    full?: FullCompliance;
    loadCode?: LoadCodeStatus;
    handover?: HandoverStatus;
    delivery?: DeliveryStatus;
    photos: Array<{ url?: string; note?: string }>;
  }>({ photos: [] });
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

      const activeItems = ((active as { jobs?: JobSummary[] })?.jobs ?? []) as JobSummary[];
      const pendingItems = ((pending as { jobs?: JobSummary[] })?.jobs ?? []) as JobSummary[];
      setActiveJobs(activeItems);
      setPendingJobs(pendingItems);
      setSelectedJobId((prev) => prev ?? activeItems[0]?.jobId ?? pendingItems[0]?.jobId ?? null);
      setError('');
    } catch (err: unknown) {
      const response = err as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setError(message ? `Failed to load compliance jobs: ${message}` : 'Failed to load compliance jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const selectedJob = useMemo(
    () => [...activeJobs, ...pendingJobs].find((job) => job.jobId === selectedJobId) ?? null,
    [activeJobs, pendingJobs, selectedJobId],
  );

  useEffect(() => {
    const jobId = selectedJob?.jobId;
    if (!jobId) return;

    let mounted = true;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const [full, loadCode, handover, delivery, photos] = await Promise.all([
          haulierService.getFullComplianceStatus(jobId),
          haulierService.getLoadCodeStatus(jobId),
          haulierService.getHandoverStatus(jobId),
          haulierService.getDeliveryStatus(jobId),
          haulierService.viewHandoverPhotos(jobId),
        ]);

        if (!mounted) return;
        setDetail({
          full: full as FullCompliance,
          loadCode: loadCode as LoadCodeStatus,
          handover: handover as HandoverStatus,
          delivery: delivery as DeliveryStatus,
          photos: ((photos as { photos?: Array<{ url?: string; note?: string }> })?.photos ?? []) as Array<{ url?: string; note?: string }>,
        });
      } catch {
        if (!mounted) return;
        setDetail({ photos: [] });
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };

    void fetchDetail();
    return () => {
      mounted = false;
    };
  }, [selectedJob?.jobId]);

  const step1Done = Boolean(detail.full?.step1_handover_completed || detail.handover?.step1Completed);
  const step2Done = Boolean(detail.full?.step2_delivery_submitted || detail.delivery?.submitted);
  const step3Done = Boolean(detail.full?.step3_approved || detail.delivery?.approved);
  const loadCodeDone = Boolean(detail.full?.load_code_verified || detail.loadCode?.verified);

  const jobs = section === 'active' ? activeJobs : pendingJobs;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Documents & Compliance</p>
          <h1 className="text-3xl font-black tracking-tight text-primary">Compliance</h1>
          <p className="text-on-surface-variant font-medium">Backend-backed compliance timeline for your haulier jobs.</p>
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

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSection('active')}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${section === 'active' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
        >
          Active Compliance
        </button>
        <button
          onClick={() => setSection('pending')}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${section === 'pending' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
        >
          Pending Approval
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Jobs</h2>
              <p className="text-xs text-slate-500">{section === 'active' ? 'Active compliance jobs' : 'Jobs awaiting approval'}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {jobs.length}
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">Loading jobs...</div>
            ) : jobs.length ? jobs.map((job) => {
              const selected = job.jobId === selectedJobId;
              return (
                <button
                  key={job.jobId}
                  onClick={() => setSelectedJobId(job.jobId)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${selected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Job Ref</p>
                      <p className="mt-1 font-black text-slate-900">{job.jobReference}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badge(job.status === 'completed' || job.status === 'delivery_submitted' || job.status === 'in_transit')}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {job.pickupLocation ?? 'Pickup N/A'} → {job.dropLocation ?? 'Drop N/A'}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">
                    Driver: {job.driver?.name ?? 'Unassigned'}
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No compliance jobs found.
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Selected Job</p>
                <h2 className="mt-1 text-2xl font-black text-primary">{selectedJob?.jobReference ?? 'No job selected'}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedJob ? `${selectedJob.pickupLocation ?? 'Pickup N/A'} → ${selectedJob.dropLocation ?? 'Drop N/A'}` : 'Choose a job from the list to view compliance details.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:w-[360px]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Current Status</p>
                  <p className="mt-1 font-black text-slate-900">{selectedJob?.status?.replace('_', ' ') ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Step 3</p>
                  <p className="mt-1 font-black text-slate-900">{step3Done ? 'Approved' : 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className={`rounded-2xl p-4 ${stepTone(loadCodeDone)}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">1. Load Code</p>
                <p className="mt-1 text-sm font-bold">{loadCodeDone ? 'Verified' : 'Waiting'}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(detail.loadCode?.verifiedAt ?? detail.full?.load_code_verified_at)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${stepTone(step1Done, !loadCodeDone)}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">2. Handover</p>
                <p className="mt-1 text-sm font-bold">{step1Done ? 'Completed' : 'Waiting'}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(detail.handover?.step1CompletedAt ?? detail.full?.step1_completed_at)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${stepTone(step2Done, step1Done && !step2Done)}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">3. Delivery</p>
                <p className="mt-1 text-sm font-bold">{step2Done ? 'Submitted' : 'Waiting'}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(detail.delivery?.submittedAt ?? detail.full?.step2_completed_at)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${stepTone(step3Done, step2Done && !step3Done)}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">4. Approval</p>
                <p className="mt-1 text-sm font-bold">{step3Done ? 'Approved' : 'Pending'}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(detail.full?.step3_approved_at)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-primary">Compliance Status</h3>
                  <p className="text-sm text-slate-500">Backend timeline for the selected job.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badge(step3Done)}`}>
                  {step3Done ? 'Complete' : 'In Progress'}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Load code verification</p>
                  <p className="mt-1 text-slate-600">
                    {loadCodeDone ? `Verified at ${formatDate(detail.loadCode?.verifiedAt ?? detail.full?.load_code_verified_at)}` : 'Not verified yet'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Vehicle handover</p>
                  <p className="mt-1 text-slate-600">
                    {step1Done ? `Completed at ${formatDate(detail.handover?.step1CompletedAt ?? detail.full?.step1_completed_at)}` : 'Waiting for handover completion'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Delivery submission</p>
                  <p className="mt-1 text-slate-600">
                    {step2Done ? `Submitted at ${formatDate(detail.delivery?.submittedAt ?? detail.full?.step2_completed_at)}` : 'Waiting for delivery proof'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Final approval</p>
                  <p className="mt-1 text-slate-600">
                    {step3Done ? `Approved at ${formatDate(detail.full?.step3_approved_at)}` : 'Pending approval'}
                  </p>
                </div>
                {detail.full?.disputed && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="font-black text-rose-700">Dispute raised</p>
                    <p className="mt-1 text-rose-700">{detail.full.dispute_reason ?? 'No reason provided'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-primary">Evidence</h3>
              <p className="text-sm text-slate-500">Photos and proof linked to the selected job.</p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Photos</p>
                  <p className="mt-1 text-2xl font-black text-primary">{detail.photos.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Checklist</p>
                  <p className="mt-1 text-2xl font-black text-primary">{detail.handover?.checklistSubmitted ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Approval Notes</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {detail.delivery?.notes ?? 'No delivery notes saved'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {detailLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Loading compliance details...</div>
                ) : detail.photos.length ? detail.photos.map((photo, index) => (
                  <div key={`${photo.url ?? 'photo'}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-black text-slate-900">Photo {index + 1}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{photo.url ?? 'No URL'}</p>
                    <p className="mt-2 text-xs text-slate-500">{photo.note ?? 'No note'}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No evidence available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
