'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { LINKS } from '@/lib/config';
import { CopyMint } from './CopyMint';
import { LiveStrip } from './LiveStrip';
import s from './Hero.module.css';

const PETALS = [
  { left: '58%', delay: '-2s', dur: '19s', size: 10, dx: '-140px', o: 0.55 },
  { left: '71%', delay: '-9s', dur: '23s', size: 8, dx: '-90px', o: 0.45 },
  { left: '84%', delay: '-14s', dur: '21s', size: 11, dx: '-160px', o: 0.5 },
  { left: '92%', delay: '-5s', dur: '26s', size: 7, dx: '-60px', o: 0.35 },
  { left: '64%', delay: '-18s', dur: '28s', size: 6, dx: '-110px', o: 0.3 },
  { left: '40%', delay: '-12s', dur: '30s', size: 7, dx: '-80px', o: 0.25 },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  // Parallax by a few pixels: pointer moves the light, scroll lifts the cat.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      el.style.setProperty('--sy', String(Math.min(window.scrollY, 900)));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      queue();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', queue);
    };
  }, []);

  return (
    <section id="top" ref={ref} className={s.hero}>
      <div className={s.sky} aria-hidden>
        <div className={s.backdrop} />
        <div className={s.halo} />
        <div className={s.moon} />
        <div className={s.horizon} />
        {PETALS.map((p, i) => (
          <span
            key={i}
            className={s.petal}
            style={
              {
                left: p.left,
                width: p.size,
                height: p.size * 0.72,
                animationDelay: p.delay,
                animationDuration: p.dur,
                '--dx': p.dx,
                '--o': p.o,
              } as React.CSSProperties
            }
          />
        ))}
        <span className={s.kanji}>刀猫</span>
      </div>

      <div className={`wrap ${s.grid}`}>
        <div className={s.copy}>
          <p className={s.eyebrow}>
            Sword Cat <span aria-hidden>·</span> $CATANA on Solana
          </p>
          <h1 className={`display ${s.title}`}>CATANA</h1>
          <p className={s.lede}>
            Trade the cat. Every creator fee is redirected&nbsp;— 100% to one wallet, locked on&#8209;chain.
          </p>
          <div className={s.actions}>
            <a className="btn btn-primary" href={LINKS.pump} target="_blank" rel="noopener noreferrer">
              Open Pump.fun
            </a>
            <a className="btn" href={LINKS.dexscreener} target="_blank" rel="noopener noreferrer">
              Chart
            </a>
          </div>
          <div className={s.mint}>
            <CopyMint />
          </div>
        </div>

        <figure className={s.stage}>
          <div className={s.figure}>
            <div className={s.float}>
              <Image
                src="/art/catana.webp"
                alt="Sword Cat: a tabby kitten with a pink bow, standing on its hind legs, holding a katana"
                width={1408}
                height={2418}
                priority
                quality={90}
                sizes="(max-width: 720px) 70vw, (max-width: 1080px) 360px, 440px"
                className={s.cat}
              />
              <span className={s.glint} aria-hidden />
            </div>
            <div className={s.shadow} aria-hidden />
          </div>
        </figure>
      </div>

      <LiveStrip />
    </section>
  );
}
