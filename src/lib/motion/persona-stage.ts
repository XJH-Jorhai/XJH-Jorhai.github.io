/**
 * Pointer depth and gaze on the home Persona & About page.
 *
 * Depth: the pointer's position over the page becomes --px / --py (-1…1); home.css moves the slab,
 * the word, the figure and her red shadow by different amounts and turns the figure a few degrees
 * towards it, so the poster gains depth.
 *
 * Gaze: each eye is two small layers cut from the key visual and an iris-less plate
 * (scripts/process-persona.mjs): the eye white, and the iris on top of it, clipped to the eye opening.
 * At rest they reproduce the picture exactly; --ex / --ey (-1…1, the direction from her eyes to the
 * pointer, full strength from about a quarter of the screen away) slide the irises a few pixels. The
 * layers are only fetched and shown on a fine pointer without reduced motion, once both have decoded,
 * so no device ever sees an eye without its iris.
 *
 * Pointer events only store the pointer; the shared frame loop eases towards it (the eyes faster than
 * the body) and stops once everything has arrived. Leaving the page eases everything back.
 */
import {cancelFrame,frame} from 'motion';

export function initPersonaStage(){
  const page=document.querySelector<HTMLElement>('.h-persona');
  if(!page)return;
  const fine=matchMedia('(hover: hover) and (pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const eyes=[...page.querySelectorAll<HTMLElement>('[data-hp-eye]')];
  let x=0,y=0,ex=0,ey=0,running=false;
  // The pointer (client px) while it is over the page, else null; where her eyes are on screen.
  // Layout is read at most every 800 ms (and after an enter or a resize), not on every frame.
  let pointer:{x:number,y:number}|null=null,box:DOMRect|null=null,centre:{x:number,y:number}|null=null,measured=0,eyesOn=false;

  function measure(){
    box=page!.getBoundingClientRect();measured=performance.now();centre=null;
    const live=eyes.filter(eye=>eye.classList.contains('is-ready'));
    if(!live.length)return;
    let sx=0,sy=0;for(const eye of live){const r=eye.getBoundingClientRect();sx+=r.left+r.width/2;sy+=r.top+r.height/2;}
    centre={x:sx/live.length,y:sy/live.length};
  }
  function targets(){
    if(!pointer)return {tx:0,ty:0,gx:0,gy:0};
    if(!box||performance.now()-measured>800)measure();
    const tx=Math.max(-1,Math.min(1,(pointer.x-box!.left)/box!.width*2-1)),ty=Math.max(-1,Math.min(1,(pointer.y-box!.top)/Math.min(box!.height,innerHeight)*2-1));
    if(!centre)return {tx,ty,gx:0,gy:0};
    const dx=pointer.x-centre.x,dy=pointer.y-centre.y,reach=Math.max(Math.hypot(dx,dy),Math.min(innerWidth,innerHeight)*.28);
    return {tx,ty,gx:dx/reach,gy:dy/reach};
  }
  function tick({delta}:{delta:number}){
    const {tx,ty,gx,gy}=targets(),dt=Math.min(delta,100),k=1-Math.exp(-dt/220),ke=1-Math.exp(-dt/80);
    x+=(tx-x)*k;y+=(ty-y)*k;ex+=(gx-ex)*ke;ey+=(gy-ey)*ke;
    const resting=Math.max(Math.abs(tx-x),Math.abs(ty-y),Math.abs(gx-ex),Math.abs(gy-ey))<.002;
    if(resting){x=tx;y=ty;ex=gx;ey=gy;}
    const s=page!.style;
    s.setProperty('--px',x.toFixed(4));s.setProperty('--py',y.toFixed(4));s.setProperty('--ex',ex.toFixed(4));s.setProperty('--ey',ey.toFixed(4));
    if(resting){cancelFrame(tick);running=false;if(!pointer)page!.classList.remove('is-tracking');}
  }
  const wake=()=>{if(!running){running=true;frame.update(tick,true);}};

  // Fetch both layers of every eye, show them together once all have decoded.
  function loadEyes(){
    if(eyesOn||!eyes.length)return;eyesOn=true;
    Promise.all(eyes.map(eye=>{
      const layers=(['white','iris'] as const).map(name=>{const img=new Image();img.alt='';img.className=`hp-eye-${name}`;img.decoding='async';img.src=eye.dataset[name]!;return img;});
      return Promise.all(layers.map(img=>img.decode())).then(()=>layers);
    })).then(all=>{
      all.forEach((layers,i)=>{const eye=eyes[i]!;eye.style.setProperty('--white',`url("${eye.dataset.white}")`);eye.append(...layers);eye.classList.add('is-ready');});
      box=null;wake();
    }).catch(()=>{eyesOn=false;});
  }
  const allowed=()=>fine.matches&&!reduced.matches;
  if(allowed())loadEyes();
  fine.addEventListener('change',()=>{if(allowed())loadEyes();});

  page.addEventListener('pointermove',event=>{
    if(!allowed()||event.pointerType!=='mouse')return;
    if(!pointer)page.classList.add('is-tracking');
    pointer={x:event.clientX,y:event.clientY};wake();
  });
  page.addEventListener('pointerenter',()=>{box=null;});
  page.addEventListener('pointerleave',()=>{pointer=null;wake();});
  addEventListener('resize',()=>{box=null;});
  reduced.addEventListener('change',()=>{if(reduced.matches){pointer=null;wake();}else loadEyes();});
}
