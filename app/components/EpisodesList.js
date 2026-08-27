'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { fetchProgress, readLocal } from '../lib/progress';

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

function formatSize(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

export default function EpisodesList({ episodes, showName, watchBase }) {
  const [lastWatched, setLastWatched] = useState(null);
  // path -> { position, duration, finished }
  const [progress, setProgress] = useState({});

  // For flat shows watchBase is not passed — default to /watch/<showName>
  const base = watchBase ?? `/watch/${encodeURIComponent(showName)}`;

  useEffect(() => {
    let cancelled = false;

    // Paint the local guess immediately, then let the server answer overwrite it —
    // the server is the cross-device truth, localStorage only covers this browser.
    setLastWatched(readLocal(showName));
    setProgress({});

    fetchProgress(showName).then((items) => {
      if (cancelled) return;
      if (items.length === 0) return;
      const map = {};
      for (const it of items) map[it.path] = it;
      setProgress(map);
      setLastWatched(items[0].path); // API returns newest first
    });

    return () => { cancelled = true; };
  }, [showName]);

  return (
    <div className="episodes-list">
      {episodes.map((ep, i) => {
        const isLast = lastWatched === ep.name;
        const p = progress[ep.name];
        const pct = p && p.duration > 0
          ? Math.min(100, Math.round((p.position / p.duration) * 100))
          : 0;
        const showBar = !!p && !p.finished && pct > 0;
        return (
          <Link
            key={ep.name}
            href={`${base}/${encodeURIComponent(ep.name)}`}
          >
            <div className={`episode-card${isLast ? ' ep-last-watched' : ''}`}>
              <span className="ep-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="ep-play">▶</div>
              <span className="ep-name">
                {ep.name.replace(VIDEO_EXT, '')}
                {showBar && (
                  <span className="ep-progress" title={`${pct}% watched`}>
                    <span className="ep-progress-fill" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              {p?.finished && <span className="ep-done" title="Finished">✓</span>}
              <span className="ep-size">{formatSize(ep.size)}</span>
              {isLast && <span className="ep-last-badge">Last Watched</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
