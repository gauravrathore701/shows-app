export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EpisodesList from '../../components/EpisodesList';

const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

function formatSize(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

function getEpisodes(showName) {
  const showPath = path.join(HDD_ROOT, showName);
  if (!showPath.startsWith(HDD_ROOT) || !fs.existsSync(showPath)) return null;
  return fs.readdirSync(showPath)
    .filter(f => VIDEO_EXT.test(f))
    .sort()
    .map((f, i) => {
      const stat = fs.statSync(path.join(showPath, f));
      return { name: f, size: stat.size, index: i };
    });
}

export default async function ShowPage({ params }) {
  const { showName } = await params;
  const decoded = decodeURIComponent(showName);
  const episodes = getEpisodes(decoded);
  if (!episodes) notFound();

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo">🎬 Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        <span className="nav-title">{decoded}</span>
      </nav>
      <div className="page">
        <Link href="/" className="back-link">‹ All Shows</Link>
        <h1 className="page-heading"><span>{decoded}</span></h1>
        {episodes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div className="empty-text">No episodes found in this show.</div>
          </div>
        ) : (
          <EpisodesList episodes={episodes} showName={decoded} />
        )}
      </div>
    </>
  );
}
