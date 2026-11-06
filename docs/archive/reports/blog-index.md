# Blog / Notes / Work Index 验证

日期：2026-10-30

## 实现

首页成为 Blog Index；独立 Notes 与 Work 页面采用 Work Index 的 Mineral Fog 配色、字体尺度、细线、留白与背景。共用 IndexHeading、WorkGallery 和 NoteList，导航互通并标示当前位置。介绍与四条草稿集中在 journal.ts，没有虚构发布日或实验结果。笔记以原生 details 展开占位提纲，不指向不存在的文章。

保留：项目内容、素材、空间渲染参数、Work 配色实验路径及详情页。无新增依赖。未改图片或深度配方，本轮复用已生成素材，未重新运行素材生产流程。

## 通过

- npm run check：0 errors、0 warnings、0 hints；原图哈希与内容资产校验通过。
- npm run build：9 条静态路由构建成功。
- preview：本机 127.0.0.1:4330。
- Edge / Playwright：1440×1000、768×1000、360×1000，Blog / Notes / Work 均 HTTP 200，标题正确，无横向溢出。
- 首页 → Notes → Work → 项目详情导航。
- 键盘 Enter 展开写作提纲；禁用 JS 与减少动效模式内容可读，提纲可展开。
- 首页作品区滚动进入视口后两张封面实际渲染，第一张 hover active=true；已检查作品区截图。
- 已人工查看桌面首页、作品区、手机 Blog 和 Notes 截图。

## 说明

构建仍提示图形分包超过 500 kB，未在本次版式任务中调整图形依赖。普通桌面整页截图不能可靠捕获固定 WebGL 画布的视口外区域；作品区效果以 blog-gallery-desktop.png 为证，完整静态布局以 blog-static-full.png 为证。详细浏览器版本、测试结果和截图见 evidence/blog-index/。本轮未重做全部历史 W01–W10 图形验收，不宣称全站图形性能复验通过。未向外部发布。
