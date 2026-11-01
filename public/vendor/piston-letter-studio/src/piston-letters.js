/** Piston Letter Studio — standalone, framework-independent custom element. */
const MODULE_BASE = new URL('../', import.meta.url).href;
const manifestCache = new Map(), imageCache = new Map();
const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DEFAULT_CURVE = [
  {t:0,v:0,in:null,out:{t:.08896235930613983,v:0}},
  {t:.3073318677070813,v:0,in:{t:.2183695084009415,v:0},out:{t:.4105369861309345,v:0}},
  {t:.6714342557466947,v:1,in:{t:.5682291373228415,v:1},out:{t:.697716297247471,v:1}},
  {t:.8256814418694911,v:1,in:{t:.7993994003687148,v:1},out:{t:.9096758915827823,v:1}},
  {t:1,v:0,in:{t:.9096758915827823,v:0},out:null}
];
export const DEFAULT_CONFIG = {mode:'letters',letters:{top:'O',body:'O',left:'O',right:'O'},period:.67,stroke:160,background:'#fffbf2',curve:DEFAULT_CURVE};
export const MINECRAFT_TEXTURES={iron:'iron_block',pumpkinFront:'carved_pumpkin',pumpkinSide:'pumpkin_side',pumpkinTop:'pumpkin_top',pistonTop:'piston_top',pistonSide:'piston_side',pistonBottom:'piston_bottom',pistonInner:'piston_inner'};
const clone = value => JSON.parse(JSON.stringify(value));
function finite(value,fallback){return Number.isFinite(Number(value))?Number(value):fallback;}
export function normalizeCurve(input=DEFAULT_CURVE){
  if(!Array.isArray(input)||input.length<2||input.length>32)throw new TypeError('曲线需要 2–32 个关键帧。');
  const p=input.map((v,i)=>{
    if(!Number.isFinite(v.t)||!Number.isFinite(v.v))throw new TypeError('关键帧坐标必须是有限数字。');
    const h=k=>v[k]&&Number.isFinite(v[k].t)&&Number.isFinite(v[k].v)?{t:clamp(v[k].t),v:clamp(v[k].v)}:null;
    return {t:clamp(v.t),v:clamp(v.v),in:i?h('in'):null,out:i<input.length-1?h('out'):null};
  });
  if(p[0].t!==0||p.at(-1).t!==1)throw new TypeError('曲线必须从 0 开始，在 1 结束。');
  p[0].v=0;p.at(-1).v=0;
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1],dt=b.t-a.t;if(dt<.003)throw new TypeError('关键帧时间必须递增，且不能过于接近。');
    a.out??={t:a.t+dt/3,v:a.v};b.in??={t:b.t-dt/3,v:b.v};
    a.out.t=clamp(a.out.t,a.t,b.t);b.in.t=clamp(b.in.t,a.out.t,b.t);
  }
  return p;
}
export function normalizeConfig(input={}){
  const letters={...DEFAULT_CONFIG.letters,...input.letters};
  for(const key of Object.keys(letters)){
    letters[key]=String(letters[key]).toUpperCase();
    if(!/^[A-Z]$/.test(letters[key]))throw new TypeError('字母必须为 A–Z。');
  }
  const result={letters,period:clamp(finite(input.period,.67),.2,5),stroke:clamp(finite(input.stroke,160),0,200),background:input.background==='transparent'?'transparent':/^#[\da-f]{6}$/i.test(input.background||'')?input.background:'#fffbf2',curve:normalizeCurve(input.curve||DEFAULT_CURVE)};
  result.mode=input.mode==='minecraft'?'minecraft':'letters';
  if(result.mode==='minecraft')result.stroke=100;
  if(input.assets)result.assets=clone(input.assets);
  return result;
}
export function cubic(a,b,c,d,u){const z=1-u;return z*z*z*a+3*z*z*u*b+3*z*u*u*c+u*u*u*d;}
export function curveSegment(points,t){let i=0;while(i<points.length-2&&t>points[i+1].t)i++;return i;}
export function solveCurveTime(points,i,t){const a=points[i],b=points[i+1];let lo=0,hi=1;for(let n=0;n<30;n++){const m=(lo+hi)/2;if(cubic(a.t,a.out.t,b.in.t,b.t,m)<t)lo=m;else hi=m;}return (lo+hi)/2;}
export function sampleCurve(points,t){
  if(t<=0||t>=1)return 0;
  const i=curveSegment(points,t),a=points[i],b=points[i+1],u=solveCurveTime(points,i,t);
  return clamp(cubic(a.v,a.out.v,b.in.v,b.v,u));
}
export function makeGifSchedule(period){
  const units=Math.max(20,Math.round(period*100)),count=Math.min(250,Math.floor(units/2));
  let time=0;return Array.from({length:count},(_,i)=>{const delay=(Math.floor((i+1)*units/count)-Math.floor(i*units/count))*10;const frame={phase:time/(units*10),delay};time+=delay;return frame;});
}
export const SLOT_ORIGINS={M:[390,392],G:[162,430],T:[666,455]};
export function makeLayout(metadata,letters){
  const attach={},bases={},socket=metadata.piston.socket||[57,70];
  for(const [name,slot] of [['M','body'],['G','left'],['T','right']]){
    attach[name]=metadata[slot].attachment||[metadata[slot].width*.6,40];
    bases[name]=[SLOT_ORIGINS[name][0]+attach[name][0]-socket[0],SLOT_ORIGINS[name][1]+attach[name][1]-socket[1]];
  }
  return {attach,bases,socket,kinds:{M:1,G:letters.left==='T'?3:2,T:letters.right==='T'?3:2}};
}
export function frameState(config,phase,layout){
  const p=((phase%1)+1)%1,q=sampleCurve(config.curve,p),a=config.stroke/100,ext={M:(1-q)*a,G:q*a,T:q*a},positions={};
  for(const n of ['M','G','T'])positions[n]=[SLOT_ORIGINS[n][0]-60*ext[n],SLOT_ORIGINS[n][1]+38*ext[n]];
  return {phase:p,q,ext,positions,bases:layout.bases};
}
export async function getManifest(base=MODULE_BASE){
  const url=new URL('assets/manifest.json',base).href;
  if(!manifestCache.has(url))manifestCache.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('素材库加载失败 ('+r.status+')');return r.json();}));
  return manifestCache.get(url);
}
function loadImage(src){
  if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>{imageCache.delete(src);reject(new Error('字母素材加载失败：'+src));};image.src=src;}));
  return imageCache.get(src);
}
export async function resolveAssets(config,base=MODULE_BASE){
  if(config.mode==='minecraft'){
    const metadata=config.assets?clone(config.assets):Object.fromEntries(Object.entries(MINECRAFT_TEXTURES).map(([key,name])=>[key,{src:'assets/minecraft/'+name+'.png',width:16,height:16}]));
    const images={};
    await Promise.all(Object.entries(metadata).map(async([key,entry])=>{entry.src=new URL(entry.src,base).href;images[key]=await loadImage(entry.src);}));
    return {metadata,images,layout:{bases:{}}};
  }
  let meta;
  if(config.assets)meta=clone(config.assets);
  else{
    const m=await getManifest(base);meta={piston:{...m.piston}};
    for(const [slot,style] of [['top','pumpkin'],['body','tall'],['left','compact'],['right','compact']]){
      const entry=slot==='left'&&config.letters.left==='D'&&m.variants?.leftD?m.variants.leftD:m.styles[style]?.[config.letters[slot]];if(!entry)throw new Error('素材尚未就绪：'+style+'/'+config.letters[slot]);meta[slot]={...entry};
    }
  }
  const mapping={C:'top',M:'body',G:'left',T:'right',base:'piston'},images={};
  await Promise.all(Object.entries(mapping).map(async([n,slot])=>{meta[slot].src=new URL(meta[slot].src,base).href;images[n]=await loadImage(meta[slot].src);}));
  return {metadata:meta,images,layout:makeLayout(meta,config.letters)};
}
function createRenderer(canvas,assets,layout){
const bases=layout.bases,attach=layout.attach,cOrigin=[389,82];
  function drawRods(ctx,f,scale) {
    ctx.save();ctx.scale(scale,scale);
    ctx.lineJoin='round';
    for(const n of ['M','G','T']) {
      if(f.ext[n] < 1e-8) continue;
      const sx=bases[n][0]+layout.socket[0],sy=bases[n][1]+layout.socket[1];
      const ex=f.positions[n][0]+attach[n][0],ey=f.positions[n][1]+attach[n][1];
      const poly=[[sx-11,sy-10],[sx+11,sy+10],[ex+11,ey+10],[ex-11,ey-10]];
      ctx.beginPath();ctx.moveTo(...poly[0]);for(let j=1;j<4;j++)ctx.lineTo(...poly[j]);ctx.closePath();
      // Artwork colors match the approved sticker sprites.
      ctx.strokeStyle='#ffffff';ctx.lineWidth=16;ctx.stroke();
      ctx.fillStyle='#f5b132';ctx.fill();ctx.strokeStyle='#091d3c';ctx.lineWidth=7;ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx-3,sy-3);ctx.lineTo(ex-3,ey-3);ctx.strokeStyle='#ffda69';ctx.lineWidth=9;ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx+9,sy+9);ctx.lineTo(ex+9,ey+9);ctx.strokeStyle='#b56f22';ctx.lineWidth=5;ctx.stroke();
    }
    ctx.restore();
  }
  function depth(n,x,y,w,h) {
    const clamp=v=>Math.max(0,Math.min(1,v));
    let side,top;
    if((n==='G'&&layout.kinds.G!==3)||(n==='T'&&layout.kinds.T!==3)) {side=clamp((x-w*.77)/(w*.19))*.68;top=clamp((40+.08*x-y)/38)*.55;}
    else if(n==='T'||n==='G') {side=y>h*.43?clamp((x-w*.52)/(w*.20))*.68:clamp((x-w*.79)/(w*.17))*.68;top=clamp((37+.1*x-y)/38)*.55;}
    else {side=clamp((x-w*.78)/(w*.14))*.68;if(x>w*.30&&x<w*.46&&y>h*.32)side=Math.max(side,clamp((x-w*.30)/(w*.15))*.68);top=clamp((39+.07*x-y)/38)*.55;}
    return -Math.max(side,top);
  }
  function gpuRenderer(gl) {
    const vs=`#version 300 es
      in vec2 a_uv; uniform vec4 u_rect; out vec2 v_uv;
      void main(){v_uv=a_uv;vec2 p=u_rect.xy+a_uv*u_rect.zw;gl_Position=vec4(p.x/512.-1.,1.-p.y/512.,0.,1.);}`;
    const fs=`#version 300 es
      precision highp float; in vec2 v_uv;uniform sampler2D u_tex;uniform int u_kind;uniform int u_pass;uniform float u_extension;uniform vec2 u_size;out vec4 outColor;
      void main(){vec4 c=texture(u_tex,v_uv);if(c.a<.03)discard;if(u_pass==0&&c.a<.98)discard;if(u_pass==1&&c.a>=.98)discard;
      float z=.95;float x=v_uv.x*u_size.x;float y=v_uv.y*u_size.y;float w=u_size.x;float h=u_size.y;float side=0.;float top=0.;
      if(u_kind==1){side=clamp((x-w*.78)/(w*.14),0.,1.)*.68;if(x>w*.30&&x<w*.46&&y>h*.32)side=max(side,clamp((x-w*.30)/(w*.15),0.,1.)*.68);top=clamp((39.+.07*x-y)/38.,0.,1.)*.55;}
      if(u_kind==2){side=clamp((x-w*.77)/(w*.19),0.,1.)*.68;top=clamp((40.+.08*x-y)/38.,0.,1.)*.55;}
      if(u_kind==3){side=y>h*.43?clamp((x-w*.52)/(w*.20),0.,1.)*.68:clamp((x-w*.79)/(w*.17),0.,1.)*.68;top=clamp((37.+.1*x-y)/38.,0.,1.)*.55;}
      if(u_kind>=1&&u_kind<=3)z=.7-.12*(u_extension-max(side,top)+(u_kind==1?.0001:0.));
      if(u_kind==4)z=.1;if(u_kind==5)z=.93;gl_FragDepth=z;outColor=vec4(c.rgb,u_pass==0?1.:c.a);}`;
    function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const loc={};for(const n of ['u_rect','u_kind','u_pass','u_extension','u_size','u_tex'])loc[n]=gl.getUniformLocation(program,n);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a_uv');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;}
    const textures={};for(const n of Object.keys(assets))textures[n]=texture(assets[n]);
    const rods=document.createElement('canvas');rods.width=512;rods.height=512;const rc=rods.getContext('2d');const rodTex=texture(rods);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.uniform1i(loc.u_tex,0);
    function part(tex,pos,size,kind,extension,pass){gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform4f(loc.u_rect,pos[0],pos[1],size[0],size[1]);gl.uniform2f(loc.u_size,size[0],size[1]);gl.uniform1i(loc.u_kind,kind);gl.uniform1i(loc.u_pass,pass);gl.uniform1f(loc.u_extension,extension);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
    return {type:'webgl2',dispose(){Object.values(textures).forEach(t=>gl.deleteTexture(t));gl.deleteTexture(rodTex);gl.deleteBuffer(buffer);gl.deleteProgram(program);},draw(f){
      rc.clearRect(0,0,512,512);drawRods(rc,f,.5);gl.bindTexture(gl.TEXTURE_2D,rodTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,rods);
      gl.viewport(0,0,canvas.width,canvas.height);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(let pass=0;pass<2;pass++){
        gl.depthMask(pass===0);
        for(const n of ['M','G','T'])part(textures.base,bases[n],[assets.base.width,assets.base.height],0,0,pass);
        part(rodTex,[0,0],[1024,1024],5,0,pass);
        for(const [n,kind] of [['M',1],['G',layout.kinds.G],['T',layout.kinds.T]])part(textures[n],f.positions[n],[assets[n].width,assets[n].height],kind,f.ext[n],pass);
        part(textures.C,cOrigin,[assets.C.width,assets.C.height],4,0,pass);
      }
      gl.depthMask(true);
    }};
  }
  function cpuRenderer(ctx) {
    canvas.width=512;canvas.height=512;
    const names=['M','G','T'];const data=[],maps=[],dims=[];
    for(const n of names){const s=document.createElement('canvas');s.width=Math.round(assets[n].width/2);s.height=Math.round(assets[n].height/2);const c=s.getContext('2d');c.drawImage(assets[n],0,0,s.width,s.height);data.push(c.getImageData(0,0,s.width,s.height).data);dims.push([s.width,s.height]);const z=new Float32Array(s.width*s.height);for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)z[y*s.width+x]=depth(n,x*2,y*2,assets[n].width,assets[n].height);maps.push(z);}
    const sample=new Int32Array(3),z=new Float32Array(3),order=new Int32Array(3);
    return {type:'cpu',dispose(){},draw(f){
      ctx.clearRect(0,0,512,512);
      for(const n of names)ctx.drawImage(assets.base,bases[n][0]/2,bases[n][1]/2,assets.base.width/2,assets.base.height/2);
      drawRods(ctx,f,.5);
      const out=ctx.getImageData(0,0,512,512),dst=out.data;
      const pos=names.map(n=>f.positions[n].map(v=>Math.round(v/2)));
      const minX=Math.max(0,Math.min(...pos.map(v=>v[0]))),minY=Math.max(0,Math.min(...pos.map(v=>v[1])));
      const maxX=Math.min(512,Math.max(...pos.map((v,i)=>v[0]+dims[i][0]))),maxY=Math.min(512,Math.max(...pos.map((v,i)=>v[1]+dims[i][1])));
      for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
        for(let j=0;j<3;j++){const lx=x-pos[j][0],ly=y-pos[j][1];let idx=-1;if(lx>=0&&ly>=0&&lx<dims[j][0]&&ly<dims[j][1])idx=ly*dims[j][0]+lx;sample[j]=idx;z[j]=idx>=0&&data[j][idx*4+3]>0?maps[j][idx]+f.ext[names[j]]+(j===0?.0001:0):-1000;order[j]=j;}
        let t;if(z[order[0]]>z[order[1]]){t=order[0];order[0]=order[1];order[1]=t;}if(z[order[1]]>z[order[2]]){t=order[1];order[1]=order[2];order[2]=t;}if(z[order[0]]>z[order[1]]){t=order[0];order[0]=order[1];order[1]=t;}
        const k=(y*512+x)*4;
        for(let layer=0;layer<3;layer++){const j=order[layer],s=sample[j]*4;if(s<0)continue;const a=data[j][s+3]/255;if(!a)continue;const old=dst[k+3]/255,alpha=a+old*(1-a);for(let c=0;c<3;c++)dst[k+c]=(data[j][s+c]*a+dst[k+c]*old*(1-a))/alpha;dst[k+3]=alpha*255;}
      }
      ctx.putImageData(out,0,0);ctx.drawImage(assets.C,cOrigin[0]/2,cOrigin[1]/2,assets.C.width/2,assets.C.height/2);
    }};
  }

