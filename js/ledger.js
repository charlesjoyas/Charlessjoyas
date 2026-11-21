/* Money movements are shared by the server, reports and cash reconciliation. */
(function (root) {
  'use strict';
  const money = n => (Math.round((Number(n) || 0) * 100) / 100) || 0;
  const norm = s => String(s || '').trim().toLowerCase();
  const inactive = s => /^(reversad[ao]|anulad[ao]|cancelled|cancelado)$/i.test(s || '');
  const debt = s => /separe/i.test(s || '') || (/cr[eé]dito/i.test(s || '') && !/tarjeta|d[eé]bito|card/i.test(s || ''));
  const names = { efectivo_caja:'Efectivo', cuenta_carlos:'Cuenta Carlos', cuenta_sharick:'Cuenta Sharick', cuenta_charles_joyas:'CUENTA CHARLES JOYAS SAS' };
  function account(raw, force = false) {
    const s = norm(raw);
    if (!s) return null;
    if (/zharick|sharick/.test(s)) return 'cuenta_sharick';
    if (s.includes('carlos') && !s.includes('charles')) return 'cuenta_carlos';
    if (s.includes('charles joyas')) return 'cuenta_charles_joyas';
    if (/efectivo|caja mostrador|^caja$|^cash$/.test(s)) return 'efectivo_caja';
    if (!force && (debt(s) || /^(tarjeta|transferencia|tarjeta d[eé]bito\/cr[eé]dito|transferencia bancaria)$|pago mixto|bizum/.test(s))) return null;
    if (!force && !/cuenta|cta|banco|bancaria|nequi|daviplata|ahorros|corriente|wallet|billetera/.test(s)) return null;
    return 'acc_' + s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  }
  function paymentAccountKey(pm){return pm?.isBankAccount===false?null:pm?.accountKey||account(pm?.name,pm?.isBankAccount===true);}
  function namedAccount(raw,state,force=true){const pm=(state.paymentMethods||[]).find(p=>norm(p.name)===norm(raw)&&p.isBankAccount!==false);return pm?.accountKey||account(raw,force);}
  function movementAccount(target, method, state) {
    if (/efectivo|^cash$/i.test(method || '')) return 'efectivo_caja';
    if (target) return namedAccount(target,state,true);
    const inner = String(method || '').match(/\(([^)]+)\)/)?.[1];
    if (inner && !/recargo/i.test(inner)) return namedAccount(inner,state,true);
    return namedAccount(method,state,false) || (/tarjeta|transfer|banco|qr|bizum|nequi|daviplata|datafono|datáfono/i.test(method || '') ? namedAccount(state.cashShiftLog?.openingAccount,state,true) || 'cuenta_charles_joyas' : null);
  }
  function saleParts(tx, state) {
    if (Array.isArray(tx.mixedPayments) && tx.mixedPayments.length) return tx.mixedPayments.filter(p => !debt(p.method)).map(p => ({ accountKey:movementAccount(p.targetAccount || tx.targetAccount,p.method,state), amount:money(p.amount), method:p.method }));
    if (/separe/i.test(tx.paymentMethod || '')) return [{accountKey:'efectivo_caja',amount:money(tx.separeAbono),method:'Efectivo'}];
    if (debt(tx.paymentMethod)) return [];
    return [{accountKey:movementAccount(tx.targetAccount,tx.paymentMethod,state),amount:money(tx.total),method:tx.paymentMethod}];
  }
  function legacyExclusion(state, po) {
    // Preserve the eight explicit historical exclusions until evidence is reconciled.
    if(po.excludeFromTreasury!==undefined)return !!po.excludeFromTreasury;
    return po.excludeFromCashShift || (state.legacyMovementExclusions?.purchases || ['OC-069','OC-070','OC-071','OC-072','OC-073','OC-074','OC-075','OC-076']).includes(po.id);
  }
  function purchaseDirect(po, state) {
    if (po.directPaidAmount !== undefined) return money(po.directPaidAmount);
    if (debt(po.paymentMethod) || po.paymentStatus !== 'Pagado Total') return 0;
    if ((state.abonosCompras || []).some(a => a.poId === po.id)) return 0;
    return money(po.paidAmount || po.total);
  }
  function movements(state) {
    const out = [];
    const add = (source, type, amount, key, extra = {}) => {
      if (!key || !Number.isFinite(Number(amount)) || !amount) return;
      out.push({id:source.id,sourceId:source.id,type,accountKey:key,amount:money(amount),date:source.isoDate || source.date || '',time:source.time || '',timestamp:Number(source.timestamp) || 0,shiftId:source.shiftId || null,closedShiftId:source.closedShiftId || null,excludeFromCashShift:!!source.excludeFromCashShift,party:source.customer || source.supplier || source.party || '—',operator:source.cashier || source.operator || source.user || 'Sistema',concept:source.description || source.concept || source.productName || type,method:source.method || source.paymentMethod || '',...extra});
    };
    for (const tx of state.recentTransactions || []) {
      if (inactive(tx.status) && !tx.reversalOperationId) continue;
      saleParts(tx,state).forEach((p,i) => add(tx,'sale',p.amount,p.accountKey,{id:`${tx.id}:${i}`,method:p.method}));
    }
    for (const [collection,type] of [['abonosVentas','customer_payment'],['abonosCompras','supplier_payment']]) for (const ab of state[collection] || []) {
      if (inactive(ab.status) && !ab.reversalOperationId) continue;
      add(ab,type,(type==='supplier_payment'?-1:1)*money(ab.originalAmount ?? ab.amount),movementAccount(ab.targetAccount,ab.method || 'Efectivo',state));
    }
    for (const po of state.purchases || []) {
      if (inactive(po.status) && !po.reversalOperationId) continue;
      if (legacyExclusion(state,po)) continue;
      add(po,'purchase',-purchaseDirect(po,state),movementAccount(po.targetAccount,po.paymentMethod,state));
    }
    for (const exp of state.expenses || []) {
      if (inactive(exp.status) && !exp.reversalOperationId) continue;
      add(exp,'expense',-money(exp.originalAmount ?? exp.amount),movementAccount(exp.targetAccount,exp.method || 'Efectivo',state));
    }
    for (const adj of state.accountAdjustments || []) {
      if (inactive(adj.status) && !adj.reversalOperationId) continue;
      add(adj,adj.movementType || (adj.linkedTransferId?'transfer':'adjustment'),money(adj.amount)*(adj.isIncome?1:-1),adj.accountKey,{isAdjustment:true,adjustmentId:adj.id,category:adj.category || 'Ajuste',typeLabel:adj.typeLabel || 'Ajuste',operationId:adj.operationId});
    }
    // Compatibility with reversals recorded before the append-only operation service.
    for (const tx of state.recentTransactions || []) if (tx.status==='Reversada' && !tx.reversalOperationId && tx.refundShiftId && Number(tx.cashRefunded)>0) add({...tx,id:`REV-${tx.id}`,shiftId:tx.refundShiftId,date:tx.reversedAt?.slice(0,10),timestamp:Date.parse(tx.reversedAt)||0},'legacy_refund',-money(tx.cashRefunded),'efectivo_caja',{excludeFromAccountSummary:true});
    return out;
  }
  function dateKey(value) {
    const s=String(value || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';
  }
  function inShift(m, shift) {
    if (m.excludeFromCashShift || m.shiftId==='EXCLUIDO') return false;
    if (m.shiftId) return m.shiftId===shift.shiftId;
    if (m.closedShiftId) return false;
    return m.timestamp>0 && Number(shift.openedTimestamp)>0 && m.timestamp>=Number(shift.openedTimestamp)-60000 && dateKey(m.date)===dateKey(shift.openedDate);
  }
  function shiftTotals(state, shift = state.cashShiftLog || {}) {
    const ms=movements(state).filter(m=>inShift(m,shift));
    const sales=(state.recentTransactions || []).filter(t=>!inactive(t.status) && inShift({...t,excludeFromCashShift:false},shift));
    const sum = predicate => money(ms.filter(predicate).reduce((s,m)=>s+m.amount,0));
    const cash = m=>m.accountKey==='efectivo_caja';
    const card = m=>/tarjeta|card|d[eé]bito|datafono|datáfono/i.test(m.method);
    const incoming = m=>m.amount>0 && ['sale','customer_payment'].includes(m.type);
    const expense = m=>m.amount<0 && ['purchase','supplier_payment','expense','sale_refund','legacy_refund'].includes(m.type);
    const adj = m=>!incoming(m)&&!expense(m);
    const salesEfectivo=sum(m=>m.type==='sale'&&cash(m));
    const salesTransferencia=sum(m=>m.type==='sale'&&!cash(m)&&!card(m));
    const salesTarjeta=sum(m=>m.type==='sale'&&!cash(m)&&card(m));
    const abonosEfectivo=sum(m=>m.type==='customer_payment'&&cash(m));
    const abonosTransferencia=sum(m=>m.type==='customer_payment'&&!cash(m)&&!card(m));
    const abonosTarjeta=sum(m=>m.type==='customer_payment'&&!cash(m)&&card(m));
    const totalEfectivo=money(salesEfectivo+abonosEfectivo), totalTransferencia=money(salesTransferencia+abonosTransferencia), totalTarjeta=money(salesTarjeta+abonosTarjeta);
    const cashExpenses=money(-sum(m=>expense(m)&&cash(m))), bankExpenses=money(-sum(m=>expense(m)&&!cash(m)));
    const cashAdjustmentsNet=sum(m=>adj(m)&&cash(m)),bankAdjustmentsNet=sum(m=>adj(m)&&!cash(m));
    const openingCash=money(shift.openingCash),openingCard=money(shift.openingCard),openingAccount=shift.openingAccount || '';
    const accountBreakdown={};
    const ensure=key=>{const name=names[key] || (state.paymentMethods||[]).find(pm=>paymentAccountKey(pm)===key)?.name || key;return accountBreakdown[name] ||= {name,opening:namedAccount(openingAccount,state,true)===key?openingCard:0,incomes:0,expenses:0,adjustments:0,net:0};};
    for (const key of ['cuenta_carlos','cuenta_sharick','cuenta_charles_joyas'])ensure(key);
    const openingKey=namedAccount(openingAccount,state,true);
    if(openingKey&&openingKey!=='efectivo_caja')ensure(openingKey);
    for (const m of ms.filter(m=>!cash(m))) {const a=ensure(m.accountKey);if(incoming(m))a.incomes+=m.amount;else if(expense(m))a.expenses-=m.amount;else a.adjustments+=m.amount;}
    for(const a of Object.values(accountBreakdown))a.net=money(a.opening+a.incomes-a.expenses+a.adjustments);
    const totalSales=money(sales.reduce((s,t)=>s+Number(t.total || 0),0));
    const totalCredito=money(sales.reduce((s,t)=>s+Math.max(0,Number(t.total || 0)-saleParts(t,state).reduce((v,p)=>v+p.amount,0)),0));
    const expectedCashInDrawer=money(openingCash+sum(cash)),expectedCardInAccount=money(openingCard+sum(m=>!cash(m)));
    return {salesEfectivo,salesTransferencia,salesTarjeta,salesCredito:totalCredito,salesOtros:0,totalSales,salesCount:sales.length,abonosEfectivo,abonosTransferencia,abonosTarjeta,abonosOtros:0,totalAbonos:money(abonosEfectivo+abonosTransferencia+abonosTarjeta),abonosCount:ms.filter(m=>m.type==='customer_payment').length,totalEfectivo,totalAbonosEfectivo:abonosEfectivo,totalTransferencia,totalTarjeta,totalCredito,totalOtros:0,totalFacturado:totalSales,totalRecaudado:money(totalEfectivo+totalTransferencia+totalTarjeta+sum(m=>m.type==='sale_refund'||m.type==='legacy_refund')),openingCash,openingCard,openingAccount,openingTotal:money(openingCash+openingCard),cashExpenses,bankExpenses,totalExpenses:money(cashExpenses+bankExpenses),cashAdjustmentsNet,bankAdjustmentsNet,expectedCashInDrawer,expectedCardInAccount,expectedTotalShift:money(expectedCashInDrawer+expectedCardInAccount),accountBreakdown};
  }
  function accounts(state) {
    const out={},initial=state.accountInitialBalances || {};
    const ensure=(key,label)=>out[key] ||= {key,name:label || names[key] || key,shortName:label || names[key] || key,isCash:key==='efectivo_caja',initialBalance:money(initial[key]),incomes:0,incomesCount:0,expenses:0,expensesCount:0,adjustmentsNet:0,adjustmentsCount:0,balance:0,movements:[],pmId:null,fee:'0%'};
    for(const key of Object.keys(names))ensure(key);
    for(const pm of state.paymentMethods || []) {const key=paymentAccountKey(pm);if(key){const a=ensure(key,pm.name);a.pmId=pm.id;a.fee=pm.fee || '0%';}}
    for(const key of Object.keys(initial))ensure(key);
    for(const m of movements(state).filter(m=>!m.excludeFromAccountSummary)) {
      const a=ensure(m.accountKey),amount=Math.abs(m.amount);
      if(m.isAdjustment){a.adjustmentsNet+=m.amount;a.adjustmentsCount++;}else if(m.amount>0){a.incomes+=amount;a.incomesCount++;}else{a.expenses+=amount;a.expensesCount++;}
      a.movements.push({...m,amount,isIncome:m.amount>0,typeLabel:m.typeLabel || m.type,category:m.category || m.type});
    }
    for(const a of Object.values(out)){a.balance=money(a.initialBalance+a.incomes-a.expenses+a.adjustmentsNet);a.movements.sort((a,b)=>b.timestamp-a.timestamp);}
    const shift=state.cashShiftLog || {};
    if(shift.status==='Abierto')out.efectivo_caja.balance=shiftTotals(state).expectedCashInDrawer;
    else if(shift.closingCash!==undefined || shift.expectedCashInDrawer!==undefined){const after=(state.accountAdjustments || []).filter(a=>a.accountKey==='efectivo_caja'&&Number(a.timestamp)>Number(shift.closedTimestamp || Infinity));out.efectivo_caja.balance=money(Number(shift.closingCash ?? shift.expectedCashInDrawer)+after.reduce((s,a)=>s+money(a.amount)*(a.isIncome?1:-1),0));}
    return out;
  }
  const api={money,norm,inactive,debt,account,movementAccount,saleParts,purchaseDirect,legacyExclusion,movements,dateKey,inShift,shiftTotals,accounts,names,paymentAccountKey,namedAccount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NexusLedger=api;
})(typeof globalThis!=='undefined'?globalThis:this);
