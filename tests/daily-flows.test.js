'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {browserHarness,connectOperations,product,clone}=require('./helpers');
function checkout(h,method='cash'){
  h.app.data.products=[product()];h.app.data.cashShiftLog={status:'Abierto',shiftId:'DAILY',openingCash:1000};
  h.app.cart=[{product:h.app.data.products[0],qty:1,customPrice:200}];h.app.selectedPayMethod=method;
  h.inputs({'cash-received-input':200,'checkout-customer-select':'Cliente Mostrador'});
}
test('a full initial separe payment completes with zero debt and a settled linked record',async()=>{
  const h=browserHarness();checkout(h,'separe');h.app.data.customers=[{id:'C1',name:'Customer',creditBalance:0,creditLimit:1000,allowedPaymentMethods:['Plan Separe']}];h.inputs({'checkout-customer-select':'Customer','separe-abono-input':200});
  const api=await connectOperations(h);await h.app.runMutation(()=>h.app.processPaymentSuccess());
  assert.equal(api.state.recentTransactions.length,1,JSON.stringify(h.app.events));assert.equal(api.state.customers[0].creditBalance,0);assert.equal(api.state.customerCredits[0].currentBalance,0);assert.equal(api.state.customerCredits[0].status,'Saldado');assert.equal(h.app.calculateShiftTotals().expectedCashInDrawer,1200);
});
test('mixed-payment differences are rejected before any inventory mutation or save',async()=>{
  const h=browserHarness();checkout(h,'mixed');h.app.currentMixedCombo='cash_transfer';h.inputs({'mixed-amount-1':100,'mixed-amount-2':99.5,'mixed-account-select-2':'Cuenta Carlos'});
  const before=clone(h.app.data);await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.deepEqual(clone(h.app.data),before);assert.equal(h.app.cart.length,1);assert.ok(h.app.events.some(([text])=>text.includes('no coincide')));
});
test('a definite validation rejection keeps the cart and permits correction without reloading',async()=>{
  const h=browserHarness();checkout(h);const api=await connectOperations(h),connectedFetch=h.context.fetch;
  h.context.fetch=async()=>({ok:false,status:422,json:async()=>({error:'Correct this field'})});const before=clone(h.app.data);
  await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.deepEqual(clone(h.app.data),before);assert.equal(h.app.cart.length,1);assert.ok(!h.app._requiresRefresh);assert.equal(h.storage.has('nexus_pos_pending_operation'),false);
  h.context.fetch=connectedFetch;await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.equal(api.state.recentTransactions.length,1);assert.equal(api.state.products[0].stock,9);assert.equal(h.app.cart.length,0);
});
test('unavailable browser storage does not prevent an acknowledged financial operation or reload',async()=>{
  const h=browserHarness();h.app.data.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];h.app.data.products=[product()];const api=await connectOperations(h);
  for(const key of ['getItem','setItem','removeItem'])h.context.localStorage[key]=()=>{throw new Error('Storage blocked/full');};
  await h.app.executeFinancialOperation('createPurchase',{supplier:'Supplier',sku:'001',productId:'P1',category:'oro18k',measureType:'Pesaje',quantity:1,unitCost:100,paid:false,reason:'Isolated daily test'});
  assert.equal(api.state.purchases.length,1);await h.app.loadPersistence();assert.equal(h.app.data.purchases.length,1);assert.ok(!h.app._requiresRefresh);
});
test('money masks accept Colombian thousands without changing gram decimals',()=>{
  const {app}=browserHarness();assert.equal(app.formatNumberWithCommas('50.000'),'50,000');assert.equal(app.formatNumberWithCommas('1.250.000'),'1,250,000');assert.equal(app.formatNumberWithCommas('$ 50.000'),'50,000');assert.equal(app.formatNumberWithCommas('1.234',true),'1.234');assert.equal(app.formatNumberWithCommas('0,125',true),'0.125');
});
test('a near-zero sale is rejected locally before a zero-peso transaction is created',async()=>{
  const h=browserHarness();checkout(h);h.app.cart[0].customPrice=.1;const before=clone(h.app.data);await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.deepEqual(clone(h.app.data),before);assert.equal(h.app.cart.length,1);
});
test('fractional sale lines add up exactly to the displayed and saved total',async()=>{
  const h=browserHarness();checkout(h);h.app.data.products=[product({price:1,cost:1}),product({id:'P2',sku:'002',price:1,cost:1})];h.app.cart=h.app.data.products.map(p=>({product:p,qty:.5,customPrice:1}));h.inputs({'cash-received-input':2});
  const api=await connectOperations(h);await h.app.runMutation(()=>h.app.processPaymentSuccess());const tx=api.state.recentTransactions[0];assert.ok(tx,JSON.stringify(h.app.events));assert.equal(tx.subtotal,tx.items.reduce((sum,i)=>sum+i.total,0));assert.equal(tx.total,2);
});
test('receipt reprints retain original cash, change and customer identity after directory edits',async()=>{
  const h=browserHarness();checkout(h);h.app.data.customers=[{id:'C1',name:'Customer',document:'ORIGINAL-DOC',docType:'CE',address:'Original address',phone:'Original phone',creditBalance:0,allowedPaymentMethods:['Efectivo']}];h.inputs({'cash-received-input':500,'checkout-customer-select':'Customer'});
  const api=await connectOperations(h);await h.app.runMutation(()=>h.app.processPaymentSuccess());const tx=api.state.recentTransactions[0];assert.ok(tx);assert.equal(tx.receivedAmount,500);assert.equal(tx.changeAmount,300);
  Object.assign(h.app.data.customers[0],{document:'CHANGED-DOC',docType:'CC',address:'Changed address',phone:'Changed phone'});h.inputs({'receipt-modal-body':''});let receipt;h.app.buildThermalTicketHtml=options=>(receipt=options,'test receipt');h.app.showPastReceiptModal(tx.id);
  assert.equal(receipt.paidAmount,500);assert.equal(receipt.changeAmount,300);assert.equal(receipt.partyDocument,'ORIGINAL-DOC');assert.equal(receipt.partyDocType,'CE');assert.equal(receipt.partyAddress,'Original address');assert.equal(receipt.partyPhone,'Original phone');
});
test('sale numbering can continue after every number in the previous random range has been used',async()=>{
  const h=browserHarness();checkout(h);h.app.data.recentTransactions=Array.from({length:10000},(_,i)=>({id:`TX-${89000+i}`,status:'completed',total:1,items:[],shiftId:'OLD'}));await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.equal(h.app.data.recentTransactions[0].id,'TX-99000');assert.equal(h.app.data.products[0].stock,9);
});
test('an uncertain command stays blocked in memory even if browser storage is unavailable',async()=>{
  const h=browserHarness();for(const key of ['getItem','setItem','removeItem'])h.context.localStorage[key]=()=>{throw new Error('Storage blocked/full');};let requests=0;
  h.context.fetch=async()=>{requests++;return {ok:false,status:503,json:async()=>({error:'No acknowledgement'})};};
  await assert.rejects(()=>h.app.executeFinancialOperation('customerPayment',{creditId:'CC-1',amount:100,reason:'Test'}),/No acknowledgement/);const pending=h.app.getPendingFinancialCommand();assert.ok(pending.operationId);assert.equal(h.app._requiresRefresh,true);
  await assert.rejects(()=>h.app.executeFinancialOperation('customerPayment',{creditId:'CC-1',amount:200,reason:'Other'}),/pendiente/);assert.equal(requests,1);assert.equal(h.app.getPendingFinancialCommand().operationId,pending.operationId);
});
