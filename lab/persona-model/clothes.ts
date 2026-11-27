/**
 * Her clothes, built so they are right from every angle and move with her: each garment is either grown
 * out of a surface of the base model (copied with its skin weights and pushed out along its normals) or
 * built as a real 3D shape around her and skinned to her bones. Nothing is fitted to one picture.
 *
 *   cardigan  the base model's oversized T-shirt, lavender knit, longer, a V opening at the front;
 *             balloon sleeves grown from her arms, gathered into ribbed cuffs at the wrists
 *   shirt     the T-shirt again, a hair smaller, white: it shows in the V
 *   skirt     a pleated cone from the waist to the hem, plaid, skinned to the hips and the thighs
 *   socks     grown from her shins, white and ribbed, up to where the sheet has them
 *   loafers   the base model's shoes, recoloured brown
 *
 * Heights are in the base model's rest pose (metres); the sheet's measurements (in units of the chin's
 * height C, see shape.ts) were converted with C = 1.352 and the shins' 0.875.
 */
import * as THREE from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {bow as ribbonBow} from './headwear';

export const CLOTHES = {
  // grey with a little lavender, as on the no-hat sheet (the palette's coat colour read too purple in 3D)
  coat: '#BFB7C6', coatShade: '#857C92', cuff: '#B0A7B9', coatInside: '#766D84',
  shirt: '#F7F4EE', shirtShade: '#C9C3CF',
  plaidBase: '#6F6A80', plaidLight: '#D9D4E2', plaidPink: '#E9ACA9', plaidDark: '#4A4660',
  sock: '#F5F2EC', sockShade: '#C8C3CC',
  loafer: '#6E4A3A', loaferSole: '#3A2620', strap: '#4E3328',
  /** Sole: below this (m). Saddle strap across the instep at this depth (m, forward). */
  soleTop: .022, strapZ: .055,
  /** Mesh parts with fewer vertices than this are lace loops. */
  laceParts: 24,
  /** The strap runs where the shoe is higher than this (m), i.e. across the top of the instep. */
  strapFrom: .06,
  ribbon: '#E39AA0', ribbonShade: '#B86F7C',
  /** Cardigan hem (sheet: 0.627 C above the soles). */
  hem: .871,
  /** V opening: from the collar down to here (sheet: 0.778 C), and its half-width at the collar. */
  vBottom: 1.06, vTop: 1.3, vWidth: .066,
  /** Skirt: waist and hem heights (hem 0.50 C on the sheet), pleat count and depth. */
  waist: .985, skirtHem: .708, pleats: 30, pleatDepth: .1,
  /** Sock tops above the soles, measured as 0.44 of the knee's height. */
  sockTop: .226,
  /** Where the sleeves meet the cardigan: this far out from the shoulder joint (m). */
  seam: .035,
  /** Ribbing: the hem band's height, the placket's width, the pockets (|x| range, height range) and their ribbed tops (m). */
  ribHem: .03, ribPlacket: .017, pocketX: [.045,.115] as [number,number], pocketY: [.893,.955] as [number,number], ribPocket: .012,
  /** Everything of the T-shirt within this distance of the arm's axis, beyond the seam, is sleeve (m). */
  armhole: .088,
  /** The T-shirt's neckline is cut here (m); the collar covers from here up. */
  neckline: 1.306,
};
const C=CLOTHES;

type Bone=Parameters<VRM['humanoid']['getRawBoneNode']>[0];

