# Continuación sin interrumpir las ventas — 21 de noviembre de 2026

## Límites de este bloque

El negocio ya está operando. No se cambia su base, catálogo, saldos, secretos, permisos ni versión publicada. El paso de configuración de producción y rotación de credenciales queda para el final. Las pruebas y los ensayos de corrección trabajan en memoria o en archivos nuevos.

El código se puede subir a una rama de revisión sin desplegarlo: `vercel.json` desactiva el despliegue automático únicamente para `codex/preopening-stabilization`, según [la configuración oficial de Vercel](https://vercel.com/docs/project-configuration/git-configuration). No se fusiona esa rama en `main` durante la operación. La CI de GitHub usa datos ficticios, ningún secreto de MongoDB y almacenamiento aislado.

La publicación y la comprobación del sistema publicado dependen del paso aplazado: la nueva versión necesita una sesión del servidor y el secreto de firma configurado; los dispositivos antiguos no pueden seguir usando el protocolo de guardado anterior. Este cambio debe coordinarse en una pausa, tras respaldar y preparar el entorno.

## Validaciones realizadas

- Respaldo actual obtenido usando exclusivamente `listCollections`, `find` y `listIndexes`; lectura preferida desde una réplica secundaria cuando esté disponible. SHA256 y conteos verificados. Las colecciones no constituyen una instantánea conjunta; cada documento de tienda se lee atómicamente.
- Ensayo de recuperación del documento `main_store` en un archivo local nuevo. La herramienta no tiene operaciones de restauración ni escritura a MongoDB.
- Prueba en memoria con copia del catálogo actual: guardado saneado, compra de 0,125 g, pago, reintento del mismo comando, conflicto entre dispositivos y devolución. Se recuperan exactamente stock/costo y se preservan créditos existentes y cierres.
- Suite automatizada ampliada a 71 pruebas, incluyendo corrupción de respaldos, recuperación ambigua, fallo de conexión y rechazo de sobrescritura.
- Cruce de 33 estados históricos: siete copias de respaldo y 26 versiones de `db.json` extraídas de objetos Git sin cambiar el checkout ni el archivo de negocio.

## Resultados de conciliación

Se mantienen 321 renglones sin costo histórico, 10 sin identidad original en el catálogo, 23 abonos de clientes y 88 de proveedores sin distribución conservada por factura y ocho exclusiones históricas. Ahora hay candidatos de identidad para los diez renglones; no se encontraron costos originales verificables para los 321 renglones sin costo.

La copia actual también identifica ocho créditos pendientes sin facturas vinculadas y tres notas de deuda de proveedores no representada por órdenes pendientes. Estas últimas pueden corresponder a saldos iniciales y no se clasifican como pérdidas. No se modifica ningún saldo por esa diferencia.

El informe local de revisión contiene las referencias y espacios para soporte, responsable y observaciones. Cero conciliaciones aplicadas automáticamente. Las copias, informes y datos privados permanecen fuera de Git, en `scratch/` y en el directorio personal de respaldos.

## Herramientas de solo lectura y ensayo

```powershell
# MONGO_URI se suministra al proceso; nunca en argumentos ni en el repositorio.
node scripts/mongo-recovery.js snapshot DIRECTORIO_NUEVO
node scripts/mongo-recovery.js verify DIRECTORIO_RESPALDO
node scripts/mongo-recovery.js rehearse DIRECTORIO_RESPALDO COPIA_NUEVA.json
node scripts/export-git-evidence.js DIRECTORIO_NUEVO
node scripts/reconcile-history.js COPIA.json INFORME_NUEVO RESPALDOS HISTORIAL_GIT
node scripts/build-reconciliation-review.js COPIA.json INFORME_NUEVO/report.json REVISION_NUEVA
node scripts/validate-isolated-copy.js COPIA.json RESULTADO_NUEVO.json
```

Los respaldos completos contienen información privada, incluidas credenciales almacenadas en el estado. Mantenerlos en almacenamiento privado fuera del proyecto y de carpetas publicadas. Conservar las copias diarias al menos 30 días y las previas a cambios hasta verificar su recuperación. La copia de seguridad no debe compartirse por enlaces públicos ni adjuntarse a la PR.

La herramienta de respaldo queda operativa y el ensayo está realizado. La programación periódica, la copia fuera de este computador y una cuenta de respaldo con permisos solo de lectura siguen pendientes de configurar; no se habilitó un servicio persistente ni se alteró la cuenta de producción durante la operación.

## Equipos y pendientes operativos

El usuario confirmó que la impresora Jaltech POS imprime desde el computador del local, distinto del computador personal utilizado aquí. En este equipo solo hay impresoras virtuales. No se cambió configuración, se enviaron tickets ni se probaron físicamente la Jaltech o el lector.

Quedan para el equipo del local la prueba de impresión y del lector. Para el paso final quedan configuración/credenciales, publicación coordinada y validación del entorno publicado. Los datos históricos necesitan soportes antes de preparar ajustes para su aprobación y ejecución.
