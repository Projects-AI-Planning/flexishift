import { useEffect, useMemo, useRef, useState } from 'react';
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
  photos: string[];
};

type Point = { x: number; y: number };

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US') : 'N/A';

const CHECKLIST_ITEMS = [
  { key: 'lightsSignals', label: 'Lights & Signals' },
  { key: 'tirePressure', label: 'Tyre Pressure' },
  { key: 'fluidLevels', label: 'Fluid Levels' },
  { key: 'bodyDamage', label: 'Body Damage OK' },
] as const;

// ── Signature canvas modal ────────────────────────────────────────────────────

function SignatureCanvas({
  jobRef,
  onSave,
  onCancel,
  loading,
  error,
  savedSignature,
}: {
  jobRef: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
  savedSignature?: string | null;
}) {
  const [mode, setMode]             = useState<'saved' | 'draw'>(savedSignature ? 'saved' : 'draw');
  const canvasRef                   = useRef<HTMLCanvasElement>(null);
  const drawing                     = useRef(false);
  const lastPoint                   = useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); drawing.current = true; lastPoint.current = getPos(e); setHasStrokes(true); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastPoint.current = pos;
  };
  const endDraw = () => { drawing.current = false; lastPoint.current = null; };
  const clear   = () => { canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasStrokes(false); };
  const save    = () => {
    if (mode === 'saved' && savedSignature) { onSave(savedSignature); return; }
    if (!canvasRef.current || !hasStrokes) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[#041627] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Job Handover</p>
            <h2 className="text-xl font-black text-white">{jobRef}</h2>
          </div>
          <button onClick={onCancel} className="rounded-xl p-2 text-white/60 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm font-medium text-slate-500">
            Sign below to confirm you have reviewed the driver's pre-trip handover and authorise departure.
          </p>

          {savedSignature && (
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              {(['saved', 'draw'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 text-xs font-black transition-colors ${mode === m ? 'bg-[#1066b1] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {m === 'saved' ? 'Use Saved Signature' : 'Draw New Signature'}
                </button>
              ))}
            </div>
          )}

          {mode === 'saved' && savedSignature ? (
            <div className="rounded-2xl border-2 border-[#1066b1]/30 bg-[#EFF6FF] p-3">
              <SignatureRenderer data={savedSignature} height={96} className="w-full" />
            </div>
          ) : (
            <div className="relative">
              <canvas ref={canvasRef} width={468} height={180}
                className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-crosshair touch-none"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              {!hasStrokes && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Sign here
                </p>
              )}
            </div>
          )}

          {mode === 'draw' && (
            <button onClick={clear} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Clear
            </button>
          )}

          {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-700">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={loading}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={save} disabled={loading || (mode === 'draw' && !hasStrokes)}
              className="flex-1 rounded-2xl bg-[#1066b1] py-3 text-sm font-black text-white transition hover:bg-[#0e57a0] disabled:opacity-50 shadow-md shadow-[#1066b1]/20">
              {loading ? 'Signing…' : 'Confirm & Sign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HaulierHandoverPage() {
  const [jobs, setJobs]                       = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId]     = useState<string | null>(null);
  const [detail, setDetail]                   = useState<HandoverDetail>({ photos: [] });
  const [loading, setLoading]                 = useState(true);
  const [detailLoading, setDetailLoading]     = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState('');
  const [signModal, setSignModal]             = useState(false);
  const [signLoading, setSignLoading]         = useState(false);
  const [signError, setSignError]             = useState('');
  const [savedEsignature, setSavedEsignature] = useState<string | null>(null);
  const [badgeMap, setBadgeMap]               = useState<Record<string, 'needs-sign' | 'signed' | 'none'>>({});

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [active, pending, completed] = await Promise.all([
        haulierService.getActiveJobs({ page: 1, limit: 50 }),
        haulierService.getPendingApprovalJobs({ page: 1, limit: 50 }),
        haulierService.getCompletedJobs({ page: 1, limit: 50 }),
      ]);
      const all = [
        ...((active as { jobs?: JobSummary[] })?.jobs ?? []),
        ...((pending as { jobs?: JobSummary[] })?.jobs ?? []),
        ...((completed as { jobs?: JobSummary[] })?.jobs ?? []),
      ] as JobSummary[];

      const statuses = await Promise.allSettled(
        all.map((j) => haulierService.getHandoverStatus(j.jobId)),
      );
      const map: Record<string, 'needs-sign' | 'signed' | 'none'> = {};
      statuses.forEach((res, i) => {
        const s = res.status === 'fulfilled' ? (res.value as HandoverStatus) : null;
        if (s?.checklistSubmitted && !s?.haulierSigned) map[all[i].jobId] = 'needs-sign';
        else if (s?.haulierSigned)                       map[all[i].jobId] = 'signed';
        else                                             map[all[i].jobId] = 'none';
      });
      setBadgeMap(map);

      const sorted = [...all].sort((a, b) => {
        const order = { 'needs-sign': 0, 'none': 1, 'signed': 2 };
        return (order[map[a.jobId] ?? 'none'] ?? 1) - (order[map[b.jobId] ?? 'none'] ?? 1);
      });

      setJobs(sorted);
      const firstPending = sorted.find((j) => map[j.jobId] === 'needs-sign');
      setSelectedJobId((prev) => prev ?? firstPending?.jobId ?? sorted[0]?.jobId ?? null);
      setError('');
    } catch {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    haulierService.getMe().then((me: { profile?: { esignatureData?: string | null } | null }) => {
      if (me?.profile?.esignatureData) setSavedEsignature(me.profile.esignatureData);
    }).catch(() => undefined);
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.jobId === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const loadDetail = (jobId: string) => {
    let mounted = true;
    setDetailLoading(true);
    Promise.all([
      haulierService.getHandoverStatus(jobId),
      haulierService.getDeliveryStatus(jobId),
      haulierService.viewHandoverPhotos(jobId),
    ])
      .then(([handover, delivery, photos]) => {
        if (!mounted) return;
        const rawPhotos = (photos as { photos?: unknown })?.photos;
        const photoUrls: string[] = Array.isArray(rawPhotos)
          ? rawPhotos.map((p) => (typeof p === 'string' ? p : (p as { url?: string })?.url ?? '')).filter(Boolean)
          : [];
        setDetail({
          handover: handover as HandoverStatus,
          delivery: delivery as DeliveryStatus,
          photos: photoUrls,
        });
      })
      .catch(() => { if (mounted) setDetail({ photos: [] }); })
      .finally(() => { if (mounted) setDetailLoading(false); });
    return () => { mounted = false; };
  };

  useEffect(() => {
    const jobId = selectedJob?.jobId;
    if (!jobId) return;
    setDetail({ photos: [] });
    return loadDetail(jobId);
  }, [selectedJob?.jobId]);

  const handleSign = async (signatureData: string) => {
    if (!selectedJob) return;
    setSignLoading(true);
    setSignError('');
    try {
      await haulierService.submitDigitalSignature({
        jobId: selectedJob.jobId,
        signatureData,
      });
      setSignModal(false);
      setSuccess('Handover signed successfully.');
      setTimeout(() => setSuccess(''), 4000);
      // Refresh badge + detail
      setBadgeMap((prev) => ({ ...prev, [selectedJob.jobId]: 'signed' }));
      loadDetail(selectedJob.jobId);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setSignError(err?.response?.data?.message ?? err?.message ?? 'Failed to sign handover.');
    } finally {
      setSignLoading(false);
    }
  };

  const photos = detail.handover?.conditionPhotos?.length
    ? detail.handover.conditionPhotos
    : detail.photos;

  const hasData =
    detail.handover?.checklistSubmitted ||
    detail.handover?.driverSigned ||
    (detail.handover?.conditionPhotos?.length ?? 0) > 0 ||
    photos.length > 0;

  const needsHaulierSign =
    detail.handover?.checklistSubmitted && !detail.handover?.haulierSigned;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Signature modal */}
      {signModal && selectedJob && (
        <SignatureCanvas
          jobRef={selectedJob.jobReference}
          onSave={handleSign}
          onCancel={() => { setSignModal(false); setSignError(''); }}
          loading={signLoading}
          error={signError}
          savedSignature={savedEsignature}
        />
      )}

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
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
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
            <div className="flex items-center gap-2">
              {Object.values(badgeMap).filter((v) => v === 'needs-sign').length > 0 && (
                <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white animate-pulse">
                  {Object.values(badgeMap).filter((v) => v === 'needs-sign').length} pending
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {jobs.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No jobs found.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {jobs.map((job) => {
                const badge     = badgeMap[job.jobId];
                const isSelected = selectedJobId === job.jobId;
                const needsSign  = badge === 'needs-sign';
                return (
                  <button
                    key={job.jobId}
                    onClick={() => setSelectedJobId(job.jobId)}
                    className={`w-full rounded-2xl p-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[#1066b1] text-white shadow-md shadow-[#1066b1]/20'
                        : needsSign
                        ? 'border-2 border-indigo-400 bg-indigo-50 hover:bg-indigo-100'
                        : 'border border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-black ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        {job.jobReference}
                      </p>
                      {needsSign && !isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shrink-0">
                          <span className="material-symbols-outlined text-[10px]">draw</span>
                          Sign Required
                        </span>
                      )}
                      {badge === 'signed' && !isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 shrink-0">
                          <span className="material-symbols-outlined text-[10px]">verified</span>
                          Signed
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-primary'}`}>
                      {job.pickupLocation ?? 'Unknown'} → {job.dropLocation ?? 'Unknown'}
                    </p>
                    {job.driver?.name && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {job.driver.name}
                      </p>
                    )}
                  </button>
                );
              })}
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

              {/* ── Sign button — shown when driver submitted but haulier hasn't signed yet ── */}
              {needsHaulierSign && (
                <div className="rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-600 text-2xl">draw</span>
                    <div>
                      <p className="text-sm font-black text-indigo-900">Signature Required</p>
                      <p className="text-xs text-indigo-600">Driver has submitted the handover checklist. Sign to authorise departure.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSignError(''); setSignModal(true); }}
                    className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-[#1066b1] px-5 py-3 text-sm font-black text-white shadow-md shadow-[#1066b1]/20 transition hover:bg-[#0e57a0]"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Sign Handover
                  </button>
                </div>
              )}

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
