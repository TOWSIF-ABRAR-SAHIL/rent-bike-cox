/**
 * Ephemeral client-side navigation state.
 *
 * react-router's `navigate(path, { state })` / `location.state` has no
 * App Router equivalent. For client-side transitions this in-memory store
 * preserves the exact same one-shot semantics: the target page takes the
 * value once on mount via `takeNavState`.
 *
 * Values do NOT survive a full page reload — anything that must persist
 * (e.g. pickup location) already uses localStorage (see lib/pickupSpots).
 */

const store = new Map<string, unknown>();

export function setNavState<T>(key: string, value: T): void {
  store.set(key, value);
}

export function takeNavState<T>(key: string): T | undefined {
  const value = store.get(key) as T | undefined;
  store.delete(key);
  return value;
}
