const LAMPORTS = 1_000_000_000;

export const toSol = (lamports: number) => lamports / LAMPORTS;

/** $428.3K, $1.24M, $912 */
export function usdCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `$${trim(v / 1e9, 2)}B`;
  if (a >= 1e6) return `$${trim(v / 1e6, 2)}M`;
  if (a >= 1e3) return `$${trim(v / 1e3, 1)}K`;
  return `$${v.toFixed(0)}`;
}

export function usd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function trim(n: number, digits: number) {
  return n.toFixed(digits).replace(/\.0+$|(\.\d*?)0+$/, '$1');
}

/**
 * Memecoin prices: $0.00001583 reads badly, so tiny prices keep 4 significant
 * digits and use the subscript-zero notation traders know: $0.0₄1583.
 */
export function price(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  const exp = Math.floor(Math.log10(v));
  const zeros = -exp - 1;
  const sig = Math.round(v / 10 ** (exp - 3)).toString().slice(0, 4);
  if (zeros < 4) return `$0.${'0'.repeat(zeros)}${sig}`;
  const sub = String(zeros)
    .split('')
    .map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
    .join('');
  return `$0.0${sub}${sig}`;
}

export function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s.replace('-', '')}%`;
}

/** SOL with precision that fits the size: 40.93, 0.225, 0.0041 */
export function sol(lamports: number | null | undefined, opts: { digits?: number } = {}): string {
  if (lamports == null || !Number.isFinite(lamports)) return '—';
  const v = toSol(lamports);
  const digits = opts.digits ?? (v >= 100 ? 1 : v >= 1 ? 2 : v >= 0.01 ? 3 : 4);
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function countCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v >= 1e6) return `${trim(v / 1e6, 2)}M`;
  if (v >= 1e4) return `${trim(v / 1e3, 0)}K`;
  if (v >= 1e3) return `${trim(v / 1e3, 1)}K`;
  return String(v);
}

export function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
/** Fixed UTC so server and client render the same string (no hydration drift). */
export const stamp = (ts: number) => ({ date: dateFmt.format(ts).toUpperCase(), time: `${timeFmt.format(ts)} UTC` });
