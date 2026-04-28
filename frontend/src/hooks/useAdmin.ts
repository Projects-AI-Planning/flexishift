import { useState, useEffect } from 'react';
import adminService from '../api/adminService';
import { AdminStats } from '../types';

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load platform statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refresh: fetchStats };
};

export const useAdminUsers = (params?: any) => {
  const [data, setData] = useState<{ items: any[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await adminService.listUsers(params);
      setData(result);
    } catch (err) {
      setError('Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchUsers };
};

export const useAdminJobs = (params?: any) => {
  const [data, setData] = useState<{ items: any[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result = await adminService.monitorJobs(params);
      setData(result);
    } catch (err) {
      setError('Failed to load jobs monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchJobs };
};

export const useAdminDisputes = (params?: any) => {
  const [data, setData] = useState<{ items: any[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const result = await adminService.listDisputes(params);
      setData(result);
    } catch (err) {
      setError('Failed to load disputes list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchDisputes };
};

export const useAdminVerifications = (params?: any) => {
  const [data, setData] = useState<{ pendingVerifications: any[], totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const result = await adminService.getPendingVerifications(params);
      setData(result);
    } catch (err) {
      setError('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchVerifications };
};

export const useAdminRevenue = (params?: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const result = await adminService.getRevenueReport(params);
      setData(result);
    } catch (err) {
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchRevenue };
};
