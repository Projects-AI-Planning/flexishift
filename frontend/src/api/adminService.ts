import client from './client';
import type { AdminStats, Dispute, Job, SystemConfig, User } from '../types';

type ApiUser = Partial<User> & {
  accountStatus?: string;
};

type ApiJob = Partial<Job> & {
  jobReference?: string;
  jobDate?: string;
};

type ApiDispute = {
  disputeId?: string | null;
  jobReference?: string | null;
  disputeReason?: string | null;
  paymentOnHold?: number | null;
  raisedAt?: string | null;
  driver?: { name?: string | null } | null;
  haulier?: { name?: string | null } | null;
};

const mapUsersResponse = (data: {
  users?: ApiUser[];
  totalUsers?: number;
  items?: ApiUser[];
  total?: number;
}): { items: User[]; total: number } => ({
  items: (data.users ?? data.items ?? []).map((user) => ({
    userId: user.userId ?? '',
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone,
    role: user.role ?? '',
    status: user.status ?? user.accountStatus ?? '',
    isVerified: user.isVerified,
    joinedAt: user.joinedAt,
  })),
  total: data.totalUsers ?? data.total ?? 0,
});

const mapJobsResponse = (data: {
  jobs?: ApiJob[];
  totalJobs?: number;
  items?: ApiJob[];
  total?: number;
}): { items: Job[]; total: number } => ({
  items: (data.jobs ?? data.items ?? []).map((job) => ({
    jobId: job.jobId ?? '',
    jobRef: job.jobRef ?? job.jobReference ?? '',
    status: job.status ?? '',
    createdAt: job.createdAt ?? job.jobDate ?? '',
    pickupLocation: job.pickupLocation,
    dropLocation: job.dropLocation,
    agreedAmount: job.agreedAmount,
    driver: job.driver,
  })),
  total: data.totalJobs ?? data.total ?? 0,
});

const mapRevenueResponse = (data: {
  totalRevenue?: number;
  summary?: {
    totalTransactionValue?: number;
    platformCommission?: number;
    totalRefunds?: number;
    netRevenue?: number;
  };
  allTimeRevenue?: number;
}) => ({
  totalRevenue: data.totalRevenue ?? data.summary?.totalTransactionValue ?? 0,
  platformCommission: data.summary?.platformCommission ?? 0,
  totalRefunds: data.summary?.totalRefunds ?? 0,
  netRevenue: data.summary?.netRevenue ?? 0,
  allTimeRevenue: data.allTimeRevenue ?? 0,
});

const mapDisputesResponse = (data: {
  disputes?: ApiDispute[];
  items?: ApiDispute[];
  totalDisputes?: number;
  total?: number;
}): { items: Dispute[]; total: number } => ({
  items: (data.disputes ?? data.items ?? []).map((dispute) => ({
    disputeId: dispute.disputeId ?? '',
    jobId: '',
    bookingId: '',
    raisedBy: dispute.driver?.name ?? dispute.haulier?.name ?? 'Unknown',
    reason: dispute.disputeReason ?? '',
    description: dispute.disputeReason ?? '',
    status: 'under_review',
    evidencePhotos: [],
    createdAt: dispute.raisedAt ?? new Date().toISOString(),
    jobReference: dispute.jobReference ?? '',
    disputeReason: dispute.disputeReason ?? '',
    reportedBy: dispute.driver?.name ?? dispute.haulier?.name ?? 'Unknown',
    totalAmount: dispute.paymentOnHold ?? 0,
  })),
  total: data.totalDisputes ?? data.total ?? 0,
});

