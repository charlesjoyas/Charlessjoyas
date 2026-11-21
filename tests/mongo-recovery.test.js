'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {BSON}=require('mongoose').mongo;
const R=require('../lib/mongo-recovery');
const {sha256}=require('../lib/local-recovery');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'charles-mongo-recovery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const calls=[],state={store:{name:'TEST'},products:[{id:'P1',stock:2}],recentTransactions:[{id:'T1'}],updatedAt:'2026-11-21T10:00:00.000Z'};
  class ReadOnlyClient{
    constructor(uri,options){calls.push(['construct',options]);}
    async connect(){calls.push(['connect']);}
    async close(){calls.push(['close']);}
    db(){return {listCollections:()=>({toArray:async()=>[{name:'nexusdatas'},{name:'system.views'}]}),collection:name=>({find:query=>{calls.push(['find',name,query]);return {toArray:async()=>[{key:'main_store',content:state,updatedAt:new Date('2026-11-21')}]};},listIndexes:()=>({toArray:async()=>[{name:'_id_',key:{_id:1}}]})})};}
  }
  return {root,state,calls,ReadOnlyClient};
}
test('MongoDB backup uses only read APIs and restores only a new local file',async t=>{
  const f=fixture(t),directory=path.join(f.root,'snapshot');
  const manifest=await R.snapshot({uri:'mongodb://test.invalid/fake',directory,Client:f.ReadOnlyClient});
  assert.equal(manifest.files.length,1);assert.equal(manifest.files[0].documents,1);assert.equal(f.calls[0][1].readPreference,'secondaryPreferred');assert.equal(f.calls.at(-1)[0],'close');
  const target=path.join(f.root,'restored.json');const result=R.rehearse(directory,target);assert.equal(result.products,1);assert.deepEqual(JSON.parse(fs.readFileSync(target)),f.state);assert.throws(()=>R.rehearse(directory,target),/EEXIST/);
});
test('a corrupt dump is rejected before rehearsal writes a target',async t=>{
  const f=fixture(t),directory=path.join(f.root,'snapshot');const manifest=await R.snapshot({uri:'mongodb://test.invalid/fake',directory,Client:f.ReadOnlyClient});fs.appendFileSync(path.join(directory,manifest.files[0].file),' ');
  const target=path.join(f.root,'rejected.json');assert.throws(()=>R.rehearse(directory,target),/Checksum/);assert.equal(fs.existsSync(target),false);
});
test('an ambiguous store key cannot be silently selected during recovery',async t=>{
  const f=fixture(t),directory=path.join(f.root,'snapshot');const manifest=await R.snapshot({uri:'mongodb://test.invalid/fake',directory,Client:f.ReadOnlyClient});const file=manifest.files[0],location=path.join(directory,file.file),dump=BSON.EJSON.parse(fs.readFileSync(location,'utf8'));dump.documents.push(dump.documents[0]);const bytes=Buffer.from(BSON.EJSON.stringify(dump,{relaxed:false}));fs.writeFileSync(location,bytes);Object.assign(file,{documents:2,bytes:bytes.length,sha256:sha256(bytes)});fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest));
  assert.throws(()=>R.rehearse(directory,path.join(f.root,'ambiguous.json')),/único estado/);
});
test('failed connection closes the client and never creates a completed manifest',async t=>{
  const f=fixture(t);class FailingClient extends f.ReadOnlyClient{async connect(){throw new Error('Test outage');}}
  const directory=path.join(f.root,'failure');await assert.rejects(()=>R.snapshot({uri:'mongodb://test.invalid/fake',directory,Client:FailingClient}),/Test outage/);assert.equal(f.calls.at(-1)[0],'close');assert.equal(fs.existsSync(path.join(directory,'manifest.json')),false);
});
test('backup refuses an existing directory and missing connection before connecting',async t=>{
  const f=fixture(t);await assert.rejects(()=>R.snapshot({uri:'mongodb://test.invalid/fake',directory:f.root,Client:f.ReadOnlyClient}),/nuevo/);await assert.rejects(()=>R.snapshot({directory:path.join(f.root,'missing'),Client:f.ReadOnlyClient}),/MONGO_URI/);assert.equal(f.calls.length,0);
});
