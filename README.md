# 💎 Charles Joyas - Sistema POS & Gestión Joyera SaaS

Plataforma integral de Punto de Venta (POS), control de inventario de metales preciosos (Oro 18K, 14K, Plata 925), compras por pesaje, plan separe, crédito a clientes, arqueo de caja y facturación con soporte para impresora térmica de 80mm / 58mm.

---

## ✨ Características Principales

- ⚖️ **Control de Inventario por Gramaje & Pesaje Joyero**: Cálculo de stock en gramos reales (`kg`, `g`, `mg`, `oz`), costo promedio ponderado y gramaje total en tiempo real.
- 🛒 **Punto de Venta (POS)**: Búsqueda ágil por código/SKU, selector de clientes con tipos de documento (CC, CE, Pasaporte), cálculo de precio según gramaje, precio unitario manual y soporte de múltiples formas de pago.
- 📦 **Módulo de Compras**: Registro de compras de oro y metales con actualización instantánea de stock y recalculo automático del costo promedio ponderado.
- 📅 **Plan Separe & Créditos**: Gestión de abonos, seguimiento de saldos y recordatorios de pago.
- 💰 **Arqueo y Cierre de Caja**: Registro de apertura, movimientos en efectivo, transferencias, QR y cuadre ciego con detección de discrepancias.
- 🧾 **Impresión Térmica Directa**: Tickets de venta, recibos de compra y comprobantes de abono formateados para impresoras térmicas ESC/POS (80mm y 58mm).
- 🔐 **Control de Acceso Basado en Roles (RBAC)**: Perfiles diferenciados para Super Admin, Gerente, Cajero y Contador.
- ☁️ **Doble Persistencia**: Sincronización transparente con MongoDB y respaldo en `db.json` / LocalStorage para funcionamiento offline.

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- (Opcional) Instancia local o remota de [MongoDB](https://www.mongodb.com/)

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/charlesjoyas/Charlessjoyas.git

# Entrar al directorio
cd Charlessjoyas

# Instalar dependencias
npm install
```

### Ejecución
```bash
# Iniciar servidor local
npm start
```
El sistema estará accesible en `http://localhost:3000`.

---

## 🔑 Credenciales Iniciales (Modo Limpio / Producción)
- **Usuario:** `carlos@nexuspos.io`
- **Contraseña:** `admin123`
- **Rol:** Super Admin

---

## 📄 Licencia
Propiedad de **Inversiones Charles Joyas S.A.S**. Todos los derechos reservados.
