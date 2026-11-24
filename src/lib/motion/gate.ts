/**
 * Home opening (ported from lab/opening v12).
 * 1 Bloom: on a dark stage the TEISU mark grows out of its own centre — key, then the brackets in
 *   symmetric pairs, then the blades — while drifting forward from deep in the screen.
 * 2 Wind-up: press and hold — the mark shrinks and turns back a little, a cobalt light gathers behind
 *   it and the dust is drawn back into the depth; let go and it springs open. Scroll, swipe and keys
 *   do a short wind-up on their own. While it waits, the mark leans towards the pointer.
 * 3 Opening: from the wound-up angle it spins to 180° on a spring, pops back, zooms, and its pieces
 *   spring into the corners as the hero's colour-block frame. The dark is cut open, not faded: the
 *   mark's centre square (already paper-white) opens as an iris with the mark's own 45° cuts. Its
 *   flat sides are past the screen in under half a second; what is left of the dark is four 45°
 *   corners that retreat, more and more slowly, to where the blocks land.
 *
 * The mark is drawn twice on one canvas: paper-white on the dark stage, navy underneath. The iris is a
 * hole cut in the dark, so pieces are white on the dark side of its edge and navy on the page side — the
 * colour change is the edge passing over them as they land. The navy pieces stay as the hero's frame
 * and scroll away with it.
 *
 * Without JS there is no gate. With reduced motion, a repeat visit in the same session, a hash or an
 * already-scrolled page, the frame is shown settled straight away.
 */
import brand from '../../data/brand.json';
type Key='tl'|'br'|'tr'|'bl'|'ru'|'rl'|'c';
interface Pose {x:number;y:number;s:number;o:number}
interface Mark {scale:number;z:number;rot:number;tx:number;ty:number}
interface Frame {p:Record<Key,Pose>;mark:Mark;win:number;reach:number;shade:number;veil:number;glow:number;dust:number;vz:number;dolly:number}

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const outExpo=(t:number)=>t>=1?1:1-Math.pow(2,-10*t);
const outCubic=(t:number)=>1-Math.pow(1-t,3);
const outSine=(t:number)=>Math.sin(t*Math.PI/2);
const inOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const outBack=(t:number)=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
/** Under-damped spring: overshoots and settles; f(1) ≈ 1. [damping, frequency] — lower damping = bouncier. */
const spring=(t:number,k:number,w:number)=>t>=1?1:1-Math.exp(-k*t)*Math.cos(w*t);
const SPRING={spin:[7,7.4],settle:[6.8,8.6],pop:[7.5,12]} as const;

const KEYS:Key[]=['tl','br','tr','bl','ru','rl','c'];
const dir:Record<Key,[number,number]>={tl:[-1,-1],br:[1,1],tr:[1,-1],bl:[-1,1],ru:[1,1],rl:[-1,-1],c:[0,0]};
const pose=()=>Object.fromEntries(KEYS.map(k=>[k,{x:0,y:0,s:1,o:1}])) as Record<Key,Pose>;
const frameOf=(p:Record<Key,Pose>,mark:Partial<Mark>):Frame=>({p,mark:{scale:1,z:0,rot:0,tx:0,ty:0,...mark},win:0,reach:0,shade:0,veil:0,glow:.2,dust:1,vz:.03,dolly:1});
/** Lean towards the pointer, in degrees. The mark tilts as one rigid plane; its shape is unchanged. */
interface Tilt {x:number;y:number}

