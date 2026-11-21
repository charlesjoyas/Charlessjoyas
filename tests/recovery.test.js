'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const R=require('../lib/local-recovery');
const Q=require('../js/reconciliation');
const {browserHarness,product}=require('./helpers');
test('local backup and restore preserve exact bytes, reject overwrite and detect tampering',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'charles-recovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const source=path.join(dir,'source.json'),target=path.join(dir,'restored.json'),state={store:{name:'TEST'},products:[product()]};
  fs.writeFileSync(source,JSON.stringify(state));const backup=R.backup(source,path.join(dir,'snapshots'));
  R.restore(backup.file,target);assert.ok(fs.readFileSync(source).equals(fs.readFileSync(target)));assert.throws(()=>R.restore(backup.file,target),/EEXIST/);
  fs.appendFileSync(backup.file,' ');assert.throws(()=>R.verify(backup.file),/checksum/);assert.deepEqual(JSON.parse(fs.readFileSync(source)),state);
});
test('reconciliation does not fabricate old costs from a current inventory cost',()=>{
  const {seed}=browserHarness();seed.products=[product()];seed.recentTransactions=[{id:'LEGACY',status:'completed',items:[{id:'P1',sku:'001',qty:1}]}];const before=JSON.stringify(seed);
  const result=Q.report(seed,[{source:'verified-backup',sha256:'digest',state:{products:[product({cost:999})]}}]);
  assert.equal(result.summary.missing_historical_cost,1);assert.equal(result.issues[0].details.candidates.length,0);assert.equal(JSON.stringify(seed),before);
});
test('historical cost evidence must match the original sale and product identity',()=>{
  const state={products:[product()],recentTransactions:[{id:'T1',status:'completed',items:[{id:'P1',sku:'001',qty:1}]}]};
  const result=Q.report(state,[{source:'old-snapshot',sha256:'digest',state:{recentTransactions:[{id:'OTHER',items:[{id:'P1',sku:'001',cogsTotal:60}]},{id:'T1',items:[{id:'P1',sku:'001',cogsTotal:80}]}]}}]);
  assert.deepEqual(result.issues[0].details.candidates.map(c=>c.cogsTotal),[80]);
});
test('general report excludes reversed purchases and expenses and includes documented valuation adjustments',()=>{
  const {app}=browserHarness();app.data.recentTransactions=[];app.data.purchases=[{id:'VOID',total:100,status:'Reversada'},{id:'LIVE',total:200,paidAmount:0,creditAdjustment:50,status:'Recibido'}];app.data.expenses=[{id:'VOID',amount:50,status:'Anulado'},{id:'LIVE',amount:20}];app.data.financialLedger=[{id:'VALUE',profitAdjustment:7,date:'2026-11-20'}];
  const r=app.getConsolidatedReporteGeneralData();assert.equal(r.totalPurchases,200);assert.equal(r.totalPendingPurchases,150);assert.equal(r.totalExp,20);assert.equal(r.netProfit,-13);
});
