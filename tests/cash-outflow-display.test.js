'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browserHarness,clone}=require('./helpers');const L=require('../js/ledger');
function fixture(){const h=browserHarness(),state=h.app.data;
 for(const key of ['recentTransactions','purchases','supplierCredits','customerCredits','abonosCompras','abonosVentas','expenses','accountAdjustments','financialLedger'])state[key]=[];
 state.cashShiftLog={shiftId:'TEST-SHIFT',status:'Abierto',openingCash:5000,openingCard:1000,openingAccount:'CUENTA CHARLES JOYAS SAS'};
 const meta={shiftId:'TEST-SHIFT',date:'2026-11-25',time:'10:00',cashier:'Test operator'};
 state.abonosCompras=[{...meta,id:'PAY-CASH',supplier:'Proveedor A',amount:100,method:'Efectivo'},{...meta,id:'PAY-BANK',supplier:'Proveedor B',amount:200,method:'Transferencia',targetAccount:'CUENTA CHARLES JOYAS SAS'}];
 state.expenses=[{...meta,id:'EXP-CASH',description:'Arriendo de prueba',amount:10,method:'Efectivo'},{...meta,id:'EXP-BANK',description:'Servicios de prueba',amount:20,method:'Transferencia',targetAccount:'CUENTA CHARLES JOYAS SAS'}];
 state.purchases=[{...meta,id:'PO-CASH',supplier:'Proveedor C',productName:'Joya de prueba',total:300,paidAmount:300,directPaidAmount:300,paymentMethod:'Efectivo',status:'Recibido'}];
 state.accountAdjustments=[{...meta,id:'REFUND',accountKey:'efectivo_caja',amount:50,isIncome:false,movementType:'sale_refund',concept:'Devolución de prueba'}];
 return h;
}
test('cash and bank outflows are categorized by purpose, independently from their payment account',()=>{
 const h=fixture(),rows=h.App.prototype.getCashShiftExpenses.call(h.app);
 assert.equal(rows.filter(e=>e.typeKey==='gastos').length,2);assert.equal(rows.filter(e=>e.typeKey==='abonos').length,2);assert.equal(rows.filter(e=>e.typeKey==='compras').length,1);assert.equal(rows.filter(e=>e.typeKey==='devoluciones').length,1);
 assert.equal(rows.filter(e=>e.isCash).length,4);assert.equal(rows.filter(e=>e.isBank).length,2);
 assert.equal(rows.find(e=>e.id==='PAY-CASH').type,'supplier_payment');assert.equal(rows.find(e=>e.id==='PAY-CASH').typeLabel,'Abono a proveedor');assert.match(rows.find(e=>e.id==='PAY-CASH').concept,/Proveedor A/);
 assert.equal(rows.find(e=>e.id==='EXP-BANK').typeKey,'gastos');assert.equal(rows.find(e=>e.id==='PO-CASH').typeLabel,'Compra de mercancía');
});
test('display classification and labels never mutate records or change ledger balances',()=>{
 const h=fixture(),before=clone(h.app.data),totals=L.shiftTotals(h.app.data),accounts=L.accounts(h.app.data),rows=h.App.prototype.getCashShiftExpenses.call(h.app);
 assert.equal(rows.reduce((sum,e)=>sum+e.amount,0),680);assert.equal(rows.filter(e=>e.isCash).reduce((sum,e)=>sum+e.amount,0),totals.cashExpenses);assert.equal(rows.filter(e=>e.isBank).reduce((sum,e)=>sum+e.amount,0),totals.bankExpenses);
 const html=h.App.prototype.renderCashShiftExpensesSummary.call(h.app);
 assert.match(html,/Gastos \(2\)/);assert.match(html,/Abonos a proveedores \(2\)/);assert.match(html,/Compras \(1\)/);assert.match(html,/Devoluciones \(1\)/);assert(!html.includes('supplier_payment'));assert(!html.includes('> expense'));
 assert.deepEqual(h.app.data,before);assert.deepEqual(L.shiftTotals(h.app.data),totals);assert.deepEqual(L.accounts(h.app.data),accounts);
});
test('long source identifiers remain intact in the code tooltip and beneficiaries are escaped',()=>{
 const h=fixture(),id='AB-C-test-original-long-identifier-1234567890';h.app.data.abonosCompras[0].id=id;h.app.data.abonosCompras[0].supplier='<img src=x onerror=alert(1)>';
 const html=h.App.prototype.renderCashShiftExpensesSummary.call(h.app);assert(html.includes(`title="${id}"`));assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));
});
