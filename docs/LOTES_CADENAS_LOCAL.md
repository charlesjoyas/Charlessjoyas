# Piloto local de lotes de cadenas

Este piloto está en `codex/local-chain-lots`. No requiere migraciones, acceso a MongoDB ni cambios en datos del negocio. No publicar esta rama durante la prueba.

## Iniciar

Desde la raíz del proyecto:

```powershell
npm run demo:lotes
```

Abrir <http://127.0.0.1:43124>. El servidor escucha exclusivamente en la interfaz local.

- Administrador ficticio: `local@example.test`
- Cajera ficticia: `cajera@example.test`
- Contraseña de ambas cuentas ficticias: `LotesLocal2026!`

Los datos de prueba se crean solo la primera vez en `scratch/chain-lots-local/demo-db.json`. Los reinicios conservan las pruebas registradas. El servidor usa `NEXUS_LOCAL_ONLY=1`, un archivo independiente y un secreto de sesión aleatorio. La variable de MongoDB del `.env` no se utiliza. Los respaldos locales también se guardan dentro de esa carpeta de prueba.

## Probar

1. Entrar en **Lotes de cadenas · Local**. Hay un lote ficticio de 50 cadenas y 200 g, a 400.000 COP/g.
2. Pulsar **Vender**, ingresar 2 cadenas, peso real 7,6 g y precio 500.000 COP/g. Al agregar se muestran ambas cantidades en el carrito y en la confirmación de pago.
3. Cobrar 3.800.000 COP: quedan 48 cadenas y 192,4 g. El costo histórico vendido es 3.040.000 COP y la utilidad bruta es 760.000 COP, antes de otros gastos.
4. Recargar y reimprimir el recibo: deben conservarse lote, cadenas, peso e importes.
5. Anular la venta desde el historial, indicando el motivo: vuelven exactamente las cadenas y los gramos.
6. Probar otro ingreso: crear lote y SKU nuevos, proveedor, categoría, cadenas recibidas, peso conjunto real y costo por gramo. El ingreso crea la compra, la deuda y su auditoría en un solo guardado.

## Reglas y alcance

- Un producto nuevo representa un lote físico, con código de lote y SKU propios. Varios lotes pueden compartir nombre de referencia. Los productos anteriores mantienen su funcionamiento.
- El saldo `stock` conserva gramos; `stockUnits` registra cadenas completas. La venta guarda `qty` en gramos y `unitCount` en cadenas. No se estima el peso individual ni se calcula una cantidad usando un promedio.
- El costo se mantiene por gramo; los ingresos sucesivos del mismo lote usan el promedio ponderado existente. Para otro lote físico se debe crear otro SKU. El formulario piloto solo crea lotes nuevos.
- Los ingresos del formulario piloto quedan a crédito; los pagos se realizan con los módulos de compras y proveedores habituales.
- Una venta no puede superar cadenas o gramos, registrar cadenas fraccionarias, ni agotar solo uno de los dos saldos. El operador debe comprobar conteo/peso; el programa no borra diferencias automáticamente.
- Cada lote acepta gramos con hasta seis decimales. En sus campos de peso se admite punto o coma decimal, sin separadores de miles.
- Los saldos, identidad y costo del lote no se ajustan mediante edición genérica de producto. Una compra de lote se corrige mediante reversión documentada y nuevo ingreso; si ya se vendió mercancía, no se puede retirar más stock del disponible.
- Los guardados usan la versión del servidor, rechazan conflictos entre dispositivos y conservan identificadores de operación para evitar duplicar ingresos ante reintentos.
- El piloto se habilita únicamente cuando el servidor tiene las dos variables locales activas y no corre en Vercel. La rama está excluida del despliegue automático en `vercel.json`.

## Validación

```powershell
npm test
npm run check
```

Las pruebas usan fixtures ficticios y almacenamiento en memoria. Incluyen ingreso, venta, costos, deuda, devolución, agotamiento, decimales, permisos, intentos de editar saldos, guardados concurrentes, reintentos y fallos de almacenamiento. La prueba de navegador adicional usa el archivo independiente `browser-test-db.json` y el puerto 43125; no usa el archivo de demostración ni el del negocio.

La aprobación para producción queda pendiente de probar el flujo con el usuario y revisar su operación real. Estas comprobaciones reducen riesgos; no constituyen una garantía de ausencia absoluta de errores.
