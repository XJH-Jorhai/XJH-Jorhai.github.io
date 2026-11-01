import * as T from 'three';
import {PistonImpact} from './pistonImpact';

interface OriginalConfig {period:number;stroke:number;[key:string]:unknown}
interface OriginalFrame {q:number;ext:Record<string,number>}
interface OriginalPart {id:string;x:number;y:number;z:number;w:number;h:number;d:number;material:string}
interface OriginalModule {
  normalizeConfig(config:OriginalConfig):OriginalConfig;
  frameState(config:OriginalConfig,phase:number,layout:{bases:object}):OriginalFrame;
  minecraftParts(frame:OriginalFrame):OriginalPart[];
}
type Point=[number,number,number];
type Strike=(x:number,y:number,force:number)=>void;
const root='/vendor/piston-letter-studio/';
const textures={iron:'iron_block',pumpkinFront:'carved_pumpkin',pumpkinSide:'pumpkin_side',pumpkinTop:'pumpkin_top',pistonTop:'piston_top',pistonSide:'piston_side',pistonBottom:'piston_bottom',pistonInner:'piston_inner'};
// Exactly the original 768px isometric projection; Z is retained for depth testing.
const project=([x,y,z]:Point):Point=>[390+130*x-70*z,475+28*x-145*y+58*z,x*70/130+y*(28*70/130+58)/145+z];

