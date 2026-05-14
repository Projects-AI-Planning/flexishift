import { useEffect, useMemo, useState } from 'react';
import adminService from '../../../api/adminService';

type SystemLog = {
  logId: string;
  level: string;
  message: string;
  timestamp: string;
};

type SystemLogsResponse = {
  logs: SystemLog[];
  totalLogs: number;
  page: number;
  limit: number;
  totalPages: number;
};

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
];

const levelTone = (level: string) => {
  const normalized = level.toLowerCase();
  if (normalized === 'error') return 'bg-rose-100 text-rose-700';
  if (normalized === 'warn') return 'bg-amber-100 text-amber-700';
  if (normalized === 'debug') return 'bg-slate-100 text-[#44474C]';
  return 'bg-emerald-100 text-emerald-700';
};

export default function SystemLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [level, setLevel] = useState('');
  const [data, setData] = useState<SystemLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({ page, limit, level: level || undefined }), [limit, page, level]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = (await adminService.getSystemLogs(params)) as SystemLogsResponse;
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, [params]);

  const items = data?.logs ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">System Settings</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">System Logs</h1>
          <p className="text-on-surface-variant font-medium">Inspect logs returned by the backend log reader.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={fetchLogs}
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

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Logs</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.totalLogs ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Page</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.page ?? page}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Per Page</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.limit ?? limit}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Filtered Level</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{level || 'All'}</h3>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-primary">Log Stream</h2>
            <p className="text-sm text-slate-500">Each entry is a line from the configured backend log file.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Page {data?.page ?? page} of {data?.totalPages ?? 1}
          </div>
        </div>

        <div className={`mt-5 overflow-x-auto rounded-2xl border border-slate-100 ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Level</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Message</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${levelTone(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="max-w-[760px] text-sm text-[#44474C]">{log.message}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                    No logs available for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-500">
            Showing {items.length} of {data?.totalLogs ?? 0} logs
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
