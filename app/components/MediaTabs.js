'use client';

// Episodes / Manga toggle. Only rendered when the show actually has a
// Manga/ folder — a show with no chapters gets the plain episode list, so
// nothing changes for the other 40 folders on the HDD.
import { useEffect, useState } from 'react';

import EpisodesList from './EpisodesList';
import ChaptersList from './ChaptersList';

const KEY = 'mediaTab';

function readTab(show) {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')[show] || null;
  } catch {
    return null;
  }
}

function writeTab(show, tab) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    stored[show] = tab;
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {}
}

export default function MediaTabs({ episodes, chapters, showName }) {
  const [tab, setTab] = useState('episodes');

  // Remember the last surface per show, so someone reading the manga does not
  // land on the episode list every time.
  useEffect(() => {
    const saved = readTab(showName);
    if (saved === 'episodes' || saved === 'manga') setTab(saved);
  }, [showName]);

  function pick(next) {
    setTab(next);
    writeTab(showName, next);
  }

  return (
    <>
      <div className="tabs">
        <button
          className={`tab${tab === 'episodes' ? ' tab-active' : ''}`}
          onClick={() => pick('episodes')}
        >
          📺 Episodes <span className="tab-count">{episodes.length}</span>
        </button>
        <button
          className={`tab${tab === 'manga' ? ' tab-active' : ''}`}
          onClick={() => pick('manga')}
        >
          📖 Manga <span className="tab-count">{chapters.length}</span>
        </button>
      </div>

      {tab === 'manga'
        ? <ChaptersList chapters={chapters} showName={showName} />
        : <EpisodesList episodes={episodes} showName={showName} />}
    </>
  );
}
