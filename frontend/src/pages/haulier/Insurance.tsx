import { useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';

type DocItem = {
  documentId: string;
  userId: string;
  docType: string;
  fileUrl: string;
  status: string;
  rejectionReason?: string | null;
  createdAt?: string | null;
};

const DOC_TYPES = [
  {
    key: 'VEHICLE_INSURANCE',
    title: 'Vehicle Insurance',
    description: 'Insurance for individual haulage vehicles.',
  },
  {
    key: 'FLEET_INSURANCE',
    title: 'Fleet Insurance',
    description: 'Coverage for the overall fleet and operated vehicles.',
  },
] as const;

const statusClass = (status: string) => {
  const value = status.toUpperCase();
  if (value === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-700';
  return 'bg-[#1066b1]/15 text-[#0a4a8f]';
};

const prettyDate = (value?: string | null) => (value ? new Date(value).toLocaleString('en-US') : 'N/A');

const InsurancePage = () => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await haulierService.listMyDocuments();
      setDocuments(((result as { items?: DocItem[] })?.items ?? []) as DocItem[]);
      setError('');
    } catch (err: unknown) {
      const response = err as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const msg = response.response?.data?.message || response.response?.data?.detail;
      setError(msg ? `Failed to load insurance documents: ${msg}` : 'Failed to load insurance documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const documentsByType = useMemo(() => {
    return DOC_TYPES.reduce((acc, item) => {
      acc[item.key] = documents.filter((doc) => doc.docType === item.key);
      return acc;
    }, {} as Record<string, DocItem[]>);
  }, [documents]);

  const latestByType = (type: string) => {
    const items = documentsByType[type] ?? [];
    return items[0] ?? null;
  };

  const uploadDocument = async (type: string, file: File) => {
    const expiry = expiryDates[type]?.trim();
    if (!expiry) {
      setError('Please enter the document expiry date before uploading.');
      return;
    }
    setSubmitting((current) => ({ ...current, [type]: true }));
    setMessage('');
    setError('');
    try {
      const upload = await haulierService.getDocumentUploadUrl(type) as {
        upload_url?: string;
        key?: string;
      };
      if (!upload.upload_url || !upload.key) {
        throw new Error('Upload URL missing');
      }

      const response = await fetch(upload.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with ${response.status}`);
      }

      await haulierService.submitUploadedDocument({ docType: type, key: upload.key, expiryDate: expiry });
      setMessage(`${type.replace('_', ' ').toLowerCase()} uploaded successfully.`);
      await loadDocuments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed.';
      setError(errorMessage);
    } finally {
      setSubmitting((current) => ({ ...current, [type]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Documents & Insurance</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Insurance</h1>
          <p className="text-on-surface-variant font-medium">Upload and track your vehicle and fleet insurance documents from the backend.</p>
        </div>
        <button
          onClick={() => void loadDocuments()}
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

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        {DOC_TYPES.map((docType) => {
          const latest = latestByType(docType.key);
          return (
            <article key={docType.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Insurance Type</p>
                  <h2 className="mt-1 text-2xl font-black text-primary">{docType.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{docType.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${statusClass(latest?.status ?? 'PENDING')}`}>
                  {latest?.status ?? 'PENDING'}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Uploaded At</p>
                  <p className="mt-1 font-bold text-[#041627]">{prettyDate(latest?.createdAt)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Document ID</p>
                  <p className="mt-1 font-bold text-[#041627] break-all">{latest?.documentId ?? 'N/A'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Current File</p>
                <p className="mt-1 break-all text-sm text-[#44474C]">{latest?.fileUrl ?? 'No file uploaded yet'}</p>
                {latest?.rejectionReason && (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Rejection: {latest.rejectionReason}
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={expiryDates[docType.key] ?? ''}
                    onChange={(e) => setExpiryDates(prev => ({ ...prev, [docType.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-[#041627] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <label className={`block rounded-2xl border border-dashed px-4 py-5 text-center transition cursor-pointer ${expiryDates[docType.key] ? 'border-primary/40 bg-primary/5 hover:bg-primary/10' : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'}`}>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={Boolean(submitting[docType.key]) || !expiryDates[docType.key]}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void uploadDocument(docType.key, file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <span className="material-symbols-outlined text-3xl text-primary">upload_file</span>
                  <p className="mt-2 text-sm font-black text-[#041627]">
                    {submitting[docType.key] ? 'Uploading...' : 'Choose file and upload'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expiryDates[docType.key] ? 'PDF or image · submitted for admin review' : 'Set expiry date above first'}
                  </p>
                </label>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-primary">Uploaded Documents</h2>
            <p className="text-sm text-slate-500">All insurance documents retrieved from the backend.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#44474C]">
            {documents.length} records
          </span>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Uploaded</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">Loading documents...</td>
                </tr>
              ) : documents.length ? documents.map((doc) => (
                <tr key={doc.documentId}>
                  <td className="px-4 py-4 font-medium text-[#44474C]">{doc.docType.replace('_', ' ')}</td>
                  <td className="px-4 py-4 text-[#44474C]">{doc.status}</td>
                  <td className="px-4 py-4 text-[#44474C]">{prettyDate(doc.createdAt)}</td>
                  <td className="px-4 py-4 text-[#44474C] break-all">{doc.fileUrl}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No insurance documents uploaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default InsurancePage;
