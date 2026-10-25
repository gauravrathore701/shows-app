export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const HDD_ROOT = '/mnt/hdd';

// A library folder with no video file, only `youtube=<id>` in metadata.txt
export default async function YouTubePage({ params }) {
  const { showName } = await params;
  const name = decodeURIComponent(showName);
  const dir = path.join(HDD_ROOT, name);
  if (!dir.startsWith(HDD_ROOT + '/')) notFound();
  let id = null;
  try {
    const meta = fs.readFileSync(path.join(dir, 'metadata.txt'), 'utf8');
    id = meta.match(/^youtube=([A-Za-z0-9_-]{11})\s*$/m)?.[1] || null;
  } catch {}
  if (!id) notFound();

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        <span className="nav-title">{name}</span>
      </nav>
      <div className="page">
        <Link href="/" className="back-link">‹ All Shows</Link>
        <h1 className="page-heading"><span>{name}</span></h1>
        <div className="yt-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title={name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <a className="yt-open" href={`https://youtu.be/${id}`} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
      </div>
    </>
  );
}
