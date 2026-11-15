/** Home hero behaviours: scroll recession (A/C), card tilt (C), slideshow (B). */
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=()=>matchMedia('(hover: hover) and (pointer: fine)').matches;

function scrollRecession(){
  const heroes=Array.from(document.querySelectorAll<HTMLElement>('[data-hero]'));
  if(!heroes.length||reduced())return;
  let queued=false;
  const update=()=>{queued=false;for(const el of heroes){const r=el.getBoundingClientRect();const p=Math.min(1,Math.max(0,-r.top/Math.max(r.height*.75,1)));el.style.setProperty('--hero-p',p.toFixed(4));}};
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});update();
}

function cardTilt(){
  const card=document.querySelector<HTMLElement>('[data-tilt]');
  if(!card||reduced()||!fine())return;
  const area=card.parentElement!;
  area.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;
    card.style.setProperty('--tilt-x',`${(-y*4).toFixed(2)}deg`);card.style.setProperty('--tilt-y',`${(x*6).toFixed(2)}deg`);card.style.setProperty('--glare-x',`${(x+1)*50}%`);card.style.setProperty('--glare-y',`${(y+1)*50}%`);});
  area.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
}

function cinema(){
  const root=document.querySelector<HTMLElement>('[data-cinema]');if(!root)return;
  const slides=Array.from(root.querySelectorAll<HTMLElement>('.cinema-slide'));
  const bars=Array.from(root.querySelectorAll<HTMLElement>('.cinema-progress span'));
  const toggle=root.querySelector<HTMLButtonElement>('[data-cinema-toggle]')!;
  const hold=7000;let index=0,timer:number|undefined,paused=reduced();
  const show=(i:number)=>{index=(i+slides.length)%slides.length;slides.forEach((s,k)=>{const on=k===index;s.classList.toggle('is-active',on);s.toggleAttribute('aria-hidden',!on);const img=s.querySelector('img')!;img.alt=on?img.dataset.alt??img.alt:'';s.querySelector('a')!.tabIndex=on?0:-1;});bars.forEach((b,k)=>{b.classList.toggle('is-done',k<index);b.classList.remove('is-active');void b.offsetWidth;b.classList.toggle('is-active',k===index);});};
  const schedule=()=>{clearTimeout(timer);if(!paused&&!document.hidden)timer=window.setTimeout(()=>{show(index+1);schedule();},hold);};
  slides.forEach(s=>{const img=s.querySelector('img')!;if(img.alt)img.dataset.alt=img.alt;});
  slides[0]&&(slides[0].querySelector('img')!.dataset.alt=slides[0].querySelector('img')!.alt);
  root.classList.add('is-live');root.classList.toggle('is-paused',paused);
  toggle.hidden=reduced();
  toggle.addEventListener('click',()=>{paused=!paused;toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'播放':'暂停';root.classList.toggle('is-paused',paused);schedule();});
  document.addEventListener('visibilitychange',schedule);
  show(0);schedule();
}

export function initHero(){scrollRecession();cardTilt();cinema();}
