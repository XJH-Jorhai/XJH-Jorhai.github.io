import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const fail = message => { throw new Error(message); };
const recipe = JSON.parse(await readFile('inputs/image-recipe.json', 'utf8'));
const assets = JSON.parse(await readFile('src/data/project-01.assets.json', 'utf8'));
for (const [key,color] of Object.entries(recipe.palette)) {
  if (!/^#[0-9a-f]{6}$/i.test(color) || assets.palette[key] !== color) fail(`配色不一致: ${key}`);
}
const checkSources = process.argv.includes('--sources');
if (checkSources) for (const input of [recipe, recipe.supplement]) {
  const hash = createHash('sha256').update(await readFile(input.sourcePath)).digest('hex');
  if (hash !== input.sourceSha256) fail(`原图哈希不一致: ${input.sourcePath}`);
}
for (const key of ['poster','mobile','blur','detail','board']) {
  const asset = assets[key];
  if (!asset?.width || !asset?.height || !asset.src.startsWith('/media/')) fail(`资产信息不完整:${key}`);
  await stat(resolve(root, 'public', asset.src.slice(1)));
}
if (assets.poster.width !== assets.blur.width || assets.poster.height !== assets.blur.height) fail('清晰柔焦尺寸不匹配');
const content = await readdir('src/content/projects');
if (content.filter(x => x.endsWith('.md')).sort().join() !== 'project-01.md,project-02.md') fail('项目内容不完整');
const second=JSON.parse(await readFile('src/data/project-02.assets.json','utf8'));
if(checkSources && createHash('sha256').update(await readFile(second.source.path)).digest('hex')!==second.source.sha256)fail('project-02 原图哈希不一致');
for(const asset of [second.poster,second.texture])await stat(resolve('public',asset.src.slice(1)));
const secondProxy=JSON.parse(await readFile(resolve('public',second.spatial.runtime.slice(1)),'utf8'));
if(secondProxy.layers.length<3||new Set(secondProxy.layers.map(l=>l.distance)).size<3)fail('project-02 深度层不完整');
for (const file of ['pnpm-lock.yaml','yarn.lock']) {
  try { await stat(file); fail('只允许 package-lock.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await stat('package-lock.json');
const proxy=JSON.parse(await readFile(resolve('public',assets.spatial.runtime.slice(1)),'utf8'));
if(proxy.layers.length<3||new Set(proxy.layers.map(l=>l.distance)).size<3)fail('需要至少三个有效对象层次');
for(const layer of proxy.layers){if(!Number.isFinite(layer.distance)||layer.distance<=proxy.camera.near||layer.distance>=proxy.camera.far)fail('无效场景深度');if(layer.polygon.length<3||layer.polygon.flat().some(v=>!Number.isFinite(v)||v<0||v>1))fail('无效UV蒙版');}
if(assets.spatial.depthMethod!=='authored_proxy')fail('深度来源必须明确');
await stat(resolve('public',assets.spatial.preview.slice(1)));
// All shipping manifests must resolve, including cover textures and responsive images.
for (const name of (await readdir('src/data')).filter(name => name.endsWith('.assets.json'))) {
  const manifest = JSON.parse(await readFile(`src/data/${name}`, 'utf8'));
  async function validateReferences(value) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\/media\/[^\s,]+/g)) await stat(resolve('public',match[0].slice(1)));
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) await validateReferences(child);
    }
  }
  await validateReferences(manifest);
}
console.log(`内容与公开资产校验通过：配色、素材引用、清晰柔焦尺寸、两项目与单锁文件。原图哈希：${checkSources ? '通过' : '未检查（使用 npm run check:sources 单独校验私有原图）'}。`);
