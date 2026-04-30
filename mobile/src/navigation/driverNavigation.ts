import type {DrawerRouteKey, DriverTabKey} from '../types';

export interface DrawerNavItem {
  children?: Array<{
    key: DrawerRouteKey;
    label: string;
  }>;
  icon: string;
  key: DrawerRouteKey | 'logout';
  label: string;
}

export const bottomTabs: Array<{
  icon: string;
  key: DriverTabKey;
  label: string;
}> = [
  {key: 'home', label: 'Home', icon: '🏠'},
  {key: 'jobs', label: 'Jobs', icon: '📦'},
  {key: 'tracking', label: 'Tracking', icon: '📍'},
  {key: 'profile', label: 'Profile', icon: '👤'},
];

export const drawerItems: DrawerNavItem[] = [
  {key: 'home', label: 'Home', icon: '🏠'},
  {
    key: 'jobs.available',
    label: 'My Jobs',
    icon: '📦',
    children: [
      {key: 'jobs.available', label: 'Available Jobs'},
      {key: 'jobs.myQuotes', label: 'My Bids'},
      {key: 'jobs.upcoming', label: 'Upcoming Jobs'},
      {key: 'jobs.history', label: 'Job History'},
    ],
  },
  {
    key: 'compliance.loadCode',
    label: 'Compliance',
    icon: '✅',
    children: [
      {key: 'compliance.loadCode', label: 'Load Code'},
      {key: 'compliance.handover', label: 'Vehicle Handover'},
      {key: 'compliance.delivery', label: 'Delivery Proof'},
    ],
  },
  {
    key: 'tracking.active',
    label: 'Live Tracking',
    icon: '📍',
    children: [{key: 'tracking.active', label: 'Active Trip Map'}],
  },
  {
    key: 'earnings.total',
    label: 'Earnings',
    icon: '💰',
    children: [
      {key: 'earnings.total', label: 'Total Earnings'},
      {key: 'earnings.monthly', label: 'Monthly Summary'},
      {key: 'earnings.history', label: 'Payment History'},
    ],
  },
  {
    key: 'invoices.list',
    label: 'Invoices',
    icon: '🧾',
    children: [{key: 'invoices.list', label: 'My Invoices'}],
  },
  {
    key: 'documents.upload',
    label: 'My Documents',
    icon: '📄',
    children: [
      {key: 'documents.upload', label: 'Upload Documents'},
      {key: 'documents.status', label: 'Verification Status'},
    ],
  },
  {
    key: 'availability.set',
    label: 'Availability',
    icon: '🗓️',
    children: [
      {key: 'availability.set', label: 'Set Availability'},
      {key: 'availability.toggle', label: 'Toggle On / Off'},
    ],
  },
  {
    key: 'ratings.received',
    label: 'Ratings & Reviews',
    icon: '⭐',
    children: [
      {key: 'ratings.received', label: 'My Ratings'},
      {key: 'ratings.given', label: 'Reviews Given'},
    ],
  },
  {
    key: 'notifications.all',
    label: 'Notifications',
    icon: '🔔',
    children: [{key: 'notifications.all', label: 'All Notifications'}],
  },
  {
    key: 'profile.edit',
    label: 'My Profile',
    icon: '👤',
    children: [
      {key: 'profile.edit', label: 'Edit Profile'},
      {key: 'profile.password', label: 'Change Password'},
      {key: 'profile.preferences', label: 'Notification Preferences'},
    ],
  },
  {
    key: 'support.faq',
    label: 'Help & Support',
    icon: '❓',
    children: [
      {key: 'support.faq', label: 'FAQs'},
      {key: 'support.contact', label: 'Contact Support'},
    ],
  },
  {key: 'logout', label: 'Logout', icon: '🚪'},
];
