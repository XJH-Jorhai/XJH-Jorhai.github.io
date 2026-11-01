import {fluidDefaults,type FluidSettings} from './fluidSettings';
import * as T from 'three';
import {FluidSimulation} from 'three-fluid-fx';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Shared optical response; field coordinates are viewport UV, independent of photo UV. */
export const fluidOptics=`
 uniform sampler2D fluidVelocity,fluidDensity;uniform vec2 fluidTexel,velocityTexel;uniform float fluidFade,lightGain,bendGain;
 vec3 fluidLight(vec2 uv,out float alpha,out vec2 bend){
  vec2 v=(texture2D(fluidDensity,uv).xy*4.+texture2D(fluidDensity,uv+vec2(fluidTexel.x,0)).xy+texture2D(fluidDensity,uv-vec2(fluidTexel.x,0)).xy+texture2D(fluidDensity,uv+vec2(0,fluidTexel.y)).xy+texture2D(fluidDensity,uv-vec2(0,fluidTexel.y)).xy)/8.;
  float d=max(0.,texture2D(fluidDensity,uv).b);
  vec2 g=vec2(texture2D(fluidDensity,uv+vec2(fluidTexel.x,0)).b-texture2D(fluidDensity,uv-vec2(fluidTexel.x,0)).b,
   texture2D(fluidDensity,uv+vec2(0,fluidTexel.y)).b-texture2D(fluidDensity,uv-vec2(0,fluidTexel.y)).b);
  float speed=length(v);
  float energy=1.-exp(-speed*24.);
  float presence=1.-exp(-d*28.);
  // Optical color follows the local transported momentum, not a density outline.
  float phase=6.*speed/(speed+.5)+dot(v,vec2(.5,-.25));
  float hue=.5+.5*sin(phase*2.-1.);
  vec3 color=mix(vec3(.22,.70,.96),vec3(.68,.43,.82),smoothstep(.05,.55,hue));
  color=mix(color,vec3(1.,.65,.41),smoothstep(.55,1.,hue));
  vec2 shear=vec2(length(texture2D(fluidDensity,uv+vec2(fluidTexel.x,0)).xy)-length(texture2D(fluidDensity,uv-vec2(fluidTexel.x,0)).xy),length(texture2D(fluidDensity,uv+vec2(0,fluidTexel.y)).xy)-length(texture2D(fluidDensity,uv-vec2(0,fluidTexel.y)).xy));
  float rim=pow(1.-exp(-length(shear)*14.),1.5);
  alpha=clamp(lightGain*energy*presence*fluidFade*(.012+.8*rim),0.,.8);
  bend=(v*.08+g*.005)*presence*fluidFade;
  bend=clamp(bend*bendGain,vec2(-.018),vec2(.018));
  return color;
 }`;
