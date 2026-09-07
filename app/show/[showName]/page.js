export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import EpisodesList from '../../components/EpisodesList';

const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

function readHeroImage(dirPath) {
  try {
    const meta = fs.readFileSync(path.join(dirPath, 'metadata.txt'), 'utf8');
    const m = meta.match(/^heroImage=(.+)/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

// episodes.txt maps episode number -> title. Seasonal shows keep one per
// season folder; a flat show (One Piece) keeps a single file in the show
// root keyed by absolute episode number.
function readTitles(dirPath) {
  try {
    const raw = fs.readFileSync(path.join(dirPath, 'episodes.txt'), 'utf8');
    const map = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*(\d+)\s*=\s*(.+?)\s*$/);
      if (m) map[String(Number(m[1])).padStart(2, '0')] = m[2];
    }
    return map;
  } catch {
    return {};
  }
}

// SxxEyy when present, otherwise the last number in the name — which is what
// absolute-numbered anime uses ("1P Episode 1172.mp4").
function episodeNumber(filename, i) {
  const se = filename.match(/S\d{1,2}E(\d{1,4})/i);
  if (se) return String(Number(se[1])).padStart(2, '0');
  const tail = filename.replace(/\.[^.]+$/, '').match(/(\d{1,4})\D*$/);
  if (tail) return String(Number(tail[1])).padStart(2, '0');
  return String(i + 1).padStart(2, '0');
}

function getShowData(showName) {
  const showPath = path.join(HDD_ROOT, showName);
  if (!showPath.startsWith(HDD_ROOT) || !fs.existsSync(showPath)) return null;

  const entries = fs.readdirSync(showPath, { withFileTypes: true });
  const directVideos = entries
    .filter(e => e.isFile() && VIDEO_EXT.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => {
      const stat = fs.statSync(path.join(showPath, e.name));
      return { name: e.name, size: stat.size };
    });

  if (directVideos.length > 0) {
    const titles = readTitles(showPath);
    return {
      type: 'flat',
      episodes: directVideos.map((e, i) => {
        const epNum = episodeNumber(e.name, i);
        return { ...e, index: i, epNum, title: titles[epNum] || null };
      }),
    };
  }

  const seasons = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => {
      const seasonPath = path.join(showPath, e.name);
      try {
        const count = fs.readdirSync(seasonPath).filter(f => VIDEO_EXT.test(f)).length;
        const heroImage = readHeroImage(seasonPath);
        return { name: e.name, count, heroImage };
      } catch {
        return { name: e.name, count: 0, heroImage: null };
      }
    })
    .filter(s => s.count > 0);

  if (seasons.length > 0) {
    return { type: 'seasonal', seasons };
  }

  return { type: 'flat', episodes: [] };
}

export default async function ShowPage({ params }) {
  const { showName } = await params;
  const decoded = decodeURIComponent(showName);
  const data = getShowData(decoded);
  if (!data) notFound();

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        <span className="nav-title">{decoded}</span>
      </nav>
      <div className="page">
        <Link href="/" className="back-link">‹ All Shows</Link>
        <h1 className="page-heading"><span>{decoded}</span></h1>

        {data.type === 'seasonal' ? (
          data.seasons.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No seasons found.</div>
            </div>
          ) : (
            <div className="season-grid">
              {data.seasons.map(season => {
                // "Season 03" -> "03". Season 0 is the specials folder.
                const num = season.name.match(/(\d+)/)?.[1] ?? null;
                const isSpecials = num !== null && Number(num) === 0;
                return (
                  <Link key={season.name} href={`/show/${showName}/${encodeURIComponent(season.name)}`}>
                    <div className="season-card">
                      <div className="season-art">
                        {season.heroImage ? (
                          <Image
                            src={season.heroImage}
                            alt={season.name}
                            fill
                            sizes="(max-width: 640px) 45vw, 260px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="season-num" aria-hidden="true">
                            {isSpecials ? 'SP' : (num ?? '—')}
                          </span>
                        )}
                      </div>
                      <div className="season-body">
                        <div className="season-name">
                          {isSpecials ? 'Specials' : season.name}
                        </div>
                        <div className="season-meta">
                          {season.count} {season.count !== 1 ? 'episodes' : 'episode'}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          data.episodes.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No episodes found in this show.</div>
            </div>
          ) : (
            <EpisodesList episodes={data.episodes} showName={decoded} />
          )
        )}
      </div>
    </>
  );
}
