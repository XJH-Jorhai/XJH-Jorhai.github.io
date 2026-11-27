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

export const SHAPE = {
  /** Shin length (knee to ankle) as a factor: 0.875 brings the knees from 0.38 C to 0.35 C. */
  shin: .875,
  /** Chin-length bob: the hair ends this far above the soles (m, base model scale; her chin is at 1.352). */
  hairEnd: 1.335,
  /** How far the ends turn in towards the head, 0…1 (a bob curls in at the ends). */
  tuck: .3,
  /** Layered ends: how much the cut length varies from strand to strand (m), and how many locks around the head. */
  ragged: .016, locks: 11,
  /** Volume: the hair between the eyes and the ends stands this much further out from the head (factor). */
  volume: 1.1, volumeFrom: 1.52,
  /** Extra fullness at the back of the head (factor, added to volume there), and how much shorter the back is than the front (m). */
  backVolume: .08, backLift: .03,
  /** Each strand comes to a point: its middle runs this much further down than its edges (m). */
  tip: .018,
  /** Layers: some strands end shorter than their neighbours (m), and the ends of all strands flick out a little (m). */
  layer: .022, flick: .012,
  /** Honey blonde (persona palette "hair"), and the colour of its shaded side before the site's navy. */
  hair: '#EDC591', hairShade: '#C99A62', brow: '#B8875A',
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
  const {tuck}=s;
  // the cut line, a little uneven from lock to lock (layered ends), by the angle around the head
  const back=(x:number,z:number)=>(1-Math.cos(Math.atan2(x-centre.x,z-centre.z)))/2; // 0 at the front, 1 at the back
  const endAt=(x:number,z:number)=>{const a=Math.atan2(x-centre.x,z-centre.z);return s.hairEnd+s.backLift*back(x,z)**2+s.ragged*(Math.sin(a*s.locks)*.6+Math.sin(a*s.locks*2.3+1.3)*.4);};
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
  const endOf=(i:number)=>endAt(pos.getX(i),pos.getZ(i))-s.tip*middle[i]!+s.layer*(tier(find(i))>.6?1:tier(find(i))>.3?.45:0);
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
  // lift what hangs below to the cut and draw it in
  for(let i=0;i<pos.count;i++){
    const end=endOf(i);let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    // volume: from the eyes down the hair rounds out from the head, fullest at the cheeks, and the
    // ends turn back in (the tuck below): a round bob, not a straight curtain
    // (a swell that peaks part-way down and is gone again at the ends, fuller at the back of the head)
    if(y<s.volumeFrom){const k=Math.min(1,(s.volumeFrom-Math.max(y,end))/(s.volumeFrom-end)),v=1+(s.volume-1+s.backVolume*back(x,z))*Math.sin(k*Math.PI)**.7;x=centre.x+(x-centre.x)*v;z=centre.z+(z-centre.z)*v;}
    if(y<end){const depth=Math.min(1,(end-y)/.08),pull=tuck*depth;x+=(centre.x-x)*pull;z+=(centre.z-z)*pull;y=end-.004*depth;}
    // the last few centimetres of each strand lift and flick outwards, like the sheet's tips
    else if(y<end+.035){const k=1-(y-end)/.035,r=Math.hypot(x-centre.x,z-centre.z)||1,out=s.flick*k*k*(tier(find(i))>.5?1:.4);x+=(x-centre.x)/r*out;z+=(z-centre.z)/r*out;y+=out*.4;}
    pos.setXYZ(i,x,y,z);
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
    const l=(.3*p[i]!+.59*p[i+1]!+.11*p[i+2]!)/mean,s=.55+.45*l; // keep the strands' light and shade, softened
    p[i]=Math.min(255,color.r*255*s);p[i+1]=Math.min(255,color.g*255*s);p[i+2]=Math.min(255,color.b*255*s);
  }
  x.putImageData(d,0,0);
  const out=new THREE.CanvasTexture(c);out.colorSpace=tex.colorSpace;out.flipY=tex.flipY;out.wrapS=tex.wrapS;out.wrapT=tex.wrapT;out.needsUpdate=true;
  return out;
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
        m.outlineWidthFactor*=.5; // every card is outlined: at full width the strands read as stacked plates
        const t=recolor(m.map,new THREE.Color(1,1,1));if(t){m.map=t;m.shadeMultiplyTexture=t;}
        m.color.copy(hair);m.shadeColorFactor.copy(hairShade);
      }else if(m.name.startsWith('FaceBrow')){m.color.copy(brow);}
    }
  });
}
