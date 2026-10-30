import sharp from 'sharp';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await p.waitForFunction(()=>window.__gallery);
await p.evaluate(()=>scrollTo(0,350));await p.waitForTimeout(300);
for(let i=0;i<65;i++){await p.mouse.move(100+i*18,620+Math.sin(i/9)*120);await p.waitForTimeout(12)}
await p.screenshot({path:'reports/evidence/work-index/fluid-solver-active.png'});
for(let i=0;i<20;i++){await p.mouse.move(850+i*16,450+Math.sin(i/6)*35);await p.waitForTimeout(12)}
const pair=await p.evaluate(()=>[window.__gallery.captureRefraction(false),window.__gallery.captureRefraction(true)]);
const images=await Promise.all(pair.map(async (url,i)=>{const input=Buffer.from(url.split(',')[1],'base64');await sharp(input).toFile('reports/evidence/work-index/refraction-'+(i?'on':'off')+'.png');return sharp(input).raw().toBuffer({resolveWithObject:true})}));
let changed=0,edgeChanged=0;const [a,c]=images;
for(let y=252;y<674;y++)for(let x=734;x<1368;x++){const k=(y*a.info.width+x)*a.info.channels;let delta=0;for(let j=0;j<3;j++)delta+=Math.abs(a.data[k+j]-c.data[k+j]);if(delta>3){changed++;if(x===734||x===1367||y===252||y===673)edgeChanged++}}
assert.ok(changed>50,'Refraction must change photo pixels');assert.equal(edgeChanged,0,'Aperture perimeter remains fixed');console.log({changed,edgeChanged});
const active=await p.evaluate(()=>window.__gallery.snapshot());assert.equal(active.contexts,1);assert.ok(active.flow.steps>0);
await p.waitForTimeout(650);await p.screenshot({path:'reports/evidence/work-index/fluid-solver-release.png'});
assert.ok((await p.evaluate(()=>window.__gallery.snapshot())).flow.steps>active.flow.steps);
await p.waitForFunction(()=>!window.__blogMotion.running,null,{timeout:12000});
assert.equal(await p.evaluate(()=>window.__gallery.snapshot().flow.remaining),0);
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>getComputedStyle(document.querySelector('.spatial-canvas')).visibility==='hidden');
assert.deepEqual(errors,[]);console.log(JSON.stringify({active,errors}));await b.close();
