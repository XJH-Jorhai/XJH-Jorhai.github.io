import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';

// Render the unmodified upstream component; no redrawing or image generation.
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4333';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath=process.env.BROWSER_EXECUTABLE||(existsSync(edge)?edge:undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
try {
  const page=await browser.newPage();
  await page.goto(base+'/vendor/piston-letter-studio/assets/minecraft/README.md');
  const image=await page.evaluate(async()=>{
    const {DEFAULT_CONFIG}=await import('/vendor/piston-letter-studio/src/default-config.js');
    await import('/vendor/piston-letter-studio/src/piston-letters.js');
    const golem=document.createElement('piston-letters');
    golem.setAttribute('paused','');golem.setAttribute('config',JSON.stringify(DEFAULT_CONFIG));
    document.body.append(golem);await golem.ready;golem.renderAt(0);
    const image=golem.captureFrame(0).toDataURL('image/png').split(',')[1];golem.dispose();return image;
  });
  await mkdir('public/media/piston-golem',{recursive:true});
  await writeFile('public/media/piston-golem/poster.png',Buffer.from(image,'base64'));
  console.log('Original MC poster saved (phase 0, transparent 768 × 768).');
} finally {await browser.close();}
