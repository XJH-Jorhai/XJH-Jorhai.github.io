import * as T from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** RG: velocity in UV/second; B: dye. Semi-Lagrangian advection + bounded diffusion. */
export class FlowField {
  a:T.WebGLRenderTarget;b:T.WebGLRenderTarget;
  simulation:T.ShaderMaterial;display:T.ShaderMaterial;quad:FullScreenQuad;
  steps=0;remaining=0;available:boolean;
  constructor(public renderer:T.WebGLRenderer,public width:number,public height:number,color:string,public mineral=false){
    this.available=renderer.extensions.has('EXT_color_buffer_float');
    this.a=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});this.b=this.a.clone();
    this.simulation=new T.ShaderMaterial({vertexShader,uniforms:{previous:{value:this.a.texture},dt:{value:.016},texel:{value:new T.Vector2(1/width,1/height)},aspect:{value:innerWidth/innerHeight},from:{value:new T.Vector2()},to:{value:new T.Vector2()},velocity:{value:new T.Vector2()},previousVelocity:{value:new T.Vector2()},inject:{value:0}},fragmentShader:`
      uniform sampler2D previous;uniform float dt,aspect,inject;uniform vec2 texel,from,to,velocity,previousVelocity;varying vec2 vUv;
      void main(){vec4 old=texture2D(previous,vUv);
        vec2 transport=old.xy;
        ${mineral ? `
        // Transport detail with a spatially smoothed velocity, not its own sharp edges.
        vec2 filterStep=texel*3.;
        transport=(old.xy*4.+texture2D(previous,vUv+vec2(filterStep.x,0)).xy
          +texture2D(previous,vUv-vec2(filterStep.x,0)).xy
          +texture2D(previous,vUv+vec2(0,filterStep.y)).xy
          +texture2D(previous,vUv-vec2(0,filterStep.y)).xy)/8.;
        ` : ''}
        vec2 q=clamp(vUv-transport*dt,vec2(0.),vec2(1.));vec4 advected=texture2D(previous,q);vec3 c=advected.xyz;
        float freshness=advected.w;
        float release=${mineral ? 'clamp(1.-freshness/max(c.z,.00001),0.,1.)' : '0.'};
        vec2 spread=texel*${mineral ? '(1.+release*.6)' : '1.'};
        vec4 neighbors=(texture2D(previous,q+vec2(spread.x,0))+texture2D(previous,q-vec2(spread.x,0))+texture2D(previous,q+vec2(0,spread.y))+texture2D(previous,q-vec2(0,spread.y)))*.25;
        float diffusion=1.-exp(-dt*${mineral ? '(4.+release*8.)' : '5.'});c=mix(c,neighbors.xyz,diffusion);freshness=mix(freshness,neighbors.w,diffusion)*exp(-dt*10.);c.xy*=exp(-dt*${mineral ? '(1.2+release*1.2)' : '2.3'});c.z*=exp(-dt*${mineral ? '(.5+release*.45)' : '2.8'});
        vec2 p=vUv*vec2(aspect,1.),a=from*vec2(aspect,1.),b=to*vec2(aspect,1.),ab=b-a;
        float h=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),0.,1.);vec2 outward=p-a-ab*h;float d=length(outward);vec2 strokeVelocity=${mineral ? 'mix(previousVelocity,velocity,h)' : 'velocity'};
        float speed=length(strokeVelocity);float drive=speed/(speed+.65);
        float radius=.0045+.0085*drive;
        float ink=exp(-d*d/${mineral ? '(radius*radius)' : '.00045'})*inject;
        ${mineral ? `
        // A lateral displacement opens the wake instead of leaving a thin smoke filament.
        vec2 slope=vec2(texture2D(previous,q+vec2(texel.x,0)).z-texture2D(previous,q-vec2(texel.x,0)).z,
                        texture2D(previous,q+vec2(0,texel.y)).z-texture2D(previous,q-vec2(0,texel.y)).z);
        c.xy-=slope*dt*1.8;
        // Expansion follows the continuous field gradient, never each segment cap.
        ` : ''}
        c.xy=clamp(${mineral ? 'mix(c.xy,strokeVelocity*(.18+.2*drive),ink*.45)' : 'c.xy+velocity*ink*.45'},vec2(-.65),vec2(.65));
        float deposit=ink*min(speed*.55,.38);
        // Speed-dependent coverage is interpolated along each stroke to avoid cap seams.
        float added=${mineral ? 'max(0.,ink*(.12+.53*drive)*smoothstep(0.,.045,speed)-c.z)' : 'deposit'};
        float total=c.z+added;
        freshness=(freshness+added)*min(1.,.65/max(total,.00001));
        c.z=min(total,.65);gl_FragColor=vec4(c,${mineral ? 'freshness' : '1.'});
      }`});
    this.display=new T.ShaderMaterial({vertexShader,transparent:true,depthTest:false,depthWrite:false,uniforms:{field:{value:this.a.texture},release:{value:0},texel:{value:new T.Vector2(1/width,1/height)},base:{value:new T.Color(color)},diagnostic:{value:0},aspect:{value:innerWidth/innerHeight}},fragmentShader:mineral ? `
      uniform sampler2D field;uniform vec2 texel;varying vec2 vUv;
      void main(){
        vec4 local=texture2D(field,vUv);float ink=local.z;
        float release=clamp(1.-local.w/max(ink,.00001),0.,1.);
        vec2 slope=vec2(texture2D(field,vUv+vec2(texel.x,0)).z-texture2D(field,vUv-vec2(texel.x,0)).z,
                        texture2D(field,vUv+vec2(0,texel.y)).z-texture2D(field,vUv-vec2(0,texel.y)).z);
        float edge=pow(1.-exp(-length(slope)*22.),2.5);
        float presence=1.-exp(-ink*22.);
        vec2 direction=slope/max(length(slope),.00001);
        float facing=dot(direction,normalize(vec2(-.6,.8)));
        vec3 cyan=vec3(.16,.68,.86),violet=vec3(.55,.35,.79),copper=vec3(.94,.57,.36);
        float momentum=length(local.xy);
        float energy=1.-exp(-momentum*5.5);
        float tint=clamp(.16+.63*energy+.20*facing+.12*sin((local.x+local.y)*8.),0.,1.);
        vec3 color=mix(cyan,violet,smoothstep(.12,.55,tint));
        color=mix(color,copper,smoothstep(.55,.95,tint));
        color=mix(color,vec3(.98,.79,.64),energy*energy*.25);
        float alpha=clamp(edge*presence*(.55+energy*.65),0.,.76);
        gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }` : `
      uniform sampler2D field;uniform vec3 base;uniform int diagnostic;uniform float aspect;varying vec2 vUv;
      void main(){vec3 f=texture2D(field,vUv).xyz;if(diagnostic==1){gl_FragColor=vec4(.5+f.xy, f.z,1.);return;}
        vec2 uv=vUv+f.xy*.15;float grain=sin(uv.x*aspect*14.+sin(uv.y*17.))*sin(uv.y*13.+uv.x*9.);
        vec3 color=base*(1.+.025*grain)+vec3(f.z*.075);gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`});
    this.quad=new FullScreenQuad(this.simulation);this.clear();
    if(this.available){renderer.setRenderTarget(this.a);this.available=renderer.getContext().checkFramebufferStatus(renderer.getContext().FRAMEBUFFER)===renderer.getContext().FRAMEBUFFER_COMPLETE;renderer.setRenderTarget(null);}
  }
  clear(){for(const t of [this.a,this.b]){this.renderer.setRenderTarget(t);this.renderer.setClearColor(0,0);this.renderer.clear();}this.renderer.setRenderTarget(null);this.remaining=0;}
  step(dt:number,from:T.Vector2,to:T.Vector2,velocity:T.Vector2,inject:boolean){if(!this.available)return false;if(inject)this.remaining=this.mineral?6.5:2.8;if(this.remaining<=0)return false;this.remaining-=dt;
    const u=this.simulation.uniforms;u.previous!.value=this.a.texture;u.dt!.value=Math.min(dt,this.mineral?1/20:1/30);u.from!.value.copy(from);u.to!.value.copy(to);u.previousVelocity!.value.copy(u.velocity!.value);u.velocity!.value.copy(velocity);u.inject!.value=inject?1:0;u.aspect!.value=innerWidth/innerHeight;
    this.quad.material=this.simulation;this.renderer.setRenderTarget(this.b);this.quad.render(this.renderer);this.renderer.setRenderTarget(null);[this.a,this.b]=[this.b,this.a];this.steps++;if(this.remaining<=0)this.clear();return this.remaining>0;}
  draw(debug:boolean){this.display.uniforms.field!.value=this.a.texture;this.display.uniforms.texel!.value.set(1/this.width,1/this.height);this.display.uniforms.diagnostic!.value=debug?1:0;this.display.uniforms.aspect!.value=innerWidth/innerHeight;this.quad.material=this.display;this.quad.render(this.renderer);}
  inspect(){if(!this.available)return {energy:0,velocity:0};const pixels=new Uint16Array(this.width*this.height*4);this.renderer.readRenderTargetPixels(this.a,0,0,this.width,this.height,pixels);let energy=0,velocity=0,dispersedEnergy=0,freshEnergy=0;for(let i=0;i<pixels.length;i+=4){const density=T.DataUtils.fromHalfFloat(pixels[i+2]!);energy+=density;const freshness=T.DataUtils.fromHalfFloat(pixels[i+3]!);if(freshness<density*.5)dispersedEnergy+=density;else freshEnergy+=density;velocity+=Math.hypot(T.DataUtils.fromHalfFloat(pixels[i]!),T.DataUtils.fromHalfFloat(pixels[i+1]!));}return {energy,velocity,dispersedEnergy,freshEnergy};}
  dispose(){this.a.dispose();this.b.dispose();this.simulation.dispose();this.display.dispose();this.quad.dispose();}
}







