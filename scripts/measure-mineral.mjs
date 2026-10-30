import {chromium} from '@playwright/test';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await p.waitForFunction(()=>window.__gallery);await p.evaluate(()=>scrollTo(0,530));
const stats=await p.evaluate(async()=>{const samples=[];let last=performance.now(),start=last;return await new Promise(resolve=>{function step(now){samples.push(now-last);last=now;const t=(now-start)/1000;window.dispatchEvent(new PointerEvent('pointermove',{clientX:720+Math.sin(t*3)*530,clientY:700+Math.cos(t*4)*80,pointerType:'mouse'}));if(t<4)requestAnimationFrame(step);else {samples.shift();samples.sort((a,b)=>a-b);resolve({frames:samples.length,median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1)});}}requestAnimationFrame(step);});});
console.log(JSON.stringify(stats));await b.close();
