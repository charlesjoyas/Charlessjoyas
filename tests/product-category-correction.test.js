'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {browserHarness,memoryApi,connectOperations,clone}=require('./helpers');
const {executeOperation}=require('../lib/operations'),I=require('../js/safety'),L=require('../js/ledger');
function seed(extra=true){
 let s=browserHarness().seed;
 for(const k of ['products','purchases','recentTransactions','supplierCredits','abonosCompras','financialLedger','accountAdjustments','expenses','cashShiftsHistory'])s[k]=[];
 s.categories.push({id:'foto',name:'FOTO GRABADOS',type:'extras',isExtra:true,measureType:'Unidades'},{id:'national-test',name:'Nacional Test',type:'gold'});
 s.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];s.cashShiftLog={shiftId:'CAT-TEST',status:'Abierto',openingCash:1000000};
 s=executeOperation(s,{operationId:crypto.randomUUID(),type:'createPurchase',args:{supplier:'Supplier',category:extra?'foto':'oro18k',sku:'1097',name:'Test piece',measureType:'Unidades',quantity:1,pieceWeight:extra?0:2,unitCost:extra?351000:175500,paid:true,method:'Efectivo',reason:'Synthetic receipt'}},s.users[0]).state;
 return s;
}
function command(s,args={}){const p=s.products[0];return {type:'reclassifyProduct',operationId:crypto.randomUUID(),args:{productId:p.id,productSku:p.sku,fromCategory:p.category,categoryId:'national-test',pieceWeight:1.63,reason:'Wrong category entered',...args}};}
test('Extra to jewelry retains the same SKU, units, value, receipt, payments and debt',async()=>{
 const before=seed(),api=memoryApi(before),cookie=await api.login(),c=command(before);const r=await api.request('operation',{...c,baseUpdatedAt:api.state.updatedAt},cookie);assert.equal(r.statusCode,200,r.body.error);const s=api.state,p=s.products[0],po=s.purchases[0];assert.equal(p.id,before.products[0].id);assert.equal(p.sku,'1097');assert.equal(p.stock,1);assert.equal(p.pieceWeight,1.63);assert.equal(p.category,'national-test');assert.equal(p.isExtra,false);assert.equal(I.productValue(p),351000);assert.equal(po.totalGrams,1.63);assert.equal(po.total,351000);assert.equal(po.paidAmount,351000);assert.equal(po.category,p.category);assert.deepEqual(L.accounts(s),L.accounts(before));assert.deepEqual(s.suppliers,before.suppliers);assert.deepEqual(s.supplierCredits,before.supplierCredits);assert.deepEqual(s.abonosCompras,before.abonosCompras);assert.equal(s.financialLedger.at(-1).profitAdjustment,0);assert.equal(s.financialLedger.at(-1).actorId,s.users[0].id);assert.equal(s.financialLedger.at(-1).changes.find(c=>c.collection==='products').before.category,'foto');
 const retry=await api.request('operation',{...c,baseUpdatedAt:before.updatedAt},cookie);assert.equal(retry.body.alreadyApplied,true);assert.deepEqual(api.state,s);
});
test('corrected receipt can edit its grams again and reverse without changing its original payment',()=>{
 let s=seed();s=executeOperation(s,command(s),s.users[0]).state;
 s=executeOperation(s,{type:'editPurchase',operationId:crypto.randomUUID(),args:{purchaseId:s.purchases[0].id,totalGrams:1.7,preserveWeightTotal:true,reason:'Real weight correction'}},s.users[0]).state;assert.equal(s.purchases[0].total,351000);assert.equal(I.productValue(s.products[0]),351000);
 s=executeOperation(s,{type:'reversePurchase',operationId:crypto.randomUUID(),args:{purchaseId:s.purchases[0].id,reason:'Synthetic return'}},s.users[0]).state;assert.equal(s.products[0].stock,0);assert.equal(L.accounts(s).efectivo_caja.balance,1000000);
});
test('jewelry to Extra preserves acquisition value and resets only its physical weight basis',()=>{
 const before=seed(false),r=executeOperation(before,command(before,{categoryId:'foto',pieceWeight:0}),before.users[0]).state;assert.equal(r.products[0].cost,351000);assert.equal(r.products[0].stock,1);assert.equal(r.products[0].pieceWeight,0);assert.equal(r.purchases[0].totalGrams,0);assert.equal(I.productValue(r.products[0]),I.productValue(before.products[0]));assert.deepEqual(L.accounts(r),L.accounts(before));
});
test('moving between metal categories does not rewrite physical or financial history',()=>{
 const before=seed(false);before.recentTransactions.push({id:'PAST',items:[{id:before.products[0].id,sku:'1097'}]});const r=executeOperation(before,command(before,{pieceWeight:2}),before.users[0]).state;assert.equal(r.products[0].stock,1);assert.equal(r.products[0].cost,before.products[0].cost);assert.deepEqual(r.recentTransactions,before.recentTransactions);
});
for(const kind of ['sold','reversed-sale','other-purchase','changed-stock','changed-cost','prior-stock','missing-snapshot','invalid-weight','excess-decimals','stale-category','wrong-sku','missing-category'])test('unsafe correction is atomic: '+kind,()=>{
 const s=seed();let args={};const p=s.products[0],po=s.purchases[0];
 if(kind==='sold'||kind==='reversed-sale')s.recentTransactions.push({id:'SALE',status:kind==='sold'?'completed':'Reversada',items:[{id:p.id,sku:p.sku}]});
 if(kind==='other-purchase')s.purchases.push({...clone(po),id:'OTHER'});
 if(kind==='changed-stock')p.stock=2;if(kind==='changed-cost')p.cost=1;if(kind==='prior-stock')po.inventoryBefore.stock=1;if(kind==='missing-snapshot')delete po.inventoryAfter;
 if(kind==='invalid-weight')args.pieceWeight=0;if(kind==='excess-decimals')args.pieceWeight=1.1234567;if(kind==='stale-category')args.fromCategory='wrong';if(kind==='wrong-sku')args.productSku='970';if(kind==='missing-category')args.categoryId='missing';
 const before=clone(s);assert.throws(()=>executeOperation(s,command(s,args),s.users[0]));assert.deepEqual(s,before);
});
test('snapshot updates cannot silently reclassify products',async()=>{
 const api=memoryApi(seed()),cookie=await api.login(),before=api.state;const data=clone(before);data.products[0].category='national-test';const r=await api.request('post',{data,baseUpdatedAt:before.updatedAt},cookie);assert.equal(r.statusCode,403);assert.deepEqual(api.state,before);
});
test('category correction respects module and administrator permissions',async()=>{
 const api=memoryApi(seed()),cookie=await api.login('cashier'),before=api.state;const r=await api.request('operation',{...command(before),baseUpdatedAt:before.updatedAt},cookie);assert.equal(r.statusCode,403);assert.deepEqual(api.state,before);
});
function form(h,s){const p=s.products[0];h.app.data=clone(s);h.app.currentUser=h.app.data.users[0];h.app.canPerformAction=()=>true;return h.bindForm('edit-product-form',{'edit-prod-id':p.id,'edit-prod-orig-sku':p.sku,'edit-prod-sku':p.sku,'edit-prod-name':p.name,'edit-prod-cost':h.app.formatNumberWithCommas(p.cost,true),'edit-prod-stock':p.stock,'edit-prod-measure-type':p.measureType,'edit-prod-weight-unit':p.weightUnit,'edit-prod-piece-weight':1.63,'edit-prod-cat':'national-test','edit-prod-supplier':p.supplier,'edit-prod-active':true});}
test('actual product form explicitly reclassifies instead of requiring another SKU',async()=>{
 const h=browserHarness(),s=seed(),submit=form(h,s),api=await connectOperations(h);await submit();assert.equal(api.state.products[0].category,'national-test',JSON.stringify(h.app.events));assert.equal(api.state.products[0].pieceWeight,1.63);assert.equal(api.state.products[0].sku,'1097');assert.equal(api.state.purchases[0].total,351000);
});
test('canceling the correction prompt does not change the saved product',async()=>{
 const h=browserHarness(),s=seed(),submit=form(h,s),api=await connectOperations(h),before=api.state;h.context.prompt=()=>null;await submit();assert.deepEqual(api.state,before);
});
test('a product already in the cart cannot change its pricing basis',async()=>{
 const h=browserHarness(),s=seed(),submit=form(h,s),api=await connectOperations(h),before=api.state;h.app.cart=[{product:h.app.data.products[0],qty:1}];await submit();assert.deepEqual(api.state,before);assert(h.app.events.some(e=>e[0].includes('carrito')));
});
test('a subsequent POS sale discounts the corrected piece and keeps its acquisition value',async()=>{
 let s=seed();s=executeOperation(s,command(s),s.users[0]).state;
 const h=browserHarness();h.app.data=clone(s);h.app.currentUser=h.app.data.users[0];h.app._lastServerUpdatedAt=s.updatedAt;const api=await connectOperations(h);
 h.app.cart=[{product:h.app.data.products[0],qty:1.63,customPrice:300000}];h.app.selectedPayMethod='cash';h.inputs({'cash-received-input':489000,'checkout-customer-select':'Cliente Mostrador'});
 await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.equal(api.state.products[0].stock,0,JSON.stringify(h.app.events));assert.equal(api.state.recentTransactions[0].items[0].cogsTotal,351000);
});
test('category type and category deletion cannot reassign existing products through a snapshot',async()=>{
 for(const kind of ['type','delete']){const api=memoryApi(seed()),cookie=await api.login(),before=api.state,data=clone(before);if(kind==='type'){const c=data.categories.find(c=>c.id==='foto');c.type='gold';c.isExtra=false;}else data.categories=data.categories.filter(c=>c.id!=='foto');const r=await api.request('post',{data,baseUpdatedAt:before.updatedAt},cookie);assert.equal(r.statusCode,403);assert.deepEqual(api.state,before);}
});
test('another write prevents a stale category correction instead of overwriting it',async()=>{
 const api=memoryApi(seed()),cookie=await api.login(),before=api.state,c=command(before);const r=await api.request('operation',{...c,baseUpdatedAt:'stale'},cookie);assert.equal(r.statusCode,409);assert.deepEqual(api.state,before);
});
test('legacy Extra with missing product flag still needs a real weight and preserves value',()=>{
 const s=seed();delete s.products[0].isExtra;const r=executeOperation(s,command(s),s.users[0]).state;assert.equal(r.products[0].pieceWeight,1.63);assert.equal(r.products[0].isExtra,false);assert.equal(I.productValue(r.products[0]),351000);
});
test('changing category without saving and switching back leaves the stored category and weight intact',()=>{
 const h=browserHarness(),s=seed(false);form(h,s);const before=clone(h.app.data.products);h.context.document.getElementById('edit-prod-cat').value='foto';h.app.onProductCategoryChange('edit');h.context.document.getElementById('edit-prod-cat').value='oro18k';h.app.onProductCategoryChange('edit');assert.equal(Number(h.context.document.getElementById('edit-prod-piece-weight').value),2);assert.deepEqual(h.app.data.products,before);
});
