'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {browserHarness,product,clone,memoryApi}=require('./helpers');
const {executeOperation}=require('../lib/operations');
const {coreValidation,finalizeState}=require('../lib/financial-validation');
const L=require('../js/ledger');
function fixture(){const {seed}=browserHarness();seed.products=[product()];seed.customers=[{id:'C1',name:'Customer',creditBalance:0,creditLimit:10000,allowedPaymentMethods:['Efectivo','Crédito','Plan Separe','Transferencia']}];seed.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];seed.cashShiftLog={shiftId:'CURRENT',status:'Abierto',openingCash:10000,openedTimestamp:1795200000000,openedDate:'2026-11-20'};seed.accountAdjustments=[];return seed;}
let seq=0;
const run=(state,type,args={})=>{const result=executeOperation(state,{operationId:`test-operation-${++seq}`,type,args:{reason:'Verified test evidence',...args}},state.users[0],1795220000000+seq);coreValidation(result.state,state);return finalizeState(result.state);};
const purchase=(s,quantity=1,cost=100,paid=false)=>run(s,'createPurchase',{supplier:'Supplier',category:'oro18k',sku:'001',productId:'P1',name:'Audit jewelry',measureType:'Pesaje',quantity,unitCost:cost,paid,method:'Efectivo',targetAccount:'Caja Mostrador (Efectivo)'});
test('purchase command records exact before/after inventory, debt and allocated payment',()=>{
  const s=purchase(fixture(),2,300,true),po=s.purchases[0],payment=s.abonosCompras[0];
  assert.equal(s.products[0].stock,12);assert.equal(s.products[0].cost,133.3333);assert.equal(po.inventoryBefore.stock,10);assert.equal(po.paidAmount,600);assert.equal(po.directPaidAmount,0);assert.equal(payment.allocations[0].purchaseId,po.id);assert.equal(s.suppliers[0].creditBalance,0);assert.equal(L.shiftTotals(s).expectedCashInDrawer,9400);
});
test('reverse untouched purchase restores weighted inventory and refunds once',()=>{
  let s=purchase(fixture(),2,300,true);const id=s.purchases[0].id;
  s=run(s,'reversePurchase',{purchaseId:id});assert.equal(s.products[0].stock,10);assert.equal(s.products[0].cost,100);assert.equal(s.purchases[0].status,'Reversada');assert.equal(s.abonosCompras[0].amount,0);assert.equal(s.suppliers[0].creditBalance,0);assert.equal(L.shiftTotals(s).expectedCashInDrawer,10000);assert.equal(s.financialLedger.at(-1).profitAdjustment,0);
});
test('a purchase cannot remove stock already sold',()=>{
  let s=purchase(fixture(),2,300);s.products[0].stock=1;const original=clone(s);
  assert.throws(()=>run(s,'reversePurchase',{purchaseId:s.purchases[0].id,inventoryPolicy:'carrying'}),/existencias/);assert.deepEqual(s,original);
});
test('one payment across purchases is refunded only for the reversed invoice',()=>{
  let s=purchase(fixture(),1,100);const first=s.purchases[0].id;s=purchase(s,2,100);const second=s.purchases[0].id,credit=s.supplierCredits[0].id;
  s=run(s,'supplierPayment',{creditId:credit,amount:150,method:'Efectivo'});assert.equal(s.abonosCompras[0].allocations.length,2);
  s=run(s,'reversePurchase',{purchaseId:first,inventoryPolicy:'carrying'});assert.equal(s.abonosCompras[0].amount,50);assert.equal(s.suppliers[0].creditBalance,150);assert.equal(s.purchases.find(p=>p.id===second).paidAmount,50);assert.equal(L.shiftTotals(s).expectedCashInDrawer,9950);
  s=run(s,'voidSupplierPayment',{paymentId:s.abonosCompras[0].id});assert.equal(s.suppliers[0].creditBalance,200);assert.equal(L.shiftTotals(s).expectedCashInDrawer,10000);
});
test('voiding a prior-shift payment returns money in the current shift without rewriting closure',()=>{
  let s=purchase(fixture(),1,100,true);const oldShift={id:'CLOSE-1',shiftId:'CURRENT',status:'Cerrado',closingCash:9900,cashExpenses:100};s.cashShiftsHistory=[clone(oldShift)];s.cashShiftLog={shiftId:'NEW',status:'Abierto',openingCash:9900};
  s=run(s,'voidSupplierPayment',{paymentId:s.abonosCompras[0].id});assert.equal(L.shiftTotals(s).expectedCashInDrawer,10000);assert.deepEqual(s.cashShiftsHistory[0],oldShift);assert.equal(s.suppliers[0].creditBalance,100);assert.equal(s.purchases[0].paidAmount,0);
});
test('edit purchase applies only its delta and never recalculates opening supplier debt',()=>{
  const s=fixture();s.suppliers[0].creditBalance=96357320;s.supplierCredits=[{id:'CP-OLD',supplier:'Supplier',supplierId:'S1',totalOwed:96357320,paidAmount:0,pendingAmount:96357320,purchaseOrderIds:[],status:'Pendiente'}];s.purchases=[{id:'OC-001',productId:'P1',productSku:'001',supplier:'Supplier',quantity:1,totalGrams:1,unitCost:100,total:100,paidAmount:100,paymentStatus:'Pagado Total',paymentMethod:'Efectivo',status:'Recibido',date:'2026-11-20'}];
  const result=run(s,'editPurchase',{purchaseId:'OC-001',quantity:1,unitCost:100,total:100,paidAmount:100,date:'2026-11-19'});assert.equal(result.suppliers[0].creditBalance,96357320);assert.equal(result.supplierCredits[0].pendingAmount,96357320);
});
test('editing paid amount requires exact refunds and preserves payment history',()=>{
  let s=purchase(fixture(),2,100,true),po=s.purchases[0].id,receipt=s.abonosCompras[0].id;
  assert.throws(()=>run(s,'editPurchase',{purchaseId:po,paidAmount:100}),/abonos específicos/);
  s=run(s,'editPurchase',{purchaseId:po,paidAmount:100,refundAllocations:[{paymentId:receipt,amount:100}]});
  assert.equal(s.purchases[0].paidAmount,100);assert.equal(s.abonosCompras[0].originalAmount,200);assert.equal(s.abonosCompras[0].amount,100);assert.equal(s.suppliers[0].creditBalance,100);assert.equal(L.shiftTotals(s).expectedCashInDrawer,9900);
});
test('debt adjustment changes obligations without creating bank or cash payments',()=>{
  let s=purchase(fixture(),1,100);const before=L.accounts(s);s=run(s,'adjustSupplierDebt',{creditId:s.supplierCredits[0].id,pendingAmount:0});
  assert.equal(s.suppliers[0].creditBalance,0);assert.equal(s.purchases[0].paidAmount,0);assert.equal(s.purchases[0].creditAdjustment,100);assert.equal(s.abonosCompras.length,0);assert.deepEqual(L.accounts(s),before);
});
function creditSales(s){s.products[0].stock=8;s.customers[0].creditBalance=200;s.customerCredits=[{id:'CC-1',customer:'Customer',totalGranted:200,currentBalance:200,txId:'T1',mergedTxIds:['T1','T2'],status:'Al Día'}];s.recentTransactions=['T1','T2'].map((id,i)=>({id,customer:'Customer',shiftId:'OLD',date:'19/11/2026',timestamp:1795130000000+i,total:100,paymentMethod:'Crédito',status:'completed',items:[{id:'P1',sku:'001',qty:1,measureType:'Pesaje',unit:'g',cost:100,cogsTotal:100}]}));return s;}
test('credit payments are allocated FIFO and refund never exceeds the reversed invoice',()=>{
  let s=creditSales(fixture());s=run(s,'customerPayment',{creditId:'CC-1',amount:150,method:'Efectivo'});assert.deepEqual(s.abonosVentas[0].allocations.map(a=>a.amount),[100,50]);
  s=run(s,'reverseSale',{saleId:'T1'});assert.equal(s.customers[0].creditBalance,50);assert.equal(s.customerCredits[0].currentBalance,50);assert.equal(s.abonosVentas[0].amount,50);assert.equal(s.products[0].stock,9);assert.equal(L.shiftTotals(s).expectedCashInDrawer,10050);
});
test('ambiguous legacy allocations stop reversal without changing data',()=>{
  const s=creditSales(fixture());s.customerCredits[0].currentBalance=50;s.customers[0].creditBalance=50;s.abonosVentas=[{id:'AB-OLD',creditId:'CC-1',invoiceId:'T1',customer:'Customer',amount:150,method:'Efectivo'}];const before=clone(s);
  assert.throws(()=>run(s,'reverseSale',{saleId:'T1'}),/distribución comprobada/);assert.deepEqual(s,before);
});
test('reconciliation links explicit evidence without changing balances',()=>{
  let s=creditSales(fixture());s.customerCredits[0].currentBalance=50;s.customers[0].creditBalance=50;s.abonosVentas=[{id:'AB-OLD',creditId:'CC-1',invoiceId:'T1',customer:'Customer',amount:150,method:'Efectivo'}];
  s=run(s,'reconcileCustomerPayment',{paymentId:'AB-OLD',allocations:[{invoiceId:'T1',creditId:'CC-1',amount:100},{invoiceId:'T2',creditId:'CC-1',amount:50}]});assert.equal(s.customers[0].creditBalance,50);s=run(s,'reverseSale',{saleId:'T1'});assert.equal(s.abonosVentas[0].amount,50);assert.equal(s.customers[0].creditBalance,50);
});
test('server operations are idempotent even if acknowledgement was lost',async()=>{
  const api=memoryApi(fixture()),cookie=await api.login();const command={type:'createPurchase',operationId:'idempotent-purchase-1',baseUpdatedAt:api.state.updatedAt,args:{supplier:'Supplier',category:'oro18k',sku:'001',productId:'P1',measureType:'Pesaje',quantity:1,unitCost:100,paid:true,method:'Efectivo',reason:'Verified receipt'}};
  const first=await api.request('operation',command,cookie);assert.equal(first.statusCode,200,first.body.error);const second=await api.request('operation',command,cookie);assert.equal(second.statusCode,200);assert.equal(second.body.alreadyApplied,true);assert.equal(api.state.purchases.length,1);assert.equal(api.state.abonosCompras.length,1);assert.equal(api.state.products[0].stock,11);
});


