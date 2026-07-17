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
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const existingAuth = typeof config.headers?.Authorization === 'string'
    ? config.headers.Authorization
    : undefined;
  if (token && !existingAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: { response?: { status?: number } }) => {
    const onLoginPage = window.location.pathname === '/login';
    if (error.response?.status === 401 && !onLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default client;
