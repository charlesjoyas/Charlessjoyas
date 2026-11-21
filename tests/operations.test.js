'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const safety = require('../js/safety');
const { browserHarness, memoryApi, product, clone } = require('./helpers');

test('weighted replenishment preserves the value of old inventory', () => {
  assert.deepEqual(safety.replenishment(product(),10,300,0),{stock:20,cost:200});
});
test('replenishment preserves three decimal grams and converts kg/mg/oz cost correctly', () => {
  assert.deepEqual(safety.replenishment(product({stock:0,cost:400000}),.125,400000,0),{stock:.125,cost:400000});
  assert.deepEqual(safety.replenishment(product({stock:1,weightUnit:'kg',cost:100000}),1000,300,0),{stock:2,cost:200000});
  assert.equal(safety.replenishment(product({stock:1000,weightUnit:'mg',cost:.001}),1,3,0).cost,.002);
});
test('differently weighted pieces cannot revalue existing pieces', () => {
  assert.throws(()=>safety.replenishment(product({measureType:'Unidades',stock:2,pieceWeight:2}),1,100,3),/otro SKU/);
});
test('reversal converts historical grams to current kilograms', () => {
  assert.equal(safety.restoreQuantity({qty:100,unit:'g',measureType:'Pesaje'},product({weightUnit:'kg'})),.1);
});
test('new sale cost is immutable, including legitimate zero cost', () => {
  const {app}=browserHarness();app.data.products=[product({cost:300})];
  assert.equal(app.calculateTransactionItemCOGS({id:'P1',qty:2,cost:100,measureType:'Pesaje'}),200);
  assert.equal(app.calculateTransactionItemCOGS({id:'P1',qty:2,cost:0,measureType:'Pesaje'}),0);
  assert.equal(app.calculateTransactionItemCOGS({id:'P1',qty:2,cost:100,cogsTotal:200}),200);
});
test('legacy missing cost is explicitly distinguishable from a historical cost', () => {
  assert.equal(safety.historicalCost({qty:2}),null);
});
test('validation that returns early cannot leave hidden pending edits', async () => {
  const {app}=browserHarness();const before=clone(app.data);
  await app.runMutation(async()=>{app.data.store.name='not saved';return false;});
  assert.deepEqual(clone(app.data),before);
});
test('customer deletion cannot erase an outstanding balance', async () => {
  const {app}=browserHarness();app.data.customers=[{id:'C1',name:'Customer',creditBalance:100}];app.data.customerCredits=[{id:'CC-001',customer:'Customer',currentBalance:100}];
  const before=clone(app.data);await app.deleteCustomer('C1');assert.deepEqual(app.data,before);
});
test('unsafe purchase/debt operations leave every record unchanged', async () => {
  for (const name of ['deletePurchaseOrder','deleteAbonoCompra','deleteSupplierCredit','saveEditedPurchaseOrder','saveEditedSupplierCredit']) {
    const {app}=browserHarness();app.data.products=[product()];app.data.suppliers=[{id:'S1',name:'Supplier',creditBalance:96357320}];
    const before=clone(app.data);await app[name](name.startsWith('save')?{preventDefault(){}}:'OC-001');
    assert.deepEqual(app.data,before);assert.ok(app.events.length>0);
  }
});
test('missing original SKU cannot return stock to a namesake', async () => {
  const {app}=browserHarness();app.data.products=[product({id:'OTHER',sku:'848',stock:1})];
  app.data.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:0};
  app.data.recentTransactions=[{id:'TX-011',shiftId:'AUDIT',paymentMethod:'Efectivo',status:'completed',total:100,items:[{id:'DELETED',sku:'856',name:'Audit jewelry',qty:1}]}];
  await app.revertSale('TX-011');assert.equal(app.data.products[0].stock,1);assert.equal(app.data.recentTransactions[0].status,'completed');
});
test('prior-shift and credit reversals are blocked without changing balances', async () => {
  for(const tx of [{shiftId:'OLD',paymentMethod:'Efectivo'},{shiftId:'AUDIT',paymentMethod:'Crédito'},{shiftId:'AUDIT',paymentMethod:'Plan Separe'}]) {
    const {app}=browserHarness();app.data.cashShiftLog={status:'Abierto',shiftId:'AUDIT'};app.data.products=[product()];
    app.data.recentTransactions=[{id:'T1',total:100,items:[{id:'P1',sku:'001',qty:1}],status:'completed',...tx}];
    const before=clone(app.data);await app.revertSale('T1');assert.deepEqual(app.data,before);
  }
});
test('same-shift cash reversal restores the exact product and cash', async () => {
  const {app}=browserHarness();app.data.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:100};app.data.products=[product({stock:9})];
  app.data.recentTransactions=[{id:'T1',shiftId:'AUDIT',date:'20/11/2026',total:200,paymentMethod:'Efectivo',status:'completed',items:[{id:'P1',sku:'001',qty:1,unit:'g',measureType:'Pesaje',pieceWeight:0}]}];
  assert.equal(app.calculateShiftTotals().expectedCashInDrawer,300);
  await app.revertSale('T1');assert.equal(app.data.products[0].stock,10);assert.equal(app.data.recentTransactions[0].status,'Reversada');assert.equal(app.calculateShiftTotals().expectedCashInDrawer,100);
});
test('empty role permissions remain empty after sanitation', () => {
  const {app}=browserHarness();app.data.perfiles=[{id:'PRF-03',name:'Cajero',allowedModules:[]}];app.sanitizeLoadedData();
  assert.deepEqual(Array.from(app.data.perfiles.find(p=>p.id==='PRF-03').allowedModules),[]);
});
test('opening a second shift cannot erase the active shift', async () => {
  const {app}=browserHarness();const before={shiftId:'AUDIT',status:'Abierto',openingCash:100};app.data.cashShiftLog=clone(before);
  await app.submitCashShiftOpen();assert.deepEqual(app.data.cashShiftLog,before);
});

