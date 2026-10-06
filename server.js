const express = require('express');
const cors = require('cors');
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
const DIRECT_MONGO_URI = 'mongodb://charlesjoyass_db_user:57XZqt7XTrFdkaKt@ac-3th3i0i-shard-00-00.ceb3uhz.mongodb.net:27017,ac-3th3i0i-shard-00-01.ceb3uhz.mongodb.net:27017,ac-3th3i0i-shard-00-02.ceb3uhz.mongodb.net:27017/charlesjoyas_pos?ssl=true&replicaSet=atlas-xpgtcp-shard-0&authSource=admin&retryWrites=true&w=majority';
let MONGO_URI = process.env.MONGO_URI || DIRECT_MONGO_URI;

// If URI uses SRV for cluster0.ceb3uhz.mongodb.net, prefer the direct replica set URI to prevent querySrv ECONNREFUSED in serverless environments (AWS/Vercel)
if (MONGO_URI.includes('cluster0.ceb3uhz.mongodb.net') && MONGO_URI.startsWith('mongodb+srv://')) {
  MONGO_URI = DIRECT_MONGO_URI;
}

const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Security Middleware: Strict restriction on internal database, config and server files
app.use((req, res, next) => {
  const blockedPatterns = [
    /^\/db\.json(\.tmp)?$/i,
    /^\/server\.js$/i,
    /^\/package(-lock)?\.json$/i,
    /^\/scratch(\/|$)/i,
    /^\/\.vscode(\/|$)/i,
    /^\/\.git(\/|$)/i,
    /^\/\.env(\.|$)/i,
    /^\/\.[a-zA-Z0-9_-]+/i
  ];
  if (blockedPatterns.some(regex => regex.test(req.path))) {
    return res.status(403).json({ error: 'Acceso prohibido: Recurso protegido del sistema' });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Explicit frontend route handler for root requests
app.get(['/', '/index.html'], (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

let mongoConnected = false;
let connectingPromise = null;
let lastMongoError = null;

// Mongoose Schema for general state
const DataSchema = new mongoose.Schema({
  key: { type: String, default: 'main_store', unique: true },
  content: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});
const DataModel = mongoose.model('NexusData', DataSchema);

// Robust Serverless-friendly MongoDB Atlas Connection Manager
async function ensureDbConnected() {
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
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 6000,
      socketTimeoutMS: 20000
    });
    await connectingPromise;
    mongoConnected = true;
    lastMongoError = null;
    console.log('[Nexus Server] Conectado exitosamente a MongoDB Atlas');
    return true;
  } catch (err) {
    console.warn('[Nexus Server] Error conectando a MongoDB Atlas:', err.message);
    mongoConnected = false;
    lastMongoError = err.message;
    connectingPromise = null;
    return false;
  }
}

// Immediately attempt connection on start
ensureDbConnected().catch(() => {});

// Ensure database connection before executing any /api/ endpoint (guaranteed no hanging)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await Promise.race([
        ensureDbConnected(),
        new Promise(r => setTimeout(r, 5500))
      ]);
    } catch (_) {}
  }
  next();
});

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
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (e) {
    console.error('[Nexus Server] Error escribiendo db.json:', e);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

// API Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoConnected,
    storageMode: mongoConnected ? 'MongoDB' : 'Local JSON / Storage',
    lastMongoError,
    uriType: MONGO_URI.startsWith('mongodb+srv') ? 'SRV' : 'Direct ReplicaSet',
    hasEnvMongoUri: !!process.env.MONGO_URI,
    timestamp: new Date()
  });
});

