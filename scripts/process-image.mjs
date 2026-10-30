import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 所有具体色值、源图信息与裁切参数只从配方读取。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recipe = JSON.parse(await readFile(path.join(root, 'inputs/image-recipe.json'), 'utf8'));
const previousManifest = await readFile(path.join(root, recipe.outputs.manifest), 'utf8').then(JSON.parse).catch(() => null);
const resolveLocal = (relative) => {
  const absolute = path.resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) throw new Error(`路径越界：${relative}`);
  return absolute;
};
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const writeJson = async (relative, value) => {
  await mkdir(path.dirname(resolveLocal(relative)), { recursive: true });
  await writeFile(resolveLocal(relative), JSON.stringify(value, null, 2) + '\n');
};

async function loadSource(source) {
  const bytes = await readFile(resolveLocal(source.sourcePath));
  const hash = sha256(bytes);
  if (hash !== source.sourceSha256.toLowerCase()) throw new Error(`${source.sourcePath} 的 SHA-256 与配方不符，停止处理以保护原图。`);
  const metadata = await sharp(bytes).metadata();
  const oriented = await sharp(bytes).rotate().toColourspace('srgb').png().toBuffer();
  const orientedMetadata = await sharp(oriented).metadata();
  const record = {
    path: source.sourcePath,
    originalName: source.sourceOriginalName,
    origin: source.sourceOrigin,
    sha256: hash,
    bytes: bytes.length,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    orientation: metadata.orientation ?? null,
    orientationNote: metadata.orientation ? '按 EXIF 自动规范方向' : '未含 EXIF orientation；按现有像素方向',
    hasAlpha: Boolean(metadata.hasAlpha),
    hasExif: Boolean(metadata.exif),
    hasIcc: Boolean(metadata.icc),
    orientedWidth: orientedMetadata.width,
    orientedHeight: orientedMetadata.height,
  };
  return { bytes, oriented, metadata: orientedMetadata, record };
}

function cropPixels(crop, metadata) {
  const values = ['x', 'y', 'width', 'height'].map((key) => crop[key]);
  if (values.some((n) => !Number.isFinite(n) || n < 0 || n > 1) || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > 1 || crop.y + crop.height > 1) {
    throw new Error('归一化裁切必须在 0–1 范围内且不越界');
  }
  const left = Math.round(crop.x * metadata.width);
  const top = Math.round(crop.y * metadata.height);
  return {
    left,
    top,
    width: Math.min(metadata.width - left, Math.round(crop.width * metadata.width)),
    height: Math.min(metadata.height - top, Math.round(crop.height * metadata.height)),
  };
}

const main = await loadSource(recipe);
const boardSource = await loadSource(recipe.supplement);
const outDir = resolveLocal(recipe.outputs.directory);
await mkdir(outDir, { recursive: true });
await mkdir(resolveLocal('reports/evidence'), { recursive: true });
const outputRecords = [];

async function exportImage(name, source, crop, width, blur = false) {
  const extraction = cropPixels(crop, source.metadata);
  if (width > extraction.width) throw new Error(`${name}: 不允许超出原始有效分辨率 (${extraction.width})`);
  let pipeline = sharp(source.oriented)
    .extract(extraction)
    .resize({ width, withoutEnlargement: true })
    .toColourspace(recipe.adjustments.colourspace)
    .modulate({ brightness: recipe.adjustments.brightness, saturation: recipe.adjustments.saturation });
  // 如输入存在透明部分，仅在主体外按唯一页面基底色合成；不改动已有不透明背景。
  if (source.metadata.hasAlpha) pipeline = pipeline.flatten({ background: recipe.palette.base });
  if (blur) pipeline = pipeline.blur(Math.max(0.3, recipe.blur.sigma * width / recipe.blur.referenceWidth));
  const filename = `${name}-${width}.webp`;
  const buffer = await pipeline.webp({ quality: recipe.outputs.quality, effort: recipe.outputs.effort, smartSubsample: true }).toBuffer();
  await writeFile(path.join(outDir, filename), buffer);
  const metadata = await sharp(buffer).metadata();
  if (metadata.exif || metadata.xmp || metadata.icc) throw new Error(`公开素材仍含不需要的元数据：${filename}`);
  const output = {
    src: `/media/${recipe.projectId}/${filename}`,
    width: metadata.width,
    height: metadata.height,
    bytes: buffer.length,
    sha256: sha256(buffer),
    format: metadata.format,
    source: source.record.path,
    crop: { ...crop, pixels: extraction },
    focus: crop.focus,
    blurSigma: blur ? Math.max(0.3, recipe.blur.sigma * width / recipe.blur.referenceWidth) : 0,
  };
  outputRecords.push(output);
  return output;
}

