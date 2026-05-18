import client from './client';

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
  getProfilePhotoUploadUrl: (contentType?: string) => client.post('/profile/photo/upload', null, { params: contentType ? { contentType } : undefined }).then(res => res.data.data),
  submitProfilePhotoUpload: (key: string) => client.post('/profile/photo/submit-upload', { key }).then(res => res.data.data),
  uploadProfilePhoto: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/profile/photo/upload-direct', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data.data);
  },
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
  addressAutocomplete: (query: string) => client.get(`/maps/autocomplete`, { params: { input: query } }).then(res => res.data.data),
  matchSuppliers: (jobId: string) => client.get(`/jobs/match-suppliers/${jobId}`).then(res => res.data.data),
  listQuotesForJob: (jobId: string, params?: Record<string, unknown>) => client.get(`/quotes/list/${jobId}`, { params }).then(res => res.data.data),
  getSingleQuote: (quoteId: string) => client.get(`/quotes/${quoteId}`).then(res => res.data.data),
  acceptQuote: (jobId: string, quoteId: string) => client.patch(`/jobs/${jobId}/quotes/${quoteId}/select`).then(res => res.data.data),
  rejectQuote: (jobId: string, quoteId: string) => client.patch(`/jobs/${jobId}/quotes/${quoteId}/reject`).then(res => res.data.data),

  // EPIC 4: Booking & Payment
  createBooking: (data: { jobId: string, quoteId: string, supplierId: string }) => client.post('/bookings/create', data).then(res => res.data.data),
  getBookingDetails: (bookingId: string) => client.get(`/bookings/${bookingId}`).then(res => res.data.data),
  listAllBookings: (params?: Record<string, unknown>) => client.get('/bookings/list', { params }).then(res => res.data.data),
  cancelBooking: (bookingId: string, data: { reason: string }) => client.put(`/bookings/cancel/${bookingId}`, data).then(res => res.data),
  initiatePayment: (data: Record<string, unknown>) => client.post('/payments/initiate', data).then(res => res.data.data),
  verifyPayment: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    client.post('/payments/verify', data).then(res => res.data.data),
  checkPaymentStatus: (paymentId: string) => client.get(`/payments/status/${paymentId}`).then(res => res.data.data),
  releasePayment: (bookingId: string, data: { approvalNote: string }) => client.post(`/payments/release/${bookingId}`, data).then(res => res.data),
  getPaymentHistory: (params?: Record<string, unknown>) => client.get('/payments/history', { params }).then(res => res.data.data),
  addPaymentMethod: (data: Record<string, unknown>) => client.post('/payments/methods/add', data).then(res => res.data),
  listPaymentMethods: () => client.get('/payments/methods/list').then(res => res.data.data),
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
  listMyDocuments: () => client.get('/users/me/documents').then(res => res.data.data),
  getDocumentUploadUrl: (docType: string) => client.get('/users/me/documents/upload-url', { params: { doc_type: docType } }).then(res => res.data.data),
  submitDocument: (params: { docType: string; fileUrl: string }) => client.post('/users/me/documents', null, { params: { doc_type: params.docType, file_url: params.fileUrl } }).then(res => res.data.data),
  submitUploadedDocument: (params: { docType: string; key: string }) => client.post('/users/me/documents/submit-upload', null, { params: { doc_type: params.docType, key: params.key } }).then(res => res.data.data),

  // EPIC 6: Live Tracking & ETA
  getLiveDriverLocation: (jobId: string) => client.get(`/tracking/live/${jobId}`).then(res => res.data.data),
  getTrackingHistory: (jobId: string, params?: Record<string, unknown>) => client.get(`/tracking/history/${jobId}`, { params }).then(res => res.data.data),
  getETA: (jobId: string) => client.get(`/tracking/eta/${jobId}`).then(res => res.data.data),

  // EPIC 7: Haulier Dashboard
  getOverview: () => client.get('/dashboard/haulier/overview').then(res => res.data.data),
  getActiveJobs: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/jobs/active', { params }).then(res => res.data.data),
  getPendingApprovalJobs: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/jobs/pending-approval', { params }).then(res => res.data.data),
  getSpendSummary: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/spend-summary', { params }).then(res => mapSpendSummary(res.data.data)),
  getRevenueAnalytics: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/revenue', { params }).then(res => res.data.data),
  getPerformanceAnalytics: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/performance', { params }).then(res => res.data.data),
  getCostReport: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/costs', { params }).then(res => res.data.data),
  getLoadMatching: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/loads/matching', { params }).then(res => res.data.data),
  getLoadBids: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/loads/bids', { params }).then(res => res.data.data),
  getLoadAwarded: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/loads/awarded', { params }).then(res => res.data.data),
  listHaulierDrivers: (params?: Record<string, unknown>) => client.get('/dashboard/haulier/drivers/all', { params }).then(res => res.data.data),
  listDriverAssignments: () => client.get('/dashboard/haulier/drivers/assignments').then(res => res.data.data),
  assignDriver: (data: { driverId: string; note?: string }) => client.post('/dashboard/haulier/drivers/assignments', data).then(res => res.data.data),
  unassignDriver: (driverId: string) => client.delete(`/dashboard/haulier/drivers/assignments/${driverId}`).then(res => res.data),
  getActiveMapData: () => client.get('/dashboard/haulier/active-map').then(res => res.data.data),
  listFleetEquipment: () => client.get('/fleet/equipment').then(res => res.data.data),
  addFleetEquipment: (data: Record<string, unknown>) => client.post('/fleet/equipment', data).then(res => res.data.data),
  updateFleetEquipment: (equipmentId: string, data: Record<string, unknown>) => client.put(`/fleet/equipment/${equipmentId}`, data).then(res => res.data.data),
  deleteFleetEquipment: (equipmentId: string) => client.delete(`/fleet/equipment/${equipmentId}`).then(res => res.data),

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

  // Support
  getHaulierHelpCenter: () => client.get('/support/haulier/help-center').then(res => res.data.data),
  listHaulierSupportTickets: (params?: Record<string, unknown>) => client.get('/support/haulier/tickets', { params }).then(res => res.data.data),
  createHaulierSupportTicket: (data: Record<string, unknown>) => client.post('/support/haulier/tickets', data).then(res => res.data.data),

  // Shifts
  createShift: (data: Record<string, unknown>) => client.post('/shifts/create', data).then(res => res.data.data),
  listMyShifts: () => client.get('/shifts/list').then(res => res.data.data),
  getShiftDetails: (shiftId: string) => client.get(`/shifts/${shiftId}`).then(res => res.data.data),
  cancelShift: (shiftId: string) => client.put(`/shifts/cancel/${shiftId}`).then(res => res.data),
  listShiftQuotes: (shiftId: string) => client.get(`/shifts/${shiftId}/quotes`).then(res => res.data.data),
  acceptShiftQuote: (shiftId: string, quoteId: string) => client.post(`/shifts/${shiftId}/quotes/${quoteId}/accept`).then(res => res.data.data),
  completeShiftDay: (shiftId: string) => client.post(`/shifts/${shiftId}/days/complete`).then(res => res.data.data),

  // File Management
  uploadFile: (formData: FormData) => client.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data.data),
  deleteFile: (fileId: string) => client.delete(`/files/delete/${fileId}`).then(res => res.data),
  getSignedFileUrl: (fileId: string) => client.get(`/files/get/${fileId}`).then(res => res.data.data),
};

export default haulierService;
