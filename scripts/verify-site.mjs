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
    for (const [path,title] of [['/','BLOG'],['/notes/','NOTES'],['/work/','WORK']]) {
      assert.equal((await page.goto(base+path)).status(),200);
      assert.equal(await page.locator('h1').textContent(),title);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path}: overflow at ${width}`);
      await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
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
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await noJS.newPage();
  await staticPage.goto(base+'/notes/');
  await staticPage.locator('summary').first().click();
  assert.equal(await staticPage.locator('details').first().evaluate(el=>el.open),true);
  await staticPage.goto(base);
  assert.equal(await staticPage.locator('.work-title-link').count(),2);
  assert.deepEqual(errors,[]);
  console.log(`Passed: ${browser.version()}, responsive indexes, images, navigation, keyboard, reduced motion, no JavaScript.`);
} finally {
  await browser?.close();
  server?.kill();
}
