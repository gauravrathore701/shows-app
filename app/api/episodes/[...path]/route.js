import fs from 'fs';
import path from 'path';

const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;

// episodes.txt maps episode number -> title. Seasonal shows keep one per
// season folder; a flat show keeps a single file in the show root keyed by
// absolute number. Written by .claude/tools/episode_titles.py.
function readTitles(dir) {
  try {
    const raw = fs.readFileSync(path.join(dir, 'episodes.txt'), 'utf8');
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

// Sibling episodes for a show ("/api/episodes/<show>") or a season
// ("/api/episodes/<show>/<season>"). Same source of truth as the season page:
// the directory listing, sorted by name.
export async function GET(request, { params }) {
  const segments = ((await params).path || []).map(decodeURIComponent);
  if (segments.length === 0 || segments.length > 2) {
    return Response.json({ episodes: [] }, { status: 400 });
  }

  const dir = path.resolve(HDD_ROOT, ...segments);
  // path.resolve collapses "..", so this rejects traversal rather than trusting
  // the URL. The trailing separator stops /mnt/hdd-other matching /mnt/hdd.
  if (dir !== HDD_ROOT && !dir.startsWith(HDD_ROOT + path.sep)) {
    return Response.json({ episodes: [] }, { status: 400 });
  }

  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return Response.json({ episodes: [] }, { status: 404 });
  }

  const episodes = names.filter((f) => VIDEO_EXT.test(f)).sort();
  // Titles ride along so the watch page — a client component that cannot
  // touch the filesystem — can label the episode it is already playing.
  const titles = readTitles(dir);
  return Response.json(
    { episodes, titles },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
