'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CreatorFeeData, Loaded, TokenMarketData } from '@/lib/types';

export const MARKET_EVERY = 20_000;
const FEES_EVERY = 60_000;

type Feed<T> = {
  data: T | null;
  /** 'unavailable' | 'not-found' from the server, 'stale' when a refresh failed but old data is kept. */
  error: string | null;
  /** When the client last received this payload. */
  receivedAt: number;
};

type Live = { market: Feed<TokenMarketData>; fees: Feed<CreatorFeeData> };
const Ctx = createContext<Live | null>(null);

function usePoll<T>(url: string, every: number, initial: Loaded<T>, initialAt: number): Feed<T> {
  const [feed, setFeed] = useState<Feed<T>>({ ...initial, receivedAt: initialAt });
  const failures = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ctrl: AbortController | undefined;
    let alive = true;

    const tick = async () => {
      if (document.visibilityState !== 'visible') return schedule();
      ctrl = new AbortController();
      try {
        const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
        const body = (await res.json()) as Loaded<T>;
        if (!alive) return;
        failures.current = body.data ? 0 : failures.current + 1;
        setFeed((prev) =>
          body.data
            ? { data: body.data, error: null, receivedAt: Date.now() }
            : { data: prev.data, error: prev.data ? 'stale' : body.error, receivedAt: prev.receivedAt },
        );
      } catch {
        if (!alive) return;
        failures.current += 1;
        setFeed((prev) => ({ ...prev, error: prev.data ? 'stale' : 'unavailable' }));
      }
      schedule();
    };
    // Back off on repeated failures instead of hammering a provider that is down.
    const schedule = () => {
      if (!alive) return;
      const backoff = Math.min(4, 2 ** failures.current);
      timer = setTimeout(tick, every * (failures.current ? backoff : 1));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };

    // Server-rendered data is fresh; only fetch at once when the server had none.
    if (!initial.data) tick();
    else schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, every]);

  return feed;
}

export function LiveProvider({
  market,
  fees,
  renderedAt,
  children,
}: {
  market: Loaded<TokenMarketData>;
  fees: Loaded<CreatorFeeData>;
  renderedAt: number;
  children: React.ReactNode;
}) {
  const m = usePoll('/api/market', MARKET_EVERY, market, renderedAt);
  const f = usePoll('/api/fees', FEES_EVERY, fees, renderedAt);
  return <Ctx.Provider value={{ market: m, fees: f }}>{children}</Ctx.Provider>;
}

export function useLive(): Live {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive outside LiveProvider');
  return v;
}

/** Ticks once a second, for "updated 8s ago" labels. Starts after mount to avoid hydration drift. */
export function useNow(every = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}
