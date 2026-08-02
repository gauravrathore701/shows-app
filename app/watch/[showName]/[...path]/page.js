'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

// hls.js defaults stop fetching ~30s / 60MB ahead, which shows up as "loads a
// bit, then waits". Keep ~5 min buffered ahead instead; the byte cap must be
// raised too or it kicks in first at these durations.
function onProviderChange(provider) {
  if (isHLSProvider(provider)) {
    provider.config = {
      maxBufferLength: 300,
      maxMaxBufferLength: 600,
      maxBufferSize: 200 * 1000 * 1000,
      backBufferLength: 90, // free memory behind playhead (mobile tabs); server re-serves cached segments on rewind
    };
  }
}

export default function WatchPage({ params }) {
  const { showName, path } = use(params);
  const decodedShow = decodeURIComponent(showName);
  const decodedPath = path.map(decodeURIComponent);

  const isSeasonal = decodedPath.length >= 2;
  const decodedSeason = isSeasonal ? decodedPath[0] : null;
  const decodedEp = isSeasonal ? decodedPath[1] : decodedPath[0];

  const epTitle = decodedEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');

  // Movie convention is "<Title (Year)>/<Title (Year)>.<ext>", so a flat show whose
  // file name matches its folder is a single-file movie — no episode list to link back to.
  const isMovie = !isSeasonal && epTitle === decodedShow;

  // HEVC/x265 files are transcoded server-side and served as HLS (segment-on-demand)
  // → real seeking + resilience. Everything else is a browser-native container, served
  // directly with byte-range seeking.
  const isHevc = /x265|hevc|h\.?265/i.test(decodedEp);
  const fileUrl = `/api/stream/${encodeURIComponent(decodedShow)}/${decodedPath.map(encodeURIComponent).join('/')}`;
  const src = isHevc
    ? { src: `${fileUrl}/index.m3u8`, type: 'application/x-mpegurl' }
    : fileUrl;

  const watchKey = isSeasonal ? `${decodedShow}/${decodedSeason}` : decodedShow;
  const seasonHref = isSeasonal ? `/show/${showName}/${encodeURIComponent(decodedSeason)}` : null;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lastWatched') || '{}');
      stored[watchKey] = decodedEp;
      localStorage.setItem('lastWatched', JSON.stringify(stored));
    } catch {}
  }, [watchKey, decodedEp]);

  return (
    <div className="watch-page">
      <nav className="nav">
        <Link href="/" className="nav-logo">🎬 Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        {isMovie ? (
          <span className="nav-title">{decodedShow}</span>
        ) : (
          <>
            <Link href={`/show/${showName}`} className="nav-title">{decodedShow}</Link>
            {isSeasonal && (
              <>
                <span className="nav-sep">›</span>
                <Link href={seasonHref} className="nav-title">{decodedSeason}</Link>
              </>
            )}
            <span className="nav-sep">›</span>
            <span className="nav-title">{epTitle}</span>
          </>
        )}
      </nav>
      <div className="video-wrap">
        <MediaPlayer
          title={epTitle}
          src={src}
          autoPlay
          playsInline
          streamType="on-demand"
          load="eager"
          onProviderChange={onProviderChange}
          aspectRatio="16/9"
          className="vds-player"
        >
          <MediaProvider />
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      </div>
      <div className="watch-info">
        <div className="watch-show-name">
          {isSeasonal ? `${decodedShow} › ${decodedSeason}` : decodedShow}
        </div>
        {!isMovie && <div className="watch-ep-name">{epTitle}</div>}
        <div className="watch-nav">
          {isSeasonal && (
            <>
              <Link href={seasonHref} className="btn-nav">☰ All Episodes</Link>
              <Link href={`/show/${showName}`} className="btn-nav">📺 Seasons</Link>
            </>
          )}
          {!isSeasonal && !isMovie && (
            <Link href={`/show/${showName}`} className="btn-nav">☰ All Episodes</Link>
          )}
          <Link href="/" className="btn-nav">⌂ Library</Link>
        </div>
      </div>
    </div>
  );
}
