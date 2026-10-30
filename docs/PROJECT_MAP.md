# 项目资料索引

## 当前站点

Astro 静态博客，三类入口：Blog `/`、Work `/work/`、Notes `/notes/`。两篇项目详情位于 `/projects/project-01/` 和 `/projects/project-02/`；原 Work 配色实验路由继续保留。

| 需要修改 | 入口 |
| --- | --- |
| 首页介绍与笔记占位 | `src/data/journal.ts` |
| 项目正文与元信息 | `src/content/projects/*.md` |
| 首页、Notes、Work 路由 | `src/pages/` |
| 统一大标题、作品与笔记列表 | `src/components/IndexHeading.astro`、`WorkGallery.astro`、`NoteList.astro` |
| 矿物浅色主题 | `src/data/work-themes.ts` |
| 字体、间距及共用排版 | `src/styles/` |
| WebGL 与流场 | `src/lib/scene/` |
| 图片与代理深度配方 | `inputs/image-recipe.json`、`inputs/depth/` |
| 已优化的发布素材 | `public/media/`、`src/data/*.assets.json` |
| GitHub 自动检查与发布 | `.github/workflows/pages.yml` |

## 规范与状态

- `AGENTS.md`：代理协作规则；顶部最新约定优先于旧版本要求。
- `CONTRIBUTING.md`：GitHub 分支、PR、检查和发布流程。
- `RUNBOOK.md`：环境、内容维护、图片处理与历史运行记录。
- `design.md`、`WEBGL_SPEC.md`、`IMAGE_PIPELINE.md`：设计和渲染规范。
- `reports/blog-index.md`：Blog / Notes / Work 统一风格的验收。
- `reports/parallax-refinement.md`、`reports/work-index.md`：既有作品视差及画廊记录。
- `ACCEPTANCE.md`、`CODEX_TASK.md`、`UPGRADE_FROM_V1.md`、`REQUIREMENTS_README.md`：阶段任务和历史基线；景深相关旧要求已被最新清晰视差约定覆盖。

父目录中的旧 v1 要求包、论文原件、重复素材及旧快照不复制进网站仓库。此仓库以当前可运行项目为基础整理，所有原始本地资料仍保留。
