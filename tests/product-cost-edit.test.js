'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browserHarness,connectOperations,product,clone}=require('./helpers');
function form(h,p){
 h.app.data.products=[p];h.app.data.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];h.app.canPerformAction=()=>true;
 return h.bindForm('edit-product-form',{'edit-prod-id':p.id,'edit-prod-orig-sku':p.sku,'edit-prod-sku':p.sku,'edit-prod-name':p.name,'edit-prod-cost':'450.000','edit-prod-stock':p.stock,'edit-prod-measure-type':p.measureType,'edit-prod-weight-unit':p.measureType==='Pesaje'?p.weightUnit:'','edit-prod-piece-weight':p.pieceWeight??p.weight??'','edit-prod-cat':p.category,'edit-prod-supplier':p.supplier||'Supplier','edit-prod-active':true});
}
for(const p of [product({pieceWeight:.79,weight:.79,supplier:'Supplier'}),product({measureType:'Unidades',weightUnit:'g',unit:'g',pieceWeight:.79,weight:.79,supplier:'Supplier'})]){
 test('cost-only edit preserves legacy product metadata: '+p.measureType,async()=>{
  const h=browserHarness(),submit=form(h,p);const api=await connectOperations(h);await submit();const saved=api.state.products[0];assert.equal(saved.cost,450000,JSON.stringify(h.app.events));for(const f of ['id','sku','name','stock','category','categoryName','measureType','weightUnit','unit','pieceWeight','weight'])assert.deepEqual(saved[f],p[f],f);
 });
}
test('category options refresh preserves the chosen category instead of choosing the first',()=>{
 const h=browserHarness();h.app.data.categories=[{id:'extra',name:'Extras',type:'extras'},{id:'nacional',name:'NACIONAL'}];const el=h.inputs({'edit-prod-cat':'nacional'});h.App.prototype.populateProductCategorySelect.call(h.app,'edit-prod-cat');assert.match(el['edit-prod-cat'].innerHTML,/value="nacional" selected/);assert.doesNotMatch(el['edit-prod-cat'].innerHTML,/value="extra" selected/);
});
test('opening edit gives the saved category ID priority over a stale category name',()=>{
 const h=browserHarness(),p=product({category:'nacional',categoryName:'Old name',pieceWeight:.79,weight:.79});form(h,p);h.app.data.categories=[{id:'wrong',name:'Old name'},{id:'nacional',name:'NACIONAL'}];let selected;
 h.app.populateProductCategorySelect=(id,value)=>{selected=value;};h.app.populateProductSupplierSelect=()=>{};h.app.onProductCategoryChange=()=>{};h.app.onMeasureTypeChange=()=>{};h.app.openEditProductModal(p.id,p.sku);assert.equal(selected,'nacional');
});
test('an actual change of piece weight remains blocked without altering stored inventory',async()=>{
 const h=browserHarness(),p=product({measureType:'Unidades',weightUnit:'u.',unit:'u.',pieceWeight:2,weight:2});const submit=form(h,p);const api=await connectOperations(h);const before=clone(api.state);h.context.document.getElementById('edit-prod-piece-weight').value='3';await submit();assert.deepEqual(api.state,before);assert.ok(h.app.events.some(([m])=>m.includes('otro SKU')));
});
