// Subtitle + audio track support for video-server.js.
//
// - listTracks(file)      → audio streams + TEXT subtitle streams (bitmap PGS /
//                           dvdsub are skipped: a browser <track> cannot show them)
// - getVtt(file, n)       → subtitle stream 0:s:n as cleaned WebVTT
// - getKeyframeSegments() → keyframe-aligned HLS segment boundaries, so the
//                           audio-switch path can COPY browser-safe H.264
//                           instead of re-encoding it on the Pi
//
// Everything derived is cached on disk under ~/.cache, keyed by path + mtime,
// so a file re-encoded in place gets fresh data and nothing is ever written
// into the library itself.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';

const SUB_CACHE = path.join(os.homedir(), '.cache', 'shows-subs');
const KF_CACHE = path.join(os.homedir(), '.cache', 'shows-keyframes');
const TEXT_SUBS = new Set(['ass', 'ssa', 'subrip', 'srt', 'webvtt', 'mov_text', 'text']);

function run(cmd, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 256 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) { err.stderr = String(stderr || '').slice(0, 300); reject(err); } else resolve(stdout.toString());
    });
  });
}

function fileKey(file) {
  const st = fs.statSync(file);
  const h = crypto.createHash('sha1').update(file).digest('hex').slice(0, 16);
  return `${h}-${Math.round(st.mtimeMs)}`;
}

// ── stream list ─────────────────────────────────────────────────────────────
const streamCache = new Map();

async function probeStreams(file) {
  const key = fileKey(file);
  if (streamCache.has(key)) return streamCache.get(key);
  const raw = await run('ffprobe', [
    '-v', 'quiet', '-print_format', 'json',
    '-show_entries', 'stream=index,codec_type,codec_name,pix_fmt:stream_tags=language,title:stream_disposition=default,forced',
    file,
  ], 15000);
  const streams = JSON.parse(raw).streams || [];
  const audio = [];
  const subs = [];
  let video = null;
  let si = 0;
  for (const s of streams) {
    const t = s.tags || {};
    const d = s.disposition || {};
    const base = { lang: t.language || '', title: t.title || '', codec: s.codec_name || '', default: !!d.default };
    if (s.codec_type === 'video' && !video && s.codec_name !== 'mjpeg' && s.codec_name !== 'png') {
      video = { codec: s.codec_name || '', pixFmt: s.pix_fmt || '' };
    } else if (s.codec_type === 'audio') {
      audio.push({ i: audio.length, ...base });
    } else if (s.codec_type === 'subtitle') {
      // i stays the position among ALL subtitle streams so 0:s:i maps right
      // even when a bitmap stream sits between two text ones
      if (TEXT_SUBS.has(s.codec_name)) subs.push({ i: si, ...base, forced: !!d.forced });
      si++;
    }
  }
  const info = { video, audio, subs };
  streamCache.set(key, info);
  return info;
}

// ── WebVTT extraction ───────────────────────────────────────────────────────
// ffmpeg's ASS → WebVTT keeps the text but leaks typesetting junk: vector
// drawings ("m 0 0 l 100 0 ...") come out as text, sign layers are emitted
// two or three times (outline + fill), and "{OP}"-style comments survive.
const DRAWING = /^\s*m\s+-?[\d.]+\s+-?[\d.]+(?:\s+(?:[mnlbspc]|-?[\d.]+))*\s*$/i;

function cleanVtt(raw) {
  const blocks = raw.replace(/\r/g, '').split(/\n{2,}/);
  const out = ['WEBVTT', ''];
  const seen = new Set();
  const texts = new Set();
  let latin = 0;
  let letters = 0;
  for (const b of blocks) {
    const lines = b.split('\n');
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const timing = lines[ti];
    const text = lines.slice(ti + 1)
      .map((l) => l.replace(/\{[^}]*\}/g, '').trimEnd())
      .filter((l) => l.replace(/<[^>]+>/g, '').trim() && !DRAWING.test(l.replace(/<[^>]+>/g, '')))
      .join('\n');
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) continue;
    const k = timing + '\n' + text;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(timing, text, '');
    if (!texts.has(plain)) {
      texts.add(plain);
      for (const ch of plain) {
        if (/\p{L}/u.test(ch)) { letters++; if (/[A-Za-z]/.test(ch)) latin++; }
      }
    }
  }
  return { body: out.join('\n'), lines: texts.size, latin: letters ? +(latin / letters).toFixed(2) : 0 };
}

const extracting = new Map();

