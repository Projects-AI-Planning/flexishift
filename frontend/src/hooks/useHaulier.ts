import { useState, useEffect, useCallback } from 'react';
import haulierService from '../api/haulierService';
import { Job, Payment } from '../types';

export const useHaulierOverview = () => {
  const [data, setData] = useState<Record<string, any> | null>(null); 
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
    fetchOverview(false);
  }, [fetchOverview]);

  return { data, loading, error, refresh: () => fetchOverview(true) };
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
    fetchJobs(false);
  }, [fetchJobs]);

  return { data, loading, error, refresh: () => fetchJobs(true) };
};

export const useHaulierPayments = (params?: Record<string, unknown>) => {
  const [data, setData] = useState<{
    totalSpent: number;
    escrowAmount: number;
    pendingInvoicesCount: number;
    payments: Payment[];
    paymentMethods: Array<Record<string, unknown>>;
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
    fetchPayments(false);
  }, [fetchPayments]);

  return { data, loading, error, refresh: () => fetchPayments(true) };
};
