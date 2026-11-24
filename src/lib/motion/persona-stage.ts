/**
 * Pointer depth on the home Persona & About page. The pointer's position over the page becomes
 * --px / --py (-1…1); home.css moves the slab, the word, the figure and her red shadow by different
 * amounts and turns the figure a few degrees towards it, so the poster gains depth.
 * Pointer events only store the target; the shared frame loop eases towards it and stops once it has
 * arrived. Fine pointers only, never with reduced motion. Leaving the page eases everything back.
 */
import {cancelFrame,frame} from 'motion';

export function initPersonaStage(){
  const page=document.querySelector<HTMLElement>('.h-persona');
  if(!page)return;
  const fine=matchMedia('(hover: hover) and (pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let x=0,y=0,tx=0,ty=0,running=false;
  function tick({delta}:{delta:number}){
    const k=1-Math.exp(-Math.min(delta,100)/220);x+=(tx-x)*k;y+=(ty-y)*k;
    const resting=Math.abs(tx-x)<.002&&Math.abs(ty-y)<.002;
    if(resting){x=tx;y=ty;}
    page!.style.setProperty('--px',x.toFixed(4));page!.style.setProperty('--py',y.toFixed(4));
    if(resting){cancelFrame(tick);running=false;if(!tx&&!ty)page!.classList.remove('is-tracking');}
  }
  const aim=(nx:number,ny:number)=>{
    tx=Math.max(-1,Math.min(1,nx));ty=Math.max(-1,Math.min(1,ny));
    if(tx||ty)page.classList.add('is-tracking');
    if(!running){running=true;frame.update(tick,true);}
  };
  page.addEventListener('pointermove',event=>{
    if(!fine.matches||reduced.matches||event.pointerType!=='mouse')return;
    const box=page.getBoundingClientRect();
    aim((event.clientX-box.left)/box.width*2-1,(event.clientY-box.top)/Math.min(box.height,innerHeight)*2-1);
  });
  page.addEventListener('pointerleave',()=>aim(0,0));
  reduced.addEventListener('change',()=>{if(reduced.matches)aim(0,0);});
}
