export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EpisodesList from '../../../components/EpisodesList';

const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

function getEpisodes(showName, season) {
  const seasonPath = path.join(HDD_ROOT, showName, season);
  if (!seasonPath.startsWith(HDD_ROOT) || !fs.existsSync(seasonPath)) return null;
  return fs.readdirSync(seasonPath)
    .filter(f => VIDEO_EXT.test(f))
    .sort()
    .map((f, i) => {
      const stat = fs.statSync(path.join(seasonPath, f));
      return { name: f, size: stat.size, index: i };
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
        <Link href="/" className="nav-logo">🎬 Cursed Shrine</Link>
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
