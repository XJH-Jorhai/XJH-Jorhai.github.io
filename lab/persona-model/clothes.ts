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

export const CLOTHES = {
  coat: '#C6B6C7', coatShade: '#8E7F98', cuff: '#B4A3B8', coatInside: '#7E7090',
  shirt: '#F7F4EE', shirtShade: '#C9C3CF',
  plaidBase: '#6F6A80', plaidLight: '#D9D4E2', plaidPink: '#E9ACA9', plaidDark: '#4A4660',
  sock: '#F5F2EC', sockShade: '#C8C3CC',
  loafer: '#5E3F31',
  ribbon: '#E39AA0', ribbonShade: '#B86F7C',
  /** Cardigan hem (sheet: 0.627 C above the soles). */
  hem: .871,
  /** V opening: from the collar down to here (sheet: 0.778 C), and its half-width at the collar. */
  vBottom: 1.06, vTop: 1.315, vWidth: .078,
  /** Skirt: waist and hem heights (hem 0.50 C on the sheet), pleat count and depth. */
  waist: .985, skirtHem: .708, pleats: 30, pleatDepth: .1,
  /** Sock tops above the soles, measured as 0.44 of the knee's height. */
  sockTop: .226,
  /** Where the sleeves meet the cardigan: this far out from the shoulder joint (m). */
  seam: .035,
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
  snap?:(p:THREE.Vector3)=>void){
  const pos=g.attributes.position!,nor=g.attributes.normal!,idx=g.index!;
  const p=new THREE.Vector3(),n=new THREE.Vector3(),take=new Int32Array(pos.count).fill(-1),inside=new Uint8Array(pos.count);
  for(let i=0;i<pos.count;i++)inside[i]=keep(i,p.fromBufferAttribute(pos,i))?1:0;
  const count=(g.groups[0]?.count)??idx.count,out:number[]=[],P:number[]=[],N:number[]=[],U:number[]=[],SI:number[]=[],SW:number[]=[];
  const si=g.attributes.skinIndex!,sw=g.attributes.skinWeight!;
  for(let t=0;t<count;t+=3){
    const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];if(snap?!tri.some(i=>inside[i]):!tri.every(i=>inside[i]))continue;
    for(const i of tri){
      if(take[i]!<0){
        take[i]=P.length/3;p.fromBufferAttribute(pos,i);if(snap&&!inside[i])snap(p);n.fromBufferAttribute(nor,i).normalize();
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
  const upperArms=boneSet('UpperArm','LowerArm','Elbow');
  const sleeve=(i:number,p:THREE.Vector3)=>upperArms.has(dominant(tee,i))&&Math.abs(p.x)>seam;
  const offArm=(i:number,p:THREE.Vector3)=>!sleeve(i,p);
  // each arm's axis at the shoulder, and the armhole's radius (how far the T-shirt reaches from it at the seam)
  const arms=(['left','right'] as const).map(side=>{
    const sh=rest(`${side}UpperArm` as Bone),sign=Math.sign(sh.x),tp=tee.attributes.position!,q=new THREE.Vector3();let hole=0;
    for(let i=0;i<tp.count;i++){q.fromBufferAttribute(tp,i);if(Math.sign(q.x)===sign&&upperArms.has(dominant(tee,i))&&Math.abs(Math.abs(q.x)-seam)<.012)hole=Math.max(hole,Math.hypot(q.y-sh.y,q.z-sh.z));}
    return {side,sh,sign,hole:hole?Math.min(.058,hole):.055};
  });
  // the cardigan's armhole closes onto the sleeve: a cut-off sleeve vertex goes to the seam, drawn in to the armhole's radius
  const toArmhole=(p:THREE.Vector3)=>{const a=arms[p.x>0===arms[0]!.sign>0?0:1]!;p.x=a.sign*seam;const dy=p.y-a.sh.y,dz=p.z-a.sh.z,r=Math.hypot(dy,dz);if(r>a.hole){p.y=a.sh.y+dy*a.hole/r;p.z=a.sh.z+dz*a.hole/r;}};
  // the shirt: a hair inside the T-shirt, tucked into the skirt
  const shirt=grow(tops,tee,(i,p)=>p.y>C.waist-.01&&offArm(i,p),()=>-.004,p=>[p.x,p.y],dress(baseMat!,undefined,C.shirt,C.shirtShade,null));
  const inV=(p:THREE.Vector3)=>p.z>centreZ&&p.y>C.vBottom&&Math.abs(p.x)<C.vWidth*(p.y-C.vBottom)/(C.vTop-C.vBottom);
  const vHalf=(y:number)=>C.vWidth*(y-C.vBottom)/(C.vTop-C.vBottom);
  const coatMats=dress(baseMat!,baseOutline,C.coat,C.coatShade,knit());coatMats[0]!.side=THREE.FrontSide; // its inside never shows through the V
  // its outline is a darker lavender, not the site's navy: seen through the V it is the inside of the knit
  coatMats[1]!.userData.outline=C.coatInside;
  const coat=grow(tops,tee,(i,p)=>!inV(p)&&offArm(i,p),(_,p)=>.009+(p.y<1.0?.006*Math.min(1,(1-p.y)/.13):0),
    p=>[Math.atan2(p.x,p.z-centreZ)/(Math.PI*2)*9,p.y*7],coatMats,
    // the V's edges are straight: a vertex inside the opening goes to the edge on its side
    p=>{if(Math.abs(p.x)>seam-.001)toArmhole(p);else p.x=(p.x<0?-1:1)*Math.max(.002,vHalf(p.y));});
  // the hem: from the T-shirt's down to the sheet's (only the part below 0.95 m is stretched)
  {const cp=coat.geometry.attributes.position as THREE.BufferAttribute;let low=Infinity;for(let i=0;i<cp.count;i++)low=Math.min(low,cp.getY(i));
   for(let i=0;i<cp.count;i++){const y=cp.getY(i);if(y<.95)cp.setY(i,.95-(.95-y)*(.95-C.hem)/(.95-low));}cp.needsUpdate=true;}

  // --- sleeves: one tube per arm, from inside the shoulder (where it is as wide as the cardigan's
  // armhole) over a balloon at the forearm to a ribbed cuff at the wrist, skinned to the upper and
  // lower arm. One piece from shoulder to cuff, so it never looks like layers.
  const knitMats=dress(baseMat!,baseOutline,C.coat,C.coatShade,knit()),cuffMats=dress(baseMat!,baseOutline,C.cuff,C.coatShade,rib());
  for(const {side,sh,sign,hole} of arms){
    const el=rest(`${side}LowerArm` as Bone),wr=rest(`${side}Hand` as Bone);
    const from=sh.clone().add(new THREE.Vector3(-sign*.04,-.012,0)),to=wr.clone().add(new THREE.Vector3(sign*.004,0,0));
    const elbowT=from.distanceTo(el)/from.distanceTo(to),bones:[number,number]=[boneIndex(`${side}UpperArm` as Bone),boneIndex(`${side}LowerArm` as Bone)];
    const balloon=(t:number)=>.046+.022*Math.sin(Math.PI*Math.min(1,(t/.87)**1.35))**1.2;
    const smooth=(a:number,b:number,x:number)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};
    tube(body,from,to,bones,elbowT,t=>hole+(balloon(t)-hole)*smooth(0,.25,t),0,.875,knitMats);
    tube(body,from,to,bones,elbowT,()=>.037,.865,1,cuffMats);
  }

  // --- skirt
  skirt(body,vrm,dress(baseMat!,baseOutline,'#ffffff','#9a94ad',plaid()));

  // --- socks, from the shins and ankles
  const legBones=boneSet('LowerLeg');
  grow(body,body.geometry,(i,p)=>legBones.has(dominant(body.geometry,i))&&p.y<C.sockTop&&p.y>.07,(_,p)=>p.y>C.sockTop-.035?.009:.005,
    p=>[Math.atan2(p.x-Math.sign(p.x)*.077,p.z)/(Math.PI*2)*4,p.y*8],dress(baseMat!,baseOutline,C.sock,C.sockShade,rib()));

  // --- loafers: the shoes, brown
  for(const m of shoes.material as MToonMaterial[]){m.color.set(C.loafer);m.shadeColorFactor.set('#2e1d16');m.map=null;m.shadeMultiplyTexture=null;m.needsUpdate=true;}

  // the base model's T-shirt and shorts are replaced
  tops.visible=false;bottoms.visible=false;
  // --- buttons down the front below the V, and the pink ribbon tie at the collar: small rigid pieces
  // carried by the chest bones, placed on the cardigan's surface
  const coatPos=coat.geometry.attributes.position as THREE.BufferAttribute;
  // the front of a surface at height y (centre line, front half only)
  const frontOf=(pos:THREE.BufferAttribute)=>(y:number)=>{let z=-Infinity;for(let i=0;i<pos.count;i++)if(pos.getZ(i)>centreZ&&Math.abs(pos.getX(i))<.012&&Math.abs(pos.getY(i)-y)<.012)z=Math.max(z,pos.getZ(i));return z;};
  const frontAt=frontOf(coatPos),shirtFront=frontOf(shirt.geometry.attributes.position as THREE.BufferAttribute);
  const carry=(bone:Bone,obj:THREE.Object3D,at:THREE.Vector3)=>{const node=vrm.humanoid.getRawBoneNode(bone)!;vrm.scene.updateMatrixWorld(true);
    const w=body.localToWorld(at.clone());node.add(obj);obj.position.copy(node.worldToLocal(w));};
  const flat=(color:string,shade:string)=>{const m=dress(baseMat!,undefined,color,shade,null)[0]!;m.side=THREE.FrontSide;return m;};
  const buttonMat=flat('#4C4658','#2a2534');
  for(const [k,y] of [C.vBottom-.004,C.vBottom-.058,C.vBottom-.112].entries()){
    const b=new THREE.Mesh(new THREE.SphereGeometry(.0085,14,10),buttonMat);b.scale.z=.45;
    carry(k?'spine':'chest',b,new THREE.Vector3(.004,y,frontAt(y)+.002));
  }
  const ribbonMat=flat(C.ribbon,C.ribbonShade),bow=new THREE.Group();
  for(const side of [-1,1]){
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.014,.0034,8,20),ribbonMat);loop.scale.set(1,.62,.5);loop.position.x=side*.015;loop.rotation.z=side*.25;bow.add(loop);
  }
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(.0055,10,8),ribbonMat));
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
  // the shirt's collar: a white point on each side, lying over the cardigan's neckline
  const collarMat=flat(C.shirt,C.shirtShade);
  for(const side of [-1,1]){
    const shape=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(side*.05,.004),new THREE.Vector2(side*.036,-.042),new THREE.Vector2(side*.006,-.024)]);
    const flap=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.003,bevelEnabled:false}),collarMat);flap.rotation.x=-.45;
    carry('upperChest',flap,new THREE.Vector3(side*.012,C.vTop+.012,shirtFront(C.vTop-.02)+.004));
  }
  void shirt;
}
