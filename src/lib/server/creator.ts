import 'server-only';
import { CREATOR, LINKS } from '../config';
import type { CreatorData, CreatorReel } from '../types';
import { fetchWithTimeout, memo } from './cache';

/**
 * INSTAGRAM, WITHOUT SCRAPING TRICKS.
 *
 * Two public documents Instagram itself serves to link previews and embeds:
 *   - the profile page's Open Graph tags (name, avatar, bio line)
 *   - the official embed page of the reel the token links to (cover, video,
 *     views, likes, caption, follower count of the owner)
 * Both are read server-side, cached for hours, and every field is optional:
 * if Instagram refuses, the section degrades to a plain link. Nothing here
 * is ever filled with a placeholder.
 */

const PREVIEW_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const meta = (html: string, key: string) => {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]+content="([^"]*)"`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${key}"`, 'i'));
  return m ? decode(m[1]) : null;
};

const isIgCdn = (u: unknown): u is string => {
  if (typeof u !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === 'https:' && (hostname.endsWith('.cdninstagram.com') || hostname.endsWith('.fbcdn.net'));
  } catch {
    return false;
  }
};

async function profile() {
  const res = await fetchWithTimeout(`https://www.instagram.com/${CREATOR.handle}/`, {
    headers: { 'user-agent': PREVIEW_UA, 'accept-language': 'en-US,en;q=0.9' },
    timeoutMs: 7000,
  });
  if (!res.ok) return null;
  const html = await res.text();
  const title = meta(html, 'og:title'); // "Numan Khan (@numanuk) • Instagram photos and videos"
  if (!title || !title.toLowerCase().includes(`@${CREATOR.handle}`)) return null;
  const name = title.match(/^(.*?)\s*\(@/)?.[1]?.trim() || null;
  // description: '… - Numan Khan (@numanuk) on Instagram: "learn how to make images like me 👇"'
  const bio = meta(html, 'description')?.match(/on Instagram:\s*"([\s\S]*)"\s*$/)?.[1]?.trim() || null;
  const avatar = meta(html, 'og:image');
  return { name, bio, avatarUrl: isIgCdn(avatar) ? avatar : null };
}

type EmbedMedia = {
  display_url?: string;
  video_url?: string;
  video_view_count?: number;
  edge_liked_by?: { count?: number };
  edge_media_to_caption?: { edges?: { node?: { text?: string } }[] };
  owner?: { username?: string; profile_pic_url?: string; edge_followed_by?: { count?: number } };
};

async function reel() {
  const url = `https://www.instagram.com/reel/${CREATOR.reelShortcode}/`;
  const res = await fetchWithTimeout(`${url}embed/captioned/`, {
    headers: { 'user-agent': PREVIEW_UA, 'accept-language': 'en-US,en;q=0.9' },
    timeoutMs: 8000,
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/"contextJSON":"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  let media: EmbedMedia | undefined;
  try {
    media = (JSON.parse(JSON.parse(`"${m[1]}"`)) as { gql_data?: { shortcode_media?: EmbedMedia } }).gql_data?.shortcode_media;
  } catch {
    return null;
  }
  if (!media || media.owner?.username !== CREATOR.handle) return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const out: CreatorReel = {
    url,
    imageUrl: isIgCdn(media.display_url) ? media.display_url : null,
    videoUrl: isIgCdn(media.video_url) ? media.video_url : null,
    views: n(media.video_view_count),
    likes: n(media.edge_liked_by?.count),
    caption: media.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() || null,
  };
  return {
    reel: out,
    followers: n(media.owner?.edge_followed_by?.count),
    avatarUrl: isIgCdn(media.owner?.profile_pic_url) ? media.owner.profile_pic_url : null,
  };
}

async function load(): Promise<CreatorData> {
  const [p, r] = await Promise.allSettled([profile(), reel()]);
  const pv = p.status === 'fulfilled' ? p.value : null;
  const rv = r.status === 'fulfilled' ? r.value : null;
  // Throwing lets the memo keep serving the last good answer instead of caching a blank.
  if (!pv && !rv) throw new Error('instagram unavailable');
  return {
    handle: CREATOR.handle,
    profileUrl: LINKS.instagram,
    name: pv?.name ?? null,
    bio: pv?.bio ?? null,
    avatarUrl: pv?.avatarUrl ?? rv?.avatarUrl ?? null,
    followers: rv?.followers ?? null,
    reel: rv?.reel ?? null,
    fetchedAt: Date.now(),
  };
}

/** The section's fallback: the handle and the link, nothing invented. */
export const creatorFallback = (): CreatorData => ({
  handle: CREATOR.handle,
  profileUrl: LINKS.instagram,
  name: null,
  bio: null,
  avatarUrl: null,
  followers: null,
  reel: null,
  fetchedAt: Date.now(),
});

/**
 * Six hours: Instagram's CDN links are signed for days, and these numbers
 * do not need to be fresher than a feed would show them.
 */
export async function getCreator(): Promise<CreatorData> {
  return memo('creator', 6 * 3600_000, load, 48 * 3600_000).catch(creatorFallback);
}
