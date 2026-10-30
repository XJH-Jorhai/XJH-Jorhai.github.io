import * as T from 'three';
import {assetsFor} from '../../data/projects';
import {DepthScene,type ProxyData} from './DepthScene';
import {PostPipeline} from './PostPipeline';
import {FlowField} from './FlowField';
import {sceneConfig as config,galleryTransition} from './config';
import type {SharedPointer} from '../motion/pointer';
import type {SceneHandle} from './index';

export async function createScene(element:HTMLElement,pointer:SharedPointer,wake:()=>void):Promise<SceneHandle>{
  const assets=assetsFor(element.dataset.projectId ?? 'project-01');
  const gallery=element.hasAttribute('data-hover-preview');
  const carrier=element.querySelector<HTMLElement>('.visual-carrier')!;
  let retiring=false,reveal=gallery?0:1;
  let exitTime=galleryTransition.exitDuration,exitX=0,exitY=0;
  const response=await fetch(assets.spatial.runtime);if(!response.ok)throw Error('Depth missing');
  const data:ProxyData=await response.json();
  if(data.layers.length<3||data.layers.some(l=>!Number.isFinite(l.distance)||l.distance<=0))throw Error('Invalid proxy');
  const loader=new T.TextureLoader();
  const [texture,environment]=await Promise.all([loader.loadAsync(assets.texture.src),loader.loadAsync(`/media/${assets.projectId}/environment.webp`)]);
  texture.colorSpace=environment.colorSpace=T.SRGBColorSpace;
  environment.wrapS=environment.wrapT=T.ClampToEdgeWrapping;
  texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:false});}catch(e){texture.dispose();environment.dispose();throw e;}
  if(!renderer.extensions.has('EXT_color_buffer_float')){texture.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();throw Error('Floating render targets unsupported; static fallback');}
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,config.dpr));renderer.autoClear=false;
  const canvas=renderer.domElement;canvas.className='spatial-canvas';canvas.setAttribute('aria-hidden','true');document.querySelector('main')!.prepend(canvas);
  const depthScene=new DepthScene(data,texture,assets.poster.width/assets.poster.height,environment);
  const camera=new T.PerspectiveCamera(T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(data.camera.fov/2))*config.insetPerspective)),depthScene.aspect,data.camera.near,data.camera.far);
  const pageBase=getComputedStyle(document.documentElement).getPropertyValue('--color-base').trim()||assets.palette.base;
  const anchor=depthScene.point([.5,.5],data.layers[0]!.distance);const pipeline=new PostPipeline(renderer,pageBase);
  const flow=new FlowField(renderer,config.flowSize,Math.round(config.flowSize*innerHeight/innerWidth),pageBase);
  let bounds=element.getBoundingClientRect(),fieldBounds=document.querySelector('main')!.getBoundingClientRect();
  const entryOffset=new T.Vector2();
  const entryPath=[[0,0],[-1,.08],[.9,-.12],[.12,-1],[-.08,.85],[-.8,.16],[.65,-.25],[0,0]] as const;
  let entryStartX=0,entryStartY=0;
  let wasActive=false,entryTime=config.entryDuration,blur=0,flash=0;
  let x=0,y=0,frames=0,dead=false,lost=false,lastVersion=pointer.version,lastTime=performance.now();
  let lastUv=new T.Vector2(pointer.x/innerWidth,1-pointer.y/innerHeight);
  let renderWidth=0,renderHeight=0;const timings:number[]=[];
  const state={flow:!gallery,flat:false,freeze:false,view:'color',input:null as number[]|null,output:true,fxaa:false,entry:!gallery};
  const diagnostics=new URLSearchParams(location.search).has('inspect');
  function resize(){bounds=element.getBoundingClientRect();fieldBounds=document.querySelector('main')!.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio,config.dpr));renderer.setSize(innerWidth,innerHeight);const dpr=renderer.getPixelRatio(),w=Math.max(1,Math.round(bounds.width*config.frameExpansion*dpr)),h=Math.max(1,Math.round(bounds.height*config.frameExpansion*dpr));if(w!==renderWidth||h!==renderHeight){pipeline.resize(w,h);renderWidth=w;renderHeight=h;}wake();}
  function pause(){element.dataset.renderer='static';canvas.style.visibility='hidden';x=0;y=0;wasActive=false;entryTime=config.entryDuration;flow.clear();lastVersion=pointer.version;lastUv.set(pointer.x/innerWidth,1-pointer.y/innerHeight);}
  function render(dt:number){
    if(dead||lost)return false;if(matchMedia('(prefers-reduced-motion:reduce)').matches){pause();return false;}const start=performance.now();dt=Math.min(dt,.05);
    if(fieldBounds.bottom<0||fieldBounds.top>innerHeight||document.hidden){pause();return false;}
    const active=!retiring&&pointer.inside&&pointer.x>=bounds.left&&pointer.x<=bounds.right&&pointer.y>=bounds.top&&pointer.y<=bounds.bottom;
    if(gallery&&wasActive&&!active){exitTime=0;exitX=x;exitY=y;}
    if(gallery&&!active)exitTime=Math.min(galleryTransition.exitDuration,exitTime+dt);
    if(gallery){
      reveal=Math.max(0,Math.min(1,reveal+(active?1:-1)*dt/(active?galleryTransition.enterDuration:galleryTransition.exitDuration)));
      const blend=reveal*reveal*(3-2*reveal);
      carrier.style.opacity=String(1-blend);canvas.style.opacity=String(blend);
      if(reveal===0){x=0;y=0;}
    }
    const entering=active&&!wasActive;
    if(entering){entryTime=0;entryStartX=x;entryStartY=y;}
    const entryFinishing=entryTime<config.entryDuration;
    wasActive=active;entryTime=Math.min(config.entryDuration,entryTime+dt);
    const phase=entryTime/config.entryDuration;
    // A shared envelope keeps exposure, defocus and dispersion in sync.
    const envelope=state.entry&&phase<1?Math.sin(Math.PI*phase)**2:0;
    blur=config.entryBlur*envelope;
    flash=config.entryFlash*envelope;
    pipeline.source.uniforms.blur!.value=blur*renderer.getPixelRatio();
    pipeline.source.uniforms.edgeBlur!.value=config.edgeBlur*renderer.getPixelRatio();
    pipeline.source.uniforms.flash!.value=flash;
    const target=state.input??(active?[(pointer.x-bounds.left)/bounds.width*2-1,(pointer.y-bounds.top)/bounds.height*2-1]:[0,0]);
    const alpha=1-Math.exp(-dt/(active?config.response:config.returnTime));
    if(!state.freeze){
      if(gallery&&!active&&!state.input){const t=exitTime/galleryTransition.exitDuration;const ease=t*t*(3-2*t);x=exitX*(1-ease);y=exitY*(1-ease);}
      else if(active&&state.entry&&phase<1){const progress=1-Math.pow(1-phase,3);x=entryStartX+(target[0]!-entryStartX)*progress;y=entryStartY+(target[1]!-entryStartY)*progress;}
      else if(active&&state.entry&&entryFinishing){x=target[0]!;y=target[1]!;}
      else{x+=(target[0]!-x)*alpha;y+=(target[1]!-y)*alpha;}
    }
    const rotation=new T.Quaternion().setFromEuler(new T.Euler(T.MathUtils.degToRad(-y*config.pitch),T.MathUtils.degToRad(-x*config.yaw),0));
    camera.position.copy(anchor).add(anchor.clone().negate().applyQuaternion(rotation));camera.quaternion.copy(rotation);
    // Alternate opposing horizontal/vertical jumps; short holds avoid an orbiting path.
    const travel=Math.min(phase,1)*(entryPath.length-1);
    const segment=Math.min(Math.floor(travel),entryPath.length-2);
    const local=travel-segment;
    const jump=Math.min(1,local/.45);
    const blend=jump*jump*(3-2*jump);
    const from=entryPath[segment]!,to=entryPath[segment+1]!;
    entryOffset.set(from[0]+(to[0]-from[0])*blend,from[1]+(to[1]-from[1])*blend).multiplyScalar(config.entryJitter*envelope);
    if(envelope===0)entryOffset.set(0,0);
    const worldPerPixel=2*Math.tan(T.MathUtils.degToRad(data.camera.fov/2))*data.camera.distance/Math.max(1,bounds.height);
    camera.position.add(new T.Vector3(entryOffset.x*worldPerPixel,entryOffset.y*worldPerPixel,0).applyQuaternion(rotation));
    camera.updateMatrixWorld();
    renderer.setScissorTest(false);
    const uv=new T.Vector2(pointer.x/innerWidth,1-pointer.y/innerHeight),changed=pointer.version!==lastVersion;
    const insideField=pointer.inside&&pointer.x>=fieldBounds.left&&pointer.x<=fieldBounds.right&&pointer.y>=fieldBounds.top&&pointer.y<=fieldBounds.bottom;
    const velocity=uv.clone().sub(lastUv).divideScalar(Math.max(.016,(performance.now()-lastTime)/1000)).clampLength(0,1.4);
    let flowing=false;if(state.flow)flowing=flow.step(dt,lastUv,uv,velocity,changed&&insideField&&velocity.length()>.002);else if(flow.remaining>0)flow.clear();
    if(changed){lastVersion=pointer.version;lastUv.copy(uv);lastTime=performance.now();}
    pipeline.source.uniforms.diagnostic!.value=state.view==='depth'?1:0;
    pipeline.output.enabled=state.output;pipeline.fxaa.enabled=state.fxaa;
    const photoVisible=bounds.bottom>0&&bounds.top<innerHeight;
    if(photoVisible)pipeline.render(depthScene.scene,camera);
    renderer.setRenderTarget(null);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor(0,0);renderer.clear();
    if(state.flow&&flow.available){renderer.setScissor(fieldBounds.left,innerHeight-fieldBounds.bottom,fieldBounds.width,fieldBounds.height);renderer.setScissorTest(true);flow.draw(state.view==='flow');}
    if(photoVisible){const padX=bounds.width*(config.frameExpansion-1)/2,padY=bounds.height*(config.frameExpansion-1)/2;renderer.setViewport(bounds.left-padX,innerHeight-bounds.bottom-padY,bounds.width*config.frameExpansion,bounds.height*config.frameExpansion);renderer.setScissor(bounds.left-padX,innerHeight-bounds.bottom-padY,bounds.width*config.frameExpansion,bounds.height*config.frameExpansion);renderer.setScissorTest(true);pipeline.draw();}renderer.setScissorTest(false);
    canvas.style.visibility='visible';element.dataset.renderer='webgl2';frames++;if(diagnostics&&timings.length<900)timings.push(performance.now()-start);
    return (gallery&&(retiring||reveal!==(active?1:0)))||Math.abs(x-target[0]!)>.0001||Math.abs(y-target[1]!)>.0001||flowing||(state.entry&&entryTime<config.entryDuration);
  }
  function snapshot(){return {renderer:element.dataset.renderer,frames,entry:{blur,flash,offset:entryOffset.toArray(),elapsed:entryTime},aim:[x,y],camera:camera.position.toArray(),state:{...state},bounds:{width:bounds.width,height:bounds.height},features:data.features.map((f,i)=>{const point=depthScene.feature(i),p=point.clone().project(camera);const distance=-point.applyMatrix4(camera.matrixWorldInverse).z;return {name:f.name,x:(p.x*config.frameExpansion+1)*bounds.width/2,y:(1-p.y*config.frameExpansion)*bounds.height/2,distance};}),passes:['Scene color + DepthTexture (MSAA 4x)','Entry pulse + soft lens rim','OutputPass',...(state.fxaa?['FXAA']:[]),'Composite'],flow:{available:flow.available,steps:flow.steps,remaining:flow.remaining,size:[flow.width,flow.height]},dpr:renderer.getPixelRatio(),renderSize:[renderWidth,renderHeight],texture:[assets.texture.width,assets.texture.height],geometries:renderer.info.memory.geometries,timings};}
  if(diagnostics)Object.assign(window,{__spatial:{snapshot,flowStats:()=>flow.inspect(),set:(next:Partial<typeof state>)=>{Object.assign(state,next);if(state.flat!==depthScene.flat)depthScene.build(state.flat);for(const m of depthScene.meshes){m.material.wireframe=state.view==='geometry';m.material.map=state.view==='geometry'?null:m.name.startsWith('environment')&&!state.flat?environment:texture;m.material.color.set(state.view==='geometry'?assets.palette.accent:'#ffffff');m.material.needsUpdate=true;}wake();},lose:()=>renderer.forceContextLoss()}});
  const contextLost=(event:Event)=>{event.preventDefault();lost=true;pause();element.dataset.renderer='static-context-lost';};canvas.addEventListener('webglcontextlost',contextLost);
  resize();render(1/60);
  return {tick:render,resize,pause,retire(value){retiring=value;},resting:()=>reveal===0,dispose(){if(dead)return;dead=true;carrier.style.removeProperty('opacity');canvas.removeEventListener('webglcontextlost',contextLost);depthScene.dispose();pipeline.dispose();flow.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();element.dataset.renderer='static';if(diagnostics)Object.assign(window,{__spatial:undefined});}};
}

