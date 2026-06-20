'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function WatchPage({ params }) {
  const { showName, episode } = use(params);
  const decodedShow = decodeURIComponent(showName);
  const decodedEp = decodeURIComponent(episode);
  const videoRef = useRef(null);

  const streamUrl = `/api/stream/${encodeURIComponent(decodedShow)}/${encodeURIComponent(decodedEp)}`;
  const epTitle = decodedEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
  const mimeType = /\.mkv$/i.test(decodedEp) ? 'video/x-matroska' : /\.webm$/i.test(decodedEp) ? 'video/webm' : 'video/mp4';

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
        <span className="nav-sep">›</span>
        <span className="nav-title" style={{ color: '#b48cff' }}>{epTitle}</span>
      </nav>
      <div className="video-wrap">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          preload="metadata"
        >
          <source src={streamUrl} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="watch-info">
        <div className="watch-show-name">{decodedShow}</div>
        <div className="watch-ep-name">{epTitle}</div>
        <div className="watch-nav">
          <Link href={`/show/${showName}`} className="btn-nav">
            ☰ All Episodes
          </Link>
          <Link href="/" className="btn-nav">
            ⌂ Library
          </Link>
        </div>
      </div>
    </div>
  );
}