const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,preserveDrawingBuffer:true});return gl?gpuRenderer(gl):cpuRenderer(canvas.getContext('2d',{willReadFrequently:true}));
}

/** Cuboids in block units; all three pistons face +Z, with fixed housings. */
export function minecraftParts(frame){
  const parts=[],box=(id,x,y,z,w,h,d,material)=>parts.push({id,x,y,z,w,h,d,material});
  for(const [name,x] of [['G',-1],['M',0],['T',1]]){
    const e=frame.ext[name];
    box(name+'-base',x,1,-1,1,1,.75,'piston');
    if(e>1e-8)box(name+'-rod',x+.375,1.375,-.25,.25,.25,e,'rod');
    box(name+'-head',x,1,e-.25,1,1,.25,'head');
    box(name+'-iron',x,1,e,1,1,1,'iron');
    if(name==='M')box('lower-iron',x,0,e,1,1,1,'iron');
  }
  box('pumpkin',0,2,0,1,1,1,'pumpkin');
  return parts;
}
function createMinecraftRenderer(canvas,images){
  canvas.width=canvas.height=768;
  const tiles=new Map();
  // Depth along the viewing ray, retained per vertex rather than sorting whole faces.
  const project=([x,y,z])=>[390+130*x-70*z,475+28*x-145*y+58*z,x*70/130+y*(28*70/130+58)/145+z];
  function tile(name,shade=0,rotation=0,crop=[0,0,16,16]){
    const key=JSON.stringify([name,shade,rotation,crop]);if(tiles.has(key))return tiles.get(key);
    const [sx,sy,sw,sh]=crop,turned=Math.abs(rotation)%180===90,c=document.createElement('canvas');
    c.width=turned?sh:sw;c.height=turned?sw:sh;const t=c.getContext('2d');
    t.translate(c.width/2,c.height/2);t.rotate(rotation*Math.PI/180);t.drawImage(images[name],sx,sy,sw,sh,-sw/2,-sh/2,sw,sh);
    t.setTransform(1,0,0,1,0,0);t.fillStyle='rgba(0,0,0,'+shade+')';t.fillRect(0,0,c.width,c.height);tiles.set(key,c);return c;
  }
  function material(kind,face){
    const shade=face==='top'?0:face==='front'?.12:.28;
    if(kind==='iron')return tile('iron',shade);
    if(kind==='pumpkin')return tile(face==='front'?'pumpkinFront':face==='top'?'pumpkinTop':'pumpkinSide',shade);
    if(kind==='rod')return tile('pistonTop',shade,face==='right'?-90:180,[6,6,4,4]);
    if(face==='front')return tile(kind==='head'?'pistonTop':'pistonInner',shade);
    return tile('pistonSide',shade,face==='right'?-90:180,kind==='head'?[0,0,16,4]:[0,4,16,12]);
  }
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,preserveDrawingBuffer:true});
  let backend;
  if(gl){
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const vertex=shader(gl.VERTEX_SHADER,'#version 300 es\nin vec3 a_position;in vec2 a_uv;out vec2 v_uv;void main(){v_uv=a_uv;gl_Position=vec4(a_position.x/384.-1.,1.-a_position.y/384.,-a_position.z/12.,1.);}');
    const fragment=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;in vec2 v_uv;uniform sampler2D u_texture;out vec4 color;void main(){color=texture(u_texture,v_uv);}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(program);
    const buffer=gl.createBuffer(),textures=new Map(),vertices=new Float32Array(30);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const position=gl.getAttribLocation(program,'a_position'),uv=gl.getAttribLocation(program,'a_uv');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,20,0);
    gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.viewport(0,0,768,768);
    backend={name:'webgl2',start(){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);},face(points,tile){
      let texture=textures.get(tile);
      if(!texture){texture=gl.createTexture();textures.set(tile,texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);}else gl.bindTexture(gl.TEXTURE_2D,texture);
      const [a,b,c]=points,d=b.map((v,i)=>v+c[i]-a[i]),corners=[[a,0,0],[b,1,0],[c,0,1],[c,0,1],[b,1,0],[d,1,1]];
      corners.forEach(([p,u,v],i)=>vertices.set([...p,u,v],i*5));
      gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,6);
    },finish(){},dispose(){for(const t of textures.values())gl.deleteTexture(t);gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
  }else{
    // Same per-pixel depth test when WebGL is unavailable (including GIF/offline export).
    const ctx=canvas.getContext('2d'),output=ctx.createImageData(768,768),zbuffer=new Float32Array(768*768),pixels=new Map();
    backend={name:'cpu',start(){output.data.fill(0);zbuffer.fill(-Infinity);},face(points,tile){
      let data=pixels.get(tile);if(!data){data=tile.getContext('2d').getImageData(0,0,tile.width,tile.height).data;pixels.set(tile,data);}
      const [a,b,c]=points,d=b.map((v,i)=>v+c[i]-a[i]),dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],det=dx*ey-dy*ex;
      if(Math.abs(det)<1e-8)return;
      const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0],d[0]))),maxX=Math.min(767,Math.ceil(Math.max(a[0],b[0],c[0],d[0])));
      const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1],d[1]))),maxY=Math.min(767,Math.ceil(Math.max(a[1],b[1],c[1],d[1])));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const px=x+.5-a[0],py=y+.5-a[1],u=(px*ey-py*ex)/det,v=(dx*py-dy*px)/det;
        if(u<0||u>=1||v<0||v>=1)continue;
        const z=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]),index=y*768+x;
        if(z<zbuffer[index])continue;zbuffer[index]=z;
        const source=(Math.min(tile.height-1,Math.floor(v*tile.height))*tile.width+Math.min(tile.width-1,Math.floor(u*tile.width)))*4;
        output.data.set(data.subarray(source,source+4),index*4);
      }
    },finish(){ctx.putImageData(output,0,0);},dispose(){pixels.clear();}};
  }
  return {type:'minecraft',backend:backend.name,dispose(){backend.dispose();tiles.clear();},draw(frame){
    backend.start();
    const faces=[];
    function face(part,name,a,b,c){
      faces.push({part,name,points:[a,b,c].map(project)});
    }
    for(const p of minecraftParts(frame)){
      const {x,y,z,w,h,d}=p;
      face(p,'front',[x,y+h,z+d],[x+w,y+h,z+d],[x,y,z+d]);
      face(p,'right',[x+w,y+h,z+d],[x+w,y+h,z],[x+w,y,z+d]);
      face(p,'top',[x,y+h,z],[x+w,y+h,z],[x,y+h,z+d]);
    }
    for(const f of faces)backend.face(f.points,material(f.part.material,f.name));
    backend.finish();
  }};
}

