/**
 * What sits on her head, built as real 3D shapes and carried by the head bone (so they turn with her):
 *
 *   fringe   the full fringe of the head turnaround (inputs/source/persona/model/head-turnaround.webp):
 *            strands laid over the hair's own surface (an ellipsoid measured from the hair mesh) from the
 *            crown down to the brows, the middle ones down between the eyes, sweeping a little to her right
 *   bow      the pink ribbon bow above her right ear, with two tails
 *   hat      the bucket hat of the hat turnaround: crown, a pale-blue and a dusty-pink stripe, a soft
 *            sloping brim. It can be taken off (`setHat`).
 *
 * Sizes in metres in the base model's rest pose, measured off its meshes (see the comments).
 */
import * as THREE from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {grow, dress} from './clothes';

export const HEAD = {
  /** The hair's outer surface, measured: centre and radii (x, y, z). Front of the bangs at 1.50 m: z 0.091; back -0.155; widest |x| 0.118; top 1.615. */
  centre: new THREE.Vector3(0,1.47,-.032), radii: new THREE.Vector3(.12,.146,.124),
  /** Fringe: strands across the front (azimuth, degrees, 0 = straight ahead; negative = her right), where each ends (m above the soles), sweep. */
  fringe: [[-80,1.39],[-66,1.41],[-52,1.43],[-40,1.455],[-29,1.468],[-18,1.476],[-8,1.462],[0,1.452],[8,1.46],[18,1.474],[29,1.466],[40,1.452],[52,1.43],[66,1.41],[80,1.39]] as [number,number][],
  sweep: -7, rootY: 1.585, strandWidth: .03, extraFringe: false,
  /** The base hair's front cards that the drawn fringe replaces: centre in front of z (m), lowest point above y (m). A strip of the hair texture for the new locks (u range). */
  fringeCut: [.03,1.38] as [number,number],
  /** …and the cards in front of the ears down to the jaw: centre in front of z, centre further out than |x|, lowest point below y. */
  sideCut: [-.01,.07,1.41] as [number,number,number], fringeUV: [.147,.344] as [number,number],
  hair: '#EDC591', hairShade: '#C99A62',
  /** The darker hair under the fringe, from this height up (m). */
  hairUnder: '#C99A62', hairUnderShade: '#9E7449', underFrom: 1.54, // only up under the fringe's root: lower down, the V between the locks shows forehead, as drawn
  bow: '#E9A3B1', bowShade: '#B8707F',
  hat: '#F6F0EC', hatShade: '#D8CCD2', stripeBlue: '#9FC3DA', stripePink: '#DF95A6',
};
const H=HEAD;

/** A point on the hair's ellipsoid at azimuth a (radians) and height y, pushed out by `out` metres. */
function onHair(a:number,y:number,out=0){
  const k=Math.max(0,1-((y-H.centre.y)/H.radii.y)**2),s=Math.sqrt(k);
  return new THREE.Vector3(H.centre.x+Math.sin(a)*(H.radii.x*s+out),y,H.centre.z+Math.cos(a)*(H.radii.z*s+out));
}

