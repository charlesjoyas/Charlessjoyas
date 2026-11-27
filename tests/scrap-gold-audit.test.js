'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {browserHarness,connectOperations,clone}=require('./helpers'),{demoSeed}=require('../scripts/scrap-gold-local'),{publicState}=require('../lib/state-api'),I=require('../js/safety');
const receipt={supplier:'Proveedor de prueba',category:'chatarra',scrapOrigin:'nacional',sku:'CHAT-AUDIT',name:'Chatarra de auditoría',measureType:'Pesaje',quantity:10.123456,unitCost:300000,paid:false,reason:'Synthetic local audit'};
async function setup(){const h=browserHarness();h.app.data=publicState({...demoSeed(),users:h.seed.users});h.app.currentUser=h.app.data.users[0];h.app._lastServerUpdatedAt=h.app.data.updatedAt;const api=await connectOperations(h,{scrapGoldEnabled:true,chainLotsEnabled:true});await h.app.executeFinancialOperation('createPurchase',receipt);return {...h,api};}
test('category preserves all six gram decimals and its exact weighted average',async()=>{
 const {app}=await setup();app.syncAllCategoryGrams();const c=app.data.categories.find(c=>c.id==='chatarra');assert.equal(c.availableGrams,10.123456);assert.equal(c.cost,300000);
});
test('POS modal and cart treat three decimal scrap grams as grams, not thousands',async()=>{
 const h=await setup(),p=h.app.data.products.find(I.isScrapGold);h.inputs({'pos-add-product-id':p.id});assert.equal(h.app.readPosQuantity('1.234'),1.234);assert.equal(h.app.readPosQuantity('1,234'),1.234);h.app.cart=[{product:p,qty:2,customPrice:500000}];h.app.setCartQty(p.id,'1.234');assert.equal(h.app.cart[0].qty,1.234);
});
test('ordinary catalog products cannot enter CHATARRA without its documented receipt identity',async()=>{
 const {api}=await setup(),cookie=await api.login(),before=api.state,data=publicState(before);Object.assign(data.products[0],{category:'chatarra',categoryName:'CHATARRA'});const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data},cookie);assert.equal(r.statusCode,403,r.body.error);assert.deepEqual(api.state,before);
});
test('scrap purchase correction rejects overprecision without changing stock or debt',async()=>{
 const {api}=await setup(),cookie=await api.login(),before=api.state;const r=await api.request('operation',{baseUpdatedAt:before.updatedAt,operationId:crypto.randomUUID(),type:'editPurchase',args:{purchaseId:before.purchases[0].id,quantity:10.1234567,unitCost:300000,total:3037037.01,reason:'Audit precision'}},cookie);assert.equal(r.statusCode,422,r.body.error);assert.deepEqual(api.state,before);
});
test('sub-microgram receipt cannot charge a purchase while rounding its stock to zero',async()=>{
 const {api}=await setup(),cookie=await api.login(),before=api.state;const r=await api.request('operation',{baseUpdatedAt:before.updatedAt,operationId:crypto.randomUUID(),type:'createPurchase',args:{...receipt,sku:'TINY-RECEIPT',quantity:1e-10,unitCost:1e12}},cookie);assert.equal(r.statusCode,422,r.body.error);assert.deepEqual(api.state,before);
});
test('sale, later restock and sale reversal preserve principal inventory and historical sale cost',async()=>{
 const h=await setup(),original=h.api.state.products[0],p=h.app.data.products.find(I.isScrapGold),qty=1.234123,total=Math.round(qty*500000);h.app.cart=[{product:p,qty,customPrice:500000}];h.app.selectedPayMethod='cash';h.inputs({'cash-received-input':total,'checkout-customer-select':'Cliente Mostrador'});await h.app.runMutation(()=>h.app.processPaymentSuccess());let s=h.api.state;assert.equal(s.recentTransactions.length,1,JSON.stringify(h.app.events));const tx=s.recentTransactions[0];assert.equal(tx.items[0].cogsTotal,Math.round(qty*300000));assert.equal(s.products.find(I.isScrapGold).stock,I.round(receipt.quantity-qty));assert.deepEqual(s.products.find(p=>p.id===original.id),original);
 await h.app.executeFinancialOperation('createPurchase',{...receipt,quantity:5,unitCost:500000});const currentCost=h.api.state.products.find(I.isScrapGold).cost;await h.app.executeFinancialOperation('reverseSale',{saleId:tx.id,reason:'Synthetic return'});s=h.api.state;assert.equal(s.products.find(I.isScrapGold).stock,I.round(receipt.quantity+5));assert.equal(s.products.find(I.isScrapGold).cost,currentCost);assert.deepEqual(s.products.find(p=>p.id===original.id),original);assert.equal(s.recentTransactions[0].items[0].cost,300000);assert.equal(I.inventoryMetrics(s.products,s.categories).avgCostPerGram,400000);
});
test('selling the complete scrap stock clears its category average without changing principal inventory',async()=>{
 const h=await setup(),p=h.app.data.products.find(I.isScrapGold),total=Math.round(p.stock*500000);h.app.cart=[{product:p,qty:p.stock,customPrice:500000}];h.app.selectedPayMethod='cash';h.inputs({'cash-received-input':total,'checkout-customer-select':'Cliente Mostrador'});await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.equal(h.api.state.products.find(I.isScrapGold).stock,0);h.app.syncAllCategoryGrams();const c=h.app.data.categories.find(c=>c.id==='chatarra');assert.equal(c.availableGrams,0);assert.equal(c.cost,0);assert.equal(c.totalValuation,0);assert.equal(I.inventoryMetrics(h.api.state.products,h.api.state.categories).avgCostPerGram,400000);
});
test('valid six-decimal purchase correction keeps stock and supplier debt consistent',async()=>{
 const h=await setup(),po=h.api.state.purchases[0],quantity=11.123456,total=I.round(quantity*300000,2);await h.app.executeFinancialOperation('editPurchase',{purchaseId:po.id,quantity,unitCost:300000,total,reason:'Valid synthetic correction'});const s=h.api.state;assert.equal(s.products.find(I.isScrapGold).stock,quantity);assert.equal(s.purchases[0].total,total);assert.equal(s.suppliers[0].creditBalance,total);assert.equal(s.products.find(p=>p.id==='LOCAL-NACIONAL').stock,100);
});
test('sale API rejects overselling and sub-microgram or overprecise scrap quantities atomically',async()=>{
 const h=await setup(),cookie=await h.api.login();for(const qty of [20,1e-10,1.1234567]){const before=h.api.state,data=publicState(before),p=data.products.find(I.isScrapGold),price=1e12,total=Math.round(qty*price);p.stock=I.round(p.stock-qty);data.recentTransactions.unshift({id:crypto.randomUUID(),shiftId:before.cashShiftLog.shiftId,status:'completed',date:'26/11/2026',timestamp:Date.now(),paymentMethod:'Efectivo',customer:'Cliente Mostrador',subtotal:total,tax:0,total,items:[{id:p.id,sku:p.sku,name:p.name,qty,quantity:qty,price,total,unit:'g',measureType:'Pesaje',pieceWeight:0}]});const r=await h.api.request('post',{baseUpdatedAt:before.updatedAt,data},cookie);assert.equal(r.statusCode,400,r.body.error||'Expected rejection');assert.deepEqual(h.api.state,before);}
});
test('catalog cannot replace a scrap SKU and strand its existing purchase history',async()=>{
 const {api}=await setup(),cookie=await api.login(),before=api.state,data=publicState(before);data.products.find(I.isScrapGold).sku='NEW-UNLINKED-CODE';const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data},cookie);assert.equal(r.statusCode,400,r.body.error||'Expected SKU identity rejection');assert.deepEqual(api.state,before);
});
