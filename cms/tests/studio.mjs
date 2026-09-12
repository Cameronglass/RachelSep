// Run with `sanity exec cms/tests/studio.mjs --with-user-token -- chromium`.
// Use `webkit` for Safari-engine coverage and `--local-assets` before deploying.
// The HTML shell is supplied locally to isolate Studio from Dashboard login;
// by default every application asset and content request uses the live service.
// Authentication stays in an ephemeral browser context, never in a file.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit} from 'playwright-core';
import {getCliClient} from 'sanity/cli';

const engine=process.argv[2] || 'chromium';
const localAssets=process.argv.includes('--local-assets');
const origin='https://rachelsep-4jmyx4hk.sanity.studio';
const client=getCliClient({apiVersion:'2026-09-01'});
assert.equal(client.config().projectId,'4jmyx4hk');
const token=client.config().token;
assert(token,'Sign in using sanity login before running the editor smoke test.');
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const context=await browser.newContext();
  await context.addInitScript(({origin,token})=>{
    if(location.origin===origin) localStorage.setItem('__studio_auth_token_4jmyx4hk',JSON.stringify({token}));
  },{origin,token});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
  const html=await readFile('studio-dist/index.html','utf8');
  await page.route(origin+'/',route=>route.fulfill({contentType:'text/html',body:html}));
  if(localAssets) await page.route(origin+'/static/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    // Hosting generates this manifest during deploy, not during a plain build.
    if(pathname==='/static/create-manifest.json') return route.continue();
    const file=path.resolve('studio-dist','.'+pathname);
    assert(file.startsWith(path.resolve('studio-dist/static')+path.sep));
    const contentType={'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'}[path.extname(file)] || 'application/octet-stream';
    await route.fulfill({contentType,body:await readFile(file)});
  });
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.getByText('Website content',{exact:true}).waitFor({timeout:30000});
  const menuLinks=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,href:node.getAttribute('href')})).filter(node=>node.href.startsWith('/structure/')));
  assert.equal(menuLinks.length,10,'All project collections, pages and settings must be accessible.');
  for(const id of ['model-projects','commercial-projects','page-index','page-models','page-commercial','page-art','page-hand-drawn','page-about','page-contact','site-settings']) {
    const link=page.locator(`a[href="/structure/${id}"]`);
    await link.click();
    await page.waitForTimeout(500);
    assert.equal(await page.getByText('Encountered an error while reading structure',{exact:true}).count(),0,id);
    await page.getByText('Website content',{exact:true}).waitFor();
  }
  await page.locator('a[href="/structure/model-projects"]').click();
  await page.getByRole('link',{name:/Murabella/i}).first().waitFor({timeout:15000});
  await page.getByRole('link',{name:/Murabella/i}).first().click();
  await page.getByText('Project name',{exact:true}).waitFor({timeout:15000});
  assert.deepEqual(errors,[],'The signed-in editor must render without console or page errors.');
  await mkdir('.cms-checks',{recursive:true});
  await page.screenshot({path:`.cms-checks/editor-${engine}.png`,fullPage:true});
  console.log(`Studio checks passed (${engine}, ${localAssets?'local':'deployed'} assets): 10 menu entries and existing project form; no content modified.`);
} finally {await browser.close();}
