import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../api/adminService';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarCollapsed, onOpenMobileSidebar, onToggleDesktopSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;

    const loadUnreadCount = async () => {
      try {
        const result = await adminService.getUnreadNotificationCount();
        if (alive) {
          setUnreadCount(result.unreadCount ?? 0);
        }
      } catch {
        if (alive) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 60000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const openNotifications = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/notifications');
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_4px_12px_rgba(26,43,60,0.05)] flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 ease-in-out flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-slate-600">menu</span>
          </button>
          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden lg:flex w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 ease-in-out items-center justify-center"
          >
            <span className="material-symbols-outlined text-slate-600">
              {isSidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>
        </div>

        <div className="relative hidden sm:block w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none" 
            placeholder="Search shipments, fleet, or drivers..." 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={openNotifications}
            className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-amber-500 px-1 text-[10px] font-black leading-4 text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button className="relative hover:bg-slate-100 rounded-full p-2 transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined text-slate-600">chat_bubble</span>
          </button>
        </div>
        
        <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
        
        <div className="flex items-center gap-3 sm:pl-2">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{user?.role === 'ADMIN' ? 'Platform Admin' : 'Operations Manager'}</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 overflow-hidden bg-slate-100 flex items-center justify-center font-black text-primary">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
