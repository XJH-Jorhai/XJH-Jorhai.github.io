import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage({viewport:{width:1440,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4325/experiments/work-index-a/',out='reports/evidence/work-index';
await p.goto(base+'?inspect');await p.waitForFunction(()=>window.__gallery?.snapshot().frames>0);
const v=p.locator('[data-project-visual]');await v.first().scrollIntoViewIfNeeded();await p.waitForTimeout(100);
const left=await v.first().boundingBox(),right=await v.nth(1).boundingBox();
const snapshot=()=>p.evaluate(()=>window.__gallery.snapshot());
await p.mouse.move(left.x+left.width*.85,left.y+left.height*.6);await p.waitForFunction(()=>window.__gallery.snapshot().covers[0].aim[0]>.6);
const start=await snapshot();await p.mouse.move(right.x+right.width*.85,right.y+right.height*.6);
await p.waitForFunction(()=>window.__gallery.snapshot().covers[1].aim[0]>.3,null,{timeout:1500});
const concurrent=await snapshot();assert.ok(concurrent.covers[0].aim[0]>.5);assert.ok(concurrent.covers[1].active);
assert.equal(await p.locator('.spatial-canvas').count(),1);
assert.equal(await p.locator('.spatial-canvas').evaluate(e=>getComputedStyle(e).opacity),'1');
for(const visual of await v.all())assert.equal(await visual.locator('.visual-carrier').evaluate(e=>getComputedStyle(e).opacity),'0');
await p.screenshot({path:`${out}/independent-hover.png`,fullPage:true});
await p.mouse.move(10,100);const samples=[];
for(let i=0;i<7;i++){await p.waitForTimeout(1000);samples.push(await snapshot());assert.equal(await p.locator('.spatial-canvas').evaluate(e=>getComputedStyle(e).opacity),'1');}
for(let i=1;i<samples.length;i++){for(let j=0;j<2;j++)assert.ok(Math.abs(samples[i].covers[j].aim[0])<=Math.abs(samples[i-1].covers[j].aim[0])+.00001);}
assert.ok(samples.at(-1).covers.every(c=>Math.abs(c.aim[0])<.001));
assert.equal(await p.locator('[data-renderer="webgl2"]').count(),2);
const resting=await snapshot();await p.waitForTimeout(400);assert.equal((await snapshot()).frames,resting.frames);
await p.screenshot({path:`${out}/camera-rest.png`,fullPage:true});
for(const theme of ['a','b','c']){await p.goto(base.replace('-a/','-'+theme+'/'));await p.waitForFunction(()=>document.querySelectorAll('[data-renderer="webgl2"]').length===2);await p.screenshot({path:`${out}/theme-${theme}.png`,fullPage:true});}
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await v.first().locator('.visual-carrier').evaluate(e=>getComputedStyle(e).opacity),'1');
const mobile=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto(base);await mobile.locator('img').last().evaluate(i=>i.decode());assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:`${out}/mobile.png`,fullPage:true});
const plain=await b.newPage({javaScriptEnabled:false});await plain.goto(base);await plain.locator('.work-cover').last().click();await plain.waitForURL('**/projects/project-02/');assert.ok(await plain.locator('.prose').first().isVisible());
await p.emulateMedia({reducedMotion:'no-preference'});await p.goto('http://127.0.0.1:4325/?inspect');await p.waitForFunction(()=>window.__spatial?.snapshot().renderer==='webgl2');await p.locator('[data-project-id="project-02"]').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-project-id="project-02"]').dataset.renderer==='webgl2');
assert.deepEqual(errors,[]);await writeFile(`${out}/independent-results.json`,JSON.stringify({browser:b.version(),start,concurrent,samples,errors},null,2));await b.close();console.log('Independent cameras, simultaneous return/hover, opaque rendering, six-second return, idle stop and static adaptations passed.');
