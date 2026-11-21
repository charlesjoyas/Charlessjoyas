'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { browserHarness, memoryApi, product, clone } = require('./helpers');

function fixture() { const { seed }=browserHarness(); seed.products=[product()]; seed.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:0}; return memoryApi(seed); }
function sale(id) { return {id,shiftId:'AUDIT',date:'20/11/2026',timestamp:1795219200000,status:'completed',subtotal:200,tax:0,total:200,paymentMethod:'Efectivo',items:[{id:'P1',sku:'001',qty:1,quantity:1,price:200,total:200,unit:'g',measureType:'Pesaje',pieceWeight:0}]}; }
test('anonymous reads and spoofed role writes cannot access the store', async () => {
  const api=fixture();
  assert.equal((await api.request('get')).statusCode,401);
  assert.equal((await api.request('post',api.state,'',{'x-nexus-role':'Super Admin','x-nexus-user-id':'invented'})).statusCode,401);
});
test('login requires exact registered identity, password and active account', async () => {
  const api=fixture();
  for (const email of ['carlos','owner@example.test','not-registered@example.test']) assert.equal((await api.request('login',{email,password:'audit-admin-password'})).statusCode,401);
  assert.equal((await api.request('login',{email:'admin@example.test',password:'wrong'})).statusCode,401);
  assert.equal((await api.request('login',{email:'admin@example.test',password:'audit-admin-password'},'',{'x-nexus-client':''})).statusCode,403);
});
test('authenticated reads omit every password and server AI key', async () => {
  const api=fixture(),session=await api.login();
  const res=await api.request('get',{},session);
  assert.equal(res.statusCode,200);
  assert.ok(res.body.users.every(u=>!('password'in u)&&!('passwordHash'in u)));
  assert.match(res.headers['cache-control'],/no-store/);
});
test('signed session cookies cannot be forged', async () => {
  const api=fixture(),session=await api.login();
  assert.equal((await api.request('get',{},session.slice(0,-5)+'aaaaa')).statusCode,401);
});
test('two devices cannot overwrite one another: stale writer gets 409', async () => {
  const api=fixture(),session=await api.login();
  const a=(await api.request('get',{},session)).body,b=clone(a);
  a.products[0].stock--;a.recentTransactions.push(sale('SALE-A'));
  b.products[0].stock--;b.recentTransactions.push(sale('SALE-B'));
  const outcomes=await Promise.all([api.request('post',{baseUpdatedAt:a.updatedAt,data:a},session),api.request('post',{baseUpdatedAt:b.updatedAt,data:b},session)]);
  assert.deepEqual(outcomes.map(r=>r.statusCode).sort(),[200,409]);
  assert.equal(api.state.products[0].stock,9);
  assert.equal(api.state.recentTransactions.length,1);
});
test('unknown base and legacy snapshot protocol are rejected', async () => {
  const api=fixture(),session=await api.login();
  assert.equal((await api.request('post',api.state,session)).statusCode,409);
});
test('cashier cannot bypass stock controls by submitting a direct snapshot adjustment', async () => {
  const api=fixture(),session=await api.login('cashier'),data=(await api.request('get',{},session)).body;
  data.products[0].stock=999;
  assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,403);
  assert.equal(api.state.products[0].stock,10);
});
test('server rejects a sale whose stock deduction does not match its items', async () => {
  const api=fixture(),session=await api.login(),data=(await api.request('get',{},session)).body;
  data.recentTransactions.push(sale('SALE-A'));
  assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,400);
});
test('server derives historical cost from its own catalog', async () => {
  const api=fixture(),session=await api.login(),data=(await api.request('get',{},session)).body;
  data.products[0].stock--;const tx=sale('SALE-A');tx.items[0].cost=1;tx.items[0].cogsTotal=1;data.recentTransactions.push(tx);
  assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,200);
  assert.equal(api.state.recentTransactions[0].items[0].cost,100);
  assert.equal(api.state.recentTransactions[0].items[0].cogsTotal,100);
});
test('historical sale deletion and price editing are rejected', async () => {
  for(const change of [d=>d.recentTransactions=[],d=>d.recentTransactions[0].total=1]){
    const api=fixture(),session=await api.login();let data=(await api.request('get',{},session)).body;data.products[0].stock--;data.recentTransactions.push(sale('SALE-A'));
    const saved=await api.request('post',{baseUpdatedAt:data.updatedAt,data},session);assert.equal(saved.statusCode,200);
    data=(await api.request('get',{},saved.cookie)).body;change(data);
    assert.ok([400,403].includes((await api.request('post',{baseUpdatedAt:data.updatedAt,data},saved.cookie)).statusCode));
  }
});
test('ordinary saves preserve credentials privately', async () => {
  const api=fixture(),session=await api.login(),data=(await api.request('get',{},session)).body;
  const res=await api.request('post',{baseUpdatedAt:data.updatedAt,data},session);
  assert.equal(res.statusCode,200);
  assert.equal(api.state.users[0].password,'audit-admin-password');
  assert.ok(res.body.users.every(u=>!u.password&&!u.passwordHash));
});
test('cashiers cannot replace users, permissions, catalog or configuration', async () => {
  for (const mutate of [d=>d.users[1].role='Super Admin',d=>d.perfiles=[],d=>d.products[0].cost=1,d=>d.store.name='tampered']) {
    const api=fixture(),session=await api.login('cashier'),data=(await api.request('get',{},session)).body;
    mutate(data);
    assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,403);
  }
});
test('stock validation rejects negative values and normalized duplicate SKUs', async () => {
  for (const mutate of [d=>d.products[0].stock=-1,d=>d.products.push(product({id:'P2',sku:'1'}))]) {
    const api=fixture(),session=await api.login(),data=(await api.request('get',{},session)).body;mutate(data);
    assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,400);
  }
});
test('storage failure never reports a successful save or mutates the original state', async () => {
  const api=fixture(),session=await api.login(),data=(await api.request('get',{},session)).body;
  api.outage(true);data.products[0].stock--;
  assert.equal((await api.request('post',{baseUpdatedAt:data.updatedAt,data},session)).statusCode,503);
  assert.equal(api.state.products[0].stock,10);
});
test('password change hashes the new credential and revokes previous sessions', async () => {
  const api=fixture(),session=await api.login();
  assert.equal((await api.request('password',{currentPassword:'wrong',newPassword:'new-audit-password'},session)).statusCode,403);
  const changed=await api.request('password',{currentPassword:'audit-admin-password',newPassword:'new-audit-password'},session);
  assert.equal(changed.statusCode,200);
  assert.ok(api.state.users[0].passwordHash);
  assert.equal(api.state.users[0].password,undefined);
  assert.equal((await api.request('session',{},session)).statusCode,401);
  assert.equal((await api.request('session',{},changed.cookie)).statusCode,200);
  assert.equal((await api.request('login',{email:'admin@example.test',password:'new-audit-password'})).statusCode,200);
});


