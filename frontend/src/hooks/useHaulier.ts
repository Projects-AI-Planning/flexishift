import { useState, useEffect } from 'react';
import haulierService from '../api/haulierService';

export const useHaulierOverview = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const result = await haulierService.getOverview();
      setData(result);
    } catch (err) {
      setError('Failed to load haulier overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return { data, loading, error, refresh: fetchOverview };
};

export const useHaulierJobs = (params?: any) => {
  const [data, setData] = useState<{ jobs: any[], totalActiveJobs: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result = await haulierService.getActiveJobs(params);
      setData(result);
    } catch (err) {
      setError('Failed to load active shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [JSON.stringify(params)]);

  return { data, loading, error, refresh: fetchJobs };
};