test('expense corrections refund the original account and charge the replacement without changing old closures',()=>{
  const s=fixture();s.expenses=[{id:'EXP-OLD',amount:100,method:'Efectivo',targetAccount:'Caja Mostrador (Efectivo)',shiftId:'OLD',description:'Supplies'}];s.cashShiftsHistory=[{id:'CLOSE',shiftId:'OLD',cashExpenses:100,closingCash:9900}];const closed=clone(s.cashShiftsHistory);
  const r=run(s,'editExpense',{expenseId:'EXP-OLD',amount:150,method:'Transferencia',targetAccount:'Cuenta Carlos',description:'Corrected supplies',category:'Otros'});
  assert.deepEqual(r.cashShiftsHistory,closed);assert.equal(r.expenses.find(e=>e.id==='EXP-OLD').status,'Anulado');assert.equal(L.shiftTotals(r).expectedCashInDrawer,10100);assert.equal(L.shiftTotals(r).expectedCardInAccount,-150);
  const done=run(r,'voidExpense',{expenseId:r.expenses[0].id});assert.equal(L.shiftTotals(done).expectedCardInAccount,0);assert.throws(()=>run(done,'voidExpense',{expenseId:r.expenses[0].id}),/ya está anulado/);
});

test('reversing a transfer restores both accounts once and preserves the original two legs',()=>{
  const s=fixture();s.accountAdjustments=[{id:'LEG1',linkedTransferId:'PAIR',amount:100,isIncome:false,accountKey:'cuenta_carlos',shiftId:'CURRENT'},{id:'LEG2',linkedTransferId:'PAIR',amount:100,isIncome:true,accountKey:'cuenta_sharick',shiftId:'CURRENT'}];
  const r=run(s,'reverseAccountAdjustment',{adjustmentId:'LEG1'});assert.equal(r.accountAdjustments.length,4);assert.equal(L.accounts(r).cuenta_carlos.balance,0);assert.equal(L.accounts(r).cuenta_sharick.balance,0);assert.throws(()=>run(r,'reverseAccountAdjustment',{adjustmentId:'LEG2'}),/ya fue reversado/);
});

