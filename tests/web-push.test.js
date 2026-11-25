'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('fs'),vm=require('vm');
const {createPushService,validateSubscription,committedEvents}=require('../lib/web-push');
const {credentialVersion,pushEventsFor}=require('../lib/state-api');
const {browserHarness,memoryApi,clone}=require('./helpers');
const secret='test-only-signing-secret-more-than-32-characters';
function fakeCollection(){
 const rows=new Map();
 const matches=(row,query)=>Object.entries(query).every(([k,v])=>k==='$or'?v.some(q=>matches(row,q)):v&&typeof v==='object'?Object.entries(v).every(([op,n])=>op==='$exists'?(row[k]!==undefined)===n:op==='$lt'?row[k]<n:false):row[k]===v);
 return {rows,findOne:async q=>[...rows.values()].find(r=>matches(r,q))||null,find:q=>({toArray:async()=>[...rows.values()].filter(r=>matches(r,q))}),countDocuments:async q=>[...rows.values()].filter(r=>matches(r,q)).length,
 updateOne:async(q,update,options={})=>{let row=[...rows.values()].find(r=>matches(r,q));if(!row&&!options.upsert)return {modifiedCount:0};if(!row)row={_id:q._id};Object.assign(row,update.$set);rows.set(row._id,row);return{modifiedCount:1};},
 deleteOne:async q=>{const r=[...rows.values()].find(r=>matches(r,q));if(r)rows.delete(r._id);},
 insertOne:async row=>{if(rows.has(row._id))throw Object.assign(new Error('duplicate'),{code:11000});rows.set(row._id,row);}
 };
}
function fixture(options={}){
 let state=browserHarness().seed;
 const collections=new Map(),sent=[],jobs=[];
 const collection=async name=>{if(!collections.has(name))collections.set(name,fakeCollection());return collections.get(name);};
 const vapid=require('web-push').generateVAPIDKeys();
 const service=createPushService({collection,readState:async()=>state,secret,enabled:true,publicKey:vapid.publicKey,privateKey:vapid.privateKey,subject:'https://example.test',send:async(sub,payload)=>sent.push({sub,payload:JSON.parse(payload)}),background:job=>jobs.push(job),...options});
 const identity=(user=state.users[0])=>({userId:user.id,version:credentialVersion(user,secret),events:pushEventsFor(user,state)});
 const req=async(name,body={},who=identity(),query={})=>{const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(b){this.body=b;}};await service[name]({body,query,pushIdentity:who},res);return res;};
 const ecdh=crypto.createECDH('prime256v1');ecdh.generateKeys();
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test-only',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:crypto.randomBytes(16).toString('base64url')}};
 const subscribe=(events=['sales','purchases','cash'],who=identity())=>req('subscribe',{subscription:sub,events,userId:who.userId},who);
 return {service,req,identity,subscribe,sub,collections,sent,jobs,get state(){return state;},set state(value){state=value;}};
}

