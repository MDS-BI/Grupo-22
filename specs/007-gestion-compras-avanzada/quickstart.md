# Quickstart: Validación del 007

**Especificación**: [spec.md](spec.md)

## Verificación automática

```bash
npm ci
npm test -- --run
npm run lint
npm run build
```

Todas las pruebas de `001`–`006` deben pasar sin cambiar su intención; solo se ajustan los conteos de demostración (12→16), junto con las nuevas del `007`.

US1 (evaluación de proveedores, `gradeFor`) es dependencia dura de US2 y US7: la calificación interviene siempre en el paso (4) de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación A > B > C > Sin datos → nombre), sin omisión ni desempate alternativo.

## Recorrido manual

1. `npm run dev`, ingresar como `GER-001` y cargar los datos de demostración.
2. **Panel**: la tarjeta «Productos bajo el mínimo» lista 2 productos con su cantidad sugerida. La campana muestra un contador.
3. **Búsqueda → ficha de un proveedor**: la sección «Evaluación del proveedor» muestra % a tiempo, atraso promedio y calificación (requiere `reports.view`). En la demo hay al menos un proveedor A, uno B y uno C.
4. **Comprar por producto** (como `DEMO-COMPRADOR`): «+ Nueva solicitud» abre en «Comprar por producto». Buscar un producto con dos proveedores, escribir una cantidad que cruce un tramo (por ejemplo 10) y ver cómo cambia el precio; elegir la opción destacada —la primera según FR-011: CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre, sin conversión de moneda— (la columna «Calificación» es visible para el Comprador según la excepción de FR-005), agregar otro producto de otro proveedor y guardar: se crean dos solicitudes y el aviso muestra sus números.
5. **Reportes**: cambiar la agrupación (Proveedor, Rubro, Área, Mes) y el rango; exportar CSV y abrirlo en Excel (columnas separadas, tildes correctas).
6. Ingresar como `DEMO-ADMIN` → **Reportes → Áreas y presupuestos**: crear un área y fijar su presupuesto del mes.
7. Ingresar como `DEMO-COMPRADOR`: en el Panel, «Crear solicitud sugerida» genera borradores por proveedor según el ranking de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre, sin conversión de moneda); los borradores se crean sin `id_area` (T033). Al abrir cada borrador, elegir el área en `#document-area` **al enviar a revisión**: el submit de `src/app.js` (T034) pasa ese valor a `changeOrderStatus` en `src/purchasing-storage.js` (T033), que aplica `AREA_REQUIRED` si hay áreas activas (FR-018); sin áreas activas el campo no aparece y el envío se permite.
8. Ingresar como `DEMO-GERENTE`: el detalle de la solicitud muestra el presupuesto del área; al aprobar una que excede, la confirmación advierte y permite aprobar.
9. Volver como `DEMO-COMPRADOR`: la campana muestra «Solicitud aprobada»; al hacer clic se abre la orden y el contador baja.
10. **Mejoras rápidas**: duplicar una OC; inactivar un proveedor y comprobar que no aparece al crear una solicitud; exportar la lista de Proveedores a CSV.
11. Como `DEMO-BODEGUERO`: ve «Productos bajo el mínimo» sin el botón de crear; no ve «Reportes» ni la evaluación en ficha/tarjetas (la excepción de FR-005 aplica solo a la tabla comparativa de US7, que ese rol no usa).
