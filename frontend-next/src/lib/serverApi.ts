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

/**
 * `serverGet` for page prefetching, where "the API is unreachable" must not be
 * fatal. A throw here would fail the whole build (or the request) for a page that
 * only wanted a first-paint head start, so the failure is logged and reported as
 * `null`; the client view then behaves exactly as it did before prefetching
 * existed and fetches the data itself.
 *
 * Next does not cache a fetch that throws, so the next revalidation retries.
 */
export async function serverGetOrNull<T>(
  path: string,
  options?: ServerGetOptions,
  label?: string
): Promise<T | null> {
  try {
    return await serverGet<T>(path, options);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        `[serverApi] ${label ?? path} not prefetched: ${(error as Error).message}`
      );
    }
    return null;
  }
}
