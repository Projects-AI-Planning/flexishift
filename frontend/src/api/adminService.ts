import client from './client';
import type { AdminStats } from '../types';

const adminService = {
  getStats: () => client.get('/admin/stats').then(res => res.data.data as AdminStats),
  
  listUsers: (params?: { role?: string; status?: string; page?: number }) => 
    client.get('/admin/users', { params }).then(res => res.data.data),

  updateUserStatus: (userId: string, status: string) => 
    client.patch(`/admin/users/${userId}/status`, { status }),

  listPendingVerifications: (params?: { page?: number }) => 
    client.get('/admin/verifications/pending', { params }).then(res => res.data.data),

  approveDocument: (docId: string) => 
    client.put(`/admin/documents/approve/${docId}`),

  rejectDocument: (docId: string, reason: string) => 
    client.put(`/admin/documents/reject/${docId}`, null, { params: { reason } }),

  listJobs: (params?: { status?: string; page?: number }) => 
    client.get('/admin/jobs/monitor', { params }).then(res => res.data.data),
};

export default adminService;
