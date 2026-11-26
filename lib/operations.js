'use strict';
const crypto=require('crypto');
const {isDeepStrictEqual}=require('util');
const I=require('../js/safety');
const L=require('../js/ledger');
const {correctPurchaseName}=require('./product-names');
const clone=v=>JSON.parse(JSON.stringify(v));
const error=(message,code='RECONCILIATION_REQUIRED')=>Object.assign(new Error(message),{status:422,code});
const amount=(v,zero=false)=>{const n=Number(v);if(!Number.isFinite(n)||(zero?n<0:n<=0))throw error('El importe debe ser un número válido.','INVALID_AMOUNT');return L.money(n);};
const remaining=po=>L.inactive(po.status)?0:Math.max(0,L.money(Number(po.total)-Number(po.paidAmount || 0)-Number(po.creditAdjustment || 0)));
const active=record=>!L.inactive(record.status);
const same=(a,b)=>L.norm(a)===L.norm(b);
const collectionNames=['products','recentTransactions','purchases','customers','suppliers','customerCredits','supplierCredits','abonosVentas','abonosCompras','expenses','accountAdjustments','categories'];
function fingerprint(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function operationHash(type,args){return fingerprint({type,args});}
function executeOperation(original,command,user,now=Date.now()) {
  const state=clone(original),args=command.args || {},id=command.operationId;
  if(!/^[A-Za-z0-9_-]{8,100}$/.test(id || ''))throw error('Identificador de operación inválido.','INVALID_OPERATION_ID');
  if(!String(args.reason || '').trim() || String(args.reason).length>2000)throw error('Escribe el motivo de esta operación.','REASON_REQUIRED');
  for(const key of collectionNames)state[key] ||= [];
  state.financialLedger ||= [];
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const time=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(now));
  let seq=0,profitAdjustment=0,metadataOnly=false;
  const nextId=prefix=>`${prefix}-${id}-${++seq}`;
  const metadata=()=>({date,isoDate:date,time,timestamp:now,shiftId:state.cashShiftLog?.status==='Abierto'?state.cashShiftLog.shiftId:'EXCLUIDO',cashier:user.name,operationId:id});
  const find=(key,target)=>{const record=state[key].find(x=>x.id===target);if(!record)throw error(`No existe el registro ${target}.`,'NOT_FOUND');return record;};
  const supplier=(name,supplierId)=>{const found=state.suppliers.filter(s=>(supplierId&&s.id===supplierId)||same(s.name,name));if(found.length!==1)throw error('No se pudo identificar un único proveedor.');return found[0];};
  const customer=name=>{const found=state.customers.filter(c=>same(c.name,name));if(found.length!==1)throw error('No se pudo identificar un único cliente.');return found[0];};
  const cashCheck=key=>{if(key==='efectivo_caja'&&state.cashShiftLog?.status!=='Abierto')throw error('Abre un turno de caja para registrar este movimiento en efectivo.','SHIFT_REQUIRED');};
  const move=(key,value,type,sourceId)=>{
    if(!key)throw error('Debes identificar la cuenta del movimiento.');
    cashCheck(key);if(!value)return;
    state.accountAdjustments.push({id:nextId('MOV'),...metadata(),accountKey:key,amount:Math.abs(L.money(value)),isIncome:value>0,movementType:type,category:type==='sale_refund'?'Devolución de venta':'Corrección documentada',concept:args.reason,sourceId,operator:user.name,typeLabel:value>0?'Reintegro (+)':'Devolución (-)'});
  };
  const creditForPurchase=po=>{
    const matches=state.supplierCredits.filter(c=>c.id===po.debtCreditId||c.poId===po.id||(c.purchaseOrderIds || []).includes(po.id));
    if(matches.length===1)return matches[0];
    const pending=state.supplierCredits.filter(c=>same(c.supplier,po.supplier)&&Number(c.pendingAmount)>0);
    if(matches.length===0&&remaining(po)>0&&pending.length===1)return pending[0];
    if(remaining(po)>0)throw error('La compra necesita vincularse a un crédito de proveedor único.');
    return null;
  };
  const creditForSale=tx=>{
    const candidates=state.customerCredits.filter(c=>c.txId===tx.id||(c.mergedTxIds || []).includes(tx.id));
    if(candidates.length!==1)throw error('La factura no tiene un crédito identificado. Vincúlala en Conciliación antes de reversarla.');
    return candidates[0];
  };
  const refreshPo=po=>{po.paymentStatus=remaining(po)<=0.005?(Number(po.creditAdjustment)>0?'Ajustado':'Pagado Total'):'Pendiente';};
  const refreshSupplierCredit=c=>{c.status=Number(c.pendingAmount)>0?'Pendiente':(c.adjustedAmount?'Ajustado':'Pagado Total');};
  const refreshCustomerCredit=c=>{c.status=Number(c.currentBalance)>0?(c.operationType==='Plan Separe'||String(c.id).startsWith('SEP-')?'Plan Separe':'Al Día'):(Number(c.totalGranted)>0?'Saldado':'Anulado');};
  const receiptAllocations=(receipt,kind)=>{
    if(Array.isArray(receipt.allocations))return receipt.allocations;
    if(kind==='supplier'){
      const po=state.purchases.find(p=>p.id===receipt.poId);
      if(po)return [{purchaseId:po.id,creditId:creditForPurchase(po)?.id,amount:Number(receipt.amount),reversedAmount:0}];
      const credit=state.supplierCredits.find(c=>c.id===receipt.poId);
      if(credit && !(credit.purchaseOrderIds || []).length)return [{openingCreditId:credit.id,creditId:credit.id,amount:Number(receipt.amount),reversedAmount:0}];
    }else{
      const credit=state.customerCredits.find(c=>c.id===receipt.creditId);
      if(credit){const links=[...new Set([credit.txId,...(credit.mergedTxIds || [])].filter(Boolean))];const fullPrincipal=state.recentTransactions.filter(t=>links.includes(t.id)).reduce((v,t)=>v+Number(t.total||0),0);if(links.length===1&&Math.abs(Number(credit.totalGranted)-fullPrincipal)<.01&&(!receipt.invoiceId||receipt.invoiceId===links[0]))return [{invoiceId:links[0],creditId:credit.id,amount:Number(receipt.amount),reversedAmount:0}];}
    }
    throw error(`El abono ${receipt.id} no tiene distribución comprobada. Concílialo antes de anular o devolver una factura.`);
  };
  const reduceReceipt=(receipt,allocation,value)=>{
    receipt.originalAmount ??=Number(receipt.amount);
    receipt.refundedAmount=L.money(Number(receipt.refundedAmount || 0)+value);
    receipt.amount=L.money(receipt.originalAmount-receipt.refundedAmount);
    allocation.reversedAmount=L.money(Number(allocation.reversedAmount || 0)+value);
    receipt.reversalOperationId=id;
    receipt.status=receipt.amount>0?'Parcialmente Reembolsado':'Reversado';
  };
  function supplierPayment(input) {
    const cp=input.creditId?find('supplierCredits',input.creditId):creditForPurchase(find('purchases',input.purchaseId));
    if(!cp)throw error('La orden no tiene deuda pendiente.');
    const supp=supplier(cp.supplier,cp.supplierId),value=amount(input.amount);
    if(value>Number(cp.pendingAmount)+.005||value>Number(supp.creditBalance)+.005)throw error('El pago supera la deuda pendiente.','OVERPAYMENT');
    const key=L.movementAccount(input.targetAccount,input.method || 'Efectivo',state);cashCheck(key);if(!key)throw error('Selecciona la cuenta desde la que se pagó.');
    let available=value;const allocations=[];
    const pos=state.purchases.filter(p=>active(p)&&same(p.supplier,cp.supplier)&&remaining(p)>0&&(!input.purchaseId||p.id===input.purchaseId)&&((cp.purchaseOrderIds || []).includes(p.id)||cp.poId===p.id||p.debtCreditId===cp.id)).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)||String(a.date).localeCompare(String(b.date)));
    if(input.purchaseId&&!pos.length)throw error('La compra seleccionada no tiene saldo en este crédito.');
    for(const po of pos){if(!available)break;const part=Math.min(available,remaining(po));po.paidAmount=L.money(Number(po.paidAmount || 0)+part);refreshPo(po);allocations.push({purchaseId:po.id,creditId:cp.id,amount:part,reversedAmount:0});available=L.money(available-part);}
    if(available){if(input.purchaseId)throw error('El pago supera el saldo de la compra.');allocations.push({openingCreditId:cp.id,creditId:cp.id,amount:available,reversedAmount:0});}
    cp.pendingAmount=L.money(Number(cp.pendingAmount)-value);cp.paidAmount=L.money(Number(cp.paidAmount || 0)+value);supp.creditBalance=L.money(Number(supp.creditBalance)-value);refreshSupplierCredit(cp);
    const receipt={id:nextId('AB-C'),...metadata(),supplier:supp.name,supplierId:supp.id,poId:cp.id,creditId:cp.id,amount:value,method:input.method || 'Efectivo',targetAccount:L.names[key] || input.targetAccount || key,allocations,status:'Confirmado'};
    state.abonosCompras.unshift(receipt);return receipt;
  }
  function customerPayment(input) {
    const credit=find('customerCredits',input.creditId),cust=customer(credit.customer),value=amount(input.amount);
    if(value>Number(credit.currentBalance)+.005||value>Number(cust.creditBalance)+.005)throw error('El abono supera la deuda pendiente.','OVERPAYMENT');
    const key=L.movementAccount(input.targetAccount,input.method || 'Efectivo',state);cashCheck(key);if(!key)throw error('Selecciona la cuenta del abono.');
    const linked=[...new Set([credit.txId,...(credit.mergedTxIds || [])].filter(Boolean))];
    const invoices=state.recentTransactions.filter(t=>active(t)&&linked.includes(t.id)).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
    const previous=state.abonosVentas.filter(a=>same(a.customer,cust.name)&&Number(a.amount)>0&&(a.creditId===credit.id||linked.includes(a.invoiceId)));
    if(invoices.length>1&&previous.some(a=>!Array.isArray(a.allocations)))throw error('Este crédito agrupa facturas con abonos antiguos sin distribuir. Concílialos antes de registrar otro abono.');
    let available=value;const allocations=[];
    const outstandingInvoices=invoices.reduce((sum,tx)=>{const principal=/separe/i.test(tx.paymentMethod || '')?Number(tx.separePending || 0):Number(tx.total || 0);const paid=previous.reduce((s,a)=>s+receiptAllocations(a,'customer').filter(x=>x.invoiceId===tx.id).reduce((v,x)=>v+Number(x.amount)-Number(x.reversedAmount || 0),0),0);return sum+Math.max(0,principal-paid);},0);
    const openingBalance=Math.max(0,L.money(Number(credit.currentBalance)-outstandingInvoices));
    if(openingBalance){const part=Math.min(available,openingBalance);allocations.push({openingCreditId:credit.id,creditId:credit.id,amount:part,reversedAmount:0});available=L.money(available-part);}
    for(const tx of invoices){if(!available)break;const principal=/separe/i.test(tx.paymentMethod || '')?Number(tx.separePending || 0):Number(tx.total || 0);const paid=previous.reduce((s,a)=>s+receiptAllocations(a,'customer').filter(x=>x.invoiceId===tx.id).reduce((v,x)=>v+Number(x.amount)-Number(x.reversedAmount || 0),0),0);const part=Math.min(available,Math.max(0,L.money(principal-paid)));if(part){allocations.push({invoiceId:tx.id,creditId:credit.id,amount:part,reversedAmount:0});available=L.money(available-part);}}
    if(available)allocations.push({openingCreditId:credit.id,creditId:credit.id,amount:available,reversedAmount:0});
    credit.currentBalance=L.money(Number(credit.currentBalance)-value);cust.creditBalance=L.money(Number(cust.creditBalance)-value);refreshCustomerCredit(credit);
    const receipt={id:nextId('AB-V'),...metadata(),customer:cust.name,customerId:cust.id,creditId:credit.id,invoiceId:allocations.length===1?allocations[0].invoiceId || credit.id:credit.id,amount:value,method:input.method || 'Efectivo',targetAccount:L.names[key] || input.targetAccount || key,allocations,status:'Confirmado'};
    state.abonosVentas.unshift(receipt);return receipt;
  }
  function createPurchase() {
    if(!args.supplierId&&!String(args.supplier||'').trim())throw error('Selecciona un proveedor registrado antes de guardar la compra.','SUPPLIER_REQUIRED');
    const supp=supplier(args.supplier,args.supplierId),category=state.categories.find(c=>c.id===args.category);
    if(!category)throw error('Selecciona una categoría válida.','INVALID_CATEGORY');
    const quantity=Number(args.quantity),unitCost=amount(args.unitCost,true),extra=category.type==='extras'||category.isExtra;
    if(!Number.isFinite(quantity)||quantity<=0)throw error('Cantidad de compra inválida.');
    const measureType=extra?'Unidades':args.measureType || 'Pesaje';
    if(!['Pesaje','Unidades'].includes(measureType))throw error('Tipo de medida inválido.');
    const code=I.sku(args.sku);if(!code)throw error('El SKU es obligatorio.');
    let p=state.products.find(p=>I.sku(p.sku)===code);
    const lot=args.inventoryMode==='chainLot';
    const scrap=category.id==='chatarra';
    if(args.materialForm==='scrapGold'&&!scrap)throw error('Las compras de chatarra pertenecen únicamente a la categoría CHATARRA.','INVALID_SCRAP_GOLD');
    if(scrap&&!I.validScrapWeight(quantity))throw error('El peso de la chatarra debe ser al menos 0,000001 g y admite hasta seis decimales.','INVALID_SCRAP_WEIGHT');
    if(args.materialForm!==undefined&&!['jewelry','scrapGold'].includes(args.materialForm))throw error('Presentación de mercancía inválida.');
    if(scrap&&(lot||extra||category.inventoryScope!=='extra'||measureType!=='Pesaje'||Number(args.pieceWeight||0)!==0))throw error('CHATARRA conserva pesaje en gramos y un promedio propio separado del inventario principal.','INVALID_SCRAP_GOLD');
    if(p&&I.isScrapGold(p)!==scrap)throw error('Joyas y chatarra necesitan códigos distintos; no se puede convertir un producto existente.','SCRAP_IDENTITY_MISMATCH');
    if(args.inventoryMode && !lot)throw error('Modalidad de inventario inválida.');
    if(p&&I.isChainLot(p)!==lot)throw error('No se puede convertir un producto existente en lote ni mezclar modalidades.');
    if(lot){
      if(extra||measureType!=='Pesaje'||!String(args.lotCode||'').trim()||String(args.lotCode).trim().length>80)throw error('El lote requiere una categoría de joyería, gramos y código de lote.');
      if(p&&p.lotCode!==String(args.lotCode).trim())throw error('El código del lote no coincide. Usa otro SKU para otro lote.');
      if(state.products.some(x=>x.id!==p?.id&&I.isChainLot(x)&&I.sku(x.lotCode)===I.sku(args.lotCode)))throw error('Ya existe un producto para ese lote.');
      if(Number(args.pieceWeight||0)!==0)throw error('El peso de un lote se registra completo, sin peso promedio por cadena.');
    }
    if(p&&args.productId&&p.id!==args.productId)throw error('El ID no corresponde al SKU elegido.');
    if(p&&(p.measureType!==measureType||p.category!==category.id))throw error('La categoría o la medida no coincide con el SKU existente.');
    const pieceWeight=extra?0:Number(args.pieceWeight ?? p?.pieceWeight ?? p?.weight ?? 0);
    if(measureType==='Unidades'&&!extra&&(!Number.isFinite(pieceWeight)||pieceWeight<=0))throw error('Indica el peso de cada pieza.');
    if(!p){if(!String(args.name || '').trim())throw error('El nombre del producto es obligatorio.');p={id:nextId('PRD'),sku:String(args.sku).trim(),name:String(args.name).trim(),measureType,weightUnit:measureType==='Pesaje'?'g':'u.',unit:measureType==='Pesaje'?'g':'u.',pieceWeight,weight:pieceWeight,category:category.id,categoryName:category.name,isExtra:!!extra,supplier:supp.name,cost:0,stock:0,price:0,minStock:measureType==='Pesaje'?.5:1,status:'out_of_stock',createdAt:new Date(now).toISOString()};state.products.push(p);}
    if(scrap)Object.assign(p,{materialForm:'scrapGold'});
    if(lot&&!I.isChainLot(p))Object.assign(p,{inventoryMode:'chainLot',lotCode:String(args.lotCode).trim(),stockUnits:0});
    const inventoryBefore={stock:Number(p.stock),cost:Number(p.cost),...(lot?{stockUnits:p.stockUnits}:{})};
    const lotBalance=lot?I.lotMovement(p,quantity,args.unitCount,1):null;
    Object.assign(p,I.replenishment(p,quantity,unitCost,pieceWeight));
    if(lot)Object.assign(p,lotBalance);
    p.pieceWeight=pieceWeight;p.weight=pieceWeight;p.status=Number(p.stock)>Number(p.minStock||0)?'active':'low_stock';
    const grams=extra?0:measureType==='Pesaje'?quantity:I.round(quantity*pieceWeight),total=L.money((grams>0?grams:quantity)*unitCost);
    if(total<=0)throw error('El total de compra debe ser mayor a cero.');
    const po={id:nextId('OC'),...metadata(),supplier:supp.name,supplierId:supp.id,productId:p.id,productSku:p.sku,productName:p.name,category:p.category,categoryName:p.categoryName,measureType,quantity,totalGrams:grams,productGrams:pieceWeight,itemsCount:measureType==='Pesaje'?1:quantity,unitCost,total,paidAmount:0,directPaidAmount:0,paymentStatus:'Pendiente',paymentMethod:'Crédito Proveedor',status:'Recibido',inventoryBefore,inventoryAfter:{stock:p.stock,cost:p.cost}};
    state.purchases.unshift(po);
    if(scrap)Object.assign(po,{materialForm:'scrapGold'});
    if(lot)Object.assign(po,{inventoryMode:'chainLot',lotCode:p.lotCode,unitCount:args.unitCount,itemsCount:args.unitCount,inventoryAfter:{...po.inventoryAfter,stockUnits:p.stockUnits}});
    const pending=state.supplierCredits.filter(c=>same(c.supplier,supp.name)&&Number(c.pendingAmount)>0);
    let cp=args.creditId?find('supplierCredits',args.creditId):(args.paid?null:pending.length===1?pending[0]:null);
    if(cp&&!same(cp.supplier,supp.name))throw error('El crédito elegido pertenece a otro proveedor.');
    if(!cp){cp={id:nextId('CP'),supplier:supp.name,supplierId:supp.id,totalOwed:0,paidAmount:0,pendingAmount:0,purchaseOrderIds:[],date,dueDate:new Date(now+30*86400000).toISOString().slice(0,10)};state.supplierCredits.push(cp);}
    cp.purchaseOrderIds ||= [];cp.purchaseOrderIds.push(po.id);cp.totalOwed=L.money(Number(cp.totalOwed)+total);cp.pendingAmount=L.money(Number(cp.pendingAmount)+total);supp.creditBalance=L.money(Number(supp.creditBalance||0)+total);po.debtCreditId=cp.id;refreshSupplierCredit(cp);
    if(args.paid){supplierPayment({creditId:cp.id,purchaseId:po.id,amount:total,method:args.method,targetAccount:args.targetAccount});po.paymentMethod=args.method || 'Efectivo';po.targetAccount=args.targetAccount || 'Caja Mostrador (Efectivo)';}
  }
  function reverseSale() {
    const tx=find('recentTransactions',args.saleId);if(!active(tx))throw error('La venta ya está reversada.','ALREADY_REVERSED');
    if(!tx.items?.length)throw error('La venta no contiene un detalle verificable.');
    const restores=new Map(),lotRestores=new Map();
    for(const item of tx.items){const p=state.products.find(p=>p.id===item.id&&String(p.sku)===String(item.sku));if(!p)throw error(`El SKU ${item.sku || item.id} no existe con su identidad original. Revisa el informe de conciliación.`);const quantity=I.restoreQuantity(item,p);restores.set(p.id,I.round((restores.get(p.id)||0)+quantity));}
    for(const item of tx.items){const p=state.products.find(p=>p.id===item.id);if(I.isChainLot(p)){const movement=I.lotItem(p,item);const base=lotRestores.get(p.id)||p;lotRestores.set(p.id,{...p,...I.lotMovement(base,movement.grams,movement.units,1)});}}
    let principal=0,refundedPayments=0,credit;
    if(L.debt(tx.paymentMethod)){
      credit=creditForSale(tx);principal=/separe/i.test(tx.paymentMethod)?Number(tx.separePending || 0):Number(tx.total);
      const linked=[...new Set([credit.txId,...(credit.mergedTxIds||[])].filter(Boolean))];
      for(const receipt of state.abonosVentas.filter(a=>Number(a.amount)>0&&(a.creditId===credit.id||linked.includes(a.invoiceId)))){
        const allocations=receiptAllocations(receipt,'customer');receipt.allocations ||=clone(allocations);
        for(const allocation of receipt.allocations.filter(a=>a.invoiceId===tx.id)){const value=L.money(Number(allocation.amount)-Number(allocation.reversedAmount||0));if(value>0){move(L.movementAccount(receipt.targetAccount,receipt.method,state),-value,'sale_refund',tx.id);reduceReceipt(receipt,allocation,value);refundedPayments+=value;}}
      }
      if(refundedPayments>principal+.005)throw error('Los abonos distribuidos superan el principal de esta factura.');
      const pending=L.money(principal-refundedPayments);if(pending>Number(credit.currentBalance)+.005)throw error('El saldo del crédito no coincide con el pendiente de esta factura.');
      credit.currentBalance=L.money(Number(credit.currentBalance)-pending);credit.totalGranted=Math.max(0,L.money(Number(credit.totalGranted)-Number(tx.total)));credit.mergedTxIds=linked.filter(t=>t!==tx.id);if(credit.txId===tx.id)credit.txId=credit.mergedTxIds[0] || null;refreshCustomerCredit(credit);
      const cust=customer(tx.customer);if(pending>Number(cust.creditBalance)+.005)throw error('El directorio del cliente no coincide con la deuda.');cust.creditBalance=L.money(Number(cust.creditBalance)-pending);
    }
    if(Number(tx.bankFeeAmount)>0){
      if(typeof args.refundBankFee!=='boolean')throw error('Confirma si el recargo bancario fue devuelto al cliente.');
      if(args.refundBankFee){const card=L.saleParts(tx,state).find(p=>/tarjeta|card/i.test(p.method));if(!card)throw error('No se pudo identificar la cuenta de devolución del recargo.');move(card.accountKey,-Number(tx.bankFeeAmount),'sale_refund',tx.id);profitAdjustment=L.money(profitAdjustment-Number(tx.bankFeeAmount));tx.bankFeeRefunded=Number(tx.bankFeeAmount);}
    }
    for(const part of L.saleParts(tx,state))move(part.accountKey,-part.amount,'sale_refund',tx.id);
    for(const [pid,quantity]of restores){const p=find('products',pid);p.stock=I.round(Number(p.stock)+quantity);p.sold30d=Math.max(0,Number(p.sold30d||0)-quantity);if(p.status!=='inactive')p.status=Number(p.stock)>Number(p.minStock||0)?'active':'low_stock';}
    for(const [pid,balance]of lotRestores)Object.assign(find('products',pid),{stock:balance.stock,stockUnits:balance.stockUnits});
    tx.status='Reversada';tx.reversalOperationId=id;tx.reversedAt=new Date(now).toISOString();tx.reversedBy=user.name;tx.cashRefunded=0;tx.refundShiftId=null;
  }
  function voidSupplierPayment() {
    const receipt=find('abonosCompras',args.paymentId);if(Number(receipt.amount)<=0)throw error('El abono ya está anulado.','ALREADY_REVERSED');
    receipt.allocations ||=clone(receiptAllocations(receipt,'supplier'));
    const total=Number(receipt.amount),supp=supplier(receipt.supplier,receipt.supplierId);
    for(const a of receipt.allocations){const value=L.money(Number(a.amount)-Number(a.reversedAmount||0));if(!value)continue;const cp=find('supplierCredits',a.creditId || a.openingCreditId);if(value>Number(cp.paidAmount)+.005)throw error('El abono no coincide con el total pagado del crédito.');if(a.purchaseId){const po=find('purchases',a.purchaseId);if(value>Number(po.paidAmount)+.005||!active(po))throw error('La compra no permite deshacer esta distribución.');po.paidAmount=L.money(Number(po.paidAmount)-value);refreshPo(po);}cp.pendingAmount=L.money(Number(cp.pendingAmount)+value);cp.paidAmount=L.money(Number(cp.paidAmount)-value);refreshSupplierCredit(cp);reduceReceipt(receipt,a,value);}
    supp.creditBalance=L.money(Number(supp.creditBalance)+total);move(L.movementAccount(receipt.targetAccount,receipt.method,state),total,'supplier_refund',receipt.id);
  }
  function adjustSupplierDebt(input) {
    const cp=find('supplierCredits',input.creditId),supp=supplier(cp.supplier,cp.supplierId),target=amount(input.pendingAmount,true),delta=L.money(target-Number(cp.pendingAmount));
    if(!delta)return;
    if(delta<0){let left=-delta;const pos=state.purchases.filter(p=>active(p)&&(cp.purchaseOrderIds||[]).includes(p.id)&&remaining(p)>0).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));for(const po of pos){const value=Math.min(left,remaining(po));po.creditAdjustment=L.money(Number(po.creditAdjustment||0)+value);left=L.money(left-value);refreshPo(po);if(!left)break;}cp.adjustedAmount=L.money(Number(cp.adjustedAmount||0)-delta);}
    cp.pendingAmount=target;cp.totalOwed=L.money(Number(cp.totalOwed)+delta);if(cp.totalOwed<Number(cp.paidAmount))throw error('El ajuste dejaría la deuda por debajo de los pagos registrados.');supp.creditBalance=L.money(Number(supp.creditBalance)+delta);if(supp.creditBalance<0)throw error('El ajuste supera la deuda del proveedor.');refreshSupplierCredit(cp);
    // An adjustment changes an obligation, never an actual payment or bank balance.
  }
  const inventoryChange=(po,newQuantity,newUnitCost,newTotal,reversing=false)=>{
    const p=state.products.find(p=>p.id===po.productId&&String(p.sku)===String(po.productSku));if(!p)throw error('No se encontró el producto original de esta compra.');
    if(I.isScrapGold(p)&&!reversing&&!I.validScrapWeight(newQuantity))throw error('El peso de la chatarra debe ser al menos 0,000001 g y admite hasta seis decimales.','INVALID_SCRAP_WEIGHT');
    if((po.measureType || p.measureType)!==p.measureType)throw error('La medida de esta compra no coincide con el producto.');
    const oldQty=Number(po.quantity),toUnits=q=>I.isPesaje(p)?q/I.factor(p.weightUnit):q;
    let lotBalance=null;
    if(I.isChainLot(p)){
      if(!reversing)throw error('Para corregir cantidades o costos de un lote, revierte el ingreso y registra uno nuevo.');
      const movement=I.lotItem(p,{...po,qty:oldQty,unit:'g'});lotBalance=I.lotMovement(p,movement.grams,movement.units);
    }
    const delta=reversing?-toUnits(oldQty):toUnits(newQuantity-oldQty);
    if(Number(p.stock)+delta < -0.000001)throw error('No hay existencias suficientes para retirar la mercancía de esta compra.','INSUFFICIENT_STOCK');
    const untouched=po.inventoryBefore&&po.inventoryAfter&&Math.abs(Number(p.stock)-Number(po.inventoryAfter.stock))<.000001&&Math.abs(Number(p.cost)-Number(po.inventoryAfter.cost))<.0001&&(!I.isChainLot(p)||p.stockUnits===po.inventoryAfter.stockUnits);
    const valuation=()=>Number(p.stock)*Number(p.cost)*(!I.isPesaje(p)&&I.weight(p)>0?I.weight(p):1);
    const previousValue=valuation();
    if(untouched){Object.assign(p,{stock:po.inventoryBefore.stock,cost:po.inventoryBefore.cost});if(!reversing)Object.assign(p,I.replenishment(p,newQuantity,newUnitCost,Number(po.productGrams||0)));}
    else {
      if(args.inventoryPolicy!=='carrying')throw error('El inventario cambió después de esta compra. Confirma conservar el costo actual y registrar la diferencia de valor.');
      p.stock=I.round(Number(p.stock)+delta);
    }
    if(lotBalance)Object.assign(p,lotBalance);
    const valueDelta=L.money(valuation()-previousValue);
    profitAdjustment=L.money(profitAdjustment+(reversing?Number(po.total)+valueDelta:valueDelta-(newTotal-Number(po.total))));
    p.status=p.status==='inactive'?'inactive':(Number(p.stock)<=0?'out_of_stock':Number(p.stock)<=Number(p.minStock||0)?'low_stock':'active');
    return p;
  };
  function reversePurchase() {
    const po=find('purchases',args.purchaseId);if(!active(po))throw error('La compra ya está reversada.','ALREADY_REVERSED');
    const cp=creditForPurchase(po),supp=supplier(po.supplier,po.supplierId),pending=remaining(po);
    const receipts=[];let paidByReceipts=0;
    for(const receipt of state.abonosCompras.filter(a=>same(a.supplier,po.supplier)&&Number(a.amount)>0)){
      // Receipts for an unrelated explicit credit cannot belong to this order.
      if(receipt.poId!==po.id&&receipt.poId!==cp?.id&&receipt.creditId!==cp?.id&&!receipt.allocations?.some(a=>a.purchaseId===po.id))continue;
      if(!receipt.allocations && receipt.poId!==po.id)continue;
      receipt.allocations ||=clone(receiptAllocations(receipt,'supplier'));
      for(const a of receipt.allocations.filter(a=>a.purchaseId===po.id)){const value=L.money(Number(a.amount)-Number(a.reversedAmount||0));if(value>0){receipts.push({receipt,allocation:a,value});paidByReceipts+=value;}}
    }
    const direct=L.purchaseDirect(po,state);
    if(Math.abs(Number(po.paidAmount||0)-paidByReceipts-direct)>.01)throw error('Los pagos de esta compra no están distribuidos completamente. Concílialos antes de devolverla.');
    inventoryChange(po,0,0,0,true);
    if(cp){if(pending>Number(cp.pendingAmount)+.005)throw error('El saldo de la orden supera la deuda del crédito.');cp.pendingAmount=L.money(Number(cp.pendingAmount)-pending);cp.paidAmount=Math.max(0,L.money(Number(cp.paidAmount||0)-paidByReceipts));cp.totalOwed=L.money(Number(cp.totalOwed)-pending-paidByReceipts);refreshSupplierCredit(cp);}
    if(pending>Number(supp.creditBalance)+.005)throw error('El saldo de la orden no coincide con el directorio.');supp.creditBalance=L.money(Number(supp.creditBalance)-pending);
    if(direct)move(L.movementAccount(po.targetAccount,po.paymentMethod,state),direct,'supplier_refund',po.id);
    for(const {receipt,allocation,value}of receipts){move(L.movementAccount(receipt.targetAccount,receipt.method,state),value,'supplier_refund',po.id);reduceReceipt(receipt,allocation,value);}
    po.status='Reversada';po.reversalOperationId=id;po.reversedAt=new Date(now).toISOString();po.directPaidAmount ??=direct;
  }
  function editPurchase() {
    const po=find('purchases',args.purchaseId);if(!active(po))throw error('No se puede editar una compra reversada.');
    if(args.supplier&& !same(args.supplier,po.supplier))throw error('Para cambiar el acreedor, concilia el traslado de deuda por separado. No se modificarán pagos de otro proveedor.');
    if(args.productSku&&String(args.productSku)!==String(po.productSku))throw error('El SKU histórico de la compra no se puede sustituir.');
    const unchangedNumbers=['quantity','unitCost','total','paidAmount'].every(key=>args[key]===undefined||Number(args[key])===Number(po[key]||0));
    if(args.productName!==undefined&&unchangedNumbers&&(!args.date||args.date===po.date)){
      correctPurchaseName(state,po,args.productName);po.edited=true;po.updatedAt=new Date(now).toISOString();metadataOnly=true;return;
    }
    const quantity=Number(args.quantity ?? po.quantity),unitCost=amount(args.unitCost ?? po.unitCost,true),total=amount(args.total ?? po.total);
    if(!Number.isFinite(quantity)||quantity<=0)throw error('Cantidad de compra inválida.');
    const paid=Number(po.paidAmount||0),targetPaid=amount(args.paidAmount ?? paid,true),adjustment=Number(po.creditAdjustment||0);
    if(targetPaid>total-adjustment+.005)throw error('Lo pagado supera el total de la compra.');
    const originalCredit=creditForPurchase(po);
    const oldPending=remaining(po),deltaTotal=L.money(total-Number(po.total));
    if(quantity!==Number(po.quantity)||unitCost!==Number(po.unitCost)||total!==Number(po.total)){
      inventoryChange(po,quantity,unitCost,total);po.quantity=quantity;po.totalGrams=I.isPesaje(find('products',po.productId))?quantity:I.round(quantity*Number(po.productGrams||0));po.itemsCount=po.measureType==='Pesaje'?1:quantity;po.unitCost=unitCost;po.total=total;po.inventoryAfter={stock:find('products',po.productId).stock,cost:find('products',po.productId).cost};
    }
    const cp=originalCredit,supp=supplier(po.supplier,po.supplierId),newPending=remaining(po),debtDelta=L.money(newPending-oldPending);
    if(debtDelta){let credit=cp;if(!credit){credit={id:nextId('CP'),supplier:supp.name,supplierId:supp.id,totalOwed:0,paidAmount:0,pendingAmount:0,purchaseOrderIds:[po.id],date};state.supplierCredits.push(credit);po.debtCreditId=credit.id;}credit.pendingAmount=L.money(Number(credit.pendingAmount)+debtDelta);credit.totalOwed=L.money(Number(credit.totalOwed)+debtDelta);supp.creditBalance=L.money(Number(supp.creditBalance)+debtDelta);if(credit.pendingAmount<0||supp.creditBalance<0)throw error('El cambio no coincide con el saldo del proveedor.');refreshSupplierCredit(credit);}
    if(targetPaid>paid){if(!args.payment)throw error('Indica el método y la cuenta del pago adicional.');supplierPayment({...args.payment,purchaseId:po.id,amount:targetPaid-paid});}
    if(targetPaid<paid){const parts=args.refundAllocations || [];if(Math.abs(parts.reduce((s,p)=>s+Number(p.amount||0),0)-(paid-targetPaid))>.01)throw error('Selecciona los abonos específicos que se devolvieron.');for(const part of parts){const receipt=find('abonosCompras',part.paymentId);receipt.allocations ||=clone(receiptAllocations(receipt,'supplier'));const a=receipt.allocations.find(a=>a.purchaseId===po.id&&Number(a.amount)-Number(a.reversedAmount||0)>=Number(part.amount));if(!a)throw error('El abono seleccionado no cubre la devolución de esta compra.');const value=amount(part.amount),credit=find('supplierCredits',a.creditId);po.paidAmount=L.money(Number(po.paidAmount)-value);credit.paidAmount=L.money(Number(credit.paidAmount)-value);credit.pendingAmount=L.money(Number(credit.pendingAmount)+value);supp.creditBalance=L.money(Number(supp.creditBalance)+value);reduceReceipt(receipt,a,value);move(L.movementAccount(receipt.targetAccount,receipt.method,state),value,'supplier_refund',po.id);refreshSupplierCredit(credit);}}
    if(args.date){if(!/^\d{4}-\d{2}-\d{2}$/.test(args.date))throw error('Fecha inválida.');po.date=args.date;}
    if(args.productName!==undefined)correctPurchaseName(state,po,args.productName);
    po.edited=true;po.updatedAt=new Date(now).toISOString();refreshPo(po);
  }
  function reconcilePayment(kind) {
    const receipt=find(kind==='supplier'?'abonosCompras':'abonosVentas',args.paymentId);if(receipt.allocations?.length)throw error('El abono ya tiene una distribución registrada.');
    if(!Array.isArray(args.allocations)||!args.allocations.length)throw error('Indica la distribución del abono.');
    const total=args.allocations.reduce((s,a)=>s+amount(a.amount),0);if(Math.abs(total-Number(receipt.amount))>.01)throw error('La distribución debe sumar exactamente el abono.');
    const seen=new Set();
    for(const a of args.allocations){const key=a.purchaseId||a.invoiceId||a.openingCreditId;if(!key||seen.has(key))throw error('Referencia duplicada o ausente en la distribución.');seen.add(key);
      const collection=kind==='supplier'?'abonosCompras':'abonosVentas';
      const allocated=state[collection].filter(r=>r.id!==receipt.id).flatMap(r=>r.allocations||[]).filter(x=>(a.purchaseId&&x.purchaseId===a.purchaseId)||(a.invoiceId&&x.invoiceId===a.invoiceId)||(a.openingCreditId&&x.openingCreditId===a.openingCreditId)).reduce((v,x)=>v+Number(x.amount)-Number(x.reversedAmount||0),0);
      if(kind==='supplier'){const cp=find('supplierCredits',a.creditId || a.openingCreditId);if(!same(cp.supplier,receipt.supplier))throw error('El crédito pertenece a otro proveedor.');if(a.openingCreditId&&Number(a.amount)+allocated>Number(cp.paidAmount)+.005)throw error('Las distribuciones exceden los pagos del saldo inicial.');if(a.purchaseId){const po=find('purchases',a.purchaseId);if(!active(po)||!(cp.purchaseOrderIds||[]).includes(po.id)&&po.debtCreditId!==cp.id&&cp.poId!==po.id)throw error('La compra no está vinculada al crédito elegido.');if(!same(po.supplier,receipt.supplier)||Number(a.amount)+allocated>Number(po.paidAmount)+.005)throw error('El abono no coincide con lo pagado en esta compra.');}}
      else {const cp=find('customerCredits',a.creditId || a.openingCreditId);if(!same(cp.customer,receipt.customer))throw error('El crédito pertenece a otro cliente.');if(a.openingCreditId&&Number(a.amount)+allocated>Number(cp.totalGranted)-Number(cp.currentBalance)+.005)throw error('Las distribuciones exceden los pagos del saldo inicial.');if(a.invoiceId){const tx=find('recentTransactions',a.invoiceId);if(!active(tx)||cp.txId!==tx.id&&!(cp.mergedTxIds||[]).includes(tx.id))throw error('La factura no está vinculada al crédito elegido.');if(!same(tx.customer,receipt.customer)||!L.debt(tx.paymentMethod)||Number(a.amount)+allocated>(/separe/i.test(tx.paymentMethod)?Number(tx.separePending):Number(tx.total)))throw error('El abono no coincide con esta factura.');}}
    }
    receipt.allocations=args.allocations.map(a=>({...a,amount:amount(a.amount),reversedAmount:0}));receipt.allocationEvidence=args.reason;
  }
  function linkCredit() {
    const credit=find('customerCredits',args.creditId);if(!Array.isArray(args.invoiceIds)||!args.invoiceIds.length)throw error('Selecciona las facturas del crédito.');
    const invoices=args.invoiceIds.map(target=>find('recentTransactions',target));if(invoices.some(t=>!same(t.customer,credit.customer)||!L.debt(t.paymentMethod)))throw error('Las facturas no corresponden al cliente o no son a crédito.');
    if(state.customerCredits.some(c=>c.id!==credit.id&&args.invoiceIds.some(target=>c.txId===target||(c.mergedTxIds||[]).includes(target))))throw error('Una factura ya está vinculada a otro crédito.');
    credit.txId=args.invoiceIds[0];credit.mergedTxIds=[...new Set(args.invoiceIds)];credit.linkEvidence=args.reason;
  }
  function historicalItem(){const tx=find('recentTransactions',args.saleId),index=Number(args.itemIndex);if(!Number.isInteger(index)||!tx.items?.[index])throw error('Renglón de venta inválido.');if(!String(args.reference||'').trim())throw error('Indica el soporte que demuestra esta corrección.');return {tx,item:tx.items[index]};}
  function setHistoricalCost(){const {item}=historicalItem();if(I.historicalCost(item)!==null)throw error('Este renglón ya conserva su costo. No se sobrescribirá.');item.cogsTotal=amount(args.totalCost,true);item.costEvidence={reference:args.reference,verifiedBy:user.id,recordedAt:new Date(now).toISOString()};}
  function restoreHistoricalProduct(){const {item}=historicalItem();if(state.products.some(p=>p.id===item.id||I.sku(p.sku)===I.sku(item.sku)))throw error('El ID o SKU ya existe. Usa la conciliación de identidad, sin duplicarlo.');const category=state.categories.find(c=>c.id===args.category);if(!category)throw error('Selecciona una categoría válida.');const cost=amount(args.cost,true),measureType=item.measureType || 'Pesaje',extra=category.type==='extras'||category.isExtra,pieceWeight=extra?0:Number(item.pieceWeight || 0);if(measureType==='Unidades'&&!extra&&pieceWeight<=0)throw error('El peso original por pieza necesita soporte antes de recuperar el producto.');state.products.push({id:item.id,sku:item.sku,name:item.name,category:category.id,categoryName:category.name,measureType,isExtra:!!extra,weightUnit:measureType==='Pesaje'?item.unit || 'g':'u.',unit:measureType==='Pesaje'?item.unit || 'g':'u.',pieceWeight,weight:pieceWeight,cost,stock:0,price:0,status:'out_of_stock',minStock:measureType==='Pesaje'?.5:1,recoveryEvidence:{reference:args.reference,verifiedBy:user.id,timestamp:now}});}
  function reconcileProductIdentity(){const {item}=historicalItem();const p=find('products',args.productId);if(I.sku(p.sku)!==I.sku(item.sku))throw error('La identidad solo puede conciliarse con el mismo SKU, nunca con otro producto del mismo nombre.');I.restoreQuantity(item,p);item.originalProductId ||=item.id;item.id=p.id;item.identityEvidence={reference:args.reference,verifiedBy:user.id,timestamp:now};}
  function setMovementExclusion(){const po=find('purchases',args.purchaseId);if(typeof args.excludeFromCashShift!=='boolean'||typeof args.excludeFromTreasury!=='boolean')throw error('Indica expresamente el tratamiento en caja y tesorería.');po.excludeFromCashShift=args.excludeFromCashShift;po.excludeFromTreasury=args.excludeFromTreasury;po.exclusionEvidence=args.reason;}
  function voidExpense(input=args){
    const exp=find('expenses',input.expenseId);if(!active(exp))throw error('El gasto ya está anulado.','ALREADY_REVERSED');
    move(L.movementAccount(exp.targetAccount,exp.method||'Efectivo',state),Number(exp.amount),'expense_refund',exp.id);
    exp.status='Anulado';exp.reversalOperationId=id;exp.reversedAt=new Date(now).toISOString();
  }
  function editExpense(){
    const exp=find('expenses',args.expenseId);voidExpense();
    const value=amount(args.amount),method=String(args.method||'');if(L.debt(method))throw error('Un gasto requiere un método de pago efectivo.');
    const key=L.movementAccount(args.targetAccount,method,state);if(!key)throw error('Selecciona la cuenta del nuevo gasto.');cashCheck(key);
    state.expenses.unshift({id:nextId('EXP'),...metadata(),description:String(args.description||exp.description),category:String(args.category||exp.category),amount:value,method,targetAccount:args.targetAccount,isBank:key!=='efectivo_caja',replacesExpenseId:exp.id});
  }
  function reverseAccountAdjustment(){
    const target=find('accountAdjustments',args.adjustmentId);if(target.operationId||target.movementType)throw error('Una corrección documentada no se elimina; concilia su operación de origen.');
    const legs=target.linkedTransferId?state.accountAdjustments.filter(a=>a.linkedTransferId===target.linkedTransferId):[target];
    if(legs.some(a=>a.reversalOperationId))throw error('El ajuste ya fue reversado.','ALREADY_REVERSED');
    if(target.linkedTransferId&&(legs.length!==2||Math.abs(legs.reduce((sum,a)=>sum+Number(a.amount)*(a.isIncome?1:-1),0))>.01))throw error('La transferencia original necesita conciliación.');
    for(const leg of legs){move(leg.accountKey,Number(leg.amount)*(leg.isIncome?-1:1),'adjustment_reversal',leg.id);leg.reversalOperationId=id;leg.reversedAt=new Date(now).toISOString();}
  }
  const handlers={voidExpense,editExpense,reverseAccountAdjustment,createPurchase,reverseSale,reversePurchase,editPurchase,voidSupplierPayment,adjustSupplierDebt:()=>adjustSupplierDebt(args),supplierPayment:()=>supplierPayment(args),customerPayment:()=>customerPayment(args),reconcileSupplierPayment:()=>reconcilePayment('supplier'),reconcileCustomerPayment:()=>reconcilePayment('customer'),linkCustomerCredit:linkCredit,setHistoricalCost,restoreHistoricalProduct,reconcileProductIdentity,setMovementExclusion};
  if(command.type==='setCategoryInventoryScope'){
    const category=find('categories',args.categoryId);
    if(!['principal','extra'].includes(args.scope))throw error('Selecciona un grupo de inventario válido.');
    if(args.scope==='principal'&&(category.type==='extras'||category.isExtra))throw error('Los Extras por unidad conservan su grupo; no se convierten a metales.');
    category.inventoryScope=args.scope;
    // Reporting separation never changes quantities, measures, costs or history.
    if(!isDeepStrictEqual(state.products,original.products))throw error('La separación no puede modificar productos.');
  }else{
    if(!handlers[command.type])throw error('Tipo de operación no admitido.','UNKNOWN_OPERATION');
    handlers[command.type]();
  }
  const changes=[];
  for(const key of collectionNames){const before=new Map((original[key]||[]).map(x=>[x.id,x]));for(const after of state[key])if(!isDeepStrictEqual(before.get(after.id),after))changes.push({collection:key,id:after.id,before:before.get(after.id)||null,after:clone(after)});}
  const audit={id,operationId:id,type:command.type,requestHash:operationHash(command.type,args),timestamp:now,date,actorId:user.id,actor:user.name,reason:args.reason,profitAdjustment,changes,...(metadataOnly?{metadataOnly:true}:{})};
  state.financialLedger.push(audit);
  return {state,audit};
}
module.exports={executeOperation,operationHash,remaining};