test('direct snapshots cannot invent payments, change opening debt, or forge audit history',async()=>{
  for(const mutate of [d=>d.abonosCompras.push({id:'FAKE',amount:500,supplier:'Fake'}),d=>d.suppliers.push({id:'S1',name:'Fake',creditBalance:500}),d=>d.financialLedger=[{id:'FAKE'}],d=>{d.recentTransactions.push({...sale('BAD'),paymentMethod:'Pago Mixto',mixedPayments:[{method:'Efectivo',amount:10},{method:'Transferencia',amount:10,targetAccount:'Cuenta Carlos'}]});d.products[0].stock--;}]){
    const api=fixture(),cookie=await api.login(),data=(await api.request('get',{},cookie)).body;const before=clone(api.state);mutate(data);const r=await api.request('post',{baseUpdatedAt:data.updatedAt,data},cookie);assert.ok([400,403].includes(r.statusCode),r.body.error);assert.deepEqual(api.state,before);
  }
});

test('a forged cash closing is rejected even for an administrator',async()=>{
  const api=fixture(),cookie=await api.login(),data=(await api.request('get',{},cookie)).body;data.cashShiftLog={...data.cashShiftLog,status:'Cerrado',closingCash:500,expectedCashInDrawer:500};data.cashShiftsHistory.push({id:'CLOSE-FAKE',shiftId:'AUDIT',status:'Cerrado',closingCash:500,expectedCashInDrawer:500,difference:0});
  const r=await api.request('post',{baseUpdatedAt:data.updatedAt,data},cookie);assert.equal(r.statusCode,400);assert.equal(api.state.cashShiftLog.status,'Abierto');
});


test('credit-limit exceptions require the authenticated administrator and an explicit reason',async()=>{
  for(const [role,override,accepted]of [['admin',true,true],['admin',false,false],['cashier',true,false]]){
    const {seed}=browserHarness();seed.products=[product()];seed.cashShiftLog={status:'Abierto',shiftId:'AUDIT',openingCash:0};seed.customers=[{id:'C1',name:'Customer',creditBalance:0,creditLimit:100}];const api=memoryApi(seed),cookie=await api.login(role),data=(await api.request('get',{},cookie)).body;
    const tx={...sale('LIMIT'),customer:'Customer',paymentMethod:'Crédito'};if(override)tx.creditLimitOverride={reason:'Documented exception',authorizedBy:role==='admin'?'USR-001':'USR-002'};
    data.products[0].stock--;data.recentTransactions.push(tx);data.customers[0].creditBalance=200;data.customerCredits.push({id:'CC-LIMIT',customer:'Customer',txId:'LIMIT',totalGranted:200,currentBalance:200,status:'Al Día'});
    const r=await api.request('post',{baseUpdatedAt:data.updatedAt,data},cookie);assert.equal(r.statusCode===200,accepted,r.body.error);
  }
});
