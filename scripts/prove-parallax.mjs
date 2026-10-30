import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('console',m=>console.log(m.type(),m.text()));page.on('pageerror',e=>console.log(e));
await page.goto('http://127.0.0.1:4322/?inspect');await page.waitForFunction(()=>window.__spatial);await page.waitForTimeout(700);
const results=[];
for(const flat of [false,true])for(const x of [-1,0,1]){await page.evaluate(({flat,x})=>window.__spatial.set({flat,input:[x,0],dof:false,flow:false}),{flat,x});await page.waitForTimeout(1600);results.push(await page.evaluate(()=>window.__spatial.snapshot()));await page.screenshot({path:`reports/evidence/${flat?'flat':'parallax'}-${x}.png`});}
await writeFile('reports/evidence/parallax-measurements.json',JSON.stringify(results,null,2));await browser.close();

