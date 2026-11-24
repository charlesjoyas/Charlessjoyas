'use strict';
// Dedicated fictitious sandbox. Never uses db.json or MongoDB, even when .env configures it.
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const vm=require('vm');
const {executeOperation}=require('../lib/operations');
const {finalizeState,coreValidation}=require('../lib/financial-validation');
const root=path.resolve(__dirname,'..');
function demoSeed(){
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8')+'\nglobalThis.seed=INITIAL_DATA;',context);
  const state=JSON.parse(JSON.stringify(context.seed));
  for(const key of Object.keys(state))if(Array.isArray(state[key])&&!['perfiles','paymentMethods','categories'].includes(key))state[key]=[];
  state.users=[{id:'LOCAL-ADMIN',name:'Administrador de prueba',email:'local@example.test',role:'Super Admin',status:'Active',password:'LotesLocal2026!'}, {id:'LOCAL-CASHIER',name:'Cajera de prueba',email:'cajera@example.test',role:'Cajero',status:'Active',password:'LotesLocal2026!',customPermissions:['pos','ventas','cuadre_caja']}];
  state.store={...state.store,name:'CHARLES JOYAS · PRUEBA LOCAL',legalName:'DATOS FICTICIOS',taxId:'PRUEBA',phone:'',email:'local@example.test',address:'ENTORNO DE PRUEBAS',addressExtra:'Sin conexión con inventario real',cashier:'Administrador de prueba',cashInBox:0,shiftStatus:'Abierto',branding:{...state.store.branding,appName:'PRUEBA LOCAL',appBadge:'LOTES',logoUrl:''}};
  delete state.store.deepseekApiKey;
  state.suppliers=[{id:'LOCAL-SUPPLIER',name:'Proveedor ficticio de cadenas',creditBalance:0}];
  state.cashShiftLog={shiftId:'LOCAL-DEMO',status:'Abierto',openingCash:0,openingCard:0,openedTimestamp:Date.now(),openedDate:new Date().toISOString().slice(0,10),cashier:'Administrador de prueba'};
  state.accountAdjustments=[];state.accountInitialBalances={};state.kpis={};state.balanceSheet={};state.chartData={};state.stockRadarData=[];
  state.products=[{id:'LOCAL-ORDINARY',sku:'NORMAL-001',name:'Producto normal de prueba',category:'oro18k',categoryName:'Oro 18K Italiano & Ley',measureType:'Pesaje',unit:'g',weightUnit:'g',pieceWeight:0,weight:0,stock:10,cost:400000,price:500000,status:'active',minStock:.5}];
  const {state:next}=executeOperation(state,{operationId:'local-demo-receipt-001',type:'createPurchase',args:{inventoryMode:'chainLot',lotCode:'DEMO-CAD-001',sku:'CAD-LOTE-001',name:'Cadenas cubanas · Lote de prueba',category:'oro18k',supplierId:'LOCAL-SUPPLIER',supplier:'Proveedor ficticio de cadenas',measureType:'Pesaje',quantity:200,unitCount:50,unitCost:400000,pieceWeight:0,paid:false,reason:'Ingreso inicial ficticio para probar lotes localmente'}},state.users[0]);
  coreValidation(next);finalizeState(next);next.updatedAt=new Date().toISOString();return next;
}
function start(testMode=false){
  if(process.env.VERCEL)throw new Error('El piloto solo se inicia en un computador local.');
  const directory=path.join(root,'scratch','chain-lots-local');fs.mkdirSync(directory,{recursive:true});
  const file=path.join(directory,testMode?'browser-test-db.json':'demo-db.json');
  if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(demoSeed(),null,2),{flag:'wx'});
  process.env.NEXUS_LOCAL_ONLY='1';process.env.NEXUS_ENABLE_CHAIN_LOTS='1';
  process.env.NEXUS_DB_FILE=file;process.env.NEXUS_BACKUP_DIR=path.join(directory,testMode?'browser-backups':'demo-backups');
  process.env.AUTH_SECRET=crypto.randomBytes(48).toString('hex');
  const port=testMode?43125:43124;
  const app=require('../server');return app.listen(port,'127.0.0.1',()=>console.log(`Lotes locales: http://127.0.0.1:${port} · datos ficticios, sin MongoDB`));
}
if(require.main===module)start(process.argv.includes('--test'));
module.exports={demoSeed,start};
