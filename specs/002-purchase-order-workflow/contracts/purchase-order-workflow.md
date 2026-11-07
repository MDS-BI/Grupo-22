# Contratos: Extensión de Órdenes de Compra

**Rama**: `002-purchase-order-workflow`
**Fecha**: 2026-11-07
**Especificación**: [spec.md](../spec.md)
**Modelo de datos**: [data-model.md](../data-model.md)

## Alcance

La extensión es una aplicación web local sin API externa. Los contratos documentan las interfaces internas entre la interfaz, el dominio y el almacenamiento, y el comportamiento observable de las acciones de usuario.

## Contrato de Almacenamiento

### Operaciones de orden

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| Guardar orden con líneas | Cabecera base, metadatos (`id_empleado` obligatorio), líneas | Orden, metadatos y líneas persistidos | `ORDER_INVALID`, `NO_LINES`, `LINE_INVALID`, `FOLIO_DUPLICATE`, `PERSISTENCE_ERROR` |
| Actualizar orden con líneas | `id_orden_compra`, cabecera, metadatos (`id_empleado` obligatorio), líneas | Registros actualizados y total recalculado | `ORDER_NOT_FOUND`, `ORDER_TERMINAL`, `NO_LINES`, `LINE_INVALID`, `PERSISTENCE_ERROR` |
| Obtener detalle de orden | `id_orden_compra` | Vista de lectura con proveedor, empleado, líneas, totales e historial | `ORDER_NOT_FOUND` |
| Eliminar orden | `id_orden_compra` | Orden, líneas, metadatos, historial y transacciones eliminados | `ORDER_NOT_FOUND` |
| Listar órdenes | Sin parámetros | Órdenes con estado, total y acciones disponibles | — |

`id_empleado` es obligatorio al crear o guardar una OC; si falta, la operación se rechaza con `ORDER_INVALID` y un mensaje que indique seleccionar un empleado.

### Operaciones de líneas

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| Listar líneas | `id_orden_compra` | Líneas de la orden | `ORDER_NOT_FOUND` |
| Agregar o actualizar línea | `id_orden_compra`, producto, cantidad, costo unitario | Línea validada y totales recalculados | `LINE_INVALID`, `PRODUCT_NOT_FOUND`, `PRODUCT_DUPLICATE`, `ORDER_TERMINAL` |
| Eliminar línea | `id_orden_compra`, `id_producto` | Línea eliminada y totales recalculados | `LINE_NOT_FOUND`, `ORDER_TERMINAL`, `NO_LINES` |

### Operaciones de estado

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| Obtener acciones permitidas | `id_orden_compra` | Lista de estados destino permitidos | `ORDER_NOT_FOUND` |
| Cambiar estado | `id_orden_compra`, estado destino, marca de tiempo | Orden actualizada y registro de historial | `INVALID_TRANSITION`, `ORDER_NOT_FOUND`, `NO_LINES`, `PERSISTENCE_ERROR` |
| Obtener historial | `id_orden_compra` | Cambios de estado en orden cronológico | `ORDER_NOT_FOUND` |

La transición `borrador → pendiente` se rechaza con `NO_LINES` si la OC no tiene al menos una línea válida; no se modifica el estado ni se agrega historial.

### Operaciones de recepción

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| Recibir orden | `id_orden_compra`, marca de tiempo | Stock actualizado, orden recibida, historial y transacción completada | `INVALID_TRANSITION`, `STOCK_ALREADY_APPLIED`, `LINE_INVALID`, `PERSISTENCE_ERROR` |
| Recuperar transacciones | Sin parámetros | Estado consistente tras una interrupción | — |

### Contrato de atomicidad

- La recepción afecta productos, cabecera, metadatos e historial.
- Antes de escribir, se registra una transacción `prepared` con las instantáneas `before` y `after`.
- Si cualquier escritura falla, se restauran las instantáneas `before` y se informa el error.
- Al completar todas las escrituras, la transacción pasa a `applied` y se limpia.
- Al arrancar, toda transacción `prepared` se revierte; toda transacción `applied` se verifica y se limpia.
- La interfaz nunca muestra una orden recibida con stock no aplicado ni stock aplicado con orden no recibida.

### Contrato de idempotencia

- La recepción solo es válida desde `aprobado` hacia `recibido`.
- Si `stock_aplicado` es `true`, la operación devuelve `STOCK_ALREADY_APPLIED` y no modifica ningún producto.
- La marca `stock_aplicado` se persiste antes de considerar la recepción completada.
- Una cancelación nunca ejecuta la operación de recepción.

### Contrato de historial

- Cada transición exitosa genera exactamente un registro `{from, to, changedAt}`.
- Una transición rechazada no genera registro.
- Los registros se conservan al recargar y al navegar.
- La lectura del historial se ordena por `changedAt` ascendente.
- El historial se elimina en cascada con la orden.

