/**
 * Home opening. A dark, deep stage: the TEISU mark blooms out of its own centre, far inside the screen.
 * Scrolling draws a thick white square around it (two strokes, from opposite corners — the mark is
 * centrally symmetric, so is the drawing). When the square closes, the mark spins up — one and a half
 * turns in one continuous ease — and unfolds at full speed while the lights come up on the painting.
 * Without JS there is no gate; with reduced motion (or a repeat visit) the page simply starts open.
 */
type Key='tl'|'br'|'tr'|'bl'|'ru'|'rl'|'c';
interface Pose {x:number;y:number;z:number;rot:number;scale:number;opacity:number}
interface Frame {pieces:Record<Key,Pose>;mark:{rot:number;scale:number;z:number;rx:number;ry:number};bg:number;lit:number;dust:number;warp:number;frame:{draw:number;scale:number;opacity:number}}

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const outExpo=(t:number)=>t>=1?1:1-Math.pow(2,-10*t);
const outCubic=(t:number)=>1-Math.pow(1-t,3);
const inOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const inOutSine=(t:number)=>-(Math.cos(Math.PI*t)-1)/2;
const inQuart=(t:number)=>t**4;

const KEYS:Key[]=['tl','br','tr','bl','ru','rl','c'];
// Outward diagonal of each piece (screen y down). Pairs are rotationally symmetric.
const dir:Record<Key,[number,number]>={tl:[-1,-1],br:[1,1],tr:[1,-1],bl:[-1,1],ru:[1,1],rl:[-1,-1],c:[0,0]};
const rest=():Pose=>({x:0,y:0,z:0,rot:0,scale:1,opacity:1});
const poses=()=>Object.fromEntries(KEYS.map(k=>[k,rest()])) as Record<Key,Pose>;

/** Bloom order: the key first, then the brackets in symmetric pairs, then the blades. [start, turn] */
const BLOOM:Record<Key,[number,number]>={c:[.25,-90],tl:[.5,-140],br:[.5,-140],tr:[.68,-140],bl:[.68,-140],ru:[.9,-100],rl:[.9,-100]};
/** Load-in: every piece unfolds out of the centre point, turning, from deep in the screen. */
function intro(t:number):Frame{
  const p=poses();
  for(const k of KEYS){
    const [a,turn]=BLOOM[k];const e=outExpo(seg(t,a,a+1.6));
    Object.assign(p[k],{scale:e,rot:turn*(1-e),z:-700*(1-e),opacity:clamp(seg(t,a,a+.5))});
  }
  const d=outCubic(seg(t,0,2.8));
  return {pieces:p,mark:{rot:0,scale:lerp(.86,1,d),z:lerp(-420,0,d),rx:lerp(-10,0,d),ry:lerp(16,0,d)},bg:1,lit:0,dust:clamp(t/1.2),warp:0,frame:{draw:0,scale:1,opacity:0}};
}
const INTRO_END=2.7;
/** Waiting: a slow float in depth. `p` is the scroll progress: the square draws, the blades unlatch. */
function idle(time:number,p:number):Frame{
  const f=intro(INTRO_END);
  f.mark.ry=4*Math.sin(time*.55)*(1-p);f.mark.rx=2*Math.sin(time*.4+1)*(1-p);f.mark.scale=1+.05*inOutSine(p);
  for(const k of ['ru','rl'] as const){const [dx,dy]=dir[k];f.pieces[k].x+=dx*.06*p;f.pieces[k].y+=dy*.06*p;}
  f.pieces.c.rot+=45*inOutSine(p);
  f.frame={draw:p,scale:1,opacity:1};
  return f;
}

