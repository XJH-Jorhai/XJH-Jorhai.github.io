/** Reveals [data-reveal] elements once as they enter the viewport. CSS owns the motion. */
export function initReveal(){
  const items=Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if(!items.length)return;
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){for(const el of items)el.classList.add('is-revealed');return;}
  // Siblings revealed together get a small stagger.
  const observer=new IntersectionObserver(entries=>{
    let order=0;
    for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target as HTMLElement;el.style.setProperty('--reveal-delay',`${Math.min(order++,4)*.07}s`);el.classList.add('is-revealed');observer.unobserve(el);}
  },{threshold:0});
  for(const el of items)observer.observe(el);
}
