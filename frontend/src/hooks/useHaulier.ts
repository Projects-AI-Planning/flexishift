import { useState, useEffect, useCallback } from 'react';
import haulierService from '../api/haulierService';
import type { Job, Payment } from '../types';

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
  const [data, setData] = useState<{ jobs: Job[], totalActiveJobs: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const result = await haulierService.getActiveJobs(params);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load active shipments');
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
    payments: Payment[];
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
      
      setData({
        payments: history.items || [],
        paymentMethods: methods || [],
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
