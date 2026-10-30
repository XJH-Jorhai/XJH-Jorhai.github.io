# FIELDNOTES

个人博客，记录研究、制作与观察。使用 Astro 静态输出，包含 Blog 首页、Work 作品索引、Notes 笔记目录及两篇项目详情。

网站：[xjh-jorhai.github.io](https://xjh-jorhai.github.io/) · 仓库：[XJH-Jorhai/XJH-Jorhai.github.io](https://github.com/XJH-Jorhai/XJH-Jorhai.github.io) · [自动检查与发布](https://github.com/XJH-Jorhai/XJH-Jorhai.github.io/actions)

## 开发

要求 Node.js 24（最低版本见 package.json），使用 npm 与唯一的 package-lock.json。

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run build
npm run preview
```

仓库包含网页使用的优化素材，普通克隆、检查、构建和部署无需原始照片、论文或模型。原始素材留在本地；拥有这些素材时可运行 `npm run check:sources` 校验哈希。图片再生产步骤见 RUNBOOK。

## 协作与上线

所有后续改进通过 GitHub 分支和 Pull Request 进行。Actions 检查内容、构建并运行浏览器路径测试；只有 main 的成功构建部署到 GitHub Pages。详情见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 资料入口

- [项目资料索引](docs/PROJECT_MAP.md)：目录、内容入口、现行规范与历史文档。
- [运行手册](RUNBOOK.md)：改文、换图、动效参数和诊断。
- [协作规则](AGENTS.md)：最新约定优先。
- [Blog / Notes / Work 验证](reports/blog-index.md)：页面统一与实际检查。
- [图片与深度来源](reports/image-depth-processing.md)：视觉代理深度，不代表真实尺寸。

正常桌面作品图采用轻微清晰空间视差；触控、减少动效和 WebGL 失败时显示静态海报。笔记占位明确标注为草稿，不虚构发布日期。图片、正文和研究材料未授予额外开放许可；第三方依赖遵循各自许可证。
