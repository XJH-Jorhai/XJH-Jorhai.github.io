import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const p=await b.newPage({viewport:{width:1440,height:1000}});let errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await p.waitForFunction(()=>window.__gallery);await p.mouse.move(400,500);await p.waitForTimeout(100);
for(let i=1;i<=22;i++){await p.mouse.move(400+i*22,500);await p.waitForTimeout(12)}
let samples=[];for(let i=0;i<4;i++){if(i)await p.waitForTimeout(400);samples.push(await p.evaluate(()=>window.__gallery.inspectFlow()));await p.screenshot({path:'reports/evidence/work-index/dispersion-'+i+'.png'})}
console.log(JSON.stringify({samples,errors}));assert.deepEqual(errors,[]);assert.ok(samples[2].varianceY>samples[0].varianceY*1.2,'Wake must broaden after release');await b.close();
