# Contrato: Gestión de Compras Avanzada (007)

**Especificación**: [../spec.md](../spec.md) | **Modelo**: [../data-model.md](../data-model.md)

Funciones síncronas sobre `localStorage`. «Con sesión» = `getSession()` devuelve un usuario. Sin sesión, acceso completo (`004`). Las firmas son síncronas: no hay promesas ni llamadas de red; la persistencia se valida y se escribe en el mismo ciclo.

## Convenciones de entrada y salida

| Regla | Detalle |
|---|---|
| Entradas | Objetos planos con los nombres de campo de [data-model.md](../data-model.md); los alias del `006` (`entityId`, `productId`, `precio`) se normalizan antes de validar |
| Salidas | Objeto o arreglo plano; las vistas derivadas devuelven `{ ... }` con los campos documentados en el modelo de datos |
| Errores | Excepción con `error.code` estable y `error.message` en español; nunca se devuelve `null` como señal de error, salvo las consultas marcadas explícitamente |
| Autorización | Con sesión se exige el permiso indicado; sin sesión rige el acceso completo de `004` |
| Transaccionalidad | Las operaciones multi-registro toman un snapshot de `KEYS` y restauran el estado ante cualquier fallo |

## Códigos de error

| Código | Origen | Condición | Mensaje / efecto |
|---|---|---|---|
| `PERMISSION_DENIED` | `src/auth.js`, `src/access-policy.js`, `src/purchasing-storage.js` | La sesión no tiene el permiso de la operación o el empleado no coincide con el solicitante permitido | «No tienes permisos para ejecutar esta acción.» |
| `ORDER_INVALID` | `src/domain/purchasing.js` | Faltan proveedor o empleado, o la orden no es válida | La operación se rechaza sin persistir |
| `ORDER_NOT_FOUND` | `src/domain/purchasing.js` | No existe la orden indicada | Consulta o transacción rechazada |
| `ORDER_TERMINAL` | `src/domain/purchasing.js` | La orden está `recibido` o `cancelado` | Se bloquea la edición |
| `NO_LINES` | `src/domain/purchasing.js` | La orden no tiene líneas válidas | No se guarda ni se envía a revisión |
| `LINE_INVALID` / `LINE_NOT_FOUND` | `src/domain/purchasing.js` | Cantidad o precio inválidos, producto repetido o línea inexistente | La operación se rechaza |
| `PRODUCT_NOT_FOUND` / `PRODUCT_DUPLICATE` | `src/domain/purchasing.js` | Producto inexistente o repetido en la misma orden | La línea se rechaza |
| `PRODUCT_NOT_IN_PRICE_LIST` | `src/domain/purchasing.js` | El proveedor tiene lista y el producto no está en ella | No se puede agregar la línea |
| `PRICE_CURRENCY_MISMATCH` | `src/domain/purchasing.js` | La moneda del precio acordado difiere de la de la orden | Se pide cambiar la moneda |
| `INVALID_TRANSITION` | `src/domain/purchasing.js` | Transición no permitida por `PURCHASE_TRANSITIONS` | El historial no se modifica |
| `STOCK_ALREADY_APPLIED` | `src/domain/purchasing.js` | Recepcionar dos veces la misma orden | No se duplica el stock |
| `AREA_REQUIRED` | `src/domain/purchasing.js` | Envío a revisión sin área válida cuando hay áreas activas (FR-018) | El borrador permanece en `borrador` |
| `AREA_NOT_FOUND` | `src/domain/purchasing.js` | `id_area` inexistente o inactivo | Se rechaza el guardado |
| `SUPPLIER_INACTIVE` | `src/domain/purchasing.js` | Proveedor inactivo en una orden nueva | Se pide reactivarlo |
| `BUDGET_INVALID` | `src/domain/purchasing.js` | Presupuesto negativo, no entero o no numérico | No se persiste el presupuesto |
| `PERSISTENCE_ERROR` | `src/purchasing-storage.js` | Fallo al escribir en `localStorage` | Se restaura el snapshot y se informa el error |
| `EMPLOYEE_REFERENCED` / `CATEGORY_DUPLICATE` / `PRODUCT_REFERENCED` | `src/purchasing-storage.js` | Eliminación de un registro referenciado o nombre duplicado | La eliminación o creación se bloquea |
| `SUPPLIER_REQUIRED`, `SUPPLIER_NOT_FOUND`, `SUPPLIER_DUPLICATE`, `PRICE_INVALID`, `CURRENCY_INVALID`, `LINKS_REQUIRED` | `src/domain/price-list.js` | Validación del precio acordado con proveedor | Se devuelven errores por campo en el formulario de producto |

