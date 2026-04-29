import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface SidebarChildLink {
  to: string;
  label: string;
}

interface SidebarLink {
  to?: string;
  icon: string;
  label: string;
  children?: SidebarChildLink[];
}

const NavItem: React.FC<{ link: SidebarLink; isExpanded: boolean; toggle: () => void }> = ({ link, isExpanded, toggle }) => {
  const location = useLocation();
  const hasChildren = link.children && link.children.length > 0;
  
  // Check if any child is active
  const isChildActive = hasChildren && link.children?.some(child => location.pathname === child.to);
  const isMainActive = link.to ? (location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))) : isChildActive;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={toggle}
          className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg transition-all duration-200 font-bold text-sm outline-none ${
            isMainActive || isExpanded
              ? 'bg-amber-500/10 text-amber-500' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </div>
          <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {isExpanded && (
          <div className="pl-12 pr-4 space-y-1 overflow-hidden transition-all duration-300">
            {link.children?.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `block py-2 text-xs font-bold transition-colors ${
                    isActive ? 'text-amber-500' : 'text-slate-500 hover:text-white'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={link.to || '#'}
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
  );
};

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const adminLinks: SidebarLink[] = [
    { to: '/admin', icon: 'dashboard', label: 'Dashboard' },
    {
      icon: 'group',
      label: 'User Management',
      children: [
        { to: '/admin/users/all', label: 'All Users' },
        { to: '/admin/users/drivers', label: 'Drivers' },
        { to: '/admin/users/hauliers', label: 'Hauliers' },
        { to: '/admin/users/suspended', label: 'Suspended' },
      ],
    },
    {
      icon: 'verified_user',
      label: 'Verifications',
      children: [
        { to: '/admin/verifications/pending', label: 'Pending' },
        { to: '/admin/verifications/processed', label: 'Processed' },
      ],
    },
    {
      icon: 'local_shipping',
      label: 'Job Management',
      children: [
        { to: '/admin/jobs/all', label: 'All Jobs' },
        { to: '/admin/jobs/active', label: 'Active' },
        { to: '/admin/jobs/completed', label: 'Completed' },
        { to: '/admin/jobs/cancelled', label: 'Cancelled' },
      ],
    },
    {
      icon: 'payments',
      label: 'Payments',
      children: [
        { to: '/admin/payments/transactions', label: 'Transactions' },
        { to: '/admin/payments/escrow', label: 'Escrow' },
        { to: '/admin/payments/refunds', label: 'Refunds' },
      ],
    },
    {
      icon: 'receipt_long',
      label: 'Invoices',
      children: [
        { to: '/admin/invoices/all', label: 'All Invoices' },
        { to: '/admin/invoices/reports', label: 'Reports' },
      ],
    },
    {
      icon: 'gavel',
      label: 'Disputes',
      children: [
        { to: '/admin/disputes/active', label: 'Active' },
        { to: '/admin/disputes/resolved', label: 'Resolved' },
        { to: '/admin/disputes/escalated', label: 'Escalated' },
      ],
    },
    {
      icon: 'star',
      label: 'Ratings',
      children: [
        { to: '/admin/ratings/all', label: 'All' },
        { to: '/admin/ratings/reported', label: 'Reported' },
      ],
    },
    { to: '/admin/tracking', icon: 'distance', label: 'Live Tracking' },
    {
      icon: 'monitoring',
      label: 'Reports & Analytics',
      children: [
        { to: '/admin/analytics/revenue', label: 'Revenue' },
        { to: '/admin/analytics/jobs', label: 'Jobs' },
        { to: '/admin/analytics/users', label: 'Users' },
      ],
    },
    { to: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
    {
      icon: 'settings',
      label: 'System Settings',
      children: [
        { to: '/admin/settings/config', label: 'Platform Config' },
        { to: '/admin/settings/logs', label: 'System Logs' },
      ],
    },
    {
      icon: 'support_agent',
      label: 'Support Tickets',
      children: [
        { to: '/admin/support/active', label: 'Active' },
        { to: '/admin/support/resolved', label: 'Resolved' },
      ],
    },
  ];

  const haulierLinks: SidebarLink[] = [
    { to: '/haulier', icon: 'dashboard', label: 'Dashboard' },
    { to: '/haulier/post-job', icon: 'add_circle', label: 'Post Job' },
    {
      icon: 'local_shipping',
      label: 'My Jobs',
      children: [
        { to: '/haulier/jobs/open', label: 'Open' },
        { to: '/haulier/jobs/booked', label: 'Booked' },
        { to: '/haulier/jobs/transit', label: 'In Transit' },
        { to: '/haulier/jobs/completed', label: 'Completed' },
      ],
    },
    {
      icon: 'payments',
      label: 'Payments',
      children: [
        { to: '/haulier/payments/escrow', label: 'Escrow' },
        { to: '/haulier/payments/history', label: 'History' },
        { to: '/haulier/payments/invoices', label: 'Invoices' },
      ],
    },
    {
      icon: 'forklift',
      label: 'Fleet Management',
      children: [
        { to: '/haulier/fleet/vehicles', label: 'Vehicles' },
        { to: '/haulier/fleet/equipment', label: 'Equipment' },
      ],
    },
    {
      icon: 'badge',
      label: 'Drivers',
      children: [
        { to: '/haulier/drivers/all', label: 'All Drivers' },
        { to: '/haulier/drivers/schedule', label: 'Schedule' },
      ],
    },
    {
      icon: 'inventory_2',
      label: 'Load Management',
      children: [
        { to: '/haulier/loads/matching', label: 'Matching' },
        { to: '/haulier/loads/bids', label: 'Bids' },
        { to: '/haulier/loads/awarded', label: 'Awarded' },
      ],
    },
    {
      icon: 'monitoring',
      label: 'Analytics',
      children: [
        { to: '/haulier/analytics/revenue', label: 'Revenue' },
        { to: '/haulier/analytics/performance', label: 'Performance' },
        { to: '/haulier/analytics/costs', label: 'Costs' },
      ],
    },
    {
      icon: 'description',
      label: 'Documents',
      children: [
        { to: '/haulier/documents/compliance', label: 'Compliance' },
        { to: '/haulier/documents/insurance', label: 'Insurance' },
      ],
    },
    {
      icon: 'settings',
      label: 'Settings',
      children: [
        { to: '/haulier/settings/profile', label: 'Profile' },
        { to: '/haulier/settings/notifications', label: 'Notifications' },
        { to: '/haulier/settings/security', label: 'Security' },
      ],
    },
    {
      icon: 'help',
      label: 'Support',
      children: [
        { to: '/haulier/support/help', label: 'Help Center' },
        { to: '/haulier/support/contact', label: 'Contact' },
      ],
    },
    { to: '/haulier/tracking', icon: 'distance', label: 'Live Tracking' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : haulierLinks;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 z-50 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col gap-2 antialiased">
      <div className="px-6 pt-8 pb-4">
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

      <div className="px-6 py-4 mb-2 bg-slate-800/30 border-y border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-bold truncate">{user?.name}</p>
            <p className="text-amber-500 text-[10px] uppercase font-black tracking-widest">{user?.role}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
        {links.map((link, index) => (
          <NavItem 
            key={index} 
            link={link} 
            isExpanded={expandedIndex === index}
            toggle={() => toggleExpand(index)}
          />
        ))}
      </nav>

      <div className="mt-auto p-4 m-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
        <button 
          onClick={logout}
          className="w-full bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-xs border border-slate-800"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Logout
        </button>
      </div>

      <div className="px-4 pb-6">
        <a className="flex items-center gap-3 text-slate-500 hover:text-white px-4 py-2 mx-2 transition-colors text-xs font-bold" href="#">
          <span className="material-symbols-outlined text-sm">help</span>
          <span>Support Center</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
