import {createImageUrlBuilder} from '@sanity/image-url';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validSlug = value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || '');
export const projectPath = p => {
  if (!validSlug(p.slug?.current)) throw new Error(`Invalid project URL: ${p.title}`);
  return `/models/${p.slug.current}.html`;
};

export function richText(blocks = [], inline = false) {
  return blocks.map(block => {
    const contents = (block.children || []).map(span => {
      let value = escapeHtml(span.text).replace(/\n/g, '<br>');
      for (const mark of span.marks || []) {
        if (mark === 'strong') value = `<strong>${value}</strong>`;
        if (mark === 'em') value = `<em class="accent">${value}</em>`;
      }
      return value;
    }).join('');
    return inline ? contents : `<p>${contents}</p>`;
  }).join(inline ? '<br>' : '');
}

export function imageUrl(photo, config = {}, width = 1600) {
  if (photo?.asset?._ref) {
    if (!config.projectId || !config.dataset) throw new Error('Image configuration is missing.');
    return createImageUrlBuilder(config).image(photo).width(width).fit('max').auto('format').url();
  }
  // Local paths exist only in the offline migration snapshot; imported photos
  // become Sanity assets. Never render arbitrary URL protocols from content.
  if (photo?.localPath && /^images\/[a-zA-Z0-9/_ .-]+$/.test(photo.localPath) && !photo.localPath.split('/').includes('..')) return `/${photo.localPath}`;
  throw new Error('A published image has no valid uploaded asset.');
}

export function imageTag(photo, config, {width = 1600, eager = false} = {}) {
  return `<img src="${escapeHtml(imageUrl(photo, config, width))}" alt="${escapeHtml(photo.alt)}" loading="${eager ? 'eager' : 'lazy'}">`;
}

export function projectMain(project, config = {}, neighbours = {}) {
  const commercial = project.kind === 'commercial';
  const index = commercial ? '/commercial.html' : '/models.html';
  const back = commercial ? 'ALL COMMERCIAL' : 'ALL MODELS';
  const body = (project.body || []).map(section => {
    if (section._type === 'textSection') return `<div class="case-text fade-up">${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ''}${richText(section.text)}</div>`;
    if (section._type === 'callout') return `<div class="case-callout fade-up"><span class="case-callout-num">${escapeHtml(section.value)}</span><span class="case-callout-label">${escapeHtml(section.label)}</span></div>`;
    if (section._type === 'gallerySection') {
      const columns = [2,3,4].includes(section.columns) ? section.columns : null;
      return `<div class="case-gallery fade-up"${columns ? ` style="grid-template-columns:repeat(${columns},1fr)"` : ''}>${(section.photos || []).map(photo => `<div class="case-gallery-item"${photo.portrait ? ' style="aspect-ratio:3/4"' : ''} data-lightbox="${escapeHtml(imageUrl(photo, config, 2400))}" data-alt="${escapeHtml(photo.alt)}">${imageTag(photo, config)}${photo.caption ? `<span class="cms-caption">${escapeHtml(photo.caption)}</span>` : ''}</div>`).join('')}</div>`;
    }
    throw new Error(`Unsupported project section: ${section._type}`);
  }).join('');
  const sidebar = (project.sidebar || []).map(group => `<div class="case-sidebar-block fade-up"><h4>${escapeHtml(group.heading)}</h4><ul>${(group.items || []).map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('');
  return `<div class="case-hero">${imageTag(project.hero, config, {width:2400,eager:true})}<div class="case-hero-overlay"><div class="case-hero-text"><a class="back-link" href="${index}">${back}</a><span class="model-num">${escapeHtml(project.eyebrow || (commercial ? 'COMMERCIAL SPACE' : 'MODEL HOME'))}</span><h1>${escapeHtml(project.title)}</h1></div></div></div>
  <section class="case-body"><div class="container"><div class="case-main-content"><p class="case-intro fade-up">${richText(project.intro, true)}</p>${body}<div class="case-nav fade-up">${neighbours.previous ? `<a class="prev" href="${projectPath(neighbours.previous)}">PREVIOUS: ${escapeHtml(neighbours.previous.title)}</a>` : `<a href="${index}">${back}</a>`}${neighbours.next ? `<a class="next" href="${projectPath(neighbours.next)}">NEXT: ${escapeHtml(neighbours.next.title)}</a>` : ''}</div></div><aside class="case-sidebar">${sidebar}</aside></div></section>`;
}

export function projectCard(project, photo, index, home, config) {
  return home ? `<article class="model-card gallery-item fade-up">${imageTag(photo || project.cover,config)}<div class="model-card-overlay"><span class="model-card-num">${String(index+1).padStart(2,'0')}</span><div class="model-card-name">${escapeHtml(project.cardTitle || project.title)}</div><a class="model-card-link" href="${projectPath(project)}">VIEW PROJECT</a></div></article>` : `<article class="model-card-large gallery-item fade-up">${imageTag(photo || project.cover,config)}<div class="overlay"><span class="num">${String(index+1).padStart(2,'0')}</span><div class="name">${escapeHtml(project.cardTitle || project.title)}</div><a class="view-btn" href="${projectPath(project)}">VIEW PROJECT →</a></div></article>`;
}
