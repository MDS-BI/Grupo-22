# Quickstart: Validación de 006

**Especificación**: [spec.md](spec.md)

## Verificación automática

```bash
npm ci
npm test -- --run
npm run lint
```

Resultado esperado: todas las pruebas pasan (las 325 de `001`–`004` sin cambios y las 31 nuevas de `006`) y ESLint no informa errores.

## Recorrido manual

1. `npm run dev`, ingresar como `GER-001` y cargar los datos de demostración. La notificación incluye «precios acordados».
2. **Productos → + Nuevo**: guardar sin proveedores (se rechaza); agregar dos proveedores con precio y guardar. La tabla muestra «Proveedor (precio)».
3. Cerrar sesión e ingresar como `BOD-001`: Productos no muestra «+ Nuevo» ni la sección de precios; la edición de stock sigue disponible.
4. Ingresar como `DEMO-COMPRADOR` (o `COMP-001`): **+ Nuevo** en Solicitudes. No aparece el campo Folio. Al elegir un proveedor demo, el selector solo lista sus productos con precio; el costo unitario se completa y no se puede editar. Junto a Moneda aparece «Moneda fija CLP para proveedores nacionales.».
5. Guardar la solicitud: la lista la muestra como `SOL-00NN`.
6. Como `GER-001`, enviar y aprobar la solicitud: la lista y el detalle muestran `OC-00NN`.
7. **Solicitudes y Órdenes de Compra → filtro Estado**: las opciones no se repiten; probar «Solicitud – Pendiente de aprobación» y el grupo «Orden de Compra emitida».
8. **Búsqueda**: buscar «Boreal» o «Pacífico». El resultado muestra «ID tributario ext. …» sin « · · ». Hacer clic: se abre la ficha con datos, lista de precios, historial y monto total comprado.
