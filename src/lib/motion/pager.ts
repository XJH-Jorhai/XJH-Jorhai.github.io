import {createSweep} from './sweep';
/**
 * Home pager. The home page's sections are full-screen pages: one is shown at a time and a wheel
 * notch, a swipe, an arrow key or an in-page link switches to the next in one continuous push
 * (sweep.ts): a 45° seam with stripes of colour on it crosses the screen from below (going forward)
 * or from above (going back); the new page is already there behind it, playing its entrance, while
 * the old page drifts out in front of it. Both pages are opaque paper while they share the screen.
 * The WebGL scenes sit out the push (their posters show instead) and measure again once it is done.
 * Two things drawn outside the pages belong to one of them: the cover's corner blocks and the end
 * page's footer. They are clipped and moved with their page.
 *
 * Without JS or with reduced motion there is no pager: the sections simply follow each other as one
 * long page. A page taller than the screen scrolls inside itself first; the pager takes over at its
 * edges. Entrances are CSS animations, so they play again whenever a page is shown (home.css).
 */
/**
 * Wraps each rendered line of the page's `[data-lines]` paragraphs in its own box, so the lines can
 * enter one after another. Plain text only; the wording is untouched. Runs when the page is shown
 * (a hidden page has no lines to measure) and again when its width changes.
 */
function splitLines(page:HTMLElement){
  for(const el of page.querySelectorAll<HTMLElement>('[data-lines]')){
    const width=String(el.clientWidth);if(el.dataset.split===width)continue;
    const text=el.dataset.text??(el.dataset.text=el.textContent??'');
    // One probe per character: a longer probe that wraps would report only its first line.
    el.textContent='';
    const probes=Array.from(text,char=>{const span=document.createElement('span');span.textContent=char;el.append(span);return span;});
    const lines:string[]=[];let top=NaN;
    for(const probe of probes){if(probe.offsetTop!==top){lines.push('');top=probe.offsetTop;}lines[lines.length-1]+=probe.textContent;}
    el.textContent='';
    for(const [i,line] of lines.entries()){
      const box=document.createElement('span'),inner=document.createElement('span');
      box.className='ln';inner.className='ln-i';inner.style.setProperty('--l',String(i));inner.textContent=line;box.append(inner);el.append(box);
    }
    el.dataset.split=width;
  }
}

