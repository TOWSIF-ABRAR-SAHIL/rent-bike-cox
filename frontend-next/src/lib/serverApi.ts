/**
 * Server-side API helpers for React Server Components.
 * No auth tokens here — only public endpoints are fetched server-side
 * (auth stays client-side via the axios client + AuthContext).
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

interface ServerGetOptions extends RequestInit {
  /** ISR revalidate window in seconds (default 60). */
  revalidate?: number;
}

export async function serverGet<T>(
  path: string,
  options?: ServerGetOptions
): Promise<T> {
  const { revalidate = 60, ...init } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}
