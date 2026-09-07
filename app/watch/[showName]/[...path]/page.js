'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

import { fetchProgress, saveProgress, writeLocal } from '../../../lib/progress';

// How often the playhead is pushed to the server while playing.
const SAVE_EVERY_SEC = 15;
// Below this the resume prompt is pointless; near the end we restart instead.
const RESUME_MIN_SEC = 30;
// How close to the end still counts as "it finished". Some files stop a beat
// early, so this cannot be zero — but it must stay far smaller than an episode.
const END_SLACK_SEC = 15;
const RESUME_MAX_RATIO = 0.95;
// Netflix-style next-episode card: appears this many seconds before the end and
// counts down to an automatic jump.
const NEXT_UP_SEC = 10;

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

  const epFile = decodedEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');

  // Number from the filename: SxxEyy when present, otherwise the last number
  // in the name, which is what absolute-numbered anime uses.
  const epNum = (() => {
    const se = decodedEp.match(/S\d{1,2}E(\d{1,4})/i);
    if (se) return String(Number(se[1])).padStart(2, '0');
    const tail = epFile.match(/(\d{1,4})\D*$/);
    return tail ? String(Number(tail[1])).padStart(2, '0') : null;
  })();

  // Filled from /api/episodes once it answers. Until then the filename is
  // shown, so the header never sits empty while the request is in flight.
  const [epName, setEpName] = useState(null);
  const epTitle = epName || epFile;

  // Movie convention is "<Title (Year)>/<Title (Year)>.<ext>", so a flat show whose
  // file name matches its folder is a single-file movie — no episode list to link back to.
  const isMovie = !isSeasonal && epFile === decodedShow;

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
    // no-store: this answer decides HLS vs raw. A wrong one cached in the
    // browser (it used to ship max-age=86400 even when ffprobe had failed)
    // leaves every later visit fetching a raw HEVC file — a black player
    // that no reload can fix.
    fetch(`${fileUrl}/codec.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setUseHls(d ? !!d.hls : /x265|hevc|h\.?265/i.test(decodedEp)); })
      .catch(() => { if (!cancelled) setUseHls(/x265|hevc|h\.?265/i.test(decodedEp)); });
    return () => { cancelled = true; };
  }, [fileUrl, decodedEp]);

  // ── Next episode ────────────────────────────────────────────────────────
  // The watch page is a client component and knows only its own path, so the
  // sibling list comes from the API. Movies have no siblings worth fetching.
  const [nextEp, setNextEp] = useState(null);
  const [countdown, setCountdown] = useState(null);   // null = card hidden
  const [cancelled, setCancelled] = useState(false);
  const router = useRouter();
  const advanced = useRef(false);

  useEffect(() => {
    setNextEp(null);
    setEpName(null);   // otherwise the previous episode's title lingers
    setCountdown(null);
    setCancelled(false);
    advanced.current = false;
    if (isMovie) return;

    let stale = false;
    const listPath = isSeasonal
      ? `${encodeURIComponent(decodedShow)}/${encodeURIComponent(decodedSeason)}`
      : encodeURIComponent(decodedShow);

    fetch(`/api/episodes/${listPath}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stale || !d?.episodes?.length) return;
        // Same response carries the title map — no second request.
        const t = epNum && d.titles ? d.titles[epNum] : null;
        if (t) setEpName(`Episode ${epNum} - ${t}`);
        const i = d.episodes.indexOf(decodedEp);
        // -1 means the file vanished or was renamed; last episode has no next.
        if (i >= 0 && i < d.episodes.length - 1) setNextEp(d.episodes[i + 1]);
      })
      .catch(() => {});

    return () => { stale = true; };
  }, [decodedShow, decodedSeason, decodedEp, isSeasonal, isMovie, epNum]);

  const nextHref = nextEp
    ? (isSeasonal
        ? `/watch/${showName}/${encodeURIComponent(decodedSeason)}/${encodeURIComponent(nextEp)}`
        : `/watch/${showName}/${encodeURIComponent(nextEp)}`)
    : null;

  const nextTitle = nextEp ? nextEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') : '';

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

  // Declared after `push` so it can depend on it. Marks the episode finished
  // before navigating, otherwise the list still shows it as in-progress.
  const goNext = useCallback(() => {
    if (advanced.current || !nextHref) return;
    advanced.current = true;
    push(true);
    router.push(nextHref);
  }, [nextHref, push, router]);

  // Persistent next-episode control, dropped into vidstack's control bar
  // right after play/pause. Reuses goNext, so the watched-flag write and the
  // `advanced` guard behave exactly as they do for autoplay.
  const nextEpButton = nextHref ? (
    <button
      type="button"
      className="vds-button next-ep-button"
      aria-label="Next episode"
      title={nextTitle ? `Next: ${nextTitle}` : 'Next episode'}
      onClick={goNext}
    >
      <svg className="vds-icon" viewBox="0 0 24 24" aria-hidden="true"
           fill="currentColor" width="80%" height="80%">
        <path d="M6 5.5v13l9-6.5-9-6.5z" />
        <rect x="16.5" y="5.5" width="2" height="13" rx="1" />
      </svg>
    </button>
  ) : null;

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

    // The card is driven by the playhead, not a timer, so scrubbing backwards
    // hides it again and scrubbing forwards brings it straight back.
    if (nextHref && !cancelled && v.currentTime > 0 &&
        Number.isFinite(v.duration) && v.duration > 0) {
      const left = v.duration - v.currentTime;
      setCountdown(left <= NEXT_UP_SEC ? Math.max(0, Math.ceil(left)) : null);
    }

    if (Math.abs(v.currentTime - lastSent.current) < SAVE_EVERY_SEC) return;
    push(false);
  }

  // `ended` is what advances — the countdown is only the visible part. But on a
  // transcoded HLS stream `ended` is NOT trustworthy on its own: a failed
  // segment fetch, or a source that never loaded, fires it with the playhead
  // still at zero. That looked like "the episode skips itself the moment you
  // open it". So require that playback actually reached the end.
  function onEnded() {
    const v = video.current;
    const dur = v?.duration;
    const at = v?.currentTime ?? 0;
    const reallyEnded =
      canPlayed.current &&
      Number.isFinite(dur) && dur > 0 &&
      at >= dur - END_SLACK_SEC;
    if (!reallyEnded) return;
    push(true);
    if (nextHref && !cancelled) goNext();
  }

  return (
    <div className="watch-page">
      <nav className="nav">
        <Link href="/" className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</Link>
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
          onEnded={onEnded}
          aspectRatio="16/9"
          className="vds-player"
        >
          <MediaProvider />
          <DefaultVideoLayout
            icons={defaultLayoutIcons}
            slots={{ afterPlayButton: nextEpButton }}
          />
        </MediaPlayer>
        )}
        {countdown !== null && nextHref && !cancelled && (
          <div className="next-up" role="dialog" aria-label="Next episode">
            <div className="next-up-label">Next episode in {countdown}s</div>
            <div className="next-up-title">{nextTitle}</div>
            <div className="next-up-actions">
              <button type="button" className="next-up-play" onClick={goNext}>
                ▶ Play Now
              </button>
              <button
                type="button"
                className="next-up-cancel"
                onClick={() => { setCancelled(true); setCountdown(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
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
