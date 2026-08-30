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
    return { type: 'flat', episodes: directVideos.map((e, i) => ({ ...e, index: i })) };
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
            <div className="shows-grid">
              {data.seasons.map(season => (
                <Link key={season.name} href={`/show/${showName}/${encodeURIComponent(season.name)}`}>
                  <div className="show-card">
                    <div className="show-thumb">
                      {season.heroImage ? (
                        <Image
                          src={season.heroImage}
                          alt={season.name}
                          fill
                          sizes="220px"
                          style={{ objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : '📺'}
                    </div>
                    <div className="show-name">{season.name}</div>
                    <div className="show-meta">{season.count} {season.count !== 1 ? 'episodes' : 'episode'}</div>
                  </div>
                </Link>
              ))}
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
