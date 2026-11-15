/**
 * Home opening. A dark, deep stage: the TEISU mark materialises from far inside the screen.
 * One click / scroll / key unlocks it: key turn → half turn → the lights come up while the mark
 * zooms past the viewer → the pieces settle as the home page's frame. Time-based, eased phases.
 * Without JS there is no gate; with reduced motion (or a repeat visit) it shows the settled frame.
 */
type Key='tl'|'br'|'tr'|'bl'|'ru'|'rl'|'c';
interface Pose {x:number;y:number;z:number;rot:number;rx:number;ry:number;scale:number;opacity:number}
interface Frame {pieces:Record<Key,Pose>;mark:{rot:number;scale:number;z:number;rx:number;ry:number};bg:number;lit:number;dust:number;warp:number;clip:number}

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const outExpo=(t:number)=>t>=1?1:1-Math.pow(2,-10*t);
const outCubic=(t:number)=>1-Math.pow(1-t,3);
const outQuint=(t:number)=>1-Math.pow(1-t,5);
const inOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const inOutQuart=(t:number)=>t<.5?8*t**4:1-Math.pow(-2*t+2,4)/2;
const inQuart=(t:number)=>t**4;

const KEYS:Key[]=['tl','br','tr','bl','ru','rl','c'];
// Outward diagonal of each piece (screen y down). Pairs are rotationally symmetric.
const dir:Record<Key,[number,number]>={tl:[-1,-1],br:[1,1],tr:[1,-1],bl:[-1,1],ru:[1,1],rl:[-1,-1],c:[0,0]};
const rest=():Pose=>({x:0,y:0,z:0,rot:0,rx:0,ry:0,scale:1,opacity:1});
const poses=()=>Object.fromEntries(KEYS.map(k=>[k,rest()])) as Record<Key,Pose>;

/** Where each piece starts in the depth: [x, y, z(px), rot, rx, ry, start time]. Fixed, not random. */
const DEPTH:Record<Key,[number,number,number,number,number,number,number]>={
  c:[0,0,-2600,-90,0,0,.35],
  tl:[-1.1,-.7,-2200,-120,40,-55,.65], br:[1.1,.7,-2200,-120,-40,55,.65],
  tr:[1.2,-.9,-2500,110,-50,-40,.85], bl:[-1.2,.9,-2500,110,50,40,.85],
  ru:[1.6,-.2,-2900,-160,20,70,1.1], rl:[-1.6,.2,-2900,-160,-20,-70,1.1],
};
/** Load-in: pieces fly in from deep space and lock together; the whole mark drifts forward. */
function intro(t:number):Frame{
  const p=poses();
  for(const k of KEYS){
    const [x,y,z,rot,rx,ry,a]=DEPTH[k];const e=outExpo(seg(t,a,a+1.9));const f=1-e;
    Object.assign(p[k],{x:x*f,y:y*f,z:z*f,rot:rot*f,rx:rx*f,ry:ry*f,opacity:clamp(seg(t,a,a+.9))});
  }
  const d=outCubic(seg(t,0,3.2));
  return {pieces:p,mark:{rot:0,scale:lerp(.82,1,d),z:lerp(-500,0,d),rx:lerp(-14,0,d),ry:lerp(28,0,d)},bg:1,lit:0,dust:clamp(t/1.2),warp:0,clip:0};
}
const INTRO_END=3.3;
/** Waiting: a slow float in depth; hovering unlatches the blades slightly. */
function idle(time:number,peek:number):Frame{
  const f=intro(INTRO_END);
  f.mark.ry=5*Math.sin(time*.55);f.mark.rx=2.5*Math.sin(time*.4+1);
  for(const k of ['ru','rl'] as const){const [dx,dy]=dir[k];f.pieces[k].x+=dx*.05*peek;f.pieces[k].y+=dy*.05*peek;}
  f.pieces.c.rot+=20*peek;
  return f;
}

/**
 * Final pose = the home hero's frame. Measured in mark units (720 per mark); q = screen px per unit.
 * The blades (bands between x−y = 119 and 241 units off the diagonal) cut across two corners;
 * after the half turn tl/br sit at bottom-right/top-left and stay as corner blocks, tr/bl leave.
 */
export const FINAL={outer:1.5,keep:-.03,leave:.75,blade:-.115};
/** Portrait screens: content fills the width, so the frame is pushed further into the corners. */
export const FINAL_NARROW={outer:1.8,keep:-.05,blade:-.13};
const final=()=>innerWidth/innerHeight<.8?{...FINAL,...FINAL_NARROW}:FINAL;

