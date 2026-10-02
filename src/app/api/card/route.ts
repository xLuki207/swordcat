import { renderCard, type CardFormat } from '@/lib/server/card';
import { getFees } from '@/lib/server/fees';
import { getMarket } from '@/lib/server/market';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** The share card, drawn from the live numbers at request time. */
export async function GET(req: Request) {
  const format: CardFormat = new URL(req.url).searchParams.get('format') === 'square' ? 'square' : 'wide';
  const [market, fees] = await Promise.all([getMarket().catch(() => null), getFees().catch(() => null)]);
  const img = await renderCard(format, market, fees);
  img.headers.set('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return img;
}
