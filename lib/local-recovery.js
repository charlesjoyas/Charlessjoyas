'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const os=require('os');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function backup(source,directory=path.join(os.homedir(),'.codex','backups','charles-joyas','local-snapshots')){
  source=path.resolve(source);
  const bytes=fs.readFileSync(source);JSON.parse(bytes);
  fs.mkdirSync(directory,{recursive:true});
  const file=path.join(directory,`${Date.now()}-${crypto.randomUUID()}.json`);
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  const manifest={source,file,sha256:sha256(bytes),bytes:bytes.length,createdAt:new Date().toISOString()};
  fs.writeFileSync(file+'.manifest.json',JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
  verify(file);return manifest;
}
function verify(file){
  const bytes=fs.readFileSync(file),manifest=JSON.parse(fs.readFileSync(file+'.manifest.json','utf8'));
  if(sha256(bytes)!==manifest.sha256||bytes.length!==manifest.bytes)throw new Error('El respaldo no coincide con su checksum.');
  const state=JSON.parse(bytes);if(!state.store||!Array.isArray(state.products))throw new Error('El respaldo no contiene un estado de negocio válido.');
  return {manifest,state};
}
function restore(file,target){
  const {manifest}=verify(file);
  // Recovery is deliberately into a NEW file. Switching a running store is a separate deployment decision.
  fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});
  fs.copyFileSync(file,target,fs.constants.COPYFILE_EXCL);
  if(sha256(fs.readFileSync(target))!==manifest.sha256)throw new Error('Falló la verificación de la restauración.');
  return {target:path.resolve(target),sha256:manifest.sha256};
}
module.exports={backup,verify,restore,sha256};
