# Contracts: Mejoras de UX del módulo de Compras

**Feature**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08

Estos contratos describen el comportamiento observable esperado. No imponen una implementación específica, pero cualquier implementación debe cumplirlos y las pruebas deben verificarlos.

## 1. Contrato del panel lateral (`ui-side-panel.js`)

### Apertura

- `open({ title, content, entity, mode, recordId, initialValues, triggerElement })` muestra el panel sin ocultar permanentemente la lista.
- El panel tiene `role="dialog"`, `aria-modal="true"` y `aria-labelledby` apuntando al título visible.
- El foco inicial va al primer campo editable o al título si no hay campos.
- El fondo no debe ser interactuable mientras el panel está abierto.
- El panel se muestra con el mismo contenido en escritorio y móvil; en viewport estrecho ocupa el ancho completo.

### Cierre

- `close({ force = false })` cierra el panel.
- Si `dirty === true` y `force === false`, se abre la confirmación de descarte.
- Cancelar la confirmación mantiene el panel abierto, el foco dentro y todos los datos.
- Confirmar cierra el panel y restaura el foco a `triggerElement` o a un fallback de la vista.
- Esc se comporta como `close()`.
- El botón de cierre y el backdrop (si existe) se comportan como `close()`.

### Teclado y foco

- Tab y Shift+Tab ciclan solo entre elementos focusables del panel.
- El foco no escapa al fondo.
- Al cerrar, el foco no queda en el body.
- Los errores de validación no expulsan el foco del panel.

### Dirty guard

- En creación, el formulario vacío no es dirty; cualquier cambio en campos o líneas lo es.
- En edición, se compara con los valores iniciales; volver al valor inicial no es dirty.
- En órdenes, agregar/eliminar líneas o cambiar cantidades/costos marca dirty.
- Guardar con éxito limpia `dirty` y cierra el panel.
- Un error de guardado mantiene el panel abierto y los datos.

## 2. Contrato de formularios en panel

- Los formularios usan los mismos IDs, nombres, campos y validaciones existentes.
- Se agrupan en secciones visibles:
  - Proveedor: datos generales, contacto, condiciones comerciales.
  - Orden: cabecera, detalle, totales.
  - Producto: datos del producto.
- La grilla usa dos columnas cuando el ancho lo permite y una columna en pantallas estrechas.
- Cada campo obligatorio tiene:
  - `<label>` asociada.
  - Indicador visible `*`.
  - Texto accesible "obligatorio" (p. ej. `sr-only`).
  - `aria-required="true"`.
- Los errores se muestran junto al campo con `aria-invalid="true"` y `aria-describedby`, y en un resumen con `role="alert"`.
- Los campos con error conservan su valor.
- El guardado se impide mientras existan errores de validación.
- El botón de guardar muestra estado de envío y evita doble submit.
- Cancelar equivale a cerrar el panel y respeta el dirty guard.
- En órdenes, el detalle y los totales siguen las reglas existentes; no se recalculan con lógica nueva.
- En edición de orden, el estado no se modifica desde el formulario; las transiciones se hacen desde el detalle.

## 3. Contrato de consultas de lista (`purchasing-list-query.js`)

### Funciones

- `filterSuppliers(suppliers, filters)` → nuevo arreglo.
- `filterOrders(orders, filters, context)` → nuevo arreglo; `context` incluye proveedores, líneas y `today`.
- `filterProducts(products, filters, categories)` → nuevo arreglo.
- `sortRows(rows, sort)` → nuevo arreglo.
- `validateDateRange(from, to)` → `{ valid, message }`.
- `buildOrderRows(...)` / helpers de derivación → nuevos arreglos/objetos.

### Reglas

- No mutar entradas ni objetos internos.
- Filtros vacíos = todos.
- Filtros combinados = AND.
- Texto: comparación normalizada, insensible a mayúsculas/acentos cuando aplique.
- Fechas: comparación por fecha local; rango inclusivo.
- `deliveryFrom > deliveryTo`: `valid = false`, mensaje claro; la vista no aplica el filtro.
- `overdueOnly`: solo órdenes no terminales con `endDate < hoy`.
- Orden:
  - `asc`/`desc` según `sort.direction`.
  - Orden estable con desempate por índice original.
  - Texto con `Intl.Collator('es')`.
  - Fechas y números con comparación numérica.
