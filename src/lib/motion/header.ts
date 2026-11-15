/** Floating header: hides while scrolling down, returns on the way up; gains a backing once off the top. */
export function initHeader(){
  const header=document.querySelector<HTMLElement>('[data-site-header]');if(!header)return;
  let last=scrollY,queued=false;
  const update=()=>{queued=false;const y=scrollY,dy=y-last;
    header.classList.toggle('is-scrolled',y>40);
    if(Math.abs(dy)>6){header.classList.toggle('is-hidden',dy>0&&y>160&&!header.contains(document.activeElement));last=y;}
  };
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
  header.addEventListener('focusin',()=>header.classList.remove('is-hidden'));
  update();
}
