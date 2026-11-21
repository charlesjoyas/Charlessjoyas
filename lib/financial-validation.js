'use strict';
const {isDeepStrictEqual}=require('util');
const L=require('../js/ledger');
const I=require('../js/safety');
const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status,code:'FINANCIAL_VALIDATION'});};
const map=xs=>new Map((xs||[]).map(x=>[x.id,x]));
function coreValidation(state,previous=null) {
  for(const key of ['products','recentTransactions','purchases','customers','suppliers','customerCredits','supplierCredits','expenses','abonosVentas','abonosCompras','cashShiftsHistory','categories','accountAdjustments','assets','services','paymentMethods','financialLedger']){
    if(!Array.isArray(state[key] || []))bad(`Colección inválida: ${key}.`);
    const ids=new Set();
    for(const record of state[key] || []){if(!record||!record.id||ids.has(record.id))bad(`Identificador inválido o duplicado en ${key}.`);ids.add(record.id);}
  }
  const numeric={products:['stock','cost','price'],purchases:['total','paidAmount','quantity','unitCost','creditAdjustment'],customerCredits:['currentBalance','totalGranted'],supplierCredits:['pendingAmount','paidAmount','totalOwed'],abonosVentas:['amount'],abonosCompras:['amount'],expenses:['amount'],accountAdjustments:['amount'],customers:['creditBalance','creditLimit'],suppliers:['creditBalance'],assets:['currentVal','costValue'],services:['price']};
  for(const [key,fields]of Object.entries(numeric))for(const record of state[key] || []){
    const old=(previous?.[key] || []).find(r=>r.id===record.id);
    // Legacy anomalies remain visible for reconciliation; they are never silently repaired.
    if(old&&isDeepStrictEqual(old,record))continue;
    for(const f of fields)if(record[f]!==undefined&&(record[f]===null||!Number.isFinite(Number(record[f]))||Number(record[f])<0))bad(`Importe inválido: ${key}.${f}.`);
    if(key==='purchases'&&Number(record.paidAmount||0)+Number(record.creditAdjustment||0)>Number(record.total)+.01)bad('El pago y los ajustes superan el total de la compra.');
    if(key==='customerCredits'&&Number(record.currentBalance)>Number(record.totalGranted)+.01)bad('El saldo del crédito supera el principal.');
    if(key==='supplierCredits'&&Math.abs(Number(record.totalOwed)-Number(record.paidAmount||0)-Number(record.pendingAmount||0))>.01)bad('El principal del proveedor debe coincidir con pagado más pendiente.');
  }
  for(const [directory,credits,name,balance]of [['customers','customerCredits','customer','currentBalance'],['suppliers','supplierCredits','supplier','pendingAmount']]){
    for(const entity of state[directory] || []){
      const old=(previous?.[directory]||[]).find(e=>e.id===entity.id);
      const before=(previous?.[credits]||[]).filter(c=>L.norm(c[name])===L.norm(old?.name)).reduce((s,c)=>s+Number(c[balance]||0),0);
      const after=(state[credits]||[]).filter(c=>L.norm(c[name])===L.norm(entity.name)).reduce((s,c)=>s+Number(c[balance]||0),0);
      const oldDifference=old?Number(old.creditBalance||0)-before:0,newDifference=Number(entity.creditBalance||0)-after;
      if(Math.abs(oldDifference-newDifference)>.01)bad(`El saldo del directorio no coincide con el movimiento de ${credits}.`);
    }
  }
}
function validateSnapshotFinance(next,current,user,can) {
  next.accountAdjustments ||= [];
  next.financialLedger ||= [];
  if(!isDeepStrictEqual(next.financialLedger || [],current.financialLedger || []))bad('El historial de auditoría solo se modifica mediante operaciones verificadas.',403);
  const immutable=['purchases','abonosVentas','abonosCompras','customerCredits','supplierCredits','accountAdjustments','expenses'];
  const permittedNew={purchases:false,abonosVentas:false,abonosCompras:false,accountAdjustments:can(['formas_pago'])&&/admin|gerente|supervisor/i.test(user.role||''),expenses:can(['gastos','pos','cuadre_caja']),customerCredits:can(['pos','clientes','creditos_clientes']),supplierCredits:false};
  const newSales=next.recentTransactions.filter(t=>!current.recentTransactions.some(o=>o.id===t.id));
  for(const key of immutable){const old=map(current[key]),now=map(next[key]);
    for(const [id,before]of old){const after=now.get(id);if(!after)bad(`No se eliminan registros de ${key}; usa su operación documentada.`,403);
      if(isDeepStrictEqual(before,after))continue;
      const a={...before},b={...after};
      if(b.closedShiftId===current.cashShiftLog?.shiftId&&a.closedShiftId===undefined&&can(['cuadre_caja']))delete b.closedShiftId;
      if(!a.shiftId&&b.shiftId===current.cashShiftLog?.shiftId&&next.cashShiftLog?.status==='Cerrado'&&L.inShift(before,current.cashShiftLog))delete b.shiftId;
      // Existing credit aggregation is allowed only for a corresponding new sale.
      if(key==='customerCredits'&&newSales.some(t=>t.customer===after.customer))for(const f of ['totalGranted','currentBalance','status','txId','mergedTxIds']){delete a[f];delete b[f];}
      const dir=key==='customerCredits'||key==='abonosVentas'?'customers':'suppliers',field=dir==='customers'?'customer':'supplier';
      if(a[field]!==b[field]&&can([dir==='customers'?'clientes':'proveedores'])&&current[dir]?.some(e=>e.name===a[field]&&next[dir]?.some(n=>n.id===e.id&&n.name===b[field])))a[field]=b[field];
      if(!isDeepStrictEqual(a,b))bad(`La modificación de ${key} necesita una operación documentada.`,403);
    }
    if([...now.keys()].some(id=>!old.has(id))&&!permittedNew[key])bad(`Registra ${key} mediante la operación del servidor.`,403);
  }
  for(const tx of newSales){
    if(!String(tx.paymentMethod||'').trim())bad('Selecciona un método de pago.');
    const parts=L.saleParts(tx,next);if(parts.some(p=>!p.accountKey||!Number.isFinite(p.amount)||p.amount<0))bad('Distribución de pago inválida.');
    if(tx.mixedPayments?.length){if(tx.mixedPayments.length<2||tx.mixedPayments.some(p=>L.debt(p.method)||!Number.isFinite(Number(p.amount))||Number(p.amount)<=0)||Math.abs(parts.reduce((v,p)=>v+p.amount,0)-tx.total)>.01)bad('Los pagos mixtos deben sumar exactamente la venta y no contienen crédito.');}
    else if(!L.debt(tx.paymentMethod)&&Math.abs(parts.reduce((v,p)=>v+p.amount,0)-tx.total)>.01)bad('El pago no coincide con la venta.');
    if(/separe/i.test(tx.paymentMethod)&&(!Number.isFinite(Number(tx.separeAbono))||Number(tx.separeAbono)<0||Math.abs(Number(tx.separeAbono)+Number(tx.separePending)-tx.total)>.01))bad('El abono inicial y el saldo del separe no coinciden con la venta.');
    if(L.debt(tx.paymentMethod)){
      const customer=next.customers.find(c=>c.name===tx.customer);if(!customer)bad('La venta a crédito requiere un cliente registrado.');
      if(Number(customer.creditBalance)>Number(customer.creditLimit||0)+.01&&(!/admin|gerente|supervisor/i.test(user.role||'')||!String(tx.creditLimitOverride?.reason||'').trim()||tx.creditLimitOverride.authorizedBy!==user.id))bad('La venta supera el cupo autorizado del cliente y necesita una excepción administrativa documentada.');
    }
  }
  const creditExpected=new Map();
  for(const tx of newSales)if(L.debt(tx.paymentMethod)){const value=/separe/i.test(tx.paymentMethod)?Number(tx.separePending):Number(tx.total);if(!Number.isFinite(value)||value<0||value>tx.total)bad('Principal de crédito inválido.');creditExpected.set(tx.customer,(creditExpected.get(tx.customer)||0)+value);}
  for(const [dir,portfolio,field,balance,module]of [['customers','customerCredits','customer','currentBalance','clientes'],['suppliers','supplierCredits','supplier','pendingAmount','proveedores']]){
    const before=map(current[dir]);
    for(const entity of next[dir]){
      const old=before.get(entity.id);
      if(!old){if(!can([module, ...(dir==='customers'?['pos']:[])]))bad('No tienes permiso para crear este tercero.',403);const expected=dir==='customers'?(creditExpected.get(entity.name)||0):0;if(Math.abs(Number(entity.creditBalance||0)-expected)>.01)bad('Un tercero nuevo no recibe saldo sin una operación documentada.');continue;}
      const expected=dir==='customers'?(creditExpected.get(entity.name)||0):0;
      if(Math.abs(Number(entity.creditBalance||0)-Number(old.creditBalance||0)-expected)>.01)bad('El saldo de un tercero solo cambia con una venta, abono o ajuste documentado.',403);
      const a={...old},b={...entity};delete a.creditBalance;delete b.creditBalance;
      if(!isDeepStrictEqual(a,b)&&(!can([module])||(/cajer|operad|vendedor/i.test(user.role||'')&&dir==='customers')))bad('Sin permiso para editar los datos de este tercero.',403);
      const oldSum=(current[portfolio]||[]).filter(c=>c[field]===old.name).reduce((s,c)=>s+Number(c[balance]||0),0),newSum=(next[portfolio]||[]).filter(c=>c[field]===entity.name).reduce((s,c)=>s+Number(c[balance]||0),0);
      if(Math.abs(newSum-oldSum-expected)>.01)bad('La cartera no coincide con las operaciones registradas.');
    }
    for(const entity of current[dir])if(!next[dir].some(e=>e.id===entity.id)&&(Number(entity.creditBalance)>0||!can([module])||!/admin|gerente|supervisor/i.test(user.role||'')))bad('No se puede eliminar este tercero o su saldo.',403);
  }
  const customerNames=new Set([...current.customerCredits,...next.customerCredits].map(c=>c.customer));
  for(const name of customerNames){
    const principal=xs=>xs.filter(c=>c.customer===name).reduce((v,c)=>v+Number(c.totalGranted||0),0);
    const rename=current.customers.some(c=>c.name===name&&next.customers.some(n=>n.id===c.id&&n.name!==name))||next.customers.some(c=>c.name===name&&current.customers.some(n=>n.id===c.id&&n.name!==name));
    if(!rename){const expected=newSales.filter(t=>t.customer===name&&L.debt(t.paymentMethod)).reduce((v,t)=>v+Number(t.total),0);if(Math.abs(principal(next.customerCredits)-principal(current.customerCredits)-expected)>.01)bad('El principal de los créditos no coincide con las facturas nuevas.');}
  }
  const hist=map(next.cashShiftsHistory);
  for(const before of current.cashShiftsHistory || [])if(!isDeepStrictEqual(before,hist.get(before.id)))bad('Los cierres históricos son inmutables. La corrección debe aparecer en el turno actual.',403);
  const a=current.cashShiftLog || {},b=next.cashShiftLog || {};
  const newHistory=next.cashShiftsHistory.filter(h=>!(current.cashShiftsHistory||[]).some(x=>x.id===h.id));
  if(a.shiftId!==b.shiftId||a.status!==b.status){
    if(!can(['cuadre_caja']))bad('Sin permiso para abrir o cerrar turnos.',403);
    if(a.status==='Abierto'&&a.shiftId!==b.shiftId)bad('Cierra el turno abierto antes de reemplazarlo.');
    if(b.status==='Abierto'&&(Number(b.openingCash)<0||Number(b.openingCard||0)<0||!Number.isFinite(Number(b.openingCash))))bad('Base de apertura inválida.');
    if(b.status==='Cerrado'&&(a.status!=='Abierto'||a.shiftId!==b.shiftId||newHistory.length!==1||newHistory[0].shiftId!==a.shiftId))bad('El cierre no corresponde al turno abierto.');
  }else if(newHistory.length)bad('No se pueden agregar cierres sin cerrar el turno actual.');
  if(a.status==='Abierto'&&a.shiftId===b.shiftId)for(const field of ['openingCash','openingCard','openingAccount','openedTimestamp','openedDate'])if(!isDeepStrictEqual(a[field],b[field]))bad('La base y la fecha de apertura del turno no pueden cambiar.');
  if(a.status==='Cerrado'&&b.status==='Cerrado'&&!isDeepStrictEqual(a,b))bad('El cierre actual también es histórico y no se reescribe.',403);
  if(a.status==='Abierto'&&b.status==='Cerrado'){
    const totals=L.shiftTotals(next,a),h=newHistory[0];
    for(const record of [b,h]){
      if(!Number.isFinite(Number(record.closingCash))||Number(record.closingCash)<0)bad('Arqueo físico inválido.');
      for(const [field,expected]of Object.entries({expectedCashInDrawer:totals.expectedCashInDrawer,expectedCardInAccount:totals.expectedCardInAccount,cashSales:totals.totalEfectivo,transferSales:totals.totalTransferencia,tarjetaSales:totals.totalTarjeta,totalFacturado:totals.totalFacturado,totalRecaudado:totals.totalRecaudado,cashExpenses:totals.cashExpenses,bankExpenses:totals.bankExpenses}))if(Math.abs(Number(record[field]||0)-expected)>.01)bad('Los totales del cierre no coinciden con los movimientos registrados.');
    }
    if(Number(h.closingCash)!==Number(b.closingCash)||Math.abs(Number(h.difference)-(Number(h.closingCash)-totals.expectedCashInDrawer))>.01)bad('La diferencia del cierre no coincide con el arqueo.');
  }
  const addedExpenses=next.expenses.filter(e=>!(current.expenses||[]).some(x=>x.id===e.id));
  for(const exp of addedExpenses){const key=L.movementAccount(exp.targetAccount,exp.method,next);if(!key||!(Number(exp.amount)>0)||exp.reversalOperationId||exp.originalAmount!==undefined)bad('Gasto nuevo inválido.');if(key==='efectivo_caja'&&(a.status!=='Abierto'||exp.shiftId!==a.shiftId))bad('El gasto en efectivo requiere el turno abierto actual.');}
  const superUser=/^(super admin|superadmin|super administrador)$/i.test(user.role||'');
  if(!superUser&&!isDeepStrictEqual(next.paymentMethods||[],current.paymentMethods||[]))bad('Solo Super Admin puede configurar cuentas y métodos de pago.',403);
  const priorAccounts=L.accounts(current),oldMethods=map(current.paymentMethods);
  for(const pm of next.paymentMethods||[]){
    const before=oldMethods.get(pm.id);if(before&&isDeepStrictEqual(before,pm))continue;
    const oldKey=before?L.paymentAccountKey(before):null,newKey=L.paymentAccountKey(pm);
    if(oldKey&&pm.isBankAccount!==false&&newKey!==oldKey)bad('Renombrar una cuenta no puede cambiar la identidad de su saldo.',403);
    if(oldKey&&pm.isBankAccount===false&&(priorAccounts[oldKey]?.movements.length||Math.abs(priorAccounts[oldKey]?.balance||0)>.005))bad('La cuenta tiene saldo o movimientos y debe conservar su identidad.',403);
    if(!before&&pm.isBankAccount===true&&pm.accountKey&&pm.accountKey!==L.account(pm.name,true))bad('La identidad de la cuenta nueva no coincide con su nombre.',403);
  }
  const oldInitial=current.accountInitialBalances||{},newInitial=next.accountInitialBalances||{};
  for(const [key,value]of Object.entries(oldInitial))if(!isDeepStrictEqual(newInitial[key],value))bad('Los saldos iniciales existentes se conservan; usa un ajuste documentado.',403);
  for(const [key,value]of Object.entries(newInitial))if(!Object.prototype.hasOwnProperty.call(oldInitial,key)){
    const created=next.paymentMethods.filter(pm=>!oldMethods.has(pm.id)&&pm.isBankAccount===true&&L.paymentAccountKey(pm)===key);
    if(!can(['formas_pago'])||!superUser||priorAccounts[key]||created.length!==1||typeof value!=='number'||!Number.isFinite(value)||value<0)bad('El saldo inicial solo puede establecerse al crear una cuenta nueva sin movimientos.',403);
  }
  const addedAdj=next.accountAdjustments.filter(a=>!(current.accountAdjustments||[]).some(o=>o.id===a.id));
  for(const adj of addedAdj){if(adj.operationId||adj.movementType)bad('Los movimientos de corrección los genera el servidor.',403);if(!adj.accountKey||typeof adj.isIncome!=='boolean'||!(Number(adj.amount)>0))bad('Ajuste de cuenta inválido.');if(adj.accountKey==='efectivo_caja'&&(a.status!=='Abierto'||adj.shiftId!==a.shiftId))bad('Los ajustes en efectivo requieren el turno abierto actual.');}
  const pairs=new Map();for(const a of addedAdj.filter(a=>a.linkedTransferId)){const list=pairs.get(a.linkedTransferId)||[];list.push(a);pairs.set(a.linkedTransferId,list);}
  for(const pair of pairs.values())if(pair.length!==2||pair[0].accountKey===pair[1].accountKey||Math.abs(pair.reduce((s,a)=>s+Number(a.amount)*(a.isIncome?1:-1),0))>.01)bad('Una transferencia debe tener dos movimientos iguales en cuentas distintas.');
  coreValidation(next,current);
}
function finalizeState(state) {
  const totals=state.cashShiftLog?.status==='Abierto'?L.shiftTotals(state):null;
  if(totals){Object.assign(state.cashShiftLog,{cashSales:totals.totalEfectivo,cardSales:totals.totalTransferencia+totals.totalTarjeta,transferSales:totals.totalTransferencia,tarjetaSales:totals.totalTarjeta,creditSales:totals.totalCredito,totalFacturado:totals.totalFacturado,totalRecaudado:totals.totalRecaudado,salesCount:totals.salesCount,cashExpenses:totals.cashExpenses,bankExpenses:totals.bankExpenses,totalExpenses:totals.totalExpenses,cashAdjustmentsNet:totals.cashAdjustmentsNet,bankAdjustmentsNet:totals.bankAdjustmentsNet,expectedCashInDrawer:totals.expectedCashInDrawer,expectedCardInAccount:totals.expectedCardInAccount,accountBreakdown:totals.accountBreakdown});}
  state.store.cashInBox=L.accounts(state).efectivo_caja.balance;
  let grams=0,value=0;
  for(const p of state.products){const stock=Number(p.stock),cost=Number(p.cost),cat=state.categories.find(c=>c.id===p.category),extra=p.isExtra||cat?.isExtra||cat?.type==='extras';const g=extra?0:I.isPesaje(p)?stock*I.factor(p.weightUnit):stock*I.weight(p);grams+=g;value+=!I.isPesaje(p)&&g>0?g*cost:stock*cost;}
  state.kpis ||= {};state.kpis.totalGrams=I.round(grams);state.kpis.inventoryValue=L.money(value);state.kpis.skusCount=state.products.length;
  return state;
}
module.exports={coreValidation,validateSnapshotFinance,finalizeState};
