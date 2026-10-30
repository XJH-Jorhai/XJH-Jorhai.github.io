import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('http://127.0.0.1:4325/experiments/work-index/');
assert.equal(await page.locator('html').getAttribute('lang'),'en');
assert.ok(!/[\u4e00-\u9fff]/u.test(await page.locator('body').innerText()));
assert.ok(!(await page.locator('body').innerText()).includes('02'));
const covers=await page.locator('[data-project-visual]').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height};}));
assert.ok(Math.abs(covers[0].width-covers[1].width)<.1);assert.ok(Math.abs(covers[0].height-covers[1].height)<.1);assert.ok(Math.abs(covers[0].width/covers[0].height-1.5)<.001);
for(const item of await page.locator('.work-item').all()){
 const tags=item.locator('.work-tags'),label=item.locator('.title-label');const text=await tags.innerText();assert.equal(text,text.toUpperCase());
 assert.ok((await tags.boundingBox()).y<(await label.boundingBox()).y);
 const textWidth=await tags.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect().width;});assert.ok(textWidth>(await label.boundingBox()).width);
}
const title=page.locator('.work-title-link').first();await title.scrollIntoViewIfNeeded();
const label=title.locator('.title-label');const before=await label.boundingBox();await title.hover();await page.waitForTimeout(400);
const after=await label.boundingBox();assert.ok(after.x>before.x+20);
assert.equal(await title.locator('.title-arrow').evaluate(el=>getComputedStyle(el).opacity),'1');
await page.screenshot({path:'reports/evidence/work-index/english-title-hover.png',fullPage:true});
await page.mouse.move(0,0);await page.waitForTimeout(400);await page.screenshot({path:'reports/evidence/work-index/desktop.png',fullPage:true});
for(const width of [320,390,768]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const link of await page.locator('.work-title-link').all()){
  const fits=await link.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('.title-label'));return range.getClientRects().length===1&&el.querySelector('.title-label').getBoundingClientRect().width<el.getBoundingClientRect().width;});assert.ok(fits);
 }
 if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'reports/evidence/work-index/responsive-390.png',fullPage:true});}
}
await browser.close();console.log('English copy, one-line titles, hover arrow and responsive layout passed.');


