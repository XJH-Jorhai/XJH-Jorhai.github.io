/**
 * Shaping the base model into her, one measurable thing at a time (like the sliders of a character
 * creator). Every value here was taken from the reference sheet (public/media/persona/view-*.webp);
 * the comment beside it says how. Applied once, right after loading, before the pose.
 *
 * Measured on the sheet, as fractions of the chin's height above the soles (C):
 *   eyes 0.076 C above the chin · shoulders 0.94 C · fingertips 0.525 C · knees 0.35 C (back of the knee,
 *   side view) · skirt hem 0.50 C. The base model matches all of these except the knees (0.38 C): her
 *   shins are shorter. Head size, shoulders and arm length already match.
 */
import * as THREE from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {arcIn} from './headwear';

export const SHAPE = {
  /** Shin length (knee to ankle) as a factor: 0.875 brings the knees from 0.38 C to 0.35 C. */
  shin: .875,
  /** Proportions after the user's own Vyou model (2026-11-28; until then the head turnaround's ~6 heads): measured
   *  side by side with the Vyou screenshot at equal face size (eyes to chin), her body there is about 1.35× as long
   *  for the same widths. Tried in steps; this mix put the cardigan's hem, the skirt's hem and the hands within a few
   *  pixels of the Vyou model's. torso: the spine lengthened (the neck and shoulders scaled back, so the head and arms
   *  are not stretched with it); arms: along the upper arm (the hand scaled back); thighs: likewise; head: as a whole. */
  body: {torso:1.3, arms:1.18, thighs:1.1, head:.9},
  /** Chin-length bob: the hair ends this far above the soles (m, base model scale; her chin is at 1.352). */
  hairEnd: 1.345,
  /** Layered ends: how much the cut length varies from strand to strand (m), and how many locks around the head. */
  ragged: .016, locks: 11,
  /** Volume (the head turnaround's round bob): from the crown down the hair stands out from the head, up to
   *  this factor; a little more at the back of the head; strands differ by `fluff` (a share of it). */
  volume: 1.17, volumeFrom: 1.53, backVolume: .14, fluff: .18, // from just under the hat's rim: above it the hat must still fit
  /** Shoulder length at the back (the setting): the back hangs this much lower than the front (m), so the
   *  cheek locks end at the jaw and the back touches the shoulders. */
  backDrop: .015, // was .075 (to the shoulders); the head turnaround's back ends at the top of the collar (2026-11-27; the user: shorten it as you see fit)
  /** Two layers: strands of the outer layer end this much shorter than the inner ones (m), so the inner shows
   *  below the outer as a second tier and the bob keeps its volume. */
  outerShort: .045,
  /** Curl: the last `curlLength` of each strand bends in under, round a circle of radius `curlRadius` (m). */
  curlLength: .07, curlRadius: .045,
  /** Each strand comes to a point: its middle runs this much further down than its edges (m). */
  tip: .018,
  /** Layers: some strands end shorter than their neighbours (m). */
  layer: .022,
  /** Face-side locks: raised this much at their ends (m), and turned in towards the chin by this share. */
  sideLift: .028, sideTuck: .22,
  /** Fringe: front strands between these heights (m) and within this half-width (m) are combed towards the middle by up to `fringeComb`, and shifted towards her right (−x) by up to `fringeSweep` (m). */
  fringeTop: 1.585, fringeBottom: 1.45, fringeHalf: .115, fringeComb: .18, fringeSweep: 0, fringeClose: 0, fringeUnslant: 0, // straightening by shearing left a ragged edge (2026-11-27); the fringe needs its own cards // the sheet's fringe falls almost straight down from near the centre (a stronger comb read as a side sweep)
  /** Honey blonde (persona palette "hair"), and the colour of its shaded side before the site's navy. */
  hair: '#EDC591', hairShade: '#F2C084', brow: '#B8875A', // hairShade was #C99A62: on the sheet the back of the head (away from the light) is nearly the lit colour
};

type Bone=Parameters<VRM['humanoid']['getRawBoneNode']>[0];

/** Shorter shins: the shin bone scaled along its length, the foot scaled back, the body lowered to the floor. */
function legs(vrm:VRM,k:number){
  let drop=0;
  for(const side of ['left','right'] as const){
    const shin=vrm.humanoid.getRawBoneNode(`${side}LowerLeg` as Bone)!,foot=vrm.humanoid.getRawBoneNode(`${side}Foot` as Bone)!;
    drop=Math.abs(foot.position.y)*(1-k);
    shin.scale.y=k;foot.scale.y=1/k;
  }
  vrm.scene.position.y-=drop;
}

/**
 * The bob: in the hair mesh (rest pose), strands are cut at `end`: triangles wholly below it go, the
 * vertices below it are lifted to it and drawn in towards the head, so the ends curl in a little.
 */
