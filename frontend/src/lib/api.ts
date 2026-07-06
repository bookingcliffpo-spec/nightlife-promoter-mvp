import { createSupabaseBrowserClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function handleResponse(res: Response) {
  if (res.status === 204) return null;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = isJson && body?.error ? body.error : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, isJson ? body?.issues : undefined);
  }
  return body;
}

// Browsers throw a bare TypeError (e.g. "NetworkError when attempting to
// fetch resource") when a request can't reach the server at all — wrong
// host, DNS failure, CORS rejection, or the server being down. Surface a
// message that actually points at the cause instead of that opaque error.
async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(0, 'Could not connect to the server. Please check your connection and try again.');
  }
}

export async function apiGet(path: string) {
  const authHeader = await getAuthHeader();
  const res = await safeFetch(`${API_URL}${path}`, { headers: { ...authHeader }, cache: 'no-store' });
  return handleResponse(res);
}

export async function apiSend(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', data?: unknown) {
  const authHeader = await getAuthHeader();
  const res = await safeFetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    cache: 'no-store'
  });
  return handleResponse(res);
}

export async function apiUpload(path: string, formData: FormData) {
  const authHeader = await getAuthHeader();
  const res = await safeFetch(`${API_URL}${path}`, { method: 'POST', headers: { ...authHeader }, body: formData });
  return handleResponse(res);
}

export async function apiDownload(path: string): Promise<Blob> {
  const authHeader = await getAuthHeader();
  const res = await safeFetch(`${API_URL}${path}`, { headers: { ...authHeader } });
  if (!res.ok) throw new ApiError(res.status, 'Download failed');
  return res.blob();
}

// Public (unauthenticated) endpoints — RSVP pages, unsubscribe pages.
export async function publicApiGet(path: string) {
  const res = await safeFetch(`${API_URL}${path}`, { cache: 'no-store' });
  return handleResponse(res);
}

export async function publicApiSend(path: string, method: 'POST' | 'PATCH', data?: unknown) {
  const res = await safeFetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined
  });
  return handleResponse(res);
}
