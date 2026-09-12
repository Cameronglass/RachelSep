import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {schemaTypes} from './cms/schema.js';
import {ProjectPreview} from './cms/ProjectPreview.jsx';

const projectId=process.env.SANITY_STUDIO_PROJECT_ID;
if(!projectId) throw new Error('Add SANITY_STUDIO_PROJECT_ID to .env before opening the editor.');
const pageNames={index:'Home',models:'Model homes',commercial:'Commercial spaces',art:'Art & curation','hand-drawn':'Hand-drawn artwork',about:'About',contact:'Contact'};

export default defineConfig({
  name:'rachel-portfolio',
  title:'Rachel Sepulveda · Website editor',
  projectId,
  dataset:process.env.SANITY_STUDIO_DATASET || 'production',
  plugins:[structureTool({
    structure:S=>S.list().title('Website content').items([
      S.listItem().title('Model homes').child(S.documentTypeList('project').title('Model homes').filter('_type == "project" && kind == "model"').initialValueTemplates([S.initialValueTemplateItem('model-home')])),
      S.listItem().title('Commercial spaces').child(S.documentTypeList('project').title('Commercial spaces').filter('_type == "project" && kind == "commercial"').initialValueTemplates([S.initialValueTemplateItem('commercial-space')])),
      S.divider(),
      ...Object.entries(pageNames).map(([route,title])=>S.listItem().title(title).child(S.document().schemaType('page').documentId(`page-${route}`).title(title))),
      S.divider(),
      S.listItem().title('Site settings').child(S.document().schemaType('siteSettings').documentId('site-settings')),
    ]),
    defaultDocumentNode:(S,{schemaType})=>S.document().views(schemaType==='project'?[S.view.form(),S.view.component(ProjectPreview).title('Preview')]:[S.view.form()]),
  })],
  schema:{types:schemaTypes,templates:previous=>[
    ...previous.filter(t=>!['page','siteSettings','project'].includes(t.schemaType)),
    {id:'model-home',title:'Model home',schemaType:'project',value:{kind:'model',hidden:false,order:100}},
    {id:'commercial-space',title:'Commercial space',schemaType:'project',value:{kind:'commercial',hidden:false,order:100}},
  ]},
  document:{
    actions:(actions,{schemaType})=>['page','siteSettings'].includes(schemaType)?actions.filter(a=>!['delete','duplicate','unpublish'].includes(a.action)):actions,
    newDocumentOptions:(options,{creationContext})=>creationContext.type==='global'?options.filter(o=>['model-home','commercial-space'].includes(o.templateId)):options,
  },
});
