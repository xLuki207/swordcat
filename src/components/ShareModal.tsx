'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE } from '@/lib/config';
import { sol } from '@/lib/format';
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon, ShareIcon } from './icons';
import { useLive } from './live';
import s from './ShareModal.module.css';

type Format = 'wide' | 'square';
type Card = { url: string; blob: Blob; format: Format };

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={s.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={s.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShareBody onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShareBody({ onClose }: { onClose: () => void }) {
  const { fees } = useLive();
  const [format, setFormat] = useState<Format>('wide');
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<'copied' | 'shared' | null>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Draw the card from the live numbers each time the dialog opens or the format changes.
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    setCard(null);
    setFailed(false);
    fetch(`/api/card?format=${format}&t=${Date.now()}`)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ url, blob, format });
        const file = new File([blob], 'catana.png', { type: 'image/png' });
        setCanShare(typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [format]);

  useEffect(() => {
    setCanCopy(typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 1600);
    return () => clearTimeout(t);
  }, [done]);

  // Focus management: trap Tab inside, Esc closes, focus returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = root.current;
    el?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const text = fees.data
    ? `${SITE.name}: ${sol(fees.data.totalLamports)} SOL in creator fees redirected. ${SITE.url}`
    : `${SITE.name}, the Sword Cat. ${SITE.url}`;

  const share = useCallback(async () => {
    if (!card) return;
    try {
      await navigator.share({ files: [new File([card.blob], 'catana.png', { type: 'image/png' })], text });
      setDone('shared');
    } catch {
      /* dismissed */
    }
  }, [card, text]);

  const copyImage = useCallback(async () => {
    if (!card) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': card.blob })]);
      setDone('copied');
    } catch {
      setCanCopy(false);
    }
  }, [card]);

  return (
    <div ref={root} className={s.body}>
      <div className={s.head}>
        <h2 id="share-title" className={s.title}>
          Share the number
        </h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close" data-autofocus>
          <CloseIcon size={18} />
        </button>
      </div>

      <div className={s.formats} role="group" aria-label="Card format">
        {(['wide', 'square'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>
            {f === 'wide' ? 'Wide · 1200×630' : 'Square · 1080×1080'}
          </button>
        ))}
      </div>

      <div className={s.preview} data-format={format}>
        {card && card.format === format ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.url} alt="Share card with the live CATANA creator-fee total" className={s.img} />
        ) : failed ? (
          <p className={s.fail}>The card could not be drawn. Try again in a moment.</p>
        ) : (
          <span className={s.drawing}>Drawing with live numbers…</span>
        )}
      </div>

      <div className={s.actions}>
        {canShare && (
          <button type="button" className="btn btn-primary" onClick={share} disabled={!card}>
            <ShareIcon size={17} />
            Share
          </button>
        )}
        {canCopy && (
          <button type="button" className={`btn ${canShare ? '' : 'btn-primary'}`} onClick={copyImage} disabled={!card}>
            {done === 'copied' ? <CheckIcon size={17} /> : <CopyIcon size={17} />}
            {done === 'copied' ? 'Copied' : 'Copy image'}
          </button>
        )}
        <a
          className={`btn ${canShare || canCopy ? '' : 'btn-primary'}`}
          href={card?.url}
          download={`catana-${format}.png`}
          aria-disabled={!card}
          onClick={(e) => !card && e.preventDefault()}
        >
          <DownloadIcon size={17} />
          Download
        </a>
      </div>
      <p className={s.caption} aria-live="polite">
        {done === 'shared' ? 'Shared.' : 'Numbers are drawn the moment you open this: market from DexScreener, fees from Solana.'}
      </p>
    </div>
  );
}
