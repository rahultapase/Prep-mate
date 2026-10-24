// All requests use same-origin /api paths.
// Dev: Vite proxies /api to the Express server. Prod: Express serves the app and the API together.
export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  PROFILE: '/api/profile',
  INTERVIEWS: '/api/interviews',
  INTERVIEW_COUNT: '/api/interviews/count',
  RATINGS: '/api/ratings',
  AI_GENERATE: '/api/ai/generate',
  HEALTH: '/api/health',

} as const;

// Fired when the server says the session is gone, so the app can drop back to the login page
export const AUTH_EXPIRED_EVENT = 'prepmate:auth-expired';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, { method = 'GET', body, signal }: ApiFetchOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the PrepMate server. Make sure it is running.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && path !== API_ENDPOINTS.AUTH_LOGIN) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }

  return data as T;
}