/** A canvas texture made by a draw function, repeating. */
function pattern(size:number,draw:(x:CanvasRenderingContext2D,s:number)=>void){
  const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d')!;draw(x,size);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
/** Cable knit: ribs with a twisted cable down the middle (greyscale; the material colour tints it). */
const knit=()=>pattern(128,(x,s)=>{
  x.fillStyle='#fff';x.fillRect(0,0,s,s);
  for(let i=0;i<8;i++){x.fillStyle=i%2?'#e6e6e6':'#f8f8f8';x.fillRect(i*s/8,0,s/16,s);}
  x.strokeStyle='#d2d2d2';x.lineWidth=s/22;
  for(let k=0;k<2;k++){x.beginPath();for(let y=0;y<=s;y+=2){const px=s/2+Math.sin((y/s)*Math.PI*2+k*Math.PI)*s/10;y?x.lineTo(px,y):x.moveTo(px,y);}x.stroke();}
});
const rib=()=>pattern(64,(x,s)=>{x.fillStyle='#fff';x.fillRect(0,0,s,s);for(let i=0;i<8;i++){x.fillStyle='#e4e4e4';x.fillRect(i*s/8,0,s/16,s);}});
const plaid=()=>pattern(256,(x,s)=>{
  x.fillStyle=C.plaidBase;x.fillRect(0,0,s,s);
  const band=(pos:number,w:number,color:string,alpha:number)=>{x.globalAlpha=alpha;x.fillStyle=color;x.fillRect(pos*s,0,w*s,s);x.fillRect(0,pos*s,s,w*s);x.globalAlpha=1;};
  band(.0,.22,C.plaidDark,.55);band(.5,.22,C.plaidDark,.55);
  band(.3,.04,C.plaidLight,.85);band(.8,.04,C.plaidLight,.85);band(.38,.012,C.plaidPink,1);band(.88,.012,C.plaidPink,1);band(.62,.01,C.plaidLight,.7);
});

/** A copy of an MToon material (and its outline twin) with a new colour, shade and texture. */
function dress(base:MToonMaterial,outline:MToonMaterial|undefined,color:string,shade:string,map:THREE.Texture|null){
  const m=base.clone() as MToonMaterial,o=outline?.clone() as MToonMaterial|undefined;
  for(const x of [m,o]){if(!x)continue;x.color.set(color);x.shadeColorFactor.set(shade);x.map=map;x.shadeMultiplyTexture=map;x.side=THREE.DoubleSide;x.needsUpdate=true;}
  if(o)o.side=THREE.BackSide;
  return [m,o].filter(Boolean) as MToonMaterial[];
}

/**
 * Grows a garment out of part of a mesh: the vertices `keep` selects (triangles wholly inside), pushed out
 * along their normals by `thickness`, with new UVs; skin weights copied, so it moves exactly like the body.
 */
function grow(src:THREE.SkinnedMesh,g:THREE.BufferGeometry,keep:(i:number,p:THREE.Vector3)=>boolean,thickness:(i:number,p:THREE.Vector3,n:THREE.Vector3)=>number,uv:(p:THREE.Vector3)=>[number,number],mats:THREE.Material[],
  /** With `snap`, a triangle stays if any of its vertices is kept, and the others are moved onto the edge by it (a clean cut line). */
  snap?:(p:THREE.Vector3)=>void,
  /** Vertices whose triangles go entirely, kept or not. */
  drop?:(i:number,p:THREE.Vector3)=>boolean){
  const pos=g.attributes.position!,nor=g.attributes.normal!,idx=g.index!;
  const p=new THREE.Vector3(),n=new THREE.Vector3(),take=new Int32Array(pos.count).fill(-1),inside=new Uint8Array(pos.count);
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);inside[i]=drop?.(i,p)?2:keep(i,p)?1:0;}
  const count=(g.groups[0]?.count)??idx.count,out:number[]=[],P:number[]=[],N:number[]=[],U:number[]=[],SI:number[]=[],SW:number[]=[];
  const si=g.attributes.skinIndex!,sw=g.attributes.skinWeight!;
  for(let t=0;t<count;t+=3){
    const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];if(tri.some(i=>inside[i]===2))continue;if(snap?!tri.some(i=>inside[i]===1):!tri.every(i=>inside[i]===1))continue;
    for(const i of tri){
      if(take[i]!<0){
        take[i]=P.length/3;p.fromBufferAttribute(pos,i);if(snap&&inside[i]!==1)snap(p);n.fromBufferAttribute(nor,i).normalize();
        const d=thickness(i,p,n);P.push(p.x+n.x*d,p.y+n.y*d,p.z+n.z*d);N.push(n.x,n.y,n.z);U.push(...uv(p));
        for(let k=0;k<4;k++){SI.push(si.getComponent(i,k));SW.push(sw.getComponent(i,k));}
      }
      out.push(take[i]!);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
  geo.setIndex(out);mats.forEach((_,k)=>geo.addGroup(0,out.length,k));
  return attach(src,geo,mats);
}
function attach(src:THREE.SkinnedMesh,geo:THREE.BufferGeometry,mats:THREE.Material[]){
  const mesh=new THREE.SkinnedMesh(geo,mats);mesh.frustumCulled=false;mesh.bind(src.skeleton,src.bindMatrix);src.parent!.add(mesh);return mesh;
}

