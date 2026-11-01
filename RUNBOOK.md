# 当前运行与 GitHub 发布入口（2026-10-30）

当前页面：Blog /、Work /work/、Notes /notes/，以及两篇项目详情。后续版本以 GitHub 为协作来源；部署流程见 CONTRIBUTING.md 与 .github/workflows/pages.yml。

普通克隆无需原始照片：运行 npm ci、npm run check、npm run build。npm run preview 在 127.0.0.1:4321 启动本地预览。跨平台路径验证：npx playwright install chromium 后运行 npm run test:site；该脚本自动启动并关闭临时预览服务。Windows 可通过 BROWSER_EXECUTABLE 指向现有浏览器。

需要更换图片时，先恢复本地私有 inputs/source/；npm run check:sources 校验原图，npm run images 生成详情素材，node scripts/process-work-covers.mjs 生成画廊封面（需本地封面源 PNG）。这些素材生产步骤不在 CI 执行，部署只使用已提交的优化素材。

以下是历次维护记录，历史端口、页数和“未部署”描述只对应当时状态，不能据此判断当前线上状态。

---

> 最新：已添加 project-02 隧道二极管作品，当前交互以 design.md v2.3 为准；本轮验证见 reports/project-02-validation.md。

> 当前版本：已按用户要求取消景深与换焦，只保留清晰视差。轮廓修订及最新验证见 reports/parallax-refinement.md。

# 运行与维护（v2）

当前项目原位升级，输出 `/`、`/projects/project-01/` 与 `/projects/project-02/` 三页。没有外部部署。正文、导航与海报不依赖 JavaScript 或 WebGL。

## 环境与启动

实测 Windows；Node 24.14.0、npm 11.9.0、Astro 7.4.2、Three.js 0.186.1、Motion 14.6.0、Sharp 0.35.5、Playwright 1.64.1。Node要求沿用 package.json：>=22.23.4。只有 npm 锁文件；新增 Three.js 用于相机、几何、深度、官方后处理和GPU资源管理；@types/three用于严格类型检查。

```powershell
Set-Location 'C:\Users\ziplab\Desktop\blog\blog-style-prototype'
npm.cmd ci
npm.cmd run images
npm.cmd run check
npm.cmd run build
npm.cmd run preview
```

默认预览 http://127.0.0.1:4321/，端口占用时以终端实际输出为准。当前验收使用 http://127.0.0.1:4322/；沙箱的4321无法由本机验收浏览器访问，因此通过权限机制启动了本机4322。结束服务用 Ctrl+C。开发命令 `npm.cmd run dev`。这些都是本地地址，不是上线网站。

可指定端口：

```powershell
node scripts/astro.mjs preview --host 127.0.0.1 --port 4322
$env:PREVIEW_URL = 'http://127.0.0.1:4322'
npm.cmd run test:webgl
```

`test:browser` 同样指向新版验收；旧版脚本不再作为v2判定标准。验收脚本使用已安装的 Microsoft Edge 路径；其他机器需修改 launch executablePath 或使用 Playwright Chromium。`node scripts/verify-extra.mjs` 补测DPR、缩放与静态对照；`node scripts/verify-maintenance.mjs` 在临时输出目录测试改标题，并 finally 按原字节恢复。旧代码和文档在 `reports/v1-snapshot/`，不参与构建。

## 改内容和图片

- 标题、正文、项目元信息：`src/content/projects/project-01.md`。站名和页脚：`src/config/site.ts`。
- 页面路由保持原有Astro文件；`ProjectVisual`只负责语义海报和布局，渲染在 `src/lib/scene/`。
- 色彩唯一入口：`inputs/image-recipe.json` 的 palette，经 images 输出资产清单；CSS与流场共用。
- 换图：原始字节保存在非公开 `inputs/source/`，更新配方路径、SHA-256和裁切。查看新图后重画 `inputs/depth/proxy.json` 轮廓／层距及特征点，再执行 images、check、build与验收。不能只替换照片而沿用不对应的深度。
- `prepare-depth.mjs` 从同一坐标配方导出运行JSON、预览PNG、分层SVG和非硬件背景延展。原图哈希不符时处理停止。构建只消费已生成素材，不下载或推理模型。

## 动效参数与管线

