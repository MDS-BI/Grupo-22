# Quickstart: Validación del 007

**Especificación**: [spec.md](spec.md)

## Verificación automática

```bash
npm ci
npm test -- --run
npm run lint
npm run build
```

Todas las pruebas de `001`–`006` deben pasar sin modificarlas, junto con las nuevas del `007`.

## Recorrido manual

1. `npm run dev`, ingresar como `GER-001` y cargar los datos de demostración.
2. **Panel**: la tarjeta «Productos bajo el mínimo» lista 2 productos con su cantidad sugerida. La campana muestra un contador.
3. **Búsqueda → ficha de un proveedor**: la sección «Evaluación del proveedor» muestra % a tiempo, atraso promedio y calificación. En la demo hay al menos un proveedor A, uno B y uno C.
4. **Comprar por producto** (como `DEMO-COMPRADOR`): «+ Nueva solicitud» abre en «Comprar por producto». Buscar un producto con dos proveedores, escribir una cantidad que cruce un tramo (por ejemplo 10) y ver cómo cambia el precio; elegir la opción destacada, agregar otro producto de otro proveedor y guardar: se crean dos solicitudes y el aviso muestra sus números.
5. **Reportes**: cambiar la agrupación (Proveedor, Rubro, Área, Mes) y el rango; exportar CSV y abrirlo en Excel (columnas separadas, tildes correctas).
6. Ingresar como `DEMO-ADMIN` → **Reportes → Áreas y presupuestos**: crear un área y fijar su presupuesto del mes.
7. Ingresar como `DEMO-COMPRADOR`: en el Panel, «Crear solicitud sugerida» genera borradores por proveedor; elegir el área, enviar a revisión.
8. Ingresar como `DEMO-GERENTE`: el detalle de la solicitud muestra el presupuesto del área; al aprobar una que excede, la confirmación advierte y permite aprobar.
9. Volver como `DEMO-COMPRADOR`: la campana muestra «Solicitud aprobada»; al hacer clic se abre la orden y el contador baja.
10. **Mejoras rápidas**: duplicar una OC; inactivar un proveedor y comprobar que no aparece al crear una solicitud; exportar la lista de Proveedores a CSV.
11. Como `DEMO-BODEGUERO`: ve «Productos bajo el mínimo» sin el botón de crear; no ve «Reportes» ni la evaluación.
