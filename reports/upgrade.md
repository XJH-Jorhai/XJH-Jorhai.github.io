# v2 原位升级记录

日期：2026-10-25。已读要求包全部10个文件，按 UPGRADE_FROM_V1.md 执行。

## 修改前

源码确认：主图为DOM清晰/预模糊双图和CSS径向蒙版；指针控制承载层translate/scale；没有相机、运行深度、WebGL或后处理。背景为Canvas 2D采样轨迹。此路线符合v1默认约束，并非认定旧代码实现错误。

## 保留

`src/content/projects/project-01.md`、`src/pages/index.astro`、`src/pages/projects/[slug].astro`、`src/config/site.ts`、`src/components/PageShell.astro` 均与修改前快照逐字节相同。两张原图SHA-256相同。正文、首页结构、导航、页脚、补图及详情路由不改。根目录不是Git仓库，不能声称做过Git差异审计；以本地快照保护已有文件。

## 替换与新增

旧要求和源码已复制到 `reports/v1-snapshot/`。项目内AGENTS、design、CODEX_TASK、IMAGE_PIPELINE、ACCEPTANCE改用v2，新增WEBGL_SPEC与UPGRADE_FROM_V1；上级目录同名v1文档加过期标记，没有删除旧规范。API优先的用户规则继续有效。

ProjectVisual保留语义海报，去除旧径向双层；共享指针／Motion调度继续用于标题，空间渲染延迟加载。新增DepthScene、PostPipeline、FlowField、集中配置和生命周期协调模块。对象代理来自原照片边界；不是照片亮度，更不是新拍摄或真实重建。

实施顺序：先关闭景深与流场，实际Edge检查六张左右／中性及平深度对照；修正背景露空后确认额外层间视差，再接入景深、官方后处理和低对比流场。最终固定路径再次验证了全部核心行为。第一次后处理运行发现纹理uniform克隆导致输出错误，已改为显式绑定并复查；早期失败截图不作为通过证据。

新增依赖仅three和@types/three；仍用npm与一个包管理器。未引入React、额外动画引擎、物理求解器、模型推理服务或外部部署。

## 限制

对象轮廓与平面距离为可解释的 authored_proxy。承托背景在硬件遮挡区下做保守延展；不补造背面。相机有限幅度，不能任意绕物旋转。源照片已有失焦无法恢复。真实系统隐藏状态在当前自动化环境未成功触发，已单列未验证；不得据此声称全项v2验收通过。其余结果与可复跑证据见 validation.md。
