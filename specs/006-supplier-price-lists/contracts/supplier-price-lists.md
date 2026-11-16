# Contrato: Listas de Precios por Proveedor y Ajustes Funcionales (006)

**Especificación**: [../spec.md](../spec.md) | **Modelo**: [../data-model.md](../data-model.md)

Contrato de los módulos JavaScript expuestos por 006. Todas las funciones son síncronas y persisten en `localStorage`. «Con sesión» significa que `getSession()` devuelve un usuario autenticado.

## `src/domain/price-list.js` (puro, sin persistencia)

| Función | Entrada | Salida / errores |
|---|---|---|
| `validateSupplierPriceEntry(entry, { supplier })` | `{ entity_id, precio, moneda? }` | `{ valid, errors, value: { entity_id, precio, moneda } }`; moneda por defecto según origen |
| `validateProductSupplierPrices(entries, { suppliers, requireAtLeastOne })` | Arreglo de vínculos | `{ valid, rows: [{ index, errors }], general, values }` |
| `priceLinesFromList(lines, priceEntries, currency)` | Líneas y lista del proveedor | Líneas con `costo_unitario` de la lista; lanza `PRODUCT_NOT_IN_PRICE_LIST` o `PRICE_CURRENCY_MISMATCH` |
| `productsForSupplier(products, priceEntries, currency)` | Catálogo y lista | `[{ product, entry }]` filtrado por moneda |
| `PRICE_LIST_ERRORS` | — | Mensajes en español |

## `src/domain/purchasing.js` (agregados)

| Export | Descripción |
|---|---|
| `formatRequestNumber(folio)` | `SOL-0001`; vacío si no es entero positivo |
| `formatPurchaseOrderFolio(ocFolio)` | `OC-0001`; vacío si no existe |
| `nextCorrelative(values)` | Máximo entero + 1 |
| `STATUS_FILTER_OPTIONS` | Opciones del filtro con `value`, `label`, `statuses` |
| `statusesForFilter(value)` / `statusFilterLabel(value)` | Resolución del valor del filtro |

## `src/purchasing-storage.js` (agregados)

| Función | Permiso con sesión | Comportamiento |
|---|---|---|
| `loadSupplierPrices()` / `saveSupplierPrices(list)` | — | Acceso directo a `erp_purchasing:supplier-prices` |
| `getSupplierPricesForProduct(productId)` | — | Vínculos vigentes del producto |
| `getSupplierPriceList(entityId)` | — | Lista vigente del proveedor |
| `findSupplierPrice(entityId, productId)` | — | Vínculo o `null` |
| `supplierHasPriceList(entityId)` | — | `boolean` |
| `createProductWithSupplierPrices(data, entries, { requireAtLeastOne?, skipAccessCheck? })` | `products.manage` + `pricelists.manage` | Crea producto y vínculos de forma atómica; con sesión exige ≥ 1 vínculo; restaura todo ante error |
| `setProductSupplierPrices(productId, entries, options)` | `pricelists.manage` | Reemplaza los vínculos del producto conservando `id` y `createdAt` de los existentes |
| `upsertSupplierPrice(entry, options)` | `pricelists.manage` | Agrega o actualiza un vínculo |
| `deleteSupplierPrice(entityId, productId, options)` | `pricelists.manage` | Quita un vínculo; con sesión no permite dejar el producto sin proveedor |
| `applySupplierPriceList(entityId, lines, currency)` | — | Sin lista: devuelve `lines`. Con lista: delega en `priceLinesFromList` |
| `nextRequestFolio()` / `nextPurchaseOrderFolio(documents?)` | — | Correlativos siguientes |
| `getSupplierSummary(entityId)` | — | Ficha del proveedor o `null` |

### Cambios en servicios existentes

| Servicio | Cambio 006 |
|---|---|
| `savePurchaseOrder` | Si el proveedor tiene lista, reprecia las líneas antes de validar y calcular totales. Si no se informa `folio`, asigna `nextRequestFolio()` (al editar conserva el actual). Si se crea en `aprobado`, asigna `ocFolio`. |
| `replaceOrderLines`, `addPurchaseOrderLine`, `addOrUpdatePurchaseOrderLine` | Aplican `applySupplierPriceList` con el proveedor y la moneda de la orden. |
| `changeOrderStatus` (vía `transitionSnapshot`) | Al pasar a `aprobado` sin `ocFolio`, lo asigna dentro de la misma transacción. |
| `deleteProduct` | Elimina los precios del producto. |
| `KEYS` | Incluye `supplierPrices`; snapshot, restore y clear lo cubren. |

## `src/auth.js`

- `PERMISSIONS.PRICELISTS_MANAGE = 'pricelists.manage'`, otorgado a `administrador` (todos los permisos) y `gerente`.

## `src/supplier-summary-view.js`

| Export | Descripción |
|---|---|
| `supplierTaxIdentity(supplier)` | RUT para Nacional; `ID tributario ext. …` para Extranjero; nunca separadores vacíos |
| `renderSupplierSummary(summary, options)` | HTML de la ficha; `options`: `escapeHtml`, `formatMoney`, `formatDate`, `paymentTermLabel`, `rubroNames`, `canViewCreditLimit`, `statusBadge`, `productName` |

## Interfaz (identificadores estables para pruebas)

| Id / selector | Uso |
|---|---|
| `#product-prices-section`, `#product-prices-body`, `#product-price-add`, `#error-product-prices` | Vínculos en el formulario de producto |
| `tr[data-price-row] [data-field="entity_id" \| "precio" \| "moneda"]`, `[data-action="remove-price-row"]` | Filas de vínculos |
| `#line-cost-help` | Ayuda del costo unitario fijado por la lista |
| `#currency-help` | Ayuda del campo Moneda |
| `[data-action="open-supplier-summary"]`, `#supplier-summary`, `[data-action="close-supplier-summary"]` | Ficha del proveedor en Búsqueda |
| `#supplier-summary-orders`, `#supplier-summary-prices`, `.supplier-total` | Contenido de la ficha |
| `.request-number`, `.oc-folio` | Celda de folio en la lista de órdenes |
