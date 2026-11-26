'use strict';const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {memoryApi,clone}=require('./helpers'),I=require('../js/safety'),L=require('../js/ledger'),{demoSeed}=require('../scripts/scrap-gold-local');
const args={materialForm:'scrapGold',goldPurity:18,supplier:'Proveedor de prueba',category:'nacional',sku:'CHAT-NAC-001',name:'Chatarra Nacional 18K',measureType:'Pesaje',quantity:10,unitCost:300000,pieceWeight:0,paid:false,reason:'Synthetic scrap receipt'};
async function setup(enabled=true){const api=memoryApi(demoSeed(),{scrapGoldEnabled:enabled,chainLotsEnabled:true});const r=await api.request('login',{email:'local@example.test',password:'LotesLocal2026!'});assert.equal(r.statusCode,200);const cookie=r.cookie;const op=(type,input,id=crypto.randomUUID(),base=api.state.updatedAt)=>api.request('operation',{type,args:input,operationId:id,baseUpdatedAt:base},cookie);return {api,cookie,op};}
test('scrap receipt remains separate while category includes its grams and value once',async()=>{
 const {api,op}=await setup(),before=api.state;const r=await op('createPurchase',args);assert.equal(r.statusCode,200,r.body.error);const s=api.state;assert.deepEqual(s.products[0],before.products[0]);const scrap=s.products.find(I.isScrapGold);assert.equal(scrap.stock,10);assert.equal(scrap.goldPurity,18);assert.equal(scrap.category,'nacional');assert.equal(s.purchases[0].materialForm,'scrapGold');assert.equal(s.suppliers[0].creditBalance,3000000);
 const group=I.scrapCategoryTotals(s.products,s.categories)[0];assert.deepEqual(group.jewelry,{grams:100,value:40000000,average:400000});assert.deepEqual(group.scrap,{grams:10,value:3000000,average:300000});assert.deepEqual(group.total,{grams:110,value:43000000,average:390909.09});assert.equal(I.inventoryMetrics(s.products,s.categories).generalInventoryValue,43000000);assert.equal(I.inventoryMetrics(s.products,s.categories).avgCostPerGram,390909);
});
test('restocking scrap weights only its own cost and reversal restores debt and stock once',async()=>{
 const {api,op}=await setup();await op('createPurchase',args);const first=api.state,receipt=await op('createPurchase',{...args,quantity:10,unitCost:500000});assert.equal(receipt.statusCode,200,receipt.body.error);let scrap=api.state.products.find(I.isScrapGold);assert.equal(scrap.stock,20);assert.equal(scrap.cost,400000);assert.equal(api.state.products[0].cost,400000);assert.equal(api.state.suppliers[0].creditBalance,8000000);
 const po=api.state.purchases[0],id=crypto.randomUUID(),rev=await op('reversePurchase',{purchaseId:po.id,reason:'Undo synthetic receipt'},id);assert.equal(rev.statusCode,200,rev.body.error);scrap=api.state.products.find(I.isScrapGold);assert.equal(scrap.stock,10);assert.equal(scrap.cost,300000);assert.equal(api.state.suppliers[0].creditBalance,first.suppliers[0].creditBalance);const state=api.state;assert.equal((await op('reversePurchase',{purchaseId:po.id,reason:'Undo synthetic receipt'},id)).statusCode,200);assert.deepEqual(api.state,state);
});
test('paid scrap purchase uses ordinary supplier payment and cash accounting',async()=>{
 const {api,op}=await setup(),before=L.accounts(api.state);const r=await op('createPurchase',{...args,paid:true,method:'Efectivo',targetAccount:'Caja Mostrador (Efectivo)'});assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.suppliers[0].creditBalance,0);assert.equal(api.state.abonosCompras[0].amount,3000000);assert.equal(L.accounts(api.state).efectivo_caja.balance,before.efectivo_caja.balance-3000000);assert.equal(api.state.purchases[0].paidAmount,3000000);
});
test('pilot is disabled by default and cannot create scrap in the regular API',async()=>{const {api,op}=await setup(false),before=api.state;assert.equal((await op('createPurchase',args)).statusCode,403);assert.deepEqual(api.state,before);});
test('scrap rejects other purity, extras, units, chain lots and excess weight precision atomically',async()=>{
 const {api,op}=await setup();const extra=api.state.categories.find(c=>c.type==='extras'||c.isExtra);assert(extra);
 for(const patch of [{goldPurity:14},{goldPurity:24},{category:extra.id},{category:'oro14k'},{measureType:'Unidades',pieceWeight:2},{inventoryMode:'chainLot',lotCode:'TEST',unitCount:2},{quantity:1.1234567}]){const before=api.state,r=await op('createPurchase',{...args,...patch});assert.equal(r.statusCode,422,r.body.error);assert.deepEqual(api.state,before);}
 assert.equal((await op('createPurchase',{...args,quantity:1.123456})).statusCode,200);
});
test('ordinary and scrap codes cannot be converted or mixed in either direction',async()=>{
 const {api,op}=await setup();let before=api.state;assert.equal((await op('createPurchase',{...args,sku:'JOY-NAC-001'})).statusCode,422);assert.deepEqual(api.state,before);await op('createPurchase',args);before=api.state;const ordinary={...args};delete ordinary.materialForm;delete ordinary.goldPurity;assert.equal((await op('createPurchase',ordinary)).statusCode,422);assert.deepEqual(api.state,before);
});
test('snapshot edits cannot forge scrap identity or change its category and purity',async()=>{
 const {api,op,cookie}=await setup();await op('createPurchase',args);
 for(const patch of [{materialForm:'jewelry'},{goldPurity:14},{category:'oro18k'}]){const before=api.state,data=clone(before);Object.assign(data.products.find(I.isScrapGold),patch);const r=await api.request('post',{data,baseUpdatedAt:before.updatedAt},cookie);assert.equal(r.statusCode,400,r.body.error);assert.deepEqual(api.state,before);}
});
test('duplicate operation and stale receipt cannot double the scrap inventory',async()=>{
 const {api,op}=await setup(),base=api.state.updatedAt,id=crypto.randomUUID();assert.equal((await op('createPurchase',args,id,base)).statusCode,200);const before=api.state;assert.equal((await op('createPurchase',args,id,base)).statusCode,200);assert.deepEqual(api.state,before);assert.equal((await op('createPurchase',args,crypto.randomUUID(),base)).statusCode,409);assert.deepEqual(api.state,before);
});
