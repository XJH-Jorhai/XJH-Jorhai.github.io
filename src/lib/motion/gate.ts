/**
 * Home opening (ported from lab/opening v10).
 * 1 Bloom: on a dark stage the TEISU mark grows out of its own centre — key, then the brackets in
 *   symmetric pairs, then the blades — while drifting forward from deep in the screen.
 * 2 Wind-up: press and hold — the mark shrinks and turns back a little; let go and it springs open.
 *   Scroll, swipe and keys do a short wind-up on their own.
 * 3 Opening: from the wound-up angle it spins to 180° on a spring, pops back, zooms, and its pieces
 *   spring into the corners as the hero's colour-block frame. It stays paper-white until it lands,
 *   then turns navy while the dark lifts. The pieces stay as the hero's frame and scroll away with it.
 * Without JS there is no gate. With reduced motion, a repeat visit in the same session, a hash or an
 * already-scrolled page, the frame is shown settled straight away.
 */
type Key='tl'|'br'|'tr'|'bl'|'ru'|'rl'|'c';
interface Pose {x:number;y:number;s:number;o:number}
interface Frame {p:Record<Key,Pose>;mark:{scale:number;z:number;rot:number};bg:number;lit:number;dust:number}

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const outExpo=(t:number)=>t>=1?1:1-Math.pow(2,-10*t);
const outCubic=(t:number)=>1-Math.pow(1-t,3);
const inOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const outBack=(t:number)=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
/** Under-damped spring: overshoots and settles; f(1) ≈ 1. [damping, frequency] — lower damping = bouncier. */
const spring=(t:number,k:number,w:number)=>t>=1?1:1-Math.exp(-k*t)*Math.cos(w*t);
const SPRING={spin:[7,7.4],settle:[6.8,8.6],pop:[7.5,12]} as const;

const KEYS:Key[]=['tl','br','tr','bl','ru','rl','c'];
const dir:Record<Key,[number,number]>={tl:[-1,-1],br:[1,1],tr:[1,-1],bl:[-1,1],ru:[1,1],rl:[-1,-1],c:[0,0]};
const pose=()=>Object.fromEntries(KEYS.map(k=>[k,{x:0,y:0,s:1,o:1}])) as Record<Key,Pose>;

