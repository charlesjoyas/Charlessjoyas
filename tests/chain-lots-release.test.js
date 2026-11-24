'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const enabled of [false,true])test(`Vercel server advertises lots ${enabled?'enabled':'disabled'} without opening or modifying a database`,()=>{
  const source=`
    process.env.VERCEL='1';process.env.NEXUS_LOCAL_ONLY='0';process.env.NEXUS_ENABLE_CHAIN_LOTS='${enabled?'1':'0'}';
    process.env.AUTH_SECRET='isolated-release-test-secret-longer-than-32-characters';process.env.MONGO_URI='mongodb://127.0.0.1:1/no_connection_allowed';
    const assert=require('node:assert/strict');const mongoose=require('mongoose');let calls=0;mongoose.connect=()=>{calls++;throw new Error('Database connection forbidden in release test');};
    const app=require('./server');const server=app.listen(0,'127.0.0.1',async()=>{try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/health');const health=await response.json();assert.equal(health.features.chainLots,${enabled});assert.equal(health.storageMode,'MongoDB');assert.equal(calls,0);}catch(e){console.error(e.message);process.exitCode=1;}finally{server.close();}});
  `;
  const r=spawnSync(process.execPath,['-e',source],{cwd:root,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr||r.error?.message);
});
for(const enabled of [false,true])test(`MongoDB frontend ${enabled?'shows':'hides'} the purchase lot option according to server feature flag`,async()=>{
  const nodes={'chain-lots-open':{hidden:true},'po-chain-lot-option':{hidden:true,disabled:true}};
  const sandbox={window:{},document:{readyState:'complete',getElementById:id=>nodes[id]},fetch:async()=>({ok:true,json:async()=>({storageMode:'MongoDB',features:{chainLots:enabled}})})};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/chain-lots.js'),'utf8'),sandbox);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sandbox.window.NexusChainLots.enabled,enabled);assert.equal(nodes['chain-lots-open'].hidden,!enabled);assert.equal(nodes['po-chain-lot-option'].disabled,!enabled);
});
