/**
 * Her face, from the head turnaround (inputs/source/persona/model/head-turnaround.webp): measured changes to
 * the base model's face, which keep its expressions (every change below is applied to the morph targets'
 * deltas too, so blinking and the mouth shapes still close properly).
 *
 *   jaw     (off) widening the lower face towards the sheet's rounder cheeks squared the jaw off; left as it is.
 *   eyes    the sheet's eyes are a little larger: iris, white, lash line and highlight scaled about each eye.
 *   shape   almond, not round (the user's note, 2026-11-28: the round eyes changed who she is): the base model's own
 *           eye morphs baked in a little — the upper lid lowered and the outer corner drawn out — and the iris larger,
 *           so, as on the sheet, the lid covers its top and the white shows mostly at the corners. Lids, lashes and
 *           skin move together, as they do when she blinks; the blink is shortened by what is already closed.
 *   skin    warmer (peach, as on the sheet, not a cool white); brows lighter and finer.
 *   paint   the user's repaints of the base model's face textures (inputs/source/persona/model/face/, prompts in
 *           inputs/persona-model-prompts.md section 4): a closed gentle smile, warm honey-amber irises, fuller lashes
 *           with a flick at the outer end. Same layout as the originals, so they drop in; absent, the originals stay.
 */
import * as THREE from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';

export const FACE = {
  /** Half-width of the face (front half) wanted at these heights (m); between them, interpolated. */
  // gently: a stronger widening squared the jaw off and opened a step where it meets the neck
  jaw: [[1.42,.076],[1.40,.071],[1.39,.0675],[1.38,.0595],[1.37,.0475],[1.36,.031],[1.352,.01]] as [number,number][],
  /** Eye size, as a factor about each eye's centre (across and up; depth kept, so it stays on the face). */
  eyes: 1.1,
  /** The base model's eye morphs baked in (weights), and the iris (with its highlight) scaled about the eye. Chosen
   *  side by side with the head turnaround from eight mixes (Close alone read sleepy, more Angry stern). */
  eyeShape: {Natural:.3,Close:.15,Angry:.1} as Record<string,number>, irisSize: 1.1,
  /** Off: widening the lower face squared the jaw off with a step at the neck (tried 2026-11-27); the base
   *  model's chin is already close to the sheet's, which is also pointed. */
  reshapeJaw: false,
  /** A colour the repainted iris is multiplied by (its texture kept): the second repaint (2026-11-28) came out a bright gold,
   *  about twice as light as the sheet's warm brown (median 254,185,74 against 134,91,68 on screen). */
  irisMultiply: '#877DEB',
  skin: '#FFF1E7', skinShade: '#F2CDB8', skinNavy: .12, brow: '#C9A178', iris: '#A97C55', smile: 0, // the iris warm but not orange; no smile: the base model's 'happy' opens the mouth even at 7%
};

/** The repainted textures, if the build shipped them (build.mjs → face-textures.js), decoded before the model is built. */
type FaceImages={skin?:HTMLImageElement,iris?:HTMLImageElement,lashes?:HTMLImageElement}|null;
export const faceImages:Promise<FaceImages>=(async()=>{
  const urls=(window as unknown as {__faceTextures?:Record<string,string>|null}).__faceTextures;if(!urls)return null;
  const out:Record<string,HTMLImageElement>={};
  await Promise.all(Object.entries(urls).map(async([k,u])=>{const img=new Image();img.src=u;await img.decode();out[k]=img;}));
  return out as FaceImages;
})();

/** Puts an image in place of a material's texture, keeping how the old one was sampled. */
function repaint(mat:MToonMaterial,img:HTMLImageElement){
  const old=mat.map;if(!old)return;
  const t=new THREE.Texture(img);t.colorSpace=old.colorSpace;t.flipY=old.flipY;t.wrapS=old.wrapS;t.wrapT=old.wrapT;t.needsUpdate=true;
  if(mat.shadeMultiplyTexture===old)mat.shadeMultiplyTexture=t;mat.map=t;mat.needsUpdate=true;
}

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

