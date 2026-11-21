'use strict';
const fs=require('fs');
const path=require('path');
const {sha256}=require('../lib/local-recovery');
const {report}=require('../js/reconciliation');
const [input,output,...evidencePaths]=process.argv.slice(2);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function states(file){
  const bytes=fs.readFileSync(file),parsed=JSON.parse(bytes),entries=Array.isArray(parsed)?parsed:Array.isArray(parsed.documents)?parsed.documents:[parsed];
  return entries.map(v=>v.content||v.data||v).filter(v=>v.store&&Array.isArray(v.products)).map(state=>({source:path.resolve(file),sha256:sha256(bytes),state}));
}
function files(location){
  if(!fs.statSync(location).isDirectory())return [location];
  return fs.readdirSync(location,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(location,e.name)):/\.(json|ejson|backup)$/i.test(e.name)?[path.join(location,e.name)]:[]);
}
try{
  if(!input||!output)throw new Error('Uso: node scripts/reconcile-history.js ESTADO DIRECTORIO_NUEVO [RESPALDOS...]');
  if(fs.existsSync(output))throw new Error('El directorio de salida debe ser nuevo para conservar informes anteriores.');
  const sources=states(input);if(sources.length!==1)throw new Error('El archivo principal debe contener un único estado de negocio.');
  const evidence=[],warnings=[];
  for(const file of [...new Set(evidencePaths.flatMap(files))])try{evidence.push(...states(file));}catch(error){warnings.push({file,error:error.message});}
  const result=report(sources[0].state,evidence);result.source={file:sources[0].source,sha256:sources[0].sha256};result.evidenceSources=evidence.map(({state,...meta})=>({...meta,updatedAt:state.updatedAt}));result.readWarnings=warnings;
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2),{flag:'wx',mode:0o600});
  const rows=result.issues.map(i=>`<tr><td>${escape(i.severity)}</td><td>${escape(i.entityId)}</td><td>${escape(i.message)}</td><td>${escape(i.action||'Revisar soporte')}</td><td>${escape((i.details.candidates||[]).map(c=>c.source).join('; '))}</td></tr>`).join('');
  fs.writeFileSync(path.join(output,'report.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Conciliación Charles Joyas</title><style>body{font:15px system-ui;margin:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee}</style><h1>Conciliación de solo lectura</h1><p>Origen: ${escape(result.source.file)}<br>SHA256: ${result.source.sha256}</p><p>${result.issues.length} hallazgos. Las notas de saldo inicial no son errores. No se han modificado datos de negocio. Las coincidencias de respaldo requieren verificar su soporte antes de aprobarlas.</p><pre>${escape(JSON.stringify(result.summary,null,2))}</pre><table><thead><tr><th>Nivel</th><th>Registro</th><th>Hallazgo</th><th>Acción con soporte</th><th>Respaldo candidato</th></tr></thead><tbody>${rows}</tbody></table></html>`,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({output:path.resolve(output),summary:result.summary,evidenceStates:evidence.length,readWarnings:warnings.length},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
