'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function WatchPage({ params }) {
  const { showName, path } = use(params);
  const decodedShow = decodeURIComponent(showName);
  const decodedPath = path.map(decodeURIComponent);

  const isSeasonal = decodedPath.length >= 2;
  const decodedSeason = isSeasonal ? decodedPath[0] : null;
  const decodedEp = isSeasonal ? decodedPath[1] : decodedPath[0];

  const streamUrl = `/api/stream/${encodeURIComponent(decodedShow)}/${decodedPath.map(encodeURIComponent).join('/')}`;
  const epTitle = decodedEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
  // HEVC/x265 files are transcoded server-side to H.264 MP4 — tell the browser to expect MP4
  const isHevc = /x265|hevc|h\.?265/i.test(decodedEp);
  const mimeType = isHevc ? 'video/mp4' : /\.mkv$/i.test(decodedEp) ? 'video/x-matroska' : /\.webm$/i.test(decodedEp) ? 'video/webm' : 'video/mp4';

  const videoRef = useRef(null);
  const watchKey = isSeasonal ? `${decodedShow}/${decodedSeason}` : decodedShow;
  const seasonHref = isSeasonal ? `/show/${showName}/${encodeURIComponent(decodedSeason)}` : null;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lastWatched') || '{}');
      stored[watchKey] = decodedEp;
      localStorage.setItem('lastWatched', JSON.stringify(stored));
    } catch {}
  }, [watchKey, decodedEp]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [streamUrl]);

  return (
    <div className="watch-page">
      <nav className="nav">
        <Link href="/" className="nav-logo">🎬 Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        <Link href={`/show/${showName}`} className="nav-title">{decodedShow}</Link>
        {isSeasonal && (
          <>
            <span className="nav-sep">›</span>
            <Link href={seasonHref} className="nav-title">{decodedSeason}</Link>
          </>
        )}
        <span className="nav-sep">›</span>
        <span className="nav-title">{epTitle}</span>
      </nav>
      <div className="video-wrap">
        <video ref={videoRef} controls autoPlay playsInline preload="metadata">
          <source src={streamUrl} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="watch-info">
        <div className="watch-show-name">
          {isSeasonal ? `${decodedShow} › ${decodedSeason}` : decodedShow}
        </div>
        <div className="watch-ep-name">{epTitle}</div>
        <div className="watch-nav">
          {isSeasonal ? (
            <>
              <Link href={seasonHref} className="btn-nav">☰ All Episodes</Link>
              <Link href={`/show/${showName}`} className="btn-nav">📺 Seasons</Link>
            </>
          ) : (
            <Link href={`/show/${showName}`} className="btn-nav">☰ All Episodes</Link>
          )}
          <Link href="/" className="btn-nav">⌂ Library</Link>
        </div>
      </div>
    </div>
  );
}
