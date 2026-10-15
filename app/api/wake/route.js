import fs from 'fs';
import path from 'path';

// Spins the USB HDD up from standby before the user picks a show.
// Reads 1 byte at a random offset of a random video — a random spot in a multi-GB
// file is almost never in page cache, so this forces a real disk read.
const HDD_ROOT = '/mnt/hdd';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm)$/i;
const MIN_GAP_MS = 60 * 1000; // unauthenticated route — cap disk work at once a minute
let lastWake = 0;

function findVideo(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; } // lost+found is root-only
  entries.sort(() => Math.random() - 0.5);
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isFile() && VIDEO_EXT.test(e.name)) return p;
    if (e.isDirectory() && depth < 2) {
      const found = findVideo(p, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export async function POST() {
  const now = Date.now();
  if (now - lastWake < MIN_GAP_MS) return new Response(null, { status: 204 });
  lastWake = now;
  try {
    const file = findVideo(HDD_ROOT);
    if (file) {
      const fh = await fs.promises.open(file, 'r');
      try {
        const { size } = await fh.stat();
        await fh.read(Buffer.alloc(1), 0, 1, Math.floor(Math.random() * size));
      } finally {
        await fh.close();
      }
    }
  } catch {}
  return new Response(null, { status: 204 });
}
