'use strict';
const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const {sha256}=require('../lib/local-recovery');
const output=process.argv[2];
try{
  if(!output||fs.existsSync(output))throw new Error('Indica un directorio NUEVO para las copias históricas de Git.');
  const commits=execFileSync('git',['log','--format=%H','--','db.json'],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
  fs.mkdirSync(output,{recursive:true});
  const manifest={readOnly:true,source:'Git objects; no checkout or business-file changes',snapshots:[],warnings:[]};
  for(const commit of [...new Set(commits)])try{
    const bytes=execFileSync('git',['show',`${commit}:db.json`],{maxBuffer:20*1024*1024}),state=JSON.parse(bytes);
    if(!Array.isArray(state.products)||!state.store)continue;
    const file=`git-${commit}.json`;fs.writeFileSync(path.join(output,file),bytes,{flag:'wx',mode:0o600});manifest.snapshots.push({commit,file,sha256:sha256(bytes),updatedAt:state.updatedAt});
  }catch(error){manifest.warnings.push({commit,error:error.message.split('\n')[0]});}
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({output:path.resolve(output),snapshots:manifest.snapshots.length,warnings:manifest.warnings.length}));
}catch(error){console.error(error.message);process.exitCode=1;}
