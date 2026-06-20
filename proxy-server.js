// Proxy: /api/stream/* → video-server (4179), everything else → Next.js (4178)
import http from 'http';

const NEXT_PORT = 4178;
const VIDEO_PORT = 4179;
const PROXY_PORT = 4180;

function proxy(req, res, targetPort, rewritePath) {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: rewritePath || req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
    res.on('close', () => proxyReq.destroy());
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Bad Gateway');
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/stream/')) {
    // Strip /api/stream prefix, video server expects /<show>/<file>
    const videoPath = req.url.replace(/^\/api\/stream/, '');
    proxy(req, res, VIDEO_PORT, videoPath);
  } else {
    proxy(req, res, NEXT_PORT);
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy server running on port ${PROXY_PORT}`);
});