function bob(mesh:THREE.Mesh,s:typeof SHAPE,centre:THREE.Vector3){
  const smooth=(a:number,b:number,x:number)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};
  // the cut line, a little uneven from lock to lock (layered ends), by the angle around the head
  const back=(x:number,z:number)=>(1-Math.cos(Math.atan2(x-centre.x,z-centre.z)))/2; // 0 at the front, 1 at the back
  const endAt=(x:number,z:number)=>{const a=Math.atan2(x-centre.x,z-centre.z);return s.hairEnd-s.backDrop*smooth(.3,.9,back(x,z))+s.ragged*(Math.sin(a*s.locks)*.6+Math.sin(a*s.locks*2.3+1.3)*.4);};
  const g=mesh.geometry,pos=g.attributes.position as THREE.BufferAttribute,index=g.index;
  if(!index)return;
  // Each strand (a connected card of the mesh) ends in a point, not a straight cut: how near a vertex is to
  // the middle of its strand's width (0 at the edges, 1 down the middle), from the card's own texture
  // coordinates across it.
  const uv=g.attributes.uv as THREE.BufferAttribute,parent=new Int32Array(pos.count).map((_,i)=>i);
  const find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
  for(let t=0;t<index.count;t+=3){const a=find(index.getX(t)),b=find(index.getX(t+1)),c=find(index.getX(t+2));parent[b]=a;parent[c]=a;}
  const lo=new Map<number,number>(),hi=new Map<number,number>();
  for(let i=0;i<pos.count;i++){const r=find(i),u=uv.getX(i);lo.set(r,Math.min(lo.get(r)??u,u));hi.set(r,Math.max(hi.get(r)??u,u));}
  const middle=new Float32Array(pos.count);
  for(let i=0;i<pos.count;i++){const r=find(i),w=hi.get(r)!-lo.get(r)!;middle[i]=w>1e-4?1-Math.abs(2*(uv.getX(i)-lo.get(r)!)/w-1):1;}
  // layers: every strand gets its own length (a hash of the strand), so the ends sit in uneven tiers
  const layerOf=new Map<number,number>();
  const tier=(r:number)=>{let v=layerOf.get(r);if(v===undefined){v=((Math.sin(r*12.9898)*43758.5453)%1+1)%1;layerOf.set(r,v);}return v;};
  // which layer a strand is in: how far it lies out from the head, compared with the strands round it (the
  // cards at the same angle, between the ears and the ends)
  const outerness=new Map<number,number>();
  {
    const acc=new Map<number,{r:number,n:number,a:number}>();
    for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y>1.48||y<1.36)continue;const dx=pos.getX(i)-centre.x,dz=pos.getZ(i)-centre.z,r0=find(i),v=acc.get(r0)??{r:0,n:0,a:0};v.r+=Math.hypot(dx,dz);v.a+=Math.atan2(dx,dz);v.n++;acc.set(r0,v);}
    const B=16,buckets:number[][]=Array.from({length:B},()=>[]),bucketOf=(a:number)=>Math.min(B-1,Math.floor((a+Math.PI)/(2*Math.PI)*B));
    for(const v of acc.values())buckets[bucketOf(v.a/v.n)]!.push(v.r/v.n);
    const median=buckets.map(b=>{const c=[...b].sort((p,q)=>p-q);return c[Math.floor(c.length/2)]??0;});
    for(const [r0,v] of acc)outerness.set(r0,v.r/v.n>median[bucketOf(v.a/v.n)]!+.002?1:0);
  }
  const endOf=(i:number)=>endAt(pos.getX(i),pos.getZ(i))-s.tip*middle[i]!+s.outerShort*(outerness.get(find(i))??0)*(1-smooth(.6,.85,back(pos.getX(i),pos.getZ(i))))+ /* the middle of the back has no inner layer under it: shortened, it opened a gap */ s.layer*.3*tier(find(i));
  const below=(i:number)=>pos.getY(i)<endOf(i)-.002;
  // drop the triangles wholly below the cut, group by group (the outline draws the same triangles again)
  const groups=g.groups.length?g.groups:[{start:0,count:index.count,materialIndex:0}];
  const kept:number[]=[],next:{start:number,count:number,materialIndex?:number}[]=[];
  for(const grp of groups){
    const start=kept.length;
    for(let t=grp.start;t<grp.start+grp.count;t+=3){
      const a=index.getX(t),b=index.getX(t+1),c=index.getX(t+2);
      if(below(a)&&below(b)&&below(c))continue;
      kept.push(a,b,c);
    }
    next.push({start,count:kept.length-start,materialIndex:grp.materialIndex});
  }
  g.setIndex(kept);g.clearGroups();for(const grp of next)g.addGroup(grp.start,grp.count,grp.materialIndex);
  // Shape every strand like the sheet's bob: it swells out from the crown, fullest from the cheeks down,
  // and its last few centimetres curl in under, towards the neck (a C, not a straight curtain).
  for(let i=0;i<pos.count;i++){
    const end=endOf(i),yc=end+s.curlLength;let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    if(y>=s.volumeFrom)continue;
    const dx=x-centre.x,dz=z-centre.z,r=Math.hypot(dx,dz)||1e-6,ux=dx/r,uz=dz/r;
    // volume
    const t=Math.min(1,(s.volumeFrom-Math.max(y,end))/(s.volumeFrom-end));
    // fullest at the cheeks, then back in towards the ends (a round bob, not a bell)
    // widening all the way down to the ends (only the curl turns them in): a convex triangle as on the sheet; a
    // swell that peaked at the cheeks and came back in read as a pear (2026-11-27)
    const swell=Math.pow(smooth(0,1,t),.85)*(1+s.fluff*(tier(find(i))-.5));
    let R=r*(1+(s.volume-1+s.backVolume*back(x,z))*swell);
    // curl: past yc the strand runs round a circle, turning in under
    if(y<yc){
      // the locks beside the face fall almost straight and only turn in a little; the curl is fullest at the back
      // k scales the curl: the strand bends round a circle of radius curlRadius/k, so with k → 0 it hangs
      // straight (with the radius fixed, a small k squashed everything below yc to one height: crumpled ends)
      const k=Math.max(1e-3,(.55+.45*smooth(.1,.5,back(x,z)))*(1-smooth(-.015,.04,pos.getZ(i)))),rho=s.curlRadius/k;
      const along=Math.min(yc-y,s.curlLength+.01),a=along/rho;
      R-=rho*(1-Math.cos(a));y=yc-rho*Math.sin(a);
    }
    // in front of the head's centre (the locks beside the face) the hair spreads only sideways: pushed
    // out along the radius it went forward past the cheek, and the curl folded it; in profile the sheet's
    // side locks fall straight, behind the line of the face
    const front=smooth(-.015,.04,pos.getZ(i)); // in front of the ears (by depth, not by the angle from the head's centre, which is behind them)
    x=centre.x+ux*R;z=centre.z+uz*(r+(R-r)*(1-front));
    // the face-side locks end a little higher (just below the chin) and turn in towards it at their ends
    if(front>0){const lift=s.sideLift*front;if(y<end+.05)y+=lift*smooth(end+.05,end-.01,y);x=centre.x+(x-centre.x)*(1-s.sideTuck*front*smooth(end+.05,end-.01,y));}
    pos.setXYZ(i,x,y,z);
  }
  // The fringe, from the base hair's own front strands (one hairstyle, not two): over the forehead they
  // are combed towards the middle, closing the centre parting, and the lower they hang the more, so they
  // fall across the forehead to the brows with a few between the eyes; a little towards her right.
  for(let i=0;i<pos.count;i++){
    let x=pos.getX(i);const y=pos.getY(i),z=pos.getZ(i);
    if(z<centre.z+.06||y>s.fringeTop||y<s.fringeBottom-.03)continue;
    const across=Math.abs(x-centre.x);if(across>s.fringeHalf)continue;
    const k=Math.min(1,(s.fringeTop-y)/(s.fringeTop-s.fringeBottom))*(1-across/s.fringeHalf)**.6;
    x=centre.x+(x-centre.x)*(1-s.fringeComb*k)+s.fringeSweep*k;
    // the base hair's fringe slopes down across her left brow; the sheet's falls straight: un-slant that side
    if(pos.getX(i)>centre.x-.01)x-=s.fringeUnslant*(s.fringeTop-y)*Math.min(1,(1-across/s.fringeHalf)*2);
    // the base hair parts in the middle (two big cards with a gap between them, which combing only narrows):
    // the group on the −x side is slid across over the parting, so the fringe closes like the sheet's
    if(pos.getX(i)<centre.x)x+=s.fringeClose*k;
    // combed in, a strand must lie in front of the forehead (else the face covers it: the 'parting' seen
    // through the fringe was hair behind the skin). The face's front, measured off the face mesh.
    const fy=Math.min(1.58,Math.max(1.44,y)),face=.078-1.9*(fy-1.5)**2-(fy>1.5?(fy-1.5)*.35:0);
    const front=face+.007+.004*(1-across/s.fringeHalf);
    pos.setXYZ(i,x,y,z+(Math.max(z,front)-z)*Math.min(1,k*2.5));
  }
  // the big curl of the ends towards the face (shared with headwear.ts): the sides and the front bend in along
  // one wide arc, the back less
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),inn=arcIn(y);if(!inn)continue;
    const dx=x-centre.x,dz=z-centre.z,r=Math.hypot(dx,dz)||1,w=(1-.55*smooth(.6,.95,back(x,z)))* /* the sides curl as much as the front (the layer behind the face-side hair flared out below it: 2026-11-27) */(1-smooth(-.02,.03,z)) /* not the cards over the face: drawn in, they crossed the eyes */,nr=Math.max(.05,r-inn*w);
    pos.setXYZ(i,centre.x+dx*nr/r,y,centre.z+dz*nr/r);
  }
  pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
}

