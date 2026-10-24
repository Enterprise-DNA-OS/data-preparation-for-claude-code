#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {prepare,profile,validateSpec} from './lib/prepare.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';
export const commands={
 help:'List commands. Options use --key=value; --json works on every command.',
 datasets:'List datasets, owners, imported row counts and freshness.',
 dataset:'--ref=CODE Read dataset metadata and batch history.',
 profile:'--ref=CODE Count blanks, distinct values and decimal values.',
 rows:'--ref=CODE [--limit=25] Read the latest imported rows.',
 'add-dataset':'--code=CODE --name=Name --owner=Name --purpose=Purpose [--personal=true --review=YYYY-MM-DD --jurisdiction=NZ --fresh-days=7] --actor=Name',
 'set-policy':'--ref=CODE --owner=Name --purpose=Purpose --personal=true|false --review=YYYY-MM-DD --jurisdiction=NZ|AU|OTHER --actor=Name',
 import:'alteryx --file=export.csv --dataset=CODE --actor=Name [--dry-run] Import a complete UTF-8 comma-separated export with column headers.',
 pipelines:'List recipes and whether rules or inputs have changed since the last run.',
 pipeline:'--ref=CODE Read saved rules and their version.',
 'save-pipeline':'--code=CODE --name=Name --owner=Name --file=recipe.json --actor=Name [--replace] Save explicit preparation steps.',
 run:'--ref=CODE --actor=Name Execute the current recipe. Failed validation records a failed run and exits 1.',
 runs:'[--ref=CODE] Read previous executions.',
 result:'--ref=RUN [--limit=25] Read saved output and source-row lineage.',
 reconcile:'--ref=RUN Read per-step input/output counts and source batch references.',
 'source-health':'Read sources that are stale or have never arrived.',
 attention:'Read open review actions, oldest first.',
 compliance:'Read purpose, ownership, privacy review and freshness findings. Review support, not certification.',
 'weekly-review':'Combine source health, run health, actions and compliance findings.',
 'add-action':'--title=Task --owner=Name --due=YYYY-MM-DD --actor=Name',
 'close-action':'--ref=ID-or-title --evidence=Reason --actor=Name',
 audit:'Read the latest 100 recorded operator actions.',
 export:'--ref=CODE-or-RUN --kind=dataset|run --file=path.json|path.csv [--format=json|csv] --actor=Name [--raw-csv] [--overwrite]',
 'draft-review':'Render the weekly review to drafts/ as branded HTML. Never sends.'
};
const hash=s=>createHash('sha256').update(s).digest('hex');
function options(args){const opts={},pos=[];for(const x of args){if(!x.startsWith('--')){pos.push(x);continue;}const at=x.indexOf('=');const k=x.slice(2,at<0?undefined:at);if(Object.hasOwn(opts,k))throw Error(`Duplicate option --${k}`);opts[k]=at<0?true:x.slice(at+1);}return{opts,pos};}
const need=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k}=value is required`);return o[k].trim();};
const bool=(o,k,d=false)=>o[k]===undefined?d:o[k]==='true'?true:o[k]==='false'?false:(()=>{throw Error(`--${k}=true|false required`);})();
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a valid YYYY-MM-DD date');return v;}
function positive(v,max=10000){const n=Number(v);if(!Number.isInteger(n)||n<1||n>max)throw Error(`Expected integer 1 to ${max}`);return n;}
function code(v){if(!/^[A-Z][A-Z0-9_-]*$/.test(v))throw Error('Codes use uppercase letters, numbers, underscores or hyphens');return v;}
async function audit(db,actor,event,detail){await db.query('insert into audit(actor,event,detail) values($1,$2,$3)',[actor,event,JSON.stringify(detail)]);}
async function transaction(db,fn){await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
export async function resolve(db,kind,ref){
 const tables={dataset:['datasets','code','name'],pipeline:['pipelines','code','name'],action:['actions','title','title'],run:['runs','id::text','id::text']};
 const [t,c,n]=tables[kind]||[];if(!t)throw Error('Invalid reference kind');
 let rows=await db.query(`select * from ${t} where lower(${c})=lower($1) or id::text=$1`,[ref]);
 if(!rows.length)rows=await db.query(`select * from ${t} where starts_with(id::text,lower($1)) or strpos(lower(${n}),lower($1))>0 order by id`,[ref]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}: ${rows.map(r=>`${r.id} ${r.code||r.title||''} ${r.name||''}`).join('; ')}`:`No ${kind} matches ${ref}`);
 return rows[0];
}
async function latest(db,d){const [b]=await db.query('select * from batches where dataset_id=$1 order by created_at desc,id desc limit 1',[d.id]);if(!b)throw Error(`No imported data for ${d.code}`);return b;}
async function batchRows(db,b){return(await db.query('select ordinal,data from source_rows where batch_id=$1 order by ordinal',[b.id])).map(r=>({data:r.data,lineage:[`${b.id}:${r.ordinal}`]}));}
export async function compliance(db){return db.query(`select code,rule,reason,source from (
 select code,'ownership' as rule,'Assign a responsible owner' as reason,'Business data policy' as source from datasets where owner=''
 union all select code,'purpose','Record why this data is held','https://www.privacy.org.nz/privacy-principles/1/' from datasets where purpose=''
 union all select code,'retention','Review whether personal data is still required',case when jurisdiction='AU' then 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information' else 'https://www.privacy.org.nz/privacy-principles/9/' end from datasets where personal and (retention_review is null or retention_review<=current_date)
 union all select code,'accuracy','Check source currency before relying on this data',case when jurisdiction='AU' then 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-10-app-10-quality-of-personal-information' else 'https://www.privacy.org.nz/privacy-principles/8/' end from dataset_health where personal and freshness<>'current'
 ) f order by code,rule`);}
