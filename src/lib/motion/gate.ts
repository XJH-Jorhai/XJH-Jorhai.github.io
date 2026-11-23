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
 * Two layers carry the same mark: `night` (dark stage, dust, paper-white pieces) lies over `day`
 * (navy pieces on nothing, the page shows through). The iris is a hole in `night`, so pieces are
 * white on the dark side of its edge and navy on the page side — the colour change is the edge
 * passing over them as they land. The pieces stay as the hero's frame and scroll away with it.
 *
 * Without JS there is no gate. With reduced motion, a repeat visit in the same session, a hash or an
 * already-scrolled page, the frame is shown settled straight away.
 */
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

/**
 * Dust: specks in a tunnel around the view axis. `vz` moves them towards (+) or away from (−) the
 * viewer; the whole field turns with the mark. Fast specks are drawn as the short path they travelled
 * this frame, always along the one radial flow. 2D canvas, not WebGL.
 */
function createDust(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');
  const rnd=(i:number,n:number)=>{const v=Math.sin(i*n)*43758.5453;return v-Math.floor(v);};
  const pts=Array.from({length:360},(_,i)=>({x:rnd(i+1,12.9898)*2-1,y:rnd(i+1,78.233)*2-1,z:rnd(i+1,3.7127)*.95+.05,s:.65+rnd(i+1,9.173)*.9,px:NaN,py:NaN}));
  return (dt:number,a:number,vz:number,rot:number)=>{
    if(!ctx)return;const w=innerWidth,h=innerHeight,r=Math.min(devicePixelRatio,2);
    if(canvas.width!==Math.round(w*r)||canvas.height!==Math.round(h*r)){canvas.width=Math.round(w*r);canvas.height=Math.round(h*r);}
    ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);if(a<=0)return;
    const f=Math.min(w,h)*.9,th=rot*Math.PI/180*.35,cs=Math.cos(th),sn=Math.sin(th);ctx.lineCap='round';
    for(const p of pts){
      p.z-=vz*dt;if(p.z<=.02){p.z+=1;p.px=NaN;}else if(p.z>1.02){p.z-=1;p.px=NaN;}
      const x=w/2+(p.x*cs-p.y*sn)*f/p.z,y=h/2+(p.x*sn+p.y*cs)*f/p.z;
      const al=a*Math.min(1,(1-p.z)*1.4)*Math.min(1,p.z*9)*.55,size=Math.max(.8,1.9*(1-p.z))*p.s;
      let dx=x-p.px,dy=y-p.py;const len=Math.hypot(dx,dy);p.px=x;p.py=y;
      if(al<.01||x<-60||x>w+60||y<-60||y>h+60)continue;
      if(len>2.2&&len<400){const k=Math.min(1,44/len);dx*=k;dy*=k;
        ctx.strokeStyle=`rgba(226,220,206,${al.toFixed(3)})`;ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x,y);ctx.stroke();
      }else{ctx.fillStyle=`rgba(226,220,206,${al.toFixed(3)})`;ctx.fillRect(x-size/2,y-size/2,size,size);}
    }
  };
}

/**
 * Shade: the dark sheet lies a little above the page; along the iris' edge it shades the page.
 * Eight soft bands, one per side, drawn at half resolution on a canvas in the day layer.
 * g: half side, k: length cut off each corner, a: angle in radians.
 */
function createShade(canvas:HTMLCanvasElement){
  const ctx=canvas.getContext('2d');let drawn=false;
  return (alpha:number,g=0,k=0,a=0)=>{
    if(!ctx)return;const w=innerWidth,h=innerHeight;
    if(canvas.width!==Math.round(w/2)||canvas.height!==Math.round(h/2)){canvas.width=Math.round(w/2);canvas.height=Math.round(h/2);drawn=true;}
    if(alpha<=0&&!drawn)return;
    ctx.setTransform(.5,0,0,.5,0,0);ctx.clearRect(0,0,w,h);drawn=alpha>0;if(!drawn)return;
    const depth=Math.min(64,Math.max(10,g*.16)),band=ctx.createLinearGradient(0,0,0,-depth);
    band.addColorStop(0,`rgba(4,8,20,${(.3*alpha).toFixed(3)})`);band.addColorStop(1,'rgba(4,8,20,0)');
    ctx.translate(w/2,h/2);ctx.rotate(a);ctx.fillStyle=band;
    for(let i=0;i<8;i++){
      // sides at distance g (length 2(g−k)), cuts at distance (2g−k)/√2 (length k√2); +y points at the edge
      const flat=i%2===0,dist=flat?g:(2*g-k)/Math.SQRT2,half=flat?g-k:k/Math.SQRT2;
      if(half>.5){ctx.save();ctx.rotate(i*Math.PI/4);ctx.translate(0,dist);ctx.fillRect(-half,-depth,2*half,depth);ctx.restore();}
    }
  };
}

