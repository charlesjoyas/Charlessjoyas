'use strict';
// Build visual SVG equivalents and CSS selectors. Never rewrite application markup or scripts.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),sources=['index.html',...fs.readdirSync(path.join(root,'js')).filter(n=>n.endsWith('.js')&&!n.includes('.min.')).map(n=>'js/'+n)];
const output=path.join(root,'icons/glass-ui'),publicOutput=path.join(root,'public/icons/glass-ui');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(publicOutput,{recursive:true});
const entries=new Map(),skipped=[];
for(const file of sources){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of source.matchAll(/<svg\b[^>]*viewBox=["']0 0 24 24["'][^>]*>([\s\S]*?)<\/svg>/g)){
  const inner=match[1].trim();
  if(inner.includes('${')||inner.includes('\\')){skipped.push(file);continue;}
  const shapes=[...inner.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)(?:\/?>)/g)];
  if(!shapes.length||/<(?:g|text|image|use|defs|title)\b/.test(inner)){skipped.push(file);continue;}
  const parts=shapes.map((m,i)=>{
   const attrs=[...m[2].matchAll(/([\w:-]+)=["']([^"']*)["']/g)].filter(a=>!['fill','stroke','stroke-width','style','class'].includes(a[1]));
   return '> '+m[1]+':nth-child('+(i+1)+')'+attrs.map(a=>'['+a[1]+'='+JSON.stringify(a[2])+']').join('');
  });
  const selector='svg[viewBox="0 0 24 24"]'+parts.map(p=>':has('+p+')').join('')+':not(:has(> :nth-child('+(shapes.length+1)+')))';
  const id='glass-'+crypto.createHash('sha256').update(selector).digest('hex').slice(0,12);
  entries.set(id,{selector,inner:inner.replace(/currentColor/g,'url(#ink)')});
 }
}
const css=['/* Generated original-geometry glass equivalents. Screen only; native markup and print remain intact. */','@media screen { @supports selector(svg:has(path)) {'];
for(const [id,{selector,inner}]of entries){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="tile" x1="2" y1="1" x2="21" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#90e0f9" stop-opacity=".88"/><stop offset=".48" stop-color="#399bd6" stop-opacity=".83"/><stop offset="1" stop-color="#786bc7" stop-opacity=".9"/></linearGradient><linearGradient id="rim" x1="3" y1="1" x2="21" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity=".92"/><stop offset=".5" stop-color="#d7eaff" stop-opacity=".28"/><stop offset="1" stop-color="#b9bfff" stop-opacity=".65"/></linearGradient><linearGradient id="ink" x1="5" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="#e1f4ff"/></linearGradient><linearGradient id="shine" x2="0" y2="1"><stop stop-color="white" stop-opacity=".46"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect x="1.1" y="1.1" width="21.8" height="21.8" rx="6.2" fill="url(#tile)" stroke="url(#rim)" stroke-width=".8"/><path d="M7.3 2h9.4c3.1 0 5.3 2.2 5.3 5.3v2.5C15 7.5 9 14 2 10V7.3C2 4.2 4.2 2 7.3 2Z" fill="url(#shine)"/><path d="M3.3 17.2c1.5 4.2 8.8 5.3 14.8 3.5" stroke="#c1e7ff" stroke-opacity=".4" stroke-width=".55" stroke-linecap="round"/><g transform="translate(3.6 3.6) scale(.7)" stroke="url(#ink)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
 for(const dir of [output,publicOutput])fs.writeFileSync(path.join(dir,id+'.svg'),svg);
 css.push(selector+' { background-image:url("../icons/glass-ui/'+id+'.svg") !important; background-size:100% 100% !important; background-repeat:no-repeat !important; background-position:center !important; background-color:transparent !important; border-radius:0 !important; box-shadow:none !important; filter:var(--glass-native-icon-filter,drop-shadow(0 2px 2px rgba(28,80,145,.16))) !important; }');
 css.push(selector+' > * { opacity:0 !important; }');
}
css.push('} }');
for(const file of ['css/glass-ui-icons.css','public/css/glass-ui-icons.css'])fs.writeFileSync(path.join(root,file),css.join('\n')+'\n');
console.log(JSON.stringify({originalGeometryVariants:entries.size,skipped:skipped.length,cssBytes:Buffer.byteLength(css.join('\n'))}));
