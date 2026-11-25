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
 * Petting: rubbing the pointer back and forth over her head (the hat and the top of her hair, an
 * invisible ellipse that turns with her) makes hearts pop up where the pointer is. Every time the
 * pointer turns back over her head after a real stroke, from the second turn on, a heart is owed;
 * leaving the head (or a long pause) starts over, so one pass across, or a single back-and-forth,
 * does nothing. It counts turns, not time or speed, so it works the same however slowly the page is
 * drawing (busy pages deliver fewer, longer pointer moves); the frame loop only draws owed hearts.
 *
 * Pointer events only store the pointer; the shared frame loop eases towards it (the eyes faster than
 * the body), reads the rubbing, and stops once everything has arrived. Leaving the page eases
 * everything back.
 */
import {cancelFrame,frame} from 'motion';

export function initPersonaStage(){
  const page=document.querySelector<HTMLElement>('.h-persona');
  if(!page)return;
  const fine=matchMedia('(hover: hover) and (pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const eyes=[...page.querySelectorAll<HTMLElement>('[data-hp-eye]')];
  const headZone=page.querySelector<HTMLElement>('[data-hp-head]'),hearts=page.querySelector<HTMLElement>('[data-hp-hearts]');
  let x=0,y=0,ex=0,ey=0,running=false;
  // The pointer (client px) while it is over the page, else null; where her eyes are on screen.
  // Layout is read at most every 300 ms (and after an enter or a resize), not on every frame.
  let pointer:{x:number,y:number}|null=null,box:DOMRect|null=null,centre:{x:number,y:number}|null=null,measured=0,eyesOn=false;
  let head:DOMRect|null=null,heartsBox:DOMRect|null=null;
  // Petting input: the horizontal direction of the current stroke and how far it has gone, how many
  // turns in a row and when the last one was, and the hearts owed (where the pointer was) but not drawn.
  let heading=0,stroke=0,turns=0,turned=-1e9,lastOwed=-1e9,count=0;
  const owed:{x:number,y:number}[]=[];

  function measure(){
    box=page!.getBoundingClientRect();measured=performance.now();centre=null;
    head=headZone?.getBoundingClientRect()??null;heartsBox=hearts?.getBoundingClientRect()??null;
    const live=eyes.filter(eye=>eye.classList.contains('is-ready'));
    if(!live.length)return;
    let sx=0,sy=0;for(const eye of live){const r=eye.getBoundingClientRect();sx+=r.left+r.width/2;sy+=r.top+r.height/2;}
    centre={x:sx/live.length,y:sy/live.length};
  }
  function targets(){
    if(!pointer)return {tx:0,ty:0,gx:0,gy:0};
    if(!box||performance.now()-measured>300)measure();
    const tx=Math.max(-1,Math.min(1,(pointer.x-box!.left)/box!.width*2-1)),ty=Math.max(-1,Math.min(1,(pointer.y-box!.top)/Math.min(box!.height,innerHeight)*2-1));
    if(!centre)return {tx,ty,gx:0,gy:0};
    const dx=pointer.x-centre.x,dy=pointer.y-centre.y,reach=Math.max(Math.hypot(dx,dy),Math.min(innerWidth,innerHeight)*.28);
    return {tx,ty,gx:dx/reach,gy:dy/reach};
  }
  const onHead=(p:{x:number,y:number})=>{
    if(!head||head.width<1)return false;
    const u=(p.x-head.left)/head.width*2-1,v=(p.y-head.top)/head.height*2-1;return u*u+v*v<=1;
  };
  function rub(from:{x:number,y:number},to:{x:number,y:number}){
    if(!hearts||!onHead(to)){heading=stroke=turns=0;return;}
    const now=performance.now(),dx=to.x-from.x;
    if(Math.abs(dx)<=1.5)return;
    const dir=Math.sign(dx);
    if(heading&&dir!==heading&&stroke>=24){
      turns=now-turned<4000?turns+1:1;turned=now;
      if(turns>=2&&now-lastOwed>120){lastOwed=now;if(owed.length<4)owed.push({...to});}
      stroke=0;
    }
    if(dir!==heading)stroke=0;
    heading=dir;stroke+=Math.abs(dx);
  }
  function heart(at:{x:number,y:number}){
    if(!hearts||!heartsBox||hearts.childElementCount>=14)return;
    const el=document.createElement('span');el.className=++count%3?'hp-heart':'hp-heart is-paper';
    el.innerHTML='<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 20.6S2.2 14.7 2.2 8a5 5 0 0 1 9.8-1.6A5 5 0 0 1 21.8 8c0 6.7-9.8 12.6-9.8 12.6z"/></svg>';
    const size=24+Math.random()*20,rise=90+Math.random()*90,drift=(Math.random()-.5)*90,spin=(Math.random()-.5)*40;
    el.style.cssText=`left:${at.x-heartsBox.left+(Math.random()-.5)*28}px;top:${at.y-heartsBox.top-6}px;width:${size.toFixed(1)}px`;
    hearts.append(el);
    el.animate([
      {opacity:0,transform:`translate(-50%,-50%) scale(.2) rotate(${-spin}deg)`},
      {opacity:1,transform:`translate(calc(-50% + ${drift*.15}px),calc(-50% - ${rise*.2}px)) scale(1.15) rotate(${spin*.3}deg)`,offset:.2},
      {opacity:1,transform:`translate(calc(-50% + ${drift*.7}px),calc(-50% - ${rise*.7}px)) scale(1) rotate(${spin*.75}deg)`,offset:.7},
      {opacity:0,transform:`translate(calc(-50% + ${drift}px),calc(-50% - ${rise}px)) scale(.85) rotate(${spin}deg)`},
    ],{duration:1100+Math.random()*400,easing:'cubic-bezier(.2,.7,.3,1)'}).finished.then(()=>el.remove(),()=>el.remove());
  }
  function tick({delta}:{delta:number}){
    const {tx,ty,gx,gy}=targets(),dt=Math.min(delta,100),k=1-Math.exp(-dt/220),ke=1-Math.exp(-dt/80);
    for(const at of owed.splice(0))heart(at);
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
    const next={x:event.clientX,y:event.clientY};
    if(pointer)rub(pointer,next);
    pointer=next;wake();
  });
  page.addEventListener('pointerenter',()=>{box=null;});
  page.addEventListener('pointerleave',()=>{pointer=null;wake();});
  addEventListener('resize',()=>{box=null;});
  reduced.addEventListener('change',()=>{if(reduced.matches){pointer=null;wake();}else loadEyes();});
}
