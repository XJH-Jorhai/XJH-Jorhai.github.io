# Work Index 实验 — 2026-10-25

路由：`/experiments/work-index/`。正式首页、项目详情与 Notes 内容均未替换。

## 参考的实际构图

参考：https://lusion.co/projects/ 。在 Edge、1440 × 1000、DPR 1 下读取 DOM 尺寸并截图。证据位于 `evidence/work-index/lusion-desktop.png`、`lusion-gallery.png` 与两个 measurements JSON。

| 部分 | 实际观测 |
| --- | --- |
| 页面标题 | PROJECTS，字号 244.8px，标题盒顶部 y=250；右侧小字号数量 19 与斜向箭头 |
| 数量 | 当前 19 个项目，非统计面板 |
| 画廊 | 双列；两侧各 72px，列宽约 633.6px，列间距约 28.8px |
| 首排图片 | 顶部 y=618.3；约 633.6 × 411.8px，宽高比约 1.54:1，圆角 |
| 分类 | 图片下约 19.4px 开始，字号 12.96px，一行轻量分类 |
| 项目标题 | 字号 43.2px，分类行后约 13px；无摘要或阅读按钮 |
| 纵向节奏 | 卡片高约 502px，下一排间隔约 80px；标题区与画廊之间留出大幅空白 |

借鉴的是页面尺度、双列画廊与图片优先的信息顺序。没有复制品牌标识、项目素材或站点代码。

## 本地设计

采用巨型 WORK、真实数量 02、双列摄影与“分类 → 项目名称”。1440px 下保留 72px 边距、28.8px 列间距，标题字号 322.56px，照片从约 y=607 开始。两张作品完整占据一排，无空白占位作品；仅一件作品时自动扩展为全宽，760px 以下为单列。

保持现有深绿、暖白和浅金绿配色，由真实 PCB、金属接口、机壳与焊锡形成身份。采用直角照片边界；图片沿用完整的约 1.93:1 / 1.81:1 比例，避免为统一参考比例裁掉接口或板卡。两张照片自然高度相差约 22px，不强行拉伸或改变深度映射。标题与分类没有额外摘要、标签组或阅读按钮。

图片继续使用现有资产：第一件为实物装配照片；第二件为既有 `pcb-clean.png` 派生照片（此前清除标注的来源说明见 RUNBOOK）。本轮没有重绘、生成、上传或新增图像处理策略。已重新运行既有图片与深度流程。

Work Index 只承担浏览选择；Project Detail 继续承担长文；Notes 以页尾轻量入口链接既有记录区。未知 Notes 内容没有被扩写成文章。

## 交互接入

复用 ProjectVisual 与现有场景。新增可选尺寸、隐藏 caption 与 hover 标记，默认值保持原页面行为。实验画廊首次 hover 才创建场景；鼠标切到另一封面时释放前一个 renderer 后接管新图，离开后沿用既有相机归位。首页仍按可见面积选择。没有修改相机、深度、shader、透视幅度或动效配置，没有新增依赖。

## 验证

`npm run images`、`npm run check`、`npm run build` 已通过。check 为 0 错误、0 警告。build 保留已有 WebGL 分包超过 500kB 的提示，未将其描述为性能通过。

真实浏览器验收与截图：`scripts/verify-work-index.mjs`；结果见 `evidence/work-index/results.json`。覆盖桌面双列、四次 hover 切换、单活动 renderer、实际鼠标相机变化、移出归位、减少动效、390px 手机单列与溢出检查、无 JS 详情链接、键盘进入详情、正式首页可见面积选择回归。桌面及手机截图已人工查看。

本轮是布局与复用接入验收，未重新执行整套 W01–W10 深度/景深/流场诊断，未进行真实手机 GPU 或帧率基准测试。

## 英文化与标题交互更新
实验页移除主标题及导航数量、移除原分类。使用英文单行标题 GNSS-R Remote Sensing / Analog Computing；标题下为 design · circuit · rf board / design · circuit · hardware。导航、页脚与辅助文字均英文化，仅影响实验页。标题 hover/focus 时文字右移、左侧箭头出现；减少动效时取消过渡。check/build 通过；verify-work-titles.mjs 验证英文、无 02、真实 hover 位移与箭头、320/390/768px 单行和无溢出通过。最新截图覆盖 desktop.png/mobile.png，并新增 english-title-hover.png。

