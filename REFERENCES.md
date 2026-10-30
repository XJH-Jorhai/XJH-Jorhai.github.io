# REFERENCES.md — v2 需求与技术依据

版本：2.0 · 核查日期：2026-10-25

## 用户本轮反馈

用户明确提出“WebGL 完整版：深度图、视差、景深和后处理”，并认为当前位移、缩放、聚焦与预期的有趣视角跟随差距较大；背景已有鼠标轨迹，但形态不好看。

提供的是网页截图。截图足以讨论版面和图片呈现，无法确认实际运行的渲染代码与动态轨迹。本包的技术路线是为该需求制定的升级方案，不声称已经修改站点，也不声称恢复了 Lusion 的私有实现。

原有审美继续有效：研究对象建立识别度；字体和图片主导；作品与页面底色协调；互动丰富而视觉克制；方便维护。

## 视觉来源

- [Lusion](https://lusion.co/)：用户最喜欢的艺术与交互参考。
- [Lusion Projects](https://lusion.co/projects/)：项目呈现参考。
- [EnduroSat](https://www.endurosat.com/)：对象承担视觉叙事的启发；不采用其企业化视觉语气。

无需复制他站资产、商标或源代码。参考站点变动或访问失败不阻塞本包执行。

## 官方工程资料

| 来源 | 用途 |
| --- | --- |
| [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html) | 透视相机与参数 |
| [Three.js DepthTexture](https://threejs.org/docs/pages/DepthTexture.html) | 保存当前渲染深度 |
| [Three.js BokehPass](https://threejs.org/docs/pages/BokehPass.html) | 景深、focus 参数的距离含义 |
| [Three.js EffectComposer](https://threejs.org/docs/pages/EffectComposer.html) | 后处理链 |
| [Three.js ShaderPass](https://threejs.org/docs/pages/ShaderPass.html) | 小型定制 pass |
| [Three.js OutputPass](https://threejs.org/docs/pages/OutputPass.html) | tone mapping、颜色转换及与 FXAA 的顺序 |
| [Three.js Color Management](https://threejs.org/manual/pages/color-management.html) | 颜色纹理、非颜色控制数据与输出 |
| [Three.js Cleanup](https://threejs.org/manual/pages/cleanup.html) | GPU 资源释放 |
| [Three.js Post Processing](https://threejs.org/manual/pages/post-processing.html) | 后处理工作方式 |
| [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | 资源、渲染目标及性能原则 |
| [Astro Islands](https://docs.astro.build/en/concepts/islands/) | 新项目的静态内容与局部交互 |
| [Motion](https://motion.dev/docs/animate) | DOM 动画与状态过渡 |
| [Sharp](https://sharp.pixelplumbing.com/) | 确定性图像处理 |
| [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) | 减少动效适配 |

按实际安装版本阅读对应 API，不硬编码“最新版”。

## 单图深度与遮挡边界

[Depth Anything V2 官方仓库](https://github.com/DepthAnything/Depth-Anything-V2) 提供相对深度模型与推理方法。官方实现包括 CPU 路径；Small 模型使用 Apache-2.0，其他规模模型的许可不同，实际采用时须核对。此处是可选工具，不是必须下载的前置依赖。

[3D Photography using Context-aware Layered Depth Inpainting](https://shihmengli.github.io/3D-Photo-Inpainting/)（CVPR 2020）说明单图新视点中被遮挡区域的颜色与深度补全问题。本项目只借鉴层次与遮挡问题的认识，不照搬生成未知科研结构的做法。

模型深度与人为代理均是视觉控制资产，不构成科研测量。单图的未拍摄表面与已失焦细节不会因 WebGL 而自动恢复。

## 本包自行制定的内容

相机范围、时序、模糊量、流场分辨率、分层策略和验收条件都是本次实现建议／约束，不是第三方网站原始参数。背景平流与扩散是视觉近似，不宣称不可压缩流体的物理精度。
