import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../api/adminService';
import haulierService from '../api/haulierService';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
}

type NotifItem = {
  notificationId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  type: string;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const typeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('payment')) return 'payments';
  if (t.includes('job')) return 'local_shipping';
  if (t.includes('quote')) return 'request_quote';
  if (t.includes('compliance')) return 'verified_user';
  return 'notifications';
};

const typeTone = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('payment')) return 'text-emerald-600 bg-emerald-50';
  if (t.includes('job')) return 'text-blue-600 bg-blue-50';
  if (t.includes('quote')) return 'text-amber-600 bg-amber-50';
  if (t.includes('compliance')) return 'text-purple-600 bg-purple-50';
  return 'text-slate-500 bg-slate-100';
};

const Header: React.FC<HeaderProps> = ({ isSidebarCollapsed, onOpenMobileSidebar, onToggleDesktopSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const loadNotifications = async () => {
    if (isAdmin) return;
    setNotifLoading(true);
    try {
      const result = await haulierService.getNotifications({ page: 1, limit: 6 }) as {
        notifications: NotifItem[];
      };
      setNotifications(result?.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const result = isAdmin
          ? await adminService.getUnreadNotificationCount()
          : await haulierService.getUnreadCount();
        if (alive) setUnreadCount((result as { unreadCount?: number })?.unreadCount ?? 0);
      } catch {
        if (alive) setUnreadCount(0);
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 60000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user, isAdmin]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    if (isAdmin) {
      navigate('/admin/notifications');
      return;
    }
    if (!notifOpen) void loadNotifications();
    setNotifOpen((v) => !v);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await haulierService.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* silent */
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await haulierService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.notificationId === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 ease-in-out flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[#44474C]">menu</span>
          </button>
          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden lg:flex w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 ease-in-out items-center justify-center"
          >
            <span className="material-symbols-outlined text-[#44474C]">
              {isSidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>
        </div>

        <div className="relative hidden sm:block w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none"
            placeholder="Search shipments, fleet, or drivers..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={handleBellClick}
              className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[#44474C]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-amber-500 px-1 text-[10px] font-black leading-4 text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Haulier Notification Dropdown */}
            {!isAdmin && notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm">notifications</span>
                    <span className="font-black text-sm text-[#041627]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => void markAllRead()}
                      disabled={markingAll}
                      className="text-[10px] font-black uppercase tracking-wide text-primary hover:text-amber-600 transition-colors disabled:opacity-50"
                    >
                      {markingAll ? 'Marking…' : 'Mark all read'}
                    </button>
                  )}
                </div>

                {/* Items */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifLoading ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <span className="material-symbols-outlined animate-spin text-2xl block mx-auto mb-2">progress_activity</span>
                      Loading…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <span className="material-symbols-outlined text-3xl text-slate-300 block mb-2">notifications_none</span>
                      <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.notificationId}
                        onClick={() => {
                          if (!n.isRead) void markOneRead(n.notificationId);
                          setNotifOpen(false);
                          navigate('/haulier/notifications');
                        }}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-amber-50/40' : ''}`}
                      >
                        <span className={`mt-0.5 rounded-xl p-1.5 shrink-0 ${typeTone(n.type)}`}>
                          <span className="material-symbols-outlined text-sm">{typeIcon(n.type)}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-black truncate ${!n.isRead ? 'text-[#041627]' : 'text-[#44474C]'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => { setNotifOpen(false); navigate('/haulier/notifications'); }}
                    className="w-full text-center text-xs font-black text-primary hover:text-amber-600 transition-colors"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out hidden sm:flex">
            <span className="material-symbols-outlined text-[#44474C]">chat_bubble</span>
          </button>
        </div>

        <div className="hidden sm:block h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-[#041627] truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              {isAdmin ? 'Platform Admin' : 'Operations Manager'}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-100 flex items-center justify-center font-black text-primary text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
