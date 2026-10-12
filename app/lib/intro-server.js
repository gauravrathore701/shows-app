import fs from 'fs';
import path from 'path';

// "50", "0:50" and "00:00:50" all mean the same instant. metadata.txt is hand
// written, so accept every shape instead of making one of them the only one
// that works.
export function parseTimecode(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length > 3) return null;
  if (parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const secs = parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  return Number.isFinite(secs) ? secs : null;
}

function readMeta(dir) {
  try {
    return fs.readFileSync(path.join(dir, 'metadata.txt'), 'utf8');
  } catch {
    return null;
  }
}

// introStart / introEnd mark the opening titles:
//
//   introStart=00:00:00
//   introEnd=00:00:50
//
// The first directory that carries a usable pair wins, and callers pass the
// season folder before the show folder. So a show whose seasons share one
// intro needs a single pair at the show level, while a season with different
// titles can override it with its own metadata.txt.
//
// introStart is optional and defaults to 0; introEnd is what makes the feature
// exist at all, so a folder without it is treated as having no intro.
export function readIntro(...dirs) {
  for (const dir of dirs) {
    if (!dir) continue;
    const meta = readMeta(dir);
    if (!meta) continue;
    const end = parseTimecode(meta.match(/^introEnd=(.+)$/m)?.[1]);
    if (end === null || !(end > 0)) continue;
    const start = parseTimecode(meta.match(/^introStart=(.+)$/m)?.[1]) ?? 0;
    if (!(end > start)) continue;
    return { start, end };
  }
  return null;
}
