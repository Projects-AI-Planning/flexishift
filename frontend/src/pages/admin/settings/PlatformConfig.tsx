import { useEffect, useMemo, useState } from 'react';
import adminService from '../../../api/adminService';

type SystemConfigView = {
  platformName: string;
  version: string;
  appEnv: string;
  commissionRate: string;
  maxFileUploadSize: string;
  supportedFileTypes: string[];
  otpExpiryMinutes: number;
  jwtExpiryHours: number;
  refreshTokenExpiryDays: number;
  trackingUpdateInterval: string;
  escrowReleaseOnApproval: boolean;
  maxQuotesPerJob: number;
  disputeResolutionHours: number;
  maintenanceMode: boolean;
  googleMapsConfigured: boolean;
  awsConfigured: boolean;
  razorpayConfigured: boolean;
  sendgridConfigured: boolean;
  redisConfigured: boolean;
  firebaseConfigured: boolean;
  updatedAt: string;
};

const defaultForm = {
  appEnv: '',
  commissionRate: '',
  otpExpiryMinutes: 0,
  disputeResolutionHours: 0,
  maintenanceMode: false,
};

export default function PlatformConfigPage() {
  const [config, setConfig] = useState<SystemConfigView | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const result = (await adminService.getSystemConfig()) as SystemConfigView;
      setConfig(result);
      setForm({
        appEnv: result.appEnv ?? '',
        commissionRate: result.commissionRate ?? '',
        otpExpiryMinutes: result.otpExpiryMinutes ?? 0,
        disputeResolutionHours: result.disputeResolutionHours ?? 0,
        maintenanceMode: result.maintenanceMode ?? false,
      });
      setError(null);
    } catch {
      setError('Failed to load system configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfig();
  }, []);

  const canSave = useMemo(
    () => Boolean(form.appEnv || form.commissionRate || form.otpExpiryMinutes || form.disputeResolutionHours || form.maintenanceMode),
    [form],
  );

  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await adminService.updateSystemConfig({
        appEnv: form.appEnv,
        commissionRate: form.commissionRate,
        otpExpiryMinutes: form.otpExpiryMinutes,
        disputeResolutionHours: form.disputeResolutionHours,
        maintenanceMode: form.maintenanceMode,
      });
      setMessage(result.message ?? 'System configuration updated successfully.');
      await fetchConfig();
    } catch {
      setError('Failed to update system configuration.');
    } finally {
      setSaving(false);
    }
  };

  const statusCards = [
    { label: 'Google Maps', value: config?.googleMapsConfigured ? 'Connected' : 'Missing', tone: config?.googleMapsConfigured ? 'text-emerald-700' : 'text-rose-600' },
    { label: 'AWS', value: config?.awsConfigured ? 'Connected' : 'Missing', tone: config?.awsConfigured ? 'text-emerald-700' : 'text-rose-600' },
    { label: 'Razorpay', value: config?.razorpayConfigured ? 'Connected' : 'Missing', tone: config?.razorpayConfigured ? 'text-emerald-700' : 'text-rose-600' },
    { label: 'SendGrid', value: config?.sendgridConfigured ? 'Connected' : 'Missing', tone: config?.sendgridConfigured ? 'text-emerald-700' : 'text-rose-600' },
    { label: 'Redis', value: config?.redisConfigured ? 'Connected' : 'Missing', tone: config?.redisConfigured ? 'text-emerald-700' : 'text-rose-600' },
    { label: 'Firebase', value: config?.firebaseConfigured ? 'Connected' : 'Missing', tone: config?.firebaseConfigured ? 'text-emerald-700' : 'text-rose-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">System Settings</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Platform Config</h1>
          <p className="text-on-surface-variant font-medium">Edit backend-supported configuration values and review service status.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/settings/logs"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-slate-50"
          >
            System Logs
          </a>
          <button
            onClick={fetchConfig}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
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

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Environment</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{config?.appEnv ?? '—'}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Commission Rate</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{form.commissionRate || config?.commissionRate || '—'}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">OTP Expiry</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{config?.otpExpiryMinutes ?? 0} min</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Maintenance</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{config?.maintenanceMode ? 'On' : 'Off'}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Service Status</h2>
          <p className="text-sm text-slate-500">Connectivity flags from `/system/config`.</p>
          <div className="mt-5 grid grid-cols-1 gap-3">
            {statusCards.map((card) => (
              <div key={card.label} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-[#44474C]">{card.label}</span>
                  <span className={`text-sm font-black ${card.tone}`}>{card.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-primary">Editable Settings</h2>
              <p className="text-sm text-slate-500">Only the fields supported by the backend update endpoint are editable here.</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Updated: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}
            </div>
          </div>

          <form onSubmit={saveConfig} className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">App Environment</label>
              <select
                value={form.appEnv}
                onChange={(e) => setForm((current) => ({ ...current, appEnv: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select environment</option>
                <option value="development">development</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Commission Rate</label>
              <input
                type="text"
                value={form.commissionRate}
                onChange={(e) => setForm((current) => ({ ...current, commissionRate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                placeholder="5%"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">OTP Expiry Minutes</label>
              <input
                type="number"
                value={form.otpExpiryMinutes}
                onChange={(e) => setForm((current) => ({ ...current, otpExpiryMinutes: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Dispute Resolution Hours</label>
              <input
                type="number"
                value={form.disputeResolutionHours}
                onChange={(e) => setForm((current) => ({ ...current, disputeResolutionHours: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm((current) => ({ ...current, maintenanceMode: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-black text-primary">Maintenance Mode</p>
                  <p className="text-xs text-slate-500">Toggle platform maintenance state.</p>
                </div>
              </label>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={fetchConfig}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-primary transition hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving || loading || !canSave}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Config'}
              </button>
            </div>
          </form>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Readonly</p>
              <p className="mt-2 text-sm font-bold text-primary">JWT Expiry: {config?.jwtExpiryHours ?? 0} hours</p>
              <p className="text-xs text-slate-500">Returned by backend, not editable via current update endpoint.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Readonly</p>
              <p className="mt-2 text-sm font-bold text-primary">File Upload: {config?.maxFileUploadSize ?? '—'}</p>
              <p className="text-xs text-slate-500">Validation setting from system config.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Readonly</p>
              <p className="mt-2 text-sm font-bold text-primary">Tracking Interval: {config?.trackingUpdateInterval ?? '—'}</p>
              <p className="text-xs text-slate-500">GPS refresh interval exposed by backend.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
