'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const TABS = [
  { key: 'all',       label: 'All',       icon: '🏠' },
  { key: 'series',    label: 'Series',    icon: '📺' },
  { key: 'hollywood', label: 'Hollywood', icon: '🎬' },
  { key: 'bollywood', label: 'Bollywood', icon: '🎭' },
  { key: 'anime',     label: 'Anime',     icon: '🎌' },
];

// Movies are a single file — skip the episode list and open the player directly
function cardHref(show) {
  if (show.type?.startsWith('movie-') && show.videoFile) {
    return `/watch/${encodeURIComponent(show.name)}/${encodeURIComponent(show.videoFile)}`;
  }
  return `/show/${encodeURIComponent(show.name)}`;
}

// Hyphens flattened so "dark comedy" matches the tag "dark-comedy"
function haystack(show) {
  return [show.name, show.type, ...(show.tags || [])]
    .join(' ')
    .toLowerCase()
    .replace(/[-_]/g, ' ');
}

export default function ShowsBrowser({ shows, tabTypes, typeIcons, initialTab, initialQuery }) {
  const [tab, setTab] = useState(initialTab || 'all');
  const [query, setQuery] = useState(initialQuery || '');

  const indexed = useMemo(
    () => shows.map(s => ({ ...s, _hay: haystack(s) })),
    [shows]
  );

  const results = useMemo(() => {
    const typeFilter = tabTypes[tab];
    let list = typeFilter ? indexed.filter(s => s.type === typeFilter) : indexed;

    const tokens = query.toLowerCase().replace(/[-_]/g, ' ').split(/\s+/).filter(Boolean);
    if (tokens.length) list = list.filter(s => tokens.every(t => s._hay.includes(t)));

    return list;
  }, [indexed, tab, query, tabTypes]);

  const searching = query.trim().length > 0;

  return (
    <>
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, genre, mood, tag…"
          autoComplete="off"
        />
        {searching && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
        )}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab${tab === t.key ? ' tab-active' : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {searching && (
        <div className="search-count">
          {results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”
        </div>
      )}

      {results.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{searching ? '🔍' : '📂'}</div>
          <div className="empty-text">
            {searching ? 'Nothing matches that search.' : 'No shows found in this category.'}
          </div>
        </div>
      ) : (
        <div className="shows-grid">
          {results.map(show => (
            <Link key={show.name} href={cardHref(show)}>
              <div className="show-card">
                <div className="show-thumb">
                  {show.heroImage ? (
                    <Image
                      src={show.heroImage}
                      alt={show.name}
                      fill
                      sizes="220px"
                      style={{ objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    typeIcons[show.type] || '🎬'
                  )}
                </div>
                <div className="show-name">{show.name}</div>
                <div className="show-meta">{show.count} {show.count !== 1 ? 'episodes' : 'episode'}</div>
                {show.tags?.length > 0 && (
                  <div className="show-tags">
                    {show.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="show-tag"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setQuery(tag); }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