// GET /api/data - Fetch complete store state
app.get('/api/data', async (req, res) => {
  try {
    if (!mongoConnected) {
      await ensureDbConnected();
    }
    if (mongoConnected) {
      const doc = await DataModel.findOne({ key: 'main_store' });
      if (doc && doc.content) {
        return res.json(doc.content);
      }
    }
    const localData = loadLocalDb();
    if (localData) {
      return res.json(localData);
    }
    return res.json({ status: 'empty' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data - Sync full state
app.post('/api/data', async (req, res) => {
  try {
    // 1. Authorization check: must have a valid role header from active session
    const rawRole = String(req.headers['x-nexus-role'] || '').trim();
    const userId = String(req.headers['x-nexus-user-id'] || '').trim();
    const roleLower = rawRole.toLowerCase();
    const isAllowed = 
      roleLower.includes('admin') || 
      roleLower.includes('cajer') || 
      roleLower.includes('gerente') || 
      roleLower.includes('supervisor') || 
      roleLower.includes('contad') || 
      roleLower.includes('inventario') ||
      userId.startsWith('USR-');

    if (!rawRole || !userId || !isAllowed) {
      return res.status(403).json({ error: 'No autorizado: Se requiere una sesión válida para sincronizar datos.' });
    }

    // 2. Strict multi-property schema validation to prevent DB corruption
    const data = req.body;
    if (
      !data || 
      typeof data !== 'object' || 
      !Array.isArray(data.products) || 
      !Array.isArray(data.users) || 
      !Array.isArray(data.perfiles) || 
      !data.store
    ) {
      return res.status(400).json({ error: 'Payload de datos inválido o incompleto: estructura requerida ausente' });
    }

    data.updatedAt = new Date().toISOString();
    saveLocalDb(data);

    if (!mongoConnected) {
      await ensureDbConnected();
    }

    if (mongoConnected) {
      await DataModel.findOneAndUpdate(
        { key: 'main_store' },
        { content: data, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } else if (process.env.VERCEL) {
      return res.status(503).json({ error: 'Error de persistencia: No se pudo conectar a MongoDB Atlas en Vercel.' });
    }

    res.json({ success: true, mode: mongoConnected ? 'MongoDB' : 'Local JSON', timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const debtorName = context.cliente || debts.topDebtors?.[0]?.customer || 'Estimado/a Cliente';
    const rawAmount = context.saldoPendiente || debts.topDebtors?.[0]?.balance || debtTotalVal || 0;
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
    return `### 🚨 Auditoría de Turno de Caja & Fugas

* **Estado del Turno:** **${shift.status || 'Activo'}** (Operador: ${shift.operator || 'Cajero en turno'})
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
* 📦 **Inventario Activo:** **${inventory.skusCount || kpis.skusCount || 0} referencias** ($ ${Math.round(Number(kpis.inventoryValue || 0)).toLocaleString('es-CO')} COP)

#### 🚀 3 Recomendaciones del Día:
1. **Gestión de Cartera Activa:** Tienes **${debtTotalStr} COP** en créditos de clientes. Enviar recordatorios cordiales por WhatsApp hoy mismo aumentará la liquidez inmediata.
2. **Impulso de Ticket Promedio:** Las transacciones de hoy promedian **$ ${txCount > 0 ? Math.round(Number(kpis.salesToday || 0) / txCount).toLocaleString('es-CO') : '0'} COP**. Capacita a los vendedores para ofrecer artículos complementarios.
3. **Cierre de Turno Riguroso:** Realiza el arqueo ciego al terminar la jornada para garantizar 0 descuadres entre efectivo físico y libro contable.

> 💡 **Nota:** Este análisis inicial fue procesado con el motor analítico interno. Para activar análisis predictivo en tiempo real con **DeepSeek-V3**, ingresa tu API Key en el botón ⚙️ de la parte superior.`;
}

// GET /api/ai/status - Check DeepSeek status
app.get('/api/ai/status', (req, res) => {
  const localStore = loadLocalDb()?.store || {};
  const hasEnvKey = !!process.env.DEEPSEEK_API_KEY;
  const hasStoreKey = !!localStore.deepseekApiKey;
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
    
    // Resolve DeepSeek API Key: Client Key -> ENV -> Store in DB
    const localStore = loadLocalDb()?.store || {};
    const resolvedApiKey = (clientApiKey || process.env.DEEPSEEK_API_KEY || localStore.deepseekApiKey || '').trim();

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

