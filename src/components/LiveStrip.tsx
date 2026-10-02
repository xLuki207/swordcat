'use client';

import { ago, pct, price, usdCompact } from '@/lib/format';
import { AnimatedValue } from './AnimatedValue';
import { MARKET_EVERY, useLive, useNow } from './live';
import s from './LiveStrip.module.css';

export function LiveStrip() {
  const { market } = useLive();
  const now = useNow();
  const m = market.data;
  const change = m?.priceChange24h ?? null;

  const status = !m
    ? market.error === 'not-found'
      ? 'No trading pair listed yet'
      : 'Market data unavailable, retrying'
    : market.error === 'stale'
      ? 'Showing last known values'
      : now
        ? `Updated ${ago(market.receivedAt, now)}`
        : 'Live';

  return (
    <div id="token" className={s.strip}>
      <div className={`wrap ${s.row}`}>
        <dl className={s.metrics}>
          <Metric label="Price" value={<AnimatedValue value={m?.priceUsd ?? null} format={price} />} />
          <Metric label="Market cap" value={<AnimatedValue value={m?.marketCap ?? null} format={usdCompact} />} />
          <Metric label="24h volume" value={<AnimatedValue value={m?.volume24h ?? null} format={usdCompact} />} />
          <Metric
            label="24h change"
            value={<span className={change == null ? '' : change >= 0 ? 'up' : 'down'}>{pct(change)}</span>}
          />
          <Metric label="Liquidity" value={<AnimatedValue value={m?.liquidityUsd ?? null} format={usdCompact} />} className={s.optional} />
        </dl>
        <div className={s.status}>
          <span className={s.live} data-ok={(m && !market.error) || undefined}>
            Live
          </span>
          <span className={s.statusText} aria-live="polite">
            {status}
          </span>
          {m && (
            <a className={`link ${s.source}`} href={m.pairUrl} target="_blank" rel="noopener noreferrer">
              {m.dex === 'pumpswap' ? 'PumpSwap' : m.dex} pair via DexScreener
            </a>
          )}
        </div>
      </div>
      {/* the refresh cycle, drawn as a hairline instead of a blinking dot */}
      {m && !market.error && <span key={market.receivedAt} className={s.cycle} style={{ animationDuration: `${MARKET_EVERY}ms` }} aria-hidden />}
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`${s.metric} ${className ?? ''}`}>
      <dt className="label">{label}</dt>
      <dd className={`num ${s.value}`}>{value}</dd>
    </div>
  );
}
