import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Pixel contours manually traced on the 1536x1024 generated presentation covers.
const contours={
 'project-01':[
  {name:'board-case-cables',distance:6,points:[[0,238],[49,251],[114,249],[115,237],[199,217],[363,216],[378,85],[392,85],[402,136],[1137,136],[1149,85],[1163,85],[1184,199],[1234,200],[1247,214],[1248,234],[1241,248],[1192,250],[1198,280],[1250,280],[1262,292],[1262,318],[1254,332],[1205,331],[1210,357],[1263,359],[1276,376],[1274,402],[1262,415],[1206,415],[1191,463],[366,463],[348,401],[280,395],[180,379],[80,351],[0,324]]},
  {name:'lid',distance:4.6,points:[[366,459],[1191,459],[1240,831],[1233,888],[335,889],[325,840]]}
 ],
 'project-02':[
  {name:'board',distance:6,points:[[382,291],[1155,291],[1162,312],[1209,650],[1203,659],[340,659],[335,649]]},
  {name:'left-header',distance:5.85,points:[[389,320],[396,321],[399,345],[415,354],[416,375],[401,556],[370,557],[369,535],[376,479],[380,425],[385,371]]},
  {name:'right-header',distance:5.8,points:[[1126,301],[1132,301],[1130,326],[1153,301],[1158,302],[1166,345],[1189,545],[1188,582],[1138,583],[1128,539],[1119,474],[1110,408],[1104,349],[1118,332]]}
 ]
};
for(const id of Object.keys(contours)){
 const projectId=`${id}-cover`,dir=`public/media/${projectId}`;await mkdir(dir,{recursive:true});
 const source=`inputs/work-covers/${id}${id==='project-02'?'-balanced':''}.png`,original=await readFile(source),meta=await sharp(original).metadata();
 if(meta.width!==1536||meta.height!==1024)throw Error('Cover dimensions changed: retrace depth contours');
 const crop=id==='project-02'?{left:144,top:64,width:1248,height:832}:null;
 const bytes=crop?await sharp(original).extract(crop).resize(1536,1024).png().toBuffer():original;
 const layerContours=contours[id].map(layer=>({...layer,points:layer.points.map(([x,y])=>crop?[(x-crop.left)*1536/crop.width,(y-crop.top)*1024/crop.height]:[x,y])}));
 const palette=JSON.parse(await readFile(`src/data/${id}.assets.json`,'utf8')).palette;
 const images=[];
 for(const width of [640,1280,1536]){const name=`poster-${width}.webp`,info=await sharp(bytes).resize(width).webp({quality:92}).toFile(`${dir}/${name}`);images.push({src:`/media/${projectId}/${name}`,width:info.width,height:info.height,bytes:info.size});}
 const poster={...images[2],srcset:images.map(i=>`${i.src} ${i.width}w`).join(', ')};
 const proxy={method:'authored_proxy',source:'Manually traced generated portfolio cover; visual depth only, not measured geometry.',camera:{fov:38,near:.1,far:30,distance:6},layers:[{name:'environment',distance:7.3,polygon:[[0,0],[1,0],[1,1],[0,1]]},...layerContours.map(l=>({name:l.name,distance:l.distance,polygon:l.points.map(([x,y])=>[x/1536,y/1024])}))],features:id==='project-01'?[{name:'board',uv:[.5,.3],layer:1},{name:'lid',uv:[.6,.65],layer:2}]:[{name:'board',uv:[.5,.5],layer:1},{name:'header',uv:[.13,.45],layer:2}]};
 await writeFile(`${dir}/depth-proxy.json`,JSON.stringify(proxy,null,2));
 const w=1536,h=1024;
 const shapes=layerContours.map(l=>`<polygon points="${l.points.map(p=>p.join(',')).join(' ')}" fill="white" stroke="white" stroke-width="5"/>`).join('');
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${shapes}</svg>`);
 const alpha=await sharp(mask).ensureAlpha().extractChannel(3).raw().toBuffer();
 const rgba=await sharp(bytes).ensureAlpha().raw().toBuffer();
 const nearest=new Int32Array(w*h).fill(-1),queue=new Int32Array(w*h);let head=0,tail=0;
 for(let i=0;i<w*h;i++)if(!alpha[i]){nearest[i]=i;queue[tail++]=i;}
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&nearest[j]===-1){nearest[j]=nearest[i];queue[tail++]=j;}}
 const background=Buffer.from(rgba);for(let i=0;i<w*h;i++)if(alpha[i]){const q=nearest[i]*4;for(let c=0;c<3;c++)background[i*4+c]=rgba[q+c];}
 await sharp(background,{raw:{width:w,height:h,channels:4}}).webp({quality:92}).toFile(`${dir}/environment.webp`);
 const bounds=id==='project-01'?[324,85,1276,891]:[(335-144)*1536/1248,(291-64)*1024/832,(1209-144)*1536/1248,(659-64)*1024/832];
 const composition={targetWidthRatio:id==='project-01'?.62:.70,tolerance:.02,excludes:'cables and cast shadows',subjectBounds:bounds,measuredWidthRatio:(bounds[2]-bounds[0])/1536,crop};
 if(Math.abs(composition.measuredWidthRatio-composition.targetWidthRatio)>composition.tolerance)throw Error('Subject occupancy outside gallery budget');
 const assets={projectId,palette,poster,mobile:poster,texture:images[2],spatial:{runtime:`/media/${projectId}/depth-proxy.json`},composition,source:{path:source,sha256:createHash('sha256').update(original).digest('hex'),width:w,height:h}};
 await writeFile(`src/data/${projectId}.assets.json`,JSON.stringify(assets,null,2));
}
console.log('Two 3:2 cover asset sets and individual depth contours prepared.');
