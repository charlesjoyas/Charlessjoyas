'use strict';
const fs=require('fs');
const path=require('path');
const {sha256}=require('./local-recovery');
const {MongoClient,BSON}=require('mongoose').mongo;
// This module has no database restore/write API. Rehearsal writes only a new local file.
async function snapshot({uri,directory,Client=MongoClient,now=()=>new Date()}){
  if(!uri)throw new Error('Falta MONGO_URI en el entorno del proceso de respaldo.');
  if(!directory||fs.existsSync(directory))throw new Error('El destino del respaldo debe ser un directorio nuevo.');
  const client=new Client(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,readPreference:'secondaryPreferred',appName:'CharlesJoyasReadOnlyBackup'});
  const manifest={version:1,readOnly:true,startedAt:now().toISOString(),consistency:'Each document is read atomically; collections are not a cross-collection snapshot.',files:[]};
  try{
    await client.connect();const db=client.db();
    const collections=(await db.listCollections({}, {nameOnly:true}).toArray()).filter(c=>!c.name.startsWith('system.'));
    if(!collections.length)throw new Error('La base no contiene colecciones de usuario.');
    fs.mkdirSync(directory,{recursive:true});
    for(const [index,entry]of collections.entries()){
      const collection=db.collection(entry.name);
      const documents=await collection.find({}).toArray();
      const indexes=await collection.listIndexes().toArray();
      const file=`${String(index+1).padStart(3,'0')}-${entry.name.replace(/[^a-zA-Z0-9_-]/g,'_')}.ejson`;
      const bytes=Buffer.from(BSON.EJSON.stringify({collection:entry.name,indexes,documents},{relaxed:false}));
      fs.writeFileSync(path.join(directory,file),bytes,{flag:'wx',mode:0o600});
      manifest.files.push({file,collection:entry.name,documents:documents.length,bytes:bytes.length,sha256:sha256(bytes)});
    }
    manifest.completedAt=now().toISOString();fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
    verify(directory);return manifest;
  }finally{await client.close();}
}
function verify(directory){
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  if(manifest.version!==1||!manifest.files?.length||!manifest.completedAt)throw new Error('Manifiesto de respaldo incompleto.');
  for(const file of manifest.files){
    if(path.basename(file.file)!==file.file||!/^[\w-]+\.ejson$/.test(file.file))throw new Error('Ruta de respaldo inválida.');
    const bytes=fs.readFileSync(path.join(directory,file.file));
    if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)throw new Error('Checksum de respaldo incorrecto.');
    const parsed=BSON.EJSON.parse(bytes.toString());if(parsed.collection!==file.collection||parsed.documents.length!==file.documents)throw new Error('Conteo de documentos incorrecto.');
  }
  return manifest;
}
function rehearse(directory,target,key='main_store'){
  const manifest=verify(directory);const candidates=[];
  for(const file of manifest.files){const dump=BSON.EJSON.parse(fs.readFileSync(path.join(directory,file.file),'utf8'));for(const doc of dump.documents)if(doc.key===key&&doc.content?.store&&Array.isArray(doc.content.products))candidates.push(doc.content);}
  if(candidates.length!==1)throw new Error('El respaldo no contiene un único estado de tienda con esa clave.');
  const bytes=Buffer.from(JSON.stringify(candidates[0],null,2));
  fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});
  return {target:path.resolve(target),sha256:sha256(bytes),products:candidates[0].products.length,sales:candidates[0].recentTransactions?.length||0,updatedAt:candidates[0].updatedAt};
}
module.exports={snapshot,verify,rehearse};
