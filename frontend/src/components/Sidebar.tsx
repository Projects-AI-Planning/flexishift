import React, { useEffect, useState } from 'react';
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

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemProps {
  isCollapsed: boolean;
  isExpanded: boolean;
  isMobile: boolean;
  link: SidebarLink;
  onNavigate: () => void;
  toggle: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  link,
  isExpanded,
  toggle,
  isCollapsed,
  isMobile,
  onNavigate,
}) => {
  const location = useLocation();
  const hasChildren = Boolean(link.children?.length);
  const isChildActive = hasChildren && link.children?.some((child) => location.pathname === child.to);
  const isMainActive = link.to
    ? location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))
    : isChildActive;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={toggle}
          className={`w-full flex items-center ${
            isCollapsed && !isMobile ? 'justify-center' : 'justify-between'
          } px-4 py-3 mx-2 rounded-lg transition-all duration-200 font-bold text-sm outline-none ${
            isMainActive || isExpanded
              ? 'bg-[#1066b1]/20 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={isCollapsed && !isMobile ? link.label : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined shrink-0">{link.icon}</span>
            {(!isCollapsed || isMobile) && <span className="truncate">{link.label}</span>}
          </div>
          {(!isCollapsed || isMobile) && (
            <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          )}
        </button>
        {isExpanded && (!isCollapsed || isMobile) && (
          <div className="pl-12 pr-4 space-y-1 overflow-hidden transition-all duration-300">
            {link.children?.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-[#1066b1]/20 text-white'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-white'
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
      onClick={onNavigate}
      title={isCollapsed && !isMobile ? link.label : undefined}
      className={({ isActive }) =>
        `flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'} px-4 py-3 mx-2 rounded-lg transition-all duration-200 font-bold text-sm ${
          isActive
            ? 'bg-[#1066b1] text-white shadow-lg shadow-[#1066b1]/20'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`
      }
    >
      <span className="material-symbols-outlined shrink-0">{link.icon}</span>
      {(!isCollapsed || isMobile) && <span className="truncate">{link.label}</span>}
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, isMobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
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
    { to: '/haulier/shifts', icon: 'event_available', label: 'Schedule Shift' },
    { to: '/haulier/jobs', icon: 'local_shipping', label: 'My Jobs' },
    { to: '/haulier/payments', icon: 'payments', label: 'Payments' },
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
    // { icon: 'settings', label: 'Settings', children: [
    //   { to: '/haulier/settings/profile', label: 'Profile' },
    //   { to: '/haulier/settings/notifications', label: 'Notifications' },
    //   { to: '/haulier/settings/security', label: 'Security' },
    // ] },
    // { icon: 'help', label: 'Support', children: [
    //   { to: '/haulier/support/help', label: 'Help Center' },
    //   { to: '/haulier/support/contact', label: 'Contact' },
    // ] },
    // { to: '/haulier/notifications', icon: 'notifications', label: 'Notifications' },
    { to: '/haulier/tracking', icon: 'distance', label: 'Live Tracking' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : haulierLinks;

  useEffect(() => {
    const activeParentIndex = links.findIndex(
      (link) => Boolean(link.children?.some((child) => location.pathname === child.to)),
    );

    queueMicrotask(() => {
      setExpandedIndex(activeParentIndex >= 0 ? activeParentIndex : null);
      onCloseMobile();
    });
  }, [location.pathname, onCloseMobile]);

  const toggleExpand = (index: number) => {
    if (isCollapsed && !isMobileOpen) {
      return;
    }
    setExpandedIndex((current) => (current === index ? null : index));
  };

  const sidebarWidth = isCollapsed ? 'lg:w-20' : 'lg:w-64';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 transition-opacity lg:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 ${sidebarWidth} bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col gap-2 antialiased transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`pt-6 pb-4 ${isCollapsed ? 'lg:px-4' : 'px-6'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center ${isCollapsed ? 'lg:justify-center lg:w-full' : 'gap-3 min-w-0'}`}>
              <div className="w-10 h-10 bg-[#1066b1] rounded flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white font-bold">local_shipping</span>
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-white uppercase truncate">FreightFlex</h1>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold truncate">
                    {user?.role === 'ADMIN' ? 'Admin Panel' : 'Haulier Portal'}
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden w-10 h-10 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className={`py-4 mb-2 bg-slate-800/30 border-y border-slate-800/50 ${isCollapsed ? 'lg:px-4' : 'px-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-[#1066b1]/20 flex items-center justify-center text-white font-black text-sm shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="overflow-hidden">
                <p className="text-white text-sm font-bold truncate">{user?.name}</p>
                <p className="text-[#1066b1] text-[10px] uppercase font-black tracking-widest truncate">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
          {links.map((link, index) => (
            <NavItem
              key={index}
              link={link}
              isCollapsed={isCollapsed}
              isExpanded={expandedIndex === index}
              isMobile={isMobileOpen}
              onNavigate={onCloseMobile}
              toggle={() => toggleExpand(index)}
            />
          ))}
        </nav>

        <div className="mt-auto p-4 m-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
          <button
            onClick={logout}
            className={`w-full bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 font-bold py-3 rounded-lg flex items-center ${
              isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-center gap-2'
            } transition-all text-xs border border-slate-800`}
            title={isCollapsed && !isMobileOpen ? 'Logout' : undefined}
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            {(!isCollapsed || isMobileOpen) && 'Logout'}
          </button>
        </div>

        <div className="px-4 pb-6">
          <a
            className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-3'} text-slate-500 hover:text-white px-4 py-2 mx-2 transition-colors text-xs font-bold`}
            href="#"
            title={isCollapsed && !isMobileOpen ? 'Support Center' : undefined}
          >
            <span className="material-symbols-outlined text-sm">help</span>
            {(!isCollapsed || isMobileOpen) && <span>Support Center</span>}
          </a>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