- Rendimiento: una pasada de filtro y una de orden; sin escrituras en storage.

## 4. Contrato de listas (`purchasing-list-view.js`)

- Cada lista tiene:
  - Título y contador.
  - Botón `+ Nuevo` siempre visible.
  - Controles de filtro con etiquetas.
  - Botón `Limpiar filtros` visible cuando hay filtros activos.
  - Tabla con encabezados ordenables.
  - Estado vacío adecuado.
- La lista ocupa el ancho disponible; no comparte fila con un formulario.
- Filas:
  - Proveedor: nombre, código/RUT, categoría, contacto, acciones ver/editar/eliminar.
  - Orden: folio, proveedor, empleado, fechas, estado, total, acciones ver/editar/eliminar.
  - Producto: nombre, categoría, unidad, stock, acciones editar/eliminar.
- Acciones con iconos tienen nombre accesible; también pueden tener texto visible.
- Orden de tabla:
  - Cada columna de datos visible es ordenable.
  - El `<th>` contiene un `<button>`.
  - `aria-sort` refleja `ascending`/`descending`/`none`.
  - Activar alterna dirección y vuelve a renderizar.
  - El orden se conserva mientras el usuario permanezca en la lista.
- Estado vacío:
  - Sin registros: mensaje + acción para crear.
  - Sin coincidencias: mensaje + acción para limpiar filtros.
  - El estado vacío no rompe la tabla ni los controles.
- Filtros:
  - Órdenes: estado, proveedor, fecha desde, fecha hasta, solo atrasadas.
  - Proveedores: categoría.
  - Productos: categoría.
  - Los filtros se reflejan en la lista y en el resumen de filtros activos.
- Al abrir desde una tarjeta del dashboard, la lista muestra el filtro preaplicado y permite limpiarlo.
- En móvil, la tabla permite ver y usar acciones sin desplazamiento horizontal bloqueante; si se usa scroll, la primera columna/acciones permanecen accesibles.

## 5. Contrato del dashboard

- Las tarjetas de proveedores, productos y órdenes son controles navegables (botón o enlace con semántica correcta).
- El desglose por estado muestra badge con texto y color y es navegable.
- Activar una tarjeta:
  - Proveedores → vista de proveedores.
  - Productos → vista de productos.
  - Órdenes → vista de órdenes.
  - Estado → vista de órdenes con filtro de estado.
  - Atrasadas → vista de órdenes con `overdueOnly`.
- El filtro preaplicado se refleja en los controles y se puede limpiar.
- Los contadores se actualizan tras crear/editar/eliminar/cargar demo.
- Las acciones rápidas siguen funcionando; `Nuevo proveedor`/`Nueva orden` abren el panel en modo creación.
- La acción de demo está disponible y muestra confirmación si hay datos existentes.

## 6. Contrato de feedback (`ui-feedback.js`)

### Toasts

- `notify({ type, message, persistent? })` muestra un toast.
- Se muestra éxito tras guardar, eliminar o cambiar de estado correctamente.
- Se muestra error comprensible si la operación de guardado, eliminación o cambio de estado falla.
- Éxito/info: se oculta automáticamente a los 5 s.
- Error: permanece hasta cierre manual.
- Cada toast tiene botón de cierre con nombre accesible.
- La región no roba foco.
- Varios toasts no se solapan de forma inaccesible; se apilan y se pueden cerrar individualmente.
- Los mensajes de error de persistencia/validación existentes se muestran como error persistente.

### Confirmación

- `confirm({ title, message, confirmLabel, cancelLabel, tone })` devuelve `Promise<boolean>`.
- Se usa para:
  - Eliminar proveedor.
  - Eliminar producto.
  - Eliminar orden.
  - Cancelar orden.
  - Cerrar panel con cambios sin guardar.
  - Cargar demo con datos existentes.
- `role="alertdialog"`, título y mensaje asociados.
- Foco inicial seguro (cancelar en acciones destructivas).
- Esc y cancelar resuelven `false`; confirmar resuelve `true`.
- Retorna foco al disparador.
- No se usa `window.confirm`, `alert` ni `prompt`.

## 7. Contrato de badges de estado (`purchasing-status.js`)

