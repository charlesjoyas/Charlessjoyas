'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
const {browserHarness,memoryApi,connectOperations,clone,product}=require('./helpers');
const I=require('../js/safety');
const L=require('../js/ledger');
const {publicState}=require('../lib/state-api');
const lot=(fields={})=>product({inventoryMode:'chainLot',lotCode:'LOT-001',stock:200,stockUnits:50,pieceWeight:0,weight:0,cost:400000,price:500000,...fields});
function fixture(){
  const h=browserHarness();
  for(const k of ['products','purchases','recentTransactions','expenses','customers','customerCredits','supplierCredits','abonosVentas','abonosCompras','financialLedger','accountAdjustments','cashShiftsHistory'])h.seed[k]=[];
  h.seed.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];
  h.seed.cashShiftLog={shiftId:'LOCAL',status:'Abierto',openingCash:0,openingCard:0};
  h.seed.store.taxRate=0;
  h.app.data=publicState(h.seed);h.app.currentUser=h.app.data.users[0];
  return h;
}
const receipt=(fields={})=>({inventoryMode:'chainLot',lotCode:'LOT-001',sku:'CAD-001',name:'Cadenas de prueba',category:'oro18k',supplierId:'S1',supplier:'Supplier',measureType:'Pesaje',quantity:200,unitCount:50,unitCost:400000,pieceWeight:0,paid:false,reason:'Local test receipt',...fields});
async function command(api,cookie,type,args,id=crypto.randomUUID(),base=api.state.updatedAt){return api.request('operation',{type,args,operationId:id,baseUpdatedAt:base},cookie);}
function saleSnapshot(api,items=[{qty:7.6,units:2}]){
  const next=publicState(api.state),p=next.products[0];let subtotal=0;
  const lines=items.map(({qty,units})=>{
    // Build the client's claim separately; the API must validate both balances.
    p.stock=I.round(p.stock-qty);p.stockUnits-=units;
    const total=Math.round(qty*500000);subtotal+=total;
    return {id:p.id,sku:p.sku,name:p.name,qty,quantity:qty,price:500000,total,unit:'g',measureType:'Pesaje',pieceWeight:0,inventoryMode:'chainLot',lotCode:p.lotCode,unitCount:units};
  });
  next.recentTransactions.unshift({id:crypto.randomUUID(),shiftId:'LOCAL',status:'completed',date:'24/11/2026',timestamp:Date.now(),paymentMethod:'Efectivo',customer:'Cliente Mostrador',items:lines,subtotal,tax:0,total:subtotal});
  return next;
}
async function setup(){const api=memoryApi(fixture().seed,{chainLotsEnabled:true}),cookie=await api.login();const r=await command(api,cookie,'createPurchase',receipt());assert.equal(r.statusCode,200,r.body.error);return {api,cookie};}
test('lot receipt preserves ordinary products and records grams, chains, valuation and supplier debt',async()=>{
  const h=fixture();h.seed.products=[product()];const ordinary=clone(h.seed.products[0]);
  const api=memoryApi(h.seed,{chainLotsEnabled:true}),cookie=await api.login();
  const r=await command(api,cookie,'createPurchase',receipt());assert.equal(r.statusCode,200,r.body.error);
  const p=api.state.products[1],po=api.state.purchases[0];assert.equal(p.stock,200);assert.equal(p.stockUnits,50);assert.equal(po.unitCount,50);assert.equal(po.total,80000000);assert.equal(po.inventoryBefore.stockUnits,0);assert.equal(po.inventoryAfter.stockUnits,50);assert.equal(api.state.suppliers[0].creditBalance,80000000);assert.deepEqual(api.state.products[0],ordinary);
});
test('two independently weighed chains discount 2 units and 7.6 g with authoritative historical cost',async()=>{
  const {api,cookie}=await setup();const next=saleSnapshot(api);next.recentTransactions[0].items[0].cost=1;
  const r=await api.request('post',{baseUpdatedAt:api.state.updatedAt,data:next},cookie);assert.equal(r.statusCode,200,r.body.error);
  assert.equal(api.state.products[0].stock,192.4);assert.equal(api.state.products[0].stockUnits,48);assert.equal(api.state.recentTransactions[0].items[0].cogsTotal,3040000);assert.equal(api.state.recentTransactions[0].total,3800000);
});
for(const [name,qty,units]of [['fractional chains',1,1.5],['missing chains',1,undefined],['negative chains',1,-1],['excess chains',1,51],['excess grams',201,1],['last chain with grams remaining',1,50],['all grams with chains remaining',200,1],['too many gram decimals',.1234567,1]])test(`sale rejects ${name} atomically`,async()=>{
  const {api,cookie}=await setup(),before=api.state;const next=saleSnapshot(api,[{qty,units}]);
  const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:next},cookie);assert.equal(r.statusCode,400,r.body.error);assert.deepEqual(api.state,before);
});
test('multiple lines of the same lot accumulate both balances and can consume the complete lot',async()=>{
  const {api,cookie}=await setup(),next=saleSnapshot(api,[{qty:7.6,units:2},{qty:192.4,units:48}]);
  const r=await api.request('post',{baseUpdatedAt:api.state.updatedAt,data:next},cookie);assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.products[0].stock,0);assert.equal(api.state.products[0].stockUnits,0);
});
test('sale reversal returns exact chains and grams once, even after a later receipt',async()=>{
  const {api,cookie}=await setup();let r=await api.request('post',{baseUpdatedAt:api.state.updatedAt,data:saleSnapshot(api)},cookie);assert.equal(r.statusCode,200,r.body.error);
  const tx=api.state.recentTransactions[0];r=await command(api,cookie,'createPurchase',receipt({quantity:10,unitCount:3,unitCost:500000}));assert.equal(r.statusCode,200,r.body.error);
  const cost=api.state.products[0].cost,id=crypto.randomUUID(),args={saleId:tx.id,reason:'Return sold chains'};
  r=await command(api,cookie,'reverseSale',args,id);assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.products[0].stock,210);assert.equal(api.state.products[0].stockUnits,53);assert.equal(api.state.products[0].cost,cost);
  r=await command(api,cookie,'reverseSale',args,id);assert.equal(r.body.alreadyApplied,true);r=await command(api,cookie,'reverseSale',args);assert.equal(r.statusCode,422);assert.equal(api.state.products[0].stockUnits,53);
});
test('untouched receipt reversal restores both balances and cancels its exact supplier obligation',async()=>{
  const {api,cookie}=await setup();const r=await command(api,cookie,'reversePurchase',{purchaseId:api.state.purchases[0].id,reason:'Return entire lot'});assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.products[0].stock,0);assert.equal(api.state.products[0].stockUnits,0);assert.equal(api.state.products[0].cost,0);assert.equal(api.state.suppliers[0].creditBalance,0);
});
test('receipt cannot be reversed or its weights edited after its chains were sold',async()=>{
  const {api,cookie}=await setup();let r=await api.request('post',{baseUpdatedAt:api.state.updatedAt,data:saleSnapshot(api)},cookie);assert.equal(r.statusCode,200,r.body.error);const before=api.state;
  r=await command(api,cookie,'reversePurchase',{purchaseId:api.state.purchases[0].id,reason:'Cannot return sold stock',inventoryPolicy:'carrying'});assert.ok(r.statusCode>=400);assert.deepEqual(api.state,before);
  r=await command(api,cookie,'editPurchase',{purchaseId:api.state.purchases[0].id,quantity:190,reason:'Cannot rewrite lot quantities'});assert.equal(r.statusCode,422);assert.deepEqual(api.state,before);
});
test('receipt retry and stale concurrent sale cannot duplicate or overwrite stock',async()=>{
  const api=memoryApi(fixture().seed,{chainLotsEnabled:true}),cookie=await api.login(),id=crypto.randomUUID(),base=api.state.updatedAt;
  let r=await command(api,cookie,'createPurchase',receipt(),id,base);assert.equal(r.statusCode,200,r.body.error);r=await command(api,cookie,'createPurchase',receipt(),id,base);assert.equal(r.body.alreadyApplied,true);assert.equal(api.state.products[0].stockUnits,50);
  const snapshot=saleSnapshot(api),version=api.state.updatedAt;const results=await Promise.all([1,2].map(()=>api.request('post',{baseUpdatedAt:version,data:snapshot},cookie)));assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);assert.equal(api.state.products[0].stockUnits,48);assert.equal(api.state.recentTransactions.length,1);
});
for(const field of ['stock','stockUnits','cost','lotCode','category','inventoryMode'])test(`administrator cannot bypass lot operations by altering ${field}`,async()=>{
  const {api,cookie}=await setup(),before=api.state,next=publicState(before);next.products[0][field]=typeof next.products[0][field]==='number'?next.products[0][field]+1:'changed';
  const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:next},cookie);assert.equal(r.statusCode,400,r.body.error);assert.deepEqual(api.state,before);
});
test('normal product cannot be converted to a lot and another SKU cannot reuse a lot code',async()=>{
  const h=fixture();h.seed.products=[product()];let api=memoryApi(h.seed,{chainLotsEnabled:true}),cookie=await api.login();let r=await command(api,cookie,'createPurchase',receipt({sku:'001'}));assert.equal(r.statusCode,422);
  ({api,cookie}=await setup());r=await command(api,cookie,'createPurchase',receipt({sku:'CAD-002'}));assert.equal(r.statusCode,422);assert.equal(api.state.products.length,1);
});
test('feature defaults off; lot receipt is rejected while normal purchasing still works',async()=>{
  const api=memoryApi(fixture().seed),cookie=await api.login();let r=await command(api,cookie,'createPurchase',receipt());assert.equal(r.statusCode,403);assert.equal(api.state.products.length,0);
  const args=receipt();delete args.inventoryMode;delete args.unitCount;delete args.lotCode;r=await command(api,cookie,'createPurchase',args);assert.equal(r.statusCode,200,r.body.error);
});
test('cashier frontend sale persists and reloads exact lot metadata, profit and ordinary catalog',async()=>{
  const h=fixture();h.app.data.products=[lot(),product({id:'P2',sku:'002'})];const ordinary=clone(h.app.data.products[1]);h.app.currentUser=h.app.data.users[1];h.app.selectedPayMethod='cash';
  h.inputs({'cash-received-input':3800000});const api=await connectOperations(h,{chainLotsEnabled:true},'cashier');
  assert.equal(h.app.addToCart('P1',7.6,500000,2),true);await h.app.runMutation(()=>h.app.processPaymentSuccess());
  assert.equal(api.state.recentTransactions.length,1,JSON.stringify(h.app.events));assert.equal(api.state.products[0].stock,192.4);assert.equal(api.state.products[0].stockUnits,48);assert.deepEqual(api.state.products[1],ordinary);
  const tx=api.state.recentTransactions[0];assert.equal(tx.total,3800000);assert.equal(tx.items[0].unitCount,2);assert.equal(tx.items[0].lotCode,'LOT-001');assert.equal(tx.total-I.historicalCost(tx.items[0]),760000);assert.equal(L.shiftTotals(api.state).expectedCashInDrawer,3800000);
});
test('frontend lot validation preserves cart and data for invalid counts or weights',()=>{
  const h=fixture();h.app.data.products=[lot()];const before=clone(h.app.data);assert.equal(h.app.addToCart('P1',7.6,500000,1.5),false);assert.equal(h.app.addToCart('P1',200,500000,1),false);assert.equal(h.app.cart.length,0);assert.deepEqual(clone(h.app.data),before);
});
test('lot helper handles six decimal grams without inventing average chain weights',()=>{
  const p=lot({stock:.000003,stockUnits:2});const first=I.lotMovement(p,.000001,1);const second=I.lotMovement({...p,...first},.000002,1);assert.deepEqual(second,{stock:0,stockUnits:0});
});
test('failed lot receipt does not leave product, purchase, debt or audit behind',async()=>{
  const api=memoryApi(fixture().seed,{chainLotsEnabled:true}),cookie=await api.login(),before=api.state;
  for(const fields of [{unitCount:1.5},{unitCount:0},{quantity:.1234567},{unitCost:0},{pieceWeight:2},{lotCode:''}]){
    const r=await command(api,cookie,'createPurchase',receipt(fields));assert.equal(r.statusCode,422,r.body.error);assert.deepEqual(api.state,before);
  }
});
test('cashier cannot receive lots, adjust stock or reverse a sale without administrator authority',async()=>{
  const {api}=await setup(),cookie=await api.login('cashier'),before=api.state;
  let r=await command(api,cookie,'createPurchase',receipt({sku:'NEW',lotCode:'NEW'}));assert.equal(r.statusCode,403);
  r=await command(api,cookie,'reverseSale',{saleId:'anything',reason:'Cashier attempt'});assert.equal(r.statusCode,403);assert.deepEqual(api.state,before);
});
test('administrator cannot fabricate a lot in a direct snapshot',async()=>{
  const api=memoryApi(fixture().seed,{chainLotsEnabled:true}),cookie=await api.login(),before=api.state,next=publicState(before);next.products.push(lot());
  const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:next},cookie);assert.equal(r.statusCode,400);assert.deepEqual(api.state,before);
});
test('selling a preexisting lot is blocked when pilot is disabled',async()=>{
  const h=fixture();h.seed.products=[lot()];const api=memoryApi(h.seed),cookie=await api.login(),before=api.state;
  const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:saleSnapshot(api)},cookie);assert.equal(r.statusCode,403);assert.deepEqual(api.state,before);
});
test('two lot sale lines cannot each claim the same available units',async()=>{
  const {api,cookie}=await setup(),before=api.state,next=saleSnapshot(api,[{qty:10,units:30},{qty:10,units:30}]);
  const r=await api.request('post',{baseUpdatedAt:before.updatedAt,data:next},cookie);assert.equal(r.statusCode,400);assert.deepEqual(api.state,before);
});
test('storage outage preserves both balances and retry registers the receipt exactly once',async()=>{
  const api=memoryApi(fixture().seed,{chainLotsEnabled:true}),cookie=await api.login(),id=crypto.randomUUID(),before=api.state;
  api.outage(true);let r=await command(api,cookie,'createPurchase',receipt(),id);assert.equal(r.statusCode,503);assert.deepEqual(api.state,before);
  api.outage(false);r=await command(api,cookie,'createPurchase',receipt(),id);assert.equal(r.statusCode,200,r.body.error);assert.equal(api.state.products[0].stockUnits,50);assert.equal(api.state.purchases.length,1);
});
test('carrying-cost reversal of a later receipt restores original units and exact weighted valuation',async()=>{
  const {api,cookie}=await setup();let r=await command(api,cookie,'createPurchase',receipt({quantity:100,unitCount:10,unitCost:500000}));assert.equal(r.statusCode,200,r.body.error);
  assert.equal(api.state.products[0].cost,433333.3333);assert.equal(api.state.products[0].stockUnits,60);
  r=await command(api,cookie,'reversePurchase',{purchaseId:api.state.purchases[0].id,reason:'Reverse untouched second receipt'});assert.equal(r.statusCode,200,r.body.error);
  assert.equal(api.state.products[0].stock,200);assert.equal(api.state.products[0].stockUnits,50);assert.equal(api.state.products[0].cost,400000);assert.equal(api.state.suppliers[0].creditBalance,80000000);
});
test('mismatched historical lot identity blocks reversal without returning anything to another lot',async()=>{
  const h=fixture();h.seed.products=[lot({stock:192.4,stockUnits:48})];h.seed.recentTransactions=[{id:'SALE',shiftId:'LOCAL',status:'completed',total:3800000,paymentMethod:'Efectivo',items:[{id:'P1',sku:'001',inventoryMode:'chainLot',lotCode:'WRONG',qty:7.6,unitCount:2,measureType:'Pesaje',unit:'g'}]}];
  const api=memoryApi(h.seed,{chainLotsEnabled:true}),cookie=await api.login(),before=api.state;const r=await command(api,cookie,'reverseSale',{saleId:'SALE',reason:'Cannot substitute lots'});assert.equal(r.statusCode,422);assert.deepEqual(api.state,before);
});
test('a negotiated lot total remains exact when price per gram cannot be represented as whole pesos',async()=>{
  const h=fixture();h.app.data.products=[lot()];h.app.selectedPayMethod='cash';
  h.inputs({'pos-add-product-id':'P1','pos-add-qty-input':'7,6','pos-add-custom-price-input':'','pos-add-total-sale-input':'','pos-add-chain-units':2,'cash-received-input':3800001});
  const api=await connectOperations(h,{chainLotsEnabled:true});
  h.app.onAddToCartTotalSaleInput('3,800,001');h.app.confirmAddToCartFromModal();
  assert.equal(h.app.cart.length,1,JSON.stringify(h.app.events));assert.equal(Math.round(h.app.getCartSubtotal()),3800001);
  await h.app.runMutation(()=>h.app.processPaymentSuccess());assert.equal(api.state.recentTransactions[0]?.total,3800001,JSON.stringify(h.app.events));assert.equal(api.state.products[0].stockUnits,48);
});
function orderForm(h,fields={}){
  h.context.window.NexusChainLots={enabled:true};h.app.showPurchaseReceiptModal=()=>{};
  return h.bindForm('add-purchase-form',{'po-product-id':'','po-product-sku':'CAD-PO-001','po-product-name':'Lote por compra','po-supp-select':'Supplier','po-category-select':'oro18k','po-measure-type':'chainLot','po-quantity':'37,125','po-lot-code':'PO-LOT-001','po-lot-units':'12','po-unit-cost':'425,000','po-product-grams':'','po-payment-status':'Pendiente','po-payment-method':'Efectivo','po-account-select':'Cuenta Carlos','po-preview-total':'','po-preview-grams':'','po-unit-cost-label':'',...fields});
}
for(const method of ['Efectivo','Tarjeta Débito','Tarjeta Crédito','Transferencia Bancaria','Bancolombia / Nequi'])test(`lot through ordinary purchase form supports paid ${method}`,async()=>{
  const h=fixture(),submit=orderForm(h,{'po-payment-status':'Pagado Total','po-payment-method':method});
  h.app.data.cashShiftLog.openingCash=100000000;
  const api=await connectOperations(h,{chainLotsEnabled:true});
  await submit();const s=api.state,po=s.purchases[0];assert.ok(po,JSON.stringify(h.app.events));
  assert.equal(po.inventoryMode,'chainLot');assert.equal(po.unitCount,12);assert.equal(po.totalGrams,37.125);assert.equal(po.total,15778125);assert.equal(po.paidAmount,15778125);assert.equal(po.paymentMethod,method);assert.equal(s.suppliers[0].creditBalance,0);
  assert.equal(s.products[0].stockUnits,12);assert.equal(s.products[0].stock,37.125);assert.equal(s.abonosCompras.length,1);assert.equal(s.abonosCompras[0].allocations[0].purchaseId,po.id);
  const account=method==='Efectivo'?'efectivo_caja':L.movementAccount('Cuenta Carlos',method,s);assert.equal(L.accounts(s)[account].balance,method==='Efectivo'?84221875:-15778125);
});
test('lot ordinary purchase form preview and supplier credit agree exactly',async()=>{
  const h=fixture(),submit=orderForm(h);h.app.updatePurchaseCalculations();
  assert.equal(h.context.document.getElementById('po-preview-total').textContent,h.app.formatCurrency(15778125));
  assert.equal(h.context.document.getElementById('po-preview-grams').textContent,'12 cadenas · 37.125 g');
  const api=await connectOperations(h,{chainLotsEnabled:true});await submit();const s=api.state;assert.equal(s.purchases[0].paymentStatus,'Pendiente');assert.equal(s.suppliers[0].creditBalance,15778125);assert.equal(s.abonosCompras.length,0);assert.equal(s.purchases[0].measureType,'Pesaje');
});
test('lot receipt form requires code, whole chains and valid grams before submitting',async()=>{
  for(const fields of [{'po-lot-code':''},{'po-lot-units':'1.5'},{'po-quantity':'1,234.50'},{'po-quantity':'0'},{'po-quantity':'.1234567'}]){
    const h=fixture(),submit=orderForm(h,fields),api=await connectOperations(h,{chainLotsEnabled:true}),before=api.state;await submit();assert.deepEqual(api.state,before);assert.ok(h.app.events.some(([msg])=>msg.includes('cadenas enteras')));
  }
});
test('lot category selection cannot silently switch to regular unit purchases',()=>{
  const h=fixture();h.app.data.categories.push({id:'extra',name:'Extras',type:'extras'});orderForm(h,{'po-category-select':'extra'});h.app.onPurchaseCategoryChange();assert.equal(h.context.document.getElementById('po-measure-type').value,'chainLot');
});
test('changing measure hides lot fields and prevents unit counts carrying into a normal purchase',()=>{
  const h=fixture();const nodes=h.inputs({'po-measure-type':'chainLot','po-lot-fields':'','po-lot-code':'LOT','po-lot-units':'10','po-quantity':'1,250','po-quantity-label':'','po-quantity-unit':'','po-unit-cost-label':'','po-grams-group':'','po-product-grams':''});
  h.app._purchaseLotMode=false;h.app.onPurchaseMeasureTypeChange();assert.equal(nodes['po-quantity'].value,'');assert.equal(nodes['po-lot-code'].required,true);assert.equal(nodes['po-lot-fields'].hidden,false);
  nodes['po-measure-type'].value='Pesaje';h.app.onPurchaseMeasureTypeChange();assert.equal(nodes['po-lot-code'].required,false);assert.equal(nodes['po-lot-code'].disabled,true);assert.equal(nodes['po-lot-fields'].hidden,true);
});
test('purchase table and normal Excel exports distinguish chain count from grams and identify the lot',async()=>{
  const h=fixture(),submit=orderForm(h),api=await connectOperations(h,{chainLotsEnabled:true});await submit();h.app.data=publicState(api.state);
  const nodes=h.inputs({'fin-compras-tbody':''});h.App.prototype.renderFinComprasTable.call(h.app);assert.match(nodes['fin-compras-tbody'].innerHTML,/12 cadenas/);assert.doesNotMatch(nodes['fin-compras-tbody'].innerHTML,/37.125 ítems/);
  const exports=[];h.app._downloadExcelWorkbook=xml=>exports.push(xml);
  h.app.exportPurchasesExcel();h.app.exportLibroCompletoComprasYAbonosExcel();assert.equal(exports.length,2);
  for(const xml of exports){assert.match(xml,/Lote PO-LOT-001/);assert.match(xml,/<Data ss:Type="Number">12<\/Data>/);assert.match(xml,/<Data ss:Type="Number">37\.125<\/Data>/);}
});
for(const sequence of [['P1','P2'],['P2','P1','P2']])test(`sale modal enables lot validation only for lots: ${sequence.join(' → ')}`,()=>{
  const h=fixture();h.app.data.products=[lot(),product({id:'P2',sku:'941',stock:1.07})];h.app.cart=[{product:h.app.data.products[0],qty:7.6,unitCount:2,customPrice:500000}];
  const nodes=h.inputs({'pos-add-product-id':'','pos-add-chain-units-group':'','pos-add-chain-units':'1','pos-add-qty-input':'','pos-add-custom-price-input':'','pos-add-total-sale-input':''});
  for(const id of sequence){h.app.openAddToCartModal(id);const isLot=id==='P1';assert.equal(nodes['pos-add-chain-units'].disabled,!isLot);assert.equal(nodes['pos-add-chain-units'].required,isLot);assert.equal(nodes['pos-add-chain-units-group'].hidden,!isLot);assert.equal(nodes['pos-add-chain-units'].max,isLot?'50':'');assert.equal(nodes['pos-add-chain-units'].value,isLot?2:'');}
  assert.equal(h.app.cart.length,1);assert.equal(h.app.cart[0].unitCount,2);assert.equal(h.app.cart[0].qty,7.6);
});
