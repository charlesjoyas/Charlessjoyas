'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {memoryApi}=require('./helpers'),{demoSeed}=require('../scripts/scrap-gold-local'),I=require('../js/safety');
test('first scrap receipt creates only its independent category atomically and retries once',async()=>{
 const seed=demoSeed();seed.categories=seed.categories.filter(c=>c.id!=='chatarra');
 const api=memoryApi(seed,{scrapGoldEnabled:true});const login=await api.request('login',{email:'local@example.test',password:'LotesLocal2026!'}),cookie=login.cookie;
 const base=api.state,args={supplier:'Proveedor de prueba',category:'chatarra',materialForm:'scrapGold',scrapOrigin:'italiano',sku:'SCRAP-FIRST',name:'Primera compra ficticia',measureType:'Pesaje',quantity:2.5,unitCost:300000,paid:false,reason:'First synthetic receipt'};
 const invalid=await api.request('operation',{type:'createPurchase',args:{...args,scrapOrigin:''},operationId:crypto.randomUUID(),baseUpdatedAt:base.updatedAt},cookie);assert.equal(invalid.statusCode,422);assert.deepEqual(api.state,base);
 const command={type:'createPurchase',args,operationId:crypto.randomUUID(),baseUpdatedAt:base.updatedAt},result=await api.request('operation',command,cookie);assert.equal(result.statusCode,200,result.body.error);
 const saved=api.state;assert.equal(saved.categories.filter(c=>c.id==='chatarra').length,1);assert.deepEqual(saved.categories.filter(c=>c.id!=='chatarra'),base.categories);assert.deepEqual(saved.products.filter(p=>!I.isScrapGold(p)),base.products);assert.equal(I.inventoryMetrics(saved.products,saved.categories).generalInventoryValue,I.inventoryMetrics(base.products,base.categories).generalInventoryValue);
 assert.equal((await api.request('operation',command,cookie)).statusCode,200);assert.deepEqual(api.state,saved);
});