`src/lib/scene/config.ts` 集中配置yaw/pitch、跟随与归位时间、DPR与场尺寸。`inputs/depth/proxy.json` 的camera保存参考投影参数，层距是任意场景单位，不是实物尺寸。修改层距／轮廓后必须重新验收中性对齐、左右与四角、平深度对照。

同一个WebGL2 renderer执行：CPU对象分层 → PerspectiveCamera → 颜色与DepthTexture  → OutputPass → FXAA → 合成。低分辨率速度／染色场与主图共享renderer，但只画背景。Motion frame是唯一持续调度入口，共享指针驱动标题、相机、流场；无输入并归位后停止。触控、减少动效、加载失败或上下文丢失显示原始静态海报；上下文丢失后刷新可重试。

## 显式检查模式

仅在URL加 `?inspect` 后公开只读快照与检查开关；默认访客界面没有调试UI。

```js
__spatial.set({flow:false,input:[-1,0],flat:false});
__spatial.set({input:[1,0]});
__spatial.set({flat:true}); // 唯一海报平面，作对照
__spatial.set({view:'depth'}); // 'geometry', 'flow', 'color'
__spatial.snapshot();
__spatial.set({flat:false,freeze:false,input:null,view:'color',flow:true,output:true,fxaa:true});
```

直接访问 `/media/project-01/depth-preview.png` 查看来源深度预览。所有证据在 `reports/evidence/`，最终结论以 `reports/validation.md` 为准。快照timings是JavaScript渲染提交耗时，不是GPU帧时间或帧率保证。

验收结束后已停止本轮临时预览进程。重新查看请运行 npm.cmd run preview，按终端打印的本地地址访问。

最新效果说明见 reports/clear-entry-breakout.md。照片默认清晰；移入时一次 700ms 短暂脱焦；设备略微出框。验证命令：node scripts/verify-clear-entry.mjs、node scripts/verify-breakout.mjs。预览：http://127.0.0.1:4321/projects/project-01/?v=breakout-3d

## 新增隧道二极管作品

正文：`src/content/projects/project-02.md`；资产注册：`src/data/projects.ts`。`npm run images` 同时处理两个项目。project-02 独立重建用 `node scripts/process-project-02.mjs`，输入为 `inputs/source/project-02/pcb-clean.png`。原始带标注 JPEG 和论文存放同目录，不进入公开网站。清理 PNG 来自内置 imagegen 去除红色覆盖层的编辑，不在 build 时生成。

浏览器检查：设置 `PREVIEW_URL` 为本机预览地址后运行 `node scripts/verify-project-02.mjs`。首页根据可见面积选择一个活动照片场景，切换前释放旧渲染器；其他照片始终有静态海报。

## 新增作品的统一透视幅度

2026-10-25 用户确认：当前透视幅度为统一基线，横向 yaw = 0.7°、纵向 pitch = 0.45°。现有及后续新增作品的首页和详情页均复用 src/lib/scene/config.ts 的共享参数，不设置项目级幅度覆盖；除非用户再次明确要求调整，不自行增强透视。新增图片仍需单独制作与核对深度轮廓。

## Work Index 独立实验

实验页面为 `/experiments/work-index/`，正式首页未替换。构图分析和验证范围见 `reports/work-index.md`，截图见 `reports/evidence/work-index/`。

运行 `npm run check`、`npm run build` 后，用 `node scripts/astro.mjs preview --host 127.0.0.1 --port 4325` 启动，访问 `http://127.0.0.1:4325/experiments/work-index/`。若端口占用，以终端实际打印地址为准。`npm run preview` 仍保留原默认端口。

验收：`node scripts/verify-work-index.mjs`，默认检查 4325；其他端口用 PowerShell `$env:PREVIEW_URL='http://127.0.0.1:实际端口'` 设置。实验页沿用内容集合与资产清单；只在 hover 时接管对应封面，不改变共享透视参数。

封面重绘版本：实验页使用 inputs/work-covers/ 下保存的内置 imagegen 输出（提示词见 prompts.md）。运行 node scripts/process-work-covers.mjs 重新导出三档 WebP 和独立代理深度；无需再次生成图片，不在 build 时调用生成模型。新增封面已单独注册为 project-01-cover / project-02-cover，原项目资产仍用于正式首页与详情页。


