import client from './client';
import type { 
  SystemConfig, AdminStats 
} from '../types';

const adminService = {
  // EPIC 1: Auth & Profile
  login: (data: Record<string, unknown>) => client.post('/auth/login', data).then(res => res.data),
  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }).then(res => res.data),
  refreshToken: (refreshToken: string) => client.post('/auth/refresh-token', { refreshToken }).then(res => res.data),
  changePassword: (data: Record<string, unknown>) => client.put('/auth/change-password', data).then(res => res.data),
  getMe: () => client.get('/profile/me').then(res => res.data),
  updateProfile: (data: Record<string, unknown>) => client.put('/profile/update', data).then(res => res.data),
  getUserProfile: (userId: string) => client.get(`/profile/${userId}`).then(res => res.data),

  // EPIC 2: Supplier Document Verification
  listPendingDocuments: (params?: { page?: number, limit?: number, documentType?: string }) => 
    client.get('/admin/documents/pending', { params }).then(res => res.data.data),
  approveDocument: (docId: string, remarks?: string) => 
    client.put(`/admin/documents/approve/${docId}`, { remarks }).then(res => res.data),
  rejectDocument: (docId: string, reason: string) => 
    client.put(`/admin/documents/reject/${docId}`, { rejectionReason: reason }).then(res => res.data),

  // EPIC 4: Payment & Invoices (Note: EPIC 3 is missing in api.md numbering)
  processRefund: (bookingId: string, data: { refundAmount: number, reason: string, refundTo: string }) => 
    client.post(`/payments/refund/${bookingId}`, data).then(res => res.data),
  getPaymentHistory: (params?: { page?: number, limit?: number, startDate?: string, endDate?: string }) => 
    client.get('/payments/history', { params }).then(res => res.data.data),
  getInvoiceDetails: (invoiceId: string) => 
    client.get(`/invoices/${invoiceId}`).then(res => res.data.data),
  listAllInvoices: (params?: { page?: number, limit?: number }) => 
    client.get('/invoices/list', { params }).then(res => res.data.data),

  // EPIC 5: Compliance & Disputes
  getComplianceStatus: (jobId: string) => 
    client.get(`/compliance/full-status/${jobId}`).then(res => res.data.data),
  listDisputes: (params?: { page?: number, limit?: number, status?: string }) => 
    client.get('/compliance/dispute/list', { params }).then(res => res.data.data),
  resolveDispute: (disputeId: string, data: Record<string, unknown>) => 
    client.put(`/compliance/dispute/resolve/${disputeId}`, data).then(res => res.data),

  // EPIC 6: Tracking
  getLiveLocation: (jobId: string) => 
    client.get(`/tracking/live/${jobId}`).then(res => res.data.data),
  getTrackingHistory: (jobId: string, params?: { page?: number, limit?: number }) => 
    client.get(`/tracking/history/${jobId}`, { params }).then(res => res.data.data),

  // EPIC 7: Admin Dashboard
  getOverview: () => client.get('/dashboard/admin/overview').then(res => res.data.data),
  getStats: () => client.get('/admin/stats').then(res => res.data.data as AdminStats),
  listUsers: (params?: { page?: number, limit?: number, role?: string, status?: string, search?: string }) => 
    client.get('/dashboard/admin/users/list', { params }).then(res => res.data.data),
  suspendUser: (userId: string, data: { reason: string, suspensionDuration: string, notifyUser: boolean }) => 
    client.put(`/dashboard/admin/users/suspend/${userId}`, data).then(res => res.data),
  activateUser: (userId: string, data: { reason: string, notifyUser: boolean }) => 
    client.put(`/dashboard/admin/users/activate/${userId}`, data).then(res => res.data),
  getPendingVerifications: (params?: { page?: number, limit?: number, role?: string }) => 
    client.get('/dashboard/admin/verifications/pending', { params }).then(res => res.data.data),
  monitorJobs: (params?: { page?: number, limit?: number, status?: string }) => 
    client.get('/dashboard/admin/jobs/monitor', { params }).then(res => res.data.data),
  getRevenueReport: (params?: { period?: string, month?: string, year?: string }) => 
    client.get('/dashboard/admin/revenue', { params }).then(res => res.data.data),
  getDisputesOverview: (params?: { page?: number, limit?: number, status?: string }) => 
    client.get('/dashboard/admin/disputes', { params }).then(res => res.data.data),

  // EPIC 8: Ratings
  getUserRatings: (userId: string, params?: { page?: number, limit?: number }) => 
    client.get(`/ratings/user/${userId}`, { params }).then(res => res.data.data),
  removeRating: (ratingId: string, data: { reason: string, notifyReporter: boolean, notifyReviewer: boolean }) => 
    client.delete(`/admin/ratings/remove/${ratingId}`, { data }).then(res => res.data),

  // Notifications
  getNotifications: (params?: { page?: number, limit?: number }) => 
    client.get('/notifications/list', { params }).then(res => res.data.data),
  markAllNotificationsRead: () => client.put('/notifications/mark-all-read').then(res => res.data),

  // System & Health
  getServerHealth: () => client.get('/health').then(res => res.data),
  getDbHealth: () => client.get('/health/db').then(res => res.data),
  getSystemConfig: () => client.get('/system/config').then(res => res.data.data),
  updateSystemConfig: (data: Partial<SystemConfig>) => 
    client.put('/system/config/update', data).then(res => res.data),
  getSystemLogs: (params?: { page?: number, limit?: number, level?: string, startDate?: string }) => 
    client.get('/system/logs', { params }).then(res => res.data.data),

  // File Management
  uploadFile: (formData: FormData) => 
    client.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data.data),
  deleteFile: (fileId: string) => client.delete(`/files/delete/${fileId}`).then(res => res.data),
  getSignedUrl: (fileId: string) => client.get(`/files/get/${fileId}`).then(res => res.data.data),
};
//latest
export default adminService;
