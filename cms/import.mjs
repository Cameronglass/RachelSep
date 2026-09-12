import {createReadStream} from 'node:fs';
import path from 'node:path';
import {getCliClient} from 'sanity/cli';
import {extractContent,root} from './export.mjs';

const client=getCliClient({apiVersion:'2026-09-01',useCdn:false});
if(!client.config().token) throw new Error('Run npx sanity login before npm run cms:import. Your sign-in stays private.');
const {documents,missing}=await extractContent();
if(missing.length) throw new Error(`Restore these existing source photos before importing: ${missing.join(', ')}`);
if(process.argv.includes('--dry-run')) {
  console.log(`Import ready: ${documents.length} documents; project ${client.config().projectId}; dataset ${client.config().dataset}. No uploads or writes performed.`);
  process.exit(0);
}
const ids=documents.map(d=>d._id);
const existing=new Set((await client.fetch('*[_id in $ids]._id',{ids:[...ids,...ids.map(id=>`drafts.${id}`)]})).map(id=>id.replace(/^drafts\./,'')));
const pending=documents.filter(d=>!existing.has(d._id));
if(!pending.length) {console.log('All source documents already exist. Nothing was overwritten.');process.exit(0);}
const assets=new Map();
async function convert(value) {
  if(!value || typeof value!=='object') return;
  if(value._type==='photo' && value.localPath) {
    const localPath=value.localPath;
    if(!assets.has(localPath)) {
      const asset=await client.assets.upload('image',createReadStream(path.join(root,localPath)),{filename:path.basename(localPath)});
      assets.set(localPath,asset._id);
      console.log(`Uploaded ${localPath}`);
    }
    value.asset={_type:'reference',_ref:assets.get(localPath)};
    delete value.localPath;
  }
  for(const child of Object.values(value)) await convert(child);
}
for(const doc of pending) await convert(doc);
// A single transaction makes project references and page singletons available
// together. createIfNotExists keeps later editorial changes safe on reruns.
let transaction=client.transaction();
for(const doc of pending) transaction=transaction.createIfNotExists(doc);
await transaction.commit();
console.log(`Imported ${pending.length} documents and ${assets.size} unique photos. ${existing.size} existing documents preserved.`);
