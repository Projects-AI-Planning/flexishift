import client from './client';
import type { Payment } from '../types';

const mapPaymentHistory = (data: {
  items?: Array<Partial<Payment> & { jobId?: string }>;
  total?: number;
  page?: number;
  perPage?: number;
}): { items: Payment[]; total: number; page: number; perPage: number } => ({
  items: (data.items ?? []).map((payment) => ({
    paymentId: payment.paymentId ?? '',
    bookingId: payment.bookingId ?? payment.jobId ?? '',
    amount: payment.amount ?? 0,
    currency: payment.currency ?? 'INR',
    status: payment.status ?? '',
    paymentMethod: payment.paymentMethod ?? '',
    transactionId: payment.transactionId,
    createdAt: payment.createdAt ?? '',
  })),
  total: data.total ?? 0,
  page: data.page ?? 1,
  perPage: data.perPage ?? 20,
});

const mapPaymentMethods = (data: { methods?: Array<Record<string, unknown>> }) =>
  (data.methods ?? []).map((method) => ({
    id: String(method.methodId ?? method.id ?? ''),
    last4: String(method.accountNumber ?? method.last4 ?? '0000').slice(-4),
    brand: String(method.type ?? method.brand ?? 'BANK'),
    isDefault: true,
  }));

const mapSpendSummary = (data: {
  summary?: {
    totalSpent?: number;
  };
  totalSpent?: number;
  escrowAmount?: number;
  pendingInvoicesCount?: number;
}) => ({
  totalSpent: data.totalSpent ?? data.summary?.totalSpent ?? 0,
  escrowAmount: data.escrowAmount ?? 0,
  pendingInvoicesCount: data.pendingInvoicesCount ?? 0,
});

