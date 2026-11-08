# Data Model: Mejoras de UX del módulo de Compras

**Feature**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08

## Principio

Esta mejora **no modifica el modelo de datos persistente** de 001/002 ni las reglas de negocio. No se agregan claves de `localStorage`, campos, estados ni transiciones. Solo se introducen modelos de vista efímeros en memoria y un conjunto de datos de demostración que usa las entidades y claves existentes.

## Entidades persistentes existentes (sin cambios)

| Entidad                     | Clave / origen                        | Campos relevantes para la UX                                                                          |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Proveedor                   | `erp_base_module:entities`            | `id`, `name`/`nombre`, `code`, `taxId`/`rut`, `email`, `phone`, `address`, `category`, `paymentTerms` |
| Documento / Orden de compra | `erp_base_module:documents`           | `id`, `folio`, `supplierId`, `startDate`, `endDate`, `status`, `paymentTerms`, `notes`, `total`       |
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
    category: '',
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
    key: 'name' | 'code' | 'rut' | 'category' | 'email' | 'phone'
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
- El orden es estable: empate por índice original.
- Cambiar de vista conserva solo el estado de esa vista durante la sesión; no se guarda en storage.

### `SupplierRow` (derivado)

```text
{
  id,
  name,
  code,
  rut,
  category,
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
| Empleados   |                  2 | Nombres únicos                                                       |
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

- Proveedor: nombre y código obligatorios; RUT válido si se informa; campos configurados obligatorios.
- Producto: nombre, unidad y categoría obligatorios; stock numérico ≥0.
- Orden: proveedor, empleado, fechas y al menos una línea; cantidades enteras positivas; costo unitario ≥0; sin producto duplicado.
- Estados: solo transiciones permitidas; terminales no editables.
- Persistencia: errores actuales se muestran al usuario sin perder datos del formulario.

## Fuera de alcance

- Nuevos campos persistentes.
- Nuevos estados o transiciones.
- Filtros guardados entre sesiones.
- Paginación o virtualización.
- Backend o sincronización remota.
