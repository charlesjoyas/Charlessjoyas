# Inventario principal y Extras

El valor contable total (`kpis.inventoryValue`) conserva el costo de todos los productos. El panel muestra el inventario principal (`generalInventoryValue`) y el inventario Extra (`extrasInventoryValue`) por separado; su suma coincide con el total.

## Categorías y costos

- Los Extras existentes por unidad (`type: extras` o `isExtra: true`) mantienen su funcionamiento.
- Una categoría de joyería ya registrada puede separarse mediante `inventoryScope: extra`. Esto cambia su grupo de presentación sin cambiar `type`, medidas, pesos por pieza, existencias, precios ni costos de sus productos.
- El formulario de categorías ofrece **Extra con peso (Esmeraldas · promedio propio)** para nuevas categorías con esta separación.
- Una categoría Extra con peso conserva su costo promedio por gramo, calculado únicamente a partir de sus propios productos. Los gramos de esa categoría no entran en el gramaje ni en el promedio del inventario principal.
- Los productos individualmente marcados como Extra tampoco entran en el inventario principal, aunque conserven una categoría antigua de metales. Se muestran por separado sin moverlos automáticamente.
- Los valores se derivan de productos y existencias registrados. Los saldos manuales de categorías sin productos no crean mercancía contable por sí mismos.

## Separar una categoría existente

La operación autenticada `setCategoryInventoryScope` requiere un administrador con permiso de categorías, motivo, identificador único y versión actual del servidor. Recibe `categoryId` y `scope` (`extra` o `principal`). El cambio queda auditado con su categoría anterior y posterior.

La operación no cambia productos, compras, ventas, abonos o deudas. No convierte costos por gramo en costos por unidad. Revertir el grupo de una categoría con peso tampoco cambia esas cantidades. Los Extras originalmente definidos por unidad conservan su modalidad.

Los guardados directos no pueden cambiar la separación de una categoría existente ni eliminar una categoría separada que conserva productos. Se rechazan versiones desactualizadas; reintentar la misma operación confirmada no duplica la auditoría.

## Validación

Las pruebas incluyen conservación de valor total y registros físicos; separación del promedio de metales; costos y peso al comprar, vender y revertir; permisos, conflictos e idempotencia; presentación de cada grupo en el panel; y creación de nuevas categorías Extra con peso. Los fixtures automáticos usan cantidades ficticias.
