import {getNotificationsWebSocketUrl, request} from './client';

const jsonBody = (payload: unknown) => JSON.stringify(payload);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const driverApi = {
  auth: {
    changePassword: (payload: Record<string, unknown>) =>
      request<null>('/auth/change-password', {
        method: 'PUT',
        body: jsonBody(payload),
      }),
    forgotPassword: (email: string) =>
      request<{email: string; resetLinkExpiresAt?: string}>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: jsonBody({email: normalizeEmail(email)}),
        },
      ),
    login: (payload: {email: string; password: string}) =>
      request<{
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
      }>('/auth/login', {method: 'POST', body: jsonBody(payload)}),
    logout: (refreshToken: string) =>
      request<null>('/auth/logout', {
        method: 'POST',
        skipAuthRefresh: true,
        body: jsonBody({refreshToken}),
      }),
    refreshToken: (refreshToken: string) =>
      request<{accessToken: string; refreshToken?: string; expiresIn?: number}>(
        '/auth/refresh-token',
        {
          method: 'POST',
          skipAuthRefresh: true,
          body: jsonBody({refreshToken}),
        },
      ),
    register: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/auth/register', {
        method: 'POST',
        body: jsonBody({
          ...payload,
          email: typeof payload.email === 'string' ? normalizeEmail(payload.email) : payload.email,
          role: 'DRIVER',
        }),
      }),
    resendVerification: (email: string) =>
      request<{email: string; otpExpiresAt?: string}>(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: jsonBody({email: normalizeEmail(email)}),
        },
      ),
    resetPassword: (payload: Record<string, unknown>) =>
      request<null>('/auth/reset-password', {
        method: 'POST',
        body: jsonBody({
          ...payload,
          email: typeof payload.email === 'string' ? normalizeEmail(payload.email) : payload.email,
        }),
      }),
    verifyEmail: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/auth/verify-email', {
        method: 'POST',
        body: jsonBody({
          ...payload,
          email: typeof payload.email === 'string' ? normalizeEmail(payload.email) : payload.email,
        }),
      }),
  },
  availability: {
    getMine: () =>
      request<Record<string, unknown>>('/supplier/availability/me'),
    set: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/supplier/availability/set', {
        method: 'POST',
        body: jsonBody(payload),
      }),
    toggle: (slotId: string) =>
      request<Record<string, unknown>>(`/supplier/availability/toggle/${slotId}`, {
        method: 'PUT',
      }),
    update: (slotId: string, payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/supplier/availability/update/${slotId}`, {
        method: 'PUT',
        body: jsonBody(payload),
      }),
  },
  bookings: {
    accept: (bookingId: string) =>
      request<Record<string, unknown>>(`/bookings/${bookingId}/accept`, {
        method: 'POST',
      }),
    getDetails: (bookingId: string) =>
      request<Record<string, unknown>>(`/bookings/${bookingId}`),
    list: (params?: Record<string, string | number | boolean | undefined>) =>
      request<Record<string, unknown>>('/bookings/list', {params}),
    listMine: (params?: Record<string, string | number | boolean | undefined>) =>
      request<Record<string, unknown>>('/bookings/list', {params}),
  },
  incidents: {
    report: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/tracking/incident', {
        method: 'POST',
        body: jsonBody(payload),
      }),
  },
  compliance: {
    getDeliveryStatus: (jobId: string) =>
      request<Record<string, unknown>>(`/compliance/delivery/status/${jobId}`),
    getFullStatus: (jobId: string) =>
      request<Record<string, unknown>>(`/compliance/full-status/${jobId}`),
    getHandoverStatus: (jobId: string) =>
      request<Record<string, unknown>>(`/compliance/handover/status/${jobId}`),
    getLoadCodeStatus: (jobId: string) =>
      request<Record<string, unknown>>(`/compliance/load-code/status/${jobId}`),
    signDriverHandover: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/compliance/handover/sign/driver', {
        method: 'POST',
        body: jsonBody(payload),
      }),
    submitDeliveryPhotos: (formData: FormData, jobId?: string) =>
      request<Record<string, unknown>>(
        `/compliance/delivery/photos/upload-direct${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`,
        {method: 'POST', body: formData, isFormData: true},
      ),
    submitDeliveryProof: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/compliance/delivery/submit', {
        method: 'POST',
        body: jsonBody(payload),
      }),
    submitHandoverPhotos: (formData: FormData, jobId?: string) =>
      request<Record<string, unknown>>(
        `/compliance/handover/photos/upload-direct${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`,
        {method: 'POST', body: formData, isFormData: true},
      ),
    submitVehicleChecklist: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(
        '/compliance/handover/checklist/submit',
        {
          method: 'POST',
          body: jsonBody(payload),
        },
      ),
    verifyLoadCode: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/compliance/load-code/verify', {
        method: 'POST',
        body: jsonBody(payload),
      }),
  },
  dashboard: {
    getEarnings: (
      params?: Record<string, string | number | boolean | undefined>,
    ) =>
      request<Record<string, unknown>>('/dashboard/driver/earnings', {params}),
    getJobHistory: (
      params?: Record<string, string | number | boolean | undefined>,
    ) =>
      request<Record<string, unknown>>('/dashboard/driver/jobs/history', {
        params,
      }),
    getOverview: () =>
      request<Record<string, unknown>>('/dashboard/driver/overview'),
    getUpcomingJobs: (
      params?: Record<string, string | number | boolean | undefined>,
    ) =>
      request<Record<string, unknown>>('/dashboard/driver/jobs/upcoming', {
        params,
      }),
  },
  documents: {
    delete: (documentId: string) =>
      request<Record<string, unknown>>(
        `/supplier/documents/delete/${documentId}`,
        {method: 'DELETE'},
      ),
    getOne: (documentId: string) =>
      request<Record<string, unknown>>(`/supplier/documents/${documentId}`),
    getStatus: () =>
      request<Record<string, unknown>>('/supplier/documents/status'),
    list: () => request<Record<string, unknown>>('/supplier/documents/list'),
    upload: (formData: FormData) =>
      request<Record<string, unknown>>('/supplier/documents/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
  },
  files: {
    getSignedUrl: (fileId: string) =>
      request<Record<string, unknown>>(`/files/get/${fileId}`),
    uploadMultiple: (formData: FormData) =>
      request<Record<string, unknown>>('/files/upload-multiple', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
    uploadSingle: (formData: FormData) =>
      request<Record<string, unknown>>('/files/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
  },
  invoices: {
    download: (invoiceId: string) =>
      request<Record<string, unknown>>(`/invoices/download/${invoiceId}`),
    getDetails: (invoiceId: string) =>
      request<Record<string, unknown>>(`/invoices/${invoiceId}`),
    list: (params?: Record<string, string | number | boolean | undefined>) =>
      request<Record<string, unknown>>('/invoices/list', {params}),
  },
  jobs: {
    getDetails: (jobId: string) =>
      request<Record<string, unknown>>(`/jobs/${jobId}`),
    listAvailable: (
      params?: Record<string, string | number | boolean | undefined>,
    ) => request<Record<string, unknown>>('/jobs/list', {params}),
  },
  notifications: {
    getPreferences: () =>
      request<Record<string, unknown>>('/notifications/preferences'),
    getUnreadCount: () =>
      request<Record<string, unknown>>('/notifications/unread-count'),
    list: (params?: Record<string, string | number | boolean | undefined>) =>
      request<Record<string, unknown>>('/notifications/list', {params}),
    markAllRead: () =>
      request<Record<string, unknown>>('/notifications/mark-all-read', {
        method: 'PUT',
      }),
    markRead: (notificationId: string) =>
      request<Record<string, unknown>>(
        `/notifications/mark-read/${notificationId}`,
        {method: 'PUT'},
      ),
    registerFcmToken: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/notifications/fcm-token/register', {
        method: 'POST',
        body: jsonBody(payload),
      }),
    updatePreferences: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/notifications/preferences/update', {
        method: 'PUT',
        body: jsonBody(payload),
      }),
    websocketUrl: (token: string) => getNotificationsWebSocketUrl(token),
  },
  payments: {
    getHistory: (
      params?: Record<string, string | number | boolean | undefined>,
    ) => request<Record<string, unknown>>('/payments/history', {params}),
    getStatus: (paymentId: string) =>
      request<Record<string, unknown>>(`/payments/status/${paymentId}`),
    getEscrowDetails: (jobId: string) =>
      request<Record<string, unknown>>(`/jobs/${jobId}/payment/details`),
  },
  profile: {
    getMe: () => request<Record<string, unknown>>('/profile/me'),
    setup: (formData: FormData) =>
      request<Record<string, unknown>>('/profile/setup', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
    update: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/profile/update', {
        method: 'PUT',
        body: jsonBody(payload),
      }),
    uploadPhoto: (formData: FormData) =>
      request<Record<string, unknown>>('/profile/photo/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
    uploadPhotoDirect: (formData: FormData) =>
      request<Record<string, unknown>>('/profile/photo/upload-direct', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
  },
  quotes: {
    edit: (quoteId: string, payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/quotes/edit/${quoteId}`, {
        method: 'PUT',
        body: jsonBody(payload),
      }),
    listMine: (
      params?: Record<string, string | number | boolean | undefined>,
    ) => request<Record<string, unknown>>('/quotes/my-quotes', {params}),
    submit: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/quotes/submit', {
        method: 'POST',
        body: jsonBody(payload),
      }),
    withdraw: (quoteId: string) =>
      request<Record<string, unknown>>(`/quotes/withdraw/${quoteId}`, {
        method: 'DELETE',
      }),
  },
  ratings: {
    getSummary: (userId: string) =>
      request<Record<string, unknown>>(`/ratings/summary/${userId}`),
    getUserRatings: (
      userId: string,
      params?: Record<string, string | number | boolean | undefined>,
    ) => request<Record<string, unknown>>(`/ratings/user/${userId}`, {params}),
    submit: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/ratings/submit', {
        method: 'POST',
        body: jsonBody(payload),
      }),
  },
  shifts: {
    listAvailable: () =>
      request<Record<string, unknown>>('/shifts/available'),
    listMine: () =>
      request<Record<string, unknown>>('/shifts/my-shifts'),
    getDetails: (shiftId: string) =>
      request<Record<string, unknown>>(`/shifts/${shiftId}`),
    submitQuote: (shiftId: string, payload: {amountPerDay: number; notes?: string}) =>
      request<Record<string, unknown>>(`/shifts/${shiftId}/quote`, {
        method: 'POST',
        body: jsonBody(payload),
      }),
    withdrawQuote: (shiftId: string) =>
      request<Record<string, unknown>>(`/shifts/${shiftId}/quote`, {
        method: 'DELETE',
      }),
    cancel: (shiftId: string) =>
      request<Record<string, unknown>>(`/shifts/cancel/${shiftId}`, {
        method: 'PUT',
      }),
  },
  tracking: {
    getEta: (jobId: string) =>
      request<Record<string, unknown>>(`/tracking/eta/${jobId}`),
    getLive: (jobId: string) =>
      request<Record<string, unknown>>(`/tracking/live/${jobId}`),
    start: (jobId: string, payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/tracking/start/${jobId}`, {
        method: 'POST',
        body: jsonBody(payload),
      }),
    stop: (jobId: string, payload: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/tracking/stop/${jobId}`, {
        method: 'POST',
        body: jsonBody(payload),
      }),
    updateLocation: (payload: Record<string, unknown>) =>
      request<Record<string, unknown>>('/tracking/update-location', {
        method: 'POST',
        body: jsonBody(payload),
      }),
  },
};