test('the total allocations across different receipts cannot exceed one invoice',()=>{
  const s=creditSales(fixture());s.customerCredits[0].currentBalance=0;s.customers[0].creditBalance=0;s.abonosVentas=[{id:'A1',customer:'Customer',creditId:'CC-1',amount:100,allocations:[{creditId:'CC-1',invoiceId:'T1',amount:100}]},{id:'A2',customer:'Customer',creditId:'CC-1',amount:100}];
  assert.throws(()=>run(s,'reconcileCustomerPayment',{paymentId:'A2',allocations:[{creditId:'CC-1',invoiceId:'T1',amount:100}]}),/no coincide/);assert.equal(s.abonosVentas[1].allocations,undefined);
});

test('piece inventory valuation uses grams per piece when purchase cost changes',()=>{
  const s=fixture();s.products=[product({measureType:'Unidades',pieceWeight:2,weight:2,weightUnit:'u.',stock:10,cost:100})];
  let r=run(s,'createPurchase',{supplier:'Supplier',category:'oro18k',sku:'001',productId:'P1',measureType:'Unidades',pieceWeight:2,quantity:2,unitCost:300});
  r=run(r,'reversePurchase',{purchaseId:r.purchases[0].id});assert.equal(r.products[0].stock,10);assert.equal(r.products[0].cost,100);assert.equal(r.financialLedger.at(-1).profitAdjustment,0);
});

