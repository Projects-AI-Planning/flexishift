import {API_BASE_URL, WS_BASE_URL} from '../config/env';
import type {ApiResponse} from '../types';

let accessToken: string | null = null;

export const setApiAccessToken = (token: string | null) => {
  accessToken = token;
};

type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

interface RequestOptions {
  body?: FormData | string | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
  method?: HttpMethod;
  params?: Record<string, string | number | boolean | undefined>;
}

const withQuery = (path: string, params?: RequestOptions['params']) => {
  const base = `${API_BASE_URL}${path}`;
  if (!params) {
    return base;
  }
  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return qs ? `${base}?${qs}` : base;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.isFormData ? {} : {'Content-Type': 'application/json'}),
    ...options.headers,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(withQuery(path, options.params), {
    body: options.body,
    headers,
    method: options.method ?? 'GET',
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.status) {
    throw new Error(
      payload?.message ?? `Request failed with status ${response.status}`,
    );
  }

  return payload.data;
}

export const getNotificationsWebSocketUrl = (token: string) =>
  `${WS_BASE_URL}/api/v1/notifications/live?token=${encodeURIComponent(token)}`;
