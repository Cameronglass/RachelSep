import test from 'node:test';
import assert from 'node:assert/strict';
import {Schema} from '@sanity/schema';
import {createStructureBuilder} from 'sanity/structure';
import {schemaTypes} from '../schema.js';
import {websiteStructure,pageNames} from '../structure.mjs';

const source={
  schema:Schema.compile({name:'website-test',types:schemaTypes}),
  templates:[
    {id:'model-home',title:'Model home',schemaType:'project',value:{kind:'model'}},
    {id:'commercial-space',title:'Commercial space',schemaType:'project',value:{kind:'commercial'}},
  ],
  i18n:{t:key=>key},
  document:{resolveNewDocumentOptions:()=>[]},
};
const builder=()=>createStructureBuilder({source,perspectiveStack:['published']});

test('signed-in editor menu serializes without duplicate collection/page IDs',()=>{
  const menu=websiteStructure(builder()).serialize();
  const items=menu.items.filter(item=>item.type==='listItem');
  assert.equal(items.length,10);
  assert.equal(new Set(items.map(item=>item.id)).size,10);
  for(const route of Object.keys(pageNames)) {
    const item=items.find(item=>item.id===`page-${route}`);
    assert.equal(item.child.options.id,`page-${route}`);
    assert.equal(item.child.options.type,'page');
  }
  assert.equal(items.find(item=>item.id==='site-settings').child.options.id,'site-settings');
});

test('project collections retain separate filters, templates and explicit API versions',()=>{
  const menu=websiteStructure(builder()).serialize();
  for(const [id,kind,template] of [['model-projects','model','model-home'],['commercial-projects','commercial','commercial-space']]) {
    const list=menu.items.find(item=>item.id===id).child;
    assert.equal(list.options.filter,`_type == "project" && kind == "${kind}"`);
    assert.equal(list.options.apiVersion,'2026-09-01');
    assert.equal(list.initialValueTemplates[0].templateId,template);
  }
});
