# Estabilización financiera local

Alcance autorizado: continuar operaciones financieras, conciliación histórica y validación/recuperación. La configuración de producción, despliegues y rotación de credenciales quedaron expresamente fuera de este bloque.

## Cambios implementados

- Comandos autenticados del servidor para compras, pagos, devoluciones, ajustes de deuda y corrección de gastos. La misma operación no se aplica dos veces aunque se pierda su respuesta.
- Reversión por identidad exacta de producto y asignaciones de pago por factura. Las devoluciones no se apropian de abonos de otras facturas ni de deuda inicial.
- Historial conservado y compensaciones registradas en el turno actual. Los cierres anteriores no se recalculan ni sobrescriben.
- Validación de totales de venta, pagos mixtos, saldos, principales de crédito, permisos y arqueos en el servidor. Exceder cupo requiere motivo de autorización administrativa conservado en la venta.
- Conciliación con soporte para costos ausentes, identidades, asignaciones de abonos y exclusiones históricas; exportación del informe completo.
- Motor compartido para movimientos de caja y cuentas; ajustes de valoración identificados en auditoría y resultados.
- Respaldo local previo a cada escritura, verificación SHA256 y restauración exclusivamente en un archivo nuevo. No configura respaldo programado de MongoDB.

## Evidencia de validación

La suite automatizada usa datos ficticios y almacenamiento aislado. Incluye una jornada completa, conflictos entre dispositivos, fallos de guardado, reintentos, devoluciones parciales, créditos, separes, cierres, autorización y recuperación. Ejecutar `npm test` y `npm run check` para obtener el resultado de la revisión actual.

Se ensayó la copia/restauración de un snapshot en un archivo separado y se verificó igualdad SHA256. En navegador local se registró un costo ficticio con soporte, se recargó la página y se verificó su persistencia. Se corrigió el desbordamiento de la nueva pantalla en un viewport pequeño.

El archivo de negocio `db.json` conserva el SHA256 original de esta sesión: `b04d4fd7646b69fb3b8f981e23a138f9df5a01d241568c09ed0d8f6433d98916`.

## Conciliación todavía necesaria

El análisis de solo lectura del snapshot remoto respaldado, cruzado con siete estados de respaldo disponibles, encontró:

| Hallazgo | Registros/renglones |
| --- | ---: |
| Renglones vendidos sin costo histórico | 321 |
| Renglones de venta sin identidad original en el catálogo actual | 10 |
| Abonos de clientes sin distribución conservada por factura | 23 |
| Abonos de proveedores sin distribución conservada por factura | 88 |
| Compras con exclusiones históricas | 8 |

Ocho de los diez renglones sin identidad tienen candidatos en los respaldos. No se encontraron costos de la misma venta y referencia que demuestren los 321 costos ausentes. Los candidatos son evidencia para revisar, no instrucciones de restauración automática. Los importes y datos privados permanecen en el informe local ignorado por Git, bajo `scratch/reconciliation-review/`.

No se han aplicado estas conciliaciones a los datos reales. Las operaciones ambiguas requieren los soportes del negocio. Tampoco se ha probado la impresora física, la configuración publicada ni el funcionamiento de estos cambios en producción.