async function weekly(db){return {sources:await db.query('select code,owner,row_count,freshness from dataset_health order by code'),runs:await db.query('select code,status,freshness,input_count,output_count from run_health order by code'),actions:await db.query('select title,owner,due,days_overdue from attention_queue order by due,title'),compliance:await compliance(db)};}
export async function execute(db,args){
 const {opts:o,pos}=options(args),cmd=pos[0]||'help';
 if(!commands[cmd])throw Error(`Unknown command ${cmd}`);
 const allowed={help:[],datasets:[],dataset:['ref'],profile:['ref'],rows:['ref','limit'],'add-dataset':['code','name','owner','purpose','personal','review','jurisdiction','fresh-days','actor'],'set-policy':['ref','owner','purpose','personal','review','jurisdiction','actor'],import:['file','dataset','actor','dry-run'],pipelines:[],pipeline:['ref'],'save-pipeline':['code','name','owner','file','actor','replace'],run:['ref','actor'],runs:['ref'],result:['ref','limit'],reconcile:['ref'],'source-health':[],attention:[],compliance:[],'weekly-review':[],'add-action':['title','owner','due','actor'],'close-action':['ref','evidence','actor'],audit:[],export:['ref','kind','file','format','actor','raw-csv','overwrite'],'draft-review':[]};
 for(const k of Object.keys(o))if(k!=='json'&&!allowed[cmd].includes(k))throw Error(`Unknown option --${k} for ${cmd}`);
 for(const k of ['json','dry-run','replace','raw-csv','overwrite'])if(o[k]!==undefined&&o[k]!==true)throw Error(`--${k} is a switch without a value`);
 if(pos.length>(cmd==='import'?2:1))throw Error('Unexpected positional argument');
 if(cmd==='help')return Object.entries(commands).map(([command,usage])=>({command,usage}));
 if(cmd==='datasets')return db.query('select code,name,owner,row_count,freshness from dataset_health order by code');
 if(['dataset','profile','rows'].includes(cmd)){
  const d=await resolve(db,'dataset',need(o,'ref'));
  if(cmd==='dataset')return {dataset:d,batches:await db.query('select id,file_name,checksum,row_count,actor,created_at from batches where dataset_id=$1 order by created_at desc',[d.id])};
  const rows=await batchRows(db,await latest(db,d));return cmd==='profile'?profile(rows):rows.slice(0,positive(o.limit||25)).map(r=>r.data);
 }
 if(cmd==='add-dataset')return transaction(db,async()=>{
  const actor=need(o,'actor');const r=await db.query('insert into datasets(code,name,owner,purpose,personal,retention_review,jurisdiction,fresh_days) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[code(need(o,'code')),need(o,'name'),need(o,'owner'),need(o,'purpose'),bool(o,'personal'),o.review?date(o.review):null,o.jurisdiction||'NZ',positive(o['fresh-days']||7,3650)]);await audit(db,actor,cmd,{id:r[0].id});return r;
 });
 if(cmd==='set-policy')return transaction(db,async()=>{const actor=need(o,'actor'),d=await resolve(db,'dataset',need(o,'ref'));const r=await db.query('update datasets set owner=$2,purpose=$3,personal=$4,retention_review=$5,jurisdiction=$6 where id=$1 returning *',[d.id,need(o,'owner'),need(o,'purpose'),bool({...o,personal:need(o,'personal')},'personal'),date(need(o,'review')),need(o,'jurisdiction')]);await audit(db,actor,cmd,{before:d,after:r[0]});return r;});
 if(cmd==='import'){
  if(pos[1]!=='alteryx')throw Error('Use import alteryx');
  const actor=need(o,'actor'),file=need(o,'file'),bytes=fs.readFileSync(file);
  const csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes),rows=parseCsv(csv);
  if(!rows.length)throw Error('Export contains no records');
  return transaction(db,async()=>{const d=await resolve(db,'dataset',need(o,'dataset')),checksum=hash(bytes);
   const [previous]=await db.query('select id,row_count from batches where dataset_id=$1 and checksum=$2',[d.id,checksum]);
   if(previous)return [{status:'unchanged',batch_id:previous.id,row_count:previous.row_count}];
   if(o['dry-run'])return [{status:'dry-run',dataset:d.code,row_count:rows.length,columns:Object.keys(rows[0]).join(', ')}];
   const [b]=await db.query('insert into batches(dataset_id,checksum,file_name,columns,row_count,actor) values($1,$2,$3,$4,$5,$6) returning *',[d.id,checksum,path.basename(file),JSON.stringify(Object.keys(rows[0])),rows.length,actor]);
   for(let i=0;i<rows.length;i++)await db.query('insert into source_rows(batch_id,ordinal,data) values($1,$2,$3)',[b.id,i+1,JSON.stringify(rows[i])]);
   await audit(db,actor,cmd,{dataset:d.code,batch:b.id,checksum,row_count:rows.length});return [{status:'imported',batch_id:b.id,row_count:rows.length}];
  });
 }
 if(cmd==='pipelines')return db.query('select code,name,owner,status,freshness,input_count,output_count from run_health order by code');
 if(cmd==='pipeline')return resolve(db,'pipeline',need(o,'ref'));
 if(cmd==='save-pipeline'){
  const actor=need(o,'actor'),spec=validateSpec(JSON.parse(fs.readFileSync(need(o,'file'),'utf8'))),version=hash(JSON.stringify(spec)),c=code(need(o,'code'));
  return transaction(db,async()=>{for(const c of [spec.source,...spec.steps.filter(s=>s.op==='join').map(s=>s.dataset)]){const d=await resolve(db,'dataset',c);if(d.code!==c)throw Error(`Recipes require exact dataset code ${d.code}`);}
   const [old]=await db.query('select * from pipelines where code=$1',[c]);if(old&&!o.replace)throw Error('Recipe exists; use --replace to save a new version');
   const result=await db.query('insert into pipelines(code,name,owner,spec,version) values($1,$2,$3,$4,$5) on conflict(code) do update set name=excluded.name,owner=excluded.owner,spec=excluded.spec,version=excluded.version returning *',[c,need(o,'name'),need(o,'owner'),JSON.stringify(spec),version]);await audit(db,actor,cmd,{code:c,previous_version:old?.version||null,version});return result;
  });
 }
 if(cmd==='run')return transaction(db,async()=>{
  const p=await resolve(db,'pipeline',need(o,'ref')),actor=need(o,'actor'),sources={},lookups={};let input=[],steps=[],output=[],error=null;
  try{
   validateSpec(p.spec);
   for(const c of new Set([p.spec.source,...p.spec.steps.filter(s=>s.op==='join').map(s=>s.dataset)])){const d=await resolve(db,'dataset',c);if(d.code!==c)throw Error(`Recipes require exact dataset code ${d.code}`);const b=await latest(db,d);sources[c]=b.id;lookups[c]=await batchRows(db,b);}
   input=lookups[p.spec.source];({rows:output,steps}=prepare(input,p.spec,lookups));
  }catch(e){error=e.message;output=[];}
  const [r]=await db.query('insert into runs(pipeline_id,version,spec,sources,status,input_count,output_count,steps,error,actor) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',[p.id,p.version,JSON.stringify(p.spec),JSON.stringify(sources),error?'failed':'passed',input.length,output.length,JSON.stringify(steps),error,actor]);
  for(let i=0;i<output.length;i++)await db.query('insert into output_rows(run_id,ordinal,data,lineage) values($1,$2,$3,$4)',[r.id,i+1,JSON.stringify(output[i].data),JSON.stringify([...new Set(output[i].lineage)])]);
  await audit(db,actor,cmd,{run:r.id,pipeline:p.code,status:r.status});return [{run_id:r.id,pipeline:p.code,status:r.status,input_rows:r.input_count,output_rows:r.output_count,error}];
 });
 if(cmd==='runs'){const p=o.ref?await resolve(db,'pipeline',o.ref):null;return db.query('select r.id,p.code,r.status,r.input_count,r.output_count,r.error,r.created_at from runs r join pipelines p on p.id=r.pipeline_id where ($1::uuid is null or p.id=$1) order by r.created_at desc,r.id desc',[p?.id||null]);}
 if(['result','reconcile'].includes(cmd)){
  const r=await resolve(db,'run',need(o,'ref'));
  if(cmd==='reconcile')return {run_id:r.id,status:r.status,input_count:r.input_count,output_count:r.output_count,sources:r.sources,version:r.version,steps:r.steps,error:r.error};
  if(r.status!=='passed')throw Error(`Run failed: ${r.error}`);return db.query('select ordinal,data,lineage from output_rows where run_id=$1 order by ordinal limit $2',[r.id,positive(o.limit||25)]);
 }
 if(cmd==='source-health')return db.query("select code,owner,row_count,freshness from dataset_health where freshness<>'current' order by code");
 if(cmd==='attention')return db.query('select id,title,owner,due,days_overdue from attention_queue order by due,title');
 if(cmd==='compliance')return compliance(db);
 if(cmd==='weekly-review')return weekly(db);
 if(cmd==='add-action')return transaction(db,async()=>{const actor=need(o,'actor');const r=await db.query('insert into actions(title,owner,due) values($1,$2,$3) returning *',[need(o,'title'),need(o,'owner'),date(need(o,'due'))]);await audit(db,actor,cmd,{id:r[0].id});return r;});
 if(cmd==='close-action')return transaction(db,async()=>{const actor=need(o,'actor'),a=await resolve(db,'action',need(o,'ref'));if(a.status==='closed')throw Error('Action already closed');const r=await db.query("update actions set status='closed',evidence=$2 where id=$1 returning *",[a.id,need(o,'evidence')]);await audit(db,actor,cmd,{id:a.id,evidence:r[0].evidence});return r;});
 if(cmd==='audit')return db.query('select actor,event,detail,created_at from audit order by created_at desc,id desc limit 100');
 if(cmd==='export'){
  const actor=need(o,'actor'),kind=need(o,'kind');let data,meta;
  if(kind==='dataset'){const d=await resolve(db,'dataset',need(o,'ref')),b=await latest(db,d);data=(await batchRows(db,b)).map(r=>r.data);meta={dataset:d.code,batch:b.id,checksum:b.checksum};}
  else if(kind==='run'){const r=await resolve(db,'run',need(o,'ref'));if(r.status!=='passed')throw Error('Cannot export a failed run');data=(await db.query('select data from output_rows where run_id=$1 order by ordinal',[r.id])).map(r=>r.data);meta={run:r.id,version:r.version,sources:r.sources};}
  else throw Error('--kind=dataset|run required');
  const file=path.resolve(need(o,'file')),format=o.format||(file.endsWith('.csv')?'csv':'json');if(!['json','csv'].includes(format))throw Error('--format=json|csv required');
  let content;
  if(format==='json')content=JSON.stringify({meta,records:data},null,2)+'\n';
  else{const columns=[...new Set(data.flatMap(Object.keys))];const quote=v=>{let s=String(v??'');if(!o['raw-csv']&&/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};content=[columns,...data.map(r=>columns.map(c=>r[c]??''))].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';}
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,content,{flag:o.overwrite?'w':'wx',mode:0o600});fs.chmodSync(file,0o600);await audit(db,actor,cmd,{kind,...meta,file:path.basename(file),rows:data.length,format});return[{file,rows:data.length,format}];
 }
 if(cmd==='draft-review'){const data=await weekly(db);const file=writeOut('drafts',`weekly-review-${Date.now()}`,page({title:'Data preparation review',subtitle:'Draft for internal review',sections:Object.entries(data).map(([title,rows])=>({title,html:htmlTable(rows)}))}));return[{file}];}
}
export function human(value){
 if(Array.isArray(value)){if(!value.length)return '  (none)';const rows=value.map(r=>r.data&&r.lineage?{...r.data,source_rows:r.lineage.length}:r).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v&&typeof v==='object'?JSON.stringify(v):v])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key.replaceAll('_',' ')})));}
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}\n${human(v)}`).join('\n\n');return String(value??'');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const args=process.argv.slice(2),result=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));if(args[0]==='run'&&result[0].status==='failed')process.exitCode=1;}
 catch(e){if(process.argv.includes('--json'))console.log(JSON.stringify({error:e.message}));else console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
