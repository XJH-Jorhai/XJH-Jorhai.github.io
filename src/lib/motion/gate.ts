/**
 * Home opening: the TEISU mark assembles, waits, then unlocks full screen.
 * Time-based timelines (not scroll-scrubbed), each phase with its own easing.
 * Without JS or with reduced motion the gate never shows; the foyer is the first screen.
 */
type Key='tl'|'br'|'tr'|'bl'|'ru'|'rl'|'c';
interface Pose {x:number;y:number;rot:number;scale:number;opacity:number}

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const outExpo=(t:number)=>t>=1?1:1-Math.pow(2,-10*t);
const inOutCubic=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const inOutQuart=(t:number)=>t<.5?8*t**4:1-Math.pow(-2*t+2,4)/2;
const inQuart=(t:number)=>t**4;
const outBack=(t:number)=>{const c=1.6;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

// Outward diagonal of each piece (screen y down). Pairs are rotationally symmetric.
const dir:Record<Key,[number,number]>={tl:[-1,-1],br:[1,1],tr:[1,-1],bl:[-1,1],ru:[1,1],rl:[-1,-1],c:[0,0]};
const rest=():Pose=>({x:0,y:0,rot:0,scale:1,opacity:1});

/** Load-in: key first, brackets spiral in by pairs, blades slide home, a small settle. */
function intro(t:number){
  const p:Record<Key,Pose>={tl:rest(),br:rest(),tr:rest(),bl:rest(),ru:rest(),rl:rest(),c:rest()};
  const kc=seg(t,.1,.8);p.c.scale=outBack(kc);p.c.rot=lerp(-90,0,outExpo(kc));p.c.opacity=clamp(kc*4);
  for(const [k,a] of [['tl',.3],['br',.3],['tr',.46],['bl',.46]] as const){
    const e=outExpo(seg(t,a,a+1.1));const [dx,dy]=dir[k];
    p[k].x=dx*.55*(1-e);p[k].y=dy*.55*(1-e);p[k].rot=(k==='tl'||k==='br'?-90:90)*(1-e);p[k].opacity=clamp(seg(t,a,a+.35));
  }
  for(const k of ['ru','rl'] as const){const e=outExpo(seg(t,.9,1.75));const [dx,dy]=dir[k];p[k].x=dx*.6*(1-e);p[k].y=dy*.6*(1-e);p[k].opacity=clamp(seg(t,.9,1.2));}
  const settle=Math.sin(Math.PI*seg(t,1.45,2.05));
  return {pieces:p,mark:{rot:0,scale:1+.025*settle},bg:1,clip:0};
}
const INTRO_END=2.1;

/**
 * Final pose = the foyer's frame. Measured in mark units (720 per mark); q = screen px per unit.
 * The blades (bands between x−y = 119 and 241 units from the diagonal) cross the bottom-left and
 * top-right corners; after the half turn the tl/br brackets sit at bottom-right/top-left and stay as
 * corner chunks, tr/bl leave the screen.
 */
export const FINAL={outer:1.5,keep:-.025,leave:.75,blade:-.11};
/** Portrait screens: content fills the width, so the frame is pushed further into the corners. */
export const FINAL_NARROW={outer:1.7,keep:-.04,blade:-.1};
const final=()=>innerWidth/innerHeight<.8?{...FINAL,...FINAL_NARROW}:FINAL;
const outQuint=(t:number)=>1-Math.pow(1-t,5);

/** Opening: key turn → half turn → zoom into the frame → settle into the foyer's frame. */
function opening(t:number,zoom:number){
  const f=final();
  const p:Record<Key,Pose>={tl:rest(),br:rest(),tr:rest(),bl:rest(),ru:rest(),rl:rest(),c:rest()};
  const k=inOutCubic(seg(t,0,.45));
  p.c.rot=90*k;p.c.scale=1-inOutCubic(seg(t,.75,1.05));
  const r=inOutQuart(seg(t,.2,1.1));
  const anticipate=1-.08*inOutCubic(seg(t,.2,.95));
  const z=inOutCubic(seg(t,.95,1.75));
  const s=outQuint(seg(t,1.3,2.5));
  for(const key of ['tl','br','tr','bl'] as const){const [dx,dy]=dir[key];const d=lerp(.04*r,key==='tl'||key==='br'?f.keep:f.leave,s);p[key].x=dx*d;p[key].y=dy*d;}
  for(const key of ['ru','rl'] as const){const [dx,dy]=dir[key];const d=lerp(.08*k,f.blade,s);p[key].x=dx*d;p[key].y=dy*d;}
  return {pieces:p,mark:{rot:180*r,scale:anticipate*lerp(1,zoom,z)},bg:1-inOutCubic(seg(t,1.25,1.85)),clip:s};
}
const OPEN_END=2.5,FOYER_AT=1.55;

export function initGate(){
  const found=document.querySelector<HTMLElement>('[data-gate]');
  const foyer=document.querySelector<HTMLElement>('[data-foyer]');
  const showFoyer=()=>foyer?.classList.add('is-open');
  if(!found){showFoyer();return;}
  const gate:HTMLElement=found;
  const nav=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type;
  const seen=sessionStorage.getItem('teisu-gate')==='1'&&nav!=='reload';
  const skip=matchMedia('(prefers-reduced-motion: reduce)').matches||seen||!!location.hash||scrollY>40;

  const root=document.documentElement;
  const markEl=gate.querySelector<HTMLElement>('[data-gate-mark]')!;
  const pieces=new Map<Key,HTMLElement>(Array.from(gate.querySelectorAll<HTMLElement>('[data-piece]')).map(el=>[el.dataset.piece as Key,el]));
  const hint=gate.querySelector<HTMLButtonElement>('[data-gate-open]')!;
  gate.hidden=false;

  const headerHeight=()=>document.querySelector<HTMLElement>('.site-header')?.offsetHeight??0;
  let phase:'intro'|'idle'|'open'|'done'='intro',start=performance.now(),peek=0,peekTarget=0,last=start,raf=0;
  // Scale so the blades' outer edge (241 units off the diagonal) lands at FINAL.outer of the way to a corner.
  const zoom=()=>{const q=final().outer*(innerWidth+innerHeight)/2/241;return q*720/Math.max(markEl.offsetWidth,1);};

  function apply(frame:ReturnType<typeof intro>,extraKey=0){
    markEl.style.transform=`rotate(${frame.mark.rot}deg) scale(${frame.mark.scale})`;
    gate.style.setProperty('--gate-bg',frame.bg.toFixed(3));
    // While settling, the header strip is trimmed away: the frame lives on the stage below the header.
    gate.style.clipPath=frame.clip>0?`inset(${(frame.clip*headerHeight()).toFixed(1)}px 0 0 0)`:'';
    for(const [key,el] of pieces){
      const p=frame.pieces[key];let {x,y,rot}=p;
      // Hover/idle hint: the blades unlatch a little, the key turns slightly.
      if(extraKey&&(key==='ru'||key==='rl')){const [dx,dy]=dir[key];x+=dx*.05*extraKey;y+=dy*.05*extraKey;}
      if(extraKey&&key==='c')rot+=20*extraKey;
      el.style.transform=`translate(${(x*100).toFixed(3)}%,${(y*100).toFixed(3)}%) rotate(${rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`;
      el.style.opacity=p.opacity.toFixed(3);
    }
  }
  function tick(now:number){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-start)/1000;
    if(phase==='intro'){apply(intro(t));if(t>=INTRO_END){phase='idle';gate.classList.add('is-ready');}}
    else if(phase==='idle'){peek+=(peekTarget-peek)*(1-Math.exp(-dt/.18));apply(intro(INTRO_END),peek);}
    else if(phase==='open'){
      apply(opening(t,zoom()));
      if(t>=FOYER_AT)showFoyer();
      if(t>=OPEN_END){finish();return;}
    }
    raf=requestAnimationFrame(tick);
  }
  function open(){
    if(phase==='open'||phase==='done')return;
    phase='open';start=performance.now();gate.classList.add('is-opening');
  }
  /** The pieces stay: the fixed layer becomes the foyer's frame and scrolls away with it. */
  function settle(){
    phase='done';cancelAnimationFrame(raf);
    const place=()=>{gate.style.top=`${-((document.getElementById('main')?.getBoundingClientRect().top??0)+scrollY)}px`;};place();
    gate.classList.remove('is-opening','is-ready');gate.classList.add('is-settled');hint.remove();
    apply(opening(OPEN_END,zoom()));showFoyer();
    addEventListener('resize',()=>{place();apply(opening(OPEN_END,zoom()));},{passive:true});
  }
  function finish(){
    root.classList.remove('gate-lock');settle();
    sessionStorage.setItem('teisu-gate','1');
    for(const [type,fn] of listeners)removeEventListener(type,fn as EventListener);
    dispatchEvent(new Event('resize'));
  }

  if(skip){settle();return;}
  history.scrollRestoration='manual';scrollTo(0,0);root.classList.add('gate-lock');

  let touchY=0;
  const listeners:[string,(e:any)=>void][]=[
    ['wheel',(e:WheelEvent)=>{e.preventDefault();if(e.deltaY>2)open();}],
    ['touchstart',(e:TouchEvent)=>{touchY=e.touches[0]!.clientY;}],
    ['touchmove',(e:TouchEvent)=>{e.preventDefault();if(touchY-e.touches[0]!.clientY>18)open();}],
    ['keydown',(e:KeyboardEvent)=>{if(['ArrowDown','PageDown',' ','Enter','Escape'].includes(e.key)){e.preventDefault();open();}}],
    ['focusin',(e:FocusEvent)=>{if(!gate.contains(e.target as Node))open();}],
  ];
  for(const [type,fn] of listeners)addEventListener(type,fn as EventListener,{passive:false});
  hint.addEventListener('click',open);markEl.addEventListener('click',open);
  markEl.addEventListener('pointerenter',()=>{peekTarget=1;});markEl.addEventListener('pointerleave',()=>{peekTarget=0;});
  raf=requestAnimationFrame(tick);
  // Diagnostics only: freeze the timeline and seek to an exact moment.
  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__gate:{seek(which:'intro'|'open',t:number){cancelAnimationFrame(raf);phase='idle';if(which==='intro')apply(intro(t));else{apply(opening(t,zoom()));if(t>=FOYER_AT)showFoyer();}},final(next:Partial<typeof FINAL>,narrow?:Partial<typeof FINAL_NARROW>){Object.assign(FINAL,next);if(narrow)Object.assign(FINAL_NARROW,narrow);}}});
}
