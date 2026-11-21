'use strict';
const fs=require('fs');
const assert=require('assert/strict');
const crypto=require('crypto');
const {browserHarness,memoryApi,clone}=require('../tests/helpers');
const {sha256}=require('../lib/local-recovery');
const {publicState}=require('../lib/state-api');
async function main(){
  const [source,output]=process.argv.slice(2);
  if(!source||!output||fs.existsSync(output))throw new Error('Uso: node scripts/validate-isolated-copy.js COPIA.json RESULTADO_NUEVO.json');
  const original=fs.readFileSync(source),state=JSON.parse(original),h=browserHarness(),checks=[];
  // The source is only read. All commands below execute in memoryApi, with no MongoDB/network adapter.
  state.users=clone(h.seed.users);state.suppliers.push({id:'ISOLATED-SUPPLIER',name:'ISOLATED SUPPLIER',creditBalance:0});
  state.cashShiftLog={shiftId:'ISOLATED-SHIFT',status:'Abierto',openingCash:100000,openingCard:0};
  const api=memoryApi(state);let session=await api.login();
  const request=async(name,body)=>{const response=await api.request(name,body,session);if(response.cookie)session=response.cookie;return response;};
  const load=async()=>{h.app.data=(await request('get',{})).body;h.app._confirmedData=clone(h.app.data);h.app._lastServerUpdatedAt=h.app.data.updatedAt;h.app.currentUser=h.app.data.users[0];};
  await load();h.app.sanitizeLoadedData();
  let result=await request('post',{baseUpdatedAt:h.app._lastServerUpdatedAt,data:h.app.data});assert.equal(result.statusCode,200,result.body.error);checks.push('Frontend sanitation and ordinary save accepted against the copied catalog.');
  const base=api.state.updatedAt,product=state.products.find(p=>p.measureType==='Pesaje'&&state.categories.some(c=>c.id===p.category)&&p.status!=='inactive');assert.ok(product,'No weighted product available for isolated validation.');
  const before=clone(api.state.products.find(p=>p.id===product.id)),history=clone(api.state.cashShiftsHistory),credits=clone(api.state.supplierCredits);
  const command={type:'createPurchase',operationId:crypto.randomUUID(),baseUpdatedAt:base,args:{productId:product.id,sku:product.sku,category:product.category,measureType:'Pesaje',quantity:.125,unitCost:400000,paid:true,method:'Efectivo',supplier:'ISOLATED SUPPLIER',reason:'ISOLATED MEMORY TEST ONLY'}};
  result=await request('operation',command);assert.equal(result.statusCode,200,result.body.error);const purchase=api.state.purchases.find(p=>p.operationId===command.operationId);assert.ok(purchase);assert.equal(purchase.total,50000);checks.push('A 0.125 g purchase, weighted cost and allocated cash payment were accepted only in memory.');
  result=await request('operation',command);assert.equal(result.statusCode,200,result.body.error);assert.equal(result.body.alreadyApplied,true);assert.equal(api.state.purchases.filter(p=>p.operationId===command.operationId).length,1);checks.push('Lost-acknowledgement retry did not duplicate purchase or payment.');
  const stale=await request('post',{baseUpdatedAt:base,data:publicState(state)});assert.equal(stale.statusCode,409);checks.push('A stale second-device snapshot was rejected.');
  result=await request('operation',{type:'reversePurchase',operationId:crypto.randomUUID(),baseUpdatedAt:api.state.updatedAt,args:{purchaseId:purchase.id,reason:'ISOLATED MEMORY RETURN'}});assert.equal(result.statusCode,200,result.body.error);
  const after=api.state.products.find(p=>p.id===product.id);assert.equal(after.stock,before.stock);assert.equal(after.cost,before.cost);assert.deepEqual(api.state.cashShiftsHistory,history);for(const credit of credits)assert.deepEqual(api.state.supplierCredits.find(c=>c.id===credit.id),credit);assert.equal(api.state.suppliers.find(s=>s.id==='ISOLATED-SUPPLIER').creditBalance,0);checks.push('Purchase reversal restored exact stock/cost and preserved all preexisting supplier credits and closed shifts.');
  assert.ok(fs.readFileSync(source).equals(original));
  fs.writeFileSync(output,JSON.stringify({passed:true,execution:'memory only; no database client or network writes',sourceSha256:sha256(original),products:state.products.length,sales:state.recentTransactions.length,checks,sourceUnchanged:true,generatedAt:new Date().toISOString()},null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,checks:checks.length,sourceUnchanged:true,output}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
