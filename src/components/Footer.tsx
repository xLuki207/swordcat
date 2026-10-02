import Image from 'next/image';
import { LINKS, SITE } from '@/lib/config';
import { CopyMint } from './CopyMint';
import { ArrowUpRight } from './icons';
import s from './Footer.module.css';

const OUT = [
  { href: LINKS.pump, label: 'Pump.fun' },
  { href: LINKS.dexscreener, label: 'DexScreener' },
  { href: LINKS.instagram, label: 'Instagram' },
  { href: LINKS.xCommunity, label: 'X community' },
];

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.inner}`}>
        <div className={s.brand}>
          <Image src="/art/mark.png" alt="" width={36} height={36} className={s.mark} />
          <div>
            <p className={`display ${s.name}`}>{SITE.name}</p>
            <p className={s.sub}>
              {SITE.meme} · {SITE.ticker} · {SITE.domain}
            </p>
          </div>
        </div>
        <CopyMint variant="compact" />
        <nav className={s.links} aria-label="Elsewhere">
          {OUT.map((l) => (
            <a key={l.href} className="link" href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
              <ArrowUpRight size={12} />
            </a>
          ))}
        </nav>
      </div>
      <div className={`wrap ${s.fine}`}>
        <p>Market data: DexScreener. Fee data: read from Solana mainnet. A memecoin; nothing here is financial advice.</p>
      </div>
    </footer>
  );
}
