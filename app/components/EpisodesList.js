'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

function formatSize(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

export default function EpisodesList({ episodes, showName, watchBase }) {
  const [lastWatched, setLastWatched] = useState(null);

  // For flat shows watchBase is not passed — default to /watch/<showName>
  const base = watchBase ?? `/watch/${encodeURIComponent(showName)}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lastWatched') || '{}');
      setLastWatched(stored[showName] || null);
    } catch {}
  }, [showName]);

  return (
    <div className="episodes-list">
      {episodes.map((ep, i) => {
        const isLast = lastWatched === ep.name;
        return (
          <Link
            key={ep.name}
            href={`${base}/${encodeURIComponent(ep.name)}`}
          >
            <div className={`episode-card${isLast ? ' ep-last-watched' : ''}`}>
              <span className="ep-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="ep-play">▶</div>
              <span className="ep-name">{ep.name.replace(VIDEO_EXT, '')}</span>
              <span className="ep-size">{formatSize(ep.size)}</span>
              {isLast && <span className="ep-last-badge">Last Watched</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
