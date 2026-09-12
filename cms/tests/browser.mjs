import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {root,pageNames} from '../export.mjs';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if((response.url().startsWith('http://127.0.0.1:8080') || response.url().startsWith('https://cdn.sanity.io/')) && response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
const output=path.join(root,'.cms-checks');
await mkdir(output,{recursive:true});
async function screenshot(name) {
  await page.addStyleTag({content:'*{transition:none!important;animation:none!important}.fade-up{opacity:1!important;transform:none!important}'});
  await page.evaluate(async()=>{for(const img of document.images) if(img.getAttribute('src')) img.loading='eager'; await document.fonts.ready; await Promise.all([...document.images].filter(img=>img.getAttribute('src')).map(img=>img.decode().catch(()=>{})));});
  await page.screenshot({path:path.join(output,name),fullPage:true,animations:'disabled'});
}
try {
  const routes=[...pageNames.map(n=>`/${n}.html`),...(await readdir(path.join(root,'dist/models'))).filter(f=>f.endsWith('.html')).map(f=>`/models/${f}`)];
  for(const route of routes) {
    await page.goto(`http://127.0.0.1:8080${route}`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('main').count(),1,route);
    // Load lazy images by scrolling before checking their network responses.
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,15));}window.scrollTo(0,0);});
  }
  await page.goto('http://127.0.0.1:8080/index.html',{waitUntil:'networkidle'});
  await screenshot('home-desktop.png');
  await page.goto('http://127.0.0.1:8080/art.html',{waitUntil:'networkidle'});
  await page.locator('[data-filter="tortoise"]').click();
  assert.equal(await page.locator('.gallery-item:not(.hidden)').count(),5);
  await page.locator('.gallery-item:not(.hidden)').first().click();
  await assert.doesNotReject(()=>page.locator('.lightbox.open').waitFor());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.lightbox.open').count(),0);
  await page.setViewportSize({width:390,height:844});
  for(const route of ['/index.html','/models.html','/commercial.html','/models/murabella.html','/about.html','/contact.html']) {
    await page.goto(`http://127.0.0.1:8080${route}`,{waitUntil:'networkidle'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    assert.equal(overflow,false,`Horizontal overflow on ${route}`);
  }
  await page.goto('http://127.0.0.1:8080/models/murabella.html',{waitUntil:'networkidle'});
  await page.locator('.nav-menu-btn').click();
  assert.equal(await page.locator('.nav-menu-btn').getAttribute('aria-expanded'),'true');
  await page.locator('.nav-close-btn').click();
  assert.equal(await page.locator('.nav-menu-btn').getAttribute('aria-expanded'),'false');
  await screenshot('project-mobile.png');
  await page.goto('http://127.0.0.1:8080/commercial.html',{waitUntil:'networkidle'});
  await screenshot('commercial-mobile.png');
  assert.deepEqual(errors,[]);
  console.log(`Browser checks passed: ${routes.length} desktop pages; 6 mobile layouts; gallery filtering, lightbox and mobile menu. Screenshots: ${output}`);
} finally {await browser.close();}
