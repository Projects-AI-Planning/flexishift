import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Truck, 
  LogOut,
  Settings,
  CreditCard,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const adminLinks = [
    { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { to: '/admin/documents', icon: <FileText size={20} />, label: 'Documents' },
    { to: '/admin/jobs', icon: <Truck size={20} />, label: 'All Jobs' },
    { to: '/admin/payments', icon: <CreditCard size={20} />, label: 'Financials' },
    { to: '/admin/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const haulierLinks = [
    { to: '/haulier', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { to: '/haulier/jobs', icon: <Truck size={20} />, label: 'My Jobs' },
    { to: '/haulier/fleet', icon: <Boxes size={20} />, label: 'Fleet' },
    { to: '/haulier/payments', icon: <CreditCard size={20} />, label: 'Payments' },
    { to: '/haulier/profile', icon: <Settings size={20} />, label: 'Profile' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : haulierLinks;

  return (
    <div className="w-64 bg-navy text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 text-xl font-bold border-b border-white/10 flex items-center gap-2">
        <div className="w-8 h-8 bg-amber rounded flex items-center justify-center text-navy font-black text-sm">FF</div>
        <span className="tracking-tight">FreightFlex</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin' || link.to === '/haulier'}
            className={({ isActive }) => 
              `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-amber text-navy font-bold shadow-lg shadow-amber/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {link.icon}
            <span className="text-sm tracking-wide">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto bg-navy">
        <div className="mb-4 px-3 py-2 bg-white/5 rounded-lg">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Logged in as</p>
          <p className="text-xs font-bold truncate">{user?.name}</p>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-500/10 transition-colors text-left text-gray-400 hover:text-red-400"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
