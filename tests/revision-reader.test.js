'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createRevisionReader}=require('../lib/revision-reader');
test('unchanged revisions reuse a snapshot only after a successful fresh metadata read',async()=>{
 let revision='A',reads=0,metadata=0;const read=createRevisionReader({metadata:async()=>{metadata++;return {updatedAt:revision};},full:async()=>{reads++;return {updatedAt:revision,products:[{stock:1}]};}});
 const a=await read();a.products[0].stock=100;assert.equal((await read()).products[0].stock,1);assert.equal(reads,1);assert.equal(metadata,2);revision='B';assert.equal((await read()).updatedAt,'B');assert.equal(reads,2);
});
test('metadata failures never expose an older cached state',async()=>{
 let outage=false;const read=createRevisionReader({metadata:async()=>{if(outage)throw Error('offline');return {updatedAt:'A'};},full:async()=>({updatedAt:'A'})});await read();outage=true;await assert.rejects(read,/offline/);
});
test('parallel full reads coalesce and return independent copies',async()=>{
 let reads=0;const read=createRevisionReader({metadata:async()=>({updatedAt:'A'}),full:async()=>{reads++;await new Promise(r=>setTimeout(r,5));return {updatedAt:'A',stock:1};}});const [a,b]=await Promise.all([read(),read()]);a.stock=2;assert.equal(b.stock,1);assert.equal(reads,1);
});
test('a confirmed commit is reused only if MongoDB still reports its revision',async()=>{
 let rev='B',reads=0;const read=createRevisionReader({metadata:async()=>({updatedAt:rev}),full:async()=>{reads++;return {updatedAt:rev};}});read.committed({updatedAt:'B'});assert.equal((await read()).updatedAt,'B');assert.equal(reads,0);rev='C';assert.equal((await read()).updatedAt,'C');assert.equal(reads,1);
});
test('a full read that races with a newer revision does not retain the older snapshot',async()=>{
 let n=0;const read=createRevisionReader({metadata:async()=>({updatedAt:++n===1?'A':'C'}),full:async()=>({updatedAt:n===1?'B':'C'})});assert.equal((await read()).updatedAt,'C');
});
test('unversioned legacy snapshots are read fresh and failures can be retried',async()=>{
 let calls=0;const read=createRevisionReader({metadata:async()=>({}),full:async()=>{calls++;if(calls===1)throw Error('timeout');return {value:calls};}});await assert.rejects(read,/timeout/);assert.equal((await read()).value,2);assert.equal((await read()).value,3);
});
