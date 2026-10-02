import 'server-only';
import type { Loaded } from '../types';

/** CDN-cached JSON: the edge answers repeat visitors, the function runs at most once per window. */
export function cachedJson(body: unknown, sMaxAge: number, swr: number, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}` },
  });
}

export async function settle<T>(p: Promise<T | null>): Promise<Loaded<T>> {
  try {
    const data = await p;
    return { data, error: data ? null : 'not-found' };
  } catch {
    // Provider messages can contain URLs; never forward them.
    return { data: null, error: 'unavailable' };
  }
}
