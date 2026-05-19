import {API_BASE_URL, WS_BASE_URL} from '../config/env';
import type {ApiResponse} from '../types';

let accessToken: string | null = null;
let refreshSessionHandler:
  | (() => Promise<{accessToken: string; refreshToken?: string} | null>)
  | null = null;

export const setApiAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setApiSessionRefresher = (
  handler: (() => Promise<{accessToken: string; refreshToken?: string} | null>) | null,
) => {
  refreshSessionHandler = handler;
};

type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

interface RequestOptions {
  body?: FormData | string | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
  method?: HttpMethod;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
}

const withQuery = (path: string, params?: RequestOptions['params']) => {
  const base = `${API_BASE_URL}${path}`;
  if (!params) {return base;}
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${base}?${qs}` : base;
};

// ─── Network logger ───────────────────────────────────────────────────────────

const LOG_PREFIX = '[FlexiShift API]';
const RESET  = '\x1b[0m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREY   = '\x1b[90m';

let reqCounter = 0;

function logRequest(id: number, method: string, url: string, body: unknown) {
  console.log(
    `\n${CYAN}${LOG_PREFIX} ──► #${id} ${method} ${url}${RESET}`,
  );
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      console.log(`${GREY}  BODY:${RESET}`, JSON.stringify(parsed, null, 2));
    } catch {
      console.log(`${GREY}  BODY (raw):${RESET}`, String(body).slice(0, 300));
    }
  }
}

function logResponse(id: number, status: number, ok: boolean, data: unknown) {
  const color = ok ? GREEN : RED;
  const label = ok ? '✓ OK' : '✗ ERR';
  console.log(
    `${color}${LOG_PREFIX} ◄── #${id} ${status} ${label}${RESET}`,
  );
  console.log(`${GREY}  RESPONSE:${RESET}`, JSON.stringify(data, null, 2));
}

function logError(id: number, error: unknown) {
  console.log(
    `${RED}${LOG_PREFIX} ✗ #${id} NETWORK ERROR: ${
      error instanceof Error ? error.message : String(error)
    }${RESET}`,
  );
}

// ─── Core request function ────────────────────────────────────────────────────

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const id = ++reqCounter;
  const method = options.method ?? 'GET';
  const url = withQuery(path, options.params);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.isFormData ? {} : {'Content-Type': 'application/json'}),
    ...options.headers,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  logRequest(id, method, url, options.isFormData ? '[FormData]' : options.body);

  let response: Response;
  let payload: ApiResponse<T> | null = null;
  let retryAttempted = false;

  const TIMEOUT_MS = 60_000;

  const execute = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        body: options.body,
        headers,
        method,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError(id, err);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  while (true) {
    response = await execute();

    try {
      payload = (await response.json()) as ApiResponse<T> | null;
    } catch {
      payload = null;
    }

    const authFailed =
      !options.skipAuthRefresh &&
      !retryAttempted &&
      (response.status === 401 || response.status === 403) &&
      /not authenticated|unauthorized|invalid or expired token/.test(
        String(payload?.message ?? '').toLowerCase(),
      ) &&
      refreshSessionHandler;

    if (authFailed) {
      const refreshed = await refreshSessionHandler!();
      if (refreshed?.accessToken) {
        accessToken = refreshed.accessToken;
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        retryAttempted = true;
        continue;
      }
    }

    break;
  }

  logResponse(id, response.status, response.ok && !!payload?.status, payload);

  if (!response.ok || !payload?.status) {
    const rawMessage = payload?.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : rawMessage != null
        ? JSON.stringify(rawMessage)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

export const getNotificationsWebSocketUrl = (token: string) =>
  `${WS_BASE_URL}/ws/notifications/live?token=${encodeURIComponent(token)}`;