/* ---------- 1 bloom ---------- */
const BLOOM:Record<Key,number>={c:.2,tl:.45,br:.45,tr:.62,bl:.62,ru:.85,rl:.85};
function intro(t:number):Frame{
  const p=pose();
  for(const k of KEYS){const a=BLOOM[k];p[k].s=k==='c'?outBack(seg(t,a,a+.9)):outExpo(seg(t,a,a+1.4));p[k].o=clamp(seg(t,a,a+.35));}
  const d=outCubic(seg(t,0,2.4));
  return {p,mark:{scale:lerp(.88,1,d),z:lerp(-360,0,d),rot:0},bg:1,lit:0,dust:clamp(t/1.2)};
}
const INTRO_END=2.4;
/** Waiting: a slow breath; hovering unlatches the blades a little. */
function idle(time:number,peek:number):Frame{
  const f=intro(INTRO_END);
  for(const k of ['ru','rl'] as const){f.p[k].x=dir[k][0]*.05*peek;f.p[k].y=dir[k][1]*.05*peek;}
  f.mark.scale=1+.025*Math.sin(time*1.1);return f;
}
/* ---------- 2 wind-up ---------- */
const WIND=28,MIN_WIND=.6;
function charge(time:number,peek:number,w:number):Frame{
  const f=idle(time,peek),e=outCubic(w);
  f.mark.scale*=1-.14*e;f.mark.rot=-WIND*e;
  for(const k of ['ru','rl'] as const){f.p[k].x-=dir[k][0]*.03*e;f.p[k].y-=dir[k][1]*.03*e;}
  f.p.c.s=1-.12*e;return f;
}
/* ---------- 3 opening → corner blocks ---------- */
// Final pose in mark units; the mark is centrally symmetric, so a 180° turn lands the same frame:
// navy blocks top-left / bottom-right, blade tips top-right / bottom-left.
export const FINAL={outer:1.5,keep:-.025,leave:.75,blade:-.11};
export const FINAL_NARROW={outer:1.7,keep:-.04,blade:-.1};
const final=()=>innerWidth/innerHeight<.8?{...FINAL,...FINAL_NARROW}:FINAL;
const T={spin:[0,1.75],zoom:[.05,.82],settle:[.4,1.75],lit:[.72,1.28],bg:[.76,1.33],key:[.16,.55],home:.9,end:1.8} as const;
const SPIN=180; // keep a multiple of 180
interface From {scale:number;rot:number;peek:number;w:number}
function opening(t:number,zoom:number,from:From):Frame{
  const f=final(),p=pose(),s=spring(seg(t,...T.settle),...SPRING.settle);
  for(const k of ['tl','br','tr','bl'] as const){const d=lerp(0,k==='tl'||k==='br'?f.keep:f.leave,s);p[k].x=dir[k][0]*d;p[k].y=dir[k][1]*d;}
  const tuck=.03*outCubic(from.w);
  for(const k of ['ru','rl'] as const){const d=lerp(.05*from.peek-tuck,f.blade,s);p[k].x=dir[k][0]*d;p[k].y=dir[k][1]*d;}
  p.c.s=(1-.12*outCubic(from.w))*(1-inOutCubic(seg(t,...T.key)));
  const base=lerp(from.scale,1,spring(seg(t,0,.55),...SPRING.pop)),z=outCubic(seg(t,...T.zoom));
  return {p,mark:{scale:base*lerp(1,zoom,z),z:0,rot:lerp(from.rot,SPIN,spring(seg(t,...T.spin),...SPRING.spin))},
    bg:1-inOutCubic(seg(t,...T.bg)),lit:inOutCubic(seg(t,...T.lit)),dust:1-seg(t,.25,.75)};
}

