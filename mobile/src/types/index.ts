export type DriverTabKey = 'home' | 'jobs' | 'shifts' | 'tracking' | 'profile';

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
  | 'legal.terms'
  | 'legal.privacy'
  | 'profile.settings'
  | 'profile.payments'
  | 'shifts.available'
  | 'shifts.myShifts'
  | 'shifts.accessCode'
  | 'shifts.handover'
  | 'shifts.tracking'
  | 'shifts.endOfDay'
  | 'shifts.dayComplete'
  | 'shifts.rating'
  | 'payment.escrow'
  | 'payment.awaiting';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  status: boolean;
}

export interface DriverSession {
  accessToken: string;
  currency: string;
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
    dropLat?: number;
    dropLng?: number;
    distanceKm?: number;
    durationMin?: number;
    eta?: string;
    originalEta?: string;
    jobId: string;
    jobReference: string;
    pickupLocation?: string;
    pickupLat?: number;
    pickupLng?: number;
    currentLocation?: {
      lastUpdatedAt?: string;
      latitude?: number;
      longitude?: number;
    } | null;
    quickActions?: string[];
    status?: string;
    stops?: Array<{order?: number; address?: string; litres?: number}>;
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
  avgRating?: number;
  completedJobs?: number;
  isProfileComplete?: boolean;
  isVerified?: boolean;
  isAdminApproved?: boolean;
  name: string;
  phone?: string;
  profileComplete?: boolean;
  profilePhoto?: string;
  profile?: {
    photoUrl?: string;
    licenceNumber?: string;
    vehicleType?: string;
    vehicleRegistration?: string;
    truckCapacity?: string;
    companyName?: string;
    companyAddress?: string;
    coverageArea?: string;
    driverAvailability?: string;
    equipmentDetails?: Array<Record<string, unknown>>;
    driverAssignments?: Array<Record<string, unknown>>;
    esignatureData?: string | null;
  } | null;
  stripeConnect?: {
    hasAccount: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null;
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
  blocks?: Array<Record<string, unknown>>;
  isAvailable?: boolean;
  reason?: string;
  slots?: Array<Record<string, unknown>>;
  timeSlots?: Array<Record<string, unknown>>;
  timezone?: string;
  updatedAt?: string;
}

export interface DocumentSummary {
  documentId: string;
  docType?: string;
  documentType?: string;
  customName?: string;
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
  readAt?: string;
  message: string;
  notificationId: string;
  title: string;
  type: string;
}

export interface BookingDetail {
  bookingId: string;
  // backend uses jobRef; keep aliases for compatibility
  jobRef?: string;
  jobReference?: string;
  bookingReference?: string;
  driverId?: string;
  // backend sends agreedAmount (from payment); escrowAmount is alias
  agreedAmount?: number;
  escrowAmount?: number;
  escrowStatus?: string;
  jobDate?: string;
  // bookingId === jobId in this backend
  jobId: string;
  paymentStatus?: string;
  complianceStatus?: string;
  // backend field names
  pickupAddress?: string;
  dropAddress?: string;
  // legacy aliases
  pickupLocation?: string | {address?: string};
  dropLocation?: string | {address?: string};
  status: string;
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number;
  distanceKm?: number;
  // legacy aliases
  weight?: string;
  distance?: string;
  currency?: string;
  createdAt?: string;
}

export interface RatingReviewItem {
  ratingId: string;
  raterName: string;
  rating: number;
  comment: string;
  jobReference?: string;
  createdAt?: string;
}

export interface RatingSummary {
  averageRating?: number;
  name?: string;
  ratings?: Array<Record<string, unknown>>;
  reviews?: RatingReviewItem[];
  recentTrend?: string;
  topTags?: string[];
  totalRatings?: number;
  userId: string;
}
