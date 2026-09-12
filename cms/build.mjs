import {readFile,writeFile,mkdir,cp,rename,rm,mkdtemp,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {createClient} from '@sanity/client';
import {root,pageNames,extractContent} from './export.mjs';
import {escapeHtml,richText,imageUrl,imageTag,projectMain,projectCard,projectPath} from './render.mjs';

export function validateDocuments(documents) {
  if (!Array.isArray(documents)) throw new Error('Content response was not an array.');
  const ids=new Set(), urls=new Set();
  for(const doc of documents) {
    if (!doc._id || ids.has(doc._id)) throw new Error('Duplicate or missing document ID.');
    if(doc._id.startsWith('drafts.') || doc._id.startsWith('versions.')) throw new Error('Unpublished content cannot enter a production build.');
    ids.add(doc._id);
    if(doc._type==='project') {
      const url=projectPath(doc);
      if(urls.has(url)) throw new Error(`Duplicate project address: ${url}`);
      urls.add(url);
      if(!['model','commercial'].includes(doc.kind) || !doc.title) throw new Error(`Invalid project: ${doc._id}`);
      if(!doc.hidden && (!doc.hero || !doc.cover)) throw new Error(`Missing cover or hero: ${doc.title}`);
    }
  }
  for(const id of ['site-settings',...pageNames.map(n=>`page-${n}`)]) if(!ids.has(id)) throw new Error(`Missing required content: ${id}. Complete the initial import before publishing.`);
}

export async function renderPages(documents,config={}) {
  validateDocuments(documents);
  const pages=new Map();
  const projects=documents.filter(d=>d._type==='project' && !d.hidden).sort((a,b)=>(a.order??0)-(b.order??0)||a.title.localeCompare(b.title));
  const byId=new Map(projects.map(p=>[p._id,p]));
  const settings=documents.find(d=>d._id==='site-settings');
  const {documents:originals}=await extractContent();
  const originalPages=new Map(originals.filter(d=>d._type==='page').map(d=>[d._id,d]));
  function finish($) {
    $('.nav-logo,.footer-logo').html(`${escapeHtml(settings.brandFirst)} <span>${escapeHtml(settings.brandLast)}</span>`);
    $('.footer-brand p').text(settings.footerDescription || '');
    $('.footer-copy').text(settings.copyright || '');
    $('.footer-tagline').text(settings.tagline || '');
    for(const item of settings.navigation || []) {
      if(!/^\/(?:index|models|commercial|art|hand-drawn|about|contact)\.html$/.test(item.path)) throw new Error('Invalid navigation destination.');
      $('a[href]').each((i,node)=>{
        if(path.posix.basename($(node).attr('href'))===path.posix.basename(item.path) && $(node).closest('.nav-links,.nav-mobile-overlay').length) $(node).text(item.label);
      });
    }
    // Absolute asset paths also work on Netlify's extensionless pretty URLs.
    $('[href],[src],[data-lightbox]').each((i,node)=>{
      for(const attr of ['href','src','data-lightbox']) {
        const value=$(node).attr(attr);
        if(value && !/^(?:[a-z]+:|\/|#)/i.test(value)) $(node).attr(attr,`/${value.replace(/^(?:\.\.\/)+/,'')}`);
      }
    });
    $('head').append('<style>.cms-caption{position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:#0009;color:white;font-size:12px}.case-gallery-item{position:relative}</style>');
    return $.html();
  }
  for(const name of pageNames) {
    const page=documents.find(d=>d._id===`page-${name}`);
    const $=load(await readFile(path.join(root,`${name}.html`),'utf8'));
    $('title').text(page.title);
    $('meta[name=description]').attr('content',page.description || '');
    const allowed=new Set(originalPages.get(page._id).copy.map(c=>c.selector));
    for(const copy of page.copy || []) {
      if(!allowed.has(copy.selector)) throw new Error(`Unknown text field on ${name}: ${copy.label}`);
      const element=$(copy.selector);
      if(element.length!==1) throw new Error(`Text field no longer matches its template: ${name}: ${copy.label}`);
      element.html(richText(copy.value,true));
    }
    if(['models','commercial'].includes(name)) $('.models-full-grid').html(projects.filter(p=>p.kind===(name==='models'?'model':'commercial')).map((p,i)=>projectCard(p,null,i,false,config)).join(''));
    if(['index','about'].includes(name)) {
      const selected=(page.featured || []).flatMap(item=>byId.has(item.project?._ref)?[{project:byId.get(item.project._ref),image:item.image}]:[]);
      $(name==='index'?'.models-grid-home':'.models-full-grid').html(selected.map((item,i)=>projectCard(item.project,item.image,i,name==='index',config)).join(''));
    }
    if(name==='index') $('.hero-slides').html((page.slides || []).map((photo,i)=>`<div class="hero-slide${i===0?' active':''}">${imageTag(photo,config,{width:2400,eager:i===0})}</div>`).join(''));
    if(name==='about') $('.about-portrait').html(page.portrait?imageTag(page.portrait,config,{eager:true}):'');
    if(['art','hand-drawn'].includes(name)) {
      $('.art-grid,.hand-drawn-grid').html((page.gallery || []).map(photo=>`<div class="art-grid-item gallery-item fade-up" data-category="${escapeHtml(photo.category || '')}" data-lightbox="${escapeHtml(imageUrl(photo,config,2400))}" data-alt="${escapeHtml(photo.alt)}">${imageTag(photo,config)}<div class="art-grid-item-overlay"><span class="art-item-label">${escapeHtml(photo.label || photo.caption || '')}</span></div></div>`).join(''));
      if(name==='art') {
        $('.filter-tab').remove();
        $('.filter-bar-inner').append(`<button class="filter-tab active" data-filter="all">ALL</button>${(page.filters || []).map(filter=>`<button class="filter-tab" data-filter="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</button>`).join('')}`);
      }
    }
    pages.set(`${name}.html`,finish($));
  }
  const template=await readFile(path.join(root,'models/murabella.html'),'utf8');
  for(const project of projects) {
    const $=load(template);
    const group=projects.filter(p=>p.kind===project.kind), index=group.indexOf(project);
    $('title').text(`${project.title} | Rachel Sepulveda`);
    $('meta[name=description]').attr('content',project.description || '');
    $('.nav-links a').removeClass('active');
    $(`.nav-links a[href="../${project.kind==='commercial'?'commercial':'models'}.html"]`).addClass('active');
    $('main').html(projectMain(project,config,{previous:group[index-1],next:group[index+1]}));
    pages.set(projectPath(project).slice(1),finish($));
  }
  return pages;
}

export async function build({local=false}={}) {
  const config={projectId:process.env.SANITY_STUDIO_PROJECT_ID,dataset:process.env.SANITY_STUDIO_DATASET || 'production'};
  let documents;
  if(local) {
    const snapshot=await extractContent();
    if(snapshot.missing.length) console.warn(`Existing missing images: ${snapshot.missing.join(', ')}`);
    documents=snapshot.documents;
  } else {
    if(!config.projectId) throw new Error('Set SANITY_STUDIO_PROJECT_ID and import content first. For an offline preview use npm run build:local.');
    const client=createClient({...config,apiVersion:'2026-09-01',useCdn:false,perspective:'published',token:process.env.SANITY_API_TOKEN,timeout:30000});
    documents=await client.fetch('*[_type in ["project","page","siteSettings"]]');
  }
  const rendered=await renderPages(documents,config);
  const output=path.join(root,'dist');
  try {await access(output); await access(path.join(output,'.cms-generated'));} catch(error) {
    if(await access(output).then(()=>true,()=>false)) throw new Error('dist exists but was not created by this builder; move it before building.');
  }
  const stage=await mkdtemp(path.join(root,'.cms-build-'));
  try {
    for(const directory of ['css','js','images']) await cp(path.join(root,directory),path.join(stage,directory),{recursive:true});
    for(const [file,html] of rendered) {await mkdir(path.dirname(path.join(stage,file)),{recursive:true}); await writeFile(path.join(stage,file),html);}
    await writeFile(path.join(stage,'.cms-generated'),'Generated by cms/build.mjs\n');
    // Only previously generated output can be replaced. Sources are never edited.
    await rm(output,{recursive:true,force:true});
    await rename(stage,output);
  } catch(error) {await rm(stage,{recursive:true,force:true}); throw error;}
  console.log(`Built ${rendered.size} pages from ${local?'local source files':'published Sanity content'} into dist/.`);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) build({local:process.argv.includes('--local')}).catch(error=>{console.error(error.message);process.exitCode=1;});
