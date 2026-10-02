import 'server-only';

/**
 * Per-instance memo with in-flight dedupe and stale fallback.
 *
 * The CDN in front of the API routes absorbs traffic; this only makes sure
 * one warm instance never asks a provider the same question twice at once,
 * and that a provider hiccup serves the last good answer instead of an error.
 */
type Entry = { value: unknown; at: number; flight: Promise<unknown> | null };
const g = globalThis as unknown as { __catanaCache?: Map<string, Entry> };
const store = (g.__catanaCache ??= new Map());

export async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>, staleMs = 30 * 60_000): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && !hit.flight && now - hit.at < ttlMs) return hit.value as T;
  if (hit?.flight) return hit.flight as Promise<T>;

  const flight = load().then(
    (value) => {
      store.set(key, { value, at: Date.now(), flight: null });
      return value;
    },
    (err) => {
      if (hit && hit.at > 0 && Date.now() - hit.at < staleMs) {
        store.set(key, { ...hit, flight: null });
        return hit.value as T;
      }
      store.delete(key);
      throw err;
    },
  );
  store.set(key, { value: hit?.value, at: hit?.at ?? 0, flight });
  return flight;
}

/** No Next fetch-cache options: freshness is the memo's job, and leaving them out keeps the page ISR. */
export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number; retries?: number } = {}) {
  const { timeoutMs = 8000, retries = 1, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 429 || res.status >= 500) throw new Error(`${new URL(url).host} ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}