const ElementBase=globalThis.HTMLElement||class {};
export class PistonLetters extends ElementBase{
  static get observedAttributes(){return ['config','config-id','mode','left','right','top','body','period','stroke','paused','asset-base'];}
  constructor(){
    super();this._config=normalizeConfig();this._phase=0;this._playing=true;this._loadedKey='';this._request=0;this._ready=Promise.resolve();this._last=0;this._raf=0;
    if(!this.attachShadow)return;
    const shadow=this.attachShadow({mode:'open'});shadow.innerHTML='<style>:host{display:block;position:relative;max-width:100%;aspect-ratio:1}canvas{display:block;width:100%;height:100%;object-fit:contain}:host([hidden]){display:none}.error{position:absolute;inset:12px;display:grid;place-items:center;color:inherit;font:14px/1.5 system-ui}.error[hidden]{display:none}</style><canvas width="768" height="768" role="img" aria-label="字母活塞动画"></canvas><div class="error" role="alert" hidden></div>';
    this.canvas=shadow.querySelector('canvas');this._error=shadow.querySelector('.error');
  }
  connectedCallback(){this._playing=!this.hasAttribute('paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;this._fromAttributes();this._start();}
  disconnectedCallback(){cancelAnimationFrame(this._raf);this._raf=0;this._last=0;}
  attributeChangedCallback(name,oldValue,newValue){if(name==='paused'&&this.isConnected){newValue===null?this.play():this.pause();}if(this.isConnected)this._fromAttributes();}
  _fromAttributes(){
    try{
      let input=this.config;const id=this.getAttribute('config-id');if(id){const element=this.ownerDocument.getElementById(id);if(element)input=JSON.parse(element.textContent);}
      if(this.hasAttribute('config'))input=JSON.parse(this.getAttribute('config'));
      const letters={...input.letters};for(const n of ['top','body','left','right'])if(this.hasAttribute(n))letters[n]=this.getAttribute(n);
      input.letters=letters;for(const n of ['period','stroke'])if(this.hasAttribute(n))input[n]=Number(this.getAttribute(n));
      if(this.hasAttribute('mode'))input.mode=this.getAttribute('mode');
      if(this.hasAttribute('paused'))this.pause();this.setConfig(input).catch(()=>{});
    }catch(e){this._showError(e);}
  }
  get config(){return clone(this._config);}
  set config(value){this.setConfig(value).catch(()=>{});}
  get phase(){return this._phase;}
  get playing(){return this._playing;}
  get ready(){return this._ready;}
  get assetBase(){return new URL(this.getAttribute('asset-base')||MODULE_BASE,this.ownerDocument?.baseURI||MODULE_BASE).href;}
  setConfig(input){
    const next=normalizeConfig(input);this._config=next;
    if(this.canvas)this.canvas.style.background=next.background==='transparent'?'transparent':next.background;
    const key=JSON.stringify({mode:next.mode,letters:next.letters,assets:next.assets,base:this.assetBase});
    if(key===this._loadedKey&&this._renderer){this.renderAt(this._phase);return Promise.resolve(this);}
    const request=++this._request;
    this._ready=resolveAssets(next,this.assetBase).then(resolved=>{
      if(request!==this._request)return this;
      this._renderer?.dispose?.();
      if(this._renderMode!==next.mode){const fresh=this.canvas.cloneNode();fresh.width=fresh.height=768;this.canvas.replaceWith(fresh);this.canvas=fresh;this._renderMode=next.mode;}
      this._assets=resolved;this._renderer=next.mode==='minecraft'?createMinecraftRenderer(this.canvas,resolved.images):createRenderer(this.canvas,resolved.images,resolved.layout);this._loadedKey=key;this._error.hidden=true;
      this.canvas.setAttribute('aria-label',next.mode==='minecraft'?'MC 原版：雕刻南瓜头，左右铁块同步伸缩，中间铁块反向联动。':next.letters.left+'、'+next.letters.right+' 同步伸缩，'+next.letters.body+' 反向联动，'+next.letters.top+' 为顶部字母。');
      this.renderAt(this._phase);this.dispatchEvent(new CustomEvent('ready',{detail:{config:this.config}}));return this;
    }).catch(error=>{if(request===this._request)this._showError(error);throw error;});
    return this._ready;
  }
  _showError(error){if(this._error){this._error.hidden=false;this._error.textContent=error.message;}this.dispatchEvent(new CustomEvent('animation-error',{detail:{message:error.message}}));}
  renderAt(phase){
    this._phase=((phase%1)+1)%1;if(!this._renderer)return;
    const frame=frameState(this._config,this._phase,this._assets.layout);this._renderer.draw(frame);this.dispatchEvent(new CustomEvent('frame',{detail:{phase:this._phase,position:frame.q}}));
  }
  play(){this._playing=true;this._last=0;this._start();}
  pause(){this._playing=false;this._last=0;}
  _start(){if(this._raf||!this.isConnected)return;const tick=now=>{this._raf=0;if(!this.isConnected)return;if(this._last&&this._playing&&!document.hidden)this.renderAt(this._phase+Math.min((now-this._last)/1000,.1)/this._config.period);this._last=now;this._raf=requestAnimationFrame(tick);};this._raf=requestAnimationFrame(tick);}
  captureFrame(phase,{size=768,background=this._config.background}={}){
    if(!this._renderer)throw new Error('素材还在加载。');this.renderAt(phase);
    const out=document.createElement('canvas');out.width=out.height=size;const ctx=out.getContext('2d',{willReadFrequently:true});
    if(background!=='transparent'){ctx.fillStyle=background;ctx.fillRect(0,0,size,size);}ctx.drawImage(this.canvas,0,0,size,size);return out;
  }
  async embeddedConfig(){
    const config=this.config,resolved=await resolveAssets(config,this.assetBase);config.assets=clone(resolved.metadata);
    await Promise.all(Object.entries(config.assets).map(async([slot,entry])=>{
      if(entry.src.startsWith('data:'))return;
      const response=await fetch(entry.src);if(!response.ok)throw new Error('无法打包素材：'+entry.src);
      const blob=await response.blob();entry.src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
    }));return config;
  }
  dispose(){this.pause();cancelAnimationFrame(this._raf);this._raf=0;this._renderer?.dispose?.();this._renderer=null;}
}
if(globalThis.customElements&&!customElements.get('piston-letters'))customElements.define('piston-letters',PistonLetters);