const adminService = {
  // EPIC 1: Auth & Profile
  login: (data: Record<string, unknown>) => client.post('/auth/login', data).then((res) => res.data),
  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }).then((res) => res.data),
  refreshToken: (refreshToken: string) => client.post('/auth/refresh-token', { refreshToken }).then((res) => res.data),
  changePassword: (data: Record<string, unknown>) => client.put('/auth/change-password', data).then((res) => res.data),
  getMe: () => client.get('/profile/me').then((res) => res.data.data),
  updateProfile: (data: Record<string, unknown>) => client.put('/profile/update', data).then((res) => res.data.data),
  getUserProfile: (userId: string) => client.get(`/profile/${userId}`).then((res) => res.data.data),

  // EPIC 2: Supplier Document Verification
  listPendingDocuments: (params?: { page?: number; limit?: number; documentType?: string }) =>
    client.get('/admin/documents/pending', { params }).then((res) => res.data.data),
  approveDocument: (docId: string, remarks?: string) =>
    client.put(`/admin/documents/approve/${docId}`, { remarks }).then((res) => res.data),
  rejectDocument: (docId: string, reason: string) =>
    client.put(`/admin/documents/reject/${docId}`, { rejectionReason: reason }).then((res) => res.data),

  // EPIC 4: Payment & Invoices (Note: EPIC 3 is missing in api.md numbering)
  processRefund: (bookingId: string, data: { refundAmount: number; reason: string; refundTo: string }) =>
    client.post(`/payments/refund/${bookingId}`, data).then((res) => res.data),
  getPaymentHistory: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    client.get('/payments/history', { params }).then((res) => res.data.data),
  getInvoiceDetails: (invoiceId: string) =>
    client.get(`/invoices/${invoiceId}`).then((res) => res.data.data),
  listAllInvoices: (params?: { page?: number; limit?: number }) =>
    client.get('/invoices/list', { params }).then((res) => res.data.data),

  // EPIC 5: Compliance & Disputes
  getComplianceStatus: (jobId: string) =>
    client.get(`/compliance/full-status/${jobId}`).then((res) => res.data.data),
  listDisputes: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get('/dashboard/admin/disputes', { params }).then((res) => mapDisputesResponse(res.data.data)),
  resolveDispute: (disputeId: string, data: Record<string, unknown>) =>
    client.put(`/compliance/dispute/resolve/${disputeId}`, data).then((res) => res.data),

  // EPIC 6: Tracking
  getLiveLocation: (jobId: string) =>
    client.get(`/tracking/live/${jobId}`).then((res) => res.data.data),
  getTrackingHistory: (jobId: string, params?: { page?: number; limit?: number }) =>
    client.get(`/tracking/history/${jobId}`, { params }).then((res) => res.data.data),

  // EPIC 7: Admin Dashboard
  getOverview: () => client.get('/dashboard/admin/overview').then((res) => res.data.data),
  getStats: () => client.get('/admin/stats').then((res) => res.data.data as AdminStats),
  listUsers: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) =>
    client.get('/dashboard/admin/users/list', { params }).then((res) => mapUsersResponse(res.data.data)),
  suspendUser: (userId: string, data: { reason: string; suspensionDuration: string; notifyUser: boolean }) =>
    client.put(`/dashboard/admin/users/suspend/${userId}`, data).then((res) => res.data),
  activateUser: (userId: string, data: { reason: string; notifyUser: boolean }) =>
    client.put(`/dashboard/admin/users/activate/${userId}`, data).then((res) => res.data),
  getPendingVerifications: (params?: { page?: number; limit?: number; role?: string }) =>
    client.get('/dashboard/admin/verifications/pending', { params }).then((res) => res.data.data),
  monitorJobs: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get('/dashboard/admin/jobs/monitor', { params }).then((res) => mapJobsResponse(res.data.data)),
  getRevenueReport: (params?: { period?: string; month?: string; year?: string }) =>
    client.get('/dashboard/admin/revenue', { params }).then((res) => mapRevenueResponse(res.data.data)),
  getDisputesOverview: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get('/dashboard/admin/disputes', { params }).then((res) => mapDisputesResponse(res.data.data)),

  // EPIC 8: Ratings
  getUserRatings: (userId: string, params?: { page?: number; limit?: number }) =>
    client.get(`/ratings/user/${userId}`, { params }).then((res) => res.data.data),
  removeRating: (ratingId: string, data: { reason: string; notifyReporter: boolean; notifyReviewer: boolean }) =>
    client.delete(`/admin/ratings/remove/${ratingId}`, { data }).then((res) => res.data),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number }) =>
    client.get('/notifications/list', { params }).then((res) => res.data.data),
  markAllNotificationsRead: () => client.put('/notifications/mark-all-read').then((res) => res.data),

  // System & Health
  getServerHealth: () => client.get('/health').then((res) => res.data),
  getDbHealth: () => client.get('/health/db').then((res) => res.data),
  getSystemConfig: () => client.get('/system/config').then((res) => res.data.data),
  updateSystemConfig: (data: Partial<SystemConfig>) =>
    client.put('/system/config/update', data).then((res) => res.data),
  getSystemLogs: (params?: { page?: number; limit?: number; level?: string; startDate?: string }) =>
    client.get('/system/logs', { params }).then((res) => res.data.data),

  // File Management
  uploadFile: (formData: FormData) =>
    client.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.data),
  deleteFile: (fileId: string) => client.delete(`/files/delete/${fileId}`).then((res) => res.data),
  getSignedUrl: (fileId: string) => client.get(`/files/get/${fileId}`).then((res) => res.data.data),
};

export default adminService;
