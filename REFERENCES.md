# REFERENCES.md

视觉参考与灵感来源。版本 3.0 · 2026-11-06。旧版（v2 需求依据）见 git 历史。

参考的是气质、节奏和交互思路。不复制他站的素材、商标、文案或源代码，也不声称复刻了它们的内部实现。

## 1. 用户指定的视觉来源

- [Lusion](https://lusion.co/)：**最喜欢的艺术与交互参考。**
- [Lusion Projects](https://lusion.co/projects/)：项目呈现参考。
- [EnduroSat](https://www.endurosat.com/)：用实物承担视觉叙事的启发；不采用它偏企业化的语气。

### 从 Lusion 学什么

| 方面 | Lusion 的做法 | 在本站怎么落地 |
| --- | --- | --- |
| 首屏 | 一句超大的主张 + 一个可交互的三维主体 | 首页 `h1` 主张 + 铁傀儡 |
| 文字出现 | 标题按行从遮罩下方升起，缓出曲线很长 | `data-reveal="lines"`，1.15s `cubic-bezier(.16,1,.3,1)` |
| 鼠标 | 柔和、有惯性的流体光，跟随但不抢戏 | 粉彩薄膜光带，2–3 秒淡出 |
| 节奏 | 浅色与深色区块交替，大量留白 | 首页 About 深色带 |
| 结尾 | 超大字标收尾 | `FIELDNOTES` 字标 |
| 克制 | 一屏只有一个主角 | 每屏只保留一个动的东西 |

## 2. 推荐继续看的网站

按「想学什么」分组。每条写了建议重点看的地方。

### WebGL 动效与氛围（和 Lusion 最接近）

- [Active Theory](https://activetheory.net/)：老牌 WebGL 工作室。看页面切换时三维场景如何连续过渡、不白屏。
- [Igloo Inc](https://www.igloo.inc/)：Awwwards 2024 年度网站。看「滚动 = 镜头移动」的叙事方式，以及冰块、体积光的材质。
- [Unseen Studio](https://unseen.co/)：英国布里斯托工作室，Awwwards 2021 年度工作室。看光标交互和品牌感很强的动效节奏。
- [Bruno Simon](https://bruno-simon.com/)：个人作品集做成可以开车的三维小世界。看一个人如何用 Three.js 做出有个性的个人站。

### 日系克制感

- [Garden Eight](https://garden-eight.com/)：东京的设计工作室。看转场、滚动和 WebGL 如何服从信息结构，「安静但精致」。
- [Kenta Toshikura](https://kentatoshikura.com/)：Garden Eight 的设计/前端负责人，个人作品集。看玻璃折射效果和极简排版的组合。Codrops 有[复刻他的玻璃效果的教程](https://tympanus.net/codrops/2023/03/06/coding-kenta-toshikuras-glass-effect-with-three-js)。

### 硬件与实物叙事（和你的电路项目最相关）

- [Teenage Engineering](https://teenage.engineering/)：产品照片极干净，等宽字体与小标签的用法。看如何让硬件本身成为版面的主角。
- [Nothing](https://nothing.tech/)：点阵字体与透明硬件。看产品页如何用拆解视角展示内部结构。

### 个人站与排版

- [Rauno Freiberg](https://rauno.me/)：交互设计师的个人站。看小尺度交互的精度：hover、键盘焦点、细节过渡。
- [Paco Coursey](https://paco.me/)：极简个人站。看「几乎什么都不做」时字体和间距如何撑起页面。
- [Locomotive](https://locomotive.ca/)：蒙特利尔工作室，平滑滚动与大字排版的代表。

### 学习资源

- [Codrops](https://tympanus.net/codrops/)：大量 WebGL / 动效教程和案例拆解，很多直接对应上面这些网站。
- [Maxime Heckel 的博客](https://blog.maximeheckel.com/)：着色器、流体、光照的长文讲解，适合理解本站流光背后的原理。
- [Awwwards WebGL 合集](https://www.awwwards.com/websites/webgl/)：持续更新的获奖 WebGL 网站。
- [Godly](https://godly.website/)：精选网站画廊，可按动效、排版筛选。

> 以上网站于 2026-11-06 整理。Igloo Inc、Unseen Studio、Garden Eight、Kenta Toshikura 通过搜索确认仍在获奖/活跃；其余是长期知名的站点，未逐一打开核对，网址如有变动以搜索为准。

## 3. 工程资料

| 来源 | 用途 |
| --- | --- |
| [Three.js 文档](https://threejs.org/docs/) | PerspectiveCamera、DepthTexture、EffectComposer、ShaderPass、OutputPass |
| [Three.js Color Management](https://threejs.org/manual/#en/color-management) | 颜色纹理与输出色彩空间 |
| [Three.js Cleanup](https://threejs.org/manual/#en/cleanup) | GPU 资源释放 |
| [three-fluid-fx](https://www.npmjs.com/package/three-fluid-fx) | 首页流光的流体求解器（MIT，许可见 `public/licenses/`） |
| [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | 渲染目标与性能原则 |
| [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | 减少动效适配 |
| [Astro 文档](https://docs.astro.build/) | 静态页面与内容集合 |
| [Motion](https://motion.dev/) | 帧调度与 DOM 动画 |
| [Sharp](https://sharp.pixelplumbing.com/) | 确定性图片处理 |
| [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) | 可选的单图深度估计工具（Small 为 Apache-2.0），不是网页依赖 |