/* ---------- 1 bloom ---------- */
const BLOOM:Record<Key,number>={c:.2,tl:.45,br:.45,tr:.62,bl:.62,ru:.85,rl:.85};
function intro(t:number,tilt:Tilt):Frame{
  const p=pose();
  for(const k of KEYS){const a=BLOOM[k];p[k].s=k==='c'?outBack(seg(t,a,a+.9)):outExpo(seg(t,a,a+1.4));p[k].o=clamp(seg(t,a,a+.35));}
  const d=outCubic(seg(t,0,2.4)),f=frameOf(p,{scale:lerp(.88,1,d),z:lerp(-360,0,d),tx:tilt.x*d,ty:tilt.y*d});
  // The stage wakes up: the dust rushes out of the depth, then calms; the light comes up with the key.
  f.dust=clamp(t/.9);f.vz=.03+.5*Math.exp(-t/.55);f.glow=.2*outCubic(seg(t,.2,1.6));
  return f;
}
const INTRO_END=2.4;
/** Waiting: a slow breath; hovering unlatches the blades a little. */
function idle(time:number,peek:number,tilt:Tilt):Frame{
  const f=intro(INTRO_END,tilt);
  for(const k of ['ru','rl'] as const){f.p[k].x=dir[k][0]*.05*peek;f.p[k].y=dir[k][1]*.05*peek;}
  f.mark.scale=1+.025*Math.sin(time*1.1);f.glow=.2+.05*Math.sin(time*1.1);f.vz=.03;return f;
}
/* ---------- 2 wind-up ---------- */
const WIND=28,MIN_WIND=.6;
function charge(time:number,peek:number,w:number,tilt:Tilt):Frame{
  const f=idle(time,peek,tilt),e=outCubic(w),flat=1-inOutCubic(clamp(w/MIN_WIND));
  f.mark.scale*=1-.14*e;f.mark.rot=-WIND*e;
  // Fully wound, it trembles a little; it is flat (no lean) before it can let go.
  f.mark.rot+=seg(w,.9,1)*(.45*Math.sin(time*61)+.25*Math.sin(time*97));
  f.mark.tx*=flat;f.mark.ty*=flat;
  for(const k of ['ru','rl'] as const){f.p[k].x-=dir[k][0]*.03*e;f.p[k].y-=dir[k][1]*.03*e;}
  f.p.c.s=1-.12*e;
  f.glow=lerp(f.glow,1,e);f.vz=lerp(.03,-.26,e); // light gathers, dust is drawn back in
  return f;
}
/* ---------- 3 opening → corner blocks ---------- */
// Final pose in mark units; the mark is centrally symmetric, so a 180° turn lands the same frame:
// navy blocks top-left / bottom-right, blade tips top-right / bottom-left.
export const FINAL={outer:1.5,keep:-.025,leave:.75,blade:-.11};
export const FINAL_NARROW={outer:1.7,keep:-.04,blade:-.1};
const final=()=>innerWidth/innerHeight<.8?{...FINAL,...FINAL_NARROW}:FINAL;
// win: the iris' flat sides run out past the screen; reach: its 45° corners follow, slowing down,
// until the screen's corners are inside; veil: the key's white thins to the page's paper;
// home: the hero starts to rise; dolly: the hero settles back from DOLLY to 1.
const T={spin:[0,1.75],zoom:[.05,.82],settle:[.4,1.75],win:[.1,.75],reach:[.28,1.3],veil:[.04,.3],dolly:[.1,1.6],home:.3,end:1.8} as const;
const SPIN=180; // keep a multiple of 180
const KEY_HALF=50.5/720; // the centre square's half side, in mark widths
const DOLLY=1.05;
interface From {scale:number;rot:number;peek:number;w:number;glow:number}
const REST:From={scale:1,rot:0,peek:0,w:0,glow:.2};
/** `width` is the mark's CSS width in px, `zoom` the scale it ends at. */
function opening(t:number,width:number,zoom:number,from:From):Frame{
  const f=final(),p=pose(),s=spring(seg(t,...T.settle),...SPRING.settle);
  for(const k of ['tl','br','tr','bl'] as const){const d=lerp(0,k==='tl'||k==='br'?f.keep:f.leave,s);p[k].x=dir[k][0]*d;p[k].y=dir[k][1]*d;}
  const tuck=.03*outCubic(from.w);
  for(const k of ['ru','rl'] as const){const d=lerp(.05*from.peek-tuck,f.blade,s);p[k].x=dir[k][0]*d;p[k].y=dir[k][1]*d;}
  p.c.s=1-.12*outCubic(from.w);
  const base=lerp(from.scale,1,spring(seg(t,0,.55),...SPRING.pop)),scale=base*lerp(1,zoom,outCubic(seg(t,...T.zoom)));
  const out=frameOf(p,{scale,rot:lerp(from.rot,SPIN,spring(seg(t,...T.spin),...SPRING.spin))});
  // The iris. `win` is the half side of the square, `reach` how far its 45° cuts let it extend along
  // the diagonals (|x|+|y| ≤ reach; a plain square has reach = 2·win). Both grow as a ratio on top of
  // the key square as drawn, so they move with the mark and never jump: the sides race out with the
  // release, the corners follow on a slower, decelerating curve.
  const W=innerWidth,H=innerHeight,key=width*scale*KEY_HALF*p.c.s,keyEnd=width*zoom*KEY_HALF;
  const sideEnd=.5*Math.max(W,H)+.3*Math.min(W,H),reachEnd=1.1*(W+H)/2;
  out.win=key*Math.pow(Math.max(1,sideEnd/keyEnd),outCubic(seg(t,...T.win)));
  out.reach=Math.min(2*out.win,Math.max(out.win,2*key*Math.pow(Math.max(1,reachEnd/(2*keyEnd)),outSine(seg(t,...T.reach)))));
  out.shade=seg(t,.06,.3)*(1-seg(t,.9,1.2));
  out.veil=1-seg(t,...T.veil);
  out.glow=from.glow*(1-outCubic(seg(t,0,.5)));
  out.dust=1-seg(t,.45,1.05);out.vz=.03+2.4*Math.exp(-t/.3); // thrown past the viewer
  out.dolly=lerp(DOLLY,1,outCubic(seg(t,...T.dolly)));
  return out;
}

