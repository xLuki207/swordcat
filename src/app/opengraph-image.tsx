import { renderCard, CARD_SIZE } from '@/lib/server/card';
import { getFees } from '@/lib/server/fees';
import { getMarket } from '@/lib/server/market';

export const alt = 'CATANA — Sword Cat. Creator fees redirected, live.';
export const size = CARD_SIZE.wide;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function OpengraphImage() {
  const [market, fees] = await Promise.all([getMarket().catch(() => null), getFees().catch(() => null)]);
  return renderCard('wide', market, fees);
}