/** Dust drifting toward the viewer. 2D canvas, not WebGL. */
function createDust(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');
  const pts=Array.from({length:200},(_,i)=>({x:(Math.sin(i*12.9898)*43758.5453%1)*2-1,y:(Math.sin(i*78.233)*12345.678%1)*2-1,z:((i*.618)%1)*.95+.05}));
  return (dt:number,a:number)=>{
    if(!ctx)return;const w=innerWidth,h=innerHeight,r=Math.min(devicePixelRatio,2);
    if(canvas.width!==Math.round(w*r)){canvas.width=Math.round(w*r);canvas.height=Math.round(h*r);}
    ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);if(a<=0)return;
    const f=Math.min(w,h)*.9;
    for(const p of pts){p.z-=.03*dt;if(p.z<=.02)p.z+=1;
      const x=w/2+p.x*f/p.z,y=h/2+p.y*f/p.z,al=a*Math.min(1,(1-p.z)*1.4)*.5;if(al<.01)continue;
      ctx.fillStyle=`rgba(226,220,206,${al.toFixed(3)})`;const s=Math.max(.8,1.8*(1-p.z));ctx.fillRect(x,y,s,s);}
  };
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
  const dust=createDust(gate.querySelector<HTMLCanvasElement>('[data-gate-dust]')!);
  const zoomTo=()=>final().outer*(innerWidth+innerHeight)/2/241*720/Math.max(markEl.offsetWidth,1);

  function apply(f:Frame){
    markEl.style.transform=`translateZ(${f.mark.z.toFixed(1)}px) rotate(${f.mark.rot.toFixed(2)}deg) scale(${f.mark.scale.toFixed(4)})`;
    gate.style.setProperty('--bg',f.bg.toFixed(3));gate.style.setProperty('--lit',f.lit.toFixed(3));
    for(const [k,el] of pieces){const q=f.p[k];el.style.transform=`translate(${(q.x*100).toFixed(3)}%,${(q.y*100).toFixed(3)}%) scale(${q.s.toFixed(4)})`;el.style.opacity=q.o.toFixed(3);}
  }

  let phase:'intro'|'idle'|'charge'|'open'|'done'='intro',raf=0,t0=performance.now(),last=t0;
  let peek=0,peekTarget=0,w=0,holding=false,released=false,from:From={scale:1,rot:0,peek:0,w:0};
  const listeners:[EventTarget,string,(e:any)=>void][]=[];
  const on=(target:EventTarget,type:string,fn:(e:any)=>void)=>{target.addEventListener(type,fn as EventListener,{passive:false});listeners.push([target,type,fn]);};

  /** The pieces stay: the fixed layer becomes the hero's frame, absolute at the page top. */
  function settle(){
    phase='done';cancelAnimationFrame(raf);
    gate.classList.remove('is-opening','is-ready');gate.classList.add('is-settled');
    markEl.tabIndex=-1;markEl.setAttribute('aria-hidden','true');dust(0,0);
    apply(opening(T.end,zoomTo(),from));showHome();root.classList.remove('gate-lock');
    for(const [t,type,fn] of listeners)t.removeEventListener(type,fn as EventListener);
    addEventListener('resize',()=>apply(opening(T.end,zoomTo(),from)),{passive:true});
  }

  const nav=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type;
  const seen=sessionStorage.getItem('teisu-gate')==='1'&&nav!=='reload';
  gate.hidden=false;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||seen||!!location.hash||scrollY>40){settle();return;}

  history.scrollRestoration='manual';scrollTo(0,0);root.classList.add('gate-lock');
  function press(auto=false){
    if(phase==='open'||phase==='done')return;
    if(phase!=='charge'){phase='charge';w=0;}
    holding=!auto;released=auto;
  }
  function release(){if(phase==='charge'){holding=false;released=true;}}
  function open(){
    const f=charge(performance.now()/1000,peek,w);
    from={scale:f.mark.scale,rot:f.mark.rot,peek,w};
    phase='open';t0=performance.now();gate.classList.add('is-opening');
  }
  function tick(now:number){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-t0)/1000;let f:Frame;
    peek+=(peekTarget-peek)*(1-Math.exp(-dt/.18));
    if(phase==='intro'){f=intro(t);if(t>=INTRO_END){phase='idle';gate.classList.add('is-ready');}}
    else if(phase==='idle')f=idle(now/1000,peek);
    else if(phase==='charge'){w=Math.min(1,w+dt/(holding?.42:.2));f=charge(now/1000,peek,w);if(released&&w>=MIN_WIND)open();}
    else{f=opening(t,zoomTo(),from);if(t>=T.home)showHome();if(t>=T.end){sessionStorage.setItem('teisu-gate','1');settle();return;}}
    apply(f);dust(dt,f.dust);
    raf=requestAnimationFrame(tick);
  }

  let ty=0;
  on(window,'wheel',(e:WheelEvent)=>{e.preventDefault();if(e.deltaY>2)press(true);});
  on(window,'touchstart',(e:TouchEvent)=>{ty=e.touches[0]!.clientY;});
  on(window,'touchmove',(e:TouchEvent)=>{e.preventDefault();if(ty-e.touches[0]!.clientY>16)press(true);});
  on(gate,'pointerdown',(e:PointerEvent)=>{if(e.button===0)press();});
  on(window,'pointerup',release);on(window,'pointercancel',release);
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
      const c=charge(0,0,1);const f=which==='intro'?intro(v):which==='charge'?charge(0,0,v):opening(v,zoomTo(),{scale:c.mark.scale,rot:c.mark.rot,peek:0,w:1});
      gate.classList.toggle('is-opening',which==='open');gate.classList.toggle('is-ready',which!=='intro');if(which==='open'&&v>=T.home)showHome();apply(f);dust(.016,f.dust);},
  }});
}