export function initGate(){
  const found=document.querySelector<HTMLElement>('[data-gate]');
  const home=document.querySelector<HTMLElement>('[data-home]');
  const hero=home?.querySelector<HTMLElement>('.hero');
  const showHome=()=>home?.classList.add('is-open');
  if(!found){showHome();return;}
  const gate:HTMLElement=found;
  const root=document.documentElement;
  const night=gate.querySelector<HTMLElement>('[data-gate-night]')!;
  const markEl=gate.querySelector<HTMLButtonElement>('[data-gate-mark]')!;
  const markDay=gate.querySelector<HTMLElement>('[data-gate-mark-day]')!;
  const layer=(el:HTMLElement)=>new Map<Key,HTMLElement>(Array.from(el.querySelectorAll<HTMLElement>('[data-piece]')).map(p=>[p.dataset.piece as Key,p]));
  const piecesNight=layer(markEl),piecesDay=layer(markDay);
  const dust=createDust(gate.querySelector<HTMLCanvasElement>('[data-gate-dust]')!);
  const shade=createShade(gate.querySelector<HTMLCanvasElement>('[data-gate-shade]')!);
  // Measured on the day layer: it keeps its layout after the night layer is removed.
  const width=()=>Math.max(markDay.offsetWidth,1);
  const zoomTo=()=>final().outer*(innerWidth+innerHeight)/2/241*720/width();

  function apply(f:Frame){
    const m=f.mark,flat=`rotate(${m.rot.toFixed(2)}deg) scale(${m.scale.toFixed(4)})`;
    markEl.style.transform=`translateZ(${m.z.toFixed(1)}px) rotateX(${m.tx.toFixed(2)}deg) rotateY(${m.ty.toFixed(2)}deg) ${flat}`;
    markDay.style.transform=flat;
    for(const k of KEYS){
      const q=f.p[k],tf=`translate(${(q.x*100).toFixed(3)}%,${(q.y*100).toFixed(3)}%) scale(${q.s.toFixed(4)})`;
      const n=piecesNight.get(k)!,d=piecesDay.get(k)!;
      n.style.transform=tf;d.style.transform=tf;
      n.style.opacity=k==='c'&&f.win>0?'0':q.o.toFixed(3); // the key square is the iris now
      d.style.opacity=k==='c'?f.veil.toFixed(3):'1';
    }
    night.style.setProperty('--glow',f.glow.toFixed(3));
    // The iris: an eight-sided hole in the night layer, turning with the mark.
    if(f.win>0){
      const w=innerWidth,h=innerHeight,a=m.rot*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
      const g=f.win,k=Math.max(0,Math.min(g,2*g-f.reach)); // k: length cut off each corner
      const pts=([[g-k,-g],[g,-g+k],[g,g-k],[g-k,g],[-g+k,g],[-g,g-k],[-g,-g+k],[-g+k,-g]] as const).map(([u,v])=>`${(w/2+u*cs-v*sn).toFixed(1)}px ${(h/2+u*sn+v*cs).toFixed(1)}px`);
      // covered once both distinct screen corners lie inside the iris
      const covered=([[-w/2,-h/2],[w/2,-h/2]] as const).every(([x,y])=>{const u=Math.abs(x*cs+y*sn),v=Math.abs(-x*sn+y*cs);return u<=g&&v<=g&&u+v<=2*g-k;});
      night.style.visibility=covered?'hidden':'visible';
      night.style.clipPath=`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${pts.join(',')},${pts[0]})`;
      shade(covered?0:f.shade,g,k,a);
    }else{night.style.clipPath='';night.style.visibility='visible';shade(0);}
    if(hero)hero.style.scale=f.dolly===1?'':f.dolly.toFixed(4);
  }

  let phase:'intro'|'idle'|'charge'|'open'|'done'='intro',raf=0,t0=performance.now(),last=t0;
  let peek=0,peekTarget=0,w=0,holding=false,released=false,from:From=REST;
  const tilt={x:0,y:0,tx:0,ty:0};
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const listeners:[EventTarget,string,(e:any)=>void][]=[];
  const on=(target:EventTarget,type:string,fn:(e:any)=>void)=>{target.addEventListener(type,fn as EventListener,{passive:false});listeners.push([target,type,fn]);};

  /** The pieces stay: the fixed layer becomes the hero's frame, absolute at the page top. */
  function settle(){
    phase='done';cancelAnimationFrame(raf);
    gate.classList.remove('is-opening','is-ready');gate.classList.add('is-settled');
    markEl.tabIndex=-1;markEl.setAttribute('aria-hidden','true');dust(0,0,0,0);
    const landed=()=>apply(opening(T.end,width(),zoomTo(),from));
    landed();showHome();root.classList.remove('gate-lock');
    for(const [t,type,fn] of listeners)t.removeEventListener(type,fn as EventListener);
    addEventListener('resize',landed,{passive:true});
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
    apply(f);dust(dt,f.dust,f.vz,f.mark.rot);
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
      gate.classList.toggle('is-opening',which==='open');gate.classList.toggle('is-ready',which!=='intro');if(which==='open'&&v>=T.home)showHome();apply(f);dust(.016,f.dust,f.vz,f.mark.rot);},
  }});
}