/** Midpoint subdivision (every triangle into four), skin weights merged, so a cut can follow a smooth line. */
function subdivide(g:THREE.BufferGeometry){
  const idx=g.index!,A=g.attributes,mid=new Map<string,number>();
  const arrays:Record<string,number[]>={};for(const k of Object.keys(A))arrays[k]=Array.from((A[k] as THREE.BufferAttribute).array as ArrayLike<number>);
  const size=(k:string)=>(A[k] as THREE.BufferAttribute).itemSize;let n=(A.position as THREE.BufferAttribute).count;
  const midpoint=(a:number,b:number)=>{
    const key=a<b?`${a}_${b}`:`${b}_${a}`;let m=mid.get(key);if(m!==undefined)return m;m=n++;mid.set(key,m);
    for(const k of Object.keys(arrays)){
      const s=size(k),arr=arrays[k]!;
      if(k==='skinIndex'||k==='skinWeight')continue;
      for(let c=0;c<s;c++)arr.push((arr[a*s+c]!+arr[b*s+c]!)/2);
    }
    // weights: both vertices' bones summed, the four strongest kept
    const w=new Map<number,number>();for(const v of [a,b])for(let c=0;c<4;c++){const bi=arrays.skinIndex![v*4+c]!,bw=arrays.skinWeight![v*4+c]!;if(bw>0)w.set(bi,(w.get(bi)??0)+bw/2);}
    const top=[...w].sort((x,y)=>y[1]-x[1]).slice(0,4),sum=top.reduce((s,[,v])=>s+v,0)||1;
    for(let c=0;c<4;c++){arrays.skinIndex!.push(top[c]?.[0]??0);arrays.skinWeight!.push((top[c]?.[1]??0)/sum);}
    return m;
  };
  const count=(g.groups[0]?.count)??idx.count,out:number[]=[];
  for(let t=0;t<count;t+=3){
    const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
    out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }
  const geo=new THREE.BufferGeometry();
  for(const k of Object.keys(arrays)){
    const s=size(k);geo.setAttribute(k,k==='skinIndex'?new THREE.Uint16BufferAttribute(arrays[k]!,s):new THREE.Float32BufferAttribute(arrays[k]!,s));
  }
  geo.setIndex(out);return geo;
}

