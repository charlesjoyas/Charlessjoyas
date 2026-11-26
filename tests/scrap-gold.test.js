'use strict';const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {memoryApi,clone}=require('./helpers'),I=require('../js/safety'),L=require('../js/ledger'),{demoSeed}=require('../scripts/scrap-gold-local');
const args={supplier:'Proveedor de prueba',category:'chatarra',sku:'CHAT-001',name:'Chatarra de prueba',measureType:'Pesaje',quantity:10,unitCost:300000,pieceWeight:0,paid:false,reason:'Synthetic scrap receipt'};
async function setup(enabled=true){const api=memoryApi(demoSeed(),{scrapGoldEnabled:enabled,chainLotsEnabled:true});const r=await api.request('login',{email:'local@example.test',password:'LotesLocal2026!'});assert.equal(r.statusCode,200);const cookie=r.cookie;const op=(type,input,id=crypto.randomUUID(),base=api.state.updatedAt)=>api.request('operation',{type,args:input,operationId:id,baseUpdatedAt:base},cookie);return {api,cookie,op};}
test('independent scrap receipt never changes the other categories or principal grams and average',async()=>{
 const {api,op}=await setup(),before=api.state;const r=await op('createPurchase',args);assert.equal(r.statusCode,200,r.body.error);const s=api.state;assert.deepEqual(s.products[0],before.products[0]);const scrap=s.products.find(I.isScrapGold);assert.equal(scrap.stock,10);assert.equal(scrap.goldPurity,undefined);assert.equal(scrap.category,'chatarra');assert.equal(s.purchases[0].materialForm,'scrapGold');assert.equal(s.suppliers[0].creditBalance,3000000);assert.deepEqual(s.categories,before.categories);
 const group=I.scrapCategoryTotals(s.products,s.categories)[0];assert.equal(group.id,'chatarra');assert.deepEqual(group.total,{grams:10,value:3000000,average:300000});const metrics=I.inventoryMetrics(s.products,s.categories);assert.equal(metrics.generalInventoryValue,40000000);assert.equal(metrics.avgCostPerGram,400000);assert.equal(metrics.totalGrams,100);assert.equal(metrics.inventoryValue,43000000);assert.deepEqual(metrics.extrasByCategory.find(c=>c.id==='chatarra'),{id:'chatarra',name:'CHATARRA',value:3000000,grams:10,units:0,products:1,averageCostPerGram:300000,averageCostPerUnit:0});
});
test('restocking scrap weights only its own cost and reversal restores debt and stock once',async()=>{
 const {api,op}=await setup();await op('createPurchase',args);const first=api.state,receipt=await op('createPurchase',{...args,quantity:10,unitCost:500000});assert.equal(receipt.statusCode,200,receipt.body.error);let scrap=api.state.products.find(I.isScrapGold);assert.equal(scrap.stock,20);assert.equal(scrap.cost,400000);assert.equal(api.state.products[0].cost,400000);assert.equal(api.state.suppliers[0].creditBalance,8000000);
 const po=api.state.purchases[0],id=crypto.randomUUID(),rev=await op('reversePurchase',{purchaseId:po.id,reason:'Undo synthetic receipt'},id);assert.equal(rev.statusCode,200,rev.body.error);scrap=api.state.products.find(I.isScrapGold);assert.equal(scrap.stock,10);assert.equal(scrap.cost,300000);assert.equal(api.state.suppliers[0].creditBalance,first.suppliers[0].creditBalance);const state=api.state;assert.equal((await op('reversePurchase',{purchaseId:po.id,reason:'Undo synthetic receipt'},id)).statusCode,200);assert.deepEqual(api.state,state);
});
test('paid scrap purchase uses ordinary supplier payment and cash accounting',async()=>{
 const {api,op}=await setup(),before=L.accounts(api.state);const r=await op('createPurchase',{...args,paid:true,method:'Efectivo',targetAccount:'Caja Mostrador (Efectivo)'});assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.suppliers[0].creditBalance,0);assert.equal(api.state.abonosCompras[0].amount,3000000);assert.equal(L.accounts(api.state).efectivo_caja.balance,before.efectivo_caja.balance-3000000);assert.equal(api.state.purchases[0].paidAmount,3000000);
});
test('pilot is disabled by default and cannot create scrap in the regular API',async()=>{const {api,op}=await setup(false),before=api.state;assert.equal((await op('createPurchase',args)).statusCode,403);assert.deepEqual(api.state,before);});
test('scrap rejects units, chain lots and excess weight precision atomically',async()=>{
 const {api,op}=await setup();const extra=api.state.categories.find(c=>c.type==='extras'||c.isExtra);assert(extra);
 for(const patch of [{materialForm:'scrapGold',category:extra.id},{materialForm:'scrapGold',category:'oro14k'},{measureType:'Unidades',pieceWeight:2},{inventoryMode:'chainLot',lotCode:'TEST',unitCount:2},{quantity:1.1234567}]){const before=api.state,r=await op('createPurchase',{...args,...patch});assert.equal(r.statusCode,422,r.body.error);assert.deepEqual(api.state,before);}
 assert.equal((await op('createPurchase',{...args,quantity:1.123456})).statusCode,200);
});
test('ordinary and scrap codes cannot be converted or mixed in either direction',async()=>{
 const {api,op}=await setup();let before=api.state;assert.equal((await op('createPurchase',{...args,sku:'JOY-NAC-001'})).statusCode,422);assert.deepEqual(api.state,before);await op('createPurchase',args);before=api.state;assert.equal((await op('createPurchase',{...args,category:'nacional'})).statusCode,422);assert.deepEqual(api.state,before);
});
test('snapshot edits cannot forge scrap identity or change its category and purity',async()=>{
 const {api,op,cookie}=await setup();await op('createPurchase',args);
 for(const patch of [{materialForm:'jewelry'},{goldPurity:14},{category:'oro18k'}]){const before=api.state,data=clone(before);Object.assign(data.products.find(I.isScrapGold),patch);const r=await api.request('post',{data,baseUpdatedAt:before.updatedAt},cookie);assert.equal(r.statusCode,400,r.body.error);assert.deepEqual(api.state,before);}
});
test('duplicate operation and stale receipt cannot double the scrap inventory',async()=>{
 const {api,op}=await setup(),base=api.state.updatedAt,id=crypto.randomUUID();assert.equal((await op('createPurchase',args,id,base)).statusCode,200);const before=api.state;assert.equal((await op('createPurchase',args,id,base)).statusCode,200);assert.deepEqual(api.state,before);assert.equal((await op('createPurchase',args,crypto.randomUUID(),base)).statusCode,409);assert.deepEqual(api.state,before);
});
test('different karat descriptions share only the scrap category acquisition average',async()=>{
 const {api,op}=await setup();assert.equal((await op('createPurchase',{...args,name:'Chatarra 18K'})).statusCode,200);assert.equal((await op('createPurchase',{...args,sku:'CHAT-002',name:'Chatarra 14K',goldPurity:14,quantity:5,unitCost:200000})).statusCode,200);
 const s=api.state,group=I.scrapCategoryTotals(s.products,s.categories)[0];assert.deepEqual(group.total,{grams:15,value:4000000,average:266666.67});const m=I.inventoryMetrics(s.products,s.categories);assert.equal(m.generalInventoryValue,40000000);assert.equal(m.avgCostPerGram,400000);assert.equal(m.totalGrams,100);assert.equal(m.extrasInventoryValue,4000000);
 const before=api.state,r=await op('setCategoryInventoryScope',{categoryId:'chatarra',scope:'principal',reason:'Attempt invalid merge'});assert.equal(r.statusCode,400);assert.deepEqual(api.state,before);
});
