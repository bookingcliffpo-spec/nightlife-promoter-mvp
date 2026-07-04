const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
