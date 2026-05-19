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
  {key: 'home', label: 'FlexiShift', icon: '\u2302'},
  {key: 'jobs', label: 'Jobs', icon: '\u{1F4E6}'},
  {key: 'shifts', label: 'Shifts', icon: '\ud83d\uddd3'},
  {key: 'tracking', label: 'Route', icon: '\u{1F69A}'},
  {key: 'profile', label: 'Profile', icon: '\u{1F464}'},
];

export const drawerItems: DrawerNavItem[] = [
  {key: 'home', label: 'FlexiShift', icon: '\u2302'},
  {
    key: 'jobs.available',
    label: 'My Jobs',
    icon: '\u{1F4E6}',
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
    icon: '\u2705',
    children: [
      {key: 'compliance.loadCode', label: 'Load Code'},
      {key: 'compliance.handover', label: 'Vehicle Handover'},
      {key: 'compliance.delivery', label: 'Delivery Proof'},
    ],
  },
  {
    key: 'tracking.active',
    label: 'Live Tracking',
    icon: '\u{1F69A}',
    children: [{key: 'tracking.active', label: 'Active Trip Map'}],
  },
  {
    key: 'earnings.total',
    label: 'Earnings',
    icon: '\uD83D\uDCB0',
    children: [
      {key: 'earnings.total', label: 'Total Earnings'},
      {key: 'earnings.monthly', label: 'Monthly Summary'},
      {key: 'earnings.history', label: 'Payment History'},
    ],
  },
  {
    key: 'invoices.list',
    label: 'Invoices',
    icon: '\uD83E\uDDFE',
    children: [{key: 'invoices.list', label: 'My Invoices'}],
  },
  {
    key: 'documents.upload',
    label: 'My Documents',
    icon: '\uD83D\uDCC4',
    children: [
      {key: 'documents.upload', label: 'Upload Documents'},
      {key: 'documents.status', label: 'Verification Status'},
    ],
  },
  {
    key: 'availability.set',
    label: 'Availability',
    icon: '\uD83D\uDDD3',
    children: [
      {key: 'availability.set', label: 'Set Availability'},
      {key: 'availability.toggle', label: 'Toggle On / Off'},
    ],
  },
  {
    key: 'ratings.received',
    label: 'Ratings & Reviews',
    icon: '\u2B50',
    children: [
      {key: 'ratings.received', label: 'My Ratings'},
      {key: 'ratings.given', label: 'Reviews Given'},
    ],
  },
  {
    key: 'notifications.all',
    label: 'Notifications',
    icon: '\uD83D\uDD14',
    children: [{key: 'notifications.all', label: 'All Notifications'}],
  },
  {
    key: 'profile.edit',
    label: 'My Profile',
    icon: '\u{1F464}',
    children: [
      {key: 'profile.edit', label: 'Edit Profile'},
      {key: 'profile.password', label: 'Change Password'},
      {key: 'profile.preferences', label: 'Notification Preferences'},
    ],
  },
  {
    key: 'support.faq',
    label: 'Help & Support',
    icon: '\u2753',
    children: [
      {key: 'support.faq', label: 'FAQs'},
      {key: 'support.contact', label: 'Contact Support'},
    ],
  },
  {
    key: 'shifts.available',
    label: 'Shifts',
    icon: '\uD83D\uDDD3',
    children: [
      {key: 'shifts.available', label: 'Available Shifts'},
      {key: 'shifts.myShifts', label: 'My Booked Shifts'},
    ],
  },
  {key: 'logout', label: 'Logout', icon: '\uD83D\uDEAA'},
];
