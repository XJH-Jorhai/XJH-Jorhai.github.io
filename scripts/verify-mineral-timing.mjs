import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await page.waitForFunction(()=>window.__gallery);
 await page.mouse.move(200,210);await page.waitForTimeout(40);
 for(let i=0;i<80;i++){const t=i/79;await page.mouse.move(200+t*1020,250+Math.sin(t*Math.PI*4)*110);await page.waitForTimeout(16);}
 const samples=[];
 for(const [name,delay] of [['active',0],['600ms',600],['1500ms',900],['3000ms',1500]]){
  await page.waitForTimeout(delay);samples.push({name,...await page.evaluate(()=>window.__gallery.inspectFlow())});
  await page.screenshot({path:`reports/evidence/work-index/timing-${name}.png`});
 }
 for(let i=1;i<samples.length;i++)assert.ok(samples[i].energy<samples[i-1].energy,'Released wake should lose density continuously');
 await page.waitForFunction(()=>!window.__blogMotion.running,null,{timeout:10000});
 console.log(JSON.stringify(samples));
}finally{await browser.close();}
