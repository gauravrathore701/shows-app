export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EpisodesList from '../../../components/EpisodesList';

const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

// episodes.txt maps episode number -> title, one per line:
//   01=The More Things Change (1)
// Written by .claude/tools/episode_titles.py from TMDB.
function readTitles(seasonPath) {
  try {
    const raw = fs.readFileSync(path.join(seasonPath, 'episodes.txt'), 'utf8');
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

function getEpisodes(showName, season) {
  const seasonPath = path.join(HDD_ROOT, showName, season);
  if (!seasonPath.startsWith(HDD_ROOT) || !fs.existsSync(seasonPath)) return null;
  const titles = readTitles(seasonPath);
  return fs.readdirSync(seasonPath)
    .filter(f => VIDEO_EXT.test(f))
    .sort()
    .map((f, i) => {
      const stat = fs.statSync(path.join(seasonPath, f));
      // Number comes from the filename, not the list position — a season
      // with gaps would otherwise mislabel every file after the first hole.
      const m = f.match(/S\d{1,2}E(\d{1,3})/i);
      const epNum = m ? String(Number(m[1])).padStart(2, '0')
                      : String(i + 1).padStart(2, '0');
      return {
        name: f,
        size: stat.size,
        index: i,
        epNum,
        title: titles[epNum] || null,
      };
    });
}

export default async function SeasonPage({ params }) {
  const { showName, season } = await params;
  const decodedShow = decodeURIComponent(showName);
  const decodedSeason = decodeURIComponent(season);
  const episodes = getEpisodes(decodedShow, decodedSeason);
  if (!episodes) notFound();

  const watchBase = `/watch/${showName}/${season}`;
  const watchKey = `${decodedShow}/${decodedSeason}`;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        <Link href={`/show/${showName}`} className="nav-title">{decodedShow}</Link>
        <span className="nav-sep">›</span>
        <span className="nav-title">{decodedSeason}</span>
      </nav>
      <div className="page">
        <Link href={`/show/${showName}`} className="back-link">‹ {decodedShow}</Link>
        <h1 className="page-heading"><span>{decodedSeason}</span></h1>
        {episodes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div className="empty-text">No episodes found in this season.</div>
          </div>
        ) : (
          <EpisodesList episodes={episodes} showName={watchKey} watchBase={watchBase} />
        )}
      </div>
    </>
  );
}
