// Builds the public Persona assets from the two private source images (inputs/source/persona/, not in
// the repo): the character cut out of the key visual, and plain crops of the reference sheet.
// Usage: node scripts/process-persona.mjs [--debug <dir>]
//
// Nothing is redrawn. The cut-out only removes the key visual's flat background (listed in the recipe:
// cream, red and navy for the current image; a single chroma green for a new one) or, with
// `"background": "alpha"`, keeps a transparent source's own alpha. The sheet crops are untouched pixels. Palette values are medians sampled from
// the sheet's own swatches.
import sharp from 'sharp';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const recipe = JSON.parse(await readFile('inputs/persona-recipe.json', 'utf8'));
const debug = process.argv.includes('--debug') ? process.argv[process.argv.indexOf('--debug') + 1] : null;
const out = 'public/media/persona';
await mkdir(out, {recursive: true});
if (debug) await mkdir(debug, {recursive: true});

async function source(entry) {
  const bytes = await readFile(entry.path);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256) throw new Error(`Source changed: ${entry.path} (${hash}). Re-check the recipe's boxes, then update sha256.`);
  return bytes;
}
const dist = (r, g, b, c) => Math.hypot(r - c[0], g - c[1], b - c[2]);
/** Distance from a colour to the segment between two colours. */
function segmentDistance(r, g, b, p, q) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], t = Math.min(1, Math.max(0, ((r - p[0]) * d[0] + (g - p[1]) * d[1] + (b - p[2]) * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2])));
  return Math.hypot(r - p[0] - d[0] * t, g - p[1] - d[1] * t, b - p[2] - d[2] * t);
}

/* ---------- 1 the character, cut out of the key visual ---------- */
/**
 * A source that already has a transparent background. Its alpha is kept, with two clean-ups that the
 * recipe controls (`alpha.floor`, `alpha.ceil`): generators often leave a faint haze of the removed
 * background (alpha just above 0) and never quite reach full opacity. Below `floor` becomes 0, above
 * `ceil` becomes 255, the band in between is stretched, so anti-aliased edges stay soft. Then only the
 * figure itself is kept (the largest connected piece), which drops stray specks. Colours are not touched.
 */
async function fromAlpha(bytes, cfg) {
  const {floor = 0, ceil = 255} = cfg.alpha ?? {};
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const W = info.width, H = info.height, N = W * H;
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    data[i * 4 + 3] = a <= floor ? 0 : a >= ceil ? 255 : Math.round((a - floor) / (ceil - floor) * 255);
  }
  // Largest 4-connected piece of visible pixels.
  const label = new Int32Array(N); let best = 0, bestSize = 0, labels = 0;
  for (let start = 0; start < N; start++) {
    if (!data[start * 4 + 3] || label[start]) continue;
    const id = ++labels, members = [start]; label[start] = id;
    for (let n = 0; n < members.length; n++) {
      const i = members[n], x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && data[j * 4 + 3] && !label[j]) { label[j] = id; members.push(j); }
    }
    if (members.length > bestSize) { bestSize = members.length; best = id; }
  }
  for (let i = 0; i < N; i++) if (label[i] !== best) data[i * 4 + 3] = 0;
  const buffer = await sharp(data, {raw: {width: W, height: H, channels: 4}}).trim({threshold: 1}).png().toBuffer();
  const file = await sharp(buffer).webp({quality: 92, alphaQuality: 100, effort: 6}).toFile(`${out}/figure.webp`);
  if (debug) for (const [name, colour] of [['on-green', '#00c060'], ['on-navy', '#083366'], ['on-red', '#EF3025'], ['on-paper', '#F3EDE2']])
    await sharp({create: {width: file.width, height: file.height, channels: 3, background: colour}}).composite([{input: buffer}]).png().toFile(`${debug}/figure-${name}.png`);
  return {src: '/media/persona/figure.webp', width: file.width, height: file.height, bytes: file.size};
}

