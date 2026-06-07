import React, { useEffect, useMemo, useRef, useState } from 'react';
import haulierService from '../../api/haulierService';
import SignatureRenderer from '../../components/SignatureRenderer';

type ShiftSummary = {
  shiftId: string;
  shiftRef: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  handoverSubmitted?: boolean;
  handoverHaulierSigned?: boolean;
  selectedDriverId?: string;
  driverName?: string;
};

type HandoverStatus = {
  handoverSubmitted: boolean;
  handoverSubmittedAt: string | null;
  checklistData: Record<string, boolean>;
  photoUrls: string[];
  driverSignatureData: string | null;
  handoverHaulierSigned: boolean;
  handoverHaulierSignedAt: string | null;
  handoverHaulierSignatureData?: string | null;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US') : 'N/A';

const CHECKLIST_ITEMS = [
  { key: 'lightsSignals', label: 'Lights & Signals' },
  { key: 'tirePressure',  label: 'Tyre Pressure' },
  { key: 'fluidLevels',  label: 'Fluid Levels' },
  { key: 'bodyDamage',   label: 'Body Damage OK' },
] as const;

/* ── Inline Signature Canvas ─────────────────────────────────────────────── */

type Point = { x: number; y: number };

function SignatureCanvas({
  shiftRef,
  onSave,
  onCancel,
  loading,
  error,
  savedSignature,
}: {
  shiftRef:        string;
  onSave:          (dataUrl: string) => void;
  onCancel:        () => void;
  loading:         boolean;
  error:           string;
  savedSignature?: string | null;
}) {
  const [mode, setMode]               = useState<'saved' | 'draw'>(savedSignature ? 'saved' : 'draw');
  const canvasRef                     = useRef<HTMLCanvasElement>(null);
  const drawing                       = useRef(false);
  const lastPoint                     = useRef<Point | null>(null);
  const [hasStrokes, setHasStrokes]   = useState(false);

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
  const save    = () => { if (mode === 'saved' && savedSignature) { onSave(savedSignature); return; } if (!canvasRef.current || !hasStrokes) return; onSave(canvasRef.current.toDataURL('image/png')); };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[#041627] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Shift Handover</p>
            <h2 className="text-xl font-black text-white">{shiftRef}</h2>
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

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function ShiftsHandoverPage() {
  const [shifts, setShifts]             = useState<ShiftSummary[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [detail, setDetail]             = useState<HandoverStatus | null>(null);
  const [loading, setLoading]           = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [signModal, setSignModal]       = useState(false);
  const [signLoading, setSignLoading]   = useState(false);
  const [signError, setSignError]       = useState('');
  const [savedEsignature, setSavedEsignature] = useState<string | null>(null);

  const loadShifts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await haulierService.listMyShifts();
      const items = ((data?.items ?? []) as ShiftSummary[]).filter((s) => s.handoverSubmitted);
      // Sort: needs-sign (submitted, haulier not signed) first
      const sorted = [...items].sort((a, b) => {
        const needsA = a.handoverSubmitted && !a.handoverHaulierSigned ? 0 : 1;
        const needsB = b.handoverSubmitted && !b.handoverHaulierSigned ? 0 : 1;
        return needsA - needsB;
      });
      setShifts(sorted);
      // Auto-select first pending item
      const firstPending = sorted.find((s) => s.handoverSubmitted && !s.handoverHaulierSigned);
      setSelectedShiftId((prev) => prev ?? firstPending?.shiftId ?? sorted[0]?.shiftId ?? null);
    } catch {
      setError('Failed to load shifts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShifts();
    haulierService.getMe().then((me: { profile?: { esignatureData?: string | null } | null }) => {
      if (me?.profile?.esignatureData) setSavedEsignature(me.profile.esignatureData);
    }).catch(() => undefined);
  }, []);

  const selectedShift = useMemo(
    () => shifts.find((s) => s.shiftId === selectedShiftId) ?? null,
    [shifts, selectedShiftId],
  );

  useEffect(() => {
    const shiftId = selectedShift?.shiftId;
    if (!shiftId) return;
    let mounted = true;
    setDetailLoading(true);
    setDetail(null);
    haulierService.getShiftHandoverStatus(shiftId)
      .then((d) => { if (mounted) setDetail(d); })
      .catch(() => { if (mounted) setDetail(null); })
      .finally(() => { if (mounted) setDetailLoading(false); });
    return () => { mounted = false; };
  }, [selectedShift?.shiftId]);

  const handleSign = async (signatureData: string) => {
    if (!selectedShift) return;
    setSignLoading(true);
    setSignError('');
    try {
      await haulierService.signShiftHandover(selectedShift.shiftId, signatureData);
      setSignModal(false);
      setSuccess(`Handover signed for ${selectedShift.shiftRef} — driver can now start their trip.`);
      await loadShifts();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setSignError(e.response?.data?.message ?? (err instanceof Error ? err.message : 'Failed to sign handover.'));
    } finally {
      setSignLoading(false);
    }
  };

  const hasData = detail?.handoverSubmitted || (detail?.photoUrls?.length ?? 0) > 0;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">

      {signModal && selectedShift && (
        <SignatureCanvas
          shiftRef={selectedShift.shiftRef}
          onSave={(d) => void handleSign(d)}
          onCancel={() => { setSignModal(false); setSignError(''); }}
          loading={signLoading}
          error={signError}
          savedSignature={savedEsignature}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Shifts</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-primary">Handover</h1>
          <p className="text-on-surface-variant font-medium">Driver-submitted vehicle condition, photos and signature per shift.</p>
        </div>
        <button
          onClick={() => void loadShifts()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
          <p className="text-sm font-bold text-emerald-700">{success}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">

        {/* ── Shift list ── */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Shifts</h2>
              <p className="text-xs text-slate-500">Select a shift to view handover details</p>
            </div>
            <div className="flex items-center gap-2">
              {shifts.filter((s) => s.handoverSubmitted && !s.handoverHaulierSigned).length > 0 && (
                <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white animate-pulse">
                  {shifts.filter((s) => s.handoverSubmitted && !s.handoverHaulierSigned).length} pending
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
                {shifts.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No shifts with handover submissions found.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {shifts.map((shift) => {
                const isSelected  = selectedShiftId === shift.shiftId;
                const needsSign   = shift.handoverSubmitted && !shift.handoverHaulierSigned;
                return (
                  <button
                    key={shift.shiftId}
                    onClick={() => setSelectedShiftId(shift.shiftId)}
                    className={`w-full rounded-2xl p-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[#1066b1] text-white shadow-md shadow-[#1066b1]/20'
                        : needsSign
                        ? 'border-2 border-indigo-400 bg-indigo-50 hover:bg-indigo-100'
                        : 'border border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-black font-mono ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        {shift.shiftRef}
                      </p>
                      {needsSign && !isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shrink-0">
                          <span className="material-symbols-outlined text-[10px]">draw</span>
                          Sign Required
                        </span>
                      )}
                      {shift.handoverHaulierSigned && !isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 shrink-0">
                          <span className="material-symbols-outlined text-[10px]">verified</span>
                          Signed
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-primary'}`}>
                      {shift.pickupAddress ?? shift.location ?? 'Unknown'} → {shift.dropAddress ?? '—'}
                    </p>
                    {shift.driverName && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {shift.driverName}
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
          {!selectedShift ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">assignment</span>
              <p className="mt-2 text-sm text-slate-400">Select a shift to view its handover details.</p>
            </div>
          ) : (
            <>
              {/* Shift info card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{selectedShift.shiftRef}</p>
                    <h2 className="text-lg font-black text-primary mt-0.5">
                      {selectedShift.pickupAddress ?? selectedShift.location ?? 'N/A'} → {selectedShift.dropAddress ?? '—'}
                    </h2>
                    {selectedShift.driverName && (
                      <p className="text-sm text-slate-500 mt-1">
                        Driver: <span className="font-bold text-[#44474C]">{selectedShift.driverName}</span>
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
                    detail?.handoverHaulierSigned
                      ? 'bg-emerald-100 text-emerald-700'
                      : detail?.handoverSubmitted
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {detail?.handoverHaulierSigned ? 'Fully Signed' : detail?.handoverSubmitted ? 'Awaiting Signature' : 'Pending'}
                  </span>
                </div>

                {/* Sign button */}
                {detail?.handoverSubmitted && !detail?.handoverHaulierSigned && (
                  <button
                    onClick={() => setSignModal(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700 animate-pulse shadow-md shadow-indigo-200"
                  >
                    <span className="material-symbols-outlined text-base">draw</span>
                    Sign Handover
                  </button>
                )}
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
                    {detail?.checklistData && Object.keys(detail.checklistData).length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Vehicle Condition Checklist</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CHECKLIST_ITEMS.map(({ key, label }) => {
                            const checked = Boolean(detail?.checklistData?.[key]);
                            return (
                              <div key={key} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${checked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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

                    {/* Photos */}
                    {(detail?.photoUrls?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
                          Condition Photos ({detail!.photoUrls.length})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {detail!.photoUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="block rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 hover:opacity-90 transition-opacity">
                              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Driver signature */}
                    {detail?.driverSignatureData && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Driver Signature</p>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <SignatureRenderer data={detail.driverSignatureData} height={96} />
                        </div>
                      </div>
                    )}

                    {/* Haulier signature */}
                    {detail?.handoverHaulierSigned && (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-600">verified</span>
                        <div>
                          <p className="text-sm font-black text-emerald-800">Haulier Signed</p>
                          <p className="text-xs text-emerald-700">{formatDate(detail.handoverHaulierSignedAt)}</p>
                        </div>
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
