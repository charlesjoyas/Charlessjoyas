'use strict';
const R=require('../lib/mongo-recovery');
async function main(){
  const [action,source,target,key]=process.argv.slice(2);
  if(!source||!['snapshot','verify','rehearse'].includes(action))throw new Error('Uso: node scripts/mongo-recovery.js snapshot DIRECTORIO_NUEVO | verify DIRECTORIO | rehearse DIRECTORIO ARCHIVO_NUEVO [CLAVE]');
  if(action==='rehearse'&&!target)throw new Error('El ensayo exige un archivo local NUEVO.');
  const result=action==='snapshot'?await R.snapshot({uri:process.env.MONGO_URI,directory:source}):action==='verify'?R.verify(source):R.rehearse(source,target,key);
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error('No se completó la recuperación: '+String(error.message).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi,'[conexión privada]'));process.exitCode=1;});
