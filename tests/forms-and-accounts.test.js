'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {browserHarness,connectOperations,product,clone,memoryApi}=require('./helpers');
const L=require('../js/ledger');
function supplierFixture(h){
  h.app.data.suppliers=[{id:'S1',name:'Supplier',nit:'TEST-NIT',creditBalance:300,status:'Active'}];
  h.app.data.supplierCredits=[{id:'CP1',supplier:'Supplier',supplierId:'S1',totalOwed:100,paidAmount:0,pendingAmount:100,status:'Pendiente'},{id:'CP2',supplier:'Supplier',supplierId:'S1',totalOwed:200,paidAmount:0,pendingAmount:200,status:'Pendiente'}];
}
test('editing supplier contact details preserves every separate credit and its pending balance',async()=>{
  const h=browserHarness();supplierFixture(h);const credits=clone(h.app.data.supplierCredits),api=await connectOperations(h);
  const submit=h.bindForm('edit-supplier-form',{'edit-supp-id':'S1','edit-supp-name':'Supplier','edit-supp-nit':'TEST-NIT','edit-supp-phone':'NEW PHONE','edit-supp-pending-balance':300,'edit-supp-active':true});await submit();
  assert.equal(api.state.suppliers[0].phone,'NEW PHONE',JSON.stringify(h.app.events));assert.deepEqual(api.state.supplierCredits,credits);assert.equal(api.state.suppliers[0].creditBalance,300);
});

test('supplier email edit succeeds with a fractional debt and cannot rewrite it from the display field',async()=>{
  const h=browserHarness();supplierFixture(h);h.app.data.suppliers[0].creditBalance=300.56;h.app.data.supplierCredits[0].totalOwed=100.56;h.app.data.supplierCredits[0].pendingAmount=100.56;
  const before=clone(h.app.data),api=await connectOperations(h);
  const submit=h.bindForm('edit-supplier-form',{'edit-supp-id':'S1','edit-supp-name':'Supplier','edit-supp-nit':'TEST-NIT','edit-supp-email':'updated@example.test','edit-supp-pending-balance':301,'edit-supp-active':true});await submit();
  assert.equal(api.state.suppliers[0].email,'updated@example.test',JSON.stringify(h.app.events));assert.equal(api.state.suppliers[0].creditBalance,300.56);
  for(const key of ['supplierCredits','purchases','products','abonosCompras','recentTransactions','expenses','accountAdjustments'])assert.deepEqual(api.state[key]||[],before[key]||[],key+' must not change during email editing');
});

