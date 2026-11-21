# Correcciones del flujo diario

Alcance: bugs de uso cotidiano. Conciliación y corrección de datos históricos aplazadas por instrucción del usuario. Cambios únicamente en la rama de revisión, sin despliegue ni escrituras a la base activa.

| Caso reproducido | Corrección |
| --- | --- |
| Un separe con abono inicial igual al total no dejaba un crédito vinculado y saldado; su reversión posterior no podía identificarlo. | Registrar también el separe completamente pagado, con saldo cero y estado Saldado. |
| Un pago mixto con diferencia de hasta un peso superaba el control del frontend y era rechazado después por el servidor. | Comparar la suma a precisión de centavos antes de modificar inventario. |
| Un rechazo definitivo de validación bloqueaba cobros posteriores hasta recargar. | Conservar carrito y estado previo, permitir corregir y volver a enviar; las respuestas inciertas y conflictos siguen exigiendo revisión. |
| El almacenamiento del navegador lleno o bloqueado podía impedir login/carga o comandos financieros. | Caché tolerante a fallos y comando pendiente conservado también en memoria; el guardado depende del servidor, no de LocalStorage. |
| Pegar 50.000 en un campo monetario podía convertirlo en 50. | Reconocer agrupación colombiana en máscaras monetarias, manteniendo intacta la interpretación decimal de los gramajes. |
| Cantidades y precios positivos podían producir una venta de cero pesos tras redondear. | Rechazarla localmente antes de descontar stock. |
| La suma de líneas fraccionarias redondeadas podía diferir del total de venta y recibo. | Sumar los importes redondeados de las líneas con la misma regla en frontend y servidor. |
| Al reimprimir se perdían efectivo recibido/cambio y podían sustituirse los datos del cliente por los del directorio actual. | Conservar recibido, cambio y saldo al momento de la venta; reimprimir la identidad almacenada en la transacción. No se rellenan masivamente registros anteriores. |
| Los números de venta se escogían de un rango aleatorio de 10.000 valores; agotarlo dejaba un bucle sin salida. | Continuar la secuencia existente sin límite de ese rango. El control de versión sigue rechazando escrituras simultáneas obsoletas. |

Además se alineó la precisión de la comprobación de stock con los seis decimales usados por inventario y se rechazan cantidades/precios no finitos antes de mutar datos.

La cobertura nueva está en `tests/daily-flows.test.js`; incluye corrección y reenvío tras rechazo, reimpresión, redondeo, agotamiento del rango y fallos de almacenamiento con respuesta incierta. Se conserva la suite de jornada completa, permisos, caja y fallos del servidor.

Comprobación en navegador con datos ficticios: inicio de sesión, selección de producto y precio, cobro en efectivo, venta confirmada y reimpresión tras recarga conservando recibido/cambio. También se abrieron Productos, Comprar, Créditos Clientes, Créditos Proveedores, Gastos, Finanzas, Reporte General y Cuadre de Caja sin errores de consola observados. No se imprimió físicamente ni se generaron transacciones reales.

## Segunda pasada: formularios, cuentas, búsqueda y permisos

Se añadieron casos reproducibles y correcciones en áreas distintas del cobro:

- Editar contacto de un proveedor con varios créditos ya no intenta consolidar sus saldos en el primer crédito. Los créditos existentes se conservan separados.
- Crear una cuenta bancaria nueva permite establecer únicamente su propio saldo inicial. El servidor sigue rechazando la reescritura de saldos previos y claves de cuenta falsificadas; configurar cuentas y métodos queda reservado a Super Admin, de acuerdo con la interfaz.
- Renombrar una cuenta mantiene una identidad estable para su saldo y movimientos. Cambia el rótulo sin trasladar registros anteriores a otro bolsillo. El campo de saldo inicial existente es de solo lectura; los cambios de dinero se registran como movimientos.
- Registrar movimientos bancarios con la caja cerrada no modifica el cierre. Los movimientos que involucran efectivo exigen el turno abierto actual, tanto en pantalla como en el servidor.
- Ajustar un saldo bancario conserva diferencias de centavos, sin redondearlas a cero.
- Los botones de editar y eliminar productos exigen que ID y SKU coincidan cuando se suministran ambos. Una referencia desactualizada no selecciona silenciosamente otro producto; tampoco se selecciona un producto al faltar ambos identificadores.
- El formulario de clientes conserva y permite marcar Pago Mixto, incluso para un cliente que solo tiene autorizado ese método.
- Las búsquedas con «código», «codigo» o «cod.» y varios términos identifican correctamente los códigos con ceros iniciales.
- Los perfiles Contador/Auditor no reciben botones de escritura por tener permisos personalizados: la interfaz respeta la misma restricción de solo lectura del servidor.
- El desglose de caja incluye la base de apertura de cuentas nuevas o renombradas, incluso cuando todavía no tienen movimientos en ese turno.

Cobertura adicional en `tests/forms-and-accounts.test.js`: formularios conectados a una API aislada, límites de inicialización de cuentas y preservación de identidades/saldos. La suite completa alcanza 93 pruebas.

Validación visual adicional, con datos ficticios: edición de proveedor conservando dos créditos de 100 y 200; creación y cambio de nombre de cuenta con saldo 1.000, conservado después de recargar; edición de contacto de cliente manteniendo Pago Mixto. No se observaron errores de consola en esos recorridos. No hubo cambios en datos del negocio ni despliegue de esta versión.