/** A texture's light and shade kept, its colour replaced (for the hair and brows). */
function recolor(tex:THREE.Texture|null,color:THREE.Color){
  const img=tex?.image as (ImageBitmap|HTMLImageElement|undefined);if(!tex||!img)return null;
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height),p=d.data;
  let sum=0,n=0;for(let i=0;i<p.length;i+=4)if(p[i+3]!>8){sum+=.3*p[i]!+.59*p[i+1]!+.11*p[i+2]!;n++;}
  const mean=sum/Math.max(1,n)||1;
  for(let i=0;i<p.length;i+=4){
    const l=(.3*p[i]!+.59*p[i+1]!+.11*p[i+2]!)/mean,s=.9+.1*Math.min(1.1,l); /* flatter still (2026-11-27): its highlight streaks showed between the drawn locks as orange flames */ // the strands' lines kept faint: strong, every card came out lighter or darker than its neighbours and the crown read as patches (2026-11-27); strands are told apart by their outlines and the darker layers beneath
    p[i]=Math.min(255,color.r*255*s);p[i+1]=Math.min(255,color.g*255*s);p[i+2]=Math.min(255,color.b*255*s);
  }
  x.putImageData(d,0,0);
  const out=new THREE.CanvasTexture(c);out.colorSpace=tex.colorSpace;out.flipY=tex.flipY;out.wrapS=tex.wrapS;out.wrapT=tex.wrapT;out.needsUpdate=true;
  return out;
}

