'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
test('server can initialize twice in the same warm process without overwriting its model or opening MongoDB',()=>{
 const script=`process.env.NEXUS_LOCAL_ONLY='1';process.env.AUTH_SECRET='isolated-initialization-test-at-least-32-characters';const mongoose=require('mongoose');mongoose.connect=()=>{throw Error('Unexpected database connection');};const file=require.resolve('./server');require(file);const model=mongoose.models.NexusData;delete require.cache[file];require(file);if(mongoose.models.NexusData!==model)throw Error('Model changed');console.log('Reused model without database connection');`;
 const output=execFileSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.match(output,/Reused model without database connection/);
});
