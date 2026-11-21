'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');
const { browserHarness, product, root } = require('./helpers');

test('real HTTP server: authentication, write, reload, conflict and internal file protection', async t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'charles-pos-regression-'));
  const file = path.join(tmp,'db.json');
  const {seed}=browserHarness();seed.products=[product()];fs.writeFileSync(file,JSON.stringify(seed));
  const sourceFile=path.join(root,'db.json'), original=fs.readFileSync(sourceFile);
  const child=spawn(process.execPath,['-e',"const app=require('./server');const s=app.listen(0,'127.0.0.1',()=>console.log('AUDIT_PORT='+s.address().port));"],{
    cwd:root,env:{...process.env,NEXUS_LOCAL_ONLY:'1',NEXUS_DB_FILE:file,NEXUS_BACKUP_DIR:path.join(tmp,'snapshots'),AUTH_SECRET:'isolated-http-test-secret-more-than-32-characters',VERCEL:''},stdio:['ignore','pipe','pipe']
  });
  t.after(async()=>{
    const exited=once(child,'exit');child.kill();await exited;
    assert.ok(fs.readFileSync(sourceFile).equals(original),'business db.json must never change');
    const relative=path.relative(os.tmpdir(),tmp);
    assert.ok(!relative.startsWith('..')&&relative.startsWith('charles-pos-regression-'));
    fs.rmSync(tmp,{recursive:true,force:true});
  });
  const port=await new Promise((resolve,reject)=>{
    let output='';const timeout=setTimeout(()=>reject(new Error('test server startup timeout')),10000);
    child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/AUDIT_PORT=(\d+)/);if(m){clearTimeout(timeout);resolve(Number(m[1]));}});
    child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`test server exited ${code}`));});
  });
  const url=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(url+'/api/data')).status,401);
  for(const target of ['/db.json','/server.js','/lib/state-api.js','/tests/helpers.js','/backups/anything','/.env'])assert.equal((await fetch(url+target)).status,403,target);
  assert.equal((await fetch(url+'/')).status,200);
  const login=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-nexus-client':'stabilized-v1'},body:JSON.stringify({email:'admin@example.test',password:'audit-admin-password'})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const state=await (await fetch(url+'/api/data',{headers:{cookie}})).json();
  assert.equal(state.users[0].password,undefined);state.products[0].stock=9;
  const headers={cookie,'content-type':'application/json','x-nexus-client':'stabilized-v1'};
  const save=await fetch(url+'/api/data',{method:'POST',headers,body:JSON.stringify({baseUpdatedAt:state.updatedAt,data:state})});
  assert.equal(save.status,200);
  assert.equal(JSON.parse(fs.readFileSync(file)).products[0].stock,9);
  const stale=await fetch(url+'/api/data',{method:'POST',headers,body:JSON.stringify({baseUpdatedAt:state.updatedAt,data:state})});
  assert.equal(stale.status,409);
  const reloaded=await(await fetch(url+'/api/data',{headers:{cookie}})).json();
  assert.equal(reloaded.products[0].stock,9);
});
