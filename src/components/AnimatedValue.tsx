'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shows format(value) exactly. When a refresh brings a different value the
 * new number appears at once and is tinted for a moment (up/down). No
 * count-up and no in-between numbers: only retrieved values are ever shown.
 */
export function AnimatedValue({ value, format, className }: { value: number | null; format: (v: number | null) => string; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; key: number } | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (value == null || before == null || format(before) === format(value)) return;
    setFlash({ dir: value > before ? 'up' : 'down', key: Date.now() });
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [value, format]);

  return (
    <span key={flash?.key} className={className} data-flash={flash?.dir}>
      {format(value)}
    </span>
  );
}