## Validaciones compartidas

| Validación | Regla |
|---|---|
| Tramos | `desde` entero ≥ 1 y único; `precio` > 0; el tramo `desde: 1` es obligatorio si hay tramos; `normalizeTiers` los ordena |
| Área | Los borradores pueden guardarse sin `id_area`; `AREA_REQUIRED` se valida al pasar a `pendiente` si existe al menos un área activa (FR-018/T033/T034) |
| Presupuesto | Entero ≥ 0 en CLP; único por (`id_area`, `mes`); 0 cuenta como definido |
| CSV | Separador `;`, UTF-8 con BOM, escapado RFC 4180, montos sin separador de miles y punto decimal |
| Precio guardado | `unitPriceFor` desde la lista vigente; el precio o tramo enviado por el cliente se ignora (FR-033/SC-010) |

## Dominio puro (`src/domain/`)

### `supplier-evaluation.js`

| Función | Entrada | Salida |
|---|---|---|
| `receiptDateOf(order, history)` | Orden y su historial | `{ date: 'aaaa-mm-dd', approximate }` o `null` |
| `evaluateSupplier(orders, historyByOrder)` | OC del proveedor | Evaluación (data-model) |
| `gradeFor(percentage, received)` | % y n° recibidas | `'A' \| 'B' \| 'C' \| 'Sin datos'` (dato interno para FR-011; su visualización en US7 sigue la excepción de FR-005) |

### `reorder.js`

| Función | Salida |
|---|---|
| `isBelowMinimum(product)` | `boolean` |
| `suggestedQuantity(product)` | `max(1, 2 × mínimo − stock)` |
| `pickSupplier(priceEntries, suppliers, evaluations)` | Precio acordado elegido o `null`, según el ranking de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre), sin conversión de moneda |
| `buildSuggestedRequests(products, priceEntries, suppliers, openOrders, evaluations)` | `{ groups: [{ supplier, currency, lines }], skipped: [{ product, reason }] }` |

### `price-tiers.js`

| Función | Salida |
|---|---|
| `normalizeTiers(entry)` | Tramos ordenados; sin tramos → `[{ desde: 1, precio }]` |
| `validateTiers(tiers)` | `{ valid, errors }` (desde ≥ 1 único, precio > 0, tramo desde 1 obligatorio) |
| `unitPriceFor(entry, quantity)` | `{ precio, desde }` del tramo aplicable; única función de cálculo, reutilizada por la lista de precios, la UI y la revalidación del servidor |
| `compareSupplierOptions(productId, quantity, priceEntries, suppliers, evaluations)` | Opciones de compra ordenadas (mejor primero) por el ranking de FR-011: CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación (A > B > C > Sin datos) → nombre alfabéticamente menor; sin conversión automática de moneda. El `calificacion` de cada opción es dato interno del ranking; su exposición en la tabla se rige por la excepción de FR-005 para US7. US1 es dependencia dura de US2 y US7: sin omisión del paso de calificación ni desempate alternativo |
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

## Servicios (`src/purchasing-management.js` y `src/purchasing-storage.js`)

