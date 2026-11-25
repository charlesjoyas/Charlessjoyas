'use strict';
const I=require('../js/safety'),L=require('../js/ledger');
function validName(value){
  if(typeof value!=='string'||!value.trim()||value.trim().length>200)throw Object.assign(new Error('El nombre del producto es obligatorio y admite hasta 200 caracteres.'),{status:422});
  return value.trim();
}
function syncPurchaseNames(state,product,name,originalSku=product.sku){
  const ids=[];
  for(const po of state.purchases||[]){
    if(L.inactive(po.status)||po.productId!==product.id)continue;
    // A legacy ID collision must never rename a different SKU.
    if(po.productSku&&I.sku(po.productSku)!==I.sku(originalSku))continue;
    if(po.productName!==name){po.productName=name;ids.push(po.id);}
  }
  return ids;
}
function syncCatalogNameChanges(before,next){
  const old=new Map(before.products.map(p=>[p.id,p])),changes=[];
  for(const product of next.products){
    const previous=old.get(product.id);if(!previous||previous.name===product.name)continue;
    const name=validName(product.name);product.name=name;
    const purchaseIds=syncPurchaseNames(next,product,name,previous.sku);
    changes.push({productId:product.id,sku:previous.sku,before:previous.name,after:name,purchaseIds});
  }
  return changes;
}
function correctPurchaseName(state,po,value){
  const name=validName(value),product=state.products.find(p=>p.id===po.productId);
  if(product){
    if(po.productSku&&I.sku(po.productSku)!==I.sku(product.sku))throw Object.assign(new Error('El producto vinculado no coincide con el código de esta compra. Revisa su identidad antes de cambiar el nombre.'),{status:422});
    product.name=name;syncPurchaseNames(state,product,name);
  }
  po.productName=name;
}
module.exports={validName,syncCatalogNameChanges,correctPurchaseName};