test('a paid legacy purchase price increase creates its own debt without changing unrelated opening balances',()=>{
  const s=fixture();s.suppliers[0].creditBalance=1000;s.supplierCredits=[{id:'CP-OPEN',supplier:'Supplier',totalOwed:1000,paidAmount:0,pendingAmount:1000,purchaseOrderIds:[]}];s.purchases=[{id:'PAID',supplier:'Supplier',productId:'P1',productSku:'001',quantity:1,measureType:'Pesaje',unitCost:100,total:100,paidAmount:100,status:'Recibido',paymentStatus:'Pagado Total',paymentMethod:'Efectivo'}];
  const r=run(s,'editPurchase',{purchaseId:'PAID',total:150,unitCost:150,inventoryPolicy:'carrying'});assert.equal(r.supplierCredits[0].pendingAmount,1000);assert.equal(r.suppliers[0].creditBalance,1050);assert.equal(r.supplierCredits[1].pendingAmount,50);
});

test('bank surcharge refunds are explicit and recorded as an additional loss',()=>{
  const s=fixture();s.recentTransactions=[{id:'CARD',total:100,paymentMethod:'Tarjeta',bankFeeAmount:3,shiftId:'OLD',targetAccount:'Cuenta Carlos',status:'completed',items:[{id:'P1',sku:'001',qty:1,unit:'g',measureType:'Pesaje'}]}];
  assert.throws(()=>run(s,'reverseSale',{saleId:'CARD'}),/recargo/);const r=run(s,'reverseSale',{saleId:'CARD',refundBankFee:true});assert.equal(L.shiftTotals(r).expectedCardInAccount,-103);assert.equal(r.financialLedger.at(-1).profitAdjustment,-3);
});

test('historical costs require evidence and cannot replace a recorded cost',()=>{
  const s=creditSales(fixture());delete s.recentTransactions[0].items[0].cost;delete s.recentTransactions[0].items[0].cogsTotal;
  assert.throws(()=>run(s,'setHistoricalCost',{saleId:'T1',itemIndex:0,totalCost:80}),/soporte/);
  const r=run(s,'setHistoricalCost',{saleId:'T1',itemIndex:0,totalCost:80,reference:'Original receipt'});assert.equal(r.recentTransactions[0].items[0].cogsTotal,80);assert.throws(()=>run(r,'setHistoricalCost',{saleId:'T1',itemIndex:0,totalCost:90,reference:'Other'}),/sobrescribirá/);
});

test('cashiers cannot bypass financial-operation authorization',async()=>{
  const api=memoryApi(fixture()),cookie=await api.login('cashier');const r=await api.request('operation',{operationId:'unauthorized-reversal',baseUpdatedAt:api.state.updatedAt,type:'reverseSale',args:{saleId:'T1',reason:'Test'}},cookie);assert.equal(r.statusCode,403);assert.equal(api.state.financialLedger?.length||0,0);
});


test('one linked invoice does not turn old opening-balance payments into invoice refunds',()=>{
  const s=creditSales(fixture());s.recentTransactions=s.recentTransactions.slice(0,1);s.customerCredits[0]={id:'CC-1',customer:'Customer',totalGranted:1000,currentBalance:850,txId:'T1',mergedTxIds:['T1']};s.customers[0].creditBalance=850;s.abonosVentas=[{id:'OLD',customer:'Customer',creditId:'CC-1',amount:150,method:'Efectivo'}];
  assert.throws(()=>run(s,'reverseSale',{saleId:'T1'}),/distribución comprobada/);
});
