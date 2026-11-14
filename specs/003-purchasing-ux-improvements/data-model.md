# Data Model: Mejoras de UX del módulo de Compras

**Feature**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08

## Principio

Esta mejora **no modifica el modelo de datos persistente** de 001/002 ni las reglas de negocio. No se agregan claves de `localStorage`, campos, estados ni transiciones. Solo se introducen modelos de vista efímeros en memoria y un conjunto de datos de demostración que usa las entidades y claves existentes.

## Entidades persistentes existentes (sin cambios)

| Entidad                     | Clave / origen                        | Campos relevantes para la UX                                                                          |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Proveedor                   | `erp_base_module:entities`            | `id`, `name`/`nombre`, `code` (RUT), `foreignTaxId`, `email`, `phone`, `address`, `rubro_ids`, `origin`, `paymentTerms`, `creditLimit` |
| Documento / Orden de compra | `erp_base_module:documents`           | `id`, `folio`, `supplierId`, `startDate` (emisión automática al aprobar), `endDate`, `status`, `paymentTerms`, `currency`, `totalAmount` |
| Empleado                    | `erp_purchasing:employees`            | `id`, `nombre`, `cargo`                                                                               |
| Categoría                   | `erp_purchasing:categories`           | `id`, `nombre`                                                                                        |
| Producto                    | `erp_purchasing:products`             | `id_producto`, `nombre`, `unidad_medida`, `stock`, `id_categoria`                                     |
| Línea de orden              | `erp_purchasing:purchase-order-lines` | `id`, `id_orden_compra`, `id_producto`, `cantidad`, `costo_unitario`                                  |
| Metadatos de orden          | `erp_purchasing:order-metadata`       | `id_orden_compra`, `id_empleado`, `stock_aplicado`                                                    |
| Historial de estados        | `erp_purchasing:status-history`       | `id`, `id_orden_compra`, `from`, `to`, `changedAt`                                                    |
| Transacciones               | `erp_purchasing:transactions`         | Registro existente de recepción/stock                                                                 |

**Regla**: ningún módulo nuevo debe escribir directamente en `localStorage`; debe usar `src/storage.js` y `src/purchasing-storage.js`.

## Modelos de vista efímeros

### `ListViewState`

Estado en memoria por vista de lista. No se persiste.

```js
{
  view: 'suppliers' | 'orders' | 'products',
  filters: {
    // suppliers
    rubroIds: [],
    origin: '',
    // orders
    status: '',
    supplierId: '',
    deliveryFrom: '',
    deliveryTo: '',
    overdueOnly: false,
    // products
    categoryId: ''
  },
  sort: {
    key: 'name' | 'code' | 'rut' | 'rubros' | 'origin' | 'email' | 'phone'
      | 'folio' | 'supplier' | 'employee' | 'startDate' | 'endDate' | 'total' | 'status'
      | 'unit' | 'stock',
    direction: 'asc' | 'desc'
  },
  validation: {
    dateRange: '' // mensaje si el rango es inválido
  }
}
```

**Reglas**:

- Los filtros vacíos significan "todos".
- El rango de fechas es inclusivo y solo aplica a `endDate`.
- `deliveryFrom > deliveryTo` produce error y no se aplica el filtro.
- `overdueOnly` usa `isOverdue(order, today)` de `src/domain/purchasing.js`.
- Los Rubros de Proveedor se combinan con coincidencia OR; el Origen se combina con AND con los demás filtros.
- El orden es estable: empate por índice original.
- Cambiar de vista conserva solo el estado de esa vista durante la sesión; no se guarda en storage.

### `SupplierRow` (derivado)

```text
{
  id,
  name,
  code,
  rut,
  foreignTaxId,
  rubros, // identificadores y nombres de Rubro
  origin, // 'Nacional' | 'Extranjero'
  email,
  phone,
  paymentTerms,
  orderCount // opcional, derivado de documentos
}
```

### `OrderRow` (derivado)

```text
{
  id,
  folio,
  supplierId,
  supplierName,
  employeeName,
  startDate,
  endDate,
  status,
  total,
  lineCount,
  isOverdue
}
```

**Derivaciones**:

- `supplierName` desde el `Map` de proveedores.
- `employeeName` desde metadatos/empleados existentes.
- `total` desde líneas o campo existente.
- `lineCount` desde líneas agrupadas.
- `isOverdue` desde `isOverdue(order, today)`.

### `ProductRow` (derivado)

```text
{
  id,
  name,
  unit,
  stock,
  categoryId,
  categoryName
}
```

La gestión de categorías se realiza en una vista o sección propia de Productos; el formulario de producto solo referencia `id_categoria` y no crea categorías.

### `DashboardMetrics` (derivado)

```js
{
  supplierCount,
  productCount,
  orderCount,
  statusCounts: { borrador, pendiente, aprobado, recibido, cancelado },
  overdueCount
}
```

**Reglas**:

- Se calcula al renderizar el dashboard.
- `overdueCount` usa `isOverdue`.
- No se persiste.

### `PanelState`

```js
{
  open: boolean,
  mode: 'create' | 'edit',
  entity: 'supplier' | 'order' | 'product',
  recordId: string | null,
  initialValues: object,
  dirty: boolean,
  triggerElement: HTMLElement | null
}
```

**Reglas**:

- `dirty` se calcula comparando valores actuales con `initialValues` y, en órdenes, con las líneas del borrador.
- Cerrar con `dirty === true` requiere confirmación.
- Cancelar la confirmación mantiene `open`, `dirty` y los datos.
- Al cerrar se restaura el foco a `triggerElement` o a un fallback de la vista.

