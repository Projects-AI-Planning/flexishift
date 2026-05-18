import client from './client';
import type { AdminStats, Dispute, Job, LiveDelivery, SupportTicket, SystemConfig, User } from '../types';

type SystemConfigUpdatePayload = Partial<SystemConfig> & {
  appEnv?: string;
  jwtExpiryHours?: number;
};

type SupportTicketListResponse = { items: SupportTicket[]; total: number; page: number; limit: number };
type SupportTicketCreatePayload = {
  requesterName: string;
  requesterEmail: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  userId?: string;
};

type ApiUser = Partial<User> & {
  accountStatus?: string;
};

const normalizeQueryValue = (value?: string) => {
  if (!value) return undefined;
  return value.trim() || undefined;
};

const normalizeUppercaseQueryValue = (value?: string) => {
  const normalized = normalizeQueryValue(value);
  return normalized ? normalized.toUpperCase() : undefined;
};

type ApiJob = Partial<Job> & {
  jobReference?: string;
  loadCode?: string;
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
    status: (user.status ?? user.accountStatus ?? '').toUpperCase(),
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
    loadCode: job.loadCode,
    status: job.status ?? '',
    createdAt: job.createdAt ?? '',
    jobDate: job.jobDate,
    pickupLocation: job.pickupLocation,
    dropLocation: job.dropLocation,
    goodsType: job.goodsType,
    vehicleType: job.vehicleType,
    weightKg: job.weightKg,
    agreedAmount: job.agreedAmount,
    paymentStatus: job.paymentStatus,
    isDelayed: job.isDelayed,
    hasDispute: job.hasDispute,
    haulier: job.haulier,
    driver: job.driver,
    complianceStatus: job.complianceStatus,
  })),
  total: data.totalJobs ?? data.total ?? 0,
});

