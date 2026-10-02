'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { LINKS, SITE } from '@/lib/config';
import s from './Header.module.css';

const NAV = [
  { href: '#token', label: 'Token' },
  { href: '#fees', label: 'Fees' },
  { href: '#creator', label: 'Creator' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={s.header} data-scrolled={scrolled || undefined}>
      <div className={`wrap ${s.inner}`}>
        <a href="#top" className={s.brand} aria-label={`${SITE.name} home`}>
          <Image src="/art/mark.png" alt="" width={30} height={30} className={s.mark} priority />
          <span className="display">{SITE.name}</span>
        </a>
        <nav className={s.nav} aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <a className={`btn btn-sm ${s.cta}`} href={LINKS.pump} target="_blank" rel="noopener noreferrer">
          Open Pump.fun
        </a>
      </div>
    </header>
  );
}
