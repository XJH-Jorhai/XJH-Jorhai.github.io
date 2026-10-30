import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='reports/evidence/project-02';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const base=process.env.PREVIEW_URL??'http://127.0.0.1:4322';
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/?inspect');
assert.equal(await page.locator('h1').count(),1);
for(const id of ['project-01','project-02','project-01','project-02']){
 const visual=page.locator(`[data-project-id="${id}"]`);await visual.scrollIntoViewIfNeeded();
 await page.waitForFunction(id=>document.querySelector(`[data-project-id="${id}"]`).dataset.renderer==='webgl2',id);
 assert.equal(await page.locator('.spatial-canvas').count(),1);
}
await page.screenshot({path:`${out}/home.png`});
await page.locator('a[href="/projects/project-02/"]').click();await page.waitForURL('**/projects/project-02/');
assert.ok((await page.locator('.prose').first().innerText()).includes('直流'));
await page.goto(base+'/projects/project-02/?inspect');const visual=page.locator('[data-project-visual]');await visual.scrollIntoViewIfNeeded();
await page.waitForFunction(()=>window.__spatial?.snapshot().renderer==='webgl2');
const shots=[];for(const x of [-1,1]){await page.evaluate(x=>window.__spatial.set({input:[x,0],entry:false,flow:false}),x);await page.waitForTimeout(1000);shots.push(await page.evaluate(()=>window.__spatial.snapshot()));await visual.screenshot({path:`${out}/${x<0?'left':'right'}.png`});}
assert.notDeepEqual(shots[0].camera,shots[1].camera);
await page.evaluate(()=>window.__spatial.set({input:null,entry:true}));await page.mouse.move(0,0);await page.waitForTimeout(600);const box=await visual.boundingBox();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.5);await page.waitForTimeout(150);const entry=await page.evaluate(()=>window.__spatial.snapshot().entry);assert.ok(entry.blur>0);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.__spatial.snapshot().entry.blur),0);
await page.screenshot({path:`${out}/detail.png`,fullPage:true});
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);assert.equal(await page.locator('.spatial-canvas').evaluate(el=>getComputedStyle(el).display),'none');assert.equal(await page.locator('.visual-carrier').evaluate(el=>getComputedStyle(el).opacity),'1');
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto(base+'/projects/project-02/');assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:`${out}/mobile.png`,fullPage:true});
const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(base);assert.equal(await plain.locator('.project-link').count(),2);await plain.locator('a[href="/projects/project-02/"]').click();assert.ok(await plain.locator('.prose').first().isVisible());assert.ok(await plain.locator('.visual-carrier img').evaluate(img=>img.complete&&img.naturalWidth>0));
await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.waitForFunction(()=>window.__spatial);await page.waitForTimeout(500);await page.evaluate(()=>window.__spatial.lose());await page.waitForTimeout(300);assert.equal(await visual.getAttribute('data-renderer'),'static-context-lost');
assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({browser:browser.version(),desktop:[1440,1000],mobile:[390,844],checks:['two projects navigation','single renderer through four switches','camera movement','entry blur and recovery','reduced motion','mobile overflow','no JS content and images','context loss poster'],errors,views:shots},null,2));
await browser.close();console.log('Project 02 browser checks passed');

