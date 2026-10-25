import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [,, url, out, w, h, mobile] = process.argv;
const prof = fs.mkdtempSync('/tmp/cdp-');
const ch = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars',
  '--remote-debugging-port=9333', `--user-data-dir=${prof}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 30 && !ws; i++) { await sleep(500);
  try { const t = await (await fetch('http://127.0.0.1:9333/json')).json();
    ws = t.find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const sock = new WebSocket(ws); await new Promise(r => sock.onopen = r);
let id = 0; const pend = {};
sock.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; sock.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Page.navigate', { url }); await sleep(3000);
// unsigned token, far-future exp — AuthGate only checks exp client-side
const tok = 'x.' + Buffer.from(JSON.stringify({ sub: 'shot', exp: 4102444800 })).toString('base64url') + '.x';
await send('Runtime.evaluate', { expression: `localStorage.setItem('shows_auth', JSON.stringify({token:'${tok}'}))` });
await send('Page.navigate', { url }); await sleep(7000);
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
fs.writeFileSync(out, Buffer.from(data, 'base64')); ch.kill(); process.exit(0);
