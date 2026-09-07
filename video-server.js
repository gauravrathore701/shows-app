import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';

const HDD_ROOT = '/mnt/hdd';
const PORT = 4179;

const MIME = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
};

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'video/mp4';
}

// Detect HEVC by filename tag — only a fallback now, many files carry no tag
// (e.g. Dororo is HEVC Main 10 + Opus but named "01 - The tale of Daigo.mkv").
function isHEVC(filePath) {
  return /x265|hevc|h\.?265/i.test(path.basename(filePath));
}

// ── real codec probe ───────────────────────────────────────────────────────
// Browsers only decode H.264 8-bit video with AAC/MP3 audio from a progressive
// file. Anything else (HEVC, VP9-in-mkv, 10-bit, Opus/DTS/AC3/FLAC audio) must
// go through the HLS transcode path, so the decision is made from the actual
// streams rather than the filename.
const BROWSER_VIDEO = new Set(['h264']);
const BROWSER_AUDIO = new Set(['aac', 'mp3']);
const EIGHT_BIT = new Set(['yuv420p', 'yuvj420p']);

const probeCache = new Map();

function probeMedia(filePath) {
  if (probeCache.has(filePath)) return probeCache.get(filePath);
  let info = null;
  try {
    const raw = execFileSync('ffprobe', [
      '-v', 'quiet', '-print_format', 'json',
      '-show_entries', 'stream=codec_type,codec_name,pix_fmt',
      filePath,
    ], { timeout: 8000 }).toString();
    const streams = JSON.parse(raw).streams || [];
    const v = streams.find((s) => s.codec_type === 'video') || {};
    const a = streams.find((s) => s.codec_type === 'audio') || {};
    info = { vcodec: v.codec_name || '', pixFmt: v.pix_fmt || '', acodec: a.codec_name || '' };
  } catch { info = null; }
  // Only cache a SUCCESSFUL probe. Caching null meant one ffprobe failure
  // during a USB dropout poisoned this file for the life of the process:
  // needsTranscode() then fell back to the filename heuristic forever.
  if (info) probeCache.set(filePath, info);
  return info;
}

function needsTranscode(filePath) {
  const info = probeMedia(filePath);
  if (!info) return isHEVC(filePath);          // ffprobe failed → old filename heuristic
  if (!BROWSER_VIDEO.has(info.vcodec)) return true;
  if (info.pixFmt && !EIGHT_BIT.has(info.pixFmt)) return true;   // 10-bit H.264 too
  if (info.acodec && !BROWSER_AUDIO.has(info.acodec)) return true;
  return false;
}

// Duration cache — ffprobe is called once per file for seek support
const durationCache = new Map();

function getDuration(filePath) {
  if (durationCache.has(filePath)) return durationCache.get(filePath);
  try {
    const d = parseFloat(
      execFileSync('ffprobe', [
        '-v', 'quiet', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
      ], { timeout: 8000 }).toString().trim()
    ) || 0;
    durationCache.set(filePath, d);
    return d;
  } catch { return 0; }
}

// ── HLS (segment-on-demand) ────────────────────────────────────────────────
// The player requests /<file>/index.m3u8 (a VOD playlist listing every segment
// computed from the file's duration), then /<file>/segN.ts on demand. Each
// segment is transcoded independently by seeking FFmpeg to that timestamp, so
// the user gets true random seeking and each segment can retry on a disk blip.
const SEG = 6; // seconds per segment

function buildPlaylist(duration) {
  const count = Math.ceil(duration / SEG);
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${SEG}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
  ];
  for (let i = 0; i < count; i++) {
    const segDur = i === count - 1 ? duration - i * SEG : SEG;
    lines.push(`#EXTINF:${segDur.toFixed(3)},`);
    lines.push(`seg${i}.ts`);
  }
  lines.push('#EXT-X-ENDLIST');
  return lines.join('\n') + '\n';
}

