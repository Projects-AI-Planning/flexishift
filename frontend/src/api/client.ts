import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

const normalizeBaseUrl = (value?: string) => {
  if (!value) {
    return 'http://localhost:8000/api/v1';
  }

  const normalized = value.replace(/\/+$/, '');
  if (normalized.endsWith('/api/v1')) {
    return normalized;
  }

  return `${normalized}/api/v1`;
};

const client = axios.create({
  baseURL: normalizeBaseUrl(rawApiUrl),
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
