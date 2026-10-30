import type {SharedPointer} from '../motion/pointer';
export interface SceneHandle {tick(dt:number):boolean;resize():void;pause():void;dispose():void;retire?(value:boolean):void;resting?():boolean}
export async function startScene(pointer:SharedPointer,wake:()=>void):Promise<SceneHandle|undefined>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const elements=Array.from(document.querySelectorAll<HTMLElement>('[data-project-visual]'));if(!elements.length)return;
  if(elements.every(el=>el.hasAttribute('data-hover-preview'))){
    const {createGallery}=await import('./GalleryScene');
    return createGallery(elements,pointer,wake);
  }
  const {createScene}=await import('./runtime');
  let current:SceneHandle|undefined,selected:HTMLElement|undefined,loading=false,dead=false;
  const failed=new Set<HTMLElement>();
  function choose(){
    if(dead||loading)return;
    const visible=elements.filter(el=>{const b=el.getBoundingClientRect();return b.bottom>0&&b.top<innerHeight&&!failed.has(el);});
    const hovered=visible.find(el=>{const r=el.getBoundingClientRect();return el.hasAttribute('data-hover-preview')&&pointer.inside&&pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom;});
    // Gallery covers opt into pointer selection; existing pages keep visibility selection.
    const next=hovered ?? (selected?.hasAttribute('data-hover-preview')&&visible.includes(selected)?selected:undefined) ?? visible.filter(el=>!el.hasAttribute('data-hover-preview')).sort((a,b)=>{const score=(el:HTMLElement)=>{const r=el.getBoundingClientRect();return Math.min(r.bottom,innerHeight)-Math.max(r.top,0);};return score(b)-score(a);})[0];
    if(!next||next===selected){current?.retire?.(false);return;}
    if(selected?.hasAttribute('data-hover-preview')&&current&&!current.resting?.()) {current.retire?.(true);return;}
    current?.dispose();current=undefined;selected=next;loading=true;
    void createScene(next,pointer,wake).then(handle=>{if(dead)handle.dispose();else current=handle;}).catch(error=>{failed.add(next);next.dataset.renderer='static-failed';console.warn('Spatial initialization failed; poster retained.',error);}).finally(()=>{loading=false;wake();});
  }
  choose();
  return {tick(dt){choose();return current?.tick(dt)??false;},resize(){current?.resize();choose();},pause(){current?.pause();},dispose(){dead=true;current?.dispose();}};
}
