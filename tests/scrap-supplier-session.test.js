'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {browserHarness,memoryApi,clone}=require('./helpers'),{demoSeed,localSessionSecret}=require('../scripts/scrap-gold-local');
test('empty supplier is rejected by the form handler before sending any operation',async()=>{
 const h=browserHarness();h.inputs({'po-supp-select':''});let calls=0;h.context.fetch=async()=>{calls++;throw Error('No request should be sent');};await assert.rejects(()=>h.app.submitPurchase({preventDefault(){}}),/Selecciona un proveedor/);assert.equal(calls,0);assert.equal(h.app.getPendingFinancialCommand(),null);
});
test('empty supplier has a precise API rejection and cannot change stock or balances',async()=>{
 const api=memoryApi(demoSeed(),{scrapGoldEnabled:true}),login=await api.request('login',{email:'local@example.test',password:'LotesLocal2026!'}),before=api.state;
 const r=await api.request('operation',{type:'createPurchase',operationId:crypto.randomUUID(),baseUpdatedAt:before.updatedAt,args:{supplier:'',category:'chatarra',sku:'SUPPLIER-TEST',name:'Chatarra',quantity:1,unitCost:100,reason:'Test missing supplier'}},login.cookie);assert.equal(r.statusCode,422);assert.equal(r.body.code,'SUPPLIER_REQUIRED');assert.match(r.body.error,/Selecciona un proveedor/);assert.deepEqual(api.state,before);
});
test('a registered General supplier is selectable explicitly and the placeholder does not invent one',()=>{
 const h=browserHarness();h.app.data.suppliers=[{id:'G',name:'Proveedor General',status:'Active'},{id:'I',name:'Inactivo',status:'Inactive'}];const nodes=h.inputs({'po-supp-select':''});h.App.prototype.populatePurchaseProductSelect.call(h.app);const html=nodes['po-supp-select'].innerHTML;assert.match(html,/selected disabled>Selecciona un proveedor/);assert.match(html,/value="Proveedor General"/);assert(!html.includes('Inactivo'));
});
test('restarting local pilot reuses its session secret and existing authenticated session',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scrap-session-test-'));const first=localSessionSecret(directory),state=demoSeed(),api=memoryApi(state,{secret:first});const login=await api.request('login',{email:'local@example.test',password:'LotesLocal2026!'});assert.equal(login.statusCode,200);const secretBytes=fs.readFileSync(path.join(directory,'session-secret.txt'));const second=localSessionSecret(directory);assert.equal(first,second);assert.deepEqual(fs.readFileSync(path.join(directory,'session-secret.txt')),secretBytes);const restarted=memoryApi(clone(state),{secret:second});assert.equal((await restarted.request('session',{},login.cookie)).statusCode,200);
});
