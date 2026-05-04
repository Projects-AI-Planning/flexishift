export type DriverTabKey = 'home' | 'jobs' | 'tracking' | 'profile';

export type DrawerRouteKey =
  | 'home'
  | 'jobs.available'
  | 'jobs.myQuotes'
  | 'jobs.booking'
  | 'jobs.upcoming'
  | 'jobs.history'
  | 'compliance.loadCode'
  | 'compliance.scanner'
  | 'compliance.handover'
  | 'compliance.delivery'
  | 'tracking.active'
  | 'tracking.incident'
  | 'earnings.total'
  | 'earnings.monthly'
  | 'earnings.history'
  | 'invoices.list'
  | 'documents.upload'
  | 'documents.status'
  | 'availability.set'
  | 'availability.toggle'
  | 'ratings.received'
  | 'ratings.given'
  | 'notifications.all'
  | 'invoices.detail'
  | 'profile.edit'
  | 'profile.password'
  | 'profile.preferences'
  | 'support.faq'
  | 'support.contact'
  | 'legal.terms';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  status: boolean;
}

export interface DriverSession {
  accessToken: string;
  email: string;
  expiresIn?: number;
  isProfileComplete?: boolean;
  isVerified?: boolean;
  name: string;
  phone?: string;
  profilePhoto?: string;
  refreshToken: string;
  role: string;
  userId: string;
}

export interface DashboardOverview {
  activeJob?: {
    currentComplianceStep?: string;
    dropLocation?: string;
    eta?: string;
    jobId: string;
    jobReference: string;
    pickupLocation?: string;
    quickActions?: string[];
    status?: string;
  } | null;
  driverId: string;
  isAvailable?: boolean;
  isVerified?: boolean;
  lastUpdatedAt?: string;
  name: string;
  pendingActions?: Array<{
    action: string;
    jobReference?: string;
  }>;
  photo?: string;
  rating?: number;
  todaySummary?: {
    currency?: string;
    jobsCompleted?: number;
    todayEarnings?: number;
  };
  unreadNotifications?: number;
  upcomingJobs?: number;
}

export interface JobSummary {
  agreedAmount?: number;
  createdAt?: string;
  distance?: string;
  dropLocation?: string | {address?: string};
  goodsType?: string;
  jobDate?: string;
  jobId: string;
  jobReference: string;
  paymentSecured?: boolean;
  pickupLocation?: string | {address?: string};
  status: string;
  weight?: string;
}

export interface ProfileResponse {
  createdAt?: string;
  currency?: string;
  email: string;
  isProfileComplete?: boolean;
  isVerified?: boolean;
  name: string;
  phone?: string;
  profileData?: Record<string, unknown>;
  rating?: number;
  role: string;
  totalEarnings?: number;
  totalJobs?: number;
  userId: string;
  verificationStatus?: string;
}

export interface AvailabilityResponse {
  availabilityId?: string;
  availableDays?: string[];
  isAvailable?: boolean;
  reason?: string;
  timeSlots?: Array<Record<string, unknown>>;
  timezone?: string;
  updatedAt?: string;
}

export interface DocumentSummary {
  documentId: string;
  documentType: string;
  expiryDate?: string;
  fileUrl?: string;
  rejectionReason?: string;
  status: string;
  uploadedAt?: string;
}

export interface NotificationSummary {
  createdAt?: string;
  data?: Record<string, unknown>;
  isRead?: boolean;
  message: string;
  notificationId: string;
  title: string;
  type: string;
}

export interface BookingDetail {
  bookingId: string;
  bookingReference?: string;
  driverId?: string;
  escrowAmount?: number;
  escrowStatus?: string;
  jobDate?: string;
  jobId: string;
  jobReference?: string;
  paymentStatus?: string;
  pickupLocation?: string | {address?: string};
  dropLocation?: string | {address?: string};
  status: string;
  goodsType?: string;
  weight?: string;
  distance?: string;
  currency?: string;
  createdAt?: string;
}

export interface RatingSummary {
  averageRating?: number;
  ratings?: Array<Record<string, unknown>>;
  recentTrend?: string;
  topTags?: string[];
  totalRatings?: number;
  userId: string;
}