test('push subscription validates destination and rejects private/network targets and malformed keys',()=>{
 const f=fixture();assert.equal(validateSubscription(f.sub).subscription.endpoint,f.sub.endpoint);
 for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://fcm.googleapis.com:444/x','https://user@fcm.googleapis.com/x','https://evil.test/x'])assert.throws(()=>validateSubscription({...f.sub,endpoint}));
 assert.throws(()=>validateSubscription({...f.sub,keys:{p256dh:'short',auth:'short'}}));
});
test('real Web Push library builds encrypted aes128gcm payload with VAPID without making a request',()=>{
 const f=fixture(),webpush=require('web-push'),keys=webpush.generateVAPIDKeys();
 const request=webpush.generateRequestDetails(f.sub,JSON.stringify({title:'Test'}),{vapidDetails:{subject:'https://example.test',...keys},TTL:3600});
 assert.equal(request.headers['Content-Encoding'],'aes128gcm');assert.match(request.headers.Authorization,/^vapid /i);assert(Buffer.isBuffer(request.body));assert(!request.body.includes(Buffer.from('Test')));
});
test('subscription is encrypted, owned by authenticated user and isolated from business state',async()=>{
 const f=fixture(),before=clone(f.state),r=await f.subscribe();assert.equal(r.statusCode,200);
 const row=[...f.collections.get('web_push_subscriptions').rows.values()][0];
 assert(!JSON.stringify(row).includes(f.sub.endpoint));assert(!JSON.stringify(row).includes(f.sub.keys.auth));assert.deepEqual(f.state,before);
 const status=await f.req('config',{},f.identity(),{device:r.body.id});assert.deepEqual(status.body.device.events,['sales','purchases','cash']);
 const other=await f.req('config',{},f.identity(f.state.users[1]),{device:r.body.id});assert.equal(other.body.device,null);
 assert.match(r.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
});
test('cashier cannot subscribe to purchasing or cash modules it cannot access; changed login rejected',async()=>{
 const f=fixture(),who=f.identity(f.state.users[1]);
 assert.equal((await f.subscribe(['purchases'],who)).statusCode,403);
 assert.equal((await f.subscribe(['cash'],who)).statusCode,200); // fixture cashier has cuadre_caja
 assert.equal((await f.req('subscribe',{subscription:f.sub,events:['sales'],userId:'another-user'})).statusCode,409);
});
test('only newly committed events notify; repricing, KPI refresh and history reconciliation do not replay sales',()=>{
 const before={recentTransactions:[{id:'old',status:'Completada'}],purchases:[],cashShiftLog:{shiftId:'S1',status:'Abierto'}},after=clone(before);
 after.products=[{id:'p1',stock:12}];assert.deepEqual(committedEvents(before,after),[]);
 after.recentTransactions.push({id:'new',status:'Completada'});after.abonosVentas=[{id:'payment'}];
 assert.deepEqual(committedEvents(before,after).map(x=>x.type),['sales']);
 const receipt={...before,purchases:[{id:'PO1',status:'Recibida'}],abonosCompras:[{id:'payment'}]};assert.deepEqual(committedEvents(before,receipt).map(x=>x.type),['purchases']);
 const opening={cashShiftLog:{shiftId:'S2',status:'Abierto'}};assert.equal(committedEvents({},opening)[0].type,'cash');
 assert.equal(committedEvents(opening,{cashShiftLog:{shiftId:'S2',status:'Cerrado'}})[0].type,'cash');
 assert.equal(committedEvents({}, {expenses:[{id:'E1'}]})[0].type,'cash');
});
test('successful dispatch deduplicates events, encrypts payload and contains no financial/client details',async()=>{
 const f=fixture();await f.subscribe();const after=clone(f.state);after.recentTransactions.push({id:'test-sale',status:'Completada',total:999999,customer:'Private name'});
 f.service.committed(f.state,after);f.service.committed(f.state,after);await Promise.all(f.jobs);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].sub.endpoint,f.sub.endpoint);assert(!JSON.stringify(f.sent[0].payload).includes('999999'));assert(!JSON.stringify(f.sent[0].payload).includes('Private name'));
});
test('deactivated users, changed passwords and reduced module permissions stop delivery',async()=>{
 for(const mutation of [state=>state.users[0].status='Inactive',state=>state.users[0].password='changed',state=>{state.users[0].role='Restricted';state.users[0].customPermissions=[];}]){
 const f=fixture();await f.subscribe();const after=clone(f.state);after.expenses.push({id:'new-expense'});mutation(f.state);f.service.committed(f.state,after);await Promise.all(f.jobs);assert.equal(f.sent.length,0);
 }
});
test('expired push endpoints are removed and send failures never reject committed callback',async()=>{
 const f=fixture({send:async()=>{throw Object.assign(new Error('Expired'),{statusCode:410});}});await f.subscribe();const after=clone(f.state);after.expenses.push({id:'new'});
 assert.doesNotThrow(()=>f.service.committed(f.state,after));await Promise.all(f.jobs);assert.equal(f.collections.get('web_push_subscriptions').rows.size,0);
});
test('logout deletes only this device, prevents subsequent delivery and never alters business state',async()=>{
 const f=fixture(),r=await f.subscribe(),before=clone(f.state);
 await f.service.logout({id:'another-user'},r.body.id);assert.equal(f.collections.get('web_push_subscriptions').rows.size,1);
 await f.service.logout(f.state.users[0],r.body.id);assert.equal(f.collections.get('web_push_subscriptions').rows.size,0);assert.deepEqual(f.state,before);
});
test('self-test is own-device only and rate limited; unsupported environment stays disabled',async()=>{
 const f=fixture(),r=await f.subscribe();assert.equal((await f.req('test',{id:r.body.id},f.identity(f.state.users[1]))).statusCode,404);
 assert.equal((await f.req('test',{id:r.body.id})).statusCode,200);assert.equal((await f.req('test',{id:r.body.id})).statusCode,429);
 const disabled=fixture({enabled:false});assert.equal((await disabled.req('config')).body.enabled,false);assert.equal((await disabled.subscribe()).statusCode,503);
});
test('financial save succeeds even if notification scheduling throws or rejects; storage failure sends nothing',async()=>{
 for(const hook of [()=>{throw Error('push unavailable');},()=>Promise.reject(Error('push unavailable'))]){
 const seed=browserHarness().seed,api=memoryApi(seed,{onCommitted:hook}),cookie=await api.login(),data=(await api.request('get',{},cookie)).body;
 data.store.name='Updated test store';const res=await api.request('post',{baseUpdatedAt:seed.updatedAt,data},cookie);assert.equal(res.statusCode,200);
 }
 let count=0;const seed=browserHarness().seed,api=memoryApi(seed,{onCommitted:()=>count++}),cookie=await api.login(),data=(await api.request('get',{},cookie)).body;api.outage(true);
 assert.equal((await api.request('post',{baseUpdatedAt:seed.updatedAt,data},cookie)).statusCode,503);assert.equal(count,0);
});
test('push authorization requires valid session and mutation header; logout cookie identifies device server-side',async()=>{
 let revoked;const api=memoryApi(browserHarness().seed,{onLogout:async(user,id)=>{revoked={user,id};}}),cookie=await api.login();
 assert.equal((await api.request('authorizePush')).statusCode,401);
 assert.equal((await api.request('authorizePush',{},cookie,{'x-nexus-client':''})).statusCode,403);
 const id='a'.repeat(64);await api.request('logout',{},cookie+'; nexus_push_device='+id);assert.equal(revoked.id,id);
});
test('service worker always shows a notification, never intercepts data and opens only own app',async()=>{
 const handlers={},notifications=[],opened=[];let job;
 const self={addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>notifications.push(args)},location:{origin:'https://example.test'},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 const source=fs.readFileSync(require('path').join(__dirname,'../push-sw.js'),'utf8');vm.runInNewContext(source,{self,URL});assert.equal(handlers.fetch,undefined);
 handlers.push({data:{json:()=>{throw Error('malformed');}},waitUntil:p=>job=p});await job;assert.equal(notifications.length,1);
 handlers.push({data:{json:()=>({url:'https://evil.test'})},waitUntil:p=>job=p});await job;assert.equal(notifications[1][1].data.url,'/');
 handlers.notificationclick({notification:{close(){}},waitUntil:p=>job=p});await job;assert.deepEqual(opened,['/']);
});