/** Opening: key turn → half turn → lights up while zooming → settle into the hero frame. */
function opening(t:number,zoom:number,from:{rx:number;ry:number}):Frame{
  const f=final();const p=poses();
  const k=inOutCubic(seg(t,0,.45));
  p.c.rot=90*k;p.c.scale=1-inOutCubic(seg(t,.75,1.05));
  const r=inOutQuart(seg(t,.2,1.1));
  const anticipate=1-.08*inOutCubic(seg(t,.2,.95));
  const z=inOutCubic(seg(t,.95,1.75));
  const s=outQuint(seg(t,1.3,2.5));
  const level=1-outCubic(seg(t,0,.5));
  for(const key of ['tl','br','tr','bl'] as const){const [dx,dy]=dir[key];const d=lerp(.04*r,key==='tl'||key==='br'?f.keep:f.leave,s);p[key].x=dx*d;p[key].y=dy*d;}
  for(const key of ['ru','rl'] as const){const [dx,dy]=dir[key];const d=lerp(.08*k,f.blade,s);p[key].x=dx*d;p[key].y=dy*d;}
  return {pieces:p,mark:{rot:180*r,scale:anticipate*lerp(1,zoom,z),z:0,rx:from.rx*level,ry:from.ry*level},
    bg:1-inQuart(seg(t,.95,1.75)),lit:inOutCubic(seg(t,.85,1.45)),dust:1-seg(t,.95,1.45),warp:inQuart(seg(t,.1,1.0)),clip:s};
}
const OPEN_END=2.5,HOME_AT=1.55;