// One ffmpeg pass writes every text subtitle stream (the subs are interleaved
// through the whole file, so N separate runs would read it N times).
async function extractAll(file) {
  const key = fileKey(file);
  const dir = path.join(SUB_CACHE, key);
  const metaFile = path.join(dir, 'meta.json');
  if (fs.existsSync(metaFile)) return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  if (extracting.has(key)) return extracting.get(key);

  const job = (async () => {
    const { subs } = await probeStreams(file);
    fs.mkdirSync(dir, { recursive: true });
    const meta = {};
    if (subs.length) {
      const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', file];
      for (const s of subs) args.push('-map', `0:s:${s.i}`, '-f', 'webvtt', path.join(dir, `raw${s.i}.vtt`));
      await run('ffmpeg', args, 180000);
      for (const s of subs) {
        const rawFile = path.join(dir, `raw${s.i}.vtt`);
        const { body, lines, latin } = cleanVtt(fs.readFileSync(rawFile, 'utf8'));
        fs.writeFileSync(path.join(dir, `s${s.i}.vtt`), body);
        fs.unlinkSync(rawFile);
        meta[s.i] = { lines, latin };
      }
    }
    fs.writeFileSync(metaFile, JSON.stringify(meta));
    return meta;
  })();
  extracting.set(key, job);
  try { return await job; } finally { extracting.delete(key); }
}

export async function listTracks(file) {
  const { video, audio, subs } = await probeStreams(file);
  let meta = {};
  if (subs.length) {
    try { meta = await extractAll(file); } catch (e) { console.error('[subs] extract failed', path.basename(file), e.stderr || e.message); }
  }
  return {
    video,
    audio,
    subs: subs.map((s) => ({ ...s, ...(meta[s.i] || {}) })),
  };
}

export async function getVtt(file, n) {
  const { subs } = await probeStreams(file);
  if (!subs.some((s) => s.i === n)) return null;
  await extractAll(file);
  const f = path.join(SUB_CACHE, fileKey(file), `s${n}.vtt`);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
}

export function getTrackInfo(file) {
  return probeStreams(file);
}

// ── keyframe-aligned segments (video copy) ──────────────────────────────────
// Copying video means a segment can only start on a keyframe, so the playlist
// is cut at real keyframes (~SEG seconds apart) instead of a fixed grid.
const kfJobs = new Map();
const kfMemo = new Map();

export async function getKeyframeSegments(file, seg, duration) {
  const key = fileKey(file);
  const cacheFile = path.join(KF_CACHE, `${key}.json`);
  if (kfMemo.has(key)) return kfMemo.get(key);
  if (fs.existsSync(cacheFile)) {
    const segs = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    kfMemo.set(key, segs);
    return segs;
  }
  if (kfJobs.has(key)) return kfJobs.get(key);
  const job = (async () => {
    // packets only — no decoding, just one read of the file
    const raw = await run('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'packet=pts_time,dts_time,flags', '-of', 'csv=p=0', file,
    ], 120000);
    const kfs = [];
    for (const line of raw.split('\n')) {
      const [p, d, flags] = line.split(',');
      if (!flags || !flags.includes('K')) continue;
      const pts = parseFloat(p);
      const dts = parseFloat(d);
      if (Number.isFinite(pts)) kfs.push({ pts, dts: Number.isFinite(dts) ? dts : pts });
    }
    kfs.sort((a, b) => a.pts - b.pts);
    // A boundary needs breathing room: the segment is fetched by seeking to
    // start+0.2s (ffmpeg backs a B-frame seek off by ~0.13s), so another
    // keyframe within 0.25s after it would be landed on instead.
    const bounds = [{ pts: 0, dts: 0 }];
    for (let k = 0; k < kfs.length; k++) {
      const t = kfs[k].pts;
      const next = kfs[k + 1] ? kfs[k + 1].pts : duration;
      if (t - bounds[bounds.length - 1].pts >= seg && duration - t > 1 && next - t > 0.25) bounds.push(kfs[k]);
    }
    // ss = where ffmpeg seeks; cut = output duration measured from ss that
    // stops just before the next boundary keyframe's DTS (-t compares DTS, so
    // cutting on PTS would leak the next GOP's first frames into this one)
    const segs = bounds.map((b, i) => {
      const n = bounds[i + 1];
      const ss = i === 0 ? 0 : b.pts + 0.2;
      return {
        start: b.pts,
        dur: (n ? n.pts : duration) - b.pts,
        ss: +ss.toFixed(3),
        cut: n ? +(n.dts - ss - 0.0005).toFixed(4) : null,
      };
    });
    fs.mkdirSync(KF_CACHE, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(segs));
    kfMemo.set(key, segs);
    return segs;
  })();
  kfJobs.set(key, job);
  try { return await job; } finally { kfJobs.delete(key); }
}
