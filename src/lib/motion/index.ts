import {cancelFrame,frame} from 'motion';
import {createPointer} from './pointer';

import {startScene,type SceneHandle} from '../scene';
let current:(()=>void)|undefined;
export function initMotion(){
  current?.();const controller=new AbortController(),{signal}=controller;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  const titles=Array.from(document.querySelectorAll<HTMLElement>('[data-responsive-title]')).map(element=>({element,bounds:element.getBoundingClientRect(),active:0}));
  const textMotion=Array.from(document.querySelectorAll<HTMLElement>('.hero-heading,.project-intro,.hero-bottom,.notes>.eyebrow,.notes-copy,.project-header>.eyebrow,.project-header>.responsive-title,.project-summary,.project-meta,.reading-aside,.prose>h2,.prose>p,.prose>ul,.prose>ol,.reading-return'));
  let lastScroll=scrollY,textLag=0;
  const resetText=()=>{textLag=0;lastScroll=scrollY;for(const element of textMotion)element.style.removeProperty('translate');};
  document.querySelectorAll('[data-trail-canvas]').forEach(canvas=>canvas.remove());
  let spatial:SceneHandle|undefined,dead=false,running=false,loading=false,frames=0;
  const enabled=()=>!dead&&!document.hidden&&!reduced.matches&&fine.matches;
  function wake(){if(!enabled()||running)return;running=true;frame.render(tick,true);}
  const pointer=createPointer(signal,wake);
  async function enhance(){if(spatial||loading||!enabled())return;loading=true;const handle=await startScene(pointer,wake);loading=false;if(dead||!enabled())handle?.dispose();else{spatial=handle;wake();}}
  function stop(){cancelFrame(tick);running=false;}
  function measure(){if(dead)return;for(const t of titles)t.bounds=t.element.getBoundingClientRect();spatial?.resize();wake();}
  function invalidate(){frame.read(measure);}
  function tick({delta}:{delta:number}){if(!enabled()){stop();return;}frames++;let pending=false;const dt=Math.min(delta,50)/1000;
    const scrollDelta=scrollY-lastScroll;lastScroll=scrollY;
    textLag=Math.max(-18,Math.min(18,textLag+scrollDelta*.18))*Math.exp(-dt/.14);
    if(Math.abs(textLag)<.03)textLag=0;
    for(const [i,element] of textMotion.entries())element.style.translate=textLag===0?'none':`0 ${textLag*(.8+(i%3)*.1)}px`;
    pending ||= textLag!==0;
    for(const t of titles){const b=t.bounds;const active=pointer.inside&&pointer.x>=b.left&&pointer.x<=b.right&&pointer.y>=b.top&&pointer.y<=b.bottom;const target=active?1:0;t.active+=(target-t.active)*(1-Math.exp(-dt/.16));if(Math.abs(t.active-target)<.001)t.active=target;
      t.element.style.setProperty('--title-active',String(t.active));t.element.style.setProperty('--title-x',`${pointer.x-b.left}px`);t.element.style.setProperty('--title-y',`${pointer.y-b.top}px`);pending ||= t.active!==target;
    }
    pending=(spatial?.tick(dt)??false)||pending;if(!pending)stop();
  }
  function preference(){resetText();pointer.inside=false;stop();for(const t of titles){t.active=0;t.element.style.setProperty('--title-active','0');}spatial?.pause();if(!reduced.matches&&fine.matches){void enhance();invalidate();}}
  const resize=new ResizeObserver(invalidate);for(const t of titles)resize.observe(t.element);for(const visual of document.querySelectorAll('[data-project-visual]'))resize.observe(visual);
  window.addEventListener('resize',invalidate,{passive:true,signal});window.addEventListener('scroll',invalidate,{passive:true,signal});
  document.addEventListener('visibilitychange',preference,{signal});reduced.addEventListener('change',preference,{signal});fine.addEventListener('change',preference,{signal});
  document.fonts.ready.then(()=>{if(!dead)invalidate();});
  function dispose(){if(dead)return;resetText();dead=true;stop();cancelFrame(measure);controller.abort();resize.disconnect();spatial?.dispose();spatial=undefined;}
  window.addEventListener('pagehide',event=>{dispose();if(event.persisted)window.addEventListener('pageshow',()=>initMotion(),{once:true});},{once:true,signal});
  if(new URLSearchParams(location.search).has('inspect'))Object.defineProperty(window,'__blogMotion',{configurable:true,get:()=>({enabled:enabled(),running,frames,pointerSources:dead?0:1,titles:titles.map(t=>({active:t.active}))})});
  current=dispose;void enhance();invalidate();return dispose;
}

