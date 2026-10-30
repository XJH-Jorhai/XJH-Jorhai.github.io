import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

// Run against the *built* Astro preview: npm run build && npm run preview.
// The script exercises browser behavior and records observations as well as assertions.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4321';
const output = path.resolve('reports/evidence');
await mkdir(output, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(edge) ? { executablePath: edge } : {}) });
const results = { timestamp: new Date().toISOString(), base, browser: browser.version(), environment: {}, checks: [], actions: [], errors: [], measurements: {} };
const visualSelector = '[data-project-visual]';
const projectHref = '/projects/project-01/';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pause = (page, milliseconds) => page.waitForTimeout(milliseconds);
const action = (label, details = {}) => results.actions.push({ label, at: new Date().toISOString(), ...details });
async function check(id, label, task) {
  try { const evidence = await task(); results.checks.push({ id, label, status: 'PASS', evidence }); }
  catch (error) { results.checks.push({ id, label, status: 'FAIL', error: error.message }); }
}
function instrument(page, scenario, expectedFailure = false) {
  page.on('pageerror', error => results.errors.push({ scenario, type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') results.errors.push({ scenario, type: 'console', expectedFailure, message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) results.errors.push({ scenario, type: 'http', expectedFailure, status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => results.errors.push({ scenario, type: 'requestfailed', expectedFailure, url: request.url(), message: request.failure()?.errorText }));
}
async function screenshot(page, name, fullPage = false) {
  const target = path.join(output, `${name}.png`);
  if (fullPage) {
    const originalScroll = await page.evaluate(() => scrollY);
    for (const image of await page.locator('img[loading="lazy"]').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element => element.decode().catch(() => {}));
    }
    await page.evaluate(y => scrollTo(0, y), originalScroll); await pause(page, 300);
  }
  await page.screenshot({ path: target, fullPage, animations: 'allow' });
  return path.relative(process.cwd(), target).replaceAll('\\', '/');
}
async function motion(page) {
  return page.evaluate(() => {
    const api = window.__blogMotion;
    if (!api) return null;
    return typeof api.snapshot === 'function' ? api.snapshot() : typeof api.getState === 'function' ? api.getState() : JSON.parse(JSON.stringify(api));
  });
}
async function canvasState(page) {
  return page.evaluate(() => [...document.querySelectorAll('canvas')].map(canvas => {
    const context = canvas.getContext('2d');
    if (!context) return { width: canvas.width, height: canvas.height, type: 'not-2d' };
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let alphaSum = 0; let visiblePixels = 0; let maximumAlpha = 0;
    for (let index = 3; index < data.length; index += 4) { alphaSum += data[index]; if (data[index] > 0) visiblePixels++; maximumAlpha = Math.max(maximumAlpha, data[index]); }
    return { width: canvas.width, height: canvas.height, alphaSum, visiblePixels, maximumAlpha };
  }));
}
async function domState(page) {
  return page.evaluate(selector => {
    const visual = document.querySelector(selector);
    const rect = visual?.getBoundingClientRect();
    const title = document.querySelector('h1');
    return {
      url: location.href, scrollX, scrollY, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      documentWidth: document.documentElement.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      finePointer: matchMedia('(pointer: fine)').matches,
      title: title?.textContent?.trim(), titleStyle: title ? { x: getComputedStyle(title).getPropertyValue('--title-x'), y: getComputedStyle(title).getPropertyValue('--title-y'), active: getComputedStyle(title).getPropertyValue('--title-active') } : null,
      visual: visual ? { attributes: Object.fromEntries([...visual.attributes].map(attribute => [attribute.name, attribute.value])), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        children: [...visual.querySelectorAll('*')].filter(element => /carrier|focus|blur|sharp/.test(element.className?.baseVal ?? element.className)).map(element => ({ tag: element.tagName, class: element.className, style: element.getAttribute('style'), transform: getComputedStyle(element).transform, opacity: getComputedStyle(element).opacity, mask: getComputedStyle(element).maskImage })) } : null,
      images: [...document.images].map(image => ({ src: image.currentSrc, alt: image.alt, width: image.naturalWidth, height: image.naturalHeight, complete: image.complete, loading: image.loading })),
      textSelection: getSelection()?.toString(), visibility: document.visibilityState
    };
  }, visualSelector);
}
async function checkOverflow(page) {
  const state = await domState(page);
  assert(state.documentWidth <= state.viewport.width + 1, `Horizontal overflow: ${state.documentWidth} > ${state.viewport.width}`);
  return state;
}
async function colors(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    const luminance = color => color.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...document.querySelectorAll('h1, h2, p, nav a, figcaption, footer a')].filter(element => element.textContent.trim() && element.getBoundingClientRect().height).map(element => {
      const style = getComputedStyle(element); let ancestor = element; let background;
      while (ancestor) { const value = rgb(getComputedStyle(ancestor).backgroundColor); if (value[3] === 255) { background = value; break; } ancestor = ancestor.parentElement; }
      background ??= [255, 255, 255, 255];
      const foreground = rgb(style.color); const alpha = foreground[3] / 255;
      const composite = foreground.map((value, index) => index === 3 ? 255 : value * alpha + background[index] * (1 - alpha));
      const light = luminance(composite); const dark = luminance(background);
      const ratio = (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700);
      return { tag: element.tagName, text: element.textContent.trim().slice(0, 80), color: style.color, background, fontSize: style.fontSize, fontWeight: style.fontWeight, ratio: Number(ratio.toFixed(2)), required: large ? 3 : 4.5 };
    });
  });
}
async function focusWithKeyboard(page, href) {
  await page.mouse.click(8, 8);
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({ href: document.activeElement?.getAttribute('href'), outline: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth }));
    if (focused.href === href) return focused;
  }
  throw new Error(`Keyboard did not reach ${href}`);
}
async function gradientEnergy(file, rectangle) {
  const { data, info } = await sharp(file).extract(rectangle).greyscale().raw().toBuffer({ resolveWithObject: true });
  let total = 0;
  for (let y = 1; y < info.height - 1; y++) for (let x = 1; x < info.width - 1; x++) {
    const index = y * info.width + x;
    total += Math.abs(4 * data[index] - data[index - 1] - data[index + 1] - data[index - info.width] - data[index + info.width]);
  }
  return total / ((info.width - 2) * (info.height - 2));
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await desktop.newPage(); instrument(page, 'desktop');
  await page.goto(base, { waitUntil: 'networkidle' });
  results.environment = await page.evaluate(() => ({ userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory ?? null, screen: { width: screen.width, height: screen.height }, viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio, finePointer: matchMedia('(pointer: fine)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, touchPoints: navigator.maxTouchPoints }));
  results.environment.gpu = await page.evaluate(() => { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl'); const debug = gl?.getExtension('WEBGL_debug_renderer_info'); return debug ? { vendor: gl.getParameter(debug.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) } : 'unavailable'; });
  await page.mouse.move(-10, -10); await pause(page, 1400);
  await check('C02', 'Desktop initial composition and dimensions', async () => {
    const state = await checkOverflow(page);
    assert(state.title && state.visual, 'Title or semantic project visual absent');
    assert(state.images.some(image => image.complete && image.width > 0 && image.alt), 'Semantic poster did not decode');
    const entry = await page.locator(`a[href="${projectHref}"]`).first().boundingBox();
    assert(entry && entry.y >= 0 && entry.y + entry.height <= 900, 'Project entry falls outside initial 900px viewport');
    return { screenshot: await screenshot(page, 'desktop-home'), state, projectEntry: entry, motion: await motion(page) };
  });
  await check('C03', 'Slow, fast, stop, decay, and offscreen trail', async () => {
    await page.mouse.move(100, 250); await page.mouse.move(1000, 320, { steps: 45 });
    await pause(page, 100); action('slow trail sweep', { from: [100, 250], to: [1000, 320], steps: 45 });
    const slow = { pixels: await canvasState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-step-01-trail-slow') };
    await page.mouse.move(250, 420, { steps: 3 });
    action('fast trail sweep', { from: [1000, 320], to: [250, 420], steps: 3 });
    const fast = { pixels: await canvasState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-step-02-trail-fast') };
    await pause(page, 300); const decay = { pixels: await canvasState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-step-03-trail-decay-300ms') };
    await page.mouse.move(-10, -10); await pause(page, 1400);
    const ended = { pixels: await canvasState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-step-04-trail-rest') };
    const visible = Math.max(...[...slow.pixels, ...fast.pixels].map(canvas => canvas.alphaSum ?? 0));
    assert(visible > 0, 'No visible trail pixels after real pointer movement');
    assert(ended.pixels.every(canvas => canvas.alphaSum === 0), 'Trail did not completely clear after leaving and waiting');
    await page.locator('#notes').scrollIntoViewIfNeeded(); await pause(page, 500);
    const offscreen = { state: await domState(page), motion: await motion(page), pixels: await canvasState(page) };
    const notes = await page.locator('#notes').boundingBox();
    await page.mouse.move(notes.x + notes.width * .5, Math.min(850, notes.y + notes.height * .5), { steps: 5 }); await pause(page, 1100);
    offscreen.afterMove = { motion: await motion(page), pixels: await canvasState(page) };
    action('native reading-area move after 1100ms', offscreen);
    assert(offscreen.afterMove.pixels.every(canvas => canvas.alphaSum === 0), 'Trail continues into reading area');
    await page.evaluate(() => scrollTo(0, 0)); await pause(page, 400);
    return { slow, fast, decay, ended, offscreen };
  });
  await page.evaluate(() => scrollTo(0, 0)); await pause(page, 500);
  await check('C04', 'Home title local pointer response and reset', async () => {
    const title = page.locator('h1'); const box = await title.boundingBox();
    assert(box, 'No visible home title');
    const states = [];
    for (const [name, x] of [['left', 0.2], ['right', 0.6]]) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * 0.5, { steps: 12 }); await pause(page, 300);
      states.push({ name, state: await domState(page), motion: await motion(page), screenshot: await screenshot(page, `interaction-title-home-${name}`) });
    }
    await page.mouse.move(-10, -10); await pause(page, 1200);
    states.push({ name: 'rest', state: await domState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-title-home-rest') });
    assert(states[0].motion?.titles[0].active > .9 && states[1].motion?.titles[0].active > .9, 'Home title did not activate');
    assert(states[1].motion.titles[0].x - states[0].motion.titles[0].x > box.width * .25, 'Title local response did not follow pointer');
    assert(states[2].motion.titles[0].active < .01, 'Title did not reset on exit');
    return states;
  });
  await check('C05', 'Cover center, left, right, top, bottom, and return', async () => {
    const visual = page.locator(visualSelector).first(); await visual.scrollIntoViewIfNeeded(); await pause(page, 400);
    const box = await visual.boundingBox(); assert(box && box.height > 50, 'No visible project image');
    const states = [];
    for (const [name, x, y] of [['center', .5, .5], ['left', .2, .5], ['right', .8, .5], ['top', .5, .2], ['bottom', .5, .8]]) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 14 }); await pause(page, 420);
      action(`cover focus ${name}`, { normalizedPointer: [x, y] });
      states.push({ name, state: await domState(page), motion: await motion(page), screenshot: await screenshot(page, `interaction-cover-${name}`) });
    }
    await page.mouse.move(-10, -10); await pause(page, 1400);
    states.push({ name: 'rest', state: await domState(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-cover-rest') });
    const left = states.find(state => state.name === 'left').motion?.visuals[0];
    const right = states.find(state => state.name === 'right').motion?.visuals[0];
    const top = states.find(state => state.name === 'top').motion?.visuals[0];
    const bottom = states.find(state => state.name === 'bottom').motion?.visuals[0];
    const rest = states.find(state => state.name === 'rest').motion?.visuals[0];
    assert(left?.ready && right?.ready && left.active > .9 && right.active > .9, 'Focus image layers were not ready and active');
    assert(right.x - left.x > 2 && bottom.y - top.y > 2, 'Cover did not follow both pointer axes');
    assert(right.focusX - left.focusX > left.width * .25 && bottom.focusY - top.focusY > top.height * .25, 'Focus mask did not follow both axes');
    assert(rest.active < .01 && Math.abs(rest.x) < .1 && Math.abs(rest.y) < .1, 'Cover did not return to clear centered rest');
    // The same two real image details are sampled in left/right focus screenshots.
    // Edge energy is evidence of the rendered clear/soft relation, not a scientific image metric.
    const sharpness = {};
    for (const state of states.filter(state => ['left', 'right'].includes(state.name))) {
      const rect = state.state.visual.rect;
      const patches = [['left', .25], ['right', .75]];
      sharpness[state.name] = {};
      for (const [name, fraction] of patches) {
        const rectangle = { left: Math.round(rect.x + rect.width * fraction - 45), top: Math.round(rect.y + rect.height * .5 - 45), width: 90, height: 90 };
        if (rectangle.left >= 0 && rectangle.top >= 0 && rectangle.top + 90 <= 900) sharpness[state.name][name] = await gradientEnergy(path.resolve(state.screenshot), rectangle);
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 }); await pause(page, 500);
    const next = await visual.boundingBox(); await page.mouse.move(next.x + next.width * .75, next.y + next.height * .4); await pause(page, 450);
    const resized = { state: await checkOverflow(page), motion: await motion(page), screenshot: await screenshot(page, 'interaction-cover-resized') };
    await page.setViewportSize({ width: 1440, height: 900 }); await pause(page, 400);
    await page.mouse.move(-10, -10); await pause(page, 1400);
    const idleBefore = await motion(page); await pause(page, 350); const idleAfter = await motion(page);
    assert(idleBefore.running === false && idleAfter.frames === idleBefore.frames, 'Continuous frame loop did not stop after settling');
    return { states, resized, sharpness, idle: { before: idleBefore, after: idleAfter } };
  });
  await check('C06', 'Semantic navigation, direct detail, refresh, history, selection, native scroll, anchor, keyboard', async () => {
    await page.locator(`a[href="${projectHref}"]`).first().click(); await page.waitForURL(`**${projectHref}`); await page.waitForLoadState('networkidle');
    await page.reload({ waitUntil: 'networkidle' }); assert(await page.locator('h1').innerText(), 'Reload lost content');
    const title = page.locator('h1'); await title.scrollIntoViewIfNeeded(); const box = await title.boundingBox(); const titleStates = [];
    for (const [name, factor] of [['left', .2], ['right', .6]]) { await page.mouse.move(box.x + box.width * factor, box.y + box.height * .5); await pause(page, 350); titleStates.push({ name, motion: await motion(page), state: await domState(page), screenshot: await screenshot(page, `interaction-title-project-${name}`) }); }
    assert(titleStates[0].motion?.titles[0].active > .9 && titleStates[1].motion?.titles[0].active > .9, 'Detail title did not activate');
    assert(titleStates[1].motion.titles[0].x - titleStates[0].motion.titles[0].x > box.width * .25, 'Detail title response did not follow position');
    await page.mouse.move(-10, -10); await pause(page, 1400);
    const detail = await checkOverflow(page); const detailScreenshot = await screenshot(page, 'desktop-project', true);
    const detailVisual = page.locator(visualSelector).first(); await detailVisual.scrollIntoViewIfNeeded();
    const detailBox = await detailVisual.boundingBox(); const detailCoverStates = [];
    for (const [name, x, y] of [['left', .2, .5], ['right', .8, .5], ['top', .5, .2], ['bottom', .5, .8]]) {
      await page.mouse.move(detailBox.x + detailBox.width * x, detailBox.y + detailBox.height * y, { steps: 14 }); await pause(page, 500);
      detailCoverStates.push({ name, motion: await motion(page), screenshot: await screenshot(page, `detail-cover-${name}`) });
    }
    await page.mouse.move(-10, -10); await pause(page, 1400);
    detailCoverStates.push({ name: 'rest', motion: await motion(page), screenshot: await screenshot(page, 'detail-cover-rest') });
    const detailLeft = detailCoverStates[0].motion.visuals[0], detailRight = detailCoverStates[1].motion.visuals[0];
    const detailTop = detailCoverStates[2].motion.visuals[0], detailBottom = detailCoverStates[3].motion.visuals[0], detailRest = detailCoverStates[4].motion.visuals[0];
    assert(detailRight.x - detailLeft.x > 2 && detailBottom.y - detailTop.y > 2, 'Detail cover did not follow both axes');
    assert(detailRight.focusX - detailLeft.focusX > detailLeft.width * .25 && detailBottom.focusY - detailTop.focusY > detailTop.height * .25, 'Detail focus mask did not follow both axes');
    assert(detailRest.active === 0 && detailRest.x === 0 && detailRest.y === 0, 'Detail cover did not reset');
    const paragraph = page.locator('.prose p').first(); await paragraph.scrollIntoViewIfNeeded(); const paragraphBox = await paragraph.boundingBox();
    await page.mouse.click(paragraphBox.x + Math.min(80, paragraphBox.width / 2), paragraphBox.y + paragraphBox.height / 2, { clickCount: 3 });
    const selected = await page.evaluate(() => getSelection()?.toString()); assert(selected?.trim().length > 0, 'Native text selection failed');
    const readingScreenshot = await screenshot(page, 'desktop-reading');
    await page.mouse.click(20, 20); const before = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 480); await pause(page, 250); const after = await page.evaluate(() => scrollY);
    const scrollPossible = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight);
    assert(!scrollPossible || after !== before || after === await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 'Native scroll did not move page');
    const contrast = await colors(page); assert(contrast.every(sample => sample.ratio >= sample.required), `Text contrast failures: ${JSON.stringify(contrast.filter(sample => sample.ratio < sample.required))}`);
    await page.goto(`${base}${projectHref}`, { waitUntil: 'networkidle' }); assert((await page.locator('h1').innerText()).trim(), 'Direct detail URL failed');
    const returnLink = page.locator('a[href="/"]').first(); await returnLink.click(); await page.waitForURL(`${base}/`); await page.goBack({ waitUntil: 'networkidle' }); assert(page.url().endsWith(projectHref), 'Native back did not restore detail');
    const hrefs = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    const internal = [...new Set(hrefs.filter(href => href.startsWith('/') || href.startsWith('#')))]; const links = [];
    for (const href of internal) { const url = new URL(href, page.url()); const response = await page.request.get(url.href.split('#')[0]); assert(response.ok(), `Broken internal target ${href}`); if (url.hash && url.pathname === new URL(page.url()).pathname) assert(await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count(), `Broken fragment ${href}`); links.push({ href, status: response.status() }); }
    await page.goto(base, { waitUntil: 'networkidle' }); const anchor = page.locator('a[href="#notes"]').first(); let anchorResult = null;
    if (await anchor.count()) { const href = await anchor.getAttribute('href'); await anchor.click(); await pause(page, 250); anchorResult = { href, url: page.url(), scrollY: await page.evaluate(() => scrollY) }; assert(new URL(page.url()).hash === href, 'Anchor URL was not preserved'); }
    await page.goto(base, { waitUntil: 'networkidle' }); const focus = await focusWithKeyboard(page, projectHref); assert(focus.outline !== 'none' && focus.outlineWidth !== '0px', 'Keyboard focus outline invisible'); const keyboardScreenshot = await screenshot(page, 'keyboard-focus'); await page.keyboard.press('Enter'); await page.waitForURL(`**${projectHref}`);
    return { titleStates, detail, detailCoverStates, detailScreenshot, readingScreenshot, selectedText: selected.slice(0, 140), nativeScroll: { before, after }, contrast, links, anchorResult, keyboard: { focus, screenshot: keyboardScreenshot, navigated: page.url() } };
  });
  await check('C07', 'Touch 390 and narrow 360, one-tap navigation', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const mobile = await context.newPage(); instrument(mobile, 'touch');
    await mobile.goto(base, { waitUntil: 'networkidle' }); const home = await checkOverflow(mobile); const homeScreenshot = await screenshot(mobile, 'mobile-home', true);
    assert(home.images.some(image => image.width > 0 && image.alt), 'Mobile poster missing');
    await mobile.locator(`a[href="${projectHref}"]`).first().tap(); await mobile.waitForURL(`**${projectHref}`); await mobile.waitForLoadState('networkidle'); const project = await checkOverflow(mobile); const projectScreenshot = await screenshot(mobile, 'mobile-project', true);
    await mobile.setViewportSize({ width: 360, height: 800 }); const narrow = await checkOverflow(mobile); const narrowScreenshot = await screenshot(mobile, 'mobile-360', true);
    const state = await motion(mobile); await context.close(); return { home, project, narrow, motion: state, screenshots: [homeScreenshot, projectScreenshot, narrowScreenshot] };
  });
  await check('C06', 'Equivalent 200% page zoom reflow (720 CSS pixels at DPR 2)', async () => {
    const context = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }); const zoom = await context.newPage(); instrument(zoom, '200-percent-equivalent');
    await zoom.goto(base, { waitUntil: 'networkidle' }); const home = await checkOverflow(zoom); const homeScreenshot = await screenshot(zoom, 'zoom-200-home', true);
    await zoom.goto(`${base}${projectHref}`, { waitUntil: 'networkidle' }); const project = await checkOverflow(zoom); const projectScreenshot = await screenshot(zoom, 'zoom-200-project', true);
    await context.close(); return { method: '1440×900 physical frame represented by 720×450 CSS viewport at DPR 2; equivalent page reflow, not browser UI zoom setting', home, project, screenshots: [homeScreenshot, projectScreenshot] };
  });
  await check('C07', 'Reduced motion disables continuous response while preserving content and navigation', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const reduced = await context.newPage(); instrument(reduced, 'reduced-motion');
    await reduced.goto(base, { waitUntil: 'networkidle' }); const before = await domState(reduced); await reduced.mouse.move(200, 300); await reduced.mouse.move(1100, 600, { steps: 20 }); await pause(reduced, 600);
    const after = await domState(reduced); const pixels = await canvasState(reduced); const state = await motion(reduced);
    assert(before.reducedMotion && after.reducedMotion, 'Reduced-motion media query not active'); assert(pixels.every(canvas => canvas.alphaSum === 0), 'Reduced mode still draws trail');
    assert(state.enabled === false && state.running === false && state.visuals.every(visual => visual.active === 0 && visual.x === 0 && visual.y === 0), 'Reduced motion still follows pointer');
    const evidence = await screenshot(reduced, 'reduced-motion-home'); await reduced.locator(`a[href="${projectHref}"]`).first().click(); await reduced.waitForURL(`**${projectHref}`); assert((await reduced.locator('h1').innerText()).trim(), 'Reduced-motion navigation failed'); await context.close(); return { before, after, pixels, motion: state, screenshot: evidence };
  });
  await check('C07', 'No-JavaScript HTML poster, content, and links', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const noJs = await context.newPage(); instrument(noJs, 'no-js');
    await noJs.goto(base, { waitUntil: 'networkidle' }); const home = await domState(noJs); assert(home.images.some(image => image.alt && image.width > 0), 'No-JS semantic image missing'); const homeScreenshot = await screenshot(noJs, 'no-js-home');
    await noJs.locator(`a[href="${projectHref}"]`).first().click(); await noJs.waitForURL(`**${projectHref}`); assert(await noJs.locator('article').innerText(), 'No-JS article absent'); const detail = await checkOverflow(noJs); const projectScreenshot = await screenshot(noJs, 'no-js-project', true);
    await context.close(); return { home, detail, screenshots: [homeScreenshot, projectScreenshot] };
  });
  await check('C07', 'Decorative soft-focus image request failure retains clear semantic poster', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const failed = await context.newPage(); instrument(failed, 'blur-failure', true); const blocked = [];
    await failed.route('**/*', route => { if (/blur|soft/i.test(new URL(route.request().url()).pathname)) { blocked.push(route.request().url()); return route.abort('failed'); } return route.continue(); });
    await failed.goto(base, { waitUntil: 'networkidle' }); const visual = failed.locator(visualSelector).first(); await visual.scrollIntoViewIfNeeded(); const box = await visual.boundingBox(); await failed.mouse.move(box.x + box.width * .3, box.y + box.height * .5); await pause(failed, 800); const state = await domState(failed);
    const motionState = await motion(failed);
    assert(blocked.length > 0, 'No decorative blur request was actually blocked'); assert(state.images.some(image => image.alt && image.width > 0), 'Clear semantic poster failed with decoration');
    assert(motionState.visuals.every(visual => !visual.ready && visual.active === 0), 'Failed decorative layer left focus active');
    const evidence = await screenshot(failed, 'resource-failure-home'); await failed.locator(`a[href="${projectHref}"]`).first().click(); await failed.waitForURL(`**${projectHref}`); await context.close(); return { blocked, state, motion: motionState, screenshot: evidence };
  });
  await check('C07', 'Soft-focus resource fails after successful initialization, then recovers', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const late = await context.newPage(); instrument(late, 'late-blur-failure', true);
    await late.goto(base, { waitUntil: 'networkidle' }); await late.waitForFunction(() => window.__blogMotion?.visuals[0]?.ready);
    const visual = late.locator(visualSelector).first(); await visual.scrollIntoViewIfNeeded(); const box = await visual.boundingBox();
    await late.mouse.move(box.x + box.width * .3, box.y + box.height * .4); await pause(late, 400);
    const before = await motion(late); const blur = late.locator('[data-visual-blur] img');
    const original = await blur.evaluate(image => ({ src: image.getAttribute('src'), srcset: image.getAttribute('srcset') }));
    await blur.evaluate(image => { image.removeAttribute('srcset'); image.src = '/__verification-missing-soft-focus.webp'; });
    await late.waitForFunction(() => window.__blogMotion?.visuals[0]?.ready === false); await pause(late, 300);
    const failed = { motion: await motion(late), state: await domState(late), screenshot: await screenshot(late, 'resource-late-failure') };
    assert(failed.motion.visuals[0].active === 0 && failed.motion.visuals[0].x === 0 && failed.motion.visuals[0].y === 0, 'Late resource failure left transformed soft-focus state');
    assert(failed.state.images.some(image => image.alt && image.width > 0), 'Late resource failure removed semantic poster');
    await blur.evaluate((image, attributes) => { image.setAttribute('src', attributes.src); if (attributes.srcset) image.setAttribute('srcset', attributes.srcset); }, original);
    await late.waitForFunction(() => window.__blogMotion?.visuals[0]?.ready); await late.mouse.move(box.x + box.width * .7, box.y + box.height * .4); await pause(late, 500);
    const restored = { motion: await motion(late), screenshot: await screenshot(late, 'resource-late-recovered') }; assert(restored.motion.visuals[0].active > .9, 'Recovered image did not re-enable focus');
    await context.close(); return { before, failed, restored };
  });
  await check('C08', 'Repeated navigation keeps one pointer listener; settled and offscreen animation stops', async () => {
    const cdp = await desktop.newCDPSession(page);
    const listeners = async () => {
      const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      return listeners.map(listener => ({ type: listener.type, passive: listener.passive, useCapture: listener.useCapture }));
    };
    const navigation = [];
    for (const url of [base, `${base}${projectHref}`, base]) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const events = await listeners(); const state = await motion(page);
      assert(events.filter(event => event.type === 'pointermove').length === 1, 'Repeated navigation duplicated pointermove listeners');
      assert(state.pointerSources === 1, 'Motion reports duplicated input sources');
      navigation.push({ url, events, motion: state });
    }
    await page.mouse.move(-10, -10); await pause(page, 1400);
    const idleBefore = await motion(page); await pause(page, 300); const idleAfter = await motion(page);
    assert(!idleBefore.running && idleBefore.frames === idleAfter.frames, 'Idle render loop continued');
    await page.setViewportSize({ width: 1440, height: 500 });
    await page.locator('#notes').evaluate(element => element.scrollIntoView({ block: 'start' }));
    // The site's intentional 28px anchor scroll-padding leaves the previous field visible.
    await page.mouse.wheel(0, 100); await page.mouse.move(-10, -10); await pause(page, 1400);
    const offscreenBefore = await motion(page); await pause(page, 300); const offscreenAfter = await motion(page);
    assert(!offscreenBefore.trail.visible && !offscreenBefore.running && offscreenBefore.frames === offscreenAfter.frames, 'Offscreen field did not suspend');
    await page.setViewportSize({ width: 1440, height: 900 }); await page.evaluate(() => scrollTo(0, 0));
    const rAF = page.evaluate(() => new Promise(resolve => {
      const stamps = []; let previous;
      const sample = now => { if (previous !== undefined) stamps.push(now - previous); previous = now; if (stamps.length >= 90) resolve(stamps); else requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
    }));
    await page.mouse.move(100, 250); await page.mouse.move(1200, 350, { steps: 60 });
    const intervals = await rAF; const sorted = [...intervals].sort((a, b) => a - b);
    const frameSampling = { count: intervals.length, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * .95)], maximumMs: sorted.at(-1), intervalsMs: intervals, method: '90 browser requestAnimationFrame intervals while moving a real Playwright mouse; headless Edge, no FPS guarantee' };
    const background = await desktop.newPage(); await background.goto('about:blank'); await background.bringToFront(); await pause(page, 200);
    const hidden = await motion(page);
    const visibility = hidden.hidden ? { status: 'PASS', state: hidden } : { status: 'UNVERIFIED', reason: 'Headless browser keeps this tab visible after switching tabs', state: hidden };
    if (hidden.hidden) assert(!hidden.running && hidden.trail.points === 0, 'Hidden page did not stop and reset');
    await background.close(); await page.bringToFront(); await cdp.detach();
    return { navigation, idle: { before: idleBefore, after: idleAfter }, offscreen: { before: offscreenBefore, after: offscreenAfter }, frameSampling, visibility };
  });
  results.measurements.finalMotion = await motion(page);
  results.measurements.finalDom = await domState(page);
  await desktop.close();
  const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => { const file = path.join(directory, entry.name); return entry.isDirectory() ? walk(file) : [file]; }))).flat();
  const builtFiles = await walk(path.resolve('dist'));
  results.measurements.javascript = await Promise.all(builtFiles.filter(file => file.endsWith('.js')).map(async file => { const data = await readFile(file); return { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), bytes: data.length, gzipBytes: gzipSync(data).length }; }));
  results.measurements.javascriptTotalGzipBytes = results.measurements.javascript.reduce((sum, file) => sum + file.gzipBytes, 0);
  results.measurements.assets = await Promise.all(builtFiles.filter(file => /\.(webp|avif|png|jpg|jpeg)$/.test(file)).map(async file => ({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), bytes: (await stat(file)).size, ...(await sharp(file).metadata().then(({ width, height, format }) => ({ width, height, format }))) })));
} finally {
  await writeFile(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
  await writeFile(path.join(output, 'interaction-actions.json'), JSON.stringify(results.actions, null, 2));
  await browser.close();
}
for (const item of results.checks) console.log(`${item.status} ${item.id} ${item.label}${item.error ? `: ${item.error}` : ''}`);
console.log(`Browser evidence: ${path.join(output, 'browser-results.json')}`);
if (results.checks.some(item => item.status === 'FAIL') || results.errors.some(item => !item.expectedFailure && item.type !== 'requestfailed')) process.exitCode = 1;
