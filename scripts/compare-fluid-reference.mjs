import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
for(const [name,url] of [['reference','https://lusion.co/projects/'],['local','http://127.0.0.1:4325/experiments/work-index-b/']]){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(url,{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 for(let i=0;i<40;i++){const t=i/39;await page.mouse.move(720+350*Math.cos(t*6.28),490+100*Math.sin(t*6.28));await page.waitForTimeout(4)}
 await page.screenshot({path:`reports/evidence/work-index/compare-${name}-active.png`});await page.waitForTimeout(500);await page.screenshot({path:`reports/evidence/work-index/compare-${name}-release.png`});await page.close();
}await browser.close();
