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
  loadCode?: string;
  status: string;
  createdAt: string;
  jobDate?: string;
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
  goodsType?: string;
  vehicleType?: string;
  weightKg?: number;
  agreedAmount?: number;
  paymentStatus?: string;
  isDelayed?: boolean;
  hasDispute?: boolean;
  haulier?: {
    name: string;
    phone: string;
  };
  driver?: {
    name: string;
    phone: string;
    vehicleNumber?: string;
    vehicleType?: string;
  };
  complianceStatus?: {
    loadCode: string;
    handover: string;
    delivery: string;
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

export interface AdminPayment {
  paymentId: string;
  jobId: string;
  jobRef: string;
  amount: number;
  currency: string;
  status: string;
  haulier?: { name: string | null; phone: string | null };
  driver?: { name: string | null; phone: string | null };
  pickupLocation?: string;
  dropLocation?: string;
  escrowedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
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

export interface ProcessedDocument extends Document {
  documentType: string;
  reviewedAt?: string;
  uploadedAt?: string;
}

export interface ProcessedVerification {
  userId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  joinedAt: string;
  documents: ProcessedDocument[];
  totalDocuments: number;
}

export interface Dispute {
  disputeId: string;
  jobId: string;
  bookingId: string;
  raisedBy: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'escalated';
  evidencePhotos: string[];
  resolution?: string;
  adminNote?: string;
  createdAt: string;
  jobReference?: string;
  disputeReason?: string;
  reportedBy?: string;
  totalAmount?: number;
  resolvedAt?: string;
  hoursOpen?: number;
  pickupLocation?: string;
  dropLocation?: string;
  haulier?: { name: string | null; phone: string | null };
  driver?: { name: string | null; phone: string | null };
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

export interface AdminInvoice {
  jobId: string;
  jobRef: string;
  invoiceUrl: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  jobStatus: string;
  jobDate?: string | null;
  createdAt: string;
  haulier?: { name: string | null; email: string | null; phone: string | null };
  pickupLocation?: string;
  dropLocation?: string;
  goodsType?: string;
}

export interface RevenueReport {
  totalRevenue: number;
  platformCommission: number;
  totalRefunds: number;
  netRevenue: number;
  allTimeRevenue: number;
  allTimeTransactions: number;
  period?: string;
  commissionRate?: string;
}

export interface SupportTicket {
  ticketId: string;
  userId?: string | null;
  requesterName: string;
  requesterEmail: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  resolutionNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface LiveDelivery {
  jobId: string;
  jobRef: string;
  status: string;
  haulier?: { name: string | null; phone: string | null };
  driver?: {
    name: string | null;
    phone: string | null;
    vehicleNumber: string | null;
    vehicleType: string | null;
  };
  pickupLocation?: string;
  dropLocation?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropLat?: number | null;
  dropLng?: number | null;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdatedAt: string | null;
  } | null;
  agreedAmount?: number | null;
  goodsType?: string | null;
  vehicleType?: string | null;
  weightKg?: number | null;
  jobDate?: string | null;
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
