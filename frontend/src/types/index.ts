export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
  HAULIER = 'HAULIER',
  FIRM = 'FIRM',
  CUSTOMER = 'CUSTOMER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

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
  pickupLocation?: string;
  dropLocation?: string;
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
  expiryDate?: string;
  createdAt?: string;
}

export interface VerificationRequest {
  supplierId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  joinedAt: string;
  documents: Document[];
  totalPendingDocuments: number;
}
