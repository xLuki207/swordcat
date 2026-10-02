'use client';

import { useEffect, useState } from 'react';
import { MINT } from '@/lib/config';
import { CheckIcon, CopyIcon } from './icons';
import s from './CopyMint.module.css';

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Safari / non-secure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function CopyMint({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className={`${s.mint} ${variant === 'compact' ? s.compact : ''}`}
      data-copied={copied || undefined}
      onClick={async () => setCopied(await copy(MINT))}
      aria-label={copied ? 'Mint address copied' : 'Copy mint address'}
    >
      <span className={s.tag}>Mint</span>
      <span className={`num ${s.addr}`}>
        <span className={s.head}>{MINT.slice(0, -10)}</span>
        <span>{MINT.slice(-10)}</span>
      </span>
      <span className={s.icon} aria-hidden>
        <span className={s.copyIc}>
          <CopyIcon size={15} />
        </span>
        <span className={s.checkIc}>
          <CheckIcon size={15} />
        </span>
      </span>
      <span className={s.state} aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