test('supplier contact edit does not fill in or otherwise rewrite historical credit metadata',async()=>{
  const h=browserHarness();supplierFixture(h);delete h.app.data.supplierCredits[0].supplier;const before=clone(h.app.data.supplierCredits),api=await connectOperations(h);
  const submit=h.bindForm('edit-supplier-form',{'edit-supp-id':'S1','edit-supp-name':'Supplier','edit-supp-nit':'TEST-NIT','edit-supp-email':'updated@example.test','edit-supp-pending-balance':300,'edit-supp-active':true});await submit();
  assert.equal(api.state.suppliers[0].email,'updated@example.test',JSON.stringify(h.app.events));assert.deepEqual(api.state.supplierCredits,before);
});
test('creating a new bank account records only its own initial balance',async()=>{
  const h=browserHarness(),api=await connectOperations(h);const submit=h.bindForm('add-paymethod-form',{'pm-name-input':'Banco Diario','pm-fee-input':'0','pm-is-account-select':'true','pm-initial-balance-input':1000});await submit();
  const pm=api.state.paymentMethods.find(p=>p.name==='Banco Diario');assert.ok(pm,JSON.stringify(h.app.events));assert.equal(L.accounts(api.state)[pm.accountKey||L.account(pm.name,true)].balance,1000);assert.equal(api.state.accountAdjustments.length,0);
});
test('renaming a bank account keeps its initial balance and earlier movements in one pocket',async()=>{
  const h=browserHarness();h.app.data.paymentMethods.push({id:'PM-BANK',name:'Banco Diario',isBankAccount:true,fee:'0%',active:true});h.app.data.accountInitialBalances={acc_banco_diario:500};h.app.data.abonosVentas=[{id:'AB1',customer:'Test',amount:50,method:'Transferencia',targetAccount:'Banco Diario'}];const api=await connectOperations(h);
  const submit=h.bindForm('edit-paymethod-form',{'edit-pm-id':'PM-BANK','edit-pm-name':'Banco Renombrado','edit-pm-fee':'0','edit-pm-is-account':'true','edit-pm-initial-balance':500});await submit();
  const pm=api.state.paymentMethods.find(p=>p.id==='PM-BANK');assert.equal(pm.name,'Banco Renombrado',JSON.stringify(h.app.events));assert.equal(L.accounts(api.state).acc_banco_diario.balance,550);assert.equal(L.movementAccount(pm.name,'Transferencia',api.state),'acc_banco_diario');assert.equal(L.movementAccount(null,pm.name,api.state),'acc_banco_diario');assert.equal(L.accounts(api.state).acc_banco_renombrado,undefined);assert.equal(api.state.abonosVentas[0].targetAccount,'Banco Diario');
});
test('bank adjustments with a closed shift do not rewrite that closed log',async()=>{
  const h=browserHarness();h.app.data.cashShiftLog={shiftId:'OLD',status:'Cerrado',closingCash:1000};const closed=clone(h.app.data.cashShiftLog),api=await connectOperations(h);h.inputs({'acc-adj-type':'income','acc-adj-account-select':'cuenta_carlos','acc-adj-amount-input':100});await h.app.runMutation(()=>h.app.submitAccountAdjustment());
  assert.equal(api.state.accountAdjustments.length,1,JSON.stringify(h.app.events));assert.deepEqual(api.state.cashShiftLog,closed);assert.equal(L.accounts(api.state).cuenta_carlos.balance,100);
});
test('cash adjustments require an open shift instead of silently disappearing from the displayed cash',async()=>{
  const h=browserHarness();h.app.data.cashShiftLog={shiftId:'OLD',status:'Cerrado',closingCash:1000,closedTimestamp:1};const api=await connectOperations(h);h.inputs({'acc-adj-type':'income','acc-adj-account-select':'efectivo_caja','acc-adj-amount-input':100});await h.app.runMutation(()=>h.app.submitAccountAdjustment());
  assert.equal((api.state.accountAdjustments||[]).length,0);assert.equal(L.accounts(api.state).efectivo_caja.balance,1000);assert.ok(h.app.events.some(([text])=>/turno.*abierto|abre.*turno/i.test(text)));
});
test('setting a bank balance preserves cent differences',async()=>{
  const h=browserHarness();h.app.data.cashShiftLog={status:'Abierto',shiftId:'OPEN',openingCash:1000};h.app.data.accountInitialBalances={cuenta_carlos:10.1};const api=await connectOperations(h);h.inputs({'acc-adj-type':'set_balance','acc-adj-account-select':'cuenta_carlos','acc-adj-amount-input':10.2});await h.app.runMutation(()=>h.app.submitAccountAdjustment());
  assert.equal(L.accounts(api.state).cuenta_carlos.balance,10.2);assert.equal(api.state.accountAdjustments[0].amount,.1);
});
test('product deletion and edit lookup never fall back from a mismatched ID and SKU to another record',async()=>{
  const h=browserHarness();h.app.data.products=[product(),product({id:'P2',sku:'002'})];const before=clone(h.app.data);assert.equal(h.app.findProductIdentity(null,null),null);await h.app.runMutation(()=>h.app.deleteProduct('P1','002'));assert.deepEqual(clone(h.app.data),before);assert.doesNotThrow(()=>h.app.openEditProductModal('P1','002'));
});
test('editing a mixed-only customer does not erase their payment authorization',async()=>{
  const h=browserHarness();h.app.data.customers=[{id:'C1',name:'Customer',document:'TEST-DOC',docType:'CC',creditBalance:0,creditLimit:0,allowedPaymentMethods:['Pago Mixto']}];const api=await connectOperations(h);
  const submit=h.bindForm('edit-customer-form',{'edit-cust-id':'C1','edit-cust-name':'Customer','edit-cust-document':'TEST-DOC','edit-cust-phone':'NEW PHONE','edit-cust-email':'','edit-cust-address':'','edit-cust-limit':0,'edit-cust-pay-mixed':true});await submit();assert.equal(api.state.customers[0].phone,'NEW PHONE',JSON.stringify(h.app.events));assert.deepEqual(api.state.customers[0].allowedPaymentMethods,['Pago Mixto']);
});
test('code-prefixed searches support accents, padded SKUs and multiple words',()=>{
  const {app}=browserHarness(),p=product({sku:'007',name:'Anillo clásico'});for(const term of ['código 007','codigo 7','cod. 007','codigo anillo 007'])assert.equal(app.matchesProductSearch(p,term),true,term);assert.equal(app.matchesProductSearch(p,'codigo anillo 008'),false);
});
test('accountants with custom permissions still have no write actions',()=>{
  const {app}=browserHarness();app.currentUser={id:'A',role:'Contador',customPermissions:['*']};for(const entity of ['expense','product','customer','purchase'])assert.equal(app.canPerformAction('create',entity),false,entity);assert.equal(app.hasPermission('reports',null),true);
});
test('renamed accounts retain their opening bank balance in a new shift breakdown',()=>{
  const {seed}=browserHarness();seed.paymentMethods=[{id:'BANK',name:'Banco Renombrado',isBankAccount:true,accountKey:'acc_banco_original'}];seed.cashShiftLog={shiftId:'OPEN',status:'Abierto',openingCash:0,openingCard:300,openingAccount:'Banco Renombrado'};const totals=L.shiftTotals(seed);assert.equal(totals.expectedCardInAccount,300);assert.equal(totals.accountBreakdown['Banco Renombrado'].opening,300);assert.equal(totals.accountBreakdown['Banco Renombrado'].net,300);
});
test('API rejects initial-balance rewrites and forged identities despite adding a new account',async()=>{
  for(const mutate of [d=>{d.accountInitialBalances.acc_old=999;},d=>{d.paymentMethods.push({id:'NEW',name:'Banco Nuevo',isBankAccount:true,accountKey:'acc_old'});d.accountInitialBalances.acc_old=999;},d=>{d.paymentMethods.push({id:'NEW',name:'Banco Nuevo',isBankAccount:true,accountKey:'acc_banco_nuevo'});d.accountInitialBalances.cuenta_carlos=999;}]){
    const {seed}=browserHarness();seed.accountInitialBalances={acc_old:500};const api=memoryApi(seed),cookie=await api.login(),data=(await api.request('get',{},cookie)).body,before=clone(api.state);mutate(data);const r=await api.request('post',{baseUpdatedAt:data.updatedAt,data},cookie);assert.equal(r.statusCode,403,r.body.error);assert.deepEqual(api.state,before);
  }
});
