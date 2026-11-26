/**
 * Page transition of the paged home: one continuous push along the mark's 45° diagonal.
 *
 * A seam crosses the screen in one quick stroke. Behind it is the new page, already in place and
 * already playing its entrance; in front of it the old page, still there. The seam is the pattern every
 * page carries: a band of painted navy (the oil portrait's brushwork in navy, as on the pages' slabs)
 * with a pane of red glass laid across its trailing edge and on over the edge of the new page. The navy
 * stretches while the seam is fast and closes up as it slows. The old page drifts out the way the
 * scroll goes and the new one settles in from the other side, so the two read as one movement and
 * nothing is ever blank.
 *
 * Going forward the seam rises from the bottom-right; going back it comes down from the top-right (the
 * whole thing is mirrored vertically), so the movement always follows the scroll.
 *
 * The two bands are drawn on one 2D canvas, filled with textures made once from the portrait (the same
 * luminosity blend the pages use in CSS, done in pixels: the painting's light and shade in navy, and in
 * red for the glass, which is laid on the navy by hard light). Until the painting has loaded they are
 * flat navy and red. The pages are clipped and moved by the caller (pager.ts) from the polygons this
 * module hands it each frame.
 */
const NAVY:[number,number,number]=[8,51,102],RED:[number,number,number]=[235,50,40];
const OIL='/media/persona/oil-1254.webp';

/** W3C luminosity blend (SetLum + ClipColor), channels 0…1. */
function setLum(c:[number,number,number],l:number):[number,number,number]{
  const lum=(v:number[])=>.3*v[0]!+.59*v[1]!+.11*v[2]!;
  const d=l-lum(c),r:[number,number,number]=[c[0]+d,c[1]+d,c[2]+d];
  const L=lum(r),n=Math.min(...r),x=Math.max(...r);
  if(n<0)for(let i=0;i<3;i++)r[i]=L+(r[i]!-L)*L/(L-n);
  if(x>1)for(let i=0;i<3;i++)r[i]=L+(r[i]!-L)*(1-L)/(x-L);
  return r;
}
/**
 * The painting's brushwork in one colour: each pixel takes the colour's hue and saturation and the
 * painting's lightness (after brightness and contrast), mixed with the flat colour by `amount`.
 * Half resolution is plenty: the texture is drawn enlarged.
 */
function brushwork(img:HTMLImageElement,tint:[number,number,number],brightness:number,contrast:number,amount:number,flip:boolean){
  const w=Math.round(img.naturalWidth/2),h=Math.round(img.naturalHeight/2),c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d',{willReadFrequently:true});if(!x)return null;
  if(flip){x.translate(w,0);x.scale(-1,1);}
  x.drawImage(img,0,0,w,h);
  const data=x.getImageData(0,0,w,h),px=data.data,base=tint.map(v=>v/255) as [number,number,number];
  for(let i=0;i<px.length;i+=4){
    let l=(.3*px[i]!+.59*px[i+1]!+.11*px[i+2]!)/255*brightness;
    l=Math.min(1,Math.max(0,(l-.5)*contrast+.5));
    const r=setLum(base,l);
    for(let k=0;k<3;k++)px[i+k]=Math.round((r[k]!*amount+base[k]!*(1-amount))*255);
    px[i+3]=255;
  }
  x.setTransform(1,0,0,1,0,0);x.putImageData(data,0,0);return c;
}
const DURATION=620;
/** Fast at once, then settling, like a flick of the scroll wheel. */
const ease=(t:number)=>1-Math.pow(1-t,4);

export type Point=[number,number];
export type FlipFrame={
  /** 0…1, eased. */
  progress:number;
  /** The new page's part of the screen and the old page's, as polygons in screen px. */
  incoming:Point[];
  outgoing:Point[];
};

