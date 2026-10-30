import {chromium} from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage({viewport:{width:1440,height:1100}}),out='reports/evidence/work-index';
await p.goto('http://127.0.0.1:4325/experiments/work-index-a/?inspect');await p.waitForFunction(()=>window.__gallery?.snapshot().frames>0);
const results=[];
for(let i=0;i<2;i++){
 const v=p.locator('[data-project-visual]').nth(i);await v.scrollIntoViewIfNeeded();const rect=await v.boundingBox(),captures=[],aims=[];
 for(const [name,x,y] of [['left',.01,.01],['right',.99,.99]]){
  await p.mouse.move(rect.x+rect.width*x,rect.y+rect.height*y);await p.waitForTimeout(1000);
  aims.push(await p.evaluate(i=>window.__gallery.snapshot().covers[i].aim,i));
  const png=await v.screenshot({path:`${out}/fixed-${i+1}-${name}.png`});captures.push(await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true}));
 }
 assert.ok(aims[0][0]<-.9&&aims[1][0]>.9);
 const {width,height,channels}=captures[0].info;let edgeMax=0,interiorSum=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<channels;c++){
  const offset=(y*width+x)*channels+c,d=Math.abs(captures[0].data[offset]-captures[1].data[offset]);
  // Background top/bottom/right edge bands: no wires intersect these strips.
  if(y<5||y>=height-5||x>=width-5)edgeMax=Math.max(edgeMax,d);else interiorSum+=d;
 }
 assert.ok(edgeMax<=1,`Moving border pixels: ${edgeMax}`);assert.ok(interiorSum>1000);
 assert.deepEqual(await v.boundingBox(),rect);results.push({project:i+1,edgeMax,interiorSum,aims});
}
await writeFile(`${out}/fixed-aperture-results.json`,JSON.stringify(results,null,2));await b.close();console.log(JSON.stringify(results));