## 统一封面与标签更新
按用户要求采用内置 imagegen 重绘两张 1536×1024、3:2 展示封面，深灰绿工作室背景和柔和顶光。生成源与完整提示词保存在 inputs/work-covers/；资产清单记录 SHA-256。细小丝印有生成变化，因此它们是艺术化展示封面，不是新增实验照片。原图与详情页素材不变。使用 scripts/process-work-covers.mjs 导出 640/1280/1536 WebP，按各自新图手工描绘板卡、前盖与排针轮廓，生成背景补边和代理深度，继续复用原 WebGL 相机和调度器。
标签移到标题上方，全部大写，增加 HARDWARE / PROTOTYPING / RESEARCH 等；桌面实际文字宽度长于标题，窄屏允许自然换行。check、build、verify-work-index 与 verify-work-titles 验证通过。封面规格、标签顺序、标签宽度、hover 实际相机变化、单 renderer、触屏、减少动效、无 JS 与键盘导航已检查；未声称新图丝印与原图逐像素一致。


## 三套配色与平滑退出
移除 Research, made tangible.。新增 /experiments/work-index-a/、work-index-b/、work-index-c/，色值完整来自用户提供的 A/B/C 方案，集中在 src/data/work-themes.ts。基础实验入口默认 A；页尾有三方案切换。页面、衬框、文字、分隔线与交互色跟随主题；两张摄影背景仍保持此前一致版本，便于比较页面色彩。
旧行为在跨封面 hover 时立即销毁上一场景。现在旧场景保持渲染约 500ms，视角归位并平滑混合至静态海报后才释放，新封面约 240ms 淡入；移出到留白同样平滑退场。画廊关闭进入时的短暂模糊与背景流场，保持清晰；正式首页与详情页默认行为不变，透视幅度不变。仍只有一个活动 renderer，共用原调度器。
验证脚本 scripts/verify-work-themes.mjs：三套实际背景色、移除文字、退出中间帧（销毁前仍为 WebGL）、单 renderer、切换成功、鼠标离开回到海报与移动端无溢出通过；截图 theme-a/b/c.png 与 theme-a/b/c-mobile.png。


## 缓慢退场与无边框更新
三套主题移除作品周围 12px 衬框。画廊退出时长由 0.5 秒延长为 6 秒，相机与海报混合同步使用两端速度为零的 smoothstep 曲线，起始阶段变化尤其缓慢；进入时间仍为 0.24 秒。参数集中于 scene/config.ts 的 galleryTransition，不修改正式首页与详情页的原配置。验收增加退出 1 秒后保留大部分画面不透明度和视角的断言，以及无边框检查。


## 替代淡出：独立相机真实归位（最新）
此前串行销毁和透明度混合方案已被 GalleryScene 取代：同一 renderer/context 绘制两个独立 DepthScene/PerspectiveCamera，各自保存视角与 6 秒 smoothstep 归位进度。新封面进入不等待旧封面回正；归位期间和归位后始终由同一 WebGL 画面呈现，不调整透明度、不切换海报。画廊禁用旧镜头边缘形变与模糊，使用参考相机投影，中性视点对齐原构图。静态海报仅用于触屏、减少动效和失败回退。归位结束停止帧循环。
主体规格：硬件外轮廓宽度占封面 60% ±5%，不含线缆与投影。GNSS-R 62.0%，Analog 由 84.6% 缩至 56.9%；重绘源 inputs/work-covers/project-02-balanced.png，完整提示词见 prompts.md。照片和深度轮廓已同步更新，构图参数写入资产清单并由处理脚本校验。
新验收 verify-gallery-independent.mjs 验证另一侧在 1.5 秒内启动、上一侧仍在归位、两侧视角连续递减、canvas 始终不透明、静态海报不参与混合、归位到零后停止帧循环、单 context、移动端与减少动效。实测通过。旧验收入口已指向新生命周期验收。