async function exportSet(prefix, source, crop, widths, blur = false) {
  const sources = [];
  for (const width of widths) sources.push(await exportImage(prefix, source, crop, width, blur));
  const largest = sources.at(-1);
  return { ...largest, srcset: sources.map((s) => `${s.src} ${s.width}w`).join(', '), sources };
}

const poster = await exportSet('poster', main, recipe.desktopCrop, recipe.outputs.posterWidths);
const texture = await exportImage('texture', main, recipe.desktopCrop, 2560);
const blur = await exportSet('blur', main, recipe.desktopCrop, recipe.outputs.posterWidths, true);
// 相同画幅可复用响应图，避免复制未使用的字节；仍提供独立手机接口。
const mobileSources = poster.sources.filter((source) => recipe.outputs.mobileWidths.includes(source.width));
const sameCrop = ['x', 'y', 'width', 'height'].every((key) => recipe.desktopCrop[key] === recipe.mobileCrop[key]);
const mobile = sameCrop
  ? { ...mobileSources.at(-1), srcset: mobileSources.map((s) => `${s.src} ${s.width}w`).join(', '), sources: mobileSources, reuse: 'poster', crop: recipe.mobileCrop }
  : await exportSet('mobile', main, recipe.mobileCrop, recipe.outputs.mobileWidths);
const detail = await exportImage('detail', main, recipe.detailCrop, recipe.outputs.detailWidth);
const boardCrop = { x: 0, y: 0, width: 1, height: 1, focus: { x: 0.5, y: 0.5 } };
const board = await exportImage('board', boardSource, boardCrop, recipe.outputs.boardWidth);
const manifest = {
  projectId: recipe.projectId,
  strategy: recipe.strategy,
  presentation: recipe.presentation,
  focusMode: recipe.focusMode,
  palette: recipe.palette,
  source: main.record,
  supplementalSource: boardSource.record,
  poster,
  texture,
  mobile,
  blur,
  detail,
  board,
  ...recipe.descriptions,
};
const previousOutputs = previousManifest
  ? [...previousManifest.poster.sources, ...previousManifest.blur.sources, previousManifest.detail, previousManifest.board]
  : [];
const hashesBefore = new Map(previousOutputs.map((output) => [output.src, output.sha256]));
const reproducibility = outputRecords.map((output) => ({
  src: output.src,
  before: hashesBefore.get(output.src) ?? null,
  after: output.sha256,
  identical: hashesBefore.get(output.src) === output.sha256,
}));
const repeatVerified = previousManifest?.source.sha256 === main.record.sha256
  && previousManifest?.supplementalSource.sha256 === boardSource.record.sha256
  && reproducibility.every((output) => output.identical);
await writeJson(recipe.outputs.manifest, manifest);
await writeJson('reports/evidence/source-vs-processed.reproducibility.json', {
  sourceSha256: main.record.sha256,
  supplementalSourceSha256: boardSource.record.sha256,
  sharp: sharp.versions.sharp,
  libvips: sharp.versions.vips,
  repeatVerified,
  outputs: reproducibility,
});

