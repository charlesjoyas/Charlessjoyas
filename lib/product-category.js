'use strict';
const I=require('../js/safety');
const L=require('../js/ledger');
const fail=message=>{throw Object.assign(new Error(message),{status:422,code:'INVALID_CATEGORY_CORRECTION'});};
// Only the explicit audited operation calls this; names and costs never select categories.
function correctProductCategory(state,args,now){
  const p=state.products.find(p=>p.id===args.productId&&String(p.sku)===String(args.productSku));
  if(!p)fail('No se encontró el producto con su código original.');
  if(args.fromCategory!==p.category)fail('La categoría del producto cambió. Actualiza antes de corregirla.');
  const cat=state.categories.find(c=>c.id===args.categoryId);
  if(!cat||cat.id===p.category)fail('Selecciona expresamente una categoría diferente y válida.');
  if(I.isChainLot(p))fail('La categoría de un lote requiere revisar su ingreso mediante una reversión documentada.');
  const source=I.categoryFor(p,state.categories);
  const extra=!!(cat.type==='extras'||cat.isExtra),wasExtra=!!(p.isExtra||source?.isExtra||source?.type==='extras'),conversion=extra!==wasExtra;
  const linked=x=>x.productId===p.id||I.sku(x.productSku)===I.sku(p.sku);
  const purchases=state.purchases.filter(x=>linked(x)&&!L.inactive(x.status));
  if(conversion){
    if(I.isPesaje(p))fail('Para convertir gramos a unidades se necesita un conteo físico documentado. Esta corrección conserva la medida original.');
    const pieceWeight=extra?0:Number(args.pieceWeight);
    if(!extra&&(!Number.isFinite(pieceWeight)||pieceWeight<=0||I.round(pieceWeight)!==pieceWeight))fail('Indica el peso real por pieza, mayor a cero y con hasta seis decimales.');
    if(!Number.isSafeInteger(Number(p.stock))||Number(p.stock)<=0)fail('La corrección requiere las piezas completas y disponibles.');
    const sold=state.recentTransactions.some(t=>(t.items||[]).some(i=>i.id===p.id||I.sku(i.sku)===I.sku(p.sku)));
    if(sold||purchases.length>1)fail('El producto tiene ventas u otras compras. Su cambio de medida necesita una corrección documentada del historial.');
    const po=purchases[0];
    if(po&&((po.measureType||p.measureType)!==p.measureType||!po.inventoryBefore||!po.inventoryAfter||Number(po.inventoryBefore.stock)!==0||Number(p.stock)!==Number(po.quantity)||Number(p.stock)!==Number(po.inventoryAfter.stock)||Number(p.cost)!==Number(po.inventoryAfter.cost)||Math.abs(I.productValue(p)-Number(po.total))>.01))fail('La mercancía o su costo cambió después de la compra. Revisa sus movimientos antes de cambiar el tipo de categoría.');
    const unitValue=Number(p.cost)*(wasExtra?1:I.weight(p));
    if(!Number.isFinite(unitValue)||unitValue<0||(!wasExtra&&!(I.weight(p)>0)))fail('El costo o peso original necesita revisión.');
    const beforeValue=I.productValue(p);
    Object.assign(p,{isExtra:extra,pieceWeight,weight:pieceWeight,cost:extra?unitValue:unitValue/pieceWeight});
    if(Math.abs(I.productValue(p)-beforeValue)>.01)fail('La corrección debe conservar el valor de la mercancía.');
    if(po){
      po.measureType='Unidades';po.productGrams=pieceWeight;po.totalGrams=extra?0:I.round(Number(po.quantity)*pieceWeight);
      po.unitCost=extra?Number(po.total)/Number(po.quantity):Number(po.total)/po.totalGrams;
      po.inventoryAfter={...po.inventoryAfter,stock:p.stock,cost:p.cost};
    }
  }else if(args.pieceWeight!==undefined&&Number(args.pieceWeight)!==I.weight(p))fail('La corrección de categoría conserva el peso por pieza. Corrige los gramos desde la orden de compra.');
  p.category=cat.id;p.categoryName=cat.name;p.isExtra=extra;
  for(const po of purchases){po.category=cat.id;po.categoryName=cat.name;po.edited=true;po.updatedAt=new Date(now).toISOString();}
}
module.exports={correctProductCategory};
