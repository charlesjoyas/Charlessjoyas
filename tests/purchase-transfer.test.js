'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {browserHarness,memoryApi,product,clone}=require('./helpers');
const {executeOperation}=require('../lib/operations'),{finalizeState}=require('../lib/financial-validation');
const {stateUpdate}=require('../lib/state-update'),{applyUpdate}=require('./update-fixture'),{summaries,logoUrl}=require('../lib/compact-state');
const headers={'x-nexus-response-mode':'compact-v1'};
function seed(){const s=browserHarness().seed;for(const k of ['purchases','recentTransactions','supplierCredits','abonosCompras','financialLedger','accountAdjustments','expenses','cashShiftsHistory'])s[k]=[];s.products=[product()];s.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];s.cashShiftLog={shiftId:'TRANSFER-TEST',status:'Abierto',openingCash:10000000};s.store.branding.logoUrl='data:image/png;base64,'+Buffer.alloc(750000,42).toString('base64');s.financialLedger=[{id:'OLD-AUDIT',actorId:'U1',type:'original',changes:[{proof:'original audit '.repeat(75000)}]}];return s;}
function projected(s){const p=clone(s);p.financialLedger=summaries(p.financialLedger);p.store.branding.logoUrl='data:image/png;base64,';return p;}
async function fixture(){const s=seed();let api;api=memoryApi(s,{chainLotsEnabled:true,readCompact:async()=>projected(api.state)});const cookie=await api.login();const run=(type,args,extra={})=>api.request('operation',{type,args:{reason:'Synthetic transfer test',...args},operationId:crypto.randomUUID(),baseUpdatedAt:api.state.updatedAt,...extra},cookie,headers);return {s,api,cookie,run};}
const cases=[
 {label:'weighed new code',args:{sku:'NEW-WEIGH',measureType:'Pesaje',quantity:2,unitCost:100}},
 {label:'weighed replenishment',args:{sku:'001',productId:'P1',measureType:'Pesaje',quantity:2,unitCost:200}},
 {label:'pieces',args:{sku:'NEW-PIECE',measureType:'Unidades',quantity:2,pieceWeight:1.63,unitCost:100}},
 {label:'chain lot',args:{sku:'NEW-LOT',inventoryMode:'chainLot',lotCode:'TEST-LOT',measureType:'Pesaje',quantity:5,unitCount:3,unitCost:100}},
 {label:'cash-paid receipt',args:{sku:'PAID',measureType:'Pesaje',quantity:2,unitCost:100,paid:true,method:'Efectivo'}}
];
for(const {label,args}of cases)test('targeted purchase update matches the complete financial result: '+label,async()=>{
 const {s,api,run}=await fixture(),input={supplier:'Supplier',category:'oro18k',name:label,...args};const r=await run('createPurchase',input);assert.equal(r.statusCode,200,r.body.error);const after=api.state,audit=after.financialLedger.at(-1),user=s.users.find(u=>u.email==='admin@example.test');const expected=executeOperation(s,{type:'createPurchase',operationId:audit.id,args:{reason:'Synthetic transfer test',...input}},user,audit.timestamp).state;finalizeState(expected);expected.updatedAt=after.updatedAt;assert.deepEqual(after,expected);assert.deepEqual(after.financialLedger[0],s.financialLedger[0]);assert.equal(after.store.branding.logoUrl,s.store.branding.logoUrl);assert.equal(r.body.data.financialLedger[0].changes,undefined);
 const update=stateUpdate(projected(s),projected(after),{compactSource:true});assert.equal(update.$set.content,undefined);assert(!Object.keys(update.$set).some(k=>k==='content.financialLedger'||k.startsWith('content.store.branding')));
});
test('the actual write sends only changed values and new evidence, independent of old audit and image size',async()=>{
 const {s,api,run}=await fixture();await run('createPurchase',{supplier:'Supplier',category:'oro18k',sku:'SMALL',name:'Small write',measureType:'Pesaje',quantity:2,unitCost:100});const after=api.state,beforeView=projected(s),nextView=projected(after);nextView.financialLedger.at(-1).changes=after.financialLedger.at(-1).changes;const update=stateUpdate(beforeView,nextView,{compactSource:true}),bytes=Buffer.byteLength(JSON.stringify(update));assert(bytes<20000,'Unexpected write size: '+bytes);assert.deepEqual(applyUpdate({content:s},update).content,after);assert(Buffer.byteLength(JSON.stringify(after))>1000000);assert(update.$push['content.financialLedger'].$each[0].changes);
});
test('partial purchase retry and stale concurrent purchase cannot duplicate or overwrite a committed receipt',async()=>{
 const {api,cookie}=await fixture(),command={type:'createPurchase',operationId:crypto.randomUUID(),baseUpdatedAt:api.state.updatedAt,args:{supplier:'Supplier',category:'oro18k',sku:'SAFE',name:'Safe',measureType:'Pesaje',quantity:2,unitCost:100,reason:'Synthetic receipt'}};
 const first=await api.request('operation',command,cookie,headers);assert.equal(first.statusCode,200,first.body.error);const saved=api.state;const retry=await api.request('operation',command,cookie,headers);assert.equal(retry.body.alreadyApplied,true);assert.deepEqual(api.state,saved);const other=await api.request('operation',{...command,operationId:crypto.randomUUID()},cookie,headers);assert.equal(other.statusCode,409);assert.deepEqual(api.state,saved);
});
test('a return after a partial purchase preserves all original evidence and restores the exact account balance',async()=>{
 const {s,api,run}=await fixture();const r=await run('createPurchase',{supplier:'Supplier',category:'oro18k',sku:'RETURN',name:'Return test',measureType:'Pesaje',quantity:2,unitCost:100,paid:true,method:'Efectivo'});assert.equal(r.statusCode,200);const po=api.state.purchases[0],result=await run('reversePurchase',{purchaseId:po.id});assert.equal(result.statusCode,200,result.body.error);assert.equal(api.state.products.find(p=>p.sku==='RETURN').stock,0);assert.deepEqual(api.state.financialLedger[0],s.financialLedger[0]);assert.equal(api.state.store.branding.logoUrl,s.store.branding.logoUrl);
});
test('an unchanged retained image reference remains a placeholder and is never written into branding',async()=>{
 const {s,api,cookie,run}=await fixture();const data=(await api.request('get',{},cookie,headers)).body;const oldRef=logoUrl('2026-11-21T12:00:00.000Z');await run('createPurchase',{supplier:'Supplier',category:'oro18k',sku:'NEXT',name:'Next',measureType:'Pesaje',quantity:1,unitCost:100});const current=(await api.request('get',{},cookie,headers)).body;current.store.branding.logoUrl=oldRef;current.products[0].cost=101;const r=await api.request('post',{baseUpdatedAt:api.state.updatedAt,data:current},cookie,headers);assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.store.branding.logoUrl,s.store.branding.logoUrl);assert.deepEqual(api.state.financialLedger[0],s.financialLedger[0]);
});
test('partial storage views cannot replace or remove original logos and cannot rewrite audit metadata',()=>{
 const before=projected(seed());for(const mutate of [s=>s.store.branding.logoUrl='',s=>delete s.store.branding,s=>delete s.store,s=>delete s.financialLedger,s=>s.financialLedger[0].actorId='changed']){const next=clone(before);next.updatedAt='2026-11-26T21:00:00.000Z';mutate(next);assert.throws(()=>stateUpdate(before,next,{compactSource:true}));}
});
test('a legacy store without prior audit can append its first event without replacing unrelated fields',()=>{
 const before={store:{cashInBox:0},updatedAt:null},next={...before,updatedAt:'2026-11-26T21:00:00.000Z',financialLedger:[{id:'FIRST',changes:[]}]};const update=stateUpdate(before,next,{compactSource:true});assert(update.$push['content.financialLedger']);assert.deepEqual(applyUpdate({content:before},update).content,next);
});
