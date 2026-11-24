import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4341';
const server = process.env.PREVIEW_URL ? undefined : spawn(process.execPath,
  ['scripts/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', '4341'],
  { stdio: 'inherit', windowsHide: true });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (i === 59) throw new Error('Preview server did not become ready');
    await delay(500);
  }
  browser = await chromium.launch({headless:true,
    ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
  const errors=[];
  for (const width of [1440, 768, 360]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',isMobile:width===360,hasTouch:width===360});
    page.on('pageerror', error => errors.push(String(error)));
    for (const [path,title] of [['/','FIELDNOTES'],['/notes/','NOTES'],['/work/','WORK'],['/persona/','Persona']]) {
      assert.equal((await page.goto(base+path)).status(),200);
      assert.ok((await page.locator('h1').textContent()).includes(title),`${path}: h1`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path}: overflow at ${width}`);
      await page.locator('img').evaluateAll(images=>{for(const image of images)image.loading='eager';return Promise.all(images.map(image=>image.decode()));});
      // Reduced motion: the eye-follow layers are never fetched.
      if(path==='/')assert.equal(await page.locator('.hp-eye img').count(),0,`eyes loaded with reduced motion at ${width}`);
    }
    await page.close();
  }
  const page=await browser.newPage({reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base);
  await page.getByRole('link',{name:'全部记录'}).click();
  assert.equal(new URL(page.url()).pathname,'/notes/');
  await page.locator('summary').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('details').first().evaluate(el=>el.open),true);
  await page.getByRole('navigation').getByRole('link',{name:'Work',exact:true}).click();
  for (let i=0;i<2;i++) {
    await page.goto(base+'/work/');
    await page.locator('.work-title-link').nth(i).click();
    assert.equal(new URL(page.url()).pathname,`/projects/project-0${i+1}/`);
    assert.ok((await page.locator('.prose').first().textContent()).length>100);
  }
  // Paged home (motion allowed): a deep link opens its page, keys and in-page links switch pages.
  const paged=await browser.newPage({viewport:{width:1280,height:800}});
  paged.on('pageerror',error=>errors.push(String(error)));
  await paged.goto(base+'/#work');
  const current=()=>paged.evaluate(()=>document.documentElement.dataset.page);
  assert.equal(await paged.evaluate(()=>document.documentElement.classList.contains('paged')),true);
  assert.equal(await current(),'work');
  assert.equal(await paged.locator('#work').isVisible(),true);
  assert.equal(await paged.locator('#cover').isVisible(),false);
  await paged.keyboard.press('ArrowDown');
  await paged.waitForFunction(()=>document.documentElement.dataset.page==='notes');
  await paged.waitForTimeout(900); // keys pressed while the blades are still moving are ignored on purpose
  await paged.keyboard.press('ArrowDown');
  await paged.waitForFunction(()=>document.documentElement.dataset.page==='about');
  assert.equal(await paged.locator('#about .hp-figure').isVisible(),true);
  assert.equal(await paged.locator('#about a[href="/persona/"]').count(),1);
  assert.equal(await paged.locator('#about-heading').isVisible(),true);
  // Eye follow: both eyes load on a fine pointer, and the irises turn towards the pointer.
  await paged.waitForFunction(()=>document.querySelectorAll('#about .hp-eye.is-ready').length===2);
  await paged.mouse.move(8,400,{steps:4});
  await paged.waitForFunction(()=>parseFloat(document.querySelector('#about').style.getPropertyValue('--ex'))<-.3,null,{timeout:15000});
  // Petting: rubbing back and forth over her head makes hearts rise.
  const head=await paged.locator('#about [data-hp-head]').boundingBox();
  for(let i=0;i<12;i++){await paged.mouse.move(head.x+head.width*(i%2?.75:.25),head.y+head.height*.5,{steps:4});await paged.waitForTimeout(60);}
  await paged.waitForFunction(()=>document.querySelectorAll('#about .hp-heart').length>0,null,{timeout:5000});
  await paged.mouse.move(640,4,{steps:4});
  await paged.waitForTimeout(900);
  await paged.locator('[data-pager] a').last().click();
  await paged.waitForFunction(()=>document.documentElement.dataset.page==='end');
  assert.equal(await paged.locator('.site-footer').isVisible(),true);
  await paged.waitForTimeout(900);
  await paged.getByRole('link',{name:/Back to top/}).click();
  await paged.waitForFunction(()=>document.documentElement.dataset.page==='cover');
  assert.ok(await paged.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'paged home: overflow');
  await paged.close();
  // Persona: choosing an expression switches the stage.
  const persona=await browser.newPage({viewport:{width:1280,height:800}});
  persona.on('pageerror',error=>errors.push(String(error)));
  await persona.goto(base+'/persona/');
  await persona.locator('[data-mood-pick="shy"]').click();
  assert.equal(await persona.locator('[data-p-mood]').getAttribute('data-mood'),'shy');
  assert.equal(await persona.locator('[data-mood-zh]').textContent(),'害羞');
  assert.equal(await persona.locator('[data-mood-pick][aria-pressed="true"]').count(),1);
  await persona.close();
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await noJS.newPage();
  await staticPage.goto(base+'/notes/');
  await staticPage.locator('summary').first().click();
  assert.equal(await staticPage.locator('details').first().evaluate(el=>el.open),true);
  await staticPage.goto(base);
  assert.equal(await staticPage.locator('.work-title-link').count(),2);
  await staticPage.goto(base+'/persona/');
  assert.equal(await staticPage.locator('.p-pick img').count(),6);
  assert.equal(await staticPage.locator('.p-view img').count(),3);
  assert.deepEqual(errors,[]);
  console.log(`Passed: ${browser.version()}, responsive indexes, images, navigation, keyboard, reduced motion, paged home, persona, no JavaScript.`);
} finally {
  await browser?.close();
  server?.kill();
}