async function cutout() {
  const cfg = recipe.keyVisual, bytes = await source(cfg);
  // `"background": "alpha"` in the recipe: the image already comes cut out (a transparent PNG).
  if (cfg.background === 'alpha') return fromAlpha(bytes, cfg);
  const {data, info} = await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject: true});
  const W = info.width, H = info.height, N = W * H;
  const grounds = cfg.background.map(g => g.rgb), limits = cfg.background.map(g => g.tolerance);
  // Class of every pixel: 0 = not background-coloured, 1.. = which flat ground it matches.
  // `near` is the same test with looser limits; it only says which grounds are around a pixel.
  const cls = new Uint8Array(N), near = new Uint8Array(N), loose = cfg.background.map(g => g.tolerance * cfg.nearFactor);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    for (let k = 0; k < grounds.length; k++) { const d = dist(r, g, b, grounds[k]); if (d < loose[k]) { near[i] = k + 1; if (d < limits[k]) cls[i] = k + 1; break; } }
  }
  // Anti-aliased seams between two grounds (and around the lettering): a blend of two ground colours
  // that actually has both of them next to it.
  const seam = new Uint8Array(N), R = 2;
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) {
    const i = y * W + x; if (cls[i]) continue;
    let seen = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const c = near[i + dy * W + dx]; if (c) seen |= 1 << c; }
    if ((seen & (seen - 1)) === 0) continue; // fewer than two different grounds nearby
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    let off = Infinity;
    for (let p = 0; p < grounds.length; p++) for (let q = p + 1; q < grounds.length; q++) if (seen & (1 << (p + 1)) && seen & (1 << (q + 1))) off = Math.min(off, segmentDistance(r, g, b, grounds[p], grounds[q]));
    if (off < cfg.seamTolerance) seam[i] = 1;
  }
  // Flood from the image edge through ground-coloured pixels and seams: everything reached is background.
  const bg = new Uint8Array(N), stack = [];
  const push = i => { if (!bg[i] && (cls[i] || seam[i])) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (i >= W) push(i - W); if (i < N - W) push(i + W);
  }
  // Where the figure is almost the colour of the ground (the pale hat on cream) colour cannot decide.
  // There the outline is traced by hand: everything inside a `keep` polygon belongs to the figure.
  const locked = new Uint8Array(N);
  for (const shape of cfg.keep ?? []) {
    const pts = shape.points, ys = pts.map(p => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
      const cuts = [];
      for (let a = 0; a < pts.length; a++) { const [x1, y1] = pts[a], [x2, y2] = pts[(a + 1) % pts.length]; if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) cuts.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1)); }
      cuts.sort((a, b) => a - b);
      for (let c = 0; c + 1 < cuts.length; c += 2) for (let x = Math.max(0, Math.round(cuts[c])); x <= Math.min(W - 1, Math.round(cuts[c + 1])); x++) { locked[y * W + x] = 1; bg[y * W + x] = 0; }
    }
  }
  // Elsewhere the palest ground leaves a rim of nearly-cream pixels: let the background creep a few
  // pixels further through anything nearly that colour. Outlines and the traced shapes stop it.
  const rim = cfg.rim ?? {ground: '', depth: 0, tolerance: 0}, pale = cfg.background.findIndex(g => g.name === rim.ground);
  for (let pass = 0; pale >= 0 && pass < rim.depth; pass++) {
    const grow = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (bg[i] || locked[i] || !(bg[i - 1] || bg[i + 1] || bg[i - W] || bg[i + W])) continue;
      if (dist(data[i * 3], data[i * 3 + 1], data[i * 3 + 2], grounds[pale]) < rim.tolerance) grow.push(i);
    }
    if (!grow.length) break;
    for (const i of grow) bg[i] = 1;
  }
  // Enclosed pockets of a saturated ground (between the raised arm and the hair, for instance).
  const seenPocket = new Uint8Array(N), pockets = cfg.pocketGrounds ?? [];
  for (let start = 0; start < N; start++) {
    if (bg[start] || seenPocket[start] || !pockets.includes(cls[start])) continue;
    const members = [start]; seenPocket[start] = 1;
    for (let n = 0; n < members.length; n++) {
      const i = members[n], x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !bg[j] && !seenPocket[j] && (pockets.includes(cls[j]) || seam[j])) { seenPocket[j] = 1; members.push(j); }
    }
    if (members.length >= cfg.pocketMinArea) for (const i of members) bg[i] = 1;
  }
  // Keep the figure only: the largest piece of what is left once hairline bridges are broken
  // (erode by one pixel, pick the largest component, grow it back by one pixel inside the mask).
  const core = new Uint8Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; core[i] = !bg[i] && !bg[i - 1] && !bg[i + 1] && !bg[i - W] && !bg[i + W] ? 1 : 0; }
  const label = new Int32Array(N); let best = 0, bestSize = 0, labels = 0;
  for (let start = 0; start < N; start++) {
    if (!core[start] || label[start]) continue;
    const id = ++labels, members = [start]; label[start] = id;
    for (let n = 0; n < members.length; n++) { const i = members[n]; for (const j of [i - 1, i + 1, i - W, i + W]) if (core[j] && !label[j]) { label[j] = id; members.push(j); } }
    if (members.length > bestSize) { bestSize = members.length; best = id; }
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (bg[i]) continue;
    let keep = false;
    for (let dy = -1; dy <= 1 && !keep; dy++) for (let dx = -1; dx <= 1; dx++) if (label[i + dy * W + dx] === best) { keep = true; break; }
    if (!keep) bg[i] = 2;
  }
  for (let x = 0; x < W; x++) { if (!bg[x]) bg[x] = 2; }
  // Soft one-pixel edge: alpha from a 3×3 average of the mask.
  const rgba = Buffer.alloc(N * 4);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let fg = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; n++; fg += bg[yy * W + xx] ? 0 : 1; }
    const a = bg[i] ? 0 : Math.round(255 * Math.min(1, Math.max(0, (fg / n - .34) / .5)));
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = a;
    if (a > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const box = {left: Math.max(0, x0 - 2), top: Math.max(0, y0 - 2), width: Math.min(W, x1 + 3) - Math.max(0, x0 - 2), height: Math.min(H, y1 + 3) - Math.max(0, y0 - 2)};
  const figure = sharp(rgba, {raw: {width: W, height: H, channels: 4}}).extract(box);
  const file = await figure.clone().webp({quality: 92, alphaQuality: 100, effort: 6}).toFile(`${out}/figure.webp`);
  if (debug) for (const [name, colour] of [['on-green', '#00c060'], ['on-navy', '#083366'], ['on-red', '#EF3025'], ['on-paper', '#F3EDE2']])
    await sharp({create: {width: box.width, height: box.height, channels: 3, background: colour}}).composite([{input: await figure.clone().png().toBuffer()}]).png().toFile(`${debug}/figure-${name}.png`);
  return {src: '/media/persona/figure.webp', width: file.width, height: file.height, bytes: file.size};
}

