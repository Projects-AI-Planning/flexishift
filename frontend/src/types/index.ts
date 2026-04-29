export const UserRole = {
  ADMIN: 'ADMIN',
  DRIVER: 'DRIVER',
  HAULIER: 'HAULIER',
  FIRM: 'FIRM',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  isVerified?: boolean;
  joinedAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  totalRevenue: number;
  pendingDocuments: number;
}

export interface Job {
  jobId: string;
  jobRef: string;
  status: string;
  createdAt: string;
  pickupLocation?: string | {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropLocation?: string | {
    address: string;
    latitude: number;
    longitude: number;
  };
  agreedAmount?: number;
  driver?: {
    name: string;
    phone: string;
  };
}

export interface Document {
  documentId: string;
  userId: string;
  docType: string;
  fileUrl: string;
  status: string;
  rejectionReason?: string;
  remarks?: string;
  expiryDate?: string;
  createdAt?: string;
}

export interface VerificationRequest {
  userId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  joinedAt: string;
  documents: Document[];
  totalPendingDocuments: number;
}

export interface Dispute {
  disputeId: string;
  jobId: string;
  bookingId: string;
  raisedBy: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved';
  evidencePhotos: string[];
  resolution?: string;
  adminNote?: string;
  createdAt: string;
  jobReference?: string;
  disputeReason?: string;
  reportedBy?: string;
  totalAmount?: number;
}

export interface Invoice {
  invoiceId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface Payment {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
}

export interface SystemConfig {
  commissionRate: string;
  otpExpiryMinutes: number;
  jwtExpiryHours: number;
  disputeResolutionHours: number;
  maxFileUploadSize: string;
  trackingUpdateInterval: string;
  maintenanceMode: boolean;
}

export interface RevenueReport {
  totalRevenue: number;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Rating {
  ratingId: string;
  jobId: string;
  bookingId: string;
  ratedUserId: string;
  raterUserId: string;
  starRating: number;
  review: string;
  tags: string[];
  createdAt: string;
}
