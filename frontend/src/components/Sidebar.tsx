import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const adminLinks = [
    { to: '/admin', icon: 'dashboard', label: 'Dashboard' },
    { to: '/admin/users', icon: 'group', label: 'User Management' },
    { to: '/admin/jobs', icon: 'local_shipping', label: 'Live Jobs' },
    { to: '/admin/documents', icon: 'verified_user', label: 'Verifications' },
    { to: '/admin/payments', icon: 'payments', label: 'Revenue Reports' },
    { to: '/admin/settings', icon: 'settings', label: 'Settings' },
  ];

  const haulierLinks = [
    { to: '/haulier', icon: 'dashboard', label: 'Dashboard' },
    { to: '/haulier/jobs', icon: 'local_shipping', label: 'Shipments' },
    { to: '/haulier/fleet', icon: 'manage_accounts', label: 'Fleet Management' },
    { to: '/haulier/payments', icon: 'payments', label: 'Payments' },
    { to: '/haulier/profile', icon: 'settings', label: 'Account Settings' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : haulierLinks;

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 z-50 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col h-full gap-2 antialiased">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-900 font-bold">local_shipping</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">FreightFlex</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {user?.role === 'ADMIN' ? 'Admin Panel' : 'Haulier Portal'}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin' || link.to === '/haulier'}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 font-bold text-sm ${
                isActive 
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-800/30 m-4 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-xs font-bold truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">{user?.role}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Logout
        </button>
      </div>

      <div className="px-4 pb-6">
        <a className="flex items-center gap-3 text-slate-500 hover:text-white px-4 py-2 mx-2 transition-colors text-xs font-bold" href="#">
          <span className="material-symbols-outlined text-sm">help</span>
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
