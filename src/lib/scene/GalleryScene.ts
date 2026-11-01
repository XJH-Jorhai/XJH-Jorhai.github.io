import {createFluidPanel} from './FluidPanel';
import * as T from 'three';
import {assetsFor} from '../../data/projects';
import {DepthScene,type ProxyData} from './DepthScene';
import {PostPipeline} from './PostPipeline';
import {MineralFluid} from './MineralFluid';
import {createPistonGolem} from './PistonGolem';
import {sceneConfig as config,galleryTransition} from './config';
import type {SharedPointer} from '../motion/pointer';
import type {SceneHandle} from './index';

// One context, one scheduler, independent camera/return state for every cover.
export async function createGallery(elements:HTMLElement[],pointer:SharedPointer,wake:()=>void):Promise<SceneHandle|undefined>{
 const loader=new T.TextureLoader();
 const loaded=await Promise.all(elements.map(async element=>{
  const assets=assetsFor(element.dataset.projectId!);
  let texture:T.Texture|undefined,environment:T.Texture|undefined;
  try{
   const response=await fetch(assets.spatial.runtime);if(!response.ok)throw Error('Missing gallery depth');
   const data:ProxyData=await response.json();
   texture=await loader.loadAsync(assets.texture.src);environment=await loader.loadAsync(`/media/${assets.projectId}/environment.webp`);
   texture.colorSpace=environment.colorSpace=T.SRGBColorSpace;
   texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
   return {element,assets,data,texture,environment};
  }catch(error){texture?.dispose();environment?.dispose();element.dataset.renderer='static-failed';console.warn('Gallery poster retained.',error);return undefined;}
 }));
 const inputs=loaded.filter((v):v is NonNullable<typeof v>=>!!v);if(!inputs.length)return;
 let renderer:T.WebGLRenderer;
 try{renderer=new T.WebGLRenderer({alpha:true,antialias:false});if(!renderer.extensions.has('EXT_color_buffer_float')){renderer.dispose();renderer.forceContextLoss();throw Error('Float target unavailable');}}
 catch(error){for(const item of inputs){item.texture.dispose();item.environment.dispose();}console.warn('Gallery poster retained.',error);return;}
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
 const canvas=renderer.domElement;canvas.className='spatial-canvas';canvas.setAttribute('aria-hidden','true');document.querySelector('main')!.prepend(canvas);
 const base=getComputedStyle(document.documentElement).getPropertyValue('--color-base').trim();
 const flow=document.querySelector('[data-mineral-sheen]')?new MineralFluid(renderer):undefined;
 const panel=flow&&location.pathname==="/experiments/work-index-b/"?createFluidPanel(flow,wake):undefined;
 const piston=await createPistonGolem(renderer,wake,(x,y,force)=>flow?.strike(x,y,force)).catch(error=>{console.warn('Original piston poster retained.',error);return undefined;});
 let viewportWidth=innerWidth,viewportHeight=innerHeight;
 const from=new T.Vector2(),to=new T.Vector2(),velocity=new T.Vector2(),measured=new T.Vector2();
 let initialized=false,pointerVersion=pointer.version,inputElapsed=0;
 const covers=inputs.map(item=>{
  const depth=new DepthScene(item.data,item.texture,item.assets.poster.width/item.assets.poster.height,item.environment);
  // A 2D scene background stays fixed in screen space. Only hardware meshes
  // participate in the perspective camera; the photographic aperture never tilts.
  depth.meshes[0]!.visible=false;
  depth.scene.background=item.environment;
  const camera=new T.PerspectiveCamera(item.data.camera.fov,depth.aspect,item.data.camera.near,item.data.camera.far);
  const pipeline=new PostPipeline(renderer,base);pipeline.source.uniforms.cleanGallery!.value=1;pipeline.fxaa.enabled=false;
  return {...item,depth,camera,pipeline,anchor:depth.point([.5,.5],item.data.layers[0]!.distance),bounds:item.element.getBoundingClientRect(),x:0,y:0,exitX:0,exitY:0,elapsed:galleryTransition.exitDuration,active:false,width:0,height:0,renderedX:NaN,renderedY:NaN,renders:0};
 });
 let dead=false,lost=false,frames=0;
 function resize(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,config.dpr));renderer.setSize(innerWidth,innerHeight);
  for(const c of covers){c.bounds=c.element.getBoundingClientRect();const w=Math.max(1,Math.round(c.bounds.width*renderer.getPixelRatio())),h=Math.max(1,Math.round(c.bounds.height*renderer.getPixelRatio()));if(w!==c.width||h!==c.height){c.pipeline.resize(w,h);c.width=w;c.height=h;}}
  if(flow&&(viewportWidth!==innerWidth||viewportHeight!==innerHeight)){flow.resize(innerWidth,innerHeight);flow.clear();initialized=false;viewportWidth=innerWidth;viewportHeight=innerHeight;}
  for(const c of covers)c.renderedX=NaN;
  piston?.resize();
  wake();
 }
 function pause(){flow?.clear();piston?.pause();initialized=false;canvas.style.visibility='hidden';for(const c of covers){c.element.dataset.renderer='static';c.x=c.y=0;c.active=false;c.elapsed=galleryTransition.exitDuration;}}
 function tick(dt:number){
  if(dead||lost)return false;
  if(document.hidden||matchMedia('(prefers-reduced-motion:reduce),(hover:none),(pointer:coarse)').matches){pause();return false;}
  dt=Math.min(dt,.05);let pending=false;
  pending=piston?.tick(dt)??false;
  renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor(0,0);renderer.clear();
  if(flow){
   inputElapsed+=dt;let inject=false;
   if(panel?.hovered){initialized=false;pointerVersion=pointer.version;inputElapsed=0;}
   if(pointer.version!==pointerVersion){
    to.set(pointer.x/innerWidth,1-pointer.y/innerHeight);
    if(pointer.inside){
     if(!initialized){from.copy(to);velocity.set(0,0);initialized=true;}
     inject=from.distanceToSquared(to)>1e-9;
     measured.copy(to).sub(from).divideScalar(Math.max(inputElapsed,1/120)).clampLength(0,2.2);
     velocity.lerp(measured,1.-Math.exp(-Math.min(inputElapsed,.05)/.035));
    }else initialized=false;
    pointerVersion=pointer.version;inputElapsed=0;
   }
   pending=flow.step(dt,from,to,velocity,inject)||pending;
   from.copy(to);
   renderer.setRenderTarget(null);renderer.setViewport(0,0,innerWidth,innerHeight);
   if(flow.remaining>0)flow.draw();
  }
  for(const c of covers){
   const r=c.bounds;
   if(r.bottom<=0||r.top>=innerHeight){c.x=c.y=0;c.active=false;c.elapsed=galleryTransition.exitDuration;c.element.dataset.renderer='static';continue;}
   const active=!panel?.hovered&&pointer.inside&&pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom;
   if(active){const tx=(pointer.x-r.left)/r.width*2-1,ty=(pointer.y-r.top)/r.height*2-1,a=1-Math.exp(-dt/config.response);c.x+=(tx-c.x)*a;c.y+=(ty-c.y)*a;pending ||= Math.abs(tx-c.x)>.0001||Math.abs(ty-c.y)>.0001;}
   else{
    if(c.active){c.exitX=c.x;c.exitY=c.y;c.elapsed=0;}
    c.elapsed=Math.min(galleryTransition.exitDuration,c.elapsed+dt);const t=c.elapsed/galleryTransition.exitDuration,s=t*t*(3-2*t);
    c.x=c.exitX*(1-s);c.y=c.exitY*(1-s);pending ||= c.elapsed<galleryTransition.exitDuration;
   }
   c.active=active;
   const rotation=new T.Quaternion().setFromEuler(new T.Euler(T.MathUtils.degToRad(-c.y*config.pitch),T.MathUtils.degToRad(-c.x*config.yaw),0));
   c.camera.position.copy(c.anchor).add(c.anchor.clone().negate().applyQuaternion(rotation));c.camera.quaternion.copy(rotation);c.camera.updateMatrixWorld();
   if(c.renderedX!==c.x||c.renderedY!==c.y){c.pipeline.render(c.depth.scene,c.camera);c.renderedX=c.x;c.renderedY=c.y;c.renders++;}
   renderer.setRenderTarget(null);renderer.setViewport(r.left,innerHeight-r.bottom,r.width,r.height);renderer.setScissor(r.left,innerHeight-r.bottom,r.width,r.height);renderer.setScissorTest(true);if(flow){flow.bind(c.pipeline.blitMaterial);c.pipeline.blitMaterial.uniforms.fluidRect!.value.set(r.left/innerWidth,1-r.bottom/innerHeight,r.width/innerWidth,r.height/innerHeight);}c.pipeline.draw();renderer.setScissorTest(false);
   c.element.dataset.renderer='webgl2';
  }
  piston?.draw();
  canvas.style.visibility='visible';frames++;return pending;
 }
 const diagnostics=new URLSearchParams(location.search).has('inspect');
 const snapshot=()=>({renderer:'webgl2',frames,contexts:1,piston:piston?.snapshot()??null,flow:flow?{settings:{...flow.settings},remaining:flow.remaining,steps:flow.steps,width:flow.width,height:flow.height,impacts:flow.impacts,lastImpact:flow.lastImpact}:null,covers:covers.map(c=>({id:c.assets.projectId,active:c.active,aim:[c.x,c.y],camera:c.camera.position.toArray(),returnElapsed:c.elapsed,renders:c.renders}))});
 if(diagnostics)Object.assign(window,{__gallery:{snapshot,piston:piston?{seek:piston.seek,setPaused:piston.setPaused}:undefined,clearFlow:()=>{flow?.clear();wake();},inspectFlow:()=>flow?.inspect(),captureRefraction:(enabled:boolean)=>{for(const c of covers)c.pipeline.blitMaterial.uniforms.refractionStrength!.value=enabled?1:0;tick(0);return canvas.toDataURL();}}});
 const onLost=(e:Event)=>{e.preventDefault();lost=true;pause();for(const c of covers)c.element.dataset.renderer='static-context-lost';};canvas.addEventListener('webglcontextlost',onLost);
 resize();tick(0);
 return {tick,resize,pause,dispose(){if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',onLost);piston?.dispose();panel?.dispose();flow?.dispose();for(const c of covers){c.depth.dispose();c.pipeline.dispose();c.element.dataset.renderer='static';}renderer.dispose();renderer.forceContextLoss();canvas.remove();if(diagnostics)Object.assign(window,{__gallery:undefined});}};
}
