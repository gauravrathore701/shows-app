// Server-side CBZ handling. A CBZ is a plain zip of page images, so `unzip`
// does the work — no npm dependency, and nothing is ever extracted to disk.
//
// Layout on the HDD:
//   /mnt/hdd/<Show>/Manga/1P Chapter 1179.cbz
//
// Two internal shapes are in the wild and both are handled: pages at the root
// of the archive, and pages inside one folder named after the chapter.
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

const HDD_ROOT = '/mnt/hdd';
export const MANGA_DIR = 'Manga';

const ARCHIVE_EXT = /\.cbz$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

// Entry listings are stable for the life of a file, so they are cached by
// path+mtime. A chapter is ~16 pages, so this stays tiny.
const entryCache = new Map();

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/** Absolute path of a show's Manga folder, or null if the show has none. */
export function mangaDirFor(showName) {
  const dir = path.join(HDD_ROOT, showName, MANGA_DIR);
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(HDD_ROOT + path.sep)) return null;
  try {
    return fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

export function hasManga(showName) {
  const dir = mangaDirFor(showName);
  if (!dir) return false;
  try {
    return fs.readdirSync(dir).some(f => ARCHIVE_EXT.test(f));
  } catch {
    return false;
  }
}

// "1P Chapter 1179.cbz" -> 1179. Falls back to the last number in the name.
function chapterNumber(filename) {
  const m = filename.replace(ARCHIVE_EXT, '').match(/(\d{1,5})\D*$/);
  return m ? Number(m[1]) : null;
}

// chapters.txt maps chapter number -> title, one per line, same shape as the
// episodes.txt the video side already uses:
//   1179=Nerona Imu Descends
function readChapterTitles(dir) {
  try {
    const raw = fs.readFileSync(path.join(dir, 'chapters.txt'), 'utf8');
    const map = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*(\d+)\s*=\s*(.+?)\s*$/);
      if (m) map[Number(m[1])] = m[2];
    }
    return map;
  } catch {
    return {};
  }
}

/** Every chapter of a show, lowest number first. Size only — no unzip cost. */
export function listChapters(showName) {
  const dir = mangaDirFor(showName);
  if (!dir) return [];
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => ARCHIVE_EXT.test(f));
  } catch {
    return [];
  }
  const titles = readChapterTitles(dir);
  return files
    .map(name => {
      let size = 0;
      try { size = fs.statSync(path.join(dir, name)).size; } catch {}
      const num = chapterNumber(name);
      return { name, num, size, title: titles[num] ?? null };
    })
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.name.localeCompare(b.name));
}

/** Page entry names inside one chapter, in reading order. */
export async function chapterPages(showName, fileName) {
  const dir = mangaDirFor(showName);
  if (!dir || !ARCHIVE_EXT.test(fileName)) return [];
  const full = path.join(dir, path.basename(fileName));
  if (!fs.existsSync(full)) return [];

  const { mtimeMs, size } = fs.statSync(full);
  const key = `${full}:${mtimeMs}:${size}`;
  if (entryCache.has(key)) return entryCache.get(key);

  let out;
  try {
    out = await run('unzip', ['-Z1', full]);
  } catch {
    return [];
  }

  const pages = out
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.endsWith('/') && IMAGE_EXT.test(l))
    // Sort on the basename so a wrapper folder cannot reorder the pages, and
    // compare numerically ("9.png" before "10.png", "12-13.png" as 12).
    .sort((a, b) => {
      const na = Number(path.basename(a).match(/(\d+)/)?.[1] ?? 0);
      const nb = Number(path.basename(b).match(/(\d+)/)?.[1] ?? 0);
      return na - nb || a.localeCompare(b);
    });

  entryCache.set(key, pages);
  return pages;
}

/** One page as { buffer, contentType }, or null if the index is out of range. */
export async function readPage(showName, fileName, index) {
  const pages = await chapterPages(showName, fileName);
  if (!Number.isInteger(index) || index < 0 || index >= pages.length) return null;

  const dir = mangaDirFor(showName);
  const full = path.join(dir, path.basename(fileName));
  const entry = pages[index];

  // -p writes the member to stdout; the entry name comes from the listing above,
  // so it is never user-supplied.
  const stdout = await run('unzip', ['-p', full, entry], { encoding: 'buffer' });
  const ext = entry.split('.').pop().toLowerCase();
  return { buffer: stdout, contentType: sniff(stdout) || MIME[ext] || 'application/octet-stream' };
}

// Some releases name every page .png while the bytes are actually JPEG, so the
// magic number wins over the extension.
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'image/gif';
  return null;
}
