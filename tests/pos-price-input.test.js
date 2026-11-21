'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {browserHarness,connectOperations,product}=require('./helpers');
function modal(h,qty,price,total=''){
  h.app.data.products=[product({name:'Anillo de prueba',price:0})];
  h.app.updateAddToCartModalPreview=()=>{};
  return h.inputs({'pos-add-product-id':'P1','pos-add-qty-input':qty,'pos-add-custom-price-input':price,'pos-add-total-sale-input':total});
}
test('pasted Colombian price agrees between modal, cart and committed sale',async()=>{
  const h=browserHarness(),el=modal(h,.5,'100.000');
  h.app.onAddToCartPriceGramInput(el['pos-add-custom-price-input'].value);
  assert.equal(h.app.parseCleanNumber(el['pos-add-total-sale-input'].value),50000);
  // Browser money mask runs after the inline oninput handler.
  el['pos-add-custom-price-input'].value=h.app.formatNumberWithCommas(el['pos-add-custom-price-input'].value);
  h.app.confirmAddToCartFromModal();assert.equal(h.app.getCartSubtotal(),50000);
  h.app.data.cashShiftLog={status:'Abierto',shiftId:'PRICE-TEST',openingCash:0};h.app.selectedPayMethod='cash';h.inputs({'cash-received-input':50000,'checkout-customer-select':'Cliente Mostrador'});
  const api=await connectOperations(h);await h.app.runMutation(()=>h.app.processPaymentSuccess());
  const tx=api.state.recentTransactions[0];assert.ok(tx,JSON.stringify(h.app.events));assert.equal(tx.total,50000);assert.equal(tx.items[0].price,100000);assert.equal(tx.items[0].qty,.5);assert.equal(tx.items[0].name,'Anillo de prueba');assert.equal(api.state.products[0].stock,9.5);
});
test('pasted negotiated total is not divided as a decimal amount before masking',()=>{
  const h=browserHarness(),el=modal(h,2.5,'','250.000');h.app.onAddToCartTotalSaleInput('250.000');
  assert.equal(h.app.parseCleanNumber(el['pos-add-custom-price-input'].value),100000);
  el['pos-add-total-sale-input'].value=h.app.formatNumberWithCommas(el['pos-add-total-sale-input'].value);h.app.confirmAddToCartFromModal();assert.equal(h.app.getCartSubtotal(),250000);
});
test('cart price edits accept both grouping styles without changing weight or description',()=>{
  for(const raw of ['50.000','50,000','50000','$ 50.000 COP']){
    const h=browserHarness();modal(h,.125,raw);h.app.confirmAddToCartFromModal();assert.equal(h.app.getCartItemPrice(h.app.cart[0]),50000);h.app.setCartItemPrice('P1',raw);assert.equal(h.app.getCartSubtotal(),6250);assert.equal(h.app.cart[0].qty,.125);assert.equal(h.app.cart[0].product.name,'Anillo de prueba');
  }
});
test('typing more digits after an inserted thousands comma never turns money into decimals',()=>{
 const h=browserHarness(),el=modal(h,.2,'');
 for(const [raw,expected] of [['4,3000',43000],['43,0000',430000],['8,6000',86000],['4,300,0000',43000000]]){
  h.app.onAddToCartTotalSaleInput(raw);assert.equal(h.app.parseMoneyInput(el['pos-add-custom-price-input'].value),Math.round(expected/.2));
  h.app.onAddToCartPriceGramInput(raw);assert.equal(h.app.parseMoneyInput(el['pos-add-total-sale-input'].value),Math.round(expected*.2));
 }
});
