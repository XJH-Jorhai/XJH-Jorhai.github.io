# 首页 MC 原版铁傀儡与流体凿击

日期：2026-11-02。最终触发方向以用户后续调整 **100 → 0** 为准。

## 实现

- 首页介绍栏左侧加入铁傀儡，带原生键盘可用的播放／暂停按钮与源项目链接。
- 固定上游 `XJH-Jorhai/piston-letter-studio@f4e4619eaafa825c296c61312a150a177009f5cf`（v1.2.0）：两份 JS、八张纹理及材质说明共 11 个文件逐一核对 Git blob SHA，均与上游一致。记录在 `public/vendor/piston-letter-studio/source.json`。纹理原归属与来源说明保留，没有引入音乐、播放器或编辑器。
- 使用原版 `normalizeConfig`、`frameState`、`minecraftParts`，保留 0.94 秒、100% 行程、完整非对称曲线及方块材质。适配器沿用原投影、逐面 UV、裁切、明暗和深度遮挡，通过博客现有 Three.js renderer 绘制。访客页面不实例化上游独立组件，不增加 WebGL context 或 RAF 循环。
- `position` 为上游 0–1 行程，映射 `force = (1 - position) * 100`。先到达满行程才武装触发器，回到 0 时注入一次 force 100；初始 0、顶部停留、提前收回及零位停留均不误触发。暂停／恢复不重置这个锁存状态。
- 从收回时向前运动的中间下部铁块正面发出冲量，投影坐标随滚动和窗口尺寸更新。16 个径向速度／密度 splat 写入现有 three-fluid-fx 求解器，由既有流体光学显示、输运并衰减。鼠标输入和原有 Force 基准保持可调，冲击不写入用户保存的设置。
- 离屏停止铁傀儡时钟；已有流场消散或清空、滚动回弹结束后，共享调度停止。减少动效、触控、无 JS、素材失败、WebGL 上下文丢失均保留语义海报。销毁释放新增几何、材质、纹理与按钮监听。

## 验证

生产构建预览 `http://127.0.0.1:4321/`；Windows、本机 Microsoft Edge 156.0.4314.56，1440×1000、DPR 1；另查 768px 与 360px 触控。截图人工检查完成。不将提交耗时或设备条件推广为帧率保证。

| 检查 | 结果 |
| --- | --- |
| `npm run images` | PASS；原图哈希通过，已有图片与清单没有 Git 改动 |
| `npm run check` | PASS；0 errors、0 warnings、0 hints，内容与公开资产校验通过 |
| `npm run build`、`npm run preview` | PASS；9 个静态页面，预览实跑 |
| `PREVIEW_URL=http://127.0.0.1:4321 npm run test:piston` | PASS；反向映射、100→0 单次触发、零位无重复、自然周期、键盘暂停／恢复 |
| GPU 波动 | PASS；鼠标静止时实际读回场能量及速度，后续 X/Y 方差均扩张至少两倍；中间及后期真实截图可见向外输运 |
| 生命周期与适配 | PASS；一个 WebGL context、离屏无触发与无永久调度、实时减少动效及恢复、手机／无 JS 海报、纹理失败及 context lost 回退 |
| 原鼠标拖尾 | PASS；暂停铁傀儡并清场后，移动鼠标仍产生真实流场 |
| `npm run test:site` | PASS；三种宽度、图片、博客／作品／笔记导航、详情正文、键盘、减少动效及无 JS 路径 |
| 音频与浏览器异常 | PASS；无音频请求、无 pageerror |
| 真实系统切后台／最小化 | UNVERIFIED；没有将既有 visibilitychange 分支当作实测结果 |

本地证据位于被 Git 忽略的 `reports/evidence/piston-impact/`：`results.json`、`before.png`、`impact-early.png`、`impact-middle.png`、`impact-late.png`、两档桌面全页图及三种静态适配图。截图文件名表示采样顺序；实际流场剩余时间在 JSON 中记录，不把脚本等待值当作精确采帧时间。截图、私有输入没有推送。

## 体积与维护

没有新增 npm 依赖，保留现有锁文件。静态海报为未修改的上游组件在 phase 0 导出的透明 768×768 PNG，68,128 bytes。八张原版像素纹理共约 1.7 KiB；两份原始 JS 总计 29,308 bytes，仅首页桌面增强加载。

本轮生产包：PageShell 8,131 raw / 3,374 gzip bytes；GalleryScene 14,210 / 6,048；共享 PostPipeline 610,063 / 153,728；详情 runtime 14,661 / 5,895。现有共享 Three.js 分包仍有 >500 kB 的构建提示；不将它记作零成本。参数、重建海报与精确启动方式见 RUNBOOK.md。

依项目协作规则在 `feat/piston-impact` 提交 PR；PR 合并前不修改线上 main，也不另行部署外部服务。