## 固定照片窗口与背景（最新修复）
画廊先前把 environment 当作透视网格一同旋转，导致边缘背景移动/露底。现在隐藏 environment 网格，将相同补边纹理设置为屏幕空间的 scene.background，只有硬件网格参与相机透视。照片矩形继续使用固定 viewport/scissor，无新增可见边框。verify-fixed-aperture.mjs 实际截图对比左上与右下极限视角：两件作品顶部、底部和右侧 5px 背景条带最大像素差均为 0，内部像素变化非零，DOM 窗口坐标完全一致。证据 fixed-aperture-results.json 和 fixed-1/2-left/right.png。check/build 通过。


## 选定 B：Mineral Fog 镭射背景
用户选定 B，默认实验入口已切换为 B，B 独立预览同步更新。保留 #ECEFEE 雾灰底色和原文字角色，通过静态 CSS 叠加低饱和青/紫/粉/浅绿光晕与斜向柔光带；背景直接绘制于 body，不增加 Canvas、遮罩或鼠标层，不影响固定图片窗口。A/C 参考页保留。check/build 通过；真实桌面 1440px 和触屏 390px 截图已检查，双作品 WebGL 正常、手机无横向溢出。证据 mineral-iridescent-desktop.png / mineral-iridescent-mobile.png。


## 收敛霓虹与鼠标柔光
大幅降低 B 的静态色差：彩色基底改为更接近雾灰的色值，主要渐变不透明度由约 24–34% 降为 7–12%。新增大范围柔光跟随鼠标路径，有轻微位置滞后，停止后指数消退。复用现有 SharedPointer 与 Motion 帧调度，无新增 pointermove 监听、RAF 或 Canvas。层置于作品和文字下，不接收指针；减少动效与触屏隐藏。浏览器实际验证鼠标唤起、消退至零、idle 停止、单输入源及 reduced motion 通过；截图 subtle-mineral.png / subtle-mineral-moving.png。


### B background: compact fields and dithering (2026-10-25)
Pointer fields reduced from 760x580 to 400x320 px. Removed the broad diagonal wash; static fields now use compact fixed-size ellipses with slightly stronger cyan/violet separation. A seeded monochrome dither tile is composited behind content to break up gradient bands; regenerate with node scripts/create-mineral-dither.mjs. Photos and camera behavior are unchanged. npm run check and npm run build passed. Browser checks passed for pointer response, decay, idle stop, single pointer source and reduced motion. Screenshot: reports/evidence/work-index/mineral-compact-gallery.png. Visual review found no prominent concentric bands in the captured viewport; actual display/compression may vary.

### Narrow inertial ribbon (2026-10-25)
Reduced dither opacity from .22 to .035. Replaced broad pointer blobs with a narrow cyan/rose/white ribbon using one decorative Canvas2D and the existing shared input/frame scheduler. Samples retain filtered velocity, drift with 0.85s drag and fade over 3.2s; bounded to 420 points and DPR 1.5. Project WebGL is unchanged. Browser verification asserts continued movement after pointer release, full decay, idle stop and reduced-motion fallback. Build and type/content checks passed; evidence mineral-ribbon-moving.png and mineral-ribbon-thrown.png. No measured FPS claim.

### GPU trail performance correction (2026-10-25)
Inspected https://lusion.co/projects/ and its public /_astro/hoisted.CUO_IjfL.js. Observed Three.js r158, low-resolution render targets, velocity/dissipation/curl shader uniforms. No gsap string in that bundle; this is not proof about all site dependencies. No website code retained or copied. Reused our existing FlowField with an optional mineral shader, at 360 px longest side, two half-float targets and a single existing WebGL context. Removed Canvas2D per-segment blur rendering; stationary covers now cache their pipeline output. Original non-mineral FlowField defaults retained.
Headless Edge, 1440x1000, same 4-second pointer sweep (scripts/measure-mineral.mjs): before 120 sampled frames / median 16.7ms / p95 66.7ms / max 83.4ms; after 237 / 16.7ms / 16.8ms / 50ms. This is a local comparison, not a cross-device FPS guarantee. GPU inertia, field decay, idle stop, stationary-cover cache and reduced-motion checks passed. Type/content check and build passed. Evidence: mineral-gpu-moving.png, mineral-gpu-released.png.

