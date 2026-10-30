import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:4325/experiments/work-index-b/?inspect');await p.waitForFunction(()=>window.__gallery);
 await p.evaluate(()=>scrollTo(0,530));await p.waitForTimeout(200);
 await p.mouse.move(150,650);
 for(let i=0;i<70;i++){
  const t=i/69;await p.mouse.move(720-530*Math.cos(t*Math.PI*3),690+Math.sin(t*Math.PI*3)*65);
  await p.waitForTimeout([8,16,33,12,25][i%5]);
 }
 await p.screenshot({path:'reports/evidence/work-index/continuity-reversal.png'});
 await p.waitForTimeout(500);await p.screenshot({path:'reports/evidence/work-index/continuity-release.png'});
}finally{await browser.close();}
