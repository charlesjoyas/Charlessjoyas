'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const {browserHarness,memoryApi,clone,product,connectOperations}=require('./helpers');
const {executeOperation}=require('../lib/operations'),{publicState}=require('../lib/state-api'),L=require('../js/ledger');
function fixture(){
 const h=browserHarness(),s=h.seed;
 for(const key of ['recentTransactions','purchases','customerCredits','supplierCredits','abonosVentas','abonosCompras','expenses','accountAdjustments','financialLedger','cashShiftsHistory'])s[key]=[];
 s.products=[product({supplier:'Supplier'}),product({id:'P2',sku:'002',name:'Audit jewelry',supplier:'Supplier'})];s.suppliers=[{id:'S1',name:'Supplier',creditBalance:100}];
 s.purchases=[{id:'PO1',productId:'P1',productSku:'001',productName:'Audit jewelry',quantity:1,unitCost:100,total:100,paidAmount:0,supplier:'Supplier',supplierId:'S1',date:'2026-11-25',status:'Recibido',paymentStatus:'Pendiente',measureType:'Pesaje'},
 {id:'PO2',productId:'P1',productSku:'1',productName:'Old spelling',quantity:1,unitCost:100,total:100,paidAmount:100,supplier:'Supplier',supplierId:'S1',date:'2026-11-24',status:'Recibido',paymentStatus:'Pagado Total'},
 {id:'OTHER',productId:'P2',productSku:'002',productName:'Audit jewelry',quantity:1,unitCost:100,total:100,paidAmount:100,supplier:'Supplier',date:'2026-11-24',status:'Recibido'},
 {id:'VOID',productId:'P1',productSku:'001',productName:'Original voided name',quantity:1,unitCost:100,total:100,paidAmount:0,supplier:'Supplier',date:'2026-11-23',status:'Reversada'}];
 // Deliberately ambiguous credit support: a name correction must not require debt reconciliation.
 s.supplierCredits=[{id:'CP1',supplier:'Supplier',totalOwed:60,pendingAmount:60,paidAmount:0},{id:'CP2',supplier:'Supplier',totalOwed:40,pendingAmount:40,paidAmount:0}];
 s.cashShiftLog={shiftId:'S1',status:'Abierto',openingCash:1000,openingCard:0};
 s.recentTransactions=[{id:'SALE',status:'completed',total:200,paymentMethod:'Efectivo',shiftId:'S1',items:[{id:'P1',sku:'001',name:'Audit jewelry',qty:1,price:200,total:200,measureType:'Pesaje',unit:'g'}]}];
 h.app.data=publicState(s);return h;
}
test('purchase name correction updates linked catalog and active orders without changing financial records',()=>{
 const s=fixture().seed,before=clone(s),balances=L.accounts(s);const {state:after,audit}=executeOperation(s,{operationId:crypto.randomUUID(),type:'editPurchase',args:{purchaseId:'PO1',productName:'Corrected jewelry',reason:'Correct spelling'}},s.users[0]);
 assert.equal(after.products[0].name,'Corrected jewelry');assert.equal(after.purchases[0].productName,'Corrected jewelry');assert.equal(after.purchases[1].productName,'Corrected jewelry');assert.deepEqual(after.purchases[2],before.purchases[2]);assert.deepEqual(after.purchases[3],before.purchases[3]);assert.equal(after.products[1].name,'Audit jewelry');
 for(const p of after.products)assert.deepEqual({...p,name:before.products.find(x=>x.id===p.id).name},before.products.find(x=>x.id===p.id));
 for(const p of after.purchases){const old=before.purchases.find(x=>x.id===p.id),actual={...p,productName:old.productName};delete actual.edited;delete actual.updatedAt;assert.deepEqual(actual,old);}
 for(const key of ['recentTransactions','supplierCredits','suppliers','abonosCompras','expenses','cashShiftLog'])assert.deepEqual(after[key],before[key]);assert.deepEqual(L.accounts(after),balances);assert.equal(audit.metadataOnly,true);assert.equal(audit.profitAdjustment,0);
});
test('catalog edit synchronizes only names in matching active purchase identities with audit evidence',async()=>{
 const s=fixture().seed,api=memoryApi(s),cookie=await api.login(),before=api.state,data=publicState(before);data.products[0].name='Catalog corrected name';
 const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data},cookie);assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.purchases[0].productName,'Catalog corrected name');assert.equal(api.state.purchases[1].productName,'Catalog corrected name');assert.equal(api.state.purchases[2].productName,'Audit jewelry');assert.equal(api.state.purchases[3].productName,'Original voided name');assert.deepEqual(api.state.recentTransactions,before.recentTransactions);assert.deepEqual(api.state.supplierCredits,before.supplierCredits);
 const audit=api.state.financialLedger.at(-1);assert(audit.collections.includes('purchases'));assert.deepEqual(audit.productNameChanges[0].purchaseIds,['PO1','PO2']);
});
test('blank names and mismatched product ID/SKU reject the entire correction',()=>{
 const s=fixture().seed,before=clone(s),run=name=>executeOperation(s,{type:'editPurchase',operationId:crypto.randomUUID(),args:{purchaseId:'PO1',productName:name,reason:'Test'}},s.users[0]);
 for(const name of ['', '   ','x'.repeat(201)])assert.throws(()=>run(name),/nombre/);s.purchases[0].productSku='002';assert.throws(()=>run('Corrected'),/no coincide/);s.purchases[0].productSku='001';assert.deepEqual(s,before);
});
test('a missing catalog product allows only the purchase description correction, without creating inventory',()=>{
 const s=fixture().seed;s.products=s.products.filter(p=>p.id!=='P1');const {state:after}=executeOperation(s,{type:'editPurchase',operationId:crypto.randomUUID(),args:{purchaseId:'PO1',productName:'Historical correction',reason:'Test'}},s.users[0]);assert.equal(after.purchases[0].productName,'Historical correction');assert.equal(after.products.length,1);assert.equal(after.products[0].id,'P2');
});
test('lot name-only correction through authenticated API keeps grams, units, costs and closed cash log exact',async()=>{
 const s=fixture().seed;s.products[0]={...s.products[0],inventoryMode:'chainLot',lotCode:'LOT-A',stock:200,stockUnits:50,cost:100,pieceWeight:0,weight:0};s.purchases[0]={...s.purchases[0],quantity:200,total:20000,inventoryMode:'chainLot',lotCode:'LOT-A',unitCount:50};s.cashShiftLog={shiftId:'CLOSED',status:'Cerrado',closingCash:123};
 const api=memoryApi(s,{chainLotsEnabled:true}),cookie=await api.login(),before=api.state;
 const r=await api.request('operation',{type:'editPurchase',operationId:crypto.randomUUID(),baseUpdatedAt:before.updatedAt,args:{purchaseId:'PO1',productName:'Corrected lot name',reason:'Spelling only'}},cookie);assert.equal(r.statusCode,200,r.body.error);
 assert.equal(api.state.products[0].name,'Corrected lot name');assert.deepEqual({...api.state.products[0],name:before.products[0].name},before.products[0]);assert.deepEqual(api.state.cashShiftLog,before.cashShiftLog);assert.deepEqual(api.state.supplierCredits,before.supplierCredits);
});
test('the purchase form actually sends the edited name to the server',async()=>{
 const h=fixture(),api=await connectOperations(h);h.inputs({'edit-po-id':'PO1','edit-po-date':'2026-11-25','edit-po-supplier':'Supplier','edit-po-product-sku':'001','edit-po-product-name':'Name from purchase form','edit-po-qty':1,'edit-po-unit-cost':100,'edit-po-total':100,'edit-po-paid':0,'edit-po-reason':'Correct spelling'});
 await h.app.runMutation(()=>h.app.saveEditedPurchaseOrder({preventDefault(){}}));assert.equal(api.state.purchases[0].productName,'Name from purchase form',JSON.stringify(h.app.events));assert.equal(api.state.products[0].name,'Name from purchase form');
});
test('a retry with the same operation ID does not duplicate the rename audit',async()=>{
 const api=memoryApi(fixture().seed),cookie=await api.login(),body={type:'editPurchase',operationId:crypto.randomUUID(),baseUpdatedAt:api.state.updatedAt,args:{purchaseId:'PO1',productName:'Idempotent name',reason:'Test'}};assert.equal((await api.request('operation',body,cookie)).statusCode,200);const state=api.state,r=await api.request('operation',body,cookie);assert.equal(r.statusCode,200);assert.equal(r.body.alreadyApplied,true);assert.deepEqual(api.state,state);
});

test('name-only correction preserves fractional acquisition cost and six-decimal grams exactly',()=>{
 const s=fixture().seed;Object.assign(s.purchases[0],{quantity:6.123456,unitCost:100.1234,total:612.47,paidAmount:100.23});const before=clone(s.purchases[0]);
 const {state:after,audit}=executeOperation(s,{type:'editPurchase',operationId:crypto.randomUUID(),args:{purchaseId:'PO1',productName:'Precise name',quantity:before.quantity,unitCost:before.unitCost,total:before.total,paidAmount:before.paidAmount,reason:'Test'}},s.users[0]);
 assert.equal(audit.metadataOnly,true);for(const key of ['quantity','unitCost','total','paidAmount'])assert.equal(after.purchases[0][key],before[key]);
});
