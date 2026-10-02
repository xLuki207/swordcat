'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders format(value), tweening from the previous value when it changes.
 * The first render is the real value (no count-up from zero on load: that
 * would show numbers that are not true for a second).
 */
export function AnimatedValue({ value, format, className }: { value: number | null; format: (v: number | null) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value == null || start == null || start === value) {
      setShown(value);
      return;
    }
    setFlash(value > start ? 'up' : 'down');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 700;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const clear = setTimeout(() => setFlash(null), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
  }, [value]);

  return (
    <span className={className} data-flash={flash ?? undefined}>
      {format(shown)}
    </span>
  );
}
