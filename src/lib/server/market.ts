import 'server-only';
import { MINT } from '../config';
import type { TokenMarketData } from '../types';
import { fetchWithTimeout, memo } from './cache';

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string };
  quoteToken: { address: string; symbol: string };
  priceNative?: string;
  priceUsd?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
};

const WSOL = 'So11111111111111111111111111111111111111112';
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN);
const finite = (v: unknown) => (Number.isFinite(num(v)) ? num(v) : null);

/**
 * The canonical pair is the deepest SOL-quoted pool where CATANA is the base
 * token. DexScreener can list stray pools (someone's tiny LP, a reversed pair);
 * their prices are noise, so they never win just by being listed first.
 */
export function pickPair(pairs: DexPair[]): DexPair | null {
  const ours = pairs.filter((p) => p.chainId === 'solana' && p.baseToken?.address === MINT && finite(p.priceUsd));
  if (!ours.length) return null;
  const liq = (p: DexPair) => p.liquidity?.usd ?? 0;
  const solQuoted = ours.filter((p) => p.quoteToken?.address === WSOL);
  return (solQuoted.length ? solQuoted : ours).sort((a, b) => liq(b) - liq(a))[0];
}

async function load(): Promise<TokenMarketData | null> {
  const res = await fetchWithTimeout(`https://api.dexscreener.com/tokens/v1/solana/${MINT}`, {
    headers: { accept: 'application/json' },
    timeoutMs: 6000,
  });
  if (!res.ok) throw new Error(`dexscreener ${res.status}`);
  const body = (await res.json()) as unknown;
  const pairs = Array.isArray(body) ? (body as DexPair[]) : ((body as { pairs?: DexPair[] })?.pairs ?? []);
  const p = pickPair(pairs);
  if (!p) return null;
  const priceUsd = finite(p.priceUsd);
  const priceNative = finite(p.priceNative);
  return {
    priceUsd,
    marketCap: finite(p.marketCap),
    fdv: finite(p.fdv),
    liquidityUsd: finite(p.liquidity?.usd),
    volume24h: finite(p.volume?.h24),
    priceChange24h: finite(p.priceChange?.h24),
    solUsd: p.quoteToken.address === WSOL && priceUsd && priceNative ? priceUsd / priceNative : null,
    dex: p.dexId,
    pairAddress: p.pairAddress,
    pairUrl: p.url,
    updatedAt: Date.now(),
  };
}

/** 15 s: DexScreener's own cadence is about that, and the CDN sits in front. */
export const getMarket = () => memo('market', 15_000, load);
