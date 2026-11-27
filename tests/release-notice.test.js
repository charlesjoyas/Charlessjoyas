'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm');
const {spawnSync}=require('node:child_process');
const {stampRelease}=require('../scripts/stamp-release');
const root=path.resolve(__dirname,'..'),id='a'.repeat(40),next='b'.repeat(40);
function harness(loaded=id,href='https://charlessjoyas.vercel.app/'){
 let release=loaded,navigation=null,clock=20000,modal=false,fail=false,reloads=0,requests=0;
 const nodes={'release-update-notice':{hidden:true},'release-update-button':{disabled:false},'release-update-help':{textContent:''}},intervals=[];
 const app={currentUser:{id:'user'},cart:[],showToast(){}};
 const context={Date:{now:()=>clock},URL,AbortController,setTimeout,clearTimeout,setInterval:(fn,ms)=>intervals.push({fn,ms}),document:{readyState:'complete',visibilityState:'visible',querySelector:selector=>selector.startsWith('meta')?{content:loaded}:modal?{}:null,getElementById:key=>nodes[key],addEventListener(){}},window:{app,location:{href,replace:target=>{navigation=target;reloads++;}},addEventListener(){}},fetch:async()=>{requests++;if(fail)throw Error('offline');return{ok:true,json:async()=>({release})};}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'js/release-notice.js'),'utf8'),context);
 return {app,nodes,context,intervals,get navigation(){return navigation;},get reloads(){return reloads;},get requests(){return requests;},get visible(){return !nodes['release-update-notice'].hidden;},get disabled(){return nodes['release-update-button'].disabled;},modal:value=>{modal=value;},offline:value=>{fail=value;},check:async value=>{release=value;clock+=60001;await context.window.CharlesRelease.check();},render:()=>intervals.find(x=>x.ms===1000).fn()};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('a new published version displays a notice without automatically reloading or touching the cart',async()=>{
 const h=harness();await settle();assert(!h.visible);await h.check(next);assert(h.visible);assert.equal(h.reloads,0);assert.deepEqual(h.app.cart,[]);
 h.context.window.CharlesRelease.reload();assert.equal(h.reloads,1);
});
test('update navigates with a fresh cache key, preserves the route and disappears on the newly loaded release',async()=>{
 const h=harness(id,'https://charlessjoyas.vercel.app/index.html?view=pos#carrito');await settle();await h.check(next);h.context.window.CharlesRelease.reload();
 const target=new URL(h.navigation);assert.equal(target.pathname,'/index.html');assert.equal(target.searchParams.get('view'),'pos');assert.equal(target.hash,'#carrito');assert(target.searchParams.get('_nexus_update').startsWith(next+'.'));
 await h.check(next);h.context.window.CharlesRelease.reload();assert.notEqual(h.navigation,target.href,'Each user-requested update bypasses a cached navigation');
 const refreshed=harness(next,h.navigation);await settle();assert(!refreshed.visible);await refreshed.check(next);assert(!refreshed.visible);assert.equal(refreshed.reloads,0);
});

test('sale, in-flight save, unresolved transaction and open form all prevent refresh, including a click-time race',async()=>{
 const h=harness();await settle();await h.check(next);
 for(const key of ['cart','_mutationActive','_isSaving','_requiresRefresh']){
   h.app[key]=key==='cart'?[{qty:2,price:430000}]:true;h.context.window.CharlesRelease.reload();assert.equal(h.reloads,0);assert(h.disabled);assert(h.nodes['release-update-help'].textContent);
   if(key==='cart')assert.deepEqual(h.app.cart,[{qty:2,price:430000}]);h.app[key]=key==='cart'?[]:false;
 }
 h.modal(true);h.render();assert(h.disabled);h.context.window.CharlesRelease.reload();assert.equal(h.reloads,0);h.modal(false);h.render();assert(!h.disabled);
});
test('dismissed version stays hidden, a subsequent deployment appears, and rollback to the loaded version clears notice',async()=>{
 const h=harness();await settle();await h.check(next);h.context.window.CharlesRelease.later();assert(!h.visible);await h.check(next);assert(!h.visible);await h.check('c'.repeat(40));assert(h.visible);await h.check(id);assert(!h.visible);
});
test('network failure and invalid version do not create false notices; anonymous screen stays hidden',async()=>{
 const h=harness();await settle();h.offline(true);await h.check(next);assert(!h.visible);h.offline(false);await h.check('<script>bad</script>');assert(!h.visible);
 h.app.currentUser=null;await h.check(next);assert(!h.visible);h.app.currentUser={id:'user'};h.render();assert(h.visible);
});
test('checks are throttled on focus, and hidden pages do not poll',async()=>{
 const h=harness();await settle();const count=h.requests;await h.context.window.CharlesRelease.check();assert.equal(h.requests,count);h.context.document.visibilityState='hidden';await h.check(next);assert.equal(h.requests,count);
});
test('build stamps identical HTML with a commit, preserves inputs and never reads business data',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'charles-release-test-'));fs.mkdirSync(path.join(temp,'public'));
 try{const html='<meta name="nexus-release" content="development"><input value="unchanged">';for(const file of ['index.html','public/index.html'])fs.writeFileSync(path.join(temp,file),html);
 stampRelease(temp,next);const body=fs.readFileSync(path.join(temp,'index.html'),'utf8');assert(body.includes(next));assert(body.includes('value="unchanged"'));assert.equal(body,fs.readFileSync(path.join(temp,'public/index.html'),'utf8'));
 assert.throws(()=>stampRelease(temp,'bad" markup'));assert.deepEqual(fs.readdirSync(temp).sort(),['index.html','public']);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('version endpoint has no cache and never connects to the database',()=>{
 const script=`process.env.NEXUS_LOCAL_ONLY='1';process.env.AUTH_SECRET='version-test-only-signing-secret-more-than-32-characters';const mongoose=require('mongoose');mongoose.connect=()=>{throw Error('Database forbidden');};const assert=require('assert/strict');const server=require('./server').listen(0,'127.0.0.1',async()=>{try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/version');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(Object.keys(await r.json()),['release']);for(const route of ['/', '/index.html','/?_nexus_update=test']){const page=await fetch('http://127.0.0.1:'+server.address().port+route);assert.equal(page.status,200);assert.equal(page.headers.get('cache-control'),'no-store');await page.text();}}catch(e){console.error(e.message);process.exitCode=1;}finally{server.close();}});`;
 const result=spawnSync(process.execPath,['-e',script],{cwd:root,encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr||result.error?.message);
});
