(function(root){
  'use strict';
  const L=typeof module!=='undefined'&&module.exports?require('./ledger'):root.NexusLedger;
  const I=typeof module!=='undefined'&&module.exports?require('./safety'):root.NexusSafety;
  function report(state,evidence=[]) {
    const issues=[],add=(type,severity,id,message,details={},action=null)=>issues.push({type,severity,entityId:id,message,details,action});
    const products=state.products || [],sales=state.recentTransactions || [];
    for(const tx of sales.filter(t=>!L.inactive(t.status)))for(const [index,item]of (tx.items||[]).entries()){
      const exact=products.find(p=>p.id===item.id&&String(p.sku)===String(item.sku));
      if(!exact){const matches=evidence.flatMap(e=>(e.state?.products||[]).filter(p=>p.id===item.id&&String(p.sku)===String(item.sku)).map(p=>({source:e.source,sha256:e.sha256,updatedAt:e.state.updatedAt,product:p})));add('missing_product','high',tx.id,`El SKU ${item.sku || item.id} no existe con la identidad original. No se usará otro producto del mismo nombre.`,{index,item,candidates:matches},'restoreHistoricalProduct');}
      if(I.historicalCost(item)===null){const matches=evidence.flatMap(e=>(e.state?.recentTransactions||[]).filter(t=>t.id===tx.id).flatMap(t=>(t.items||[]).filter(i=>i.id===item.id&&String(i.sku)===String(item.sku)&&I.historicalCost(i)!==null).map(i=>({source:e.source,sha256:e.sha256,cogsTotal:I.historicalCost(i)}))));add('missing_historical_cost','review',tx.id,'La venta no conserva su costo histórico. Un costo actual o un informe de inventario posterior no demuestra el costo de esta venta.',{index,productId:item.id,sku:item.sku,candidates:matches},'setHistoricalCost');}
    }
    for(const c of state.customerCredits || [])if(Number(c.currentBalance)>0&&!c.txId&&!(c.mergedTxIds||[]).length)add('unlinked_customer_credit','review',c.id,'El crédito conserva saldo, pero no identifica facturas. Puede ser deuda inicial; verifica el soporte antes de vincularlo.',{balance:c.currentBalance},'linkCustomerCredit');
    for(const [key,kind,action]of [['abonosVentas','customer','reconcileCustomerPayment'],['abonosCompras','supplier','reconcileSupplierPayment']])for(const a of state[key] || []){
      if(Number(a.amount)<=0||Array.isArray(a.allocations))continue;
      const owner=kind==='customer'?a.customer:a.supplier;
      add('unallocated_'+kind+'_payment','high',a.id,'El abono no conserva su distribución por factura. Su saldo se mantiene; no se adivinará qué factura pagó.',{amount:a.amount,owner,reference:a.invoiceId || a.poId},action);
      if(kind==='customer'&&a.invoiceId){const tx=sales.find(t=>t.id===a.invoiceId);if(tx&&L.norm(tx.customer)!==L.norm(a.customer))add('invoice_customer_mismatch','high',a.id,'La factura indicada en el abono pertenece a otro cliente.',{invoiceId:a.invoiceId});}
    }
    for(const c of state.supplierCredits || []){
      const pendingOrders=(state.purchases||[]).filter(p=>!L.inactive(p.status)&&(c.purchaseOrderIds||[]).includes(p.id)).reduce((s,p)=>s+Math.max(0,Number(p.total)-Number(p.paidAmount||0)-Number(p.creditAdjustment||0)),0);
      if(Number(c.pendingAmount)>pendingOrders+.01)add('supplier_opening_balance','info',c.id,'Existe deuda no representada por órdenes pendientes. Se conserva como saldo inicial; editar una orden no debe borrarla.',{pending:c.pendingAmount,pendingOrders,openingDifference:L.money(Number(c.pendingAmount)-pendingOrders)});
      if(Math.abs(Number(c.totalOwed)-Number(c.paidAmount||0)-Number(c.pendingAmount||0))>.01)add('supplier_credit_arithmetic','high',c.id,'El total del crédito no coincide con pagado más pendiente.',{});
    }
    for(const p of state.purchases || [])if(L.legacyExclusion(state,p))add('legacy_purchase_exclusion','review',p.id,'La compra está excluida de movimientos por una regla histórica. Revisa por separado caja y tesorería antes de cambiarla.',{total:p.total,excludeFromCashShift:!!p.excludeFromCashShift,excludeFromTreasury:p.excludeFromTreasury},'setMovementExclusion');
    for(const [dir,credits,field,balance]of [['customers','customerCredits','customer','currentBalance'],['suppliers','supplierCredits','supplier','pendingAmount']])for(const e of state[dir] || []){const total=(state[credits]||[]).filter(c=>L.norm(c[field])===L.norm(e.name)).reduce((s,c)=>s+Number(c[balance]||0),0);if(Math.abs(Number(e.creditBalance||0)-total)>.01)add('directory_balance_mismatch','high',e.id,'El saldo del directorio difiere de los créditos. Requiere soporte antes de ajustar.',{directory:e.creditBalance,credits:total,collection:dir});}
    const summary={};for(const i of issues)summary[i.type]=(summary[i.type]||0)+1;
    return {generatedAt:new Date().toISOString(),sourceUpdatedAt:state.updatedAt,counts:{products:products.length,sales:sales.length,purchases:(state.purchases||[]).length},summary,issues};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={report};else root.NexusReconciliation={report};
})(typeof globalThis!=='undefined'?globalThis:this);
