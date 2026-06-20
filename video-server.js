import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HDD_ROOT = '/mnt/hdd';
const PORT = 4179;

const MIME = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'video/mp4';
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Allow-Methods': 'GET',
    });
    res.end();
    return;
  }

  const urlPath = decodeURIComponent(req.url.replace(/^\//, ''));
  const filePath = path.join(HDD_ROOT, urlPath);

  if (!filePath.startsWith(HDD_ROOT + '/')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mime = getMime(filePath);
  const rangeHeader = req.headers['range'];

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
  };

  const CHUNK = 5 * 1024 * 1024; // 5MB — keeps Cloudflare Tunnel happy

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
    // No Range header — initial browser request (common on mobile).
    // Return 200 with full Content-Length + Accept-Ranges so the browser knows
    // the total file size and that seeking is supported. Stream only the first
    // CHUNK bytes then close; the browser will issue Range requests for the rest.
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
