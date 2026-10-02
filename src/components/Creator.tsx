'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { countCompact } from '@/lib/format';
import type { CreatorData } from '@/lib/types';
import { ArrowUpRight, InstagramIcon, PlayIcon } from './icons';
import { Reveal } from './Reveal';
import s from './Creator.module.css';

export function Creator({ data }: { data: CreatorData }) {
  const reel = data.reel;
  const stats = [
    { label: 'Followers', value: data.followers },
    { label: 'Reel views', value: reel?.views ?? null },
    { label: 'Reel likes', value: reel?.likes ?? null },
  ].filter((x): x is { label: string; value: number } => x.value != null);

  return (
    <section id="creator" className={s.section} aria-labelledby="creator-title">
      <div className={`wrap ${s.grid}`}>
        <Reveal className={s.media}>{reel ? <ReelFrame reel={reel} /> : <ArtFrame />}</Reveal>

        <Reveal className={s.copy} delay={0.08}>
          <p className={s.kicker}>The creator</p>
          <h2 id="creator-title" className={`display ${s.handle}`}>
            @{data.handle}
          </h2>
          <div className={s.who}>
            {data.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" width={44} height={44} className={s.avatar} referrerPolicy="no-referrer" loading="lazy" />
            )}
            <div>
              {data.name && <p className={s.name}>{data.name}</p>}
              {data.bio && <p className={s.bio}>&ldquo;{data.bio}&rdquo;</p>}
            </div>
          </div>

          <p className={s.lede}>
            {reel
              ? 'The sword cat comes from this reel. The coin links to it; the art on this page is the coin’s own image.'
              : 'The sword cat comes from @numanuk on Instagram.'}
          </p>

          {stats.length > 0 && (
            <dl className={s.stats}>
              {stats.map((x) => (
                <div key={x.label}>
                  <dt className="label">{x.label}</dt>
                  <dd className="num">{countCompact(x.value)}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={s.actions}>
            <a className="btn btn-primary" href={data.profileUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon size={17} />
              Follow on Instagram
            </a>
            {reel && (
              <a className="link" href={reel.url} target="_blank" rel="noopener noreferrer">
                Watch the reel <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          {stats.length > 0 && <p className={s.source}>Counts as reported by Instagram.</p>}
        </Reveal>
      </div>
    </section>
  );
}

function ReelFrame({ reel }: { reel: NonNullable<CreatorData['reel']> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Muted loop while on screen; paused (and not downloaded) otherwise.
  useEffect(() => {
    const v = video.current;
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().then(() => setPlaying(true), () => setPlaying(false));
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <a className={s.frame} href={reel.url} target="_blank" rel="noopener noreferrer" aria-label="Watch the Sword Cat reel by @numanuk on Instagram">
      {reel.videoUrl && !videoFailed ? (
        <video
          ref={video}
          className={s.video}
          src={reel.videoUrl}
          poster={reel.imageUrl ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          onError={() => setVideoFailed(true)}
          aria-hidden
        />
      ) : reel.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.video} src={reel.imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" />
      ) : (
        <ArtFrame />
      )}
      <span className={s.shade} />
      <span className={s.overlay}>
        {!playing && (
          <span className={s.play}>
            <PlayIcon size={16} />
          </span>
        )}
        <span>
          <span className={s.overTitle}>Instagram reel</span>
          {reel.caption && <span className={s.overCaption}>{reel.caption}</span>}
        </span>
      </span>
    </a>
  );
}

function ArtFrame() {
  return (
    <div className={s.art}>
      <Image src="/art/catana.webp" alt="" width={704} height={1209} sizes="320px" className={s.artImg} />
    </div>
  );
}
