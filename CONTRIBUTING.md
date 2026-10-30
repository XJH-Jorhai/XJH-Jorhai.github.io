# 协作与发布

GitHub 仓库是本项目的唯一协作来源。本地目录只作为检出、编辑和验证环境；不可将仅存在本地的修改视为已交付。

1. 从最新 `main` 创建 `feat/<topic>`、`fix/<topic>` 或 `docs/<topic>` 分支。
2. 在分支上实现并提交，推送到 GitHub。涉及不同方向的改进使用不同分支。
3. 创建 Pull Request，写明变化、验证和未完成事项。需要讨论的问题用 Issue 追踪。
4. GitHub Actions 执行内容检查、静态构建和浏览器路径测试。视觉或动效修改另外提供实际画面检查。
5. 检查通过并经维护者决定合并后，由 `main` 自动部署 GitHub Pages。PR 不覆盖线上站点。
6. 后续回退使用 revert 提交或回退 PR，不重写主分支历史，不直接强推。

第一次导入可直接建立 `main`。之后的日常改进必须走分支和 PR；不要擅自合并尚未得到合并授权的 PR。

## 命令

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:site
```

`check` 验证仓库中的内容、图片引用和公开资产，不依赖未公开的原图。拥有私有素材时，额外运行 `npm run check:sources`；重新生成图片需按 RUNBOOK 运行图片脚本并重新核对画面。

## 资料边界

公开：网站源码、锁文件、优化后的公开素材、处理配方和代理深度、现行规范及文字报告。

本地保留：`inputs/source/` 原图和论文、封面制作 PNG、`reports/evidence/` 截图录像、旧实现完整快照、依赖和构建缓存。不要用 Git LFS 把这些原始资料自动公开。历史文字报告中的本地证据路径可能不在仓库中，这不代表可重新声称已验证。