/* ---------- renderer: one 2D canvas ---------- */
// Everything the opening shows is drawn on a single canvas each frame: the dark stage with its glow
// and dust, the paper-white mark, the iris cut out of the dark, the navy mark seen through it and the
// shade along its edge. The mark used to be stacked SVG elements scaled up to ~30x with a 3D transform,
// and the browser re-rasterised several screen-sized layers every frame; on modest machines the opening
// dropped to a few frames a second and flickered. A canvas draws the same geometry at any scale for
// the cost of a few small paths.

const PIECES=Object.fromEntries(KEYS.map(k=>[k,new Path2D(brand.pieces[k])])) as Record<Key,Path2D>;
const RED='#EF3025',NAVY='#083366',WHITE='#E9E3D6',PERSPECTIVE=1100;
type Dust={x:number;y:number;z:number;s:number;px:number;py:number}

function createRenderer(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d')!;
  let W=1,H=1,R=1,back:HTMLCanvasElement|null=null;
  const rnd=(i:number,n:number)=>{const v=Math.sin(i*n)*43758.5453;return v-Math.floor(v);};
  const dots:Dust[]=Array.from({length:360},(_,i)=>({x:rnd(i+1,12.9898)*2-1,y:rnd(i+1,78.233)*2-1,z:rnd(i+1,3.7127)*.95+.05,s:.65+rnd(i+1,9.173)*.9,px:NaN,py:NaN}));

  /** Match the canvas to its box. The pixel ratio is capped so a big screen stays under ~2.6 Mpx. */
  function size(){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    const r=Math.min(devicePixelRatio||1,2,Math.sqrt(2.6e6/(w*h)));
    if(w===W&&h===H&&r===R&&back)return;
    W=w;H=h;R=r;canvas.width=Math.round(w*r);canvas.height=Math.round(h*r);
    // The dark stage's gradient is drawn once and blitted: the same ellipse the CSS background uses.
    back=document.createElement('canvas');back.width=canvas.width;back.height=canvas.height;
    const b=back.getContext('2d')!,rx=.6*w*r,ry=.55*h*r,g=b.createRadialGradient(0,0,0,0,0,rx);
    g.addColorStop(0,'#121c31');g.addColorStop(.48,'#080d18');g.addColorStop(1,'#030408');
    b.setTransform(1,0,0,ry/rx,back.width/2,back.height/2);b.fillStyle=g;b.fillRect(-back.width,-back.height/(ry/rx),back.width*2,back.height*2/(ry/rx));
  }
  /** The mark's transform: the same as the old CSS (translateZ · rotateX · rotateY · rotate · scale about
   *  the screen centre, perspective 1100px). The small tilt is drawn as its foreshortening (cos). */
  function markMatrix(m:Mark,M:number){
    const depth=PERSPECTIVE/(PERSPECTIVE-m.z),a=m.rot*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
    const kx=Math.cos(m.ty*Math.PI/180)*depth*m.scale,ky=Math.cos(m.tx*Math.PI/180)*depth*m.scale;
    return {a:cs*kx,b:sn*ky,c:-sn*kx,d:cs*ky,M};
  }
  function piece(k:Key,q:Pose,mm:{a:number;b:number;c:number;d:number;M:number}){
    // piece box = mark box (M px); translate(q.x·M, q.y·M), scale(q.s) about its centre; path in 720 units
    const u=mm.M/720*q.s,ox=q.x*mm.M-360*u,oy=q.y*mm.M-360*u;
    ctx.setTransform(R*mm.a*u,R*mm.b*u,R*mm.c*u,R*mm.d*u,R*(W/2+mm.a*ox+mm.c*oy),R*(H/2+mm.b*ox+mm.d*oy));
    ctx.fill(PIECES[k]);
  }
  function iris(f:Frame){
    const a=f.mark.rot*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),g=f.win,k=Math.max(0,Math.min(g,2*g-f.reach));
    const pts=([[g-k,-g],[g,-g+k],[g,g-k],[g-k,g],[-g+k,g],[-g,g-k],[-g,-g+k],[-g+k,-g]] as const).map(([u,v])=>[W/2+u*cs-v*sn,H/2+u*sn+v*cs] as const);
    const covered=([[-W/2,-H/2],[W/2,-H/2]] as const).every(([x,y])=>{const u=Math.abs(x*cs+y*sn),v=Math.abs(-x*sn+y*cs);return u<=g&&v<=g&&u+v<=2*g-k;});
    return {pts,covered,g,k,a};
  }
  function shade(alpha:number,g:number,k:number,a:number){
    if(alpha<=0)return;
    const depth=Math.min(64,Math.max(10,g*.16));
    for(let i=0;i<8;i++){
      // sides at distance g (length 2(g−k)), cuts at distance (2g−k)/√2 (length k√2)
      const flat=i%2===0,dist=flat?g:(2*g-k)/Math.SQRT2,half=flat?g-k:k/Math.SQRT2;if(half<=.5)continue;
      const t=a+i*Math.PI/4,cs=Math.cos(t),sn=Math.sin(t);
      ctx.setTransform(R*cs,R*sn,-R*sn,R*cs,R*(W/2-sn*dist),R*(H/2+cs*dist));
      const band=ctx.createLinearGradient(0,0,0,-depth);band.addColorStop(0,`rgba(4,8,20,${(.3*alpha).toFixed(3)})`);band.addColorStop(1,'rgba(4,8,20,0)');
      ctx.fillStyle=band;ctx.fillRect(-half,-depth,2*half,depth);
    }
  }
  function dust(dt:number,alpha:number,vz:number,rot:number){
    const f=Math.min(W,H)*.9,th=rot*Math.PI/180*.35,cs=Math.cos(th),sn=Math.sin(th);
    ctx.setTransform(R,0,0,R,0,0);ctx.lineCap='round';
    for(const p of dots){
      p.z-=vz*dt;if(p.z<=.02){p.z+=1;p.px=NaN;}else if(p.z>1.02){p.z-=1;p.px=NaN;}
      const x=W/2+(p.x*cs-p.y*sn)*f/p.z,y=H/2+(p.x*sn+p.y*cs)*f/p.z;
      const al=alpha*Math.min(1,(1-p.z)*1.4)*Math.min(1,p.z*9)*.55,size=Math.max(.8,1.9*(1-p.z))*p.s;
      let dx=x-p.px,dy=y-p.py;const len=Math.hypot(dx,dy);p.px=x;p.py=y;
      if(al<.01||x<-60||x>W+60||y<-60||y>H+60)continue;
      if(len>2.2&&len<400){const k=Math.min(1,44/len);dx*=k;dy*=k;
        ctx.strokeStyle=`rgba(226,220,206,${al.toFixed(3)})`;ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x,y);ctx.stroke();
      }else{ctx.fillStyle=`rgba(226,220,206,${al.toFixed(3)})`;ctx.fillRect(x-size/2,y-size/2,size,size);}
    }
  }
  /** Draw one frame. `stage` is false once the opening has landed: only the navy frame is left. */
  function draw(f:Frame,M:number,dt:number,{stage=true,glowPieces=false}={}){
    size();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    const mm=markMatrix(f.mark,M),open=f.win>0||!stage;
    // 1 what the iris shows: the page's own navy mark (the key square fades from paper-white to clear)
    if(open)for(const k of KEYS){
      if(k==='c'){if(f.veil<=0)continue;ctx.globalAlpha=f.veil;ctx.fillStyle=WHITE;}else ctx.fillStyle=k[0]==='r'?RED:NAVY;
      piece(k,f.p[k],mm);ctx.globalAlpha=1;
    }
    if(!stage)return;
    const hole=f.win>0?iris(f):null;
    if(hole?.covered)return;
    if(hole)shade(f.shade,hole.g,hole.k,hole.a);
    // 2 the dark stage, with the iris cut out of it
    ctx.save();ctx.setTransform(R,0,0,R,0,0);
    if(hole){ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(hole.pts[0]![0],hole.pts[0]![1]);for(const [x,y] of hole.pts.slice(1))ctx.lineTo(x,y);ctx.closePath();ctx.clip('evenodd');}
    // Before the iris opens the CSS background is the dark (the canvas stays transparent there); once
    // it opens the canvas paints the dark itself, around the hole.
    ctx.setTransform(1,0,0,1,0,0);if(hole)ctx.drawImage(back!,0,0);
    if(f.glow>0){ // cobalt light behind the mark, filled only where it reaches
      const cx=canvas.width/2,cy=canvas.height/2,rad=(.12+f.glow*.1)*Math.hypot(W/2,H/2)*R,g=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
      g.addColorStop(0,`rgba(52,104,214,${(f.glow*.42).toFixed(3)})`);g.addColorStop(1,'rgba(52,104,214,0)');ctx.fillStyle=g;ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
    }
    if(f.dust>0)dust(dt,f.dust,f.vz,f.mark.rot);
    // 3 the paper-white mark on the dark (its key square is the iris once the opening starts)
    for(const k of KEYS){
      const q=f.p[k];if(q.o<=0||(k==='c'&&hole))continue;
      const red=k[0]==='r';ctx.globalAlpha=q.o;ctx.fillStyle=red?RED:WHITE;
      if(glowPieces){ctx.shadowColor=red?'rgba(239,48,37,.5)':'rgba(233,227,214,.16)';ctx.shadowBlur=(red?14:20)*R;}
      piece(k,q,mm);ctx.shadowBlur=0;ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  return {draw,clear:()=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);},resetDust:()=>{for(const p of dots)p.px=NaN;}};
}

