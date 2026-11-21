'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browserHarness,connectOperations,product}=require('./helpers');
const I=require('../js/safety'),L=require('../js/ledger');
function purchaseForm(h,fields={}){
 h.app.data.products=[product()];h.app.data.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];h.app.canPerformAction=()=>true;
 h.app.showPurchaseReceiptModal=()=>{};
 const el=h.inputs({'add-purchase-form':'','po-product-id':'P1','po-product-sku':'001','po-product-name':'Audit jewelry','po-supp-select':'Supplier','po-category-select':'oro18k','po-measure-type':'Pesaje','po-quantity':'50000.125','po-unit-cost':'444.000','po-product-grams':'','po-payment-status':'Pendiente','po-preview-total':'','po-preview-grams':'','po-unit-cost-label':'',...fields});
 return el;
}
test('large incoming grams use the same grouped cost and total before and after save',async()=>{
 const h=browserHarness(),el=purchaseForm(h);h.app.updatePurchaseCalculations();
 const expected=22200055500;assert.equal(el['po-preview-total'].textContent,h.app.formatCurrency(expected));
 const api=await connectOperations(h);await h.app.runMutation(()=>h.app.submitPurchase());
 assert.equal(api.state.purchases.length,1,JSON.stringify(h.app.events));assert.equal(api.state.purchases[0].total,expected);assert.equal(api.state.products[0].stock,50010.125);
 assert.equal(api.state.suppliers[0].creditBalance,expected);assert.equal(api.state.products[0].name,'Audit jewelry');assert.equal(api.state.products[0].sku,'001');
});
test('piece intake preview preserves small gram weights in a large batch',async()=>{
 const h=browserHarness(),el=purchaseForm(h,{'po-measure-type':'Unidades','po-quantity':'1001','po-product-grams':'0.123','po-unit-cost':'100,000'});
 h.app.data.products=[product({measureType:'Unidades',weightUnit:'u.',unit:'u.',pieceWeight:.123,weight:.123})];h.app.updatePurchaseCalculations();
 assert.equal(el['po-preview-total'].textContent,h.app.formatCurrency(12312300));
 assert.equal(el['po-unit-cost-label'].textContent,'Costo por gramo ($) *');
 const api=await connectOperations(h);await h.app.runMutation(()=>h.app.submitPurchase());assert.equal(api.state.purchases[0].totalGrams,123.123);assert.equal(api.state.purchases[0].total,12312300);assert.equal(api.state.products[0].stock,1011);
});
test('replenishment form converts kilogram catalog cost to the gram purchase cost',()=>{
 const h=browserHarness(),el=purchaseForm(h,{'po-unit-cost':''});h.app.data.products=[product({weightUnit:'kg',unit:'kg',stock:1,cost:444000000})];
 h.app.onPurchaseMeasureTypeChange=()=>{};h.app.applyExistingProductToPurchase('P1');assert.equal(h.app.parseMoneyInput(el['po-unit-cost'].value),444000);
});
test('loading a zero-cost product never retains a prior product purchase cost',()=>{
 const h=browserHarness(),el=purchaseForm(h,{'po-unit-cost':'444,000'});h.app.data.products=[product({cost:0})];h.app.onPurchaseMeasureTypeChange=()=>{};h.app.applyExistingProductToPurchase('P1');assert.equal(h.app.parseMoneyInput(el['po-unit-cost'].value),0);
});
test('jewelry pieces require their weight before showing a purchase total',()=>{
 const h=browserHarness(),el=purchaseForm(h,{'po-measure-type':'Unidades','po-product-grams':''});h.app.updatePurchaseCalculations();assert.equal(el['po-unit-cost-label'].textContent,'Costo por gramo ($) *');assert.equal(el['po-preview-total'].textContent,'Indica el peso por pieza');
});
test('extras retain a per-unit purchase cost and do not require jewelry weight',()=>{
 const h=browserHarness(),el=purchaseForm(h,{'po-measure-type':'Unidades','po-category-select':'test-extra','po-quantity':'1000','po-unit-cost':'10.000','po-product-grams':'0.123'});h.app.data.categories.push({id:'test-extra',name:'Extras',type:'extras'});h.app.updatePurchaseCalculations();assert.equal(el['po-unit-cost-label'].textContent,'Costo por unidad ($) *');assert.equal(el['po-preview-total'].textContent,h.app.formatCurrency(10000000));
});
test('large replenishments conserve grams and weighted cost in all supported weight units',()=>{
 for(const weightUnit of ['g','kg','mg','µg','oz']){
  const p=product({weightUnit,stock:50000/I.factor(weightUnit),cost:400000*I.factor(weightUnit)}),q=50000.125;const after=I.replenishment(p,q,450000,0);
  assert(Math.abs(after.stock*I.factor(weightUnit)-(50000+q))<=I.factor(weightUnit)*.000001);
  const expected=(50000*400000+q*450000)/(50000+q)*I.factor(weightUnit);assert(Math.abs(after.cost-expected)<.000051);
  assert.equal(L.money(q*450000),22500056250);
 }
});
test('two devices cannot overwrite a large intake and replay cannot duplicate it',async()=>{
 const h=browserHarness();purchaseForm(h);h.app.data.products.push(product({id:'P2',sku:'002',name:'Second product'}));const api=await connectOperations(h),cookie=await api.login(),base=api.state.updatedAt;
 const command=(id,productId,sku)=>({type:'createPurchase',operationId:id,baseUpdatedAt:base,args:{productId,sku,supplier:'Supplier',category:'oro18k',measureType:'Pesaje',quantity:50000.125,unitCost:444000,reason:'Large intake isolated concurrency test'}});
 const first=command('large-intake-device-one','P1','001'),second=command('large-intake-device-two','P2','002');
 assert.equal((await api.request('operation',first,cookie)).statusCode,200);
 assert.equal((await api.request('operation',second,cookie)).statusCode,409);assert.equal(api.state.products[1].stock,10);assert.equal(api.state.purchases.length,1);
 second.baseUpdatedAt=api.state.updatedAt;assert.equal((await api.request('operation',second,cookie)).statusCode,200);
 assert.equal((await api.request('operation',first,cookie)).body.alreadyApplied,true);assert.equal(api.state.purchases.length,2);assert.equal(api.state.products[0].stock,50010.125);assert.equal(api.state.products[1].stock,50010.125);
});
test('an invalid large intake cannot leave partial stock, debt or purchase records',async()=>{
 const h=browserHarness();purchaseForm(h);const api=await connectOperations(h),cookie=await api.login(),before=api.state;
 for(const fields of [{quantity:Infinity},{quantity:-100000},{productId:'OTHER'},{unitCost:Infinity},{measureType:'Unidades',pieceWeight:2}]){
  const response=await api.request('operation',{type:'createPurchase',operationId:'invalid-intake-'+Object.keys(fields)[0],baseUpdatedAt:before.updatedAt,args:{productId:'P1',sku:'001',supplier:'Supplier',category:'oro18k',measureType:'Pesaje',quantity:50000,unitCost:444000,reason:'Invalid intake test',...fields}},cookie);
  assert.notEqual(response.statusCode,200);assert.deepEqual(api.state,before);
 }
});
