# Notificaciones Web Push

La campana abre preferencias por dispositivo y cuenta para ventas, compras y movimientos de caja. Los permisos del módulo correspondiente se verifican al activar y nuevamente al enviar. No se solicita permiso automáticamente.

## Activación

1. Iniciar sesión, abrir la campana y elegir los avisos.
2. Pulsar «Activar en este dispositivo» y aceptar el permiso del navegador/sistema.
3. Pulsar «Enviar prueba». El modo No molestar puede silenciar la notificación.

En iPhone/iPad, requiere iOS/iPadOS 16.4 o posterior: Safari → Compartir → Agregar a inicio, luego abrir desde ese icono. Safari de macOS requiere una versión compatible con Web Push. No es necesario un programa de desarrolladores de Apple.

## Operación

- `NEXUS_ENABLE_WEB_PUSH=1`, `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` y `WEB_PUSH_SUBJECT` deben configurarse en el proyecto de producción que corresponda. Generar un par VAPID una sola vez con `web-push`; conservar la clave privada fuera del repositorio. Una rotación requiere volver a suscribir los dispositivos.
- Las colecciones `web_push_subscriptions` y `web_push_deliveries` están separadas del documento de negocio. Las suscripciones se cifran con AES-256-GCM y una clave derivada de `AUTH_SECRET`. Rotar ese secreto invalida las suscripciones anteriores.
- Las ventas y compras recién guardadas producen su propio aviso. Los abonos incluidos en ellas no producen un segundo aviso de caja. Apertura/cierre de turno, egresos, abonos independientes, ajustes y anulaciones también generan avisos según su tipo. Actualizar inventario, costos o KPIs no reproduce ventas históricas.
- Los avisos no incluyen importes, clientes ni cuentas bancarias en la pantalla bloqueada. El detalle se consulta iniciando sesión en la aplicación.
- El cierre de sesión elimina la suscripción del dispositivo identificado por una cookie HttpOnly. Desactivar desde preferencias elimina también la suscripción del navegador. El envío siempre comprueba usuario activo, versión de credenciales y permisos actuales.
- La entrega se programa después del guardado confirmado y se mantiene mediante `waitUntil` en Vercel. Una falla de Push no devuelve un error de venta ni revierte un movimiento. Web Push no es un libro contable ni garantiza entrega: depende de conexión, permisos y sistema operativo. No hay reintento automático ni reproducción de alertas históricas.
- Se evitan avisos duplicados por evento/dispositivo; los identificadores de entrega expiran después de siete días. Los destinos expirados (404/410) se eliminan. La prueba solo admite el propio dispositivo y tiene un intervalo mínimo de 30 segundos.
- El service worker solo atiende `push` y `notificationclick`; no intercepta peticiones ni almacena pantallas o datos financieros sin conexión. El manifiesto y los iconos permiten instalar la app.

## Verificación

`npm test` cubre sesiones, permisos, destinos HTTPS autorizados, cifrado, aislamiento del estado financiero, deduplicación, revocación, expiración, prueba propia, fallos de envío y service worker. `npm run check` verifica también los archivos públicos. Las pruebas automatizadas del permiso no sustituyen la prueba en un Safari real con autorización del usuario.