/* ---------- 2 plain crops of the reference sheet ---------- */
async function sheetCrops() {
  const cfg = recipe.referenceSheet, bytes = await source(cfg), result = {};
  for (const [group, items] of Object.entries(cfg.crops)) {
    result[group] = [];
    for (const item of items) {
      const [left, top, right, bottom] = item.box, name = `${group}-${item.id}.webp`;
      const file = await sharp(bytes).extract({left, top, width: right - left, height: bottom - top}).webp({quality: 92, effort: 6}).toFile(`${out}/${name}`);
      result[group].push({id: item.id, src: `/media/persona/${name}`, width: file.width, height: file.height});
    }
  }
  // Palette: the median colour of each swatch.
  const {data, info} = await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject: true});
  result.palette = cfg.swatches.map(({id, at: [cx, cy], radius}) => {
    const channels = [[], [], []];
    for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) for (let c = 0; c < 3; c++) channels[c].push(data[(y * info.width + x) * 3 + c]);
    const median = channels.map(v => v.sort((a, b) => a - b)[v.length >> 1]);
    return {id, hex: '#' + median.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()};
  });
  return result;
}

const assets = {note: 'Generated by scripts/process-persona.mjs from private sources; do not edit by hand.', figure: await cutout(), ...(await sheetCrops())};
await writeFile('src/data/persona.assets.json', JSON.stringify(assets, null, 2) + '\n');
console.log(`Persona assets: figure ${assets.figure.width}×${assets.figure.height} (${(assets.figure.bytes / 1024).toFixed(0)} KB), ${Object.values(recipe.referenceSheet.crops).flat().length} sheet crops, palette ${assets.palette.map(p => p.hex).join(' ')}`);
