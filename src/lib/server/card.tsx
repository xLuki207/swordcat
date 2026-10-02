import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { MINT, SITE, shortAddress } from '../config';
import { pct, price, sol, stamp, toSol, usd, usdCompact } from '../format';
import type { CreatorFeeData, TokenMarketData } from '../types';

export type CardFormat = 'wide' | 'square';
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
};

const C = {
  bg: '#0b0806',
  text: '#f4ede3',
  muted: 'rgba(244,237,227,0.58)',
  faint: 'rgba(244,237,227,0.34)',
  line: 'rgba(255,236,210,0.12)',
  gold: '#e7bd76',
  pink: '#f0a6b6',
};

let assets: Promise<{ fonts: { name: string; data: Buffer; weight: 400 | 600 | 800 | 500; style: 'normal' }[]; cat: string }> | null =
  null;
function loadAssets() {
  assets ??= (async () => {
    const root = process.cwd();
    const f = (n: string) => readFile(path.join(root, 'assets/fonts', n));
    const [serif, sans, sansBold, mono, cat] = await Promise.all([
      f('ShipporiMinchoB1-800.ttf'),
      f('Geist-400.ttf'),
      f('Geist-600.ttf'),
      f('GeistMono-500.ttf'),
      readFile(path.join(root, 'public/art/catana.png')),
    ]);
    return {
      fonts: [
        { name: 'Serif', data: serif, weight: 800, style: 'normal' },
        { name: 'Sans', data: sans, weight: 400, style: 'normal' },
        { name: 'Sans', data: sansBold, weight: 600, style: 'normal' },
        { name: 'Mono', data: mono, weight: 500, style: 'normal' },
      ],
      cat: `data:image/png;base64,${cat.toString('base64')}`,
    };
  })();
  return assets;
}

/** Cutout is 704 × 1209. */
const CAT_RATIO = 704 / 1209;

export async function renderCard(format: CardFormat, market: TokenMarketData | null, fees: CreatorFeeData | null) {
  const { fonts, cat } = await loadAssets();
  const { width, height } = CARD_SIZE[format];
  const wide = format === 'wide';
  const catH = wide ? 640 : 660;
  const catW = Math.round(catH * CAT_RATIO);
  const now = stamp(Date.now());
  const feeUsd = fees && market?.solUsd ? toSol(fees.totalLamports) * market.solUsd : null;

  const stat = (label: string, value: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 44 }}>
      <div style={{ fontFamily: 'Sans', fontSize: wide ? 18 : 22, color: C.faint }}>{label}</div>
      <div style={{ fontFamily: 'Mono', fontSize: wide ? 30 : 36, color: C.text }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width, height, display: 'flex', position: 'relative', background: C.bg, color: C.text, fontFamily: 'Sans', overflow: 'hidden' }}>
        {/* key light: the moon the cat stands in front of */}
        <div
          style={{
            position: 'absolute',
            width: wide ? 760 : 1000,
            height: wide ? 760 : 1000,
            right: wide ? -130 : -260,
            top: wide ? -120 : 60,
            borderRadius: 9999,
            background: 'radial-gradient(circle at 50% 50%, rgba(240,196,122,0.30) 0%, rgba(240,196,122,0.10) 38%, rgba(11,8,6,0) 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: wide ? 95 : 60,
            bottom: wide ? 6 : 4,
            width: catW * 0.9,
            height: 46,
            borderRadius: 9999,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cat} width={catW} height={catH} style={{ position: 'absolute', right: wide ? 70 : 40, bottom: wide ? -26 : -18 }} alt="" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: wide
              ? 'linear-gradient(90deg, rgba(11,8,6,0.96) 0%, rgba(11,8,6,0.82) 42%, rgba(11,8,6,0) 64%)'
              : 'linear-gradient(90deg, rgba(11,8,6,0.9) 0%, rgba(11,8,6,0.6) 48%, rgba(11,8,6,0) 64%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: wide ? '56px 64px' : '72px 76px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <div style={{ fontFamily: 'Serif', fontSize: wide ? 40 : 52, letterSpacing: 2 }}>{SITE.name}</div>
            <div style={{ fontFamily: 'Sans', fontSize: wide ? 20 : 24, color: C.muted }}>{`Sword Cat · ${SITE.ticker}`}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: wide ? 0 : -40 }}>
            <div style={{ fontFamily: 'Sans', fontSize: wide ? 24 : 30, color: C.muted }}>
              {fees ? 'Creator fees redirected' : 'Live on Solana'}
            </div>
            {fees ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 6 }}>
                <div style={{ fontFamily: 'Serif', fontSize: wide ? 132 : 150, lineHeight: 1, letterSpacing: -2 }}>{sol(fees.totalLamports)}</div>
                <div style={{ fontFamily: 'Serif', fontSize: wide ? 48 : 60, color: C.gold }}>SOL</div>
              </div>
            ) : (
              <div style={{ fontFamily: 'Serif', fontSize: wide ? 120 : 150, lineHeight: 1, marginTop: 6 }}>
                {market?.priceUsd ? price(market.priceUsd) : 'Sword Cat'}
              </div>
            )}
            {fees && (
              <div style={{ fontFamily: 'Sans', fontSize: wide ? 26 : 32, color: C.muted, marginTop: 14 }}>
                {`${feeUsd ? `≈ ${usd(feeUsd)} · ` : ''}${fees.shareBps / 100}% to one wallet${fees.locked ? ', locked' : ''}`}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: wide ? 26 : 34 }}>
            {market && (
              <div style={{ display: 'flex', borderTop: `1px solid ${C.line}`, paddingTop: wide ? 22 : 28, width: wide ? 640 : 560 }}>
                {stat('Market cap', usdCompact(market.marketCap))}
                {stat('24h volume', usdCompact(market.volume24h))}
                {market.priceChange24h != null && stat('24h', pct(market.priceChange24h))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: wide ? 18 : 22 }}>
              <div style={{ fontFamily: 'Sans', fontWeight: 600, color: C.gold }}>{SITE.domain}</div>
              <div style={{ fontFamily: 'Mono', color: C.faint }}>{shortAddress(MINT, 6, 4)}</div>
              <div style={{ fontFamily: 'Mono', color: C.faint }}>{`${now.date} · ${now.time}`}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts },
  );
}
