const required=Rule=>Rule.required();
const string=(name,title,extra={})=>({name,title,type:'string',...extra});
const text=(name,title,extra={})=>({name,title,type:'text',rows:3,...extra});
const array=(name,title,type,extra={})=>({name,title,type:'array',of:[{type}],...extra});
const rich=(name,title,extra={})=>({name,title,type:'richText',...extra});
const photo=(name,title,extra={})=>({name,title,type:'photo',...extra});
const routeIs=(...routes)=>({document})=>!routes.includes(document?.route);

export const schemaTypes=[
  {name:'richText',title:'Text',type:'array',of:[{type:'block',styles:[{title:'Normal',value:'normal'}],lists:[],marks:{decorators:[{title:'Bold',value:'strong'},{title:'Emphasis',value:'em'}],annotations:[]}}]},
  {name:'photo',title:'Photo',type:'image',options:{hotspot:true},fields:[
    string('alt','Image description',{description:'Describe what is in the photograph for visitors using screen readers.',validation:required}),
    string('caption','Caption'),
    string('label','Gallery display label'),
    string('category','Gallery filter',{description:'For the curation page, use a matching filter value such as westlake.'}),
    {name:'portrait',title:'Portrait crop in project gallery',type:'boolean',initialValue:false},
  ],validation:Rule=>Rule.custom(value=>!value || value.asset?._ref ? true:'Upload or select a photograph.'),preview:{select:{title:'alt',subtitle:'caption',media:'asset'}}},
  {name:'textSection',title:'Text section',type:'object',fields:[string('heading','Heading'),rich('text','Text')],preview:{select:{title:'heading'},prepare:({title})=>({title:title || 'Text section'})}},
  {name:'gallerySection',title:'Photo gallery',type:'object',fields:[string('title','Gallery name',{description:'For organizing the editor; not displayed on the website.'}),{name:'columns',title:'Columns',type:'number',options:{list:[{title:'Original layout',value:0},{title:'Two',value:2},{title:'Three',value:3},{title:'Four',value:4}]},initialValue:0},array('photos','Photos','photo',{options:{layout:'grid'},validation:Rule=>Rule.min(1)})],preview:{select:{title:'title',media:'photos.0'},prepare:({title,media})=>({title:title || 'Photo gallery',media})}},
  {name:'callout',title:'Highlighted statistic',type:'object',fields:[string('value','Number or value'),string('label','Description')],preview:{select:{title:'value',subtitle:'label'}}},
  {name:'sidebarGroup',title:'Sidebar list',type:'object',fields:[string('heading','Heading'),array('items','Items','string')],preview:{select:{title:'heading'}}},
  {name:'project',title:'Project',type:'document',groups:[{name:'details',title:'Details',default:true},{name:'photos',title:'Cover photos'},{name:'content',title:'Page content'},{name:'publishing',title:'Publishing'}],fields:[
    string('title','Project name',{group:'details',validation:required}),
    string('cardTitle','Short name on collection cards',{group:'details',description:'Leave blank to use the project name.'}),
    string('kind','Collection',{group:'details',options:{list:[{title:'Model homes',value:'model'},{title:'Commercial spaces',value:'commercial'}],layout:'radio'},validation:required}),
    string('eyebrow','Small heading above the project name',{group:'details',description:'For example: MODEL HOME or COMMERCIAL SPACE.'}),
    rich('intro','Introduction',{group:'details'}),
    photo('cover','Collection cover photo',{group:'photos',validation:required}),
    photo('hero','Large header photo',{group:'photos',validation:required}),
    {name:'body',title:'Text and photo galleries',group:'content',type:'array',of:[{type:'textSection'},{type:'gallerySection'},{type:'callout'}],description:'Add sections and drag them to change the order.'},
    array('sidebar','Services, mood, and other sidebar lists','sidebarGroup',{group:'content'}),
    {name:'slug',title:'Page address',type:'slug',group:'publishing',description:'Click Generate before the first publish. After publishing, keep the same address so existing links continue working.',options:{source:'title',maxLength:80},validation:Rule=>Rule.required().custom(async(value,context)=>{
      if(!value) return true;
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current || '')) return 'Use lowercase letters, numbers, and single hyphens.';
      const id=context.document?._id?.replace(/^drafts\./,'');
      if(!id) return true;
      const previous=await context.getClient({apiVersion:'2026-09-01'}).fetch('*[_id == $id][0].slug.current',{id});
      return !previous || previous===value.current ? true : `Keep the published address: ${previous}. Changing it requires a redirect.`;
    })},
    {name:'order',title:'Display order',type:'number',group:'publishing',initialValue:100,description:'Smaller numbers appear first in the collection.',validation:Rule=>Rule.required().integer().min(0)},
    {name:'hidden',title:'Hide this project',type:'boolean',group:'publishing',initialValue:false,description:'When published, removes the project from collections, featured sections, and its public page.'},
    text('description','Search engine description',{group:'publishing'}),
  ],orderings:[{title:'Display order',name:'displayOrder',by:[{field:'order',direction:'asc'},{field:'title',direction:'asc'}]}],preview:{select:{title:'title',kind:'kind',hidden:'hidden',media:'cover'},prepare:({title,kind,hidden,media})=>({title,subtitle:`${kind==='commercial'?'Commercial':'Model home'}${hidden?' · Hidden':''}`,media})}},
  {name:'copyEntry',title:'Page text',type:'object',fields:[string('label','Field name',{readOnly:true}),string('selector','Template binding',{hidden:true,readOnly:true}),rich('value','Text')],preview:{select:{title:'label'}}},
  {name:'featuredProject',title:'Featured project',type:'object',fields:[{name:'project',title:'Project',type:'reference',to:[{type:'project'}],validation:required},photo('image','Photo override',{description:'Optional. Leave empty to use the project’s collection cover.'})],preview:{select:{title:'project.title',media:'image'}}},
  {name:'galleryFilter',title:'Gallery filter',type:'object',fields:[string('label','Display name',{validation:required}),string('value','Filter value',{validation:Rule=>Rule.required().regex(/^[a-z0-9-]+$/)})],preview:{select:{title:'label',subtitle:'value'}}},
  {name:'page',title:'Page',type:'document',fields:[
    string('name','Page',{readOnly:true}),string('route','Page route',{hidden:true,readOnly:true}),
    array('copy','Page text','copyEntry',{description:'Open a field to edit its text. Formatting supports bold and emphasis.',options:{disableActions:['add','remove','duplicate']}}),
    array('slides','Homepage slideshow','photo',{hidden:routeIs('index'),options:{layout:'grid'},validation:Rule=>Rule.custom((value,{document})=>document?.route==='index' && !value?.length?'Keep at least one homepage photo.':true)}),
    array('featured','Featured projects','featuredProject',{hidden:routeIs('index','about'),description:'Drag to reorder. Hidden or unpublished projects are automatically omitted.'}),
    photo('portrait','About portrait',{hidden:routeIs('about')}),
    array('gallery','Gallery photos','photo',{hidden:routeIs('art','hand-drawn'),options:{layout:'grid'}}),
    array('filters','Curation gallery filters','galleryFilter',{hidden:routeIs('art')}),
    string('title','Browser and search title',{validation:required}),text('description','Search engine description'),
  ],preview:{select:{title:'name'}}},
  {name:'navItem',title:'Menu item',type:'object',fields:[string('label','Label',{validation:required}),string('path','Destination',{readOnly:true,hidden:true})],preview:{select:{title:'label'}}},
  {name:'siteSettings',title:'Site settings',type:'document',fields:[
    string('title','Settings name',{hidden:true,readOnly:true}),
    string('brandFirst','Logo first word',{validation:required}),string('brandLast','Logo second word'),string('footerDescription','Footer description'),string('copyright','Copyright text'),string('tagline','Footer tagline'),
    array('navigation','Menu labels','navItem',{options:{disableActions:['add','remove','duplicate']}}),
  ],preview:{prepare:()=>({title:'Site settings'})}},
];
