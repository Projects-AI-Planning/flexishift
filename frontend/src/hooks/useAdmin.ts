import { useState, useEffect, useCallback } from 'react';
import adminService from '../api/adminService';
import type { AdminStats } from '../types';
import type { AdminInvoice, AdminPayment, Dispute, Job, ProcessedVerification, RevenueReport, User, VerificationRequest } from '../types';


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

export const useAdminProcessedVerifications = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ processedVerifications: ProcessedVerification[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcessed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.getProcessedVerifications(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load processed verifications');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProcessed();
    });
  }, [fetchProcessed]);

  const refresh = useCallback(() => {
    void fetchProcessed(true);
  }, [fetchProcessed]);

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

export const useAdminPayments = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ items: AdminPayment[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.listAdminPayments(params as Parameters<typeof adminService.listAdminPayments>[0]);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchPayments();
    });
  }, [fetchPayments]);

  const refresh = useCallback(() => {
    void fetchPayments(true);
  }, [fetchPayments]);

  return { data, loading, error, refresh };
};

export const useActiveDisputes = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ items: Dispute[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.listActiveDisputes(params as Parameters<typeof adminService.listActiveDisputes>[0]);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load active disputes');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { queueMicrotask(() => { void fetch(); }); }, [fetch]);
  const refresh = useCallback(() => { void fetch(true); }, [fetch]);
  return { data, loading, error, refresh };
};

export const useResolvedDisputes = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ items: Dispute[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.listResolvedDisputes(params as Parameters<typeof adminService.listResolvedDisputes>[0]);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load resolved disputes');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { queueMicrotask(() => { void fetch(); }); }, [fetch]);
  const refresh = useCallback(() => { void fetch(true); }, [fetch]);
  return { data, loading, error, refresh };
};

export const useEscalatedDisputes = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ items: Dispute[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.listEscalatedDisputes(params as Parameters<typeof adminService.listEscalatedDisputes>[0]);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load escalated disputes');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { queueMicrotask(() => { void fetch(); }); }, [fetch]);
  const refresh = useCallback(() => { void fetch(true); }, [fetch]);
  return { data, loading, error, refresh };
};

export const useAdminInvoices = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ items: AdminInvoice[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await adminService.listAdminInvoices(
        params as Parameters<typeof adminService.listAdminInvoices>[0],
      );
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    queueMicrotask(() => { void fetchInvoices(); });
  }, [fetchInvoices]);

  const refresh = useCallback(() => { void fetchInvoices(true); }, [fetchInvoices]);

  return { data, loading, error, refresh };
};
