// Operational helpers for this site's publishing connection. Hook URLs and
// credentials stay in service APIs and CLI credential stores, never in Git.
import {execFileSync} from 'node:child_process';
import {getCliClient} from 'sanity/cli';

const siteId='ee3e1d4e-ab70-4264-9a46-c341f0ae70ed';
const repository='Cameronglass/RachelSep';
const hookName='Sanity content publishing';
const client=getCliClient({apiVersion:'2026-09-01',useCdn:false});
if(client.config().projectId!=='4jmyx4hk') throw new Error('This helper is scoped to Sanity project 4jmyx4hk.');
const action=process.argv[2] || 'status';
const netlify=(operation,data={})=>JSON.parse(execFileSync('npx',['--yes','netlify-cli@27.5.2','api',operation,'--data',JSON.stringify(data)],{encoding:'utf8',maxBuffer:20*1024*1024}));
const github=(endpoint,body)=>JSON.parse(execFileSync('gh',['api',endpoint,...(body?['--method','POST','--input','-']:[])],{input:body?JSON.stringify(body):undefined,encoding:'utf8'}));
const hooksApi=(method='GET',suffix='',body)=>client.request({url:`/hooks/projects/4jmyx4hk${suffix}`,useGlobalApi:true,method,body});
const site=netlify('getSite',{site_id:siteId});
if(site.custom_domain!=='rachelsep.com') throw new Error('Netlify site domain does not match rachelsep.com.');

if(action==='connect') {
  if(site.build_settings?.repo_path && site.build_settings.repo_path!==repository) throw new Error('A different repository is already linked.');
  const repo=github(`repos/${repository}`);
  const githubKeys=github(`repos/${repository}/keys`);
  const keys=netlify('listDeployKeys');
  let key=keys.find(k=>githubKeys.some(g=>g.title==='Netlify rachelsep.com' && g.key.trim()===k.public_key.trim()));
  if(!key) {
    key=netlify('createDeployKey');
    github(`repos/${repository}/keys`,{title:'Netlify rachelsep.com',key:key.public_key,read_only:true});
    console.log('Created read-only repository deploy key.');
  }
  const updated=netlify('updateSite',{site_id:siteId,body:{repo:{id:repo.id,provider:'github',repo_path:repository,repo_branch:'main',allowed_branches:['main','codex/sanity-cms'],deploy_key_id:key.id,dir:'dist',cmd:'npm run build',public_repo:!repo.private}}});
  if(!updated.deploy_hook) throw new Error('Netlify did not return a repository webhook.');
  const githubHooks=github(`repos/${repository}/hooks`);
  if(!githubHooks.some(h=>h.config.url===updated.deploy_hook)) github(`repos/${repository}/hooks`,{name:'web',active:true,events:['push','pull_request','delete'],config:{url:updated.deploy_hook,content_type:'json'}});
  console.log(JSON.stringify({site:updated.id,repository:updated.build_settings?.repo_path,productionBranch:updated.build_settings?.repo_branch,repositoryWebhook:true}));
} else if(action==='hooks') {
  const list=netlify('listSiteBuildHooks',{site_id:siteId});
  let buildHook=list.find(h=>h.title===hookName && h.branch==='main');
  if(!buildHook) buildHook=netlify('createSiteBuildHook',{site_id:siteId,body:{title:hookName,branch:'main'}});
  const existing=await hooksApi();
  let hook=existing.find(h=>h.name===hookName);
  if(hook && hook.url!==buildHook.url) throw new Error('An existing Sanity hook has a different destination.');
  if(!hook) hook=await hooksApi('POST','',{type:'document',name:hookName,description:'Rebuild rachelsep.com after published content changes.',url:buildHook.url,dataset:'production',apiVersion:'2026-09-01',httpMethod:'POST',includeDrafts:false,includeAllVersions:false,isDisabledByUser:false,rule:{on:['create','update','delete'],filter:'_type in ["project", "page", "siteSettings"]',projection:'{_id, _type, _rev}'}});
  console.log(JSON.stringify({netlifyHookId:buildHook.id,sanityHookId:hook.id,enabled:!hook.isDisabled,includeDrafts:hook.includeDrafts,rule:hook.rule}));
} else if(action==='preview-build' || action==='production-build') {
  const build=netlify('createSiteBuild',{site_id:siteId,...(action==='preview-build'?{branch:'codex/sanity-cms'}:{}),title:'Verify Sanity content publishing'});
  console.log(JSON.stringify({id:build.id,deploy_id:build.deploy_id}));
} else if(action==='verify-publish') {
  const settings=await client.getDocument('site-settings');
  await client.patch(settings._id).ifRevisionId(settings._rev).set({title:`Site settings · publishing verified ${new Date().toISOString()}`}).commit();
  console.log('Updated hidden settings metadata to test a real published-content webhook. No visible copy changed.');
} else if(action==='status') {
  const deploys=netlify('listSiteDeploys',{site_id:siteId,per_page:5});
  const hooks=await hooksApi();
  console.log(JSON.stringify({repository:site.build_settings?.repo_path,productionBranch:site.build_settings?.repo_branch,published:site.published_deploy?{id:site.published_deploy.id,url:site.published_deploy.deploy_ssl_url}:null,deploys:deploys.map(d=>({id:d.id,state:d.state,branch:d.branch,context:d.context,commit:d.commit_ref,url:d.deploy_ssl_url,error:d.error_message,created:d.created_at})),hooks:hooks.map(h=>({id:h.id,name:h.name,disabled:h.isDisabled,includeDrafts:h.includeDrafts}))},null,2));
} else if(action==='attempts') {
  const hooks=await hooksApi();
  const hook=hooks.find(h=>h.name===hookName);
  if(!hook) throw new Error('Publishing webhook is not configured.');
  const attempts=await hooksApi('GET',`/${hook.id}/attempts`);
  console.log(JSON.stringify(attempts.slice(0,5).map(a=>({id:a.id,createdAt:a.createdAt,resultCode:a.resultCode,inProgress:a.inProgress,isFailure:a.isFailure,failureReason:a.failureReason})),null,2));
} else throw new Error('Unknown action. Use status, connect, hooks, preview-build, production-build, verify-publish or attempts.');
