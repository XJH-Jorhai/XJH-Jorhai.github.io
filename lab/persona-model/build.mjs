// Builds the persona model prototype into lab/persona-model/dist/ (index.html, one script, the model).
// Usage: node lab/persona-model/build.mjs   (npm run lab:model)
// The base model is fetched once into .cache/ from the VRM Consortium's sample repository (pinned
// commit); it is not committed to this repository.
import {mkdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const here = fileURLToPath(new URL('.', import.meta.url));
const MODEL = 'https://raw.githubusercontent.com/vrm-c/vrm-specification/94e82dd346fa6cf0337c4421728640e5252dd38e/samples/VRM1_Constraint_Twist_Sample/vrm/VRM1_Constraint_Twist_Sample.vrm';
const cached = `${here}.cache/base.vrm`;
await mkdir(`${here}.cache/public`, {recursive: true});
if (!(await stat(cached).catch(() => null))) {
  const res = await fetch(MODEL);
  if (!res.ok) throw new Error(`Could not fetch the base model: ${res.status}`);
  await writeFile(cached, Buffer.from(await res.arrayBuffer()));
}
// The model ships as a script (base-vrm.js sets window.__baseVrm to its bytes in base64), so the
// prototype can be hosted where only ordinary web file types are served.
await writeFile(`${here}.cache/public/base-vrm.js`, `window.__baseVrm=${JSON.stringify((await readFile(cached)).toString('base64'))};\n`);
// The face textures the user repainted (inputs/source/persona/model/face/, not in the repository): shipped the same
// way, as data URLs in face-textures.js; without them (CI, a fresh clone) the base model's own are used.
const faceDir = fileURLToPath(new URL('../../inputs/source/persona/model/face/', import.meta.url));
const faces = {};
for (const [key, file] of [['skin', 'face-skin.png'], ['iris', 'eye-iris.png'], ['lashes', 'eye-lashes.png']]) {
  const png = await readFile(faceDir + file).catch(() => null);
  if (png) faces[key] = `data:image/png;base64,${png.toString('base64')}`;
}
await writeFile(`${here}.cache/public/face-textures.js`, `window.__faceTextures=${JSON.stringify(Object.keys(faces).length ? faces : null)};\n`);
await build({
  root: here, base: './', publicDir: `${here}.cache/public`, logLevel: 'warn',
  build: {outDir: `${here}dist`, emptyOutDir: true, rollupOptions: {input: `${here}template.html`}, chunkSizeWarningLimit: 2000},
});
await rename(`${here}dist/template.html`, `${here}dist/index.html`);
console.log('lab/persona-model/dist/index.html');
