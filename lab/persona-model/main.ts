/**
 * Persona model, step 1: a human figure first.
 *
 * The starting point is a ready-made anime base model (pixiv's VRoid sample "VRM1_Constraint_Twist_Sample",
 * VRM Public License 1.0: modification and redistribution allowed, commercial use allowed, no credit
 * required), so the figure is a person from every angle before it looks like her. From here she is
 * shaped step by step against the reference sheet (proportions, hair and hat, clothes, face), and every
 * step is checked from eight angles (scripts in this folder), never from one view only.
 *
 * Here: toon shading in the site's colours (shade leaning to navy, a red rim, navy outlines), an A pose
 * instead of the T pose, breathing, blinking, eyes and a little of the head following the pointer, hair
 * and skirt springs, drag to turn around her. `?shot` hides the HUD and exposes `window.__model` for the
 * headless turntable (turntable.mjs).
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRMLoaderPlugin, VRMUtils, MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {shape} from './shape';
import {clothes} from './clothes';
import {headwear, type Headwear} from './headwear';

const NAVY=new THREE.Color('#083366'),RED=new THREE.Color('#EF3025');
const params=new URLSearchParams(location.search),shot=params.has('shot');
if(shot)document.body.classList.add('shot');
const status=document.getElementById('status')!;

const canvas=document.getElementById('stage') as HTMLCanvasElement;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:shot});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(28,1,.05,50);
camera.position.set(0,1.0,4.6);
const ortho=new THREE.OrthographicCamera(-1,1,1,-1,.05,50);
let active:THREE.Camera=camera;
const controls=new OrbitControls(camera,canvas);
controls.target.set(0,.86,0);controls.enablePan=false;controls.enableDamping=true;
controls.minDistance=1.2;controls.maxDistance=7;controls.minPolarAngle=.35;controls.maxPolarAngle=1.85;
controls.update();

const light=new THREE.DirectionalLight(0xffffff,Math.PI);light.position.set(-1.2,1.6,1.8);scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff,.35));

// Where she looks: a point in front of her, moved by the pointer.
const gaze=new THREE.Object3D();gaze.position.set(0,1.35,2);scene.add(gaze);
const pointer=new THREE.Vector2(0,0);let pointerOn=false;
addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1));pointerOn=true;});
document.addEventListener('pointerleave',()=>{pointerOn=false;});

function size(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const half=.95,a=w/h;ortho.left=-half*a;ortho.right=half*a;ortho.top=half;ortho.bottom=-half;ortho.updateProjectionMatrix();
}
size();addEventListener('resize',size);

// The site's toon colours, applied over the model's own (and back, with the TEISU button).
type Saved={shade:THREE.Color,rim:THREE.Color,rimPower:number,rimLift:number,rimMix:number,outline:THREE.Color};
const saved=new Map<MToonMaterial,Saved>();
function teisu(vrm:VRM,on:boolean){
  vrm.scene.traverse(obj=>{
    const mesh=obj as THREE.Mesh;if(!mesh.isMesh)return;
    for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      if(!(m instanceof MToonMaterial))continue;
      if(!saved.has(m))saved.set(m,{shade:m.shadeColorFactor.clone(),rim:m.parametricRimColorFactor.clone(),rimPower:m.parametricRimFresnelPowerFactor,rimLift:m.parametricRimLiftFactor,rimMix:m.rimLightingMixFactor,outline:m.outlineColorFactor.clone()});
      const s=saved.get(m)!;
      if(on){
        // shadows lean to navy but keep a little of the material's own hue
        m.shadeColorFactor.copy(s.shade).lerp(NAVY,.42);
        // a thin red rim, lit side only (rimLightingMix 1): a wide one reads as a glow on dark cloth
        m.parametricRimColorFactor.copy(RED).multiplyScalar(.35*(m.userData.rim??1));m.parametricRimFresnelPowerFactor=m.userData.rimPower??6; // a material may tone it down (the hair: headwear.ts)
        m.parametricRimLiftFactor=0;m.rimLightingMixFactor=1;
        m.outlineColorFactor.set(m.userData.outline??NAVY); // a garment may keep its own (clothes.ts)
      }else{
        m.shadeColorFactor.copy(s.shade);m.parametricRimColorFactor.copy(s.rim);m.parametricRimFresnelPowerFactor=s.rimPower;m.parametricRimLiftFactor=s.rimLift;m.rimLightingMixFactor=s.rimMix;m.outlineColorFactor.copy(s.outline);
      }
    }
  });
}

// A pose: arms down from the T pose, elbows a little bent.
function pose(vrm:VRM){
  const b=(name:Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0])=>vrm.humanoid.getNormalizedBoneNode(name);
  b('leftUpperArm')!.rotation.z=-1.18;b('rightUpperArm')!.rotation.z=1.18;
  b('leftLowerArm')!.rotation.y=.18;b('rightLowerArm')!.rotation.y=-.18;
  b('leftHand')!.rotation.z=-.12;b('rightHand')!.rotation.z=.12;
}

let vrm:VRM|null=null,spin=false,yawGoal:number|null=null,wear:Headwear|null=null;
const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
const bytes=Uint8Array.from(atob((window as unknown as {__baseVrm:string}).__baseVrm),c=>c.charCodeAt(0));
loader.parse(bytes.buffer,'./',gltf=>{
  vrm=gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);VRMUtils.combineSkeletons(gltf.scene);
  vrm.scene.traverse(o=>{o.frustumCulled=false;});
  scene.add(vrm.scene);shape(vrm);clothes(vrm);
  let hairMat:MToonMaterial|null=null;vrm.scene.traverse(o=>{const m=(o as THREE.Mesh).material;for(const x of Array.isArray(m)?m:[m])if(x instanceof MToonMaterial&&x.name.startsWith('Hair_')&&!hairMat)hairMat=x;});
  wear=headwear(vrm,hairMat!);pose(vrm);teisu(vrm,true);
  if(vrm.lookAt)vrm.lookAt.target=gaze;
  status.textContent='';ready=true;
},err=>{status.textContent='failed to load the model';console.error(err);});
let ready=false;

// HUD
const azimuth=(deg:number)=>{const r=controls.getDistance(),t=controls.target,a=THREE.MathUtils.degToRad(deg);camera.position.set(t.x+Math.sin(a)*r,camera.position.y,t.z+Math.cos(a)*r);controls.update();};
document.querySelector('.hud')!.addEventListener('click',e=>{
  const btn=(e.target as Element).closest('button');if(!btn||!vrm)return;
  const act=btn.dataset.act;
  if(act==='spin'){spin=!spin;btn.setAttribute('aria-pressed',String(spin));}
  else if(act==='hat'){const on=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(on));wear?.setHat(on);}
  else if(act==='toon'){const on=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(on));teisu(vrm,on);}
  else{spin=false;document.querySelector('[data-act=spin]')!.setAttribute('aria-pressed','false');yawGoal=act==='front'?0:act==='side'?90:180;}
});

// Idle life: breathing, a slow sway, blinking, the head turning a little towards the pointer.
let last=performance.now(),elapsed=0,nextBlink=1.5,blinkAt=-1,headYaw=0,headPitch=0,still=false;
function frame(){
  const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;const t=elapsed;
  if(vrm){
    const b=(name:Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0])=>vrm!.humanoid.getNormalizedBoneNode(name)!;
    if(!still){
      b('chest').rotation.x=Math.sin(t*1.6)*.018;b('spine').rotation.z=Math.sin(t*.55)*.012;b('hips').rotation.z=Math.sin(t*.55)*-.01;
      if(t>nextBlink){blinkAt=t;nextBlink=t+2.4+Math.random()*3.5;}
      const k=blinkAt<0?1:(t-blinkAt)/.16;vrm.expressionManager?.setValue('blink',k<1?Math.sin(k*Math.PI):0);
    }
    // the gaze target sits in front of her, where the pointer is
    const tx=pointerOn&&!still?pointer.x:0,ty=pointerOn&&!still?pointer.y:0;
    gaze.position.lerp(new THREE.Vector3(tx*1.4,1.35+ty*.7,2),1-Math.exp(-dt*8));
    headYaw+=((pointerOn&&!still?tx*.35:0)-headYaw)*(1-Math.exp(-dt*4));headPitch+=((pointerOn&&!still?-ty*.18:0)-headPitch)*(1-Math.exp(-dt*4));
    b('neck').rotation.y=headYaw*.6;b('neck').rotation.x=headPitch*.6;
    vrm.update(dt);
  }
  if(spin){controls.autoRotate=true;controls.autoRotateSpeed=2.2;}else controls.autoRotate=false;
  if(yawGoal!==null){
    const cur=THREE.MathUtils.radToDeg(Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z));
    let d=((yawGoal-cur+540)%360)-180;if(Math.abs(d)<.3){d=0;yawGoal=null;}azimuth(cur+d*Math.min(1,dt*7));
  }
  controls.update();
  renderer.render(scene,active);
  if(!shot)requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Headless turntable: pose still, eyes ahead, the camera at a given angle (orthographic for the 3 views).
if(shot)Object.assign(window,{__three:THREE,__camera:()=>active,__model:{
  get ready(){return ready;},
  get vrm(){return vrm;},
  setHat(on:boolean){wear?.setHat(on);},
  view(deg:number,orthographic=false,dist=4.6,eyeY=1.0,targetY=.86){
    still=true;pointerOn=false;
    if(vrm){
      vrm.expressionManager?.setValue('blink',0);
      for(const n of ['chest','spine','hips','neck'] as const){const node=vrm.humanoid.getNormalizedBoneNode(n)!;node.rotation.x=0;node.rotation.z=0;if(n==='neck')node.rotation.y=0;}
      gaze.position.set(0,1.35,2);
    }
    const a=THREE.MathUtils.degToRad(deg),c=orthographic?ortho:camera,r=orthographic?10:dist,y=orthographic?.8:eyeY;
    c.position.set(Math.sin(a)*r,y,Math.cos(a)*r);c.lookAt(0,orthographic?.8:targetY,0);
    if(!orthographic){controls.target.set(0,targetY,0);}
    active=c;
    // settle springs and the look-at, then draw
    for(let i=0;i<90;i++)vrm?.update(1/60);
    renderer.render(scene,active);
  },
  /** Landmark heights in metres (bones; the chin from the face mesh at rest), for measuring proportions. */
  landmarks(){
    if(!vrm)return null;vrm.scene.updateMatrixWorld(true);
    const at=(n:Parameters<VRM['humanoid']['getRawBoneNode']>[0])=>{const node=vrm!.humanoid.getRawBoneNode(n);return node?node.getWorldPosition(new THREE.Vector3()).toArray().map(v=>+v.toFixed(4)):null;};
    let chin=Infinity,top=-Infinity;
    vrm.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const p=m.geometry.attributes.position!,v=new THREE.Vector3();
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
        if(/face/i.test(m.name)&&Math.abs(v.x)<.02&&v.z>0&&v.y>1.2)chin=Math.min(chin,v.y);
        if(/hair|face|head/i.test(m.name))top=Math.max(top,v.y);}});
    const names=['head','neck','leftEye','leftShoulder','leftUpperArm','leftLowerArm','leftHand','leftMiddleDistal','hips','spine','chest','upperChest','leftUpperLeg','leftLowerLeg','leftFoot','leftToes'] as const;
    return {chin:+chin.toFixed(4),top:+top.toFixed(4),meshes:vrm.scene.children.length,...Object.fromEntries(names.map(n=>[n,at(n)]))};
  },
  /** The model's height (head top to soles) in metres, for the 3-view overlay. */
  bounds(){if(!vrm)return null;const box=new THREE.Box3().setFromObject(vrm.scene);return {min:box.min.toArray(),max:box.max.toArray()};},
}});
