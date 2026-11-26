'use strict';

const crypto = require('crypto');
const { isDeepStrictEqual } = require('util');
const inventory = require('../js/safety');
const {executeOperation,operationHash}=require('./operations');
const {coreValidation,validateSnapshotFinance,finalizeState}=require('./financial-validation');
const {syncCatalogNameChanges}=require('./product-names');

const clone = value => JSON.parse(JSON.stringify(value));
const isSuper = user => /^(super admin|superadmin|super administrador)$/i.test(user?.role || '');
const safeUser = user => {
  const result = { ...user };
  delete result.password;
  delete result.passwordHash;
  return result;
};
const publicState = state => {
  const result = clone(state);
  result.users = (result.users || []).map(safeUser);
  if (result.store) delete result.store.deepseekApiKey;
  return result;
};
const fail = (status, message) => Object.assign(new Error(message), { status });
const credentialVersion = (user, secret) => crypto.createHmac('sha256', secret).update(JSON.stringify([
  user.id, user.passwordHash || user.password, user.role, user.customPermissions, user.status
])).digest('hex');

function pushEventsFor(user,state) {
  const permissions=Array.isArray(user.customPermissions)?user.customPermissions:state.perfiles?.find(p=>p.name?.toLowerCase()===user.role?.toLowerCase())?.allowedModules||[];
  const can=names=>isSuper(user)||permissions.includes('*')||names.some(n=>permissions.includes(n));
  return Object.entries({sales:['pos','ventas'],purchases:['comprar'],cash:['cuadre_caja','formas_pago']}).filter(([,names])=>can(names)).map(([event])=>event);
}