| Función | Módulo | Permiso con sesión | Comportamiento |
|---|---|---|---|
| `loadAreas()`, `saveArea(data)`, `setAreaActive(id, activa)` | `purchasing-management.js` | `budgets.manage` (escritura) | Nombre único; no se elimina un área usada |
| `loadBudgets()`, `setBudget(areaId, mes, monto)` | `purchasing-management.js` | `budgets.manage` | Upsert por área y mes; `monto` entero CLP ≥ 0 |
| `getSupplierEvaluation(entityId)` | `purchasing-management.js` | — | Usa órdenes, totales e historial |
| `listBelowMinimum()` | `purchasing-management.js` | — | Productos bajo el mínimo con cantidad sugerida y solicitud abierta, si existe |
| `createSuggestedRequests(header)` | `purchasing-management.js` | `documents.create` | Crea borradores con `savePurchaseOrder`, sin exigir `id_area` aunque haya áreas activas; el área se asigna al enviar a revisión (FR-018/T033) |
| `duplicatePurchaseOrder(orderId, header)` | `purchasing-management.js` | `documents.create` | Borrador nuevo con precios vigentes y folio nuevo; devuelve `{ order, omitted }` |
| `setSupplierStatus(entityId, estado)` | `purchasing-management.js` | `entities.update` | `activo` / `inactivo`; los inactivos se excluyen de solicitudes nuevas y sugeridas |
| `getAreaBudgetForOrder(orderId)` | `purchasing-management.js` | — | `budgetStatus` del mes en curso o `null` |
| `loadNotificationReads(userId)`, `markNotificationsRead(userId, ids)` | `purchasing-management.js` | — | Lecturas por usuario; máximo 500 ids |
| `setSupplierPriceTiers(entityId, productId, tiers)` | `purchasing-management.js` | `pricelists.manage` | Guarda tramos validados con `validateTiers` |
| `getPurchaseOptions(productId, quantity)` | `purchasing-management.js` | — | `compareSupplierOptions` con proveedores activos y evaluaciones; la calificación se muestra en la tabla US7 según la excepción de FR-005 (roles con `documents.create`) |
| `createRequestsFromCart(cart, header)` | `purchasing-management.js` | `documents.create` | Una solicitud por proveedor, atómico (snapshot de `KEYS`); devuelve los folios creados; los borradores no requieren `id_area` hasta el envío a revisión (FR-018/T033) |

### Cambios en servicios existentes

| Servicio | Cambio 007 |
|---|---|
| `savePurchaseOrder` | Acepta `id_area` opcional: permite guardar borradores sin él aunque haya áreas activas; NO valida `AREA_REQUIRED` (esa validación ocurre en `changeOrderStatus`, fila siguiente). Rechaza proveedor inactivo en órdenes nuevas (`SUPPLIER_INACTIVE`). Recalcula `precioUnitario` y `totalNeto` de cada línea con `unitPriceFor` desde la lista vigente, ignorando el precio o tramo del payload (FR-033/SC-010, T064). |
| `changeOrderStatus(orderId, 'pendiente')` | Punto donde se valida y aplica `AREA_REQUIRED` en la transición `borrador → pendiente` (FR-018/T033): con áreas activas exige un `id_area` válido —error de `src/domain/purchasing.js` (T007)— y lo persiste en la metadata con `upsertOrderMetadata`; sin áreas activas rige `002`. Recibe el valor desde `#document-area` en el submit (T034). |
| `replaceOrderLines`, `addPurchaseOrderLine`, `addOrUpdatePurchaseOrderLine` | Recalculan también `precioUnitario` y `totalNeto` de cada línea con `unitPriceFor` desde la lista vigente del proveedor, ignorando cualquier precio o tramo enviado por el cliente (FR-033/SC-010, T064). |
| `validateProductData` / `updateProduct` | Acepta `stock_minimo` (entero ≥ 0). |
| `applySupplierPriceList` (`006`) | Usa `unitPriceFor(entry, cantidad)` en lugar del precio único para fijar la lista; no decide el precio guardado en la orden (responsabilidad de T064). |
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
| `#document-area`, `#order-budget` | Área en la solicitud y presupuesto en el detalle; el manejador de `#document-form` envía `#document-area` como `id_area` a `changeOrderStatus` (T034/T033), donde se aplica `AREA_REQUIRED` |
| `#supplier-evaluation`, `.supplier-grade` | Ficha y tarjetas del proveedor (`reports.view`); la tabla `#purchase-options` muestra la calificación por la excepción de FR-005 |
| `[data-action="duplicate-order"]`, `[data-action="toggle-supplier-status"]` | Mejoras rápidas |
| `#entities-export`, `#products-export`, `#documents-export` | Exportar listas |
| `#purchase-mode`, `[data-purchase-mode="product"]`, `[data-purchase-mode="supplier"]` | Modos de la nueva solicitud |
| `#purchase-product-search`, `#purchase-quantity`, `#purchase-options`, `[data-action="choose-option"]` | Comparación de proveedores; incluye la columna «Calificación» visible sin `reports.view` (excepción de FR-005) |
| `#purchase-cart`, `#purchase-cart-save` | Carrito multi-proveedor |
| `[data-field="tramos"]`, `[data-action="add-tier"]` | Tramos en el formulario de producto |
