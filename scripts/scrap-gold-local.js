'use strict';
// Fictitious data, a separate file and MongoDB explicitly disabled.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function demoSeed(){
  const seed=require('./chain-lots-local').demoSeed();
  for(const key of ['purchases','supplierCredits','abonosCompras','financialLedger','recentTransactions','expenses','accountAdjustments','cashShiftsHistory'])seed[key]=[];
  seed.suppliers=[{id:'LOCAL-SUPPLIER',name:'Proveedor de prueba',creditBalance:0,status:'Active'}];
  seed.categories.push({id:'extra-local',name:'Accesorios de prueba',type:'extras',isExtra:true});
  seed.products=[{id:'LOCAL-NACIONAL',sku:'JOY-NAC-001',name:'Joyas Nacional 18K · prueba',category:'nacional',categoryName:'NACIONAL',measureType:'Pesaje',unit:'g',weightUnit:'g',pieceWeight:0,weight:0,stock:100,cost:400000,price:450000,status:'active',supplier:'Proveedor de prueba',isExtra:false}];
  seed.store={...seed.store,name:'CHARLES · CHATARRA LOCAL',legalName:'DATOS FICTICIOS',branding:{...seed.store.branding,appName:'PRUEBA CHATARRA',appBadge:'LOCAL'},cashInBox:10000000};seed.cashShiftLog={...seed.cashShiftLog,openingCash:10000000};
  require('../lib/financial-validation').finalizeState(seed);return seed;
}
function start(){
  if(process.env.VERCEL)throw new Error('Este piloto no se inicia en producción.');
  const directory=path.resolve(__dirname,'../scratch/scrap-gold-local');fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'demo-db.json');
  if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(demoSeed(),null,2),{flag:'wx'});
  process.env.NEXUS_LOCAL_ONLY='1';process.env.NEXUS_ENABLE_SCRAP_GOLD='1';process.env.NEXUS_ENABLE_CHAIN_LOTS='1';process.env.NEXUS_DB_FILE=file;process.env.NEXUS_BACKUP_DIR=path.join(directory,'backups');process.env.AUTH_SECRET=crypto.randomBytes(48).toString('hex');
  return require('../server').listen(43136,'127.0.0.1',()=>console.log('Chatarra local: http://127.0.0.1:43136 · local@example.test / LotesLocal2026! · datos ficticios, sin MongoDB'));
}
if(require.main===module)start();module.exports={demoSeed,start};
