import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve('.');
const file = resolve('src/content/projects/project-01.md');
const staging = resolve('reports/.maintenance-build');
if (relative(root, staging).startsWith('..') || staging === root) throw new Error('临时构建目录不在项目内');
const original = await readFile(file);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const marker = '维护检查临时标题（完成后还原）';
const result = { date: new Date().toISOString(), beforeSha256: hash(original), marker, pages: [] };
try {
  await writeFile(file, original.toString('utf8').replace(/^title:.*$/m, `title: "${marker}"`));
  const build = spawnSync(process.execPath, ['scripts/astro.mjs', 'build', '--outDir', staging], { cwd: root, encoding: 'utf8' });
  result.buildExitCode = build.status;
  result.buildLog = build.stdout + build.stderr;
  if (build.status !== 0) throw new Error('标题维护构建失败');
  for (const path of ['index.html', 'projects/project-01/index.html']) {
    const html = await readFile(resolve(staging, path), 'utf8');
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    const present = Boolean(h1?.replace(/<[^>]*>/g, '').includes(marker));
    result.pages.push({ path, titleSynchronized: present });
    if (!present) throw new Error(`标题未同步：${path}`);
  }
} finally {
  await writeFile(file, original);
  result.afterSha256 = hash(await readFile(file));
  result.restored = result.afterSha256 === result.beforeSha256;
  await mkdir('reports/evidence', { recursive: true });
  await writeFile('reports/evidence/maintenance-results.json', JSON.stringify(result, null, 2));
  await rm(staging, { recursive: true, force: true });
}
if (!result.restored) throw new Error('原始内容未还原');
console.log('维护验证通过：仅修改一处Markdown标题，两页同步；源文件按字节还原。');
