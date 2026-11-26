'use strict';
const {isDeepStrictEqual}=require('util');
const {summaries}=require('./compact-state');
const clone=structuredClone;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
// One atomic update, still guarded by the original revision. Historical evidence is append-only.
function stateUpdate(previous,next,{compactSource=false}={}){
 if(!previous||!next||next._transport)throw Error('Invalid authoritative state update');
 const set={updatedAt:new Date(next.updatedAt)},unset={},push={};
 const protectedPaths=['content','content.store','content.store.branding','content.store.branding.logoUrl','content.financialLedger'];
 const assign=(path,value)=>{
   if(compactSource&&protectedPaths.includes(path))throw Error('A partial view cannot replace protected stored fields');
   set[path]=clone(value);
 };
 function walk(before,after,path){
   if(isDeepStrictEqual(before,after))return;
   if(path==='content.financialLedger'){
     const old=before||[],current=after||[];
     if(current.length<old.length||!isDeepStrictEqual(summaries(old),summaries(current.slice(0,old.length))))throw Error('Existing audit records are immutable');
     if(current.length>old.length)push[path]={$each:clone(current.slice(old.length))};
     return;
   }
   if(Array.isArray(before)&&Array.isArray(after)){
     if(after.length>before.length&&isDeepStrictEqual(before,after.slice(0,before.length))){push[path]={$each:clone(after.slice(before.length))};return;}
     const extra=after.length-before.length;
     if(extra>0&&isDeepStrictEqual(before,after.slice(extra))){push[path]={$each:clone(after.slice(0,extra)),$position:0};return;}
     if(before.length===after.length){for(let i=0;i<after.length;i++)walk(before[i],after[i],path+'.'+i);return;}
   }
   if(plain(before)&&plain(after)){
     for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
       if(isDeepStrictEqual(before[key],after[key]))continue;
       if(key.includes('.')||key.startsWith('$')||['__proto__','prototype','constructor'].includes(key))throw Error('Unsupported changed state field');
       const child=path+'.'+key;
       if(!Object.hasOwn(after,key)){
         if(child==='content.financialLedger'||compactSource&&protectedPaths.includes(child))throw Error('A partial view cannot delete protected stored fields');
         unset[child]='';
       }else if(child==='content.financialLedger')walk(before[key]||[],after[key],child);
       else if(!Object.hasOwn(before,key))assign(child,after[key]);
       else walk(before[key],after[key],child);
     }
     return;
   }
   assign(path,after);
 }
 walk(previous,next,'content');
 const update={$set:set};if(Object.keys(unset).length)update.$unset=unset;if(Object.keys(push).length)update.$push=push;
 return update;
}
module.exports={stateUpdate};
