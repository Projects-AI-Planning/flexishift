import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Truck, 
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const adminLinks = [
    { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { to: '/admin/documents', icon: <FileText size={20} />, label: 'Documents' },
    { to: '/admin/jobs', icon: <Truck size={20} />, label: 'All Jobs' },
  ];

  const haulierLinks = [
    { to: '/haulier', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { to: '/haulier/jobs', icon: <Truck size={20} />, label: 'My Jobs' },
    { to: '/haulier/profile', icon: <Settings size={20} />, label: 'Profile' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : haulierLinks;

  return (
    <div className="w-64 bg-navy text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 text-xl font-bold border-b border-white/10 flex items-center gap-2">
        <Truck className="text-amber" />
        <span>FreightFlex</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) => 
              `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-amber text-navy font-semibold' : 'hover:bg-white/5'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={logout}
          className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-white/5 transition-colors text-left"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