### Expanding surface wake (2026-10-25)
Mineral-only injection variance increased .000055 to .00042 (about 2.76x radius). Added lateral momentum and outward height-gradient displacement. Surface shading now uses local slopes for cyan/rose edge reflection with a transparent interior, replacing the filled mist appearance. Uses the same GPU field size, context and scheduler. Build, type/content check and GPU behavioral checks passed. Same headless Edge sweep: 240 frames, median 16.7ms, p95 16.8ms, max 16.9ms; local measurement only. Reviewed mineral-gpu-moving.png and released-state evidence.

### Dispersing release (2026-10-25)
After pointer input stops, the mineral field gradually increases its diffusion radius and rate. Replaced late-stage thresholded rim opacity with continuous density opacity so the contour spreads and dissolves instead of shrinking. Offset cyan/rose samples and a restrained warm component separate the colors during release. Fade reaches zero before field cleanup. Existing non-mineral defaults retained. Build, type/content and GPU behavior checks passed. Reviewed mineral-gpu-dispersed.png at roughly 1.25 seconds after release. Same local performance sweep: median 16.7ms, p95 16.8ms, max 17.2ms.

### Independent continuous dispersion (2026-10-25)
Replaced global post-input release timing with an advected freshness tracer in the existing field alpha channel. Freshness and density diffuse together; their ratio controls local expansion and color separation while the pointer is still moving. Freshness decays faster than density, producing substantial dispersion after about 0.2 seconds. Older pigment receives stronger drag, and new velocity blends instead of accumulating to prevent compression. No extra targets or contexts. Browser test now checks simultaneous fresh and dispersed pigment during a continuous stroke. Build, type/content, GPU behavior and reduced-motion checks passed (test now waits for the media change event). Reviewed moving screenshot. Same performance sweep: median/p95 16.7ms, max 16.8ms.

### Lighter, faster dispersion (2026-10-25)
Increased local freshness decay 4.5 to 10 per second, diffusion rate from 10+28r to 18+42r and stencil radius from 1.5+3.5r to 2+5r. Density now decays at 1.8+0.8r instead of 0.8+0.3r; dispersed opacity weight reduced from 1.2 to 0.7. Lowered velocity damping slightly to retain a free throw rather than a sticky stop. Cleanup shortened to 3.2s. Build, check and GPU behavior verification passed. Reviewed moving screenshot; measured median 16.7ms and p95 16.8ms under the same local sweep.

### Longer fade with unchanged fast dispersion (2026-10-25)
Reduced density decay from 1.8+0.8r to 0.9+0.35r, roughly doubling pigment persistence. Retained fast local freshness decay, diffusion stencil/rate and bounded velocity blending, so extending the fade does not postpone dispersion or reset old pigment when new input arrives. Cleanup extended from 3.2 to 6.4 seconds to avoid clipping the longer fade. Build and GPU behavioral verification passed, including concurrent fresh/dispersed pigment, idle stop, cached covers and reduced motion. Reviewed released-stage screenshot.

### Larger wake (2026-10-25)
Increased mineral injection variance from .00042 to .00072 (about 31% wider radius), diffusion stencil from 2+5r to 2.5+6r. Kept freshness, fade and momentum timing unchanged. Build and GPU behavior checks passed; reviewed moving screenshot.

### Persistent dispersed light (2026-10-25)
Kept fast diffusion and per-pixel freshness unchanged. Reduced pigment decay from 0.9+0.35r to 0.4+0.2r. Applied a bounded sublinear opacity response to dispersed low-density pigment, compensating for dilution as the wake spreads without raising fresh rim intensity. Extended cleanup to 8 seconds. Build and GPU behavior checks passed; reviewed dispersed-state screenshot.

