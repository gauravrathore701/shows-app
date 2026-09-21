'use client';

// Chapter rows for a show's Manga/ folder. Reading position is local-only for
// now (localStorage, this browser) — video progress goes through mecca-api and
// Mongo, manga does not have a server-side store yet.
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { readMangaProgress } from '../lib/mangaProgress';

function formatSize(bytes) {
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

export default function ChaptersList({ chapters, showName }) {
  const [progress, setProgress] = useState({});
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    setProgress(readMangaProgress(showName));
  }, [showName]);

  if (chapters.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📭</div>
        <div className="empty-text">No chapters in this show&apos;s Manga folder.</div>
      </div>
    );
  }

  const ordered = newestFirst ? [...chapters].reverse() : chapters;
  const lastRead = progress.__last || null;

  return (
    <>
      <div className="chapter-toolbar">
        <span className="chapter-count">{chapters.length} chapters</span>
        <button className="chapter-sort" onClick={() => setNewestFirst(v => !v)}>
          {newestFirst ? 'Newest first ↓' : 'Oldest first ↑'}
        </button>
      </div>

      <div className="episodes-list">
        {ordered.map(ch => {
          const p = progress[ch.name];
          const pct = p && p.pages > 0
            ? Math.min(100, Math.round(((p.page + 1) / p.pages) * 100))
            : 0;
          const done = !!p && p.pages > 0 && p.page + 1 >= p.pages;
          const isLast = lastRead === ch.name;
          return (
            <Link
              key={ch.name}
              href={`/read/${encodeURIComponent(showName)}/${encodeURIComponent(ch.name)}`}
            >
              <div className={`episode-card${isLast ? ' ep-last-watched' : ''}`}>
                <span className="ep-num">{ch.num ?? '—'}</span>
                <div className="ep-play">📖</div>
                <span className="ep-name">
                  {ch.title
                    ? `Chapter ${ch.num} - ${ch.title}`
                    : `Chapter ${ch.num ?? ch.name}`}
                  {pct > 0 && !done && (
                    <span className="ep-progress" title={`page ${p.page + 1} of ${p.pages}`}>
                      <span className="ep-progress-fill" style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </span>
                {done && <span className="ep-done" title="Finished">✓</span>}
                <span className="ep-size">{formatSize(ch.size)}</span>
                {isLast && <span className="ep-last-badge">Last Read</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
