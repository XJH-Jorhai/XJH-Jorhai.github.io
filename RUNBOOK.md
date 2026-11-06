# RUNBOOK.md

如何运行、修改和检查这个博客。2026-11-06 起的现行版本；之前的维护记录在 `docs/archive/RUNBOOK-history.md`。

## 环境

Node.js 24（最低见 `package.json`）、npm、唯一的 `package-lock.json`。主要依赖：Astro、Three.js、Motion、three-fluid-fx、Sharp、Playwright。

## 常用命令

```sh
npm ci              # 安装依赖
npm run dev         # 开发服务器 http://127.0.0.1:4321
npm run check       # 类型、内容、公开素材检查
npm run build       # 静态输出到 dist/
npm run preview     # 预览 dist/，http://127.0.0.1:4321
npm run test:site   # 浏览器路径测试（需 npx playwright install chromium）
npm run test:piston # 首页铁傀儡动画测试（需先运行 preview）
```

浏览器测试默认使用 Playwright 自带的 Chromium；要指定其他浏览器，设置环境变量 `BROWSER_EXECUTABLE`。

## 改内容

| 改什么 | 文件 |
| --- | --- |
| 首页介绍、About、笔记占位 | `src/data/journal.ts` |
| 站名、页脚 | `src/config/site.ts` |
| 项目正文与元信息 | `src/content/projects/*.md` |
| 作品列表标题、标签、alt | `src/data/work-index.ts` |
| 配色 | `src/data/work-themes.ts`、`src/data/*.assets.json` |

## 改动效

参数入口与含义见 `design.md` 第 7 节。核心参数在 `src/lib/scene/config.ts`；鼠标流光在 `src/lib/scene/fluidSettings.ts` 与 `MineralFluid.ts`。

诊断：在页面 URL 后加 `?inspect`，控制台可用 `__spatial`（详情页）或 `__gallery`（索引页）读取快照、切换视图，例如：

```js
__spatial.set({input:[-1,0]})   // 固定视角向左
__spatial.set({view:'depth'})   // 'geometry' | 'flow' | 'color'
__spatial.snapshot()
```

## 换图或新增作品

需要本地私有原图（`inputs/source/`，不在仓库中）。

1. `npm run check:sources` 校验原图哈希。
2. 更新 `inputs/image-recipe.json` 或对应项目的处理脚本，重画 `inputs/depth/` 中的代理轮廓。
3. `npm run images` 生成详情页素材；画廊封面用 `node scripts/process-work-covers.mjs`。
4. 在 `src/data/projects.ts` 注册，在 `src/content/projects/` 添加正文。
5. `npm run check`、`npm run build`，浏览器中检查左右/上下视角和遮挡边缘。

素材处理记录自动写入 `reports/`。铁傀儡海报重建：预览运行时执行 `node scripts/prepare-piston-poster.mjs`。

## 目录

| 位置 | 内容 |
| --- | --- |
| `src/pages/` | 路由：`/`、`/work/`、`/notes/`、`/projects/[slug]/` |
| `src/components/` | 页面组件 |
| `src/lib/scene/` | WebGL：视差场景、画廊、流光、铁傀儡 |
| `src/lib/motion/` | 指针、帧调度、文字动效 |
| `src/styles/` | 全局样式与 tokens |
| `public/media/` | 已优化的公开素材 |
| `inputs/` | 处理配方与代理深度（原图不提交） |
| `reports/` | 素材处理记录（脚本生成） |
| `docs/` | 渲染与图片规范；`docs/archive/` 为历史文档 |
