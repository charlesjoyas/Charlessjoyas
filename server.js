const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

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
    await connectingPromise;
    mongoConnected = mongoose.connection.readyState === 1;
    return mongoConnected;
  }
  try {
    connectingPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000
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

// Ensure database connection before executing any /api/ endpoint
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    await ensureDbConnected();
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

if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Nexus Server] Servidor Nexus POS SaaS corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;