/** The pleated skirt: rings from the waist to the hem, knife pleats deepening towards the hem. */
function skirt(body:THREE.SkinnedMesh,vrm:VRM,mats:THREE.Material[]){
  const skel=body.skeleton,bi=(n:Bone)=>skel.bones.indexOf(vrm.humanoid.getRawBoneNode(n) as THREE.Bone);
  const hips=bi('hips'),L=bi('leftUpperLeg'),R=bi('rightUpperLeg');
  const seg=C.pleats*6,rings=14,P:number[]=[],U:number[]=[],SI:number[]=[],SW:number[]=[],I:number[]=[];
  // radii (x, z) and centre z at the waist, the hips and the hem, from the body's cross-sections
  const prof=(t:number)=>{
    const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
    if(t<.45){const k=t/.45;return {rx:lerp(.122,.168,k),rz:lerp(.1,.112,k),cz:lerp(.02,0,k)};}
    const k=(t-.45)/.55;return {rx:lerp(.168,.215,k),rz:lerp(.112,.16,k),cz:0};
  };
  for(let r=0;r<=rings;r++){
    const t=r/rings,y=C.waist+(C.skirtHem-C.waist)*t,{rx,rz,cz}=prof(t),depth=C.pleatDepth*Math.min(1,t*1.6);
    for(let s=0;s<=seg;s++){
      const a=s/seg*Math.PI*2,saw=((s/seg*C.pleats)%1),bump=1+depth*(saw-.5)*.5;
      const x=Math.sin(a)*rx*bump,z=cz+Math.cos(a)*rz*bump;
      P.push(x,y,z);U.push(s/seg*5,t*1.6);
      // the top follows the hips; lower down the thighs pull their side
      const legs=Math.min(1,Math.max(0,(t-.35)/.65))*.55,left=legs*Math.min(1,Math.max(0,.5+x/.16));
      SI.push(hips,L,R,0);SW.push(1-legs,left,legs-left,0);
    }
  }
  for(let r=0;r<rings;r++)for(let s=0;s<seg;s++){const a=r*(seg+1)+s,b=a+seg+1;I.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
  geo.setIndex(I);geo.computeVertexNormals();mats.forEach((_,k)=>geo.addGroup(0,I.length,k));
  return attach(body,geo,mats);
}

/** A tube along a line (from → to), radius by position t (0…1), skinned to two bones blended at the elbow. */
function tube(body:THREE.SkinnedMesh,from:THREE.Vector3,to:THREE.Vector3,bones:[number,number],elbowT:number,radius:(t:number)=>number,t0:number,t1:number,mats:THREE.Material[]){
  const d=to.clone().sub(from).normalize(),u=new THREE.Vector3(0,1,0).projectOnPlane(d).normalize(),v=d.clone().cross(u);
  const rings=28,seg=40,P:number[]=[],U:number[]=[],SI:number[]=[],SW:number[]=[],I:number[]=[];
  for(let r=0;r<=rings;r++){
    const t=t0+(t1-t0)*r/rings,c=from.clone().lerp(to,t),rad=radius(t),k=Math.min(1,Math.max(0,(t-elbowT+.07)/.14)),wl=k*k*(3-2*k);
    for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,q=c.clone().addScaledVector(u,Math.cos(a)*rad).addScaledVector(v,Math.sin(a)*rad);
      P.push(q.x,q.y,q.z);U.push(s/seg*5,t*6);SI.push(bones[0],bones[1],0,0);SW.push(1-wl,wl,0,0);}
  }
  for(let r=0;r<rings;r++)for(let s=0;s<seg;s++){const a=r*(seg+1)+s,b=a+seg+1;I.push(a,a+1,b,a+1,b+1,b);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
  geo.setIndex(I);geo.computeVertexNormals();mats.forEach((_,k)=>geo.addGroup(0,I.length,k));
  return attach(body,geo,mats);
}

export function clothes(vrm:VRM){
  const meshes:THREE.SkinnedMesh[]=[];vrm.scene.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)meshes.push(o as THREE.SkinnedMesh);});
  const by=(name:string)=>meshes.find(m=>(m.material as MToonMaterial[])[0]?.name===name)!;
  const body=by('Body_00_SKIN'),tops=by('Tops_01_CLOTH'),bottoms=by('Bottoms_01_CLOTH'),shoes=by('Shoes_01_CLOTH');
  const [baseMat,baseOutline]=tops.material as MToonMaterial[];
  const skel=body.skeleton;

  const boneSet=(...names:string[])=>new Set(skel.bones.map((b,i)=>names.some(n=>b.name.includes(n))?i:-1).filter(i=>i>=0));
  const dominant=(g:THREE.BufferGeometry,i:number)=>{const si=g.attributes.skinIndex!,sw=g.attributes.skinWeight!;let b=0,w=0;for(let k=0;k<4;k++)if(sw.getComponent(i,k)>w){w=sw.getComponent(i,k);b=si.getComponent(i,k);}return b;};
  vrm.scene.updateMatrixWorld(true);
  const rest=(n:Bone)=>body.worldToLocal(vrm.humanoid.getRawBoneNode(n)!.getWorldPosition(new THREE.Vector3()));
  const boneIndex=(n:Bone)=>skel.bones.indexOf(vrm.humanoid.getRawBoneNode(n) as THREE.Bone);

  // --- shirt and cardigan body, from the T-shirt (subdivided, so the V follows a straight line). The
  // T-shirt's short sleeves are cut off both: the arms get whole sleeves of their own (below), so nothing
  // lies in layers over the arm.
  const tee=subdivide(tops.geometry),centreZ=.03,seam=Math.abs(rest('leftUpperArm').x)+C.seam;
  // a T-shirt vertex is sleeve if it moves with the arm and lies beyond the seam
  const shL=rest('leftUpperArm');
  // by shape, not by bone (some of the sleeve moves with the chest): beyond the seam and within the armhole's circle round the arm
  const sleeve=(_:number,p:THREE.Vector3)=>Math.abs(p.x)>seam&&Math.hypot(p.y-shL.y,p.z-shL.z)<C.armhole;
  const offArm=(i:number,p:THREE.Vector3)=>!sleeve(i,p);
  // each arm's axis, from the seam to the wrist, and the sleeve's radius along it (0…1): a balloon over
  // the forearm. The cardigan keeps the T-shirt's own sleeve and draws it in, step by step, onto this
  // shape; where it ends the tube carries on with the same radius. So the shoulder has no join at all,
  // and the one join there is (sleeve hem to tube) is two equal circles.
  const smooth=(a:number,b:number,x:number)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};
  const arms=(['left','right'] as const).map(side=>{
    const sh=rest(`${side}UpperArm` as Bone),sign=Math.sign(sh.x),wr=rest(`${side}Hand` as Bone);
    const from=new THREE.Vector3(sign*seam,sh.y-.006,sh.z),to=wr.clone().add(new THREE.Vector3(sign*.004,0,0));
    const radius=(t:number)=>.048+.021*Math.sin(Math.PI*Math.min(1,Math.max(0,t/.87)**1.3))**1.2;
    return {side,sh,sign,from,to,radius};
  });
  // the T-shirt's crew neck (its band turns inside, above 1.306 m) goes from both: the shirt's collar
  // (below) closes the neck instead; cut into a V, the band folded into dark flaps
  const neckBand=(_:number,p:THREE.Vector3)=>p.y>C.neckline&&Math.hypot(p.x/.075,(p.z+.022)/.07)<1; // only round the neck, not the shoulders
  // the shirt: a hair inside the T-shirt, tucked into the skirt
  const shirt=grow(tops,tee,(i,p)=>p.y>C.waist-.01&&offArm(i,p),()=>-.004,p=>[p.x,p.y],dress(baseMat!,undefined,C.shirt,C.shirtShade,null),undefined,neckBand);
  const inV=(p:THREE.Vector3)=>p.z>centreZ&&p.y>C.vBottom&&Math.abs(p.x)<C.vWidth*(p.y-C.vBottom)/(C.vTop-C.vBottom);
  const vHalf=(y:number)=>C.vWidth*(y-C.vBottom)/(C.vTop-C.vBottom);
  const coatMats=dress(baseMat!,baseOutline,C.coat,C.coatShade,knit());coatMats[0]!.side=THREE.FrontSide; // its inside never shows through the V
  // its outline is a darker lavender, not the site's navy: seen through the V it is the inside of the knit
  coatMats[1]!.userData.outline=C.coatInside;
  const coat=grow(tops,tee,(_,p)=>!inV(p),(_,p)=>.009+(p.y<1.0?.006*Math.min(1,(1-p.y)/.13):0),
    p=>[Math.atan2(p.x,p.z-centreZ)/(Math.PI*2)*9,p.y*7],coatMats,
    // the V's edges are straight: a vertex inside the opening goes to the edge on its side
    p=>{p.x=(p.x<0?-1:1)*Math.max(.002,vHalf(p.y));},neckBand);
  // the hem: from the T-shirt's down to the sheet's (only the part below 0.95 m is stretched)
  {const cp=coat.geometry.attributes.position as THREE.BufferAttribute;let low=Infinity;for(let i=0;i<cp.count;i++)low=Math.min(low,cp.getY(i));
   for(let i=0;i<cp.count;i++){const y=cp.getY(i);if(y<.95)cp.setY(i,.95-(.95-y)*(.95-C.hem)/(.95-low));}cp.needsUpdate=true;}

  // --- sleeves. The T-shirt's sleeve (now the cardigan's) is drawn in onto the sleeve's shape, more and
  // more towards its hem; the tube goes on from the hem to a ribbed cuff, skinned to the upper and lower arm.
  const knitMats=dress(baseMat!,baseOutline,C.coat,C.coatShade,knit()),cuffMats=dress(baseMat!,baseOutline,C.cuff,C.coatShade,rib());
  const cp=coat.geometry.attributes.position as THREE.BufferAttribute,cu=coat.geometry.attributes.uv as THREE.BufferAttribute,q=new THREE.Vector3(),drawn:[number,number,THREE.Vector3][]=[];
  for(const {side,sign,from,to,radius} of arms){
    const axis=to.clone().sub(from),len=axis.length(),dir=axis.clone().normalize();
    const onSleeve=(v:THREE.Vector3)=>Math.sign(v.x)===sign&&Math.abs(v.x)>seam-.03&&Math.hypot(v.y-from.y,v.z-from.z)<C.armhole+.02;
    let hemT=0;for(let i=0;i<cp.count;i++){q.fromBufferAttribute(cp,i);if(onSleeve(q))hemT=Math.max(hemT,q.clone().sub(from).dot(dir)/len);}
    for(let i=0;i<cp.count;i++){
      q.fromBufferAttribute(cp,i);if(!onSleeve(q))continue;
      const t=q.clone().sub(from).dot(dir)/len,c=from.clone().addScaledVector(dir,t*len),off=q.clone().sub(c),d=off.length()||1;
      const w=smooth(.02,hemT*.7,t),r=d+(radius(t)+.002-d)*w; // the last third (and the hem's turned-in band) lies right on the sleeve's surface
      q.copy(c).addScaledVector(off,r/d);cp.setXYZ(i,q.x,q.y,q.z);drawn.push([i,w,off.clone().normalize()]);
      // the knit runs along the arm here, exactly as on the tube (same angle reference, same scale)
      const bu=new THREE.Vector3(0,1,0).projectOnPlane(dir).normalize(),bv=dir.clone().cross(bu);
      let ang=Math.atan2(off.dot(bv),off.dot(bu));if(ang<0)ang+=Math.PI*2;cu.setXY(i,ang/(Math.PI*2)*5,t*6);
    }
    const el=rest(`${side}LowerArm` as Bone);
    const elbowT=from.distanceTo(el)/len,bones:[number,number]=[boneIndex(`${side}UpperArm` as Bone),boneIndex(`${side}LowerArm` as Bone)];
    tube(body,from,to,bones,elbowT,radius,hemT*.6,.875,knitMats);
    tube(body,from,to,bones,elbowT,()=>.037,.865,1,cuffMats);
  }
  cp.needsUpdate=true;cu.needsUpdate=true;coat.geometry.computeVertexNormals();
  // where the sleeve lies on the tube it is shaded like the tube (normals straight out from the arm), so the two read as one
  {const cn=coat.geometry.attributes.normal as THREE.BufferAttribute,n=new THREE.Vector3();
   for(const [i,w,radial] of drawn){n.fromBufferAttribute(cn,i).lerp(radial,w).normalize();cn.setXYZ(i,n.x,n.y,n.z);}cn.needsUpdate=true;}

  // --- the cardigan's ribbing (as on the no-hat sheet): a ribbed band round the hem, a ribbed placket up
  // the front and round the V, and two pockets on the front with ribbed tops, raised a little off the knit
  {
    const g=coat.geometry,pos=g.attributes.position as THREE.BufferAttribute,nor=g.attributes.normal as THREE.BufferAttribute,idx=g.index!;
    const inPocket=(x:number,y:number,z:number)=>z>centreZ&&Math.abs(x)>C.pocketX[0]&&Math.abs(x)<C.pocketX[1]&&y>C.pocketY[0]&&y<C.pocketY[1];
    for(let i=0;i<pos.count;i++)if(inPocket(pos.getX(i),pos.getY(i),pos.getZ(i)))pos.setXYZ(i,pos.getX(i)+nor.getX(i)*.0025,pos.getY(i)+nor.getY(i)*.0025,pos.getZ(i)+nor.getZ(i)*.0025);
    pos.needsUpdate=true;
    const ribbed=(x:number,y:number,z:number)=>{
      if(y<C.hem+C.ribHem)return true;                                                   // hem band
      if(z>centreZ){
        const edge=y>C.vBottom?Math.abs(x)-vHalf(y):Math.abs(x);                          // placket: along the V's edge, then down the front
        if(edge>-.001&&edge<C.ribPlacket&&y<C.vTop+.004)return true;
        if(Math.abs(x)>C.pocketX[0]&&Math.abs(x)<C.pocketX[1]&&y>C.pocketY[1]-C.ribPocket&&y<C.pocketY[1])return true; // pocket tops
      }
      return false;
    };
    const count=g.groups[0]!.count,plain:number[]=[],banded:number[]=[];
    for(let t=0;t<count;t+=3){
      const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2);
      const x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3,y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3,z=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3;
      (ribbed(x,y,z)?banded:plain).push(a,b,c);
    }
    g.setIndex([...plain,...banded]);g.clearGroups();
    g.addGroup(0,plain.length,0);g.addGroup(plain.length,banded.length,2);g.addGroup(0,plain.length+banded.length,1);
    const ribMat=dress(baseMat!,undefined,C.cuff,C.coatShade,rib())[0]!;ribMat.side=THREE.FrontSide;
    coat.material=[...(coat.material as THREE.Material[]),ribMat];
  }

  // --- skirt
  skirt(body,vrm,dress(baseMat!,baseOutline,'#ffffff','#9a94ad',plaid()));

  // --- socks, from the shins and ankles
  // inside the shoe: a brown lining over the foot, so the gaps between the shoe's panels show shoe, not sock
  {const feet=boneSet('Bip_L_Foot','Bip_R_Foot','ToeBase');
   grow(body,body.geometry,(i,p)=>feet.has(dominant(body.geometry,i))&&p.y<.095,()=>.0006,()=>[0,0],dress(baseMat!,undefined,C.loaferSole,'#22140f',null));}
  // the shins and the ankle (foot-weighted skin above the toes): down into the shoe, so no skin shows between
  const legBones=boneSet('LowerLeg','Bip_L_Foot','Bip_R_Foot'),footBones=boneSet('Bip_L_Foot','Bip_R_Foot');
  grow(body,body.geometry,(i,p)=>legBones.has(dominant(body.geometry,i))&&p.y<C.sockTop&&p.y>(footBones.has(dominant(body.geometry,i))?(p.z>.015?.09:.05):.045)&&p.z<.06, // on the foot, only above the shoe's collar: high over the instep (where the tongue has gaps), low at the heel and the sides
    (i,p)=>p.y>C.sockTop-.035?.009:footBones.has(dominant(body.geometry,i))?.0008:.005, // thin where the shoe covers it, or it shows through
    p=>[Math.atan2(p.x-Math.sign(p.x)*.077,p.z)/(Math.PI*2)*4,p.y*8],dress(baseMat!,baseOutline,C.sock,C.sockShade,rib()));

  // --- loafers: the shoes, brown
  // loafers from the base model's sneakers: the laces (small separate parts of the mesh) go, the upper
  // is one flat brown and the sole (the lowest 2 cm) a darker one; a saddle strap crosses the instep
  {
    const g=shoes.geometry,pos=g.attributes.position as THREE.BufferAttribute,idx=g.index!,parent=new Int32Array(pos.count).map((_,i)=>i);
    const find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
    const count=g.groups[0]?.count??idx.count;
    for(let t=0;t<count;t+=3){const a=find(idx.getX(t)),b=find(idx.getX(t+1)),c=find(idx.getX(t+2));parent[b]=a;parent[c]=a;}
    const size=new Map<number,number>();for(let i=0;i<pos.count;i++){const r=find(i);size.set(r,(size.get(r)??0)+1);}
    const upper:number[]=[],sole:number[]=[];
    for(let t=0;t<count;t+=3){
      const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];if(size.get(find(tri[0]!))!<C.laceParts)continue; // the laces: thin loose loops (the tongue and eyelet panels stay, or the shoe has holes)
      (tri.every(i=>pos.getY(i)<C.soleTop)?sole:upper).push(...tri);
    }
    g.setIndex([...upper,...sole]);g.clearGroups();g.addGroup(0,upper.length,0);g.addGroup(upper.length,sole.length,2);g.addGroup(0,upper.length+sole.length,1);
    const [m0,o0]=shoes.material as MToonMaterial[];
    const flatShoe=(c:string,sh:string)=>{const m=m0!.clone() as MToonMaterial;m.color.set(c);m.shadeColorFactor.set(sh);m.map=null;m.shadeMultiplyTexture=null;m.needsUpdate=true;return m;};
    shoes.material=[flatShoe(C.loafer,'#45291f'),o0!,flatShoe(C.loaferSole,'#22140f')];
    // the strap: a band over the instep, following the shoe's surface (the highest point across it)
    const strapMat=flatShoe(C.strap,'#2c1a13');
    for(const sign of [-1,1]){
      const P:number[]=[],I:number[]=[],xs:number[]=[];
      for(let i=0;i<pos.count;i++)if(Math.sign(pos.getX(i))===sign)xs.push(pos.getX(i));
      const xmin=Math.min(...xs),xmax=Math.max(...xs),zc=C.strapZ,N=16,tops:[number,number][]=[];
      for(let k=0;k<=N;k++){
        const x=xmin+(xmax-xmin)*k/N;let top=0;
        for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-x)<.008&&Math.abs(pos.getZ(i)-zc)<.012&&size.get(find(i))!>=60)top=Math.max(top,pos.getY(i));
        if(top>C.strapFrom)tops.push([x,top]); // over the instep only: not down the shoe's sides
      }
      // a smooth arch over the instep (the raw tops step where the eyelet panels are)
      tops.splice(0,2);tops.splice(-2,2); // its ends tuck under the sides, not out past them
      for(let k=0;k<tops.length;k++){const w=tops.slice(Math.max(0,k-3),k+4),y=Math.max(...w.map(v=>v[1]));P.push(tops[k]![0],y+.003,zc-.009,tops[k]![0],y+.003,zc+.009);}
      for(let k=1;k<P.length/6;k++)I.push(2*k-2,2*k-1,2*k,2*k-1,2*k+1,2*k);
      // skinned to the foot, like the shoe itself
      const sg=new THREE.BufferGeometry(),n=P.length/3,fb=boneIndex(sign>0?'leftFoot':'rightFoot');
      sg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));sg.setIndex(I);sg.computeVertexNormals();
      sg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array.from({length:n*4},(_,k)=>k%4?0:fb),4));
      sg.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array.from({length:n*4},(_,k)=>k%4?0:1),4));
      const m=strapMat.clone() as MToonMaterial;m.side=THREE.DoubleSide;sg.addGroup(0,I.length,0);
      attach(shoes,sg,[m]);
    }
  }


  // the base model's T-shirt and shorts are replaced
  tops.visible=false;bottoms.visible=false;
  // --- buttons down the front below the V, and the pink ribbon tie at the collar: small rigid pieces
  // carried by the chest bones, placed on the cardigan's surface
  const coatPos=coat.geometry.attributes.position as THREE.BufferAttribute;
  // the front of a surface at height y (centre line, front half only)
  const frontOf=(pos:THREE.BufferAttribute)=>(y:number)=>{let z=-Infinity;for(let i=0;i<pos.count;i++)if(pos.getZ(i)>centreZ&&Math.abs(pos.getX(i))<.012&&Math.abs(pos.getY(i)-y)<.012)z=Math.max(z,pos.getZ(i));return z;};
  const frontAt=frontOf(coatPos),shirtFront=frontOf(shirt.geometry.attributes.position as THREE.BufferAttribute);
  // placed in the body's rest space, carried by a bone; the bone's own rest rotation is undone, so a piece
  // keeps the orientation it was built in (without this the ribbon's tails stood off the chest)
  const carry=(bone:Bone,obj:THREE.Object3D,at:THREE.Vector3)=>{const node=vrm.humanoid.getRawBoneNode(bone)!;vrm.scene.updateMatrixWorld(true);
    const w=body.localToWorld(at.clone());node.add(obj);obj.position.copy(node.worldToLocal(w));
    obj.quaternion.premultiply(node.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(body.getWorldQuaternion(new THREE.Quaternion())));};
  const flat=(color:string,shade:string)=>{const m=dress(baseMat!,undefined,color,shade,null)[0]!;m.side=THREE.FrontSide;return m;};
  const buttonMat=flat('#4C4658','#2a2534');
  for(const [k,y] of [C.vBottom-.004,C.vBottom-.058,C.vBottom-.112].entries()){
    const b=new THREE.Mesh(new THREE.SphereGeometry(.0085,14,10),buttonMat);b.scale.z=.45;
    carry(k?'spine':'chest',b,new THREE.Vector3(.004,y,frontAt(y)+.002));
  }
  const ribbonMat=flat(C.ribbon,C.ribbonShade),bow=new THREE.Group();
  // the same full-looped bow as in her hair, smaller, and without its own tails (the long ones follow)
  const knot=ribbonBow(ribbonMat);knot.children.filter(c=>c.position.y<-.003).forEach(c=>knot.remove(c));knot.scale.setScalar(.62);bow.add(knot);
  const knotY=C.vTop-.03;
  carry('upperChest',bow,new THREE.Vector3(0,knotY,shirtFront(knotY)+.006));
  // the tails: one continuous strip each, lying along the shirt from the knot down over the chest
  for(const side of [-1,1]){
    const steps=12,pts:THREE.Vector3[]=[];
    for(let k=0;k<=steps;k++){const t=k/steps,y=knotY-.004-t*.1;pts.push(new THREE.Vector3(side*(.005+t*.014),y,Math.max(shirtFront(y),shirtFront(y+.012),shirtFront(y-.012))+.006));}
    const origin=pts[0]!.clone(),P:number[]=[],I:number[]=[],w=.0034;
    pts.forEach((q,k)=>{const d=q.clone().sub(origin);P.push(d.x-w,d.y,d.z,d.x+w,d.y,d.z);if(k)I.push(2*k-2,2*k-1,2*k,2*k-1,2*k+1,2*k);});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();
    const m=ribbonMat.clone() as MToonMaterial;m.side=THREE.DoubleSide;
    carry('upperChest',new THREE.Mesh(g,m),origin);
  }
  // the shirt's collar, all round the neck: a stand, and a fall turned down over the cardigan's neckline,
  // open at the front and coming to a point on each side of the bow (as on the head turnaround)
  {
    const N=72,V=10,P:number[]=[],I:number[]=[],cz=-.022,open=THREE.MathUtils.degToRad(12);
    const ring=(a:number,rx:number,rz:number,y:number)=>new THREE.Vector3(Math.sin(a)*rx,y,cz+Math.cos(a)*rz);
    for(let i=0;i<=N;i++){
      const a=open+(Math.PI*2-2*open)*i/N,front=Math.max(0,1-Math.min(a,Math.PI*2-a)/1.0); // 1 at the opening, 0 from about 57° round
      for(let k=0;k<=V;k++){
        const v=k/V;let q:THREE.Vector3;
        // the stand: from the shirt's cut edge (wide) in to the neck and up
        if(v<.4){const t=v/.4;q=ring(a,.068-.016*t,.06-.007*t,C.neckline-.004+.036*t);}
        // the fall: turned down and out over the cardigan's neckline; at the front it runs into a point
        else{const t=(v-.4)/.6,e=Math.sin(t*Math.PI/2);q=ring(a,.052+.045*e+.012*front*e,.053+.04*e+.012*front*e,C.neckline+.032-(.042+.03*front*front)*e);}
        P.push(q.x,q.y,q.z);
        if(i&&k)I.push((i-1)*(V+1)+k-1,i*(V+1)+k-1,(i-1)*(V+1)+k,i*(V+1)+k-1,i*(V+1)+k,(i-1)*(V+1)+k);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();
    const m=flat(C.shirt,C.shirtShade);m.side=THREE.DoubleSide;
    const collar=new THREE.Mesh(g,m);carry('upperChest',collar,new THREE.Vector3());
  }
  void shirt;
}