function prepareSale(h,payment='cash') {
  const {app,inputs}=h;app.data.products=[product()];app.data.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:1000};
  app.cart=[{product:app.data.products[0],qty:1,customPrice:200}];app.selectedPayMethod=payment;
  inputs({'cash-received-input':200,'checkout-customer-select':'Cliente Mostrador'});
}
test('server rejection rolls back stock, preserves cart, and never shows sale success', async () => {
  const h=browserHarness();prepareSale(h);const {app,context,App}=h;app._confirmedData=clone(app.data);app.savePersistence=App.prototype.savePersistence;
  context.fetch=async()=>({ok:false,status:503,json:async()=>({error:'Simulated outage'})});
  await app.runMutation(()=>app.processPaymentSuccess());
  assert.equal(app.data.products[0].stock,10);assert.equal(app.data.recentTransactions.length,0);assert.equal(app.cart.length,1);assert.equal(app._requiresRefresh,true);
  assert.ok(!app.events.some(([m])=>m.includes('completada y guardada')));
});
test('sale confirmed by the API persists one transaction and its historical cost', async () => {
  const h=browserHarness();prepareSale(h);const {app,context,App,seed}=h;seed.products=clone(app.data.products);seed.cashShiftLog=clone(app.data.cashShiftLog);
  const api=memoryApi(seed),session=await api.login();app.savePersistence=App.prototype.savePersistence;
  context.fetch=async(url,options)=>{const r=await api.request('post',JSON.parse(options.body),session);return {ok:r.statusCode===200,status:r.statusCode,json:async()=>r.body};};
  await app.runMutation(()=>app.processPaymentSuccess());
  assert.equal(api.state.products[0].stock,9);assert.equal(api.state.recentTransactions.length,1);assert.equal(api.state.recentTransactions[0].items[0].cogsTotal,100);assert.equal(app.cart.length,0);
});
test('a settled separe is never reused for a new credit sale', async () => {
  const h=browserHarness();prepareSale(h,'credit');const {app,inputs}=h;
  app.data.customers=[{id:'C1',name:'Customer',creditBalance:0,creditLimit:1000,allowedPaymentMethods:['Crédito']}];
  app.data.customerCredits=[{id:'SEP-001',txId:'SEP-SALE',customer:'Customer',totalGranted:100,currentBalance:0,status:'Saldado'}];
  inputs({'checkout-customer-select':'Customer'});await app.processPaymentSuccess();
  assert.equal(app.data.customerCredits.length,2);assert.equal(app.data.customerCredits.find(c=>c.id==='SEP-001').currentBalance,0);assert.equal(app.data.customers[0].creditBalance,200);
});
test('remote account-only changes are applied even when sales totals are identical', async () => {
  const {app,context}=browserHarness();app.data.recentTransactions=[{id:'T1',total:100,status:'completed',targetAccount:'Cuenta Carlos'}];
  const remote=clone(app.data);remote.updatedAt='2026-11-20T01:00:00.000Z';remote.recentTransactions[0].targetAccount='Cuenta Sharick';
  context.fetch=async()=>({ok:true,json:async()=>remote});await app.syncRemoteDataIfChanged();
  assert.equal(app.data.recentTransactions[0].targetAccount,'Cuenta Sharick');
});
test('actual purchase form uses weighted costs and three decimal grams', async () => {
  for (const [startingStock,quantity,cost,expectedStock,expectedCost] of [[10,10,300,20,200],[0,.125,400000,.125,400000]]) {
    const h=browserHarness();const {app}=h;app.data.products=[product({stock:startingStock})];app.data.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:100000};
    const submit=h.bindForm('add-purchase-form',{'po-product-name':'Audit jewelry','po-product-sku':'001','po-product-id':'P1','po-category-select':'oro18k','po-measure-type':'Pesaje','po-quantity':quantity,'po-unit-cost':cost,'po-payment-status':'Pagado Total','po-payment-method':'Efectivo'});
    await submit();assert.equal(app.data.products[0].stock,expectedStock);assert.equal(app.data.products[0].cost,expectedCost);
    if(quantity===.125)assert.equal(app.data.purchases[0].total,50000);
  }
});