export function createSweep(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');
  // The two textures, made once the painting has loaded (flat colours until then).
  let slab:string|CanvasPattern='#083366',glass:string|CanvasPattern='#EB3228';
  // Made when the browser is idle, so they never compete with the opening.
  const make=()=>{
    const img=new Image();img.decoding='async';img.src=OIL;
    img.decode().then(()=>{
      if(!ctx)return;
      const n=brushwork(img,NAVY,.42,1.9,.9,true),g=brushwork(img,RED,.8,1.6,.3,false);
      const pattern=(c:HTMLCanvasElement|null)=>{const p=c&&ctx.createPattern(c,'repeat');p?.setTransform(new DOMMatrix([2.4,0,0,2.4,0,0]));return p;};
      slab=pattern(n)??slab;glass=pattern(g)??glass;
    }).catch(()=>{});
  };
  if('requestIdleCallback' in window)requestIdleCallback(make,{timeout:5000});else setTimeout(make,2500);
  let W=1,H=1,R=1;
  function size(){
    W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);R=Math.min(devicePixelRatio||1,2,Math.sqrt(2.6e6/(W*H)));
    const w=Math.round(W*R),h=Math.round(H*R);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  /** Fills the strip lead < x+y < trail (in the forward frame) clipped to the screen. */
  function band(color:string|CanvasPattern,lead:number,trail:number){
    if(!ctx||trail<=lead)return;
    const S=W+H;lead=Math.max(-1,lead);trail=Math.min(S+1,trail);if(trail<=lead)return;
    const pts:[number,number][]=[];
    const edge=(c:number,rev:boolean)=>{const a:[number,number]=[Math.max(0,c-H),Math.min(H,c)],b:[number,number]=[Math.min(W,c),Math.max(0,c-W)];return rev?[b,a]:[a,b];};
    for(const p of edge(lead,false))pts.push(p);
    for(const [x,y] of [[W,0],[W,H],[0,H],[0,0]] as const){const s=x+y;if(s>lead&&s<trail)pts.push([x,y]);}
    for(const p of edge(trail,true))pts.push(p);
    const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;
    pts.sort((p,q)=>Math.atan2(p[1]-cy,p[0]-cx)-Math.atan2(q[1]-cy,q[0]-cx));
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(pts[0]![0],pts[0]![1]);for(const [x,y] of pts.slice(1))ctx.lineTo(x,y);ctx.closePath();ctx.fill();
  }
  /**
   * Runs one flip. `step` is called every frame with the progress and the two regions, so the caller
   * can clip and move the pages in the same frame as the stripes are drawn.
   */
  function flip(dir:number,step:(frame:FlipFrame)=>void){
    size();canvas.style.visibility='visible';
    const base=Math.min(W,H)*.06,far=3*(W+H);
    // The navy band is N wide (stretching with the seam's speed), the glass G; the glass lies over the
    // navy's trailing part and a little past the seam, over the new page's edge.
    const G=base*1.6,most=base*4.4;
    return new Promise<void>(done=>{
      const t0=performance.now();
      const tick=(now:number)=>{
        const raw=Math.min(1,(now-t0)/DURATION),p=ease(raw);
        // the navy stretches with the speed of the seam (the eased curve's slope), closes up as it settles
        const N=base*(1.4+3*Math.pow(1-raw,3)),end=-G*.2,travel=W+H+G*.6+most-end,t=end+travel*(1-p);
        // The seam is the line x+y = t in the forward frame; back is the same mirrored vertically.
        const incoming:Point[]=dir>0?[[t,0],[far,0],[far,H],[t-H,H]]:[[t-H,0],[far,0],[far,H],[t,H]];
        const outgoing:Point[]=dir>0?[[-far,0],[t,0],[t-H,H],[-far,H]]:[[-far,0],[t-H,0],[t,H],[-far,H]];
        step({progress:p,incoming,outgoing});
        if(ctx){
          ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
          if(dir>0)ctx.setTransform(R,0,0,R,0,0);else ctx.setTransform(R,0,0,-R,0,H*R);
          // painted navy leads; the glass lies across its trailing edge and the seam, by hard light
          band(slab,t-G*.6-N,t-G*.2);
          ctx.globalCompositeOperation='hard-light';band(glass,t-G*.85,t+G*.15);ctx.globalCompositeOperation='source-over';
        }
        if(raw<1)requestAnimationFrame(tick);
        else{if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}canvas.style.visibility='hidden';done();}
      };
      // The first frame is drawn at once, so the new page is clipped before anything is painted.
      tick(t0);
    });
  }
  return {flip};
}
