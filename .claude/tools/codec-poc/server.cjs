// Codec direct-play POC: serves raw sample files (byte ranges, no transcode) + their ffprobe info,
// so a phone/browser can report what it decodes natively. Throwaway, LAN only, port 4190.
const http = require('http'), fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const H = '/mnt/hdd/';
const PATHS = [
  'Avatar The Last Airbender (2005)/Season 01/Avatar The Last Airbender - S01E01 - The Boy in the Iceberg.mp4',
  '1899/Season 01/1899 S01E01 - The Ship.mkv',
  'Raakh (2026)/Raakh S01 E01.mkv',
  'The Boys (2019)/Season 04/The Boys S04E01 (1080p x265).mkv',
  'Dororo/01 - The tale of Daigo.mkv',
  'Good Will Hunting (1997)/Good Will Hunting (1997).mkv',
];
// resolved per request, original first: GWH moves to .hevc-originals when its H.264 swap lands
const samples = () => PATHS.map((p) => [H + '.hevc-originals/' + p, H + p].find((f) => fs.existsSync(f))).filter(Boolean);

function probe(f) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_entries',
    'stream=codec_type,codec_name,profile,level,pix_fmt,width,height,r_frame_rate:format=format_name,bit_rate', f]));
  const v = j.streams.find((s) => s.codec_type === 'video') || {}, a = j.streams.find((s) => s.codec_type === 'audio') || {};
  return { name: path.basename(f), ext: path.extname(f).slice(1), format: j.format.format_name, bitrate: +j.format.bit_rate || 5e6,
    vcodec: v.codec_name, profile: v.profile, level: v.level, pixFmt: v.pix_fmt, width: v.width, height: v.height,
    fps: eval(v.r_frame_rate || '24'), acodec: a.codec_name };
}

http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res); }
  if (req.url === '/result' && req.method === 'POST') {  // page reports each check here → results.jsonl
    let b = ''; req.on('data', (c) => b += c); req.on('end', () => { fs.appendFileSync(path.join(__dirname, 'results.jsonl'), b.slice(0, 4000) + '\n'); res.end('ok'); }); return;
  }
  if (req.url === '/list') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(samples().map(probe))); }
  const m = req.url.match(/^\/f\/(\d+)$/), f = m && samples()[+m[1]];
  if (!f) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, r = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  const type = f.endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska';
  if (!r) { res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' }); return fs.createReadStream(f).pipe(res); }
  const s = +r[1], e = r[2] ? Math.min(+r[2], size - 1) : Math.min(s + 4 * 2 ** 20 - 1, size - 1);
  res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${size}`, 'Content-Length': e - s + 1, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(f, { start: s, end: e }).pipe(res);
}).listen(4190, () => console.log('codec POC on :4190', samples().length, 'samples'));
