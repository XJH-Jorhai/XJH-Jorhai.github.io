import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const proxy=JSON.parse(await readFile('inputs/depth/proxy.json','utf8'));
const assets=JSON.parse(await readFile('src/data/project-01.assets.json','utf8'));
const width=1024,height=Math.round(width*assets.poster.height/assets.poster.width);
const polygons=proxy.layers.map((layer,i)=>`<polygon points="${layer.polygon.map(([x,y])=>`${x*width},${y*height}`).join(' ')}" fill="${i===0?'#000000':i===1?'#939393':'#ffffff'}"/>`).join('');
await mkdir('inputs/masks',{recursive:true});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${polygons}</svg>`;
await writeFile('inputs/masks/layers.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('public/media/project-01/depth-preview.png');
await writeFile('public/media/project-01/depth-proxy.json',JSON.stringify(proxy,null,2));
// Only photographic environment is extended behind masks, never hidden hardware.
const w=assets.poster.width,h=assets.poster.height;
const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${proxy.layers.slice(1).map(l=>`<polygon points="${l.polygon.map(([x,y])=>`${x*w},${y*h}`).join(' ')}" fill="white" ${l.name==='foreground-lid'?'stroke="white" stroke-width="14" stroke-linejoin="round"':''}/>`).join('')}</svg>`);
// Fill only occluded background from the nearest exterior photograph pixels.
// A 4 px exclusion margin removes residual hardware edges from the background.
const {data:rgba}=await sharp(`public${assets.poster.src}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const alpha=await sharp(mask).ensureAlpha().extractChannel(3).blur(1.6).threshold(2).raw().toBuffer();
const nearest=new Int32Array(w*h).fill(-1),queue=new Int32Array(w*h);let head=0,tail=0;
for(let i=0;i<w*h;i++)if(alpha[i]===0){nearest[i]=i;queue[tail++]=i;}
while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&nearest[j]===-1){nearest[j]=nearest[i];queue[tail++]=j;}}
const background=Buffer.from(rgba);for(let i=0;i<w*h;i++)if(alpha[i]>0){const n=nearest[i],mx=Math.max(0,Math.min(w-1,2*(n%w)-i%w)),my=Math.max(0,Math.min(h-1,2*Math.floor(n/w)-Math.floor(i/w))),mirror=my*w+mx;const q=(alpha[mirror]===0?mirror:n)*4;for(let c=0;c<3;c++)background[i*4+c]=rgba[q+c];}
await sharp(background,{raw:{width:w,height:h,channels:4}}).webp({quality:95}).toFile('public/media/project-01/environment.webp');
assets.spatial={depthMethod:proxy.method,depthSource:'inputs/depth/proxy.json',runtime:'/media/project-01/depth-proxy.json',preview:'/media/project-01/depth-preview.png',depthEncoding:'JSON float distances + polygon boundaries; preview PNG is 8-bit and not used for geometry',referenceCamera:proxy.camera,depthMapping:proxy.mapping,subjectTarget:proxy.features[0],featureTargets:proxy.features,motionEnvelope:{horizontalDegrees:2,verticalDegrees:1.5},desktopCrop:{x:0,y:0,width:1,height:1},mobileCrop:{x:0,y:0,width:1,height:1}};
await writeFile('src/data/project-01.assets.json',JSON.stringify(assets,null,2));
const report=`# 图片与深度处理（v2）

2026-10-25。本地 Sharp ${sharp.versions.sharp}；没有上传照片、模型下载或生成式重绘。执行 npm run images：先生成原有颜色素材，再执行 scripts/prepare-depth.mjs。

## 原图与保真

主图：${assets.source.path}，${assets.source.width} × ${assets.source.height}，SHA-256 ${assets.source.sha256}。
补图：${assets.supplementalSource.path}，SHA-256 ${assets.supplementalSource.sha256}。补图只用于原有正文，不用于拼造新视角。
原图字节与两页内容均保留。主海报 ${assets.poster.width} × ${assets.poster.height}，${assets.poster.bytes} 字节；公开素材去除 EXIF。保留完整裁切、原曝光与器件颜色，板卡、线缆、接口和盒盖标记均来自同一实物照片。旧柔焦 WebP 保留为历史素材，不参与正常桌面渲染。

## authored_proxy 来源与坐标

没有配置可直接使用的本地深度模型，采用要求包允许的对象代理。inputs/depth/proxy.json 保存根据原图可见轮廓绘制的归一化多边形；不是亮度图，不宣称测量或镜头标定。
三层：承托环境距离 7.3，板卡／后壳／线缆距离 6，前盖距离 5.05。场景单位任意但一致；JSON 保存浮点数，运行时直接加载并构建 CPU ShapeGeometry，颜色与深度使用同一个几何。断层之间没有跨层三角形。各层内部是平面，不给文字、LED或铜线伪造起伏。
${proxy.mapping}
参考 FOV 38°，near .1，far 30；原点相机朝 -Z。围绕板卡特征点做共同旋转，参考画面不因设 Z 而缩胀。相机初值限制水平 ±2°、垂直 ±1.5°。基准与八向极限见验收截图；允许范围只适用于当前单图。

## 素材与遮挡处理

- public/media/project-01/depth-proxy.json：实际运行深度、轮廓与特征点。
- public/media/project-01/depth-preview.png：${width} × ${height}，8-bit可视化，黑远白近；不用于运行时深度解码。
- inputs/masks/layers.svg：同UV分层预览／可重复的蒙版记录。
- public/media/project-01/environment.webp：在被硬件遮住的区域下延展摄影承托背景；使用轮廓外邻近的真实摄影背景像素作局部镜像延展（避免单像素拖长成条纹），边界保留约4px排除余量，以去掉底层残留器件边缘。只提供小视角露出的非硬件背景，不生成未知接口背面或电路。
- src/data/project-01.assets.json：图片、原始哈希、配色、深度引用、参考相机、焦点与运动约定。

中性画面由背景与原图多边形叠合；全平深度对照使用唯一的完整清晰海报平面，避免共面争用。边缘是保守对象轮廓，不是精密分割；单图不能支持大角度绕行，有限视角中环境延展处细纹理可能有轻微差异。未增加或绘制研究结构。

## 当前用户要求：只保留清晰视差

2026-10-25后续要求覆盖v2原景深合同：完全移除景深采样、指针raycast对焦、焦距过渡与换焦状态。PostPipeline只复制场景颜色、保留诊断深度视图，再执行OutputPass/FXAA；不额外模糊照片。照片本身的拍摄失焦保留，未做生成式锐化。
线缆下缘、插头台阶及三枚金属接口改为按原图像素细描的轮廓；背景剔除同一轮廓并加入极窄余量，消除遗留线缆造成的双边。相机运动范围不变，继续提供真实多深度视差。

## 对照与重建

原图／海报对照：reports/evidence/source-vs-processed.png；完整验证见 reports/validation.md。运行 npm run images 可重建颜色、代理JSON、深度PNG与环境延展；构建不执行推理或联网。换照片必须重新核对多边形与焦点，不可沿用旧轮廓。
`;
await writeFile('reports/image-depth-processing.md',report);
await writeFile('reports/image-processing.md','# v2 图片流程\n\n当前完整记录见 [image-depth-processing.md](image-depth-processing.md)。v1 记录与实现保存在 v1-snapshot；其屏幕空间聚焦描述不再适用于当前网页。\n');
console.log('Depth: authored_proxy, three visible regions, float JSON geometry + PNG preview.');
