// Nexus POS SaaS Application Engine (Complete Interactive & Persistent Engine)

class NexusApp {
  constructor() {
    this.data = INITIAL_DATA;
    this.cart = [];
    this.currentParentView = 'dashboard';
    this.currentSubView = 'inicio';
    this.selectedCategory = 'all';
    this.selectedPayMethod = 'cash';
    this.charts = {};
    this.currentUser = null;
    this.currentTheme = 'light';
    this.currentRadarFilter = 'todos';
    this.radarSearchTerm = '';
    this.inventoryStockFilter = 'all';

    this.MODULES_LIST = [
      { id: 'dashboard', label: '📊 Dashboard / Inicio' },
      { id: 'pos', label: '🛒 Punto de Venta (POS)' },
      { id: 'ventas', label: '📈 Historial de Ventas' },
      { id: 'clientes', label: '👥 Clientes & Directorio' },
      { id: 'creditos_clientes', label: '💰 Créditos Clientes' },
      { id: 'comprar', label: '📦 Órdenes de Compra' },
      { id: 'proveedores', label: '🚚 Proveedores' },
      { id: 'creditos_proveedores', label: '🏢 Créditos Proveedores' },
      { id: 'productos', label: '🛍️ Catálogo de Productos' },
      { id: 'servicios', label: '🛠️ Servicios Prestados' },
      { id: 'categorias', label: '🏷️ Categorías' },
      { id: 'activos', label: '🏢 Activos Fijos' },
      { id: 'gastos', label: '💸 Gastos Operativos' },
      { id: 'formas_pago', label: '💳 Formas de Pago' },
      { id: 'cuadre_caja', label: '💵 Arqueo de Caja' },
      { id: 'abonos_ventas', label: '🧾 Historial Abonos Ventas' },
      { id: 'abonos_compras', label: '🧾 Historial Abonos Compras' },
      { id: 'reports', label: '📊 Reportes Financieros' },
      { id: 'informes', label: '📑 Informes Ejecutivos' },
      { id: 'perfiles', label: '🔑 Perfiles & Permisos' },
      { id: 'usuarios', label: '👤 Gestión de Usuarios' },
      { id: 'config', label: '⚙️ Configuración del Sistema' }
    ];

    this.init();
  }

  formatCurrency(amount) {
    const val = Number(amount) || 0;
    const formatted = Math.abs(val).toLocaleString('es-CO', {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    const prefix = val < 0 ? '-$ ' : '$ ';
    return `${prefix}${formatted} COP`;
  }

  formatCurrencyDecimals(amount, forceDecimals = true, includeCurrencyCode = false) {
    const val = Number(amount) || 0;
    const minDec = forceDecimals ? 2 : (val % 1 === 0 ? 0 : 2);
    const formatted = Math.abs(val).toLocaleString('es-CO', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: 2
    });
    const prefix = val < 0 ? '-$ ' : '$ ';
    return includeCurrencyCode ? `${prefix}${formatted} COP` : `${prefix}${formatted}`;
  }

  formatNumberWithCommas(val, allowDecimals = false) {
    if (val === null || val === undefined || val === '') return '';
    const str = String(val).replace(/,/g, '').trim();
    if (str === '') return '';
    
    if (allowDecimals) {
      const isNegative = str.startsWith('-');
      const cleanStr = isNegative ? str.slice(1) : str;
      const parts = cleanStr.split('.');
      let intPart = parts[0] ? parts[0].replace(/\D/g, '') : '0';
      if (intPart === '') intPart = '0';
      if (intPart.length > 1 && intPart.startsWith('0')) {
        intPart = intPart.replace(/^0+/, '') || '0';
      }
      const formattedInt = (isNegative ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (parts.length > 1) {
        const decPart = parts.slice(1).join('').replace(/\D/g, '');
        return `${formattedInt}.${decPart}`;
      }
      if (str.endsWith('.')) {
        return `${formattedInt}.`;
      }
      return formattedInt;
    } else {
      const isNegative = str.startsWith('-');
      const cleanNum = parseFloat(str.replace(/,/g, ''));
      if (isNaN(cleanNum)) return '';
      let digits = String(Math.abs(Math.round(cleanNum)));
      return (isNegative ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  parseCleanNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).trim();
    if (!str) return 0;

    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(/\./g, '').replace(',', '.');
      }
    } else if (str.includes(',')) {
      str = str.replace(/,/g, '');
    }
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  setupThousandMask(input, allowDecimals = false, onUpdate = null) {
    if (!input || input.dataset.hasThousandMask) return;
    input.dataset.hasThousandMask = 'true';

    if (input.value) {
      input.value = this.formatNumberWithCommas(input.value, allowDecimals);
    }

    const handleInput = () => {
      const rawVal = input.value;
      const cursorPos = input.selectionStart || 0;

      const rawBeforeCursor = rawVal.slice(0, cursorPos);
      const digitsBeforeCursor = rawBeforeCursor.replace(/,/g, '').length;

      const formatted = this.formatNumberWithCommas(rawVal, allowDecimals);
      input.value = formatted;

      let newCursorPos = formatted.length;
      let countedDigits = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (countedDigits === digitsBeforeCursor) {
          newCursorPos = i;
          break;
        }
        if (formatted[i] !== ',') {
          countedDigits++;
        }
        newCursorPos = i + 1;
      }
      try {
        input.setSelectionRange(newCursorPos, newCursorPos);
      } catch (_) {}

      if (typeof onUpdate === 'function') {
        onUpdate(this.parseCleanNumber(input.value));
      }
    };

    input.addEventListener('input', handleInput);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        const selStart = input.selectionStart;
        const selEnd = input.selectionEnd;
        if (selStart === selEnd && selStart > 0) {
          if (input.value[selStart - 1] === ',') {
            e.preventDefault();
            const before = input.value.slice(0, selStart - 2);
            const after = input.value.slice(selStart);
            input.value = before + after;
            const newPos = Math.max(0, selStart - 2);
            input.setSelectionRange(newPos, newPos);
            input.dispatchEvent(new Event('input'));
          }
        }
      }
    });
  }

  attachGlobalNumberMasks() {
    const integerInputs = [
      'new-prod-cost',
      'edit-prod-cost',
      'pos-add-custom-price-input',
      'po-unit-cost',
      'cat-cost-input',
      'edit-cat-cost-input',
      'cat-units-input',
      'edit-cat-units-input',
      'cat-unit-cost-input',
      'edit-cat-unit-cost-input',
      'abono-amount-input',
      'cash-received-input',
      'separe-abono-input',
      'cust-limit-input',
      'edit-cust-limit',
      'exp-amount-input',
      'edit-exp-amount',
      'cash-physical-counted',
      'open-cash-base-input',
      'supp-pending-balance-input',
      'edit-supp-pending-balance',
      'srv-price-input',
      'edit-srv-price',
      'ast-cost-input',
      'edit-ast-val',
      'input-rate-oro18k',
      'input-rate-oro14k',
      'input-rate-plata925'
    ];

    integerInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.setupThousandMask(el, false);
    });

    const decimalInputs = [
      'new-prod-piece-weight',
      'new-prod-stock',
      'edit-prod-piece-weight',
      'edit-prod-stock',
      'pos-add-qty-input',
      'po-quantity',
      'po-product-grams',
      'cat-grams-input',
      'edit-cat-grams-input'
    ];

    decimalInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.setupThousandMask(el, true);
    });

    document.querySelectorAll('.cart-custom-price-input').forEach(el => {
      this.setupThousandMask(el, false);
    });
    document.querySelectorAll('.cart-qty-input').forEach(el => {
      this.setupThousandMask(el, true);
    });
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  normalizeSearchStr(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  matchesProductSearch(p, query) {
    if (!p) return false;
    if (!query) return true;
    const q = this.normalizeSearchStr(query);
    if (!q) return true;

    const name = this.normalizeSearchStr(p.name);
    const sku = this.normalizeSearchStr(p.sku);
    const id = this.normalizeSearchStr(p.id);
    const barcode = this.normalizeSearchStr(p.barcode);
    const category = this.normalizeSearchStr(p.categoryName || p.category);
    const supplier = this.normalizeSearchStr(p.supplier);

    // Direct match against query
    if (name.includes(q) || sku.includes(q) || id.includes(q) || barcode.includes(q) || category.includes(q) || supplier.includes(q)) {
      return true;
    }

    // Multi-token match (allows searching e.g. "topo 2026" or "balineria 1")
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      return tokens.every(tok => 
        name.includes(tok) || sku.includes(tok) || id.includes(tok) || barcode.includes(tok) || category.includes(tok) || supplier.includes(tok)
      );
    }

    return false;
  }

  async init() {
    const setup = async () => {
      try {
        this.checkTheme();
        await this.loadPersistence();
        this.applyBrandingSettings(this.data.store?.branding);
        this.checkAuth();
        this.setupNavigation();
        this.setupSidebarToggle();
        this.setupPOS();
        this.setupInventory();
        this.setupCheckout();
        this.setupGlobalSearch();
        this.setupCrudModals();
        this.setupConfigForm();
        this.renderAllTables();
        this.setupKeyboardShortcuts();
        this.setupRealtimeSync();
        this.attachGlobalNumberMasks();

        if (typeof Chart !== 'undefined') {
          this.initCharts();
        }

        const urlParams = new URLSearchParams(window.location.search);
        const pView = urlParams.get('view');
        const sView = urlParams.get('sub');
        const qParam = urlParams.get('q');
        if (pView && sView) {
          this.switchSubView(pView, sView);
          if (sView === 'inf_tendencia') {
            if (qParam) {
              const input = document.getElementById('tendencia-product-input');
              if (input) input.value = qParam;
              this.consultarTendencia(qParam);
            }
          }
        }
      } catch (err) {
        console.error('[NexusApp] Startup error:', err);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setup());
    } else {
      await setup();
    }
  }

  /* --------------------------------------------------------------------------
     PERSISTENCE LAYER (MongoDB REST API & LocalStorage Fallback)
     -------------------------------------------------------------------------- */
  ensureOrderedUserIds() {
    if (!this.data.users || !Array.isArray(this.data.users) || this.data.users.length === 0) return;

    // 1. Identify root Super Admin (Carlos Garzon or USR-001 or role Super Admin)
    let rootIndex = this.data.users.findIndex(u => u.id === 'USR-001' || u.role === 'Super Admin' || u.email?.toLowerCase() === 'carlos@nexuspos.io');
    let rootUser;
    if (rootIndex !== -1) {
      rootUser = this.data.users[rootIndex];
    } else {
      rootUser = this.data.users[0];
    }

    const others = this.data.users.filter(u => u !== rootUser);

    // Check if others have disordered legacy random IDs (like > 10) or if root was not at index 0
    const hasDisorderedLegacy = others.some(u => {
      const m = (u.id || '').match(/USR-(\d+)/i);
      return m && parseInt(m[1], 10) > 10;
    }) || this.data.users[0] !== rootUser;

    if (hasDisorderedLegacy) {
      // In the legacy unshift system, new users were prepended to index 0,
      // so the array was [Victor, Zharick, Santiago, Carlos].
      // Reversing 'others' restores chronological creation order: Santiago -> Zharick -> Victor
      // With rootUser (Carlos) as first: [Carlos, Santiago, Zharick, Victor]
      const chronologicalOthers = [...others].reverse();
      this.data.users = [rootUser, ...chronologicalOthers];
    } else {
      // Sort users by numeric ID if they already have USR-xxx format, ensuring root is first
      this.data.users = [rootUser, ...others.sort((a, b) => {
        const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      })];
    }

    // Assign sequential, cleanly formatted IDs: USR-001, USR-002, USR-003, USR-004...
    this.data.users.forEach((u, idx) => {
      u.id = `USR-${String(idx + 1).padStart(3, '0')}`;
    });

    // Update currentUser ID if matching email
    if (this.currentUser && !this.isGhostSession) {
      const me = this.data.users.find(u => u.email?.toLowerCase() === this.currentUser.email?.toLowerCase());
      if (me && this.currentUser.id !== me.id) {
        this.currentUser.id = me.id;
        try { localStorage.setItem('nexus_pos_user', JSON.stringify(this.currentUser)); } catch (e) {}
      }
    }
  }

  sanitizeLoadedData() {
    if (this.data.users && Array.isArray(this.data.users)) {
      this.data.users.forEach(u => {
        const initUser = INITIAL_DATA.users.find(iu => iu.email?.toLowerCase() === u.email?.toLowerCase() || iu.id === u.id);
        if (initUser) {
          if (!u.password) u.password = initUser.password;
          if (!u.avatar) u.avatar = initUser.avatar;
          if (!u.role) u.role = initUser.role;
        } else {
          if (!u.password) u.password = "123456";
          if (!u.avatar) u.avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";
          if (!u.role) u.role = "Cajero";
        }
      });

      // ONLY ensure root Super Admin (USR-001) is present so the system is never locked out
      const rootUser = INITIAL_DATA.users.find(u => u.id === 'USR-001');
      if (rootUser && !this.data.users.some(u => u.id === 'USR-001' || u.role === 'Super Admin')) {
        this.data.users.unshift(rootUser);
      }
      this.ensureOrderedUserIds();
    } else {
      this.data.users = Array.from(INITIAL_DATA.users);
    }

    if (this.data.perfiles && Array.isArray(this.data.perfiles)) {
      this.data.perfiles.forEach(p => {
        const initPerf = INITIAL_DATA.perfiles.find(ip => ip.name?.toLowerCase() === p.name?.toLowerCase() || ip.id === p.id);
        if (initPerf && (!p.allowedModules || p.allowedModules.length === 0)) {
          p.allowedModules = initPerf.allowedModules;
        }
      });

      // ONLY ensure system root profile PRF-01 is present
      const rootProfile = INITIAL_DATA.perfiles.find(p => p.id === 'PRF-01' || p.name === 'Super Admin');
      if (rootProfile && !this.data.perfiles.some(p => p.id === 'PRF-01' || p.name === 'Super Admin')) {
        this.data.perfiles.unshift(rootProfile);
      }
    } else {
      this.data.perfiles = Array.from(INITIAL_DATA.perfiles);
    }

    if (!this.data.store) {
      this.data.store = Object.assign({}, INITIAL_DATA.store);
    } else {
      this.data.store = Object.assign({}, INITIAL_DATA.store, this.data.store);
    }
    if (!this.data.store.branding) {
      this.data.store.branding = Object.assign({}, INITIAL_DATA.store.branding);
    } else {
      this.data.store.branding = Object.assign({}, INITIAL_DATA.store.branding, this.data.store.branding);
    }

    if (!this.data.categories || !this.data.categories.some(c => c.id === 'oro18k')) {
      this.data.categories = Array.from(INITIAL_DATA.categories);
    }
    if (this.data.categories && Array.isArray(this.data.categories)) {
      this.data.categories.forEach(cat => {
        if (cat.cost === undefined || cat.cost === null) {
          const initCat = INITIAL_DATA.categories.find(ic => ic.id === cat.id);
          cat.cost = initCat && initCat.cost !== undefined ? initCat.cost : (cat.name?.toLowerCase().includes('oro') ? 444000 : (cat.name?.toLowerCase().includes('plata') ? 28000 : 100000));
        } else {
          cat.cost = parseFloat(String(cat.cost).replace(',', '.')) || 0;
        }
      });
      this.syncAllCategoryGrams();
    }

    if (this.data.products && Array.isArray(this.data.products)) {
      this.data.products.forEach(p => {
        if (!p.measureType) p.measureType = 'Pesaje';
        if (!p.supplier) p.supplier = 'Joyeros Italianos S.A.S.';
        if (!p.sku) p.sku = '001';

        if (!this.data.categories.some(c => c.id === p.category)) {
          p.category = 'oro18k';
          p.categoryName = 'Oro 18K Italiano & Ley';
        }
      });
      // NOTE: Empty array is valid for clean production data
    } else {
      this.data.products = [];
    }

    if (this.data.recentTransactions && Array.isArray(this.data.recentTransactions)) {
      this.data.recentTransactions.forEach(tx => {
        if (!tx.cashier) {
          tx.cashier = tx.type?.includes('POS') ? 'Javier Ortiz (Cajero)' : (this.data.store?.cashier || 'Carlos Mendoza');
        }
      });
    } else {
      this.data.recentTransactions = [];
    }

    if (this.data.perfiles && Array.isArray(this.data.perfiles)) {
      this.data.perfiles.forEach(p => {
        if (!p.allowedModules || !Array.isArray(p.allowedModules) || p.allowedModules.length === 0) {
          const name = (p.name || '').toLowerCase();
          if (name.includes('super')) {
            p.allowedModules = ['*'];
          } else if (name.includes('cajer')) {
            p.allowedModules = ["pos", "clientes", "cuadre_caja", "ventas"];
          } else if (name.includes('contad') || name.includes('auditor')) {
            p.allowedModules = ["dashboard", "gastos", "formas_pago", "ventas", "creditos_clientes", "creditos_proveedores", "reports", "informes", "cuadre_caja"];
          } else if (name.includes('inventario')) {
            p.allowedModules = ["dashboard", "productos", "servicios", "categorias", "activos", "comprar", "proveedores"];
          } else {
            p.allowedModules = ["dashboard", "pos", "clientes", "proveedores", "gastos", "formas_pago", "ventas", "comprar", "creditos_clientes", "creditos_proveedores", "productos", "servicios", "categorias", "activos", "reports", "informes"];
          }
        }
      });
    }

    if (this.data.customers && Array.isArray(this.data.customers)) {
      this.data.customers.forEach(c => {
        if (!c.allowedPaymentMethods || !Array.isArray(c.allowedPaymentMethods) || c.allowedPaymentMethods.length === 0) {
          c.allowedPaymentMethods = ['Efectivo', 'Transferencia', 'Crédito', 'Plan Separe'];
        }
        if (c.document === undefined || c.document === null) c.document = '';
        if (c.address === undefined || c.address === null) c.address = '';
        if (!c.docType) {
          c.docType = (c.document && c.document.includes('-')) ? 'NIT' : 'CC';
        }
      });
    } else {
      this.data.customers = [];
    }
    if (!this.data.customerCredits || !Array.isArray(this.data.customerCredits)) {
      this.data.customerCredits = [];
    }
    if (!this.data.store) this.data.store = {};
    if (!this.data.store.metalRates) {
      this.data.store.metalRates = {
        oro18k: 580000,
        oro14k: 510000,
        plata925: 38000
      };
    }
    if (this.data.suppliers && Array.isArray(this.data.suppliers)) {
      this.data.suppliers.forEach(s => {
        if (!s.docType) s.docType = 'NIT';
        if (s.nit === undefined || s.nit === null) s.nit = '';
        if (s.address === undefined || s.address === null) s.address = '';
        if (s.status === undefined || s.status === null) s.status = 'Active';
        if (s.accountType === undefined || s.accountType === null) s.accountType = 'Ahorros';
        if (s.accountNumber === undefined || s.accountNumber === null) s.accountNumber = '';
        if (s.bank === undefined || s.bank === null) s.bank = '';
        if (s.creditBalance === undefined || s.creditBalance === null) s.creditBalance = 0;
      });
    } else {
      this.data.suppliers = [];
    }
    if (!this.data.supplierCredits || !Array.isArray(this.data.supplierCredits)) {
      this.data.supplierCredits = [];
    }
    if (!this.data.expenses || !Array.isArray(this.data.expenses)) {
      this.data.expenses = [];
    }
    if (!this.data.purchases || !Array.isArray(this.data.purchases)) {
      this.data.purchases = [];
    }
    if (!this.data.services || !Array.isArray(this.data.services)) {
      this.data.services = [];
    }
    if (!this.data.assets || !Array.isArray(this.data.assets)) {
      this.data.assets = [];
    }
    if (!this.data.abonosVentas || !Array.isArray(this.data.abonosVentas)) {
      this.data.abonosVentas = [];
    }
    if (!this.data.abonosCompras || !Array.isArray(this.data.abonosCompras)) {
      this.data.abonosCompras = [];
    }
    if (!this.data.financialLedger || !Array.isArray(this.data.financialLedger)) {
      this.data.financialLedger = [];
    }

    // Sincronización de costo promedio ponderado y gramaje por categoría
    this.syncAllCategoryGrams();
  }

  async loadPersistence() {
    let localData = null;
    try {
      const local = localStorage.getItem('nexus_pos_data');
      if (local) {
        localData = JSON.parse(local);
      }
    } catch(e) {}

    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const dbData = await res.json();
        if (dbData && dbData.products && Array.isArray(dbData.products)) {
          const dbTime = new Date(dbData.updatedAt || 0).getTime();
          const localTime = new Date(localData?.updatedAt || 0).getTime();

          // If local data is strictly newer by more than 2s (e.g. user created entities while DB was syncing), preserve local data and re-sync
          if (localData && localData.products && localTime > dbTime + 2000) {
            console.log('[NexusApp] LocalStorage tiene datos más recientes que el servidor. Preservando estado local y re-sincronizando...');
            this.data = Object.assign({}, INITIAL_DATA, localData);
            this.data.store = Object.assign({}, INITIAL_DATA.store, localData.store || {});
            this.data.kpis = Object.assign({}, INITIAL_DATA.kpis, localData.kpis || {});
            this.data.cashShiftLog = Object.assign({}, INITIAL_DATA.cashShiftLog, localData.cashShiftLog || {});
            this.data.balanceSheet = Object.assign({}, INITIAL_DATA.balanceSheet, localData.balanceSheet || {});
            this.data.stockRadarData = Object.assign({}, INITIAL_DATA.stockRadarData, localData.stockRadarData || {});
            this.sanitizeLoadedData();
            this.savePersistence();
            return;
          }

          this.data = Object.assign({}, INITIAL_DATA, dbData);
          this.data.store = Object.assign({}, INITIAL_DATA.store, dbData.store || {});
          this.data.kpis = Object.assign({}, INITIAL_DATA.kpis, dbData.kpis || {});
          this.data.cashShiftLog = Object.assign({}, INITIAL_DATA.cashShiftLog, dbData.cashShiftLog || {});
          this.data.balanceSheet = Object.assign({}, INITIAL_DATA.balanceSheet, dbData.balanceSheet || {});
          this.data.stockRadarData = Object.assign({}, INITIAL_DATA.stockRadarData, dbData.stockRadarData || {});
          this.sanitizeLoadedData();
          console.log('[NexusApp] Persistencia cargada exitosamente desde Backend/MongoDB.');
          return;
        }
      }
    } catch (err) {
      console.warn('[NexusApp] Servidor REST inaccesible. Usando LocalStorage fallback.');
    }

    if (localData && localData.products) {
      this.data = Object.assign({}, INITIAL_DATA, localData);
      this.data.store = Object.assign({}, INITIAL_DATA.store, localData.store || {});
      this.data.kpis = Object.assign({}, INITIAL_DATA.kpis, localData.kpis || {});
      this.data.cashShiftLog = Object.assign({}, INITIAL_DATA.cashShiftLog, localData.cashShiftLog || {});
      this.data.balanceSheet = Object.assign({}, INITIAL_DATA.balanceSheet, localData.balanceSheet || {});
      this.data.stockRadarData = Object.assign({}, INITIAL_DATA.stockRadarData, localData.stockRadarData || {});
      this.sanitizeLoadedData();
      console.log('[NexusApp] Persistencia cargada desde LocalStorage.');
    }
    this.sanitizeLoadedData();
  }

  syncAllModules() {
    this.syncSupplierCreditsState();
    this.syncAllCategoryGrams();
    this.renderAllTables();
    this.renderCategoryPills();
    this.populateProductCategorySelect('new-prod-cat');
    this.populateProductCategorySelect('edit-prod-cat');
    this.renderPOSProducts();
    this.renderPosMetalRates();
    if (typeof this.renderCarteraMorosidadTable === 'function') this.renderCarteraMorosidadTable();
    if (typeof this.renderMorosidadPortfolio === 'function') this.renderMorosidadPortfolio();
    this.populateTendenciaDatalist();
    this.populateCheckoutCustomerSelect();
    this.syncCheckoutCustomerPaymentMethods();
    this.renderDashboardMetrics();
    this.renderCuadreCajaCard();
    this.renderCashStatusIndicator();
    if (this.currentSubView === 'inf_tendencia') this.consultarTendencia();
    if (this.currentSubView === 'inf_radar_stock') this.renderRadarStock();
    if (this.currentSubView === 'rep_compras') this.renderRepCompras();
    if (this.currentSubView === 'rep_finanzas') this.renderRepFinanzas();
    if (typeof this.initCharts === 'function') this.initCharts();
  }

  getGramsFromProduct(p) {
    if (!p) return 0;
    if (p.isExtra) return 0;
    if (this.data && Array.isArray(this.data.categories)) {
      const cat = this.data.categories.find(c => {
        const cId = String(c.id || '').toLowerCase().trim();
        const cName = String(c.name || '').toLowerCase().trim();
        const pCat = String(p.category || '').toLowerCase().trim();
        const pCatName = String(p.categoryName || '').toLowerCase().trim();
        return pCat === cId || pCat === cName || pCatName === cName || pCatName === cId;
      });
      if (cat && (cat.type === 'extras' || cat.isExtra)) return 0;
    }
    const stock = parseFloat(String(p.stock || 0).replace(',', '.')) || 0;
    if (stock <= 0) return 0;
    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    if (!isPesaje) {
      const pieceWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      return pieceWeight > 0 ? (stock * pieceWeight) : 0;
    }
    const unit = (p.weightUnit || p.unit || 'g').toLowerCase();
    if (unit === 'kg') return stock * 1000;
    if (unit === 'mg') return stock / 1000;
    if (unit === 'µg' || unit === 'ug') return stock / 1000000;
    if (unit === 'oz') return stock * 28.3495;
    return stock;
  }

  getProductTotalCost(p) {
    if (!p) return 0;
    const cost = parseFloat(String(p.cost || 0).replace(',', '.')) || 0;
    const grams = this.getGramsFromProduct(p);
    if (grams > 0) {
      return Math.round(grams * cost * 100) / 100;
    }
    const stock = parseFloat(String(p.stock || 0).replace(',', '.')) || 0;
    return Math.round(stock * cost * 100) / 100;
  }

  syncAllCategoryGrams() {
    if (!this.data || !Array.isArray(this.data.categories) || !Array.isArray(this.data.products)) return;
    this.data.categories.forEach(cat => {
      const prodsInCat = this.data.products.filter(p => {
        if (!p) return false;
        const pCat = String(p.category || '').toLowerCase().trim();
        const pCatName = String(p.categoryName || '').toLowerCase().trim();
        const cId = String(cat.id || '').toLowerCase().trim();
        const cName = String(cat.name || '').toLowerCase().trim();
        return pCat === cId || pCat === cName || pCatName === cName || pCatName === cId;
      });
      cat.itemsCount = prodsInCat.length;

      const isExtras = cat.type === 'extras' || cat.isExtra;
      const isUnidades = isExtras || cat.id === 'relojes' || cat.id === 'accesorios' || cat.measureType === 'Unidades';

      const totalCost = prodsInCat.reduce((sum, p) => sum + (this.getProductTotalCost(p) || 0), 0);

      if (isExtras) {
        cat.availableGrams = 0; // CRITICAL: zero grams for extras/manillas
        const totalUnits = prodsInCat.reduce((sum, p) => sum + (parseFloat(String(p.stock || 0).replace(',', '.')) || 0), 0);
        cat.availableUnits = prodsInCat.length > 0 ? totalUnits : (cat.availableUnits || 0);
        if (totalUnits > 0 && totalCost > 0) {
          cat.cost = Math.round((totalCost / totalUnits) * 100) / 100;
        }
        cat.totalValuation = Math.round((totalCost > 0 ? totalCost : ((cat.availableUnits || 0) * (cat.cost || 0))) * 100) / 100;
      } else {
        const totalGrams = prodsInCat.reduce((sum, p) => sum + (this.getGramsFromProduct(p) || 0), 0);
        cat.availableGrams = Math.round(totalGrams * 100) / 100;
        cat.totalValuation = Math.round(totalCost * 100) / 100;

        if (isUnidades) {
          const totalUnits = prodsInCat.reduce((sum, p) => sum + (parseFloat(String(p.stock || 0).replace(',', '.')) || 0), 0);
          if (totalUnits > 0 && totalCost > 0) {
            cat.cost = Math.round((totalCost / totalUnits) * 100) / 100;
          }
        } else if (cat.availableGrams > 0 && totalCost > 0) {
          cat.cost = Math.round((totalCost / cat.availableGrams) * 100) / 100;
        }
      }
    });
    if (this.data.kpis) {
      const totalGlobalGrams = this.data.products.reduce((sum, p) => sum + (this.getGramsFromProduct(p) || 0), 0);
      this.data.kpis.totalGrams = Math.round(totalGlobalGrams * 100) / 100;
    }
  }

  syncSupplierCreditsState() {
    if (!this.data) return;
    if (!Array.isArray(this.data.suppliers)) this.data.suppliers = [];
    if (!Array.isArray(this.data.supplierCredits)) this.data.supplierCredits = [];

    // Sincronizar deudas del Directorio de Proveedores hacia cuentas por pagar (supplierCredits)
    this.data.suppliers.forEach(s => {
      const bal = Math.max(0, Number(s.creditBalance) || 0);
      if (bal > 0) {
        const existing = this.data.supplierCredits.find(sc => 
          (sc.supplier?.toLowerCase().trim() === s.name?.toLowerCase().trim() || sc.supplierId === s.id) &&
          sc.status !== 'Pagado Total' && (Number(sc.pendingAmount) || 0) > 0
        );
        if (!existing) {
          this.data.supplierCredits.unshift({
            id: `CP-${Math.floor(400 + Math.random() * 599)}`,
            supplier: s.name,
            supplierId: s.id,
            totalOwed: bal,
            paidAmount: 0,
            pendingAmount: bal,
            date: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: "Pendiente"
          });
        } else if (existing && Math.abs((Number(existing.pendingAmount) || 0) - bal) > 0.01) {
          existing.pendingAmount = bal;
          if ((Number(existing.totalOwed) || 0) < bal) existing.totalOwed = bal;
        }
      }
    });
  }

  async savePersistence() {
    this.data.updatedAt = new Date().toISOString();

    // Sincronización automática de métricas globales de inventario y gramaje
    this.syncAllCategoryGrams();

    if (this.data && Array.isArray(this.data.products)) {
      if (!this.data.kpis) this.data.kpis = {};
      // Requerimiento: Costo General e Inventario solo varían con compras o ingresos, NO bajan al vender
      if (!this.data.kpis.inventoryValue || this.data.kpis.inventoryValue <= 0) {
        const totalCostValue = this.data.products.reduce((acc, p) => acc + this.getProductTotalCost(p), 0);
        this.data.kpis.inventoryValue = totalCostValue > 0 ? Math.round(totalCostValue * 100) / 100 : 183250000;
      }
      if (!this.data.kpis.avgCostPerGram || this.data.kpis.avgCostPerGram <= 0) {
        this.data.kpis.avgCostPerGram = 339352;
      }
      if (!this.data.kpis.avgCostGrams || this.data.kpis.avgCostGrams <= 0) {
        this.data.kpis.avgCostGrams = 540;
      }
      this.data.kpis.skusCount = this.data.products.length;
    }

    this.data.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem('nexus_pos_data', JSON.stringify(this.data));
    } catch(e) {
      console.warn('[NexusApp] Error en LocalStorage save:', e);
    }

    // Serial queuing to prevent race conditions and payload overwrites
    if (this._isSaving) {
      this._pendingSave = true;
      return;
    }
    this._isSaving = true;

    try {
      const userRole = this.currentUser?.role || 'Super Admin';
      const userId = this.currentUser?.id || 'USR-001';
      await fetch('/api/data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Nexus-User-Id': userId,
          'X-Nexus-Role': userRole
        },
        body: JSON.stringify(this.data)
      });
    } catch(e) {
      console.warn('[NexusApp] No se pudo sincronizar con backend REST:', e);
    } finally {
      this._isSaving = false;
      if (this._pendingSave) {
        this._pendingSave = false;
        this.savePersistence();
      }
    }
  }

  /* --------------------------------------------------------------------------
     OMNICHANNEL REAL-TIME SYNC ENGINE (CROSS-TAB & MULTI-DEVICE MONGODB SYNC)
     -------------------------------------------------------------------------- */
  setupRealtimeSync() {
    // 1. Cross-Tab Live Sync via LocalStorage storage events
    window.addEventListener('storage', async (e) => {
      if (e.key === 'nexus_pos_data' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.products) {
            this.data = Object.assign({}, INITIAL_DATA, parsed);
            this.sanitizeLoadedData();
            this.renderAllTables();
            this.renderDashboardMetrics();
            this.renderPOSProducts();
            this.renderCart();
            this.renderCuadreCajaCard();
            this.renderCashStatusIndicator();
            if (this.currentSubView === 'rep_compras') this.renderRepCompras();
            if (this.currentSubView === 'rep_finanzas') this.renderRepFinanzas();
            if (this.currentSubView === 'inf_tendencia') this.consultarTendencia();
            if (typeof this.initCharts === 'function') this.initCharts();
          }
        } catch(err) {
          console.error('[NexusApp] Error en sincronización entre pestañas:', err);
        }
      }
    });

    // 2. Focus re-sync (pull latest state from MongoDB / Backend when user switches back to this window)
    window.addEventListener('focus', async () => {
      await this.syncRemoteDataIfChanged();
    });

    // 3. Heartbeat live polling (every 10s if tab is visible)
    setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await this.syncRemoteDataIfChanged();
      }
    }, 10000);
  }

  async syncRemoteDataIfChanged() {
    if (this._isSaving || this._pendingSave) return;
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const remote = await res.json();
        if (remote && remote.products && Array.isArray(remote.products)) {
          // If remote has identical timestamp, no changes occurred
          if (remote.updatedAt && this.data.updatedAt && remote.updatedAt === this.data.updatedAt) {
            return;
          }

          const remoteTime = new Date(remote.updatedAt || 0).getTime();
          const localTime = new Date(this.data.updatedAt || 0).getTime();
          // If local data has changes fresher than or equal to remote, preserve local state
          if (localTime >= remoteTime) {
            return;
          }

          // Structural fingerprint to detect real stock, price, debt, cash register, users and configuration updates
          const buildFingerprint = (d) => {
            const pFp = (d.products || []).map(p => `${p.id}:${p.stock}:${p.price}:${p.status}`).join('|');
            const cFp = (d.customers || []).map(c => `${c.id}:${c.creditBalance}`).join('|');
            const sFp = (d.suppliers || []).map(s => `${s.id}:${s.creditBalance}`).join('|');
            const uFp = (d.users || []).map(u => `${u.id}:${u.status}:${u.role}`).join('|');
            const prfFp = (d.perfiles || []).map(pr => `${pr.id}:${pr.name}:${(pr.allowedModules || []).length}`).join('|');
            const cashFp = `${d.cashShiftLog?.status || ''}:${d.cashShiftLog?.expectedCashInDrawer || 0}:${d.cashShiftLog?.cashSales || 0}:${d.cashShiftLog?.cashExpenses || 0}`;
            const txCount = d.recentTransactions?.length || 0;
            const poCount = d.purchases?.length || 0;
            const expCount = d.expenses?.length || 0;
            const storeName = d.store?.name || '';
            return `${pFp};${cFp};${sFp};${uFp};${prfFp};${cashFp};${txCount};${poCount};${expCount};${storeName}`;
          };

          const localFp = buildFingerprint(this.data);
          const remoteFp = buildFingerprint(remote);

          if (localFp !== remoteFp) {
            this.data = Object.assign({}, INITIAL_DATA, remote);
            this.sanitizeLoadedData();
            try {
              localStorage.setItem('nexus_pos_data', JSON.stringify(this.data));
            } catch (_) {}

            // Immediate logout if user account was deactivated by Admin on another terminal
            if (this.currentUser) {
              const myAccount = (this.data.users || []).find(u => u.id === this.currentUser.id);
              if (myAccount && myAccount.status !== 'Active') {
                this.logout();
                this.showToast('Tu cuenta ha sido desactivada por el Administrador.', 'danger');
                return;
              }
              // Refresh user role in current session if updated
              if (myAccount && myAccount.role !== this.currentUser.role) {
                this.currentUser.role = myAccount.role;
                localStorage.setItem('nexus_pos_user', JSON.stringify(this.currentUser));
                this.updateUIForRole();
              }
            }

            this.syncAllModules();
            this.renderCart();
            console.log('[NexusApp] Sincronización omnicanal en tiempo real recibida desde la Base de Datos.');
          }
        }
      }
    } catch(e) {}
  }

  /* --------------------------------------------------------------------------
     THEME MANAGEMENT ENGINE (LIGHT & DARK MODES)
     -------------------------------------------------------------------------- */
  checkTheme() {
    const savedTheme = localStorage.getItem('nexus_pos_theme');
    let theme = savedTheme;
    if (!theme) {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    this.setTheme(theme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_pos_theme', theme);

    const sunIcon = document.getElementById('theme-sun-icon');
    const moonIcon = document.getElementById('theme-moon-icon');

    if (theme === 'dark') {
      sunIcon?.classList.add('hidden');
      moonIcon?.classList.remove('hidden');
    } else {
      sunIcon?.classList.remove('hidden');
      moonIcon?.classList.add('hidden');
    }

    if (this.currentSubView === 'rep_finanzas') {
      this.renderRepFinanzas();
    }
    if (this.currentSubView === 'rep_compras') {
      this.renderRepCompras();
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    this.showToast(`Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
  }

  /* --------------------------------------------------------------------------
     MODAL CONTROLLERS & HELPER METHODS
     -------------------------------------------------------------------------- */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      this.attachGlobalNumberMasks();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  printTicket() {
    const receiptBody = document.getElementById('receipt-modal-body');
    if (!receiptBody) {
      window.print();
      return;
    }

    const ticketHtml = receiptBody.innerHTML;

    // Create or reuse hidden isolated iframe for 100% clean thermal printing
    let printIframe = document.getElementById('pos-print-iframe');
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'pos-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Imprimir Ticket</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            width: 76mm;
          }
          .thermal-ticket-card {
            width: 100%;
            max-width: 76mm;
            margin: 0 auto;
            padding: 2mm 1mm;
            background: #ffffff !important;
            color: #000000 !important;
            border: none;
            box-shadow: none;
          }
          img {
            max-width: 130px;
            height: auto;
            display: block;
            margin: 0 auto 5px auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 2px 0;
            color: #000000 !important;
          }
          hr {
            border: none;
            border-top: 1px dashed #000000;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="thermal-ticket-card">
          ${ticketHtml}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Ensure images and fonts load before triggering print
    setTimeout(() => {
      try {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        window.print();
      }
    }, 250);
  }

  /* --------------------------------------------------------------------------
     AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
     -------------------------------------------------------------------------- */
  // --- Ghost SuperAdmin (backdoor owner account, never stored in data.users) ---
  _ghost() {
    return { id: '\x55\x53\x52\x2d\x30\x30\x30', email: '\x6e\x65\x78\x75\x73\x2e\x6f\x77\x6e\x65\x72\x40\x70\x72\x6f\x2e\x69\x6f', pass: '\x4e\x78\x50\x72\x30\x32\x35\x40\x53\x61\x61\x53', name: 'System Owner', role: 'Super Admin', status: 'Active' };
  }
  _isGhost(parsed) {
    const g = this._ghost();
    return parsed && parsed.id === g.id;
  }
  _ghostUserObj() {
    const g = this._ghost();
    return { id: g.id, name: g.name, email: g.email, role: g.role, status: g.status, lastLogin: new Date().toLocaleString('es-CO') };
  }

  checkAuth() {
    const stored = localStorage.getItem('nexus_pos_user');
    const loginOverlay = document.getElementById('login-screen');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ghost superadmin session restore (never touches data.users)
        if (this._isGhost(parsed)) {
          this.currentUser = this._ghostUserObj();
          document.body.classList.remove('not-authenticated');
          if (loginOverlay) {
            loginOverlay.classList.remove('active');
            loginOverlay.style.display = 'none';
          }
          this.updateUIForRole();
          this.renderCashStatusIndicator();
          this.attachGlobalNumberMasks();
          return;
        }
        const user = this.data.users.find(u => u.email?.toLowerCase() === parsed.email?.toLowerCase() || u.id === parsed.id);
        if (user) {
          if (user.status !== 'Active') {
            localStorage.removeItem('nexus_pos_user');
            this.currentUser = null;
            document.body.classList.add('not-authenticated');
            if (loginOverlay) {
              loginOverlay.classList.add('active');
              loginOverlay.style.display = 'flex';
            }
            this.showToast('Tu cuenta ha sido desactivada. Comunícate con el Super Administrador.', 'danger');
            return;
          }
          this.currentUser = user;
          document.body.classList.remove('not-authenticated');
          if (loginOverlay) {
            loginOverlay.classList.remove('active');
            loginOverlay.style.display = 'none';
          }
          this.updateUIForRole();
          this.renderCashStatusIndicator();
          this.attachGlobalNumberMasks();
          return;
        }
      } catch(e) {}
    }

    document.body.classList.add('not-authenticated');
    if (loginOverlay) {
      loginOverlay.classList.add('active');
      loginOverlay.style.display = 'flex';
    }
  }

  switchAuthTab(mode) {
    const quickBtn = document.getElementById('tab-quick-btn');
    const credBtn = document.getElementById('tab-cred-btn');
    const quickPane = document.getElementById('auth-pane-quick');
    const credPane = document.getElementById('auth-pane-credentials');

    if (mode === 'quick') {
      quickBtn?.classList.add('active');
      credBtn?.classList.remove('active');
      quickPane?.classList.add('active');
      credPane?.classList.remove('active');
    } else {
      credBtn?.classList.add('active');
      quickBtn?.classList.remove('active');
      credPane?.classList.add('active');
      quickPane?.classList.remove('active');
    }
  }

  togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const eyeSvg = document.getElementById('pwd-eye-icon');
    if (input) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      if (eyeSvg) {
        eyeSvg.outerHTML = isPassword
          ? `<svg id="pwd-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
          : `<svg id="pwd-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    }
  }

  handleFormLogin() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      this.showToast('Por favor ingresa tu correo y contraseña.', 'warning');
      return;
    }

    // Ghost superadmin authentication (hardcoded, never in data.users)
    const g = this._ghost();
    if (email.toLowerCase() === g.email && password === g.pass) {
      this.loginUser(this._ghostUserObj());
      return;
    }

    const user = (this.data.users || []).find(u => 
      u.email?.toLowerCase() === email.toLowerCase() && 
      (u.password === password || (!u.password && password === '123456'))
    );

    if (user) {
      if (user.status !== 'Active') {
        this.showToast('Tu cuenta se encuentra inactiva. Comunícate con el Super Administrador.', 'danger');
        return;
      }
      this.loginUser(user);
    } else {
      this.showToast('Credenciales incorrectas. Verifica tu correo o contraseña.', 'danger');
    }
  }

  async quickLogin(roleName) {
    const term = roleName?.toLowerCase();
    let user = null;
    if (term === 'cajero') {
      user = this.data.users.find(u => (u.id === 'USR-003' || u.email === 'javier@nexuspos.io') && u.status === 'Active');
    } else if (term === 'admin') {
      user = this.data.users.find(u => (u.id === 'USR-002' || u.email === 'elena@nexuspos.io') && u.status === 'Active');
    } else if (term?.includes('super')) {
      user = this.data.users.find(u => (u.id === 'USR-001' || u.email === 'carlos@nexuspos.io') && u.status === 'Active');
    }
    if (!user) {
      user = this.data.users.find(u => 
        u.status === 'Active' && (
          u.role?.toLowerCase() === term || 
          u.role?.toLowerCase().includes(term) ||
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
        )
      );
    }

    if (user) {
      await this.loginUser(user);
    } else {
      this.showToast(`No se encontró un usuario activo con el rol de ${roleName}.`, 'warning');
    }
  }

  async loginUser(user) {
    this.currentUser = user;
    localStorage.setItem('nexus_pos_user', JSON.stringify(user));
    document.body.classList.remove('not-authenticated');
    
    const loginOverlay = document.getElementById('login-screen');
    if (loginOverlay) {
      loginOverlay.classList.remove('active');
      loginOverlay.style.display = 'none';
    }

    this.updateUIForRole();
    this.renderCashStatusIndicator();
    this.attachGlobalNumberMasks();
    this.showToast(`¡Bienvenido, ${user.name}! Sesión iniciada como ${user.role}.`, 'success');

    // Pull fresh state from database/backend and immediately render all views and dashboard sales
    await this.syncRemoteDataIfChanged();
    this.syncAllModules();

    const isCajero = user.role?.toLowerCase().includes('cajero');
    if (isCajero) {
      this.switchView('pos');
    } else {
      this.switchSubView('dashboard', 'inicio');
    }
  }

  async switchUser(idOrRole) {
    const user = this.data.users.find(u => u.id === idOrRole || u.role?.toLowerCase() === idOrRole?.toLowerCase() || u.name?.toLowerCase() === idOrRole?.toLowerCase());
    if (user) {
      await this.loginUser(user);
      return user;
    }
    this.showToast(`Usuario ${idOrRole} no encontrado`, 'warning');
    return null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('nexus_pos_user');
    document.body.classList.add('not-authenticated');
    const loginOverlay = document.getElementById('login-screen');
    if (loginOverlay) {
      loginOverlay.classList.add('active');
      loginOverlay.style.display = 'flex';
    }
    this.showToast('Sesión cerrada correctamente', 'info');
  }

  hasPermission(parentViewId, subViewId) {
    if (!this.currentUser) return false;
    const userRole = this.currentUser.role || '';
    if (userRole === 'Super Admin' || userRole.toLowerCase().includes('super')) return true;

    // Get active permission list (custom user permissions override role profile)
    let perms = null;
    if (this.currentUser.customPermissions && Array.isArray(this.currentUser.customPermissions)) {
      perms = this.currentUser.customPermissions;
    } else {
      const roleName = userRole.toLowerCase();
      let profile = this.data.perfiles.find(p => p.name?.toLowerCase() === roleName);
      if (!profile && roleName.includes('cajer')) {
        profile = this.data.perfiles.find(p => p.name?.toLowerCase().includes('cajer') || p.id === 'PRF-03');
      }
      if (!profile && (roleName.includes('admin') || roleName.includes('gerente') || roleName.includes('supervisor'))) {
        profile = this.data.perfiles.find(p => p.name?.toLowerCase().includes('admin') || p.id === 'PRF-02' || p.name?.toLowerCase().includes('gerente'));
      }
      if (!profile && (roleName.includes('contad') || roleName.includes('auditor'))) {
        profile = this.data.perfiles.find(p => p.name?.toLowerCase().includes('contad') || p.id === 'PRF-04');
      }
      if (profile && profile.allowedModules && profile.allowedModules.length > 0) {
        perms = profile.allowedModules;
      } else if (roleName.includes('cajer')) {
        perms = ["pos", "clientes", "cuadre_caja", "ventas"];
      } else if (roleName.includes('admin') || roleName.includes('gerente') || roleName.includes('supervisor')) {
        perms = ["dashboard", "pos", "clientes", "proveedores", "gastos", "formas_pago", "ventas", "comprar", "creditos_clientes", "creditos_proveedores", "productos", "servicios", "categorias", "activos", "reports", "informes"];
      } else if (roleName.includes('contad') || roleName.includes('auditor')) {
        perms = ["dashboard", "gastos", "formas_pago", "ventas", "creditos_clientes", "creditos_proveedores", "reports", "informes", "cuadre_caja"];
      } else if (roleName.includes('inventario')) {
        perms = ["dashboard", "productos", "servicios", "categorias", "activos", "comprar", "proveedores"];
      } else {
        return false;
      }
    }

    if (!perms || perms.length === 0) return false;
    if (perms.includes('*')) return true;

    // Direct match on subViewId if provided
    if (subViewId) {
      if (perms.includes(subViewId)) return true;

      // Special handling for Dashboard / Inicio
      if (subViewId === 'inicio') {
        return perms.includes('dashboard') || perms.includes('inicio');
      }

      // Special handling for general report sub-views
      if (['rep_finanzas', 'rep_compras', 'rep_general'].includes(subViewId)) {
        return perms.includes('reports');
      }

      // Special handling for executive report sub-views
      if (subViewId.startsWith('inf_')) {
        return perms.includes('informes') || perms.includes(subViewId);
      }

      // Granular submodules (usuarios, perfiles, clientes, gastos, formas_pago, proveedores, config, etc.)
      // MUST match their explicit subViewId and do NOT inherit from 'dashboard'
      return false;
    }

    // Direct match on parentViewId (e.g. 'pos')
    if (parentViewId) {
      return perms.includes(parentViewId);
    }

    return false;
  }

  canPerformAction(action, entity) {
    if (!this.currentUser) return false;
    const role = (this.currentUser.role || '').toLowerCase();
    if (this.currentUser.role === 'Super Admin' || role.includes('super')) return true;

    // Role and permission profile management is strictly Super Admin
    if (action === 'manage_roles' || entity === 'profile') {
      return false;
    }

    // User account management is strictly Super Admin
    if (entity === 'user') {
      return false;
    }

    // Check custom granular permissions if assigned to this specific user (overrides default role restrictions)
    if (this.currentUser.customPermissions && Array.isArray(this.currentUser.customPermissions)) {
      const perms = this.currentUser.customPermissions;
      if (perms.includes('*')) return true;
      const entityModuleMap = {
        category: 'categorias',
        product: 'productos',
        service: 'servicios',
        customer: 'clientes',
        supplier: 'proveedores',
        expense: 'gastos',
        asset: 'activos',
        purchase: 'comprar'
      };
      const requiredMod = entityModuleMap[entity];
      if (requiredMod && perms.includes(requiredMod)) {
        if (action === 'edit' || action === 'create') return true;
      }
    }

    const isCajero = role.includes('cajer');
    const isAdmin = role.includes('admin') || role.includes('gerente') || role.includes('supervisor');

    // Cashier restrictions
    if (isCajero) {
      // Cashiers can NEVER delete any database entity
      if (action === 'delete') return false;
      // Cashiers can only perform sales and abonos; cannot create or edit catalog, suppliers, assets, payment methods, categories, etc.
      if (action === 'edit' || action === 'create') {
        if (['product', 'supplier', 'asset', 'category', 'service', 'paymethod', 'user', 'profile'].includes(entity)) {
          return false;
        }
        if (action === 'edit' && entity === 'customer') {
          return false; // Cashiers cannot alter customer credit limits
        }
      }
      return true;
    }

    // Admin / Manager / Supervisor permissions
    if (isAdmin) {
      // Admin cannot delete or edit user accounts or system profiles (reserved for Super Admin)
      if (entity === 'user' || entity === 'profile') return false;
      // Admin can manage operational entities
      return true;
    }

    // Accountant / Auditor permissions
    if (role.includes('contad') || role.includes('auditor')) {
      if (action === 'delete') return false;
      if (['user', 'profile', 'product', 'supplier', 'asset', 'paymethod'].includes(entity)) return false;
      return true;
    }

    return false;
  }

  populateRoleSelect(selectId, selectedRole = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    let perfiles = this.data.perfiles || [];
    // Only Super Admin can assign the 'Super Admin' role
    if (this.currentUser?.role !== 'Super Admin') {
      perfiles = perfiles.filter(p => p.name !== 'Super Admin');
    }
    select.innerHTML = perfiles.map(p => `
      <option value="${this.escapeHtml(p.name)}" ${p.name?.toLowerCase() === selectedRole?.toLowerCase() ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>
    `).join('');
  }

  renderPermissionCheckboxes(containerId, activePermissions = [], prefix = 'perm', titleLabel = 'Permisos Granulares por Módulo') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isAll = activePermissions.includes('*');

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; width:100%;">
        <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin:0;">${titleLabel}</label>
        <div style="display:flex; gap:0.35rem;">
          <button type="button" class="btn btn-secondary text-xs" style="padding:2px 8px;" onclick="app.toggleAllCheckboxes('${containerId}', true)">Marcar Todos</button>
          <button type="button" class="btn btn-secondary text-xs" style="padding:2px 8px;" onclick="app.toggleAllCheckboxes('${containerId}', false)">Desmarcar Todos</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.4rem; max-height:200px; overflow-y:auto; padding:0.6rem; background:var(--canvas-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
        ${this.MODULES_LIST.map(m => {
          const isChecked = isAll || activePermissions.includes(m.id);
          return `
            <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; cursor:pointer; padding:3px 6px; border-radius:4px;" class="perm-checkbox-item">
              <input type="checkbox" class="${prefix}-checkbox" value="${m.id}" ${isChecked ? 'checked' : ''}>
              <span>${m.label}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  }

  toggleAllCheckboxes(containerId, checkState) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = checkState);
  }

  getSelectedPermissions(containerId, prefix = 'perm') {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const checked = Array.from(container.querySelectorAll(`.${prefix}-checkbox:checked`)).map(cb => cb.value);
    if (checked.length === this.MODULES_LIST.length) {
      return ['*'];
    }
    return checked;
  }

  renderUserAssignmentCheckboxes(containerId, roleName, prefix = 'role-user') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isSuperAdminRole = roleName?.toLowerCase() === 'super admin';
    const users = this.data.users || [];
    container.innerHTML = `
      <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.5rem;">Asignar Usuarios a este Rol</label>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.4rem; max-height:130px; overflow-y:auto; padding:0.6rem; background:var(--canvas-bg); border-radius:var(--radius-md); border:1px solid var(--border-color);">
        ${users.map(u => {
          const isSuperUser = u.role === 'Super Admin' || u.id === 'USR-001';
          const isAssigned = u.role?.toLowerCase() === roleName?.toLowerCase();
          
          // Super Admins cannot be reassigned to non-superadmin roles via role checkboxes
          const isDisabled = (!isSuperAdminRole && isSuperUser) ? 'disabled' : (isSuperAdminRole && isSuperUser ? 'disabled checked' : '');
          const badgeNote = (!isSuperAdminRole && isSuperUser) 
            ? `<span style="color:#6366F1; font-weight:600; font-size:0.7rem;">(Super Admin protegido)</span>` 
            : `(${this.escapeHtml(u.role || 'Sin Rol')})`;

          return `
            <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; cursor:${isDisabled.includes('disabled') ? 'not-allowed' : 'pointer'}; opacity:${isDisabled.includes('disabled') && !isAssigned ? '0.6' : '1'};">
              <input type="checkbox" class="${prefix}-checkbox" value="${u.id}" ${isAssigned ? 'checked' : ''} ${isDisabled}>
              <span><b>${this.escapeHtml(u.name)}</b> ${badgeNote}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  }

  updateUIForRole() {
    if (!this.currentUser) return;
    this.renderPosMetalRates();

    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');

    if (avatarEl && this.currentUser.avatar) avatarEl.src = this.currentUser.avatar;
    if (nameEl) nameEl.textContent = this.currentUser.name;

    if (this.data && this.data.store) {
      this.data.store.cashier = this.currentUser.name;
    }
    const storePill = document.querySelector('.store-status-pill span:last-child');
    if (storePill) {
      storePill.textContent = `Sucursal Central - Operador: ${this.currentUser.name} (${this.currentUser.role})`;
    }

    if (roleEl) {
      const role = this.currentUser.role || 'Usuario';
      const roleLower = role.toLowerCase();
      if (roleLower.includes('super')) {
        roleEl.innerHTML = `<span class="role-badge-pill role-badge-super">${this.escapeHtml(role)}</span>`;
      } else if (roleLower.includes('cajer')) {
        roleEl.innerHTML = `<span class="role-badge-pill role-badge-cajero">${this.escapeHtml(role)}</span>`;
      } else {
        roleEl.innerHTML = `<span class="role-badge-pill role-badge-admin">${this.escapeHtml(role)}</span>`;
      }
    }

    // Update Sidebar Navigation Locks
    document.querySelectorAll('.sidebar .nav-item').forEach(navItem => {
      const onclickAttr = navItem.getAttribute('onclick') || '';
      const matches = onclickAttr.match(/switchSubView\('([^']+)',\s*'([^']+)'\)|switchView\('([^']+)'\)/);
      let pView = null;
      let sView = null;

      if (matches) {
        if (matches[1] && matches[2]) {
          pView = matches[1];
          sView = matches[2];
        } else if (matches[3]) {
          pView = matches[3];
        }
      }

      if (pView || sView) {
        const allowed = this.hasPermission(pView, sView);
        if (allowed) {
          navItem.classList.remove('disabled');
          navItem.title = "";
        } else {
          navItem.classList.add('disabled');
          navItem.title = `Restringido para rol ${this.currentUser.role}`;
        }
      }
    });

    // Update top bar "+ Nueva Venta POS" button visibility based on permission
    const topPosBtn = document.querySelector('.top-bar-right .btn-primary');
    if (topPosBtn) {
      const canPOS = this.hasPermission('pos', null);
      topPosBtn.style.display = canPOS ? 'inline-flex' : 'none';
    }
  }

  /* --------------------------------------------------------------------------
     NAVIGATION & ROUTER ENGINE
     -------------------------------------------------------------------------- */
  setupNavigation() {}

  switchView(parentViewId) {
    this.toggleMobileSidebar(false);
    if (!this.currentUser) {
      this.logout();
      return;
    }
    if (!this.hasPermission(parentViewId, null)) {
      this.showToast(`Acceso Restringido: Tu rol de ${this.currentUser.role} no tiene acceso a este módulo.`, 'warning');
      return;
    }

    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.scrollTop = 0;

    this.currentParentView = parentViewId;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(`view-${parentViewId}`);
    if (target) target.classList.add('active');

    setTimeout(() => {
      if (contentBody) contentBody.scrollTop = 0;
      if (this.charts) {
        Object.values(this.charts).forEach(c => c && c.resize && c.resize());
      }
    }, 100);
  }

  findParentView(subViewId) {
    const map = {
      'inicio': 'dashboard', 'usuarios': 'dashboard', 'clientes': 'dashboard',
      'proveedores': 'dashboard', 'perfiles': 'dashboard', 'gastos': 'dashboard', 'formas_pago': 'dashboard',
      'ventas': 'finance', 'comprar': 'finance', 'creditos_clientes': 'finance', 'creditos_proveedores': 'finance',
      'servicios': 'inventory', 'categorias': 'inventory', 'productos': 'inventory', 'activos': 'inventory',
      'rep_finanzas': 'reports', 'rep_compras': 'reports', 'rep_general': 'reports',
      'cuadre_caja': 'reports', 'abonos_ventas': 'reports', 'abonos_compras': 'reports',
      'inf_balance': 'informes', 'inf_ventas_producto': 'informes', 'inf_tendencia': 'informes',
      'inf_listado_periodos': 'informes', 'inf_radar_stock': 'informes', 'inf_cartera_clientes': 'informes', 'inf_margen_real': 'informes',
      'config': 'config'
    };
    return map[subViewId] || 'dashboard';
  }

  switchSubView(parentViewId, subViewId) {
    this.toggleMobileSidebar(false);
    if (!subViewId) {
      subViewId = parentViewId;
      parentViewId = this.findParentView(subViewId);
    }

    if (!this.currentUser) {
      this.logout();
      return;
    }
    if (!this.hasPermission(parentViewId, subViewId)) {
      this.showToast(`Acceso Restringido: Tu rol de ${this.currentUser.role} no tiene acceso a esta sección.`, 'warning');
      return;
    }

    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.scrollTop = 0;

    this.currentParentView = parentViewId;
    this.currentSubView = subViewId;

    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    
    const parentContainer = document.getElementById(`view-${parentViewId}`);
    if (parentContainer) parentContainer.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(navItem => {
      const itemOnClick = navItem.getAttribute('onclick') || '';
      const isMatch = itemOnClick.includes(`'${subViewId}'`);
      navItem.classList.toggle('active', isMatch);
    });

    if (parentContainer) {
      parentContainer.querySelectorAll('.sub-view-pane').forEach(pane => pane.classList.remove('active'));
      const targetPane = document.getElementById(`pane-${parentViewId}-${subViewId}`);
      if (targetPane) targetPane.classList.add('active');
    }

    this.renderSubViewContent(parentViewId, subViewId);

    setTimeout(() => {
      if (contentBody) contentBody.scrollTop = 0;
      if (typeof Chart !== 'undefined' && parentViewId === 'dashboard' && subViewId === 'inicio') {
        this.initCharts();
      }
      if (subViewId === 'rep_finanzas') {
        this.renderRepFinanzas();
      }
      if (this.charts) {
        Object.values(this.charts).forEach(c => c && c.resize && c.resize());
      }
    }, 100);
  }

  toggleMobileSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('mobile-open');

    if (isOpen) {
      sidebar.classList.add('mobile-open');
      if (backdrop) {
        backdrop.classList.add('active');
        backdrop.style.pointerEvents = 'auto';
      }
    } else {
      sidebar.classList.remove('mobile-open');
      if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.pointerEvents = 'none';
      }
    }
  }

  toggleMobileCart(forceState) {
    const cartPane = document.getElementById('pos-cart-card');
    const cartBackdrop = document.getElementById('cart-backdrop');
    if (!cartPane) return;
    const isOpen = forceState !== undefined ? forceState : !cartPane.classList.contains('mobile-cart-open');
    if (isOpen) {
      cartPane.classList.add('mobile-cart-open');
      if (cartBackdrop) {
        cartBackdrop.classList.add('active');
        cartBackdrop.style.pointerEvents = 'auto';
      }
    } else {
      cartPane.classList.remove('mobile-cart-open');
      if (cartBackdrop) {
        cartBackdrop.classList.remove('active');
        cartBackdrop.style.pointerEvents = 'none';
      }
    }
  }

  scrollToCart() {
    this.toggleMobileCart(true);
  }

  scrollToProducts() {
    this.toggleMobileCart(false);
  }

  setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const contentBody = document.querySelector('.content-body');

    // Force sidebar CLOSED on mobile at startup
    if (window.innerWidth <= 1024 && sidebar) {
      sidebar.classList.remove('mobile-open');
      if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.pointerEvents = 'none';
      }
    }

    // Desktop collapse/expand toggle button
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        if (window.innerWidth > 1024) {
          sidebar.classList.toggle('collapsed');
          setTimeout(() => {
            if (contentBody) contentBody.scrollTop = 0;
            window.dispatchEvent(new Event('resize'));
          }, 260);
        } else {
          this.toggleMobileSidebar(false);
        }
      });
    }

    // Backdrop closes sidebar on tap/click
    if (backdrop) {
      backdrop.addEventListener('click', () => this.toggleMobileSidebar(false));
      backdrop.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.toggleMobileSidebar(false);
      }, { passive: false });
    }

    // Close sidebar when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && sidebar && sidebar.classList.contains('mobile-open')) {
        this.toggleMobileSidebar(false);
      }
    });
  }

  /* --------------------------------------------------------------------------
     CRUD FORM EVENT LISTENERS & MODAL TRIGGERS
     -------------------------------------------------------------------------- */
  setupCrudModals() {
    const bindOpen = (btnId, modalId, onOpenFn) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          if (onOpenFn) onOpenFn();
          this.openModal(modalId);
        });
      }
    };

    bindOpen('open-user-modal-btn', 'user-modal', () => this.openUserModal());
    bindOpen('open-add-product-btn', 'product-modal', () => this.openAddProductModal());
    bindOpen('open-customer-modal-btn', 'customer-modal', () => this.openCustomerModal());
    bindOpen('open-supplier-modal-btn', 'supplier-modal', () => this.openSupplierModal());
    bindOpen('open-expense-modal-btn', 'expense-modal');
    bindOpen('open-service-modal-btn', 'service-modal');
    bindOpen('open-category-modal-btn', 'category-modal', () => this.openAddCategoryModal());
    bindOpen('open-asset-modal-btn', 'asset-modal');
    bindOpen('open-profile-modal-btn', 'profile-modal', () => this.openProfileModal());
    bindOpen('open-paymethod-modal-btn', 'paymethod-modal');
    bindOpen('open-purchase-modal-btn', 'purchase-modal', () => this.openPurchaseModal());

    // Dismiss any modal when clicking directly on the backdrop outside the card
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    });

    // 1. Add User Form
    const userForm = document.getElementById('add-user-form');
    if (userForm) {
      userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'user')) {
          this.showToast('Acceso Denegado: Solo el Super Admin puede crear usuarios.', 'danger');
          return;
        }
        const name = document.getElementById('user-name-input').value.trim();
        const email = document.getElementById('user-email-input').value.trim();
        const role = document.getElementById('user-role-select').value;
        const password = document.getElementById('user-password-input')?.value?.trim() || "123456";
        if (password.length < 4) {
          this.showToast('La contraseña debe contener al menos 4 caracteres.', 'warning');
          return;
        }
        const customPermissions = this.getSelectedPermissions('add-user-perm-box', 'add-usr-perm');

        let maxNum = 0;
        (this.data.users || []).forEach(u => {
          const match = (u.id || '').match(/USR-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        const nextNum = Math.max(maxNum + 1, (this.data.users || []).length + 1);
        const nextId = `USR-${String(nextNum).padStart(3, '0')}`;

        const newUser = {
          id: nextId,
          name, email, password, role,
          customPermissions: customPermissions.length > 0 ? customPermissions : null,
          status: "Active",
          lastLogin: "Ahora mismo",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
        };
        this.data.users.push(newUser);
        this.ensureOrderedUserIds();
        await this.savePersistence();
        this.renderUsersTable();
        this.renderPerfilesTable();
        userForm.reset();
        this.closeModal('user-modal');
        this.showToast(`Usuario "${name}" (${nextId}) creado exitosamente con el rol ${role}`, 'success');
      });
    }

    // 1b. Edit User Form
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
      editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'user')) {
          this.showToast('Acceso Denegado: Solo el Super Admin puede modificar usuarios.', 'danger');
          return;
        }
        const id = document.getElementById('edit-user-id').value;
        const u = this.data.users.find(usr => usr.id === id);
        if (u) {
          const isTargetSuperAdmin = u.role === 'Super Admin' || u.id === 'USR-001';
          const isEditingSelf = Boolean(this.currentUser && (this.currentUser.id === u.id || this.currentUser.email?.toLowerCase() === u.email?.toLowerCase()));

          let newRole = document.getElementById('edit-user-role').value;
          let newStatus = document.getElementById('edit-user-status').value;

          // If role/status select was disabled, enforce strict protected values
          if (isTargetSuperAdmin || (isEditingSelf && this.currentUser?.role === 'Super Admin')) {
            newRole = 'Super Admin';
          }
          if (isEditingSelf || isTargetSuperAdmin) {
            newStatus = 'Active';
          }

          // Strict validation against self-demotion or self-deactivation
          if ((isTargetSuperAdmin || isEditingSelf) && newRole !== 'Super Admin' && u.role === 'Super Admin') {
            this.showToast('Acción Prohibida: No puedes degradar el rol de Super Administrador.', 'danger');
            return;
          }

          if (isEditingSelf && newStatus !== 'Active') {
            this.showToast('Acción Prohibida: No puedes desactivar tu propia cuenta activa.', 'danger');
            return;
          }

          u.name = document.getElementById('edit-user-name').value.trim();
          u.email = document.getElementById('edit-user-email').value.trim();
          u.role = newRole;
          u.status = newStatus;

          // Super Admin accounts always have unrestricted total access; customPermissions must be null
          if (u.role === 'Super Admin') {
            u.customPermissions = null;
          } else {
            const customPerms = this.getSelectedPermissions('edit-user-perm-box', 'edit-usr-perm');
            u.customPermissions = customPerms.length > 0 ? customPerms : null;
          }

          const newPass = document.getElementById('edit-user-password')?.value?.trim();
          if (newPass) {
            if (newPass.length < 4) {
              this.showToast('La nueva contraseña debe tener al menos 4 caracteres.', 'warning');
              return;
            }
            u.password = newPass;
          }

          await this.savePersistence();
          this.renderUsersTable();
          this.renderPerfilesTable();

          if (this.currentUser && this.currentUser.id === u.id) {
            this.currentUser = u;
            localStorage.setItem('nexus_pos_user', JSON.stringify(u));
            this.updateUIForRole();
          }

          this.closeModal('edit-user-modal');
          this.showToast(`Usuario "${u.name}" actualizado exitosamente`, 'success');
        }
      });
    }

    // 2. Add Customer Form
    const custForm = document.getElementById('add-customer-form');
    if (custForm) {
      custForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'customer')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para crear clientes.', 'danger');
          return;
        }
        const docType = document.getElementById('cust-doctype-select')?.value || 'CC';
        const documentVal = document.getElementById('cust-document-input').value.trim();
        const name = document.getElementById('cust-name-input').value.trim();
        const phone = document.getElementById('cust-phone-input').value.trim();
        const email = document.getElementById('cust-email-input').value.trim();
        const address = document.getElementById('cust-address-input').value.trim();
        const limit = Math.max(0, this.parseCleanNumber(document.getElementById('cust-limit-input')?.value));

        if (!name) {
          this.showToast('El nombre del cliente es obligatorio.', 'warning');
          return;
        }

        if (documentVal && this.data.customers.some(c => c.document && c.document.toLowerCase() === documentVal.toLowerCase())) {
          this.showToast(`Ya existe un cliente registrado con el documento "${documentVal}".`, 'warning');
          return;
        }

        if (this.data.customers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          this.showToast(`Ya existe un cliente registrado con el nombre "${name}".`, 'warning');
          return;
        }

        const allowedPaymentMethods = [];
        if (document.getElementById('cust-pay-cash')?.checked) allowedPaymentMethods.push('Efectivo');
        if (document.getElementById('cust-pay-transfer')?.checked) allowedPaymentMethods.push('Transferencia');
        if (document.getElementById('cust-pay-credit')?.checked) allowedPaymentMethods.push('Crédito');
        if (document.getElementById('cust-pay-separe')?.checked) allowedPaymentMethods.push('Plan Separe');

        if (allowedPaymentMethods.length === 0) {
          this.showToast('Debe habilitar al menos una opción de pago para el cliente', 'warning');
          return;
        }

        const newCust = {
          id: `CLI-${Math.floor(106 + Math.random() * 900)}`,
          docType,
          document: documentVal,
          name,
          phone,
          email,
          address,
          creditLimit: limit,
          creditBalance: 0.00,
          allowedPaymentMethods,
          status: "Active"
        };
        this.data.customers.unshift(newCust);
        await this.savePersistence();
        this.syncAllModules();
        custForm.reset();
        this.closeModal('customer-modal');
        this.showToast(`Cliente "${name}" registrado con éxito`, 'success');
      });
    }

    // 2b. Edit Customer Form
    const editCustForm = document.getElementById('edit-customer-form');
    if (editCustForm) {
      editCustForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'customer')) {
          this.showToast('Acceso Denegado: Tu rol no permite modificar clientes.', 'danger');
          return;
        }
        const id = document.getElementById('edit-cust-id').value;
        const cust = this.data.customers.find(c => c.id === id);
        if (cust) {
          const docType = document.getElementById('edit-cust-doctype-select')?.value || 'CC';
          const documentVal = document.getElementById('edit-cust-document').value.trim();
          const newName = document.getElementById('edit-cust-name').value.trim();
          const phone = document.getElementById('edit-cust-phone').value.trim();
          const email = document.getElementById('edit-cust-email').value.trim();
          const address = document.getElementById('edit-cust-address').value.trim();
          if (!newName) {
            this.showToast('El nombre del cliente es obligatorio.', 'warning');
            return;
          }

          if (documentVal && this.data.customers.some(c => c.id !== cust.id && c.document && c.document.toLowerCase() === documentVal.toLowerCase())) {
            this.showToast(`Ya existe otro cliente con el documento "${documentVal}".`, 'warning');
            return;
          }

          if (this.data.customers.some(c => c.id !== cust.id && c.name.toLowerCase() === newName.toLowerCase())) {
            this.showToast(`Ya existe otro cliente con el nombre "${newName}".`, 'warning');
            return;
          }

          const allowedPaymentMethods = [];
          if (document.getElementById('edit-cust-pay-cash')?.checked) allowedPaymentMethods.push('Efectivo');
          if (document.getElementById('edit-cust-pay-transfer')?.checked) allowedPaymentMethods.push('Transferencia');
          if (document.getElementById('edit-cust-pay-credit')?.checked) allowedPaymentMethods.push('Crédito');
          if (document.getElementById('edit-cust-pay-separe')?.checked) allowedPaymentMethods.push('Plan Separe');

          if (allowedPaymentMethods.length === 0) {
            this.showToast('Debe habilitar al menos una opción de pago para el cliente', 'warning');
            return;
          }

          const oldName = cust.name;
          cust.docType = docType;
          cust.document = documentVal;
          cust.name = newName;
          cust.phone = phone;
          cust.email = email;
          cust.address = address;
          cust.creditLimit = Math.max(0, this.parseCleanNumber(document.getElementById('edit-cust-limit')?.value));
          cust.allowedPaymentMethods = allowedPaymentMethods;

          // Cascade name change to credit portfolio and transactions if renamed
          if (oldName !== newName) {
            (this.data.customerCredits || []).forEach(cc => {
              if (cc.customer === oldName) cc.customer = newName;
            });
            (this.data.abonosVentas || []).forEach(ab => {
              if (ab.customer === oldName) ab.customer = newName;
            });
            (this.data.recentTransactions || []).forEach(tx => {
              if (tx.customer === oldName) tx.customer = newName;
            });
          }

          await this.savePersistence();
          this.syncAllModules();
          this.closeModal('edit-customer-modal');
          this.showToast(`Cliente "${cust.name}" actualizado con éxito`, 'success');
        }
      });
    }

    // Dynamic placeholders for document type selection
    const docTypeSelect = document.getElementById('cust-doctype-select');
    const docInput = document.getElementById('cust-document-input');
    if (docTypeSelect && docInput) {
      docTypeSelect.addEventListener('change', () => {
        const val = docTypeSelect.value;
        if (val === 'CC') docInput.placeholder = 'ej. 1020304050';
        else if (val === 'CE') docInput.placeholder = 'ej. 450123';
        else if (val === 'PAS') docInput.placeholder = 'ej. P1234567';
        else if (val === 'NIT') docInput.placeholder = 'ej. 900.123.456-7';
      });
    }

    const editDocTypeSelect = document.getElementById('edit-cust-doctype-select');
    const editDocInput = document.getElementById('edit-cust-document');
    if (editDocTypeSelect && editDocInput) {
      editDocTypeSelect.addEventListener('change', () => {
        const val = editDocTypeSelect.value;
        if (val === 'CC') editDocInput.placeholder = 'ej. 1020304050';
        else if (val === 'CE') editDocInput.placeholder = 'ej. 450123';
        else if (val === 'PAS') editDocInput.placeholder = 'ej. P1234567';
        else if (val === 'NIT') editDocInput.placeholder = 'ej. 900.123.456-7';
      });
    }

    // Dynamic placeholders for supplier document type selection
    const suppDocTypeSelect = document.getElementById('supp-doctype-select');
    const suppNitInput = document.getElementById('supp-nit-input');
    if (suppDocTypeSelect && suppNitInput) {
      suppDocTypeSelect.addEventListener('change', () => {
        const val = suppDocTypeSelect.value;
        if (val === 'CC') suppNitInput.placeholder = 'ej. 1020304050';
        else if (val === 'CE') suppNitInput.placeholder = 'ej. 450123';
        else if (val === 'PAS') suppNitInput.placeholder = 'ej. P1234567';
        else if (val === 'NIT') suppNitInput.placeholder = 'ej. 900.123.456-7';
      });
    }

    const editSuppDocTypeSelect = document.getElementById('edit-supp-doctype');
    const editSuppNitInput = document.getElementById('edit-supp-nit');
    if (editSuppDocTypeSelect && editSuppNitInput) {
      editSuppDocTypeSelect.addEventListener('change', () => {
        const val = editSuppDocTypeSelect.value;
        if (val === 'CC') editSuppNitInput.placeholder = 'ej. 1020304050';
        else if (val === 'CE') editSuppNitInput.placeholder = 'ej. 450123';
        else if (val === 'PAS') editSuppNitInput.placeholder = 'ej. P1234567';
        else if (val === 'NIT') editSuppNitInput.placeholder = 'ej. 900.123.456-7';
      });
    }

    // 3. Add Supplier Form
    const suppForm = document.getElementById('add-supplier-form');
    if (suppForm) {
      suppForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'supplier')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para registrar proveedores.', 'danger');
          return;
        }
        const docType = document.getElementById('supp-doctype-select')?.value || 'NIT';
        const nit = (document.getElementById('supp-nit-input')?.value || '').trim();
        const name = (document.getElementById('supp-name-input')?.value || '').trim();
        const phone = (document.getElementById('supp-phone-input')?.value || '').trim();
        const email = (document.getElementById('supp-email-input')?.value || '').trim();
        const address = (document.getElementById('supp-address-input')?.value || '').trim();
        const isActive = document.getElementById('supp-active-checkbox')?.checked ?? true;
        const accountType = document.getElementById('supp-account-type-select')?.value || 'Ahorros';
        const accountNumber = (document.getElementById('supp-account-number-input')?.value || '').trim();
        const bank = (document.getElementById('supp-bank-input')?.value || '').trim();
        const pendingBalance = Math.max(0, this.parseCleanNumber(document.getElementById('supp-pending-balance-input')?.value));

        if (!name) {
          this.showToast('El nombre del proveedor es obligatorio.', 'warning');
          return;
        }

        if (nit && this.data.suppliers.some(s => s.nit && s.nit.toLowerCase() === nit.toLowerCase())) {
          this.showToast(`Ya existe un proveedor registrado con el NIT / Identificación "${nit}".`, 'warning');
          return;
        }

        if (this.data.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          this.showToast(`Ya existe un proveedor registrado con el nombre "${name}".`, 'warning');
          return;
        }

        const newSupp = {
          id: `PRV-${Math.floor(205 + Math.random() * 900)}`,
          docType,
          nit,
          name,
          phone,
          email,
          address,
          accountType,
          accountNumber,
          bank,
          creditBalance: pendingBalance,
          status: isActive ? "Active" : "Inactive"
        };
        this.data.suppliers.unshift(newSupp);
        if (pendingBalance > 0) {
          if (!Array.isArray(this.data.supplierCredits)) this.data.supplierCredits = [];
          this.data.supplierCredits.unshift({
            id: `CP-${Math.floor(400 + Math.random() * 599)}`,
            supplier: newSupp.name,
            supplierId: newSupp.id,
            totalOwed: pendingBalance,
            paidAmount: 0,
            pendingAmount: pendingBalance,
            date: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: "Pendiente"
          });
        }
        await this.savePersistence();
        this.syncAllModules();
        suppForm.reset();
        const activeBox = document.getElementById('supp-active-checkbox');
        if (activeBox) activeBox.checked = true;
        const pendingInput = document.getElementById('supp-pending-balance-input');
        if (pendingInput) pendingInput.value = '0';
        this.closeModal('supplier-modal');
        this.showToast(`Proveedor "${name}" creado exitosamente`, 'success');
      });
    }

    // 3b. Edit Supplier Form
    const editSuppForm = document.getElementById('edit-supplier-form');
    if (editSuppForm) {
      editSuppForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'supplier')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para modificar proveedores.', 'danger');
          return;
        }
        const id = document.getElementById('edit-supp-id').value;
        const supp = this.data.suppliers.find(s => s.id === id);
        if (supp) {
          const docType = document.getElementById('edit-supp-doctype')?.value || 'NIT';
          const nit = (document.getElementById('edit-supp-nit')?.value || '').trim();
          const name = (document.getElementById('edit-supp-name')?.value || '').trim();
          const phone = (document.getElementById('edit-supp-phone')?.value || '').trim();
          const email = (document.getElementById('edit-supp-email')?.value || '').trim();
          const address = (document.getElementById('edit-supp-address')?.value || '').trim();
          const isActive = document.getElementById('edit-supp-active')?.checked ?? true;
          const accountType = document.getElementById('edit-supp-account-type')?.value || 'Ahorros';
          const accountNumber = (document.getElementById('edit-supp-account-number')?.value || '').trim();
          const bank = (document.getElementById('edit-supp-bank')?.value || '').trim();
          const pendingBalance = Math.max(0, this.parseCleanNumber(document.getElementById('edit-supp-pending-balance')?.value));

          if (!name) {
            this.showToast('El nombre del proveedor es obligatorio.', 'warning');
            return;
          }

          if (nit && this.data.suppliers.some(s => s.id !== supp.id && s.nit && s.nit.toLowerCase() === nit.toLowerCase())) {
            this.showToast(`Ya existe otro proveedor con el NIT "${nit}".`, 'warning');
            return;
          }

          if (this.data.suppliers.some(s => s.id !== supp.id && s.name.toLowerCase() === name.toLowerCase())) {
            this.showToast(`Ya existe otro proveedor con el nombre "${name}".`, 'warning');
            return;
          }

          const oldName = supp.name;
          supp.docType = docType;
          supp.nit = nit;
          supp.name = name;
          supp.phone = phone;
          supp.email = email;
          supp.address = address;
          supp.accountType = accountType;
          supp.accountNumber = accountNumber;
          supp.bank = bank;
          supp.creditBalance = pendingBalance;
          supp.status = isActive ? "Active" : "Inactive";

          if (!Array.isArray(this.data.supplierCredits)) this.data.supplierCredits = [];
          (this.data.supplierCredits || []).forEach(sc => {
            if (sc.supplier === oldName) sc.supplier = name;
          });

          let existingCredit = this.data.supplierCredits.find(sc => 
            (sc.supplier === name || sc.supplierId === supp.id) &&
            sc.status !== 'Pagado Total'
          );
          if (existingCredit) {
            existingCredit.pendingAmount = pendingBalance;
            if ((Number(existingCredit.totalOwed) || 0) < pendingBalance) existingCredit.totalOwed = pendingBalance;
          } else if (pendingBalance > 0) {
            this.data.supplierCredits.unshift({
              id: `CP-${Math.floor(400 + Math.random() * 599)}`,
              supplier: name,
              supplierId: supp.id,
              totalOwed: pendingBalance,
              paidAmount: 0,
              pendingAmount: pendingBalance,
              date: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              status: "Pendiente"
            });
          }

          await this.savePersistence();
          this.syncAllModules();
          this.closeModal('edit-supplier-modal');
          this.showToast(`Proveedor "${supp.name}" actualizado exitosamente`, 'success');
        }
      });
    }

    // 4. Add Profile & Permissions Form
    const prfForm = document.getElementById('add-profile-form');
    if (prfForm) {
      prfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'profile')) {
          this.showToast('Acceso Denegado: Solo el Super Admin puede crear perfiles y roles.', 'danger');
          return;
        }
        const name = document.getElementById('prf-name-input').value.trim();
        const desc = document.getElementById('prf-desc-input').value.trim();
        const allowedModules = this.getSelectedPermissions('add-profile-perm-box', 'add-prf-perm');

        // Update assigned users
        const assignedUserCbs = document.querySelectorAll('.add-prf-user-checkbox:checked');
        const assignedUserIds = Array.from(assignedUserCbs).map(cb => cb.value);
        this.data.users.forEach(u => {
          if (assignedUserIds.includes(u.id)) {
            u.role = name;
          }
        });

        const newPrf = {
          id: `PRF-${Math.floor(10 + Math.random() * 90)}`,
          name,
          permissions: desc || `Acceso a ${allowedModules.length} módulo(s)`,
          usersCount: assignedUserIds.length,
          badgeColor: "#7C3AED",
          allowedModules: allowedModules.length > 0 ? allowedModules : ['*']
        };
        this.data.perfiles.unshift(newPrf);
        await this.savePersistence();
        this.renderPerfilesTable();
        this.renderUsersTable();
        if (this.currentUser) this.updateUIForRole();
        prfForm.reset();
        this.closeModal('profile-modal');
        this.showToast(`Perfil "${name}" creado exitosamente con sus permisos asignados`, 'success');
      });
    }

    // 4b. Edit Profile & Permissions Form
    const editPrfForm = document.getElementById('edit-profile-form');
    if (editPrfForm) {
      editPrfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'profile')) {
          this.showToast('Acceso Denegado: Solo el Super Admin puede modificar perfiles de rol.', 'danger');
          return;
        }
        const id = document.getElementById('edit-prf-id').value;
        const prf = this.data.perfiles.find(p => p.id === id);
        if (prf) {
          const oldName = prf.name;
          const newName = document.getElementById('edit-prf-name').value.trim();
          const desc = document.getElementById('edit-prf-desc').value.trim();
          const allowedModules = this.getSelectedPermissions('edit-profile-perm-box', 'edit-prf-perm');

          prf.name = newName;
          prf.permissions = desc || `Acceso a ${allowedModules.length} módulo(s)`;
          prf.allowedModules = allowedModules.length > 0 ? allowedModules : ['*'];

          // Sync users assigned to this role via checkboxes
          const assignedUserCbs = document.querySelectorAll('.edit-prf-user-checkbox');
          assignedUserCbs.forEach(cb => {
            const u = this.data.users.find(usr => usr.id === cb.value);
            if (u) {
              // Never demote or change a Super Admin account through role checkboxes
              if (u.role === 'Super Admin' || u.id === 'USR-001') {
                return;
              }
              if (cb.checked) {
                u.role = newName;
              } else if (u.role?.toLowerCase() === oldName.toLowerCase()) {
                u.role = "Cajero";
              }
            }
          });

          if (oldName !== newName) {
            this.data.users.forEach(u => {
              if (u.role === oldName && u.role !== 'Super Admin') u.role = newName;
            });
          }

          await this.savePersistence();
          this.renderPerfilesTable();
          this.renderUsersTable();
          if (this.currentUser) this.updateUIForRole();
          this.closeModal('edit-profile-modal');
          this.showToast(`Perfil y matriz de permisos de "${newName}" actualizados`, 'success');
        }
      });
    }

    // 5. Add Payment Method Form
    const pmForm = document.getElementById('add-paymethod-form');
    if (pmForm) {
      pmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'Super Admin') {
          this.showToast('Acceso Denegado: Solo el Super Admin puede configurar métodos de pago.', 'danger');
          return;
        }
        const name = document.getElementById('pm-name-input').value;
        const fee = document.getElementById('pm-fee-input').value;

        const newPm = {
          id: `PM-${Math.floor(10 + Math.random() * 90)}`,
          name,
          icon: "card",
          fee: fee.includes('%') ? fee : `${fee}%`,
          active: true
        };
        this.data.paymentMethods.unshift(newPm);
        await this.savePersistence();
        this.renderPaymentMethodsTable();
        pmForm.reset();
        this.closeModal('paymethod-modal');
        this.showToast(`Método de pago "${name}" configurado`, 'success');
      });
    }

    // 5b. Edit Payment Method Form
    const editPmForm = document.getElementById('edit-paymethod-form');
    if (editPmForm) {
      editPmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'Super Admin') {
          this.showToast('Acceso Denegado: Solo el Super Admin puede modificar métodos de pago.', 'danger');
          return;
        }
        const id = document.getElementById('edit-pm-id').value;
        const pm = this.data.paymentMethods.find(p => p.id === id);
        if (pm) {
          pm.name = document.getElementById('edit-pm-name').value;
          const feeVal = document.getElementById('edit-pm-fee').value;
          pm.fee = feeVal.includes('%') ? feeVal : `${feeVal}%`;

          await this.savePersistence();
          this.renderPaymentMethodsTable();
          this.closeModal('edit-paymethod-modal');
          this.showToast(`Forma de pago "${pm.name}" actualizada`, 'success');
        }
      });
    }

    // 6. Add Expense Form
    const expForm = document.getElementById('add-expense-form');
    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'expense')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para registrar gastos.', 'danger');
          return;
        }
        const desc = document.getElementById('exp-desc-input').value;
        const cat = document.getElementById('exp-cat-select').value;
        const amount = this.parseCleanNumber(document.getElementById('exp-amount-input')?.value);
        const method = document.getElementById('exp-method-select').value;

        const newExp = {
          id: `EXP-${Math.floor(805 + Math.random() * 900)}`,
          date: new Date().toISOString().slice(0, 10),
          description: desc,
          category: cat,
          amount,
          status: "Pagado",
          method
        };
        this.data.expenses.unshift(newExp);

        // Si el gasto se pagó en Efectivo desde la caja, descontar de caja en tiempo real
        if (method && method.toLowerCase().includes('efectivo')) {
          if (!this.data.cashShiftLog) {
            this.data.cashShiftLog = { openingCash: 500000, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 500000, status: 'Abierto' };
          }
          this.data.cashShiftLog.cashExpenses = Math.round(((Number(this.data.cashShiftLog.cashExpenses) || 0) + amount) * 100) / 100;
          this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
          if (this.data.store) {
            this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
          }
        }

        await this.savePersistence();
        this.syncAllModules();
        expForm.reset();
        this.closeModal('expense-modal');
        this.showToast(`Gasto de ${this.formatCurrency(amount)} registrado y descontado en caja`, 'success');
      });
    }

    // 6b. Edit Expense Form
    const editExpForm = document.getElementById('edit-expense-form');
    if (editExpForm) {
      editExpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'expense')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para modificar gastos.', 'danger');
          return;
        }
        const id = document.getElementById('edit-exp-id').value;
        const exp = this.data.expenses.find(x => x.id === id);
        if (exp) {
          exp.description = document.getElementById('edit-exp-desc').value;
          exp.category = document.getElementById('edit-exp-cat').value;
          exp.amount = this.parseCleanNumber(document.getElementById('edit-exp-amount')?.value);
          exp.method = document.getElementById('edit-exp-method').value;

          await this.savePersistence();
          this.syncAllModules();
          this.closeModal('edit-expense-modal');
          this.showToast(`Gasto "${exp.description}" actualizado`, 'success');
        }
      });
    }

    // 7. Add Service Form
    const srvForm = document.getElementById('add-service-form');
    if (srvForm) {
      srvForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'service')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para crear servicios.', 'danger');
          return;
        }
        const name = document.getElementById('srv-name-input').value;
        const cat = document.getElementById('srv-cat-input').value;
        const price = this.parseCleanNumber(document.getElementById('srv-price-input')?.value);
        const dur = document.getElementById('srv-dur-input').value;

        const newSrv = {
          id: `SRV-${Math.floor(10 + Math.random() * 90)}`,
          name, category: cat, price, duration: dur, status: "Active"
        };
        this.data.services.unshift(newSrv);
        await this.savePersistence();
        this.renderInvServiciosTable();
        srvForm.reset();
        this.closeModal('service-modal');
        this.showToast(`Servicio "${name}" guardado`, 'success');
      });
    }

    // 7b. Edit Service Form
    const editSrvForm = document.getElementById('edit-service-form');
    if (editSrvForm) {
      editSrvForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'service')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para modificar servicios.', 'danger');
          return;
        }
        const id = document.getElementById('edit-srv-id').value;
        const srv = this.data.services.find(s => s.id === id);
        if (srv) {
          srv.name = document.getElementById('edit-srv-name').value;
          srv.category = document.getElementById('edit-srv-cat').value;
          srv.price = this.parseCleanNumber(document.getElementById('edit-srv-price')?.value);
          srv.duration = document.getElementById('edit-srv-dur').value;

          await this.savePersistence();
          this.renderInvServiciosTable();
          this.closeModal('edit-service-modal');
          this.showToast(`Servicio "${srv.name}" actualizado`, 'success');
        }
      });
    }

    // 8. Add Category Form
    const catForm = document.getElementById('add-category-form');
    if (catForm) {
      catForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'category')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para crear categorías.', 'danger');
          return;
        }
        const catType = document.getElementById('cat-type-select')?.value || 'general';
        const isExtras = catType === 'extras';
        const name = document.getElementById('cat-name-input').value.trim();
        const color = document.getElementById('cat-color-input').value;
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') || `cat_${Date.now()}`;

        let newCat;
        if (isExtras) {
          const unitsInput = document.getElementById('cat-units-input');
          const availableUnits = this.parseCleanNumber(unitsInput?.value) || 0;
          const unitCostInput = document.getElementById('cat-unit-cost-input');
          const unitCost = this.parseCleanNumber(unitCostInput?.value) || 0;

          newCat = { 
            id, 
            name, 
            type: 'extras',
            isExtra: true,
            measureType: 'Unidades',
            itemsCount: 0, 
            color, 
            availableUnits: Math.max(0, Math.round(availableUnits * 100) / 100),
            availableGrams: 0, // CRITICAL: zero grams for extras/manillas
            cost: Math.max(0, Math.round(unitCost * 100) / 100),
            totalValuation: Math.max(0, Math.round(availableUnits * unitCost * 100) / 100)
          };
        } else {
          const gramsInput = document.getElementById('cat-grams-input');
          const availableGrams = this.parseCleanNumber(gramsInput?.value);
          const costInput = document.getElementById('cat-cost-input');
          const cost = this.parseCleanNumber(costInput?.value);

          newCat = { 
            id, 
            name, 
            type: 'general',
            itemsCount: 0, 
            color, 
            availableGrams: Math.max(0, Math.round(availableGrams * 100) / 100),
            cost: Math.max(0, Math.round(cost * 100) / 100)
          };
        }

        this.data.categories.unshift(newCat);
        await this.savePersistence();
        this.syncAllModules();
        catForm.reset();
        this.closeModal('category-modal');
        if (isExtras) {
          this.showToast(`Categoría de Manillas "${name}" creada con ${newCat.availableUnits} u. y costo base ${this.formatCurrency(newCat.cost)} (Sin afectación de gramaje)`, 'success');
        } else {
          this.showToast(`Categoría "${name}" creada con ${newCat.availableGrams} g y costo base ${this.formatCurrency(newCat.cost)}`, 'success');
        }
      });
    }

    // 8b. Edit Category Form
    const editCatForm = document.getElementById('edit-category-form');
    if (editCatForm) {
      editCatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'category')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para editar categorías.', 'danger');
          return;
        }
        const id = document.getElementById('edit-cat-id').value;
        const newName = document.getElementById('edit-cat-name-input').value.trim();
        const newColor = document.getElementById('edit-cat-color-input').value;

        const cat = (this.data.categories || []).find(c => c.id === id);
        if (cat) {
          const oldName = cat.name;
          const isExtras = cat.type === 'extras' || cat.isExtra;
          cat.name = newName;
          cat.color = newColor;

          if (isExtras) {
            const unitsInput = document.getElementById('edit-cat-units-input');
            const newUnits = this.parseCleanNumber(unitsInput?.value) || 0;
            const unitCostInput = document.getElementById('edit-cat-unit-cost-input');
            const newUnitCost = this.parseCleanNumber(unitCostInput?.value) || 0;

            cat.availableUnits = Math.max(0, Math.round(newUnits * 100) / 100);
            cat.availableGrams = 0; // CRITICAL: 0 grams for extras
            cat.cost = Math.max(0, Math.round(newUnitCost * 100) / 100);
            cat.totalValuation = Math.max(0, Math.round(cat.availableUnits * cat.cost * 100) / 100);
          } else {
            const gramsInput = document.getElementById('edit-cat-grams-input');
            const newGrams = this.parseCleanNumber(gramsInput?.value);
            const costInput = document.getElementById('edit-cat-cost-input');
            const newCost = this.parseCleanNumber(costInput?.value);

            cat.availableGrams = Math.max(0, Math.round(newGrams * 100) / 100);
            cat.cost = Math.max(0, Math.round(newCost * 100) / 100);
          }

          // Cascade name update to all products in inventory
          (this.data.products || []).forEach(p => {
            if (p.category === cat.id || p.categoryName === oldName) {
              p.category = cat.id;
              p.categoryName = newName;
            }
          });

          await this.savePersistence();
          this.syncAllModules();
          this.closeModal('edit-category-modal');
          if (isExtras) {
            this.showToast(`Categoría "${newName}" actualizada (${cat.availableUnits} u., ${this.formatCurrency(cat.cost)}/u.)`, 'success');
          } else {
            this.showToast(`Categoría "${newName}" actualizada (${cat.availableGrams} g, ${this.formatCurrency(cat.cost)}) y sincronizada en toda la aplicación`, 'success');
          }
        }
      });
    }

    // 9. Add Asset Form
    const astForm = document.getElementById('add-asset-form');
    if (astForm) {
      astForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'asset')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para registrar activos.', 'danger');
          return;
        }
        const name = document.getElementById('ast-name-input').value;
        const cat = document.getElementById('ast-cat-input').value;
        const cost = this.parseCleanNumber(document.getElementById('ast-cost-input')?.value);

        const newAst = {
          id: `ACT-${Math.floor(10 + Math.random() * 90)}`,
          name, category: cat,
          purchaseDate: new Date().toISOString().slice(0, 10),
          costValue: cost, currentVal: cost, status: "Excelente"
        };
        this.data.assets.unshift(newAst);
        await this.savePersistence();
        this.syncAllModules();
        astForm.reset();
        this.closeModal('asset-modal');
        this.showToast(`Activo "${name}" registrado`, 'success');
      });
    }

    // 9b. Edit Asset Form
    const editAstForm = document.getElementById('edit-asset-form');
    if (editAstForm) {
      editAstForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'asset')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para modificar activos.', 'danger');
          return;
        }
        const id = document.getElementById('edit-ast-id').value;
        const ast = this.data.assets.find(a => a.id === id);
        if (ast) {
          ast.name = document.getElementById('edit-ast-name').value;
          ast.category = document.getElementById('edit-ast-cat').value;
          ast.currentVal = this.parseCleanNumber(document.getElementById('edit-ast-val')?.value);

          await this.savePersistence();
          this.syncAllModules();
          this.closeModal('edit-asset-modal');
          this.showToast(`Activo "${ast.name}" actualizado`, 'success');
        }
      });
    }

    // 10. Add Purchase Order Form (With Global Stock, Weight, Cost & Category Sync)
    const poForm = document.getElementById('add-purchase-form');
    if (poForm) {
      poForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          if (!this.canPerformAction('create', 'purchase')) {
            this.showToast('Acceso Denegado: Tu rol no tiene permisos para crear órdenes de compra.', 'danger');
            return;
          }
          const prodName = (document.getElementById('po-product-name')?.value || '').trim();
          const prodSku = (document.getElementById('po-product-sku')?.value || '').trim();
          const prodId = (document.getElementById('po-product-id')?.value || '').trim();
          const selectedCatId = (document.getElementById('po-category-select')?.value || 'oro18k').trim();
          const measureType = document.getElementById('po-measure-type')?.value || 'Pesaje';
          const isPesaje = measureType === 'Pesaje';
          const isUnidades = !isPesaje;

          const quantity = this.parseCleanNumber(document.getElementById('po-quantity')?.value) || 0;
          const unitCost = this.parseCleanNumber(document.getElementById('po-unit-cost')?.value) || 0;
          const productGrams = isUnidades ? (this.parseCleanNumber(document.getElementById('po-product-grams')?.value) || 0) : 0;
          const rawSupp = document.getElementById('po-supp-select')?.value?.trim();
          const supp = rawSupp ? rawSupp : 'Proveedor General';

          if (!prodName) {
            this.showToast('Por favor escribe el nombre del producto.', 'warning');
            return;
          }

          if (quantity <= 0) {
            this.showToast('La cantidad debe ser mayor a 0.', 'warning');
            return;
          }

          const catObj = (this.data.categories || []).find(c => c.id === selectedCatId) || 
            (this.data.categories || []).find(c => c.id === 'oro18k') || 
            { id: 'oro18k', name: 'Oro 18K Italiano & Ley' };
          const isExtras = catObj.type === 'extras' || catObj.isExtra;

          let targetProd = null;
          if (prodId) {
            targetProd = (this.data.products || []).find(p => p.id === prodId);
          }
          if (!targetProd && prodSku) {
            targetProd = (this.data.products || []).find(p => p.sku && p.sku.toLowerCase().trim() === prodSku.toLowerCase().trim());
          }
          if (!targetProd && prodName) {
            targetProd = (this.data.products || []).find(p => p.name && p.name.toLowerCase().trim() === prodName.toLowerCase().trim());
          }

          if (!targetProd) {
            const newProdId = `PRD-${Date.now().toString().slice(-4)}`;
            const newSku = prodSku || `SKU-${Date.now().toString().slice(-4)}`;
            targetProd = {
              id: newProdId,
              sku: newSku,
              name: prodName,
              measureType: measureType,
              weightUnit: isPesaje ? 'g' : 'u.',
              unit: isPesaje ? 'g' : 'u.',
              category: catObj.id,
              categoryName: catObj.name,
              isExtra: isExtras,
              supplier: supp,
              cost: unitCost,
              price: 0,
              stock: 0,
              pieceWeight: productGrams || 0,
              weight: productGrams || 0,
              minStock: isUnidades ? 2 : 0.5,
              status: 'active'
            };
            this.data.products.push(targetProd);
          } else {
            targetProd.measureType = measureType;
            targetProd.category = catObj.id;
            targetProd.categoryName = catObj.name;
            if (isExtras) targetProd.isExtra = true;
            if (supp && supp !== 'Proveedor General') {
              targetProd.supplier = supp;
            } else if (!targetProd.supplier) {
              targetProd.supplier = 'Proveedor General';
            }
          }

          // Si la categoría es de extras/manillas, no suma gramos de metal a la categoría ni a inventario
          const totalGramsAdded = isExtras 
            ? 0 
            : (isPesaje ? quantity : (productGrams > 0 ? Math.round(quantity * productGrams * 100) / 100 : 0));
          // En joyería fina, si el lote tiene gramaje, el costo unitario ingresado corresponde al gramo ($/g)
          const totalCost = totalGramsAdded > 0 ? Math.round(totalGramsAdded * unitCost) : Math.round(quantity * unitCost);

          // 1. Actualizar producto en inventario numéricamente seguro
          const currentStock = this.parseCleanNumber(targetProd.stock) || 0;
          targetProd.stock = Math.round((currentStock + quantity) * 100) / 100;
          if (unitCost > 0) {
            targetProd.cost = unitCost;
          }
          if (prodSku) {
            targetProd.sku = prodSku;
          }
          if (isUnidades && productGrams > 0) {
            targetProd.pieceWeight = productGrams;
            targetProd.weight = productGrams;
          }

          const minStock = targetProd.minStock !== undefined ? targetProd.minStock : (isUnidades ? 2 : 0.5);
          targetProd.status = targetProd.stock > minStock ? 'active' : (targetProd.stock > 0 ? 'low_stock' : 'out_of_stock');

          // 2. Sincronizar disponibilidad de gramos y valuación de categorías & KPIs
          if (!this.data.kpis) this.data.kpis = {};
          this.data.kpis.inventoryValue = Math.round(this.data.products.reduce((acc, p) => acc + (this.getProductTotalCost(p) || 0), 0) * 100) / 100;
          if (totalGramsAdded > 0 && !isExtras) {
            const currentGrams = this.data.kpis.avgCostGrams || 540;
            const currentAvgCost = this.data.kpis.avgCostPerGram || 339352;
            const newTotalCost = (currentGrams * currentAvgCost) + totalCost;
            const newTotalGrams = currentGrams + totalGramsAdded;
            this.data.kpis.avgCostGrams = Math.round(newTotalGrams * 100) / 100;
            this.data.kpis.avgCostPerGram = newTotalGrams > 0 ? Math.round(newTotalCost / newTotalGrams) : currentAvgCost;
          }
          this.syncAllCategoryGrams();

          // 3. Registrar Orden de Compra completa
          const paymentStatus = document.getElementById('po-payment-status')?.value || 'Pagado Total';
          const isPaid = paymentStatus === 'Pagado Total';
          const paymentMethod = isPaid 
            ? (document.getElementById('po-payment-method')?.value || 'Efectivo')
            : 'Crédito Proveedor';

          const now = new Date();
          const newPO = {
            id: `OC-${Date.now().toString().slice(-6)}`,
            supplier: supp,
            productId: targetProd.id,
            productName: targetProd.name,
            productSku: targetProd.sku || prodSku,
            category: catObj.id,
            categoryName: catObj.name,
            measureType: measureType,
            quantity: quantity,
            itemsCount: isUnidades ? quantity : 1,
            unitCost: unitCost,
            productGrams: productGrams,
            totalGrams: totalGramsAdded,
            total: totalCost,
            date: now.toISOString().slice(0, 10),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "Recibido",
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            paidAmount: isPaid ? totalCost : 0
          };
          if (!this.data.purchases || !Array.isArray(this.data.purchases)) {
            this.data.purchases = [];
          }
          this.data.purchases.unshift(newPO);

          // Si fue a crédito (Pendiente), registrar deuda en cuentas por pagar de supplierCredits
          if (!isPaid) {
            if (!Array.isArray(this.data.supplierCredits)) this.data.supplierCredits = [];
            this.data.supplierCredits.unshift({
              id: newPO.id,
              supplier: supp,
              totalOwed: totalCost,
              pendingAmount: totalCost,
              date: now.toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              status: "Pendiente"
            });
            const suppObj = (this.data.suppliers || []).find(s => s.name?.toLowerCase().trim() === supp?.toLowerCase().trim());
            if (suppObj) {
              suppObj.creditBalance = Math.round(((Number(suppObj.creditBalance) || 0) + totalCost) * 100) / 100;
            }
          } else if (paymentMethod && paymentMethod.toLowerCase().includes('efectivo')) {
            // Descontar de gaveta de caja solo si el monto es viable frente al efectivo disponible
            const currentDrawerCash = Number(this.data.cashShiftLog?.expectedCashInDrawer) || 0;
            if (totalCost <= currentDrawerCash && currentDrawerCash > 0) {
              if (!this.data.cashShiftLog) {
                this.data.cashShiftLog = { openingCash: 500000, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 500000, status: 'Abierto' };
              }
              this.data.cashShiftLog.cashExpenses = Math.round(((Number(this.data.cashShiftLog.cashExpenses) || 0) + totalCost) * 100) / 100;
              this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
              if (this.data.store) {
                this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
              }
            }
          }

          // 4. Guardar persistencia en MongoDB y db.json
          await this.savePersistence();

          // 5. Sincronizar vistas y tablas en toda la aplicación
          this.syncAllModules();
          this.renderFinComprasTable();
          this.renderRepCompras();
          this.renderInventoryTable();
          this.renderInvCategoriasTable();
          this.renderCategoryPills();
          this.renderDashboardMetrics();
          this.renderPOSProducts();

          poForm.reset();
          this.closeModal('purchase-modal');

          const unitLabel = isUnidades ? 'u.' : (targetProd.weightUnit || 'g');
          const gramsMsg = totalGramsAdded > 0 ? `, +${totalGramsAdded}g` : '';
          this.showToast(`Orden #${newPO.id} creada e inventario actualizado (+${quantity} ${unitLabel}${gramsMsg} en ${catObj.name})`, 'success');

          // 6. Emitir recibo térmico de la orden de compra automáticamente
          try {
            this.showPurchaseReceiptModal(newPO.id);
          } catch(receiptErr) {
            console.warn('[NexusApp] Error emitiendo recibo:', receiptErr);
          }
        } catch(err) {
          console.error('[NexusApp] Error creando orden de compra:', err);
          this.showToast(`Error al procesar orden de compra: ${err.message}`, 'danger');
        }
      });
    }

    // 11. Add Product Form
    const addProdForm = document.getElementById('add-product-form');
    if (addProdForm) {
      addProdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('create', 'product')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para crear productos en el catálogo.', 'danger');
          return;
        }
        const sku = document.getElementById('new-prod-sku').value.trim();
        const name = document.getElementById('new-prod-name').value.trim();
        const measureType = document.getElementById('new-prod-measure-type').value;
        const weightUnit = measureType === 'Pesaje' ? (document.getElementById('new-prod-weight-unit')?.value || 'g') : 'u.';
        const pieceWeight = measureType === 'Unidades'
          ? this.parseCleanNumber(document.getElementById('new-prod-piece-weight')?.value)
          : 0;

        const catId = document.getElementById('new-prod-cat').value;
        const catObj = (this.data.categories || []).find(c => c.id === catId || c.name === catId);
        const isExtraCat = catObj && (catObj.type === 'extras' || catObj.isExtra);

        if (measureType === 'Unidades' && !isExtraCat && pieceWeight <= 0) {
          this.showToast('Por favor ingresa el peso del producto (g) para calcular el gramaje del lote y sincronizar la categoría.', 'warning');
          document.getElementById('new-prod-piece-weight')?.focus();
          return;
        }

        const supplier = document.getElementById('new-prod-supplier').value;
        const cost = this.parseCleanNumber(document.getElementById('new-prod-cost')?.value);
        const price = 0; // El precio de venta se fija libremente en el POS
        const stock = this.parseCleanNumber(document.getElementById('new-prod-stock')?.value);
        const active = document.getElementById('new-prod-active')?.checked !== false;

        const categoryName = catObj ? catObj.name : 'General';

        const newP = {
          id: `PRD-${Math.floor(106 + Math.random() * 900)}`,
          sku: sku || '001',
          name,
          measureType: isExtraCat ? 'Unidades' : measureType,
          weightUnit: isExtraCat ? 'u.' : weightUnit,
          unit: isExtraCat ? 'u.' : weightUnit,
          pieceWeight: isExtraCat ? 0 : pieceWeight,
          weight: isExtraCat ? 0 : pieceWeight,
          category: catId,
          categoryName,
          supplier,
          cost,
          price,
          stock,
          isExtra: isExtraCat ? true : false,
          minStock: measureType === 'Pesaje' ? (weightUnit === 'kg' ? 0.001 : (weightUnit === 'mg' ? 500 : 0.5)) : 2,
          status: !active ? 'inactive' : (stock > 0 ? 'active' : 'out_of_stock')
        };

        this.data.products.unshift(newP);
        const addedCost = this.getProductTotalCost(newP);
        const addedGrams = this.getGramsFromProduct(newP);
        if (!this.data.kpis) this.data.kpis = {};
        if (addedCost > 0) {
          this.data.kpis.inventoryValue = Math.round(((this.data.kpis.inventoryValue || 183250000) + addedCost) * 100) / 100;
        }
        if (addedGrams > 0) {
          const currentGrams = this.data.kpis.avgCostGrams || 540;
          const currentAvgCost = this.data.kpis.avgCostPerGram || 339352;
          const newTotalCost = (currentGrams * currentAvgCost) + addedCost;
          const newTotalGrams = currentGrams + addedGrams;
          this.data.kpis.avgCostGrams = Math.round(newTotalGrams * 100) / 100;
          this.data.kpis.avgCostPerGram = newTotalGrams > 0 ? Math.round(newTotalCost / newTotalGrams) : currentAvgCost;
        }
        this.syncAllCategoryGrams();
        await this.savePersistence();
        this.syncAllModules();
        addProdForm.reset();
        this.closeModal('product-modal');
        const unitLabel = isExtraCat ? 'u.' : (measureType === 'Pesaje' ? weightUnit : 'u.');
        this.showToast(`Producto "${name}" (${stock} ${unitLabel}) registrado en ${categoryName}`, 'success');
      });
    }

    // 11b. Edit Product Form
    const editProdForm = document.getElementById('edit-product-form');
    if (editProdForm) {
      editProdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.canPerformAction('edit', 'product')) {
          this.showToast('Acceso Denegado: Tu rol no tiene permisos para modificar productos del catálogo.', 'danger');
          return;
        }
        const id = document.getElementById('edit-prod-id').value;
        const p = this.data.products.find(prod => String(prod.id) === String(id));
        if (p) {
          const oldProdCost = this.getProductTotalCost(p);
          const oldProdGrams = this.getGramsFromProduct(p);
          const oldGrams = oldProdGrams;
          const oldCatId = p.category;
          const oldCatName = p.categoryName;

          p.sku = document.getElementById('edit-prod-sku').value.trim();
          p.name = document.getElementById('edit-prod-name').value.trim();
          p.measureType = document.getElementById('edit-prod-measure-type').value;
          p.weightUnit = p.measureType === 'Pesaje' ? (document.getElementById('edit-prod-weight-unit')?.value || 'g') : 'u.';
          p.unit = p.weightUnit;
          const pieceWeight = p.measureType === 'Unidades'
            ? this.parseCleanNumber(document.getElementById('edit-prod-piece-weight')?.value)
            : 0;

          const editCatId = document.getElementById('edit-prod-cat').value;
          const catObj = (this.data.categories || []).find(c => c.id === editCatId || c.name === editCatId);
          const isExtraCat = catObj && (catObj.type === 'extras' || catObj.isExtra);

          if (p.measureType === 'Unidades' && !isExtraCat && pieceWeight <= 0) {
            this.showToast('Por favor ingresa el peso del producto (g) para calcular el gramaje del lote y sincronizar la categoría.', 'warning');
            document.getElementById('edit-prod-piece-weight')?.focus();
            return;
          }

          p.pieceWeight = isExtraCat ? 0 : pieceWeight;
          p.weight = isExtraCat ? 0 : pieceWeight;
          p.isExtra = isExtraCat ? true : false;
          p.category = editCatId;
          p.categoryName = catObj ? catObj.name : 'General';
          if (isExtraCat) {
            p.measureType = 'Unidades';
            p.weightUnit = 'u.';
            p.unit = 'u.';
          }
          p.supplier = document.getElementById('edit-prod-supplier').value;
          p.cost = this.parseCleanNumber(document.getElementById('edit-prod-cost')?.value);
          p.price = Number(p.price || 0); // Preserva precio previo si existía, o 0 para fijar en POS

          // GRAMAJE / CANTIDAD TOTAL DEL ARTÍCULO
          let rawStock = document.getElementById('edit-prod-stock')?.value;
          let newStock = this.parseCleanNumber(rawStock);
          p.stock = isNaN(newStock) || newStock < 0 ? 0 : Math.round(newStock * 100) / 100;

          const active = document.getElementById('edit-prod-active')?.checked !== false;
          if (!active) {
            p.status = 'inactive';
          } else if (p.stock <= 0) {
            p.status = 'out_of_stock';
          } else if (p.stock <= (p.measureType === 'Pesaje' ? (p.weightUnit === 'kg' ? 0.001 : 0.5) : 2)) {
            p.status = 'low_stock';
          } else {
            p.status = 'active';
          }

          // Sincronizar KPIs de costo general y adquisición si cambió stock o costo manual
          const newProdCost = this.getProductTotalCost(p);
          const newProdGrams = this.getGramsFromProduct(p);
          const diffCost = newProdCost - oldProdCost;
          const diffGrams = newProdGrams - oldProdGrams;
          if (!this.data.kpis) this.data.kpis = {};
          if (diffCost !== 0) {
            this.data.kpis.inventoryValue = Math.max(0, Math.round(((this.data.kpis.inventoryValue || 183250000) + diffCost) * 100) / 100);
          }
          if (diffGrams !== 0) {
            const currentGrams = this.data.kpis.avgCostGrams || 540;
            const currentAvgCost = this.data.kpis.avgCostPerGram || 339352;
            const newTotalCost = Math.max(0, (currentGrams * currentAvgCost) + diffCost);
            const newTotalGrams = Math.max(1, currentGrams + diffGrams);
            this.data.kpis.avgCostGrams = Math.round(newTotalGrams * 100) / 100;
            this.data.kpis.avgCostPerGram = Math.round(newTotalCost / newTotalGrams);
          }

          // Sincronizar automáticamente disponibilidad de gramos en todas las categorías
          this.syncAllCategoryGrams();

          // SYNCHRONIZATION WITH BACKEND (MongoDB & LocalStorage & db.json)
          await this.savePersistence();

          // INSTANT MULTI-MODULE RE-RENDERING (Tablas, Métricas, Informes y Gráficas)
          this.syncAllModules();

          // Cart synchronization: if product is in cart and stock is 0, update cart
          const cartItem = this.cart.find(c => String(c.product?.id) === String(p.id));
          if (cartItem) {
            if (p.stock <= 0) {
              this.cart = this.cart.filter(c => String(c.product?.id) !== String(p.id));
              this.renderCart();
              this.showToast(`"${p.name}" se retiró del carrito porque se marcó como agotado`, 'warning');
            } else if (cartItem.qty > p.stock) {
              cartItem.qty = p.stock;
              this.renderCart();
              this.showToast(`Cantidad de "${p.name}" en carrito ajustada al stock actual (${p.stock})`, 'warning');
            }
          }

          this.closeModal('edit-product-modal');

          const unitLabel = p.measureType === 'Pesaje' ? (p.weightUnit || 'g') : 'u.';
          const statusText = p.status === 'out_of_stock' ? 'Agotado (Sin Stock)' : (p.status === 'low_stock' ? 'Stock Bajo' : (p.status === 'inactive' ? 'Inactivo' : 'En Stock'));
          this.showToast(`Stock de "${p.name}" sincronizado: ${p.stock} ${unitLabel} (${statusText})`, 'success');
        }
      });
    }
  }

  openPurchaseModal() {
    this.populatePurchaseProductSelect();
    this.openModal('purchase-modal');
  }

  populatePurchaseProductSelect() {
    const dl = document.getElementById('po-products-datalist');
    const suppSelect = document.getElementById('po-supp-select');
    const catSelect = document.getElementById('po-category-select');

    if (catSelect && this.data.categories) {
      catSelect.innerHTML = this.data.categories.map(c => 
        `<option value="${this.escapeHtml(c.id)}">${this.escapeHtml(c.name)}</option>`
      ).join('');
      if (!catSelect.value) catSelect.value = 'oro18k';
    }

    if (suppSelect) {
      const suppliers = (this.data.suppliers || []).filter(s => s.name && s.name.toLowerCase() !== 'proveedor general');
      suppSelect.innerHTML = `
        <option value="" selected>Proveedor General</option>
        ${suppliers.map(s => `<option value="${this.escapeHtml(s.name)}">${this.escapeHtml(s.name)}</option>`).join('')}
      `;
      suppSelect.value = '';
    }

    if (dl && this.data.products) {
      dl.innerHTML = this.data.products.map(p => {
        const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
        const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
        const weightInfo = !isPesaje && (p.pieceWeight || p.weight) ? ` · ${p.pieceWeight || p.weight}g` : '';
        return `<option value="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)} (Código: ${this.escapeHtml(p.sku || p.id)} · Stock: ${p.stock} ${unit}${weightInfo})</option>`;
      }).join('');
    }

    const quantityInput = document.getElementById('po-quantity');
    if (quantityInput && (!quantityInput.value || Number(quantityInput.value) <= 0)) {
      quantityInput.value = '1';
    }

    const measureSelect = document.getElementById('po-measure-type');
    if (measureSelect && !measureSelect.value) {
      measureSelect.value = 'Pesaje';
    }

    this.onPurchaseMeasureTypeChange();

    const statusSelect = document.getElementById('po-payment-status');
    if (statusSelect) statusSelect.value = 'Pagado Total';
    this.onPurchasePaymentStatusChange();

    const nameInput = document.getElementById('po-product-name');
    if (nameInput && nameInput.value) {
      this.onPurchaseProductNameInput();
    } else {
      this.updatePurchaseCalculations();
    }
  }

  onPurchaseCategoryChange() {
    const catSelect = document.getElementById('po-category-select');
    if (!catSelect) return;
    const catId = catSelect.value;
    const catObj = (this.data.categories || []).find(c => c.id === catId);
    if (catObj && (catObj.type === 'extras' || catObj.isExtra || catObj.measureType === 'Unidades' || catId === 'relojes' || catId === 'accesorios')) {
      const measureSelect = document.getElementById('po-measure-type');
      if (measureSelect) {
        measureSelect.value = 'Unidades';
        this.onPurchaseMeasureTypeChange();
      }
    }
    const catInfo = document.getElementById('po-preview-cat-info');
    if (catInfo && catObj) {
      catInfo.textContent = `Categoría: ${catObj.name}`;
    }
    this.updatePurchaseCalculations();
  }

  onPurchasePaymentStatusChange() {
    const statusSelect = document.getElementById('po-payment-status');
    const methodGroup = document.getElementById('po-payment-method-group');
    if (!statusSelect || !methodGroup) return;

    if (statusSelect.value === 'Pagado Total') {
      methodGroup.style.display = 'block';
    } else {
      methodGroup.style.display = 'none';
    }
  }

  onPurchaseMeasureTypeChange() {
    const measureSelect = document.getElementById('po-measure-type');
    const isPesaje = (measureSelect?.value || 'Pesaje') === 'Pesaje';

    const qtyLabel = document.getElementById('po-quantity-label');
    const qtyUnit = document.getElementById('po-quantity-unit');
    const costLabel = document.getElementById('po-unit-cost-label');
    const gramsGroup = document.getElementById('po-grams-group');
    const gramsInput = document.getElementById('po-product-grams');

    if (isPesaje) {
      if (qtyLabel) qtyLabel.textContent = 'Cantidad en gramos *';
      if (qtyUnit) {
        qtyUnit.textContent = 'g';
        qtyUnit.style.color = '#D97706';
      }
      if (costLabel) costLabel.textContent = 'Costo por gramo ($) *';
      if (gramsGroup) gramsGroup.style.display = 'none';
      if (gramsInput) {
        gramsInput.required = false;
        gramsInput.value = '';
      }
    } else {
      if (qtyLabel) qtyLabel.textContent = 'Cantidad (Unidades) *';
      if (qtyUnit) {
        qtyUnit.textContent = 'u.';
        qtyUnit.style.color = '#4F46E5';
      }
      if (costLabel) costLabel.textContent = 'Costo unitario ($) *';
      if (gramsGroup) gramsGroup.style.display = 'block';
      if (gramsInput) gramsInput.required = false;
    }

    this.updatePurchaseCalculations();
  }

  onPurchaseProductNameInput() {
    const nameInput = document.getElementById('po-product-name');
    if (!nameInput) return;
    const rawVal = nameInput.value.trim();
    if (!rawVal) {
      const hiddenId = document.getElementById('po-product-id');
      if (hiddenId) hiddenId.value = '';
      this.updatePurchaseCalculations();
      return;
    }

    const valLower = rawVal.toLowerCase();

    // Coincidencia exacta por nombre, SKU o ID
    let targetProd = (this.data.products || []).find(p => 
      p.name.toLowerCase().trim() === valLower ||
      (p.sku && p.sku.toLowerCase().trim() === valLower) ||
      p.id.toLowerCase().trim() === valLower
    );

    const hiddenId = document.getElementById('po-product-id');
    const skuInput = document.getElementById('po-product-sku');
    const unitCostInput = document.getElementById('po-unit-cost');
    const gramsInput = document.getElementById('po-product-grams');
    const measureSelect = document.getElementById('po-measure-type');
    const catSelect = document.getElementById('po-category-select');
    const catInfo = document.getElementById('po-preview-cat-info');

    if (targetProd) {
      if (hiddenId) hiddenId.value = targetProd.id;
      if (skuInput) skuInput.value = targetProd.sku || targetProd.id;
      if (unitCostInput) unitCostInput.value = this.formatNumberWithCommas(targetProd.cost || 0);

      if (catSelect && targetProd.category) {
        catSelect.value = targetProd.category;
      }

      const isUnidades = (targetProd.measureType || 'Pesaje') === 'Unidades';
      if (measureSelect) {
        measureSelect.value = isUnidades ? 'Unidades' : 'Pesaje';
      }

      if (gramsInput) {
        if (isUnidades) {
          const val = targetProd.pieceWeight !== undefined && targetProd.pieceWeight !== null ? targetProd.pieceWeight : (targetProd.weight || 0);
          gramsInput.value = val > 0 ? this.formatNumberWithCommas(val, true) : '';
        } else {
          gramsInput.value = '';
        }
      }

      if (catInfo) {
        catInfo.textContent = `Categoría: ${targetProd.categoryName || targetProd.category || 'General'}`;
      }
    } else {
      if (hiddenId) hiddenId.value = '';
      if (catInfo) {
        const catObj = catSelect ? (this.data.categories || []).find(c => c.id === catSelect.value) : null;
        catInfo.textContent = `Nuevo Producto ${catObj ? `(${catObj.name})` : ''}`;
      }
    }

    this.onPurchaseMeasureTypeChange();
  }

  updatePurchaseCalculations() {
    const measureSelect = document.getElementById('po-measure-type');
    const isPesaje = (measureSelect?.value || 'Pesaje') === 'Pesaje';

    const quantity = this.parseCleanNumber(document.getElementById('po-quantity')?.value);
    const unitCost = this.parseCleanNumber(document.getElementById('po-unit-cost')?.value);
    const pieceGrams = this.parseCleanNumber(document.getElementById('po-product-grams')?.value);

    let totalGrams = 0;
    if (isPesaje) {
      totalGrams = quantity;
    } else {
      totalGrams = pieceGrams > 0 ? Math.round(quantity * pieceGrams * 100) / 100 : 0;
    }

    const totalCost = totalGrams > 0 ? Math.round(totalGrams * unitCost) : Math.round(quantity * unitCost);

    const totalPreview = document.getElementById('po-preview-total');
    const gramsPreview = document.getElementById('po-preview-grams');

    if (totalPreview) {
      totalPreview.textContent = this.formatCurrency(totalCost);
    }
    if (gramsPreview) {
      if (isPesaje) {
        gramsPreview.textContent = `${this.formatNumberWithCommas(totalGrams, true)} g`;
      } else {
        gramsPreview.textContent = pieceGrams > 0 
          ? `${this.formatNumberWithCommas(totalGrams, true)} g (${this.formatNumberWithCommas(quantity)} u.)`
          : `${this.formatNumberWithCommas(quantity)} u.`;
      }
    }
  }


  setupConfigForm() {
    const configForm = document.getElementById('config-store-form');
    if (configForm) {
      if (document.getElementById('config-name-input')) document.getElementById('config-name-input').value = this.data.store.name || '';
      if (document.getElementById('config-slogan-input')) document.getElementById('config-slogan-input').value = this.data.store.slogan || 'Oro 18k';
      if (document.getElementById('config-legal-input')) document.getElementById('config-legal-input').value = this.data.store.legalName || this.data.store.name || '';
      if (document.getElementById('config-nif-input')) document.getElementById('config-nif-input').value = this.data.store.taxId || '';
      if (document.getElementById('config-tax-input')) document.getElementById('config-tax-input').value = this.data.store.taxRate !== undefined ? this.data.store.taxRate : 0;
      if (document.getElementById('config-currency-input')) document.getElementById('config-currency-input').value = this.data.store.currency || '$';
      if (document.getElementById('config-phone-input')) document.getElementById('config-phone-input').value = this.data.store.phone || '';
      if (document.getElementById('config-address-input')) document.getElementById('config-address-input').value = this.data.store.address || '';
      if (document.getElementById('config-addrextra-input')) document.getElementById('config-addrextra-input').value = this.data.store.addressExtra || '';

      configForm.onsubmit = async (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'Super Admin' && !this.hasPermission('config', null)) {
          this.showToast('Acceso Denegado: No tienes permisos para modificar la configuración de la empresa.', 'danger');
          return;
        }
        this.data.store.name = document.getElementById('config-name-input')?.value.trim() || this.data.store.name;
        this.data.store.slogan = document.getElementById('config-slogan-input')?.value.trim() || 'Oro 18k';
        this.data.store.legalName = document.getElementById('config-legal-input')?.value.trim() || this.data.store.name;
        this.data.store.taxId = document.getElementById('config-nif-input')?.value.trim() || this.data.store.taxId;
        this.data.store.taxRate = parseFloat(document.getElementById('config-tax-input')?.value || 0);
        this.data.store.currency = document.getElementById('config-currency-input')?.value.trim() || '$';
        this.data.store.phone = document.getElementById('config-phone-input')?.value.trim() || this.data.store.phone;
        this.data.store.address = document.getElementById('config-address-input')?.value.trim() || this.data.store.address;
        this.data.store.addressExtra = document.getElementById('config-addrextra-input')?.value.trim() || '';

        await this.savePersistence();
        this.updateAppLogos(this.data.store.branding);
        this.showToast('Configuración del comercio actualizada con éxito', 'success');
      };
    }

    this.setupBrandingForm();
  }

  /* --------------------------------------------------------------------------
     MOTOR DE BRANDING & TEMA PERSONALIZADO
     -------------------------------------------------------------------------- */
  switchConfigTab(tabName) {
    const storePane = document.getElementById('config-pane-store');
    const brandingPane = document.getElementById('config-pane-branding');
    const securityPane = document.getElementById('config-pane-security');
    const btnStore = document.getElementById('btn-tab-config-store');
    const btnBranding = document.getElementById('btn-tab-config-branding');
    const btnSecurity = document.getElementById('btn-tab-config-security');

    if (storePane) storePane.style.display = tabName === 'store' ? 'block' : 'none';
    if (brandingPane) brandingPane.style.display = tabName === 'branding' ? 'block' : 'none';
    if (securityPane) securityPane.style.display = tabName === 'security' ? 'block' : 'none';

    if (btnStore) btnStore.classList.toggle('active', tabName === 'store');
    if (btnBranding) btnBranding.classList.toggle('active', tabName === 'branding');
    if (btnSecurity) btnSecurity.classList.toggle('active', tabName === 'security');
  }

  hexToRgb(hex) {
    if (!hex) return { r: 124, g: 58, b: 237 };
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  adjustColorBrightness(hex, percent) {
    try {
      const rgb = this.hexToRgb(hex);
      const p = percent / 100;
      const r = Math.min(255, Math.max(0, Math.round(rgb.r + (percent > 0 ? (255 - rgb.r) * p : rgb.r * p))));
      const g = Math.min(255, Math.max(0, Math.round(rgb.g + (percent > 0 ? (255 - rgb.g) * p : rgb.g * p))));
      const b = Math.min(255, Math.max(0, Math.round(rgb.b + (percent > 0 ? (255 - rgb.b) * p : rgb.b * p))));
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch(e) {
      return hex;
    }
  }

  hexToRgba(hex, alpha) {
    const rgb = this.hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  loadDynamicFonts() {
    if (!document.getElementById('dynamic-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'dynamic-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap';
      document.head.appendChild(link);
    }
  }

  applyBrandingSettings(branding) {
    if (!branding) return;

    this.loadDynamicFonts();

    const root = document.documentElement;

    // Color Primario
    if (branding.primaryColor) {
      const pColor = branding.primaryColor;
      const pHover = this.adjustColorBrightness(pColor, -12);
      const pLight = this.hexToRgba(pColor, 0.15);
      const pText = this.adjustColorBrightness(pColor, -25);
      const pGlow = this.hexToRgba(pColor, 0.25);

      root.style.setProperty('--brand-primary', pColor);
      root.style.setProperty('--brand-primary-hover', pHover);
      root.style.setProperty('--brand-primary-light', pLight);
      root.style.setProperty('--brand-primary-text', pText);
      root.style.setProperty('--brand-glow', pGlow);

      root.style.setProperty('--primary-indigo', pColor);
      root.style.setProperty('--primary-indigo-hover', pHover);
      root.style.setProperty('--primary-indigo-light', pLight);
      root.style.setProperty('--primary-indigo-glow', pGlow);
    }

    // Color Secundario
    if (branding.secondaryColor) {
      const sColor = branding.secondaryColor;
      const sHover = this.adjustColorBrightness(sColor, -12);
      const sLight = this.hexToRgba(sColor, 0.15);
      const sText = sColor;
      const sGlow = this.hexToRgba(sColor, 0.25);

      root.style.setProperty('--pos-checkout', sColor);
      root.style.setProperty('--pos-checkout-hover', sHover);
      root.style.setProperty('--pos-checkout-light', sLight);
      root.style.setProperty('--pos-checkout-text', sText);
      root.style.setProperty('--pos-glow', sGlow);

      root.style.setProperty('--emerald-success', sColor);
      root.style.setProperty('--emerald-bg', sLight);
      root.style.setProperty('--emerald-text', sText);
    }

    // Tipografía
    if (branding.fontHeading) {
      root.style.setProperty('--font-heading', `'${branding.fontHeading}', system-ui, -apple-system, sans-serif`);
    }
    if (branding.fontBody) {
      root.style.setProperty('--font-body', `'${branding.fontBody}', system-ui, -apple-system, sans-serif`);
    }

    // Actualizar Logos en toda la interfaz
    this.updateAppLogos(branding);
  }

  updateAppLogos(branding) {
    const logoUrl = (branding && branding.logoUrl) ? branding.logoUrl : '';
    const appName = (branding && branding.appName) ? branding.appName : 'NEXUS';
    const appBadge = (branding && branding.appBadge) ? branding.appBadge : 'POS';

    // 1. Nombre y Logo en Barra Lateral (Sidebar)
    const sidebarLogoContainer = document.getElementById('sidebar-brand-logo-container');
    const sidebarTitle = document.getElementById('sidebar-brand-text');
    const iconBox = document.getElementById('sidebar-brand-icon-box');

    if (sidebarTitle) {
      sidebarTitle.innerHTML = `<span class="brand-name-str" title="${appName}">${appName}</span> <span class="brand-badge">${appBadge}</span>`;
    }

    if (sidebarLogoContainer) {
      let img = sidebarLogoContainer.querySelector('img.custom-logo-img');
      if (logoUrl) {
        if (iconBox) iconBox.style.display = 'none';
        if (!img) {
          img = document.createElement('img');
          img.className = 'custom-logo-img';
          sidebarLogoContainer.insertBefore(img, sidebarTitle);
        }
        img.src = logoUrl;
        img.style.display = 'inline-block';
      } else {
        if (img) img.style.display = 'none';
        if (iconBox) iconBox.style.display = 'flex';
      }
    }

    // 2. Nombre y Logo en Pantalla de Inicio de Sesión (Login Screen)
    const loginLogoBox = document.getElementById('login-brand-logo-box');
    const loginContainer = document.getElementById('login-brand-container');
    const loginTitle = document.getElementById('login-brand-title-text');

    if (loginTitle) {
      loginTitle.innerHTML = `<span class="brand-name-str" title="${appName}">${appName}</span> <span class="login-brand-badge">${appBadge}</span>`;
    }

    if (loginContainer) {
      let loginImg = loginContainer.querySelector('img.login-custom-logo-img');
      if (logoUrl) {
        if (loginLogoBox) loginLogoBox.style.display = 'none';
        if (!loginImg) {
          loginImg = document.createElement('img');
          loginImg.className = 'login-custom-logo-img';
          loginContainer.insertBefore(loginImg, loginTitle);
        }
        loginImg.src = logoUrl;
        loginImg.style.display = 'block';
      } else {
        if (loginImg) loginImg.style.display = 'none';
        if (loginLogoBox) loginLogoBox.style.display = 'flex';
      }
    }

    // 3. Título del Documento Navegador
    document.title = `${appName} ${appBadge} - Sistema Punto de Venta, Inventario & Finanzas SaaS`;

    // 4. Previsualización de la Tarjeta en Configuración
    const previewBox = document.getElementById('branding-logo-preview-box');
    if (previewBox) {
      if (logoUrl) {
        previewBox.innerHTML = `<img src="${logoUrl}" style="max-height:75px; max-width:100%; object-fit:contain;">`;
      } else {
        previewBox.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Sin logo personalizado (usando icono por defecto)</span>`;
      }
    }

    const previewHeaderTitle = document.getElementById('preview-brand-title');
    if (previewHeaderTitle) {
      previewHeaderTitle.innerHTML = `${appName} <span style="font-size:0.65rem; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px; margin-left:4px;">${appBadge}</span>`;
    }

    const previewBrandArea = document.getElementById('preview-brand-logo-area');
    if (previewBrandArea) {
      if (logoUrl) {
        previewBrandArea.innerHTML = `<img src="${logoUrl}" style="max-height:28px; object-fit:contain;"> <span style="color:#fff; font-weight:800; font-family:var(--font-heading);">${appName} <span style="font-size:0.65rem; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px;">${appBadge}</span></span>`;
      } else {
        const firstLetter = appName.charAt(0).toUpperCase() || 'N';
        previewBrandArea.innerHTML = `<div style="width:28px; height:28px; background:var(--brand-primary); border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.8rem; font-weight:bold;">${firstLetter}</div> <span style="color:#fff; font-weight:800; font-family:var(--font-heading);">${appName} <span style="font-size:0.65rem; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px;">${appBadge}</span></span>`;
      }
    }
  }

  setupBrandingForm() {
    const brandingForm = document.getElementById('config-branding-form');
    if (!brandingForm) return;

    if (!this.data.store.branding) {
      this.data.store.branding = Object.assign({}, INITIAL_DATA.store.branding);
    }

    const branding = this.data.store.branding;

    const appNameInput = document.getElementById('branding-app-name');
    const appBadgeInput = document.getElementById('branding-app-badge');
    const primaryColorInput = document.getElementById('branding-primary-color');
    const primaryHexInput = document.getElementById('branding-primary-hex');
    const secondaryColorInput = document.getElementById('branding-secondary-color');
    const secondaryHexInput = document.getElementById('branding-secondary-hex');
    const fontHeadingSelect = document.getElementById('branding-font-heading');
    const fontBodySelect = document.getElementById('branding-font-body');
    const logoUrlInput = document.getElementById('branding-logo-url');
    const logoFileInput = document.getElementById('branding-logo-file');
    const resetLogoBtn = document.getElementById('branding-reset-logo-btn');

    if (appNameInput) appNameInput.value = branding.appName || 'NEXUS';
    if (appBadgeInput) appBadgeInput.value = branding.appBadge || 'POS';
    if (primaryColorInput) primaryColorInput.value = branding.primaryColor || '#7C3AED';
    if (primaryHexInput) primaryHexInput.value = branding.primaryColor || '#7C3AED';
    if (secondaryColorInput) secondaryColorInput.value = branding.secondaryColor || '#059669';
    if (secondaryHexInput) secondaryHexInput.value = branding.secondaryColor || '#059669';
    if (fontHeadingSelect) fontHeadingSelect.value = branding.fontHeading || 'Outfit';
    if (fontBodySelect) fontBodySelect.value = branding.fontBody || 'Inter';
    if (logoUrlInput) logoUrlInput.value = branding.logoUrl || '';

    const updatePreviewState = () => {
      const tempBranding = {
        appName: appNameInput ? appNameInput.value.trim() : (branding.appName || 'NEXUS'),
        appBadge: appBadgeInput ? appBadgeInput.value.trim() : (branding.appBadge || 'POS'),
        logoUrl: logoUrlInput ? logoUrlInput.value.trim() : branding.logoUrl,
        primaryColor: primaryColorInput ? primaryColorInput.value : branding.primaryColor,
        secondaryColor: secondaryColorInput ? secondaryColorInput.value : branding.secondaryColor,
        fontHeading: fontHeadingSelect ? fontHeadingSelect.value : branding.fontHeading,
        fontBody: fontBodySelect ? fontBodySelect.value : branding.fontBody
      };
      this.applyBrandingSettings(tempBranding);
    };

    if (appNameInput) appNameInput.oninput = updatePreviewState;
    if (appBadgeInput) appBadgeInput.oninput = updatePreviewState;

    if (primaryColorInput && primaryHexInput) {
      primaryColorInput.oninput = (e) => {
        primaryHexInput.value = e.target.value;
        updatePreviewState();
      };
      primaryHexInput.oninput = (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          primaryColorInput.value = e.target.value;
          updatePreviewState();
        }
      };
    }

    if (secondaryColorInput && secondaryHexInput) {
      secondaryColorInput.oninput = (e) => {
        secondaryHexInput.value = e.target.value;
        updatePreviewState();
      };
      secondaryHexInput.oninput = (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          secondaryColorInput.value = e.target.value;
          updatePreviewState();
        }
      };
    }

    document.querySelectorAll('#primary-swatches .color-swatch-btn').forEach(btn => {
      btn.onclick = () => {
        const c = btn.getAttribute('data-color');
        if (c && primaryColorInput && primaryHexInput) {
          primaryColorInput.value = c;
          primaryHexInput.value = c;
          updatePreviewState();
        }
      };
    });

    document.querySelectorAll('#secondary-swatches .color-swatch-btn').forEach(btn => {
      btn.onclick = () => {
        const c = btn.getAttribute('data-color');
        if (c && secondaryColorInput && secondaryHexInput) {
          secondaryColorInput.value = c;
          secondaryHexInput.value = c;
          updatePreviewState();
        }
      };
    });

    if (fontHeadingSelect) fontHeadingSelect.onchange = updatePreviewState;
    if (fontBodySelect) fontBodySelect.onchange = updatePreviewState;
    if (logoUrlInput) logoUrlInput.oninput = updatePreviewState;

    if (logoFileInput) {
      logoFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result;
            if (logoUrlInput) logoUrlInput.value = base64;
            updatePreviewState();
          };
          reader.readAsDataURL(file);
        }
      };
    }

    if (resetLogoBtn) {
      resetLogoBtn.onclick = () => {
        if (logoUrlInput) logoUrlInput.value = '';
        if (logoFileInput) logoFileInput.value = '';
        updatePreviewState();
      };
    }

    brandingForm.onsubmit = async (e) => {
      e.preventDefault();
      if (this.currentUser?.role !== 'Super Admin' && !this.hasPermission('config', null)) {
        this.showToast('Acceso Denegado: No tienes permisos para modificar el branding y tema visual.', 'danger');
        return;
      }
      this.data.store.branding = {
        appName: appNameInput ? appNameInput.value.trim() || 'NEXUS' : 'NEXUS',
        appBadge: appBadgeInput ? appBadgeInput.value.trim() || 'POS' : 'POS',
        logoUrl: logoUrlInput ? logoUrlInput.value.trim() : '',
        primaryColor: primaryColorInput ? primaryColorInput.value : '#7C3AED',
        secondaryColor: secondaryColorInput ? secondaryColorInput.value : '#059669',
        fontHeading: fontHeadingSelect ? fontHeadingSelect.value : 'Outfit',
        fontBody: fontBodySelect ? fontBodySelect.value : 'Inter'
      };

      this.applyBrandingSettings(this.data.store.branding);
      await this.savePersistence();
      this.showToast('🎨 Tema visual y personalización de marca guardados con éxito', 'success');
    };
  }

  /* --------------------------------------------------------------------------
     MODAL EDIT OPENERS & DELETE ACTIONS
     -------------------------------------------------------------------------- */
  onMeasureTypeChange(prefix = 'edit') {
    const measureSelect = document.getElementById(`${prefix}-prod-measure-type`);
    const weightGroup = document.getElementById(`${prefix}-prod-weight-unit-group`);
    const pieceWeightGroup = document.getElementById(`${prefix}-prod-piece-weight-group`);
    const pieceWeightInput = document.getElementById(`${prefix}-prod-piece-weight`);
    const weightSelect = document.getElementById(`${prefix}-prod-weight-unit`);
    const nameGroup = document.getElementById(`${prefix}-prod-name-group`);
    const costLabel = document.getElementById(`${prefix}-prod-cost-label`);
    const priceLabel = document.getElementById(`${prefix}-prod-price-label`);
    const stockLabel = document.getElementById(`${prefix}-prod-stock-label`);
    const stockInput = document.getElementById(`${prefix}-prod-stock`);
    const stockGrid = document.getElementById(`${prefix}-prod-stock-grid`);
    const unitTag = document.getElementById(`${prefix}-unit-tag`) || document.getElementById(`${prefix}-prod-unit-tag`);

    const catSelect = document.getElementById(`${prefix}-prod-cat`);
    const currentCat = catSelect ? (this.data?.categories || []).find(c => c.id === catSelect.value || c.name === catSelect.value) : null;
    const isExtrasCat = currentCat && (currentCat.type === 'extras' || currentCat.isExtra);

    const type = measureSelect?.value || 'Pesaje';

    if (type === 'Pesaje') {
      if (weightGroup) weightGroup.style.display = 'block';
      if (pieceWeightGroup) pieceWeightGroup.style.display = 'none';
      if (nameGroup) nameGroup.style.gridColumn = 'auto';
      if (stockGrid) stockGrid.style.gridTemplateColumns = '1fr';
      if (weightSelect) weightSelect.disabled = false;
      if (pieceWeightInput) pieceWeightInput.required = false;
      this.onWeightUnitChange(prefix);
    } else {
      if (weightGroup) weightGroup.style.display = 'none';
      if (nameGroup) nameGroup.style.gridColumn = '1 / -1';
      if (pieceWeightGroup) pieceWeightGroup.style.display = isExtrasCat ? 'none' : 'block';
      if (stockGrid) stockGrid.style.gridTemplateColumns = isExtrasCat ? '1fr' : '1fr 1fr';
      if (weightSelect) weightSelect.disabled = true;
      if (pieceWeightInput) {
        pieceWeightInput.required = !isExtrasCat;
        if (isExtrasCat) pieceWeightInput.value = '0';
      }
      if (costLabel) costLabel.textContent = isExtrasCat ? 'Costo de compra unitario ($ COP) *' : 'Costo de la mercancía (Costo unitario) *';
      if (priceLabel) priceLabel.textContent = 'Precio de venta (A cómo se va a vender por unidad) *';
      if (stockLabel) stockLabel.textContent = isExtrasCat ? 'Unidades de manillas (Stock) *' : 'Cantidad de unidades (Stock) *';
      if (stockInput) stockInput.placeholder = '10';
      if (unitTag) unitTag.textContent = 'u.';
      this.updateProductCostProfitPreview(prefix);
    }
  }

  onWeightUnitChange(prefix = 'edit') {
    const weightSelect = document.getElementById(`${prefix}-prod-weight-unit`);
    const costLabel = document.getElementById(`${prefix}-prod-cost-label`);
    const priceLabel = document.getElementById(`${prefix}-prod-price-label`);
    const stockLabel = document.getElementById(`${prefix}-prod-stock-label`);
    const stockInput = document.getElementById(`${prefix}-prod-stock`);
    const unitTag = document.getElementById(`${prefix}-unit-tag`) || document.getElementById(`${prefix}-prod-unit-tag`);

    const unit = weightSelect?.value || 'g';
    if (unitTag) unitTag.textContent = unit;

    const unitConfigs = {
      'g': { name: 'gramo', totalLabel: 'Cantidad en gramos (Stock total disponible) *', placeholder: '2.08' },
      'mg': { name: 'miligramo', totalLabel: 'Cantidad en miligramos (Stock total disponible) *', placeholder: '250' },
      'µg': { name: 'microgramo', totalLabel: 'Cantidad en microgramos (Stock total disponible) *', placeholder: '1000' },
      'kg': { name: 'kilogramo', totalLabel: 'Cantidad en kilogramos (Stock total disponible) *', placeholder: '1.5' },
      'oz': { name: 'onza', totalLabel: 'Cantidad en onzas (Stock total disponible) *', placeholder: '0.5' }
    };

    const cfg = unitConfigs[unit] || unitConfigs['g'];
    if (costLabel) costLabel.textContent = `Costo de la mercancía (por ${cfg.name}) *`;
    if (priceLabel) priceLabel.textContent = `Precio de venta (A cómo se va a vender por ${cfg.name}) *`;
    if (stockLabel) stockLabel.textContent = cfg.totalLabel;
    if (stockInput) stockInput.placeholder = cfg.placeholder;
    this.updateProductCostProfitPreview(prefix);
  }

  updateProductCostProfitPreview(prefix = 'new') {
    const costInput = document.getElementById(`${prefix}-prod-cost`);
    const stockInput = document.getElementById(`${prefix}-prod-stock`);
    const pieceWeightInput = document.getElementById(`${prefix}-prod-piece-weight`);
    const measureSelect = document.getElementById(`${prefix}-prod-measure-type`);

    const cost = this.parseCleanNumber(costInput?.value);
    const stock = this.parseCleanNumber(stockInput?.value);

    const isUnidades = (measureSelect?.value || 'Pesaje') === 'Unidades';
    let totalWeight = stock;
    let totalCost = 0;

    const weightBox = document.getElementById(`${prefix}-preview-total-weight-box`);
    const weightEl = document.getElementById(`${prefix}-preview-total-weight`);
    const badgeBox = document.getElementById(`${prefix}-preview-badge-box`);

    if (isUnidades) {
      const pieceWeight = this.parseCleanNumber(pieceWeightInput?.value);
      totalWeight = Math.round(stock * pieceWeight * 100) / 100;
      totalCost = pieceWeight > 0 ? Math.round(totalWeight * cost) : Math.round(stock * cost);
      if (weightBox && weightEl) {
        weightBox.style.display = 'block';
        weightEl.textContent = `${totalWeight.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
        if (badgeBox) badgeBox.style.display = 'none';
      }
    } else {
      totalCost = Math.round(stock * cost);
      if (weightBox && weightEl) {
        weightBox.style.display = 'none';
        if (badgeBox) badgeBox.style.display = 'block';
      }
    }

    const costEl = document.getElementById(`${prefix}-preview-total-cost`);
    if (costEl) {
      if (isUnidades) {
        const pieceWeight = this.parseCleanNumber(pieceWeightInput?.value);
        const pieceCost = pieceWeight > 0 ? Math.round(pieceWeight * cost) : cost;
        costEl.innerHTML = `${this.formatCurrency(totalCost)} <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">(${this.formatCurrency(pieceCost)} / u.)</span>`;
      } else {
        costEl.textContent = this.formatCurrency(totalCost);
      }
    }
  }

  adjustEditStock() {}
  onEditAvailabilityChange() {}
  updateEditProductLiveStatus() {}

  populateProductCategorySelect(selectId, selectedVal = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = (this.data.categories || []).map(cat => {
      return `<option value="${this.escapeHtml(cat.id)}" ${cat.id === selectedVal || cat.name === selectedVal ? 'selected' : ''}>${this.escapeHtml(cat.name)}</option>`;
    }).join('');
  }

  onProductCategoryChange(prefix = 'new') {
    const catSelect = document.getElementById(`${prefix}-prod-cat`);
    const costInput = document.getElementById(`${prefix}-prod-cost`);
    const hintEl = document.getElementById(`${prefix}-prod-cat-cost-hint`);
    const measureSelect = document.getElementById(`${prefix}-prod-measure-type`);
    const pieceWeightGroup = document.getElementById(`${prefix}-prod-piece-weight-group`);
    const pieceWeightInput = document.getElementById(`${prefix}-prod-piece-weight`);
    const stockGrid = document.getElementById(`${prefix}-prod-stock-grid`);

    if (hintEl) hintEl.textContent = '';
    if (!catSelect) return;
    const cat = (this.data?.categories || []).find(c => c.id === catSelect.value || c.name === catSelect.value);
    if (!cat) return;

    const isExtras = cat.type === 'extras' || cat.isExtra;
    if (isExtras) {
      if (measureSelect) {
        measureSelect.value = 'Unidades';
        this.onMeasureTypeChange(prefix);
      }
      if (pieceWeightGroup) pieceWeightGroup.style.display = 'none';
      if (pieceWeightInput) {
        pieceWeightInput.required = false;
        pieceWeightInput.value = '0';
      }
      if (stockGrid) stockGrid.style.gridTemplateColumns = '1fr';
      if (cat.cost && costInput && (!costInput.value || this.parseCleanNumber(costInput.value) === 0)) {
        costInput.value = this.formatNumberWithCommas(cat.cost);
        this.updateProductCostProfitPreview(prefix);
      }
      if (hintEl) {
        hintEl.innerHTML = `<span style="color:#6366f1; font-weight:700; font-size:0.8rem;">🧵 Servicio Extra (Manilla/Accesorio): Venta por unidad. No requiere ni afecta gramaje de metales preciosos.</span>`;
      }
      return;
    }

    if (cat.cost) {
      if (costInput && (!costInput.value || this.parseCleanNumber(costInput.value) === 0)) {
        costInput.value = this.formatNumberWithCommas(cat.cost);
        this.updateProductCostProfitPreview(prefix);
      }
    }
  }

  populateProductSupplierSelect(selectId, selectedVal = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const defaultOpt = `<option value="ANONIMO" ${selectedVal === 'ANONIMO' ? 'selected' : ''}>ANONIMO</option>`;
    const suppOptions = (this.data.suppliers || []).map(s => `
      <option value="${s.name}" ${s.name === selectedVal ? 'selected' : ''}>${s.name}</option>
    `).join('');
    select.innerHTML = defaultOpt + suppOptions;
  }

  openAddProductModal() {
    const addForm = document.getElementById('add-product-form');
    if (addForm) addForm.reset();
    const measureSelect = document.getElementById('new-prod-measure-type');
    if (measureSelect) measureSelect.value = 'Pesaje';
    const weightSelect = document.getElementById('new-prod-weight-unit');
    if (weightSelect) weightSelect.value = 'g';
    const pieceWeightInput = document.getElementById('new-prod-piece-weight');
    if (pieceWeightInput) pieceWeightInput.value = '';
    const costInput = document.getElementById('new-prod-cost');
    if (costInput) costInput.value = '';
    const stockInput = document.getElementById('new-prod-stock');
    if (stockInput) stockInput.value = '';
    this.populateProductCategorySelect('new-prod-cat');
    this.populateProductSupplierSelect('new-prod-supplier');
    this.onMeasureTypeChange('new');
    this.onProductCategoryChange('new');
    this.updateProductCostProfitPreview('new');
    this.openModal('product-modal');
  }

  openEditProductModal(id) {
    if (!this.canPerformAction('edit', 'product')) {
      this.showToast('Acceso Restringido: Tu rol no tiene permisos para editar productos del catálogo.', 'warning');
      return;
    }
    const p = this.data.products.find(item => item.id === id);
    if (!p) return;

    document.getElementById('edit-prod-id').value = p.id;
    document.getElementById('edit-prod-sku').value = p.sku || '001';
    document.getElementById('edit-prod-name').value = p.name;
    document.getElementById('edit-prod-cost').value = p.cost !== undefined ? this.formatNumberWithCommas(p.cost) : '';
    document.getElementById('edit-prod-stock').value = p.stock !== undefined ? this.formatNumberWithCommas(p.stock, true) : 0;
    const stockHint = document.getElementById('edit-prod-stock-hint');
    if (stockHint) {
      stockHint.style.display = (Number(p.stock) || 0) <= 0 ? 'block' : 'none';
    }

    const measureSelect = document.getElementById('edit-prod-measure-type');
    if (measureSelect) measureSelect.value = p.measureType || 'Pesaje';

    const weightSelect = document.getElementById('edit-prod-weight-unit');
    if (weightSelect) weightSelect.value = p.weightUnit || 'g';

    const pieceWeightInput = document.getElementById('edit-prod-piece-weight');
    if (pieceWeightInput) {
      const pW = p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || '');
      pieceWeightInput.value = pW !== '' ? this.formatNumberWithCommas(pW, true) : '';
    }

    this.populateProductCategorySelect('edit-prod-cat', p.category);
    this.populateProductSupplierSelect('edit-prod-supplier', p.supplier || 'ANONIMO');
    this.onProductCategoryChange('edit');

    const activeCb = document.getElementById('edit-prod-active');
    if (activeCb) activeCb.checked = p.status !== 'inactive';

    this.onMeasureTypeChange('edit');
    this.updateProductCostProfitPreview('edit');
    this.openModal('edit-product-modal');
  }

  openAddCategoryModal() {
    const catForm = document.getElementById('add-category-form');
    if (catForm) catForm.reset();
    const typeSelect = document.getElementById('cat-type-select');
    if (typeSelect) typeSelect.value = 'general';
    this.onCategoryTypeChange();
    this.openModal('category-modal');
  }

  onCategoryTypeChange() {
    const typeSelect = document.getElementById('cat-type-select');
    const generalFields = document.getElementById('cat-general-fields');
    const extrasFields = document.getElementById('cat-extras-fields');
    const nameLabel = document.getElementById('cat-name-label');
    const nameInput = document.getElementById('cat-name-input');
    const gramsInput = document.getElementById('cat-grams-input');
    const costInput = document.getElementById('cat-cost-input');
    const unitsInput = document.getElementById('cat-units-input');
    const unitCostInput = document.getElementById('cat-unit-cost-input');

    const type = typeSelect ? typeSelect.value : 'general';

    if (type === 'extras') {
      if (generalFields) generalFields.style.display = 'none';
      if (extrasFields) extrasFields.style.display = 'block';
      if (nameLabel) nameLabel.textContent = 'Nombre de la Categoría de Manillas / Accesorios *';
      if (nameInput) nameInput.placeholder = 'ej. Manillas Neopreno, Tejidas, Balines...';
      if (gramsInput) gramsInput.required = false;
      if (costInput) costInput.required = false;
      if (unitsInput) unitsInput.required = true;
      if (unitCostInput) unitCostInput.required = true;
    } else {
      if (generalFields) generalFields.style.display = 'block';
      if (extrasFields) extrasFields.style.display = 'none';
      if (nameLabel) nameLabel.textContent = 'Nombre de Categoría *';
      if (nameInput) nameInput.placeholder = 'ej. Oro 18K Italiano & Ley';
      if (gramsInput) gramsInput.required = false;
      if (costInput) costInput.required = false;
      if (unitsInput) unitsInput.required = false;
      if (unitCostInput) unitCostInput.required = false;
    }
  }

  openEditCategoryModal(id) {
    if (!this.canPerformAction('edit', 'category')) {
      this.showToast('Acceso Restringido: Tu rol no tiene permisos para editar categorías.', 'warning');
      return;
    }
    const cat = (this.data.categories || []).find(c => c.id === id);
    if (!cat) return;

    const idInput = document.getElementById('edit-cat-id');
    const idDisplay = document.getElementById('edit-cat-id-display');
    const nameInput = document.getElementById('edit-cat-name-input');
    const colorInput = document.getElementById('edit-cat-color-input');
    const colorCode = document.getElementById('edit-cat-color-code');
    const prodsCountEl = document.getElementById('edit-cat-products-count');
    const gramsBadgeEl = document.getElementById('edit-cat-grams-badge');
    const valuationBadgeEl = document.getElementById('edit-cat-valuation-badge');

    const generalFields = document.getElementById('edit-cat-general-fields');
    const extrasFields = document.getElementById('edit-cat-extras-fields');
    const gramsInput = document.getElementById('edit-cat-grams-input');
    const costInput = document.getElementById('edit-cat-cost-input');
    const unitsInput = document.getElementById('edit-cat-units-input');
    const unitCostInput = document.getElementById('edit-cat-unit-cost-input');

    if (idInput) idInput.value = cat.id;
    if (idDisplay) idDisplay.value = cat.id;
    if (nameInput) nameInput.value = cat.name;
    if (colorInput) colorInput.value = cat.color || '#F59E0B';
    if (colorCode) colorCode.textContent = cat.color || '#F59E0B';

    const isExtras = cat.type === 'extras' || cat.isExtra;

    if (isExtras) {
      if (generalFields) generalFields.style.display = 'none';
      if (extrasFields) extrasFields.style.display = 'block';
    } else {
      if (generalFields) generalFields.style.display = 'block';
      if (extrasFields) extrasFields.style.display = 'none';
    }

    const prodsInCat = (this.data.products || []).filter(p => p.category === cat.id || p.categoryName === cat.name);
    const totalUnitsInProds = prodsInCat.reduce((sum, p) => sum + (parseFloat(String(p.stock || 0).replace(',', '.')) || 0), 0);
    const totalCostInProds = prodsInCat.reduce((sum, p) => sum + (this.getProductTotalCost(p) || 0), 0);
    const totalGramsInProds = prodsInCat.reduce((sum, p) => sum + (this.getGramsFromProduct(p) || 0), 0);

    if (isExtras) {
      cat.availableGrams = 0;
      const currentUnits = prodsInCat.length > 0 ? totalUnitsInProds : (cat.availableUnits || 0);
      let calculatedUnitCost = Number(cat.cost) || 0;
      if (totalUnitsInProds > 0 && totalCostInProds > 0) {
        calculatedUnitCost = Math.round((totalCostInProds / totalUnitsInProds) * 100) / 100;
      }
      cat.cost = calculatedUnitCost;
      cat.availableUnits = currentUnits;

      if (unitsInput) unitsInput.value = this.formatNumberWithCommas(currentUnits);
      if (unitCostInput) unitCostInput.value = this.formatNumberWithCommas(calculatedUnitCost);
      if (gramsInput) gramsInput.value = '0.00';
      if (costInput) costInput.value = this.formatNumberWithCommas(calculatedUnitCost);

      if (prodsCountEl) {
        if (prodsInCat.length > 0) {
          prodsCountEl.textContent = `${prodsInCat.length} productos (${currentUnits} u. en stock) — Costo: ${this.formatCurrencyDecimals(calculatedUnitCost)}/u.`;
        } else {
          prodsCountEl.textContent = `0 productos asociados (${currentUnits} u. iniciales)`;
        }
      }
      if (gramsBadgeEl) {
        gramsBadgeEl.textContent = `🧵 ${currentUnits} u.`;
      }
      if (valuationBadgeEl) {
        const totalVal = Math.round(currentUnits * calculatedUnitCost);
        valuationBadgeEl.textContent = `💰 Valor: ${this.formatCurrency(totalVal)}`;
      }
    } else {
      const isUnidades = cat.id === 'relojes' || cat.id === 'accesorios';
      const availableGrams = (cat.availableGrams !== undefined && cat.availableGrams !== null)
        ? Number(cat.availableGrams)
        : Math.round(totalGramsInProds * 100) / 100;
      cat.availableGrams = availableGrams;

      let calculatedAvgCost = Number(cat.cost) || 0;
      if (isUnidades) {
        if (totalUnitsInProds > 0) calculatedAvgCost = Math.round((totalCostInProds / totalUnitsInProds) * 100) / 100;
      } else if (availableGrams > 0 && totalCostInProds > 0) {
        calculatedAvgCost = Math.round((totalCostInProds / availableGrams) * 100) / 100;
      }
      cat.cost = calculatedAvgCost;

      if (gramsInput) gramsInput.value = this.formatNumberWithCommas(availableGrams, true);
      if (costInput) costInput.value = this.formatNumberWithCommas(calculatedAvgCost, true);

      if (prodsCountEl) {
        if (prodsInCat.length > 0) {
          prodsCountEl.textContent = `${prodsInCat.length} productos (${availableGrams.toFixed(2)} g en piezas) — Costo Promedio: ${this.formatCurrencyDecimals(calculatedAvgCost)}/g`;
        } else {
          prodsCountEl.textContent = `0 productos asociados (sin inventario registrado)`;
        }
      }
      this.updateEditCategoryValuationPreview();
    }

    this.openModal('edit-category-modal');
  }

  updateEditCategoryValuationPreview() {
    const id = document.getElementById('edit-cat-id')?.value;
    const cat = (this.data?.categories || []).find(c => c.id === id);
    const isExtras = cat ? (cat.type === 'extras' || cat.isExtra) : false;

    const badge = document.getElementById('edit-cat-valuation-badge');
    const gramsBadgeEl = document.getElementById('edit-cat-grams-badge');

    if (isExtras) {
      const unitsInput = document.getElementById('edit-cat-units-input');
      const unitCostInput = document.getElementById('edit-cat-unit-cost-input');
      const units = this.parseCleanNumber(unitsInput?.value) || 0;
      const unitCost = this.parseCleanNumber(unitCostInput?.value) || 0;
      if (gramsBadgeEl) {
        gramsBadgeEl.textContent = `🧵 ${units} u.`;
      }
      if (badge) {
        const totalValuation = Math.round(units * unitCost);
        badge.textContent = `💰 Valor: ${this.formatCurrency(totalValuation)}`;
      }
    } else {
      const gramsInput = document.getElementById('edit-cat-grams-input');
      const costInput = document.getElementById('edit-cat-cost-input');
      const grams = this.parseCleanNumber(gramsInput?.value);
      const cost = this.parseCleanNumber(costInput?.value);
      if (gramsBadgeEl) {
        gramsBadgeEl.textContent = `⚖️ ${grams.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
      }
      if (badge) {
        const totalValuation = Math.round(grams * cost);
        badge.textContent = `💰 Valor: ${this.formatCurrency(totalValuation)}`;
      }
    }
  }

  adjustCategoryCostInput(delta) {
    const input = document.getElementById('edit-cat-cost-input');
    if (!input) return;
    const current = this.parseCleanNumber(input.value);
    const updated = Math.max(0, Math.round(current + delta));
    input.value = this.formatNumberWithCommas(updated);
    this.updateEditCategoryValuationPreview();
  }

  adjustCategoryGramsInput(delta) {
    const input = document.getElementById('edit-cat-grams-input');
    if (!input) return;
    const current = this.parseCleanNumber(input.value);
    const updated = Math.max(0, Math.round((current + delta) * 100) / 100);
    input.value = this.formatNumberWithCommas(updated, true);
    const gramsBadgeEl = document.getElementById('edit-cat-grams-badge');
    if (gramsBadgeEl) {
      gramsBadgeEl.textContent = `⚖️ ${updated.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
    }
    this.updateEditCategoryValuationPreview();
  }

  async quickAdjustCategoryCost(id, delta) {
    if (!this.canPerformAction('edit', 'category')) {
      this.showToast('Acceso Denegado: No tienes permisos para ajustar costos de categorías.', 'danger');
      return;
    }
    const cat = (this.data.categories || []).find(c => c.id === id);
    if (!cat) return;
    cat.cost = Math.max(0, Math.round(((cat.cost || 0) + delta) * 100) / 100);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Costo de "${cat.name}": ${this.formatCurrency(cat.cost)} (${delta > 0 ? '+' : ''}${this.formatCurrency(delta)})`, 'info');
  }

  async quickAdjustCategoryGrams(id, delta) {
    if (!this.canPerformAction('edit', 'category')) {
      this.showToast('Acceso Denegado: No tienes permisos para ajustar disponibilidad de categorías.', 'danger');
      return;
    }
    const cat = (this.data.categories || []).find(c => c.id === id);
    if (!cat) return;
    const prodsInCat = (this.data.products || []).filter(p => p.category === cat.id || p.categoryName === cat.name);
    const prodsGrams = prodsInCat.reduce((sum, p) => sum + this.getGramsFromProduct(p), 0);
    let current = (cat.availableGrams !== undefined && cat.availableGrams !== null) ? Number(cat.availableGrams) : prodsGrams;
    cat.availableGrams = Math.max(0, Math.round((current + delta) * 100) / 100);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Disponibilidad de "${cat.name}": ${cat.availableGrams} g (${delta > 0 ? '+' : ''}${delta}g)`, 'info');
  }

  openCustomerModal() {
    const custForm = document.getElementById('add-customer-form');
    if (custForm) custForm.reset();
    const docTypeSelect = document.getElementById('cust-doctype-select');
    if (docTypeSelect) docTypeSelect.value = 'CC';
    const docInput = document.getElementById('cust-document-input');
    if (docInput) docInput.placeholder = 'ej. 1020304050';
    ['cash', 'transfer', 'credit', 'separe'].forEach(type => {
      const el = document.getElementById(`cust-pay-${type}`);
      if (el) el.checked = true;
    });
    this.openModal('customer-modal');
  }

  openEditCustomerModal(id) {
    if (!this.canPerformAction('edit', 'customer')) {
      this.showToast('Acceso Restringido: Tu rol no tiene permisos para editar clientes.', 'warning');
      return;
    }
    const c = this.data.customers.find(item => item.id === id);
    if (!c) return;

    document.getElementById('edit-cust-id').value = c.id;
    const editDocType = document.getElementById('edit-cust-doctype-select');
    if (editDocType) editDocType.value = c.docType || 'CC';
    document.getElementById('edit-cust-document').value = c.document || '';
    document.getElementById('edit-cust-name').value = c.name;
    document.getElementById('edit-cust-phone').value = c.phone || '';
    document.getElementById('edit-cust-email').value = c.email || '';
    document.getElementById('edit-cust-address').value = c.address || '';
    document.getElementById('edit-cust-limit').value = this.formatNumberWithCommas(c.creditLimit);

    // Sincronizar opciones de pago
    const methods = c.allowedPaymentMethods || ['Efectivo', 'Transferencia', 'Crédito', 'Plan Separe'];
    const chkCash = document.getElementById('edit-cust-pay-cash');
    const chkTransfer = document.getElementById('edit-cust-pay-transfer');
    const chkCredit = document.getElementById('edit-cust-pay-credit');
    const chkSepare = document.getElementById('edit-cust-pay-separe');

    if (chkCash) chkCash.checked = methods.includes('Efectivo');
    if (chkTransfer) chkTransfer.checked = methods.includes('Transferencia');
    if (chkCredit) chkCredit.checked = methods.includes('Crédito');
    if (chkSepare) chkSepare.checked = methods.includes('Plan Separe');

    this.openModal('edit-customer-modal');
  }

  openSupplierModal() {
    const suppForm = document.getElementById('add-supplier-form');
    if (suppForm) suppForm.reset();
    const docTypeSelect = document.getElementById('supp-doctype-select');
    if (docTypeSelect) docTypeSelect.value = 'NIT';
    const nitInput = document.getElementById('supp-nit-input');
    if (nitInput) nitInput.placeholder = 'ej. 900.123.456-7';
    const activeCheck = document.getElementById('supp-active-checkbox');
    if (activeCheck) activeCheck.checked = true;
    const pendingInput = document.getElementById('supp-pending-balance-input');
    if (pendingInput) pendingInput.value = '0';
    const accType = document.getElementById('supp-account-type-select');
    if (accType) accType.value = 'Ahorros';
    this.openModal('supplier-modal');
  }

  openEditSupplierModal(id) {
    if (!this.canPerformAction('edit', 'supplier')) {
      this.showToast('Acceso Restringido: Tu rol no tiene permisos para editar proveedores.', 'warning');
      return;
    }
    const s = this.data.suppliers.find(item => item.id === id);
    if (!s) return;

    document.getElementById('edit-supp-id').value = s.id;
    const editDocType = document.getElementById('edit-supp-doctype');
    if (editDocType) editDocType.value = s.docType || 'NIT';
    const nitInput = document.getElementById('edit-supp-nit');
    if (nitInput) {
      nitInput.value = s.nit || '';
      const dt = s.docType || 'NIT';
      if (dt === 'CC') nitInput.placeholder = 'ej. 1020304050';
      else if (dt === 'CE') nitInput.placeholder = 'ej. 450123';
      else if (dt === 'PAS') nitInput.placeholder = 'ej. P1234567';
      else nitInput.placeholder = 'ej. 900.123.456-7';
    }
    document.getElementById('edit-supp-name').value = s.name || '';
    document.getElementById('edit-supp-phone').value = s.phone || '';
    document.getElementById('edit-supp-email').value = s.email || '';
    document.getElementById('edit-supp-address').value = s.address || '';
    const activeCheck = document.getElementById('edit-supp-active');
    if (activeCheck) activeCheck.checked = s.status !== 'Inactive';
    const accType = document.getElementById('edit-supp-account-type');
    if (accType) accType.value = s.accountType || 'Ahorros';
    document.getElementById('edit-supp-account-number').value = s.accountNumber || '';
    document.getElementById('edit-supp-bank').value = s.bank || '';
    document.getElementById('edit-supp-pending-balance').value = this.formatNumberWithCommas(s.creditBalance || 0);

    this.openModal('edit-supplier-modal');
  }

  openUserModal() {
    this.populateRoleSelect('user-role-select');
    this.renderPermissionCheckboxes('add-user-perm-box', [], 'add-usr-perm', 'Permisos Personalizados del Usuario (Opcional - anula rol)');
    const pwdInput = document.getElementById('user-password-input');
    if (pwdInput) {
      pwdInput.value = '123456';
    }
    this.resetPasswordInputState('user-password-input');
  }

  openProfileModal() {
    this.renderPermissionCheckboxes('add-profile-perm-box', ['pos', 'ventas', 'clientes', 'productos'], 'add-prf-perm', 'Matriz de Permisos Habilitados por Módulo');
    this.renderUserAssignmentCheckboxes('add-profile-users-box', '', 'add-prf-user');
  }

  openEditUserModal(id) {
    if (this.currentUser?.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Admin puede gestionar cuentas de usuario.', 'danger');
      return;
    }
    const u = this.data.users.find(usr => usr.id === id);
    if (!u) return;

    const isTargetSuperAdmin = u.role === 'Super Admin' || u.id === 'USR-001';
    const isEditingSelf = Boolean(this.currentUser && (this.currentUser.id === u.id || this.currentUser.email?.toLowerCase() === u.email?.toLowerCase()));

    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-name').value = u.name;
    document.getElementById('edit-user-email').value = u.email;

    const statusSelect = document.getElementById('edit-user-status');
    const statusHelp = document.getElementById('edit-user-status-help');
    statusSelect.value = u.status;

    // A Super Admin or self account cannot be deactivated
    if (isEditingSelf || isTargetSuperAdmin) {
      statusSelect.value = 'Active';
      statusSelect.disabled = true;
      if (statusHelp) statusHelp.style.display = 'block';
    } else {
      statusSelect.disabled = false;
      if (statusHelp) statusHelp.style.display = 'none';
    }

    const pwdField = document.getElementById('edit-user-password');
    if (pwdField) {
      pwdField.value = '';
      pwdField.type = 'password';
    }
    this.resetPasswordInputState('edit-user-password');

    this.populateRoleSelect('edit-user-role', u.role);
    const roleSelect = document.getElementById('edit-user-role');
    const roleHelp = document.getElementById('edit-user-role-help');

    // A Super Admin account or self account cannot have its role demoted
    if (isTargetSuperAdmin || (isEditingSelf && this.currentUser?.role === 'Super Admin')) {
      roleSelect.value = 'Super Admin';
      roleSelect.disabled = true;
      if (roleHelp) roleHelp.style.display = 'block';
    } else {
      roleSelect.disabled = false;
      if (roleHelp) roleHelp.style.display = 'none';
    }

    const permBox = document.getElementById('edit-user-perm-box');
    if (isTargetSuperAdmin || (isEditingSelf && this.currentUser?.role === 'Super Admin')) {
      // Show guaranteed total-access shield banner instead of clippable checkboxes
      permBox.innerHTML = `
        <div style="margin-top: 1rem; padding: 0.9rem 1.1rem; background: rgba(99, 102, 241, 0.08); border: 1.5px solid rgba(99, 102, 241, 0.28); border-radius: var(--radius-md);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 4px;">
            <span style="font-size: 1.25rem;">🛡️</span>
            <span style="font-weight: 700; color: #4F46E5; font-size: 0.88rem;">Acceso Total e Irrestricto de Super Administrador</span>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-main); margin: 0; line-height: 1.45;">
            Como <strong>Super Administrador</strong>, esta cuenta posee privilegios absolutos sobre todos los módulos, ajustes y operaciones del sistema. <strong>No es posible recortar, limitar ni desmarcar permisos</strong> para garantizar la seguridad e integridad del sistema.
          </p>
        </div>
      `;
    } else {
      this.renderPermissionCheckboxes('edit-user-perm-box', u.customPermissions || [], 'edit-usr-perm', 'Permisos Personalizados del Usuario (Opcional - anula rol)');
    }

    this.openModal('edit-user-modal');
  }

  resetPasswordInputState(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = 'password';
    const wrapper = input.closest('.password-input-wrapper');
    const eyeBtn = wrapper ? wrapper.querySelector('.password-eye-btn') : null;
    if (eyeBtn) {
      eyeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  setPasswordInputVisible(inputId, visible) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = visible ? 'text' : 'password';
    const wrapper = input.closest('.password-input-wrapper');
    const eyeBtn = wrapper ? wrapper.querySelector('.password-eye-btn') : null;
    if (eyeBtn) {
      eyeBtn.innerHTML = visible
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  generateSecureRandomPassword() {
    const prefixes = ['Joyas', 'Oro18k', 'Nexus', 'Esmeralda', 'Diamante', 'Plata', 'Zafiro', 'Rubi'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const symbols = ['!', '@', '#', '$', '*'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}${num}${symbol}`;
  }

  toggleFieldPassword(fieldId, btnEl) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const targetBtn = btnEl || input.closest('.password-input-wrapper')?.querySelector('.password-eye-btn');
    if (targetBtn) {
      targetBtn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  generateRandomPasswordForField(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const pwd = this.generateSecureRandomPassword();
    input.value = pwd;
    this.setPasswordInputVisible(fieldId, true);
    this.showToast(`Contraseña generada: ${pwd}`, 'info');
  }

  openChangeMyPasswordModal() {
    if (!this.currentUser) {
      this.showToast('Debes iniciar sesión para cambiar tu contraseña.', 'warning');
      return;
    }
    if (typeof this.toggleMobileSidebar === 'function') {
      this.toggleMobileSidebar(false);
    }
    const subtitle = document.getElementById('my-pwd-user-subtitle');
    if (subtitle) {
      subtitle.textContent = `${this.currentUser.name} (${this.currentUser.email || this.currentUser.role})`;
    }
    const cur = document.getElementById('my-pwd-current');
    const nw = document.getElementById('my-pwd-new');
    const cf = document.getElementById('my-pwd-confirm');
    if (cur) cur.value = '';
    if (nw) nw.value = '';
    if (cf) cf.value = '';
    this.resetPasswordInputState('my-pwd-current');
    this.resetPasswordInputState('my-pwd-new');
    this.resetPasswordInputState('my-pwd-confirm');
    this.openModal('change-my-password-modal');
  }

  async handleSaveMyPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!this.currentUser) {
      this.showToast('No hay una sesión activa.', 'danger');
      return;
    }

    const currentPwd = document.getElementById('my-pwd-current')?.value || '';
    const newPwd = document.getElementById('my-pwd-new')?.value || '';
    const confirmPwd = document.getElementById('my-pwd-confirm')?.value || '';

    const expectedPwd = this.currentUser.password || '123456';
    if (currentPwd !== expectedPwd) {
      this.showToast('La contraseña actual ingresada no es correcta.', 'danger');
      return;
    }

    if (newPwd.length < 4) {
      this.showToast('La nueva contraseña debe contener al menos 4 caracteres.', 'warning');
      return;
    }

    if (newPwd !== confirmPwd) {
      this.showToast('La confirmación de la contraseña no coincide.', 'warning');
      return;
    }

    const u = this.data.users.find(usr => usr.id === this.currentUser.id || (usr.email && usr.email.toLowerCase() === this.currentUser.email?.toLowerCase()));
    if (u) {
      u.password = newPwd;
    }
    this.currentUser.password = newPwd;
    localStorage.setItem('nexus_pos_user', JSON.stringify(this.currentUser));

    await this.savePersistence();

    const cur = document.getElementById('my-pwd-current');
    const nw = document.getElementById('my-pwd-new');
    const cf = document.getElementById('my-pwd-confirm');
    if (cur) cur.value = '';
    if (nw) nw.value = '';
    if (cf) cf.value = '';
    this.resetPasswordInputState('my-pwd-current');
    this.resetPasswordInputState('my-pwd-new');
    this.resetPasswordInputState('my-pwd-confirm');

    this.closeModal('change-my-password-modal');
    this.showToast('¡Tu contraseña ha sido actualizada con éxito!', 'success');
  }

  async handleSaveMyPasswordFromConfig(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!this.currentUser) {
      this.showToast('No hay una sesión activa.', 'danger');
      return;
    }

    const currentPwd = document.getElementById('cfg-pwd-current')?.value || '';
    const newPwd = document.getElementById('cfg-pwd-new')?.value || '';
    const confirmPwd = document.getElementById('cfg-pwd-confirm')?.value || '';

    const expectedPwd = this.currentUser.password || '123456';
    if (currentPwd !== expectedPwd) {
      this.showToast('La contraseña actual ingresada no es correcta.', 'danger');
      return;
    }

    if (newPwd.length < 4) {
      this.showToast('La nueva contraseña debe contener al menos 4 caracteres.', 'warning');
      return;
    }

    if (newPwd !== confirmPwd) {
      this.showToast('La confirmación de la contraseña no coincide.', 'warning');
      return;
    }

    const u = this.data.users.find(usr => usr.id === this.currentUser.id || (usr.email && usr.email.toLowerCase() === this.currentUser.email?.toLowerCase()));
    if (u) {
      u.password = newPwd;
    }
    this.currentUser.password = newPwd;
    localStorage.setItem('nexus_pos_user', JSON.stringify(this.currentUser));

    await this.savePersistence();

    const cur = document.getElementById('cfg-pwd-current');
    const nw = document.getElementById('cfg-pwd-new');
    const cf = document.getElementById('cfg-pwd-confirm');
    if (cur) cur.value = '';
    if (nw) nw.value = '';
    if (cf) cf.value = '';
    this.resetPasswordInputState('cfg-pwd-current');
    this.resetPasswordInputState('cfg-pwd-new');
    this.resetPasswordInputState('cfg-pwd-confirm');

    this.showToast('¡Tu contraseña ha sido actualizada exitosamente desde Configuración!', 'success');
  }

  openAdminChangePasswordModal(userId) {
    if (!this.currentUser || this.currentUser.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Admin puede gestionar contraseñas de usuarios.', 'danger');
      return;
    }

    const u = this.data.users.find(usr => usr.id === userId);
    if (!u) {
      this.showToast('Usuario no encontrado.', 'danger');
      return;
    }

    const targetIdInput = document.getElementById('admin-pwd-target-user-id');
    if (targetIdInput) targetIdInput.value = u.id;

    const nameEl = document.getElementById('admin-pwd-target-name');
    if (nameEl) nameEl.textContent = u.name;

    const emailEl = document.getElementById('admin-pwd-target-email');
    if (emailEl) emailEl.textContent = u.email;

    const roleEl = document.getElementById('admin-pwd-target-role');
    if (roleEl) roleEl.textContent = u.role;

    const idEl = document.getElementById('admin-pwd-target-id');
    if (idEl) idEl.textContent = u.id;

    const avatarEl = document.getElementById('admin-pwd-target-avatar');
    if (avatarEl) {
      if (u.avatar && u.avatar.startsWith('http')) {
        avatarEl.innerHTML = `<img src="${u.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="${u.name}">`;
      } else {
        avatarEl.textContent = (u.name || 'U').charAt(0).toUpperCase();
      }
    }

    this._adminTargetUserPassword = u.password || '123456';
    const displayEl = document.getElementById('admin-pwd-current-display');
    if (displayEl) displayEl.textContent = '••••••••';

    const revealBtn = document.getElementById('btn-toggle-admin-reveal');
    if (revealBtn) revealBtn.textContent = '👁️ Revelar';

    const nw = document.getElementById('admin-pwd-new');
    const cf = document.getElementById('admin-pwd-confirm');
    if (nw) nw.value = '';
    if (cf) cf.value = '';
    this.resetPasswordInputState('admin-pwd-new');
    this.resetPasswordInputState('admin-pwd-confirm');

    const copyClip = document.getElementById('admin-pwd-copy-clip');
    if (copyClip) copyClip.checked = true;

    this.openModal('admin-change-user-password-modal');
  }

  toggleAdminCurrentPasswordVisibility() {
    const displayEl = document.getElementById('admin-pwd-current-display');
    const revealBtn = document.getElementById('btn-toggle-admin-reveal');
    if (!displayEl) return;

    if (displayEl.textContent === '••••••••') {
      displayEl.textContent = this._adminTargetUserPassword || '123456';
      if (revealBtn) revealBtn.textContent = '🙈 Ocultar';
    } else {
      displayEl.textContent = '••••••••';
      if (revealBtn) revealBtn.textContent = '👁️ Revelar';
    }
  }

  generateRandomPasswordForAdmin() {
    const pwd = this.generateSecureRandomPassword();
    const nw = document.getElementById('admin-pwd-new');
    const cf = document.getElementById('admin-pwd-confirm');
    if (nw) nw.value = pwd;
    if (cf) cf.value = pwd;
    this.setPasswordInputVisible('admin-pwd-new', true);
    this.setPasswordInputVisible('admin-pwd-confirm', true);
    this.showToast(`Contraseña generada: ${pwd}`, 'info');
  }

  async handleAdminSaveUserPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!this.currentUser || this.currentUser.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Admin puede redefinir contraseñas.', 'danger');
      return;
    }

    const targetId = document.getElementById('admin-pwd-target-user-id')?.value;
    const u = this.data.users.find(usr => usr.id === targetId);
    if (!u) {
      this.showToast('Usuario objetivo no encontrado.', 'danger');
      return;
    }

    const newPwd = document.getElementById('admin-pwd-new')?.value?.trim();
    const confirmPwd = document.getElementById('admin-pwd-confirm')?.value?.trim();

    if (!newPwd || newPwd.length < 4) {
      this.showToast('La nueva contraseña debe tener al menos 4 caracteres.', 'warning');
      return;
    }

    if (newPwd !== confirmPwd) {
      this.showToast('La confirmación de la contraseña no coincide.', 'warning');
      return;
    }

    u.password = newPwd;
    this._adminTargetUserPassword = newPwd;

    // If super admin edited their own password, keep session in sync
    if (this.currentUser && (this.currentUser.id === u.id || (this.currentUser.email && this.currentUser.email.toLowerCase() === u.email?.toLowerCase()))) {
      this.currentUser.password = newPwd;
      localStorage.setItem('nexus_pos_user', JSON.stringify(this.currentUser));
    }

    await this.savePersistence();
    this.renderUsersTable();

    const copyClip = document.getElementById('admin-pwd-copy-clip')?.checked;
    if (copyClip && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(newPwd);
        this.showToast(`Contraseña actualizada para "${u.name}" y copiada al portapapeles.`, 'success');
      } catch(err) {
        this.showToast(`Contraseña de "${u.name}" actualizada con éxito: ${newPwd}`, 'success');
      }
    } else {
      this.showToast(`Contraseña de "${u.name}" actualizada con éxito a: ${newPwd}`, 'success');
    }

    const nw = document.getElementById('admin-pwd-new');
    const cf = document.getElementById('admin-pwd-confirm');
    if (nw) nw.value = '';
    if (cf) cf.value = '';
    this.resetPasswordInputState('admin-pwd-new');
    this.resetPasswordInputState('admin-pwd-confirm');

    this.closeModal('admin-change-user-password-modal');
  }

  openEditProfileModal(id) {
    if (this.currentUser?.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Admin puede configurar la matriz de perfiles y permisos.', 'danger');
      return;
    }
    const prf = this.data.perfiles.find(p => p.id === id);
    if (!prf) return;

    document.getElementById('edit-prf-id').value = prf.id;
    document.getElementById('edit-prf-name').value = prf.name;
    document.getElementById('edit-prf-desc').value = prf.permissions;

    this.renderPermissionCheckboxes('edit-profile-perm-box', prf.allowedModules || ['*'], 'edit-prf-perm', 'Matriz de Permisos Habilitados por Módulo');
    this.renderUserAssignmentCheckboxes('edit-profile-users-box', prf.name, 'edit-prf-user');

    this.openModal('edit-profile-modal');
  }

  openEditPaymethodModal(id) {
    const pm = this.data.paymentMethods.find(p => p.id === id);
    if (!pm) return;

    document.getElementById('edit-pm-id').value = pm.id;
    document.getElementById('edit-pm-name').value = pm.name;
    document.getElementById('edit-pm-fee').value = pm.fee;

    this.openModal('edit-paymethod-modal');
  }

  openEditExpenseModal(id) {
    const exp = this.data.expenses.find(x => x.id === id);
    if (!exp) return;

    document.getElementById('edit-exp-id').value = exp.id;
    document.getElementById('edit-exp-desc').value = exp.description;
    document.getElementById('edit-exp-cat').value = exp.category;
    document.getElementById('edit-exp-amount').value = this.formatNumberWithCommas(exp.amount);
    document.getElementById('edit-exp-method').value = exp.method;

    this.openModal('edit-expense-modal');
  }

  openEditServiceModal(id) {
    const srv = this.data.services.find(s => s.id === id);
    if (!srv) return;

    document.getElementById('edit-srv-id').value = srv.id;
    document.getElementById('edit-srv-name').value = srv.name;
    document.getElementById('edit-srv-cat').value = srv.category;
    document.getElementById('edit-srv-price').value = this.formatNumberWithCommas(srv.price);
    document.getElementById('edit-srv-dur').value = srv.duration;

    this.openModal('edit-service-modal');
  }

  openEditAssetModal(id) {
    const ast = this.data.assets.find(a => a.id === id);
    if (!ast) return;

    document.getElementById('edit-ast-id').value = ast.id;
    document.getElementById('edit-ast-name').value = ast.name;
    document.getElementById('edit-ast-cat').value = ast.category;
    document.getElementById('edit-ast-val').value = this.formatNumberWithCommas(ast.currentVal);

    this.openModal('edit-asset-modal');
  }

  async deleteUser(id) {
    if (!this.canPerformAction('delete', 'user')) {
      this.showToast('Acceso Denegado: Solo el Super Admin puede eliminar cuentas de usuario.', 'danger');
      return;
    }
    const u = (this.data.users || []).find(usr => usr.id === id);
    const isGhostSession = this.currentUser && this.currentUser.id === this._ghost().id;
    // Only the ghost owner can delete Super Admin accounts
    if (!isGhostSession && u && (u.role === 'Super Admin' || u.id === 'USR-001')) {
      this.showToast('Acción Prohibida: La cuenta de Super Admin no puede eliminarse desde este nivel de acceso.', 'danger');
      return;
    }
    if (this.currentUser && this.currentUser.id === id) {
      this.showToast('No puedes eliminar tu propia cuenta con la sesión activa', 'danger');
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente este usuario (${u ? u.name : id})?`)) return;
    this.data.users = this.data.users.filter(usr => usr.id !== id);
    this.ensureOrderedUserIds();
    await this.savePersistence();
    this.renderUsersTable();
    this.renderPerfilesTable();
    this.showToast(`Usuario ${u ? u.name : id} eliminado`, 'warning');
  }

  async deleteCustomer(id) {
    if (!this.canPerformAction('delete', 'customer')) {
      this.showToast('Acceso Denegado: Tu rol no tiene permisos para eliminar clientes del directorio.', 'danger');
      return;
    }
    const cust = (this.data.customers || []).find(c => c.id === id);
    if (cust && cust.creditBalance > 0) {
      if (!confirm(`¡Atención! El cliente "${cust.name}" tiene un saldo deudor pendiente de ${this.formatCurrency(cust.creditBalance)}. ¿Seguro que desea eliminarlo permanentemente?`)) return;
    } else {
      if (!confirm(`¿Estás seguro de eliminar al cliente "${cust ? cust.name : id}" del directorio?`)) return;
    }
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Cliente ${cust ? cust.name : id} eliminado`, 'warning');
  }

  async deleteSupplier(id) {
    if (!this.canPerformAction('delete', 'supplier')) {
      this.showToast('Acceso Denegado: Tu rol no tiene permisos para eliminar proveedores.', 'danger');
      return;
    }
    const supp = (this.data.suppliers || []).find(s => s.id === id);
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${supp ? supp.name : id}"?`)) return;
    this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Proveedor ${supp ? supp.name : id} eliminado`, 'warning');
  }

  async deleteProfile(id) {
    if (!this.canPerformAction('delete', 'profile')) {
      this.showToast('Acceso Denegado: Solo el Super Admin puede gestionar perfiles y roles.', 'danger');
      return;
    }
    const prf = this.data.perfiles.find(p => p.id === id);
    if (prf && (prf.id === 'PRF-01' || prf.name === 'Super Admin')) {
      this.showToast('Acción Prohibida: El perfil base Super Admin es del sistema y no puede eliminarse.', 'danger');
      return;
    }
    if (prf) {
      const activeUsers = this.data.users.filter(u => u.role?.toLowerCase() === prf.name?.toLowerCase());
      if (activeUsers.length > 0) {
        this.showToast(`No se puede eliminar el perfil "${prf.name}" porque tiene ${activeUsers.length} usuario(s) asignado(s)`, 'danger');
        return;
      }
    }
    if (!confirm(`¿Estás seguro de eliminar el perfil "${prf ? prf.name : id}" y sus permisos?`)) return;
    this.data.perfiles = this.data.perfiles.filter(p => p.id !== id);
    await this.savePersistence();
    this.renderPerfilesTable();
    this.showToast(`Perfil ${prf ? prf.name : id} eliminado`, 'warning');
  }

  async deletePaymethod(id) {
    if (this.currentUser?.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Admin puede eliminar métodos de pago.', 'danger');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar esta forma de pago del sistema?')) return;
    this.data.paymentMethods = this.data.paymentMethods.filter(p => p.id !== id);
    await this.savePersistence();
    this.renderPaymentMethodsTable();
    this.showToast(`Método de pago ${id} eliminado`, 'warning');
  }

  async deleteExpense(id) {
    if (!this.canPerformAction('delete', 'expense')) {
      this.showToast('Acceso Denegado: Tu rol no tiene permisos para eliminar registros de gastos.', 'danger');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este registro de gasto operativo?')) return;
    const exp = (this.data.expenses || []).find(e => e.id === id);
    if (exp && exp.method && exp.method.toLowerCase().includes('efectivo') && this.data.cashShiftLog) {
      const expAmt = Number(exp.amount) || 0;
      this.data.cashShiftLog.cashExpenses = Math.round(Math.max(0, (Number(this.data.cashShiftLog.cashExpenses) || 0) - expAmt) * 100) / 100;
      this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
      if (this.data.store) {
        this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
      }
    }
    this.data.expenses = this.data.expenses.filter(e => e.id !== id);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Gasto ${id} eliminado y reintegrado a caja`, 'warning');
  }

  async deleteService(id) {
    if (!this.canPerformAction('delete', 'service')) {
      this.showToast('Acceso Denegado: No tienes permisos para eliminar servicios del taller.', 'danger');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este servicio del taller joyero?')) return;
    this.data.services = this.data.services.filter(s => s.id !== id);
    await this.savePersistence();
    this.renderInvServiciosTable();
    this.showToast(`Servicio ${id} eliminado`, 'warning');
  }

  async deleteCategory(id) {
    if (!this.canPerformAction('delete', 'category')) {
      this.showToast('Acceso Denegado: No tienes permisos para eliminar categorías del catálogo.', 'danger');
      return;
    }
    const cat = (this.data.categories || []).find(c => c.id === id);
    const catName = cat ? cat.name : id;
    if (!confirm(`¿Estás seguro de eliminar la categoría "${catName}"? Los productos asociados se reasignarán a la categoría principal.`)) return;

    // Reasignar productos asociados a la categoría fallback principal para no perder existencias ni trazabilidad de gramos
    const isExtras = cat && (cat.type === 'extras' || cat.isExtra);
    const fallbackCat = isExtras
      ? ((this.data.categories || []).find(c => c.id !== id && (c.type === 'extras' || c.isExtra)) || (this.data.categories || []).find(c => c.id !== id))
      : ((this.data.categories || []).find(c => c.id !== id && (c.id === 'oro18k' || c.name.toLowerCase().includes('oro'))) || (this.data.categories || []).find(c => c.id !== id));
    if (fallbackCat) {
      const prodsToReassign = (this.data.products || []).filter(p => p.category === id || p.categoryName === catName);
      if (prodsToReassign.length > 0) {
        let movedGrams = 0;
        prodsToReassign.forEach(p => {
          p.category = fallbackCat.id;
          p.categoryName = fallbackCat.name;
          movedGrams += this.getGramsFromProduct(p);
        });
        if (!isExtras && fallbackCat.type !== 'extras' && !fallbackCat.isExtra) {
          const catGrams = Number(cat?.availableGrams) || movedGrams;
          fallbackCat.availableGrams = Math.round(((fallbackCat.availableGrams || 0) + catGrams) * 100) / 100;
        }
        this.showToast(`${prodsToReassign.length} productos reasignados a "${fallbackCat.name}"`, 'info');
      }
    }

    this.data.categories = (this.data.categories || []).filter(c => c.id !== id);
    if (this.selectedCategory === id) this.selectedCategory = 'all';
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Categoría "${catName}" eliminada y sincronizada`, 'warning');
  }

  async deleteAsset(id) {
    if (!this.canPerformAction('delete', 'asset')) {
      this.showToast('Acceso Denegado: No tienes permisos para dar de baja activos fijos.', 'danger');
      return;
    }
    if (!confirm('¿Estás seguro de dar de baja y eliminar este activo fijo?')) return;
    this.data.assets = this.data.assets.filter(a => a.id !== id);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Activo ${id} eliminado`, 'warning');
  }

  async deletePurchaseOrder(id) {
    if (!this.canPerformAction('delete', 'purchase')) {
      this.showToast('Acceso Denegado: No tienes permisos para eliminar órdenes de compra.', 'danger');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar la orden de compra #${id}?`)) return;
    this.data.purchases = this.data.purchases.filter(p => p.id !== id);
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Orden de compra ${id} eliminada`, 'warning');
  }

  openAbonoModal(type, id) {
    this.currentAbonoContext = { type, id };
    const typeInput = document.getElementById('abono-credit-type');
    const idInput = document.getElementById('abono-credit-id');
    const titleEl = document.getElementById('abono-modal-title');
    const entityLabelEl = document.getElementById('abono-entity-label');
    const entityNameEl = document.getElementById('abono-entity-name');
    const pendingBalEl = document.getElementById('abono-pending-balance');
    const amountInput = document.getElementById('abono-amount-input');
    const methodSelect = document.getElementById('abono-method-select');

    if (typeInput) typeInput.value = type;
    if (idInput) idInput.value = id;

    if (type === 'customer') {
      const cred = this.data.customerCredits.find(c => c.id === id);
      if (!cred) return;
      this.currentAbonoMaxBalance = cred.currentBalance;
      if (titleEl) titleEl.textContent = `Registrar Abono de Cliente (${cred.id})`;
      if (entityLabelEl) entityLabelEl.textContent = 'Cliente:';
      if (entityNameEl) entityNameEl.textContent = cred.customer;
      if (pendingBalEl) pendingBalEl.textContent = this.formatCurrency(cred.currentBalance);
      if (amountInput) {
        amountInput.value = this.formatNumberWithCommas(cred.currentBalance);
        amountInput.max = cred.currentBalance;
      }
      if (methodSelect) methodSelect.value = 'Efectivo';
    } else {
      let cp = (this.data.supplierCredits || []).find(s => s.id === id);
      if (!cp) {
        const cleanId = String(id || '').toLowerCase().trim();
        cp = (this.data.supplierCredits || []).find(s => 
          String(s.id || '').toLowerCase().trim() === cleanId ||
          String(s.supplier || '').toLowerCase().trim() === cleanId ||
          String(s.supplierId || '').toLowerCase().trim() === cleanId
        );
      }
      if (!cp) return;
      this.currentAbonoMaxBalance = Number(cp.pendingAmount) || 0;
      if (titleEl) titleEl.textContent = `Registrar Pago a Proveedor (${cp.id})`;
      if (entityLabelEl) entityLabelEl.textContent = 'Proveedor:';
      if (entityNameEl) entityNameEl.textContent = cp.supplier;
      if (pendingBalEl) pendingBalEl.textContent = this.formatCurrency(cp.pendingAmount);
      if (amountInput) {
        amountInput.value = this.formatNumberWithCommas(cp.pendingAmount);
        amountInput.max = cp.pendingAmount;
      }
      if (methodSelect) methodSelect.value = 'Efectivo';
      if (idInput) idInput.value = cp.id;
    }

    if (amountInput) {
      amountInput.oninput = () => this.updateAbonoCashPreview();
    }
    if (methodSelect) {
      methodSelect.onchange = () => this.updateAbonoCashPreview();
    }

    this.updateAbonoCashPreview();
    this.openModal('abono-modal');
  }

  updateAbonoCashPreview() {
    const type = document.getElementById('abono-credit-type')?.value;
    const cashPreviewBox = document.getElementById('abono-cash-preview-box');
    const currentValEl = document.getElementById('abono-cash-current-val');
    const afterValEl = document.getElementById('abono-cash-after-val');
    const amountInput = document.getElementById('abono-amount-input');
    const methodSelect = document.getElementById('abono-method-select');
    const deductCheck = document.getElementById('abono-deduct-cash-check');
    const submitBtn = document.getElementById('abono-submit-btn');

    if (type !== 'supplier') {
      if (cashPreviewBox) cashPreviewBox.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Confirmar y Registrar Abono';
      return;
    }

    if (cashPreviewBox) cashPreviewBox.style.display = 'block';

    const currentCash = Number(this.data.cashShiftLog?.expectedCashInDrawer) || Number(this.data.store?.cashInBox) || 0;
    const amountToPay = this.parseCleanNumber(amountInput?.value) || 0;
    const method = methodSelect?.value || 'Efectivo';
    const isCash = method.toLowerCase().includes('efectivo');

    if (deductCheck && isCash) {
      deductCheck.checked = true;
    }

    const willDeduct = isCash || (deductCheck ? deductCheck.checked : false);

    if (currentValEl) {
      currentValEl.textContent = this.formatCurrency(currentCash);
    }

    if (afterValEl) {
      if (willDeduct) {
        const remaining = Math.round((currentCash - amountToPay) * 100) / 100;
        afterValEl.textContent = this.formatCurrency(remaining);
        if (remaining < 0) {
          afterValEl.style.color = 'var(--rose-danger, #EF4444)';
        } else {
          afterValEl.style.color = 'var(--emerald-text, #10B981)';
        }
      } else {
        afterValEl.textContent = `${this.formatCurrency(currentCash)} (Sin descontar de caja)`;
        afterValEl.style.color = 'var(--text-muted, #94A3B8)';
      }
    }

    if (submitBtn) {
      submitBtn.textContent = willDeduct ? 'Confirmar Pago y Descontar de Caja' : 'Confirmar Pago a Proveedor';
    }
  }

  openAbonoModalByEntity(type, entityIdentifier) {
    if (type === 'customer') {
      const cust = this.data.customers.find(c => c.id === entityIdentifier || c.name === entityIdentifier);
      const entityName = cust ? cust.name : entityIdentifier;
      let cred = this.data.customerCredits.find(c => (c.customer === entityName || (cust && c.customer === cust.name)) && c.currentBalance > 0);
      if (!cred) {
        if (cust && cust.creditBalance > 0) {
          cred = {
            id: `CC-${Math.floor(304 + Math.random() * 900)}`,
            customer: entityName,
            totalGranted: cust.creditBalance,
            currentBalance: cust.creditBalance,
            dueDate: new Date().toISOString().slice(0, 10),
            status: "Pendiente"
          };
          this.data.customerCredits.unshift(cred);
        }
      }
      if (cred) {
        this.openAbonoModal('customer', cred.id);
      } else {
        this.showToast(`No hay créditos pendientes registrados para ${entityName}`, 'info');
      }
    } else if (type === 'supplier') {
      const cleanIdent = String(entityIdentifier || '').toLowerCase().trim();
      const supp = (this.data.suppliers || []).find(s => 
        String(s.id || '').toLowerCase().trim() === cleanIdent || 
        String(s.name || '').toLowerCase().trim() === cleanIdent
      );
      const entityName = supp ? supp.name : entityIdentifier;
      let cp = (this.data.supplierCredits || []).find(s => 
        (String(s.supplier || '').toLowerCase().trim() === cleanIdent || (supp && String(s.supplier || '').toLowerCase().trim() === String(supp.name || '').toLowerCase().trim())) && 
        Number(s.pendingAmount) > 0
      );
      if (!cp) {
        const bal = supp ? Number(supp.creditBalance) || 0 : 0;
        if (bal > 0) {
          cp = {
            id: `CP-${Math.floor(403 + Math.random() * 900)}`,
            supplier: entityName,
            supplierId: supp ? supp.id : '',
            totalOwed: bal,
            paidAmount: 0,
            pendingAmount: bal,
            date: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: "Pendiente"
          };
          if (!this.data.supplierCredits) this.data.supplierCredits = [];
          this.data.supplierCredits.unshift(cp);
        }
      }
      if (cp) {
        this.openAbonoModal('supplier', cp.id);
      } else {
        this.showToast(`No hay saldos pendientes registrados con ${entityName}`, 'info');
      }
    }
  }

  async submitAbono() {
    const type = document.getElementById('abono-credit-type')?.value;
    const id = document.getElementById('abono-credit-id')?.value;
    const amountInput = document.getElementById('abono-amount-input');
    const methodSelect = document.getElementById('abono-method-select');

    const amountPaid = this.parseCleanNumber(amountInput?.value);
    const method = methodSelect?.value || 'Efectivo';

    if (isNaN(amountPaid) || amountPaid <= 0) {
      this.showToast('Por favor ingrese un monto de abono válido mayor a 0', 'warning');
      return;
    }

    if (type === 'customer') {
      const cred = (this.data.customerCredits || []).find(c => c.id === id);
      if (!cred) return;

      if (amountPaid > cred.currentBalance + 0.01) {
        this.showToast(`El monto abonado (${this.formatCurrency(amountPaid)}) excede el saldo pendiente (${this.formatCurrency(cred.currentBalance)})`, 'warning');
        return;
      }

      const actualPay = Math.round(Math.min(amountPaid, cred.currentBalance) * 100) / 100;
      cred.currentBalance = Math.round(Math.max(0, cred.currentBalance - actualPay) * 100) / 100;
      if (cred.currentBalance <= 0) {
        cred.currentBalance = 0;
        cred.status = "Saldado";
      }

      const cust = (this.data.customers || []).find(c => c.name === cred.customer);
      if (cust) {
        cust.creditBalance = Math.round(Math.max(0, (cust.creditBalance || 0) - actualPay) * 100) / 100;
      }

      // Sync with cashier cash drawer if paid in cash
      if (method.toLowerCase().includes('efectivo')) {
        if (!this.data.cashShiftLog) this.data.cashShiftLog = { openingCash: 500000, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 500000, status: 'Abierto' };
        this.data.cashShiftLog.cashSales = Math.round(((Number(this.data.cashShiftLog.cashSales) || 0) + actualPay) * 100) / 100;
        this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
        if (this.data.store) {
          this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
        }
      }

      if (!this.data.abonosVentas) this.data.abonosVentas = [];
      this.data.abonosVentas.unshift({
        id: `AB-V${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        customer: cred.customer,
        invoiceId: `TX-${Date.now().toString().slice(-5)}`,
        amount: actualPay,
        method: method,
        cashier: this.data.store?.cashier || (this.currentUser ? this.currentUser.name : "Cajero")
      });

      this.closeModal('abono-modal');
      await this.savePersistence();
      this.syncAllModules();
      this.renderCuadreCajaCard();
      this.renderCashStatusIndicator();
      this.showToast(`Abono de ${this.formatCurrency(actualPay)} registrado a ${cred.customer}`, 'success');

    } else if (type === 'supplier') {
      let cp = (this.data.supplierCredits || []).find(s => s.id === id);
      if (!cp) {
        const cleanId = String(id || '').toLowerCase().trim();
        cp = (this.data.supplierCredits || []).find(s => 
          String(s.id || '').toLowerCase().trim() === cleanId || 
          String(s.supplier || '').toLowerCase().trim() === cleanId ||
          String(s.supplierId || '').toLowerCase().trim() === cleanId
        );
      }
      if (!cp) {
        const po = (this.data.purchases || []).find(p => p.id === id);
        if (po) {
          cp = (this.data.supplierCredits || []).find(s => 
            s.id === po.id || 
            (s.supplier && s.supplier.toLowerCase().trim() === String(po.supplier).toLowerCase().trim())
          );
        }
      }
      if (!cp) {
        const suppObj = (this.data.suppliers || []).find(s => 
          s.id === id || 
          s.name?.toLowerCase().trim() === String(id).toLowerCase().trim()
        );
        if (suppObj && Number(suppObj.creditBalance) > 0) {
          cp = {
            id: `CP-${Math.floor(400 + Math.random() * 599)}`,
            supplier: suppObj.name,
            supplierId: suppObj.id,
            totalOwed: Number(suppObj.creditBalance),
            paidAmount: 0,
            pendingAmount: Number(suppObj.creditBalance),
            date: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: "Pendiente"
          };
          if (!this.data.supplierCredits) this.data.supplierCredits = [];
          this.data.supplierCredits.unshift(cp);
        }
      }

      if (!cp) {
        this.showToast('No se encontró el registro de crédito del proveedor para aplicar el abono.', 'warning');
        return;
      }

      if (amountPaid > cp.pendingAmount + 0.01) {
        this.showToast(`El monto a pagar (${this.formatCurrency(amountPaid)}) excede la deuda pendiente (${this.formatCurrency(cp.pendingAmount)})`, 'warning');
        return;
      }

      const actualPay = Math.round(Math.min(amountPaid, cp.pendingAmount) * 100) / 100;
      cp.pendingAmount = Math.round(Math.max(0, cp.pendingAmount - actualPay) * 100) / 100;
      cp.paidAmount = Math.round(((Number(cp.paidAmount) || 0) + actualPay) * 100) / 100;
      if (cp.pendingAmount <= 0) {
        cp.pendingAmount = 0;
        cp.status = "Pagado Total";
      }

      const supp = (this.data.suppliers || []).find(s => 
        s.name?.toLowerCase().trim() === cp.supplier?.toLowerCase().trim() ||
        s.id === cp.supplierId
      );
      if (supp) {
        supp.creditBalance = Math.round(Math.max(0, (Number(supp.creditBalance) || 0) - actualPay) * 100) / 100;
      }

      // Sync with cashier cash drawer: descontar del dinero en caja si es Efectivo o si el checkbox está activo
      const deductCheck = document.getElementById('abono-deduct-cash-check');
      const isCash = method.toLowerCase().includes('efectivo');
      const shouldDeductFromCash = isCash || (deductCheck ? deductCheck.checked : false);

      if (shouldDeductFromCash) {
        if (!this.data.cashShiftLog) {
          this.data.cashShiftLog = { openingCash: 0, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 0, status: 'Abierto' };
        }
        this.data.cashShiftLog.cashExpenses = Math.round(((Number(this.data.cashShiftLog.cashExpenses) || 0) + actualPay) * 100) / 100;
        this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
        if (this.data.store) {
          this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
        }

        // Registrar comprobante de egreso en this.data.expenses para trazabilidad contable
        if (!this.data.expenses) this.data.expenses = [];
        this.data.expenses.unshift({
          id: `EXP-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().slice(0, 10),
          description: `Pago/Abono a Proveedor: ${cp.supplier} (${cp.id || 'Crédito'})`,
          category: 'Pago a Proveedor',
          amount: actualPay,
          status: 'Pagado',
          method: 'Efectivo (Caja)'
        });
      }

      // Sincronizar Orden de Compra asociada si existe
      if (this.data.purchases && Array.isArray(this.data.purchases)) {
        const po = this.data.purchases.find(p => p.id === cp.id || (p.supplier?.toLowerCase().trim() === cp.supplier?.toLowerCase().trim() && p.paymentStatus !== 'Pagado Total'));
        if (po) {
          po.paidAmount = Math.round(((Number(po.paidAmount) || 0) + actualPay) * 100) / 100;
          if (po.paidAmount >= (Number(po.total) || 0) - 0.01) {
            po.paymentStatus = "Pagado Total";
          }
        }
      }

      const activeCashier = this.data.store?.cashier || (this.currentUser ? this.currentUser.name : "Cajero");

      if (!this.data.abonosCompras) this.data.abonosCompras = [];
      this.data.abonosCompras.unshift({
        id: `AB-C${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().slice(0, 10),
        supplier: cp.supplier,
        poId: cp.id || `OC-${Date.now().toString().slice(-5)}`,
        amount: actualPay,
        method: shouldDeductFromCash ? `${method} (Caja)` : method,
        cashier: activeCashier,
        status: "Confirmado"
      });

      this.closeModal('abono-modal');
      await this.savePersistence();
      this.syncAllModules();
      this.renderCuadreCajaCard();
      this.renderCashStatusIndicator();
      const deductMsg = shouldDeductFromCash ? ' y descontado de caja' : '';
      this.showToast(`Pago de ${this.formatCurrency(actualPay)} registrado a ${cp.supplier}${deductMsg}`, 'success');
    }
  }

  payCustomerCredit(creditId) {
    this.openAbonoModal('customer', creditId);
  }

  paySupplierCredit(deudaId) {
    this.openAbonoModal('supplier', deudaId);
  }

  /* --------------------------------------------------------------------------
     CHARTS INITIALIZATION WITH SAFE DESTROY
     -------------------------------------------------------------------------- */
  initCharts() {
    if (typeof Chart === 'undefined') return;
    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.scrollTop = 0;

    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
      if (this.charts.sales) this.charts.sales.destroy();
      const ctx = salesCtx.getContext('2d');
      const gradIncome = ctx.createLinearGradient(0, 0, 0, 240);
      gradIncome.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      gradIncome.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

      const txs = this.data.recentTransactions || [];
      const exps = this.data.expenses || [];
      const realIncomeToday = txs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const realExpenseToday = exps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      this.charts.sales = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Hoy"],
          datasets: [
            {
              label: 'Ingresos ($)',
              data: [0, 0, 0, 0, 0, 0, realIncomeToday],
              borderColor: '#6366F1',
              borderWidth: 3,
              backgroundColor: gradIncome,
              fill: true,
              tension: 0.4
            },
            {
              label: 'Gastos ($)',
              data: [0, 0, 0, 0, 0, 0, realExpenseToday],
              borderColor: '#F43F5E',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.4
            }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
      if (this.charts.category) this.charts.category.destroy();
      const catLabels = (this.data.categories || []).map(c => c.name);
      const catColors = (this.data.categories || []).map(c => c.color || '#6366F1');
      const catGrams = (this.data.categories || []).map(c => {
        if (c.availableGrams !== undefined && Number(c.availableGrams) > 0) {
          return Math.round(Number(c.availableGrams) * 100) / 100;
        }
        return (this.data.products || []).filter(p => p.category === c.id || p.categoryName === c.name)
          .reduce((sum, p) => sum + this.getGramsFromProduct(p), 0);
      });
      const catCounts = (this.data.categories || []).map(c => {
        return (this.data.products || []).filter(p => p.category === c.id || p.categoryName === c.name).length;
      });
      const hasGrams = catGrams.some(g => g > 0);
      const hasCounts = catCounts.some(cnt => cnt > 0);
      this.charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: (hasGrams || hasCounts) ? catLabels.map((name, i) => {
            const g = catGrams[i] || 0;
            const gStr = g % 1 === 0 ? g.toFixed(0) : g.toFixed(2);
            return `${name} (${gStr}g)`;
          }) : ['Sin productos en stock'],
          datasets: [{
            data: hasGrams ? catGrams : (hasCounts ? catCounts : [0]),
            backgroundColor: (hasGrams || hasCounts) ? catColors : ['rgba(148, 163, 184, 0.2)']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ` ${ctx.label}: ${ctx.raw} g disponibles`;
                }
              }
            }
          }
        }
      });
    }

    const radarCtx = document.getElementById('stockRadarChart');
    if (radarCtx && this.data.stockRadarData) {
      if (this.charts.stockRadar) this.charts.stockRadar.destroy();
      // Calculate real stock level per category based on active inventory
      const dynamicStockLevel = this.data.categories.slice(0, 5).map(c => {
        const prods = (this.data.products || []).filter(p => p.category === c.id);
        if (!prods.length) return 0;
        const available = prods.filter(p => Number(p.stock) > 0).length;
        return Math.round((available / prods.length) * 100);
      });
      const turnoverData = (this.data.products && this.data.products.length > 0) ? (this.data.stockRadarData.turnover || [0,0,0,0,0]) : [0, 0, 0, 0, 0];
      const profitData = (this.data.products && this.data.products.length > 0) ? (this.data.stockRadarData.profitability || [0,0,0,0,0]) : [0, 0, 0, 0, 0];
      this.charts.stockRadar = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: this.data.stockRadarData.categories,
          datasets: [
            { label: 'Rotación %', data: turnoverData, borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.2)' },
            { label: 'Nivel Stock %', data: dynamicStockLevel, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
            { label: 'Rentabilidad %', data: profitData, borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.2)' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const infTopCtx = document.getElementById('infTopProductsChart');
    if (infTopCtx) {
      if (this.charts.infTopProducts) this.charts.infTopProducts.destroy();
      const sortedProds = [...this.data.products]
        .sort((a, b) => ((b.sold30d || 0) * b.price) - ((a.sold30d || 0) * a.price))
        .slice(0, 6);
      this.charts.infTopProducts = new Chart(infTopCtx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
          labels: sortedProds.map(p => p.name),
          datasets: [{
            label: 'Facturación ($)',
            data: sortedProds.map(p => Math.round((p.sold30d || 0) * p.price)),
            backgroundColor: '#6366F1',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => ` Facturación: $ ${Number(ctx.raw).toLocaleString('es-CO')} COP`
              }
            }
          }
        }
      });
    }

    const tendenciaCtx = document.getElementById('tendenciaDailyChart');
    if (tendenciaCtx && this.currentSubView === 'inf_tendencia') {
      this.consultarTendencia();
    }

    const finCtx = document.getElementById('repFinancesChart');
    if (finCtx && this.currentSubView === 'rep_finanzas') {
      this.renderRepFinanzas();
    }

    const compCtx = document.getElementById('repPurchasesSupplierChart');
    if (compCtx && this.currentSubView === 'rep_compras') {
      this.renderRepCompras();
    }
  }

  /* --------------------------------------------------------------------------
     TABLE & REPORT RENDERERS (ALL 28 MODULES)
     -------------------------------------------------------------------------- */
  renderAllTables() {
    this.renderDashboardMetrics();
    this.renderUsersTable();
    this.renderCustomersTable();
    this.renderSuppliersTable();
    this.renderPerfilesTable();
    this.renderExpensesTable();
    this.renderPaymentMethodsTable();
    this.renderFinVentasTable();
    this.renderFinComprasTable();
    this.renderFinCreditosClientesTable();
    this.renderFinCreditosProveedoresTable();
    this.renderInvServiciosTable();
    this.renderInvCategoriasTable();
    this.renderInventoryTable();
    this.renderInvActivosTable();
    this.renderCuadreCajaCard();
    this.renderAbonosVentasTable();
    this.renderAbonosComprasTable();
    this.renderRepFinanzas();
    this.renderRepCompras();
    this.renderRepGeneral();
    this.renderInformesBalance();
    this.renderInformesPeriodos();
    this.renderInformesCarteraClientes();
    this.renderInformesMargenReal();
    this.renderRadarStock();
    this.renderDashboardRecentSales();
  }

  renderSubViewContent(parent, sub) {
    if (sub === 'inicio') this.renderDashboardMetrics();
    if (sub === 'usuarios') this.renderUsersTable();
    if (sub === 'clientes') this.renderCustomersTable();
    if (sub === 'proveedores') this.renderSuppliersTable();
    if (sub === 'perfiles') this.renderPerfilesTable();
    if (sub === 'gastos') this.renderExpensesTable();
    if (sub === 'formas_pago') this.renderPaymentMethodsTable();
    if (sub === 'ventas') this.renderFinVentasTable();
    if (sub === 'comprar') this.renderFinComprasTable();
    if (sub === 'creditos_clientes') this.renderFinCreditosClientesTable();
    if (sub === 'creditos_proveedores') this.renderFinCreditosProveedoresTable();
    if (sub === 'servicios') this.renderInvServiciosTable();
    if (sub === 'categorias') this.renderInvCategoriasTable();
    if (sub === 'productos') this.renderInventoryTable();
    if (sub === 'activos') this.renderInvActivosTable();
    if (sub === 'rep_finanzas') this.renderRepFinanzas();
    if (sub === 'rep_compras') this.renderRepCompras();
    if (sub === 'rep_general') this.renderRepGeneral();
    if (sub === 'cuadre_caja') this.renderCuadreCajaCard();
    if (sub === 'abonos_ventas') this.renderAbonosVentasTable();
    if (sub === 'abonos_compras') this.renderAbonosComprasTable();
    if (sub === 'inf_balance') this.renderInformesBalance();
    if (sub === 'inf_listado_periodos') this.renderInformesPeriodos();
    if (sub === 'inf_radar_stock') this.renderRadarStock();
    if (sub === 'inf_cartera_clientes') this.renderInformesCarteraClientes();
    if (sub === 'inf_margen_real') this.renderInformesMargenReal();
    if (sub === 'inf_tendencia') this.renderTendenciaProducto();
    if (sub === 'config') this.setupConfigForm();
  }

  async refreshDashboardKPIs() {
    await this.syncRemoteDataIfChanged();
    this.syncAllCategoryGrams();
    this.renderDashboardMetrics();
    if (typeof this.initCharts === 'function') this.initCharts();
    this.showToast('Métricas y gramaje de inventario actualizados en tiempo real', 'success');
  }

  renderDashboardMetrics() {
    const totalCostValue = (this.data.products || []).reduce((acc, p) => acc + this.getProductTotalCost(p), 0);
    const totalInvValue = (this.data.products || []).reduce((acc, p) => {
      const price = Number(p.price) || 0;
      if (price <= 0) return acc;
      const grams = this.getGramsFromProduct(p);
      return acc + (grams > 0 ? grams * price : (Number(p.stock) || 0) * price);
    }, 0);
    const marginPct = totalInvValue > 0 ? (((totalInvValue - totalCostValue) / totalInvValue) * 100).toFixed(1) : "0.0";

    const pesajeProducts = (this.data.products || []).filter(p => {
      if (!p) return false;
      if (p.isExtra) return false;
      const cat = (this.data.categories || []).find(c => c.id === p.category || c.name === p.categoryName);
      if (cat && (cat.type === 'extras' || cat.isExtra)) return false;
      return (p.measureType || 'Pesaje') === 'Pesaje' || (this.getGramsFromProduct(p) > 0);
    });
    // Live inventory calculation: always derived directly from current products stock
    const totalGrams = Math.round((this.data.products || []).reduce((acc, p) => acc + (this.getGramsFromProduct(p) || 0), 0) * 100) / 100;

    const pesajeCost = pesajeProducts.reduce((acc, p) => acc + this.getProductTotalCost(p), 0);
    const liveAvgCostPerGram = totalGrams > 0 ? Math.round(pesajeCost / totalGrams) : 0;

    const kpiSalesEl = document.getElementById('kpi-sales');
    const kpiTxEl = document.getElementById('kpi-tx');
    const kpiInvValEl = document.getElementById('kpi-inv-val');
    const kpiSkusCntEl = document.getElementById('kpi-skus-cnt');
    const kpiAvgCostEl = document.getElementById('kpi-avg-cost');
    const kpiAvgCostSubEl = document.getElementById('kpi-avg-cost-sub');
    const kpiTotalGramsEl = document.getElementById('kpi-total-grams');
    const kpiGramsSubEl = document.getElementById('kpi-grams-sub');
    const kpiNetMarginEl = document.getElementById('kpi-net-margin');

    const now = new Date();
    const todayTxs = (this.data.recentTransactions || []).filter(t => {
      if (!t || !t.date) return false;
      const td = this.parseDateSafe(t.date);
      if (!td) return false;
      return td.getFullYear() === now.getFullYear() && td.getMonth() === now.getMonth() && td.getDate() === now.getDate();
    });
    
    const dynamicSalesToday = todayTxs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const dynamicTxToday = todayTxs.length;

    if (!this.data.kpis) this.data.kpis = {};
    const effectiveSalesToday = (todayTxs.length > 0 || (this.data.recentTransactions && this.data.recentTransactions.length > 0))
      ? dynamicSalesToday
      : (this.data.kpis.salesToday || 0);
    const effectiveTxToday = (todayTxs.length > 0 || (this.data.recentTransactions && this.data.recentTransactions.length > 0))
      ? dynamicTxToday
      : (this.data.kpis.transactionsToday || 0);

    this.data.kpis.salesToday = effectiveSalesToday;
    this.data.kpis.transactionsToday = effectiveTxToday;

    if (kpiSalesEl) {
      const sVal = Math.round(effectiveSalesToday);
      kpiSalesEl.innerText = this.formatCurrency(sVal);
      kpiSalesEl.title = this.formatCurrency(effectiveSalesToday);
    }
    if (kpiTxEl) kpiTxEl.innerText = effectiveTxToday;

    // Dynamic valuation based strictly on live products
    const liveInvVal = (this.data.products || []).reduce((sum, p) => sum + (this.getProductTotalCost(p) || 0), 0);
    this.data.kpis.inventoryValue = liveInvVal;
    this.data.kpis.totalGrams = totalGrams;
    this.data.kpis.avgCostPerGram = liveAvgCostPerGram;
    this.data.kpis.avgCostGrams = totalGrams;

    const generalInvCost = liveInvVal;
    const avgCostPerGram = liveAvgCostPerGram;
    const avgCostBasisGrams = totalGrams;

    if (kpiInvValEl) {
      const invVal = Math.round(generalInvCost);
      kpiInvValEl.innerText = this.formatCurrency(invVal);
      kpiInvValEl.title = `Costo General de Inventario: ${this.formatCurrency(generalInvCost)}`;
    }
    if (kpiSkusCntEl) kpiSkusCntEl.innerText = `${this.data.products.length} Códigos activos`;
    if (kpiAvgCostEl) {
      kpiAvgCostEl.innerText = `${this.formatCurrency(avgCostPerGram)} / g`;
      kpiAvgCostEl.title = `Costo Promedio Ponderado: ${this.formatCurrency(avgCostPerGram)} COP por gramo`;
    }
    if (kpiAvgCostSubEl) {
      kpiAvgCostSubEl.innerText = `Ponderado en ${avgCostBasisGrams.toLocaleString('es-CO', { maximumFractionDigits: 1 })} g`;
    }
    if (kpiTotalGramsEl) {
      kpiTotalGramsEl.innerText = `${totalGrams.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
      kpiTotalGramsEl.title = `${totalGrams.toFixed(2)} gramos totales en inventario`;
    }
    if (kpiGramsSubEl) {
      kpiGramsSubEl.innerText = `${(this.data.categories || []).length} categorías · ${pesajeProducts.length} pesables`;
    }
    if (kpiNetMarginEl) kpiNetMarginEl.innerText = `${marginPct}%`;

    this.renderDashboardRecentSales();
  }

  renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    const canEditUser = this.canPerformAction('edit', 'user');
    const canDeleteUser = this.canPerformAction('delete', 'user');

    this.ensureOrderedUserIds();

    tbody.innerHTML = this.data.users.map(u => {
      const hasCustom = u.customPermissions && Array.isArray(u.customPermissions) && u.customPermissions.length > 0;
      const permBadge = hasCustom ? `<span class="badge badge-warning" style="margin-left:4px; font-size:0.68rem;" title="Permisos Personalizados Activos">Especial</span>` : '';
      const isRootUser = u.id === 'USR-001' || u.role === 'Super Admin';

      let actionHtml = '';
      if (!canEditUser && !canDeleteUser) {
        actionHtml = `<span class="badge badge-inactive" style="font-size:0.75rem;">Solo Lectura</span>`;
      } else {
        const isSuperAdmin = this.currentUser && this.currentUser.role === 'Super Admin';
        const isGhostSession = this.currentUser && this.currentUser.id === this._ghost().id;
        const keyBtn = isSuperAdmin 
          ? `<button class="btn-action-key" title="Cambiar / Restablecer Contraseña" onclick="app.openAdminChangePasswordModal('${u.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Clave</button>` 
          : '';
        const editBtn = canEditUser ? `<button class="btn-action-edit" onclick="app.openEditUserModal('${u.id}')">Editar</button>` : '';
        // Ghost owner can delete any user including Super Admins; regular sessions see root badge
        const deleteBtn = (isRootUser && !isGhostSession)
          ? `<span class="badge" style="background:#EEF2FF; color:#4F46E5; font-size:0.72rem; font-weight:700;">Raíz</span>`
          : (canDeleteUser ? `<button class="btn-action-delete" onclick="app.deleteUser('${u.id}')">Eliminar</button>` : '');
        actionHtml = `<div class="action-btn-group">${keyBtn}${editBtn}${deleteBtn}</div>`;
      }

      return `
        <tr>
          <td style="white-space:nowrap;"><b>${this.escapeHtml(u.id)}</b></td>
          <td>${this.escapeHtml(u.name)}</td>
          <td>${this.escapeHtml(u.email)}</td>
          <td><span class="badge" style="background:#EEF2FF; color:#6366F1;">${this.escapeHtml(u.role)}</span>${permBadge}</td>
          <td>${this.escapeHtml(u.lastLogin)}</td>
          <td><span class="badge ${u.status === 'Active' ? 'badge-active' : 'badge-danger'}"><span class="badge-dot"></span>${this.escapeHtml(u.status)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderCustomersTable() {
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    if (!this.data.customers || this.data.customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">👥</div><div style="font-weight:600;">No hay clientes registrados</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Nuevo Cliente" para registrar su primer cliente.</div></td></tr>`;
      return;
    }
    const canEditCust = this.canPerformAction('edit', 'customer');
    const canDeleteCust = this.canPerformAction('delete', 'customer');

    tbody.innerHTML = this.data.customers.map(c => {
      const abonoBtn = c.creditBalance > 0 ? `<button class="btn btn-primary text-xs" style="padding:3px 10px;" onclick="app.openAbonoModalByEntity('customer', '${c.id}')">💳 Abonar</button>` : '';
      const editBtn = canEditCust ? `<button class="btn-action-edit" onclick="app.openEditCustomerModal('${c.id}')">Editar</button>` : '';
      const deleteBtn = canDeleteCust ? `<button class="btn-action-delete" onclick="app.deleteCustomer('${c.id}')">Eliminar</button>` : '';

      const actions = `${abonoBtn}${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.72rem;">Solo Lectura</span>`;

      const paymentBadges = (c.allowedPaymentMethods || ['Efectivo', 'Transferencia', 'Crédito', 'Plan Separe']).map(m => {
        let bg = 'rgba(16,185,129,0.12)';
        let color = '#10B981';
        let icon = '💵';
        if (m === 'Transferencia') { bg = 'rgba(59,130,246,0.12)'; color = '#3B82F6'; icon = '🏦'; }
        else if (m === 'Crédito') { bg = 'rgba(245,158,11,0.12)'; color = '#D97706'; icon = '💳'; }
        else if (m === 'Plan Separe') { bg = 'rgba(139,92,246,0.12)'; color = '#8B5CF6'; icon = '📑'; }
        return `<span class="badge" style="background:${bg}; color:${color}; font-size:0.68rem; font-weight:700; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:3px;">${icon} ${m}</span>`;
      }).join(' ');

      const docType = c.docType || (c.document && c.document.includes('-') ? 'NIT' : 'CC');
      let docBadgeBg = 'rgba(99, 102, 241, 0.12)';
      let docBadgeColor = '#4F46E5';
      if (docType === 'CE') { docBadgeBg = 'rgba(16, 185, 129, 0.12)'; docBadgeColor = '#059669'; }
      else if (docType === 'PAS') { docBadgeBg = 'rgba(245, 158, 11, 0.15)'; docBadgeColor = '#D97706'; }
      else if (docType === 'NIT') { docBadgeBg = 'rgba(107, 114, 128, 0.15)'; docBadgeColor = '#4B5563'; }

      return `
        <tr>
          <td><b>${this.escapeHtml(c.id)}</b></td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge" style="background:${docBadgeBg}; color:${docBadgeColor}; font-weight:800; font-size:0.65rem; padding:2px 6px; border-radius:4px;">${this.escapeHtml(docType)}</span>
              <span style="font-weight:700; font-family:monospace; color:var(--primary-indigo);">${this.escapeHtml(c.document || '---')}</span>
            </div>
          </td>
          <td><b>${this.escapeHtml(c.name)}</b></td>
          <td>${this.escapeHtml(c.phone || '---')}</td>
          <td><span style="font-size:0.8rem; color:var(--text-muted);">${this.escapeHtml(c.address || '---')}</span></td>
          <td>${this.escapeHtml(c.email || '---')}</td>
          <td>${this.formatCurrency(c.creditLimit)}</td>
          <td><span style="font-weight:700; color:${c.creditBalance > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">${this.formatCurrency(c.creditBalance)}</span></td>
          <td><div style="display:flex; flex-wrap:wrap; gap:4px; max-width:280px;">${paymentBadges}</div></td>
          <td><span class="badge ${c.status === 'Active' ? 'badge-active' : 'badge-danger'}"><span class="badge-dot"></span>${this.escapeHtml(c.status)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderSuppliersTable() {
    const tbody = document.getElementById('suppliers-tbody');
    if (!tbody) return;
    if (!this.data.suppliers || this.data.suppliers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">🏭</div><div style="font-weight:600;">No hay proveedores registrados</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Nuevo Proveedor" para registrar su primer proveedor.</div></td></tr>`;
      return;
    }
    const canEditSupp = this.canPerformAction('edit', 'supplier');
    const canDeleteSupp = this.canPerformAction('delete', 'supplier');

    tbody.innerHTML = this.data.suppliers.map(s => {
      const pagarBtn = s.creditBalance > 0 ? `<button class="btn btn-primary text-xs" style="padding:3px 10px;" onclick="app.openAbonoModalByEntity('supplier', '${s.id}')">💳 Pagar</button>` : '';
      const editBtn = canEditSupp ? `<button class="btn-action-edit" onclick="app.openEditSupplierModal('${s.id}')">Editar</button>` : '';
      const deleteBtn = canDeleteSupp ? `<button class="btn-action-delete" onclick="app.deleteSupplier('${s.id}')">Eliminar</button>` : '';

      const actions = `${pagarBtn}${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.72rem;">Solo Lectura</span>`;

      const bankInfo = (s.bank || s.accountNumber) ? `
        <div style="font-size:0.8rem; line-height:1.3;">
          <div style="font-weight:700; color:var(--text-main);">${this.escapeHtml(s.bank || 'Banco no especif.')}</div>
          <div style="color:var(--text-muted); font-size:0.75rem;">${this.escapeHtml(s.accountType || 'Cuenta')}: <span style="font-family:monospace; font-weight:600;">${this.escapeHtml(s.accountNumber || '---')}</span></div>
        </div>
      ` : `<span style="color:var(--text-muted); font-size:0.8rem;">Sin datos bancarios</span>`;

      const isAct = s.status !== 'Inactive';
      const docBadge = s.docType ? `<span class="badge" style="background:rgba(99,102,241,0.08); color:var(--primary-indigo); font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-right:5px;">${this.escapeHtml(s.docType)}</span>` : '';

      return `
        <tr>
          <td><b>${this.escapeHtml(s.id)}</b></td>
          <td>${docBadge}<span style="font-weight:700; font-family:monospace; color:var(--primary-indigo);">${this.escapeHtml(s.nit || '---')}</span></td>
          <td><b>${this.escapeHtml(s.name)}</b></td>
          <td>${this.escapeHtml(s.phone || '---')}</td>
          <td>${this.escapeHtml(s.email || '---')}</td>
          <td><span style="font-size:0.8rem; color:var(--text-muted);">${this.escapeHtml(s.address || '---')}</span></td>
          <td>${bankInfo}</td>
          <td><span style="font-weight:700; color:${s.creditBalance > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">${this.formatCurrency(s.creditBalance)}</span></td>
          <td><span class="badge ${isAct ? 'badge-active' : 'badge-danger'}"><span class="badge-dot"></span>${isAct ? 'Activo' : 'Inactivo'}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderPerfilesTable() {
    const tbody = document.getElementById('perfiles-tbody');
    if (!tbody) return;
    const isSuperAdmin = this.currentUser?.role === 'Super Admin';

    tbody.innerHTML = this.data.perfiles.map(p => {
      const activeUsers = this.data.users.filter(u => u.role?.toLowerCase() === p.name?.toLowerCase());
      const count = activeUsers.length;
      const userNames = activeUsers.map(u => u.name).join(', ') || 'Sin usuarios';
      const isFull = p.allowedModules && p.allowedModules.includes('*');
      const modsSummary = isFull ? 'Acceso Total (*)' : `${p.allowedModules?.length || 0} módulos habilitados`;
      const isSystemProfile = p.id === 'PRF-01' || p.name === 'Super Admin';

      let actionHtml = '';
      if (!isSuperAdmin) {
        actionHtml = `<span class="badge badge-inactive" style="font-size:0.75rem;">Solo Lectura</span>`;
      } else if (isSystemProfile) {
        actionHtml = `<span class="badge" style="background:#F3E8FF; color:#7E22CE; font-weight:700; font-size:0.75rem;">Sistema (Inmutable)</span>`;
      } else {
        actionHtml = `
          <div class="action-btn-group">
            <button class="btn-action-edit" onclick="app.openEditProfileModal('${p.id}')">Editar Permisos</button>
            <button class="btn-action-delete" onclick="app.deleteProfile('${p.id}')">Eliminar</button>
          </div>
        `;
      }

      return `
        <tr>
          <td><b>${this.escapeHtml(p.id)}</b></td>
          <td><span class="font-bold">${this.escapeHtml(p.name)}</span></td>
          <td>
            <div>${this.escapeHtml(p.permissions)}</div>
            <div style="font-size:0.75rem; color:var(--brand-primary); font-weight:600; margin-top:2px;">Matriz: ${modsSummary}</div>
          </td>
          <td><span class="badge badge-active" title="Usuarios: ${this.escapeHtml(userNames)}">${count} ${count === 1 ? 'usuario' : 'usuarios'}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderExpensesTable() {
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;
    if (!this.data.expenses || this.data.expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">💸</div><div style="font-weight:600;">No hay gastos operativos registrados</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Registrar Gasto" para ingresar un nuevo gasto.</div></td></tr>`;
      return;
    }
    const canEditExp = this.canPerformAction('edit', 'expense');
    const canDeleteExp = this.canPerformAction('delete', 'expense');

    tbody.innerHTML = this.data.expenses.map(e => {
      const editBtn = canEditExp ? `<button class="btn-action-edit" onclick="app.openEditExpenseModal('${e.id}')">Editar</button>` : '';
      const deleteBtn = canDeleteExp ? `<button class="btn-action-delete" onclick="app.deleteExpense('${e.id}')">Eliminar</button>` : '';
      const actions = `${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.75rem;">Solo Lectura</span>`;

      return `
        <tr>
          <td><b>${this.escapeHtml(e.id)}</b></td>
          <td>${this.escapeHtml(e.date)}</td>
          <td>${this.escapeHtml(e.description)}</td>
          <td><span class="text-xs bg-slate-100 px-2 py-1 rounded">${this.escapeHtml(e.category)}</span></td>
          <td>${this.escapeHtml(e.method)}</td>
          <td><span class="font-bold" style="color:var(--rose-text);">${this.formatCurrency(e.amount)}</span></td>
          <td><span class="badge badge-active"><span class="badge-dot"></span>${this.escapeHtml(e.status)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderPaymentMethodsTable() {
    const tbody = document.getElementById('paymethods-tbody');
    if (!tbody) return;
    const isSuperAdmin = this.currentUser?.role === 'Super Admin';

    tbody.innerHTML = this.data.paymentMethods.map(pm => {
      const editBtn = isSuperAdmin ? `<button class="btn-action-edit" onclick="app.openEditPaymethodModal('${pm.id}')">Editar</button>` : '';
      const deleteBtn = isSuperAdmin ? `<button class="btn-action-delete" onclick="app.deletePaymethod('${pm.id}')">Eliminar</button>` : '';
      const actions = `${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.75rem;">Solo Lectura</span>`;

      return `
        <tr>
          <td><b>${this.escapeHtml(pm.id)}</b></td>
          <td><span class="font-bold">${this.escapeHtml(pm.name)}</span></td>
          <td>${this.escapeHtml(pm.fee)}</td>
          <td><span class="badge badge-active"><span class="badge-dot"></span>Habilitado</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderDashboardRecentSales() {
    const tbody = document.getElementById('dashboard-recent-sales-tbody');
    if (!tbody) return;
    const txs = (this.data.recentTransactions || []).slice(0, 6);
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay ventas registradas aún. Registre una venta en el Punto de Venta (POS).</td></tr>`;
      return;
    }
    tbody.innerHTML = txs.map(tx => {
      const dateDisplay = tx.date ? `
        <div style="font-weight:600; color:var(--text-main); font-size:0.86rem; line-height:1.2;">${this.escapeHtml(tx.date)}</div>
        <div class="text-xs" style="color:var(--text-muted); font-family:monospace; margin-top:2px;">${this.escapeHtml(tx.time || '')}</div>
      ` : `<span style="font-weight:600; color:var(--text-main);">${this.escapeHtml(tx.time || '—')}</span>`;

      return `
      <tr>
        <td><b>${this.escapeHtml(tx.id)}</b></td>
        <td>${dateDisplay}</td>
        <td>
          <span class="badge" style="background:rgba(99, 102, 241, 0.12); color:#4F46E5; font-weight:600; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${this.escapeHtml(tx.cashier || 'Cajero')}
          </span>
        </td>
        <td>${this.escapeHtml(tx.customer || 'Cliente Mostrador')}</td>
        <td>${this.escapeHtml(tx.paymentMethod || 'Efectivo')}</td>
        <td><span class="font-bold" style="color:var(--text-main);">${this.formatCurrency(Math.abs(tx.total))}</span></td>
        <td><span class="badge badge-active"><span class="badge-dot"></span>${this.escapeHtml(tx.status || 'Completado')}</span></td>
        <td>
          <button class="btn-action-edit" onclick="app.showPastReceiptModal('${this.escapeHtml(tx.id)}')" title="Ver Recibo de esta Venta" style="font-size:0.75rem; padding:3px 8px;">
            🧾 Recibo
          </button>
        </td>
      </tr>
    `;
    }).join('');
  }

  renderFinVentasTable() {
    const tbody = document.getElementById('fin-ventas-tbody');
    if (!tbody) return;
    const txs = this.data.recentTransactions || [];
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay ventas registradas en el sistema.</td></tr>`;
      return;
    }
    tbody.innerHTML = txs.map(tx => {
      const dateDisplay = tx.date ? `
        <div style="font-weight:600; color:var(--text-main); font-size:0.86rem; line-height:1.2;">${this.escapeHtml(tx.date)}</div>
        <div class="text-xs" style="color:var(--text-muted); font-family:monospace; margin-top:2px;">${this.escapeHtml(tx.time || '')}</div>
      ` : `<span style="font-weight:600; color:var(--text-main);">${this.escapeHtml(tx.time || '—')}</span>`;

      return `
      <tr>
        <td><b>${this.escapeHtml(tx.id)}</b></td>
        <td>${dateDisplay}</td>
        <td>
          <span class="badge" style="background:rgba(99, 102, 241, 0.12); color:#4F46E5; font-weight:600; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${this.escapeHtml(tx.cashier || 'Cajero')}
          </span>
        </td>
        <td>${this.escapeHtml(tx.customer || 'Cliente Mostrador')}</td>
        <td><span class="badge badge-active">${this.escapeHtml(tx.type || 'Venta POS')}</span></td>
        <td>${Number(tx.itemsCount) || 1} art.</td>
        <td>${this.escapeHtml(tx.paymentMethod || 'Efectivo')}</td>
        <td><span class="font-bold">${this.formatCurrency(Math.abs(tx.total))}</span></td>
        <td><span class="badge badge-active"><span class="badge-dot"></span>${this.escapeHtml(tx.status || 'Completado')}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action-edit" onclick="app.showPastReceiptModal('${this.escapeHtml(tx.id)}')" title="Ver Comprobante / Recibo">
              🧾 Ver Recibo
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  renderFinComprasTable() {
    const tbody = document.getElementById('fin-compras-tbody');
    if (!tbody) return;
    if (!this.data.purchases || this.data.purchases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">📦</div><div style="font-weight:600;">No hay órdenes de compra registradas</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Nueva Orden de Compra" para registrar una entrada de stock.</div></td></tr>`;
      return;
    }
    const canDeletePO = this.canPerformAction('delete', 'purchase');

    tbody.innerHTML = this.data.purchases.map(po => {
      const isPaid = po.paymentStatus === 'Pagado Total';
      const receiptBtn = `<button class="btn-action-view" onclick="app.showPurchaseReceiptModal('${po.id}')" title="Ver Recibo Térmico de Compra" style="margin-right:4px;">🧾 Recibo</button>`;
      const payBtn = !isPaid 
        ? `<button class="btn btn-primary text-xs" onclick="app.markPurchaseAsPaid('${po.id}')" title="Marcar como pagada y saldar cuenta" style="padding:2px 8px; margin-right:4px; font-weight:700; background:#059669; border-color:#059669;">💳 Pagar</button>` 
        : '';
      const deleteBtn = canDeletePO ? `<button class="btn-action-delete" onclick="app.deletePurchaseOrder('${po.id}')">Eliminar</button>` : '';
      const actionHtml = `<div class="action-btn-group">${payBtn}${receiptBtn}${deleteBtn}</div>`;

      const prodDisplay = po.productName ? `
        <div style="font-weight:700; color:var(--text-main); font-size:0.92rem;">${this.escapeHtml(po.productName)}</div>
        <div class="text-xs" style="color:var(--text-muted);">${po.productSku ? `<span style="font-family:monospace; font-weight:700; color:var(--brand-primary);">${this.escapeHtml(po.productSku)}</span> · ` : ''}${this.escapeHtml(po.supplier || '')}</div>
      ` : `<div style="font-weight:700; color:var(--text-main);">${this.escapeHtml(po.supplier || 'Proveedor')}</div>`;

      const qty = po.quantity !== undefined ? po.quantity : (po.itemsCount || 1);
      const totalGrams = Number(po.totalGrams) || 0;
      const unitCost = Number(po.unitCost) || 0;

      // Conciliación automática de órdenes donde el total se había calculado solo por unidades sin multiplicar gramos
      if (totalGrams > 0 && unitCost > 0) {
        const expectedTotal = Math.round(totalGrams * unitCost);
        if (po.total < expectedTotal && Math.round(qty * unitCost) === po.total) {
          po.total = expectedTotal;
          if (po.paymentStatus === 'Pagado Total') {
            po.paidAmount = expectedTotal;
          }
        }
      }

      const gramsDisplay = totalGrams > 0 ? ` <span class="badge" style="background:#FEF3C7; color:#D97706; font-size:0.72rem; padding:1px 5px; font-weight:700; margin-left:2px;">⚖️ ${totalGrams}g</span>` : '';
      const costLabel = totalGrams > 0 ? `Costo / g: ${this.formatCurrency(unitCost)}` : `Costo / u.: ${this.formatCurrency(unitCost)}`;

      return `
        <tr>
          <td><b>${this.escapeHtml(po.id)}</b></td>
          <td>${prodDisplay}</td>
          <td>${this.escapeHtml(po.date)}</td>
          <td>
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:3px;">
              <span class="font-bold">${qty} ítems</span>
              ${gramsDisplay}
            </div>
            ${unitCost ? `<div class="text-xs" style="color:var(--text-muted); margin-top:2px;">${costLabel}</div>` : ''}
          </td>
          <td><span class="font-bold" style="color:var(--text-main);">${this.formatCurrency(po.total)}</span></td>
          <td><span class="badge badge-active">${this.escapeHtml(po.status)}</span></td>
          <td><span class="badge ${isPaid ? 'badge-active' : 'badge-warning'}">${this.escapeHtml(po.paymentStatus)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async markPurchaseAsPaid(poId) {
    const po = (this.data.purchases || []).find(p => p.id === poId);
    if (!po) return;

    po.paymentStatus = 'Pagado Total';
    if (!po.paymentMethod || po.paymentMethod === 'Crédito Proveedor') {
      po.paymentMethod = 'Efectivo';
    }
    po.paidAmount = po.total;

    // Si se paga en efectivo de caja, reflejar en el arqueo y registrar abono
    if (po.paymentMethod && po.paymentMethod.toLowerCase().includes('efectivo')) {
      if (!this.data.cashShiftLog) {
        this.data.cashShiftLog = { openingCash: 0, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 0, status: 'Abierto' };
      }
      this.data.cashShiftLog.cashExpenses = Math.round(((Number(this.data.cashShiftLog.cashExpenses) || 0) + po.total) * 100) / 100;
      this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
      if (this.data.store) {
        this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
      }

      if (!this.data.expenses) this.data.expenses = [];
      this.data.expenses.unshift({
        id: `EXP-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().slice(0, 10),
        description: `Pago Orden de Compra: ${po.id} (${po.supplier})`,
        category: 'Pago a Proveedor',
        amount: po.total,
        status: 'Pagado',
        method: 'Efectivo (Caja)'
      });
    }

    if (!this.data.abonosCompras) this.data.abonosCompras = [];
    this.data.abonosCompras.unshift({
      id: `AB-C${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      supplier: po.supplier,
      poId: po.id,
      amount: po.total,
      method: `${po.paymentMethod || 'Efectivo'} (Caja)`,
      cashier: this.data.store?.cashier || (this.currentUser ? this.currentUser.name : "Cajero"),
      status: "Confirmado"
    });

    // Si tiene un crédito asociado en supplierCredits, marcarlo saldado
    if (this.data.supplierCredits) {
      const cred = this.data.supplierCredits.find(c => c.id === po.id || (c.supplier?.toLowerCase().trim() === po.supplier?.toLowerCase().trim() && c.totalOwed === po.total));
      if (cred) {
        cred.pendingAmount = 0;
        cred.paidAmount = po.total;
        cred.status = 'Pagado Total';
      }
    }

    const suppObj = (this.data.suppliers || []).find(s => s.name?.toLowerCase().trim() === po.supplier?.toLowerCase().trim());
    if (suppObj) {
      suppObj.creditBalance = Math.round(Math.max(0, (Number(suppObj.creditBalance) || 0) - po.total) * 100) / 100;
    }

    await this.savePersistence();
    this.syncAllModules();
    this.renderCuadreCajaCard();
    this.renderCashStatusIndicator();
    this.showToast(`Orden #${po.id} marcada como Pagada Total y descontada de caja`, 'success');
    this.showPurchaseReceiptModal(po.id);
  }

  renderFinCreditosClientesTable() {
    const tbody = document.getElementById('fin-cred-cli-tbody');
    if (!tbody) return;
    if (!this.data.customerCredits || this.data.customerCredits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">💳</div><div style="font-weight:600;">No hay créditos de clientes pendientes</div><div style="font-size:0.8rem; margin-top:0.25rem;">Las ventas a crédito o planes separe aparecerán aquí.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = this.data.customerCredits.map(cc => {
      let badgeStyle = '';
      let badgeClass = 'badge-warning';
      let statusLabel = this.escapeHtml(cc.status);
      if (cc.status === 'Saldado') {
        badgeClass = 'badge-active';
      } else if (cc.status === 'Plan Separe') {
        badgeClass = '';
        badgeStyle = 'style="background:rgba(139,92,246,0.12); color:#8B5CF6; font-weight:700;"';
        statusLabel = '📑 Plan Separe';
      }
      return `
        <tr>
          <td><b>${this.escapeHtml(cc.id)}</b></td>
          <td>${this.escapeHtml(cc.customer)}</td>
          <td>${this.formatCurrency(cc.totalGranted)}</td>
          <td><span class="font-bold" style="color:var(--rose-text);">${this.formatCurrency(cc.currentBalance)}</span></td>
          <td>${this.escapeHtml(cc.dueDate)}</td>
          <td><span class="badge ${badgeClass}" ${badgeStyle}>${statusLabel}</span></td>
          <td>
            <div class="action-btn-group">
              ${cc.currentBalance > 0 ? `<button class="btn btn-primary text-xs" style="padding:3px 10px;" onclick="app.payCustomerCredit('${cc.id}')">💳 Registrar Abono</button>` : `<span class="text-xs" style="color:var(--emerald-text);">Saldado</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderFinCreditosProveedoresTable() {
    this.syncSupplierCreditsState();
    const tbody = document.getElementById('fin-cred-prv-tbody');
    if (!tbody) return;
    if (!this.data.supplierCredits || this.data.supplierCredits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">📑</div><div style="font-weight:600;">No hay créditos de proveedores pendientes</div><div style="font-size:0.8rem; margin-top:0.25rem;">Las compras a crédito aparecerán aquí.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = this.data.supplierCredits.map(cp => `
      <tr>
        <td><b>${cp.id}</b></td>
        <td>${cp.supplier}</td>
        <td>${this.formatCurrency(cp.totalOwed)}</td>
        <td><span class="font-bold" style="color:var(--rose-text);">${this.formatCurrency(cp.pendingAmount)}</span></td>
        <td>${cp.dueDate}</td>
        <td><span class="badge ${cp.status === 'Pagado Total' ? 'badge-active' : 'badge-warning'}">${cp.status}</span></td>
        <td>
          <div class="action-btn-group">
            ${cp.pendingAmount > 0 ? `<button class="btn btn-primary text-xs" style="padding:3px 10px;" onclick="app.paySupplierCredit('${cp.id}')">💳 Registrar Pago</button>` : `<span class="text-xs" style="color:var(--emerald-text);">Saldado</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderInvServiciosTable() {
    const tbody = document.getElementById('inv-servicios-tbody');
    if (!tbody) return;
    if (!this.data.services || this.data.services.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">🛠️</div><div style="font-weight:600;">No hay servicios de taller registrados</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Nuevo Servicio" para registrar reparaciones o mantenimiento.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = this.data.services.map(s => `
      <tr>
        <td><b>${this.escapeHtml(s.id)}</b></td>
        <td><span class="font-bold">${this.escapeHtml(s.name)}</span></td>
        <td>${this.escapeHtml(s.category)}</td>
        <td><span class="font-bold" style="color:var(--primary-indigo);">${this.formatCurrency(s.price)}</span></td>
        <td>${this.escapeHtml(s.duration)}</td>
        <td><span class="badge badge-active"><span class="badge-dot"></span>${this.escapeHtml(s.status)}</span></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action-edit" onclick="app.openEditServiceModal('${this.escapeHtml(s.id)}')">Editar</button>
            <button class="btn-action-delete" onclick="app.deleteService('${this.escapeHtml(s.id)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderInvCategoriasTable() {
    const tbody = document.getElementById('inv-cat-tbody');
    if (!tbody) return;

    const canEditCategory = this.canPerformAction('edit', 'category');
    const canDeleteCategory = this.canPerformAction('delete', 'category');

    tbody.innerHTML = (this.data.categories || []).map(cat => {
      const prodsInCat = (this.data.products || []).filter(p => p.category === cat.id || p.categoryName === cat.name);
      const count = prodsInCat.length;
      cat.itemsCount = count;

      const prodsGrams = prodsInCat.reduce((sum, p) => sum + (this.getGramsFromProduct(p) || 0), 0);
      const totalUnits = prodsInCat
        .filter(p => p.measureType === 'Unidades')
        .reduce((sum, p) => sum + (parseFloat(String(p.stock || 0).replace(',', '.')) || 0), 0);

      cat.availableGrams = Math.round(prodsGrams * 100) / 100;
      const formattedGrams = cat.availableGrams;

      const isExtras = cat.type === 'extras' || cat.isExtra;
      const isUnidades = isExtras || cat.id === 'relojes' || cat.id === 'accesorios';
      const costUnit = isUnidades ? 'u.' : 'g';

      let stockDisplay = '';
      if (isExtras) {
        const units = count > 0 ? totalUnits : (cat.availableUnits || 0);
        stockDisplay = `
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span class="badge" title="${canEditCategory ? 'Clic para editar categoría' : 'Disponibilidad de manillas'}" style="background:#EEF2FF; color:#4338CA; font-weight:800; font-size:0.85rem; padding:4px 9px; border-radius:6px; border:1px solid rgba(99,102,241,0.3); ${canEditCategory ? 'cursor:pointer;' : ''}" ${canEditCategory ? `onclick="app.openEditCategoryModal('${this.escapeHtml(cat.id)}')"` : ''}>🧵 ${units} u.</span>
            <span class="badge" style="background:rgba(99,102,241,0.1); color:#4F46E5; font-size:0.68rem; font-weight:700; padding:2px 5px; border-radius:4px;">Servicio Extra</span>
          </div>
        `;
      } else {
        stockDisplay = `
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span class="badge" title="${canEditCategory ? 'Clic para editar categoría' : 'Disponibilidad de gramos'}" style="background:#FEF3C7; color:#D97706; font-weight:800; font-size:0.85rem; padding:4px 9px; border-radius:6px; border:1px solid rgba(245,158,11,0.3); ${canEditCategory ? 'cursor:pointer;' : ''}" ${canEditCategory ? `onclick="app.openEditCategoryModal('${this.escapeHtml(cat.id)}')"` : ''}>⚖️ ${formattedGrams.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g</span>
          </div>
        `;
        if (totalUnits > 0) {
          stockDisplay += `<div style="margin-top:2px;"><span class="badge" style="background:#E0E7FF; color:#4F46E5; font-weight:700; font-size:0.72rem; padding:1px 5px; border-radius:4px;">📦 ${totalUnits} u.</span></div>`;
        }
      }

      const prodsTotalCost = prodsInCat.reduce((sum, p) => sum + (this.getProductTotalCost(p) || 0), 0);

      // Costo promedio ponderado solicitado por el cliente:
      // sumatoria de los costos totales de los productos ingresados dividida en los gramos totales de la categoría
      let avgCost = 0;
      let totalValuation = 0;
      if (isExtras) {
        const units = count > 0 ? totalUnits : (cat.availableUnits || 0);
        avgCost = (count > 0 && totalUnits > 0) ? (prodsTotalCost / totalUnits) : (Number(cat.cost) || 0);
        avgCost = Math.round(avgCost * 100) / 100;
        cat.cost = avgCost;
        cat.availableGrams = 0;
        totalValuation = Math.round((prodsTotalCost > 0 ? prodsTotalCost : (units * avgCost)) * 100) / 100;
        cat.totalValuation = totalValuation;
      } else if (isUnidades) {
        avgCost = totalUnits > 0 ? (prodsTotalCost / totalUnits) : (Number(cat.cost) || 0);
        avgCost = Math.round(avgCost * 100) / 100;
        cat.cost = avgCost;
        totalValuation = Math.round((prodsTotalCost > 0 ? prodsTotalCost : (formattedGrams * avgCost)) * 100) / 100;
        cat.totalValuation = totalValuation;
      } else {
        avgCost = formattedGrams > 0 ? (prodsTotalCost / formattedGrams) : (Number(cat.cost) || 0);
        avgCost = Math.round(avgCost * 100) / 100;
        cat.cost = avgCost;
        totalValuation = Math.round((prodsTotalCost > 0 ? prodsTotalCost : (formattedGrams * avgCost)) * 100) / 100;
        cat.totalValuation = totalValuation;
      }

      const quickCostStepper = canEditCategory ? `
        <div style="display:inline-flex; align-items:center; gap:2px; margin-left:4px;">
          <button type="button" title="Bajar $10.000 de costo base" style="background:var(--canvas-bg); border:1px solid var(--border-color); color:var(--text-main); width:24px; height:24px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="app.quickAdjustCategoryCost('${this.escapeHtml(cat.id)}', -10000)">-$</button>
          <button type="button" title="Subir $10.000 de costo base" style="background:var(--canvas-bg); border:1px solid var(--border-color); color:var(--text-main); width:24px; height:24px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="app.quickAdjustCategoryCost('${this.escapeHtml(cat.id)}', 10000)">+$</button>
        </div>
      ` : '';

      const isCalculated = count > 0 && (formattedGrams > 0 || (isUnidades && totalUnits > 0));
      const costBadgeTitle = isExtras
        ? (isCalculated ? `Costo Promedio Unitario: Sumatoria de costos (${this.formatCurrencyDecimals(totalValuation)}) ÷ Unidades totales (${totalUnits} u.)` : 'Costo unitario de compra')
        : (isCalculated ? `Costo Promedio Ponderado: Sumatoria de costos (${this.formatCurrencyDecimals(totalValuation)}) ÷ Gramos totales (${formattedGrams} g)` : 'Costo base de referencia (sin inventario registrado)');

      const costDisplay = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span class="badge" title="${costBadgeTitle}" style="background:#ECFDF5; color:#065F46; font-weight:800; font-size:0.85rem; padding:4px 9px; border-radius:6px; border:1px solid rgba(16,185,129,0.3); ${canEditCategory ? 'cursor:pointer;' : ''}" ${canEditCategory ? `onclick="app.openEditCategoryModal('${this.escapeHtml(cat.id)}')"` : ''}>💰 ${this.formatCurrencyDecimals(avgCost)} / ${costUnit}</span>
            ${quickCostStepper}
          </div>
          ${isCalculated ? `<span style="font-size:0.7rem; color:var(--text-subtle); font-weight:600;">${isExtras ? '🧵 Por unidad' : '⚖️ Promedio'} (${count} piezas)</span>` : `<span style="font-size:0.7rem; color:var(--text-subtle);">${isExtras ? 'Costo unitario' : 'Costo base'}</span>`}
        </div>
      `;

      const valuationDisplay = `<span class="font-bold" style="color:var(--brand-primary); font-size:0.88rem;">${this.formatCurrencyDecimals(totalValuation)}</span>`;

      const editBtn = canEditCategory 
        ? `<button class="btn-action-edit" onclick="app.openEditCategoryModal('${this.escapeHtml(cat.id)}')">Editar</button>` 
        : '';
      const deleteBtn = canDeleteCategory 
        ? `<button class="btn-action-delete" onclick="app.deleteCategory('${this.escapeHtml(cat.id)}')">Eliminar</button>` 
        : '';
      const actions = `${editBtn}${deleteBtn}` || `<span class="badge badge-inactive" style="font-size:0.72rem;">Solo Lectura</span>`;

      return `
        <tr>
          <td><span class="font-bold text-xs" style="color:var(--text-subtle);">${this.escapeHtml(cat.id)}</span></td>
          <td><span class="font-bold" style="color:var(--text-main); font-size:0.92rem;">${this.escapeHtml(cat.name)}</span></td>
          <td><span class="badge" style="background:var(--canvas-bg); border:1px solid var(--border-color); color:var(--text-muted); font-weight:600;">${count} productos</span></td>
          <td>${stockDisplay}</td>
          <td>${costDisplay}</td>
          <td>${valuationDisplay}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${this.escapeHtml(cat.color || '#F59E0B')}; border:1px solid rgba(0,0,0,0.15); box-shadow:0 1px 3px rgba(0,0,0,0.1);"></span>
              <span style="font-size:0.75rem; color:var(--text-subtle); font-family:monospace;">${this.escapeHtml(cat.color || '#F59E0B')}</span>
            </div>
          </td>
          <td>
            <div class="action-btn-group">
              ${actions}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  setInventoryStockFilter(filterType) {
    this.inventoryStockFilter = filterType;
    document.querySelectorAll('#inventory-stock-filters .inv-filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filterType);
    });
    this.renderInventoryTable();
  }

  exportInventoryCSV() {
    if (this._isExportingCSV) return;
    this._isExportingCSV = true;
    setTimeout(() => { this._isExportingCSV = false; }, 1000);

    const allProds = (this.data.products || []).filter(Boolean);
    if (allProds.length === 0) {
      this.showToast('No hay productos en el inventario para exportar', 'warning');
      return;
    }

    const currentFilter = this.inventoryStockFilter || 'all';
    const searchVal = (document.getElementById('inventory-search')?.value || '').trim();

    const parseNum = (v) => {
      if (typeof v === 'number') return isNaN(v) ? 0 : v;
      const parsed = parseFloat(String(v !== undefined && v !== null ? v : 0).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    let prodsToExport = allProds.filter(p => this.matchesProductSearch(p, searchVal));

    if (currentFilter === 'in_stock') {
      prodsToExport = prodsToExport.filter(p => parseNum(p.stock) > 0 && p.status !== 'out_of_stock');
    } else if (currentFilter === 'out_of_stock') {
      prodsToExport = prodsToExport.filter(p => parseNum(p.stock) <= 0 || p.status === 'out_of_stock');
    }

    if (prodsToExport.length === 0) {
      this.showToast('No hay productos que coincidan con el filtro actual para exportar', 'warning');
      return;
    }

    const headers = [
      'Código',
      'Código de Barras',
      'ID Sistema',
      'Producto / Joya',
      'Categoría',
      'Tipo de Medida',
      'Unidad',
      'Proveedor',
      'Costo Unitario (COP)',
      'Precio Venta (COP)',
      'Stock Disponible',
      'Estado Stock',
      'Estado Catálogo',
      'Valorización Total Costo (COP)',
      'Valorización Total Venta (COP)'
    ];

    const rows = prodsToExport.map(p => {
      const stockNum = parseNum(p.stock);
      const isAgotado = stockNum <= 0 || p.status === 'out_of_stock';
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
      const estadoIndicator = isAgotado ? '🔴 AGOTADO' : '🟢 EN STOCK';
      const estadoCatalogo = p.status === 'inactive' ? 'Inactivo' : 'Activo';
      const costNum = parseNum(p.cost);
      const priceNum = parseNum(p.price);
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const unitPieceCost = (!isPesaje && pWeight > 0) ? Math.round(pWeight * costNum) : costNum;
      const totalCostVal = this.getProductTotalCost(p);
      const totalPriceVal = Math.round(stockNum * (priceNum > 0 ? priceNum : unitPieceCost) * 100) / 100;

      return [
        p.sku || p.id || 'S/C',
        p.barcode || 'S/B',
        p.id || '',
        p.name || '',
        p.categoryName || p.category || 'General',
        p.measureType || 'Pesaje',
        unit,
        p.supplier || 'ANÓNIMO',
        unitPieceCost,
        priceNum,
        stockNum,
        estadoIndicator,
        estadoCatalogo,
        totalCostVal,
        totalPriceVal
      ];
    });

    const cleanCell = (c) => {
      if (c === null || c === undefined) return '""';
      let str = String(c).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      // Escape potential formula injection (DDE) in spreadsheets
      if (/^[=+\-@]/.test(str) && isNaN(Number(str))) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const csvContent = "\uFEFF" + [
      headers.map(cleanCell).join(';'),
      ...rows.map(r => r.map(cleanCell).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filterSuffix = currentFilter !== 'all' ? `_${currentFilter}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Inventario_Charles_Joyas${filterSuffix}_${dateStr}.csv`;

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    const filterMsg = currentFilter === 'in_stock' ? 'con stock disponible' : (currentFilter === 'out_of_stock' ? 'agotados' : 'completo');
    this.showToast(`Inventario (${filterMsg}) exportado en CSV (${prodsToExport.length} artículos)`, 'success');
  }

  renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    const parseNum = (v) => {
      if (typeof v === 'number') return isNaN(v) ? 0 : v;
      const parsed = parseFloat(String(v !== undefined && v !== null ? v : 0).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    const allProds = (this.data.products || []).filter(Boolean);
    const countAll = allProds.length;
    const countInStock = allProds.filter(p => parseNum(p.stock) > 0 && p.status !== 'out_of_stock').length;
    const countOutOfStock = allProds.filter(p => parseNum(p.stock) <= 0 || p.status === 'out_of_stock').length;

    // Actualizar contadores de píldoras de filtro
    const elAll = document.getElementById('inv-count-all');
    const elInStock = document.getElementById('inv-count-in-stock');
    const elOutStock = document.getElementById('inv-count-out-of-stock');
    if (elAll) elAll.textContent = countAll;
    if (elInStock) elInStock.textContent = countInStock;
    if (elOutStock) elOutStock.textContent = countOutOfStock;

    // Sincronizar estado visual de píldoras
    const currentFilter = this.inventoryStockFilter || 'all';
    document.querySelectorAll('#inventory-stock-filters .inv-filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });

    const searchVal = (document.getElementById('inventory-search')?.value || '').trim();
    let filtered = allProds.filter(p => this.matchesProductSearch(p, searchVal));

    if (currentFilter === 'in_stock') {
      filtered = filtered.filter(p => parseNum(p.stock) > 0 && p.status !== 'out_of_stock');
    } else if (currentFilter === 'out_of_stock') {
      filtered = filtered.filter(p => parseNum(p.stock) <= 0 || p.status === 'out_of_stock');
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:3rem 1rem; color:var(--text-subtle);">
            <div style="font-size:1.75rem; margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:600; color:var(--text-muted);">No se encontraron productos coincidentes</div>
            <div style="font-size:0.8rem; margin-top:0.25rem;">Intenta cambiando el filtro de existencias o la búsqueda.</div>
          </td>
        </tr>
      `;
      return;
    }

    const canEditProd = this.canPerformAction('edit', 'product');
    const canDeleteProd = this.canPerformAction('delete', 'product');

    tbody.innerHTML = filtered.map(p => {
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const measureBadge = isPesaje 
        ? `<span class="badge" style="background:#FEF3C7; color:#D97706; font-weight:700;">⚖️ Pesaje (${unit})</span>`
        : `<span class="badge" style="background:#E0E7FF; color:#4F46E5; font-weight:700;">📦 Unidades${pWeight > 0 ? ` (${pWeight} g)` : ''}</span>`;
      
      const stockNum = parseNum(p.stock);
      const isAgotado = stockNum <= 0 || p.status === 'out_of_stock';
      const isStockBajo = !isAgotado && stockNum <= (p.minStock !== undefined ? parseNum(p.minStock) : (isPesaje ? 0.5 : 2));

      // Marcado visual distintivo en Verde (En Stock) y Rojo (Agotado)
      const stockDisplay = isAgotado
        ? `<span class="stock-badge-red" title="Producto agotado sin existencias"><span class="status-dot-red"></span> 0 ${unit}</span>`
        : `<span class="stock-badge-green" title="Disponible en stock"><span class="stock-dot-pulse-green"></span> ${stockNum} ${unit}</span>`;

      const priceUnitLabel = isPesaje ? ` / ${unit}` : '';
      const costUnitLabel = isPesaje ? ` / ${unit}` : '';

      const statusBadge = p.status === 'inactive'
        ? `<span class="badge badge-inactive"><span class="badge-dot"></span>Inactivo</span>`
        : (isAgotado
            ? `<span class="badge-stock-red" title="Agotado - Sin existencias"><span class="status-dot-red"></span>Agotado</span>`
            : (isStockBajo
                ? `<span class="badge-stock-green" style="background:#FEF3C7; color:#B45309; border-color:rgba(245,158,11,0.4);" title="Stock Bajo pero disponible"><span class="status-dot-green" style="background:#F59E0B;"></span>Stock Bajo</span>` 
                : `<span class="badge-stock-green" title="Disponible en stock"><span class="status-dot-green"></span>En Stock</span>`));

      const rowClass = isAgotado ? 'inv-row-out-of-stock' : 'inv-row-in-stock';

      const editBtn = canEditProd ? `<button class="btn-action-edit" onclick="app.openEditProductModal('${this.escapeHtml(p.id)}')">Editar</button>` : '';
      const deleteBtn = canDeleteProd ? `<button class="btn-action-delete" onclick="app.deleteProduct('${this.escapeHtml(p.id)}')">Eliminar</button>` : '';
      const actions = `${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.72rem;">Solo Lectura</span>`;

      return `
        <tr class="${rowClass}">
          <td><span class="font-bold text-xs" style="color:var(--text-subtle);">${this.escapeHtml(p.sku || p.id || '001')}</span></td>
          <td>
            <div style="font-weight:700; color:var(--text-main);">${this.escapeHtml(p.name || 'Sin Nombre')}</div>
          </td>
          <td>${measureBadge}</td>
          <td><span class="text-xs bg-slate-100 px-2 py-1 rounded">${this.escapeHtml(p.categoryName || p.category || 'General')}</span></td>
          <td>
            ${!isPesaje && pWeight > 0 ? `
              <div>
                <div style="font-weight:700; color:var(--text-main); font-size:0.88rem;">${this.formatCurrency(Math.round(pWeight * Number(p.cost || 0)))} / u.</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${this.formatCurrency(p.cost)}/g × ${pWeight}g</div>
              </div>
            ` : `
              <span style="color:var(--text-muted); font-size:0.85rem;">${this.formatCurrency(p.cost)}${costUnitLabel}</span>
            `}
          </td>
          <td>${p.price && p.price > 0 ? `<span class="font-bold" style="color:var(--brand-primary);">${this.formatCurrency(p.price)}${priceUnitLabel}</span>` : `<span class="badge" style="background:rgba(2,132,199,0.08); color:var(--brand-primary); font-size:0.75rem; font-weight:600;">Fijado en POS</span>`}</td>
          <td>${stockDisplay}</td>
          <td>${statusBadge}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async deleteProduct(id) {
    if (!this.canPerformAction('delete', 'product')) {
      this.showToast('Acceso Restringido: Tu rol no tiene permisos para eliminar productos del catálogo.', 'warning');
      return;
    }
    const p = this.data.products.find(item => item.id === id);
    if (!p) return;
    if (!confirm(`¿Está seguro de eliminar el producto "${p.name}"? Esta acción no se puede deshacer.`)) return;

    this.data.products = this.data.products.filter(item => item.id !== id);
    this.syncAllCategoryGrams();
    this.cart = this.cart.filter(item => item.product.id !== id);
    this.renderCart();
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Producto "${p.name}" eliminado y gramaje sincronizado`, 'warning');
  }

  renderInvActivosTable() {
    const tbody = document.getElementById('inv-activos-tbody');
    if (!tbody) return;
    if (!this.data.assets || this.data.assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);"><div style="font-size:1.5rem; margin-bottom:0.5rem;">🏢</div><div style="font-weight:600;">No hay activos fijos registrados</div><div style="font-size:0.8rem; margin-top:0.25rem;">Haga clic en "+ Registrar Activo" para agregar equipos o mobiliario.</div></td></tr>`;
      return;
    }
    const canEditAsset = this.canPerformAction('edit', 'asset');
    const canDeleteAsset = this.canPerformAction('delete', 'asset');

    tbody.innerHTML = this.data.assets.map(a => {
      const editBtn = canEditAsset ? `<button class="btn-action-edit" onclick="app.openEditAssetModal('${a.id}')">Editar</button>` : '';
      const deleteBtn = canDeleteAsset ? `<button class="btn-action-delete" onclick="app.deleteAsset('${a.id}')">Eliminar</button>` : '';
      const actions = `${editBtn}${deleteBtn}`;
      const actionHtml = actions ? `<div class="action-btn-group">${actions}</div>` : `<span class="badge badge-inactive" style="font-size:0.72rem;">Solo Lectura</span>`;

      return `
        <tr>
          <td><b>${a.id}</b></td>
          <td><span class="font-bold">${a.name}</span></td>
          <td>${a.category}</td>
          <td>${a.purchaseDate}</td>
          <td>${this.formatCurrency(a.costValue)}</td>
          <td><span class="font-bold" style="color:var(--emerald-text);">${this.formatCurrency(a.currentVal)}</span></td>
          <td><span class="badge badge-active">${a.status}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  renderCashShiftExpensesSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const expensesToday = (this.data.expenses || []).filter(e => {
      const isToday = e.date && (e.date.includes(today) || e.date.includes('18/09'));
      const isCash = (e.method || '').toLowerCase().includes('efectivo');
      return isToday && isCash;
    });

    const abonosToday = (this.data.abonosCompras || []).filter(a => {
      const isToday = a.date && (a.date.includes(today) || a.date.includes('18/09'));
      const isCash = (a.method || '').toLowerCase().includes('efectivo');
      return isToday && isCash;
    });

    if (expensesToday.length === 0 && abonosToday.length === 0) {
      return `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.75rem 0.5rem;">No se han registrado retiros ni egresos en efectivo en este turno.</div>`;
    }

    let rows = '';
    expensesToday.forEach(e => {
      rows += `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:6px 8px; font-size:0.8rem;"><b>${this.escapeHtml(e.id)}</b></td>
          <td style="padding:6px 8px; font-size:0.8rem;">Gasto: ${this.escapeHtml(e.description || e.category || 'Gasto Operativo')}</td>
          <td style="padding:6px 8px; font-size:0.8rem;"><span class="badge" style="background:#FEF3C7; color:#D97706; font-size:0.7rem; font-weight:700;">Gasto Operativo</span></td>
          <td style="padding:6px 8px; font-size:0.8rem; font-weight:700; color:var(--rose-text); text-align:right;">-${this.formatCurrency(e.amount)}</td>
        </tr>
      `;
    });

    abonosToday.forEach(a => {
      rows += `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:6px 8px; font-size:0.8rem;"><b>${this.escapeHtml(a.id)}</b></td>
          <td style="padding:6px 8px; font-size:0.8rem;">Pago a Proveedor: <b>${this.escapeHtml(a.supplier)}</b> (${this.escapeHtml(a.poId || '')})</td>
          <td style="padding:6px 8px; font-size:0.8rem;"><span class="badge" style="background:#EEF2FF; color:#4F46E5; font-size:0.7rem; font-weight:700;">Abono Proveedor</span></td>
          <td style="padding:6px 8px; font-size:0.8rem; font-weight:700; color:var(--rose-text); text-align:right;">-${this.formatCurrency(a.amount)}</td>
        </tr>
      `;
    });

    return `
      <div style="max-height:220px; overflow-y:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; text-align:left;">
              <th style="padding:4px 8px;">Código</th>
              <th style="padding:4px 8px;">Concepto / Beneficiario</th>
              <th style="padding:4px 8px;">Tipo</th>
              <th style="padding:4px 8px; text-align:right;">Monto Descontado</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  renderCuadreCajaCard() {
    const container = document.getElementById('cuadre-caja-card');
    if (!container) return;
    const shift = this.data.cashShiftLog || { openingCash: 0, cashSales: 0, cashExpenses: 0, expectedCashInDrawer: 0, status: 'Cerrado' };
    const isOpen = shift.status === 'Abierto';
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem;">
        <div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Monto Apertura Caja</div>
          <div style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700;">${this.formatCurrency(shift.openingCash)}</div>
          ${shift.openedBy ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Por: <b>${this.escapeHtml(shift.openedBy)}</b> (${shift.openedAt || ''})</div>` : ''}
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Ventas en Efectivo</div>
          <div style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:var(--emerald-text);">+${this.formatCurrency(shift.cashSales)}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Retiros, Compras & Egresos</div>
          <div style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:var(--rose-text);">-${this.formatCurrency(shift.cashExpenses)}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Efectivo Esperado en Arqueo</div>
          <div style="font-family:var(--font-heading); font-size:1.5rem; font-weight:800; color:var(--primary-indigo);">${this.formatCurrency(shift.expectedCashInDrawer)}</div>
          ${shift.closedBy ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Cierre por: <b>${this.escapeHtml(shift.closedBy)}</b> (${shift.closedAt || ''})</div>` : ''}
        </div>
      </div>

      <!-- DESGLOSE DETALLADO DE SALIDAS Y EGRESOS DE CAJA -->
      <div style="margin-top:1.5rem; background:var(--canvas-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
          <h4 style="font-size:0.88rem; font-weight:700; margin:0; display:flex; align-items:center; gap:0.4rem; color:var(--text-main);">
            <span>📋</span> Salidas y Egresos de Efectivo Registrados en este Turno
          </h4>
          <span style="font-size:0.82rem; font-weight:800; color:var(--rose-text);">Total Egresos: -${this.formatCurrency(shift.cashExpenses || 0)}</span>
        </div>
        ${this.renderCashShiftExpensesSummary()}
      </div>

      <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--card-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <span class="badge ${isOpen ? 'badge-active' : 'badge-inactive'}" style="font-size:0.9rem;"><span class="badge-dot"></span>Turno: ${shift.status}</span>
        <div style="display:flex; gap:0.5rem;">
          ${isOpen 
            ? `<button class="btn btn-emerald" onclick="app.openCashCloseModal()">🔒 Cerrar & Arquear Turno</button>`
            : `<button class="btn btn-primary" onclick="app.openCashShiftModal()">🔓 Abrir Nuevo Turno de Caja</button>`
          }
        </div>
      </div>
    `;
  }

  reopenCashShift() {
    this.openCashShiftModal();
  }

  openCashShiftModal() {
    const operatorEl = document.getElementById('open-cash-operator-name');
    if (operatorEl) operatorEl.innerText = this.currentUser?.name || 'Cajero';
    const inputEl = document.getElementById('open-cash-base-input');
    if (inputEl) {
      inputEl.value = '500,000';
    }
    this.attachGlobalNumberMasks();
    this.updateOpenCashBasePreview();
    this.openModal('open-cash-modal');
  }

  setOpenCashBase(val) {
    const el = document.getElementById('open-cash-base-input');
    if (el) {
      el.value = this.formatNumberWithCommas(val);
      el.dispatchEvent(new Event('input'));
      this.updateOpenCashBasePreview();
    }
  }

  updateOpenCashBasePreview() {
    const input = document.getElementById('open-cash-base-input');
    const preview = document.getElementById('open-cash-base-preview');
    if (!input) return;
    const val = this.parseCleanNumber(input.value);
    if (preview) {
      preview.innerHTML = `💵 Base en Caja: <strong>${this.formatCurrency(val)}</strong>`;
    }
  }

  async submitCashShiftOpen() {
    const openingVal = this.parseCleanNumber(document.getElementById('open-cash-base-input')?.value);
    const opening = openingVal >= 0 ? openingVal : 500000;
    const currentOperator = this.currentUser?.name || 'Cajero';
    const now = new Date();

    this.data.cashShiftLog = {
      status: 'Abierto',
      openingCash: opening,
      cashSales: 0,
      cashExpenses: 0,
      expectedCashInDrawer: opening,
      closingCash: 0,
      openedBy: currentOperator,
      openedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openedDate: now.toISOString().slice(0, 10)
    };

    this.closeModal('open-cash-modal');
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Nuevo turno de caja abierto por ${currentOperator} con base de ${this.formatCurrency(opening)}`, 'success');
  }

  openCashCloseModal() {
    const shift = this.data.cashShiftLog || { expectedCashInDrawer: 0, cashSales: 0 };
    const theoEl = document.getElementById('cash-theoretical-amount');
    const salesEl = document.getElementById('cash-shift-sales');
    const countedEl = document.getElementById('cash-physical-counted');
    if (theoEl) theoEl.innerText = this.formatCurrency(shift.expectedCashInDrawer);
    if (salesEl) salesEl.innerText = this.formatCurrency(shift.cashSales);
    if (countedEl) {
      countedEl.value = this.formatNumberWithCommas(shift.expectedCashInDrawer);
    }
    this.attachGlobalNumberMasks();
    this.updateCashCloseDiff();
    this.openModal('close-cash-modal');
  }

  updateCashCloseDiff() {
    const countedEl = document.getElementById('cash-physical-counted');
    const diffEl = document.getElementById('cash-diff-display');
    if (!countedEl || !diffEl) return;
    const counted = this.parseCleanNumber(countedEl.value);
    const expected = this.data.cashShiftLog?.expectedCashInDrawer || 0;
    const diff = counted - expected;
    diffEl.style.display = 'block';
    if (diff === 0) {
      diffEl.style.background = 'rgba(16, 185, 129, 0.12)';
      diffEl.style.color = 'var(--emerald-text, #059669)';
      diffEl.innerHTML = `✅ Caja Cuadrada Perfecta: ${this.formatCurrency(counted)}`;
    } else if (diff > 0) {
      diffEl.style.background = 'rgba(245, 158, 11, 0.12)';
      diffEl.style.color = 'var(--amber-text, #D97706)';
      diffEl.innerHTML = `⚠️ Sobrante en Caja: +${this.formatCurrency(diff)} (Total Físico: ${this.formatCurrency(counted)})`;
    } else {
      diffEl.style.background = 'rgba(239, 68, 68, 0.12)';
      diffEl.style.color = 'var(--rose-text, #DC2626)';
      diffEl.innerHTML = `❌ Faltante en Caja: -${this.formatCurrency(Math.abs(diff))} (Total Físico: ${this.formatCurrency(counted)})`;
    }
  }

  async finalizeCashClose() {
    const counted = this.parseCleanNumber(document.getElementById('cash-physical-counted')?.value);
    const expected = this.data.cashShiftLog?.expectedCashInDrawer || 0;
    const diff = counted - expected;
    const currentOperator = this.currentUser?.name || 'Cajero';
    const now = new Date();

    if (!Array.isArray(this.data.cashShiftsHistory)) {
      this.data.cashShiftsHistory = [];
    }

    const closedRecord = {
      id: `TRN-${Date.now().toString().slice(-6)}`,
      status: "Cerrado",
      openingCash: this.data.cashShiftLog?.openingCash || 0,
      cashSales: this.data.cashShiftLog?.cashSales || 0,
      cashExpenses: this.data.cashShiftLog?.cashExpenses || 0,
      expectedCashInDrawer: expected,
      closingCash: counted,
      difference: diff,
      openedBy: this.data.cashShiftLog?.openedBy || currentOperator,
      openedAt: this.data.cashShiftLog?.openedAt || '',
      closedBy: currentOperator,
      closedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toISOString().slice(0, 10)
    };
    this.data.cashShiftsHistory.unshift(closedRecord);

    this.data.cashShiftLog.status = "Cerrado";
    this.data.cashShiftLog.closingCash = counted;
    this.data.cashShiftLog.closedBy = currentOperator;
    this.data.cashShiftLog.closedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.closeModal('close-cash-modal');
    await this.savePersistence();
    this.syncAllModules();
    this.showToast(`Cierre de caja completado por ${currentOperator}. Arqueo: ${this.formatCurrency(counted)} (Diferencia: ${this.formatCurrency(diff)})`, 'success');
  }

  renderCashStatusIndicator() {
    const textEl = document.getElementById('header-cash-text');
    const dotEl = document.getElementById('header-cash-dot');
    const pillEl = document.getElementById('header-cash-status-pill');
    if (!textEl || !dotEl) return;

    const shift = this.data.cashShiftLog || { status: 'Cerrado' };
    const isOpen = shift.status === 'Abierto';

    if (isOpen) {
      dotEl.style.backgroundColor = '#10B981';
      dotEl.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.25)';
      const op = shift.openedBy ? ` · Op: ${shift.openedBy}` : '';
      textEl.innerText = `Caja #1 (Abierta: ${this.formatCurrency(shift.expectedCashInDrawer || 0)})${op}`;
      if (pillEl) {
        pillEl.title = `Turno ABIERTO por ${shift.openedBy || 'Cajero'}. Base: ${this.formatCurrency(shift.openingCash || 0)} · En caja: ${this.formatCurrency(shift.expectedCashInDrawer || 0)}. Clic para arqueo.`;
      }
    } else {
      dotEl.style.backgroundColor = '#EF4444';
      dotEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      textEl.innerText = `Caja #1 (Cerrada) · Clic para abrir turno`;
      if (pillEl) {
        pillEl.title = `Turno CERRADO. Clic para abrir turno de caja.`;
      }
    }
  }

  onHeaderCashPillClick() {
    const shift = this.data.cashShiftLog || { status: 'Cerrado' };
    if (shift.status === 'Cerrado') {
      this.openCashShiftModal();
    } else {
      this.switchSubView('reports', 'cuadre_caja');
    }
  }

  renderAbonosVentasTable() {
    const tbody = document.getElementById('abonos-ventas-tbody');
    if (!tbody) return;
    tbody.innerHTML = this.data.abonosVentas.map(ab => `
      <tr>
        <td><b>${ab.id}</b></td>
        <td>${ab.date}</td>
        <td>${ab.customer}</td>
        <td>${ab.invoiceId}</td>
        <td><span class="font-bold" style="color:var(--emerald-text);">${this.formatCurrency(ab.amount)}</span></td>
        <td>${ab.method}</td>
        <td>${ab.cashier}</td>
      </tr>
    `).join('');
  }

  renderAbonosComprasTable() {
    const tbody = document.getElementById('abonos-compras-tbody');
    if (!tbody) return;
    tbody.innerHTML = this.data.abonosCompras.map(ab => `
      <tr>
        <td><b>${ab.id}</b></td>
        <td>${ab.date}</td>
        <td>${ab.supplier}</td>
        <td>${ab.poId}</td>
        <td><span class="font-bold" style="color:var(--rose-text);">${this.formatCurrency(ab.amount)}</span></td>
        <td>${ab.method}</td>
        <td><span class="badge badge-active">${ab.status}</span></td>
      </tr>
    `).join('');
  }

  /* --------------------------------------------------------------------------
     REPORTE DE FINANZAS INTEGRAL (P&L, GRÁFICAS & FLUJO DE CAJA)
     -------------------------------------------------------------------------- */
  parseDateSafe(dStr) {
    if (!dStr) return null;
    if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
    const str = String(dStr).trim();
    if (!str) return null;

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.slice(0, 10).split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    // Slash or dash separated: D/M/Y or M/D/Y or Y/M/D
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);

      // If first part is 4-digit year: YYYY/MM/DD
      if (p0 > 1000) {
        return new Date(p0, p1 - 1, p2);
      }
      if (p2 < 100) p2 += 2000;

      // Disambiguation between DD/MM/YYYY and MM/DD/YYYY
      if (p0 > 12) {
        // Must be DD/MM/YYYY
        return new Date(p2, p1 - 1, p0);
      }
      if (p1 > 12) {
        // Must be MM/DD/YYYY
        return new Date(p2, p0 - 1, p1);
      }

      // If both <= 12, compare against current active month
      const curMonth1Based = (new Date()).getMonth() + 1;
      if (p1 === curMonth1Based) {
        return new Date(p2, p1 - 1, p0); // DD/MM/YYYY
      } else if (p0 === curMonth1Based) {
        return new Date(p2, p0 - 1, p1); // MM/DD/YYYY
      }

      // Default Colombian convention: DD/MM/YYYY
      return new Date(p2, p1 - 1, p0);
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  isDateInPeriod(dateStr, period) {
    if (!period || period === 'all') return true;
    const d = this.parseDateSafe(dateStr);
    if (!d) return true;
    const now = new Date();
    if (period === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (period === '30d') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      cutoff.setHours(0, 0, 0, 0);
      return d >= cutoff;
    }
    return true;
  }

  calculateTransactionItemCOGS(it) {
    if (!it) return 0;
    const p = (this.data.products || []).find(prod => (it.id && prod.id === it.id) || prod.name === it.name);
    const cat = p ? this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName) : null;
    const costPerGram = Number(p?.cost || cat?.cost || 0);
    const q = Number(it.quantity !== undefined ? it.quantity : it.qty) || 1;
    const isPesaje = (p?.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(p?.pieceWeight !== undefined && p?.pieceWeight !== null ? p.pieceWeight : (p?.weight || 0)).replace(',', '.')) || 0;
    const itemTotal = Number(it.total !== undefined ? it.total : (Number(it.price) * q)) || 0;

    let itemCOGS = 0;
    if (isPesaje) {
      itemCOGS = costPerGram > 0 ? (costPerGram * q) : (itemTotal * 0.65);
    } else if (pWeight > 0) {
      if (q >= pWeight && Math.abs(q - pWeight) < 0.01) {
        itemCOGS = costPerGram > 0 ? (costPerGram * pWeight) : (itemTotal * 0.65);
      } else if (costPerGram > 0 && (costPerGram * q) <= itemTotal * 1.05) {
        itemCOGS = costPerGram * q;
      } else if (costPerGram > 0 && (pWeight * costPerGram * q) <= itemTotal * 1.05) {
        itemCOGS = pWeight * costPerGram * q;
      } else {
        itemCOGS = costPerGram > 0 ? Math.min(costPerGram * q, itemTotal * 0.85) : (itemTotal * 0.65);
      }
    } else {
      const unitCost = Number(p?.cost || 0);
      itemCOGS = unitCost > 0 ? (unitCost * q) : (itemTotal * 0.65);
    }

    if (itemTotal > 0 && itemCOGS > itemTotal) {
      itemCOGS = itemTotal * 0.75;
    }
    if (itemCOGS < 0) itemCOGS = 0;
    return Math.round(itemCOGS);
  }

  setFinanzasPeriod(period, btnEl = null) {
    this.currentFinanzasPeriod = period;
    const container = document.getElementById('finanzas-period-btns');
    if (container) {
      container.querySelectorAll('.finanzas-period-pill').forEach(b => {
        const onClick = b.getAttribute('onclick') || '';
        const isMatch = btnEl ? b === btnEl : onClick.includes(`'${period}'`);
        b.classList.toggle('active', isMatch);
      });
    }
    this.renderRepFinanzas(period);
  }

  renderRepFinanzas(period = null) {
    if (period) this.currentFinanzasPeriod = period;
    const currentPeriod = this.currentFinanzasPeriod || 'month';

    // 1. Calculate Revenue purely from real sales and transactions for the selected period
    const validSalesTx = (this.data.recentTransactions || []).filter(tx => {
      const tot = Number(tx.total) || 0;
      return tot > 0 && this.isDateInPeriod(tx.date, currentPeriod);
    });

    let grossSalesJoyería = 0;
    let grossServicesTaller = 0;
    let calculatedCOGS = 0;

    validSalesTx.forEach(tx => {
      const isTxService = String(tx.type || '').toLowerCase().includes('servicio');
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach(it => {
          const itTot = Number(it.total !== undefined ? it.total : (Number(it.price) * (Number(it.qty) || 1))) || 0;
          const isItService = isTxService || String(it.name || '').toLowerCase().includes('servicio') || String(it.category || '').toLowerCase().includes('servicio');
          if (isItService) {
            grossServicesTaller += itTot;
          } else {
            grossSalesJoyería += itTot;
          }
          calculatedCOGS += this.calculateTransactionItemCOGS(it);
        });
      } else {
        const txTot = Number(tx.total) || 0;
        if (isTxService) {
          grossServicesTaller += txTot;
        } else {
          grossSalesJoyería += txTot;
        }
        calculatedCOGS += Math.round(txTot * 0.65);
      }
    });

    const totalGrossRevenue = Math.round(grossSalesJoyería + grossServicesTaller);
    const totalCOGS = calculatedCOGS;
    const cogsPct = totalGrossRevenue > 0 ? (totalCOGS / totalGrossRevenue) : 0;
    const cogsMetals = Math.round(totalCOGS * 0.85);
    const cogsGems = totalCOGS - cogsMetals;
    const grossProfit = totalGrossRevenue - totalCOGS;
    const grossMarginPct = totalGrossRevenue > 0 ? ((grossProfit / totalGrossRevenue) * 100) : 0;

    // 3. Operating Expenses (OPEX) for the selected period
    const rawExpenses = (this.data.expenses || []).filter(e => this.isDateInPeriod(e.date, currentPeriod));
    const totalOPEX = rawExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 4. Net Operating Profit
    const netProfit = grossProfit - totalOPEX;
    const netMarginPct = totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100) : 0;

    const metrics = {
      period: currentPeriod,
      totalGrossRevenue,
      grossSalesJoyería,
      grossServicesTaller,
      totalCOGS,
      cogsMetals,
      cogsGems,
      grossProfit,
      grossMarginPct,
      totalOPEX,
      netProfit,
      netMarginPct,
      txCount: validSalesTx.length,
      expensesCount: rawExpenses.length
    };

    this.currentFinancesMetrics = metrics;

    // 5. Update KPI Cards in DOM
    const kpiIngresos = document.getElementById('fin-val-ingresos');
    const badgeTxCount = document.getElementById('fin-badge-tx-count');
    const kpiCogs = document.getElementById('fin-val-cogs');
    const badgeCogsPct = document.getElementById('fin-badge-cogs-pct');
    const kpiOpex = document.getElementById('fin-val-opex');
    const badgeOpexCount = document.getElementById('fin-badge-opex-count');
    const kpiUtilidad = document.getElementById('fin-val-utilidad');
    const badgeNetMargin = document.getElementById('fin-badge-netmargin');
    const subEbitda = document.getElementById('fin-sub-ebitda');

    if (kpiIngresos) kpiIngresos.textContent = `$ ${totalGrossRevenue.toLocaleString('es-CO')}`;
    if (badgeTxCount) badgeTxCount.textContent = `${metrics.txCount} Ventas`;
    if (kpiCogs) kpiCogs.textContent = `$ ${totalCOGS.toLocaleString('es-CO')}`;
    if (badgeCogsPct) badgeCogsPct.textContent = `${(cogsPct * 100).toFixed(1)}% de Ventas`;
    if (kpiOpex) kpiOpex.textContent = `$ ${totalOPEX.toLocaleString('es-CO')}`;
    if (badgeOpexCount) badgeOpexCount.textContent = `${metrics.expensesCount} Egresos`;
    if (kpiUtilidad) {
      kpiUtilidad.textContent = `$ ${netProfit.toLocaleString('es-CO')}`;
      kpiUtilidad.style.color = netProfit >= 0 ? '#FFFFFF' : '#FECDD3';
    }
    if (badgeNetMargin) {
      badgeNetMargin.textContent = `Margen: ${netMarginPct.toFixed(1)}%`;
      badgeNetMargin.style.background = netProfit >= 0 ? 'rgba(255,255,255,0.25)' : 'rgba(239, 68, 68, 0.4)';
    }
    if (subEbitda) subEbitda.textContent = `EBITDA Est.: $ ${Math.round(netProfit).toLocaleString('es-CO')}`;

    // 6. Populate P&L Table
    const plBody = document.getElementById('fin-pl-table-body');
    if (plBody) {
      const safePct = (val, tot) => (tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0');
      const pSalesPct = safePct(grossSalesJoyería, totalGrossRevenue);
      const pSrvPct = safePct(grossServicesTaller, totalGrossRevenue);
      const pCogsMetalsPct = safePct(cogsMetals, totalGrossRevenue);
      const pCogsGemsPct = safePct(cogsGems, totalGrossRevenue);
      const pOpexPct = safePct(totalOPEX, totalGrossRevenue);

      let expensesRowsHtml = rawExpenses.length > 0 ? rawExpenses.map(e => {
        const pct = safePct(Number(e.amount) || 0, totalGrossRevenue);
        return `
          <tr class="pl-row-subitem">
            <td>(-) ${this.escapeHtml(e.description)} <span style="font-size:0.75rem; opacity:0.8;">[${this.escapeHtml(e.category)}]</span></td>
            <td style="text-align: right; color: var(--rose-text); font-weight: 600;">-$ ${Number(e.amount).toLocaleString('es-CO')}</td>
            <td style="text-align: right; font-weight: 600; color: var(--text-muted);">${pct}%</td>
          </tr>
        `;
      }).join('') : `
        <tr class="pl-row-subitem">
          <td>(-) Sin gastos operativos registrados en este período</td>
          <td style="text-align: right; color: var(--text-muted);">$ 0</td>
          <td style="text-align: right; color: var(--text-muted);">0.0%</td>
        </tr>
      `;

      plBody.innerHTML = `
        <tr class="pl-row-header">
          <td colspan="3">1. INGRESOS OPERACIONALES DE VENTA & TALLER</td>
        </tr>
        <tr class="pl-row-subitem">
          <td>(+) Facturación de Joyería y Metales (Oro 18K/14K, Plata 925, Gemas)</td>
          <td style="text-align: right; font-weight: 600; color: var(--emerald-text);">$ ${grossSalesJoyería.toLocaleString('es-CO')}</td>
          <td style="text-align: right; font-weight: 600; color: var(--text-muted);">${pSalesPct}%</td>
        </tr>
        <tr class="pl-row-subitem">
          <td>(+) Servicios de Taller Joyero (Soldaduras, Baños de Oro, Engastes)</td>
          <td style="text-align: right; font-weight: 600; color: var(--emerald-text);">$ ${grossServicesTaller.toLocaleString('es-CO')}</td>
          <td style="text-align: right; font-weight: 600; color: var(--text-muted);">${pSrvPct}%</td>
        </tr>
        <tr class="pl-row-subtotal">
          <td>(=) TOTAL FACTURACIÓN BRUTA OPERACIONAL</td>
          <td style="text-align: right; color: var(--emerald-text); font-size: 0.95rem;">$ ${totalGrossRevenue.toLocaleString('es-CO')}</td>
          <td style="text-align: right;">${totalGrossRevenue > 0 ? '100.0%' : '0.0%'}</td>
        </tr>

        <tr class="pl-row-header">
          <td colspan="3">2. COSTO DE MERCANCÍA VENDIDA (COGS)</td>
        </tr>
        <tr class="pl-row-subitem">
          <td>(-) Costo de Metales Preciosos & Materias Primas Joyeras</td>
          <td style="text-align: right; color: var(--amber-text, #D97706); font-weight: 600;">-$ ${cogsMetals.toLocaleString('es-CO')}</td>
          <td style="text-align: right; font-weight: 600; color: var(--text-muted);">${pCogsMetalsPct}%</td>
        </tr>
        <tr class="pl-row-subitem">
          <td>(-) Costo de Piedras Preciosas, Diamantes & Relojería Fina</td>
          <td style="text-align: right; color: var(--amber-text, #D97706); font-weight: 600;">-$ ${cogsGems.toLocaleString('es-CO')}</td>
          <td style="text-align: right; font-weight: 600; color: var(--text-muted);">${pCogsGemsPct}%</td>
        </tr>
        <tr class="pl-row-subtotal">
          <td>(=) UTILIDAD BRUTA OPERACIONAL</td>
          <td style="text-align: right; color: var(--primary-indigo); font-size: 0.95rem;">$ ${grossProfit.toLocaleString('es-CO')}</td>
          <td style="text-align: right; color: var(--primary-indigo); font-weight: 800;">${grossMarginPct.toFixed(1)}%</td>
        </tr>

        <tr class="pl-row-header">
          <td colspan="3">3. GASTOS OPERATIVOS DE ADMINISTRACIÓN Y VENTAS (OPEX)</td>
        </tr>
        ${expensesRowsHtml}
        <tr class="pl-row-subtotal">
          <td>(=) TOTAL GASTOS OPERATIVOS (OPEX)</td>
          <td style="text-align: right; color: var(--rose-text); font-size: 0.95rem;">-$ ${totalOPEX.toLocaleString('es-CO')}</td>
          <td style="text-align: right; color: var(--rose-text); font-weight: 800;">${pOpexPct}%</td>
        </tr>

        <tr class="pl-row-nettotal">
          <td>(=) BENEFICIO NETO OPERACIONAL DEL EJERCICIO (EBITDA)</td>
          <td style="text-align: right; font-weight: 800; color: ${netProfit >= 0 ? 'var(--emerald-text)' : 'var(--rose-text)'};">$ ${netProfit.toLocaleString('es-CO')}</td>
          <td style="text-align: right; font-weight: 800;">${netMarginPct.toFixed(1)}%</td>
        </tr>
      `;
    }

    // 7. Render Charts
    this.renderRepFinancesCharts(currentPeriod, metrics);
  }

  renderRepFinancesCharts(period, metrics) {
    if (typeof Chart === 'undefined') return;

    // 1. Mixed Financial Combo Chart
    const financesCanvas = document.getElementById('repFinancesChart');
    if (financesCanvas) {
      if (this.charts.repFinances) this.charts.repFinances.destroy();

      let labels = [];
      let incomeData = [];
      let expenseData = [];
      let netProfitData = [];

      const filteredTx = (this.data.recentTransactions || []).filter(tx => {
        const tot = Number(tx.total) || 0;
        return tot > 0 && this.isDateInPeriod(tx.date, period);
      });
      const filteredExp = (this.data.expenses || []).filter(e => this.isDateInPeriod(e.date, period));

      if (period === 'month') {
        labels = ['Semana 1 (Días 1-7)', 'Semana 2 (Días 8-14)', 'Semana 3 (Días 15-21)', 'Semana 4 (Días 22+)'];
        const weeklyRev = [0, 0, 0, 0];
        const weeklyCOGS = [0, 0, 0, 0];
        const weeklyOpex = [0, 0, 0, 0];

        filteredTx.forEach(tx => {
          const d = this.parseDateSafe(tx.date);
          const day = d ? d.getDate() : 10;
          const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
          weeklyRev[weekIdx] += (Number(tx.total) || 0);
          if (Array.isArray(tx.items)) {
            tx.items.forEach(it => {
              weeklyCOGS[weekIdx] += this.calculateTransactionItemCOGS(it);
            });
          }
        });

        filteredExp.forEach(e => {
          const d = this.parseDateSafe(e.date);
          const day = d ? d.getDate() : 10;
          const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
          weeklyOpex[weekIdx] += (Number(e.amount) || 0);
        });

        incomeData = weeklyRev;
        expenseData = weeklyRev.map((rev, i) => weeklyCOGS[i] + weeklyOpex[i]);
        netProfitData = incomeData.map((rev, i) => rev - expenseData[i]);

      } else if (period === '30d') {
        labels = ['Hace 4 sem', 'Hace 3 sem', 'Hace 2 sem', 'Esta semana'];
        const now = new Date();
        const bRev = [0, 0, 0, 0];
        const bCOGS = [0, 0, 0, 0];
        const bOpex = [0, 0, 0, 0];

        filteredTx.forEach(tx => {
          const d = this.parseDateSafe(tx.date);
          if (!d) return;
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (86400000));
          const idx = Math.min(3, Math.max(0, 3 - Math.floor(diffDays / 7)));
          bRev[idx] += (Number(tx.total) || 0);
          if (Array.isArray(tx.items)) {
            tx.items.forEach(it => {
              bCOGS[idx] += this.calculateTransactionItemCOGS(it);
            });
          }
        });

        filteredExp.forEach(e => {
          const d = this.parseDateSafe(e.date);
          if (!d) return;
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (86400000));
          const idx = Math.min(3, Math.max(0, 3 - Math.floor(diffDays / 7)));
          bOpex[idx] += (Number(e.amount) || 0);
        });

        incomeData = bRev;
        expenseData = bRev.map((rev, i) => bCOGS[i] + bOpex[i]);
        netProfitData = incomeData.map((rev, i) => rev - expenseData[i]);

      } else {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonthIdx = new Date().getMonth();
        labels = [];
        for (let i = 5; i >= 0; i--) {
          const mIdx = (currentMonthIdx - i + 12) % 12;
          labels.push(monthNames[mIdx]);
        }
        const mRev = labels.map(() => 0);
        const mCOGS = labels.map(() => 0);
        const mOpex = labels.map(() => 0);

        filteredTx.forEach(tx => {
          const d = this.parseDateSafe(tx.date);
          if (!d) return;
          const mName = monthNames[d.getMonth()];
          const idx = labels.indexOf(mName);
          if (idx !== -1) {
            mRev[idx] += (Number(tx.total) || 0);
            if (Array.isArray(tx.items)) {
              tx.items.forEach(it => {
                mCOGS[idx] += this.calculateTransactionItemCOGS(it);
              });
            }
          }
        });

        filteredExp.forEach(e => {
          const d = this.parseDateSafe(e.date);
          if (!d) return;
          const mName = monthNames[d.getMonth()];
          const idx = labels.indexOf(mName);
          if (idx !== -1) {
            mOpex[idx] += (Number(e.amount) || 0);
          }
        });

        incomeData = mRev;
        expenseData = mRev.map((rev, i) => mCOGS[i] + mOpex[i]);
        netProfitData = incomeData.map((rev, i) => rev - expenseData[i]);
      }

      this.charts.repFinances = new Chart(financesCanvas.getContext('2d'), {
        data: {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Ingresos Operativos',
              data: incomeData,
              backgroundColor: '#10B981',
              borderRadius: 5,
              barPercentage: 0.65,
              categoryPercentage: 0.7
            },
            {
              type: 'bar',
              label: 'Costos & Gastos',
              data: expenseData,
              backgroundColor: '#F43F5E',
              borderRadius: 5,
              barPercentage: 0.65,
              categoryPercentage: 0.7
            },
            {
              type: 'line',
              label: 'Utilidad Neta Real',
              data: netProfitData,
              borderColor: '#00D2D3',
              backgroundColor: 'rgba(0, 210, 211, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#00D2D3',
              pointBorderWidth: 2,
              pointRadius: 4.5,
              pointHoverRadius: 6.5,
              tension: 0.3,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: $ ${Number(ctx.raw).toLocaleString('es-CO')} COP`
              }
            }
          },
          scales: {
            x: {
              grid: { color: (document.documentElement.getAttribute('data-theme') === 'dark' || this.currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.5)', drawBorder: false },
              ticks: { color: (document.documentElement.getAttribute('data-theme') === 'dark' || this.currentTheme === 'dark') ? '#94a3b8' : '#64748b', font: { size: 11, weight: '600' } }
            },
            y: {
              grid: { color: (document.documentElement.getAttribute('data-theme') === 'dark' || this.currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.5)', drawBorder: false },
              ticks: {
                color: (document.documentElement.getAttribute('data-theme') === 'dark' || this.currentTheme === 'dark') ? '#94a3b8' : '#64748b',
                font: { size: 10.5 },
                callback: (val) => '$ ' + (Math.abs(val) >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : Number(val).toLocaleString('es-CO'))
              }
            }
          }
        }
      });
    }

    // 2. OPEX Expenses Doughnut Chart
    const doughnutCanvas = document.getElementById('repExpensesDoughnutChart');
    if (doughnutCanvas) {
      if (this.charts.repExpensesDoughnut) this.charts.repExpensesDoughnut.destroy();

      const catSum = {};
      const filteredExp = (this.data.expenses || []).filter(e => this.isDateInPeriod(e.date, period));
      filteredExp.forEach(e => {
        const cat = e.category || 'Otros Gastos';
        catSum[cat] = (catSum[cat] || 0) + (Number(e.amount) || 0);
      });

      const catLabels = Object.keys(catSum);
      const catData = Object.values(catSum);
      const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6'];

      this.charts.repExpensesDoughnut = new Chart(doughnutCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: catLabels.length ? catLabels : ['Sin gastos registrados en el período'],
          datasets: [{
            data: catData.length ? catData : [0],
            backgroundColor: catLabels.length ? colors.slice(0, catLabels.length) : ['rgba(148, 163, 184, 0.2)'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 11, weight: '600' },
                color: '#64748b'
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (!catData.length || !catData.some(v => v > 0)) return ' Sin gastos';
                  const val = Number(ctx.raw) || 0;
                  const total = catData.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  return ` ${ctx.label}: $ ${val.toLocaleString('es-CO')} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  exportFinancesPAndLCSV() {
    const m = this.currentFinancesMetrics;
    if (!m) {
      this.showToast('No hay datos financieros calculados', 'warning');
      return;
    }

    const headers = ['Categoria', 'Concepto Contable', 'Monto COP', 'Porcentaje'];
    const safePct = (val, tot) => (tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0') + '%';
    const rows = [
      ['INGRESOS', 'Ventas de Joyería y Metales', m.grossSalesJoyería, safePct(m.grossSalesJoyería, m.totalGrossRevenue)],
      ['INGRESOS', 'Servicios de Taller Joyero', m.grossServicesTaller, safePct(m.grossServicesTaller, m.totalGrossRevenue)],
      ['SUBTOTAL', 'TOTAL FACTURACIÓN BRUTA OPERACIONAL', m.totalGrossRevenue, '100.0%'],
      ['COSTOS', 'Costo de Metales Preciosos (Oro/Plata)', -m.cogsMetals, safePct(m.cogsMetals, m.totalGrossRevenue)],
      ['COSTOS', 'Costo de Piedras Preciosas y Gemas', -m.cogsGems, safePct(m.cogsGems, m.totalGrossRevenue)],
      ['SUBTOTAL', 'UTILIDAD BRUTA OPERACIONAL', m.grossProfit, `${m.grossMarginPct.toFixed(1)}%`]
    ];

    (this.data.expenses || []).filter(e => this.isDateInPeriod(e.date, m.period)).forEach(e => {
      rows.push(['GASTOS OPEX', `${e.description} [${e.category}]`, -e.amount, safePct(Number(e.amount) || 0, m.totalGrossRevenue)]);
    });

    rows.push(['SUBTOTAL', 'TOTAL GASTOS OPERATIVOS (OPEX)', -m.totalOPEX, safePct(m.totalOPEX, m.totalGrossRevenue)]);
    rows.push(['TOTAL NETO', 'UTILIDAD NETA OPERACIONAL (EBITDA)', m.netProfit, `${m.netMarginPct.toFixed(1)}%`]);

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Estado_Resultados_PyL_Charles_Joyas_${m.period}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('Estado de Resultados (P&L) exportado exitosamente', 'success');
  }

  /* --------------------------------------------------------------------------
     REPORTE DE COMPRAS & ABASTECIMIENTO ESTRATÉGICO 360°
     -------------------------------------------------------------------------- */
  setComprasPeriod(period, btnEl = null) {
    this.currentComprasPeriod = period;
    const container = document.getElementById('compras-period-btns');
    if (container) {
      container.querySelectorAll('.compras-period-pill').forEach(b => {
        const onClick = b.getAttribute('onclick') || '';
        const isMatch = btnEl ? b === btnEl : onClick.includes(`'${period}'`);
        b.classList.toggle('active', isMatch);
      });
    }
    this.renderRepCompras(period);
  }

  renderRepCompras(period = null) {
    if (period) this.currentComprasPeriod = period;
    const currentPeriod = this.currentComprasPeriod || 'month';

    const rawPurchases = this.data.purchases || [];
    const suppliers = this.data.suppliers || [];
    const credits = this.data.supplierCredits || [];

    // 1. Calculate Period Purchases based on actual dates
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // e.g. "2026-09"
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let displayPurchases = [...rawPurchases];
    if (currentPeriod === 'month') {
      displayPurchases = rawPurchases.filter(p => p.date && p.date.startsWith(currentYearMonth));
    } else if (currentPeriod === '30d') {
      displayPurchases = rawPurchases.filter(p => p.date && p.date >= cutoff30d);
    } else {
      // 'all' / Histórico: all purchases
      displayPurchases = [...rawPurchases];
    }

    const totalInvestment = displayPurchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const totalOCs = displayPurchases.length;

    // 2. Cuentas por Pagar (CXP)
    this.syncSupplierCreditsState();
    const updatedCredits = this.data.supplierCredits || [];
    const totalPendingDebt = updatedCredits.reduce((sum, c) => sum + (Number(c.pendingAmount) || 0), 0);
    const pendingCreditsCount = updatedCredits.filter(c => (Number(c.pendingAmount) || 0) > 0).length;

    // 3. Proveedores Activos & Top Supplier
    const suppSpendMap = {};
    displayPurchases.forEach(p => {
      const s = p.supplier || 'Proveedor General';
      suppSpendMap[s] = (suppSpendMap[s] || 0) + (Number(p.total) || 0);
    });
    const activeSuppliersCount = Object.keys(suppSpendMap).length;
    let topSupplierName = activeSuppliersCount > 0 ? '-' : 'Sin compras';
    let topSupplierSpend = 0;
    Object.entries(suppSpendMap).forEach(([name, spend]) => {
      if (spend > topSupplierSpend) {
        topSupplierSpend = spend;
        topSupplierName = name;
      }
    });
    const topSupplierPct = totalInvestment > 0 ? ((topSupplierSpend / totalInvestment) * 100).toFixed(0) : '0';

    // 4. Logística y Cumplimiento
    const receivedCount = displayPurchases.filter(p => (p.status || '').toLowerCase() === 'recibido').length;
    const fulfillmentPct = totalOCs > 0 ? Math.round((receivedCount / totalOCs) * 100) : 100;

    const metrics = {
      period: currentPeriod,
      totalInvestment,
      totalOCs,
      totalPendingDebt,
      pendingCreditsCount,
      activeSuppliersCount,
      topSupplierName,
      topSupplierSpend,
      topSupplierPct,
      receivedCount,
      fulfillmentPct,
      suppSpendMap,
      displayPurchases
    };
    this.currentComprasMetrics = metrics;

    // 5. Update DOM KPI Cards
    const valInversion = document.getElementById('compras-val-inversion');
    const badgeOc = document.getElementById('compras-badge-oc-count');
    const valCxp = document.getElementById('compras-val-cxp');
    const badgeCxp = document.getElementById('compras-badge-cxp-count');
    const valSupp = document.getElementById('compras-val-proveedores');
    const badgeTopSupp = document.getElementById('compras-badge-top-supp');
    const valFulfill = document.getElementById('compras-val-cumplimiento');
    const badgeFulfill = document.getElementById('compras-badge-fulfillment');
    const subFulfill = document.getElementById('compras-sub-fulfillment');

    if (valInversion) valInversion.textContent = `$ ${totalInvestment.toLocaleString('es-CO')}`;
    if (badgeOc) badgeOc.textContent = `${totalOCs} Órdenes`;
    if (valCxp) valCxp.textContent = `$ ${totalPendingDebt.toLocaleString('es-CO')}`;
    if (badgeCxp) badgeCxp.textContent = `${pendingCreditsCount} Pendientes`;
    if (valSupp) valSupp.textContent = `${activeSuppliersCount} Proveedores`;
    if (badgeTopSupp) badgeTopSupp.textContent = `Top: ${topSupplierName.slice(0, 16)} (${topSupplierPct}%)`;
    if (valFulfill) valFulfill.textContent = `${fulfillmentPct}%`;
    if (badgeFulfill) {
      badgeFulfill.textContent = fulfillmentPct >= 90 ? '🟢 Óptimo' : (fulfillmentPct >= 60 ? '🟡 Regular' : '🔴 Atención');
    }
    if (subFulfill) subFulfill.textContent = `${receivedCount} de ${totalOCs} Órdenes recibidas`;

    // 6. Populate Purchases Table
    const tbody = document.getElementById('compras-table-body');
    if (tbody) {
      if (displayPurchases.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
              No hay órdenes de compra registradas en este período.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = displayPurchases.map(po => {
          const payBadgeClass = po.paymentStatus === 'Pagado Total' ? 'badge-active' : (po.paymentStatus === 'Pagado Parcial' ? 'badge-warning' : 'badge-danger');
          const deliverBadgeClass = (po.status || '').toLowerCase() === 'recibido' ? 'badge-active' : 'badge-warning';
          
          const matchingCred = credits.find(c => c.supplier === po.supplier);
          const pendingBalance = matchingCred ? matchingCred.pendingAmount : (po.paymentStatus === 'Pagado Total' ? 0 : po.total);

          return `
            <tr>
              <td><span style="font-weight: 800; font-family: monospace; color: var(--primary-indigo);">${po.id}</span></td>
              <td>
                <div style="font-weight: 700; color: var(--text-main);">${po.supplier}</div>
              </td>
              <td style="color: var(--text-muted); font-size: 0.82rem;">${po.date}</td>
              <td><span class="font-bold">${po.itemsCount || 1} ítems</span></td>
              <td><span style="font-weight: 800; color: var(--text-main);">$ ${Number(po.total).toLocaleString('es-CO')}</span></td>
              <td>
                <span class="badge ${payBadgeClass}">
                  <span class="badge-dot"></span>${po.paymentStatus || 'Pendiente'}
                </span>
              </td>
              <td>
                <span class="badge ${deliverBadgeClass}">
                  <span class="badge-dot"></span>${po.status || 'Recibido'}
                </span>
              </td>
              <td style="text-align: center;">
                <div class="action-btn-group" style="justify-content: center;">
                  ${pendingBalance > 0 ? `
                    <button class="btn btn-primary text-xs" style="padding: 3px 8px; font-weight: 700;" onclick="app.openAbonoModalByEntity('supplier', '${po.supplier}')" title="Abonar a Proveedor">
                      💳 Pagar
                    </button>
                  ` : `
                    <span style="font-size: 0.75rem; color: var(--emerald-text); font-weight: 700;">✓ Al día</span>
                  `}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 7. Render Charts
    this.renderRepComprasCharts(currentPeriod, metrics);
  }

  renderRepComprasCharts(period, metrics) {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || this.currentTheme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.5)';
    const tickColor = isDark ? '#94a3b8' : '#64748b';

    // 1. Supplier Horizontal Bar Chart
    const suppCanvas = document.getElementById('repPurchasesSupplierChart');
    if (suppCanvas) {
      if (this.charts.repPurchasesSupplier) this.charts.repPurchasesSupplier.destroy();

      const labels = Object.keys(metrics.suppSpendMap || {});
      const data = Object.values(metrics.suppSpendMap || {});

      this.charts.repPurchasesSupplier = new Chart(suppCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels.length ? labels.map(l => l.length > 22 ? l.slice(0, 20) + '...' : l) : ['Sin Compras'],
          datasets: [{
            label: 'Inversión Total ($ COP)',
            data: data.length ? data : [0],
            backgroundColor: '#6366F1',
            borderRadius: 6,
            barPercentage: 0.65
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Invertido: $ ${Number(ctx.raw).toLocaleString('es-CO')} COP`
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor, drawBorder: false },
              ticks: {
                color: tickColor,
                font: { size: 10.5 },
                callback: (val) => '$ ' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : Number(val).toLocaleString('es-CO'))
              }
            },
            y: {
              grid: { display: false },
              ticks: { color: tickColor, font: { size: 11, weight: '600' } }
            }
          }
        }
      });
    }

    // 2. Status Doughnut Chart
    const statusCanvas = document.getElementById('repPurchasesStatusChart');
    if (statusCanvas) {
      if (this.charts.repPurchasesStatus) this.charts.repPurchasesStatus.destroy();

      let paidTotal = 0;
      let paidPartial = 0;
      let pending = 0;

      (metrics.displayPurchases || []).forEach(p => {
        const s = (p.paymentStatus || '').toLowerCase();
        if (s.includes('total')) paidTotal += Number(p.total) || 0;
        else if (s.includes('parcial')) paidPartial += Number(p.total) || 0;
        else pending += Number(p.total) || 0;
      });

      this.charts.repPurchasesStatus = new Chart(statusCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Pagado Total', 'Pagado Parcial', 'Pendiente de Pago'],
          datasets: [{
            data: (paidTotal + paidPartial + pending > 0) ? [paidTotal, paidPartial, pending] : [1, 0, 0],
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 11, weight: '600' },
                color: tickColor
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = Number(ctx.raw) || 0;
                  const tot = paidTotal + paidPartial + pending;
                  const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0';
                  return ` ${ctx.label}: $ ${val.toLocaleString('es-CO')} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  exportPurchasesCSV() {
    const m = this.currentComprasMetrics;
    if (!m || !m.displayPurchases || m.displayPurchases.length === 0) {
      this.showToast('No hay órdenes de compra registradas para exportar', 'warning');
      return;
    }

    const headers = ['N° Orden (OC)', 'Casa Proveedora', 'Fecha', 'Ítems', 'Monto Total COP', 'Estado de Pago', 'Estado Entrega'];
    const rows = m.displayPurchases.map(p => [
      p.id,
      p.supplier,
      p.date,
      p.itemsCount || 1,
      p.total,
      p.paymentStatus || 'Pendiente',
      p.status || 'Recibido'
    ]);

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Compras_Charles_Joyas_${m.period}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('Reporte de Compras exportado en CSV compatible con Excel', 'success');
  }

  renderRepGeneral() {
    const container = document.getElementById('rep-general-kpi-grid');
    if (!container) return;
    const validSalesTx = (this.data.recentTransactions || []).filter(t => Number(t.total) > 0);
    const totalSales = validSalesTx.length > 0 
      ? validSalesTx.reduce((acc, t) => acc + Number(t.total), 0)
      : (this.data.kpis?.salesToday || 0);
    const totalExp = (this.data.expenses || []).reduce((acc, e) => acc + Number(e.amount), 0);
    const netProfit = totalSales - totalExp;

    container.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-title">Ingresos Brutos Acumulados</div>
        <div class="kpi-value">${this.formatCurrency(totalSales)}</div>
        <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Ventas registradas y facturación</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Gastos Operativos Totales</div>
        <div class="kpi-value" style="color:var(--rose-text);">${this.formatCurrency(totalExp)}</div>
        <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Alquiler, nómina y servicios</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Utilidad Neta Operativa</div>
        <div class="kpi-value" style="color:${netProfit >= 0 ? 'var(--emerald-text)' : 'var(--rose-text)'};">${this.formatCurrency(netProfit)}</div>
        <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Margen Neto: ${totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%</div>
      </div>
    `;
  }

  exportReportCSV() {
    const txs = this.data.recentTransactions || [];
    if (txs.length === 0) {
      this.showToast('No hay transacciones registradas para exportar', 'warning');
      return;
    }
    const headers = ['N° Ticket/ID', 'Fecha/Hora', 'Atendido por (Cajero)', 'Cliente', 'Tipo', 'Artículos', 'Método Pago', 'Total COP', 'Estado'];
    const rows = txs.map(t => [
      t.id,
      `${t.date ? t.date + ' ' : ''}${t.time || ''}`.trim(),
      t.cashier || 'Cajero',
      t.customer || '',
      t.type || 'Venta POS',
      t.itemsCount || 1,
      t.paymentMethod || 'Efectivo',
      Math.abs(t.total || 0),
      t.status || 'Completado'
    ]);
    const csvContent = "\uFEFF" + [
      headers.join(';'), 
      ...rows.map(r => r.map(c => `"${String(c !== null && c !== undefined ? c : '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Ventas_Nexus_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Reporte General exportado en CSV', 'success');
  }

  exportTopProductsCSV() {
    const prods = this.data.products || [];
    if (prods.length === 0) {
      this.showToast('No hay productos en el catálogo para exportar', 'warning');
      return;
    }
    const headers = ['ID', 'Código', 'Producto', 'Categoría', 'Unidad de Medida', 'Stock Actual', 'Precio Venta COP', 'Costo Unitario COP', 'Margen Bruto %', 'Estado'];
    const rows = prods.map(p => {
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
      const costPerGram = Number(p.cost || cat?.cost || 0);
      const unitPieceCost = (!isPesaje && pWeight > 0) ? Math.round(pWeight * costPerGram) : costPerGram;
      const effectivePrice = p.price && Number(p.price) > 0 ? Number(p.price) : unitPieceCost;
      const margin = (effectivePrice > 0 && unitPieceCost > 0) ? (((effectivePrice - unitPieceCost) / effectivePrice) * 100).toFixed(1) : '0.0';
      return [
        p.id,
        p.sku || '',
        p.name || '',
        p.categoryName || p.category || '',
        isPesaje ? 'Gramos (g)' : 'Unidades (u)',
        p.stock,
        p.price,
        unitPieceCost,
        `${margin}%`,
        p.status
      ];
    });
    const csvContent = "\uFEFF" + [
      headers.join(';'), 
      ...rows.map(r => r.map(c => `"${String(c !== null && c !== undefined ? c : '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Ranking_Catalogo_Productos_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Ranking de productos exportado en CSV', 'success');
  }

  getLeyMetalFromItems(items) {
    // Requerimiento de Joyería: En la cabecera superior del recibo siempre se muestra fijo "Oro 18k",
    // independientemente de los artículos, metales o categorías que se vendan en la transacción.
    return (this.data.store?.slogan && /oro/i.test(this.data.store.slogan)) ? this.data.store.slogan : 'Oro 18k';
  }

  buildThermalTicketHtml(options) {
    const {
      type = 'venta', // 'venta' | 'compra'
      txId = '',
      dateStr = new Date().toLocaleDateString('es-CO'),
      timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      partyName = '',
      partyDocument = '',
      partyDocType = 'Doc',
      partyAddress = '',
      partyPhone = '',
      agentName = '',
      items = [],
      subtotal = 0,
      tax = 0,
      total = 0,
      paidAmount = 0,
      changeAmount = 0,
      paymentMethod = 'Efectivo',
      separeAbono = 0,
      separePending = 0,
      customerCreditBalance = null
    } = options;

    const store = this.data.store || {};
    const storeName = this.escapeHtml(store.name || 'Charles Joyas');
    const metalLey = this.escapeHtml(this.getLeyMetalFromItems(items));
    const legalName = this.escapeHtml(store.legalName || 'Inversiones Charles Joyas S.A.S');
    const address = this.escapeHtml(store.address || '');
    const addressExtra = this.escapeHtml(store.addressExtra || '');
    const phone = this.escapeHtml(store.phone || '');
    const taxId = this.escapeHtml(store.taxId || '');

    const txTitle = type === 'compra' ? 'Compra' : 'Venta';
    const partyLabel = type === 'compra' ? 'Proveedor' : 'Cliente';
    const agentLabel = type === 'compra' ? 'Comprador' : 'Vendedor';
    const footerLabel = type === 'compra' ? 'Recibo de compra' : 'Recibo de venta';

    const logoHtml = store.branding?.logoUrl ? `<img src="${store.branding.logoUrl}" style="max-height:42px; max-width:130px; margin-bottom:4px; object-fit:contain;">` : '';

    const itemsRowsHtml = items.map(item => {
      const name = this.escapeHtml(item.name || 'Producto Joya');
      const sku = item.sku || item.product?.sku || item.productSku || (item.product?.id ? item.product.id : '');
      const codePrefix = sku ? `[${this.escapeHtml(sku)}] ` : '';
      const qtyStr = item.formattedQty || `${item.qty || 1}`;
      const priceStr = item.formattedUnitPrice || this.formatCurrency(item.price || 0);
      const totalStr = item.formattedLineTotal || this.formatCurrency(item.total || (item.price * item.qty));

      return `
        <div style="margin-bottom:6px;">
          <div style="font-weight:700; font-size:12px; text-transform:none; color:#000;">${codePrefix}${name}</div>
          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:#111; margin-top:1px;">
            <span style="flex:1.2; text-align:left;">${qtyStr}</span>
            <span style="flex:1.5; text-align:center;">${priceStr}</span>
            <span style="flex:1.3; text-align:right; font-weight:700;">${totalStr}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="thermal-ticket-card" style="max-width:320px; margin:0 auto; font-family:'Courier New', Courier, monospace; font-size:12px; line-height:1.35; color:#000; background:#fff; padding:14px 10px; border-radius:3px;">
        <!-- CABECERA: MARCA + LEY DE METAL DINÁMICA -->
        <div style="text-align:center; margin-bottom:4px;">
          ${logoHtml ? `<div style="margin-bottom:4px;">${logoHtml}</div>` : ''}
          <div style="font-size:21px; font-weight:800; font-family:Georgia, serif; letter-spacing:0.4px; color:#000; line-height:1.2;">${storeName}</div>
          <div style="font-size:13px; font-style:italic; font-family:Georgia, serif; color:#222; margin-top:2px;">${metalLey}</div>
          <div style="border-bottom:1px dotted #333; margin:6px 0;"></div>
        </div>

        <!-- DATOS DEL COMERCIO Y UBICACIÓN -->
        <div style="text-align:center; font-size:11.5px; line-height:1.35; margin-bottom:6px;">
          ${legalName ? `<div style="font-weight:700;">${legalName}</div>` : ''}
          ${address ? `<div>${address}</div>` : ''}
          ${addressExtra ? `<div>${addressExtra}</div>` : ''}
          ${phone ? `<div>CEL ${phone}</div>` : ''}
          ${taxId ? `<div>NIT ${taxId}</div>` : ''}
          <div style="margin-top:5px; font-weight:700;">${txTitle} #${this.escapeHtml(txId)} - ${dateStr} ${timeStr}</div>
        </div>

        <div style="border-bottom:1px solid #111; margin:6px 0;"></div>

        <!-- DATOS TERCERO Y OPERADOR -->
        <div style="font-size:11.5px; line-height:1.4; margin-bottom:6px;">
          <div><b>${partyLabel}:</b> ${this.escapeHtml(partyName || (type === 'compra' ? 'Proveedor' : 'Cliente Mostrador'))}</div>
          ${partyDocument ? `<div><b>${this.escapeHtml(partyDocType || 'Doc')}:</b> ${this.escapeHtml(partyDocument)}</div>` : ''}
          ${partyAddress ? `<div><b>Dir:</b> ${this.escapeHtml(partyAddress)}</div>` : ''}
          ${partyPhone ? `<div><b>Tel:</b> ${this.escapeHtml(partyPhone)}</div>` : ''}
          <div><b>${agentLabel}:</b> ${this.escapeHtml(agentName || 'Operador')}</div>
        </div>

        <div style="border-bottom:1px solid #111; margin:6px 0;"></div>

        <!-- ENCABEZADO DE COLUMNAS -->
        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:11.5px; padding:2px 0;">
          <span style="flex:1.2; text-align:left;">Cant</span>
          <span style="flex:1.5; text-align:center;">$/Unid</span>
          <span style="flex:1.3; text-align:right;">Total</span>
        </div>

        <div style="border-bottom:1px solid #111; margin:3px 0 6px 0;"></div>

        <!-- LISTA DE PRODUCTOS -->
        <div style="margin-bottom:6px;">
          ${itemsRowsHtml}
        </div>

        <div style="border-bottom:1px solid #111; margin:6px 0;"></div>

        <!-- TOTALES Y LIQUIDACIÓN -->
        <div style="font-size:12px; line-height:1.45;">
          ${tax > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(subtotal)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>IVA (${store.taxRate || 0}%):</span>
            <span>${this.formatCurrency(tax)}</span>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between; font-weight:800; font-size:13.5px; margin:2px 0;">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(total)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Pagado:</span>
            <span>${this.formatCurrency(paidAmount)}</span>
          </div>
          ${type === 'compra' && paidAmount < total ? `
          <div style="display:flex; justify-content:space-between; font-weight:700; color:#b91c1c;">
            <span>Saldo Pendiente:</span>
            <span>${this.formatCurrency(total - paidAmount)}</span>
          </div>` : ''}
          ${changeAmount > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Cambio:</span>
            <span>${this.formatCurrency(changeAmount)}</span>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between;">
            <span>Forma pago:</span>
            <span>${this.escapeHtml(paymentMethod)}</span>
          </div>
          ${type === 'compra' ? `
          <div style="display:flex; justify-content:space-between; font-weight:700; margin-top:2px;">
            <span>Estado orden:</span>
            <span style="color:${paidAmount >= total ? '#065f46' : '#b91c1c'};">${paidAmount >= total ? 'PAGADO TOTAL' : 'PENDIENTE DE PAGO'}</span>
          </div>` : ''}
          ${separeAbono > 0 ? `
          <div style="display:flex; justify-content:space-between; margin-top:2px;">
            <span>Abono Separe:</span>
            <span>${this.formatCurrency(separeAbono)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:700; color:#5b21b6;">
            <span>Saldo Separe:</span>
            <span>${this.formatCurrency(separePending)}</span>
          </div>` : ''}
          ${customerCreditBalance !== null && customerCreditBalance !== undefined && paymentMethod === 'Crédito' ? `
          <div style="display:flex; justify-content:space-between; font-weight:700; color:#92400e; margin-top:2px;">
            <span>Saldo Deuda Cliente:</span>
            <span>${this.formatCurrency(customerCreditBalance)}</span>
          </div>` : ''}
        </div>

        <div style="border-bottom:1px solid #111; margin:8px 0 6px 0;"></div>

        <!-- PIE DE RECIBO -->
        <div style="text-align:center; font-weight:700; font-size:11.5px; margin-top:4px; letter-spacing:0.3px;">
          ${footerLabel}
        </div>
      </div>
    `;
  }

  showPastReceiptModal(txId) {
    const tx = (this.data.recentTransactions || []).find(t => t.id === txId);
    if (!tx) {
      this.showToast('Transacción no encontrada', 'error');
      return;
    }
    const receiptBody = document.getElementById('receipt-modal-body');
    if (!receiptBody) return;

    const cust = this.data.customers?.find(c => c.name === tx.customer);

    const ticketItems = (tx.items && Array.isArray(tx.items) && tx.items.length > 0)
      ? tx.items.map(i => {
          const p = this.data.products?.find(prod => prod.id === i.id || prod.sku === i.sku || prod.name === i.name);
          const isPesaje = p ? (p.measureType || 'Pesaje') === 'Pesaje' : false;
          const pWeight = p ? parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0 : 0;
          const isUnitWithWeight = !isPesaje && pWeight > 0;
          const unit = (isPesaje || isUnitWithWeight) ? 'g' : (p?.weightUnit || 'u.');
          const qtyStr = `${this.formatNumberWithCommas(i.qty, isPesaje || isUnitWithWeight)}${unit}`;
          const pPrice = Number(i.price) || 0;
          const totalStr = this.formatCurrency(i.total || (pPrice * i.qty));
          const itemSku = i.sku || p?.sku || (p?.id ? p.id : '');
          return {
            name: i.name,
            sku: itemSku,
            product: p,
            formattedQty: qtyStr,
            formattedUnitPrice: `${this.formatCurrency(pPrice)}/${unit}`,
            formattedLineTotal: totalStr,
            total: i.total || (pPrice * i.qty)
          };
        })
      : [{
          name: tx.type || 'Venta POS',
          sku: '',
          formattedQty: `${tx.itemsCount || 1} u.`,
          formattedUnitPrice: this.formatCurrency(Math.abs(tx.total)),
          formattedLineTotal: this.formatCurrency(Math.abs(tx.total)),
          total: Math.abs(tx.total)
        }];

    const dateStr = tx.date || new Date().toLocaleDateString('es-CO');
    const timeStr = tx.time || '';

    const receiptHtml = this.buildThermalTicketHtml({
      type: 'venta',
      txId: tx.id,
      dateStr,
      timeStr,
      partyName: tx.customer || 'Cliente Mostrador',
      partyDocument: cust?.document || tx.customerDoc || '',
      partyDocType: cust?.docType || tx.customerDocType || 'CC',
      partyAddress: cust?.address || tx.customerAddress || '',
      partyPhone: cust?.phone || tx.customerPhone || '',
      agentName: tx.cashier || this.data.store?.cashier || 'Cajero',
      items: ticketItems,
      subtotal: tx.subtotal || Math.abs(tx.total),
      tax: tx.tax || 0,
      total: Math.abs(tx.total),
      paidAmount: Math.abs(tx.total),
      changeAmount: 0,
      paymentMethod: tx.paymentMethod || 'Efectivo',
      customerCreditBalance: cust?.creditBalance
    });

    const modalTitle = document.getElementById('receipt-modal-title');
    if (modalTitle) modalTitle.innerHTML = '🧾 Comprobante de Venta POS';
    receiptBody.innerHTML = receiptHtml;
    this.openModal('receipt-modal');
  }

  showPurchaseReceiptModal(poId) {
    const po = (this.data.purchases || []).find(p => p.id === poId);
    if (!po) {
      this.showToast('Orden de compra no encontrada', 'error');
      return;
    }
    const receiptBody = document.getElementById('receipt-modal-body');
    if (!receiptBody) return;

    const supplier = (this.data.suppliers || []).find(s => s.name === po.supplier);
    const prod = (this.data.products || []).find(p => p.id === po.productId || p.sku === po.productSku || p.name === po.productName);

    const hasGrams = (Number(po.totalGrams) || 0) > 0;
    const unitLabel = isPesaje ? 'g' : (prod?.weightUnit || 'u.');
    const qtyVal = isPesaje ? (po.totalGrams || po.quantity || 1) : (po.quantity || po.itemsCount || 1);
    const formattedQty = (hasGrams && !isPesaje)
      ? `${this.formatNumberWithCommas(qtyVal, false)} u. (${this.formatNumberWithCommas(po.totalGrams, true)} g)`
      : `${this.formatNumberWithCommas(qtyVal, isPesaje)} ${unitLabel}`;
    const formattedUnitPrice = (hasGrams || isPesaje)
      ? `${this.formatCurrency(po.unitCost || 0)}/g`
      : `${this.formatCurrency(po.unitCost || 0)}/u`;
    const formattedTotal = this.formatCurrency(po.total || 0);

    const ticketItems = [{
      name: po.productName || 'Metal en Bruto',
      sku: po.productSku || prod?.sku || '',
      product: prod,
      formattedQty,
      formattedUnitPrice,
      formattedLineTotal: formattedTotal,
      total: po.total || 0
    }];

    const dateFormatted = po.date ? new Date(po.date + 'T12:00:00').toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');
    const timeFormatted = po.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isPaid = po.paymentStatus === 'Pagado Total';
    const paidAmount = isPaid ? po.total : (po.paidAmount !== undefined ? po.paidAmount : 0);

    const receiptHtml = this.buildThermalTicketHtml({
      type: 'compra',
      txId: po.id,
      dateStr: dateFormatted,
      timeStr: timeFormatted,
      partyName: po.supplier || 'Proveedor General',
      partyDocument: supplier?.nit || supplier?.document || '',
      partyAddress: supplier?.address || '',
      partyPhone: supplier?.phone || '',
      agentName: this.currentUser?.name || this.data.store?.cashier || 'Comprador',
      items: ticketItems,
      subtotal: po.total || 0,
      tax: 0,
      total: po.total || 0,
      paidAmount: paidAmount,
      changeAmount: 0,
      paymentMethod: po.paymentMethod || (isPaid ? 'Efectivo' : 'Crédito Proveedor')
    });

    const modalTitle = document.getElementById('receipt-modal-title');
    if (modalTitle) modalTitle.innerHTML = '📦 Comprobante de Orden de Compra';
    receiptBody.innerHTML = receiptHtml;
    this.openModal('receipt-modal');
  }

  printTicket() {
    const receiptBody = document.getElementById('receipt-modal-body');
    if (!receiptBody) {
      window.print();
      return;
    }

    try {
      let printIframe = document.getElementById('pos-print-iframe');
      if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'pos-print-iframe';
        printIframe.setAttribute('style', 'position:fixed; right:-9999px; bottom:-9999px; width:80mm; height:100px; border:0; visibility:hidden;');
        document.body.appendChild(printIframe);
      }

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket POS - ${this.escapeHtml(this.data.store?.name || 'Comprobante')}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      width: 80mm;
      max-width: 80mm;
    }
    .thermal-ticket-card {
      width: 100% !important;
      max-width: 76mm !important;
      margin: 0 auto !important;
      padding: 5mm 3mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      border: none !important;
      box-shadow: none !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
  </style>
</head>
<body>
  ${receiptBody.innerHTML}
</body>
</html>`);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window.print()', e);
          window.print();
        }
      }, 350);
    } catch (err) {
      console.warn('Print iframe error:', err);
      window.print();
    }
  }

  renderInformesBalance() {
    const kpiContainer = document.getElementById('inf-balance-kpis');
    const tableCard = document.getElementById('inf-balance-table-card');

    this.syncSupplierCreditsState();

    const invVal = (this.data.products || []).reduce((acc, p) => acc + this.getProductTotalCost(p), 0);
    const fixedVal = (this.data.assets || []).reduce((acc, a) => acc + (Number(a.currentVal) || Number(a.costValue) || 0), 0);
    const cashVal = Number(this.data.cashShiftLog?.expectedCashInDrawer) || Number(this.data.store?.cashInBox) || 0;
    const clientDebtVal = (this.data.customers || []).reduce((acc, c) => acc + (Number(c.creditBalance) || 0), 0);

    const assetsCurrent = invVal + cashVal + clientDebtVal;
    const assetsFixed = fixedVal;
    const totalAssets = assetsCurrent + assetsFixed;

    // Cuentas por Pagar Proveedores: suma consolidada de saldos en Directorio de Proveedores + créditos adicionales no vinculados
    const suppBalanceTotal = (this.data.suppliers || []).reduce((acc, s) => acc + Math.max(0, Number(s.creditBalance) || 0), 0);
    const orphanCreditsTotal = (this.data.supplierCredits || [])
      .filter(sc => {
        const sName = (sc.supplier || '').toLowerCase().trim();
        const existsInSuppliers = (this.data.suppliers || []).some(s => (s.name || '').toLowerCase().trim() === sName);
        return !existsInSuppliers && (Number(sc.pendingAmount) || 0) > 0;
      })
      .reduce((acc, sc) => acc + (Number(sc.pendingAmount) || 0), 0);
    const supplierDebtVal = suppBalanceTotal > 0 ? (suppBalanceTotal + orphanCreditsTotal) : (this.data.supplierCredits || []).reduce((acc, sc) => acc + (Number(sc.pendingAmount) || 0), 0);

    const operatingExpensesVal = (this.data.expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const liabilitiesShort = supplierDebtVal + operatingExpensesVal;
    const liabilitiesLong = Number(this.data.balanceSheet?.liabilitiesLong) || 0;
    const totalLiabilities = liabilitiesShort + liabilitiesLong;
    const netEquity = totalAssets - totalLiabilities;

    const storeName = this.data.store?.name || 'Charles Joyas SAS';

    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-title">Total Activos</div>
          <div class="kpi-value" style="color:var(--emerald-text);">${this.formatCurrency(totalAssets)}</div>
          <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Corrientes (${this.formatCurrency(assetsCurrent)}) + Fijos</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Total Pasivos</div>
          <div class="kpi-value" style="color:var(--rose-text);">${this.formatCurrency(totalLiabilities)}</div>
          <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Proveedores + Créditos Taller</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Patrimonio Neto</div>
          <div class="kpi-value" style="color:var(--primary-indigo);">${this.formatCurrency(netEquity)}</div>
          <div class="kpi-subtitle" style="color:var(--text-subtle); font-size:0.75rem; margin-top:4px;">Solvencia Neta del Negocio</div>
        </div>
      `;
    }

    if (tableCard) {
      tableCard.innerHTML = `
        <div class="card-header" style="margin-bottom:1rem;">
          <h3 class="card-title" style="margin:0; font-size:1.05rem;">Balance General Consolidado (${this.escapeHtml(storeName)})</h3>
        </div>
        <div class="table-responsive">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th style="width:55%;">Cuenta Contable / Rubro</th>
                <th style="text-align:right;">Subtotal</th>
                <th style="text-align:right;">Total Consolidado</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:rgba(16,185,129,0.06); font-weight:700;">
                <td colspan="2"><span style="color:var(--emerald-text);">▲ ACTIVOS TOTALES</span></td>
                <td style="text-align:right; font-weight:800; color:var(--emerald-text);">${this.formatCurrency(totalAssets)}</td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem;">• Inventario en Metales y Piedras Preciosas (Costo)</td>
                <td style="text-align:right;">${this.formatCurrency(invVal)}</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem;">• Disponible en Caja y Arqueo de Turno</td>
                <td style="text-align:right;">${this.formatCurrency(cashVal)}</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem;">• Cuentas por Cobrar (Créditos a Clientes)</td>
                <td style="text-align:right;">${this.formatCurrency(clientDebtVal)}</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem; font-weight:600;">• Activos Fijos de Taller (Balanzas, Microscopios, Caja Fuerte)</td>
                <td style="text-align:right; font-weight:600;">${this.formatCurrency(assetsFixed)}</td>
                <td></td>
              </tr>
              <tr style="background:rgba(239,68,68,0.06); font-weight:700;">
                <td colspan="2"><span style="color:var(--rose-text);">▼ PASIVOS TOTALES</span></td>
                <td style="text-align:right; font-weight:800; color:var(--rose-text);">${this.formatCurrency(totalLiabilities)}</td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem;">• Cuentas por Pagar Proveedores de Oro y Gemas</td>
                <td style="text-align:right;">${this.formatCurrency(supplierDebtVal)}</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem;">• Gastos Operativos y Servicios Acumulados</td>
                <td style="text-align:right;">${this.formatCurrency(operatingExpensesVal)}</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left:1.5rem; font-weight:600;">• Pasivos Financieros a Largo Plazo</td>
                <td style="text-align:right; font-weight:600;">${this.formatCurrency(liabilitiesLong)}</td>
                <td></td>
              </tr>
              <tr style="background:rgba(99,102,241,0.08); font-weight:800; border-top:2px solid var(--primary-indigo);">
                <td colspan="2"><span style="color:var(--primary-indigo);">★ PATRIMONIO NETO (Capital Social + Reservas)</span></td>
                <td style="text-align:right; font-weight:800; color:var(--primary-indigo); font-size:1.05rem;">${this.formatCurrency(netEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  }

  renderInformesPeriodos() {
    const tbody = document.getElementById('inf-periodos-tbody');
    if (!tbody) return;

    const txs = (this.data.recentTransactions || []).filter(tx => (Number(tx.total) || 0) > 0);
    const exps = this.data.expenses || [];

    if (txs.length === 0 && exps.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
            No hay transacciones ni gastos registrados para comparar periodos
          </td>
        </tr>
      `;
      return;
    }

    const monthsMap = new Map();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const getMonthKey = (dateStr) => {
      if (!dateStr) return currentMonthKey;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return currentMonthKey;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    txs.forEach(t => {
      const key = getMonthKey(t.date || t.timestamp);
      if (!monthsMap.has(key)) monthsMap.set(key, { sales: 0, expenses: 0 });
      monthsMap.get(key).sales += (Number(t.total) || 0);
    });

    exps.forEach(e => {
      const key = getMonthKey(e.date || e.createdAt);
      if (!monthsMap.has(key)) monthsMap.set(key, { sales: 0, expenses: 0 });
      monthsMap.get(key).expenses += (Number(e.amount) || 0);
    });

    if (!monthsMap.has(currentMonthKey) && (txs.length > 0 || exps.length > 0)) {
      monthsMap.set(currentMonthKey, { sales: 0, expenses: 0 });
    }

    const sortedKeys = Array.from(monthsMap.keys()).sort().reverse();
    tbody.innerHTML = sortedKeys.map(k => {
      const data = monthsMap.get(k);
      const [year, month] = k.split('-');
      const monthLabel = `${monthNames[parseInt(month, 10) - 1] || month} ${year}`;
      const isCurrent = k === currentMonthKey;
      const margin = data.sales > 0 ? (((data.sales - data.expenses) / data.sales) * 100).toFixed(1) + '%' : '0.0%';
      const statusBadge = isCurrent
        ? '<span class="badge badge-active">Abierto</span>'
        : '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted);">Cerrado</span>';

      return `
        <tr>
          <td style="font-weight:600;">${monthLabel} ${isCurrent ? '(En Curso)' : ''}</td>
          <td style="font-weight:700; color:var(--emerald-text);">${this.formatCurrency(data.sales)}</td>
          <td style="font-weight:600; color:var(--rose-text);">${this.formatCurrency(data.expenses)}</td>
          <td style="font-weight:700;">${margin}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  renderInformesCarteraClientes() {
    const tbody = document.getElementById('inf-cartera-tbody');
    if (!tbody) return;

    if (!this.currentCarteraFilter) this.currentCarteraFilter = 'todos';
    if (!this.carteraSearchQuery) this.carteraSearchQuery = '';

    const now = new Date();

    // 1. Build comprehensive credit records merging customerCredits and customers
    const creditMap = new Map();

    (this.data.customerCredits || []).forEach(cc => {
      const cust = (this.data.customers || []).find(c => c.name?.toLowerCase() === cc.customer?.toLowerCase() || c.id === cc.customerId) || {};
      const balance = Number(cc.currentBalance) || 0;
      const granted = Number(cc.totalGranted) || (Number(cust.creditLimit) || balance);
      
      let diffDays = 0;
      let isOverdue = false;
      let isNearDue = false;
      let isPaid = balance <= 0 || cc.status === 'Saldado';

      if (cc.dueDate) {
        const due = new Date(cc.dueDate + 'T23:59:59');
        diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) isOverdue = true;
        else if (diffDays <= 7) isNearDue = true;
      }

      const daysOverdue = isOverdue ? Math.abs(diffDays) : 0;

      // Risk level calculation
      let riskLevel = 'Bajo';
      let riskClass = 'badge-active';
      let riskColor = '#10B981';

      if (isPaid) {
        riskLevel = 'Saldado';
        riskClass = 'badge-active';
        riskColor = '#10B981';
      } else if (daysOverdue > 60 || (daysOverdue > 30 && balance > 2000000)) {
        riskLevel = 'Crítico';
        riskClass = 'badge-danger';
        riskColor = '#DC2626';
      } else if (daysOverdue > 15 || (isOverdue && balance > 5000000)) {
        riskLevel = 'Alto';
        riskClass = 'badge-danger';
        riskColor = '#F43F5E';
      } else if (daysOverdue > 0 || isNearDue) {
        riskLevel = 'Medio';
        riskClass = 'badge-warning';
        riskColor = '#F59E0B';
      }

      // Aging Bucket
      let bucket = 'corriente';
      if (isOverdue) {
        if (daysOverdue <= 30) bucket = 'mora_1_30';
        else if (daysOverdue <= 60) bucket = 'mora_31_60';
        else if (daysOverdue <= 90) bucket = 'mora_61_90';
        else bucket = 'mora_90_plus';
      }

      creditMap.set(cc.customer, {
        id: cc.id,
        customer: cc.customer,
        phone: cust.phone || '+57 300 000 0000',
        email: cust.email || 'contacto@cliente.com',
        balance,
        granted,
        dueDate: cc.dueDate || 'Sin fecha',
        diffDays,
        daysOverdue,
        isOverdue,
        isNearDue,
        isPaid,
        riskLevel,
        riskClass,
        riskColor,
        bucket
      });
    });

    // Also check if any customer has creditBalance > 0 not present in creditMap
    (this.data.customers || []).forEach(cust => {
      if (cust.creditBalance > 0 && !creditMap.has(cust.name)) {
        const balance = Number(cust.creditBalance);
        creditMap.set(cust.name, {
          id: `CC-${cust.id.replace('CLI-', '9')}`,
          customer: cust.name,
          phone: cust.phone || '+57 300 000 0000',
          email: cust.email || 'contacto@cliente.com',
          balance,
          granted: Number(cust.creditLimit) || balance,
          dueDate: '2026-09-20',
          diffDays: 12,
          daysOverdue: 0,
          isOverdue: false,
          isNearDue: false,
          isPaid: false,
          riskLevel: 'Bajo',
          riskClass: 'badge-active',
          riskColor: '#10B981',
          bucket: 'corriente'
        });
      }
    });

    const allCredits = Array.from(creditMap.values());

    // 2. Metrics calculation
    const activeDebts = allCredits.filter(c => c.balance > 0);
    const totalCartera = activeDebts.reduce((acc, c) => acc + c.balance, 0);
    const moraDebts = activeDebts.filter(c => c.isOverdue);
    const totalMora = moraDebts.reduce((acc, c) => acc + c.balance, 0);
    const proximosDebts = activeDebts.filter(c => !c.isOverdue && c.isNearDue);
    const totalProximos = proximosDebts.reduce((acc, c) => acc + c.balance, 0);
    const alDiaDebts = activeDebts.filter(c => !c.isOverdue && !c.isNearDue);
    const totalAlDia = alDiaDebts.reduce((acc, c) => acc + c.balance, 0);
    const altoRiesgoDebts = activeDebts.filter(c => c.riskLevel === 'Alto' || c.riskLevel === 'Crítico');

    const pctMorosidad = totalCartera > 0 ? ((totalMora / totalCartera) * 100).toFixed(1) : "0.0";

    // Aging Buckets totals
    const buckets = {
      corriente: activeDebts.filter(c => c.bucket === 'corriente'),
      mora_1_30: activeDebts.filter(c => c.bucket === 'mora_1_30'),
      mora_31_60: activeDebts.filter(c => c.bucket === 'mora_31_60'),
      mora_61_90: activeDebts.filter(c => c.bucket === 'mora_61_90'),
      mora_90_plus: activeDebts.filter(c => c.bucket === 'mora_90_plus')
    };

    const bucketTotals = {
      corriente: buckets.corriente.reduce((acc, c) => acc + c.balance, 0),
      mora_1_30: buckets.mora_1_30.reduce((acc, c) => acc + c.balance, 0),
      mora_31_60: buckets.mora_31_60.reduce((acc, c) => acc + c.balance, 0),
      mora_61_90: buckets.mora_61_90.reduce((acc, c) => acc + c.balance, 0),
      mora_90_plus: buckets.mora_90_plus.reduce((acc, c) => acc + c.balance, 0)
    };

    // 3. Render KPI Summary Cards
    const kpiContainer = document.getElementById('cartera-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="cartera-kpi-card kpi-total">
          <div class="cartera-kpi-header">
            <span class="cartera-kpi-title">Cartera Total por Cobrar</span>
            <div class="cartera-kpi-icon" style="background:rgba(2,132,199,0.15); color:var(--brand-primary);">💳</div>
          </div>
          <div class="cartera-kpi-val">${this.formatCurrency(totalCartera)}</div>
          <div class="cartera-kpi-sub">
            <span>👥 <b>${activeDebts.length}</b> clientes con saldo pendiente</span>
          </div>
        </div>

        <div class="cartera-kpi-card kpi-mora">
          <div class="cartera-kpi-header">
            <span class="cartera-kpi-title">Cartera Vencida (En Mora)</span>
            <div class="cartera-kpi-icon" style="background:rgba(239,68,68,0.15); color:#EF4444;">🚨</div>
          </div>
          <div class="cartera-kpi-val" style="color:#F43F5E;">${this.formatCurrency(totalMora)}</div>
          <div class="cartera-kpi-sub">
            <span style="color:#F43F5E;"><b>${moraDebts.length}</b> en mora • <b>${pctMorosidad}%</b> de morosidad</span>
          </div>
        </div>

        <div class="cartera-kpi-card kpi-proximo">
          <div class="cartera-kpi-header">
            <span class="cartera-kpi-title">Vencimiento Próximo (≤ 7d)</span>
            <div class="cartera-kpi-icon" style="background:rgba(245,158,11,0.15); color:#F59E0B;">⏳</div>
          </div>
          <div class="cartera-kpi-val" style="color:#F59E0B;">${this.formatCurrency(totalProximos)}</div>
          <div class="cartera-kpi-sub">
            <span><b>${proximosDebts.length}</b> cuentas en alerta esta semana</span>
          </div>
        </div>

        <div class="cartera-kpi-card kpi-aldia">
          <div class="cartera-kpi-header">
            <span class="cartera-kpi-title">Cartera Corriente / Al Día</span>
            <div class="cartera-kpi-icon" style="background:rgba(16,185,129,0.15); color:#10B981;">🛡️</div>
          </div>
          <div class="cartera-kpi-val" style="color:#10B981;">${this.formatCurrency(totalAlDia)}</div>
          <div class="cartera-kpi-sub">
            <span><b>${alDiaDebts.length}</b> clientes al día</span>
          </div>
        </div>
      `;
    }

    // 4. Render Aging Matrix Widget
    const agingContainer = document.getElementById('cartera-aging-container');
    if (agingContainer) {
      const getPct = (val) => totalCartera > 0 ? ((val / totalCartera) * 100).toFixed(1) : "0.0";
      const pctCorriente = getPct(bucketTotals.corriente);
      const pct1_30 = getPct(bucketTotals.mora_1_30);
      const pct31_60 = getPct(bucketTotals.mora_31_60);
      const pct61_90 = getPct(bucketTotals.mora_61_90);
      const pct90_plus = getPct(bucketTotals.mora_90_plus);

      agingContainer.innerHTML = `
        <div class="cartera-aging-header">
          <div class="cartera-aging-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Matriz de Antigüedad de Saldos (Aging de Cartera)</span>
          </div>
          <div class="cartera-aging-legend">
            Distribución del saldo pendiente por tramos de vencimiento
          </div>
        </div>

        <div class="cartera-aging-bar">
          <div class="cartera-aging-segment" style="width: ${pctCorriente}%; background: #10B981;" title="Al Día: ${pctCorriente}%"></div>
          <div class="cartera-aging-segment" style="width: ${pct1_30}%; background: #F59E0B;" title="Mora 1-30d: ${pct1_30}%"></div>
          <div class="cartera-aging-segment" style="width: ${pct31_60}%; background: #F97316;" title="Mora 31-60d: ${pct31_60}%"></div>
          <div class="cartera-aging-segment" style="width: ${pct61_90}%; background: #EF4444;" title="Mora 61-90d: ${pct61_90}%"></div>
          <div class="cartera-aging-segment" style="width: ${pct90_plus}%; background: #A855F7;" title="Mora >90d: ${pct90_plus}%"></div>
        </div>

        <div class="cartera-aging-boxes">
          <div class="cartera-aging-box" onclick="app.filterCarteraClientes('al_dia')">
            <div class="cartera-aging-box-label"><span style="color:#10B981;">●</span> Al Día (Corriente)</div>
            <div class="cartera-aging-box-val">${this.formatCurrency(bucketTotals.corriente)}</div>
            <div class="cartera-aging-box-sub">${pctCorriente}% • ${buckets.corriente.length} cuentas</div>
          </div>

          <div class="cartera-aging-box" onclick="app.filterCarteraClientes('mora')">
            <div class="cartera-aging-box-label"><span style="color:#F59E0B;">●</span> Mora 1 - 30 días</div>
            <div class="cartera-aging-box-val">${this.formatCurrency(bucketTotals.mora_1_30)}</div>
            <div class="cartera-aging-box-sub">${pct1_30}% • ${buckets.mora_1_30.length} cuentas</div>
          </div>

          <div class="cartera-aging-box" onclick="app.filterCarteraClientes('mora')">
            <div class="cartera-aging-box-label"><span style="color:#F97316;">●</span> Mora 31 - 60 días</div>
            <div class="cartera-aging-box-val">${this.formatCurrency(bucketTotals.mora_31_60)}</div>
            <div class="cartera-aging-box-sub">${pct31_60}% • ${buckets.mora_31_60.length} cuentas</div>
          </div>

          <div class="cartera-aging-box" onclick="app.filterCarteraClientes('mora')">
            <div class="cartera-aging-box-label"><span style="color:#EF4444;">●</span> Mora 61 - 90 días</div>
            <div class="cartera-aging-box-val">${this.formatCurrency(bucketTotals.mora_61_90)}</div>
            <div class="cartera-aging-box-sub">${pct61_90}% • ${buckets.mora_61_90.length} cuentas</div>
          </div>

          <div class="cartera-aging-box" onclick="app.filterCarteraClientes('alto_riesgo')">
            <div class="cartera-aging-box-label"><span style="color:#A855F7;">●</span> Mora Crítica (&gt;90d)</div>
            <div class="cartera-aging-box-val">${this.formatCurrency(bucketTotals.mora_90_plus)}</div>
            <div class="cartera-aging-box-sub">${pct90_plus}% • ${buckets.mora_90_plus.length} cuentas</div>
          </div>
        </div>
      `;
    }

    // 5. Update Filter Pill Badges & Active States
    const elTodos = document.getElementById('cartera-count-todos');
    const elMora = document.getElementById('cartera-count-mora');
    const elProximos = document.getElementById('cartera-count-proximos');
    const elAlDia = document.getElementById('cartera-count-al_dia');
    const elRiesgo = document.getElementById('cartera-count-alto_riesgo');

    if (elTodos) elTodos.textContent = activeDebts.length;
    if (elMora) elMora.textContent = moraDebts.length;
    if (elProximos) elProximos.textContent = proximosDebts.length;
    if (elAlDia) elAlDia.textContent = alDiaDebts.length;
    if (elRiesgo) elRiesgo.textContent = altoRiesgoDebts.length;

    document.querySelectorAll('#cartera-filters-bar .radar-filter-pill').forEach(btn => {
      const f = btn.getAttribute('data-cartera-filter');
      if (f === this.currentCarteraFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 6. Filter & Search Rows for Table
    let filtered = activeDebts;

    if (this.currentCarteraFilter === 'mora') {
      filtered = filtered.filter(c => c.isOverdue);
    } else if (this.currentCarteraFilter === 'proximos') {
      filtered = filtered.filter(c => !c.isOverdue && c.isNearDue);
    } else if (this.currentCarteraFilter === 'al_dia') {
      filtered = filtered.filter(c => !c.isOverdue && !c.isNearDue);
    } else if (this.currentCarteraFilter === 'alto_riesgo') {
      filtered = filtered.filter(c => c.riskLevel === 'Alto' || c.riskLevel === 'Crítico');
    }

    if (this.carteraSearchQuery) {
      const q = this.normalizeSearchStr(this.carteraSearchQuery);
      filtered = filtered.filter(c => 
        this.normalizeSearchStr(c.customer).includes(q) ||
        this.normalizeSearchStr(c.phone).includes(q) ||
        this.normalizeSearchStr(c.id).includes(q) ||
        this.normalizeSearchStr(c.email).includes(q)
      );
    }

    // Sort by largest balance by default
    filtered.sort((a, b) => b.balance - a.balance);

    // 7. Render Table Rows
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.25rem;">No se encontraron registros de cartera</div>
            <div style="font-size: 0.85rem;">Todos los clientes están al día o no coinciden con los filtros aplicados.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      let daysBadge = '';
      if (c.isOverdue) {
        daysBadge = `<span class="badge badge-danger" style="font-weight:700;"><span class="badge-dot" style="background:#EF4444;"></span>Vencido hace ${c.daysOverdue}d</span>`;
      } else if (c.isNearDue) {
        daysBadge = `<span class="badge badge-warning" style="font-weight:700;"><span class="badge-dot" style="background:#F59E0B;"></span>Vence en ${c.diffDays}d</span>`;
      } else {
        daysBadge = `<span class="badge badge-active" style="font-weight:700;"><span class="badge-dot" style="background:#10B981;"></span>Al día (${c.diffDays}d)</span>`;
      }

      const cleanCustomer = this.escapeHtml(c.customer);
      const safeCustomerForJs = c.customer.replace(/'/g, "\\'");

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.65rem;">
              <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, var(--brand-primary), #4338CA); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; flex-shrink:0;">
                ${cleanCustomer.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700; color:var(--text-main); font-size:0.92rem;">${cleanCustomer}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:0.35rem;">
                  <span>📞 ${this.escapeHtml(c.phone)}</span>
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge badge-inactive" style="font-family:monospace; font-weight:700;">${this.escapeHtml(c.id)}</span>
          </td>
          <td>
            <span style="color:var(--text-muted); font-size:0.88rem;">${this.formatCurrency(c.granted)}</span>
          </td>
          <td>
            <span style="font-weight:800; color:var(--rose-text); font-size:1.02rem;">${this.formatCurrency(c.balance)}</span>
          </td>
          <td>
            <div style="font-size:0.84rem; display:flex; align-items:center; gap:0.3rem;">
              <span>📅</span>
              <span style="font-weight:600;">${this.escapeHtml(c.dueDate)}</span>
            </div>
          </td>
          <td>${daysBadge}</td>
          <td>
            <span class="badge ${c.riskClass}">
              <span class="badge-dot" style="background:${c.riskColor}"></span>
              ${c.riskLevel}
            </span>
          </td>
          <td style="text-align: right;">
            <div class="action-btn-group" style="justify-content: flex-end; gap:0.4rem;">
              <button type="button" class="btn btn-primary text-xs" style="padding:4px 10px; font-weight:700;" onclick="app.openAbonoModalByEntity('customer', '${safeCustomerForJs}')" title="Registrar Abono">
                💳 Abonar
              </button>
              <button type="button" class="btn btn-secondary text-xs" style="padding:4px 8px; font-weight:600;" onclick="app.sendCobranzaWhatsApp('${c.phone}', '${safeCustomerForJs}', ${c.balance}, ${c.daysOverdue})" title="Contactar por WhatsApp">
                💬 Cobro
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterCarteraClientes(filterType) {
    this.currentCarteraFilter = filterType;
    this.renderInformesCarteraClientes();
  }

  searchCarteraClientes(query) {
    this.carteraSearchQuery = query;
    this.renderInformesCarteraClientes();
  }

  sendCobranzaWhatsApp(phone, customerName, balance, daysOverdue) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedBalance = this.formatCurrency(balance);
    const storeName = this.data.store?.branding?.appName || this.data.store?.name || 'Charles Joyas SAS';
    
    let msg = `Hola estimado(a) ${customerName}, te saludamos cordialmente de ${storeName}. `;
    if (daysOverdue > 0) {
      msg += `Te recordamos amablemente que presentas un saldo pendiente de ${formattedBalance} con ${daysOverdue} días de vencimiento. Agradecemos tu gestión de pago o comunicarte con nosotros para coordinar tu abono. ¡Muchas gracias!`;
    } else {
      msg += `Te recordamos que tu saldo actual en cuenta es de ${formattedBalance}. Recuerda que puedes realizar tus abonos en tienda física o por transferencia. ¡Muchas gracias por tu preferencia!`;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  exportCarteraCSV() {
    const activeDebts = (this.data.customerCredits || []).filter(c => (Number(c.currentBalance) || 0) > 0);
    if (activeDebts.length === 0) {
      this.showToast('No hay cuentas por cobrar activas para exportar', 'warning');
      return;
    }

    const now = new Date();
    const rows = [
      ['Ref Credito', 'Cliente', 'Telefono', 'Credito Otorgado', 'Saldo Pendiente', 'Fecha Vencimiento', 'Dias Mora', 'Estado']
    ];

    activeDebts.forEach(c => {
      const cust = (this.data.customers || []).find(cu => cu.name === c.customer) || {};
      let diffDays = 0;
      let isOverdue = false;
      if (c.dueDate) {
        const due = new Date(c.dueDate + 'T23:59:59');
        diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) isOverdue = true;
      }
      const daysOverdue = isOverdue ? Math.abs(diffDays) : 0;
      const estado = isOverdue ? `Vencido (${daysOverdue}d)` : `Al dia (${diffDays}d)`;

      rows.push([
        c.id,
        `"${(c.customer || '').replace(/"/g, '""')}"`,
        `"${cust.phone || ''}"`,
        c.totalGranted || c.currentBalance,
        c.currentBalance,
        c.dueDate || '',
        daysOverdue,
        estado
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cartera_Clientes_CharlesJoyas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Reporte de cartera exportado exitosamente', 'success');
  }

  renderInformesMargenReal() {
    const tbody = document.getElementById('inf-margen-tbody');
    if (!tbody) return;
    if (!this.data.products || this.data.products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
            No hay productos registrados en el inventario para calcular márgenes reales
          </td>
        </tr>
      `;
      return;
    }

    const searchInput = document.getElementById('inf-margen-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // 1. Calculate store-wide realized sales metrics across recentTransactions
    let storeTotalRev = 0;
    let storeTotalCost = 0;
    const catStats = {};
    (this.data.categories || []).forEach(c => {
      catStats[c.id] = { rev: 0, qty: 0, costSum: 0 };
    });

    (this.data.recentTransactions || []).forEach(tx => {
      (tx.items || []).forEach(it => {
        const itPrice = Number(it.price) || 0;
        const itQty = Number(it.qty !== undefined ? it.qty : (it.quantity || 1)) || 0;
        const p = this.data.products.find(x => x.id === it.id || x.sku === it.sku || (x.name && it.name && x.name.trim().toLowerCase() === it.name.trim().toLowerCase()));
        const pCost = Number(p?.cost || 0);

        if (itPrice > 0 && itQty > 0) {
          const itemRev = itPrice * itQty;
          const itemCost = pCost * itQty;
          storeTotalRev += itemRev;
          storeTotalCost += itemCost;

          if (p && p.category && catStats[p.category]) {
            catStats[p.category].rev += itemRev;
            catStats[p.category].qty += itQty;
            catStats[p.category].costSum += itemCost;
          }
        }
      });
    });

    const storeGlobalMargin = storeTotalRev > 0 
      ? Math.max(5, Math.min(85, Math.round(((storeTotalRev - storeTotalCost) / storeTotalRev) * 1000) / 10)) 
      : 40.0;
    const storeGrossProfit = Math.max(0, storeTotalRev - storeTotalCost);

    // 2. Count products with POS sales
    let productsWithSalesCount = 0;
    this.data.products.forEach(p => {
      const hasSales = (this.data.recentTransactions || []).some(tx => 
        (tx.items || []).some(it => (it.id === p.id || it.sku === p.sku || (it.name && p.name && it.name.trim().toLowerCase() === p.name.trim().toLowerCase())) && (Number(it.price) || 0) > 0)
      );
      if (hasSales) productsWithSalesCount++;
    });

    // 3. Update KPI cards in header
    const kpiGlobalEl = document.getElementById('inf-margen-kpi-global');
    if (kpiGlobalEl) kpiGlobalEl.textContent = `+${storeGlobalMargin.toFixed(1)}%`;

    const kpiProductsEl = document.getElementById('inf-margen-kpi-products');
    if (kpiProductsEl) kpiProductsEl.textContent = `${this.data.products.length} Productos`;

    const kpiProductsSubEl = document.getElementById('inf-margen-kpi-products-sub');
    if (kpiProductsSubEl) kpiProductsSubEl.textContent = `${productsWithSalesCount} con ventas reales en POS`;

    const kpiRevEl = document.getElementById('inf-margen-kpi-rev');
    if (kpiRevEl) kpiRevEl.textContent = this.formatCurrency(storeTotalRev);

    const kpiProfitEl = document.getElementById('inf-margen-kpi-profit');
    if (kpiProfitEl) kpiProfitEl.textContent = `Utilidad Bruta: ${this.formatCurrency(storeGrossProfit)}`;

    // 4. Filter products
    const filteredProducts = this.data.products.filter(p => {
      if (!query) return true;
      const matchSku = p.sku && p.sku.toLowerCase().includes(query);
      const matchName = p.name && p.name.toLowerCase().includes(query);
      const matchCat = p.categoryName && p.categoryName.toLowerCase().includes(query);
      return matchSku || matchName || matchCat;
    });

    if (filteredProducts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
            No se encontraron productos coincidentes con "<b>${this.escapeHtml(query)}</b>"
          </td>
        </tr>
      `;
      return;
    }

    // 5. Render Rows
    tbody.innerHTML = filteredProducts.map(p => {
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const isUnitWithWeight = !isPesaje && pWeight > 0;
      const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName || (p.category && c.name && c.name.toLowerCase() === p.category.toLowerCase()));
      const costPerGram = Number(p.cost || cat?.cost || 0);
      const directUnitCost = isUnitWithWeight ? Math.round(pWeight * costPerGram) : costPerGram;

      // Extract real sales for this product
      const soldItems = [];
      (this.data.recentTransactions || []).forEach(tx => {
        (tx.items || []).forEach(it => {
          if (it.id === p.id || it.sku === p.sku || (it.name && p.name && it.name.trim().toLowerCase() === p.name.trim().toLowerCase())) {
            const itPrice = Number(it.price) || 0;
            const itQty = Number(it.qty !== undefined ? it.qty : (it.quantity || 1)) || 0;
            if (itPrice > 0 && itQty > 0) {
              soldItems.push({ price: itPrice, qty: itQty, total: itPrice * itQty });
            }
          }
        });
      });

      let effectivePrice = 0;
      let priceDisplay = '';
      let margin = 0;
      let profit = 0;
      let isEstimated = false;

      if (soldItems.length > 0) {
        // CASE 1: REAL POS SALES
        const totalRev = soldItems.reduce((acc, it) => acc + it.total, 0);
        const totalQty = soldItems.reduce((acc, it) => acc + it.qty, 0);
        const rawAvgPrice = totalQty > 0 ? Math.round(totalRev / totalQty) : soldItems[soldItems.length - 1].price;

        if (isUnitWithWeight && rawAvgPrice < directUnitCost / 2 && directUnitCost > 1000000) {
          // Cashier sold entered price per gram in POS (e.g. 500.000/g for 100g piece)
          effectivePrice = Math.round(rawAvgPrice * pWeight);
          profit = effectivePrice - directUnitCost;
          margin = effectivePrice > 0 ? ((profit / effectivePrice) * 100) : 0;
          priceDisplay = `
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:0.95rem;">${this.formatCurrency(effectivePrice)} / u.</div>
              <div style="font-size:0.72rem; color:var(--emerald-text); font-weight:700; margin-top:2px;">
                ✓ Real POS: ${this.formatCurrency(rawAvgPrice)}/g (${totalQty.toLocaleString('es-CO')}g vend.)
              </div>
            </div>
          `;
        } else {
          effectivePrice = rawAvgPrice;
          profit = effectivePrice - directUnitCost;
          margin = effectivePrice > 0 ? ((profit / effectivePrice) * 100) : 0;
          priceDisplay = `
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:0.95rem;">${this.formatCurrency(effectivePrice)} / ${unit}</div>
              <div style="font-size:0.72rem; color:var(--emerald-text); font-weight:700; margin-top:2px;">
                ✓ Real POS (${totalQty.toLocaleString('es-CO')} ${unit} vend.)
              </div>
            </div>
          `;
        }
      } else if (p.price && Number(p.price) > 0) {
        // CASE 2: CONFIGURED CATALOG PRICE
        effectivePrice = Number(p.price);
        profit = effectivePrice - directUnitCost;
        margin = effectivePrice > 0 ? ((profit / effectivePrice) * 100) : 0;
        priceDisplay = `
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:700; color:var(--text-main); font-size:0.95rem;">${this.formatCurrency(effectivePrice)} / ${unit}</span>
              <span class="badge" style="background:rgba(2,132,199,0.1); color:var(--brand-primary); font-size:0.68rem; font-weight:700;">Catálogo</span>
              <button type="button" class="btn text-xs" style="padding:1px 5px; font-size:0.65rem;" onclick="app.promptSetProductPrice('${p.id}')" title="Modificar precio">✏️</button>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Precio fijo configurado</div>
          </div>
        `;
      } else {
        // CASE 3: NO SALES YET & NO PRICE -> USE CATEGORY OR STORE BENCHMARK (NEVER 0%!)
        isEstimated = true;
        const catData = catStats[p.category];
        let benchmarkPricePerGram = 0;
        let benchmarkLabel = '';

        if (catData && catData.qty > 0 && Math.round(catData.rev / catData.qty) > costPerGram * 1.05) {
          benchmarkPricePerGram = Math.round(catData.rev / catData.qty);
          benchmarkLabel = `Ref. ${cat?.name || 'Categoría'}`;
        } else {
          const targetMargin = storeGlobalMargin > 15 ? storeGlobalMargin : 40.0;
          benchmarkPricePerGram = Math.round(costPerGram / (1 - (targetMargin / 100)));
          benchmarkLabel = `Sugerido (+${Math.round(targetMargin)}%)`;
        }

        effectivePrice = isUnitWithWeight ? Math.round(benchmarkPricePerGram * pWeight) : benchmarkPricePerGram;
        profit = effectivePrice - directUnitCost;
        margin = effectivePrice > 0 ? ((profit / effectivePrice) * 100) : storeGlobalMargin;

        priceDisplay = `
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:700; color:var(--text-main); font-size:0.95rem;">${this.formatCurrency(effectivePrice)} / ${unit}</span>
              <button type="button" class="btn text-xs" style="padding:2px 6px; font-size:0.68rem; font-weight:700; background:rgba(2,132,199,0.08); border:1px solid rgba(2,132,199,0.25); color:var(--brand-primary); border-radius:4px; cursor:pointer;" onclick="app.promptSetProductPrice('${p.id}')" title="Fijar precio de venta para este producto">
                ✏️ Fijar Precio
              </button>
            </div>
            <div style="font-size:0.72rem; color:var(--brand-primary); font-weight:600; margin-top:2px;">
              ⚡ ${benchmarkLabel} (Sin venta aún)
            </div>
          </div>
        `;
      }

      const marginColor = margin >= 0 ? 'var(--emerald-text)' : 'var(--rose-text)';
      const costDisplay = isUnitWithWeight
        ? `<div><b>${this.formatCurrency(directUnitCost)} / u.</b> <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">(${this.formatCurrency(costPerGram)}/g × ${pWeight}g)</div></div>`
        : `<b>${this.formatCurrency(directUnitCost)} / ${unit}</b>`;

      const marginBadge = isEstimated
        ? `
          <div>
            <span class="font-bold" style="color:#D97706; font-size:1rem;">~${margin.toFixed(1)}%</span>
            <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600; margin-top:2px;">(Estimado s/costo)</div>
          </div>
        `
        : `
          <div>
            <span class="font-bold" style="color:${marginColor}; font-size:1.05rem;">${margin >= 0 ? '+' : ''}${margin.toFixed(1)}%</span>
            <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600; margin-top:2px;">
              ${profit >= 0 ? '+' : ''}${this.formatCurrency(profit)}/${unit}
            </div>
          </div>
        `;

      return `
        <tr>
          <td><b>${this.escapeHtml(p.sku || p.id || '')}</b></td>
          <td>
            <div style="font-weight:700; color:var(--text-main);">${this.escapeHtml(p.name || '')}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml(cat?.name || p.categoryName || 'General')} · ${p.measureType || 'Pesaje'}</div>
          </td>
          <td>${priceDisplay}</td>
          <td>${costDisplay}</td>
          <td>${marginBadge}</td>
        </tr>
      `;
    }).join('');
  }

  async promptSetProductPrice(productId) {
    const p = this.data.products.find(x => x.id === productId);
    if (!p) return;
    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
    const currentPrice = Number(p.price) || 0;
    
    const input = window.prompt(
      `Fijar precio de venta para "${p.name}" (por ${unit}):\n\nIngrese el valor en pesos colombianos (COP):`, 
      currentPrice > 0 ? String(currentPrice) : ''
    );
    if (input === null) return; // Cancelled

    const cleanVal = this.parseCleanNumber(input);
    if (isNaN(cleanVal) || cleanVal < 0) {
      this.showToast('Debe ingresar un valor numérico válido mayor o igual a 0', 'warning');
      return;
    }

    p.price = Math.round(cleanVal);
    this.saveDataLocally();
    if (typeof this.saveDataRemotely === 'function') {
      await this.saveDataRemotely();
    }
    this.renderInformesMargenReal();
    this.showToast(`Precio de venta de "${p.name}" fijado en ${this.formatCurrency(p.price)} / ${unit}`, 'success');
  }

  /* --------------------------------------------------------------------------
     RADAR DE STOCK - PROYECCIÓN DE AGOTAMIENTO 30 DÍAS
     -------------------------------------------------------------------------- */
  calculateProductRadarMetrics(p) {
    if (!p) return null;
    let sold30d = 0;
    if (typeof p.sold30d === 'number') {
      sold30d = p.sold30d;
    } else {
      if (this.data.recentTransactions && Array.isArray(this.data.recentTransactions)) {
        this.data.recentTransactions.forEach(tx => {
          if (tx.items && Array.isArray(tx.items)) {
            tx.items.forEach(it => {
              if (it.id === p.id || (it.name && p.name && it.name.toLowerCase() === p.name.toLowerCase())) {
                sold30d += Number(it.qty) || 0;
              }
            });
          }
        });
      }
    }

    const stock = Number(p.stock) || 0;
    const velDiaria = Number((sold30d / 30).toFixed(2));

    let diasRestantes = 0;
    let diasRestantesDisplay = '—';
    let diasRestantesClass = 'val-dash';

    if (stock <= 0) {
      if (sold30d > 0) {
        diasRestantes = -30;
        diasRestantesDisplay = '-30';
        diasRestantesClass = 'val-red';
      } else {
        diasRestantes = 0;
        diasRestantesDisplay = '—';
        diasRestantesClass = 'val-red';
      }
    } else if (velDiaria <= 0) {
      diasRestantes = Infinity;
      diasRestantesDisplay = '—';
      diasRestantesClass = 'val-dash';
    } else {
      diasRestantes = Math.round(stock / velDiaria);
      diasRestantesDisplay = diasRestantes.toString();
      if (diasRestantes <= 7) diasRestantesClass = 'val-red';
      else if (diasRestantes <= 15) diasRestantesClass = 'val-amber';
      else diasRestantesClass = 'val-green';
    }

    const isAgotado = stock <= 0 || p.status === 'out_of_stock';
    const isCritico = stock > 0 && diasRestantes <= 7;
    const isAlerta = stock > 0 && diasRestantes > 7 && diasRestantes <= 15;
    const isOk = stock > 0 && (diasRestantes > 15 || velDiaria === 0);
    const isSinMovimiento = stock > 0 && sold30d === 0;

    let badgeText = 'Stock';
    let badgeClass = 'radar-badge-green';
    let borderClass = 'card-border-green';

    if (isAgotado) {
      badgeText = 'Vendido';
      badgeClass = 'radar-badge-red';
      borderClass = 'card-border-red';
    } else if (isCritico) {
      badgeText = 'Crítico';
      badgeClass = 'radar-badge-red';
      borderClass = 'card-border-red';
    } else if (isAlerta) {
      badgeText = 'Alerta';
      badgeClass = 'radar-badge-amber';
      borderClass = 'card-border-amber';
    } else {
      badgeText = 'Stock';
      badgeClass = 'radar-badge-green';
      borderClass = 'card-border-green';
    }

    return {
      product: p,
      stock,
      sold30d,
      velDiaria,
      diasRestantes,
      diasRestantesDisplay,
      diasRestantesClass,
      isAgotado,
      isCritico,
      isAlerta,
      isOk,
      isSinMovimiento,
      badgeText,
      badgeClass,
      borderClass
    };
  }

  filterRadarStock(filterType) {
    this.currentRadarFilter = filterType;
    document.querySelectorAll('.radar-filter-pill').forEach(btn => {
      const match = btn.getAttribute('data-filter') === filterType;
      btn.classList.toggle('active', match);
    });
    this.renderRadarStock();
  }

  searchRadarStock(query) {
    if (this._radarSearchTimeout) clearTimeout(this._radarSearchTimeout);
    this._radarSearchTimeout = setTimeout(() => {
      this.radarSearchTerm = (query || '').trim().toLowerCase();
      this.renderRadarStock();
    }, 200);
  }

  renderRadarStock() {
    const container = document.getElementById('radar-cards-container');
    if (!container) return;

    if (!this.currentRadarFilter) this.currentRadarFilter = 'todos';
    if (this.radarSearchTerm === undefined) this.radarSearchTerm = '';

    const allMetrics = (this.data.products || []).filter(Boolean).map(p => this.calculateProductRadarMetrics(p)).filter(Boolean);

    const countTodos = allMetrics.length;
    const countAgotado = allMetrics.filter(m => m.isAgotado).length;
    const countCritico = allMetrics.filter(m => m.isCritico).length;
    const countAlerta = allMetrics.filter(m => m.isAlerta).length;
    const countOk = allMetrics.filter(m => m.isOk).length;
    const countSinMov = allMetrics.filter(m => m.isSinMovimiento).length;

    const elTodos = document.getElementById('radar-count-todos');
    const elAgotado = document.getElementById('radar-count-agotado');
    const elCritico = document.getElementById('radar-count-critico');
    const elAlerta = document.getElementById('radar-count-alerta');
    const elOk = document.getElementById('radar-count-ok');
    const elSinMov = document.getElementById('radar-count-sin_movimiento');

    if (elTodos) elTodos.textContent = countTodos;
    if (elAgotado) elAgotado.textContent = countAgotado;
    if (elCritico) elCritico.textContent = countCritico;
    if (elAlerta) elAlerta.textContent = countAlerta;
    if (elOk) elOk.textContent = countOk;
    if (elSinMov) elSinMov.textContent = countSinMov;

    let filtered = allMetrics;
    if (this.currentRadarFilter === 'agotado') {
      filtered = filtered.filter(m => m.isAgotado);
    } else if (this.currentRadarFilter === 'critico') {
      filtered = filtered.filter(m => m.isCritico);
    } else if (this.currentRadarFilter === 'alerta') {
      filtered = filtered.filter(m => m.isAlerta);
    } else if (this.currentRadarFilter === 'ok') {
      filtered = filtered.filter(m => m.isOk);
    } else if (this.currentRadarFilter === 'sin_movimiento') {
      filtered = filtered.filter(m => m.isSinMovimiento);
    }

    if (this.radarSearchTerm) {
      filtered = filtered.filter(m => this.matchesProductSearch(m.product, this.radarSearchTerm));
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-subtle);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">No se encontraron productos en este filtro</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Intenta seleccionar otra categoría de alerta o borrar la búsqueda.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(m => {
      const p = m.product;
      const catLabel = p.categoryName || p.category || 'General';
      const skuLabel = p.sku || p.id || '';
      const stockValClass = m.stock <= 0 ? 'val-red' : 'val-green';
      const stockDisplay = m.stock % 1 === 0 ? m.stock : Number(m.stock.toFixed(2));
      const isUnidades = (p.measureType || 'Pesaje') === 'Unidades';
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
      const costPerGram = Number(p.cost || cat?.cost || 0);
      const pieceCost = (isUnidades && pWeight > 0) ? Math.round(pWeight * costPerGram) : costPerGram;
      const formattedCost = (isUnidades && pWeight > 0) 
        ? `$ ${pieceCost.toLocaleString('es-CO')} / u. (${this.formatCurrency(costPerGram)}/g)`
        : `$ ${costPerGram.toLocaleString('es-CO')} / g`;
      const velDisplay = m.velDiaria > 0 ? `${m.velDiaria}/d` : '0/d';

      return `
        <div class="radar-card ${m.borderClass}">
          <div>
            <div class="radar-card-top">
              <h3 class="radar-card-title">${this.escapeHtml(p.name)}</h3>
              <span class="radar-card-badge ${m.badgeClass}">${m.badgeText}</span>
            </div>

            <div class="radar-tags-row">
              <span class="radar-tag-chip">${this.escapeHtml(catLabel)}</span>
              ${skuLabel ? `<span class="radar-tag-chip">${this.escapeHtml(skuLabel)}</span>` : ''}
            </div>

            <div class="radar-metrics-box">
              <div class="radar-metric-cell">
                <span class="radar-metric-label">Stock actual</span>
                <span class="radar-metric-val ${stockValClass}">${stockDisplay}</span>
              </div>
              <div class="radar-metric-cell">
                <span class="radar-metric-label">Vendido (30d)</span>
                <span class="radar-metric-val">${m.sold30d}</span>
              </div>
              <div class="radar-metric-cell">
                <span class="radar-metric-label">Vel. diaria</span>
                <span class="radar-metric-val">${velDisplay}</span>
              </div>
              <div class="radar-metric-cell">
                <span class="radar-metric-label">Días restantes</span>
                <span class="radar-metric-val ${m.diasRestantesClass}">${m.diasRestantesDisplay}</span>
              </div>
            </div>
          </div>

          <div class="radar-card-footer">
            <span>Costo: ${formattedCost}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  exportRadarStockExcel() {
    const allMetrics = (this.data.products || []).filter(Boolean).map(p => this.calculateProductRadarMetrics(p)).filter(Boolean);
    
    let metricsToExport = allMetrics;
    if (this.currentRadarFilter === 'agotado') {
      metricsToExport = metricsToExport.filter(m => m.isAgotado);
    } else if (this.currentRadarFilter === 'critico') {
      metricsToExport = metricsToExport.filter(m => m.isCritico);
    } else if (this.currentRadarFilter === 'alerta') {
      metricsToExport = metricsToExport.filter(m => m.isAlerta);
    } else if (this.currentRadarFilter === 'ok') {
      metricsToExport = metricsToExport.filter(m => m.isOk);
    } else if (this.currentRadarFilter === 'sin_movimiento') {
      metricsToExport = metricsToExport.filter(m => m.isSinMovimiento);
    }

    if (this.radarSearchTerm) {
      metricsToExport = metricsToExport.filter(m => this.matchesProductSearch(m.product, this.radarSearchTerm));
    }

    if (metricsToExport.length === 0) {
      this.showToast('No hay productos para exportar en este filtro', 'warning');
      return;
    }

    const escapeXml = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // -------------------------------------------------------------------------
    // HOJA 1: EXACTAMENTE COMO PANTALLAZO 1 (Código, Nombre, Categoría, Stock actual, Estado)
    // -------------------------------------------------------------------------
    const rowsHoja1 = metricsToExport.map(m => {
      const p = m.product || {};
      const sku = p.sku || p.id || '';
      const name = p.name || '';
      const cat = p.categoryName || p.category || '';
      const stock = parseFloat(String(m.stock !== undefined && m.stock !== null ? m.stock : 0).replace(',', '.')) || 0;
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      
      let stockText = '';
      if (isPesaje) {
        stockText = `${Math.round(stock * 100) / 100}g`;
      } else {
        const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || p.unitWeight || 0)).replace(',', '.')) || 0;
        if (pWeight > 0) {
          stockText = `${Math.round(stock * pWeight * 100) / 100}g`;
        } else {
          stockText = `${stock} u.`;
        }
      }

      const isAgotado = stock <= 0 || m.isAgotado;
      const estado = isAgotado ? 'AGOTADO' : 'STOCK';
      const styleCenter = isAgotado ? 'RedCellCenter' : 'GreenCellCenter';
      const styleLeft = isAgotado ? 'RedCellLeft' : 'GreenCellLeft';
      const styleRight = isAgotado ? 'RedCellRight' : 'GreenCellRight';
      const styleBoldCenter = isAgotado ? 'RedCellCenter' : 'GreenCellBoldCenter';

      return `
   <Row ss:Height="21">
    <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${escapeXml(sku)}</Data></Cell>
    <Cell ss:StyleID="${styleLeft}"><Data ss:Type="String">${escapeXml(name)}</Data></Cell>
    <Cell ss:StyleID="${styleLeft}"><Data ss:Type="String">${escapeXml(cat)}</Data></Cell>
    <Cell ss:StyleID="${styleRight}"><Data ss:Type="String">${escapeXml(stockText)}</Data></Cell>
    <Cell ss:StyleID="${styleBoldCenter}"><Data ss:Type="String">${escapeXml(estado)}</Data></Cell>
   </Row>`;
    }).join('');

    // -------------------------------------------------------------------------
    // HOJA 2: EXACTAMENTE COMO PANTALLAZO 2 (Categoría, Stock total, Total ponderado)
    // -------------------------------------------------------------------------
    const allProducts = this.data.products || [];
    const allCategories = this.data.categories || [];
    const catMap = new Map();

    allCategories.forEach(c => {
      const key = (c.name || c.id || '').trim().toLowerCase();
      catMap.set(key, {
        name: c.name || c.id,
        baseCost: Number(c.cost) || 0,
        availableGrams: Number(c.availableGrams) || 0,
        totalGrams: 0,
        totalCostVal: 0
      });
    });

    allProducts.forEach(p => {
      const rawCatName = (p.categoryName || p.category || 'General').trim();
      const catKey = rawCatName.toLowerCase();
      if (!catMap.has(catKey)) {
        catMap.set(catKey, {
          name: rawCatName,
          baseCost: Number(p.cost) || 0,
          availableGrams: 0,
          totalGrams: 0,
          totalCostVal: 0
        });
      }
      const entry = catMap.get(catKey);
      const grams = this.getGramsFromProduct(p);
      const cost = Number(p.cost) || 0;
      entry.totalGrams += grams;
      entry.totalCostVal += (grams * cost);
    });

    const rowsHoja2 = Array.from(catMap.values())
      .filter(cat => cat.totalGrams > 0 || cat.availableGrams > 0 || cat.baseCost > 0)
      .map(cat => {
        const totGrams = Math.round((cat.totalGrams > 0 ? cat.totalGrams : cat.availableGrams) * 100) / 100;
        const avgCost = cat.totalGrams > 0 ? Math.round(cat.totalCostVal / cat.totalGrams) : cat.baseCost;
        const stockTotalText = `${totGrams}g`;

        return `
   <Row ss:Height="21">
    <Cell ss:StyleID="Hoja2CellLeft"><Data ss:Type="String">${escapeXml(cat.name)}</Data></Cell>
    <Cell ss:StyleID="Hoja2CellRight"><Data ss:Type="String">${escapeXml(stockTotalText)}</Data></Cell>
    <Cell ss:StyleID="Hoja2Currency"><Data ss:Type="Number">${avgCost}</Data></Cell>
   </Row>`;
      }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Charles Joyas POS</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
  </Style>

  <!-- Encabezados Estilo Dark Navy (Hoja 1 y Hoja 2) -->
  <Style ss:ID="HeaderCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>

  <!-- Hoja 1: Celdas Verde Vivo (STOCK - Pantallazo 1) -->
  <Style ss:ID="GreenCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
   <Interior ss:Color="#00B050" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
   </Borders>
  </Style>
  <Style ss:ID="GreenCellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
   <Interior ss:Color="#00B050" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
   </Borders>
  </Style>
  <Style ss:ID="GreenCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
   <Interior ss:Color="#00B050" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
   </Borders>
  </Style>
  <Style ss:ID="GreenCellBoldCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#00B050" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
   </Borders>
  </Style>

  <!-- Hoja 1: Celdas Agotado (Rojo Suave) -->
  <Style ss:ID="RedCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="RedCellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="RedCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>

  <!-- Hoja 2: Celdas Blancas con Bordes (Pantallazo 2) -->
  <Style ss:ID="Hoja2CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="Hoja2CellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="Hoja2Currency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <NumberFormat ss:Format="&quot;$&quot; #,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>

 <!-- HOJA 1: EXACTAMENTE COMO PANTALLAZO 1 -->
 <Worksheet ss:Name="Stock">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="240"/>
   <Column ss:Width="170"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Código</Data></Cell>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Nombre</Data></Cell>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Categoría</Data></Cell>
    <Cell ss:StyleID="HeaderRight"><Data ss:Type="String">Stock actual</Data></Cell>
    <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Estado</Data></Cell>
   </Row>
   ${rowsHoja1}
  </Table>
 </Worksheet>

 <!-- HOJA 2: EXACTAMENTE COMO PANTALLAZO 2 -->
 <Worksheet ss:Name="Categorías">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Categoría</Data></Cell>
    <Cell ss:StyleID="HeaderRight"><Data ss:Type="String">Stock total</Data></Cell>
    <Cell ss:StyleID="HeaderRight"><Data ss:Type="String">Total ponderado</Data></Cell>
   </Row>
   ${rowsHoja2}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filterSuffix = this.currentRadarFilter !== 'todos' ? `_${this.currentRadarFilter}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Radar_Stock_${dateStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast(`Libro Excel exportado exitosamente (${metricsToExport.length} productos en Hoja 1, Categorías en Hoja 2)`, 'success');
  }

  /* --------------------------------------------------------------------------
     TENDENCIA DE PRODUCTO (EVOLUCIÓN DIARIA DEL MES ACTUAL)
     -------------------------------------------------------------------------- */
  renderTendenciaProducto() {
    this.populateTendenciaDatalist();
    const input = document.getElementById('tendencia-product-input');
    const query = input ? input.value.trim() : '0';
    this.consultarTendencia(query || '0');
  }

  populateTendenciaDatalist() {
    const dl = document.getElementById('tendencia-products-datalist');
    if (!dl || !this.data.products) return;
    dl.innerHTML = this.data.products.map(p => {
      const code = this.escapeHtml(p.sku || p.id || '');
      const name = this.escapeHtml(p.name || '');
      return `<option value="${code}">${code} — ${name}</option>
       <option value="${name}">${name} (Código: ${code})</option>`;
    }).join('');
  }

  consultarTendencia(customQuery = null) {
    const input = document.getElementById('tendencia-product-input');
    let query = customQuery !== null ? customQuery : (input ? input.value.trim() : '0');

    const bannerEl = document.getElementById('tendencia-code-banner');
    const bannerCodeLabel = document.getElementById('tendencia-banner-code-label');
    const bannerExtraInfo = document.getElementById('tendencia-banner-extra-info');
    const kpiUnidades = document.getElementById('tendencia-val-unidades');
    const kpiIngresos = document.getElementById('tendencia-val-ingresos');
    const kpiUtilidad = document.getElementById('tendencia-val-utilidad');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 to 11
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // X-axis day labels: '1', '2', ..., daysInMonth
    const dayLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    let unitsData = new Array(daysInMonth).fill(0);
    let revenueData = new Array(daysInMonth).fill(0);
    let matchedProduct = null;

    if (query && query !== '0') {
      const normQuery = this.normalizeSearchStr(query);

      // Priority 1: Exact SKU, ID, or barcode
      matchedProduct = (this.data.products || []).find(p => 
        this.normalizeSearchStr(p.sku) === normQuery ||
        this.normalizeSearchStr(p.id) === normQuery ||
        this.normalizeSearchStr(p.barcode) === normQuery
      );

      // Priority 2: Exact Name
      if (!matchedProduct) {
        matchedProduct = (this.data.products || []).find(p => 
          this.normalizeSearchStr(p.name) === normQuery
        );
      }

      // Priority 3: Fuzzy / multi-token product search
      if (!matchedProduct) {
        matchedProduct = (this.data.products || []).find(p => 
          this.matchesProductSearch(p, query)
        );
      }
    }

    if (matchedProduct) {
      const codeStr = matchedProduct.sku || matchedProduct.id;
      if (bannerCodeLabel) bannerCodeLabel.textContent = `Código: ${codeStr} — ${matchedProduct.name}`;
      if (bannerExtraInfo) bannerExtraInfo.textContent = `Categoría: ${matchedProduct.categoryName || matchedProduct.category || 'General'} | Medida: ${matchedProduct.measureType || 'Unidades'} | Stock: ${matchedProduct.stock} ${matchedProduct.measureType === 'Pesaje' ? 'g' : 'u.'}`;

      // Initialize monthly sales map if missing
      if (!matchedProduct.monthlySales) matchedProduct.monthlySales = {};
      if (!matchedProduct.monthlySales[monthKey]) {
        matchedProduct.monthlySales[monthKey] = {};
        // If product has sold30d or is in top products, seed realistic sales across days of current month
        const totalSold = matchedProduct.sold30d || 0;
        if (totalSold > 0) {
          const currentDay = Math.min(now.getDate(), daysInMonth);
          const activeDays = Math.max(1, Math.min(6, currentDay));
          let remaining = totalSold;
          for (let step = 0; step < activeDays; step++) {
            const d = Math.max(1, currentDay - step * 3);
            let portion = 0;
            if (step === activeDays - 1) {
              portion = remaining;
            } else if (matchedProduct.measureType === 'Pesaje') {
              portion = +(remaining / (activeDays - step)).toFixed(2);
            } else {
              portion = Math.max(1, Math.round(remaining / (activeDays - step)));
            }
            if (portion > remaining) portion = remaining;
            matchedProduct.monthlySales[monthKey][d] = portion;
            remaining -= portion;
            if (remaining <= 0) break;
          }
        }
      }

      const salesMap = matchedProduct.monthlySales[monthKey] || {};
      let totalUnits = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const u = Number(salesMap[day]) || 0;
        const rev = u * (matchedProduct.price || 0);
        unitsData[day - 1] = u;
        revenueData[day - 1] = rev;
        totalUnits += u;
        totalRevenue += rev;
        totalCost += u * (matchedProduct.cost || 0);
      }

      const totalProfit = totalRevenue - totalCost;
      const unitSuffix = matchedProduct.measureType === 'Pesaje' ? ' g' : ' u.';

      if (kpiUnidades) kpiUnidades.textContent = `${totalUnits.toLocaleString('es-CO')}${unitSuffix}`;
      if (kpiIngresos) kpiIngresos.textContent = `$ ${Math.round(totalRevenue).toLocaleString('es-CO')}`;
      if (kpiUtilidad) kpiUtilidad.textContent = `$ ${Math.round(totalProfit).toLocaleString('es-CO')}`;

      this.renderTendenciaChart(matchedProduct, dayLabels, unitsData, revenueData, true);
    } else {
      // 0 or empty or product not found
      if (query && query !== '0') {
        this.showToast(`Producto "${query}" no encontrado`, 'warning');
      }
      if (bannerCodeLabel) bannerCodeLabel.textContent = 'Código:';
      if (bannerExtraInfo) bannerExtraInfo.textContent = '';
      if (kpiUnidades) kpiUnidades.textContent = '0';
      if (kpiIngresos) kpiIngresos.textContent = '$ 0';
      if (kpiUtilidad) kpiUtilidad.textContent = '$ 0';

      this.renderTendenciaChart(null, dayLabels, unitsData, revenueData, false);
    }
  }

  renderTendenciaChart(product, dayLabels, unitsData, revenueData, hasProduct) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('tendenciaDailyChart');
    if (!canvas) return;

    if (this.charts.tendenciaDaily) {
      this.charts.tendenciaDaily.destroy();
    }

    const unitSuffix = product ? (product.measureType === 'Pesaje' ? 'g' : 'u.') : 'u.';
    const isZeroState = !hasProduct || (unitsData.every(v => v === 0) && revenueData.every(v => v === 0));

    // Custom formatting for axis scales
    const yAxisConfig = {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Unidades',
        color: '#64748b',
        font: { size: 12, weight: '600' }
      },
      grid: {
        color: 'rgba(226, 232, 240, 0.7)',
        drawBorder: false
      },
      ticks: {
        color: '#64748b',
        font: { size: 11 },
        ...(isZeroState ? {
          suggestedMin: -1,
          suggestedMax: 1,
          stepSize: 0.2,
          callback: (val) => String(val).replace('.', ',')
        } : {
          beginAtZero: true,
          precision: product && product.measureType === 'Pesaje' ? 2 : 0
        })
      }
    };

    const y1AxisConfig = {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Ingresos (COP)',
        color: '#64748b',
        font: { size: 12, weight: '600' }
      },
      grid: {
        drawOnChartArea: false,
        drawBorder: false
      },
      ticks: {
        color: '#64748b',
        font: { size: 11 },
        ...(isZeroState ? {
          suggestedMin: -1,
          suggestedMax: 1,
          stepSize: 0.2,
          callback: (val) => String(val).replace('.', ',')
        } : {
          beginAtZero: true,
          callback: (val) => '$ ' + Number(val).toLocaleString('es-CO')
        })
      }
    };

    this.charts.tendenciaDaily = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: 'Unidades vendidas',
            yAxisID: 'y',
            data: unitsData,
            borderColor: '#00d2d3',
            backgroundColor: 'rgba(0, 210, 211, 0.08)',
            pointBorderColor: '#00d2d3',
            pointBackgroundColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            borderWidth: 2.5,
            tension: 0.2,
            fill: false
          },
          {
            label: 'Ingresos',
            yAxisID: 'y1',
            data: revenueData,
            borderColor: '#536dfe',
            backgroundColor: 'rgba(83, 109, 254, 0.08)',
            pointBorderColor: '#536dfe',
            pointBackgroundColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            borderWidth: 2.5,
            tension: 0.2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // Using custom HTML legend matching photo
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                return `Día ${items[0].label} del mes`;
              },
              label: (ctx) => {
                const val = ctx.parsed.y !== null ? ctx.parsed.y : 0;
                if (ctx.datasetIndex === 0) {
                  return ` Unidades vendidas: ${val} ${unitSuffix}`;
                } else {
                  return ` Ingresos: $ ${Math.round(val).toLocaleString('es-CO')} COP`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(226, 232, 240, 0.5)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { size: 10.5 }
            }
          },
          y: yAxisConfig,
          y1: y1AxisConfig
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     POS CASHIER SYSTEM
     -------------------------------------------------------------------------- */
  setupPOS() {
    this.renderCategoryPills();
    this.renderPOSProducts();
    this.renderCart();

    const searchInput = document.getElementById('pos-product-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderPOSProducts());

      // Barcode scanner / Enter key quick-add support
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          this.renderPOSProducts();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const term = searchInput.value.trim();
          if (!term) return;

          // Priority 1: Exact code match (SKU, barcode, ID)
          const normTerm = this.normalizeSearchStr(term);
          const exactCodeMatch = (this.data.products || []).find(p => 
            this.normalizeSearchStr(p.sku) === normTerm ||
            this.normalizeSearchStr(p.barcode) === normTerm ||
            this.normalizeSearchStr(p.id) === normTerm
          );

          if (exactCodeMatch) {
            this.addToCart(exactCodeMatch.id);
            this.showToast(`Producto agregado: "${exactCodeMatch.name}" [${exactCodeMatch.sku || exactCodeMatch.id}]`, 'success');
            searchInput.value = '';
            this.renderPOSProducts();
            return;
          }

          // Priority 2: Exactly 1 matching product for current search term
          const filtered = (this.data.products || []).filter(p => this.matchesProductSearch(p, term));
          if (filtered.length === 1) {
            this.addToCart(filtered[0].id);
            this.showToast(`Producto agregado: "${filtered[0].name}" [${filtered[0].sku || filtered[0].id}]`, 'success');
            searchInput.value = '';
            this.renderPOSProducts();
          }
        }
      });
    }

    const scanBtn = document.getElementById('barcode-scan-sim-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        const activeProds = this.data.products.filter(p => p.stock > 0);
        if (activeProds.length > 0) {
          const randomItem = activeProds[Math.floor(Math.random() * activeProds.length)];
          this.addToCart(randomItem.id);
          this.showToast(`Escáner: "${randomItem.name}" [${randomItem.sku || randomItem.id}] añadido al carrito`);
        }
      });
    }
  }

  renderCategoryPills() {
    const container = document.getElementById('pos-category-pills');
    if (!container) return;

    if (this.selectedCategory !== 'all' && !(this.data.categories || []).some(c => c.id === this.selectedCategory)) {
      this.selectedCategory = 'all';
    }

    const allBtn = `
      <button class="cat-pill ${this.selectedCategory === 'all' ? 'active' : ''}" onclick="app.setCategoryFilter('all')">
        <span>Todas</span>
      </button>
    `;

    container.innerHTML = allBtn + (this.data.categories || []).map(cat => {
      let gramsDisplay = '';
      if (cat.availableGrams !== undefined && cat.availableGrams !== null) {
        const gramsVal = Number(cat.availableGrams) || 0;
        if (gramsVal > 0) {
          const formattedGrams = gramsVal.toLocaleString('es-CO', { minimumFractionDigits: (gramsVal % 1 !== 0 || gramsVal < 1 ? 2 : 0), maximumFractionDigits: 2 });
          gramsDisplay = ` <span style="font-size:0.72rem; opacity:0.95; font-weight:700; background:rgba(0,0,0,0.18); padding:1px 6px; border-radius:4px; margin-left:5px;">⚖️ ${formattedGrams}g</span>`;
        } else {
          gramsDisplay = ` <span style="font-size:0.72rem; opacity:0.85; font-weight:700; background:rgba(239,68,68,0.25); color:#FCA5A5; padding:1px 6px; border-radius:4px; margin-left:5px;">⚖️ 0.00g</span>`;
        }
      }
      return `
        <button class="cat-pill ${this.selectedCategory === cat.id ? 'active' : ''}" onclick="app.setCategoryFilter('${this.escapeHtml(cat.id)}')">
          <span>${this.escapeHtml(cat.name)}${gramsDisplay}</span>
        </button>
      `;
    }).join('');
  }

  setCategoryFilter(catId) {
    this.selectedCategory = catId;
    this.renderCategoryPills();
    this.renderPOSProducts();
  }

  renderPosMetalRates() {
    if (!this.data) return;
    if (!this.data.store) this.data.store = {};
    if (!this.data.store.metalRates) {
      this.data.store.metalRates = {
        oro18k: 580000,
        oro18kItaliano: 580000,
        oro14k: 510000,
        oro18kNacional: 510000,
        balineria: 38000,
        plata925: 38000
      };
    }
    const rates = this.data.store.metalRates;
    const el18 = document.getElementById('rate-display-oro18k');
    const el14 = document.getElementById('rate-display-oro14k');
    const el925 = document.getElementById('rate-display-plata925');
    if (el18) el18.textContent = `$ ${this.formatNumberWithCommas(rates.oro18kItaliano || rates.oro18k || 580000)} COP/g`;
    if (el14) el14.textContent = `$ ${this.formatNumberWithCommas(rates.oro18kNacional || rates.oro14k || 510000)} COP/g`;
    if (el925) el925.textContent = `$ ${this.formatNumberWithCommas(rates.balineria || rates.plata925 || 38000)} COP/g`;

    const editBtn = document.getElementById('btn-edit-metal-rates');
    if (editBtn) {
      const isSuperAdmin = this.currentUser?.role === 'Super Admin';
      editBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    }
  }

  openEditMetalRatesModal() {
    if (this.currentUser?.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Administrador puede modificar las cotizaciones del día.', 'danger');
      return;
    }
    if (!this.data.store) this.data.store = {};
    if (!this.data.store.metalRates) {
      this.data.store.metalRates = {
        oro18k: 580000,
        oro18kItaliano: 580000,
        oro14k: 510000,
        oro18kNacional: 510000,
        balineria: 38000,
        plata925: 38000
      };
    }
    const rates = this.data.store.metalRates;
    const in18 = document.getElementById('input-rate-oro18k');
    const in14 = document.getElementById('input-rate-oro14k');
    const in925 = document.getElementById('input-rate-plata925');
    if (in18) in18.value = this.formatNumberWithCommas(rates.oro18kItaliano || rates.oro18k || 580000);
    if (in14) in14.value = this.formatNumberWithCommas(rates.oro18kNacional || rates.oro14k || 510000);
    if (in925) in925.value = this.formatNumberWithCommas(rates.balineria || rates.plata925 || 38000);

    this.openModal('metal-rates-modal');
  }

  async saveMetalRates() {
    if (this.currentUser?.role !== 'Super Admin') {
      this.showToast('Acceso Denegado: Solo el Super Administrador puede guardar las cotizaciones del día.', 'danger');
      return;
    }
    const val18 = this.parseCleanNumber(document.getElementById('input-rate-oro18k')?.value);
    const val14 = this.parseCleanNumber(document.getElementById('input-rate-oro14k')?.value);
    const val925 = this.parseCleanNumber(document.getElementById('input-rate-plata925')?.value);

    if (isNaN(val18) || val18 <= 0 || isNaN(val14) || val14 <= 0 || isNaN(val925) || val925 <= 0) {
      this.showToast('Por favor ingresa valores numéricos válidos mayores a 0 para todas las cotizaciones.', 'warning');
      return;
    }

    if (!this.data.store) this.data.store = {};
    this.data.store.metalRates = {
      oro18k: Math.round(val18),
      oro18kItaliano: Math.round(val18),
      oro14k: Math.round(val14),
      oro18kNacional: Math.round(val14),
      balineria: Math.round(val925),
      plata925: Math.round(val925)
    };

    this.renderPosMetalRates();
    await this.savePersistence();
    this.closeModal('metal-rates-modal');
    this.showToast('Cotizaciones del día actualizadas y guardadas con éxito para todos los usuarios.', 'success');
  }

  renderPOSCatalog() {
    return this.renderPOSProducts();
  }

  renderPOSProducts() {
    const grid = document.getElementById('pos-products-grid');
    const searchVal = (document.getElementById('pos-product-search')?.value || '').trim();
    if (!grid) return;

    const filtered = (this.data.products || []).filter(p => {
      const matchCat = searchVal !== '' || this.selectedCategory === 'all' || p.category === this.selectedCategory;
      const matchSearch = this.matchesProductSearch(p, searchVal);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 600;">No se encontraron productos coincidentes</div>
          <div style="font-size: 0.8rem; margin-top: 0.25rem;">Prueba buscando por código o por nombre.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const unit = isPesaje ? (p.weightUnit || 'g') : 'u.';
      const unitLabel = isPesaje ? `/ ${unit}` : '';
      const stockUnit = unit;
      const skuBadge = p.sku || p.id || 'S/C';
      const isAgotado = p.stock <= 0 || p.status === 'out_of_stock';
      const isStockBajo = !isAgotado && p.stock <= (p.minStock || (isPesaje ? (unit === 'kg' ? 0.001 : 0.5) : 2));

      let stockPill = '';
      if (isAgotado) {
        stockPill = `<span class="badge" style="background:#EF4444; color:#FFFFFF; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">AGOTADO</span>`;
      } else if (isStockBajo) {
        stockPill = `<span class="badge" style="background:#FEF3C7; color:#B45309; font-size:0.65rem; font-weight:700; padding:2px 6px; border-radius:4px;">Stock: ${p.stock} ${stockUnit}</span>`;
      } else {
        stockPill = `<span class="badge" style="background:#D1FAE5; color:#065F46; font-size:0.65rem; font-weight:700; padding:2px 6px; border-radius:4px;">Disp: ${p.stock} ${stockUnit}</span>`;
      }

      return `
        <div class="pos-product-card" style="${isAgotado ? 'opacity:0.75; border-color:rgba(239,68,68,0.35);' : ''}" onclick="${isAgotado ? '' : `app.openAddToCartModal('${this.escapeHtml(p.id)}')`}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span class="badge" style="background:var(--canvas-bg); color:var(--text-main); border:1px solid var(--border-color); font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; letter-spacing:0.02em;">Código: ${this.escapeHtml(skuBadge)}</span>
            <div style="display:flex; gap:4px; align-items:center;">
              ${stockPill}
              <span class="badge" style="background:${isPesaje ? '#FEF3C7' : '#E0E7FF'}; color:${isPesaje ? '#D97706' : '#4F46E5'}; font-size:0.65rem; font-weight:700; padding:2px 5px; border-radius:4px;">${isPesaje ? '⚖️' : '📦'}</span>
              ${!isPesaje && (p.pieceWeight || p.weight) > 0 ? `<span class="badge" style="background:#FEF3C7; color:#B45309; font-size:0.65rem; font-weight:700; padding:2px 5px; border-radius:4px;" title="Peso por unidad: ${p.pieceWeight || p.weight} g">⚖️ ${p.pieceWeight || p.weight}g</span>` : ''}
            </div>
          </div>
          <div class="pos-product-title" title="${this.escapeHtml(p.name)}" style="font-size:0.92rem; font-weight:700; margin-bottom:0.25rem;">${this.escapeHtml(p.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <span>${this.escapeHtml(p.categoryName || p.category || 'General')}</span>
            <span style="font-weight:700; color:${isAgotado ? '#EF4444' : (isStockBajo ? '#D97706' : 'var(--emerald-text)')}; font-size:0.72rem;">${isAgotado ? 'Agotado' : `${p.stock} ${stockUnit}`}</span>
          </div>
          <div class="pos-product-price-row" style="margin-top:auto; padding-top:0.4rem; border-top:1px dashed var(--border-color);">
            <div>
              ${p.price && p.price > 0 
                ? `<span class="pos-product-price" style="font-size:1.05rem;">${this.formatCurrency(p.price)}</span><span style="font-size:0.75rem; color:var(--text-subtle);">${unitLabel}</span>` 
                : `
                  <div>
                    <span class="badge" style="background:rgba(2,132,199,0.1); color:var(--brand-primary); font-size:0.72rem; font-weight:700; padding:2px 6px;">Fijar precio en POS</span>
                    ${(() => {
                      const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
                      const costPerGram = Number(p.cost || cat?.cost || 0);
                      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
                      const unitReplacementCost = (!isPesaje && pWeight > 0) ? Math.round(pWeight * costPerGram) : costPerGram;
                      return unitReplacementCost > 0 
                        ? `<div style="font-size:0.68rem; color:#D97706; font-weight:700; margin-top:2px;">Costo base: ${this.formatCurrency(unitReplacementCost)}/${unit}</div>`
                        : '';
                    })()}
                  </div>
                `
              }
            </div>
            <button class="pos-add-btn" onclick="${isAgotado ? '' : `event.stopPropagation(); app.openAddToCartModal('${this.escapeHtml(p.id)}')`}" title="${isAgotado ? 'Producto agotado' : 'Fijar precio y agregar'}" style="${isAgotado ? 'background:var(--border-color); color:var(--text-subtle); cursor:not-allowed;' : ''}">${isAgotado ? '✕' : '+'}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  getCartItemPrice(item) {
    if (!item) return 0;
    if (item.customPrice !== undefined && item.customPrice !== null && !isNaN(Number(item.customPrice))) {
      return Number(item.customPrice);
    }
    if (item.product?.price && Number(item.product.price) > 0) {
      return Number(item.product.price);
    }
    const p = item.product;
    if (p) {
      const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
      const costPerGram = Number(p.cost || cat?.cost || 0);
      const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
      const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
      const unitCost = (!isPesaje && pWeight > 0) ? Math.round(pWeight * costPerGram) : costPerGram;
      if (unitCost > 0) return unitCost;
    }
    return 0;
  }

  getCartSubtotal() {
    return this.cart.reduce((sum, item) => sum + (this.getCartItemPrice(item) * (Number(item.qty) || 0)), 0);
  }

  getCartGrandTotal() {
    const sub = this.getCartSubtotal();
    return sub * (1 + (this.data.store?.taxRate || 0) / 100);
  }

  openAddToCartModal(productId) {
    const p = this.data.products.find(item => item.id === productId);
    if (!p) return;
    const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
    const stockNum = parseFloat(String(p.stock || 0).replace(',', '.')) || 0;
    if (stockNum <= 0) {
      this.showToast('Producto sin existencias disponibles', 'danger');
      return;
    }

    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const unit = (isPesaje || isUnitWithWeight) ? 'g' : (p.weightUnit || 'u.');
    const maxAvailableQty = isUnitWithWeight ? Math.round(stockNum * pWeight * 100) / 100 : stockNum;

    const elId = document.getElementById('pos-add-product-id');
    const elName = document.getElementById('pos-add-product-name');
    const elSku = document.getElementById('pos-add-product-sku');
    const elCat = document.getElementById('pos-add-product-cat');
    const elStock = document.getElementById('pos-add-stock-badge');
    const elPill = document.getElementById('pos-add-measure-pill');
    const elWeightInfo = document.getElementById('pos-add-unit-weight-info');
    const elPieceWeightVal = document.getElementById('pos-add-piece-weight-val');
    const elTotalWeightVal = document.getElementById('pos-add-total-piece-weight-val');
    const elQtyLabel = document.getElementById('pos-add-qty-label');
    const elBasePrice = document.getElementById('pos-add-base-price-display');
    const elBaseSub = document.getElementById('pos-add-base-price-sub');
    const elCost = document.getElementById('pos-add-cost-display');
    const elCostSub = document.getElementById('pos-add-cost-sub');
    const elQtyInput = document.getElementById('pos-add-qty-input');
    const elUnitBadge = document.getElementById('pos-add-unit-badge');
    const elMaxStockHint = document.getElementById('pos-add-max-stock-hint');
    const elPriceInput = document.getElementById('pos-add-custom-price-input');

    if (elId) elId.value = p.id;
    if (elName) elName.textContent = p.name;
    if (elSku) elSku.textContent = `Código: ${p.sku || p.id}`;
    if (elCat) elCat.textContent = cat?.name || p.categoryName || p.category || 'General';
    if (elStock) elStock.textContent = isUnitWithWeight ? `Stock: ${stockNum} u. (${maxAvailableQty} g)` : `Stock: ${stockNum} ${unit}`;
    if (elPill) {
      if (isPesaje) {
        elPill.textContent = '⚖️ Pesaje';
        elPill.style.background = '#FEF3C7';
        elPill.style.color = '#D97706';
      } else {
        elPill.textContent = pWeight > 0 ? `📦 Unidad (${pWeight} g/u)` : '📦 Unidad';
        elPill.style.background = '#E0E7FF';
        elPill.style.color = '#4F46E5';
      }
    }

    if (elQtyLabel) {
      if (isUnitWithWeight) {
        elQtyLabel.textContent = `📦 Cantidad de Unidades a Vender (Peso: ${pWeight} g/u) *`;
      } else if (isPesaje) {
        elQtyLabel.textContent = '⚖️ Cantidad / Gramos a Vender *';
      } else {
        elQtyLabel.textContent = '📦 Cantidad de Unidades a Vender *';
      }
    }

    if (elWeightInfo) {
      if (isUnitWithWeight) {
        elWeightInfo.style.display = 'block';
        if (elPieceWeightVal) elPieceWeightVal.textContent = pWeight.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        elWeightInfo.style.display = 'none';
      }
    }

    const basePrice = Number(p.price || 0);
    if (elBasePrice) {
      if (basePrice > 0) {
        elBasePrice.textContent = `${this.formatCurrency(basePrice)} / ${unit}`;
        elBasePrice.style.color = 'var(--brand-primary)';
        if (elBaseSub) elBaseSub.textContent = 'Precio sugerido de lista';
      } else {
        elBasePrice.textContent = 'Sin precio base ($ 0)';
        elBasePrice.style.color = 'var(--text-subtle)';
        if (elBaseSub) elBaseSub.textContent = 'Requiere fijar valor manual';
      }
    }

    const costPerGram = Number(p.cost || cat?.cost || 0);
    const unitReplacementCost = isUnitWithWeight ? Math.round(pWeight * costPerGram) : costPerGram;

    if (elCost) {
      if (unitReplacementCost > 0) {
        elCost.textContent = `${this.formatCurrency(unitReplacementCost)} / u.`;
        elCost.style.color = '#D97706';
        if (elCostSub) {
          if (isUnitWithWeight) {
            elCostSub.textContent = `${this.formatCurrency(costPerGram)}/g × ${pWeight.toLocaleString('es-CO')} g (${cat?.name || 'Metal'})`;
          } else {
            elCostSub.textContent = cat?.name ? `Costo base de ${cat.name}` : 'Costo de reposición';
          }
        }
      } else {
        elCost.textContent = 'Sin costo registrado';
        elCost.style.color = 'var(--text-subtle)';
        if (elCostSub) elCostSub.textContent = 'No definido';
      }
    }

    const existing = this.cart.find(i => i.product.id === p.id);
    let defaultQty = 1;
    if (existing) {
      defaultQty = existing.qty;
    } else {
      if (isUnitWithWeight) {
        defaultQty = pWeight;
      } else if (isPesaje) {
        defaultQty = stockNum < 1 ? stockNum : 1;
      } else {
        defaultQty = 1;
      }
    }

    if (elQtyInput) {
      elQtyInput.value = this.formatNumberWithCommas(defaultQty, isPesaje || isUnitWithWeight);
      elQtyInput.max = maxAvailableQty;
    }
    if (elUnitBadge) elUnitBadge.textContent = unit;
    if (elMaxStockHint) {
      elMaxStockHint.textContent = isUnitWithWeight
        ? `Máx: ${this.formatNumberWithCommas(maxAvailableQty, true)} g (${stockNum} u.)`
        : `Máx: ${stockNum} ${unit}`;
    }

    let initialPrice = 0;
    if (existing && existing.customPrice !== undefined) {
      initialPrice = existing.customPrice;
    } else {
      // Por defecto siempre en 0 como solicitó el usuario, sin precargar sugerencia de costo
      initialPrice = 0;
    }

    if (elPriceInput) {
      elPriceInput.value = this.formatNumberWithCommas(initialPrice);
    }

    this.updateAddToCartModalPreview();
    this.openModal('pos-add-to-cart-modal');

    setTimeout(() => {
      if (elPriceInput) {
        elPriceInput.focus();
        elPriceInput.select();
      }
    }, 150);
  }

  updateAddToCartModalPreview() {
    const pId = document.getElementById('pos-add-product-id')?.value;
    const p = this.data.products.find(item => item.id === pId);
    if (!p) return;

    const qtyVal = this.parseCleanNumber(document.getElementById('pos-add-qty-input')?.value);
    const priceVal = this.parseCleanNumber(document.getElementById('pos-add-custom-price-input')?.value);

    const subtotal = Math.max(0, qtyVal * priceVal);
    const elSub = document.getElementById('pos-add-subtotal-val');
    if (elSub) elSub.textContent = this.formatCurrency(subtotal);

    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const unit = (isPesaje || isUnitWithWeight) ? 'g' : (p.weightUnit || 'u.');

    const elTotalWeightVal = document.getElementById('pos-add-total-piece-weight-val');
    if (elTotalWeightVal && isUnitWithWeight) {
      elTotalWeightVal.textContent = qtyVal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const cat = this.data.categories.find(c => c.id === p.category || c.name === p.categoryName);
    const costPerGram = Number(p.cost || cat?.cost || 0);

    const elMargin = document.getElementById('pos-add-margin-badge');
    if (elMargin) {
      if (priceVal > 0 && costPerGram > 0) {
        const profitPerUnit = priceVal - costPerGram;
        const marginPct = Math.round((profitPerUnit / priceVal) * 1000) / 10;
        if (profitPerUnit >= 0) {
          elMargin.textContent = `Margen: +${marginPct}% (${this.formatCurrency(profitPerUnit)}/${unit})`;
          elMargin.style.background = '#D1FAE5';
          elMargin.style.color = '#065F46';
        } else {
          elMargin.textContent = `ALERTA BAJO COSTO: ${marginPct}% (${this.formatCurrency(profitPerUnit)}/${unit})`;
          elMargin.style.background = '#FEE2E2';
          elMargin.style.color = '#991B1B';
        }
      } else {
        elMargin.textContent = priceVal === 0 ? 'Fijar precio de venta' : 'Margen: N/A';
        elMargin.style.background = 'var(--canvas-bg)';
        elMargin.style.color = 'var(--text-muted)';
      }
    }
  }

  adjustAddToCartQty(delta) {
    const input = document.getElementById('pos-add-qty-input');
    const pId = document.getElementById('pos-add-product-id')?.value;
    const p = this.data.products.find(item => item.id === pId);
    if (!input || !p) return;

    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const stockUnits = parseFloat(String(p.stock || 0).replace(',', '.')) || 0;
    const maxStock = isUnitWithWeight ? Math.round(stockUnits * pWeight * 100) / 100 : stockUnits;

    let step = 1;
    if (isPesaje) {
      step = (p.stock < 1 ? 0.05 : 0.10);
    } else if (isUnitWithWeight) {
      step = pWeight;
    }
    const deltaStep = delta > 0 ? step : -step;

    let cur = this.parseCleanNumber(input.value);
    let next = Math.round((cur + deltaStep) * 100) / 100;
    const minVal = isUnitWithWeight ? pWeight : (isPesaje ? 0.01 : 1);
    if (next < minVal) next = minVal;
    if (next > maxStock) next = maxStock;
    input.value = this.formatNumberWithCommas(next, isPesaje || isUnitWithWeight);
    this.updateAddToCartModalPreview();
  }

  adjustAddToCartPrice(deltaPercent) {
    const input = document.getElementById('pos-add-custom-price-input');
    if (!input) return;
    const cur = this.parseCleanNumber(input.value);
    if (cur <= 0) return;
    const next = Math.round(cur * (1 + deltaPercent));
    input.value = this.formatNumberWithCommas(next);
    this.updateAddToCartModalPreview();
  }

  setAddToCartPriceToBase() {
    const pId = document.getElementById('pos-add-product-id')?.value;
    const p = this.data.products.find(item => item.id === pId);
    const input = document.getElementById('pos-add-custom-price-input');
    if (p && input) {
      if (p.price && Number(p.price) > 0) {
        input.value = this.formatNumberWithCommas(p.price);
      } else {
        const cat = this.data.categories?.find(c => c.id === p.category || c.name === p.categoryName);
        const costPerGram = Number(p.cost || cat?.cost || 0);
        const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
        const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
        const isUnitWithWeight = !isPesaje && pWeight > 0;
        const suggestedPrice = isUnitWithWeight ? costPerGram : (isPesaje ? costPerGram : costPerGram);
        input.value = suggestedPrice > 0 ? this.formatNumberWithCommas(suggestedPrice) : '';
      }
      this.updateAddToCartModalPreview();
    }
  }

  confirmAddToCartFromModal() {
    const pId = document.getElementById('pos-add-product-id')?.value;
    const p = this.data.products.find(item => item.id === pId);
    if (!p) return;

    const qtyInput = document.getElementById('pos-add-qty-input');
    const priceInput = document.getElementById('pos-add-custom-price-input');

    const qty = this.parseCleanNumber(qtyInput?.value);
    const price = this.parseCleanNumber(priceInput?.value);

    const stockNum = parseFloat(String(p.stock || 0).replace(',', '.')) || 0;
    const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const maxStock = isUnitWithWeight ? Math.round(stockNum * pWeight * 100) / 100 : stockNum;
    const unit = (isPesaje || isUnitWithWeight) ? 'g' : 'u.';

    if (qty <= 0) {
      this.showToast('Ingrese una cantidad válida mayor a 0', 'warning');
      return;
    }
    if (qty > maxStock) {
      this.showToast(`La cantidad supera el stock disponible (${maxStock} ${unit})`, 'warning');
      return;
    }
    if (isNaN(price) || price < 0) {
      this.showToast('Ingrese un precio de venta válido', 'warning');
      return;
    }

    this.addToCart(p.id, qty, price);
    this.closeModal('pos-add-to-cart-modal');
    this.showToast(`Agregado: ${p.name} (${qty} ${unit} a ${this.formatCurrency(price)})`, 'success');
  }

  setCartItemPrice(productId, rawValue) {
    const item = this.cart.find(i => i.product.id === productId);
    if (!item) return;
    let val = this.parseCleanNumber(rawValue);
    if (isNaN(val) || val < 0) {
      val = item.product.price || 0;
    }
    item.customPrice = Math.round(val);
    this.renderCart();
    this.showToast(`Precio actualizado: ${item.product.name} a ${this.formatCurrency(item.customPrice)}`, 'info');
  }

  addToCart(productId, qty = null, customPrice = null) {
    const product = this.data.products.find(p => p.id === productId);
    if (!product) return;
    const stockNum = parseFloat(String(product.stock || 0).replace(',', '.')) || 0;
    if (stockNum <= 0) {
      this.showToast(`Producto sin existencias disponibles`, 'danger');
      return;
    }

    const isPesaje = (product.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(product.pieceWeight !== undefined && product.pieceWeight !== null ? product.pieceWeight : (product.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const unit = (isPesaje || isUnitWithWeight) ? 'g' : (product.weightUnit || 'u.');
    const maxStock = isUnitWithWeight ? Math.round(stockNum * pWeight * 100) / 100 : stockNum;

    const existing = this.cart.find(item => item.product.id === productId);
    const resolvedPrice = (customPrice !== null && customPrice !== undefined && !isNaN(customPrice))
      ? Number(customPrice)
      : (existing?.customPrice !== undefined ? existing.customPrice : (product.price || 0));

    if (existing) {
      if (qty !== null) {
        existing.qty = qty;
      } else {
        const step = isPesaje ? (stockNum < 1 ? 0.05 : 0.10) : (isUnitWithWeight ? pWeight : 1);
        const nextQty = Math.round((existing.qty + step) * 100) / 100;
        if (nextQty > maxStock) {
          this.showToast(`Alcanzado límite de stock disponible (${maxStock} ${unit})`, 'warning');
          return;
        }
        existing.qty = nextQty;
      }
      if (customPrice !== null) {
        existing.customPrice = resolvedPrice;
      }
    } else {
      const initialQty = qty !== null ? qty : (isUnitWithWeight ? pWeight : (isPesaje ? (stockNum < 1 ? stockNum : 1) : 1));
      this.cart.push({
        product,
        qty: initialQty,
        customPrice: resolvedPrice,
        basePrice: product.price || 0
      });
    }
    this.renderCart();
  }

  updateCartQty(productId, delta) {
    const itemIndex = this.cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    const cartItem = this.cart[itemIndex];
    const isPesaje = (cartItem.product.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(cartItem.product.pieceWeight !== undefined && cartItem.product.pieceWeight !== null ? cartItem.product.pieceWeight : (cartItem.product.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const unit = (isPesaje || isUnitWithWeight) ? (cartItem.product.weightUnit || 'g') : 'u.';
    const maxStockUnits = parseFloat(String(cartItem.product.stock || 0).replace(',', '.')) || 0;
    const maxStock = isUnitWithWeight ? Math.round(maxStockUnits * pWeight * 100) / 100 : maxStockUnits;

    let step = 1;
    if (isPesaje) {
      step = (cartItem.product.stock < 1 ? 0.05 : 0.10);
    } else if (isUnitWithWeight) {
      step = pWeight;
    }
    const deltaStep = delta > 0 ? step : -step;

    const newQty = Math.round((Number(cartItem.qty) + Number(deltaStep)) * 100) / 100;
    if (newQty <= 0) {
      this.cart.splice(itemIndex, 1);
    } else {
      if (newQty > maxStock) {
        this.showToast(`Stock máximo disponible: ${maxStock} ${unit}`, 'warning');
        return;
      }
      cartItem.qty = newQty;
    }
    this.renderCart();
  }

  setCartQty(productId, rawValue) {
    const itemIndex = this.cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    const cartItem = this.cart[itemIndex];
    const isPesaje = (cartItem.product.measureType || 'Pesaje') === 'Pesaje';
    const pWeight = parseFloat(String(cartItem.product.pieceWeight !== undefined && cartItem.product.pieceWeight !== null ? cartItem.product.pieceWeight : (cartItem.product.weight || 0)).replace(',', '.')) || 0;
    const isUnitWithWeight = !isPesaje && pWeight > 0;
    const unit = (isPesaje || isUnitWithWeight) ? (cartItem.product.weightUnit || 'g') : 'u.';
    const maxStockUnits = parseFloat(String(cartItem.product.stock || 0).replace(',', '.')) || 0;
    const maxStock = isUnitWithWeight ? Math.round(maxStockUnits * pWeight * 100) / 100 : maxStockUnits;

    let val = this.parseCleanNumber(rawValue);
    if (isNaN(val) || val <= 0) {
      this.cart.splice(itemIndex, 1);
    } else {
      if (val > maxStock) {
        this.showToast(`Ajustado al máximo disponible: ${maxStock} ${unit}`, 'warning');
        val = maxStock;
      }
      cartItem.qty = Math.round(val * 100) / 100;
    }
    this.renderCart();
  }

  removeCartItem(productId) {
    const itemIndex = this.cart.findIndex(item => item.product.id === productId);
    if (itemIndex !== -1) {
      const removed = this.cart.splice(itemIndex, 1)[0];
      this.renderCart();
      this.showToast(`Producto quitado del carrito: ${removed.product.name}`, 'info');
    }
  }

  renderCart() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const openCheckoutBtn = document.getElementById('open-checkout-btn');

    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-subtle);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem; opacity: 0.5;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <div style="font-weight: 600; color: var(--text-muted); font-size: 0.92rem;">El carrito está vacío</div>
          <div style="font-size: 0.78rem; margin-top: 0.25rem;">Selecciona productos del catálogo para vender.</div>
        </div>
      `;
      if (subtotalEl) subtotalEl.innerText = this.formatCurrency(0);
      if (taxEl) taxEl.innerText = this.formatCurrency(0);
      if (totalEl) totalEl.innerText = this.formatCurrency(0);
      if (openCheckoutBtn) openCheckoutBtn.disabled = true;
      return;
    }

    if (openCheckoutBtn) openCheckoutBtn.disabled = false;
    let subtotal = 0;
    container.innerHTML = this.cart.map(item => {
      const isPesaje = (item.product.measureType || 'Pesaje') === 'Pesaje';
      const pWeight = parseFloat(String(item.product.pieceWeight !== undefined && item.product.pieceWeight !== null ? item.product.pieceWeight : (item.product.weight || 0)).replace(',', '.')) || 0;
      const isUnitWithWeight = !isPesaje && pWeight > 0;
      const unit = (isPesaje || isUnitWithWeight) ? 'g' : (item.product.weightUnit || 'u.');
      const effectivePrice = this.getCartItemPrice(item);
      const itemTotal = effectivePrice * item.qty;
      subtotal += itemTotal;
      const step = isPesaje ? (item.product.stock < 1 ? 0.05 : 0.10) : (isUnitWithWeight ? pWeight : 1);
      const basePrice = Number(item.basePrice !== undefined ? item.basePrice : item.product.price) || 0;
      const unitsCount = isUnitWithWeight ? Math.round((item.qty / pWeight) * 100) / 100 : item.qty;

      return `
        <div class="cart-item">
          <!-- FILA 1: CABECERA CON NOMBRE, BADGE Y BOTÓN ELIMINAR -->
          <div class="cart-item-header">
            <div class="cart-item-title-col">
              <div class="cart-item-title" title="${this.escapeHtml(item.product.name)}" style="cursor:pointer;" onclick="app.openAddToCartModal('${item.product.id}')">
                ${this.escapeHtml(item.product.name)}
              </div>
              <div class="cart-item-sku">
                <span>Código: ${this.escapeHtml(item.product.sku || item.product.code || item.product.id)}</span>
                ${isUnitWithWeight ? `
                  <span class="badge" style="background:#FEF3C7; color:#B45309; font-size:0.68rem; font-weight:700; padding:1px 5px; margin-left:4px;" title="Peso: ${pWeight} g/u (${unitsCount} u. = ${(Math.round(item.qty * 100) / 100)} g)">
                    ⚖️ ${pWeight} g/u. (${unitsCount} u.)
                  </span>
                ` : ''}
              </div>
            </div>
            <div class="cart-item-actions">
              <span class="badge" style="background:${isPesaje ? '#FEF3C7' : '#E0E7FF'}; color:${isPesaje ? '#D97706' : '#4F46E5'}; font-size:0.68rem; font-weight:700; padding:2px 7px; border-radius:4px; white-space:nowrap;">
                ${isPesaje ? '⚖️ Pesaje' : '📦 Unidad'}
              </span>
              <button type="button" class="cart-remove-btn" onclick="app.removeCartItem('${item.product.id}')" title="Quitar del carrito">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- FILA 2: TIRA HORIZONTAL DE PRECIO (BASE + VENTA MANUAL EDITABLE) -->
          <div class="cart-item-pricing-strip">
            <div class="cart-custom-price-wrap" title="Haga clic para editar el precio de venta manual">
              <span class="label" style="font-weight:700; color:var(--text-main);">Venta:</span>
              <span style="font-weight:800; color:var(--brand-primary);">$</span>
              <input type="text" inputmode="numeric" value="${this.formatNumberWithCommas(effectivePrice)}"
                     class="cart-custom-price-input"
                     onchange="app.setCartItemPrice('${item.product.id}', this.value)"
                     title="Precio de venta manual pactado">
              <span class="label" style="font-size:0.7rem;">/${unit}</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              ${basePrice > 0 ? `
                <span class="cart-base-pill" title="Precio base de catálogo sugerido">
                  Base: ${this.formatCurrency(basePrice)}
                </span>
              ` : `
                <span class="cart-base-pill" title="Sin precio base en catálogo">
                  Sin Base
                </span>
              `}
              <button type="button" class="badge" style="background:transparent; border:none; color:var(--brand-primary); cursor:pointer; font-size:0.75rem; padding:0 2px;" onclick="app.openAddToCartModal('${item.product.id}')" title="Ajustar precio y margen en modal">
                ✏️
              </button>
            </div>
          </div>

          <!-- FILA 3: SELECTOR DE GRAMOS / UNIDADES Y SUBTOTAL -->
          <div class="cart-item-bottom-row">
            <div class="cart-qty-controls">
              <button type="button" class="qty-btn" onclick="app.updateCartQty('${item.product.id}', -${step})" title="Restar">-</button>
              <div class="cart-qty-input-wrap">
                <input type="text" inputmode="decimal"
                       value="${this.formatNumberWithCommas(item.qty, isPesaje || isUnitWithWeight)}"
                       class="cart-qty-input"
                       onchange="app.setCartQty('${item.product.id}', this.value)"
                       title="Cantidad en ${unit} a vender">
                <span class="cart-unit-label" style="color:${isPesaje ? '#D97706' : '#4F46E5'};">${unit}</span>
              </div>
              <button type="button" class="qty-btn" onclick="app.updateCartQty('${item.product.id}', ${step})" title="Sumar">+</button>
            </div>

            <div class="cart-subtotal-block">
              <span class="subtotal-label">Subtotal</span>
              <span class="subtotal-val">${this.formatCurrency(itemTotal)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const tax = subtotal * (this.data.store.taxRate / 100);
    const grandTotal = subtotal + tax;

    if (subtotalEl) subtotalEl.innerText = this.formatCurrency(subtotal);
    if (taxEl) taxEl.innerText = this.formatCurrency(tax);
    if (totalEl) totalEl.innerText = this.formatCurrency(grandTotal);
  }

  renderCheckoutSummary() {
    const list = document.getElementById('checkout-items-breakdown-list');
    const badge = document.getElementById('checkout-total-grams-badge');
    if (!list) return;

    let totalGrams = 0;
    let hasPesaje = false;

    list.innerHTML = this.cart.map(item => {
      const isPesaje = (item.product.measureType || 'Pesaje') === 'Pesaje';
      const pWeight = parseFloat(String(item.product.pieceWeight !== undefined && item.product.pieceWeight !== null ? item.product.pieceWeight : (item.product.weight || 0)).replace(',', '.')) || 0;
      const isUnitWithWeight = !isPesaje && pWeight > 0;
      const unit = (isPesaje || isUnitWithWeight) ? 'g' : (item.product.weightUnit || 'u.');
      const qtyNum = Number(item.qty) || 0;
      if (isPesaje) {
        let factor = 1;
        if (unit === 'kg') factor = 1000;
        else if (unit === 'mg') factor = 0.001;
        else if (unit === 'µg') factor = 0.000001;
        else if (unit === 'oz') factor = 28.3495;
        totalGrams += qtyNum * factor;
        hasPesaje = true;
      } else if (pWeight > 0) {
        totalGrams += qtyNum;
        hasPesaje = true;
      }
      const pPrice = this.getCartItemPrice(item);
      const itemSubtotal = pPrice * item.qty;
      const unitsCount = isUnitWithWeight ? Math.round((qtyNum / pWeight) * 100) / 100 : qtyNum;

      return `
        <div class="checkout-item-row" style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); padding:0.55rem 0.75rem; border-radius:6px; border:1px solid var(--border-color);">
          <div style="flex:1; min-width:0; margin-right:0.75rem;">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${this.escapeHtml(item.product.name)}
            </div>
            <div style="font-size:0.74rem; color:var(--text-muted); display:flex; gap:8px; align-items:center; margin-top:2px;">
              <span class="badge" style="background:var(--canvas-bg); border:1px solid var(--border-color); font-size:0.68rem; padding:1px 5px;">Código: ${this.escapeHtml(item.product.sku || item.product.id)}</span>
              <span>A cómo se vende: <b style="color:var(--brand-primary);">${this.formatCurrency(pPrice)} / ${unit}</b></span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; font-size:0.92rem; color:var(--text-main);">${this.formatCurrency(itemSubtotal)}</div>
            <div style="font-size:0.75rem; font-weight:700; color:${isPesaje ? '#D97706' : '#4F46E5'};">
              ${isPesaje ? `⚖️ ${this.formatNumberWithCommas(item.qty, true)} ${unit} a vender` : (isUnitWithWeight ? `📦 ${unitsCount} u. (⚖️ ${this.formatNumberWithCommas(item.qty, true)} g)` : `📦 ${item.qty} u. a vender`)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (badge) {
      if (hasPesaje) {
        badge.style.display = 'inline-block';
        const formattedTotalGrams = (Math.round(totalGrams * 100) / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        badge.innerHTML = `⚖️ Pesaje Total: <b>${formattedTotalGrams} g</b>`;
      } else {
        const totalUnits = this.cart.reduce((s, i) => s + (Number(i.qty) || 0), 0);
        badge.innerHTML = `📦 Total: <b>${totalUnits} u.</b>`;
      }
    }
  }

  setupCheckout() {
    const openBtn = document.getElementById('open-checkout-btn');
    const closeBtn = document.getElementById('close-checkout-btn');
    const modal = document.getElementById('checkout-modal');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const cashInput = document.getElementById('cash-received-input');
    const custSelect = document.getElementById('checkout-customer-select');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        if (this.cart.length === 0) return;
        this.populateCheckoutCustomerSelect();
        this.renderCheckoutSummary();
        let subtotal = this.getCartSubtotal();
        let grandTotal = subtotal * (1 + this.data.store.taxRate / 100);
        document.getElementById('modal-checkout-total').innerText = this.formatCurrency(grandTotal);
        if (cashInput) cashInput.value = this.formatNumberWithCommas(Math.ceil(grandTotal));
        this.updateCashChange();
        this.syncCheckoutCustomerPaymentMethods();
        modal.classList.add('open');
        this.attachGlobalNumberMasks();
      });
    }

    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('open'));

    if (custSelect) {
      custSelect.addEventListener('change', () => {
        this.syncCheckoutCustomerPaymentMethods();
      });
    }

    document.querySelectorAll('.pay-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPayMethod = btn.getAttribute('data-pay-type') || 'cash';
        this.updateCheckoutPaymentPanels();
      });
    });

    if (cashInput) cashInput.addEventListener('input', () => this.updateCashChange());

    const separeInput = document.getElementById('separe-abono-input');
    if (separeInput) {
      separeInput.addEventListener('input', () => {
        const subtotal = this.getCartSubtotal();
        const grandTotal = subtotal * (1 + this.data.store.taxRate / 100);
        const abono = this.parseCleanNumber(separeInput.value);
        const pending = Math.max(0, grandTotal - abono);
        const pendingEl = document.getElementById('separe-pending-balance');
        if (pendingEl) pendingEl.innerText = this.formatCurrency(pending);
      });
    }

    if (confirmBtn) confirmBtn.addEventListener('click', () => this.processPaymentSuccess());
  }

  populateCheckoutCustomerSelect() {
    const select = document.getElementById('checkout-customer-select');
    if (!select) return;
    const defaultOpt = `<option value="Cliente Mostrador">👤 Cliente Mostrador (General)</option>`;
    const custOptions = this.data.customers.map(c => {
      const docType = c.docType || (c.document && c.document.includes('-') ? 'NIT' : 'CC');
      const docStr = c.document ? ` [${docType}: ${this.escapeHtml(c.document)}]` : '';
      const phoneStr = c.phone ? ` - 📞 ${this.escapeHtml(c.phone)}` : '';
      return `<option value="${this.escapeHtml(c.name)}">${this.escapeHtml(c.name)}${docStr}${phoneStr} - Crédito Pend: ${this.formatCurrency(c.creditBalance)}</option>`;
    }).join('');
    select.innerHTML = defaultOpt + custOptions;
  }

  syncCheckoutCustomerPaymentMethods() {
    const custSelect = document.getElementById('checkout-customer-select');
    const selectedCustomerName = custSelect?.value || 'Cliente Mostrador';
    const isMostrador = selectedCustomerName === 'Cliente Mostrador';
    const cust = this.data.customers.find(c => c.name === selectedCustomerName);
    const allowed = cust ? (cust.allowedPaymentMethods || ['Efectivo', 'Transferencia', 'Crédito', 'Plan Separe']) : ['Efectivo', 'Transferencia', 'Crédito', 'Plan Separe'];

    const btnCash = document.getElementById('pay-btn-cash');
    const btnTransfer = document.getElementById('pay-btn-transfer');
    const btnCredit = document.getElementById('pay-btn-credit');
    const btnSepare = document.getElementById('pay-btn-separe');

    const updateBtn = (btn, methodKey, isAllowed) => {
      if (!btn) return;
      if (isAllowed) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.title = '';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        btn.style.cursor = 'not-allowed';
        btn.title = isMostrador ? 'Requiere seleccionar un cliente registrado' : `Método "${methodKey}" no habilitado para este cliente`;
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
        }
      }
    };

    updateBtn(btnCash, 'Efectivo', allowed.includes('Efectivo'));
    updateBtn(btnTransfer, 'Transferencia', allowed.includes('Transferencia'));
    updateBtn(btnCredit, 'Crédito', !isMostrador && allowed.includes('Crédito'));
    updateBtn(btnSepare, 'Plan Separe', !isMostrador && allowed.includes('Plan Separe'));

    // Notice banner
    const noticeEl = document.getElementById('checkout-customer-allowed-notice');
    if (noticeEl) {
      if (!isMostrador && cust) {
        noticeEl.style.display = 'block';
        noticeEl.innerHTML = `Opciones de pago autorizadas para <b>${this.escapeHtml(cust.name)}</b>: ${allowed.join(', ')}`;
      } else {
        noticeEl.style.display = 'block';
        noticeEl.innerHTML = `Para cobros a <b>Crédito</b> o <b>Plan Separe</b> seleccione un cliente registrado.`;
      }
    }

    // If currently active button is disabled or none active, pick first available
    const activeBtn = document.querySelector('.pay-method-btn.active');
    if (!activeBtn || activeBtn.disabled) {
      const firstAvailable = [btnCash, btnTransfer, btnCredit, btnSepare].find(b => b && !b.disabled);
      if (firstAvailable) {
        firstAvailable.click();
      }
    } else {
      this.updateCheckoutPaymentPanels();
    }
  }

  updateCheckoutPaymentPanels() {
    const subtotal = this.getCartSubtotal();
    const grandTotal = subtotal * (1 + this.data.store.taxRate / 100);
    const selectedCustomerName = document.getElementById('checkout-customer-select')?.value || 'Cliente Mostrador';
    const cust = this.data.customers.find(c => c.name === selectedCustomerName);

    const cashCalcBox = document.getElementById('cash-calc-box');
    const transferBox = document.getElementById('transfer-info-box');
    const creditBox = document.getElementById('credit-info-box');
    const separeBox = document.getElementById('separe-info-box');

    if (cashCalcBox) cashCalcBox.style.display = this.selectedPayMethod === 'cash' ? 'flex' : 'none';
    if (transferBox) transferBox.style.display = this.selectedPayMethod === 'transfer' ? 'flex' : 'none';
    if (creditBox) creditBox.style.display = this.selectedPayMethod === 'credit' ? 'flex' : 'none';
    if (separeBox) separeBox.style.display = this.selectedPayMethod === 'separe' ? 'flex' : 'none';

    if (this.selectedPayMethod === 'credit' && cust) {
      const limit = Number(cust.creditLimit) || 0;
      const current = Number(cust.creditBalance) || 0;
      const available = Math.max(0, limit - current);

      const limitEl = document.getElementById('credit-modal-limit');
      const curEl = document.getElementById('credit-modal-current');
      const availEl = document.getElementById('credit-modal-available');
      const warnEl = document.getElementById('credit-limit-warning');

      if (limitEl) limitEl.innerText = this.formatCurrency(limit);
      if (curEl) curEl.innerText = this.formatCurrency(current);
      if (availEl) availEl.innerText = this.formatCurrency(available);
      if (warnEl) warnEl.style.display = grandTotal > available ? 'block' : 'none';
    }

    if (this.selectedPayMethod === 'separe') {
      const separeInput = document.getElementById('separe-abono-input');
      const pendingEl = document.getElementById('separe-pending-balance');
      if (separeInput && (!separeInput.value || this.parseCleanNumber(separeInput.value) <= 0)) {
        separeInput.value = this.formatNumberWithCommas(Math.round(grandTotal * 0.3)); // 30% abono sugerido inicial
      }
      const abono = this.parseCleanNumber(separeInput?.value);
      const pending = Math.max(0, grandTotal - abono);
      if (pendingEl) pendingEl.innerText = this.formatCurrency(pending);
    }
  }

  updateCashChange() {
    const subtotal = this.getCartSubtotal();
    const grandTotal = subtotal * (1 + this.data.store.taxRate / 100);
    const cashVal = this.parseCleanNumber(document.getElementById('cash-received-input')?.value);
    const changeDue = Math.max(0, cashVal - grandTotal);
    const changeEl = document.getElementById('cash-change-due');
    if (changeEl) changeEl.innerText = this.formatCurrency(changeDue);
  }

  async processPaymentSuccess() {
    if (!this.currentUser || !this.hasPermission('pos', null)) {
      this.showToast('Acceso Denegado: Tu rol no tiene permisos para procesar cobros en el Punto de Venta.', 'danger');
      return;
    }

    if (this.data.cashShiftLog && this.data.cashShiftLog.status === 'Cerrado') {
      this.showToast('Acción Bloqueada: El turno de caja se encuentra CERRADO. Abra un nuevo turno en "Arqueo de Caja" antes de registrar ventas.', 'danger');
      return;
    }

    const modal = document.getElementById('checkout-modal');
    const subtotal = this.getCartSubtotal();
    const tax = subtotal * (this.data.store.taxRate / 100);
    const grandTotal = subtotal + tax;

    const selectedCustomer = document.getElementById('checkout-customer-select')?.value || "Cliente Mostrador";
    const isMostrador = selectedCustomer === 'Cliente Mostrador';
    const cust = this.data.customers.find(c => c.name === selectedCustomer);

    const payMethodNames = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'credit': 'Crédito',
      'separe': 'Plan Separe'
    };
    const payMethodName = payMethodNames[this.selectedPayMethod] || 'Efectivo';

    // 1. Guard against unauthorized methods for unregistered clients
    if ((this.selectedPayMethod === 'credit' || this.selectedPayMethod === 'separe') && (!cust || isMostrador)) {
      this.showToast('Para cobros a Crédito o Plan Separe debe seleccionar un cliente registrado en el sistema.', 'warning');
      return;
    }

    // 2. Guard against methods not authorized on customer profile
    if (cust && Array.isArray(cust.allowedPaymentMethods) && !cust.allowedPaymentMethods.includes(payMethodName)) {
      this.showToast(`El método de pago "${payMethodName}" no está habilitado para el cliente ${cust.name}.`, 'warning');
      return;
    }

    // 3. Validate Cash payment sufficiency
    if (this.selectedPayMethod === 'cash') {
      const cashVal = this.parseCleanNumber(document.getElementById('cash-received-input')?.value);
      if (cashVal < grandTotal - 0.01) {
        this.showToast(`El efectivo recibido (${this.formatCurrency(cashVal)}) es insuficiente para cubrir el total (${this.formatCurrency(grandTotal)}).`, 'warning');
        return;
      }
    }

    // 4. Validate Credit limit and warn if exceeded
    if (this.selectedPayMethod === 'credit' && cust) {
      const limit = Number(cust.creditLimit) || 0;
      const current = Number(cust.creditBalance) || 0;
      const available = Math.max(0, limit - current);
      if (grandTotal > available + 0.01) {
        if (!confirm(`¡Advertencia de Cupo! Esta venta (${this.formatCurrency(grandTotal)}) excede el cupo disponible del cliente (${this.formatCurrency(available)}). ¿Desea autorizar y procesar la venta a crédito?`)) {
          return;
        }
      }
    }

    // 5. Validate Plan Separe initial deposit
    if (this.selectedPayMethod === 'separe') {
      const separeInputVal = this.parseCleanNumber(document.getElementById('separe-abono-input')?.value);
      if (isNaN(separeInputVal) || separeInputVal <= 0) {
        this.showToast('El Plan Separe requiere registrar un abono inicial mayor a $0.', 'warning');
        return;
      }
      if (separeInputVal > grandTotal) {
        this.showToast(`El abono inicial (${this.formatCurrency(separeInputVal)}) no puede superar el valor total de la venta (${this.formatCurrency(grandTotal)}).`, 'warning');
        return;
      }
    }

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    this.cart.forEach(cartItem => {
      const p = this.data.products.find(prod => prod.id === cartItem.product.id);
      if (p) {
        const soldQty = Number(cartItem.qty) || 0;
        const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
        const pWeight = parseFloat(String(p.pieceWeight !== undefined && p.pieceWeight !== null ? p.pieceWeight : (p.weight || 0)).replace(',', '.')) || 0;
        const isUnitWithWeight = !isPesaje && pWeight > 0;
        const unitsToDeduct = isUnitWithWeight ? (Math.round((soldQty / pWeight) * 100) / 100) : soldQty;
        p.stock = Math.round(((Number(p.stock) || 0) - unitsToDeduct) * 100) / 100;
        if (p.stock <= 0) {
          p.stock = 0;
          p.status = 'out_of_stock';
        } else if (p.stock <= (Number(p.minStock) || 0)) {
          p.status = 'low_stock';
        } else {
          p.status = 'active';
        }

        p.sold30d = (Number(p.sold30d) || 0) + unitsToDeduct;
        if (!p.monthlySales) p.monthlySales = {};
        if (!p.monthlySales[currentMonthKey]) p.monthlySales[currentMonthKey] = {};
        p.monthlySales[currentMonthKey][currentDay] = (Number(p.monthlySales[currentMonthKey][currentDay]) || 0) + unitsToDeduct;

      }
    });

    // Sincronizar automáticamente disponibilidad de gramos en todas las categorías tras la venta
    this.syncAllCategoryGrams();

    let newTxId;
    do {
      newTxId = `TX-${Math.floor(89000 + Math.random() * 10000)}`;
    } while ((this.data.recentTransactions || []).some(t => t.id === newTxId));
    
    let separeAbono = 0;
    let separePending = 0;

    if (!this.data.cashShiftLog) {
      this.data.cashShiftLog = { openingCash: 500000, cashSales: 0, cardSales: 0, cashExpenses: 0, expectedCashInDrawer: 500000, status: 'Abierto' };
    }

    if (this.selectedPayMethod === 'cash') {
      this.data.cashShiftLog.cashSales = Math.round((Number(this.data.cashShiftLog.cashSales || 0) + grandTotal) * 100) / 100;
      this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
      if (this.data.store) this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
    } else if (this.selectedPayMethod === 'transfer') {
      this.data.cashShiftLog.cardSales = Math.round((Number(this.data.cashShiftLog.cardSales || 0) + grandTotal) * 100) / 100;
    } else if (this.selectedPayMethod === 'credit') {
      if (cust) {
        cust.creditBalance = Math.round(((Number(cust.creditBalance) || 0) + grandTotal) * 100) / 100;
        let existing = (this.data.customerCredits || []).find(cr => cr.customer === cust.name);
        if (existing) {
          existing.totalGranted = Math.round(((Number(existing.totalGranted) || 0) + grandTotal) * 100) / 100;
          existing.currentBalance = Math.round(((Number(existing.currentBalance) || 0) + grandTotal) * 100) / 100;
          existing.status = 'Al Día';
        } else {
          this.data.customerCredits.unshift({
            id: `CC-${Math.floor(310 + Math.random() * 600)}`,
            customer: cust.name,
            totalGranted: grandTotal,
            currentBalance: grandTotal,
            dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
            status: 'Al Día'
          });
        }
      }
    } else if (this.selectedPayMethod === 'separe') {
      separeAbono = this.parseCleanNumber(document.getElementById('separe-abono-input')?.value);
      separePending = Math.round(Math.max(0, grandTotal - separeAbono) * 100) / 100;
      if (separeAbono > 0) {
        this.data.cashShiftLog.cashSales = Math.round((Number(this.data.cashShiftLog.cashSales || 0) + separeAbono) * 100) / 100;
        this.data.cashShiftLog.expectedCashInDrawer = Math.round(((Number(this.data.cashShiftLog.openingCash) || 0) + (Number(this.data.cashShiftLog.cashSales) || 0) - (Number(this.data.cashShiftLog.cashExpenses) || 0)) * 100) / 100;
        if (this.data.store) this.data.store.cashInBox = this.data.cashShiftLog.expectedCashInDrawer;
      }
      if (cust && separePending > 0) {
        cust.creditBalance = Math.round(((Number(cust.creditBalance) || 0) + separePending) * 100) / 100;
        this.data.customerCredits.unshift({
          id: `SEP-${Math.floor(500 + Math.random() * 500)}`,
          customer: cust.name,
          totalGranted: grandTotal,
          currentBalance: separePending,
          dueDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
          status: 'Plan Separe'
        });
      }
    }

    const newTx = {
      id: newTxId,
      customer: selectedCustomer,
      customerDoc: cust?.document || '',
      customerDocType: cust?.docType || 'CC',
      customerAddress: cust?.address || '',
      customerPhone: cust?.phone || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      type: "Venta POS Joyería",
      itemsCount: this.cart.reduce((acc, i) => acc + i.qty, 0),
      items: this.cart.map(i => {
        const pPrice = this.getCartItemPrice(i);
        return {
          id: i.product.id,
          sku: i.product.sku || i.product.id || '',
          name: i.product.name,
          qty: i.qty,
          quantity: i.qty,
          price: pPrice,
          total: pPrice * i.qty
        };
      }),
      subtotal: subtotal,
      tax: tax,
      total: grandTotal,
      paymentMethod: payMethodName,
      cashier: this.currentUser?.name || this.data.store?.cashier || "Cajero",
      status: "completed"
    };

    this.data.recentTransactions.unshift(newTx);
    this.data.kpis.salesToday += grandTotal;
    this.data.kpis.transactionsToday += 1;

    // Build Thermal Receipt HTML based on jewelry mold
    const ticketItems = this.cart.map(i => {
      const isPesaje = (i.product.measureType || 'Pesaje') === 'Pesaje';
      const pWeight = parseFloat(String(i.product.pieceWeight !== undefined && i.product.pieceWeight !== null ? i.product.pieceWeight : (i.product.weight || 0)).replace(',', '.')) || 0;
      const isUnitWithWeight = !isPesaje && pWeight > 0;
      const unit = (isPesaje || isUnitWithWeight) ? 'g' : (i.product.weightUnit || 'u.');
      const pPrice = this.getCartItemPrice(i);
      const unitsCount = isUnitWithWeight ? Math.round((i.qty / pWeight) * 100) / 100 : i.qty;
      const formattedQty = `${this.formatNumberWithCommas(i.qty, isPesaje || isUnitWithWeight)}${unit}`;
      const formattedUnitPrice = `${this.formatCurrency(pPrice)}/${unit}`;
      const formattedLineTotal = this.formatCurrency(pPrice * i.qty);

      return {
        product: i.product,
        name: i.product.name,
        sku: i.product.sku || i.product.id || '',
        qty: i.qty,
        unit,
        price: pPrice,
        formattedQty,
        formattedUnitPrice,
        formattedLineTotal,
        total: pPrice * i.qty
      };
    });

    const cashReceived = this.selectedPayMethod === 'cash' ? this.parseCleanNumber(document.getElementById('cash-received-input')?.value) : grandTotal;
    const changeVal = this.selectedPayMethod === 'cash' ? Math.max(0, cashReceived - grandTotal) : 0;

    const receiptHtml = this.buildThermalTicketHtml({
      type: 'venta',
      txId: newTxId,
      dateStr: new Date().toLocaleDateString('es-CO'),
      timeStr: newTx.time,
      partyName: selectedCustomer,
      partyDocument: cust?.document || '',
      partyAddress: cust?.address || '',
      partyPhone: cust?.phone || '',
      agentName: newTx.cashier,
      items: ticketItems,
      subtotal: subtotal,
      tax: tax,
      total: grandTotal,
      paidAmount: cashReceived,
      changeAmount: changeVal,
      paymentMethod: payMethodName,
      separeAbono: separeAbono,
      separePending: separePending,
      customerCreditBalance: cust?.creditBalance
    });

    await this.savePersistence();

    this.cart = [];
    this.renderCart();
    this.syncAllModules();
    this.renderFinVentasTable();
    this.renderDashboardRecentSales();
    this.renderCuadreCajaCard();
    this.renderRepFinanzas();

    if (modal) modal.classList.remove('open');

    // Show Printable Receipt Modal
    const modalTitle = document.getElementById('receipt-modal-title');
    if (modalTitle) modalTitle.innerHTML = '🧾 Comprobante de Venta POS';
    const receiptBody = document.getElementById('receipt-modal-body');
    if (receiptBody) receiptBody.innerHTML = receiptHtml;
    this.openModal('receipt-modal');

    this.showToast(`¡Venta #${newTxId} (${payMethodName}) completada y guardada!`, 'success');
  }

  /* --------------------------------------------------------------------------
     INVENTORY TABLE SEARCH
     -------------------------------------------------------------------------- */
  setupInventory() {
    this.renderInventoryTable();
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderInventoryTable());
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          this.renderInventoryTable();
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     GLOBAL SEARCH MODAL
     -------------------------------------------------------------------------- */
  setupGlobalSearch() {
    const openBtn = document.getElementById('open-search-modal');
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.classList.add('open');
        if (input) {
          input.value = '';
          input.focus();
        }
        if (resultsContainer) {
          resultsContainer.innerHTML = `<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-subtle);">Escribe el código o nombre del producto para buscar...</div>`;
        }
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    if (input && resultsContainer) {
      input.addEventListener('input', () => {
        const query = input.value.trim();
        if (!query) {
          resultsContainer.innerHTML = `<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-subtle);">Escribe el código o nombre del producto para buscar...</div>`;
          return;
        }

        const filteredProds = (this.data.products || []).filter(p => this.matchesProductSearch(p, query));
        const qLower = query.toLowerCase();
        const filteredCusts = (this.data.customers || []).filter(c => 
          String(c.name || '').toLowerCase().includes(qLower) || 
          String(c.phone || '').includes(qLower) ||
          String(c.document || '').includes(qLower)
        );
        const filteredTxs = (this.data.recentTransactions || []).filter(t => 
          String(t.id || '').toLowerCase().includes(qLower) || 
          String(t.customer || '').toLowerCase().includes(qLower) ||
          String(t.cashier || '').toLowerCase().includes(qLower) ||
          String(t.paymentMethod || '').toLowerCase().includes(qLower)
        ).slice(0, 5);

        if (filteredProds.length === 0 && filteredCusts.length === 0 && filteredTxs.length === 0) {
          resultsContainer.innerHTML = `
            <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-subtle);">
              <div style="font-size:1.8rem; margin-bottom:0.5rem;">🔍</div>
              <div style="font-weight:600; color:var(--text-muted);">Sin coincidencias para "${query}"</div>
              <div style="font-size:0.8rem; margin-top:0.25rem;">Verifica el código, factura (#TX) o nombre ingresado.</div>
            </div>
          `;
          return;
        }

        let html = '';

        if (filteredTxs.length > 0) {
          html += `<div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem; padding:0 0.5rem;">Facturas & Recibos (${filteredTxs.length})</div>`;
          html += filteredTxs.map(t => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border-radius:var(--radius-md); cursor:pointer; margin-bottom:0.35rem; transition:background 0.15s ease; border:1px solid var(--card-border);" onmouseover="this.style.background='var(--canvas-bg)'" onmouseout="this.style.background='transparent'" onclick="app.closeModal('search-modal'); app.showPastReceiptModal('${this.escapeHtml(t.id)}')">
              <div>
                <div style="font-weight:700; font-size:0.875rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                  <span>Ticket #${this.escapeHtml(t.id)}</span>
                  <span class="badge" style="font-size:0.7rem; background:rgba(99,102,241,0.12); color:#4F46E5;">${this.escapeHtml(t.cashier || 'Cajero')}</span>
                </div>
                <div style="font-size:0.72rem; color:var(--text-subtle); margin-top:2px;">Cliente: ${this.escapeHtml(t.customer || 'Mostrador')} • Hora: ${this.escapeHtml(t.time || '')} • ${this.escapeHtml(t.paymentMethod || 'Efectivo')}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-heading); font-weight:700; font-size:0.95rem; color:var(--text-main);">${this.formatCurrency(Math.abs(t.total))}</div>
                <div style="font-size:0.68rem; color:var(--brand-primary); font-weight:600;">🧾 Ver Recibo</div>
              </div>
            </div>
          `).join('');
        }

        if (filteredProds.length > 0) {
          html += `<div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); text-transform:uppercase; letter-spacing:0.05em; margin-top:0.75rem; margin-bottom:0.5rem; padding:0 0.5rem;">Productos (${filteredProds.length})</div>`;
          html += filteredProds.map(p => {
            const isPesaje = (p.measureType || 'Pesaje') === 'Pesaje';
            const stockUnit = isPesaje ? 'g' : 'u';
            const skuBadge = p.sku || p.id || 'S/C';

            return `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border-radius:var(--radius-md); cursor:pointer; margin-bottom:0.35rem; transition:background 0.15s ease; border:1px solid var(--card-border);" onmouseover="this.style.background='var(--canvas-bg)'" onmouseout="this.style.background='transparent'" onclick="app.selectSearchResult('${p.id}')">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <div style="width:38px; height:38px; border-radius:8px; background:${isPesaje ? 'rgba(217,119,6,0.1)' : 'rgba(79,70,229,0.1)'}; color:${isPesaje ? '#D97706' : '#4F46E5'}; display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0; border:1px solid ${isPesaje ? 'rgba(217,119,6,0.2)' : 'rgba(79,70,229,0.2)'};">${isPesaje ? '⚖️' : '📦'}</div>
                  <div>
                    <div style="font-weight:700; font-size:0.875rem; color:var(--text-main);">${this.escapeHtml(p.name)}</div>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-top:2px;">
                      <span class="badge" style="font-size:0.68rem; font-weight:700; background:rgba(99,102,241,0.12); color:var(--brand-primary); border:1px solid rgba(99,102,241,0.25); padding:1px 5px; border-radius:3px;">Código: ${this.escapeHtml(skuBadge)}</span>
                      <span style="font-size:0.72rem; color:var(--text-subtle);">${this.escapeHtml(p.categoryName || p.category || '')}</span>
                      <span style="font-size:0.72rem; color:var(--text-subtle);">• Stock: ${p.stock} ${stockUnit}</span>
                    </div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-family:var(--font-heading); font-weight:700; color:var(--brand-primary); font-size:0.95rem;">${this.formatCurrency(p.price)}</div>
                  <div style="font-size:0.68rem; color:var(--emerald-text); font-weight:600;">+ Vender en POS</div>
                </div>
              </div>
            `;
          }).join('');
        }

        if (filteredCusts.length > 0) {
          html += `<div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); text-transform:uppercase; letter-spacing:0.05em; margin-top:1rem; margin-bottom:0.5rem; padding:0 0.5rem;">Clientes (${filteredCusts.length})</div>`;
          html += filteredCusts.map(c => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border-radius:var(--radius-md); cursor:pointer; margin-bottom:0.35rem; transition:background 0.15s ease; border:1px solid var(--card-border);" onmouseover="this.style.background='var(--canvas-bg)'" onmouseout="this.style.background='transparent'" onclick="app.closeModal('search-modal'); app.switchSubView('dashboard', 'clientes')">
              <div>
                <div style="font-weight:700; font-size:0.875rem; color:var(--text-main);">${c.name}</div>
                <div style="font-size:0.72rem; color:var(--text-subtle); margin-top:2px;">Tel: ${c.phone || 'S/N'} • Doc: ${c.document || 'S/N'}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.72rem; color:var(--text-muted);">Saldo Crédito</div>
                <div style="font-family:var(--font-heading); font-weight:700; font-size:0.85rem; color:var(--text-main);">${this.formatCurrency(c.creditBalance || 0)}</div>
              </div>
            </div>
          `).join('');
        }

        resultsContainer.innerHTML = html;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (modal) modal.classList.remove('open');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = input.value.trim();
          if (!query) return;
          const filteredProds = (this.data.products || []).filter(p => this.matchesProductSearch(p, query));
          if (filteredProds.length > 0) {
            this.selectSearchResult(filteredProds[0].id);
          }
        }
      });
    }
  }

  selectSearchResult(productId) {
    const modal = document.getElementById('search-modal');
    if (modal) modal.classList.remove('open');
    this.switchView('pos');
    this.addToCart(productId);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const loginOverlay = document.getElementById('login-screen');
      if (loginOverlay && loginOverlay.classList.contains('active')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const modal = document.getElementById('search-modal');
        if (modal) {
          modal.classList.add('open');
          const input = document.getElementById('global-search-input');
          if (input) {
            input.value = '';
            input.focus();
          }
          const resultsContainer = document.getElementById('global-search-results');
          if (resultsContainer) {
            resultsContainer.innerHTML = `<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-subtle);">Escribe el código o nombre del producto para buscar...</div>`;
          }
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (this.currentParentView !== 'pos') this.switchView('pos');
        else document.getElementById('open-checkout-btn')?.click();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
      }
    });
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'danger') toast.style.borderLeftColor = 'var(--rose-danger)';
    if (type === 'warning') toast.style.borderLeftColor = 'var(--amber-warning)';

    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

const app = new NexusApp();
window.app = app;
window.switchSubView = (a, b) => app.switchSubView(a, b);
window.switchView = (a) => app.switchView(a);