/** Strands as thin tapering strips over the ellipsoid, in one geometry. */
function fringeGeometry(){
  const P:number[]=[],U:number[]=[],I:number[]=[],steps=14;
  H.fringe.forEach(([deg,tip],n)=>{
    const a0=THREE.MathUtils.degToRad(deg),a1=THREE.MathUtils.degToRad(deg+H.sweep),base=P.length/3;
    for(let k=0;k<=steps;k++){
      const t=k/steps,y=H.rootY+(tip-H.rootY)*t,a=a0+(a1-a0)*t*t;
      // a strand stands off the hair a little more towards its tip, and curls back in at the very end
      const out=.004+.012*Math.sin(Math.PI*Math.min(1,t*1.15))+(n%2)*.002;
      const c=onHair(a,y,out),next=onHair(a+(a1-a0)*.02,y-.002,out),normal=c.clone().sub(H.centre).setY(0).normalize();
      const side=new THREE.Vector3().crossVectors(next.clone().sub(c).normalize().add(new THREE.Vector3(0,-1,0)).normalize(),normal).normalize();
      const w=H.strandWidth*(1-t**1.7)*.5+.0015;
      P.push(...c.clone().addScaledVector(side,-w).toArray(),...c.clone().addScaledVector(side,w).toArray());
      U.push(0,t,1,t);
      if(k)I.push(base+2*k-2,base+2*k-1,base+2*k,base+2*k-1,base+2*k+1,base+2*k);
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
  return g;
}
/** Strand lines for the fringe (greyscale, tinted by the material). */
function strandTexture(){
  const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d')!;
  const grad=x.createLinearGradient(0,0,64,0);grad.addColorStop(0,'#d8d8d8');grad.addColorStop(.5,'#ffffff');grad.addColorStop(1,'#d0d0d0');x.fillStyle=grad;x.fillRect(0,0,64,128);
  x.strokeStyle='rgba(150,150,150,.55)';x.lineWidth=1.2;for(const px of [14,27,39,51]){x.beginPath();x.moveTo(px,0);x.lineTo(32+(px-32)*.35,128);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

/** The bow: two loops, a knot, two tails, in its own frame (x along the loops, y up, z out of the bow). */
export function bow(mat:THREE.Material){
  const g=new THREE.Group();
  for(const side of [-1,1]){
    // a loop: a full, rounded wing of ribbon, wider at its outer end
    const w=new THREE.Shape();w.moveTo(0,.004);w.quadraticCurveTo(.012,.018,.03,.017);w.quadraticCurveTo(.041,.008,.036,-.008);w.quadraticCurveTo(.03,-.019,.016,-.012);w.quadraticCurveTo(.006,-.006,0,-.004);w.closePath();
    const loop=new THREE.Mesh(new THREE.ExtrudeGeometry(w,{depth:.004,bevelEnabled:true,bevelSize:.0018,bevelThickness:.0018,bevelSegments:2,curveSegments:10}),mat);
    loop.scale.x=side;loop.position.z=-.002;loop.rotation.z=side*.1;g.add(loop);
    const shape=new THREE.Shape([new THREE.Vector2(-.006,0),new THREE.Vector2(.006,0),new THREE.Vector2(.011,-.062),new THREE.Vector2(.003,-.054),new THREE.Vector2(-.004,-.064)]);
    const tail=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.0025,bevelEnabled:false}),mat);tail.position.set(side*.006,-.004,-.004);tail.rotation.z=side*.18;g.add(tail);
  }
  const knot=new THREE.Mesh(new THREE.SphereGeometry(.0085,12,10),mat);knot.scale.z=.7;g.add(knot);
  return g;
}

/** The bucket hat: crown (a domed frustum), two stripes round its base, a sloping brim. Origin at the crown's base. */
function hat(white:THREE.Material,blue:THREE.Material,pink:THREE.Material){
  // sizes from the sheet: brim about 1.15× the hair's width, crown top 0.6× the brim, crown 0.33× the brim tall
  const g=new THREE.Group(),base=.127,top=.098,height=.098;
  const crown:THREE.Vector2[]=[];
  for(let k=0;k<=12;k++){const t=k/12;crown.push(new THREE.Vector2(base+(top-base)*t,height*t));}
  for(let k=1;k<=8;k++){const a=k/8*Math.PI/2;crown.push(new THREE.Vector2(top*Math.cos(a),height+.018*Math.sin(a)));}
  g.add(new THREE.Mesh(new THREE.LatheGeometry(crown,64),white));
  const ring=(y0:number,y1:number,mat:THREE.Material)=>{const r=(y:number)=>base+(top-base)*y/height+.0012;g.add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(r(y0),y0),new THREE.Vector2(r(y1),y1)],64),mat));};
  ring(.026,.034,pink);ring(.04,.048,blue);
  const brim:THREE.Vector2[]=[];for(let k=0;k<=8;k++){const t=k/8;brim.push(new THREE.Vector2(base+.042*t,-.032*t**1.25));}
  brim.push(new THREE.Vector2(base+.042,-.037),new THREE.Vector2(base-.004,-.004));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(brim,64),white));
  return g;
}

/**
 * The fringe of the user's drawing (inputs/source/persona/model/fringe-front.webp, 2026-11-27): from one
 * point at the top of the forehead, a wide lock each side sweeping out and down to above the outer corner
 * of each eye, and a group in the middle falling straight down between the eyes, one lock crossing over to
 * the left and ending in fine points. Between the side locks and the middle, a V of forehead.
 * Each lock: a quadratic curve in the drawing's own frame (x across, -0.5…0.5 of the fringe's width;
 * y down, 0…1 of its height), its widest width, and how far it stands off the head (m; later ones lie on top).
 */
export const FRINGE = {
  width: .24, top: 1.588, height: .152, // a little lower than first drawn (the user's note): the middle ends between the eyes
  locks: [
    {p:[[0,0],[-.27,.1],[-.41,.87]],w:.24,out:.005},   // her right side lock
    {p:[[0,0],[.27,.1],[.42,.88]],w:.24,out:.005},     // her left side lock
    {p:[[0,0],[-.1,.45],[-.07,.96]],w:.17,out:.008},   // middle, left
    {p:[[.01,0],[.17,.5],[.08,.99]],w:.15,out:.008},   // middle, right
    {p:[[.02,.02],[.15,.6],[-.08,.99]],w:.07,out:.011}, // crossing over to the left (smaller, sharper: the user's note)
    {p:[[.03,.3],[.12,.7],[.01,.97]],w:.025,out:.012}, // a fine tip
  ] as {p:[number,number][],w:number,out:number}[],
};

