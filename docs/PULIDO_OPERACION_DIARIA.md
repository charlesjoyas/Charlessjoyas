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