export class MineralFluid {
 settings:FluidSettings={...fluidDefaults};
 solver:FluidSimulation;steps=0;remaining=0;width=1;height=1;
 impacts=0;lastImpact:{x:number;y:number;force:number}|undefined;
 material:T.ShaderMaterial;quad:FullScreenQuad;
 opticalA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});opticalB=this.opticalA.clone();
 spread:T.ShaderMaterial;
 constructor(public renderer:T.WebGLRenderer){
  this.solver=new FluidSimulation(renderer,{profile:'performance',simResolution:256,dyeResolution:512,pressureIterations:8,bfecc:true,enableVorticity:true,curlStrength:.4,reflectWalls:false,velocityDissipation:.995,densityDissipation:.974});
  this.spread=new T.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,uniforms:{previous:{value:null},source:{value:null},velocity:{value:null},texel:{value:new T.Vector2()},velocityTexel:{value:new T.Vector2()},dt:{value:0},driftGain:{value:1.4},motionDamping:{value:1.15},diffusionRate:{value:16},fadeRate:{value:.85}},fragmentShader:`
 uniform sampler2D previous,source,velocity;uniform vec2 texel,velocityTexel;uniform float dt,driftGain,motionDamping,diffusionRate,fadeRate;varying vec2 vUv;
 void main(){
 vec3 origin=texture2D(previous,vUv).xyz;
 vec2 flow=texture2D(velocity,vUv).xy*velocityTexel;
 vec2 drift=(origin.xy*4.+texture2D(previous,vUv+vec2(texel.x*3.,0)).xy+texture2D(previous,vUv-vec2(texel.x*3.,0)).xy+texture2D(previous,vUv+vec2(0,texel.y*3.)).xy+texture2D(previous,vUv-vec2(0,texel.y*3.)).xy)/8.;
 vec2 uv=vUv-(flow*.5+drift*driftGain)*dt;
 vec3 c=texture2D(previous,uv).xyz;
 vec2 r=texel*1.5;
 vec3 neighbors=(texture2D(previous,uv+vec2(r.x,0)).xyz+texture2D(previous,uv-vec2(r.x,0)).xyz+texture2D(previous,uv+vec2(0,r.y)).xyz+texture2D(previous,uv-vec2(0,r.y)).xyz)*.25;
 c=mix(c,neighbors,vec3(1.-exp(-dt*3.),1.-exp(-dt*3.),1.-exp(-dt*diffusionRate)));
 c*=exp(-dt*vec3(motionDamping,motionDamping,fadeRate));
 vec3 sourceData=texture2D(source,vUv).xyz;
 float fresh=clamp((sourceData.b-c.b)/max(sourceData.b,.001),0.,1.);
 c.xy=mix(c.xy,sourceData.xy*velocityTexel,fresh);
 c.b=max(c.b,sourceData.b);
 gl_FragColor=vec4(c,1.);
 }`});
  this.material=new T.ShaderMaterial({vertexShader,uniforms:this.uniforms(),fragmentShader:`varying vec2 vUv;${fluidOptics} void main(){float a;vec2 bend;vec3 c=fluidLight(vUv,a,bend);gl_FragColor=vec4(c,a);#include <colorspace_fragment>\n}`.replace(';#include',';\n#include'),transparent:true,depthTest:false,depthWrite:false});
  this.quad=new FullScreenQuad(this.material);this.resize(innerWidth,innerHeight);
 }
 uniforms(){return {lightGain:{value:1},bendGain:{value:1},fluidVelocity:{value:this.solver.velocityTexture},fluidDensity:{value:this.solver.densityTexture},velocityTexel:{value:new T.Vector2()},fluidTexel:{value:new T.Vector2(1/384,1/384)},fluidFade:{value:0}};}
 bind(material:T.ShaderMaterial){const u=material.uniforms;u.lightGain!.value=this.settings.brightness;u.bendGain!.value=this.settings.refraction;u.fluidVelocity!.value=this.solver.velocityTexture;u.fluidDensity!.value=this.opticalA.texture;u.fluidTexel!.value.set(1/this.width,1/this.height);const image=this.solver.velocityTexture.image as {width:number;height:number};u.velocityTexel!.value.set(1/image.width,1/image.height);u.fluidFade!.value=T.MathUtils.smoothstep(this.remaining,0,1.5);}
 resize(w:number,h:number){this.solver.resize(w,h);const image=this.solver.densityTexture.image as {width:number;height:number};this.width=image.width;this.height=image.height;this.opticalA.setSize(this.width,this.height);this.opticalB.setSize(this.width,this.height);this.clear();}
 clear(){this.remaining=0;const s=this.solver,vd=s.velocityDissipation,dd=s.densityDissipation,pd=s.pressureDissipation;s.velocityDissipation=s.densityDissipation=s.pressureDissipation=0;s.step(1/60);s.velocityDissipation=vd;s.densityDissipation=dd;s.pressureDissipation=pd;for(const target of [this.opticalA,this.opticalB]){this.renderer.setRenderTarget(target);this.renderer.setClearColor(0,0);this.renderer.clear();}this.renderer.setRenderTarget(null);}
 /** One radial force impulse in the very same velocity/density solver as the pointer. */
 strike(x:number,y:number,force:number){
  if(![x,y,force].every(Number.isFinite)||force<=0)return;
  const strength=Math.min(force,180)/100;
  const size=this.solver.velocityTexture.image as {width:number;height:number};
  const radius=22/innerHeight,aspect=innerHeight/innerWidth;
  for(let i=0;i<16;i++){
   const angle=i/16*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle);
   const vx=dx*size.width*aspect*.9*strength,vy=dy*size.height*.9*strength;
   this.solver.addSplat(x+dx*radius*aspect,y+dy*radius,vx,vy,{radius:.00012,color:[vx,vy,.45*strength]});
  }
  this.remaining=7;this.impacts++;this.lastImpact={x,y,force};
 }
 step(dt:number,from:T.Vector2,to:T.Vector2,velocity:T.Vector2,inject:boolean){
  this.solver.curlStrength=this.settings.curl;
  if(dt<=0)return this.remaining>0;
  if(inject){this.remaining=7;const distance=from.distanceTo(to);const n=Math.min(24,Math.max(1,Math.ceil(distance/.008)));const speed=velocity.length();const gain=this.settings.force*Math.min(dt,.04)/n;const size=this.solver.velocityTexture.image as {width:number;height:number};const vx=velocity.x*size.width*gain,vy=velocity.y*size.height*gain;
   for(let i=1;i<=n;i++){const t=i/n;this.solver.addSplat(T.MathUtils.lerp(from.x,to.x,t),T.MathUtils.lerp(from.y,to.y,t),vx,vy,{radius:(.000045+Math.min(speed,2)*.000025)*this.settings.radius**2,color:[vx,vy,(.12+Math.min(speed,2)*.35)/n]});}}
  if(this.remaining<=0)return false;
  // Solver clamps to 1/60: bounded substeps preserve elapsed time on slower frames.
  const n=Math.max(1,Math.ceil(dt*60));for(let i=0;i<n;i++){this.solver.step(Math.max(dt/n,.000001));const u=this.spread.uniforms;u.driftGain!.value=this.settings.drift;u.motionDamping!.value=this.settings.damping;u.diffusionRate!.value=this.settings.diffusion;u.fadeRate!.value=this.settings.fade;u.previous!.value=this.opticalA.texture;u.source!.value=this.solver.densityTexture;u.velocity!.value=this.solver.velocityTexture;u.texel!.value.set(1/this.width,1/this.height);const size=this.solver.velocityTexture.image as {width:number;height:number};u.velocityTexel!.value.set(1/size.width,1/size.height);u.dt!.value=dt/n;this.quad.material=this.spread;this.renderer.setRenderTarget(this.opticalB);this.quad.render(this.renderer);this.renderer.setRenderTarget(null);[this.opticalA,this.opticalB]=[this.opticalB,this.opticalA];}this.steps++;
  this.remaining=Math.max(0,this.remaining-dt);if(!this.remaining)this.clear();return this.remaining>0;
 }
 draw(){this.quad.material=this.material;this.bind(this.material);this.quad.render(this.renderer);}
 inspect(){
 const target=new T.WebGLRenderTarget(this.width,this.height,{type:T.HalfFloatType,depthBuffer:false});
 const material=new T.ShaderMaterial({vertexShader,uniforms:{field:{value:this.opticalA.texture}},fragmentShader:'uniform sampler2D field;varying vec2 vUv;void main(){gl_FragColor=texture2D(field,vUv);}',depthTest:false,depthWrite:false});
 const quad=new FullScreenQuad(material),previous=this.renderer.getRenderTarget();this.renderer.setRenderTarget(target);quad.render(this.renderer);
 const pixels=new Uint16Array(this.width*this.height*4);this.renderer.readRenderTargetPixels(target,0,0,this.width,this.height,pixels);this.renderer.setRenderTarget(previous);quad.dispose();material.dispose();target.dispose();
 let mass=0,x=0,y=0,xx=0,yy=0,area=0,peakSpeed=0;for(let i=0;i<pixels.length;i+=4){peakSpeed=Math.max(peakSpeed,Math.hypot(T.DataUtils.fromHalfFloat(pixels[i]!),T.DataUtils.fromHalfFloat(pixels[i+1]!)));const d=Math.max(0,T.DataUtils.fromHalfFloat(pixels[i+2]!)),px=(i/4)%this.width,py=Math.floor(i/4/this.width);mass+=d;x+=px*d;y+=py*d;xx+=px*px*d;yy+=py*py*d;if(d>.01)area++;}
 return {solver:'three-fluid-fx@0.1.0',remaining:this.remaining,steps:this.steps,mass,area,peakSpeed,varianceX:xx/Math.max(mass,1e-9)-(x/Math.max(mass,1e-9))**2,varianceY:yy/Math.max(mass,1e-9)-(y/Math.max(mass,1e-9))**2};
 }
 dispose(){this.spread.dispose();this.opticalA.dispose();this.opticalB.dispose();this.solver.dispose();this.material.dispose();this.quad.dispose();}
}
