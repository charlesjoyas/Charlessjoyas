'use strict';
const R=require('../lib/local-recovery');
const [action,source,target]=process.argv.slice(2);
try{
  if(!source||!['backup','verify','restore'].includes(action))throw new Error('Uso: node scripts/local-recovery.js backup ARCHIVO [DIRECTORIO] | verify RESPALDO | restore RESPALDO ARCHIVO_NUEVO');
  if(action==='restore'&&!target)throw new Error('Indica un archivo NUEVO para ensayar la restauración.');
  const result=action==='backup'?R.backup(source,target):action==='restore'?R.restore(source,target):{manifest:R.verify(source).manifest,verified:true};
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
