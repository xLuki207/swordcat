import { getFees } from '@/lib/server/fees';
import { cachedJson, settle } from '@/lib/server/respond';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const r = await settle(getFees());
  return cachedJson(r, r.data ? 60 : 10, 300, r.data ? 200 : 503);
}
