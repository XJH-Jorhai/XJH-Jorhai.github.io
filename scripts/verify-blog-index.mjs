import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:4330';
const out='reports/evidence/blog-index';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[];
const results=[];
for(const width of [1440,768,360]) {
 const page=await browser.newPage({viewport:{width,height:1000},isMobile:width===360,hasTouch:width===360});
 page.on('pageerror',error=>errors.push(String(error)));
 for(const [path,title] of [['/','BLOG'],['/notes/','NOTES'],['/work/','WORK']]) {
  const response=await page.goto(base+path);assert.equal(response.status(),200);
  await page.locator('h1').filter({hasText:title}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} overflow at ${width}`);
  await page.screenshot({path:`${out}/${title.toLowerCase()}-${width}.png`,fullPage:true});
  results.push(`${path} ${width}px: heading, HTTP 200, no horizontal overflow`);
 }
 await page.close();
}
const p=await browser.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',error=>errors.push(String(error)));
await p.goto(base);
await p.getByRole('link',{name:'全部记录'}).click();assert.ok(p.url().endsWith('/notes/'));
const summary=p.locator('summary').first();await summary.focus();await p.keyboard.press('Enter');assert.ok(await p.locator('details').first().getAttribute('open')!==null);
await p.getByRole('navigation').getByRole('link',{name:'Work',exact:true}).click();
await p.waitForFunction(()=>document.querySelector('[data-project-visual]')?.getAttribute('data-motion-ready')==='true',{},{timeout:20000}).catch(()=>{});
await p.locator('.work-title-link').first().click();assert.ok(p.url().includes('/projects/project-01/'));
for(const config of [{javaScriptEnabled:false},{reducedMotion:'reduce'}]) {
 const context=await browser.newContext(config);const page=await context.newPage();
 await page.goto(base+'/notes/');await page.locator('summary').first().click();assert.ok(await page.locator('details').first().getAttribute('open')!==null);
 await page.goto(base);assert.equal(await page.locator('.work-title-link').count(),2);
 await context.close();
}
assert.deepEqual(errors,[]);
await writeFile(`${out}/results.json`,JSON.stringify({browser:browser.version(),results,checks:['navigation to notes and project','keyboard disclosure','no-JS disclosure and home content','reduced-motion content'],errors},null,2));
await browser.close();console.log('Blog, Notes, Work: responsive, navigation, keyboard, no-JS, reduced-motion checks passed.');

