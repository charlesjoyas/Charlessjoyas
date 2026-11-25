'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert/strict');
const root = path.join(__dirname,'..');
const assets = ['index.html','js/app.js','js/push-notifications.js','push-sw.js','manifest.webmanifest','icons/app-180.png','icons/app-192.png','icons/app-512.png','js/chain-lots.js','js/data.js','js/safety.js','js/ledger.js','js/reconciliation.js','css/styles.css','css/nexus_ai.css','showcase/index.html','showcase/js/showcase.js','showcase/css/showcase.css'];
for (const name of assets) {
  assert.ok(fs.readFileSync(path.join(root,name)).equals(fs.readFileSync(path.join(root,'public',name))),`${name}: public copy differs`);
}
for (const name of ['server.js','lib/state-api.js','lib/operations.js','lib/financial-validation.js','lib/local-recovery.js','lib/mongo-recovery.js','scripts/reconcile-history.js','scripts/local-recovery.js','scripts/mongo-recovery.js','scripts/export-git-evidence.js','scripts/validate-isolated-copy.js','scripts/build-reconciliation-review.js','js/app.js','js/data.js','js/safety.js','js/ledger.js','js/reconciliation.js','showcase/js/showcase.js']) execFileSync(process.execPath,['--check',path.join(root,name)]);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const name of ['lib/web-push.js','js/push-notifications.js','push-sw.js'])execFileSync(process.execPath,['--check',path.join(root,name)]);
execFileSync(process.execPath,['--check',path.join(root,'js/chain-lots.js')]);
execFileSync(process.execPath,['--check',path.join(root,'scripts/chain-lots-local.js')]);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'duplicate HTML IDs');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const methods=new Set([...app.matchAll(/^  (?:async )?([\w$]+)\(/gm)].map(m=>m[1]));
for(const m of html.matchAll(/\bapp\.([\w$]+)\(/g))assert.ok(methods.has(m[1]),`missing handler ${m[1]}`);
for(const name of ['js/app.js','js/data.js','index.html','server.js','.env.example']) {
  const body=fs.readFileSync(path.join(root,name),'utf8');
  assert.ok(!/mongodb(?:\+srv)?:\/\/[^\s'"<>]+:[^\s'"<>]+@/.test(body.replace('USER:PASSWORD@','USER@')),`${name}: embedded database credential`);
}
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
assert.equal(config.git?.deploymentEnabled?.['codex/preopening-stabilization'],false,'stabilization branch must not auto-deploy while production is in use');
assert.ok(!app.includes('Ghost superadmin authentication'),'hidden owner login');
console.log('Release checks passed: syntax, public parity, handlers, HTML IDs and credential scan.');
