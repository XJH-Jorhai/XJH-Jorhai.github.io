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

export const HEAD = {
  /** The hair's outer surface, measured: centre and radii (x, y, z). Front of the bangs at 1.50 m: z 0.091; back -0.155; widest |x| 0.118; top 1.615. */
  centre: new THREE.Vector3(0,1.47,-.032), radii: new THREE.Vector3(.12,.146,.124),
  /** Fringe: strands across the front (azimuth, degrees, 0 = straight ahead; negative = her right), where each ends (m above the soles), sweep. */
  fringe: [[-80,1.39],[-66,1.41],[-52,1.43],[-40,1.455],[-29,1.468],[-18,1.476],[-8,1.462],[0,1.452],[8,1.46],[18,1.474],[29,1.466],[40,1.452],[52,1.43],[66,1.41],[80,1.39]] as [number,number][],
  sweep: -7, rootY: 1.585, strandWidth: .03,
  hair: '#EDC591', hairShade: '#C99A62',
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
function bow(mat:THREE.Material){
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
  const fringe=new THREE.Mesh(fringeGeometry(),mat(H.hair,H.hairShade,strandTexture()));
  carry(fringe,new THREE.Vector3());
  // the bow above her right ear (her right is -x), facing out and a little forward
  const b=bow(mat(H.bow,H.bowShade));
  carry(b,onHair(THREE.MathUtils.degToRad(-64),1.49,.024),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,THREE.MathUtils.degToRad(-58),0)));
  // the hat: its crown's base a little above the brows, tipped back slightly
  const h=hat(mat(H.hat,H.hatShade),mat(H.stripeBlue,'#7da2bb'),mat(H.stripePink,'#b87283'));
  carry(h,new THREE.Vector3(0,1.535,H.centre.z+.006),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.1,0,0)));
  return {setHat(on){h.visible=on;}};
}
