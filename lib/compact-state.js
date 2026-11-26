'use strict';
const {isDeepStrictEqual}=require('util');
const {createHash}=require('crypto');
const clone=v=>JSON.parse(JSON.stringify(v));
const mode='compact-v1',prefix='/api/branding/logo?';
const inlineLogo=/^data:image\/(png|jpe?g|webp|gif);base64,/i;
const summaries=entries=>(entries||[]).map(e=>{const s={...e};delete s.changes;return s;});
const logoHash=source=>createHash('sha256').update(source).digest('hex');
const logoUrl=(revision,source)=>source&&inlineLogo.test(source)&&source.slice(source.indexOf(',')+1).length?prefix+'hash='+logoHash(source):prefix+'revision='+encodeURIComponent(revision||'legacy');
const wantsCompact=req=>req.headers['x-nexus-response-mode']===mode;
function deferredLogoRef(value){
 if(typeof value!=='string'||!value.startsWith(prefix))return false;
 const url=new URL(value,'https://local.invalid');if(url.hash||[...url.searchParams].length!==1)return false;
 const hash=url.searchParams.get('hash'),revision=url.searchParams.get('revision');
 return !!(hash&&/^[a-f0-9]{64}$/.test(hash)||revision&&(revision==='legacy'||/^\d{4}-\d\d-\d\dT/.test(revision)&&Number.isFinite(Date.parse(revision))));
}
function compactMongoPipeline(){
 const field='$content.store.branding.logoUrl';
 return [
   {$match:{key:'main_store'}},
   {$set:{'content.store.branding.logoUrl':{$cond:[{$regexMatch:{input:{$cond:[{$eq:[{$type:field},'string']},field,'']},regex:inlineLogo}},'data:image/png;base64,',field]}}},
   {$project:{'content.financialLedger.changes':0,_id:0,key:0,updatedAt:0,__v:0}}
 ];
}
function auditMongoPipeline(id){
 return [{$match:{key:'main_store'}},{$project:{_id:0,entry:{$arrayElemAt:[{$filter:{input:{$ifNull:['$content.financialLedger',[]]},as:'entry',cond:{$eq:['$$entry.id',{$literal:id}]},limit:1}},0]}}}];
}
function compactState(state){
 const next=clone(state);next.financialLedger=summaries(next.financialLedger);
 const brand=next.store?.branding;
 if(brand&&inlineLogo.test(String(brand.logoUrl||'')))brand.logoUrl=logoUrl(state.updatedAt,brand.logoUrl);
 next._transport={mode,revision:state.updatedAt??null};
 return next;
}
function hydrateCompactState(next,current,req){
 const marker=next._transport;
 if(!marker)return next;
 const fail=message=>{throw Object.assign(new Error(message),{status:422});};
 if(!wantsCompact(req)||marker.mode!==mode||marker.revision!==(current.updatedAt??null))fail('La versión de la carga parcial no coincide. Actualiza los datos antes de guardar.');
 if(!isDeepStrictEqual(next.financialLedger,summaries(current.financialLedger)))fail('Los resúmenes de auditoría no se pueden modificar.');
 next.financialLedger=clone(current.financialLedger||[]);
 const brand=next.store?.branding,original=current.store?.branding;
 if(deferredLogoRef(brand?.logoUrl)){
   if(!inlineLogo.test(String(original?.logoUrl||'')))fail('La imagen diferida ya no coincide. Actualiza antes de guardar.');
   brand.logoUrl=original.logoUrl;
 }else if(String(brand?.logoUrl||'').startsWith(prefix))fail('No guardes una dirección temporal de imagen como logotipo.');
 delete next._transport;
 return next;
}
module.exports={mode,prefix,inlineLogo,summaries,logoUrl,logoHash,wantsCompact,compactState,hydrateCompactState,compactMongoPipeline,auditMongoPipeline};
