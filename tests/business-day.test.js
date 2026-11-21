'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {browserHarness,memoryApi,product,clone}=require('./helpers');
const {publicState}=require('../lib/state-api');

async function connectedDay() {
  const h=browserHarness();
  h.seed.products=[product({stock:20}),product({id:'P2',sku:'002',measureType:'Unidades',weightUnit:'u.',unit:'u.',stock:5,pieceWeight:2,weight:2,cost:100,price:400})];
  h.seed.customers=[{id:'C1',name:'Customer',creditBalance:0,creditLimit:100000,allowedPaymentMethods:['Efectivo','Tarjeta','Transferencia','Pago Mixto','Crédito','Plan Separe']}];
  h.seed.suppliers=[{id:'S1',name:'Supplier',creditBalance:0,status:'Active'}];
  const api=memoryApi(h.seed);let session=await api.login();
  h.app.data=publicState(api.state);h.app._confirmedData=clone(h.app.data);
  h.app.savePersistence=h.App.prototype.savePersistence;
  h.context.fetch=async(url,options={})=>{
    const name=url==='/api/data'?(options.method==='POST'?'post':'get'):url==='/api/auth/session'?'session':null;
    if(!name)throw new Error('Unexpected route in isolated business-day test');
    const r=await api.request(name,options.body?JSON.parse(options.body):{},session);
    if(r.cookie)session=r.cookie;
    return {ok:r.statusCode===200,status:r.statusCode,json:async()=>r.body};
  };
  return {...h,api};
}

test('complete isolated business day: all payment channels, credit, separe, purchasing, abonos, close and reopen',async()=>{
  const h=await connectedDay(),{app,inputs,api}=h;
  inputs({'open-cash-base-input':1000});await app.runMutation(()=>app.submitCashShiftOpen());
  assert.equal(api.state.cashShiftLog.status,'Abierto');
  const shiftId=api.state.cashShiftLog.shiftId;
  for(const method of ['cash','transfer','card','mixed','credit','separe']){
    const p=app.data.products.find(p=>p.id==='P1');app.cart=[{product:p,qty:1,customPrice:200}];app.selectedPayMethod=method;app.currentMixedCombo='cash_transfer';
    inputs({'checkout-customer-select':method==='credit'||method==='separe'?'Customer':'Cliente Mostrador','cash-received-input':200,'checkout-transfer-account-select':'Cuenta Carlos','checkout-card-account-select':'Cuenta Sharick','mixed-amount-1':100,'mixed-amount-2':100,'mixed-account-select-2':'Cuenta Carlos','separe-abono-input':50});
    await app.runMutation(()=>app.processPaymentSuccess());
    assert.ok(!app._requiresRefresh,`save ${method}: ${JSON.stringify(app.events)}`);
  }
  assert.equal(api.state.recentTransactions.length,6);assert.equal(api.state.products[0].stock,14);
  assert.equal(api.state.customers[0].creditBalance,350);
  const unit=app.data.products.find(p=>p.id==='P2');app.cart=[{product:unit,qty:2,customPrice:200}];app.selectedPayMethod='cash';
  inputs({'checkout-customer-select':'Cliente Mostrador','cash-received-input':400});await app.runMutation(()=>app.processPaymentSuccess());
  assert.equal(api.state.products.find(p=>p.id==='P2').stock,4);
  assert.equal(api.state.recentTransactions[0].items[0].cogsTotal,200);
  const credit=app.data.customerCredits.find(c=>c.id.startsWith('CC-'));
  inputs({'abono-credit-type':'customer','abono-credit-id':credit.id,'abono-amount-input':100,'abono-method-select':'Efectivo'});
  await app.runMutation(()=>app.submitAbono());assert.equal(api.state.customers[0].creditBalance,250);
  const purchase=h.bindForm('add-purchase-form',{'po-product-name':'Audit jewelry','po-product-sku':'001','po-product-id':'P1','po-category-select':'oro18k','po-measure-type':'Pesaje','po-quantity':2,'po-unit-cost':300,'po-payment-status':'Pendiente','po-supp-select':'Supplier'});
  await purchase();assert.equal(api.state.purchases.length,1);assert.equal(api.state.products[0].stock,16);assert.equal(api.state.suppliers[0].creditBalance,600);
  const cp=app.data.supplierCredits.find(c=>c.pendingAmount>0);
  inputs({'abono-credit-type':'supplier','abono-credit-id':cp.id,'abono-amount-input':100,'abono-method-select':'Efectivo'});
  await app.runMutation(()=>app.submitAbono());assert.equal(api.state.suppliers[0].creditBalance,500);assert.equal(api.state.purchases[0].paidAmount,100);
  const totals=app.calculateShiftTotals();
  assert.equal(totals.expectedCashInDrawer,1750);assert.equal(totals.totalTransferencia,300);assert.equal(totals.totalTarjeta,200);
  inputs({'cash-physical-counted':1750});await app.runMutation(()=>app.finalizeCashClose());
  assert.equal(api.state.cashShiftLog.status,'Cerrado');assert.equal(api.state.cashShiftsHistory[0].difference,0);
  assert.equal(api.state.cashShiftsHistory[0].shiftId,shiftId);
  await app.loadPersistence();assert.equal(app.data.products[0].stock,16);assert.equal(app.data.abonosVentas.length,1);assert.equal(app.data.abonosCompras.length,1);
  inputs({'open-cash-base-input':1750});await app.runMutation(()=>app.submitCashShiftOpen());
  assert.notEqual(app.data.cashShiftLog.shiftId,shiftId);assert.equal(app.calculateShiftTotals().totalSales,0);assert.equal(app.calculateShiftTotals().cashExpenses,0);
});

test('cashier can complete a sale through server authorization without changing users',async()=>{
  const h=browserHarness(),api=memoryApi({...h.seed,products:[product()],cashShiftLog:{shiftId:'AUDIT',status:'Abierto',openingCash:0}});
  const session=await api.login('cashier');const data=(await api.request('get',{},session)).body;
  const app=h.app;app.data=data;app.currentUser=data.users.find(u=>u.role==='Cajero');app._confirmedData=clone(data);app.savePersistence=h.App.prototype.savePersistence;
  h.context.fetch=async(_,options)=>{const r=await api.request('post',JSON.parse(options.body),session);return {ok:r.statusCode===200,status:r.statusCode,json:async()=>r.body};};
  app.cart=[{product:app.data.products[0],qty:1,customPrice:200}];app.selectedPayMethod='cash';h.inputs({'cash-received-input':200});
  await app.runMutation(()=>app.processPaymentSuccess());assert.equal(api.state.products[0].stock,9);assert.equal(api.state.recentTransactions.length,1);assert.equal(api.state.users[1].role,'Cajero');
});
