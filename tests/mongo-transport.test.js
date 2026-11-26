'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
test('Mongo transport uses projected authentication, versioned reads and atomic acknowledgments without returning the database on writes',()=>{
 const script=`
 const assert=require('node:assert/strict'),crypto=require('node:crypto');
 process.env.VERCEL='1';process.env.MONGO_URI='mongodb://127.0.0.1:1/never_connect';process.env.AUTH_SECRET='transport-test-secret-at-least-32-characters';
 const mongoose=require('mongoose'),{browserHarness,clone}=require('./tests/helpers');let state=browserHarness().seed,fullReads=0,authReads=0,writes=0,options;
 mongoose.connect=async(uri,opts)=>{options=opts;mongoose.connection.readyState=1;return mongoose;};
 mongoose.models.NexusData={findOne(filter){return {select(projection){this.projection=projection;return this;},async lean(){assert.equal(filter.key,'main_store');if(this.projection?.content){fullReads++;return {content:clone(state)};}authReads++;return {content:{users:clone(state.users),perfiles:clone(state.perfiles),updatedAt:state.updatedAt}};}};},async updateOne(filter,update){writes++;if(filter['content.updatedAt']!==state.updatedAt)return {matchedCount:0};state=clone(update.$set.content);return {matchedCount:1};},findOneAndUpdate(){throw Error('Do not return full documents from writes');}};
 const server=require('./server').listen(0,'127.0.0.1',async()=>{try{
 const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-nexus-client':'stabilized-v1'},body:JSON.stringify({email:'admin@example.test',password:'audit-admin-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.equal(fullReads,0);
 assert.equal((await fetch(base+'/api/data')).status,401);assert.equal(fullReads,0);
 let r=await fetch(base+'/api/data',{headers:{cookie}});assert.equal(r.status,200);await r.json();assert.equal(fullReads,1);
 r=await fetch(base+'/api/data',{headers:{cookie,'x-nexus-known-revision':state.updatedAt}});assert.equal((await r.json()).unchanged,true);assert.equal(fullReads,1);
 const command={type:'setCategoryInventoryScope',operationId:crypto.randomUUID(),baseUpdatedAt:state.updatedAt,args:{categoryId:'oro18k',scope:'extra',reason:'Synthetic transport test'}};
 r=await fetch(base+'/api/operations',{method:'POST',headers:{cookie,'content-type':'application/json','x-nexus-client':'stabilized-v1'},body:JSON.stringify(command)});assert.equal(r.status,200,await r.text());assert.equal(writes,1);assert.equal(fullReads,1);
 r=await fetch(base+'/api/data',{headers:{cookie}});assert.equal(r.status,200);const data=await r.json();assert.equal(data.updatedAt,state.updatedAt);assert.equal(fullReads,1);assert(authReads>1);assert.deepEqual(options.compressors,['zlib']);assert.equal(options.maxPoolSize,5);console.log('Projected auth, conditional reads and atomic writes verified');
 }catch(e){console.error(e.stack);process.exitCode=1;}finally{server.close();}});
 `;
 const output=execFileSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000});assert.match(output,/atomic writes verified/);
});
