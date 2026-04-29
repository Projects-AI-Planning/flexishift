import { useState, useEffect, useCallback } from 'react';
import adminService from '../api/adminService';
import { AdminStats, User, Job, Dispute, VerificationRequest } from '../types';

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const data = await adminService.getStats();
      setStats(data);
      setError(null);
    } catch {
      setError('Failed to load platform statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
};

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export const useAdminUsers = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const result = await adminService.listUsers(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load user list');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, loading, error, refresh: fetchUsers };
};

export const useAdminJobs = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const result = await adminService.monitorJobs(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load jobs monitor');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { data, loading, error, refresh: fetchJobs };
};

export const useAdminDisputes = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<Dispute> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const result = await adminService.listDisputes(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load disputes list');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  return { data, loading, error, refresh: fetchDisputes };
};

export const useAdminVerifications = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ pendingVerifications: VerificationRequest[], totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const result = await adminService.getPendingVerifications(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  return { data, loading, error, refresh: fetchVerifications };
};

export const useAdminRevenue = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const result = await adminService.getRevenueReport(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  return { data, loading, error, refresh: fetchRevenue };
};

