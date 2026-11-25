'use strict';
const fs=require('fs'),path=require('path');
const marker=/<meta name="nexus-release" content="[^"]*">/;
function stampRelease(root,id){
  if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(id))throw new Error('Identificador de publicación inválido.');
  const files=['index.html','public/index.html'];
  const contents=files.map(file=>{const text=fs.readFileSync(path.join(root,file),'utf8');if(!marker.test(text))throw new Error(`Falta la marca de versión en ${file}.`);return text.replace(marker,`<meta name="nexus-release" content="${id}">`);});
  files.forEach((file,index)=>fs.writeFileSync(path.join(root,file),contents[index]));
}
if(require.main===module){
  const root=path.resolve(__dirname,'..');
  const id=process.env.VERCEL_GIT_COMMIT_SHA||require('child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  stampRelease(root,id);console.log('Identificador de publicación incorporado al HTML.');
}
module.exports={stampRelease};
