// Clean Initial Data Store for Nexus POS SaaS - Joyería Fina & Taller (CHARLES JOYAS SAS)

const INITIAL_DATA = {
  store: {
    name: "Charles Joyas",
    slogan: "Oro 18k",
    legalName: "Inversiones Charles Joyas S.A.S",
    taxId: "901838998-0",
    currency: "$",
    phone: "323 491 3454",
    email: "contacto@nexuspos.io",
    address: "Carrera 53 # 47 - 21, Local 109",
    addressExtra: "C.C Luz del Dia",
    cashier: "Carlos Mendoza",
    shiftStatus: "Cerrado",
    shiftStartTime: "08:00 AM",
    cashInBox: 0,
    taxRate: 0,
    branding: {
      appName: "CHARLES JOYAS",
      appBadge: "SAS",
      logoUrl: "",
      primaryColor: "#0284c7",
      secondaryColor: "#0d9488",
      fontHeading: "Inter",
      fontBody: "Outfit"
    }
  },

  kpis: {
    salesToday: 0,
    salesTrend: "0%",
    transactionsToday: 0,
    txTrend: "0%",
    inventoryValue: 0,
    avgCostPerGram: 0,
    avgCostGrams: 0,
    skusCount: 0,
    totalGrams: 0,
    netMargin: "0%",
    marginTrend: "0%",
    totalCustomers: 0,
    totalSuppliers: 0,
    activeServices: 0,
    totalAssetsValue: 0
  },

  // 1. DASHBOARD SUB-MODAL DATA & ROLES (SOLO USUARIO ADMINISTRADOR)
  users: [
    { 
      id: "USR-001", 
      name: "Carlos Mendoza", 
      email: "carlos@nexuspos.io", 
      password: "admin123",
      role: "Super Admin", 
      status: "Active", 
      lastLogin: "Hoy 08:15 AM",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
    }
  ],

  customers: [],
  suppliers: [],

  perfiles: [
    { 
      id: "PRF-01", 
      name: "Super Admin", 
      permissions: "Acceso total sin restricciones: Gestión Global, Usuarios, Ajustes, Inventario, Finanzas y POS", 
      usersCount: 1,
      badgeColor: "#F59E0B",
      allowedModules: ["*"]
    },
    { 
      id: "PRF-62", 
      name: "Gerente de Tienda Regional", 
      permissions: "Acceso total a finanzas y reportes", 
      usersCount: 0,
      allowedModules: ["dashboard", "pos", "clientes", "proveedores", "gastos", "formas_pago", "ventas", "comprar", "creditos_clientes", "creditos_proveedores", "productos", "servicios", "categorias", "activos", "reports", "informes"]
    },
    { 
      id: "PRF-02", 
      name: "Supervisor de Tienda", 
      permissions: "Gestión de POS, Ventas, Inventario y Modificación de Precios", 
      usersCount: 0,
      badgeColor: "#6366F1",
      allowedModules: ["dashboard", "pos", "clientes", "proveedores", "gastos", "formas_pago", "ventas", "comprar", "creditos_clientes", "creditos_proveedores", "productos", "servicios", "categorias", "activos", "reports", "informes"]
    },
    { 
      id: "PRF-03", 
      name: "Cajero", 
      permissions: "Ventas en POS, Cobros, Apertura y Cierre de Caja Chica", 
      usersCount: 0,
      badgeColor: "#10B981",
      allowedModules: ["pos", "clientes", "cuadre_caja", "ventas"]
    },
    { 
      id: "PRF-04", 
      name: "Contador / Auditor", 
      permissions: "Acceso de lectura a Finanzas, Reportes, Balances e Informes", 
      usersCount: 0,
      badgeColor: "#8B5CF6",
      allowedModules: ["dashboard", "gastos", "formas_pago", "ventas", "creditos_clientes", "creditos_proveedores", "reports", "informes", "cuadre_caja"]
    }
  ],

  expenses: [],

  paymentMethods: [
    { id: "PM-15", name: "plan separe", icon: "calendar", fee: "0%", active: true },
    { id: "PM-01", name: "Efectivo", icon: "cash", fee: "0%", active: true },
    { id: "PM-02", name: "Tarjeta Débito/Crédito", icon: "card", fee: "0.8%", active: true },
    { id: "PM-03", name: "Bizum / Pago QR", icon: "qr", fee: "0%", active: true },
    { id: "PM-04", name: "Crédito Cliente", icon: "credit", fee: "0%", active: true },
    { id: "PM-05", name: "Transferencia Bancaria", icon: "bank", fee: "0%", active: true }
  ],

  // 2. FINANZAS SUB-DATA
  purchases: [],
  customerCredits: [],
  supplierCredits: [],

  // 3. INVENTARIO SUB-DATA - TALLER DE JOYERÍA
  services: [],

  categories: [
    { id: "nacional", name: "NACIONAL", itemsCount: 0, color: "#10B981", availableGrams: 0.00, cost: 385000.00 },
    { id: "oro18k", name: "Oro 18K Italiano & Ley", itemsCount: 0, color: "#F59E0B", availableGrams: 0.00, cost: 444000.00 },
    { id: "oro14k", name: "Oro 14K Especial", itemsCount: 0, color: "#D97706", availableGrams: 0.00, cost: 380000.00 },
    { id: "plata925", name: "Plata 925 Fina", itemsCount: 0, color: "#94A3B8", availableGrams: 0.00, cost: 28000.00 },
    { id: "diamantes", name: "Piedras Preciosas & Diamantes", itemsCount: 0, color: "#6366F1", availableGrams: 0.00, cost: 850000.00 },
    { id: "relojes", name: "Relojería de Lujo", itemsCount: 0, color: "#10B981", availableGrams: 0.00, cost: 1200000.00 }
  ],

  products: [],
  assets: [],

  // 4. ARQUEO & CUADRE DE CAJA DIARIO
  cashShiftLog: {
    shiftId: "TURNO-001",
    openedAt: "08:00 AM",
    openingCash: 0,
    cashSales: 0,
    cardSales: 0,
    qrSales: 0,
    cashExpenses: 0,
    expectedCashInDrawer: 0,
    actualCashInDrawer: 0,
    discrepancy: 0,
    status: "Cerrado"
  },

  cashShiftsHistory: [],
  abonosVentas: [],
  abonosCompras: [],

  // 5. INFORMES DATA & RADAR JOYERÍA
  balanceSheet: {
    assetsCurrent: 0,
    assetsFixed: 0,
    totalAssets: 0,
    liabilitiesShort: 0,
    liabilitiesLong: 0,
    totalLiabilities: 0,
    netEquity: 0
  },

  stockRadarData: {
    categories: ["NACIONAL", "Oro 18K Italiano & Ley", "Oro 14K Especial", "Plata 925 Fina", "Piedras Preciosas & Diamantes", "Relojería de Lujo"],
    turnover: [0, 0, 0, 0, 0, 0],
    stockLevel: [0, 0, 0, 0, 0, 0],
    profitability: [0, 0, 0, 0, 0, 0],
    stockRisk: [0, 0, 0, 0, 0, 0]
  },

  recentTransactions: [],
  financialLedger: [],

  chartData: {
    weeklySales: {
      labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom", "Hoy"],
      income: [0, 0, 0, 0, 0, 0, 0, 0],
      expenses: [0, 0, 0, 0, 0, 0, 0, 0]
    },
    categorySales: {
      labels: ["NACIONAL", "Oro 18K", "Oro 14K", "Plata 925", "Diamantes", "Relojes"],
      data: [0, 0, 0, 0, 0, 0]
    },
    topProducts: [],
    peakHours: {
      labels: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
      transactions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  }
};