export function face(vrm:VRM,s=FACE,images:FaceImages=null){
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
  // eye shape: morphs baked into the rest shape (relative morph targets: rest + w × delta)
  for(const m of meshes){
    const dict=m.morphTargetDictionary,g=m.geometry,morphs=g.morphAttributes.position as THREE.BufferAttribute[]|undefined;if(!dict||!morphs||!g.morphTargetsRelative)continue;
    const pos=g.attributes.position as THREE.BufferAttribute;let touched=false;
    for(const [k,w] of Object.entries(s.eyeShape)){const d=morphs[dict['Face_Blendshape.Fcl_EYE_'+k]??-1];if(!d||!w)continue;touched=true;
      for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)+w*d.getX(i),pos.getY(i)+w*d.getY(i),pos.getZ(i)+w*d.getZ(i));}
    // what is already closed comes off the blink, so a full blink still meets the lower lid (and does not pass it)
    const shut=s.eyeShape.Close??0;
    if(shut)for(const k of ['Close','Close_L','Close_R']){const d=morphs[dict['Face_Blendshape.Fcl_EYE_'+k]??-1];if(!d)continue;for(let i=0;i<d.count;i++)d.setXYZ(i,d.getX(i)*(1-shut),d.getY(i)*(1-shut),d.getZ(i)*(1-shut));d.needsUpdate=true;}
    if(touched){pos.needsUpdate=true;g.computeVertexNormals();}
  }
  // eyes: larger about each eye's centre
  const eyeParts=byMat(/^(EyeIris|EyeWhite|FaceEyeline|EyeHighlight)_/);
  const white=byMat(/^EyeWhite_/)[0];
  if(white){
    const pos=white.geometry.attributes.position as THREE.BufferAttribute,c=[new THREE.Vector3(),new THREE.Vector3()],n=[0,0];
    for(let i=0;i<pos.count;i++){const k=pos.getX(i)>0?0:1;c[k]!.add(new THREE.Vector3().fromBufferAttribute(pos,i));n[k]!++;}
    c.forEach((v,k)=>v.divideScalar(n[k]||1));
    for(const m of eyeParts)reshape(m,p=>{const e=c[p.x>0?0:1]!;p.x=e.x+(p.x-e.x)*s.eyes;p.y=e.y+(p.y-e.y)*s.eyes;return p;});
    // the iris (and its highlight) larger still, filling the eye from lid to lid
    for(const m of byMat(/^(EyeIris|EyeHighlight)_/))reshape(m,p=>{const e=c[p.x>0?0:1]!;p.x=e.x+(p.x-e.x)*s.irisSize;p.y=e.y+(p.y-e.y)*s.irisSize;return p;});
  }
  // skin; the brows and the irises recoloured in their own textures (their shape and shading kept: a colour
  // factor alone only darkens a dark texture)
  for(const m of meshes)for(const mat of Array.isArray(m.material)?m.material:[m.material]){
    if(!(mat instanceof MToonMaterial))continue;
    if(/^(Face|Body)_00_SKIN/.test(mat.name)){
      mat.color.set(s.skin);
      // the shade warm and light, and only a little navy (main.ts teisu): on the sheet the face is lit almost flat, a soft
      // peach under the chin; navy, every small crease (under the nose, the corners of the mouth) came out as a mauve spot
      mat.shadeColorFactor.set(s.skinShade);mat.userData.navy=s.skinNavy;
    }
    if(/^FaceBrow/.test(mat.name))tint(mat,new THREE.Color(s.brow),.95);
    if(/^Face_00_SKIN/.test(mat.name)&&images?.skin)repaint(mat,images.skin);
    if(/^FaceEyeline/.test(mat.name)&&images?.lashes)repaint(mat,images.lashes);
    if(/^EyeIris/.test(mat.name)){if(images?.iris){repaint(mat,images.iris);mat.color.set(s.irisMultiply);}else tint(mat,new THREE.Color(s.iris),.5);} // the repaint is already the sheet's colour
  }
  // a soft smile, as on the sheet (the base model's 'happy', a little: more closes the eyes into arcs)
  vrm.expressionManager?.setValue('happy',s.smile);
}