配色预览：/experiments/work-index-a/（Porcelain & Copper）、/experiments/work-index-b/（Mineral Fog）、/experiments/work-index-c/（Graphite Gallery）。默认 /experiments/work-index/ 使用 A。修改统一模板 src/components/WorkIndex.astro 与主题表 src/data/work-themes.ts。验证：node scripts/verify-work-themes.mjs。


最新画廊生命周期：src/lib/scene/GalleryScene.ts，同一 renderer 的独立相机归位，无淡入淡出。诊断 ?inspect 下使用 __gallery.snapshot()。验证 node scripts/verify-gallery-independent.mjs。主体占比规则和测量值在 project-01-cover.assets.json / project-02-cover.assets.json 的 composition。Analog 新源 project-02-balanced.png；原生成图保留。


当前选定主题为 B（Mineral Fog）。默认实验入口与 /experiments/work-index-b/ 均使用雾灰底色的静态镭射渐变；样式集中于 PageShell.astro 的 mineral-iridescent，颜色与透明度可在该处调节。正式首页仍未替换。


Mineral experiment now uses three-fluid-fx 0.1.0 for simulation (MIT; license in public/licenses). Custom optical composition and photo refraction share its velocity/density textures. Run `node scripts/verify-fluid-solver.mjs` for the current solver, refraction boundary, idle and reduced-motion checks. `verify-mineral-sheen.mjs` describes the superseded custom-field layout and is not the current mineral acceptance test.
For current spectral behavior, `node scripts/verify-fluid-speed.mjs` compares slow/fast input and `node scripts/compare-fluid-reference.mjs` captures matching coordinate paths on Lusion and local B (requires internet). B uses 256-base velocity and 512-base optical/density targets with BFECC; the earlier 160/384 settings in historical reports are superseded.

## 首页铁傀儡与凿击 — 2026-11-02

首页介绍左侧使用 Piston Letter Studio v1.2.0 的 MC 原版造型、0.94 秒周期与原始曲线。源码和八张纹理固定在 `public/vendor/piston-letter-studio/`，来源和 Git blob 哈希见其中的 `source.json`。不包含音频。

按用户最后确认的方向，行程 **100 → 0** 收回完成时触发一次；`force = (1 - position) * 100`。初始零位不触发，零位停留不重复，重新伸到 100 后才允许下一次。`src/lib/scene/pistonImpact.ts` 管触发，`PistonGolem.ts` 管原版结构与共享渲染，`MineralFluid.strike()` 将冲量注入现有鼠标流体场；不改动持久保存的鼠标 Force 基准。

启动与验收（PowerShell，项目目录）：

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run preview
# 另一终端；以上命令默认 http://127.0.0.1:4321/
$env:PREVIEW_URL='http://127.0.0.1:4321'
npm.cmd run test:piston
$env:BROWSER_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm.cmd run test:site
```

`test:piston` 优先本机 Edge；其他平台使用已安装的 Playwright Chromium，也可指定 `BROWSER_EXECUTABLE`。海报已提交，普通 build 不需要生成；需要重建时，在预览运行后执行 `node scripts/prepare-piston-poster.mjs`，它调用未修改的上游组件导出透明 PNG。手机、减少动效、无 JS 或 WebGL 失败显示该海报。详细证据口径见 `reports/piston-impact.md`。

## Blog / Notes / Work indexes — 2026-10-30

- `/`: Blog Index，介绍、精选作品、笔记预览和 About。
- `/notes/`: Notes Index，四条明确标注的草稿占位，原生 details 展开写作提纲。
- `/work/`: 正式 Work Index；原 `/experiments/work-index/` 及配色对照路由保留。
- 编辑介绍与占位内容：`src/data/journal.ts`。
- 共用标题：`src/components/IndexHeading.astro`；作品画廊：`WorkGallery.astro`；笔记列表：`NoteList.astro`。
- 安装与验证：`npm ci`（依赖缺失时）、`npm run check`、`npm run build`。
- 本地预览：`node scripts/astro.mjs preview --host 127.0.0.1 --port 4330`。
- 浏览器检查：预览运行后执行 `node scripts/verify-blog-index.mjs` 与 `node scripts/verify-blog-gallery.mjs`（使用本机 Edge）。
