import { getCreator } from '@/lib/server/creator';
import { cachedJson } from '@/lib/server/respond';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getCreator();
  const live = Boolean(data.reel || data.name);
  return cachedJson({ data, error: null }, live ? 3600 : 300, 6 * 3600);
}