/** The proportions (SHAPE.body): bone scales, so the clothes, the hair and everything carried by a bone follow; then
 *  the feet are put back on the ground. Called once everything is built on the rest pose (main.ts). */
export function proportions(vrm:VRM,b=SHAPE.body){
  const B=(n:Bone)=>vrm.humanoid.getRawBoneNode(n)!;
  B('spine').scale.y*=b.torso;B('neck').scale.y/=b.torso;B('leftShoulder').scale.y/=b.torso;B('rightShoulder').scale.y/=b.torso;
  for(const side of ['left','right'] as const){
    B(`${side}UpperArm`).scale.x*=b.arms;B(`${side}Hand`).scale.x/=b.arms;
    B(`${side}UpperLeg`).scale.y*=b.thighs;B(`${side}Foot`).scale.y/=b.thighs;
  }
  B('head').scale.multiplyScalar(b.head);
  vrm.scene.updateMatrixWorld(true);
  const toe=new THREE.Box3();vrm.scene.traverse(o=>{const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh)return;const p=m.geometry.attributes.position!,v=new THREE.Vector3();for(let i=0;i<p.count;i+=7){v.fromBufferAttribute(p,i);m.applyBoneTransform(i,v);v.applyMatrix4(m.matrixWorld);if(v.y<.3)toe.expandByPoint(v);}});
  if(!toe.isEmpty())vrm.scene.position.y-=toe.min.y;
}

export function shape(vrm:VRM,s=SHAPE){
  legs(vrm,s.shin);
  const head=vrm.humanoid.getRawBoneNode('head')!.getWorldPosition(new THREE.Vector3());
  const hair=new THREE.Color(s.hair),hairShade=new THREE.Color(s.hairShade),brow=new THREE.Color(s.brow);
  vrm.scene.traverse(o=>{
    const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
    const mats=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter((m):m is MToonMaterial=>m instanceof MToonMaterial);
    if(mats.some(m=>m.name.startsWith('Hair_')))bob(mesh,s,head);
    for(const m of mats){
      if(/^Hair(Back)?_/.test(m.name)){
        m.outlineWidthFactor*=.22; // every card is outlined: wide, the strands read as thick stacked plates
        const t=recolor(m.map,new THREE.Color(1,1,1));if(t){m.map=t;m.shadeMultiplyTexture=t;}
        m.color.copy(hair);m.shadeColorFactor.copy(hairShade);
        // the base model paints its hair's highlight (an angel ring) as an orange emissive texture; on the strands
        // laid over it, it came out as orange flames, and the sheet has no such highlight (2026-11-27)
        m.emissive.set(0,0,0);m.emissiveMap=null;m.needsUpdate=true;
      }else if(m.name.startsWith('FaceBrow')){m.color.copy(brow);}
    }
  });
}
