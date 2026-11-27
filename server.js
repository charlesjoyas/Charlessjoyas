const express = require('express');
const crypto = require('crypto');
const { createStateApi } = require('./lib/state-api');
const {createRevisionReader}=require('./lib/revision-reader');
const {compactMongoPipeline,auditMongoPipeline}=require('./lib/compact-state');
const {stateUpdate}=require('./lib/state-update');
const localRecovery=require('./lib/local-recovery');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

// Zero-dependency local .env loader
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    envLines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (e) {}

// Ensure robust DNS resolution for MongoDB Atlas SRV records locally (avoid on Vercel AWS Lambda)
if (!process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.NEXUS_LOCAL_ONLY === '1' ? '' : (process.env.MONGO_URI || '');
const DB_FILE = process.env.NEXUS_DB_FILE || path.join(__dirname, 'db.json');
const AUTH_SECRET = process.env.AUTH_SECRET || (!process.env.VERCEL ? crypto.randomBytes(48).toString('hex') : '');

app.disable('x-powered-by');
// Public deployment metadata only; this endpoint does not open MongoDB.
const publishedHtml=fs.readFileSync(path.join(__dirname,'public','index.html'),'utf8');
const publishedRelease=publishedHtml.match(/<meta name="nexus-release" content="([^"]+)">/)?.[1]||'development';
app.get('/api/version',(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.json({release:publishedRelease});
});
app.use(express.json({ limit: '10mb' }));
// Security Middleware: Strict restriction on internal database, config, backups, reports and server files
app.use((req, res, next) => {
  let decodedPath = req.path;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch (_) {
    return res.status(400).json({ error: 'Solicitud inválida' });
  }
  const normalizedPaths = [req.path, decodedPath].map(p => String(p || '').replace(/\/{2,}/g, '/'));
  const blockedPatterns = [
    /^\/db\.json(\.tmp(\.[^/]*)?)?$/i,
    /^\/backups(\/|$)/i,
    /^\/server\.js$/i,
    /^\/(lib|tests|scripts|docs)(\/|$)/i,
    /^\/api\/index\.js$/i,
    /^\/package(-lock)?\.json$/i,
    /^\/vercel\.json$/i,
    /^\/node_modules(\/|$)/i,
    /^\/scratch(\/|$)/i,
    /^\/AUDITORIA_/i,
    /^\/INFORME_/i,
    /\.(pdf|md|jsonl?|patch|backup)$/i,
    /^\/\.vscode(\/|$)/i,
    /^\/\.git(\/|$)/i,
    /^\/\.env(\.|$)/i,
    /^\/\.[a-zA-Z0-9_-]+/i
  ];
  if (normalizedPaths.some(p => blockedPatterns.some(regex => regex.test(p)))) {
    return res.status(403).json({ error: 'Acceso prohibido: Recurso protegido del sistema' });
  }
  next();
});

const frontendStaticOptions={setHeaders(res,file){if(path.extname(file)==='.html')res.setHeader('Cache-Control','no-store');}};
app.use(express.static(path.join(__dirname, 'public'),frontendStaticOptions));
app.use(express.static(__dirname,frontendStaticOptions));

// Explicit frontend route handler for root requests
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control','no-store');
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

let mongoConnected = false;
let connectingPromise = null;
let lastMongoError = null;
let writeQueue = Promise.resolve();

mongoose.connection.on('connected', () => {
  mongoConnected = true;
  lastMongoError = null;
});
mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
});
mongoose.connection.on('error', (err) => {
  mongoConnected = false;
  lastMongoError = err?.message || 'Mongo error';
});

// Mongoose Schema for general state
const DataSchema = new mongoose.Schema({
  key: { type: String, default: 'main_store', unique: true },
  content: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});
// Serverless loaders can evaluate this entry point again in a warm process.
const DataModel = mongoose.models.NexusData || mongoose.model('NexusData', DataSchema);