/** One lock as a strip lying on the head (the hair's measured ellipsoid, and never inside the forehead). */
function lockGeometry(lock:typeof FRINGE.locks[number],uv:[number,number]){
  const F=FRINGE,N=28,A=4,P:number[]=[],U:number[]=[],I:number[]=[];
  const [p0,p1,p2]=lock.p as [[number,number],[number,number],[number,number]];
  const at=(t:number)=>[(1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]] as [number,number];
  const toHead=(dx:number,dy:number,out:number)=>{
    const x=dx*F.width,y=F.top-dy*F.height,c=H.centre,r=H.radii;
    const xs=Math.max(-.97*r.x,Math.min(.97*r.x,x));
    const k=Math.max(.02,1-(xs/r.x)**2-((y-c.y)/r.y)**2);
    let z=c.z+r.z*Math.sqrt(k);
    const fy=Math.min(1.58,Math.max(1.44,y)),face=.078-1.9*(fy-1.5)**2-(fy>1.5?(fy-1.5)*.35:0)-9*x*x; // the forehead's front, measured (it curves away fast: at the temples it is near z 0)
    z=Math.max(z,face+.004)+out;
    return [x,y,z];
  };
  for(let i=0;i<=N;i++){
    const t=i/N,c=at(t),d=at(Math.min(1,t+.01)),e=at(Math.max(0,t-.01)),tx=d[0]-e[0],ty=d[1]-e[1],len=Math.hypot(tx,ty)||1,nx=-ty/len,ny=tx/len;
    const w=lock.w*Math.pow(Math.max(0,4*t*(1-t)),.55)*.5*(1-.45*Math.max(0,(t-.6)/.4)**1.5)+(t<.5?.004:0); // tips drawn out finer
    for(let a=0;a<=A;a++){
      const s=a/A*2-1,bulge=.0025*(1-s*s);
      // at the root the lock lies in the hair (no ridge where the locks part), standing off only further down
      P.push(...toHead(c[0]+nx*s*w,c[1]+ny*s*w*(F.width/F.height),(lock.out+bulge)*(.25+.75*Math.min(1,t/.18))-.004*(1-Math.min(1,t/.12))));
      U.push(uv[0]+(s+1)/2*(uv[1]-uv[0]),t);
      if(i&&a)I.push((i-1)*(A+1)+a-1,i*(A+1)+a-1,(i-1)*(A+1)+a,i*(A+1)+a-1,i*(A+1)+a,(i-1)*(A+1)+a);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
  return g;
}

/**
 * The locks beside the face (the user's note, 2026-11-27): on each side two locks fall from the temple,
 * past the front of the ear (half over it), to the jaw, turning in a little towards the cheek at the end;
 * the front one a little shorter and further in. A quadratic curve in head space (her left side; mirrored
 * for her right), its widest width (m, across the lock, front to back) and how far its middle bulges out.
 */
export const SIDELOCKS = [
  // they start inside the hair (hidden under it), come out round the ear and end at the jaw, turned in;
  // three a side, close to the face, so the cheek is framed by hair (not by a gap onto the background)
  {p:[[.075,1.505,-.012],[.15,1.44,-.008],[.108,1.325,.014]],w:.06,bulge:.005},
  {p:[[.073,1.5,.014],[.142,1.44,.02],[.1,1.333,.034]],w:.05,bulge:.005},
  {p:[[.07,1.495,.036],[.133,1.435,.042],[.09,1.35,.052]],w:.036,bulge:.005},
] as {p:[number,number,number][],w:number,bulge:number}[];

function sideLockGeometry(lock:typeof SIDELOCKS[number],sign:number,uv:[number,number]){
  const N=28,A=4,P:number[]=[],U:number[]=[],I:number[]=[];
  const q=lock.p.map(([x,y,z])=>new THREE.Vector3(x*sign,y,z)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3];
  const at=(t:number)=>q[0].clone().multiplyScalar((1-t)**2).addScaledVector(q[1],2*(1-t)*t).addScaledVector(q[2],t*t);
  const out=new THREE.Vector3(sign,0,0);
  for(let i=0;i<=N;i++){
    const t=i/N,c=at(t),tan=at(Math.min(1,t+.01)).sub(at(Math.max(0,t-.01))).normalize(),across=new THREE.Vector3().crossVectors(tan,out).normalize();
    const w=lock.w*.5*Math.pow(Math.max(0,4*t*(1-t)),.5)*(t<.5?1:1)+(t<.4?.006*(1-t/.4):0);
    for(let a=0;a<=A;a++){
      const s=a/A*2-1,p=c.clone().addScaledVector(across,s*w).addScaledVector(out,lock.bulge*(1-s*s));
      P.push(p.x,p.y,p.z);U.push(uv[0]+(s+1)/2*(uv[1]-uv[0]),t);
      if(i&&a)I.push((i-1)*(A+1)+a-1,i*(A+1)+a-1,(i-1)*(A+1)+a,i*(A+1)+a-1,i*(A+1)+a,(i-1)*(A+1)+a);
    }
  }
  // mirrored, the winding turns over: turn it back, so the lit side faces out
  if(sign<0)for(let k=0;k<I.length;k+=3){const t=I[k+1]!;I[k+1]=I[k+2]!;I[k+2]=t;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
  return g;
}

/**
 * Thickness (the user's note, 2026-11-27: tucked in, the hair looked thin and see-through beside the face):
 * thin strands laid in two layers along the hair's own outer surface, round both sides and the back. The
 * surface is measured from the shaped hair (outer radius per angle and height), so the strands follow the
 * bob exactly, end where it ends, and curl in under at their tips.
 */
export const FILL = {
  /** Angles from straight ahead (degrees), each side; strands per side = their count, per layer. */
  from: 48, to: 180, step: 8,
  /** The layers: how far inside the measured surface (m), and the strands' width (m). */
  // both under the outer hair (on it, they poked through in patches): they fill the gaps from beneath and
  // show as an inner layer at the ends
  layers: [{inset:.014,w:.044},{inset:.006,w:.036}],
  top: 1.47, curl: .035,
  loose: {r:.006,a:.06,bow:.004,w:.5} as Loose,
};

/** The curtain beside the face: angles (degrees from ahead), radius from the hair's centre at the top (m), how much
 *  it swells beside the cheek and further out towards the back (m), where it ends (m, and how much lower round
 *  the back), its layers. */
/** The hair's outline from the front (the user's note, 2026-11-27: the sheet's head of hair is a convex triangle,
 *  its edge one continuous line; pinched at the temples and full at the cheeks it read as a pear): the radius
 *  beside the head, from just under the hat's rim (where it fits inside the hat) straight down and out to the ends. */
// A round dome on top (radius `dome` about height `cy`, inside the hat), and below it the tangent from the dome
// straight down and out to the ends: one continuous line, no corner (a straight start at the hat's rim made
// a shoulder there).
export const SIL = {dome:.134,cy:1.478,ends:1.34,atEnds:.164};
const silhouette=(()=>{
  const {dome:R,cy,ends:ye,atEnds:xe}=SIL,dx=xe,dy=ye-cy,d2=dx*dx+dy*dy,l=Math.sqrt(d2-R*R);
  // the tangent point on the circle, on the outer side
  const a=Math.atan2(dy,dx)+Math.acos(R/Math.sqrt(d2)),tx=R*Math.cos(a),ty=cy+R*Math.sin(a);void l;
  return (y:number)=>y>=ty?Math.sqrt(Math.max(0,R*R-(y-cy)**2)):tx+(xe-tx)*Math.min(1,(ty-y)/(ty-ye));
})();

/** The big inward curl of the ends (the user's note, 2026-11-27: "a big, sweeping curl" towards the face): from
 *  eye level down, the outline leaves its straight line along a wide circular arc, turning in by `depth` at the
 *  ends. Shared with shape.ts, so the base hair, the fill and the curtain bend as one. */
export const ARC = {from:1.5,ends:1.335,depth:.065};
export const arcIn=(y:number)=>{const d=Math.min(ARC.from-ARC.ends,Math.max(0,ARC.from-y)),L=ARC.from-ARC.ends,R=(L*L+ARC.depth*ARC.depth)/(2*ARC.depth);return R-Math.sqrt(R*R-d*d);};

export const CURTAIN = {
  from: 46, to: 180, step: 6, r0: .118, swell: .03, back: 0, end: 1.335, endBack: .025, top: 1.598,
  // layers 7 mm apart, and every strand a little off its neighbours (strands at one depth z-fought into a checkerboard)
  // the outer strands narrow (each about 10° wide, 6° apart: wider, they overlapped three deep and read as one
  // sheet), the inner layers wide and darker, closing every gap beneath
  // the darker layers start lower: between the outer strands near the top one sees the crown hair, not dark
  // flame-shaped tops (seen from above, 2026-11-27)
  layers: [{inset:.0,w:.026},{inset:.007,w:.04,drop:.045},{inset:.014,w:.054,drop:.065}],
  loose: {r:.012,a:.09,bow:.006,w:.6} as Loose,
  /** Outer strands' outline, times the base hair's (which is thin: every base card is outlined). */
  outline: 2.6,
};

/** The temples (the user's note, 2026-11-27: seen from below, the fringe's side lock and the curtain did not
 *  join; one more layer of hair was needed there): two layers of strands from under the crown hair, between
 *  the fringe and the curtain, down past the outer corner of the eye, lying just off the head. */
export const TEMPLE = {
  from: 30, to: 54, step: 4, top: 1.57, end: 1.478, endBack: .055, // ends above the outer corner of the eye; longer towards the curtain
  layers: [{inset:.0,w:.046},{inset:.006,w:.04}],
};

function measureHair(hair:THREE.Mesh){
  const pos=hair.geometry.attributes.position as THREE.BufferAttribute,idx=hair.geometry.index!,c=H.centre;
  const A=90,Y=40,y0=1.2,dy=.01,outer=new Float32Array(A*Y),low=new Float32Array(A).fill(9);
  const used=new Uint8Array(pos.count);for(let t=0;t<idx.count;t++)used[idx.getX(t)]=1;
  for(let i=0;i<pos.count;i++){
    if(!used[i])continue;
    const dx=pos.getX(i)-c.x,dz=pos.getZ(i)-c.z,y=pos.getY(i),a=Math.floor(((Math.atan2(dx,dz)+Math.PI)/(2*Math.PI))*A)%A,yi=Math.floor((y-y0)/dy);
    if(yi<0||yi>=Y)continue;
    outer[a*Y+yi]=Math.max(outer[a*Y+yi]!,Math.hypot(dx,dz));low[a]=Math.min(low[a]!,y);
  }
  // fill holes from the neighbours above
  for(let a=0;a<A;a++)for(let yi=Y-2;yi>=0;yi--)if(!outer[a*Y+yi])outer[a*Y+yi]=outer[a*Y+yi+1]!;
  // (clamped: a few stray vertices far out made spikes)
  const at=(ang:number,y:number)=>{const a=((Math.floor(((ang+Math.PI)/(2*Math.PI))*A)%A)+A)%A,yi=Math.min(Y-1,Math.max(0,Math.floor((y-y0)/dy)));return Math.min(.175,Math.max(.085,outer[a*Y+yi]!));};
  const end=(ang:number)=>{const a=((Math.floor(((ang+Math.PI)/(2*Math.PI))*A)%A)+A)%A;let m=9;for(const k of [a-1,a,a+1])m=Math.min(m,low[(k+A)%A]!);return m;};
  return {at,end};
}

/** How loose a layer of strands is ("combed out", the user's note 2026-11-27: the side hair read as one sheet of
 *  paper): each strand stands off by its own amount (radial, m, growing down its length), drifts sideways by its
 *  own angle (rad, at its tip), bows out in the middle, varies in width, and tapers from half way. */
type Loose={r:number,a:number,bow:number,w:number};
function fillGeometry(ang:number,layer:{inset:number,w:number,drop?:number},hair:{at:(a:number,y:number)=>number,end:(a:number)=>number,top?:number,curl?:(a:number)=>number,loose?:Loose},uv:[number,number],seed:number){
  const rnd=(k:number)=>((Math.sin(seed*12.9898+k*78.233)*43758.5453)%1+1)%1,L=hair.loose;
  // round the back the strands come out of the hair just under the hat's brim, where one sees them from behind:
  // there they start together and lie flat until lower down (staggered, their tops showed under the brim)
  const bk0=Math.min(1,Math.max(0,(Math.abs(THREE.MathUtils.radToDeg(ang))-100)/40)),bk=bk0*bk0*(3-2*bk0),looseFrom=1.555-.07*bk;
  const twist=L?(rnd(5)-.5)*.9:0,off=L?(rnd(1)-.35)*L.r:0,drift=L?(rnd(2)-.5)*2*L.a:0,bow=L?rnd(3)*L.bow:0,wk=L?1-L.w/2+rnd(4)*L.w:1;
  // each strand takes a different strand region of the hair texture: with one region for all, neighbours were
  // identical and the curtain read as one smooth sheet
  const STRIPS:[number,number][]=[uv,[.344,.541],[.0,.243],[.243,.485],[.026,.275],[.275,.523]],su=STRIPS[seed%STRIPS.length]!;
  const c=H.centre,N=26,Aw=3,P:number[]=[],U:number[]=[],I:number[]=[];
  const yEnd=hair.end(ang)+.004+.024*((Math.sin(seed*12.9898)*43758.5453%1+1)%1),yTop=(hair.top??FILL.top)-(L?rnd(6)*.032*(1-bk):0)-(layer.drop??0); // uneven tips, not one straight cut; loose strands also start at different heights, coming out of the hair one by one (all from one line, their tops merged into a smooth cap)
  for(let i=0;i<=N;i++){
    const t=i/N,y=yTop+(yEnd-yTop)*t;
    for(let a=0;a<=Aw;a++){
      const taper=L?(1-.9*Math.max(0,(t-.45)/.55)**1.2):(1-.85*Math.max(0,(t-.75)/.25)**1.3);
      const s=a/Aw*2-1,w=layer.w*wk*.5*(t<.15?.6+t/.15*.4:1)*taper,ac=ang+drift*t**1.4,aa=ac+s*w/Math.max(.05,hair.at(ac,y));
      // its root sinks into the hair (tops showing out of the crown read as flat patches)
      let r=hair.at(aa,Math.max(y,yEnd+.012))-layer.inset+.0016*(seed%3)-(L?.03:.016)*(1-Math.min(1,t/(L?.32:.2)))**2+(off*Math.min(1,t/.35)+bow*Math.sin(Math.PI*t)+(L?.0012*(1-s*s)+twist*s*w:0))*Math.min(1,Math.max(0,(looseFrom-y)/.05)); // loose only below the hat's rim: above it, it poked through the hat // twist: one edge out, the other in, so strands catch the light differently
      const k=Math.max(0,(y-(yEnd+FILL.curl))/-FILL.curl); // 0 → 1 over the last few cm: curl in under
      const ck=hair.curl?hair.curl(ang):1;r-=.02*k*k*ck;const yy=y+.006*k*k*ck;
      P.push(c.x+Math.sin(aa)*r,yy,c.z+Math.cos(aa)*r);U.push(su[0]+(s+1)/2*(su[1]-su[0]),t);
      if(i&&a)I.push((i-1)*(Aw+1)+a-1,i*(Aw+1)+a-1,(i-1)*(Aw+1)+a,i*(Aw+1)+a-1,i*(Aw+1)+a,(i-1)*(Aw+1)+a);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
  // lit side out: if the first normal points in, turn the winding
  const n=g.attributes.normal!,p0=new THREE.Vector3(P[0]!-c.x,0,P[2]!-c.z);
  if(n.getX(0)*p0.x+n.getZ(0)*p0.z<0){for(let k=0;k<I.length;k+=3){const tmp=I[k+1]!;I[k+1]=I[k+2]!;I[k+2]=tmp;}g.setIndex(I);g.computeVertexNormals();}
  return g;
}

export type Headwear={setHat(on:boolean):void};

export function headwear(vrm:VRM,base:MToonMaterial):Headwear{
  const head=vrm.humanoid.getRawBoneNode('head')!;
  vrm.scene.updateMatrixWorld(true);
  // things are placed in the model's rest space (vrm.scene's own frame) and carried by the head bone,
  // whose rest rotation is not the identity: undo it so they keep the orientation they were built in
  const carry=(obj:THREE.Object3D,at:THREE.Vector3,turn=new THREE.Quaternion())=>{
    const w=vrm.scene.localToWorld(at.clone());head.add(obj);obj.position.copy(head.worldToLocal(w));
    obj.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(vrm.scene.getWorldQuaternion(new THREE.Quaternion())).multiply(turn));
  };
  const mat=(color:string,shade:string,map:THREE.Texture|null=null,side:THREE.Side=THREE.DoubleSide)=>{
    const m=base.clone() as MToonMaterial;m.color.set(color);m.shadeColorFactor.set(shade);m.map=map;m.shadeMultiplyTexture=map;m.side=side;m.needsUpdate=true;return m;
  };
  // the fringe (vertices already in rest space: the mesh sits at the origin of that space)
  // (no separate fringe: laid over the base hair it read as a second hairstyle on top of the first,
  // 2026-11-27. shape.ts combs the base hair's own front strands into the fringe instead.)
  if(H.extraFringe){const fringe=new THREE.Mesh(fringeGeometry(),mat(H.hair,H.hairShade,strandTexture()));carry(fringe,new THREE.Vector3());}
  // The drawn fringe. The base hair's own front cards (in front of the face, above the cheek) go; the new
  // locks use the base hair's very materials and a strip of its texture (one hairstyle, not two).
  {
    let hair:THREE.Mesh|null=null;vrm.scene.traverse(o=>{if((o as THREE.Mesh).isMesh&&o.name==='Hair')hair=o as THREE.Mesh;});
    if(hair){
      const hm=hair as THREE.Mesh,g=hm.geometry,pos=g.attributes.position as THREE.BufferAttribute,idx=g.index!;
      const par=new Int32Array(pos.count).map((_,i)=>i),find=(i:number):number=>{while(par[i]!==i){par[i]=par[par[i]!]!;i=par[i]!;}return i;};
      for(let t=0;t<idx.count;t+=3){const a=find(idx.getX(t)),b=find(idx.getX(t+1)),c=find(idx.getX(t+2));par[b]=a;par[c]=a;}
      const st=new Map<number,{n:number,z:number,ymin:number}>();
      for(let t=0;t<idx.count;t++){const i=idx.getX(t),r=find(i),v=st.get(r)??{n:0,z:0,ymin:9};v.n++;v.z+=pos.getZ(i);v.ymin=Math.min(v.ymin,pos.getY(i));st.set(r,v);}
      // also the cards in front of the ears that hang to the jaw (half-curled between front and back, they
      // crumpled): the side locks take their place
      const stx=new Map<number,number>();for(let t=0;t<idx.count;t++){const i=idx.getX(t),r=find(i);stx.set(r,(stx.get(r)??0)+pos.getX(i));}
      const front=(i:number)=>{const r=find(i),v=st.get(r)!,cz=v.z/v.n,cx=stx.get(r)!/v.n;return (cz>H.fringeCut[0]&&v.ymin>H.fringeCut[1])||(cz>H.sideCut[0]&&Math.abs(cx)>H.sideCut[1]&&v.ymin<H.sideCut[2]);};
      const keep:number[]=[],groups:{start:number,count:number,materialIndex?:number}[]=[];
      for(const grp of g.groups){const start=keep.length;for(let t=grp.start;t<grp.start+grp.count;t+=3){const a=idx.getX(t);if(front(a))continue;keep.push(a,idx.getX(t+1),idx.getX(t+2));}groups.push({start,count:keep.length-start,materialIndex:grp.materialIndex});}
      g.setIndex(keep);g.clearGroups();for(const grp of groups)g.addGroup(grp.start,grp.count,grp.materialIndex);
      const mats=hm.material as THREE.Material[];
      for(const lock of FRINGE.locks){
        const lg=lockGeometry(lock,H.fringeUV);mats.forEach((_,k)=>lg.addGroup(0,lg.index!.count,k));
        const m=new THREE.Mesh(lg,mats);m.renderOrder=1;carry(m,new THREE.Vector3());
      }
      // thickness: two layers of thin strands along the shaped hair's own surface, both sides and the back
      const measured=measureHair(hm);
      {
        let seed=1;
        for(const [li,layer] of FILL.layers.entries())for(let deg=FILL.from+(li?FILL.step/2:0);deg<=FILL.to;deg+=FILL.step)for(const sign of [-1,1]){
          if(deg>=180&&sign<0)continue;
          // where no hair hangs any more (the cards in front of the ears were removed) the curtain (below) is
          // there; a strand there would end above its start and turn into a flat spike
          if(measured.end(THREE.MathUtils.degToRad(deg*sign))>FILL.top-.06){seed++;continue;}
          const fg=fillGeometry(THREE.MathUtils.degToRad(deg*sign),layer,{...measured,loose:FILL.loose},H.fringeUV,seed++);fg.addGroup(0,fg.index!.count,0);
          const m=new THREE.Mesh(fg,[mats[0]!]); // inner strands, no outline: theirs showed through gaps as dark rectangles
          m.renderOrder=1;carry(m,new THREE.Vector3());
        }
      }
      // the curtain beside the face: in front of the ear and over it, where the base cards were removed, a
      // dense hang of strands on a bob's profile (fullest beside the cheek, tucked in towards the jaw), three
      // layers deep. It covers the ear and the undersides of the curled back hair seen from the front.
      {
        // it grows from under the crown hair (starting at mid-head it read as a pair of earmuffs): at the top just
        // inside the crown's measured surface, blending down into the bob's profile
        // its front edge hangs straight (curled in, its underside showed from the front as dark steps at the jaw)
        const prof={loose:CURTAIN.loose,top:CURTAIN.top,curl:(ang:number)=>{const d=Math.abs(THREE.MathUtils.radToDeg(ang));return .45+.55*Math.min(1,Math.max(0,(d-60)/30));},at:(ang:number,y:number)=>{const deg=Math.abs(THREE.MathUtils.radToDeg(ang)),u=Math.min(1,Math.max(0,(1.5-y)/.17));
            void u;
            // the ends turn in towards the face (the user's note, 2026-11-27): the top stays, below `bendFrom` the
            // outline curves in, most at the front locks beside the cheek, less towards the back
            const bendK=1-.4*Math.min(1,Math.max(0,(deg-90)/30));
            const bob=silhouette(y)+CURTAIN.back*Math.max(0,deg-60)/60-arcIn(y)*bendK;
            const k0=Math.min(1,Math.max(0,(y-1.5)/.08)),k=k0*k0*(3-2*k0),kc0=Math.min(1,Math.max(0,(y-1.53)/.05)),crown=Math.sqrt(Math.max(0,1-((y-H.centre.y)/.152)**2))*(H.radii.x+.006-.012*kc0*kc0*(3-2*kc0)); /* near the top just inside the crown hair, so the strands come out of it below and their tops don't show from above */ // up top it lies over the crown hair (6 mm, so it stays inside the hat) (on the head's measured ellipsoid plus the hair's thickness; the measurement is clamped there and made the tops stand up like ears), covering the straight lower edge of its cards (under it, that edge showed as a ledge)
            const side=bob+(crown-bob)*k;
            // round the back it lies on the back hair (measured), so side and back are one layer of strands:
            // before, the combed side hair stopped at 104° and the back was a different, clumpy mass
            const kb=Math.min(1,Math.max(0,(deg-92)/38)),kbs=kb*kb*(3-2*kb);
            if(!kbs)return side;
            // up under the brim just inside the back hair (on it, bits showed between the brim and the hair), out on it lower down
            const kin=Math.min(1,Math.max(0,(y-1.40)/.05)),backR=measured.at(ang,Math.max(y,measured.end(ang)+.02))+.004-.008*kin;
            const res=side+(Math.max(backR,crown*.98)-side)*kbs*(1-k*.6);
            return y>1.515?Math.min(res,crown+.004):res;}, // never wider than the crown up under the hat (it showed through the hat's back)
          end:(ang:number)=>{const deg=Math.abs(THREE.MathUtils.radToDeg(ang)),e=CURTAIN.end-CURTAIN.endBack*Math.min(1,Math.max(0,deg-55)/55),kb=Math.min(1,Math.max(0,(deg-92)/38));return e+(measured.end(ang)+.006-e)*kb*kb*(3-2*kb);}};
        // Combed out (the user's note, 2026-11-27: it read as one sheet of paper): the outer strands are outlined
        // more strongly than the base hair; the inner layers are darker, so between the outer strands one sees
        // depth, as in a drawing of hair, not more of the same surface.
        const [hm0,ho0]=mats as [MToonMaterial,MToonMaterial];
        const outer=[hm0,ho0.clone() as MToonMaterial];outer[1]!.outlineWidthFactor=ho0.outlineWidthFactor*CURTAIN.outline;
        const inner=(k:number)=>{const m=hm0.clone() as MToonMaterial;m.color.copy(hm0.color).lerp(new THREE.Color(H.hairShade),k);m.shadeColorFactor.copy(hm0.shadeColorFactor).multiplyScalar(1-.25*k);return m;};
        const layerMats=[outer,[inner(.45)],[inner(.8)]];
        let seed=500;
        for(const [li,layer] of CURTAIN.layers.entries())for(let deg=CURTAIN.from+li*CURTAIN.step/3;deg<=CURTAIN.to;deg+=CURTAIN.step)for(const sign of [-1,1]){
          const ang=THREE.MathUtils.degToRad(deg*sign);
          if(deg>=180&&sign<0)continue;
          const lm=layerMats[li]!,fg=fillGeometry(ang,layer,prof,H.fringeUV,seed++);lm.forEach((_,k)=>fg.addGroup(0,fg.index!.count,k));
          const m=new THREE.Mesh(fg,lm);m.renderOrder=1;carry(m,new THREE.Vector3());
        }
      }
      {
        const prof={top:TEMPLE.top,curl:()=>0,
          at:(ang:number,y:number)=>{const crown=measured.at(ang,Math.max(y,1.575))-.008,low=crown+.006; // hugging the head (further out it hung in front of the eye)
           const k=Math.min(1,Math.max(0,(1.565-y)/.07));return crown+(Math.max(crown,low)-crown)*k;},
          end:(ang:number)=>TEMPLE.end-TEMPLE.endBack*Math.max(0,Math.abs(THREE.MathUtils.radToDeg(ang))-TEMPLE.from)/(TEMPLE.to-TEMPLE.from)};
        let seed=900;
        for(const [li,layer] of TEMPLE.layers.entries())for(let deg=TEMPLE.from+li*TEMPLE.step/2;deg<=TEMPLE.to;deg+=TEMPLE.step)for(const sign of [-1,1]){
          const fg=fillGeometry(THREE.MathUtils.degToRad(deg*sign),layer,prof,H.fringeUV,seed++);mats.forEach((_,k)=>fg.addGroup(0,fg.index!.count,k));
          const m=new THREE.Mesh(fg,mats);m.renderOrder=1;carry(m,new THREE.Vector3());
        }
      }
      for(const sign of [-1,1])for(const lock of SIDELOCKS){
        const lg=sideLockGeometry(lock,sign,H.fringeUV);mats.forEach((_,k)=>lg.addGroup(0,lg.index!.count,k));
        const m=new THREE.Mesh(lg,mats);m.renderOrder=1;carry(m,new THREE.Vector3());
      }
    }
  }
  // Under the fringe, the hair close to the scalp: a darker layer of hair over the top of the forehead,
  // grown from the face (so it moves with her head). Where the fringe's strands part, it shows hair, as
  // in a drawing, not the forehead. It stops above the brows, where the sheet shows a little forehead.
  {
    let face:THREE.SkinnedMesh|null=null;
    vrm.scene.traverse(o=>{const m=(o as THREE.SkinnedMesh);if(m.isSkinnedMesh&&(Array.isArray(m.material)?m.material[0]:m.material)?.name==='Face_00_SKIN')face=m;});
    if(face){
      const f=face as THREE.SkinnedMesh;
      // its lower edge in points, like strand tips (a straight edge read as a cut line across the forehead)
      const edge=(x:number)=>H.underFrom+.012*Math.abs(Math.sin(x*95))-.004;
      grow(f,f.geometry,(_,p)=>p.y>edge(p.x)&&p.z>-.01,(_,p)=>.003+.004*Math.min(1,(p.y-H.underFrom)/.03),()=>[0,0],dress(base,undefined,H.hairUnder,H.hairUnderShade,null));
    }
  }
  // the bow above her right ear (her right is -x), facing out and a little forward
  const b=bow(mat(H.bow,H.bowShade));
  carry(b,onHair(THREE.MathUtils.degToRad(-64),1.49,.04),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,THREE.MathUtils.degToRad(-58),0)));
  // the hat: its crown's base a little above the brows, tipped back slightly
  const h=hat(mat(H.hat,H.hatShade),mat(H.stripeBlue,'#7da2bb'),mat(H.stripePink,'#b87283'));
  carry(h,new THREE.Vector3(0,1.535,H.centre.z+.006),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.1,0,0)));
  return {setHat(on){h.visible=on;}};
}
