// Low-level request helper for @/api. Not exported past index.ts.
//
// Reads from the FastAPI backend are public; writes attach the Supabase JWT
// from @/auth. Non-2xx responses throw a typed ApiError carrying the server's
// message so callers can branch on `status` (e.g. 401 → sign-in gate).

import { getAccessToken } from '@/auth';

export type ApiError = { status: number; message: string };

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as ApiError).status === 'number' &&
    typeof (e as ApiError).message === 'string'
  );
}

const BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'
).replace(/\/$/, '');

export type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const body = await res.json();
    // FastAPI uses { detail: ... }; our handlers sometimes send { message }.
    const detail = (body?.detail ?? body?.message) as unknown;
    if (typeof detail === 'string') message = detail;
    else if (Array.isArray(detail) && detail[0]?.msg) message = String(detail[0].msg);
  } catch {
    // non-JSON body — keep the status text
  }
  return { status: res.status, message };
}

type RequestOpts = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  query?: Query;
  json?: unknown;
  body?: BodyInit; // for multipart (thumbnail upload)
  auth?: boolean; // attach the JWT; defaults true for non-GET
};

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const auth = opts.auth ?? method !== 'GET';
  const headers: Record<string, string> = {};

  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getAccessToken();
    if (!token) {
      // Surface as a 401 so callers can open the sign-in gate instead of
      // firing an anonymous write the server would reject anyway.
      throw { status: 401, message: 'Sign in to continue.' } satisfies ApiError;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(withQuery(`${BASE_URL}${path}`, opts.query), {
    method,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