const mapRevenueResponse = (data: {
  totalRevenue?: number;
  period?: string;
  summary?: {
    totalTransactionValue?: number;
    platformCommission?: number;
    commissionRate?: string;
    totalRefunds?: number;
    netRevenue?: number;
    currency?: string;
  };
  allTimeRevenue?: number;
  allTimeTransactions?: number;
}) => ({
  totalRevenue: data.totalRevenue ?? data.summary?.totalTransactionValue ?? 0,
  platformCommission: data.summary?.platformCommission ?? 0,
  commissionRate: data.summary?.commissionRate ?? '5%',
  totalRefunds: data.summary?.totalRefunds ?? 0,
  netRevenue: data.summary?.netRevenue ?? 0,
  allTimeRevenue: data.allTimeRevenue ?? 0,
  allTimeTransactions: data.allTimeTransactions ?? 0,
  period: data.period ?? '',
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

type ApiRichDispute = {
  disputeId?: string | null;
  jobId?: string | null;
  jobReference?: string | null;
  disputeReason?: string | null;
  paymentOnHold?: number | null;
  raisedAt?: string | null;
  resolvedAt?: string | null;
  hoursOpen?: number | null;
  status?: string | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  driver?: { name?: string | null; phone?: string | null } | null;
  haulier?: { name?: string | null; phone?: string | null } | null;
};

const mapRichDisputesResponse = (
  data: { disputes?: ApiRichDispute[]; total?: number },
  defaultStatus: Dispute['status'],
): { items: Dispute[]; total: number } => ({
  items: (data.disputes ?? []).map((d) => ({
    disputeId: d.disputeId ?? '',
    jobId: d.jobId ?? '',
    bookingId: '',
    raisedBy: d.driver?.name ?? d.haulier?.name ?? 'Unknown',
    reason: d.disputeReason ?? '',
    description: d.disputeReason ?? '',
    status: (d.status as Dispute['status']) ?? defaultStatus,
    evidencePhotos: [],
    createdAt: d.raisedAt ?? new Date().toISOString(),
    jobReference: d.jobReference ?? '',
    disputeReason: d.disputeReason ?? '',
    reportedBy: d.driver?.name ?? d.haulier?.name ?? 'Unknown',
    totalAmount: d.paymentOnHold ?? 0,
    resolvedAt: d.resolvedAt ?? undefined,
    hoursOpen: d.hoursOpen ?? undefined,
    pickupLocation: d.pickupLocation ?? undefined,
    dropLocation: d.dropLocation ?? undefined,
    haulier: d.haulier ? { name: d.haulier.name ?? null, phone: d.haulier.phone ?? null } : undefined,
    driver: d.driver ? { name: d.driver.name ?? null, phone: d.driver.phone ?? null } : undefined,
  })),
  total: data.total ?? 0,
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

  getJobQuotes: (jobId: string) =>
    client.get(`/jobs/${jobId}/quotes`).then((res) => res.data.data),

  // EPIC 4: Payment & Invoices (Note: EPIC 3 is missing in api.md numbering)
  listAdminPayments: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    client.get('/dashboard/admin/payments/list', { params }).then((res) => res.data.data),
  releaseEscrow: (jobId: string) =>
    client.post(`/payments/release/${jobId}`).then((res) => res.data),
  processRefund: (bookingId: string, data: { refundAmount: number; reason: string; refundTo: string }) =>
    client.post(`/payments/refund/${bookingId}`, data).then((res) => res.data),
  getPaymentHistory: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    client.get('/payments/history', { params }).then((res) => res.data.data),
  listAdminInvoices: (params?: { page?: number; limit?: number; search?: string; paymentStatus?: string }) =>
    client.get('/dashboard/admin/invoices/list', { params }).then((res) => res.data.data),
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
  getAdminLiveTracking: () =>
    client.get('/dashboard/admin/live-tracking').then((res) => res.data.data as { totalActive: number; deliveries: LiveDelivery[] }),

  // EPIC 7: Admin Dashboard
  getOverview: () => client.get('/dashboard/admin/overview').then((res) => res.data.data),
  getStats: () => client.get('/admin/stats').then((res) => res.data.data as AdminStats),
  listUsers: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) =>
    client.get('/dashboard/admin/users/list', {
      params: {
        ...params,
        role: normalizeUppercaseQueryValue(params?.role),
        status: normalizeUppercaseQueryValue(params?.status),
        search: normalizeQueryValue(params?.search),
      },
    }).then((res) => mapUsersResponse(res.data.data)),
  createUser: (data: { fullName: string; email: string; phone: string; password: string; role: string; status: string }) =>
    client.post('/admin/users', data).then((res) => res.data),
  suspendUser: (userId: string, data: { reason: string; suspensionDuration: string; notifyUser: boolean }) =>
    client.put(`/dashboard/admin/users/suspend/${userId}`, data).then((res) => res.data),
  activateUser: (userId: string, data: { reason: string; notifyUser: boolean }) =>
    client.put(`/dashboard/admin/users/activate/${userId}`, data).then((res) => res.data),
  getPendingVerifications: (params?: { page?: number; limit?: number; role?: string }) =>
    client.get('/dashboard/admin/verifications/pending', {
      params: {
        ...params,
        role: normalizeUppercaseQueryValue(params?.role),
      },
    }).then((res) => res.data.data),
  getProcessedVerifications: (params?: { page?: number; limit?: number; role?: string; status?: string }) =>
    client.get('/dashboard/admin/verifications/processed', {
      params: {
        ...params,
        role: normalizeUppercaseQueryValue(params?.role),
        status: normalizeUppercaseQueryValue(params?.status),
      },
    }).then((res) => res.data.data),
  monitorJobs: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    client.get('/dashboard/admin/jobs/monitor', { params }).then((res) => mapJobsResponse(res.data.data)),
  getRevenueReport: (params?: { period?: string; month?: string; year?: string }) =>
    client.get('/dashboard/admin/revenue', { params }).then((res) => mapRevenueResponse(res.data.data)),
  getDisputesOverview: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get('/dashboard/admin/disputes', { params }).then((res) => mapDisputesResponse(res.data.data)),
  listActiveDisputes: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get('/dashboard/admin/disputes/active', { params }).then((res) => mapRichDisputesResponse(res.data.data, 'under_review')),
  listResolvedDisputes: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get('/dashboard/admin/disputes/resolved', { params }).then((res) => mapRichDisputesResponse(res.data.data, 'resolved')),
  listEscalatedDisputes: (params?: { page?: number; limit?: number }) =>
    client.get('/dashboard/admin/disputes/escalated', { params }).then((res) => mapRichDisputesResponse(res.data.data, 'escalated')),

  // EPIC 8: Ratings
  getUserRatings: (userId: string, params?: { page?: number; limit?: number }) =>
    client.get(`/ratings/user/${userId}`, { params }).then((res) => res.data.data),
  removeRating: (ratingId: string, data: { reason: string; notifyReporter: boolean; notifyReviewer: boolean }) =>
    client.delete(`/admin/ratings/remove/${ratingId}`, { data }).then((res) => res.data),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number; type?: string }) =>
    client.get('/notifications/list', { params }).then((res) => res.data.data),
  getUnreadNotificationCount: () =>
    client.get('/notifications/unread-count').then((res) => res.data.data as { unreadCount: number; breakdown?: Record<string, number> }),
  markNotificationRead: (notificationId: string) =>
    client.put(`/notifications/mark-read/${notificationId}`).then((res) => res.data),
  markAllNotificationsRead: () => client.put('/notifications/mark-all-read').then((res) => res.data),
  deleteNotification: (notificationId: string) =>
    client.delete(`/notifications/delete/${notificationId}`).then((res) => res.data),

  // EPIC: Support Tickets
  getActiveSupportTickets: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get('/admin/support/active', { params }).then((res) => res.data.data as SupportTicketListResponse),
  getResolvedSupportTickets: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get('/admin/support/resolved', { params }).then((res) => res.data.data as SupportTicketListResponse),
  getSupportTicketStats: () =>
    client.get('/admin/support/stats').then((res) => res.data.data as {
      totalTickets: number;
      openTickets: number;
      inProgressTickets: number;
      resolvedTickets: number;
      closedTickets: number;
    }),
  getSupportTicket: (ticketId: string) =>
    client.get(`/admin/support/${ticketId}`).then((res) => res.data.data as SupportTicket),
  createSupportTicket: (data: SupportTicketCreatePayload) =>
    client.post('/admin/support', data).then((res) => res.data.data as SupportTicket),
  updateSupportTicketStatus: (ticketId: string, data: { status: string; resolutionNotes?: string }) =>
    client.put(`/admin/support/${ticketId}/status`, data).then((res) => res.data.data as SupportTicket),

  // System & Health
  getServerHealth: () => client.get('/health').then((res) => res.data),
  getDbHealth: () => client.get('/health/db').then((res) => res.data),
  getSystemConfig: () => client.get('/system/config').then((res) => res.data.data),
  updateSystemConfig: (data: SystemConfigUpdatePayload) =>
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