## Contrato de Interfaz de Usuario

### Vistas

| Vista | Propósito |
|---|---|
| Lista de órdenes | Mostrar folio, proveedor, fecha de entrega, total, estado y acciones |
| Detalle de orden | Mostrar cabecera, líneas, totales, acciones de estado, historial y acceso a impresión |
| Editor de líneas | Agregar, editar y eliminar líneas mientras la orden no sea terminal |
| Vista imprimible | Documento limpio de la orden, sin navegación ni acciones |

### Acciones observables

| Acción | Elemento | Comportamiento |
|---|---|---|
| Ver detalle | `data-action="view-order"` | Abre el detalle de la orden seleccionada |
| Agregar línea | `data-action="add-line"` | Agrega una fila editable de línea |
| Guardar línea | `data-action="save-line"` | Valida y persiste la línea; recalcula totales |
| Eliminar línea | `data-action="delete-line"` | Elimina la línea; recalcula totales |
| Cambiar estado | `data-action="transition"` con `data-next-status` | Solicita confirmación, ejecuta la transición y refresca acciones e historial |
| Imprimir orden | `data-action="print-order"` | Abre la vista imprimible y la impresión nativa |
| Cerrar detalle | `data-action="close-order-detail"` | Vuelve a la lista sin perder datos |

### Matriz de acciones por estado

| Estado | Acciones de estado visibles |
|---|---|
| `borrador` | Enviar a revisión, Cancelar |
| `pendiente` | Aprobar, Cancelar |
| `aprobado` | Marcar recibida |
| `recibido` | Ninguna |
| `cancelado` | Ninguna |

La acción de impresión está disponible en todos los estados. Las acciones de edición de líneas solo están disponibles mientras la orden no sea `recibido` ni `cancelado`.

### Contrato de líneas

- El selector de producto solo muestra productos existentes.
- La cantidad es un entero positivo.
- El precio unitario es un número no negativo.
- El subtotal se muestra calculado y no es editable.
- El formulario impide guardar una línea inválida y muestra el error junto al campo.
- Al guardar o eliminar una línea, el neto, el IVA y el total se actualizan en la misma pantalla.
- Una orden sin líneas no puede guardarse ni enviarse a revisión.

### Contrato de la vista imprimible

La vista imprimible debe mostrar:

- Nombre del módulo y título del documento.
- Folio, proveedor, RUT del proveedor, condición de pago y empleado solicitante.
- Fecha de emisión, fecha de entrega y estado actual.
- Tabla de líneas con producto, unidad, cantidad, precio unitario y subtotal.
- Neto, IVA del 19 % y total.
- Historial de estados con estado anterior, estado nuevo y fecha/hora.
- Indicación de que la orden fue recibida y el stock fue aplicado, cuando corresponda.

Al imprimir:

- Se ocultan barra lateral, navegación, botones, formularios, mensajes de la aplicación y controles de edición.
- Se conservan encabezados de tabla y totales en cada página cuando el contenido se distribuye.
- No se generan archivos PDF ni se envían datos a un servidor.

### Contrato de accesibilidad

- Todas las acciones son operables con teclado.
- Los botones tienen texto o `aria-label` comprensible.
- Los campos de línea tienen etiqueta asociada y errores anunciables.
- El foco es visible.
- El contraste cumple WCAG 2.1 AA.
- La tabla de líneas y el historial usan encabezados semánticos.

## Contrato de Errores

| Código | Mensaje orientado al usuario |
|---|---|
| `ORDER_INVALID` | La orden tiene datos inválidos; revisa los campos marcados. |
| `ORDER_NOT_FOUND` | No se encontró la orden de compra. |
| `ORDER_TERMINAL` | La orden recibida o cancelada no puede modificarse. |
| `NO_LINES` | Debes agregar al menos una línea de detalle. |
| `LINE_INVALID` | La línea tiene datos inválidos; revisa producto, cantidad y precio. |
| `PRODUCT_NOT_FOUND` | El producto seleccionado ya no existe. |
| `PRODUCT_DUPLICATE` | El producto ya está incluido en esta orden. |
| `INVALID_TRANSITION` | La acción no está permitida para el estado actual. |
| `STOCK_ALREADY_APPLIED` | La recepción de esta orden ya fue aplicada. |
| `PERSISTENCE_ERROR` | No fue posible guardar los cambios; se restauró el estado anterior. |

## Fuera de Contrato

- Autenticación, autorización por roles y registro de usuario.
- Sincronización entre pestañas, dispositivos o usuarios.
- Recepciones parciales, múltiples bodegas y devoluciones.
- Generación de PDF en servidor o firma electrónica.
- Edición del historial por parte del usuario.
