// Builds a single self-contained HTML file for the opening prototype (open it straight from disk).
// Usage: node lab/opening/build.mjs [template-v10.html]   →   lab/opening/teisu-opening.html
import {readFile, writeFile} from 'node:fs/promises';
const here = new URL('.', import.meta.url);
const repo = new URL('../../', import.meta.url);
const brand = JSON.parse(await readFile(new URL('src/data/brand.json', repo), 'utf8'));
const painting = await readFile(new URL('public/media/persona/oil-1254.webp', repo));
const font = await readFile(new URL('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2', repo));
// The hero's styles come straight from the live stylesheet, so the prototype cannot drift from the site.
const homeCss = await readFile(new URL('src/styles/home.css', repo), 'utf8');
const heroCss = homeCss.slice(homeCss.indexOf('/* ================= Hero'), homeCss.indexOf('/* ================= Sections'))
  + '@media(max-width:900px) {' + homeCss.slice(homeCss.indexOf('  .hero-grid {--S:'), homeCss.indexOf('@media(max-width:650px)')).replace(/\}\s*$/, '') + '}';
const word = (w) => [...w].map((c, i) => `<span class="hl" style="--i:${i}">${c}</span>`).join('');
const L = brand.letters, light = '#F6F1E7';
const mark = (ink) => [
  ['l l-T', ink, L.T], ['l l-E l-E1', ink, L.E1], ['l l-E l-E2', brand.colors.red, L.E2], ['l l-E l-E3', ink, L.E3],
  ['l l-I', ink, L.I], ['l l-S', ink, L.S], ['l l-U', ink, L.U],
].map(([cls, fill, body]) => `<g class="${cls}" fill="${fill}">${body}</g>`).join('');
const clip = (id, body) => `<defs><clipPath id="${id}"><rect x="190" y="1250" width="1660" height="384"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`;
const piecesSvg = (day) => ['tl','br','tr','bl','ru','rl','c'].map(k => `<svg class="piece ${k[0]==='r' ? 'is-red' : k==='c' && day ? 'veil' : 'is-ink'}" data-piece="${k}" viewBox="0 0 720 720" aria-hidden="true"><path d="${brand.pieces[k]}"/></svg>`).join('');
const html = (await readFile(new URL(process.argv[2] ?? 'template.html', here), 'utf8'))
  .replace('__PAINTING__', `data:image/webp;base64,${painting.toString('base64')}`)   // older templates only
  .replace('__FONT__', `data:font/woff2;base64,${font.toString('base64')}`)
  .replace('__HERO_CSS__', heroCss)
  .replace('__WORD_A__', word('FIELD')).replace('__WORD_B__', word('NOTES'))
  .replaceAll('__WORDMARK_NAVY__', clip('wmn', mark(brand.colors.navy)))
  .replaceAll('__WORDMARK__', clip('wm', mark(light)))
  .replaceAll('__PIECES_DAY__', piecesSvg(true))
  .replaceAll('__PIECES__', piecesSvg(false))
  .replace('__BRAND__', JSON.stringify({pieces: brand.pieces, colors: brand.colors}));
await writeFile(new URL('teisu-opening.html', here), html);
console.log(`lab/opening/teisu-opening.html  ${(html.length / 1024).toFixed(0)} KB`);
