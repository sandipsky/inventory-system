// Renders Mermaid diagram sources to PNG with headless Chrome over the DevTools protocol.
// Usage from code: const { renderAll } = require('./mermaid-png'); await renderAll([{ id, source }], outDir)
// Each result: { id, file, width, height } (width/height in CSS px) or { id, error }.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME_BIN || 'google-chrome-stable';
const LOCAL_MERMAID = process.env.MERMAID_JS || path.join(__dirname, 'mermaid.min.js');
const MERMAID_SRC = fs.existsSync(LOCAL_MERMAID)
  ? 'file://' + LOCAL_MERMAID
  : 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';

function page(source) {
  const json = JSON.stringify(source);
  return `<!doctype html><html><head><meta charset="utf-8">
<script src="${MERMAID_SRC}"></script>
<style>
  body { margin: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; }
  #d { display: inline-block; padding: 10px; background: #fff; }
  #d svg { display: block; }
</style></head><body><div id="d"></div>
<script>
window.__done = false; window.__error = null;
(async () => {
  try {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose',
      flowchart: { htmlLabels: true, curve: 'basis' }, fontFamily: 'Arial, Helvetica, sans-serif' });
    const { svg } = await mermaid.render('m' + Date.now(), ${json});
    document.getElementById('d').innerHTML = svg;
    const s = document.querySelector('#d svg');
    s.style.maxWidth = 'none';
  } catch (e) { window.__error = String(e && e.message || e); }
  window.__done = true;
})();
</script></body></html>`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitFor(fn, timeoutMs, every = 100) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(every);
  }
  throw new Error('timeout');
}

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); }
  open() {
    return new Promise((res, rej) => {
      this.ws.onopen = () => res();
      this.ws.onerror = e => rej(new Error('ws error'));
      this.ws.onmessage = m => {
        const data = JSON.parse(m.data);
        if (data.id && this.pending.has(data.id)) {
          const { res, rej } = this.pending.get(data.id);
          this.pending.delete(data.id);
          data.error ? rej(new Error(data.error.message)) : res(data.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function renderAll(diagrams, outDir) {
  if (!diagrams.length) return [];
  fs.mkdirSync(outDir, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mmd-chrome-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--hide-scrollbars',
    '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--window-size=1400,1000', 'about:blank',
  ], { stdio: 'ignore' });
  const results = [];
  try {
    const list = await waitFor(async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await r.json();
        return targets.find(t => t.type === 'page');
      } catch { return null; }
    }, 15000, 200);
    const cdp = new Cdp(list.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    for (const d of diagrams) {
      const html = path.join(outDir, `${d.id}.html`);
      fs.writeFileSync(html, page(d.source));
      try {
        await cdp.send('Page.navigate', { url: 'file://' + html });
        await waitFor(async () => {
          const r = await cdp.send('Runtime.evaluate', { expression: 'window.__done === true', returnByValue: true });
          return r.result.value === true;
        }, 20000, 100);
        const err = await cdp.send('Runtime.evaluate', { expression: 'window.__error', returnByValue: true });
        if (err.result.value) throw new Error(err.result.value);
        // Let fonts/layout settle
        await sleep(150);
        const rect = await cdp.send('Runtime.evaluate', {
          expression: 'JSON.stringify(document.getElementById("d").getBoundingClientRect())', returnByValue: true,
        });
        const { x, y, width, height } = JSON.parse(rect.result.value);
        const w = Math.ceil(width), h = Math.ceil(height);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: Math.max(w, 400), height: Math.max(h, 200), deviceScaleFactor: 2, mobile: false,
        });
        await sleep(100);
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'png', clip: { x, y, width: w, height: h, scale: 2 }, captureBeyondViewport: true,
        });
        const file = path.join(outDir, `${d.id}.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        results.push({ id: d.id, file, width: w, height: h });
      } catch (e) {
        results.push({ id: d.id, error: e.message });
      } finally {
        fs.rmSync(html, { force: true });
      }
    }
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
  }
  return results;
}

module.exports = { renderAll };

if (require.main === module) {
  // node mermaid-png.js diagram.mmd out.png
  const [src, out] = process.argv.slice(2);
  renderAll([{ id: 'cli', source: fs.readFileSync(src, 'utf8') }], path.dirname(path.resolve(out))).then(r => {
    if (r[0].error) { console.error(r[0].error); process.exit(1); }
    fs.renameSync(r[0].file, out);
    console.log(`${out} ${r[0].width}x${r[0].height}`);
  });
}