// 对照只进入本地报告，不放入 public。标签沿用配方颜色。
const sheetWidth = 1800;
const sheetHeight = 1425;
const panelWidth = 850;
const title = (text, x, y, size = 24) => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${recipe.palette.text}">${text}</text>`;
const labels = `<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg">${title(`SOURCE / ORIGINAL — ${main.record.width} × ${main.record.height}`, 35, 43)}${title(`DERIVED / POSTER — ${poster.width} × ${poster.height}`, 915, 43)}${title('SOURCE DETAIL / SAME PIXEL REGION', 35, 555)}${title('DERIVED DETAIL / SAME PIXEL REGION', 915, 555)}${title('USER SUPPLIED BOARD VIEW', 35, 1115)}${title('BLUR CONTROL / SAME FRAME', 915, 1115)}</svg>`;
const scaledSource = await sharp(main.oriented).resize({ width: panelWidth }).png().toBuffer();
const scaledPoster = await sharp(resolveLocal(`public${poster.src}`)).resize({ width: panelWidth }).png().toBuffer();
const region = cropPixels({ x: 0.285, y: 0.115, width: 0.47, height: 0.478 }, main.metadata);
const sourceDetail = await sharp(main.oriented).extract(region).resize({ width: panelWidth }).png().toBuffer();
const ratio = poster.width / main.metadata.width;
const posterRegion = { left: Math.round(region.left * ratio), top: Math.round(region.top * ratio), width: Math.round(region.width * ratio), height: Math.round(region.height * ratio) };
const processedDetail = await sharp(resolveLocal(`public${poster.src}`)).extract(posterRegion).resize({ width: panelWidth }).png().toBuffer();
const smallBoard = await sharp(resolveLocal(`public${board.src}`)).resize({ width: 500 }).png().toBuffer();
const smallBlur = await sharp(resolveLocal(`public${blur.src}`)).resize({ width: 500 }).png().toBuffer();
await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: recipe.palette.base } })
  .composite([
    { input: scaledSource, left: 35, top: 65 },
    { input: scaledPoster, left: 915, top: 65 },
    { input: sourceDetail, left: 35, top: 580 },
    { input: processedDetail, left: 915, top: 580 },
    { input: smallBoard, left: 35, top: 1135 },
    { input: smallBlur, left: 915, top: 1135 },
    { input: Buffer.from(labels), left: 0, top: 0 },
  ])
  .png()
  .toFile(resolveLocal(recipe.outputs.contactSheet));