### Edge-focused iridescence (2026-10-25)
Re-inspected Lusion's public hoisted.CUO_IjfL.js ScreenPaintDistortion: observed velocity/weight-driven directional scene sampling plus phase-shifted RGB shading. It is not simply a blurred pigment field, nor did the inspected composite use an explicit edge detector. No source copied or retained. Our adaptation uses relative density gradients for readable expanding rims, directional cyan/violet/copper and white glints, with minimal interior fill. Kept local age diffusion and long decay. GPU checks passed; reviewed moving screenshot. Same performance sweep p95 16.8ms. Build and type/content checks passed.

### Remove artificial white contour (2026-10-25)
Rechecked Lusion ScreenPaintDistortion public shader: velocity/weight-driven RGB modulation, no explicit white specular contour in this inspected pass. Removed our added white glint lobe entirely. Broad cyan/violet/copper transitions now receive a restrained velocity influence; edge visibility, independent diffusion and long fade preserved. Build and GPU behavior verification passed; moving screenshot reviewed without the former white seam.

### Narrow optical bands instead of a colored sheet (2026-10-25)
Rechecked public Lusion ScreenPaint injection radius/weight and velocity transport; the previous local implementation excessively diffused density and normalized faint outskirts into visible fill. Reduced mineral injection variance to .00007, diffusion stencil to 1+0.6r and rate to 3+5r. Retained outward transport, independent age and slow density decay. Removed interior opacity; raw spatial contrast now drives a sharpened narrow colored band without a white glint. This intentionally supersedes earlier wide-blur tuning in response to the new reference comparison. Build, type/content and GPU checks passed; reviewed moving screenshot. Same local sweep p95 16.7ms.

### Timing polish of accepted narrow-band shape (2026-10-25)
Retained geometry/optical band and palette. Moderately increased diffusion rate 3+5r to 4+8r and pigment decay 0.4+0.2r to 0.5+0.45r; cleanup 6.5s. Rechecked public Lusion settings: separate velocity/weight dissipation controls; did not copy per-frame constants into this time-based implementation. New verify-mineral-timing.mjs generates continuous waves and captures active / 0.6 / 1.5 / 3s phases. Measured density sums decreased 708 -> 506 -> 215 -> 45, and idle stop passed. Reviewed 0.6s and 1.5s captures. Build, check and full mineral behavior test passed.

### Continuous injection and faster retirement (2026-10-25)
Potential seam contributors identified: additive swept-segment caps, discontinuous event velocities, and per-frame old/new displacement. Gallery input now resamples with a 35ms response and smooths velocity over 65ms; union deposition avoids repeated cap accumulation. Forward velocity injection reduced .35 to .22, diffusion increased 4+8r to 7+13r and decay .5+.45r to .8+.8r. Field long side 480, cleanup 4.8s. Reviewed moving screenshot without the former repeated cap pattern; automated wave timing energy ratios about 39% at 0.6s, 7% at 1.5s and below 1% at 3s. Build, type/content, GPU behavioral and timing checks passed. Local performance p95 16.8ms.

### Continuity investigation after regression (2026-10-25)
Read Lusion public ScreenPaint update in full: connected from/to samples, filtered acceleration, a separate downsampled/blurred transport field, and independently decaying weights. Our implementation remains an original approximation. Removed delayed position interpolation; retained velocity filtering. Spatially average transport velocity in the shader rather than advecting using sharp per-pixel velocities. Removed per-segment radial cap force. New irregular 8/16/33/12/25ms repeated-reversal test reproduced scalloped joints, which the original smooth-sweep test missed. Final correction uses equal-strength .65 coverage with a speed ceiling so overlapping segments do not accumulate cap-shaped peaks; unlike the failed previous union, this restores full optical strength. Retained narrow spectral gradient rendering, no white line, and restored pre-regression diffusion/decay timing. Reviewed continuity-reversal.png: substantially smoother connected bands. Build, type/content and mineral behavior tests passed. Earlier iteration claims of fully fixed seams were too broad for their test coverage.

