import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='public/media/project-02'; await mkdir(dir,{recursive:true});
const source='inputs/source/project-02/pcb-clean.png', bytes=await readFile(source);
const meta=await sharp(bytes).metadata();
const originalSha256=createHash('sha256').update(await readFile('inputs/source/project-02/pcbimage.jpg')).digest('hex');
const palette=JSON.parse(await readFile('inputs/image-recipe.json','utf8')).palette;
const image=async(name,width)=>{const info=await sharp(bytes).rotate().resize({width}).webp({quality:90}).toFile(`${dir}/${name}.webp`);return {src:`/media/project-02/${name}.webp`,width:info.width,height:info.height,bytes:info.size};};
const variants=await Promise.all([640,1280,1920].map(w=>image(`poster-${w}`,w)));
const poster={...variants[2],srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', ')};
const texture=await image('texture-2560',2560);
// Normalized contours authored from the supplied full photograph; no GNSS-R masks reused.
const proxy={method:'authored_proxy',camera:{fov:38,near:.1,far:30,distance:6},
  layers:[
    {name:'environment',distance:7.3,polygon:[[0,0],[1,0],[1,1],[0,1]]},
    {name:'board',distance:6,polygon:[[.157,.198],[.822,.198],[.831,.22],[.839,.31],[.851,.41],[.862,.51],[.875,.62],[.881,.73],[.87,.755],[.125,.755],[.115,.738]]},
    {name:'left-header',distance:5.85,polygon:[[.158,.274],[.168,.269],[.183,.345],[.176,.416],[.177,.476],[.17,.553],[.166,.588],[.145,.584],[.143,.566],[.148,.488],[.151,.403],[.152,.327]]}
  ],features:[{name:'board-center',uv:[.53,.46],layer:1},{name:'left-header',uv:[.16,.45],layer:2},{name:'background',uv:[.73,.08],layer:0}]};
await mkdir('inputs/depth',{recursive:true});
await writeFile('inputs/depth/project-02.json',JSON.stringify(proxy,null,2));
await writeFile(`${dir}/depth-proxy.json`,JSON.stringify(proxy,null,2));
const w=poster.width,h=poster.height;
const polygons=proxy.layers.slice(1).map(l=>`<polygon points="${l.polygon.map(([x,y])=>`${x*w},${y*h}`).join(' ')}" fill="white" stroke="white" stroke-width="6"/>`).join('');
const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${polygons}</svg>`);
const rgba=await sharp(`${dir}/poster-1920.webp`).ensureAlpha().raw().toBuffer();
const alpha=await sharp(mask).ensureAlpha().extractChannel(3).raw().toBuffer();
const nearest=new Int32Array(w*h).fill(-1),queue=new Int32Array(w*h);let head=0,tail=0;
for(let i=0;i<w*h;i++)if(alpha[i]===0){nearest[i]=i;queue[tail++]=i;}
while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&nearest[j]===-1){nearest[j]=nearest[i];queue[tail++]=j;}}
const background=Buffer.from(rgba);for(let i=0;i<w*h;i++)if(alpha[i]>0){const q=nearest[i]*4;for(let c=0;c<3;c++)background[i*4+c]=rgba[q+c];}
await sharp(background,{raw:{width:w,height:h,channels:4}}).webp({quality:92}).toFile(`${dir}/environment.webp`);
const preview=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#333"/>${proxy.layers.slice(1).map((l,i)=>`<polygon points="${l.polygon.map(([x,y])=>`${x*w},${y*h}`).join(' ')}" fill="${i?'#eee':'#aaa'}"/>`).join('')}</svg>`);
await sharp(preview).resize(960).png().toFile(`${dir}/depth-preview.png`);
const assets={projectId:'project-02',palette,poster,mobile:poster,texture,spatial:{runtime:'/media/project-02/depth-proxy.json'},originalSha256,source:{path:source,sha256:createHash('sha256').update(bytes).digest('hex'),width:meta.width,height:meta.height}};
await writeFile('src/data/project-02.assets.json',JSON.stringify(assets,null,2));
await writeFile('reports/project-02-image-processing.md',`# 隧道二极管原型素材\n\n清理后展示图 ${meta.width} × ${meta.height}；SHA-256 ${assets.source.sha256}。清理图保存在 ${source}；带标注原图 SHA-256 ${originalSha256}，未公开原始 JPEG/PDF。公开 WebP 去除元数据，保留全幅；按用户要求通过内置 imagegen 移除红色文字、引线和虚线框。原始带标注 JPEG 另存于 inputs/source/project-02/pcbimage.jpg。生成式修补不能作为原始测量记录，未将细微丝印变化当作科研事实。1920px 海报 ${poster.bytes} bytes。\n\n复用全站配色。深度为人工视觉代理，环境 7.3、板卡 6、左排针 5.85；不是实测尺寸。清理图与原照片构图保持一致。只适用于小角度观察；板卡遮挡下延伸邻近摄影背景，不生成背面或器件。层轮廓和照片共用 UV。完整原始构图可在静态版本查看。\n\n重建：node scripts/process-project-02.mjs（也包含在 npm run images）。论文正文与图5、表II部分误差口径不一致，网页不引用冲突数值，不宣称已完成高频验证。\n`);
console.log('project-02 images and authored depth prepared');