export function initGate(){
  const found=document.querySelector<HTMLElement>('[data-gate]');
  const home=document.querySelector<HTMLElement>('[data-home]');
  const hero=home?.querySelector<HTMLElement>('.hero');
  const showHome=()=>home?.classList.add('is-open');
  const root=document.documentElement;
  // Tell the page's other motion (WebGL covers, the golem) that the opening is out of the way.
  const done=()=>document.dispatchEvent(new Event('teisu:gate-done'));
  if(!found){showHome();done();return;}
  const gate:HTMLElement=found;
  const canvas=gate.querySelector<HTMLCanvasElement>('[data-gate-canvas]')!;
  const markEl=gate.querySelector<HTMLButtonElement>('[data-gate-mark]')!; // the hit area, focus and label
  const view=createRenderer(canvas);
  const width=()=>Math.max(markEl.offsetWidth,1);
  const zoomTo=()=>final().outer*(canvas.clientWidth+canvas.clientHeight)/2/241*720/width();
  const apply=(f:Frame,dt:number,glowPieces=false)=>{view.draw(f,width(),dt,{glowPieces});if(hero)hero.style.scale=f.dolly===1?'':f.dolly.toFixed(4);};

  let phase:'intro'|'idle'|'charge'|'open'|'done'='intro',raf=0,t0=performance.now(),last=t0;
  let peek=0,peekTarget=0,w=0,holding=false,released=false,from:From=REST;
  const tilt={x:0,y:0,tx:0,ty:0};
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const listeners:[EventTarget,string,(e:any)=>void][]=[];
  const on=(target:EventTarget,type:string,fn:(e:any)=>void)=>{target.addEventListener(type,fn as EventListener,{passive:false});listeners.push([target,type,fn]);};

  /** The pieces stay: the layer becomes the hero's frame, absolute at the page top. */
  function settle(){
    phase='done';cancelAnimationFrame(raf);
    gate.classList.remove('is-opening','is-ready');gate.classList.add('is-settled','is-live');
    markEl.tabIndex=-1;markEl.setAttribute('aria-hidden','true');
    const landed=()=>view.draw(opening(T.end,width(),zoomTo(),from),width(),0,{stage:false});
    landed();if(hero)hero.style.scale='';showHome();root.classList.remove('gate-lock');
    for(const [t,type,fn] of listeners)t.removeEventListener(type,fn as EventListener);
    addEventListener('resize',landed,{passive:true});
    done();
  }

  // Whether to play was decided in <head> before the first paint (PageShell): reduced motion, a repeat
  // visit in this session (not a reload) or a hash skip it. The dark stage has been showing since then.
  const play=root.classList.contains('gate-boot');
  root.classList.remove('gate-boot');
  gate.hidden=false;
  if(!play||scrollY>40){settle();return;}

  history.scrollRestoration='manual';scrollTo(0,0);root.classList.add('gate-lock');
  function press(auto=false){
    if(phase==='open'||phase==='done')return;
    if(phase!=='charge'){phase='charge';w=0;}
    holding=!auto;released=auto;
  }
  function release(){if(phase==='charge'){holding=false;released=true;}}
  function open(){
    const f=charge(performance.now()/1000,peek,w,tilt);
    from={scale:f.mark.scale,rot:f.mark.rot,peek,w,glow:f.glow};
    phase='open';t0=performance.now();gate.classList.add('is-opening');
  }
  function tick(now:number){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-t0)/1000;let f:Frame;
    peek+=(peekTarget-peek)*(1-Math.exp(-dt/.18));
    tilt.x+=(tilt.tx-tilt.x)*(1-Math.exp(-dt/.28));tilt.y+=(tilt.ty-tilt.y)*(1-Math.exp(-dt/.28));
    if(phase==='intro'){f=intro(t,tilt);if(t>=INTRO_END){phase='idle';gate.classList.add('is-ready');}}
    else if(phase==='idle')f=idle(now/1000,peek,tilt);
    else if(phase==='charge'){w=Math.min(1,w+dt/(holding?.42:.2));f=charge(now/1000,peek,w,tilt);if(released&&w>=MIN_WIND)open();}
    else{f=opening(t,width(),zoomTo(),from);if(t>=T.home)showHome();if(t>=T.end){sessionStorage.setItem('teisu-gate','1');settle();return;}}
    apply(f,dt,phase!=='open');
    if(phase==='open'&&!gate.classList.contains('is-live'))gate.classList.add('is-live'); // the canvas now paints the dark, around the iris
    raf=requestAnimationFrame(tick);
  }

  let ty=0;
  on(window,'wheel',(e:WheelEvent)=>{e.preventDefault();if(e.deltaY>2)press(true);});
  on(window,'touchstart',(e:TouchEvent)=>{ty=e.touches[0]!.clientY;});
  on(window,'touchmove',(e:TouchEvent)=>{e.preventDefault();if(ty-e.touches[0]!.clientY>16)press(true);});
  on(gate,'pointerdown',(e:PointerEvent)=>{if(e.button===0)press();});
  on(window,'pointerup',release);on(window,'pointercancel',release);
  on(window,'pointermove',(e:PointerEvent)=>{if(!fine.matches||e.pointerType!=='mouse')return;tilt.tx=-(e.clientY/innerHeight*2-1)*7;tilt.ty=(e.clientX/innerWidth*2-1)*9;});
  on(document.documentElement,'mouseleave',()=>{tilt.tx=tilt.ty=0;});
  on(window,'keydown',(e:KeyboardEvent)=>{
    if(['ArrowDown','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press(e.key==='ArrowDown'||e.key==='PageDown');}
    else if(e.key==='Escape'){e.preventDefault();press(true);}
  });
  on(window,'keyup',(e:KeyboardEvent)=>{if(e.key===' '||e.key==='Enter')release();});
  on(markEl,'pointerenter',()=>{peekTarget=1;});on(markEl,'pointerleave',()=>{peekTarget=0;});
  markEl.focus({preventScroll:true});
  raf=requestAnimationFrame(tick);

  // Diagnostics only: freeze the timeline at an exact moment.
  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__gate:{
    seek(which:'intro'|'charge'|'open',v:number){cancelAnimationFrame(raf);phase='idle';
      const flat={x:0,y:0},c=charge(0,0,1,flat);
      const f=which==='intro'?intro(v,flat):which==='charge'?charge(0,0,v,flat):opening(v,width(),zoomTo(),{scale:c.mark.scale,rot:c.mark.rot,peek:0,w:1,glow:c.glow});
      gate.classList.toggle('is-opening',which==='open');gate.classList.toggle('is-ready',which!=='intro');gate.classList.toggle('is-live',which==='open');if(which==='open'&&v>=T.home)showHome();view.resetDust();apply(f,.016,which!=='open');},
  }});
}