const haulierService = {
  // EPIC 1: Auth & Profile
  register: (data: Record<string, unknown>) => client.post('/auth/register', data).then(res => res.data),
  verifyEmail: (data: { email: string, otp: string }) => client.post('/auth/verify-email', data).then(res => res.data),
  resendOTP: (email: string) => client.post('/auth/resend-verification', { email }).then(res => res.data),
  login: (data: Record<string, unknown>) => client.post('/auth/login', data).then(res => res.data),
  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }).then(res => res.data),
  refreshToken: (refreshToken: string) => client.post('/auth/refresh-token', { refreshToken }).then(res => res.data),
  forgotPassword: (email: string) => client.post('/auth/forgot-password', { email }).then(res => res.data),
  resetPassword: (data: Record<string, unknown>) => client.post('/auth/reset-password', data).then(res => res.data),
  changePassword: (data: Record<string, unknown>) => client.put('/auth/change-password', data).then(res => res.data),
  setupProfile: (data: FormData) => client.post('/profile/setup', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  updateProfile: (data: Record<string, unknown>) => client.put('/profile/update', data).then(res => res.data),
  getMe: () => client.get('/profile/me').then(res => res.data.data),
  uploadLogo: (formData: FormData) => client.post('/profile/photo/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  deactivateAccount: (data: Record<string, unknown>) => client.put('/profile/deactivate', data).then(res => res.data),

  // EPIC 2: Supplier Availability View
  getSupplierAvailability: (supplierId: string) => client.get(`/supplier/availability/${supplierId}`).then(res => res.data.data),

  // EPIC 3: Job Posting & Matching
  createJob: (data: Record<string, unknown>) => client.post('/jobs/create', data).then(res => res.data.data),
  getJobDetails: (jobId: string) => client.get(`/jobs/${jobId}`).then(res => res.data.data),
  listAllJobs: (params?: Record<string, unknown>) => client.get('/jobs/list', { params }).then(res => res.data.data),
  getMyJobs: (params?: Record<string, unknown>) => client.get('/jobs/my-jobs', { params }).then(res => res.data.data),
  updateJob: (jobId: string, data: Record<string, unknown>) => client.put(`/jobs/update/${jobId}`, data).then(res => res.data),
  cancelJob: (jobId: string, data: { reason: string }) => client.put(`/jobs/cancel/${jobId}`, data).then(res => res.data),
  closeJob: (jobId: string, data: { reason: string }) => client.put(`/jobs/close/${jobId}`, data).then(res => res.data),
  validateAddress: (address: string) => client.post('/maps/validate-address', { address }).then(res => res.data.data),
  calculateRoute: (data: Record<string, unknown>) => client.post('/maps/calculate-route', data).then(res => res.data.data),
  addressAutocomplete: (query: string) => client.get(`/maps/autocomplete`, { params: { query } }).then(res => res.data.data),
  matchSuppliers: (jobId: string) => client.get(`/jobs/match-suppliers/${jobId}`).then(res => res.data.data),
  listQuotesForJob: (jobId: string, params?: Record<string, unknown>) => client.get(`/quotes/list/${jobId}`, { params }).then(res => res.data.data),
  getSingleQuote: (quoteId: string) => client.get(`/quotes/${quoteId}`).then(res => res.data.data),

  // EPIC 4: Booking & Payment
  createBooking: (data: { jobId: string, quoteId: string, supplierId: string }) => client.post('/bookings/create', data).then(res => res.data.data),
  getBookingDetails: (bookingId: string) => client.get(`/bookings/${bookingId}`).then(res => res.data.data),
  listAllBookings: (params?: Record<string, unknown>) => client.get('/bookings/list', { params }).then(res => res.data.data),
  cancelBooking: (bookingId: string, data: { reason: string }) => client.put(`/bookings/cancel/${bookingId}`, data).then(res => res.data),
  initiatePayment: (data: Record<string, unknown>) => client.post('/payments/initiate', data).then(res => res.data.data),
  checkPaymentStatus: (paymentId: string) => client.get(`/payments/status/${paymentId}`).then(res => res.data.data),
  releasePayment: (bookingId: string, data: { approvalNote: string }) => client.post(`/payments/release/${bookingId}`, data).then(res => res.data),
  getPaymentHistory: (params?: Record<string, unknown>) => client.get('/payments/history', { params }).then(res => mapPaymentHistory(res.data.data)),
  addPaymentMethod: (data: Record<string, unknown>) => client.post('/payments/methods/add', data).then(res => res.data),
  listPaymentMethods: () => client.get('/payments/methods/list').then(res => mapPaymentMethods(res.data.data)),
  deletePaymentMethod: (methodId: string) => client.delete(`/payments/methods/delete/${methodId}`).then(res => res.data),
  getInvoiceDetails: (invoiceId: string) => client.get(`/invoices/${invoiceId}`).then(res => res.data.data),
  listInvoices: (params?: Record<string, unknown>) => client.get('/invoices/list', { params }).then(res => res.data.data),
  downloadInvoicePDF: (invoiceId: string) => client.get(`/invoices/download/${invoiceId}`, { responseType: 'blob' }).then(res => res.data),

  // EPIC 5: Compliance Workflow
  getLoadCodeStatus: (jobId: string) => client.get(`/compliance/load-code/status/${jobId}`).then(res => res.data.data),
  resendLoadCode: (data: { jobId: string, bookingId: string }) => client.post('/compliance/load-code/resend', data).then(res => res.data),
  viewHandoverPhotos: (jobId: string) => client.get(`/compliance/handover/photos/list/${jobId}`).then(res => res.data.data),
  submitDigitalSignature: (data: Record<string, unknown>) => client.post('/compliance/handover/sign/haulier', data).then(res => res.data),
  getHandoverStatus: (jobId: string) => client.get(`/compliance/handover/status/${jobId}`).then(res => res.data.data),
  approveDelivery: (jobId: string, data: { bookingId: string, approvalNote: string }) => client.post(`/compliance/delivery/approve/${jobId}`, data).then(res => res.data),
  disputeDelivery: (jobId: string, data: Record<string, unknown>) => client.post(`/compliance/delivery/dispute/${jobId}`, data).then(res => res.data),
  getDeliveryStatus: (jobId: string) => client.get(`/compliance/delivery/status/${jobId}`).then(res => res.data.data),
  getFullComplianceStatus: (jobId: string) => client.get(`/compliance/full-status/${jobId}`).then(res => res.data.data),

  // EPIC 6: Live Tracking & ETA
  getLiveDriverLocation: (jobId: string) => client.get(`/tracking/live/${jobId}`).then(res => res.data.data),
  getTrackingHistory: (jobId: string, params?: Record<string, unknown>) => client.get(`/tracking/history/${jobId}`, { params }).then(res => res.data.data),
  getETA: (jobId: string) => client.get(`/tracking/eta/${jobId}`).then(res => res.data.data),

  // EPIC 7: Haulier Dashboard
  getOverview: () => client.get('/dashboard/haulier/overview').then(res => res.data.data),
  getActiveJobs: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/jobs/active', { params }).then(res => res.data.data),
  getPendingApprovalJobs: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/jobs/pending-approval', { params }).then(res => res.data.data),
  getSpendSummary: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/spend-summary', { params }).then(res => mapSpendSummary(res.data.data)),
  getActiveMapData: () => client.get('/dashboard/haulier/active-map').then(res => res.data.data),

  // EPIC 8: Ratings
  submitRating: (data: Record<string, unknown>) => client.post('/ratings/submit', data).then(res => res.data),
  viewDriverRatings: (userId: string, params?: Record<string, unknown>) => client.get(`/ratings/user/${userId}`, { params }).then(res => res.data.data),
  getJobRatings: (jobId: string) => client.get(`/ratings/job/${jobId}`).then(res => res.data.data),
  getDriverRatingSummary: (userId: string) => client.get(`/ratings/summary/${userId}`).then(res => res.data.data),
  reportAbusiveReview: (ratingId: string, data: Record<string, unknown>) => client.post(`/ratings/report/${ratingId}`, data).then(res => res.data),

  // Notifications
  getNotifications: (params?: Record<string, unknown>) => client.get('/notifications/list', { params }).then(res => res.data.data),
  getUnreadCount: () => client.get('/notifications/unread-count').then(res => res.data.data),
  markNotificationRead: (notificationId: string) => client.put(`/notifications/mark-read/${notificationId}`).then(res => res.data),
  markAllNotificationsRead: () => client.put('/notifications/mark-all-read').then(res => res.data),
  deleteNotification: (notificationId: string) => client.delete(`/notifications/delete/${notificationId}`).then(res => res.data),
  getNotificationPreferences: () => client.get('/notifications/preferences').then(res => res.data.data),
  updateNotificationPreferences: (data: Record<string, unknown>) => client.put('/notifications/preferences/update', data).then(res => res.data),

  // File Management
  uploadFile: (formData: FormData) => client.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data.data),
  deleteFile: (fileId: string) => client.delete(`/files/delete/${fileId}`).then(res => res.data),
  getSignedFileUrl: (fileId: string) => client.get(`/files/get/${fileId}`).then(res => res.data.data),
};

export default haulierService;