// Robust Serverless-friendly MongoDB Atlas Connection Manager
async function ensureDbConnected() {
  if (!MONGO_URI) return false;
  if (mongoose.connection.readyState === 1) {
    mongoConnected = true;
    lastMongoError = null;
    return true;
  }
  if (mongoose.connection.readyState === 2 && connectingPromise) {
    try {
      await connectingPromise;
    } catch (_) {}
    mongoConnected = mongoose.connection.readyState === 1;
    return mongoConnected;
  }
  try {
    connectingPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 75000,
      compressors: ['zlib'],
      maxPoolSize: 5
    });
    await connectingPromise;
    mongoConnected = true;
    lastMongoError = null;
    console.log('[Nexus Server] Conectado exitosamente a MongoDB Atlas');
    return true;
  } catch (err) {
    console.warn('[Nexus Server] MongoDB no disponible.');
    mongoConnected = false;
    lastMongoError = err.message;
    connectingPromise = null;
    return false;
  }
}

// Connections are lazy; importing this module never opens a database connection.

// Helper: load local db file
function loadLocalDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('[Nexus Server] Error leyendo db.json:', e);
    }
  }
  return null;
}

// Helper: save local db file atomically
function saveLocalDb(data) {
  if (process.env.VERCEL) {
    return; // Read-only filesystem in Vercel, MongoDB Atlas handles persistence
  }
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpFile = `${DB_FILE}.tmp.${uniqueSuffix}`;
  try {
    if(fs.existsSync(DB_FILE))localRecovery.backup(DB_FILE,process.env.NEXUS_BACKUP_DIR||undefined);
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (e) {
    console.error('[Nexus Server] Error escribiendo db.json:', e);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (_) {}
    throw e;
  }
}

// Authentication and polling only need a small projection, never the full inventory/history.
async function readAuthStore(){
  if(MONGO_URI){
    if(!await ensureDbConnected())throw new Error('Database unavailable');
    const projection={'content.perfiles':1,'content.updatedAt':1,_id:0};
    for(const field of ['id','name','email','role','customPermissions','status','password','passwordHash'])projection['content.users.'+field]=1;
    const doc=await DataModel.findOne({key:'main_store'}).select(projection).lean();
    return doc?.content||null;
  }
  if(process.env.VERCEL)throw new Error('MONGO_URI is required');
  return loadLocalDb();
}
const readMongoSnapshot=createRevisionReader({metadata:readAuthStore,full:async()=>{
  const doc=await DataModel.findOne({key:'main_store'}).select({content:1,_id:0}).lean();
  return doc?.content||null;
}});
const readMongoCompact=createRevisionReader({metadata:readAuthStore,full:async()=>{
  // Aggregation only shapes a response; there is no $out, $merge or storage mutation.
  const rows=await DataModel.aggregate(compactMongoPipeline());
  return rows[0]?.content||null;
}});
async function readCompactStore(){
  if(!MONGO_URI)return readStore();
  if(!await ensureDbConnected())throw new Error('Database unavailable');
  return readMongoCompact();
}
async function readAuditEntry(id){
  if(!MONGO_URI)return (await readStore())?.financialLedger?.find(e=>e.id===id);
  if(!await ensureDbConnected())throw new Error('Database unavailable');
  const rows=await DataModel.aggregate(auditMongoPipeline(id));
  return rows[0]?.entry||null;
}
async function readLogo(revision){
  if(!MONGO_URI)return (await readStore())?.store?.branding?.logoUrl;
  const cached=readMongoSnapshot.peek(revision);if(cached)return cached.store?.branding?.logoUrl;
  if(!await ensureDbConnected())throw new Error('Database unavailable');
  const doc=await DataModel.findOne({key:'main_store'}).select({'content.store.branding.logoUrl':1,_id:0}).lean();
  return doc?.content?.store?.branding?.logoUrl;
}
// MongoDB is authoritative when configured. Never promote an older local copy during an outage.
async function readStore() {
  if (MONGO_URI) {
    if (!await ensureDbConnected()) throw new Error('Database unavailable');
    return readMongoSnapshot();
  }
  if (process.env.VERCEL) throw new Error('MONGO_URI is required');
  return loadLocalDb();
}
async function compareAndSwapStore(expected, data, previous, options={}) {
  if (MONGO_URI) {
    if (!await ensureDbConnected()) throw new Error('Database unavailable');
    const saved = await DataModel.updateOne(
      { key: 'main_store', 'content.updatedAt': expected },
      stateUpdate(previous,data,options)
    );
    // The business database is the only write target in Mongo mode. Backups are explicit snapshots.
    if(saved.matchedCount===1){
      if(options.compactSource)readMongoSnapshot.invalidate();else readMongoSnapshot.committed(data);
      readMongoCompact.committed(data);
    }
    return saved.matchedCount===1;
  }
  if (process.env.VERCEL) throw new Error('MONGO_URI is required');
  const current = loadLocalDb();
  if ((current?.updatedAt ?? null) !== expected) return false;
  saveLocalDb(data);
  return true;
}
const chainLotsEnabled = process.env.NEXUS_ENABLE_CHAIN_LOTS === '1';
const {createPushService}=require('./lib/web-push');
const {waitUntil}=require('@vercel/functions');
let pushIndexes;
async function pushCollection(name) {
  if(!MONGO_URI||!await ensureDbConnected())throw new Error('Push storage unavailable');
  const db=mongoose.connection.db;
  if(!pushIndexes)pushIndexes=db.collection('web_push_deliveries').createIndex({expiresAt:1},{expireAfterSeconds:0}).catch(error=>{pushIndexes=null;throw error;});
  await pushIndexes;
  return db.collection(name);
}
const pushService=createPushService({collection:pushCollection,readState:readAuthStore,secret:AUTH_SECRET,secure:!!process.env.VERCEL,
  enabled:!!MONGO_URI&&process.env.NEXUS_ENABLE_WEB_PUSH==='1',publicKey:process.env.WEB_PUSH_PUBLIC_KEY,privateKey:process.env.WEB_PUSH_PRIVATE_KEY,subject:process.env.WEB_PUSH_SUBJECT,
  background:job=>{if(process.env.VERCEL)waitUntil(job);}
});
const stateApi = createStateApi({ read: readStore, readAuth:readAuthStore, readCompact:readCompactStore, readAudit:readAuditEntry, readLogo, compareAndSwap: compareAndSwapStore, secret: AUTH_SECRET, secure: !!process.env.VERCEL, chainLotsEnabled,
  onCommitted:pushService.committed,onLogout:pushService.logout });
app.use('/api/push',stateApi.authorizePush);
app.get('/api/push/config',pushService.config);
app.post('/api/push/subscription',pushService.subscribe);
app.delete('/api/push/subscription',pushService.unsubscribe);
app.post('/api/push/test',pushService.test);
app.get('/api/health', (req, res) => res.json({ status: 'ok', mongoConnected, storageMode: MONGO_URI ? 'MongoDB' : 'Local JSON', features: { chainLots: chainLotsEnabled }, timestamp: new Date() }));
app.post('/api/auth/login', stateApi.login);
app.get('/api/auth/session', stateApi.session);
app.post('/api/auth/logout', stateApi.logout);
app.post('/api/auth/password', stateApi.password);
app.get('/api/data', stateApi.get);
app.get('/api/audit',stateApi.audit);
app.get('/api/branding/logo',stateApi.logo);
app.post('/api/data', stateApi.post);
app.post('/api/operations', stateApi.operation);
app.use('/api/ai', stateApi.authorizeAi);

// ============================================================================
// NEXUS AI COPILOT ENGINE (POWERED BY DEEPSEEK-V3 & DETERMINISTIC ANALYTICS)
// ============================================================================

function generateLocalAiFallback(action, prompt, context = {}) {
  const store = context.store || {};
  const kpis = context.kpis || {};
  const inventory = context.inventory || {};
  const debts = context.creditsSummary || {};
  const shift = context.cashShift || {};
  const balance = context.balanceSummary || {};

  const salesTodayVal = Number(kpis.ventasHoy ?? kpis.salesToday ?? 0);
  const salesTodayStr = '$ ' + Math.round(salesTodayVal).toLocaleString('es-CO');
  const cashVal = Number(kpis.efectivoEnCaja ?? kpis.cashInBox ?? shift.cashInDrawer ?? 0);
  const cashStr = '$ ' + Math.round(cashVal).toLocaleString('es-CO');
  const debtTotalVal = Number(kpis.totalCarteraClientes ?? debts.totalCustomerDebt ?? kpis.customerDebts ?? 0);
  const debtTotalStr = '$ ' + Math.round(debtTotalVal).toLocaleString('es-CO');
  const txCount = Number(kpis.transaccionesHoy ?? kpis.transactionsToday ?? 0);
  const skusCount = Number(kpis.skusTotal ?? inventory.skusCount ?? kpis.skusCount ?? 0);
  const invCostVal = Number(kpis.valorInventarioCosto ?? kpis.inventoryValue ?? 0);
  const invCostStr = '$ ' + Math.round(invCostVal).toLocaleString('es-CO');

  if (action === 'whatsapp_cobro' || action === 'cartera' || (prompt && /cobro|deuda|moros|whatsapp/i.test(prompt)) || (action && /cobro|whatsapp/i.test(action))) {
    const firstDebtor = context.deudoresPrincipales?.[0] || debts.topDebtors?.[0];
    const debtorName = context.cliente || firstDebtor?.cliente || firstDebtor?.customer || 'Estimado/a Cliente';
    const rawAmount = context.saldoPendiente ?? firstDebtor?.saldo ?? firstDebtor?.balance ?? debtTotalVal ?? 0;
    const debtorAmount = '$ ' + Math.round(Number(rawAmount)).toLocaleString('es-CO');
    const storeName = context.empresa || store.name || 'Charles Joyas SAS';
    const dueDateStr = context.fechaVencimiento ? ` (Vence: ${context.fechaVencimiento})` : '';

    return `### 📋 Mensaje de Cobranza WhatsApp • ${debtorName}

* **Cliente:** **${debtorName}**
* **Saldo Pendiente:** **${debtorAmount} COP**${dueDateStr}
* **Comercio:** **${storeName}**

---

### 📲 Copia Sugerida para WhatsApp:

> *"Hola **${debtorName}**, te saludamos con mucho aprecio de parte del equipo de **${storeName}**. Esperamos que te encuentres muy bien. 👋*
>
> *Nos ponemos en contacto cordialmente para recordarte que presentas un saldo pendiente de **${debtorAmount} COP** en tu cuenta.*
>
> *Queremos facilitarte el proceso para ponerte al día. Puedes realizar tu pago mediante transferencia a nuestras cuentas autorizadas o directamente en el punto de venta.*
>
> *¿Nos confirmas si te queda bien realizar el abono el día de hoy? ¡Agradecemos mucho tu compromiso y lealtad con nosotros! ✨"*

> 💡 **Nota:** Conecta tu API Key de **DeepSeek-V3** en ⚙️ para generar variaciones de tono (amistoso, formal, urgente) según los días de mora.`;
  }

  if (action === 'balance' || (prompt && /balance|patrimonio|activo|pasivo/i.test(prompt))) {
    const assetsVal = Number(context.activos?.totalActivos ?? balance.totalAssets ?? 0);
    const liabVal = Number(context.pasivos?.totalPasivos ?? balance.totalLiabilities ?? 0);
    const equityVal = Number(context.patrimonioNeto ?? balance.netEquity ?? (assetsVal - liabVal));

    const assetsStr = '$ ' + Math.round(assetsVal).toLocaleString('es-CO');
    const liabStr = '$ ' + Math.round(liabVal).toLocaleString('es-CO');
    const equityStr = '$ ' + Math.round(equityVal).toLocaleString('es-CO');

    return `### ⚖️ Interpretación Ejecutiva del Balance General

* **Total Activos:** **${assetsStr} COP** (Inventario + Disponible en Caja + Cuentas por Cobrar + Activos Fijos)
* **Total Pasivos:** **${liabStr} COP** (Obligaciones con proveedores y taller)
* **Patrimonio Neto:** **${equityStr} COP** (Solvencia y respaldo patrimonial real)

#### 🔍 Diagnóstico Financiero:
1. **Solvencia Patrimonial:** El negocio presenta un patrimonio neto de **${equityStr} COP**, demostrando solidez financiera frente a terceros.
2. **Estructura de Capital:** La mayor proporción de los activos está concentrada en existencias de valor comercializable. Mantener una rotación ágil del inventario garantizará liquidez inmediata constante.
3. **Control de Endeudamiento:** Los pasivos representan compromisos operativos con proveedores habituales que deben coordinarse con las fechas de recaudación de ventas.

> 💡 **Nota:** Conecta tu API Key de **DeepSeek-V3** en ⚙️ para cálculo de razones corrientes y análisis predictivo en tiempo real.`;
  }

  if (action === 'hueso' || (prompt && /hueso|rotaci|lento|estancad/i.test(prompt))) {
    const outOfStock = Number(kpis.agotadosCount ?? inventory.outOfStockCount ?? 0);
    return `### 📦 Auditoría de Stock de Baja Rotación (Hueso)

* **Total Referencias en Catálogo:** **${skusCount} SKUs**
* **Alertas de Stock en Cero / Agotados:** **${outOfStock} productos**
* **Valorización Global Inventario:** **${invCostStr} COP**

#### 🎯 Estrategia Recomendada para Liberar Capital:
1. **Combos Estratégicos (Cross-selling):** Agrupa referencias de baja rotación como incentivo o accesorio complementario en compras principales con un pequeño descuento promocional.
2. **Campaña de Oportunidad:** Crea una sección temporal de liquidación o descuento exclusivo en el mostrador para renovar inventario antes de nuevas compras.
3. **Recuperación de Materia Prima:** En joyería de metales finos, los artículos de muy lenta salida pueden transformarse o fundirse para reutilizar el valor del metal sin pérdida de inversión.

> 💡 **Nota:** Activa **DeepSeek-V3** para análisis detallado SKU por SKU.`;
  }

  if (action === 'caja' || (prompt && /caja|turno|arqueo|descuadr|fuga/i.test(prompt))) {
    const shiftStatus = context.turno?.estado || shift.status || 'Activo';
    const shiftOp = context.turno?.operador || shift.operator || 'Cajero en turno';
    return `### 🚨 Auditoría de Turno de Caja & Fugas

* **Estado del Turno:** **${shiftStatus}** (Operador: ${shiftOp})
* **Efectivo Físico Esperado en Cajón:** **${cashStr} COP**
* **Ventas Realizadas Hoy:** **${salesTodayStr} COP** en **${txCount} transacciones**

#### 🛡️ Puntos Clave de Control:
1. **Cuadre Físico vs Sistema:** Al cerrar turno, asegúrate de contar el efectivo físico antes de ver la cifra del sistema para evitar sesgos.
2. **Revisión de Gastos Operativos Menores:** Verifica que cualquier salida de efectivo de caja chica tenga su soporte o comprobante firmado.
3. **Medios Digitales:** Las transferencias y tarjetas reportadas deben coincidir exactamente con los comprobantes bancarios y vouchers.

> 💡 **Nota:** Conecta tu API Key de **DeepSeek-V3** en ⚙️ para auditoría forense de transacciones.`;
  }

  // Diagnóstico Diario / General Default
  return `### 📊 Diagnóstico Ejecutivo del Negocio • ${new Date().toLocaleDateString('es-CO')}

* 💰 **Ventas Facturadas Hoy:** **${salesTodayStr} COP** (${txCount} tickets)
* 💵 **Efectivo en Caja:** **${cashStr} COP**
* 📉 **Cartera Pendiente por Cobrar:** **${debtTotalStr} COP**
* 📦 **Inventario Activo:** **${skusCount} referencias** (${invCostStr} COP)

#### 🚀 3 Recomendaciones del Día:
1. **Gestión de Cartera Activa:** Tienes **${debtTotalStr} COP** en créditos de clientes. Enviar recordatorios cordiales por WhatsApp hoy mismo aumentará la liquidez inmediata.
2. **Impulso de Ticket Promedio:** Las transacciones de hoy promedian **$ ${txCount > 0 ? Math.round(salesTodayVal / txCount).toLocaleString('es-CO') : '0'} COP**. Capacita a los vendedores para ofrecer artículos complementarios.
3. **Cierre de Turno Riguroso:** Realiza el arqueo ciego al terminar la jornada para garantizar 0 descuadres entre efectivo físico y libro contable.

> 💡 **Nota:** Este análisis inicial fue procesado con el motor analítico interno. Para activar análisis predictivo en tiempo real con **DeepSeek-V3**, ingresa tu API Key en el botón ⚙️ de la parte superior.`;
}

async function getStoredAiKey() {
  if (mongoConnected) {
    try {
      const doc = await DataModel.findOne({ key: 'main_store' }).select({'content.store.deepseekApiKey':1,_id:0}).lean();
      const k = doc?.content?.store?.deepseekApiKey;
      if (k) return String(k).trim();
    } catch (_) {}
  }
  const localKey = loadLocalDb()?.store?.deepseekApiKey;
  return localKey ? String(localKey).trim() : '';
}

// GET /api/ai/status - Check DeepSeek status
app.get('/api/ai/status', async (req, res) => {
  const hasEnvKey = !!process.env.DEEPSEEK_API_KEY;
  const hasStoreKey = !!(await getStoredAiKey());
  res.json({
    status: 'ok',
    hasApiKey: hasEnvKey || hasStoreKey,
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    features: ['diagnostico', 'cartera_whatsapp', 'auditoria_caja', 'interpretacion_balance', 'stock_hueso']
  });
});

// POST /api/ai/copilot - Consult DeepSeek API or Fallback
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const { prompt, action = 'chat', context = {}, apiKey: clientApiKey } = req.body || {};

    // Resolve DeepSeek API Key: Client Key -> ENV -> Store in DB (MongoDB or local)
    const storeKey = await getStoredAiKey();
    const resolvedApiKey = (clientApiKey || process.env.DEEPSEEK_API_KEY || storeKey || '').trim();

    if (!resolvedApiKey) {
      const simulatedReply = generateLocalAiFallback(action, prompt, context);
      return res.json({
        ok: true,
        simulated: true,
        needsApiKey: true,
        reply: simulatedReply,
        model: 'nexus-local-fallback'
      });
    }

    const systemPrompt = `Eres Nexus AI Copilot, el Director Financiero (CFO) y Consultor Estratégico Ejecutivo del software de gestión comercial.
Tu propósito es analizar los datos operativos, comerciales y contables ya consolidados para brindar diagnósticos claros, alertas oportunas y recomendaciones de alto impacto para maximizar la rentabilidad y liquidez.

REGLAS INQUEBRANTABLES:
1. Las cifras que recibes en el contexto (ventas, costos, gastos, utilidades, inventarios, deudas) provienen del motor contable oficial y son 100% exactas. NUNCA inventes números distintos ni recalcules sumas o balances.
2. Mantén un tono ejecutivo, directo, persuasivo y constructivo. Sé conciso y profesional.
3. Utiliza formato Markdown limpio con viñetas, negritas, emojis estratégicos y cifras en pesos colombianos ($ COP) formateadas legibles.
4. Si el usuario solicita un mensaje de cobro para WhatsApp, redacta un mensaje cortés, empático pero firme, listo para copiar y enviar al cliente.
5. Si detectas márgenes bajos, gastos desmedidos o descuadres de turno, menciónalos con prioridad como alertas críticas.`;

    const userMessageContent = `[ESTADO CONSOLIDADO DEL NEGOCIO (DATOS OFICIALES)]
${JSON.stringify(context, null, 2)}

[ACCION SOLICITADA: ${action.toUpperCase()}]
${prompt || 'Realiza un diagnóstico estratégico del estado actual del negocio con recomendaciones accionables.'}`;

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent }
        ],
        temperature: 0.35,
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(28000)
    });

    if (!deepseekResponse.ok) {
      const errText = await deepseekResponse.text();
      let errMsg = `Error de DeepSeek API (${deepseekResponse.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) errMsg += `: ${errJson.error.message}`;
      } catch (_) {}

      if (deepseekResponse.status === 401) {
        return res.status(401).json({
          ok: false,
          needsApiKey: true,
          error: 'La API Key de DeepSeek es inválida o expiró. Verifica tu clave en platform.deepseek.com'
        });
      }
      return res.status(deepseekResponse.status).json({ ok: false, error: errMsg });
    }

    const aiData = await deepseekResponse.json();
    const replyText = aiData.choices?.[0]?.message?.content || 'No se recibió respuesta del modelo.';

    return res.json({
      ok: true,
      simulated: false,
      reply: replyText,
      model: aiData.model || 'deepseek-chat',
      usage: aiData.usage
    });
  } catch (err) {
    console.error('[Nexus AI Error]:', err);
    return res.status(500).json({ ok: false, error: 'Error procesando solicitud de IA: ' + err.message });
  }
});

if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Nexus Server] Servidor Nexus POS SaaS corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;

