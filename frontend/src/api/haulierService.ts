import client from './client';

const haulierService = {
  getOverview: () => client.get('/dashboard/haulier/overview').then(res => res.data.data),
  
  getActiveJobs: (params?: { page?: number }) => 
    client.get('/dashboard/haulier/jobs/active', { params }).then(res => res.data.data),

  getSpendSummary: (params?: { period?: string }) => 
    client.get('/dashboard/haulier/spend-summary', { params }).then(res => res.data.data),
    
  getFleet: () => client.get('/supplier/fleet').then(res => res.data.data), // Assuming this exists or using a mock for now
  
  createJob: (data: any) => client.post('/jobs/create', data).then(res => res.data.data),
};

export default haulierService;
