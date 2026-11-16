# Contrato: Gestión de Compras Avanzada (007)

**Especificación**: [../spec.md](../spec.md) | **Modelo**: [../data-model.md](../data-model.md)

Funciones síncronas sobre `localStorage`. «Con sesión» = `getSession()` devuelve un usuario. Sin sesión, acceso completo (`004`).

## Dominio puro (`src/domain/`)

### `supplier-evaluation.js`

| Función | Entrada | Salida |
|---|---|---|
| `receiptDateOf(order, history)` | Orden y su historial | `{ date: 'aaaa-mm-dd', approximate }` o `null` |
| `evaluateSupplier(orders, historyByOrder)` | OC del proveedor | Evaluación (data-model) |
| `gradeFor(percentage, received)` | % y n° recibidas | `'A' \| 'B' \| 'C' \| 'Sin datos'` |

### `reorder.js`

| Función | Salida |
|---|---|
| `isBelowMinimum(product)` | `boolean` |
| `suggestedQuantity(product)` | `max(1, 2 × mínimo − stock)` |
| `pickSupplier(priceEntries, suppliers, evaluations)` | Precio acordado elegido o `null` (FR-011) |
| `buildSuggestedRequests(products, priceEntries, suppliers, openOrders, evaluations)` | `{ groups: [{ supplier, currency, lines }], skipped: [{ product, reason }] }` |

### `price-tiers.js`

| Función | Salida |
|---|---|
| `normalizeTiers(entry)` | Tramos ordenados; sin tramos → `[{ desde: 1, precio }]` |
| `validateTiers(tiers)` | `{ valid, errors }` (desde ≥ 1 único, precio > 0, tramo desde 1 obligatorio) |
| `unitPriceFor(entry, quantity)` | `{ precio, desde }` del tramo aplicable |
| `compareSupplierOptions(productId, quantity, priceEntries, suppliers, evaluations)` | Opciones de compra ordenadas (mejor primero) |
| `groupCartBySupplier(cart)` | `[{ entity_id, lines: [{ id_producto, cantidad }] }]` sumando repetidos |

### `budget.js`

| Función | Salida |
|---|---|
| `monthKey(date)` | `aaaa-mm` |
| `areaSpend(orders, metadata, areaId, month)` | `{ clp, otherCurrencies }` de OC emitidas |
| `budgetStatus(budget, spend, orderTotal)` | `{ budget, spent, available, availableAfter, exceeds, excessAmount }` |

### `reports.js`

| Función | Salida |
|---|---|
| `spendReport(orders, { groupBy, from, to, suppliers, rubros, areas, metadata })` | `{ rows, currencies, totals, note }` |
| `toCsv(columns, rows)` | Texto CSV con BOM, `;` y escapado RFC 4180 |

### `notifications.js`

| Función | Salida |
|---|---|
| `notificationsFor(role, context)` | Lista de avisos (data-model) |
| `unreadCount(notifications, readIds)` | `number` |

## Servicios (`src/purchasing-storage.js`)

| Función | Permiso con sesión | Comportamiento |
|---|---|---|
| `loadAreas()`, `saveArea(data)`, `setAreaActive(id, activa)` | `budgets.manage` (escritura) | Nombre único; no se elimina un área usada |
| `loadBudgets()`, `setBudget(areaId, mes, monto)` | `budgets.manage` | Upsert por área y mes |
| `getSupplierEvaluation(entityId)` | — | Usa órdenes, totales e historial |
| `listBelowMinimum()` | — | Productos bajo el mínimo con cantidad sugerida y solicitud abierta, si existe |
| `createSuggestedRequests({ employeeId, areaId })` | `documents.create` | Crea borradores con `savePurchaseOrder` |
| `duplicatePurchaseOrder(orderId)` | `documents.create` | Borrador nuevo con precios vigentes; devuelve `{ order, omitted }` |
| `setSupplierStatus(entityId, estado)` | `entities.update` | `activo` / `inactivo` |
| `getAreaBudgetForOrder(orderId)` | — | `budgetStatus` del mes en curso o `null` |
| `loadNotificationReads(userId)`, `markNotificationsRead(userId, ids)` | — | Lecturas por usuario |
| `setSupplierPriceTiers(entityId, productId, tiers)` | `pricelists.manage` | Guarda tramos validados |
| `getPurchaseOptions(productId, quantity)` | — | `compareSupplierOptions` con proveedores activos y evaluaciones |
| `createRequestsFromCart(cart, header)` | `documents.create` | Una solicitud por proveedor, atómico (snapshot de `KEYS`); devuelve los folios creados |

### Cambios en servicios existentes

| Servicio | Cambio 007 |
|---|---|
| `savePurchaseOrder` | Acepta `id_area`; si hay áreas activas lo exige (`AREA_REQUIRED`); rechaza proveedor inactivo en órdenes nuevas (`SUPPLIER_INACTIVE`). |
| `validateProductData` / `updateProduct` | Acepta `stock_minimo` (entero ≥ 0). |
| `applySupplierPriceList` (`006`) | Usa `unitPriceFor(entry, cantidad)` en lugar del precio único. |
| `upsertSupplierPrice`, `setProductSupplierPrices`, `createProductWithSupplierPrices` (`006`) | Aceptan `tramos` opcionales validados con `validateTiers`. |
| `KEYS` | Agrega `areas`, `budgets`, `notificationReads`. |
| `src/auth.js` | Agrega `REPORTS_VIEW`, `BUDGETS_MANAGE`. |
| `src/module-config.js` | `BASE_FIELDS.entity` agrega `estado`. |

## Interfaz (identificadores estables para pruebas)

| Id / selector | Uso |
|---|---|
| `#nav-reports`, `#view-reports` | Navegación y vista de reportes |
| `#reports-group-by`, `#reports-from`, `#reports-to`, `#reports-table`, `#reports-chart`, `#reports-export` | Reporte de gasto |
| `#reports-tab-areas`, `#areas-table`, `#area-form`, `#budget-form` | Áreas y presupuestos |
| `#notifications-placeholder`, `#notifications-count`, `#notifications-panel`, `[data-notification-id]`, `#notifications-mark-all` | Bandeja |
| `#insight-reorder`, `#reorder-list`, `#reorder-create` | Panel: productos bajo el mínimo |
| `#product-stock-minimo` | Formulario de producto |
| `#document-area`, `#order-budget` | Área en la solicitud y presupuesto en el detalle |
| `#supplier-evaluation`, `.supplier-grade` | Ficha y tarjetas del proveedor |
| `[data-action="duplicate-order"]`, `[data-action="toggle-supplier-status"]` | Mejoras rápidas |
| `#entities-export`, `#products-export`, `#documents-export` | Exportar listas |
| `#purchase-mode`, `[data-purchase-mode="product"]`, `[data-purchase-mode="supplier"]` | Modos de la nueva solicitud |
| `#purchase-product-search`, `#purchase-quantity`, `#purchase-options`, `[data-action="choose-option"]` | Comparación de proveedores |
| `#purchase-cart`, `#purchase-cart-save` | Carrito multi-proveedor |
| `[data-field="tramos"]`, `[data-action="add-tier"]` | Tramos en el formulario de producto |
