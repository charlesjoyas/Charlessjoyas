'use strict';
const crypto=require('crypto');
const webpush=require('web-push');
const {credentialVersion,pushEventsFor}=require('./state-api');
const {inactive}=require('../js/ledger');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(status,message)=>Object.assign(new Error(message),{status});
const eventNames=['sales','purchases','cash'];

function validateSubscription(input) {
  if(!input||typeof input.endpoint!=='string'||input.endpoint.length>2048)throw fail(400,'Suscripción inválida.');
  let url;try{url=new URL(input.endpoint);}catch(_){throw fail(400,'Destino inválido.');}
  const host=url.hostname;
  const allowed=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host==='web.push.apple.com'||host.endsWith('.web.push.apple.com')||host.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!allowed)throw fail(400,'Servicio de notificaciones no admitido.');
  for(const [name,size] of [['p256dh',65],['auth',16]]) {
    const key=input.keys?.[name];
    if(typeof key!=='string'||!/^[A-Za-z0-9_-]+={0,2}$/.test(key)||Buffer.from(key,'base64url').length!==size)throw fail(400,'Clave de dispositivo inválida.');
  }
  if(Buffer.from(input.keys.p256dh,'base64url')[0]!==4)throw fail(400,'Clave de dispositivo inválida.');
  try{crypto.ECDH.convertKey(Buffer.from(input.keys.p256dh,'base64url'),'prime256v1');}catch(_){throw fail(400,'Clave de dispositivo inválida.');}
  const subscription={endpoint:url.href,keys:{p256dh:input.keys.p256dh,auth:input.keys.auth}};
  return {subscription,id:hash(subscription.endpoint)};
}

// Compare only newly committed records. Editing stock, repricing or reconciling history
// must not replay old sales. No business records are written by this module.
function committedEvents(before,after) {
  const events=[];
  const changes=(key,type,label)=>{
    const old=new Map((before[key]||[]).map(x=>[x.id,x]));
    for(const record of after[key]||[]) {
      if(!record.id)continue;
      const previous=old.get(record.id);
      if(!previous&&!inactive(record.status))events.push({id:hash(`${type}:${key}:${record.id}:new`),type,body:label});
      else if(previous&&!inactive(previous.status)&&inactive(record.status))events.push({id:hash(`${type}:${key}:${record.id}:void`),type,body:'Se anuló un movimiento. Consulta el detalle en la aplicación.'});
    }
  };
  changes('recentTransactions','sales','Se registró una venta. Consulta el detalle en la aplicación.');
  changes('purchases','purchases','Se registró una compra. Consulta el detalle en la aplicación.');
  // Purchase / sale receipts can include a payment. Avoid sending a second alert for it.
  if(!events.length)for(const key of ['expenses','accountAdjustments','abonosCompras','abonosVentas'])changes(key,'cash','Se registró un movimiento de caja. Consulta el detalle en la aplicación.');
  const a=before.cashShiftLog||{},b=after.cashShiftLog||{};
  if((a.shiftId!==b.shiftId||a.status!==b.status)&&b.shiftId)events.push({id:hash(`shift:${b.shiftId}:${b.status}`),type:'cash',body:b.status==='Abierto'?'Se abrió un turno de caja.':'Se cerró un turno de caja.'});
  return events;
}

