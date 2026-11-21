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

## Acceso y configuración del servidor

El acceso se valida en el servidor con los usuarios existentes. No existe una cuenta oculta ni una contraseña de producción incluida en el frontend. Las contraseñas existentes se conservan en la base privada; las nuevas o modificadas se guardan con scrypt. La sesión usa una cookie HttpOnly, SameSite=Strict, de 12 horas. Al cambiar contraseña, rol, permisos o estado se invalidan las sesiones anteriores.

Configurar mediante variables de entorno (ver `.env.example`):

- `MONGO_URI`: conexión vigente a la base de datos. En producción no hay respaldo de conexión con una credencial incrustada.
- `AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres, estable entre instancias del mismo despliegue. Es obligatorio en Vercel.
- `PORT`: puerto local opcional.

MongoDB es la fuente de datos cuando está configurado. Una caída de conexión bloquea escrituras; nunca se promueve automáticamente una copia local. `NEXUS_LOCAL_ONLY=1` y `NEXUS_DB_FILE` son opciones para pruebas locales con un archivo aislado; **no configurarlas en producción**.

## Estabilización antes de apertura

Ejecutar `npm test` y `npm run check`. Las pruebas usan datos ficticios y archivos temporales, sin conectarse a MongoDB ni modificar `db.json`. `npm run check` verifica sintaxis, copias de `public/`, enlaces de controles y ausencia de credenciales incrustadas.

Cada escritura requiere la versión exacta leída del servidor y una sesión válida. Un conflicto devuelve HTTP 409 sin sobrescribir datos. La pantalla no anuncia éxito si el servidor rechaza o no confirma el guardado. Ante un fallo, conserva evidencia local separada, revierte la vista al estado confirmado y exige consultar el estado actualizado. No se reproducen automáticamente operaciones pendientes ni bases completas de LocalStorage. **No repetir un cobro sin revisar el historial.**

Temporalmente quedan suspendidas la edición/reversión de compras existentes, la anulación de pagos a proveedores, la edición/eliminación manual de sus deudas y las reversiones de ventas a crédito, separe o turnos anteriores. Las compras nuevas y sus pagos mediante abonos siguen disponibles. Una reversión de contado del turno actual requiere coincidencia exacta de ID y SKU. No se permite cambiar la unidad de medida o peso por pieza de un SKU existente, ni eliminar clientes con cartera pendiente.

Las reposiciones calculan costo ponderado; las ventas nuevas guardan costo histórico inmutable. Los márgenes antiguos sin ese dato siguen siendo **estimaciones identificadas en pantalla**. No se reconstruyen ni recalculan masivamente los registros antiguos.

## Publicación y recuperación

1. Respaldar el proyecto y las colecciones de MongoDB; conservar las copias local y remota por separado. La última copia local no debe sustituir producción.
2. Configurar `MONGO_URI` y `AUTH_SECRET` en cada proyecto Vercel conectado. Este repositorio registró dos destinos: `charlessjoyas` y `nexus-pos-saas`.
3. Revocar o rotar la credencial de MongoDB expuesta en versiones anteriores. Los despliegues inmutables antiguos también deben quedar protegidos o sin acceso a la base; actualizar solo un dominio no resuelve ese acceso.
4. Validar en un despliegue separado con una base de prueba: inicio/restauración de sesión, venta, stock, recibo, conflicto entre dispositivos y cierre. Cambiar a producción durante una pausa sin movimientos; todos los dispositivos deben recargar e iniciar sesión.
5. Comprobar el resultado publicado antes de reanudar operaciones. Las pruebas locales no certifican la configuración remota ni la impresora física.

Para volver de versión, conservar siempre los datos actuales y pausar las escrituras. **No restaurar un respaldo antiguo sobre ventas nuevas.** No volver a habilitar una versión con la API anterior sin autenticación o con la credencial expuesta. La rama de estabilización y los respaldos externos permiten revisar/recuperar el código por separado de los datos.

---

## 📄 Licencia
Propiedad de **Inversiones Charles Joyas S.A.S**. Todos los derechos reservados.
