import { useEffect, useMemo, useRef, useState } from 'react';
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

type Point = { x: number; y: number };

const badge = (ok: boolean) =>
  ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-[#44474C]';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-IN') : 'N/A';

const stepTone = (done?: boolean, active?: boolean) => {
  if (done) return 'bg-emerald-500 text-white';
  if (active) return 'bg-[#1066b1]/100 text-white';
  return 'bg-slate-100 text-slate-400';
};

/* ── Signature Canvas Component ────────────────────────────────────────────── */
function SignatureCanvas({
  onSave,
  onCancel,
  loading,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    setHasStrokes(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = pos;
  };

  const endDraw = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!canvasRef.current || !hasStrokes) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">
              Step 2 · Handover
            </p>
            <h2 className="text-xl font-black text-primary">Haulier Signature</h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#44474C]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-500">
          Sign below to confirm dispatch officer vehicle release approval.
        </p>

        {/* Canvas */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
          <canvas
            ref={canvasRef}
            width={480}
            height={180}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasStrokes && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300 select-none">
              Draw your signature here
            </p>
          )}
        </div>

        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-slate-400">
          DISPATCH OFFICER CONFIRMATION OF VEHICLE RELEASE
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={clear}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-[#44474C] transition hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            onClick={save}
            disabled={loading || !hasStrokes}
            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Submitting…' : 'Confirm Signature'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────────── */
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

  /* Signature modal state */
  const [showSignModal, setShowSignModal] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState('');

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
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setError(message ? `Failed to load compliance jobs: ${message}` : 'Failed to load compliance jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadJobs(); }, []);

  const selectedJob = useMemo(
    () => [...activeJobs, ...pendingJobs].find((job) => job.jobId === selectedJobId) ?? null,
    [activeJobs, pendingJobs, selectedJobId],
  );

  const fetchDetail = async (jobId: string, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const [full, loadCode, handover, delivery, photos] = await Promise.all([
        haulierService.getFullComplianceStatus(jobId),
        haulierService.getLoadCodeStatus(jobId),
        haulierService.getHandoverStatus(jobId),
        haulierService.getDeliveryStatus(jobId),
        haulierService.viewHandoverPhotos(jobId),
      ]);
      setDetail({
        full: full as FullCompliance,
        loadCode: loadCode as LoadCodeStatus,
        handover: handover as HandoverStatus,
        delivery: delivery as DeliveryStatus,
        photos: ((photos as { photos?: Array<{ url?: string; note?: string }> })?.photos ?? []) as Array<{ url?: string; note?: string }>,
      });
    } catch {
      if (!silent) setDetail({ photos: [] });
    } finally {
      if (!silent) setDetailLoading(false);
    }
  };

  useEffect(() => {
    const jobId = selectedJob?.jobId;
    if (!jobId) return;
    let mounted = true;
    const run = async () => {
      setDetailLoading(true);
      try {
        await fetchDetail(jobId);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob?.jobId]);

  const handleHaulierSign = async (signatureDataUrl: string) => {
    if (!selectedJobId) return;
    setSignLoading(true);
    setSignError('');
    try {
      await haulierService.submitDigitalSignature({
        jobId: selectedJobId,
        signatureData: signatureDataUrl,
      });
      setShowSignModal(false);
      await fetchDetail(selectedJobId);
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string; detail?: string } } };
      const message = response.response?.data?.message || response.response?.data?.detail;
      setSignError(message ?? 'Failed to submit signature. Please try again.');
    } finally {
      setSignLoading(false);
    }
  };

  const step1Done = Boolean(detail.full?.step1_handover_completed || detail.handover?.step1Completed);
  const step2Done = Boolean(detail.full?.step2_delivery_submitted || detail.delivery?.submitted);
  const step3Done = Boolean(detail.full?.step3_approved || detail.delivery?.approved);
  const loadCodeDone = Boolean(detail.full?.load_code_verified || detail.loadCode?.verified);
  const driverSigned = Boolean(detail.handover?.driverSigned);
  const haulierSigned = Boolean(detail.handover?.haulierSigned);
  const needsHaulierSignature = driverSigned && !haulierSigned && !step1Done;

  const jobs = section === 'active' ? activeJobs : pendingJobs;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Signature modal */}
      {showSignModal && (
        <SignatureCanvas
          onSave={handleHaulierSign}
          onCancel={() => { setShowSignModal(false); setSignError(''); }}
          loading={signLoading}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Documents & Compliance</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-primary">Compliance</h1>
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
          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${section === 'active' ? 'bg-primary text-white' : 'bg-white text-[#44474C] border border-slate-200'}`}
        >
          Active Compliance
        </button>
        <button
          onClick={() => setSection('pending')}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${section === 'pending' ? 'bg-primary text-white' : 'bg-white text-[#44474C] border border-slate-200'}`}
        >
          Pending Approval
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Job list sidebar ── */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Jobs</h2>
              <p className="text-xs text-slate-500">{section === 'active' ? 'Active compliance jobs' : 'Jobs awaiting approval'}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
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
                      <p className="mt-1 font-black text-[#041627]">{job.jobReference}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badge(job.status === 'completed' || job.status === 'delivery_submitted' || job.status === 'in_transit')}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#44474C]">
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

        {/* ── Detail panel ── */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Selected Job</p>
                <h2 className="mt-1 text-2xl font-black text-primary">{selectedJob?.jobReference ?? 'No job selected'}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedJob
                    ? `${selectedJob.pickupLocation ?? 'Pickup N/A'} → ${selectedJob.dropLocation ?? 'Drop N/A'}`
                    : 'Choose a job from the list to view compliance details.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:w-[360px]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Current Status</p>
                  <p className="mt-1 font-black text-[#041627]">{selectedJob?.status?.replace('_', ' ') ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Step 3</p>
                  <p className="mt-1 font-black text-[#041627]">{step3Done ? 'Approved' : 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
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

          {/* ── Haulier Signature Banner ────────────────────────────────────── */}
          {selectedJob && !detailLoading && (
            <>
              {needsHaulierSignature && (
                <div className="rounded-3xl border border-[#1066b1]/25 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1066b1]/15 text-[#0d55a0]">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </span>
                      <div>
                        <p className="font-black text-[#083d7a]">Your signature is required</p>
                        <p className="mt-1 text-sm text-[#0a4a8f]">
                          The driver has completed their handover checklist and signed.
                          Sign now to confirm vehicle release and start the trip.
                        </p>
                        <p className="mt-2 text-xs text-[#0d55a0]">
                          Driver signed at: {formatDate(detail.handover?.driverSignedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSignError(''); setShowSignModal(true); }}
                      className="shrink-0 rounded-2xl bg-[#1066b1]/100 px-5 py-3 text-sm font-black text-white shadow-md shadow-[#1066b1]/30 transition hover:bg-[#0a4a8f]"
                    >
                      Sign Now
                    </button>
                  </div>
                  {signError && (
                    <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700">{signError}</p>
                  )}
                </div>
              )}

              {haulierSigned && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <span className="material-symbols-outlined">verified</span>
                    </span>
                    <div>
                      <p className="font-black text-emerald-800">Haulier signature recorded</p>
                      <p className="text-sm text-emerald-700">
                        Signed at {formatDate(detail.handover?.haulierSignedAt)} · Handover{' '}
                        {step1Done ? 'complete — trip is in progress' : 'awaiting driver confirmation'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Compliance timeline ── */}
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
                  <p className="font-black text-[#041627]">Load code verification</p>
                  <p className="mt-1 text-[#44474C]">
                    {loadCodeDone ? `Verified at ${formatDate(detail.loadCode?.verifiedAt ?? detail.full?.load_code_verified_at)}` : 'Not verified yet'}
                  </p>
                </div>

                {/* Handover signatures detail */}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-[#041627]">Vehicle handover</p>
                  <p className="mt-1 text-[#44474C]">
                    {step1Done
                      ? `Completed at ${formatDate(detail.handover?.step1CompletedAt ?? detail.full?.step1_completed_at)}`
                      : 'Waiting for handover completion'}
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${driverSigned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {driverSigned ? '✓' : '○'} Driver signed
                      {driverSigned && <span className="ml-1 opacity-70">{formatDate(detail.handover?.driverSignedAt)}</span>}
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${haulierSigned ? 'bg-emerald-100 text-emerald-700' : needsHaulierSignature ? 'bg-[#1066b1]/15 text-[#0a4a8f]' : 'bg-slate-100 text-slate-500'}`}>
                      {haulierSigned ? '✓' : '○'} Haulier signed
                      {haulierSigned && <span className="ml-1 opacity-70">{formatDate(detail.handover?.haulierSignedAt)}</span>}
                      {needsHaulierSignature && !haulierSigned && <span className="ml-1">— action needed</span>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-[#041627]">Delivery submission</p>
                  <p className="mt-1 text-[#44474C]">
                    {step2Done ? `Submitted at ${formatDate(detail.delivery?.submittedAt ?? detail.full?.step2_completed_at)}` : 'Waiting for delivery proof'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-[#041627]">Final approval</p>
                  <p className="mt-1 text-[#44474C]">
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

            {/* ── Evidence ── */}
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
                  <p className="mt-1 text-sm font-semibold text-[#44474C]">
                    {detail.delivery?.notes ?? 'No delivery notes saved'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {detailLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Loading compliance details...</div>
                ) : detail.photos.length ? detail.photos.map((photo, index) => (
                  <div key={`${photo.url ?? 'photo'}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-black text-[#041627]">Photo {index + 1}</p>
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
