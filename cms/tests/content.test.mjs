import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {extractContent,root,pageNames} from '../export.mjs';
import {renderPages,validateDocuments} from '../build.mjs';
import {imageUrl,richText,projectPath} from '../render.mjs';

const snapshot=await extractContent();
const copy=()=>structuredClone(snapshot.documents);
const baseline=await renderPages(copy());
const normalized=text=>text.replace(/\s+/g,' ').trim();

test('migration discovers all existing projects, pages and available photographs',()=>{
  assert.equal(snapshot.documents.filter(d=>d._type==='project').length,14);
  assert.equal(snapshot.documents.filter(d=>d._type==='page').length,7);
  assert.equal(new Set(snapshot.photos.map(p=>p.localPath)).size,84);
  assert.deepEqual(snapshot.missing,[]);
  assert.equal(baseline.size,21);
});

test('every original project keeps its heading, narrative, gallery images and sidebar',async()=>{
  for(const project of snapshot.documents.filter(d=>d._type==='project')) {
    const file=projectPath(project).slice(1);
    const original=load(await readFile(path.join(root,file),'utf8'));
    const output=load(baseline.get(file));
    for(const selector of ['h1','.case-intro','.case-text h3','.case-text p','.case-callout span','.case-sidebar h4','.case-sidebar li']) assert.deepEqual(output(selector).toArray().map(el=>normalized(output(el).text())),original(selector).toArray().map(el=>normalized(original(el).text())),`${file} ${selector}`);
    const originals=original('.case-gallery img').toArray().map(img=>original(img).attr('src').replace(/^\.\.\//,'/'));
    const current=output('.case-gallery img').toArray().map(img=>output(img).attr('src'));
    assert.deepEqual(current,originals,file);
    assert.equal(output('.case-gallery').length,original('.case-gallery').length);
  }
});

test('page text, emphasis, line breaks and images survive the content conversion',async()=>{
  for(const name of pageNames) {
    const original=load(await readFile(path.join(root,`${name}.html`),'utf8'));
    const output=load(baseline.get(`${name}.html`));
    for(const selector of ['main h1','main p','main strong','main em']) assert.deepEqual(output(selector).toArray().map(el=>normalized(output(el).text())),original(selector).toArray().map(el=>normalized(original(el).text())),`${name}: ${selector}`);
    assert.equal(output('main br').length,original('main br').length,name);
    assert.equal(output('main img').length,original('main img').length,name);
  }
});

test('a new commercial space gets a page and listing without editing HTML',async()=>{
  const docs=copy();
  const project={...structuredClone(docs.find(d=>d._id==='project-overlook')),_id:'project-test-new',title:'New space & studio',slug:{current:'new-space'},order:999};
  docs.push(project);
  const pages=await renderPages(docs);
  assert(pages.has('models/new-space.html'));
  const $=load(pages.get('commercial.html'));
  assert.equal($('.model-card-large').length,5);
  assert.equal($('.model-card-large').last().find('.name').text(),project.cardTitle); // Existing short title wins.
  assert.equal($('.model-card-large').last().find('a').attr('href'),'/models/new-space.html');
  assert.equal(load(pages.get('models/new-space.html'))('h1').text(),project.title);
});

test('hidden projects disappear from their page, collection, featured cards and next links',async()=>{
  const docs=copy();
  docs.find(d=>d._id==='project-westlake').hidden=true;
  const pages=await renderPages(docs);
  assert(!pages.has('models/westlake.html'));
  for(const html of pages.values()) assert.equal(load(html)('a[href="/models/westlake.html"]').length,0);
});

test('reordering and replacing gallery images changes output and lightbox together',async()=>{
  const docs=copy();
  const project=docs.find(d=>d._id==='project-murabella');
  const gallery=project.body.find(b=>b._type==='gallerySection');
  gallery.photos.reverse();
  gallery.photos[0]={_type:'photo',localPath:'images/murabella/murabella-6.jpg',alt:'Replacement photo'};
  const $=load((await renderPages(docs)).get('models/murabella.html'));
  assert.equal($('.case-gallery-item').first().attr('data-lightbox'),'/images/murabella/murabella-6.jpg');
  assert.equal($('.case-gallery-item img').first().attr('alt'),'Replacement photo');
});

test('editing page text and homepage selections updates the public HTML',async()=>{
  const docs=copy();
  const page=docs.find(d=>d._id==='page-index');
  const field=page.copy.find(c=>c.value[0].children.some(s=>s.text.includes('ART IS')));
  field.value=[{_type:'block',children:[{_type:'span',text:'A new headline',marks:[]}]}];
  page.featured=[];
  const $=load((await renderPages(docs)).get('index.html'));
  assert.equal($('.hero-title').text(),'A new headline');
  assert.equal($('.model-card').length,0);
});

test('production rejects missing singletons, drafts, invalid and duplicate page addresses',()=>{
  assert.throws(()=>validateDocuments([]),/Missing required/);
  const docs=copy();
  docs[0]._id='drafts.example';
  assert.throws(()=>validateDocuments(docs),/Unpublished/);
  const duplicate=copy();
  const projects=duplicate.filter(d=>d._type==='project');
  projects[1].slug=projects[0].slug;
  assert.throws(()=>validateDocuments(duplicate),/Duplicate project address/);
  assert.throws(()=>projectPath({slug:{current:'../../index'}}),/Invalid project/);
});

test('content cannot inject markup, image protocols or paths outside the site',()=>{
  const html=richText([{children:[{text:'<script>alert(1)</script>',marks:['script']}]}]);
  assert(!html.includes('<script>'));
  assert.throws(()=>imageUrl({localPath:'javascript:alert(1)'}),/no valid/);
  assert.throws(()=>imageUrl({localPath:'images/../../.env'}),/no valid/);
});

test('generated internal links and local images resolve, and the existing form endpoint is preserved',async()=>{
  for(const [file,html] of baseline) {
    const $=load(html);
    for(const element of $('a[href],img[src],link[href],script[src]').toArray()) {
      const url=$(element).attr('href') || $(element).attr('src');
      if(!url || !url.startsWith('/') || url.startsWith('//')) continue;
      const target=url.split(/[?#]/)[0].slice(1);
      if(target.endsWith('.html')) assert(baseline.has(target),`${file} → ${target}`);
      else await access(path.join(root,target));
    }
  }
  assert.equal(load(baseline.get('contact.html'))('#contact-form').attr('action'),'https://formspree.io/f/xnjllodq');
});
