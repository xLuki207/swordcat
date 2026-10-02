import { getMarket } from '@/lib/server/market';
import { cachedJson, settle } from '@/lib/server/respond';

export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await settle(getMarket());
  return cachedJson(r, r.data ? 10 : 5, 30, r.error === 'unavailable' ? 503 : 200);
}
