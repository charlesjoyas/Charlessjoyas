# Aviso de actualización

La página recuerda el commit con que fue construida mediante una marca `nexus-release` en el HTML. `npm run build` incorpora `VERCEL_GIT_COMMIT_SHA` durante el despliegue; fuera de Vercel obtiene el commit de Git. No lee ni escribe la base de datos.

El cliente consulta `/api/version` al abrir, cada minuto mientras está visible y al recuperar el foco o la conexión. Las consultas se limitan a una cada 15 segundos y no se almacenan en caché. La API devuelve la marca del HTML que realmente se sirve, no el último commit de una rama todavía sin publicar. Un fallo de red no se interpreta como una actualización.

El aviso ofrece «Actualizar página» y «Más tarde». Nunca recarga automáticamente. Una venta con artículos, un guardado activo, una operación de resultado pendiente o una ventana modal abierta impiden la recarga. El botón verifica esas condiciones nuevamente al pulsarlo. «Más tarde» oculta esa versión en la pestaña; otra publicación vuelve a mostrar el aviso. Si se revierte al mismo código que ya está cargado, desaparece.

Las pantallas anteriores a esta implementación necesitan una primera recarga manual para incorporar el detector. El modo de desarrollo sin marca de commit no muestra avisos.

Verificación: pruebas del sello de compilación, API sin MongoDB, cambios de versión y reversión, errores de conexión, permisos de sesión visuales, conservación del carrito, formularios y guardados. La prueba de navegador usa exclusivamente datos ficticios y versiones simuladas.