### Open-source solver and photo refraction (2026-10-25)
Installed three-fluid-fx 0.1.0 (MIT, Artem Korenevych; https://github.com/artcodev/three-fluid-fx). License and upstream notices are included in public/licenses. Replaces the gallery mineral simulation only; original homepage FlowField remains. Dependency supplies pressure projection, velocity/density advection and optional vorticity; it does not simulate rigid-body collisions. One existing renderer and shared pointer/scheduler, no library pointer helper or second loop. Runtime source uses decay raised to dt/baseDelta (despite README per-second wording); coefficients follow the implementation. Low-resolution profile: simulation base 160, density base 384, 8 pressure iterations, BFECC disabled. @types/three override deduplicates library types to the application's version.

Original optical shader reads velocity, density contrast and fading state. The same field drives a final cached-photo UV refraction with slight chromatic separation; displacement goes to zero at the aperture boundary. This changes photo pixels, not the image rectangle or DOM text. Does not claim a full-page optical capture or an exact Lusion reproduction. Scroll no longer clears the field unless viewport dimensions change. Idle tail fades before reset. Previous custom-field freshness/energy assertions in verify-mineral-sheen.mjs are superseded by verify-fluid-solver.mjs for this route.

Passed: npm run check, npm run build, verify-fluid-solver.mjs (shader/console errors, active steps, release, idle, reduced motion), verify-gallery-independent.mjs (independent return, mobile/no-JS, homepage), and refraction on/off pixel comparison at an identical simulation state. 1517 changed interior pixels above RGB-sum delta 3; zero changed perimeter pixels on the right cover, 1440x1000 viewport. Evidence: fluid-solver-active.png, fluid-solver-release.png, refraction-on.png and refraction-off.png. Active image reviewed; refraction deliberately subtle. Initial solver performance measurement before optical gain adjustment: headless Edge 1440x1000, 239 frames / median16.7ms / p9516.8ms / max33.3ms; not a hardware-independent guarantee. Final artistic similarity and real pointer feel remain user-review items; no claim that installing a solver completes the visual match.

### Correct solver units and explicit optical dispersion (2026-10-25)
User reported a stationary thin wake despite photo refraction. Inspected installed ADVECT_FRAGMENT: it multiplies velocity by texelSize, so input velocities are texture-pixels/second. Our previous adapter passed viewport UV/second, making transport far too small. Injection now converts to simulation texture dimensions; optical velocity converts back to UV units before energy/refraction mapping. No proprietary code used.
The first units-only fix failed the new transverse-width test (variance 1.03 to 1.17). The library has transport/projection but no explicit scalar diffusion pass. Added two low-resolution optical targets: solver velocity transports the optical strength, a bounded neighbor stencil diffuses it, and maximum coverage from solver density avoids additive accumulation. Rejected relaxation toward raw density because it pulled the expanded wake back toward its narrow source. This is an artistic scalar diffusion layer, not a claim of additional physical fluid accuracy.
Final straight-sweep test: optical transverse variance 10.21 -> 25.38 -> 40.78 -> 55.62 at approximately 0 / 0.58 / 1.17 / 1.75 seconds after release (screenshots add time). Standard deviation approximately doubled by 1.17s. Thresholded occupied area initially increased 1390 -> 1950 cells. Initial mass can rise due to coverage replenishment from the still-advecting source; this is intentionally not a conservative dye solver. Screenshots dispersion-0 through dispersion-3 reviewed; appearance remains restrained. Diagnostic readback runs only when explicitly called, not per frame.
Passed build/check and verify-fluid-dispersion.mjs. Local headless Edge performance: 1440x1000, 240 samples, median16.7ms / p9516.7ms / max16.8ms; no cross-device guarantee. No photo assets, aperture geometry or camera amplitude changed.

### Velocity-carried optical response and reference-path comparison (2026-10-25)
Continued after interrupted task and restored preview on 127.0.0.1:4325. Compared live https://lusion.co/projects/ and local B using the same 40-point fast elliptical pointer path and active / release captures (compare-fluid-reference.mjs). Read public ScreenPaint/ScreenPaintDistortion snippets only; no proprietary source retained/copied. Reference has a visibly displaced, nonuniform spectral band; the previous implementation remained an even ring along the input path. Slow input on reference is deliberately faint.

Reworked optical state: RG now carries normalized refractive momentum alongside B intensity. Both are transported by a spatially filtered drift plus the open-source solver velocity, so optical color does not remain attached to a different velocity field after transport. Spectral phase and opacity depend on local speed and its spatial change, replacing the uniform density outline. Diffuse interior opacity is very small; no explicit white glint added. Force-to-grid scaling increased and solver now uses simulation base256 / density512, BFECC enabled, eight pressure iterations. Motion memory and pigment decay independently. Very strong force / rapidly repeating spectrum variants were rejected after producing fragmented texture and oversized sheets. Final version smooths drift and optical velocity and bounds phase response. This is an original artistic optical layer over the MIT solver, not an exact Lusion implementation.

Passed final build, type/content check, verify-fluid-solver.mjs, verify-fluid-dispersion.mjs and new verify-fluid-speed.mjs. Same-path fast vs slow peak optical speed: 0.916 vs0.163 normalized units/s, about5.6x. Dispersion test transverse variance about7.0 at release,21.0 at0.6s and34.7 at1.17s. Refraction comparison:11240 changed interior pixels,zero perimeter pixels. Local headless Edge1440x1000 frame sampling:240 frames,median16.7ms,p9516.8ms,max16.9ms. These are local checks, not a cross-device or exact visual-match guarantee. Reviewed speed-fast.png, fluid-solver-active.png and comparison captures. Lusion retains finer highlights and different local curl behavior; visual parity is not claimed. Full-page DOM-text refraction is outside this implementation; fixed photo apertures remain intentional.

### Temporary interactive Flow lab (2026-10-25)
User requested hands-on tuning instead of repeated assistant parameter iterations. Added a collapsible B-only Flow lab with live force, source radius, throw, damping, diffusion, fade, curl, intensity and refraction sliders. Force default reduced130 ->65. Settings are bounded/validated and persisted under work-index-b-fluid-v1 in localStorage; Reset restores defaults and clears flow, Clear clears only state, Copy JSON writes settings or provides a selectable text fallback. No additional pointer listener source or animation loop; pointer over panel suppresses injection and resets stroke origin so leaving does not bridge across the panel. Shader uniforms update through the existing render cycle; no shader recompilation on slider drag. Existing UI English titles retained; tuning hints are Chinese for the user. Normal pages and theme A/C do not expose the panel. Build/check passed. verify-fluid-panel.mjs passed live update, reload persistence, reset, panel input exclusion, collapse, resumed canvas input and B-only scope. Screenshot flow-lab.png reviewed.

### User-selected flow preset (2026-10-25)
User approved the visual direction and supplied the new defaults: {"force":10,"radius":6,"drift":1.3,"damping":0.35,"diffusion":7,"fade":2.15,"curl":0.45,"brightness":2,"refraction":0.3}. Source radius maximum remains 6; temporary B-only tuning panel retained. Existing browser-local overrides are preserved; Reset loads this preset.

### Work Index typography and composition polish (2026-10-30)
Applied the user-supplied review: shared page-width (1440px token) for header/index; Arial WORK tracking -.05em; inline SVG diagonal arrow; four sentence-case broad tags at13px desktop/12px mobile; index label12px/11px mobile; notes label11px; column gap clamp24px/3vw/56px; mobile titles wrap with room for hover arrow. Removed duplicate direction declaration and unused notes span rules. A/B/C navigation now DEV-only; explicit experimental Flow lab retained. Palette, fluid preset and perspective amplitude unchanged.
Source correction: original Analog balanced cover preserved and SHA-256 retained. process-work-covers.mjs deterministically crops1248x832 at144,64 and resizes to1536x1024. Every proxy contour and background-removal mask uses the same affine transform. Analog hardware width changes from56.9% to70.0% to balance its shallow physical profile against GNSS enclosure/lid; GNSS remains62% excluding cables. This supersedes the earlier equal-width occupancy target. No generated electronics or source-byte edits in this pass.
Passed cover regeneration, npm run check/build and verify-work-polish.mjs:1920px header/content bounds identical; theme nav absent from production build; Analog hover active;360px touch layout has no horizontal overflow including injected long-title case. Reviewed polish-desktop.png, polish-mobile.png; polish-hover.png saved. Formal homepage and detail assets not altered.