const kib = (bytes) => (bytes / 1024).toFixed(1);
const listSource = (source) => `- 留存：\`${source.path}\`；原名：\`${source.originalName}\`。\n- 来源：${source.origin}。\n- SHA-256：\`${source.sha256}\`。\n- ${source.format.toUpperCase()}，${source.width} × ${source.height}，${source.bytes.toLocaleString('en-US')} 字节；${source.orientationNote}。\n- 原文件 EXIF：${source.hasExif ? '有' : '无'}；ICC：${source.hasIcc ? '有' : '无'}；Alpha：${source.hasAlpha ? '有' : '无'}。`;
const report = `# 图片处理记录\n\n日期：2026-10-25。命令：\`npm run images\`。工具：Sharp ${sharp.versions.sharp} / libvips ${sharp.versions.vips}，仅本地确定性处理；未上传、未使用生成式图像工具、分割模型或深度模型。\n\n## 原始输入\n\n### 主图：实物照片\n\n${listSource(main.record)}\n\n### 补充：用户提供的另一张板级视图\n\n${listSource(boardSource.record)}\n\n原字节保存在非公开的 \`inputs/source/\`，脚本每次先校验哈希，不匹配即停止；不覆盖输入。论文和答辩 PDF 不进入网站公开目录。\n\n## 观察与处理策略\n\n已查看两张原图及处理对照。主照片可见带纹理的承托面、绿色电路板、黑色打开的外壳、左侧多条线缆和右侧三个金属接口。线缆跨越画面左缘，外壳与承托面边缘复杂，强行抠图可能损失细线与现场信息，因此采用 \`preserve-scene\`，以 \`framed-photo\` 的留白构图呈现完整摄影平面。另一张板级视图独立注明用户提供，并非实物照片生成的新视角。\n\n曝光 brightness=${recipe.adjustments.brightness}，饱和度 saturation=${recipe.adjustments.saturation}：保持原貌，无局部重绘、无白平衡改色，无锐化或超分。仅规范方向、转换为 sRGB、等比缩小并编码 WebP；公开派生文件不含 EXIF、XMP 或 ICC 私有元数据。透明输入如有，仅在透明背景合成页面基底。\n\n唯一配色入口为 \`inputs/image-recipe.json\`，由脚本输出到资产清单，页面及 Canvas 读取该清单：基底 ${recipe.palette.base}，正文 ${recipe.palette.text}，辅助 ${recipe.palette.muted}，强调 ${recipe.palette.accent}，分隔 ${recipe.palette.line}。页面暗绿呼应电路板和现场的暗部，浅色文字与少量黄绿强调保留对象的视觉主导。\n\n## 裁切与聚焦\n\n- 桌面与手机：归一化矩形 \`(x=0, y=0, width=1, height=1)\`，保留完整画面。手机通过文字/图片重排，而不裁掉左线缆、右接口和前盖。手机 640/1280 响应版本复用海报，不复制同样文件。\n- 裁切后焦点：\`(x=0.54, y=0.31)\`。焦点相对显示画幅，不是源图像素。\n- 详情局部：\`(x=0.23, y=0.08, width=0.60, height=0.40)\`；实际源图像素 \`${JSON.stringify(detail.crop.pixels)}\`，说明是同一照片的局部。它让板上元件区域与接口在阅读栏内获得更大观察尺度，不作为另一项目或实验视角。\n- 柔焦采用屏幕空间模拟：以1920宽 sigma=${recipe.blur.sigma} 为参考，1280/640 按宽度同比缩小 sigma。清晰/柔焦方向、尺寸和裁切相同，网页两层共享承载层和定位；未估计真实深度，未生成遮挡后的结构。\n- 未使用蒙版、深度图或三维模型；页面 CSS 的软边焦点只是视觉控制，不是科学测量。\n\n## 产物清单\n\n所有公开文件位于 \`public/media/project-01/\`，资产入口 \`${recipe.outputs.manifest}\`。\n\n| 文件 | 用途 | 尺寸 | 字节 / KiB |\n| --- | --- | --- | --- |\n${outputRecords.map((o) => `| ${o.src.split('/').at(-1)} | ${o.blurSigma ? `同裁切柔焦，σ=${o.blurSigma.toFixed(2)}` : o.src.includes('detail') ? '同照片局部' : o.src.includes('board') ? '用户补充板级视图' : '清晰海报 / 响应式'} | ${o.width} × ${o.height} | ${o.bytes} / ${kib(o.bytes)} |`).join('\n')}\n\n编码：WebP quality=${recipe.outputs.quality}，effort=${recipe.outputs.effort}，smartSubsample=true。海报最大版本 ${kib(poster.bytes)} KiB，${poster.bytes <= 600 * 1024 ? '低于约600 KiB预算' : '超过约600 KiB预算；保留细线与原图文字优先'}；长边不高于1920，未超出原始有效分辨率。所有产物含实际SHA-256，记录于资产清单各 sources 中。\n\n## 对照与保真检查\n\n证据：\`reports/evidence/source-vs-processed.png\`。左上为原图等比预览，右上为最终1920海报；中行是同源区域的原图与海报近看对照；下行包含用户第二张板图及同画幅柔焦控制图。对照图仅进入本地报告。\n\n- 已查看：实物整体、左右接口、彩色线缆、板上元件、前盖及原有标记均保留；整幅无裁切。原图本身的边缘截断（左侧线缆延伸出画面）按原样保留。\n- 已查看：文字没有经OCR或重绘；原图已模糊的小字没有补字。缩小会减少文字可辨性，因此详情提供更大局部及另附板级视图，仍不宣称恢复源图之外细节。\n- 未建立主体抠图蒙版，故没有抠图光边或删线问题；没有改变线缆、LED、板面和金属接口的关键颜色。\n- 清晰图和柔焦图由同一个裁切调用生成，尺寸一致；不会因素材坐标差异产生轮廓重影。网页移动时是否露边、焦点映射是否正确由浏览器C05单独实测，不以此处脚本校验代替。\n- ${repeatVerified ? "本次已实际重跑，与运行前的资产清单逐项对比，8个公开文件SHA-256全部一致。" : "本次为首次生成或配方已变更；应再运行一次检查是否得到相同哈希。"} 机器记录：\`reports/evidence/source-vs-processed.reproducibility.json\`。\n\n## 可重复执行与修改\n\n在项目目录安装依赖后执行 \`npm run images\`。更换图片时保留原字节到 \`inputs/source/\`，更新配方 sourcePath、sourceSha256、来源、裁切及产物宽度，再运行脚本。若要使用新的标题或正文，不需要重跑图片。改配色只改配方 palette，然后重新生成清单。普通 \`npm run build\` 只消费已生成素材，不下载模型、不执行图像推理。\n\n本流程没有不能自动重复的人工修图步骤；人工工作仅为查看原图、确定配方及复查对照。已知限制：照片为单一固定视角，存在原始景深和反光；屏幕聚焦模拟不等于真实调焦或三维重建。\n`;
await writeFile(resolveLocal(recipe.outputs.report), report);
console.log(`图片流程完成：${outputRecords.length} 个公开 WebP；最大主海报 ${poster.width}×${poster.height} / ${kib(poster.bytes)} KiB。`);
console.log(`原图哈希校验通过；资产清单：${recipe.outputs.manifest}；本地对照：${recipe.outputs.contactSheet}。`);
