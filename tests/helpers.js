'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const safety = require('../js/safety');
const ledger = require('../js/ledger');
const crypto = require('crypto');
const { createStateApi, publicState } = require('../lib/state-api');
const clone = x => JSON.parse(JSON.stringify(x));
const root = path.join(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const seedSource = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

function browserHarness() {
  let elements = {};
  const handlers = {};
  const storage = new Map();
  const document = {
    getElementById: id => elements[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    body: { classList: { add() {}, remove() {} } },
    addEventListener() {}
  };
  const context = vm.createContext({
    NexusSafety: safety, NexusLedger:ledger, crypto, document, Intl, Date, AbortSignal, setTimeout, clearTimeout,
    window: { addEventListener() {} },
    console: { log() {}, warn() {}, error() {} }, confirm: () => true, prompt: () => 'Verified test evidence',
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    fetch: () => { throw new Error('Network disabled in regression tests'); }
  });
  vm.runInContext(seedSource + '\n' + appSource.slice(0, appSource.lastIndexOf('const app = new NexusApp()')) + '\nglobalThis.App=NexusApp;globalThis.seed=INITIAL_DATA;', context);
  const seed = clone(context.seed);
  seed.users = [
    { id:'USR-001', name:'Audit Admin', email:'admin@example.test', role:'Super Admin', status:'Active', password:'audit-admin-password' },
    { id:'USR-002', name:'Audit Cashier', email:'cashier@example.test', role:'Cajero', status:'Active', password:'audit-cashier-password', customPermissions:['pos','clientes','ventas','creditos_clientes','gastos','cuadre_caja'] }
  ];
  seed.updatedAt = '2026-11-20T00:00:00.000Z';
  const app = Object.create(context.App.prototype);
  app.data = publicState(seed);
  app.cart = [];
  app.currentUser = app.data.users[0];
  app._lastServerUpdatedAt = seed.updatedAt;
  app._confirmedData = clone(app.data);
  app.events = [];
  app.showToast = (...args) => app.events.push(args);
  for (const name of Object.getOwnPropertyNames(context.App.prototype)) {
    if (/^(render|populate|openModal|closeModal|showPurchaseReceipt|syncAllModules|updateUIForRole|ensurePermittedView|updateSafetyNotice)/.test(name)) app[name] = () => {};
  }
  app.buildThermalTicketHtml = () => '<receipt/>';
  app.savePersistence = async () => {
    app._lastServerUpdatedAt = new Date(new Date(app._lastServerUpdatedAt).getTime() + 1).toISOString();
    app.data.updatedAt = app._lastServerUpdatedAt;
    app._confirmedData = clone(app.data);
    return true;
  };
  const inputs = values => {
    elements = {};
    for (const [id, value] of Object.entries(values)) elements[id] = {
      value: String(value), checked: value === true, style: {},
      classList: { add() {}, remove() {}, contains: () => false },
      addEventListener: (event, fn) => { handlers[`${id}:${event}`] = fn; },
      reset() {}, focus() {}
    };
    return elements;
  };
  const bindForm = (id, values) => {
    inputs({ ...values, [id]: '' });
    app.setupCrudModals();
    return () => app.runMutation(() => handlers[`${id}:body`]());
  };
  // Capture the actual business handler without introducing DOM event timing.
  app.bindSafeSubmit = (form, fn) => {
    const entry = Object.entries(elements).find(([, node]) => node === form);
    if (entry) handlers[`${entry[0]}:body`] = () => fn({ preventDefault() {} });
  };
  return { app, context, App:context.App, seed, inputs, bindForm, storage, handlers };
}

function memoryApi(seed) {
  let state = clone(seed);
  let failWrite = false;
  const api = createStateApi({
    read: async () => clone(state),
    compareAndSwap: async (base, next) => {
      if (failWrite) throw new Error('Storage outage');
      if (base !== state.updatedAt) return false;
      state = clone(next);
      return true;
    }, secret:'test-only-signing-secret-more-than-32-characters'
  });
  const request = async (name, body = {}, session = '', extra = {}) => {
    const response = { statusCode:200, headers:{}, setHeader(k,v) { this.headers[k.toLowerCase()] = v; }, status(code) { this.statusCode=code; return this; }, json(body) { this.body=clone(body); return this; } };
    await api[name]({ method:['get','session'].includes(name)?'GET':'POST', headers:{ 'x-nexus-client':'stabilized-v1', cookie:session, ...extra }, body:clone(body) }, response);
    response.cookie = response.headers['set-cookie']?.split(';')[0];
    return response;
  };
  const login = async (role = 'admin') => {
    const res = await request('login', { email:`${role}@example.test`, password:`audit-${role}-password` });
    if (res.statusCode !== 200) throw new Error('Fixture login failed');
    return res.cookie;
  };
  return { request, login, get state() { return clone(state); }, outage: value => { failWrite=value; } };
}
async function connectOperations(h){
  const api=memoryApi({...clone(h.app.data),users:clone(h.seed.users)}),session=await api.login();
  h.app._confirmedData=clone(h.app.data);h.app.savePersistence=h.App.prototype.savePersistence;
  h.context.fetch=async(url,options={})=>{const r=await api.request(url==='/api/operations'?'operation':options.method==='POST'?'post':'get',options.body?JSON.parse(options.body):{},session);return {ok:r.statusCode===200,status:r.statusCode,json:async()=>r.body};};
  return api;
}
const product = (fields = {}) => ({ id:'P1',sku:'001',name:'Audit jewelry',measureType:'Pesaje',weightUnit:'g',unit:'g',category:'oro18k',categoryName:'Oro 18K Italiano & Ley',stock:10,cost:100,price:200,minStock:.5,status:'active',...fields });
module.exports = { browserHarness, memoryApi, clone, product, root, connectOperations };
