import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await p.waitForFunction(()=>window.__gallery);
await p.evaluate(()=>scrollTo(0,530));await p.waitForTimeout(300);
const before=await p.evaluate(()=>window.__gallery.snapshot());
await p.mouse.move(140,710);await p.waitForTimeout(50);
for(let i=0;i<38;i++){await p.mouse.move(140+i*24,710-Math.sin(i/8)*85);await p.waitForTimeout(16);}
const active=await p.evaluate(()=>({state:window.__gallery.snapshot(),field:window.__gallery.inspectFlow()}));
assert.ok(active.field.energy>0&&active.field.velocity>0);assert.ok(active.field.dispersedEnergy>0&&active.field.freshEnergy>0,'Old pigment must disperse while new pigment is still emitted');assert.equal(active.state.contexts,1);
assert.deepEqual(active.state.covers.map(c=>c.renders),before.covers.map(c=>c.renders),'Stationary covers must use cached textures');
await p.screenshot({path:'reports/evidence/work-index/mineral-gpu-moving.png'});
await p.waitForTimeout(350);
const after=await p.evaluate(()=>({state:window.__gallery.snapshot(),field:window.__gallery.inspectFlow()}));
assert.ok(after.state.flow.steps>active.state.flow.steps&&after.field.velocity>0,'GPU advection continues after release');
await p.screenshot({path:'reports/evidence/work-index/mineral-gpu-released.png'});
await p.waitForTimeout(900);
await p.screenshot({path:'reports/evidence/work-index/mineral-gpu-dispersed.png'});
await p.waitForFunction(()=>!window.__blogMotion.running,null,{timeout:10000});
assert.equal(await p.evaluate(()=>window.__gallery.snapshot().flow.remaining),0);
await p.emulateMedia({reducedMotion:'reduce'});
await p.waitForFunction(()=>getComputedStyle(document.querySelector('.spatial-canvas')).visibility==='hidden');
assert.equal(await p.locator('.spatial-canvas').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.deepEqual(errors,[]);
await b.close();console.log('GPU field, inertia, cached covers, single context, idle stop and reduced motion passed.');



