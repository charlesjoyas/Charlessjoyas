'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browserHarness,memoryApi,connectOperations,clone,product}=require('./helpers');
const {publicState}=require('../lib/state-api');
const {executeOperation}=require('../lib/operations');
const {finalizeState,coreValidation}=require('../lib/financial-validation');
const I=require('../js/safety');
function fixture(){
 const h=browserHarness();for(const key of ['purchases','recentTransactions','customerCredits','supplierCredits','abonosVentas','abonosCompras','financialLedger','expenses','accountAdjustments','cashShiftsHistory'])h.seed[key]=[];
 h.seed.categories=[{id:'oro18k',name:'Oro 18K'},{id:'esmeraldas',name:'ESMERALDAS',type:'general'},{id:'foto',name:'FOTO GRABADOS',type:'extras',isExtra:true,measureType:'Unidades'},{id:'manillas',name:'Manillas',type:'extras',availableUnits:100,cost:6000}];
 h.seed.products=[product({stock:10,cost:400000,price:500000}),...[2,1,3,4,.5].map((weight,i)=>product({id:'EM-'+i,sku:'EM-'+i,name:'Esmeralda '+i,category:'esmeraldas',categoryName:'ESMERALDAS',measureType:'Unidades',weightUnit:'u.',unit:'u.',pieceWeight:weight,weight,stock:1,cost:1000,price:0})),product({id:'FOTO',sku:'FOTO',name:'Foto',category:'foto',categoryName:'FOTO GRABADOS',measureType:'Unidades',weightUnit:'u.',unit:'u.',pieceWeight:0,weight:0,isExtra:true,stock:6,cost:35000,price:50000})];
 h.seed.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];h.seed.cashShiftLog={status:'Abierto',shiftId:'EXTRA',openingCash:100000000};h.seed.store.taxRate=0;
 h.app.data=publicState(h.seed);h.app.currentUser=h.app.data.users[0];return h;
}
function separate(seed,scope='extra'){
 const result=executeOperation(seed,{type:'setCategoryInventoryScope',operationId:'separate-esmeraldas-test-'+scope,args:{categoryId:'esmeraldas',scope,reason:'Separate inventory reporting while preserving all physical records'}},seed.users[0]);coreValidation(result.state,seed);return {state:finalizeState(result.state),audit:result.audit};
}
test('separation preserves every product and value while excluding only extra grams and weighted cost',()=>{
 const {seed}=fixture(),before=I.inventoryMetrics(seed.products,seed.categories),{state,audit}=separate(seed),after=state.kpis;
 assert.deepEqual(state.products,seed.products);for(const key of ['purchases','recentTransactions','suppliers','supplierCredits','customerCredits','customers','abonosVentas','abonosCompras','expenses','accountAdjustments'])assert.deepEqual(state[key],seed[key]);
 assert.equal(after.inventoryValue,4220500);assert.equal(after.inventoryValue,before.inventoryValue);assert.equal(after.generalInventoryValue,4000000);assert.equal(after.extrasInventoryValue,220500);assert.equal(after.totalGrams,10);assert.equal(after.avgCostPerGram,400000);
 assert.equal(I.round(before.totalGrams-after.totalGrams),10.5);assert.equal(after.generalInventoryValue+after.extrasInventoryValue,after.inventoryValue);
 const emerald=after.extrasByCategory.find(c=>c.id==='esmeraldas');assert.equal(emerald.value,10500);assert.equal(emerald.units,5);assert.equal(emerald.grams,10.5);assert.equal(emerald.averageCostPerGram,1000);assert.equal(emerald.averageCostPerUnit,2100);
 assert.equal(after.extrasByCategory.find(c=>c.id==='foto').averageCostPerUnit,35000);assert.equal(audit.profitAdjustment,0);assert.equal(audit.changes.length,1);assert.equal(audit.changes[0].collection,'categories');
});
test('physical weights, gram costs and per-piece valuation stay available to forms and historical reversals',()=>{
 const h=fixture();h.app.data=publicState(separate(h.seed).state);h.app.syncAllCategoryGrams();
 const c=h.app.data.categories.find(c=>c.id==='esmeraldas');assert.equal(c.type,'general');assert.equal(c.inventoryScope,'extra');assert.equal(c.availableGrams,10.5);assert.equal(c.cost,1000);assert.equal(c.totalValuation,10500);
 const p=h.app.data.products.find(p=>p.sku==='EM-0');assert.equal(h.app.getGramsFromProduct(p),0);assert.equal(h.app.getCategoryProductGrams(p),2);assert.equal(h.app.getProductTotalCost(p),2000);assert.equal(I.restoreQuantity({qty:2,measureType:'Unidades',unit:'g',pieceWeight:2},p),1);
});
test('dashboard displays independent primary/extra balances and preserved accounting total',()=>{
 const h=fixture();h.app.data=publicState(separate(h.seed).state);
 const nodes=h.inputs({'kpi-inv-val':'','kpi-extra-inv-val':'','kpi-total-inv-val':'','kpi-extra-details':'','kpi-avg-cost':'','kpi-total-grams':''});h.App.prototype.renderDashboardMetrics.call(h.app);
 assert.equal(nodes['kpi-inv-val'].innerText,h.app.formatCurrency(4000000));assert.equal(nodes['kpi-extra-inv-val'].innerText,h.app.formatCurrency(220500));assert.equal(nodes['kpi-total-inv-val'].innerText,h.app.formatCurrency(4220500));assert.match(nodes['kpi-extra-details'].textContent,/ESMERALDAS/);assert.match(nodes['kpi-avg-cost'].innerText,/400.000/);
});
test('category table preserves an independent gram average and explicitly labels the extra group',()=>{
 const h=fixture();h.app.data=publicState(separate(h.seed).state);h.app.syncAllCategoryGrams();const nodes=h.inputs({'inv-cat-tbody':''});h.App.prototype.renderInvCategoriasTable.call(h.app);const html=nodes['inv-cat-tbody'].innerHTML;
 assert.match(html,/Extra · promedio propio/);assert.match(html,/10,5/);assert.equal(h.app.data.categories.find(c=>c.id==='esmeraldas').totalValuation,10500);assert.equal(h.app.data.categories.find(c=>c.id==='esmeraldas').cost,1000);
});
test('server and client metrics agree before and after separation without multiplying a legacy cost incorrectly',()=>{
 const h=fixture();for(const state of [h.seed,separate(h.seed).state]){h.app.data=publicState(state);h.app.syncAllCategoryGrams();const final=finalizeState(clone(state));for(const key of ['inventoryValue','generalInventoryValue','extrasInventoryValue','totalGrams','avgCostPerGram','extrasByCategory'])assert.deepEqual(clone(h.app.data.kpis[key]),final.kpis[key]);}
});
test('a weighted extra purchase preserves its unit measure and uses its actual piece weight and gram cost',()=>{
 const s=separate(fixture().seed).state;const {state}=executeOperation(s,{type:'createPurchase',operationId:'extra-purchase-test-001',args:{reason:'Weighted emerald replenishment',supplier:'Supplier',sku:'EM-0',productId:'EM-0',category:'esmeraldas',measureType:'Unidades',pieceWeight:2,quantity:1,unitCost:2000,paid:false}},s.users[0]);finalizeState(state);
 assert.equal(state.purchases[0].total,4000);assert.equal(state.purchases[0].totalGrams,2);assert.equal(state.products.find(p=>p.id==='EM-0').stock,2);assert.equal(state.products.find(p=>p.id==='EM-0').pieceWeight,2);assert.equal(state.products.find(p=>p.id==='EM-0').cost,1500);assert.equal(state.kpis.generalInventoryValue,4000000);assert.equal(state.kpis.avgCostPerGram,400000);assert.equal(state.kpis.extrasInventoryValue,224500);
});
test('weighted extra sale and reversal keep exact COGS and restore its own pool without touching gold',async()=>{
 const h=fixture();h.app.data=publicState(separate(h.seed).state);h.app.currentUser=h.app.data.users[0];h.app.selectedPayMethod='cash';h.inputs({'cash-received-input':4000});const api=await connectOperations(h);
 assert.equal(h.app.addToCart('EM-0',2,2000),true);await h.app.runMutation(()=>h.app.processPaymentSuccess());const s=api.state,tx=s.recentTransactions[0];assert.ok(tx,JSON.stringify(h.app.events));assert.equal(tx.total,4000);assert.equal(tx.items[0].cogsTotal,2000);assert.equal(s.products.find(p=>p.id==='EM-0').stock,0);assert.equal(s.kpis.generalInventoryValue,4000000);assert.equal(s.kpis.extrasInventoryValue,218500);assert.equal(s.kpis.avgCostPerGram,400000);
 await h.app.runMutation(()=>h.app.executeFinancialOperation('reverseSale',{saleId:tx.id,reason:'Verified return of the same weighted emerald'}));assert.equal(api.state.products.find(p=>p.id==='EM-0').stock,1);assert.equal(api.state.kpis.extrasInventoryValue,220500);assert.equal(api.state.kpis.inventoryValue,4220500);
});
test('category separation operation is idempotent, permission checked and rejects stale snapshots',async()=>{
 const api=memoryApi(fixture().seed),cookie=await api.login(),body={type:'setCategoryInventoryScope',operationId:'extra-category-api-001',baseUpdatedAt:api.state.updatedAt,args:{categoryId:'esmeraldas',scope:'extra',reason:'Separate without altering inventory'}};
 let r=await api.request('operation',body,await api.login('cashier'));assert.equal(r.statusCode,403);r=await api.request('operation',body,cookie);assert.equal(r.statusCode,200,r.body.error);r=await api.request('operation',body,cookie);assert.equal(r.body.alreadyApplied,true);assert.equal(api.state.financialLedger.length,1);
 r=await api.request('operation',{...body,operationId:'extra-category-api-002'},cookie);assert.equal(r.statusCode,409);
});
test('direct snapshots cannot silently reclassify or delete a populated separate inventory category',async()=>{
 const api=memoryApi(separate(fixture().seed).state),cookie=await api.login(),before=api.state;
 for(const remove of [false,true]){const next=publicState(before);if(remove)next.categories=next.categories.filter(c=>c.id!=='esmeraldas');else delete next.categories.find(c=>c.id==='esmeraldas').inventoryScope;const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:next},cookie);assert.equal(r.statusCode,403,r.body.error);assert.deepEqual(api.state,before);}
});
test('stable category IDs take priority over a stale category display name',()=>{
 const categories=[{id:'oro18k',name:'Oro'},{id:'esmeraldas',name:'ESMERALDAS',inventoryScope:'extra'}],p=product({category:'oro18k',categoryName:'ESMERALDAS',stock:2,cost:400000});const result=I.inventoryMetrics([p],categories);assert.equal(result.generalInventoryValue,800000);assert.equal(result.extrasInventoryValue,0);assert.equal(result.totalGrams,2);
});
test('classification can be reverted without changing stock and never converts unit-only extras to metals',()=>{
 const s=separate(fixture().seed).state,{state}=separate(s,'principal');assert.deepEqual(state.products,s.products);assert.equal(state.kpis.totalGrams,20.5);assert.equal(state.kpis.inventoryValue,s.kpis.inventoryValue);
 assert.throws(()=>executeOperation(s,{type:'setCategoryInventoryScope',operationId:'invalid-unit-category-001',args:{categoryId:'foto',scope:'principal',reason:'Invalid conversion'}},s.users[0]),/Extras por unidad/);
});
test('new weighted Extra categories preserve their weight fields and classify through the normal category form',async()=>{
 const h=fixture(),api=await connectOperations(h);const submit=h.bindForm('add-category-form',{'cat-type-select':'extraWeighted','cat-name-input':'Rubíes','cat-color-input':'#ff0000','cat-grams-input':'0','cat-cost-input':'200000'});await submit();const c=api.state.categories.find(c=>c.name==='Rubíes');assert.ok(c,JSON.stringify(h.app.events));assert.equal(c.inventoryScope,'extra');assert.equal(c.type,'general');assert.equal(c.cost,200000);
});
test('individual unit-only Extras in a metal category stay outside its pool without moving the product',()=>{
 const h=fixture();h.app.data.products.push(product({id:'MANILLA',sku:'MANILLA',name:'Manillas',measureType:'Unidades',weightUnit:'u.',pieceWeight:0,stock:18,cost:7000,isExtra:true}));h.app.data.categories.find(c=>c.id==='esmeraldas').inventoryScope='extra';const before=clone(h.app.data.products);h.app.syncAllCategoryGrams();assert.equal(h.app.data.categories.find(c=>c.id==='oro18k').totalValuation,4000000);assert.deepEqual(clone(h.app.data.products),before);assert.equal(h.app.data.kpis.generalInventoryValue,4000000);assert.equal(h.app.data.kpis.extrasByCategory.find(c=>c.id==='product:MANILLA').value,126000);
});
test('category-only API operation preserves cash shift, accounts, user records and every financial collection exactly',async()=>{
 const h=fixture(),api=memoryApi(h.seed),cookie=await api.login(),before=api.state;
 const r=await api.request('operation',{type:'setCategoryInventoryScope',operationId:'separate-only-metadata-001',baseUpdatedAt:before.updatedAt,args:{categoryId:'esmeraldas',scope:'extra',reason:'Preserve all operational records'}},cookie);assert.equal(r.statusCode,200,r.body.error);
 for(const key of Object.keys(before).filter(k=>!['updatedAt','categories','financialLedger','kpis'].includes(k)))assert.deepEqual(api.state[key],before[key],key+' must remain identical');
});
