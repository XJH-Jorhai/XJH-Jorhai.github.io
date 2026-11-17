/**
 * Persona page.
 * - Sections get `.is-in` as they enter the viewport; their entrances are CSS (persona.css).
 * - Hero: the grounds, the word and the figure shift by different amounts with the pointer and with
 *   scroll, so the poster has depth. Pointer events only store a target; one shared frame loop eases
 *   towards it and stops when it has arrived.
 * - Moods: choosing an expression switches the section's ground, ink, accent and tilt; the old ground
 *   is swept away along 45°.
 * With reduced motion everything is simply shown, and moods switch without the sweep.
 */
import {cancelFrame,frame} from 'motion';

export function initPersona(){
  const root=document.querySelector<HTMLElement>('[data-persona]');if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections=Array.from(root.querySelectorAll<HTMLElement>(':scope > section'));

  /* ---------- entrances ---------- */
  if(reduced||!('IntersectionObserver' in window))for(const section of sections)section.classList.add('is-in');
  else{
    const seen=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-in');seen.unobserve(entry.target);}},{threshold:.18});
    for(const section of sections)seen.observe(section);
  }

  /* ---------- hero depth ---------- */
  const hero=root.querySelector<HTMLElement>('[data-p-hero]');
  if(hero&&!reduced){
    const fine=matchMedia('(hover: hover) and (pointer: fine)');
    let x=0,y=0,tx=0,ty=0,running=false;
    const scroll=()=>hero.style.setProperty('--sy',Math.min(1,Math.max(0,scrollY/Math.max(hero.offsetHeight,1))).toFixed(3));
    function tick({delta}:{delta:number}){
      const k=1-Math.exp(-Math.min(delta,50)/160);x+=(tx-x)*k;y+=(ty-y)*k;
      if(Math.abs(tx-x)<.002&&Math.abs(ty-y)<.002){x=tx;y=ty;cancelFrame(tick);running=false;}
      hero!.style.setProperty('--px',x.toFixed(3));hero!.style.setProperty('--py',y.toFixed(3));
    }
    const aim=(nx:number,ny:number)=>{tx=nx;ty=ny;if(!running){running=true;frame.render(tick,true);}};
    hero.addEventListener('pointermove',event=>{if(!fine.matches||event.pointerType!=='mouse')return;const box=hero.getBoundingClientRect();aim((event.clientX-box.left)/box.width*2-1,(event.clientY-box.top)/box.height*2-1);});
    hero.addEventListener('pointerleave',()=>aim(0,0));
    addEventListener('scroll',scroll,{passive:true});scroll();
  }

  /* ---------- moods ---------- */
  const mood=root.querySelector<HTMLElement>('[data-p-mood]');
  if(mood){
    const picks=Array.from(mood.querySelectorAll<HTMLButtonElement>('[data-mood-pick]'));
    const wipe=mood.querySelector<HTMLElement>('[data-mood-wipe]');
    const word=mood.querySelector<HTMLElement>('[data-mood-word]'),face=mood.querySelector<HTMLElement>('.p-mood-face');
    const image=mood.querySelector<HTMLImageElement>('[data-mood-img]');
    const zh=mood.querySelector<HTMLElement>('[data-mood-zh]'),en=mood.querySelector<HTMLElement>('[data-mood-en]'),no=mood.querySelector<HTMLElement>('[data-mood-no]');
    const replay=(el:HTMLElement|null)=>{if(!el||reduced)return;el.classList.remove('is-swapped');void el.offsetWidth;el.classList.add('is-swapped');};
    function choose(pick:HTMLButtonElement){
      const id=pick.dataset.moodPick!;if(mood!.dataset.mood===id)return;
      if(wipe&&!reduced){
        // Paint the old ground over the section, switch underneath it, then sweep it off to the right.
        wipe.style.setProperty('--wipe',getComputedStyle(mood!).backgroundColor);
        wipe.animate([{clipPath:'polygon(-60% 0,160% 0,100% 100%,-120% 100%)'},{clipPath:'polygon(160% 0,160% 0,100% 100%,100% 100%)'}],{duration:620,easing:'cubic-bezier(.5,0,.1,1)',fill:'both'});
      }
      mood!.dataset.mood=id;
      for(const other of picks)other.setAttribute('aria-pressed',String(other===pick));
      if(word)word.textContent=pick.dataset.zh??'';if(zh)zh.textContent=pick.dataset.zh??'';if(en)en.textContent=pick.dataset.en??'';
      if(no)no.textContent=String(picks.indexOf(pick)+1).padStart(2,'0');
      if(image){image.src=pick.dataset.src??image.src;image.alt=`表情：${pick.dataset.zh??''}`;}
      replay(word);replay(face);
    }
    for(const pick of picks)pick.addEventListener('click',()=>choose(pick));
  }
}