function verifyPassword(user, password) {
  if (user.passwordHash) {
    const [salt, hash] = user.passwordHash.split(':');
    if (!salt || !hash) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(user.password || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

// Storage is injected so regression tests never connect to the business database.
function createStateApi({ read, compareAndSwap, secret, secure = false, now = Date.now, chainLotsEnabled = false, onCommitted, onLogout }) {
  if (!secret || secret.length < 32 || secret.startsWith('replace-with-')) throw new Error('AUTH_SECRET debe ser un secreto aleatorio de al menos 32 caracteres.');
  const lifetime = 12 * 60 * 60 * 1000;
  const loginFailures = new Map();
  const sign = value => crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const cookie = (res, user) => {
    const data = Buffer.from(JSON.stringify({ id: user.id, version: credentialVersion(user, secret), exp: now() + lifetime })).toString('base64url');
    res.setHeader('Set-Cookie', `nexus_session=${data}.${sign(data)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${lifetime / 1000}${secure ? '; Secure' : ''}`);
  };
  const authenticate = (req, state) => {
    const token = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('nexus_session='))?.slice(14);
    if (!token) throw fail(401, 'Inicia sesión nuevamente para continuar.');
    const [payload, signature] = token.split('.');
    const expected = Buffer.from(sign(payload || ''));
    const received = Buffer.from(signature || '');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw fail(401, 'Sesión inválida.');
    let session;
    try { session = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch (_) { throw fail(401, 'Sesión inválida.'); }
    const user = state.users?.find(u => u.id === session.id && u.status === 'Active');
    if (!user || session.exp <= now() || session.version !== credentialVersion(user, secret)) throw fail(401, 'La sesión expiró o cambió tu cuenta.');
    return user;
  };
  const getState = async () => {
    const state = await read();
    if (!state || !Array.isArray(state.users)) throw fail(503, 'No se pudo cargar la base de datos. No se registró ningún cambio.');
    return state;
  };
  const persist = async (previous, next) => {
    const timestamp = Math.max(now(), new Date(previous.updatedAt || 0).getTime() + 1);
    next.updatedAt = new Date(timestamp).toISOString();
    if (!await compareAndSwap(previous.updatedAt ?? null, next)) {
      throw fail(409, 'Otro dispositivo actualizó los datos. Actualiza la pantalla y vuelve a intentar la operación.');
    }
    // A notification failure must never turn a committed financial save into an error.
    try { const job=onCommitted?.(previous,next); if(job?.catch)job.catch(()=>console.warn('[Push] No se pudo programar el aviso.')); } catch (_) { console.warn('[Push] No se pudo programar el aviso.'); }
    return next;
  };
  const wrap = fn => async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Browsers must opt in to state changes. Cross-origin forms cannot add this header.
      if (req.method !== 'GET' && req.headers['x-nexus-client'] !== 'stabilized-v1') throw fail(403, 'Actualiza la aplicación antes de continuar.');
      await fn(req, res, next);
    } catch (err) {
      const reference=err.status?undefined:crypto.randomUUID();
      // Record locations, never request contents, credentials or business records.
      if(reference)console.error('[State API]',JSON.stringify({reference,name:err.name,code:err.code,frames:String(err.stack||'').split('\n').slice(1,5).map(line=>line.trim())}));
      res.status(err.status || 503).json({ error: err.status ? err.message : 'No se pudo completar el guardado. Verifica la conexión y vuelve a intentar.', code:err.status?err.code:undefined,reference });
    }
  };
  const moduleAccess = (user, state, names) => {
    if (isSuper(user)) return true;
    const permissions = Array.isArray(user.customPermissions) ? user.customPermissions
      : state.perfiles?.find(p => p.name?.toLowerCase() === user.role?.toLowerCase())?.allowedModules || [];
    return permissions.includes('*') || names.some(name => permissions.includes(name));
  };
  const comparableUsers = users => (users || []).map(user => {
    const u = safeUser(user);
    delete u.lastLogin;
    return u;
  });
  const validateSalesStock = (next, current, user) => {
    const original = new Map(current.recentTransactions.map(t => [t.id, t]));
    const submitted = new Map(next.recentTransactions.map(t => [t.id, t]));
    const products = new Map(current.products.map(p => [p.id, p]));
    const deltas = new Map(), lotBalances = new Map();
    const addDelta = (id, amount) => deltas.set(id, inventory.round((deltas.get(id) || 0) + amount));
    const debt = method => /separe/i.test(method || '') || (/cr[eé]dito/i.test(method || '') && !/tarjeta|d[eé]bito|card/i.test(method || ''));
    const renameAllowed = (oldName, newName) => moduleAccess(user, current, ['clientes']) && !/cajer|vendedor|operad/i.test(user.role || '') && current.customers.some(c => c.name === oldName && next.customers.some(n => n.id === c.id && n.name === newName));
    for (const [id, before] of original) {
      const after = submitted.get(id);
      if (!after) throw fail(400, 'Las ventas se conservan en el historial; no pueden eliminarse.');
      const a = clone(before), b = clone(after);
      if (a.customer !== b.customer && renameAllowed(a.customer, b.customer)) a.customer = b.customer;
      if (a.closedShiftId === undefined && b.closedShiftId === current.cashShiftLog?.shiftId && moduleAccess(user, current, ['cuadre_caja'])) delete b.closedShiftId;
      if (before.status !== 'Reversada' && after.status === 'Reversada') {
        throw fail(403, 'La reversión de ventas requiere una operación documentada del servidor.');
      }
      if (!isDeepStrictEqual(a, b)) throw fail(403, 'El detalle de una venta histórica no se puede modificar.');
    }
    for (const tx of next.recentTransactions.filter(t => !original.has(t.id))) {
      if (!moduleAccess(user, current, ['pos','ventas']) || current.cashShiftLog?.status !== 'Abierto' || tx.shiftId !== current.cashShiftLog.shiftId) throw fail(403, 'Se requiere un turno abierto y permiso POS para registrar una venta.');
      if (tx.status !== 'completed' || !tx.date || !Number.isFinite(tx.timestamp) || tx.timestamp <= 0 || !Number.isFinite(tx.total) || tx.total <= 0 || !Array.isArray(tx.items) || tx.items.length === 0) throw fail(400, 'La venta no contiene fecha, importes o productos válidos.');
      let subtotal = 0;
      for (const item of tx.items) {
        const p = products.get(item.id);
        const q = Number(item.qty ?? item.quantity);
        if (!p || p.status === 'inactive' || String(p.sku) !== String(item.sku) || !Number.isFinite(q) || q <= 0 || !Number.isFinite(item.price) || item.price <= 0 || item.measureType !== (p.measureType || 'Pesaje')) throw fail(400, 'El producto, cantidad o precio de la venta no es válido.');
        const expectedUnit = inventory.isPesaje(p) ? (p.weightUnit || 'g') : (inventory.weight(p) > 0 ? 'g' : 'u.');
        if (item.unit !== expectedUnit || Number(item.pieceWeight || 0) !== inventory.weight(p)) throw fail(400, 'La medida de la venta no coincide con el inventario.');
        if ((item.quantity !== undefined && Number(item.quantity) !== q) || item.total !== Math.round(item.price * q)) throw fail(400, 'La cantidad o el importe del renglón no coincide con la venta.');
        addDelta(p.id, -inventory.restoreQuantity(item, p));
        if(inventory.isChainLot(p)){
          if(!chainLotsEnabled)throw fail(403,'Los lotes de cadenas no están habilitados en este entorno.');
          try{const movement=inventory.lotItem(p,item);lotBalances.set(p.id,{...p,...inventory.lotMovement(lotBalances.get(p.id)||p,movement.grams,movement.units)});}catch(e){throw fail(400,e.message);}
        }else if(item.inventoryMode==='chainLot'||item.unitCount!==undefined||item.lotCode!==undefined)throw fail(400,'Un producto normal no puede descontarse como lote.');
        item.cost = Number(p.cost) || 0;
        item.costUnit = p.weightUnit || 'g';
        item.cogsTotal = Math.round(item.cost * q);
        subtotal += item.total;
      }
      subtotal = Math.round(subtotal);
      const tax = Math.round(subtotal * ((Number(current.store.taxRate) || 0) / 100));
      if (tx.total !== subtotal + tax || tx.subtotal !== subtotal || tx.tax !== tax) throw fail(400, 'El total de la venta no coincide con sus productos e impuesto.');
    }
    for (const [id, delta] of deltas) {
      const before = products.get(id), after = next.products.find(p => p.id === id);
      const expected = inventory.round(Number(before.stock) + delta);
      if (!after || expected < -0.000001 || Math.abs(Number(after.stock) - expected) > 0.000001) throw fail(400, 'El movimiento de stock no coincide con la venta o reversión.');
    }
    for(const before of current.products){
      const after=next.products.find(p=>p.id===before.id);
      if(inventory.isChainLot(before)){
        const expected=lotBalances.get(before.id)||before;
        const fields=['inventoryMode','lotCode','measureType','weightUnit','unit','pieceWeight','weight','category','isExtra','sku'];
        if(!after||fields.some(k=>!isDeepStrictEqual(before[k],after[k]))||after.stockUnits!==expected.stockUnits||after.stock!==expected.stock||after.cost!==before.cost)throw fail(400,'Los saldos, costo e identidad de un lote solo se modifican mediante ingresos, ventas o reversiones documentadas.');
        try{inventory.assertLot(after);}catch(e){throw fail(400,e.message);}
      }else if(inventory.isChainLot(after)||after?.stockUnits!==undefined||after?.lotCode!==undefined)throw fail(400,'No se puede convertir un producto normal en lote.');
    }
    if(next.products.some(p=>!products.has(p.id)&&(inventory.isChainLot(p)||p.stockUnits!==undefined||p.lotCode!==undefined)))throw fail(400,'Registra los lotes mediante su operación de ingreso.');
    if (!moduleAccess(user, current, ['productos','comprar'])) {
      for (const before of current.products) {
        const after = next.products.find(p => p.id === before.id);
        if (!after || Math.abs(Number(after.stock) - inventory.round(Number(before.stock) + (deltas.get(before.id) || 0))) > 0.000001) throw fail(403, 'No puedes ajustar existencias sin una venta o permiso de inventario.');
      }
    }
  };
  const validate = (next, current, user) => {
    const required = ['products', 'users', 'perfiles', 'recentTransactions', 'purchases', 'customers', 'suppliers', 'customerCredits', 'supplierCredits', 'expenses', 'abonosVentas', 'abonosCompras', 'cashShiftsHistory', 'categories'];
    if (!next || !next.store || typeof next.store !== 'object' || Array.isArray(next.store)) throw fail(400, 'Datos incompletos.');
    for (const key of required) {
      if (!Array.isArray(next[key])) throw fail(400, `Falta la colección ${key}.`);
      const ids = new Set();
      for (const item of next[key]) {
        if (!item || !item.id || ids.has(String(item.id))) throw fail(400, `Identificador inválido o duplicado en ${key}.`);
        ids.add(String(item.id));
      }
    }
    const skus = new Set();
    for (const p of next.products) {
      const sku = String(p.sku || '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
      if (!sku || skus.has(sku) || p.stock === null || p.cost === null || !Number.isFinite(Number(p.stock)) || Number(p.stock) < 0 || !Number.isFinite(Number(p.cost)) || Number(p.cost) < 0) throw fail(400, 'SKU, stock o costo de producto inválido.');
      skus.add(sku);
    }
    validateSalesStock(next, current, user);
    validateSnapshotFinance(next,current,user,names=>moduleAccess(user,current,names));
    if (!isSuper(user)) {
      if (!isDeepStrictEqual(comparableUsers(next.users), comparableUsers(current.users)) || next.users.some(u => u.password || u.passwordHash) || !isDeepStrictEqual(next.perfiles, current.perfiles)) throw fail(403, 'Solo Super Admin puede modificar usuarios o permisos.');
      const config = s => { const v = { ...s }; delete v.cashInBox; delete v.shiftStatus; delete v.cashier; delete v.deepseekApiKey; return v; };
      if (!isDeepStrictEqual(config(next.store), config(current.store)) && !moduleAccess(user, current, ['config'])) throw fail(403, 'Sin permiso para cambiar la configuración.');
      // Operational fields can be updated by POS flows; catalog edits require inventory permission.
      const catalog = list => list.map(p => { const r = { ...p }; for (const k of ['stock', 'stockUnits', 'status', 'sold30d', 'monthlySales']) delete r[k]; return r; }).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
      if (!isDeepStrictEqual(catalog(next.products), catalog(current.products)) && !moduleAccess(user, current, ['productos', 'comprar'])) throw fail(403, 'Sin permiso para modificar el catálogo.');
      const categoryMetadata=xs=>(xs||[]).map(c=>{const x={...c};for(const f of ['itemsCount','availableUnits','availableGrams','totalValuation','cost'])delete x[f];return x;});
      if(!isDeepStrictEqual(categoryMetadata(next.categories),categoryMetadata(current.categories))&&!moduleAccess(user,current,['productos','categorias']))throw fail(403,'Sin permiso para modificar categorías.');
      for (const [collection, modules] of Object.entries({ purchases:['comprar'], expenses:['gastos','pos','cuadre_caja'], recentTransactions:['pos','ventas'], abonosVentas:['creditos_clientes','pos','ventas'], abonosCompras:['creditos_proveedores','comprar'], assets:['activos'], services:['servicios'], paymentMethods:['formas_pago'], accountAdjustments:['formas_pago'] })) {
        if (!isDeepStrictEqual(next[collection] || [], current[collection] || []) && !moduleAccess(user, current, modules)) throw fail(403, `Sin permiso para modificar ${collection}.`);
      }
      if (/contad|auditor/i.test(user.role || '')) throw fail(403, 'Este perfil es de solo lectura.');
    }
    next.users = next.users.map(u => {
      const previous = current.users.find(p => p.id === u.id);
      const result = { ...u };
      delete result.passwordHash;
      if (u.password !== undefined && (typeof u.password !== 'string' || u.password.length < 4)) throw fail(400, 'La contraseña debe contener al menos 4 caracteres.');
      if (typeof u.password === 'string' && u.password.length >= 4 && isSuper(user)) {
        result.passwordHash = hashPassword(u.password);
      } else if (previous) {
        if (previous.passwordHash) result.passwordHash = previous.passwordHash;
        else result.password = previous.password;
      } else throw fail(400, 'Todo usuario nuevo necesita una contraseña de al menos 4 caracteres.');
      if (result.passwordHash) delete result.password;
      return result;
    });
    if (!next.users.some(u => isSuper(u) && u.status === 'Active')) throw fail(400, 'Debe permanecer un Super Admin activo.');
    const self = next.users.find(u => u.id === user.id);
    if (!self || self.status !== 'Active' || (isSuper(user) && !isSuper(self))) throw fail(400, 'No puedes eliminar o desactivar tu propia cuenta.');
    // The API key remains server-only and never travels in a client snapshot.
    delete next.store.deepseekApiKey;
    if (current.store?.deepseekApiKey) next.store.deepseekApiKey = current.store.deepseekApiKey;
  };
  let queue = Promise.resolve();
  const serialized = fn => {
    const job = queue.then(fn, fn);
    queue = job.catch(() => {});
    return job;
  };
  return {
    login: wrap(async (req, res) => {
      const state = await getState();
      const identity = String(req.body?.email || '').trim().toLowerCase();
      const attemptKey = `${req.ip || 'local'}:${identity}`;
      const failures = loginFailures.get(attemptKey);
      if (failures && failures.until > now() && failures.count >= 6) throw fail(429, 'Demasiados intentos. Espera cinco minutos antes de intentar de nuevo.');
      const matches = state.users.filter(u => [u.email, u.name].some(v => String(v || '').trim().toLowerCase() === identity));
      const user = matches.length === 1 ? matches[0] : null;
      if (!user || user.status !== 'Active' || !verifyPassword(user, String(req.body?.password || '').trim())) {
        if (loginFailures.size > 10000) for (const [key, entry] of loginFailures) if (entry.until <= now()) loginFailures.delete(key);
        loginFailures.set(attemptKey, { count: failures && failures.until > now() ? failures.count + 1 : 1, until: now() + 300000 });
        throw fail(401, 'Usuario o contraseña incorrectos.');
      }
      loginFailures.delete(attemptKey);
      cookie(res, user);
      res.json({ user: safeUser(user) });
    }),
    session: wrap(async (req, res) => { const s = await getState(); res.json({ user: safeUser(authenticate(req, s)) }); }),
    logout: wrap(async (req, res) => {
      if (onLogout) try {
        const state=await getState();
        const device=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nexus_push_device='))?.slice(18)||req.headers['x-nexus-push-device'];
        await onLogout(authenticate(req,state),device);
      } catch (_) { /* Closing the session still works during a push outage. */ }
      res.setHeader('Set-Cookie', `nexus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`); res.json({ success: true });
    }),
    authorizePush: wrap(async (req,res,next) => {
      const state=await getState(),user=authenticate(req,state);
      req.pushIdentity={userId:user.id,version:credentialVersion(user,secret),events:pushEventsFor(user,state)};
      next();
    }),
    get: wrap(async (req, res) => { const state = await getState(); authenticate(req, state); res.json(publicState(state)); }),
    post: wrap((req, res) => serialized(async () => {
      const state = await getState();
      const user = authenticate(req, state);
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'baseUpdatedAt') || req.body.baseUpdatedAt !== (state.updatedAt ?? null)) throw fail(409, 'Los datos cambiaron en otro dispositivo. Actualiza y vuelve a intentar.');
      if (!req.body.data || typeof req.body.data !== 'object' || Array.isArray(req.body.data)) throw fail(400, 'Datos incompletos.');
      const next = clone(req.body.data);
      validate(next, state, user);
      const productNameChanges=syncCatalogNameChanges(state,next);
      finalizeState(next);
      next.financialLedger ||= [];
      const changed=['products','purchases','customers','suppliers','recentTransactions','expenses','accountAdjustments','cashShiftLog','cashShiftsHistory','users','perfiles','services','assets','categories','paymentMethods','accountInitialBalances'].filter(k=>!isDeepStrictEqual(next[k],state[k]));
      next.financialLedger.push({id:crypto.randomUUID(),type:'state.update',timestamp:now(),actorId:user.id,collections:changed,baseUpdatedAt:state.updatedAt,...(productNameChanges.length?{productNameChanges}:{})});
      await persist(state, next);
      cookie(res, next.users.find(u => u.id === user.id));
      res.json({ success: true, updatedAt: next.updatedAt, users: next.users.map(safeUser), data:publicState(next) });
    })),
    operation: wrap((req,res)=>serialized(async()=>{
      const state=await getState(),user=authenticate(req,state),{type,args={},operationId,baseUpdatedAt}=req.body || {};
      const spec={reclassifyProduct:['productos'],setCategoryInventoryScope:['categorias'],voidExpense:['gastos'],editExpense:['gastos'],reverseAccountAdjustment:['formas_pago'],createPurchase:['comprar'],supplierPayment:['creditos_proveedores','comprar'],customerPayment:['creditos_clientes','pos','ventas'],reverseSale:['pos','ventas'],reversePurchase:['comprar'],editPurchase:['comprar'],voidSupplierPayment:['creditos_proveedores','comprar'],adjustSupplierDebt:['creditos_proveedores'],reconcileSupplierPayment:['creditos_proveedores'],reconcileCustomerPayment:['creditos_clientes'],linkCustomerCredit:['creditos_clientes'],setHistoricalCost:['informes','reports'],restoreHistoricalProduct:['productos'],reconcileProductIdentity:['productos'],setMovementExclusion:['formas_pago']}[type];
      if(!spec)throw fail(400,'Tipo de operación no admitido.');
      if(type==='createPurchase'&&(args.inventoryMode==='chainLot'||inventory.isChainLot(state.products.find(p=>p.id===args.productId||inventory.sku(p.sku)===inventory.sku(args.sku))))&&!chainLotsEnabled)throw fail(403,'Los lotes de cadenas no están habilitados en este entorno.');
      if(/contad|auditor/i.test(user.role || '')||!moduleAccess(user,state,spec))throw fail(403,'Tu perfil no autoriza esta operación.');
      if(!['createPurchase','supplierPayment','customerPayment'].includes(type)&&!isSuper(user)&&!/admin|gerente|supervisor/i.test(user.role||''))throw fail(403,'Esta operación requiere un administrador con permiso del módulo.');
      const existing=(state.financialLedger || []).find(e=>e.id===operationId);
      if(existing){if(existing.actorId!==user.id||existing.requestHash!==operationHash(type,args))throw fail(409,'El identificador ya corresponde a otra operación.');res.json({success:true,alreadyApplied:true,updatedAt:state.updatedAt,data:publicState(state)});return;}
      if(baseUpdatedAt!==(state.updatedAt ?? null))throw fail(409,'Otro dispositivo actualizó los datos. Actualiza antes de continuar.');
      const {state:next,audit}=executeOperation(state,{type,args,operationId},user,now());
      if(!['createPurchase','reverseSale','reversePurchase'].includes(type))for(const p of state.products.filter(inventory.isChainLot)){
        const product=next.products.find(n=>n.id===p.id);
        if(!product)throw fail(400,'Esta operación no puede eliminar un lote.');
        const previous=clone(p),updated=clone(product);
        if(type==='editPurchase'&&audit.metadataOnly){delete previous.name;delete updated.name;}
        if(!isDeepStrictEqual(previous,updated))throw fail(400,'Esta operación no puede modificar un lote. Usa su ingreso o reversión documentada.');
      }
      coreValidation(next,state);
      if(type==='setCategoryInventoryScope'){
        next.kpis ||= {};Object.assign(next.kpis,inventory.inventoryMetrics(next.products,next.categories));
      }else if(!audit.metadataOnly)finalizeState(next);
      await persist(state,next);
      res.json({success:true,updatedAt:next.updatedAt,data:publicState(next),operationId:audit.id});
    })),
    password: wrap((req, res) => serialized(async () => {
      const state = await getState();
      const user = authenticate(req, state);
      const target = state.users.find(u => u.id === (req.body.userId || user.id));
      if (!target || (!isSuper(user) && target.id !== user.id)) throw fail(403, 'Sin permiso para cambiar esta contraseña.');
      if (target.id === user.id && !verifyPassword(user, req.body.currentPassword || '')) throw fail(403, 'La contraseña actual no es correcta.');
      const password = String(req.body.newPassword || '');
      if (password.length < 4) throw fail(400, 'La nueva contraseña debe tener al menos 4 caracteres.');
      const next = clone(state);
      const modified = next.users.find(u => u.id === target.id);
      modified.passwordHash = hashPassword(password);
      delete modified.password;
      await persist(state, next);
      cookie(res, next.users.find(u => u.id === user.id));
      res.json({ success: true, updatedAt: next.updatedAt });
    })),
    authorizeAi: async (req, res, next) => {
      try { const state = await getState(); const user = authenticate(req, state); if (!moduleAccess(user, state, ['informes','reports'])) throw fail(403, 'Sin permiso para consultar IA.'); next(); }
      catch (err) { res.status(err.status || 503).json({ error: err.status ? err.message : 'Servicio no disponible.' }); }
    }
  };
}

module.exports = { createStateApi, publicState, verifyPassword, credentialVersion, pushEventsFor };
