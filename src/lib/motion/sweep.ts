/**
 * Page transition of the paged home: one continuous push along the mark's 45° diagonal.
 *
 * A seam crosses the screen in one quick stroke. Behind it is the new page, already in place and
 * already playing its entrance; in front of it the old page, still there. On the seam ride four
 * stripes of colour — night, navy, cobalt, red, the red one touching the new page — which stretch while
 * the seam is fast and close up as it slows. The old page drifts out the way the scroll goes and the
 * new one settles in from the other side, so the two read as one movement and nothing is ever blank.
 *
 * Going forward the seam rises from the bottom-right; going back it comes down from the top-right (the
 * whole thing is mirrored vertically), so the movement always follows the scroll.
 *
 * The stripes are drawn on one 2D canvas; the pages are clipped and moved by the caller (pager.ts)
 * from the polygons this module hands it each frame.
 */
const BANDS=['#0B1424','#083366','#2F5FD0','#EF3025']; // night, navy, cobalt, red (touching the new page)
const DURATION=620;
/** Fast at once, then settling, like a flick of the scroll wheel. */
const ease=(t:number)=>1-Math.pow(1-t,4);

export type FlipFrame={
  /** 0…1, eased. */
  progress:number;
  /** The new page's part of the screen and the old page's, as CSS polygons in screen px. */
  incoming:(dx:number,dy:number)=>string;
  outgoing:(dx:number,dy:number)=>string;
};

export function createSweep(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');
  let W=1,H=1,R=1;
  function size(){
    W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);R=Math.min(devicePixelRatio||1,2,Math.sqrt(2.6e6/(W*H)));
    const w=Math.round(W*R),h=Math.round(H*R);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  /** Fills the strip lead < x+y < trail (in the forward frame) clipped to the screen. */
  function band(color:string,lead:number,trail:number){
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
    const base=Math.min(W,H)*.045,most=base*2.2,far=3*(W+H);
    return new Promise<void>(done=>{
      const t0=performance.now();
      const tick=(now:number)=>{
        const raw=Math.min(1,(now-t0)/DURATION),p=ease(raw);
        // stripes stretch with the speed of the seam (the eased curve's slope), close up as it settles
        const w=base*(.55+1.65*Math.pow(1-raw,3)),travel=W+H+4*most,t=travel*(1-p);
        // The seam is the line x+y = t in the forward frame; back is the same mirrored vertically.
        const incoming=(dx:number,dy:number)=>dir>0
          ?`polygon(${t-dx}px ${-dy}px,${far}px ${-dy}px,${far}px ${H-dy}px,${t-H-dx}px ${H-dy}px)`
          :`polygon(${t-H-dx}px ${-dy}px,${far}px ${-dy}px,${far}px ${H-dy}px,${t-dx}px ${H-dy}px)`;
        const outgoing=(dx:number,dy:number)=>dir>0
          ?`polygon(${-far}px ${-dy}px,${t-dx}px ${-dy}px,${t-H-dx}px ${H-dy}px,${-far}px ${H-dy}px)`
          :`polygon(${-far}px ${-dy}px,${t-H-dx}px ${-dy}px,${t-dx}px ${H-dy}px,${-far}px ${H-dy}px)`;
        step({progress:p,incoming,outgoing});
        if(ctx){
          ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
          if(dir>0)ctx.setTransform(R,0,0,R,0,0);else ctx.setTransform(R,0,0,-R,0,H*R);
          // night leads, red trails right against the new page
          BANDS.forEach((color,i)=>band(color,t-(BANDS.length-i)*w,t-(BANDS.length-1-i)*w+.5));
        }
        if(raw<1)requestAnimationFrame(tick);
        else{if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}canvas.style.visibility='hidden';done();}
      };
      requestAnimationFrame(tick);
    });
  }
  return {flip};
}
