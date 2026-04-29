import { useState, useEffect, useCallback } from 'react';
import adminService from '../api/adminService';
import type { AdminStats } from '../types';
import type { Dispute, Job, RevenueReport, User, VerificationRequest } from '../types';

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchStats();
    });
  }, [fetchStats]);

  const refresh = useCallback(() => {
    void fetchStats(true);
  }, [fetchStats]);

  return { stats, loading, error, refresh };
};

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export const useAdminUsers = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchUsers();
    });
  }, [fetchUsers]);

  const refresh = useCallback(() => {
    void fetchUsers(true);
  }, [fetchUsers]);

  return { data, loading, error, refresh };
};

export const useAdminJobs = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchJobs();
    });
  }, [fetchJobs]);

  const refresh = useCallback(() => {
    void fetchJobs(true);
  }, [fetchJobs]);

  return { data, loading, error, refresh };
};

export const useAdminDisputes = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<PaginatedResponse<Dispute> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchDisputes();
    });
  }, [fetchDisputes]);

  const refresh = useCallback(() => {
    void fetchDisputes(true);
  }, [fetchDisputes]);

  return { data, loading, error, refresh };
};

export const useAdminVerifications = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ pendingVerifications: VerificationRequest[], totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchVerifications();
    });
  }, [fetchVerifications]);

  const refresh = useCallback(() => {
    void fetchVerifications(true);
  }, [fetchVerifications]);

  return { data, loading, error, refresh };
};

export const useAdminRevenue = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
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
    queueMicrotask(() => {
      void fetchRevenue();
    });
  }, [fetchRevenue]);

  const refresh = useCallback(() => {
    void fetchRevenue(true);
  }, [fetchRevenue]);

  return { data, loading, error, refresh };
};
