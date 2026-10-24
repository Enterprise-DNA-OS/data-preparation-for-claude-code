// Deliberately small, explicit transformation language. No eval, scripts or network calls.
const own=(o,k)=>Object.hasOwn(o,k);
const set=(o,k,v)=>Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});
const fail=m=>{throw Error(m);};
const text=(v,what)=>typeof v==='string'&&v.length? v:fail(`${what} must be a nonempty string`);
const list=(v,what)=>Array.isArray(v)&&v.length&&v.every(x=>typeof x==='string'&&x.length)&&new Set(v).size===v.length?v:fail(`${what} must be distinct field names`);
const keys=(o,allowed)=>{for(const k of Object.keys(o))if(!allowed.includes(k))fail(`Unknown option ${k}`);};
export function validateSpec(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))fail('Recipe must be an object');
 keys(spec,['source','steps']);text(spec.source,'source');
 if(!Array.isArray(spec.steps)||!spec.steps.length)fail('Recipe requires steps');
 for(const s of spec.steps){
  if(!s||typeof s!=='object')fail('Invalid step');
  switch(s.op){
   case 'trim': case 'lower': case 'upper': case 'select': case 'dedupe':
    keys(s,['op','fields']);list(s.fields,'fields');break;
   case 'rename': keys(s,['op','from','to']);text(s.from,'from');text(s.to,'to');break;
   case 'filter': keys(s,['op','field','equals']);text(s.field,'field');if(typeof s.equals!=='string')fail('equals must be a string');break;
   case 'join': keys(s,['op','dataset','left','right','fields','prefix']);text(s.dataset,'dataset');text(s.left,'left');text(s.right,'right');list(s.fields,'fields');text(s.prefix,'prefix');break;
   case 'sum': keys(s,['op','group','field','as']);list(s.group,'group');text(s.field,'field');text(s.as,'as');if(s.group.includes(s.as))fail('sum output collides with group');break;
   case 'require': keys(s,['op','fields']);list(s.fields,'fields');break;
   case 'unique': keys(s,['op','fields']);list(s.fields,'fields');break;
   default:fail(`Unsupported operation ${s.op}`);
  }
 }
 return spec;
}
function field(row,k){if(!own(row.data,k))fail(`Missing column ${k}`);return row.data[k];}
function key(row,fields){return JSON.stringify(fields.map(k=>field(row,k)));}
function decimal(v){if(!/^-?\d+(?:\.\d{1,6})?$/.test(String(v)))fail(`Not a decimal with up to six places: ${String(v).slice(0,60)}`);const [a,b='']=String(v).replace(/^-/,'').split('.');return BigInt(a+b.padEnd(6,'0'))*(String(v).startsWith('-')?-1n:1n);}
function decimalText(v){const sign=v<0n?'-':'';v=v<0n?-v:v;const s=v.toString().padStart(7,'0');return sign+s.slice(0,-6)+'.'+s.slice(-6);}
export function prepare(input,spec,lookups={}){
 validateSpec(spec);
 let rows=structuredClone(input);const steps=[];
 for(const s of spec.steps){
  const before=rows.length;
  if(['trim','lower','upper'].includes(s.op))rows=rows.map(r=>{for(const k of s.fields){const v=String(field(r,k));r.data[k]=s.op==='trim'?v.trim():s.op==='lower'?v.toLowerCase():v.toUpperCase();}return r;});
  else if(s.op==='select')rows=rows.map(r=>({...r,data:Object.fromEntries(s.fields.map(k=>[k,field(r,k)]))}));
  else if(s.op==='rename')rows=rows.map(r=>{const v=field(r,s.from);if(s.from!==s.to&&own(r.data,s.to))fail(`Rename would overwrite ${s.to}`);delete r.data[s.from];set(r.data,s.to,v);return r;});
  else if(s.op==='filter')rows=rows.filter(r=>field(r,s.field)===s.equals);
  else if(s.op==='dedupe'||s.op==='unique'){
   const seen=new Map();const out=[];
   for(const r of rows){const k=key(r,s.fields);if(seen.has(k)){if(s.op==='unique')fail(`Duplicate key for ${s.fields.join(',')}`);const previous=seen.get(k);if(JSON.stringify(Object.entries(previous.data).sort())!==JSON.stringify(Object.entries(r.data).sort()))fail(`Conflicting duplicate key for ${s.fields.join(',')}`);previous.lineage.push(...r.lineage);}
   else{seen.set(k,r);out.push(r);}}
   rows=out;
  }else if(s.op==='require'){
   for(const r of rows)for(const k of s.fields)if(String(field(r,k)).trim()==='')fail(`Required value missing: ${k}`);
  }else if(s.op==='join'){
   const lookup=lookups[s.dataset];if(!lookup)fail(`Missing lookup ${s.dataset}`);
   const indexed=new Map();for(const r of lookup){const k=field(r,s.right);if(String(k).trim()==='')fail(`Blank lookup key: ${s.right}`);if(indexed.has(k))fail(`Duplicate lookup key: ${k}`);for(const f of s.fields)field(r,f);indexed.set(k,r);}
   rows=rows.map(r=>{const match=indexed.get(field(r,s.left));for(const f of s.fields){const dest=s.prefix+f;if(own(r.data,dest))fail(`Join would overwrite ${dest}`);set(r.data,dest,match?field(match,f):'');}if(match)r.lineage.push(...match.lineage);return r;});
  }else if(s.op==='sum'){
   const groups=new Map();for(const r of rows){const k=key(r,s.group);const g=groups.get(k)||{data:Object.fromEntries(s.group.map(f=>[f,field(r,f)])),total:0n,lineage:[]};g.total+=decimal(field(r,s.field));g.lineage.push(...r.lineage);groups.set(k,g);}
   rows=[...groups.values()].map(g=>({data:{...g.data,[s.as]:decimalText(g.total)},lineage:[...new Set(g.lineage)]}));
  }
  steps.push({operation:s.op,input_rows:before,output_rows:rows.length});
 }
 return {rows,steps};
}
export function profile(rows){
 const names=[...new Set(rows.flatMap(r=>Object.keys(r.data)))];
 return names.map(column=>{const values=rows.map(r=>r.data[column]??'');return {column,rows:rows.length,blank:values.filter(v=>String(v).trim()==='').length,distinct:new Set(values).size,decimal_values:values.filter(v=>/^-?\d+(?:\.\d{1,6})?$/.test(String(v))).length};});
}
