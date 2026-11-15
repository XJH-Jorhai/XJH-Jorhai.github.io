/** Home hero: scroll-driven unlock of the TEISU mark. CSS reads the phase variables. */
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const seg=(u:number,a:number,b:number)=>clamp((u-a)/(b-a));
const ease=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export function initHero(){
  const hero=document.querySelector<HTMLElement>('[data-unlock]');
  if(!hero||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const stage=hero.querySelector<HTMLElement>('.unlock-stage')!;
  const mark=hero.querySelector<HTMLElement>('.unlock-mark')!;
  // Layout offset (ignores transforms): how far the mark sits above the stage centre.
  const measure=()=>stage.style.setProperty('--dy',`${(stage.clientHeight/2-(mark.offsetTop+mark.offsetHeight/2)).toFixed(1)}px`);
  let queued=false,last=-1;
  const update=()=>{
    queued=false;
    const r=hero.getBoundingClientRect();const travel=Math.max(1,r.height-innerHeight);
    const u=clamp(-r.top/travel);if(Math.abs(u-last)<1e-4)return;last=u;
    const vars:Record<string,number>={u,k:ease(seg(u,0,.2)),r:ease(seg(u,.12,.5)),o:ease(seg(u,.46,.84)),m:ease(seg(u,.7,.94))};
    for(const [name,value] of Object.entries(vars))stage.style.setProperty(`--${name}`,value.toFixed(4));
    stage.classList.toggle('is-unlocked',u>.9);
  };
  const request=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
  addEventListener('scroll',request,{passive:true});addEventListener('resize',()=>{measure();last=-1;request();},{passive:true});
  measure();document.fonts?.ready.then(measure);update();
}
