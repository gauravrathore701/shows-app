'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

import { fetchProgress, saveProgress, writeLocal } from '../../../lib/progress';

// How often the playhead is pushed to the server while playing.
const SAVE_EVERY_SEC = 15;
// Below this the resume prompt is pointless; near the end we restart instead.
const RESUME_MIN_SEC = 30;
const RESUME_MAX_RATIO = 0.95;

// hls.js defaults stop fetching ~30s / 60MB ahead, which shows up as "loads a
// bit, then waits". Keep ~5 min buffered ahead instead; the byte cap must be
// raised too or it kicks in first at these durations.
function tuneProvider(provider) {
  if (provider && isHLSProvider(provider)) {
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

  // Files the browser can't decode (HEVC, 10-bit, Opus/DTS/AC3 audio) are transcoded
  // server-side and served as HLS (segment-on-demand) → real seeking + resilience.
  // Everything else is served directly with byte-range seeking. The filename tells us
  // nothing reliable (Dororo is HEVC + Opus with a plain episode name), so the server
  // ffprobes the file and answers on /codec.json; the tag regex is only the first guess
  // while that request is in flight.
  const fileUrl = `/api/stream/${encodeURIComponent(decodedShow)}/${decodedPath.map(encodeURIComponent).join('/')}`;
  const [useHls, setUseHls] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${fileUrl}/codec.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setUseHls(d ? !!d.hls : /x265|hevc|h\.?265/i.test(decodedEp)); })
      .catch(() => { if (!cancelled) setUseHls(/x265|hevc|h\.?265/i.test(decodedEp)); });
    return () => { cancelled = true; };
  }, [fileUrl, decodedEp]);

  const src = useHls
    ? { src: `${fileUrl}/index.m3u8`, type: 'application/x-mpegurl' }
    : fileUrl;

  const watchKey = isSeasonal ? `${decodedShow}/${decodedSeason}` : decodedShow;
  const seasonHref = isSeasonal ? `/show/${showName}/${encodeURIComponent(decodedSeason)}` : null;

  // Progress is read off the native <video> element rather than the player's own
  // state, so nothing here depends on vidstack's event-detail shapes.
  const video = useRef(null);
  const lastSent = useRef(0);
  const resumeAt = useRef(0);
  const resumed = useRef(false);
  const canPlayed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Mirror locally right away so the episode list is right even if the API is down.
    writeLocal(watchKey, decodedEp);
    resumed.current = false;
    canPlayed.current = false;
    lastSent.current = 0;
    resumeAt.current = 0;

    // Playback never waits on this request — whichever lands last (the answer or
    // `canplay`) performs the seek, so a slow or dead API just means no resume.
    fetchProgress(watchKey)
      .then((items) => {
        if (cancelled) return;
        const mine = items.find((it) => it.path === decodedEp);
        if (!mine || mine.finished || !(mine.duration > 0)) return;
        const ratio = mine.position / mine.duration;
        if (mine.position > RESUME_MIN_SEC && ratio < RESUME_MAX_RATIO) {
          resumeAt.current = mine.position;
          if (canPlayed.current) seekToResume();
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [watchKey, decodedEp]);

  const push = useCallback((finished) => {
    const v = video.current;
    if (!v) return;
    const position = v.currentTime || 0;
    const duration = Number.isFinite(v.duration) ? v.duration : 0;
    if (!duration) return;
    lastSent.current = position;
    saveProgress({ show: watchKey, path: decodedEp, position, duration, finished });
  }, [watchKey, decodedEp]);

  // Leaving the tab / backgrounding the app is the most common way a watch ends.
  useEffect(() => {
    const flush = () => push(false);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [push]);

  function seekToResume() {
    if (resumed.current) return;
    const v = video.current;
    if (!v || !(resumeAt.current > 0)) return;
    resumed.current = true;
    v.currentTime = resumeAt.current;
  }

  // `provider.video` only exists once the provider is set up, so capture it in
  // both callbacks and keep whichever arrives first.
  function captureVideo(provider) {
    video.current = provider?.video ?? video.current ?? null;
  }

  function onProviderChange(provider) {
    tuneProvider(provider);
    captureVideo(provider);
  }

  function onCanPlay() {
    canPlayed.current = true;
    seekToResume();
  }

  function onTimeUpdate() {
    const v = video.current;
    if (!v) return;
    if (Math.abs(v.currentTime - lastSent.current) < SAVE_EVERY_SEC) return;
    push(false);
  }

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
        {useHls === null ? null : (
        <MediaPlayer
          title={epTitle}
          src={src}
          autoPlay
          playsInline
          streamType="on-demand"
          load="eager"
          onProviderChange={onProviderChange}
          onProviderSetup={captureVideo}
          onCanPlay={onCanPlay}
          onTimeUpdate={onTimeUpdate}
          onPause={() => push(false)}
          onEnded={() => push(true)}
          aspectRatio="16/9"
          className="vds-player"
        >
          <MediaProvider />
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
        )}
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
