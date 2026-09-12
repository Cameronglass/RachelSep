export const pageNames={index:'Home',models:'Model homes',commercial:'Commercial spaces',art:'Art & curation','hand-drawn':'Hand-drawn artwork',about:'About',contact:'Contact'};

// Explicit IDs distinguish project collections from their similarly named
// landing pages. Sanity otherwise derives duplicate IDs from their titles.
export const websiteStructure=S=>S.list().id('website-content').title('Website content').items([
  S.listItem().id('model-projects').title('Model homes').child(S.documentTypeList('project').title('Model homes').filter('_type == "project" && kind == "model"').apiVersion('2026-09-01').initialValueTemplates([S.initialValueTemplateItem('model-home')])),
  S.listItem().id('commercial-projects').title('Commercial spaces').child(S.documentTypeList('project').title('Commercial spaces').filter('_type == "project" && kind == "commercial"').apiVersion('2026-09-01').initialValueTemplates([S.initialValueTemplateItem('commercial-space')])),
  S.divider(),
  ...Object.entries(pageNames).map(([route,title])=>S.listItem().id(`page-${route}`).title(title).child(S.document().schemaType('page').documentId(`page-${route}`).title(title))),
  S.divider(),
  S.listItem().id('site-settings').title('Site settings').child(S.document().schemaType('siteSettings').documentId('site-settings')),
]);