export function initPager(){
  const home=document.querySelector<HTMLElement>('[data-home]');
  if(!home||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const pages=Array.from(home.querySelectorAll<HTMLElement>(':scope > [data-page]'));
  if(pages.length<2)return;
  const root=document.documentElement;
  const wipe=document.querySelector<HTMLCanvasElement>('[data-wipe]');
  const sweep=wipe?createSweep(wipe):null;
  const nav=document.querySelector<HTMLElement>('[data-pager]');
  const ticks=nav?Array.from(nav.querySelectorAll<HTMLAnchorElement>('a')):[];
  /** '#work' → 1; '' and '#main' → the cover; anything else → -1. */
  const indexOf=(hash:string)=>{const id=hash.replace(/^#/,'');return id===''||id==='main'?0:pages.findIndex(page=>page.id===id||page.dataset.alias===id);};
  const locked=()=>root.classList.contains('gate-lock');
  const remeasure=()=>dispatchEvent(new Event('resize')); // the scenes read element positions on resize

  let current=Math.max(0,indexOf(location.hash)),busy=false;
  function show(index:number){
    current=index;const page=pages[index]!;
    for(const [i,p] of pages.entries())p.classList.toggle('is-current',i===index);
    for(const [i,a] of ticks.entries()){if(i===index)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');}
    root.dataset.page=page.id;page.scrollTop=0;splitLines(page);
    history.replaceState(history.state,'',index===0?location.pathname+location.search:`#${page.id}`);
  }
  root.classList.add('paged');if(nav)nav.hidden=false;show(current);remeasure();
  const gate=document.querySelector<HTMLElement>('.gate'),footer=document.querySelector<HTMLElement>('.site-footer');
  /** What is drawn outside a page but belongs to it. */
  const attached=(page:HTMLElement)=>page===pages[0]?(gate?.classList.contains('is-settled')?gate:null):page===pages[pages.length-1]?footer:null;
  // Line boxes depend on the width: split again when it changes (our own re-measure events do not change it).
  addEventListener('resize',()=>splitLines(pages[current]!));

  // A link clicked while the blade is still moving is not lost: it is taken up when the blade is done.
  let queued=-1;
  async function go(index:number,explicit=false){
    if(locked()||index<0||index>=pages.length)return;
    if(busy){if(explicit)queued=index;return;}
    if(index===current)return;
    busy=true;const dir=index>current?1:-1,from=pages[current]!,to=pages[index]!;
    try{
      if(!sweep){show(index);to.focus({preventScroll:true});return;}
      // Both pages on screen: the old one stays (is-leaving), the new one is current from the start.
      root.classList.add('is-flipping');root.dataset.leaving=from.id;from.classList.add('is-leaving');
      const fromBox=from.getBoundingClientRect(); // read before anything moves
      show(index);to.focus({preventScroll:true});
      const toBox=to.getBoundingClientRect(),drift=Math.min(innerHeight*.12,110)*dir;
      // The corner blocks and the footer go with their page: above the pages for the push, clipped like it.
      const goes=attached(from),comes=attached(to),boxOf=(el:HTMLElement|null)=>el?el.getBoundingClientRect():null;
      for(const el of [goes,comes])if(el)el.style.zIndex='3';
      const goesBox=boxOf(goes),comesBox=boxOf(comes);
      await sweep.flip(dir,({progress,incoming,outgoing})=>{
        const out=-progress*drift,inn=(1-progress)*drift;
        from.style.translate=`0 ${out}px`;from.style.clipPath=outgoing(fromBox.left,fromBox.top+out);
        to.style.translate=`0 ${inn}px`;to.style.clipPath=incoming(toBox.left,toBox.top+inn);
        if(goes&&goesBox){goes.style.translate=`0 ${out}px`;goes.style.clipPath=outgoing(goesBox.left,goesBox.top+out);}
        if(comes&&comesBox){comes.style.translate=`0 ${inn}px`;comes.style.clipPath=incoming(comesBox.left,comesBox.top+inn);}
      });
    }finally{
      for(const page of [from,to]){page.style.translate='';page.style.clipPath='';}
      from.classList.remove('is-leaving');delete root.dataset.leaving;
      for(const el of [gate,footer])if(el){el.style.zIndex='';el.style.translate='';el.style.clipPath='';}
      // The scenes measure the new page now; the posters stay up two more frames, until WebGL has
      // drawn at the new positions, so nothing jumps when they hand over.
      remeasure();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      root.classList.remove('is-flipping');
      busy=false;setTimeout(remeasure,900);
    }
    if(queued>=0){const next=queued;queued=-1;void go(next);}
  }

  /** Can the current page still scroll inside itself in this direction? */
  function inner(direction:number){
    const page=pages[current]!,max=page.scrollHeight-page.clientHeight;
    return max>1&&(direction>0?page.scrollTop<max-1:page.scrollTop>1);
  }
  // One page per gesture: after a flip (or an inner scroll) the wheel has to pause before it counts again.
  let armed=true,lastWheel=0;
  addEventListener('wheel',event=>{
    if(locked()||event.ctrlKey)return;
    const now=performance.now(),fresh=now-lastWheel>180;lastWheel=now;
    const direction=Math.sign(event.deltaY);if(!direction)return;
    if(inner(direction)){armed=false;return;}
    event.preventDefault();
    if(fresh)armed=true;
    if(busy||!armed||Math.abs(event.deltaY)<4)return;
    armed=false;void go(current+direction);
  },{passive:false});

  addEventListener('keydown',event=>{
    if(locked()||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
    const control=(event.target as Element|null)?.closest?.('a,button,summary,input,textarea,select,[contenteditable]');
    const key=event.key;let direction=0;
    if(key==='ArrowDown'||key==='PageDown'||(key===' '&&!event.shiftKey&&!control))direction=1;
    else if(key==='ArrowUp'||key==='PageUp'||(key===' '&&event.shiftKey&&!control))direction=-1;
    else if(key==='Home'){event.preventDefault();void go(0);return;}
    else if(key==='End'){event.preventDefault();void go(pages.length-1);return;}
    if(!direction||inner(direction))return;
    event.preventDefault();void go(current+direction);
  });

  // Swipe: only when the page could not scroll that way when the finger went down.
  let startX=0,startY=0,couldUp=false,couldDown=false;
  addEventListener('touchstart',event=>{const t=event.touches[0]!;startX=t.clientX;startY=t.clientY;couldDown=inner(1);couldUp=inner(-1);},{passive:true});
  addEventListener('touchend',event=>{
    if(locked())return;const t=event.changedTouches[0]!,dy=startY-t.clientY,dx=startX-t.clientX;
    if(Math.abs(dy)<56||Math.abs(dy)<Math.abs(dx)*1.2)return;
    if(dy>0&&!couldDown)void go(current+1);else if(dy<0&&!couldUp)void go(current-1);
  },{passive:true});

  // Links to a page on this document (the ticks, the cover's contents, the footer) switch instead of jumping.
  document.addEventListener('click',event=>{
    const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||url.pathname!==location.pathname)return;
    const index=indexOf(url.hash);if(index<0)return;
    event.preventDefault();void go(index,true);
  });
  addEventListener('hashchange',()=>{const index=indexOf(location.hash);if(index>=0)void go(index,true);});

  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__pager:{go:(index:number)=>go(index,true),get current(){return current;},get busy(){return busy;}}});
}