/** Dust drifting toward the viewer; it streaks during the warp. 2D canvas, not WebGL. */
function createDust(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');const n=220;
  const pts=Array.from({length:n},(_,i)=>({x:(Math.sin(i*12.9898)*43758.5453%1)*2-1,y:(Math.sin(i*78.233)*12345.678%1)*2-1,z:((i*.618)%1)*.95+.05}));
  let w=0,h=0,dpr=1;
  const resize=()=>{dpr=Math.min(devicePixelRatio,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;};resize();
  return {resize,draw(dt:number,alpha:number,warp:number){
    if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(alpha<=0)return;
    const speed=.035+warp*2.2,f=Math.min(w,h)*.9,cx=w/2,cy=h/2;
    for(const p of pts){
      const z0=p.z;p.z-=speed*dt;if(p.z<=.02){p.z+=1;}
      const sx=cx+p.x*f/p.z,sy=cy+p.y*f/p.z;const px=cx+p.x*f/z0,py=cy+p.y*f/z0;
      const a=alpha*Math.min(1,(1-p.z)*1.4)*.55;if(a<=.01)continue;
      ctx.strokeStyle=`rgba(226,220,206,${a.toFixed(3)})`;ctx.lineWidth=Math.max(.6,1.6*(1-p.z));
      ctx.beginPath();ctx.moveTo(warp>.05?px:sx-.01,warp>.05?py:sy);ctx.lineTo(sx,sy);ctx.stroke();
    }
  }};
}

export function initGate(){
  const found=document.querySelector<HTMLElement>('[data-gate]');
  const home=document.querySelector<HTMLElement>('[data-home]');
  const showHome=()=>home?.classList.add('is-open');
  if(!found){showHome();return;}
  const gate:HTMLElement=found;
  const root=document.documentElement;
  const markEl=gate.querySelector<HTMLButtonElement>('[data-gate-mark]')!;
  const pieces=new Map<Key,HTMLElement>(Array.from(gate.querySelectorAll<HTMLElement>('[data-piece]')).map(el=>[el.dataset.piece as Key,el]));
  const dustCanvas=gate.querySelector<HTMLCanvasElement>('[data-gate-dust]')!;
  const headerHeight=()=>document.querySelector<HTMLElement>('[data-site-header]')?.offsetHeight??0;
  // Zoom so the blades' outer edge (241 units off the diagonal) lands at FINAL.outer of the way to a corner.
  const zoom=()=>{const q=final().outer*(innerWidth+innerHeight)/2/241;return q*720/Math.max(markEl.offsetWidth,1);};

  function apply(frame:Frame){
    const m=frame.mark;
    markEl.style.transform=`translateZ(${m.z.toFixed(1)}px) rotateX(${m.rx.toFixed(2)}deg) rotateY(${m.ry.toFixed(2)}deg) rotate(${m.rot.toFixed(2)}deg) scale(${m.scale.toFixed(4)})`;
    gate.style.setProperty('--gate-bg',frame.bg.toFixed(3));
    gate.style.setProperty('--hole',`${((1-frame.bg)*160).toFixed(2)}vmax`);
    gate.style.setProperty('--lit',frame.lit.toFixed(3));
    gate.style.clipPath=frame.clip>0?`inset(${(frame.clip*headerHeight()).toFixed(1)}px 0 0 0)`:'';
    for(const [key,el] of pieces){
      const p=frame.pieces[key];
      el.style.transform=`translate3d(${(p.x*100).toFixed(3)}%,${(p.y*100).toFixed(3)}%,${p.z.toFixed(1)}px) rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg) rotate(${p.rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`;
      el.style.opacity=p.opacity.toFixed(3);
    }
  }

  const nav=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type;
  const seen=sessionStorage.getItem('teisu-gate')==='1'&&nav!=='reload';
  const skip=matchMedia('(prefers-reduced-motion: reduce)').matches||seen||!!location.hash||scrollY>40;
  gate.hidden=false;

  /** The pieces stay: the fixed layer becomes the hero's frame, absolute at the page top. */
  function settle(){
    cancelAnimationFrame(raf);phase='done';
    gate.classList.remove('is-opening','is-ready');gate.classList.add('is-settled');
    markEl.tabIndex=-1;markEl.setAttribute('aria-hidden','true');dustCanvas.remove();
    apply(opening(OPEN_END,zoom(),{rx:0,ry:0}));showHome();
    addEventListener('resize',()=>apply(opening(OPEN_END,zoom(),{rx:0,ry:0})),{passive:true});
  }
  let phase:'intro'|'idle'|'open'|'done'='intro',raf=0;
  if(skip){settle();return;}

  const dust=createDust(dustCanvas);
  history.scrollRestoration='manual';scrollTo(0,0);root.classList.add('gate-lock');
  let start=performance.now(),last=start,peek=0,peekTarget=0,from={rx:0,ry:0},warp=0,dustAlpha=0;
  function tick(now:number){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-start)/1000;let frame:Frame;
    if(phase==='intro'){frame=intro(t);if(t>=INTRO_END){phase='idle';gate.classList.add('is-ready');}}
    else if(phase==='idle'){peek+=(peekTarget-peek)*(1-Math.exp(-dt/.18));frame=idle(now/1000,peek);from={rx:frame.mark.rx,ry:frame.mark.ry};}
    else{frame=opening(t,zoom(),from);if(t>=HOME_AT)showHome();if(t>=OPEN_END){finish();return;}}
    warp=frame.warp;dustAlpha=frame.dust;dust.draw(dt,dustAlpha,warp);apply(frame);
    raf=requestAnimationFrame(tick);
  }
  function open(){
    if(phase==='open'||phase==='done')return;
    if(phase==='intro'){const f=intro(Math.max(0,(performance.now()-start)/1000));from={rx:f.mark.rx,ry:f.mark.ry};}
    phase='open';start=performance.now();gate.classList.add('is-opening');
  }
  function finish(){
    root.classList.remove('gate-lock');settle();
    sessionStorage.setItem('teisu-gate','1');
    for(const [type,fn] of listeners)removeEventListener(type,fn as EventListener);
    dispatchEvent(new Event('resize'));
  }

  let touchY=0;
  const listeners:[string,(e:any)=>void][]=[
    ['wheel',(e:WheelEvent)=>{e.preventDefault();if(e.deltaY>2)open();}],
    ['touchstart',(e:TouchEvent)=>{touchY=e.touches[0]!.clientY;}],
    ['touchmove',(e:TouchEvent)=>{e.preventDefault();if(touchY-e.touches[0]!.clientY>18)open();}],
    ['keydown',(e:KeyboardEvent)=>{if(['ArrowDown','PageDown',' ','Enter','Escape'].includes(e.key)){e.preventDefault();open();}}],
    ['resize',()=>dust.resize()],
  ];
  for(const [type,fn] of listeners)addEventListener(type,fn as EventListener,{passive:false});
  markEl.addEventListener('click',open);
  markEl.addEventListener('pointerenter',()=>{peekTarget=1;});markEl.addEventListener('pointerleave',()=>{peekTarget=0;});
  markEl.focus({preventScroll:true});
  raf=requestAnimationFrame(tick);

  // Diagnostics only: freeze the timeline and seek to an exact moment.
  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__gate:{
    seek(which:'intro'|'open',t:number){cancelAnimationFrame(raf);phase='idle';const f=which==='intro'?intro(t):opening(t,zoom(),{rx:0,ry:0});if(which==='open'){gate.classList.add('is-opening');if(t>=HOME_AT)showHome();}else gate.classList.toggle('is-ready',t>=INTRO_END);dust.draw(.016,f.dust,f.warp);apply(f);},
    final(next:Partial<typeof FINAL>,narrow?:Partial<typeof FINAL_NARROW>){Object.assign(FINAL,next);if(narrow)Object.assign(FINAL_NARROW,narrow);},
  }});
}