/** Opening: 1.5 turns in one continuous ease; at top speed it zooms past the viewer and unfolds. */
function opening(t:number,zoom:number,fit:number,from:{rx:number;ry:number;scale:number}):Frame{
  const p=poses();
  const spin=540*inOutCubic(seg(t,0,2.3));
  const k=inOutCubic(seg(t,0,.4));
  p.c.rot=45+45*k;p.c.scale=1-inOutCubic(seg(t,.55,.9));
  const z=inOutCubic(seg(t,.5,1.5));
  const spread=inOutCubic(seg(t,1.0,2.3));
  for(const key of ['tl','br','tr','bl'] as const){const [dx,dy]=dir[key];const d=.04*k+.62*spread;p[key].x=dx*d;p[key].y=dy*d;}
  for(const key of ['ru','rl'] as const){const [dx,dy]=dir[key];const d=.06+.06*k+.95*spread;p[key].x=dx*d;p[key].y=dy*d;}
  const level=1-outCubic(seg(t,0,.4));
  const settleIn=1-.06*inOutCubic(seg(t,0,.55));
  return {pieces:p,mark:{rot:spin,scale:from.scale*settleIn*lerp(1,zoom,z),z:0,rx:from.rx*level,ry:from.ry*level},
    bg:1-inQuart(seg(t,.8,1.7)),lit:inOutCubic(seg(t,.4,.95)),dust:1-seg(t,.7,1.2),warp:inQuart(seg(t,.05,.9)),
    frame:{draw:1,scale:lerp(1,fit,inOutCubic(seg(t,0,.8))),opacity:1-seg(t,.45,.85)}};
}
const OPEN_END=2.4,HOME_AT=1.25;

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
  const nav=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type;
  const seen=sessionStorage.getItem('teisu-gate')==='1'&&nav!=='reload';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||seen||!!location.hash||scrollY>40){gate.remove();showHome();return;}

  const root=document.documentElement;
  const markEl=gate.querySelector<HTMLButtonElement>('[data-gate-mark]')!;
  const frameEl=gate.querySelector<SVGSVGElement>('[data-gate-frame]')!;
  const pieces=new Map<Key,HTMLElement>(Array.from(gate.querySelectorAll<HTMLElement>('[data-piece]')).map(el=>[el.dataset.piece as Key,el]));
  const dust=createDust(gate.querySelector<HTMLCanvasElement>('[data-gate-dust]')!);
  // Zoom so the mark ends far wider than the screen; the square grows to the screen's edge.
  const zoom=()=>1.1*Math.hypot(innerWidth,innerHeight)/Math.max(markEl.offsetWidth,1);
  const fit=()=>Math.max(innerWidth,innerHeight)*1.04/Math.max(frameEl.getBoundingClientRect().width||1,1);
  let fitCache=1;

  function apply(f:Frame){
    const m=f.mark;
    markEl.style.transform=`translateZ(${m.z.toFixed(1)}px) rotateX(${m.rx.toFixed(2)}deg) rotateY(${m.ry.toFixed(2)}deg) rotate(${m.rot.toFixed(2)}deg) scale(${m.scale.toFixed(4)})`;
    gate.style.setProperty('--hole',`${((1-f.bg)*160).toFixed(2)}vmax`);
    gate.style.setProperty('--gate-bg',f.bg.toFixed(3));
    gate.style.setProperty('--lit',f.lit.toFixed(3));
    gate.style.setProperty('--draw',f.frame.draw.toFixed(4));
    frameEl.style.transform=`translate(-50%,-50%) scale(${f.frame.scale.toFixed(4)})`;
    frameEl.style.opacity=f.frame.opacity.toFixed(3);
    for(const [key,el] of pieces){
      const p=f.pieces[key];
      el.style.transform=`translate3d(${(p.x*100).toFixed(3)}%,${(p.y*100).toFixed(3)}%,${p.z.toFixed(1)}px) rotate(${p.rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`;
      el.style.opacity=p.opacity.toFixed(3);
    }
  }

  gate.hidden=false;history.scrollRestoration='manual';scrollTo(0,0);root.classList.add('gate-lock');
  let phase:'intro'|'idle'|'open'|'done'='intro',raf=0;
  let start=performance.now(),last=start,target=0,shown=0,auto=false,lastInput=0,from={rx:0,ry:0,scale:1};
  function tick(now:number){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-start)/1000;let f:Frame;
    if(phase==='intro'){f=intro(t);if(t>=INTRO_END){phase='idle';gate.classList.add('is-ready');}}
    else if(phase==='idle'){
      if(auto)target=Math.min(1,target+dt*2.4);
      else if(target<1&&now-lastInput>900)target=Math.max(0,target-dt*.22);
      shown+=(target-shown)*(1-Math.exp(-dt/.09));if(target>=1&&shown>.995)shown=1;
      f=idle(now/1000,shown);from={rx:f.mark.rx,ry:f.mark.ry,scale:f.mark.scale};
      if(shown>=1)open();
    }
    else{f=opening(t,zoom(),fitCache,from);if(t>=HOME_AT)showHome();if(t>=OPEN_END){finish();return;}}
    dust.draw(dt,f.dust,f.warp);apply(f);
    raf=requestAnimationFrame(tick);
  }
  function open(){
    if(phase==='open'||phase==='done')return;
    if(phase==='intro'){const f=intro(Math.max(0,(performance.now()-start)/1000));from={rx:f.mark.rx,ry:f.mark.ry,scale:f.mark.scale};}
    fitCache=fit();phase='open';start=performance.now();gate.classList.add('is-opening');
  }
  function finish(){
    phase='done';cancelAnimationFrame(raf);gate.remove();root.classList.remove('gate-lock');showHome();
    sessionStorage.setItem('teisu-gate','1');
    for(const [type,fn] of listeners)removeEventListener(type,fn as EventListener);
    dispatchEvent(new Event('resize'));
  }
  /** Scroll input feeds the square's progress; it slowly unwinds if you stop halfway. */
  const feed=(delta:number)=>{if(phase==='open'||phase==='done')return;target=clamp(target+delta);lastInput=performance.now();};

  let touchY=0;
  const listeners:[string,(e:any)=>void][]=[
    ['wheel',(e:WheelEvent)=>{e.preventDefault();feed(e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1)/900);}],
    ['touchstart',(e:TouchEvent)=>{touchY=e.touches[0]!.clientY;}],
    ['touchmove',(e:TouchEvent)=>{e.preventDefault();const y=e.touches[0]!.clientY;feed((touchY-y)/360);touchY=y;}],
    ['keydown',(e:KeyboardEvent)=>{
      if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();feed(.2);}
      else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();feed(-.2);}
      else if(e.key==='Enter'){e.preventDefault();auto=true;}
      else if(e.key==='Escape'){e.preventDefault();open();}
    }],
    ['resize',()=>dust.resize()],
  ];
  for(const [type,fn] of listeners)addEventListener(type,fn as EventListener,{passive:false});
  markEl.addEventListener('click',()=>{auto=true;lastInput=performance.now();});
  markEl.focus({preventScroll:true});
  raf=requestAnimationFrame(tick);

  // Diagnostics only: freeze the timeline and seek to an exact moment.
  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__gate:{
    seek(which:'intro'|'idle'|'open',t:number){cancelAnimationFrame(raf);phase='done';
      const f=which==='intro'?intro(t):which==='idle'?idle(0,t):opening(t,zoom(),fit(),{rx:0,ry:0,scale:1});
      gate.classList.toggle('is-ready',which!=='intro'||t>=INTRO_END);gate.classList.toggle('is-opening',which==='open');
      if(which==='open'&&t>=HOME_AT)showHome();dust.draw(.016,f.dust,f.warp);apply(f);},
  }});
}
