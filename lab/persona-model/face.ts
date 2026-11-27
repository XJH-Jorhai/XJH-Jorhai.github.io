/**
 * Her face, from the head turnaround (inputs/source/persona/model/head-turnaround.webp): measured changes to
 * the base model's face, which keep its expressions (every change below is applied to the morph targets'
 * deltas too, so blinking and the mouth shapes still close properly).
 *
 *   jaw     (off) widening the lower face towards the sheet's rounder cheeks squared the jaw off; left as it is.
 *   eyes    the sheet's eyes are a little larger: iris, white, lash line and highlight scaled about each eye.
 *   skin    warmer (peach, as on the sheet, not a cool white); brows lighter and finer.
 */
import * as THREE from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';

export const FACE = {
  /** Half-width of the face (front half) wanted at these heights (m); between them, interpolated. */
  // gently: a stronger widening squared the jaw off and opened a step where it meets the neck
  jaw: [[1.42,.076],[1.40,.071],[1.39,.0675],[1.38,.0595],[1.37,.0475],[1.36,.031],[1.352,.01]] as [number,number][],
  /** Eye size, as a factor about each eye's centre (across and up; depth kept, so it stays on the face). */
  eyes: 1.1,
  /** Off: widening the lower face squared the jaw off with a step at the neck (tried 2026-11-27); the base
   *  model's chin is already close to the sheet's, which is also pointed. */
  reshapeJaw: false,
  skin: '#FFF1E7', brow: '#C9A178', iris: '#A97C55', smile: 0, // the iris warm but not orange; no smile: the base model's 'happy' opens the mouth even at 7%
};

const lerpTable=(t:[number,number][],y:number)=>{
  if(y>=t[0]![0])return t[0]![1];
  for(let i=1;i<t.length;i++){const [y1,v1]=t[i]!,[y0,v0]=t[i-1]!;if(y>=y1)return v1+(v0-v1)*(y-y1)/(y0-y1);}
  return t[t.length-1]![1];
};

/** Moves every vertex (and every morph target's delta the same way, by the map's Jacobian approximated as the map itself
 *  applied to the displaced point) by `map`. */
function reshape(mesh:THREE.Mesh,map:(p:THREE.Vector3)=>THREE.Vector3){
  const g=mesh.geometry,pos=g.attributes.position as THREE.BufferAttribute,morphs=(g.morphAttributes.position??[]) as THREE.BufferAttribute[],rel=g.morphTargetsRelative;
  const p=new THREE.Vector3(),q=new THREE.Vector3(),d=new THREE.Vector3(),moved:THREE.Vector3[]=[];
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);moved.push(map(p.clone()));}
  for(const m of morphs)for(let i=0;i<m.count;i++){
    p.fromBufferAttribute(pos,i);d.fromBufferAttribute(m,i);
    if(rel){q.copy(p).add(d);const t=map(q).sub(moved[i]!);m.setXYZ(i,t.x,t.y,t.z);}
    else{const t=map(d.clone());m.setXYZ(i,t.x,t.y,t.z);}
    m.needsUpdate=true;
  }
  moved.forEach((v,i)=>pos.setXYZ(i,v.x,v.y,v.z));pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
}

/** Recolours a material's texture: each pixel's lightness kept (stretched to the colour's), its hue and
 *  saturation taken from `color`, by `amount`; alpha kept. */
function tint(mat:MToonMaterial,color:THREE.Color,amount:number){
  const img=mat.map?.image as (ImageBitmap|HTMLImageElement|undefined);if(!img||!mat.map)return;
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height),p=d.data,lc=.3*color.r+.59*color.g+.11*color.b;
  for(let i=0;i<p.length;i+=4){
    const l=(.3*p[i]!+.59*p[i+1]!+.11*p[i+2]!)/255,k=l/Math.max(.05,lc)*.95;
    for(let j=0;j<3;j++){const target=Math.min(255,[color.r,color.g,color.b][j]!*255*Math.min(1.6,k));p[i+j]=p[i+j]!*(1-amount)+target*amount;}
  }
  x.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=mat.map.colorSpace;t.flipY=mat.map.flipY;t.wrapS=mat.map.wrapS;t.wrapT=mat.map.wrapT;
  mat.map=t;mat.shadeMultiplyTexture=t;mat.color.set('#ffffff');mat.needsUpdate=true;
}

export function face(vrm:VRM,s=FACE){
  const meshes:THREE.Mesh[]=[];vrm.scene.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes.push(o as THREE.Mesh);});
  const byMat=(re:RegExp)=>meshes.filter(m=>re.test((Array.isArray(m.material)?m.material[0]:m.material)?.name??''));
  const smooth=(a:number,b:number,x:number)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};

  // jaw: widen the front of the lower face towards the table
  const skin=byMat(/^Face_00_SKIN/)[0];
  if(skin&&s.reshapeJaw){
    const pos=skin.geometry.attributes.position as THREE.BufferAttribute,now=new Map<number,number>();
    for(let i=0;i<pos.count;i++){if(pos.getZ(i)<0)continue;const k=Math.round(pos.getY(i)*200);now.set(k,Math.max(now.get(k)??0,Math.abs(pos.getX(i))));}
    const current=(y:number)=>{const k=Math.round(y*200);return Math.max(.005,now.get(k)??now.get(k+1)??now.get(k-1)??.05);};
    reshape(skin,p=>{if(p.y>1.425)return p;const f=Math.max(1,lerpTable(s.jaw,p.y)/current(p.y));const w=smooth(-.01,.03,p.z)*smooth(1.425,1.405,p.y); /* the front of the face only: the underside meets the neck */p.x*=1+(f-1)*w;return p;});
  }
  // eyes: larger about each eye's centre
  const eyeParts=byMat(/^(EyeIris|EyeWhite|FaceEyeline|EyeHighlight)_/);
  const white=byMat(/^EyeWhite_/)[0];
  if(white){
    const pos=white.geometry.attributes.position as THREE.BufferAttribute,c=[new THREE.Vector3(),new THREE.Vector3()],n=[0,0];
    for(let i=0;i<pos.count;i++){const k=pos.getX(i)>0?0:1;c[k]!.add(new THREE.Vector3().fromBufferAttribute(pos,i));n[k]!++;}
    c.forEach((v,k)=>v.divideScalar(n[k]||1));
    for(const m of eyeParts)reshape(m,p=>{const e=c[p.x>0?0:1]!;p.x=e.x+(p.x-e.x)*s.eyes;p.y=e.y+(p.y-e.y)*s.eyes;return p;});
  }
  // skin; the brows and the irises recoloured in their own textures (their shape and shading kept: a colour
  // factor alone only darkens a dark texture)
  for(const m of meshes)for(const mat of Array.isArray(m.material)?m.material:[m.material]){
    if(!(mat instanceof MToonMaterial))continue;
    if(/^(Face|Body)_00_SKIN/.test(mat.name))mat.color.set(s.skin);
    if(/^FaceBrow/.test(mat.name))tint(mat,new THREE.Color(s.brow),.95);
    if(/^EyeIris/.test(mat.name))tint(mat,new THREE.Color(s.iris),.5);
  }
  // a soft smile, as on the sheet (the base model's 'happy', a little: more closes the eyes into arcs)
  vrm.expressionManager?.setValue('happy',s.smile);
}
