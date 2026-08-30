export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import ShowsBrowser from './components/ShowsBrowser';

const HDD_ROOT = '/mnt/hdd';
const SKIP = new Set(['lost+found', 'Copy To Pi']);

// In-memory cache — survives between requests, invalidates after 5 min
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

// A tab may cover more than one type — anime films are typed movie-anime so they
// open the player directly, but they still belong under the Anime tab
const TAB_TYPES = {
  all: null,
  series: ['series'],
  hollywood: ['movie-hollywood'],
  bollywood: ['movie-bollywood'],
  anime: ['anime', 'movie-anime'],
};

const TYPE_ICON = {
  'series': '📺',
  'movie-hollywood': '🎬',
  'movie-bollywood': '🎭',
  'anime': '🎌',
  'movie-anime': '🎌',
};

function loadShows() {
  try {
    return fs.readdirSync(HDD_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name))
      .map(d => {
        const showPath = path.join(HDD_ROOT, d.name);
        const VIDEO_EXT_LOCAL = /\.(mp4|mkv|avi|mov|webm)$/i;
        const allEntries = fs.readdirSync(showPath, { withFileTypes: true });
        const directVideos = allEntries.filter(e => e.isFile() && VIDEO_EXT_LOCAL.test(e.name));
        let episodeCount = directVideos.length;
        // Movies hold exactly one video — used to link the card straight at the player
        const videoFile = directVideos.length === 1 ? directVideos[0].name : null;
        if (episodeCount === 0) {
          const subDirs = allEntries.filter(e => e.isDirectory() && !e.name.startsWith('.'));
          for (const sub of subDirs) {
            try {
              const subFiles = fs.readdirSync(path.join(showPath, sub.name)).filter(f => VIDEO_EXT_LOCAL.test(f));
              episodeCount += subFiles.length;
            } catch {}
          }
        }

        let type = 'unknown';
        let heroImage = null;
        let suggestionPoint = 0;
        let tags = [];
        let addedDate = '';
        try {
          const meta = fs.readFileSync(path.join(showPath, 'metadata.txt'), 'utf8');
          const typeMatch = meta.match(/^type=(.+)/m);
          const heroMatch = meta.match(/^heroImage=(.+)/m);
          const spMatch = meta.match(/^suggestionPoint=(.+)/m);
          const tagsMatch = meta.match(/^tags=(.+)/m);
          const addedMatch = meta.match(/^addedDate=(.+)/m);
          if (typeMatch) type = typeMatch[1].trim();
          if (heroMatch) heroImage = heroMatch[1].trim();
          if (spMatch) suggestionPoint = parseInt(spMatch[1].trim(), 10) || 0;
          if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          if (addedMatch) addedDate = addedMatch[1].trim();
        } catch {}

        return { name: d.name, count: episodeCount, type, heroImage, suggestionPoint, tags, addedDate, videoFile };
      })
      // Pinned shows first (suggestionPoint), then newest upload, then alphabetical
      .sort((a, b) =>
        b.suggestionPoint - a.suggestionPoint ||
        b.addedDate.localeCompare(a.addedDate) ||
        a.name.localeCompare(b.name)
      );
  } catch {
    return [];
  }
}

function getShows() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL) return _cache;
  _cache = loadShows();
  _cacheAt = now;
  return _cache;
}

export default async function ShowsPage({ searchParams }) {
  const params = await searchParams;
  const tab = params?.tab || 'all';
  const q = params?.q || '';

  return (
    <>
      <nav className="nav">
        <span className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</span>
        <span className="nav-sep">›</span>
        <span className="nav-title">Shows</span>
      </nav>
      <div className="page">
        <h1 className="page-heading">My <span>Library</span></h1>
        <ShowsBrowser
          shows={getShows()}
          tabTypes={TAB_TYPES}
          typeIcons={TYPE_ICON}
          initialTab={tab}
          initialQuery={q}
        />
      </div>
    </>
  );
}
