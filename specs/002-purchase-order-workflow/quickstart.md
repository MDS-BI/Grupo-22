# Quickstart de Validación: Extensión de Órdenes de Compra

**Rama**: `002-purchase-order-workflow`
**Fecha**: 2026-11-07
**Especificación**: [spec.md](spec.md)
**Modelo de datos**: [data-model.md](data-model.md)
**Contratos**: [contracts/purchase-order-workflow.md](contracts/purchase-order-workflow.md)

## Prerrequisitos

- Node.js y npm instalados.
- Dependencias del proyecto instaladas.
- Navegador moderno con soporte de `localStorage`.
- Datos mínimos: un proveedor, un empleado, una categoría y al menos dos productos con stock inicial.

## Preparación

```powershell
npm install
npm run dev
```

Abrir la URL que entrega Vite, normalmente `http://localhost:5173`.

## Validación Automatizada

```powershell
npm test -- --run
npm run build
npm run lint
```

**Resultado esperado**: todas las pruebas pasan, el build termina sin errores y `npm run lint` no reporta errores.

Cobertura mínima esperada:

- Unitarias: subtotales, neto, IVA, total, redondeo y transiciones válidas e inválidas.
- Unitarias: planificación de recepción, idempotencia y recuperación de transacciones.
- Integración: alta, edición y eliminación de líneas con recálculo de totales.
- Integración: botones de estado, historial, recepción única de stock y persistencia.
- Integración: vista imprimible con contenido completo y sin controles de aplicación.

## Escenarios Manuales

### 1. Crear una orden con líneas y verificar totales

1. Abrir la sección de órdenes de compra y crear una orden en borrador con proveedor, empleado, folio y fechas válidas.
2. Agregar dos productos con cantidades y precios unitarios distintos.
3. Verificar que cada línea muestra su subtotal.
4. Verificar que el neto es la suma de los subtotales, el IVA es el 19 % del neto y el total es neto + IVA.
5. Editar la cantidad de una línea y comprobar que los tres importes se actualizan.
6. Eliminar una línea y comprobar que los importes se recalculan sin ella.
7. Intentar guardar una orden sin líneas y comprobar que el sistema lo impide.

**Resultado esperado**: la orden queda guardada con líneas, totales correctos y validaciones visibles.

### 2. Recorrer el flujo de estados

1. Abrir una orden en borrador.
2. Verificar que solo aparecen las acciones Enviar a revisión y Cancelar.
3. Enviarla a revisión y verificar que ahora aparecen Aprobar y Cancelar.
4. Aprobarla y verificar que ahora aparece Marcar recibida.
5. Recibirla y verificar que no quedan acciones de transición.

**Resultado esperado**: las acciones visibles cambian según el estado y las transiciones inválidas no son ejecutables.

### 3. Verificar la recepción y el stock

1. Registrar el stock inicial de los productos de una orden aprobada.
2. Marcar la orden como recibida.
3. Verificar que el stock de cada producto aumentó exactamente en la cantidad de su línea.
4. Intentar recibir nuevamente la misma orden.
5. Verificar que el stock no cambió y que se informó que la recepción ya fue aplicada.
6. Cancelar otra orden y verificar que el stock no cambia.

**Resultado esperado**: el stock se actualiza una sola vez y la cancelación no lo modifica.

### 4. Consultar el historial

1. Abrir una orden que haya pasado por varios estados.
2. Verificar que el historial muestra estado anterior, estado nuevo y fecha/hora de cada cambio.
3. Verificar que los registros están en orden cronológico.
4. Intentar una transición inválida y comprobar que no se agrega un registro.
5. Recargar la aplicación y volver al historial.

**Resultado esperado**: el historial se conserva completo, ordenado y sin registros de transiciones rechazadas.

### 5. Imprimir la orden

1. Abrir el detalle de una orden con líneas e historial.
2. Elegir la acción de impresión.
3. Revisar la previsualización del navegador.
4. Verificar folio, proveedor, RUT, condición de pago, empleado, fechas, estado, líneas, subtotales, neto, IVA, total e historial.
5. Verificar que no aparecen barra lateral, navegación, botones ni formularios de edición.

**Resultado esperado**: la previsualización contiene solo el documento de la orden, con toda la información requerida.

### 6. Verificar persistencia y recuperación

1. Crear una orden con líneas y avanzar el estado.
2. Recargar la aplicación.
3. Verificar que se conservan líneas, totales, estado, historial y marca de stock aplicado.
4. Simular una transacción incompleta en el diario de recepción y recargar.
5. Verificar que el sistema restaura un estado consistente y no duplica stock.

**Resultado esperado**: los datos sobreviven a la recarga y la recuperación mantiene la coherencia entre orden, stock e historial.

### 7. Validar el empleado obligatorio

1. Abrir el formulario de creación de una orden de compra.
2. Completar proveedor, folio y fechas, sin seleccionar un empleado.
3. Intentar guardar la orden.

**Resultado esperado**: el sistema rechaza el guardado y muestra un mensaje claro indicando que debe seleccionar un empleado.

### 8. Validar el envío a revisión sin líneas

1. Abrir una orden en borrador sin líneas válidas.
2. Intentar enviarla a revisión.

**Resultado esperado**: el sistema rechaza la transición con `NO_LINES`, mantiene el estado `borrador` y no agrega historial.

## Criterios de Aceptación de la Validación

- Los totales son correctos con dos decimales internos y se muestran en CLP sin decimales.
- Una orden sin líneas no puede guardarse ni enviarse a revisión.
- Solo se ofrecen las transiciones permitidas por el estado actual.
- El stock se aplica exactamente una vez por orden recibida.
- El historial conserva cada transición exitosa con fecha y hora.
- La vista imprimible contiene todos los datos requeridos y omite controles de la aplicación.
- Los datos persisten en `localStorage` después de recargar.
- La suite de pruebas y el build finalizan correctamente.
