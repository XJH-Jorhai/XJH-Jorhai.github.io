// Builds a single self-contained HTML file for the opening prototype (open it straight from disk).
// Usage: node lab/opening/build.mjs   →   lab/opening/teisu-opening.html
import {readFile, writeFile} from 'node:fs/promises';
const here = new URL('.', import.meta.url);
const repo = new URL('../../', import.meta.url);
const brand = JSON.parse(await readFile(new URL('src/data/brand.json', repo), 'utf8'));
const painting = await readFile(new URL('public/media/persona/oil-1254.webp', repo));
const L = brand.letters, light = '#F6F1E7';
const wordmark = [
  ['l l-T', light, L.T], ['l l-E l-E1', light, L.E1], ['l l-E l-E2', brand.colors.red, L.E2], ['l l-E l-E3', light, L.E3],
  ['l l-I', light, L.I], ['l l-S', light, L.S], ['l l-U', light, L.U],
].map(([cls, fill, body]) => `<g class="${cls}" fill="${fill}">${body}</g>`).join('');
const html = (await readFile(new URL('template.html', here), 'utf8'))
  .replace('__PAINTING__', `data:image/webp;base64,${painting.toString('base64')}`)
  .replace('__WORDMARK__', `<defs><clipPath id="wm"><rect x="190" y="1250" width="1660" height="384"/></clipPath></defs><g clip-path="url(#wm)">${wordmark}</g>`)
  .replace('__BRAND__', JSON.stringify({pieces: brand.pieces, colors: brand.colors}));
await writeFile(new URL('teisu-opening.html', here), html);
console.log(`lab/opening/teisu-opening.html  ${(html.length / 1024).toFixed(0)} KB`);