/** Original motion, cuboids, pixel textures and occlusion, drawn in the blog's one context. */
export async function createPistonGolem(renderer:T.WebGLRenderer,wake:()=>void,strike:Strike) {
  const element=document.querySelector<HTMLElement>('[data-piston-golem]');
  if(!element)return;
  const stage=element.querySelector<HTMLElement>('[data-piston-stage]')!;
  const button=element.querySelector<HTMLButtonElement>('[data-piston-toggle]')!;
  const source=new URL(root+'src/piston-letters.js',location.href).href,defaults=new URL(root+'src/default-config.js',location.href).href;
  const [original,preset,images]=await Promise.all([
    import(/* @vite-ignore */ source) as Promise<OriginalModule>,
    import(/* @vite-ignore */ defaults) as Promise<{DEFAULT_CONFIG:OriginalConfig}>,
    Promise.all(Object.entries(textures).map(async([name,file])=>[name,await new T.ImageLoader().loadAsync(root+'assets/minecraft/'+file+'.png')] as const)),
  ]);
  const config=original.normalizeConfig(preset.DEFAULT_CONFIG);
  const materials=new Map<string,T.MeshBasicMaterial>(),tiles=new Map<string,T.CanvasTexture>();
  const meshByFace=new Map<string,T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>>();
  const imageByName=Object.fromEntries(images);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(0,768,768,0,-12,12);
  const impact=new PistonImpact();
  let bounds=stage.getBoundingClientRect(),phase=0,paused=false,lastForce=0,lastPoint=[0,0],draws=0,renderedPhase=-1;
  function tile(name:string,shade:number,rotation=0,crop=[0,0,16,16]) {
    const key=JSON.stringify([name,shade,rotation,crop]);
    if(materials.has(key))return materials.get(key)!;
    const [sx,sy,sw,sh]=crop as [number,number,number,number],turned=Math.abs(rotation)%180===90;
    const canvas=document.createElement('canvas');canvas.width=turned?sh:sw;canvas.height=turned?sw:sh;
    const context=canvas.getContext('2d')!;
    context.translate(canvas.width/2,canvas.height/2);context.rotate(rotation*Math.PI/180);
    context.drawImage(imageByName[name]!,sx,sy,sw,sh,-sw/2,-sh/2,sw,sh);
    context.setTransform(1,0,0,1,0,0);context.fillStyle='rgba(0,0,0,'+shade+')';context.fillRect(0,0,canvas.width,canvas.height);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;
    texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;
    const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
    tiles.set(key,texture);materials.set(key,material);return material;
  }
  function material(kind:string,face:string) {
    const shade=face==='top'?0:face==='front'?.12:.28;
    if(kind==='iron')return tile('iron',shade);
    if(kind==='pumpkin')return tile(face==='front'?'pumpkinFront':face==='top'?'pumpkinTop':'pumpkinSide',shade);
    if(kind==='rod')return tile('pistonTop',shade,face==='right'?-90:180,[6,6,4,4]);
    if(face==='front')return tile(kind==='head'?'pistonTop':'pistonInner',shade);
    return tile('pistonSide',shade,face==='right'?-90:180,kind==='head'?[0,0,16,4]:[0,4,16,12]);
  }
  function face(part:OriginalPart,name:string,a:Point,b:Point,c:Point) {
    const id=part.id+'-'+name;
    let mesh=meshByFace.get(id);
    if(!mesh){
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(18),3));
      geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,0,1,1,0,1,1],2));
      mesh=new T.Mesh(geometry,material(part.material,name));mesh.frustumCulled=false;scene.add(mesh);meshByFace.set(id,mesh);
    }
    mesh.visible=true;
    const d:Point=[b[0]+c[0]-a[0],b[1]+c[1]-a[1],b[2]+c[2]-a[2]];
    const positions=mesh.geometry.getAttribute('position');
    [a,b,c,c,b,d].forEach((point,index)=>{const [x,y,z]=project(point);positions.setXYZ(index,x,768-y,z);});positions.needsUpdate=true;
  }
  function update() {
    for(const mesh of meshByFace.values())mesh.visible=false;
    for(const part of original.minecraftParts(original.frameState(config,phase,{bases:{}}))){
      const {x,y,z,w,h,d}=part;
      face(part,'front',[x,y+h,z+d],[x+w,y+h,z+d],[x,y,z+d]);
      face(part,'right',[x+w,y+h,z+d],[x+w,y+h,z],[x+w,y,z+d]);
      face(part,'top',[x,y+h,z],[x+w,y+h,z],[x,y+h,z+d]);
    }
    renderedPhase=phase;
  }
  function visible(){return bounds.bottom>0&&bounds.top<innerHeight&&bounds.right>0&&bounds.left<innerWidth;}
  function sample() {
    const position=original.frameState(config,phase,{bases:{}}).q;
    if(impact.sample(position)){
      // The lower middle iron face moves forward when the side blocks retract.
      const contact=project([.5,.5,2]);
      lastPoint=[(bounds.left+contact[0]/768*bounds.width)/innerWidth,1-(bounds.top+contact[1]/768*bounds.height)/innerHeight];
      lastForce=impact.force;strike(lastPoint[0]!,lastPoint[1]!,lastForce);
    }
  }
  function setPaused(value:boolean){paused=value;button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'播放动画':'暂停动画';wake();}
  const toggle=()=>setPaused(!paused);button.addEventListener('click',toggle);button.hidden=false;
  return {
    tick(dt:number){if(!visible())return false;if(!paused&&dt>0){phase=(phase+dt/config.period)%1;sample();}return !paused;},
    draw(){
      if(!visible())return;
      if(renderedPhase!==phase)update();
      renderer.setRenderTarget(null);renderer.setViewport(bounds.left,innerHeight-bounds.bottom,bounds.width,bounds.height);
      renderer.setScissor(bounds.left,innerHeight-bounds.bottom,bounds.width,bounds.height);renderer.setScissorTest(true);
      renderer.clearDepth();renderer.render(scene,camera);renderer.setScissorTest(false);stage.dataset.renderer='webgl2';button.hidden=false;draws++;
    },
    resize(){bounds=stage.getBoundingClientRect();},
    pause(){stage.dataset.renderer='static';button.hidden=true;},
    snapshot:()=>({phase,position:impact.position,mappedForce:impact.force,trigger:'retracted',strikes:impact.strikes,lastForce,lastPoint,paused,visible:visible(),draws,period:config.period,stroke:config.stroke}),
    // Only exposed to the explicit ?inspect diagnostics by GalleryScene.
    seek(value:number){if(!Number.isFinite(value))return;phase=((value%1)+1)%1;sample();wake();},
    setPaused,
    dispose(){button.removeEventListener('click',toggle);button.hidden=true;stage.dataset.renderer='static';for(const mesh of meshByFace.values())mesh.geometry.dispose();for(const material of materials.values())material.dispose();for(const texture of tiles.values())texture.dispose();scene.clear();},
  };
}