function serveHlsPlaylist(filePath, res) {
  const duration = getDuration(filePath);
  if (!duration) { res.writeHead(500); res.end('Could not probe duration'); return; }
  const body = buildPlaylist(duration);
  res.writeHead(200, {
    ...CORS,
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// Transcode one segment to MPEG-TS. Buffer it fully before responding so a
// mid-transcode failure (e.g. HDD dropout) never yields a truncated/cached
// segment — we can cleanly retry, and only complete segments get cached.
function serveHlsSegment(filePath, index, res) {
  const start = index * SEG;
  const ffArgs = [
    '-hide_banner', '-loglevel', 'error',
    '-ss', start.toFixed(3),
    '-i', filePath,
    '-t', SEG.toFixed(3),
    '-map', '0:v:0', '-map', '0:a:0',   // first video + first audio only (skip commentary track & PGS subs)
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=-2:720',
    '-force_key_frames', 'expr:gte(t,0)', // keyframe at segment start → independently decodable
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-output_ts_offset', start.toFixed(3), // align PTS to playlist position → contiguous timeline
    '-muxdelay', '0', '-muxpreload', '0',
    '-f', 'mpegts', 'pipe:1',
  ];

  const RETRY_DELAY_MS = 5000;

  function attempt(retriesLeft) {
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let errBuf = '';

    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (d) => { errBuf += d.toString(); });

    ff.on('error', (err) => {
      console.error('[hls] spawn error:', err);
      if (!res.headersSent) { res.writeHead(500); res.end('Transcode error'); }
    });

    ff.on('close', (code) => {
      if (res.destroyed) return;
      if (code === 0 && chunks.length) {
        const body = Buffer.concat(chunks);
        res.writeHead(200, {
          ...CORS,
          'Content-Type': 'video/mp2t',
          'Content-Length': body.length,
          'Cache-Control': 'public, max-age=86400', // segments are self-contained → safe to cache
        });
        res.end(body);
        return;
      }
      if (retriesLeft > 0) {
        console.error(`[hls] seg${index} failed (code ${code}) — retrying in ${RETRY_DELAY_MS / 1000}s: ${errBuf.trim().slice(0, 120)}`);
        setTimeout(() => { if (!res.destroyed) attempt(retriesLeft - 1); }, RETRY_DELAY_MS);
        return;
      }
      console.error(`[hls] seg${index} failed permanently (code ${code}): ${errBuf.trim().slice(0, 200)}`);
      if (!res.headersSent) { res.writeHead(500); res.end('Segment transcode failed'); }
    });

    // Killing on res 'close' alone is not enough. The response travels
    // browser -> cloudflared -> proxy(4180) -> here, and a browser abort does
    // not always reach us: the proxy can keep its upstream socket open, so
    // 'close' never fires and FFmpeg transcodes on for nobody. Two of those
    // pinned this 4-core Pi at load 14.8 today, which starved the very
    // segment requests the player was waiting on — a black screen.
    //
    // So also watch progress. If not one byte is consumed for IDLE_KILL_MS,
    // the far end is gone and the transcode is pure waste. Kill it.
    const IDLE_KILL_MS = 120_000;
    let lastWrite = Date.now();
    ff.stdout.on('data', () => { lastWrite = Date.now(); });
    const idleTimer = setInterval(() => {
      if (Date.now() - lastWrite > IDLE_KILL_MS) {
        console.error('[video-server] idle', IDLE_KILL_MS / 1000 + 's —',
          'killing transcode of', path.basename(filePath));
        ff.kill('SIGKILL');
        if (!res.destroyed) res.destroy();
      }
    }, 15_000);
    idleTimer.unref?.();
    ff.on('close', () => clearInterval(idleTimer));
    res.on('close', () => { clearInterval(idleTimer); ff.kill('SIGKILL'); });
  }

  attempt(1);
}

// Transcode HEVC → H.264 fMP4 using libx264 ultrafast.
// We wait for the first data chunk BEFORE writing response headers so the
// fallback can still work if FFmpeg fails to produce any output.
function serveTranscoded(filePath, fileSize, res, rangeHeader) {
  let seekSeconds = 0;
  if (rangeHeader) {
    const startByte = parseInt(rangeHeader.replace(/bytes=/, '').split('-')[0], 10) || 0;
    if (startByte > 0) {
      const duration = getDuration(filePath);
      if (duration > 0) seekSeconds = Math.max(0, (startByte / fileSize) * duration - 2);
    }
  }

  const ffArgs = [
    '-hide_banner', '-loglevel', 'error',
    ...(seekSeconds > 0 ? ['-ss', seekSeconds.toFixed(2)] : []),
    '-i', filePath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',     // Force 8-bit — Adventure Time is 10-bit HEVC, this reduces encode load
    '-vf', 'scale=-2:720',     // 720p — reduces HEVC decode work significantly on Pi 5
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    'pipe:1',
  ];

  // The USB HDD occasionally drops off the bus and re-enumerates within ~5s
  // (ext4 remounts automatically). If FFmpeg fails to produce any output,
  // retry once after the recovery window instead of 500ing immediately.
  const RETRY_DELAY_MS = 5000;

  function attempt(retriesLeft) {
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let headersSent = false;

    ff.stdout.once('data', (firstChunk) => {
      if (!headersSent) {
        headersSent = true;
        res.writeHead(200, {
          ...CORS,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-store',
          'Accept-Ranges': 'none',
        });
        // The 'data' listener consumes this chunk — it contains the MP4
        // ftyp/moov header, so it MUST be written before piping the rest
        res.write(firstChunk);
        ff.stdout.pipe(res);
      }
    });

    ff.stderr.on('data', (d) => {
      // Only log if headers not sent yet (startup errors)
      if (!headersSent) console.error('[ffmpeg hevc]', d.toString().trim());
    });

    ff.on('close', (code) => {
      if (headersSent) {
        console.log(`[ffmpeg] done ${path.basename(filePath)} code=${code}`);
        return;
      }
      if (retriesLeft > 0 && !res.destroyed) {
        console.error('[video-server] FFmpeg exited with code', code, `— retrying in ${RETRY_DELAY_MS / 1000}s (drive may be re-enumerating)`);
        setTimeout(() => {
          if (!res.destroyed) attempt(retriesLeft - 1);
        }, RETRY_DELAY_MS);
        return;
      }
      console.error('[video-server] FFmpeg exited with code', code, '— sending 500');
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Transcode failed');
      }
    });

    ff.on('error', (err) => {
      console.error('[video-server] FFmpeg spawn error:', err);
      if (!res.headersSent) { res.writeHead(500); res.end('Transcode error'); }
    });

    // Killing on res 'close' alone is not enough. The response travels
    // browser -> cloudflared -> proxy(4180) -> here, and a browser abort does
    // not always reach us: the proxy can keep its upstream socket open, so
    // 'close' never fires and FFmpeg transcodes on for nobody. Two of those
    // pinned this 4-core Pi at load 14.8 today, which starved the very
    // segment requests the player was waiting on — a black screen.
    //
    // So also watch progress. If not one byte is consumed for IDLE_KILL_MS,
    // the far end is gone and the transcode is pure waste. Kill it.
    const IDLE_KILL_MS = 120_000;
    let lastWrite = Date.now();
    ff.stdout.on('data', () => { lastWrite = Date.now(); });
    const idleTimer = setInterval(() => {
      if (Date.now() - lastWrite > IDLE_KILL_MS) {
        console.error('[video-server] idle', IDLE_KILL_MS / 1000 + 's —',
          'killing transcode of', path.basename(filePath));
        ff.kill('SIGKILL');
        if (!res.destroyed) res.destroy();
      }
    }, 15_000);
    idleTimer.unref?.();
    ff.on('close', () => clearInterval(idleTimer));
    res.on('close', () => { clearInterval(idleTimer); ff.kill('SIGKILL'); });
  }

  attempt(1);
}

const CHUNK = 5 * 1024 * 1024;

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...CORS,
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Allow-Methods': 'GET',
    });
    res.end();
    return;
  }

  const urlPath = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);

  // HLS routing: /<file>/index.m3u8  and  /<file>/segN.ts
  // plus /<file>/codec.json — the watch page asks this first to learn whether
  // the file plays natively or has to come through HLS.
  const playlistMatch = urlPath.match(/^(.+)\/index\.m3u8$/);
  const segmentMatch = urlPath.match(/^(.+)\/seg(\d+)\.ts$/);
  const codecMatch = urlPath.match(/^(.+)\/codec\.json$/);
  if (codecMatch) {
    const mediaPath = path.join(HDD_ROOT, codecMatch[1]);
    if (!mediaPath.startsWith(HDD_ROOT + '/')) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(mediaPath)) { res.writeHead(404); res.end('Not Found'); return; }
    const info = probeMedia(mediaPath);
    // A day of caching is only safe when the probe actually answered. If
    // ffprobe failed, hls is a filename GUESS — and a wrong guess cached for
    // 24h leaves the browser fetching a raw HEVC file it cannot decode, which
    // looks exactly like "the video is broken". Tell caches not to keep it.
    res.writeHead(200, {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': info ? 'public, max-age=86400' : 'no-store',
    });
    res.end(JSON.stringify({ hls: needsTranscode(mediaPath), probed: !!info, ...(info || {}) }));
    return;
  }
  if (playlistMatch || segmentMatch) {
    const relFile = (playlistMatch || segmentMatch)[1];
    const mediaPath = path.join(HDD_ROOT, relFile);
    if (!mediaPath.startsWith(HDD_ROOT + '/')) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(mediaPath)) { res.writeHead(404); res.end('Not Found'); return; }
    if (playlistMatch) {
      console.log(`[hls] playlist ${path.basename(mediaPath)}`);
      serveHlsPlaylist(mediaPath, res);
    } else {
      serveHlsSegment(mediaPath, parseInt(segmentMatch[2], 10), res);
    }
    return;
  }

  const filePath = path.join(HDD_ROOT, urlPath);

  if (!filePath.startsWith(HDD_ROOT + '/')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not Found'); return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers['range'];

  console.log(
    `[req] ${new Date().toISOString()} ${path.basename(filePath)} ` +
    `range=${rangeHeader || '-'} ua="${(req.headers['user-agent'] || '-').slice(0, 70)}"`
  );

  // Undecodable in a browser → transcode on the fly (legacy progressive path;
  // watch page uses HLS)
  if (needsTranscode(filePath)) {
    serveTranscoded(filePath, fileSize, res, rangeHeader);
    return;
  }

  // Non-HEVC — raw byte-range serving (unchanged)
  const mime = getMime(filePath);

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr
      ? Math.min(parseInt(endStr, 10), fileSize - 1)
      : Math.min(start + CHUNK - 1, fileSize - 1);
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      ...CORS,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
  } else {
    res.writeHead(200, {
      ...CORS,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    });

    const end = Math.min(CHUNK - 1, fileSize - 1);
    const stream = fs.createReadStream(filePath, { start: 0, end });
    stream.pipe(res, { end: false });
    stream.on('end', () => res.destroy());
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
  }
});

server.listen(PORT, () => {
  console.log(`Video server running on port ${PORT}`);
});
