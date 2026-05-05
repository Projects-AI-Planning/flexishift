import { useState, useEffect, useCallback } from 'react';
import haulierService from '../api/haulierService';
import type { Job } from '../types';

interface HaulierOverview {
  summary?: {
    totalSpentThisMonth?: number;
    totalActiveJobs?: number;
    openJobsWithQuotes?: number;
  };
  activeJobs?: Array<{
    jobReference: string;
    pickupLocation: string | { address: string };
    dropLocation: string | { address: string };
    driverName?: string;
    status: string;
    delay?: string;
  }>;
  activeJobsCount?: number;
  completedJobs?: number;
  totalSpent?: number;
  escrowAmount?: number;
  pendingInvoicesCount?: number;
}

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  isDefault: boolean;
}

interface PaymentHistoryItem {
  paymentId: string;
  jobId: string;
  jobRef: string;
  pickupAddress?: string;
  dropAddress?: string;
  goodsType?: string;
  amount: number;
  currency: string;
  status: string;
  escrowedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

export const useHaulierOverview = () => {
  const [data, setData] = useState<HaulierOverview | null>(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await haulierService.getOverview();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load haulier overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchOverview();
    });
  }, [fetchOverview]);

  const refresh = useCallback(() => {
    void fetchOverview(true);
  }, [fetchOverview]);

  return { data, loading, error, refresh };
};

export const useHaulierJobs = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{ jobs: Job[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await haulierService.listAllJobs(params);
      const payload = result as {
        items?: Job[];
        jobs?: Job[];
        total?: number;
        totalJobs?: number;
        totalUpcoming?: number;
        perPage?: number;
        limit?: number;
      };
      const jobs = payload.items ?? payload.jobs ?? [];
      const total = payload.total ?? payload.totalJobs ?? payload.totalUpcoming ?? jobs.length;
      setData({ jobs, total });
      setError(null);
    } catch {
      setError('Failed to load shipments');
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

export const useHaulierPayments = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{
    totalSpent: number;
    escrowAmount: number;
    pendingInvoicesCount: number;
    payments: PaymentHistoryItem[];
    paymentMethods: PaymentMethod[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const [history, methods, summary] = await Promise.all([
        haulierService.getPaymentHistory(params),
        haulierService.listPaymentMethods(),
        haulierService.getSpendSummary(params)
      ]);

      const historyData = history as {
        items?: PaymentHistoryItem[];
      };
      const methodsData = methods as {
        methods?: Array<{ methodId?: string; accountNumber?: string; type?: string }>;
      };
      
      setData({
        payments: historyData.items || [],
        paymentMethods: (methodsData.methods || []).map((method) => ({
          id: String(method.methodId ?? ''),
          last4: String(method.accountNumber ?? method.methodId ?? '0000').slice(-4),
          brand: String(method.type ?? 'BANK'),
          isDefault: true,
        })),
        totalSpent: summary.totalSpent || 0,
        escrowAmount: summary.escrowAmount || 0,
        pendingInvoicesCount: summary.pendingInvoicesCount || 0
      });
      setError(null);
    } catch {
      setError('Failed to load financial data');
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
