import {readFile, readdir, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const pageNames = ['index','models','commercial','art','hand-drawn','about','contact'];
const clean = text => text.replace(/\s+/g, ' ').trim();
const key = i => `item${i}`;

export function portable($, element) {
  const spans = [];
  function walk(node, marks = []) {
    if (node.type === 'text') spans.push({_type:'span',_key:key(spans.length),text:node.data.replace(/\s+/g,' '),marks});
    else if (node.name === 'br') spans.push({_type:'span',_key:key(spans.length),text:'\n',marks});
    else for (const child of node.children || []) walk(child, ['strong','em'].includes(node.name) ? [...marks,node.name] : marks);
  }
  for (const node of $(element).contents().toArray()) walk(node);
  if (spans.length) {spans[0].text = spans[0].text.trimStart(); spans.at(-1).text = spans.at(-1).text.trimEnd();}
  return {_type:'block',_key:'paragraph',style:'normal',markDefs:[],children:spans};
}

export function photoFrom($, image, base = '', i = 0) {
  const el = $(image);
  const localPath = path.posix.normalize(path.posix.join(base, el.attr('src') || ''));
  if (!localPath.startsWith('images/')) throw new Error(`Unexpected image path: ${localPath}`);
  return {_type:'photo',_key:key(i),localPath,alt:el.attr('alt') || '',portrait:(el.parent().attr('style') || '').includes('3/4')};
}

export async function extractContent() {
  const documents = [];
  const listings = new Map();
  for (const name of ['models','commercial']) {
    const $ = load(await readFile(path.join(root,`${name}.html`),'utf8'));
    $('.model-card-large').each((i,el)=>{
      const slug = path.basename($(el).find('a').attr('href'),'.html');
      listings.set(slug,{kind:name === 'models' ? 'model' : 'commercial',order:i,cardTitle:clean($(el).find('.name').text()),cover:photoFrom($,$(el).find('img'))});
    });
  }
  for (const file of (await readdir(path.join(root,'models'))).filter(f=>f.endsWith('.html')).sort()) {
    const slug = path.basename(file,'.html');
    const $ = load(await readFile(path.join(root,'models',file),'utf8'));
    const listing = listings.get(slug);
    if (!listing) throw new Error(`Project ${slug} is missing from the collection pages.`);
    const body = [];
    $('.case-main-content').children().each((i,node)=>{
      const el = $(node);
      if (el.hasClass('case-text')) body.push({_type:'textSection',_key:key(i),heading:clean(el.find('h3').text()),text:el.find('p').toArray().map((p,j)=>({...portable($,p),_key:key(j)}))});
      else if (el.hasClass('case-gallery')) body.push({_type:'gallerySection',_key:key(i),title:`Photo gallery ${body.filter(b=>b._type==='gallerySection').length+1}`,columns:Number((el.attr('style') || '').match(/repeat\((\d)/)?.[1]) || undefined,photos:el.find('img').toArray().map((img,j)=>photoFrom($,img,'models',j))});
      else if (el.hasClass('case-callout')) body.push({_type:'callout',_key:key(i),value:clean(el.find('.case-callout-num').text()),label:clean(el.find('.case-callout-label').text())});
      else if (!el.hasClass('case-intro') && !el.hasClass('case-nav')) throw new Error(`Unmapped project block in ${file}: ${el.attr('class')}`);
    });
    documents.push({_id:`project-${slug}`,_type:'project',title:clean($('h1').text()),slug:{_type:'slug',current:slug},...listing,hidden:false,eyebrow:clean($('.model-num').text()),description:$('meta[name=description]').attr('content'),hero:photoFrom($,$('.case-hero > img'),'models'),intro:[portable($,$('.case-intro'))],body,sidebar:$('.case-sidebar-block').toArray().map((el,i)=>({_type:'sidebarGroup',_key:key(i),heading:clean($(el).find('h4').text()),items:$(el).find('li').toArray().map(li=>clean($(li).text()))}))});
  }
  for (const name of pageNames) {
    const $ = load(await readFile(path.join(root,`${name}.html`),'utf8'));
    const doc = {_id:`page-${name}`,_type:'page',name:name==='index'?'Home':name==='art'?'Curation':name==='hand-drawn'?'Hand-drawn':name[0].toUpperCase()+name.slice(1),route:name,title:$('title').text(),description:$('meta[name=description]').attr('content'),copy:[]};
    const selector = 'main h1, main h2, main h3, main h4, main p, main .hero-eyebrow, main .page-label, main .sig-label, main .about-label, main .home-stat span, main .stat-item span, main .detail-label, main .detail-value, main a.hero-cta, main a.link-underline, main a.btn-primary';
    $(selector).each((i,node)=>{
      if ($(node).closest('.model-card,.model-card-large').length) return;
      const segments = [];
      let current = node;
      while (current && current.name !== 'main') {
        const siblings = $(current).parent().children(current.name).toArray();
        segments.unshift(`${current.name}:nth-of-type(${siblings.indexOf(current)+1})`);
        current = current.parent;
      }
      const binding = `main > ${segments.join(' > ')}`;
      const value = clean($(node).text());
      doc.copy.push({_type:'copyEntry',_key:key(i),label:value.slice(0,70) || `Text ${i+1}`,selector:binding,value:[portable($,node)]});
    });
    if (name==='index') doc.slides=$('.hero-slide img').toArray().map((img,i)=>photoFrom($,img,'',i));
    if (name==='about') doc.portrait=photoFrom($,$('.about-portrait img'));
    if (['index','about'].includes(name)) doc.featured=$('.model-card,.model-card-large').toArray().map((el,i)=>({_type:'featuredProject',_key:key(i),project:{_type:'reference',_ref:`project-${path.basename($(el).find('a').attr('href'),'.html')}`},image:photoFrom($,$(el).find('img'))}));
    if (['art','hand-drawn'].includes(name)) doc.gallery=$('.art-grid-item').toArray().map((el,i)=>({...photoFrom($,$(el).find('img'),'',i),label:clean($(el).find('.art-item-label').text()),category:$(el).attr('data-category') || ''}));
    if (name==='art') doc.filters=$('.filter-tab').toArray().filter(el=>$(el).attr('data-filter')!=='all').map((el,i)=>({_type:'galleryFilter',_key:key(i),label:clean($(el).text()),value:$(el).attr('data-filter')}));
    documents.push(doc);
  }
  const $ = load(await readFile(path.join(root,'index.html'),'utf8'));
  documents.push({_id:'site-settings',_type:'siteSettings',title:'Site settings',brandFirst:'RACHEL',brandLast:'SEP',footerDescription:$('.footer-brand p').text(),copyright:$('.footer-copy').text(),tagline:$('.footer-tagline').text(),navigation:$('.nav-links a').toArray().map((el,i)=>({_type:'navItem',_key:key(i),label:$(el).text(),path:`/${$(el).attr('href')}`}))});
  const photos=[];
  function collect(value) {if (!value || typeof value!=='object') return; if(value._type==='photo') photos.push(value); for (const child of Object.values(value)) collect(child);}
  collect(documents);
  const missing=[];
  for (const localPath of new Set(photos.map(p=>p.localPath))) try {await access(path.join(root,localPath));} catch {missing.push(localPath);}
  return {documents,photos,missing};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {documents,photos,missing}=await extractContent();
  console.log(JSON.stringify({projects:documents.filter(d=>d._type==='project').length,pages:documents.filter(d=>d._type==='page').length,uniquePhotos:new Set(photos.map(p=>p.localPath)).size,missing},null,2));
  if(missing.length) process.exitCode=1;
}
