import {fluidOptics} from './MineralFluid';
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export class PostPipeline {
  target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
  composer:EffectComposer;source:ShaderPass;output=new OutputPass();fxaa=new ShaderPass(FXAAShader);
  blitMaterial=new T.ShaderMaterial({uniforms:{image:{value:null},lightGain:{value:1},bendGain:{value:1},fluidVelocity:{value:null},fluidDensity:{value:null},refractionStrength:{value:1},fluidFade:{value:0},velocityTexel:{value:new T.Vector2(1,1)},fluidTexel:{value:new T.Vector2(1,1)},fluidRect:{value:new T.Vector4(0,0,1,1)}},vertexShader,fragmentShader:`uniform sampler2D image;uniform vec4 fluidRect;uniform float refractionStrength;varying vec2 vUv;
 ${fluidOptics}
 void main(){if(fluidFade<=0.){gl_FragColor=texture2D(image,vUv);return;}
 float a;vec2 bend;vec3 light=fluidLight(fluidRect.xy+vUv*fluidRect.zw,a,bend);
 vec2 rim=smoothstep(vec2(0.),vec2(.09),vUv)*smoothstep(vec2(0.),vec2(.09),1.-vUv);
 vec2 offset=bend/fluidRect.zw*rim.x*rim.y*refractionStrength;
 vec2 uv=clamp(vUv+offset,vec2(.001),vec2(.999));vec4 c=texture2D(image,uv);
 c.r=texture2D(image,clamp(uv+offset*.09,vec2(.001),vec2(.999))).r;
 c.b=texture2D(image,clamp(uv-offset*.09,vec2(.001),vec2(.999))).b;
 c.rgb=mix(c.rgb,light,a*.12*rim.x*rim.y);gl_FragColor=c;}`,depthTest:false,depthWrite:false,transparent:true});
  blit=new FullScreenQuad(this.blitMaterial);
  constructor(public renderer:T.WebGLRenderer,base:string){
    this.target.samples=4;
    this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    this.composer=new EffectComposer(renderer,new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}));this.composer.renderToScreen=false;this.composer.setPixelRatio(1);
    this.source=new ShaderPass({uniforms:{colorTex:{value:null},depthTex:{value:null},near:{value:.1},far:{value:30},diagnostic:{value:0},cleanGallery:{value:0},blur:{value:0},flash:{value:0},edgeBlur:{value:0},base:{value:new T.Color(base)},texel:{value:new T.Vector2(1,1)}},vertexShader,fragmentShader:`
      uniform sampler2D colorTex,depthTex;uniform float near,far,blur,flash,edgeBlur;uniform vec3 base;uniform vec2 texel;uniform int diagnostic,cleanGallery;varying vec2 vUv;
      // Continuous edge stretch of the fully composited scene, including cables.
      // The center is unchanged; only the outer band is pulled to the aperture.
      vec2 lensUV(vec2 uv){
        if(cleanGallery==1)return uv; vec2 p=uv*2.-1.;
        return uv-sign(p)*.045*smoothstep(vec2(.60),vec2(1.),abs(p));
      }
      vec4 photo(vec2 uv){
        vec4 c=texture2D(colorTex,lensUV(clamp(uv,vec2(0.),vec2(1.))));

        return c;
      }
      void main(){float rim=smoothstep(.58,1.,max(abs(vUv.x-.5),abs(vUv.y-.5))*2.);if(cleanGallery==1)rim=0.;float radius=blur+edgeBlur*rim;vec4 color=photo(vUv);if(radius>0.){vec4 sum=color;float weight=1.;for(int i=0;i<12;i++){float angle=float(i)*6.2831853/12.;vec2 offset=vec2(cos(angle),sin(angle))*texel*radius;sum+=photo(vUv+offset);weight+=1.;}color=sum/weight;}color.rgb*=1.+flash;
        // Stationary near rim surrounds the smaller, deeper photographic scene.
        float outer=smoothstep(.90,1.,max(abs(vUv.x-.5),abs(vUv.y-.5))*2.);
        vec3 wall=base;
        color.rgb=mix(wall,color.rgb,color.a)*(1.-rim*.035);color.a=1.;if(diagnostic==1){float d=texture2D(depthTex,lensUV(vUv)).r;float z=near*far/(far-d*(far-near));color.rgb=vec3(clamp((8.-z)/4.,0.,1.));}gl_FragColor=color;}
    `});
    this.source.uniforms.colorTex!.value=this.target.texture;
    this.source.uniforms.depthTex!.value=this.target.depthTexture;
    this.composer.addPass(this.source);this.composer.addPass(this.output);this.composer.addPass(this.fxaa);
  }
  resize(width:number,height:number){this.source.uniforms.texel!.value.set(1/width,1/height);this.target.setSize(width,height);this.composer.setSize(width,height);this.fxaa.uniforms.resolution!.value.set(1/width,1/height);}
  render(scene:T.Scene,camera:T.PerspectiveCamera){const r=this.renderer;r.setScissorTest(false);r.setRenderTarget(this.target);r.setClearColor(0,0);r.clear();r.render(scene,camera);r.setRenderTarget(null);this.composer.render();this.blitMaterial.uniforms.image!.value=this.composer.readBuffer.texture;}
  draw(){this.blit.render(this.renderer);}
  dispose(){this.target.depthTexture?.dispose();this.target.dispose();this.source.dispose();this.output.dispose();this.fxaa.dispose();this.composer.dispose();this.blit.dispose();this.blitMaterial.dispose();}
}

