import React from 'react';
import {useClient} from 'sanity';
import stylesheet from '../css/style.css?raw';
import siteScript from '../js/main.js?raw';
import {projectMain,escapeHtml} from './render.mjs';

export function ProjectPreview({document}) {
  const client=useClient({apiVersion:'2026-09-01'});
  const project=document.displayed;
  let html;
  try {
    html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.title || 'Project preview')}</title><style>${stylesheet}\n.fade-up{opacity:1!important;transform:none!important;transition:none!important}a{pointer-events:none}.case-gallery-item{position:relative}.cms-caption{position:absolute;bottom:0;left:0;right:0;padding:8px;background:#0009;color:white}</style></head><body><main>${projectMain(project,client.config())}</main><script>${siteScript.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
  } catch {
    return <div style={{padding:24,fontFamily:'sans-serif'}}>Add a project name and upload the cover and header photos to see the page preview. This preview shows unpublished edits; the public site changes only after publishing and a successful Netlify build.</div>;
  }
  return <div style={{height:'100%',display:'flex',flexDirection:'column'}}><p style={{padding:'10px 16px',margin:0,fontSize:13}}>Draft preview · Your unpublished changes · Photo enlargement and navigation are disabled here.</p><iframe title="Project page draft preview" sandbox="allow-scripts" srcDoc={html} style={{border:0,width:'100%',flex:1,minHeight:600}} /></div>;
}
