> 当前修订已取消景深和对焦切换；以下v2记录为历史基线，最新行为与检查见 [视差修订报告](parallax-refinement.md)。

# v2 验证报告

日期：2026-10-25。正常桌面WebGL主路径已实跑，深度方法为 **authored_proxy**。W01–W09通过；W10大部分通过，但真实系统隐藏暂停未能触发，标为 **UNVERIFIED**。不宣称“v2全项通过”。未发现仍待修复的已知核心功能失败。

## 环境与证据口径

生产构建预览 http://127.0.0.1:4322/；Microsoft Edge 155.0.4283.62；Windows，1440×900，DPR 1，fine pointer。GPU：ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)；浏览器报告32逻辑核。额外检查DPR 2时renderer限制为1.5。不是软件后端，也不据此声称所有设备稳定60fps。

机器记录：webgl-validation.json（W01–W10自动化路径），extra-validation.json（DPR/放大/中性对照），visibility.json（未触发真实隐藏），maintenance-results.json（标题同步与字节恢复）、keyboard-selection.json（真实Tab与鼠标文字选择）、depth-reproducibility.json（四个深度相关产物重跑哈希一致），final-build.json（最终分包与实录检查）。脚本W10 PASS只覆盖空闲、离屏、减少动效和重复恢复；最终报告把未验证的系统隐藏子项加回来，不以脚本标签掩盖范围不足。

## 结果

| ID | 最终状态 | 实际证据与结果 |
| --- | --- | --- |
| W01 | PASS | npm run images及重复生成；两张原图哈希不变。source-vs-processed.png、source-depth-masks.jpg、depth-preview.png、运行JSON；深度按对象轮廓而非亮度。 |
| W02 | PASS | baseline-desktop.png、baseline-mobile.png、detail-reading.png。人工检查主体细节与完整静态构图。 |
| W03 | PASS | depth-current-view.png由当前相机DepthTexture产生；geometry.png显示CPU分层几何。输入JSON实际加载且用于raycast与渲染。 |
| W04 | PASS | 景深/流场关闭，parallax-left/center/right及flat-depth对应六图；四角extreme-0至3人工复查。见下方特征数据和真实交互实录。 |
| W05 | PASS | focus-near/far、coc-near/far；固定相机换焦，世界焦点锁定后移动视角。CoC在整个同深度区域一致，不是指针圆窗。 |
| W06 | PASS | post-output、post-output-bypass、post-fxaa-bypass；颜色/深度、景深、OutputPass、FXAA与最终合成均实际执行。中性WebGL/海报对照见neutral-webgl/static。 |
| W07 | PASS | flow-slow、flow-fast、flow-stop-0至4、flow-appearance；速度场读取与屏幕帧相符。快慢、转弯、停止后演化与清零均实测。 |
| W08 | PASS | 标题真实指针响应；Tab/聚焦+Enter进入详情、直达详情、浏览器返回。内容与两页源码保持；正文和HTML链接不进入WebGL场景。 |
| W09 | PASS | 390/360触控、减少动效、无JS、深度资源失败、上下文丢失；静态海报及导航完整，无横向溢出。截图baseline-*、fallback-*。 |
| W10 | UNVERIFIED（部分通过） | images/check/build/preview实际运行；类型0错误0警告；维护改标题再还原；闲置/离屏/减少动效停止、恢复不重复canvas；系统真实隐藏状态始终报告visible，无法验证此分支。实现含visibilitychange清场暂停与pagehide资源释放，但不据源码认定实测通过。 |

## 相机与平深度对照

相同参考投影、相同路径；平深度是单个完整海报平面，无共面闪烁。实际主图宽860 CSS px。稳定板卡观察锚点固定；来源距离是环境7.3、板卡6、盒盖5.05。

| 特征 | 有深度左 x | 有深度右 x | 平深度左 x | 平深度右 x | 额外左右位移 |
| --- | ---: | ---: | ---: | ---: | ---: |
| board-chip | 389.580 | 389.580 | 389.580 | 389.580 | 0.000 px |
| lid-mark | 628.396 | 625.097 | 624.309 | 629.347 | -8.337 px |
| background-texture | 763.011 | 785.052 | 766.785 | 781.042 | 7.784 px |

数字为真实运行相机对同一几何特征点的投影，结合实测画面与连续帧检查，不单凭矩阵存在判定。四角没有观察到大面积空洞或跨层三角拉丝；保守背景延展的边缘细纹理与原图可能有轻微差异，不能扩大成任意旋转。

## 换焦与介质

固定中性视点，板卡焦距 6.0000，前盖焦距 5.0510（任意场景单位）。世界前盖焦点随相机变化后，焦距 4.9852，当前该点相机距离 4.9844。同深度层CoC保持一致；实际截图显示附加模糊关系反转。原图前盖的原始失焦仍然存在，未恢复或重绘文字。

背景场使用256×160 HalfFloat RGBA ping-pong，RG为速度、B为染色。慢移采样强度总和27.76，快移163.03；停止连续采样：115.34 → 47.81 → 10.95 → 0.65 → 0.00。这些是读取GPU场的相对统计，不是物理量。主要衰减约1s，2.8s后清场，保留短暂平流惯性。照片和HTML不受流场位移。

## 连续交互记录

[打开真实浏览器实录](evidence/interaction-recording.html)。162张真实CDP screencast JPEG帧，原生时间戳与操作日志在interaction-recording.json，原帧在interaction-frames。包含：无景深/流场的空间路径、同路径平深度、固定视点换焦、正常低对比流场的慢移/快S形/停止。回放仅按记录时间显示原帧，没有合成中间帧；环境未安装视频编码器，因此交付可回放帧序列而非伪造录屏。最终实录无pageerror。

## 性能与适配边界

海报1920×995、512.4 KiB；场景景深按主图实际尺寸渲染，桌面测试860×445左右（随布局取整），最大DPR1.5。不是半分辨率景深：24个深度感知采样，以当前设备实测为初值；低性能设备可降低DPR或maxBlur，不删掉核心几何与景深。仅一个WebGL2 context。

| 分包 | raw bytes | gzip bytes |
| --- | ---: | ---: |
| PageShell.astro_astro_type_script_index_0_lang.DNok3eEX.js | 6244 | 2682 |
| runtime.rY7xDLDX.js | 589796 | 149424 |

基础包和延迟WebGL包分列；构建对>500kB原始分包有提示，未将Three.js成本说成零。timings只记录JS提交耗时，不是GPU帧时间，未提供Lighthouse或帧率承诺。DPR2环境的WebGL/海报像素MAE约9.995/255，包含不同源尺寸与采样，人工确认中性构图和颜色未明显缩胀或跳色，并非声称逐像素相等。

200%正文放大时360px视口的scrollWidth仍360。真实隐藏测试尝试了新窗口、最小化和关闭focus emulation，浏览器仍报告visible，记录原样保留；这是验收环境限制。暂停分支代码未删，需在用户实际切后台/最小化的环境补查。没有外部发布。

## 运行与维护

精确步骤见RUNBOOK.md。源代码、原图、配方、锁文件与生成素材均在当前项目；旧版快照不参与构建。最终报告优先于旧版C01–C08记录及调试过程中产生的中间截图。

验收结束后临时预览服务已停止；交付包含可直接重启的完整生产构建。

## 2026-10-25 新增第二项目
隧道二极管作品与去标注图片的本轮验证见 [project-02-validation.md](project-02-validation.md)。原有验收记录保留。
