// The check every modelling step has to pass: the model from eight angles, and front / side / back in an
// orthographic camera next to the reference turnaround at the same height. One view that looks right
// proves nothing (a model fitted to one picture can be a flat shape from anywhere else).
// Usage: node lab/persona-model/turntable.mjs [out-dir]   (build first: npm run lab:model)
// Writes turntable.png and three-view.png (default: reports/evidence/persona-model/, git-ignored).
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const out = process.argv[2] ?? `${repo}reports/evidence/persona-model`;
await mkdir(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.vrm': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png'};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.startsWith('/ref/') ? `${repo}public/media/persona/${path.slice(5)}` : `${here}dist${path === '/' ? '/index.html' : path}`;
  try { const body = await readFile(file); res.writeHead(200, {'content-type': types[extname(file)] ?? 'application/octet-stream'}); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {});
const page = await browser.newPage({viewport: {width: 480, height: 720}, deviceScaleFactor: 1});
await page.goto(`${base}/?shot`);
await page.waitForFunction(() => window.__model?.ready, null, {timeout: 120000});
const grab = async (deg, ortho) => { await page.evaluate(([d, o]) => window.__model.view(d, o), [deg, ortho]); return (await page.locator('canvas').screenshot()).toString('base64'); };
const angles = [0, 45, 90, 135, 180, 225, 270, 315], spins = [];
for (const deg of angles) spins.push(await grab(deg, false));
// front, her right side (she faces right, as on the reference sheet), back
const views = [];
for (const deg of [0, -90, 180]) views.push(await grab(deg, true));
const sheet = await browser.newPage({viewport: {width: 4 * 480, height: 2 * 720 + 40}, deviceScaleFactor: 1});
await sheet.setContent(`<body style="margin:0;background:#F3EDE2;font:14px monospace;color:#083366;display:grid;grid-template-columns:repeat(4,480px)">${spins.map((b, i) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${b}" width="480" height="720"><figcaption style="position:absolute;left:10px;top:8px">${angles[i]}°</figcaption></figure>`).join('')}</body>`);
await sheet.screenshot({path: `${out}/turntable.png`, fullPage: true});
// Three views: the model (top) over the reference sheet's views (bottom), each scaled to the same height.
await sheet.setViewportSize({width: 3 * 480, height: 2 * 720});
await sheet.setContent(`<body style="margin:0;background:#F3EDE2;display:grid;grid-template-columns:repeat(3,480px)">${views.map(b => `<img src="data:image/png;base64,${b}" width="480" height="720">`).join('')}${['view-front', 'view-side', 'view-back'].map(n => `<div style="height:720px;display:grid;place-items:center"><img src="${base}/ref/${n}.webp" style="height:690px"></div>`).join('')}</body>`);
await sheet.waitForLoadState('networkidle');
await sheet.screenshot({path: `${out}/three-view.png`});
await browser.close(); server.close();
console.log(`${out}/turntable.png\n${out}/three-view.png`);
