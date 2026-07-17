import { useCallback, useEffect, useMemo, useState } from 'react';
import haulierService from '../../api/haulierService';

type NotificationItem = {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown> | null;
  createdAt: string | null;
};

type NotificationListResponse = {
  notifications: NotificationItem[];
  totalNotifications: number;
  unreadCount: number;
  page: number;
  limit: number;
};

type NotificationPreferences = {
  pushNotifications?: Record<string, boolean>;
  emailNotifications?: Record<string, boolean>;
  smsNotifications?: Record<string, boolean>;
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'job_update', label: 'Job Updates' },
  { value: 'payment', label: 'Payments' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'system', label: 'System' },
];

const typeLabel = (value: string) => value.replace(/_/g, ' ');

const typeTone = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === 'payment') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'compliance') return 'bg-[#1066b1]/15 text-[#0a4a8f]';
  if (normalized === 'system') return 'bg-rose-100 text-rose-700';
  return 'bg-blue-100 text-blue-700';
};

const preferenceGroups: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: 'pushNotifications',
    title: 'Push Notifications',
    description: 'Control alerts that appear on your device.',
  },
  {
    key: 'emailNotifications',
    title: 'Email Notifications',
    description: 'Control notifications sent to your inbox.',
  },
  {
    key: 'smsNotifications',
    title: 'SMS Notifications',
    description: 'Control text alerts for time-sensitive events.',
  },
];

const asBoolean = (value: unknown) => Boolean(value);

export default function HaulierNotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [type, setType] = useState('');
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [unread, setUnread] = useState<{ unreadCount: number; breakdown?: Record<string, number> } | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({ page, limit, type: type || undefined }), [limit, page, type]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifications, unreadCount, prefs] = await Promise.all([
        haulierService.getNotifications(params),
        haulierService.getUnreadCount(),
        haulierService.getNotificationPreferences(),
      ]);
      setData(notifications);
      setUnread(unreadCount);
      setPreferences(prefs?.preferences ?? prefs ?? null);
      setError(null);
    } catch {
      setError('Failed to load notification data from the backend.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = () => {
    void fetchData();
  };

  const markRead = async (notificationId: string) => {
    setSavingId(notificationId);
    try {
      await haulierService.markNotificationRead(notificationId);
      await fetchData();
    } catch {
      setError('Failed to mark notification as read.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    setSavingId(notificationId);
    try {
      await haulierService.deleteNotification(notificationId);
      await fetchData();
    } catch {
      setError('Failed to delete notification.');
    } finally {
      setSavingId(null);
    }
  };

  const markAllRead = async () => {
    setSavingId('all');
    try {
      await haulierService.markAllNotificationsRead();
      await fetchData();
    } catch {
      setError('Failed to mark all notifications as read.');
    } finally {
      setSavingId(null);
    }
  };

  const updatePreference = async (group: keyof NotificationPreferences, key: string, value: boolean) => {
    if (!preferences) return;
    setPreferencesSaving(true);
    const nextPreferences = {
      ...preferences,
      [group]: {
        ...(preferences[group] ?? {}),
        [key]: value,
      },
    };
    setPreferences(nextPreferences);
    try {
      await haulierService.updateNotificationPreferences(nextPreferences as Record<string, unknown>);
      await fetchData();
    } catch {
      setError('Failed to update notification preferences.');
    } finally {
      setPreferencesSaving(false);
    }
  };

  const items = data?.notifications ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalNotifications ?? 0) / limit));

  const unreadBreakdown = Object.entries(unread?.breakdown ?? {});

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Settings</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Notifications</h1>
          <p className="text-on-surface-variant font-medium">
            Manage your notification inbox and delivery preferences using backend data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={markAllRead}
            disabled={savingId === 'all' || (unread?.unreadCount ?? 0) === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-slate-50 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            {savingId === 'all' ? 'Updating...' : 'Mark All Read'}
          </button>
          <button
            onClick={refresh}
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
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Notifications</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.totalNotifications ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Unread</p>
          <h3 className="mt-2 text-3xl font-black text-[#0d55a0]">{unread?.unreadCount ?? 0}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Page</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{data?.page ?? page}</h3>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Filtered Type</p>
          <h3 className="mt-2 text-3xl font-black text-primary">{type ? typeLabel(type) : 'All'}</h3>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-primary">Unread Breakdown</h2>
            <p className="text-sm text-slate-500">Counts returned by the backend unread-count endpoint.</p>

            <div className="mt-5 space-y-3">
              {unreadBreakdown.length > 0 ? (
                unreadBreakdown.map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{typeLabel(key)}</p>
                        <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${typeTone(key)}`}>
                          {key}
                        </p>
                      </div>
                      <span className="text-lg font-black text-primary">{value}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No unread notifications yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-primary">Delivery Preferences</h2>
            <p className="text-sm text-slate-500">Toggle how you want to receive alerts from the backend.</p>

            <div className="mt-5 space-y-5">
              {preferenceGroups.map((group) => {
                const groupValues = preferences?.[group.key] ?? {};
                return (
                  <div key={group.key} className="rounded-2xl bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-black text-primary">{group.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{group.description}</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {Object.entries(groupValues).map(([prefKey, prefValue]) => (
                        <label key={prefKey} className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">{typeLabel(prefKey)}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={asBoolean(prefValue)}
                            disabled={preferencesSaving}
                            onChange={(e) => void updatePreference(group.key, prefKey, e.target.checked)}
                            className="h-5 w-5 rounded border-slate-200 text-primary focus:ring-primary"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!preferences && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Notification preferences are loading.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Notification Inbox</h2>
              <p className="text-sm text-slate-500">Read, delete, and filter notifications using backend data.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`mt-5 overflow-x-auto rounded-2xl border border-slate-100 ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Notification</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Created</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((notification) => (
                  <tr key={notification.notificationId} className={notification.isRead ? 'bg-white' : 'bg-[#1066b1]/10/40'}>
                    <td className="px-4 py-4">
                      <p className="font-black text-primary">{notification.title}</p>
                      <p className="mt-1 max-w-[420px] text-xs text-slate-500">{notification.message}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${typeTone(notification.type)}`}>
                        {typeLabel(notification.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          notification.isRead ? 'bg-slate-100 text-[#44474C]' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {notification.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => void markRead(notification.notificationId)}
                            disabled={savingId === notification.notificationId}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => void deleteNotification(notification.notificationId)}
                          disabled={savingId === notification.notificationId}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No notifications found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-500">
              Showing {items.length} of {data?.totalNotifications ?? 0} notifications
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
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
