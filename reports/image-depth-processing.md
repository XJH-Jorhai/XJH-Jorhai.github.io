# 图片与深度处理（v2）

2026-10-25。本地 Sharp 0.35.5；没有上传照片、模型下载或生成式重绘。执行 npm run images：先生成原有颜色素材，再执行 scripts/prepare-depth.mjs。

## 原图与保真

主图：inputs/source/chengpintu.png，4032 × 2090，SHA-256 203c45a07038f98061736d80e5082206e1a04b02bd43c39e7448e782c0937ec9。
补图：inputs/source/pcb3dtop.png，SHA-256 8948c3d750f3e8d51e5416d372b32d0013377f437cbf44b3de165640ab02a7f1。补图只用于原有正文，不用于拼造新视角。
原图字节与两页内容均保留。主海报 1920 × 995，524648 字节；公开素材去除 EXIF。保留完整裁切、原曝光与器件颜色，板卡、线缆、接口和盒盖标记均来自同一实物照片。旧柔焦 WebP 保留为历史素材，不参与正常桌面渲染。

## authored_proxy 来源与坐标

没有配置可直接使用的本地深度模型，采用要求包允许的对象代理。inputs/depth/proxy.json 保存根据原图可见轮廓绘制的归一化多边形；不是亮度图，不宣称测量或镜头标定。
三层：承托环境距离 7.3，板卡／后壳／线缆距离 6，前盖距离 5.05。场景单位任意但一致；JSON 保存浮点数，运行时直接加载并构建 CPU ShapeGeometry，颜色与深度使用同一个几何。断层之间没有跨层三角形。各层内部是平面，不给文字、LED或铜线伪造起伏。
Positive distance in arbitrary scene units. Reference camera at origin looks -Z. X=(2u-1)*aspect*tan(fov/2)*distance, Y=(1-2v)*tan(fov/2)*distance. PNG white=near; runtime polygons retain float distances.
参考 FOV 38°，near .1，far 30；原点相机朝 -Z。围绕板卡特征点做共同旋转，参考画面不因设 Z 而缩胀。相机初值限制水平 ±2°、垂直 ±1.5°。基准与八向极限见验收截图；允许范围只适用于当前单图。

## 素材与遮挡处理

- public/media/project-01/depth-proxy.json：实际运行深度、轮廓与特征点。
- public/media/project-01/depth-preview.png：1024 × 531，8-bit可视化，黑远白近；不用于运行时深度解码。
- inputs/masks/layers.svg：同UV分层预览／可重复的蒙版记录。
- public/media/project-01/environment.webp：在被硬件遮住的区域下延展摄影承托背景；使用轮廓外邻近的真实摄影背景像素作局部镜像延展（避免单像素拖长成条纹），边界保留约4px排除余量，以去掉底层残留器件边缘。只提供小视角露出的非硬件背景，不生成未知接口背面或电路。
- src/data/project-01.assets.json：图片、原始哈希、配色、深度引用、参考相机、焦点与运动约定。

中性画面由背景与原图多边形叠合；全平深度对照使用唯一的完整清晰海报平面，避免共面争用。边缘是保守对象轮廓，不是精密分割；单图不能支持大角度绕行，有限视角中环境延展处细纹理可能有轻微差异。未增加或绘制研究结构。

## 当前用户要求：只保留清晰视差

2026-10-25后续要求覆盖v2原景深合同：完全移除景深采样、指针raycast对焦、焦距过渡与换焦状态。PostPipeline只复制场景颜色、保留诊断深度视图，再执行OutputPass/FXAA；不额外模糊照片。照片本身的拍摄失焦保留，未做生成式锐化。
线缆下缘、插头台阶及三枚金属接口改为按原图像素细描的轮廓；背景剔除同一轮廓并加入极窄余量，消除遗留线缆造成的双边。相机运动范围不变，继续提供真实多深度视差。

## 对照与重建

原图／海报对照：reports/evidence/source-vs-processed.png；完整验证见 reports/validation.md。运行 npm run images 可重建颜色、代理JSON、深度PNG与环境延展；构建不执行推理或联网。换照片必须重新核对多边形与焦点，不可沿用旧轮廓。
