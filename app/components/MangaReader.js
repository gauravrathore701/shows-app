'use client';

// Vertical scrolling reader, built for the phone: one column, full width,
// lazy images, and an IntersectionObserver that records which page is on
// screen so the chapter can be resumed later.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { readMangaProgress, writeMangaProgress } from '../lib/mangaProgress';

export default function MangaReader({ showName, chapter, pageCount, chapterNum, chapterTitle, prev, next }) {
  const [current, setCurrent] = useState(0);
  const [resumeAt, setResumeAt] = useState(null);
  const pageRefs = useRef([]);

  const base = `/api/manga/${encodeURIComponent(showName)}/${encodeURIComponent(chapter)}`;

  // Offer a jump back only when the saved position is worth returning to.
  useEffect(() => {
    const saved = readMangaProgress(showName)[chapter];
    if (saved && saved.page > 0 && saved.page + 1 < pageCount) setResumeAt(saved.page);
  }, [showName, chapter, pageCount]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        // The most-visible page wins, so a tall double spread does not flicker.
        let best = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;
        const idx = Number(best.target.dataset.page);
        setCurrent(idx);
        writeMangaProgress(showName, chapter, idx, pageCount);
      },
      { threshold: [0.25, 0.5, 0.75] }
    );

    for (const el of pageRefs.current) if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [showName, chapter, pageCount]);

  function jumpTo(idx) {
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'auto', block: 'start' });
    setResumeAt(null);
  }

  return (
    <div className="reader">
      <nav className="nav reader-nav">
        <Link href={`/show/${encodeURIComponent(showName)}`} className="nav-logo">‹ {showName}</Link>
        <span className="nav-sep">›</span>
        <span className="nav-title">
          Chapter {chapterNum ?? chapter}{chapterTitle ? ` - ${chapterTitle}` : ''}
        </span>
      </nav>

      {resumeAt !== null && (
        <button className="reader-resume" onClick={() => jumpTo(resumeAt)}>
          Continue from page {resumeAt + 1}
        </button>
      )}

      <div className="reader-pages">
        {Array.from({ length: pageCount }, (_, i) => (
          <img
            key={i}
            ref={el => { pageRefs.current[i] = el; }}
            data-page={i}
            src={`${base}/${i}`}
            alt={`Page ${i + 1}`}
            className="reader-page"
            loading={i < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>

      <div className="reader-end">
        {prev ? (
          <Link className="reader-btn" href={`/read/${encodeURIComponent(showName)}/${encodeURIComponent(prev.name)}`}>
            ‹ Ch {prev.num}
          </Link>
        ) : <span className="reader-btn reader-btn-off">‹ Ch</span>}

        <Link className="reader-btn" href={`/show/${encodeURIComponent(showName)}`}>Chapters</Link>

        {next ? (
          <Link className="reader-btn reader-btn-primary" href={`/read/${encodeURIComponent(showName)}/${encodeURIComponent(next.name)}`}>
            Ch {next.num} ›
          </Link>
        ) : <span className="reader-btn reader-btn-off">Ch ›</span>}
      </div>

      <div className="reader-counter">{current + 1} / {pageCount}</div>
    </div>
  );
}