### `Toast`

```js
{
  id: string,
  type: 'success' | 'error' | 'info',
  message: string,
  persistent: boolean,
  timerId: number | null
}
```

**Reglas**:

- `success`/`info`: `persistent = false`, auto-cierre a los 5 s.
- `error`: `persistent = true`, solo cierre manual.
- No roba foco.
- La región usa `aria-live="polite"`; los errores usan `role="alert"`.

### `ConfirmState`

```js
{
  open: boolean,
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
  tone: 'default' | 'danger',
  resolve: (value: boolean) => void,
  triggerElement: HTMLElement | null
}
```

**Reglas**:

- `role="alertdialog"`, foco inicial en cancelar o confirmar según tono.
- Esc y cancelar resuelven `false`.
- Confirmar resuelve `true`.
- Retorna foco al disparador.

### `DemoDataset`

Datos de demostración generados en memoria y persistidos con APIs existentes.

| Grupo       |    Cantidad mínima | Reglas                                                               |
| ----------- | -----------------: | -------------------------------------------------------------------- |
| Proveedores |                  3 | RUT válido y único; nombres únicos con sufijo si colisionan          |
| Empleados   | ≥1 por cargo        | Nombres únicos; un empleado por cada cargo existente sin crear cargos |
| Categorías  |                  3 | Nombres únicos                                                       |
| Productos   |                  6 | 2 por categoría; nombres únicos; stock inicial ≥0                    |
| Órdenes     |                  6 | Una por estado y al menos una atrasada no terminal                   |
| Líneas      |       ≥1 por orden | Productos existentes, cantidades positivas, sin duplicados por orden |
| Metadatos   |        1 por orden | Empleado asignado; `stock_aplicado` coherente                        |
| Historial   | Según transiciones | Registrado por las APIs existentes                                   |

**Reglas de carga**:

- Si ya existen datos de compras, pedir confirmación antes de cargar.
- Si no hay datos, cargar directamente.
- No eliminar ni sobrescribir registros existentes.
- Folios desde `max(folio existente) + 1`.
- Fechas coherentes (`startDate <= endDate`); la orden atrasada debe tener `endDate < hoy` y estado no terminal.
- Para `recibido`, usar la transición real y aplicar stock.
- Para `cancelado`, crear y cancelar desde un estado permitido.
- Respetar los permisos de 004: si el rol no puede aprobar, recibir o cancelar, no usar la carga como vía alternativa; limitarse a los estados alcanzables e informar la limitación.
- Si falla, limpieza best-effort en orden inverso: órdenes/historial/líneas/metadatos → productos → categorías → empleados → proveedores. Los datos preexistentes no se tocan.
- Al terminar, refrescar dashboard y listas y mostrar toast.

## Relaciones de vista

```text
ListViewState ──filtra/ordena──> SupplierRow[]
ListViewState ──filtra/ordena──> OrderRow[] ──usa──> isOverdue()
ListViewState ──filtra/ordena──> ProductRow[]
PanelState ──monta──> plantilla de formulario existente
Toast[] ──renderiza──> región aria-live
ConfirmState ──resuelve──> acción destructiva / cierre con cambios
DemoDataset ──usa APIs existentes──> claves localStorage existentes
```

## Validaciones existentes que se conservan

- Proveedor: nombre, al menos un Rubro y Origen obligatorios; RUT obligatorio y válido para Nacional; identificación tributaria extranjera para Extranjero; condición de pago de la lista cerrada; límite de crédito ≥0; sin `targetDate`.
- Producto: nombre, unidad y categoría existente obligatorios; stock entero ≥0; la categoría no se crea desde el formulario de producto.
- Orden: proveedor, empleado, fecha de entrega y al menos una línea; cantidades enteras positivas; costo unitario ≥0; sin producto duplicado; sin campos manuales de importes ni Notas; estado inicial `borrador` sin selector; fecha de emisión automática al aprobar y «Sin emitir» antes.
- Estados: solo transiciones permitidas; terminales no editables; permisos de 004 aplicados en interfaz y servicio.
- Persistencia: errores actuales se muestran al usuario sin perder datos del formulario.

## Ajustes post-revisión (2026-11-14)

### `DetailViewState`

```js
{
  orderId: string | null,
  previousView: 'orders',
  returnFocus: HTMLElement | null,
  filters: object,
  sort: object,
  active: boolean
}
```

**Reglas**:

- El detalle es una vista propia y no comparte el DOM visible con la lista.
- Al abrirse guarda `filters`, `sort` y el foco de origen; al volver los restaura.
- Cuando `active === false`, la vista queda con `display: none` efectivo y fuera del orden de tabulación.
- Respeta la denominación por estado, la fecha de emisión y las restricciones de 004.

### `CategoryManagementState`

```js
{
  active: boolean,
  mode: 'list' | 'create' | 'edit',
  categoryId: string | null,
  error: string
}
```

**Reglas**:

- Es estado de vista efímero de la pantalla Productos; no crea claves ni campos persistentes.
- El formulario de producto solo selecciona `id_categoria`; no crea categorías.
- La unicidad y el bloqueo por referencia siguen las reglas de 001.
- Sin `products.manage`, la sección es de solo lectura y las acciones se rechazan en el servicio.

## Fuera de alcance

- Nuevos campos persistentes.
- Nuevos estados o transiciones.
- Filtros guardados entre sesiones.
- Paginación o virtualización.
- Backend o sincronización remota.
