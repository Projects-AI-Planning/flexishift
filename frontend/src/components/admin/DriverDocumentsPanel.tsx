import React, { useEffect, useState } from 'react';
import adminService from '../../api/adminService';

const DRIVER_DOC_TYPES = [
  { backendKey: 'DRIVING_LICENCE', label: 'Driving Licence', truck: false },
  { backendKey: 'VEHICLE_REG', label: 'Vehicle Registration', truck: true },
  { backendKey: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance', truck: true },
] as const;

export const requiredDocsFor = (availability?: string | null) => {
  const mode = (availability || '').toUpperCase();
  if (mode === 'DRIVER_ONLY') return DRIVER_DOC_TYPES.filter((d) => !d.truck);
  if (mode === 'TRUCK_ONLY') return DRIVER_DOC_TYPES.filter((d) => d.truck);
  return [...DRIVER_DOC_TYPES];
};

export const isSharedDocStatus = (status?: string) => {
  const value = (status || '').toUpperCase();
  return value === 'PENDING' || value === 'APPROVED';
};

const prettyStatus = (s: string) =>
  s.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

type Props = {
  userId: string;
  driverAvailability?: string | null;
  onUploaded?: () => void;
};

const DriverDocumentsPanel: React.FC<Props> = ({ userId, driverAvailability, onUploaded }) => {
  const [items, setItems] = useState<Array<{ documentId: string; docType: string; status: string }>>([]);
  const [availability, setAvailability] = useState(driverAvailability || '');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const docs = await adminService.listUserDocuments(userId);
      setItems(docs?.items ?? []);
      setAvailability(docs?.driverAvailability || driverAvailability || '');
      setVehicleId(docs?.vehicleId ?? null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const required = requiredDocsFor(availability);
  const missing = required.filter((doc) => {
    const existing = items.find((item) => item.docType === doc.backendKey);
    return !isSharedDocStatus(existing?.status);
  });

  const handleSubmit = async () => {
    const toUpload = missing.filter((doc) => files[doc.backendKey]);
    if (toUpload.length === 0) {
      setError('Choose at least one missing document to upload.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const doc of toUpload) {
        const file = files[doc.backendKey];
        if (!file) continue;
        if (!expiry[doc.backendKey]) {
          throw new Error(`Enter an expiry date for ${doc.label}.`);
        }
        const formData = new FormData();
        formData.append('documentType', doc.backendKey);
        formData.append('expiryDate', expiry[doc.backendKey]);
        formData.append('file', file);
        if (doc.truck && vehicleId) formData.append('vehicleId', vehicleId);
        await adminService.uploadUserDocument(userId, formData);
      }
      setFiles({});
      setExpiry({});
      await load();
      onUploaded?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error && !('response' in err)
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to upload documents');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-blue-50/60 p-4 space-y-4">
      <div>
        <p className="text-sm font-black text-primary">Upload documents</p>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Required files for this driver. Missing files keep them on Pending Documents.
        </p>
      </div>
      {loading ? (
        <p className="text-xs font-bold text-slate-500">Loading documents…</p>
      ) : (
        required.map((doc) => {
          const existing = items.find((item) => item.docType === doc.backendKey);
          const shared = isSharedDocStatus(existing?.status);
          return (
            <div key={doc.backendKey} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-white rounded-lg p-3 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-primary">{doc.label}</p>
                <span className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  shared ? 'bg-green-100 text-green-700' : existing?.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {existing?.status ? prettyStatus(existing.status) : 'Missing'}
                </span>
              </div>
              {!shared && (
                <>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setFiles({ ...files, [doc.backendKey]: e.target.files?.[0] ?? null })}
                    className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white"
                  />
                  <input
                    type="date"
                    value={expiry[doc.backendKey] || ''}
                    onChange={(e) => setExpiry({ ...expiry, [doc.backendKey]: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none"
                  />
                </>
              )}
            </div>
          );
        })
      )}
      {error && (
        <p className="text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      {missing.length > 0 && (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving || loading}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
          Upload documents
        </button>
      )}
    </div>
  );
};

export default DriverDocumentsPanel;
