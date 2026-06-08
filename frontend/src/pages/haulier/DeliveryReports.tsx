import { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';
import SignatureRenderer from '../../components/SignatureRenderer';

// ── Types ──────────────────────────────────────────────────────────────────────

type PendingJob = {
  jobId: string;
  jobReference: string;
  pickupLocation?: string;
  dropLocation?: string;
  driver?: { name?: string; phone?: string } | null;
  driverId?: string | null;
  payment?: { amount?: number; currency?: string } | null;
};

type DeliveryDetail = {
  jobId: string;
  jobRef?: string | null;
  deliverySubmitted: boolean;
  deliverySubmittedAt?: string | null;
  deliveryPhotos: string[];
  deliveryNotes?: string | null;
  recipientName?: string | null;
  recipientSignatureUrl?: string | null;
  step3Approved: boolean;
  driver?: { name?: string | null; phone?: string | null } | null;
  payment?: { amount?: number | null; currency?: string | null; status?: string | null } | null;
};

type PendingShift = {
  shiftId: string;
  shiftRef: string;
  dayNumber: number;
  totalDays: number;
  driver?: { name?: string | null; phone?: string | null } | null;
  dailyRate?: number | null;
  currency?: string | null;
  proofSubmittedAt?: string | null;
  proofNotes?: string | null;
  recipientName?: string | null;
  proofPhotoUrl?: string | null;
  signatureData?: string | null;
  hasPhoto: boolean;
  hasSignature: boolean;
};

const fmt = (d?: string | null) =>
  d
    ? new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const fmtCurrency = (amount?: number | null, currency?: string | null) => {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency ?? 'GBP',
  }).format(amount);
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HaulierDeliveryReportsPage() {
  const [tab, setTab] = useState<'jobs' | 'shifts'>('jobs');

  // ── Jobs state ──────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  // ── Shifts state ────────────────────────────────────────────────────────────
  const [shifts, setShifts] = useState<PendingShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [shiftApproving, setShiftApproving] = useState(false);
  const [shiftApproveError, setShiftApproveError] = useState('');
  const [shiftApprovedIds, setShiftApprovedIds] = useState<Set<string>>(new Set());

  // ── Load jobs ───────────────────────────────────────────────────────────────
  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await haulierService.getPendingApprovalJobs({ page: 1, limit: 50 });
      const list = (res as { jobs?: PendingJob[] })?.jobs ?? [];
      setJobs(list);
      if (!selectedJobId && list.length > 0) setSelectedJobId(list[0].jobId);
    } catch { /* ignore */ }
    finally { setJobsLoading(false); }
  };

  // ── Load shifts ─────────────────────────────────────────────────────────────
  const loadShifts = async () => {
    setShiftsLoading(true);
    try {
      const res = await haulierService.getPendingShiftPayments();
      const list = (res as { shifts?: PendingShift[] })?.shifts ?? [];
      setShifts(list);
      if (!selectedShiftId && list.length > 0) setSelectedShiftId(list[0].shiftId);
    } catch { /* ignore */ }
    finally { setShiftsLoading(false); }
  };

  useEffect(() => { void loadJobs(); }, []);
  useEffect(() => { void loadShifts(); }, []);

  // ── Load delivery detail for selected job ───────────────────────────────────
  useEffect(() => {
    if (!selectedJobId) return;
    let mounted = true;
    setDetailLoading(true);
    setDeliveryDetail(null);
    haulierService.getDeliveryStatus(selectedJobId)
      .then((data) => { if (mounted) setDeliveryDetail(data as DeliveryDetail); })
      .catch(() => { if (mounted) setDeliveryDetail(null); })
      .finally(() => { if (mounted) setDetailLoading(false); });
    return () => { mounted = false; };
  }, [selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.jobId === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const selectedShift = useMemo(
    () => shifts.find((s) => s.shiftId === selectedShiftId) ?? null,
    [shifts, selectedShiftId],
  );

  // ── Approve job delivery ─────────────────────────────────────────────────────
  const handleApproveJob = async () => {
    if (!selectedJobId) return;
    setApproving(true);
    setApproveError('');
    try {
      await haulierService.approveDelivery(selectedJobId, { bookingId: '', approvalNote: 'Approved' });
      setApprovedIds((prev) => new Set([...prev, selectedJobId]));
      setJobs((prev) => prev.filter((j) => j.jobId !== selectedJobId));
      setSelectedJobId(null);
      setDeliveryDetail(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApproveError(msg ?? 'Failed to release payment. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  // ── Approve shift day payment ────────────────────────────────────────────────
  const handleApproveShift = async () => {
    if (!selectedShiftId) return;
    setShiftApproving(true);
    setShiftApproveError('');
    try {
      // Create shift day payment → get client secret → confirm via Stripe
      const order = await haulierService.createShiftDayPayment(selectedShiftId);
      // Load Stripe and confirm payment
      await loadStripeAndConfirm(order.clientSecret, order.publishableKey);
      // Verify
      await haulierService.verifyShiftDayPayment(selectedShiftId, order.dayNumber, order.gatewayOrderId);
      setShiftApprovedIds((prev) => new Set([...prev, selectedShiftId]));
      setShifts((prev) => prev.filter((s) => s.shiftId !== selectedShiftId));
      setSelectedShiftId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setShiftApproveError(msg ?? 'Payment failed. Please try again from the Payments page.');
    } finally {
      setShiftApproving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">My Jobs</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-primary">Delivery Reports</h1>
          <p className="text-on-surface-variant font-medium">Review driver-submitted delivery proofs and release payment.</p>
        </div>
        <button
          onClick={() => { void loadJobs(); void loadShifts(); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 w-fit">
        {([['jobs', 'Job Deliveries'], ['shifts', 'Shift Day Proofs']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-5 py-2 text-sm font-black transition-all ${
              tab === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-primary'
            }`}
          >
            {label}
            {key === 'jobs' && jobs.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-white">{jobs.length}</span>
            )}
            {key === 'shifts' && shifts.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">{shifts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Jobs Tab ──────────────────────────────────────────────────────────── */}
      {tab === 'jobs' && (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Job list */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-primary">Pending Review</h2>
                <p className="text-xs text-slate-500">Jobs awaiting your approval</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {jobs.length}
              </span>
            </div>

            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">check_circle</span>
                <p className="mt-2 text-sm text-slate-400">No pending delivery reports.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {jobs.map((job) => {
                  const isSelected = selectedJobId === job.jobId;
                  return (
                    <button
                      key={job.jobId}
                      onClick={() => { setSelectedJobId(job.jobId); setApproveError(''); }}
                      className={`w-full rounded-2xl p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-[#1066b1] text-white shadow-md shadow-[#1066b1]/20'
                          : 'border border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-xs font-black ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {job.jobReference}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <span className="material-symbols-outlined text-[10px]">pending</span>
                          Delivery Submitted
                        </span>
                      </div>
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-primary'}`}>
                        {job.pickupLocation ?? '?'} → {job.dropLocation ?? '?'}
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

          {/* Delivery detail panel */}
          <section className="space-y-5">
            {!selectedJob ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">assignment_turned_in</span>
                <p className="mt-2 text-sm text-slate-400">Select a job to review the delivery report.</p>
              </div>
            ) : (
              <>
                {/* Job info */}
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
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
                      Awaiting Review
                    </span>
                  </div>
                </div>

                {/* Delivery report */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-primary">Delivery Report</h3>
                    <p className="text-sm text-slate-500">Details submitted by the driver after completing the trip.</p>
                  </div>

                  {detailLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-100" />)}
                    </div>
                  ) : !deliveryDetail?.deliverySubmitted ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                      <span className="material-symbols-outlined text-3xl text-slate-300">inventory</span>
                      <p className="mt-2 text-sm text-slate-400">Driver has not submitted a delivery report yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Submission time */}
                      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <span className="material-symbols-outlined text-emerald-600">schedule</span>
                        <div>
                          <p className="text-xs font-black text-emerald-800">Report Submitted</p>
                          <p className="text-sm font-bold text-emerald-700">{fmt(deliveryDetail.deliverySubmittedAt)}</p>
                        </div>
                      </div>

                      {/* Driver & recipient info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {deliveryDetail.driver && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Driver</p>
                            <p className="font-bold text-primary">{deliveryDetail.driver.name ?? '—'}</p>
                            {deliveryDetail.driver.phone && (
                              <p className="text-xs text-slate-500">{deliveryDetail.driver.phone}</p>
                            )}
                          </div>
                        )}
                        {deliveryDetail.recipientName && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Recipient</p>
                            <p className="font-bold text-primary">{deliveryDetail.recipientName}</p>
                          </div>
                        )}
                        {deliveryDetail.payment?.amount && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment on Hold</p>
                            <p className="text-xl font-black text-primary">
                              {fmtCurrency(deliveryDetail.payment.amount, deliveryDetail.payment.currency)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Delivery notes */}
                      {deliveryDetail.deliveryNotes && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Delivery Notes</p>
                          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#44474C]">
                            {deliveryDetail.deliveryNotes}
                          </p>
                        </div>
                      )}

                      {/* Delivery photos */}
                      {deliveryDetail.deliveryPhotos.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
                            Delivery Photos ({deliveryDetail.deliveryPhotos.length})
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {deliveryDetail.deliveryPhotos.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={url}
                                  alt={`Delivery photo ${i + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recipient signature */}
                      {deliveryDetail.recipientSignatureUrl && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Recipient Signature</p>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            {deliveryDetail.recipientSignatureUrl.startsWith('data:image') ? (
                              <img
                                src={deliveryDetail.recipientSignatureUrl}
                                alt="Recipient signature"
                                className="max-h-24 max-w-xs"
                              />
                            ) : (
                              <SignatureRenderer data={deliveryDetail.recipientSignatureUrl} height={96} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Approve & Release */}
                      {approveError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                          {approveError}
                        </div>
                      )}

                      {deliveryDetail.step3Approved || approvedIds.has(selectedJobId ?? '') ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          <p className="text-sm font-black text-emerald-800">Payment released to driver.</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleApproveJob()}
                          disabled={approving}
                          className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-md shadow-emerald-600/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {approving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                          <span className="material-symbols-outlined text-sm">payments</span>
                          Approve & Release Payment
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── Shifts Tab ────────────────────────────────────────────────────────── */}
      {tab === 'shifts' && (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Shift list */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-primary">Pending Payment</h2>
                <p className="text-xs text-slate-500">Shift days awaiting payment</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {shifts.length}
              </span>
            </div>

            {shiftsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : shifts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">check_circle</span>
                <p className="mt-2 text-sm text-slate-400">No pending shift payments.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {shifts.map((shift) => {
                  const isSelected = selectedShiftId === shift.shiftId;
                  return (
                    <button
                      key={shift.shiftId}
                      onClick={() => { setSelectedShiftId(shift.shiftId); setShiftApproveError(''); }}
                      className={`w-full rounded-2xl p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-[#1066b1] text-white shadow-md shadow-[#1066b1]/20'
                          : 'border border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-xs font-black ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {shift.shiftRef}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                          Day {shift.dayNumber}/{shift.totalDays}
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>
                        {shift.driver?.name ?? 'Driver'}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {fmtCurrency(shift.dailyRate, shift.currency)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Shift proof detail panel */}
          <section className="space-y-5">
            {!selectedShift ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">assignment_turned_in</span>
                <p className="mt-2 text-sm text-slate-400">Select a shift to review the end-of-day proof.</p>
              </div>
            ) : (
              <>
                {/* Shift info */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{selectedShift.shiftRef}</p>
                      <h2 className="text-lg font-black text-primary mt-0.5">
                        Day {selectedShift.dayNumber} of {selectedShift.totalDays}
                      </h2>
                      {selectedShift.driver?.name && (
                        <p className="text-sm text-slate-500 mt-1">
                          Driver: <span className="font-bold text-[#44474C]">{selectedShift.driver.name}</span>
                          {selectedShift.driver.phone && <span className="ml-2 text-slate-400">{selectedShift.driver.phone}</span>}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
                      Proof Submitted
                    </span>
                  </div>
                </div>

                {/* Proof details */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-primary">End-of-Day Proof</h3>
                    <p className="text-sm text-slate-500">Submitted by driver at end of shift day.</p>
                  </div>

                  {/* Submitted at */}
                  {selectedShift.proofSubmittedAt && (
                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                      <span className="material-symbols-outlined text-emerald-600">schedule</span>
                      <div>
                        <p className="text-xs font-black text-emerald-800">Proof Submitted</p>
                        <p className="text-sm font-bold text-emerald-700">{fmt(selectedShift.proofSubmittedAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Info cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedShift.recipientName && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Recipient</p>
                        <p className="font-bold text-primary">{selectedShift.recipientName}</p>
                      </div>
                    )}
                    {selectedShift.dailyRate && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Day Rate</p>
                        <p className="text-xl font-black text-primary">{fmtCurrency(selectedShift.dailyRate, selectedShift.currency)}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedShift.proofNotes && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Notes from Driver</p>
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-[#44474C]">
                        {selectedShift.proofNotes}
                      </p>
                    </div>
                  )}

                  {/* Proof photo */}
                  {selectedShift.proofPhotoUrl && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Proof Photo</p>
                      <a
                        href={selectedShift.proofPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-48 aspect-square overflow-hidden rounded-xl border border-slate-200 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={selectedShift.proofPhotoUrl}
                          alt="Proof photo"
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </a>
                    </div>
                  )}

                  {/* Signature */}
                  {selectedShift.signatureData && !selectedShift.signatureData.startsWith('driver_signed') && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Driver Signature</p>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <SignatureRenderer data={selectedShift.signatureData} height={96} />
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  {shiftApproveError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {shiftApproveError}
                    </div>
                  )}

                  {shiftApprovedIds.has(selectedShift.shiftId) ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                      <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                      <p className="text-sm font-black text-emerald-800">Payment sent to driver for Day {selectedShift.dayNumber}.</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => void handleApproveShift()}
                      disabled={shiftApproving}
                      className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-md shadow-emerald-600/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {shiftApproving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                      <span className="material-symbols-outlined text-sm">payments</span>
                      Pay {fmtCurrency(selectedShift.dailyRate, selectedShift.currency)} for Day {selectedShift.dayNumber}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ── Stripe helper ──────────────────────────────────────────────────────────────

async function loadStripeAndConfirm(clientSecret: string, publishableKey: string): Promise<void> {
  if (!window.Stripe) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Stripe.js failed to load'));
      document.head.appendChild(s);
    });
  }
  const stripe = window.Stripe!(publishableKey);
  const result = await stripe.confirmCardPayment(clientSecret);
  if (result.error) throw new Error(result.error.message ?? 'Payment failed');
}
