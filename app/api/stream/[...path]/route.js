import fs from 'fs';
import path from 'path';

const HDD_ROOT = '/mnt/hdd';

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.webm': 'video/webm' };
  return map[ext] || 'video/mp4';
}

export async function GET(request, { params }) {
  const segments = (await params).path;
  const filePath = path.join(HDD_ROOT, ...segments.map(decodeURIComponent));

  // Path traversal guard
  if (!filePath.startsWith(HDD_ROOT + '/')) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response('Not Found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mime = getMime(filePath);
  const range = request.headers.get('range');

  const CHUNK = 5 * 1024 * 1024; // 5MB max per response — Cloudflare Tunnel chokes on huge open-ended ranges

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : Math.min(start + CHUNK - 1, fileSize - 1);
    const chunkSize = end - start + 1;

    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', chunk => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', err => controller.error(err));
      },
      cancel() { nodeStream.destroy(); },
    });

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': mime,
        'Cache-Control': 'no-store',
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', chunk => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', err => controller.error(err));
    },
    cancel() { nodeStream.destroy(); },
  });

  return new Response(webStream, {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  });
}