function createPushService({collection,readState,secret,publicKey,privateKey,subject,enabled=false,secure=false,send=webpush.sendNotification,background=()=>{},now=Date.now}) {
  const ready=!!(enabled&&publicKey&&privateKey&&subject);
  const encryptionKey=crypto.createHash('sha256').update(`nexus-web-push-v1:${secret}`).digest();
  const encrypt=value=>{const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey,iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');};
  const decrypt=value=>{const b=Buffer.from(value,'base64'),decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString());};
  const deviceId=id=>{if(typeof id!=='string'||!/^([a-f0-9]{64})$/.test(id))throw fail(400,'Dispositivo inválido.');return id;};
  const route=(fn,requireReady=true)=>async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{if(requireReady&&!ready)throw fail(503,'Las notificaciones todavía no están configuradas.');await fn(req,res);}
    catch(error){res.status(error.status||503).json({error:error.status?error.message:'No se pudo completar la configuración de avisos. Intenta nuevamente.'});}
  };
  const unsubscribe=async(userId,id)=>{
    if(!ready||!id)return;
    const db=await collection('web_push_subscriptions');
    await db.deleteOne({_id:deviceId(id),userId});
  };
  const deliver=async(record,event)=>{
    // Recheck active account and permissions immediately before dispatch.
    const state=await readState(),user=state.users?.find(u=>u.id===record.userId&&u.status==='Active');
    if(!user||credentialVersion(user,secret)!==record.version||!pushEventsFor(user,state).includes(event.type))return;
    const db=await collection('web_push_subscriptions');
    const current=await db.findOne({_id:record._id,userId:record.userId,version:record.version});
    if(!current||!current.events.includes(event.type))return;
    const claims=await collection('web_push_deliveries');
    try{await claims.insertOne({_id:hash(`${record._id}:${event.id}`),expiresAt:new Date(now()+7*86400000)});}catch(e){if(e.code===11000)return;throw e;}
    const payload={title:{sales:'Charles Joyas · Venta',purchases:'Charles Joyas · Compra',cash:'Charles Joyas · Caja'}[event.type],body:event.body,tag:event.id,url:'/',icon:'/icons/app-192.png'};
    try {
      await send(decrypt(current.subscription),JSON.stringify(payload),{vapidDetails:{subject,publicKey,privateKey},TTL:3600,timeout:5000,urgency:'normal'});
    }catch(e){
      if(e.statusCode===404||e.statusCode===410)await db.deleteOne({_id:record._id,userId:record.userId,version:record.version});
      // Never log an endpoint, key, payload or financial state.
      console.warn('[Push] Aviso no entregado.',Number(e.statusCode)||'red');
      throw new Error('El servicio de notificaciones no confirmó la entrega.');
    }
  };
  const dispatch=async events=>{
    const db=await collection('web_push_subscriptions');
    const records=await db.find({}).toArray();
    // Small bounded batches avoid exhausting sockets during a large receipt.
    const jobs=records.flatMap(record=>events.filter(e=>record.events.includes(e.type)).map(event=>()=>deliver(record,event)));
    for(let i=0;i<jobs.length;i+=8)await Promise.allSettled(jobs.slice(i,i+8).map(fn=>fn()));
  };
  return {
    ready,
    config:route(async(req,res)=>{
      res.setHeader('Cache-Control','no-store');
      const result={enabled:ready,publicKey:ready?publicKey:null,allowedEvents:req.pushIdentity.events,device:null};
      if(ready&&req.query.device){const db=await collection('web_push_subscriptions');const row=await db.findOne({_id:deviceId(req.query.device),userId:req.pushIdentity.userId,version:req.pushIdentity.version});if(row)result.device={id:row._id,events:row.events};}
      res.json(result);
    },false),
    subscribe:route(async(req,res)=>{
      const {subscription,id}=validateSubscription(req.body?.subscription),identity=req.pushIdentity;
      if(req.body.userId!==identity.userId)throw fail(409,'La cuenta cambió. Abre nuevamente las notificaciones.');
      const selected=req.body?.events;
      if(!Array.isArray(selected)||!selected.length||selected.length>3||selected.some(x=>!eventNames.includes(x)||!identity.events.includes(x)))throw fail(403,'Selecciona avisos autorizados para tu perfil.');
      const db=await collection('web_push_subscriptions');
      if(await db.countDocuments({userId:identity.userId})>=20&&!await db.findOne({_id:id,userId:identity.userId}))throw fail(429,'Esta cuenta alcanzó el límite de dispositivos.');
      await db.updateOne({_id:id},{$set:{userId:identity.userId,version:identity.version,events:[...new Set(selected)],subscription:encrypt(subscription),updatedAt:new Date(now())}},{upsert:true});
      res.setHeader('Set-Cookie',`nexus_push_device=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${secure?'; Secure':''}`);
      res.json({success:true,id,events:[...new Set(selected)]});
    }),
    unsubscribe:route(async(req,res)=>{await unsubscribe(req.pushIdentity.userId,req.body?.id);res.json({success:true});}),
    test:route(async(req,res)=>{
      const db=await collection('web_push_subscriptions'),row=await db.findOne({_id:deviceId(req.body?.id),userId:req.pushIdentity.userId,version:req.pushIdentity.version});
      if(!row)throw fail(404,'Activa primero los avisos de este dispositivo.');
      const limit=now()-30000;
      const lock=await db.updateOne({_id:row._id,$or:[{lastTest:{$exists:false}},{lastTest:{$lt:limit}}]},{$set:{lastTest:now()}});
      if(!lock.modifiedCount)throw fail(429,'Espera 30 segundos antes de enviar otra prueba.');
      await deliver(row,{id:crypto.randomUUID(),type:row.events.find(x=>req.pushIdentity.events.includes(x)),body:'Los avisos de Charles Joyas están funcionando en este dispositivo.'});
      res.json({success:true});
    }),
    logout:(user,id)=>unsubscribe(user.id,id),
    committed:(before,after)=>{
      if(!ready)return;
      const events=committedEvents(before,after);if(!events.length)return;
      const job=dispatch(events).catch(()=>console.warn('[Push] No se pudo procesar el aviso.'));
      // waitUntil keeps dispatch alive after Express returns on Vercel.
      background(job);
    }
  };
}

module.exports={createPushService,validateSubscription,committedEvents};
