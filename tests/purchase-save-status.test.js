'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browserHarness,product,clone,connectOperations}=require('./helpers');
function fixture(){const h=browserHarness();h.app.data.products=[product({measureType:'Unidades',unit:'u.',weightUnit:'u.',pieceWeight:2,weight:2,stock:5})];h.app.data.suppliers=[{id:'S1',name:'Supplier',creditBalance:0}];for(const key of ['purchases','supplierCredits','abonosCompras','financialLedger','recentTransactions'])h.app.data[key]=[];return h;}
const args={supplier:'Supplier',category:'oro18k',sku:'001',productId:'P1',name:'Audit jewelry',measureType:'Unidades',quantity:1,unitCost:100,pieceWeight:3,paid:false,reason:'Test receipt'};

test('a rejected piece-weight mismatch is actionable and never becomes an uncertain purchase',async()=>{
 const h=fixture(),api=await connectOperations(h),before=api.state;
 await assert.rejects(()=>h.app.executeFinancialOperation('createPurchase',args),e=>e.status===422&&e.code==='PIECE_WEIGHT_MISMATCH'&&/peso por pieza/.test(e.message));
 assert.deepEqual(api.state,before);assert.equal(h.app.getPendingFinancialCommand(),null);assert.equal(!!h.app._requiresRefresh,false);assert.equal(h.storage.has('nexus_pending_command'),false);
 const result=await h.app.executeFinancialOperation('createPurchase',{...args,pieceWeight:2});assert(result.success);assert.equal(api.state.purchases.length,1);assert.equal(api.state.products[0].stock,6);assert.equal(api.state.suppliers[0].creditBalance,200);
});

test('many sequential purchases keep exact weighted value and no pending command',async()=>{
 const h=fixture();h.app.data.products[0]=product({stock:0,cost:0});const api=await connectOperations(h);let grams=0,value=0;
 for(let i=0;i<30;i++){const quantity=(i%3+1)/10,unitCost=100+i;grams+=quantity;value+=quantity*unitCost;await h.app.runMutation(()=>h.app.executeFinancialOperation('createPurchase',{...args,measureType:'Pesaje',pieceWeight:0,quantity,unitCost}));assert.equal(h.app.getPendingFinancialCommand(),null);assert.equal(!!h.app._requiresRefresh,false);}
 assert.equal(api.state.purchases.length,30);assert.equal(api.state.financialLedger.filter(e=>e.type==='createPurchase').length,30);assert(Math.abs(api.state.products[0].stock-grams)<1e-6);assert(Math.abs(api.state.products[0].stock*api.state.products[0].cost-value)<.01);assert(Math.abs(api.state.suppliers[0].creditBalance-value)<.01);
});

test('a lost response preserves the same command and recovery cannot duplicate its receipt',async()=>{
 const h=fixture(),api=await connectOperations(h),fetch=h.context.fetch;let lost=true;
 h.context.fetch=async(...input)=>{const response=await fetch(...input);if(lost&&input[0]==='/api/operations'){lost=false;throw new Error('Response lost');}return response;};
 await assert.rejects(()=>h.app.executeFinancialOperation('createPurchase',{...args,pieceWeight:2}),/Response lost/);const command=clone(h.app.getPendingFinancialCommand());assert.equal(h.app._requiresRefresh,true);assert.equal(api.state.purchases.length,1);
 await h.app.reviewPendingOperation();assert.equal(h.app.getPendingFinancialCommand(),null);assert.equal(api.state.purchases.length,1);assert.equal(api.state.financialLedger.filter(e=>e.operationId===command.operationId).length,1);
});

test('rendering failure after acknowledgement cannot mark a confirmed purchase as unconfirmed',async()=>{
 const h=fixture(),api=await connectOperations(h);h.app.syncAllModules=()=>{throw new Error('Screen rendering failure');};
 const result=await h.app.executeFinancialOperation('createPurchase',{...args,pieceWeight:2});assert(result.success);assert.equal(api.state.purchases.length,1);assert.equal(h.app.getPendingFinancialCommand(),null);assert.equal(h.app._requiresRefresh,false);assert(h.app.events.some(e=>/quedó guardada/.test(e[0])));
});
