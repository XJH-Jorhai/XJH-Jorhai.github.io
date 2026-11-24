/**
 * Page transition of the paged home: the cover's four corner blocks and a sweep of colour bands.
 *
 * Cover: the corner blocks (navy triangles top-left and bottom-right, red blades top-right and
 * bottom-left — the frame the opening leaves on the cover) fly in from beyond the corners while five
 * bands — night, navy, cobalt, red, paper — sweep across one after another along the mark's 45°
 * diagonal. Fully covered, the screen is the paper with the four blocks around it: the cover's frame.
 * Reveal: the bands leave in reverse order the same way, so their trailing edges show the colours
 * again, and the blocks fly back out.
 *
 * Going forward the bands rise from the bottom-right; going back they come down from the top-right
 * (the whole sweep is mirrored), so the movement always follows the scroll.
 *
 * Everything is drawn on one 2D canvas, a handful of polygons per frame.
 */
const BANDS=['#0B1424','#083366','#2F5FD0','#EF3025','#F3EDE2']; // night, navy, cobalt, red, paper
const NAVY='#083366',RED='#EF3025';
const STAGGER=40,COVER=300,REVEAL=360,CORNER_IN=280,CORNER_OUT=320;
const inOut=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const outQuart=(t:number)=>1-Math.pow(1-t,4);
const inQuart=(t:number)=>t*t*t*t;
const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export function createSweep(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');
  let W=1,H=1,R=1;
  function size(){
    W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);R=Math.min(devicePixelRatio||1,2,Math.sqrt(2.6e6/(W*H)));
    const w=Math.round(W*R),h=Math.round(H*R);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  /** Band i covers the strip lead < x+y < trail (in the sweep's own frame, see `frame()`). */
  function band(color:string,lead:number,trail:number){
    if(!ctx||trail<=lead)return;
    const S=W+H;lead=Math.max(-1,lead);trail=Math.min(S+1,trail);
    ctx.fillStyle=color;ctx.beginPath();
    // the strip clipped to the screen: walk the lines x+y=lead and x+y=trail across the rectangle
    const pts:[number,number][]=[];
    const edge=(c:number,rev:boolean)=>{const a:[number,number]=[Math.max(0,c-H),Math.min(H,c)],b:[number,number]=[Math.min(W,c),Math.max(0,c-W)];return rev?[b,a]:[a,b];};
    for(const p of edge(lead,false))pts.push(p);
    // corners of the screen strictly between the two lines
    for(const [x,y] of [[W,0],[W,H],[0,H],[0,0]] as const){const s=x+y;if(s>lead&&s<trail)pts.push([x,y]);}
    for(const p of edge(trail,true))pts.push(p);
    // sort around the centroid so the polygon is simple
    const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;
    pts.sort((p,q)=>Math.atan2(p[1]-cy,p[0]-cx)-Math.atan2(q[1]-cy,q[0]-cx));
    ctx.moveTo(pts[0]![0],pts[0]![1]);for(const [x,y] of pts.slice(1))ctx.lineTo(x,y);ctx.closePath();ctx.fill();
  }
  /** The four corner blocks; `out` 0 = in place, 1 = fully beyond its corner. */
  function corners(out:number){
    if(!ctx)return;
    const m=Math.min(W,H),tri=m*.2,len=m*.5,th=m*.1,d=m*.42*out;
    const poly=(color:string,dx:number,dy:number,p:[number,number][])=>{ctx.fillStyle=color;ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x+dx,y+dy):ctx.moveTo(x+dx,y+dy));ctx.closePath();ctx.fill();};
    poly(NAVY,-d,-d,[[0,0],[tri,0],[0,tri]]);
    poly(NAVY,d,d,[[W,H],[W-tri,H],[W,H-tri]]);
    poly(RED,d,-d,[[W-len,0],[W,0],[W,th],[W-len+th,th]]);
    poly(RED,-d,d,[[0,H-th],[len-th,H-th],[len,H],[0,H]]);
  }
  /** Draws one moment. dir > 0: the sweep moves from bottom-right to top-left (forward). */
  function frame(dir:number,leads:number[],trails:number[],cornerOut:number){
    if(!ctx)return;size();
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    // Forward: x+y measured from the top-left, the bands' leading edge moving up-left. Back: mirror vertically.
    if(dir>0)ctx.setTransform(R,0,0,R,0,0);else ctx.setTransform(R,0,0,-R,0,H*R);
    BANDS.forEach((color,i)=>band(color,leads[i]!,trails[i]!));
    ctx.setTransform(R,0,0,R,0,0);corners(cornerOut);
  }
  const run=(duration:number,step:(ms:number)=>void)=>new Promise<void>(done=>{
    const t0=performance.now();
    const tick=(now:number)=>{const ms=now-t0;step(Math.min(ms,duration));if(ms>=duration)done();else requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  });
  const S=()=>W+H;
  /** Bands sweep in, corners fly in; resolves when the screen is covered. */
  function cover(dir:number){
    size();canvas.style.visibility='visible';
    const total=STAGGER*(BANDS.length-1)+COVER;
    return run(total,ms=>{
      const leads=BANDS.map((_,i)=>S()*(1-inOut(clamp((ms-i*STAGGER)/COVER))));
      frame(dir,leads,BANDS.map(()=>S()+1),1-outQuart(clamp(ms/CORNER_IN)));
    });
  }
  /** Bands leave in reverse order, corners fly out; resolves when the page is clear. */
  function reveal(dir:number){
    const n=BANDS.length,total=STAGGER*(n-1)+REVEAL;
    return run(total,ms=>{
      const trails=BANDS.map((_,i)=>S()*(1-inOut(clamp((ms-(n-1-i)*STAGGER)/REVEAL)))+.5);
      frame(dir,BANDS.map(()=>-1),trails,inQuart(clamp((ms-40)/CORNER_OUT)));
    }).then(()=>{if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}canvas.style.visibility='hidden';});
  }
  return {cover,reveal};
}