- `statusLabel(status)` devuelve el texto visible para `borrador`, `pendiente`, `aprobado`, `recibido`, `cancelado`.
- `statusClass(status)` devuelve una clase CSS estable.
- `renderStatusBadge(status)` devuelve HTML seguro con `data-status` y texto.
- El texto siempre está presente; el color no es el único indicador.
- Los colores cumplen contraste AA sobre el fondo del badge.
- Se usa en lista de órdenes, detalle de orden y dashboard.
- Estados desconocidos se muestran como texto sin romper la vista.

## 8. Contrato de datos de demostración (`purchasing-demo-data.js`)

### API

- `hasDemoData()` / `hasExistingPurchasingData()` detecta datos existentes.
- `loadDemoData()` agrega el dataset y devuelve un resultado `{ ok, created, error }`.
- La UI decide si pide confirmación antes de llamar.

### Comportamiento

- Si no hay datos, carga directa.
- Si hay datos, la UI confirma; cancelar no llama a `loadDemoData()` ni modifica nada.
- Nunca elimina ni sobrescribe registros existentes.
- Genera valores únicos:
  - RUT válidos.
  - Folios desde el máximo existente + 1.
  - Nombres con sufijo si ya existen.
- Dataset mínimo:
  - 3 proveedores.
  - 2 empleados.
  - 3 categorías.
  - 6 productos.
  - 6 órdenes: `borrador`, `pendiente`, `aprobado`, `recibido`, `cancelado` y al menos una atrasada no terminal.
  - Al menos una línea por orden, sin producto duplicado.
- Usa las APIs existentes; no escribe claves nuevas ni campos nuevos.
- `recibido` se logra con la transición real y aplica stock.
- `cancelado` se logra con una transición permitida.
- Si falla:
  - Los datos existentes permanecen intactos.
  - Se intenta limpiar lo creado en orden inverso de dependencia.
  - Se devuelve error para mostrar toast persistente.
- Al terminar con éxito:
  - Se refrescan dashboard y listas.
  - Se muestra toast de éxito.
  - Los filtros/orden actuales se conservan o se reinician de forma predecible (documentar en implementación; preferido: conservar y re-renderizar).

## 9. Contrato de accesibilidad

- Todos los controles son alcanzables por teclado.
- Foco visible en todos los elementos interactivos.
- `aria-live` para toasts; `role="alert"` para errores.
- `aria-sort` en encabezados ordenables.
- `aria-pressed` o equivalente en filtros tipo toggle.
- Etiquetas asociadas a todos los campos; placeholders no sustituyen etiquetas.
- Iconos decorativos con `aria-hidden="true"`; botones de icono con nombre accesible.
- Contraste mínimo AA para texto, badges, foco y controles.
- El panel y la confirmación atrapan el foco y lo restauran.
- El estado vacío y los errores se anuncian de forma comprensible.
- La app sigue siendo usable con zoom 200 % y viewport estrecho.

## 10. Contrato de rendimiento

Con 500 proveedores, 2.000 órdenes, 500 productos y hasta 50 líneas por orden:

| Operación                          | Presupuesto |
| ---------------------------------- | ----------- |
| Render inicial de lista de órdenes | ≤1 s        |
| Filtrado + orden de órdenes        | ≤300 ms     |
| Render de dashboard                | ≤500 ms     |
| Apertura/cierre de panel           | ≤200 ms     |
| Cambio de filtro/orden percibido   | ≤200 ms     |

- Las mediciones se hacen con `performance.now()` en pruebas de integración.
- No debe haber bloqueos repetidos por lecturas de `localStorage` dentro de bucles.
- Si un presupuesto falla, se optimiza el helper/render antes de cambiar la UX.
- No se permite degradar la suite de 001/002 para cumplir estos presupuestos.

## 11. Contrato de no regresión

- Las reglas de 002 siguen vigentes:
  - `borrador → pendiente → aprobado → recibido`.
  - `cancelado` desde `borrador`/`pendiente`.
  - `recibido`/`cancelado` terminales.
  - Recepción aplica stock una sola vez.
  - No se permiten líneas duplicadas.
- Las validaciones y mensajes existentes se conservan.
- Las claves de `localStorage` no cambian.
- La suite completa debe pasar antes de cerrar.
