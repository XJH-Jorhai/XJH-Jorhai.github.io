/**
 * Pointer depth on the home posters (Work, Notes, About): the pointer's position over a page becomes
 * --px / --py (-1…1) on it, and home.css shifts the slab's outline a little and the glass more, away
 * from the pointer (the painting in the slab stays put, so the slab reads as a window sliding over it).
 * Pointer events only store the target; the shared frame loop eases towards it and stops once it has
 * arrived. Fine pointers only, never with reduced motion. Leaving the page eases back.
 */
import {cancelFrame,frame} from 'motion';

export function initPosterStage(){
  const fine=matchMedia('(hover: hover) and (pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  for(const page of document.querySelectorAll<HTMLElement>('.home > .poster')){
    let x=0,y=0,tx=0,ty=0,running=false;
    const tick=({delta}:{delta:number})=>{
      const k=1-Math.exp(-Math.min(delta,100)/260);x+=(tx-x)*k;y+=(ty-y)*k;
      const resting=Math.abs(tx-x)<.002&&Math.abs(ty-y)<.002;
      if(resting){x=tx;y=ty;}
      page.style.setProperty('--px',x.toFixed(4));page.style.setProperty('--py',y.toFixed(4));
      if(resting){cancelFrame(tick);running=false;}
    };
    const aim=(nx:number,ny:number)=>{tx=Math.max(-1,Math.min(1,nx));ty=Math.max(-1,Math.min(1,ny));if(!running){running=true;frame.update(tick,true);}};
    page.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches||event.pointerType!=='mouse')return;
      aim(event.clientX/innerWidth*2-1,event.clientY/innerHeight*2-1);
    });
    page.addEventListener('pointerleave',()=>aim(0,0));
    reduced.addEventListener('change',()=>{if(reduced.matches)aim(0,0);});
  }
}
