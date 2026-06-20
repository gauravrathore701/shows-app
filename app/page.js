export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';

const HDD_ROOT = '/mnt/hdd';
const SKIP = new Set(['lost+found']);

const TAB_TYPES = {
  all: null,
  series: 'series',
  hollywood: 'movie-hollywood',
  bollywood: 'movie-bollywood',
  anime: 'anime',
};

const TYPE_ICON = {
  'series': '📺',
  'movie-hollywood': '🎬',
  'movie-bollywood': '🎭',
  'anime': '🎌',
};

function getShows() {
  try {
    return fs.readdirSync(HDD_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name))
      .map(d => {
        const showPath = path.join(HDD_ROOT, d.name);
        const episodes = fs.readdirSync(showPath)
          .filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f));

        let type = 'unknown';
        let heroImage = null;
        try {
          const meta = fs.readFileSync(path.join(showPath, 'metadata.txt'), 'utf8');
          const typeMatch = meta.match(/^type=(.+)/m);
          const heroMatch = meta.match(/^heroImage=(.+)/m);
          if (typeMatch) type = typeMatch[1].trim();
          if (heroMatch) heroImage = heroMatch[1].trim();
        } catch {}

        return { name: d.name, count: episodes.length, type, heroImage };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function ShowsPage({ searchParams }) {
  const params = await searchParams;
  const tab = params?.tab || 'all';
  const allShows = getShows();

  const typeFilter = TAB_TYPES[tab];
  const shows = typeFilter ? allShows.filter(s => s.type === typeFilter) : allShows;

  const tabs = [
    { key: 'all',       label: 'All',        icon: '🏠' },
    { key: 'series',    label: 'Series',     icon: '📺' },
    { key: 'hollywood', label: 'Hollywood',  icon: '🎬' },
    { key: 'bollywood', label: 'Bollywood',  icon: '🎭' },
    { key: 'anime',     label: 'Anime',      icon: '🎌' },
  ];

  return (
    <>
      <nav className="nav">
        <span className="nav-logo">🎬 Cursed Shrine</span>
        <span className="nav-sep">›</span>
        <span className="nav-title">Shows</span>
      </nav>
      <div className="page">
        <h1 className="page-heading">My <span>Library</span></h1>

        <div className="tabs">
          {tabs.map(t => (
            <Link key={t.key} href={`/?tab=${t.key}`} className={`tab${tab === t.key ? ' tab-active' : ''}`}>
              {t.icon} {t.label}
            </Link>
          ))}
        </div>

        {shows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📂</div>
            <div className="empty-text">No shows found in this category.</div>
          </div>
        ) : (
          <div className="shows-grid">
            {shows.map(show => (
              <Link key={show.name} href={`/show/${encodeURIComponent(show.name)}`}>
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
                      TYPE_ICON[show.type] || '🎬'
                    )}
                  </div>
                  <div className="show-name">{show.name}</div>
                  <div className="show-meta">{show.count} {show.count !== 1 ? 'episodes' : 'episode'}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
