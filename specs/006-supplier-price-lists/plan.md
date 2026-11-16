# Plan de Implementación: Listas de Precios por Proveedor y Ajustes Funcionales de Compras

**Rama**: `006-supplier-price-lists` | **Fecha**: 2026-11-15 | **Especificación**: [spec.md](spec.md)

**Entrada**: Vincular cada producto con uno o más proveedores y su precio acordado al crearlo, aplicar esa lista de precios en la orden de compra y cerrar los ajustes funcionales pendientes (filtro de estado, ficha del proveedor, ayuda de Moneda, folios automáticos y proveedores extranjeros), sin alterar `001`–`004` fuera de los cambios declarados en la especificación.

## Resumen

La entrega agrega una entidad persistida (**Precio acordado**) en `erp_purchasing:supplier-prices` y un campo (`ocFolio`) en el documento. La lógica pura vive en un módulo de dominio nuevo (`src/domain/price-list.js`) y en utilidades de `src/domain/purchasing.js` (folios y opciones del filtro). Los servicios de `src/purchasing-storage.js` aplican la lista de precios en los tres puntos de escritura de líneas (`savePurchaseOrder`, `replaceOrderLines`, `addPurchaseOrderLine`/`addOrUpdatePurchaseOrderLine`), de modo que la interfaz y los servicios comparten la misma regla. La interfaz se extiende en `src/product-catalog.js` (vínculos en el formulario), `src/app.js` (orden, filtro, búsqueda, folios, ayuda de Moneda) y un módulo de vista nuevo `src/supplier-summary-view.js` (ficha del proveedor).

La regla de la lista se activa por proveedor: si el proveedor tiene lista, la orden la usa obligatoriamente; si no la tiene (datos anteriores), se conserva el precio manual de `002`. Así se cumple el pedido del profesor sin romper datos ni pruebas existentes.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript ES2022, HTML5, CSS.

**Dependencias Principales**: Vite 8.2, Vitest 4.1, jsdom 30, ESLint 10. Sin dependencias nuevas.

**Almacenamiento**: `localStorage`.

- `erp_purchasing:supplier-prices`: nueva; incluida en `KEYS`, por lo que `snapshotPurchasingData`, `restorePurchasingData` y `clearPurchasingData` (usados por la demostración) la cubren sin código adicional.
- `erp_base_module:documents`: agrega el campo opcional `ocFolio`, declarado en `BASE_FIELDS.document` para que `updateDocument` lo conserve.
- Resto de claves: sin cambios de esquema.

**Pruebas**: Vitest con jsdom. Unitarias para el dominio (validación de vínculos, repreciado, filtro, folios, identificación tributaria) y para los servicios (creación atómica, permisos, enforcement en órdenes, folios, ficha). Integración para los flujos de interfaz por rol y para la demostración.

**Objetivos de Rendimiento**: Mantener los presupuestos de `001` (búsqueda ≤ 300 ms, panel ≤ 500 ms, listas ≤ 1 s). La lista de precios se lee una vez por render del selector de productos y una vez por guardado; la ficha del proveedor reutiliza `listPurchaseOrdersWithActions`.

**Restricciones**:

- No modificar pruebas existentes; las 325 deben seguir pasando.
- Respetar la matriz de `004` salvo el permiso nuevo y el ajuste declarado de `004` FR-019.
- Sanitizar todo texto insertado en el DOM (`escapeHtml`).
- WCAG 2.1 AA: etiquetas para cada control de las filas de precios, ayuda asociada con `aria-describedby`, ficha con encabezado enfocable.
- Sin cambios visuales generales (reservados al spec `005`).

**Incógnitas**: Ninguna.

## Verificación de la Constitución

| Principio | Estado | Evidencia |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Reglas puras en `src/domain/price-list.js`; servicios en `purchasing-storage.js`; vista de la ficha aislada en `src/supplier-summary-view.js`. Sin duplicar reglas entre interfaz y servicio. |
| II. Test-first y verificación | PASS | 31 pruebas nuevas (unitarias e integración) más la batería completa de 325 pruebas previas sin cambios; `npm run lint` limpio. |
| III. Consistencia de UX | PASS | Se reutilizan panel lateral, tablas `data-table`, `field-help`, `field-error` y feedback existentes; mensajes en español; nombres de filtro únicos. |
| IV. Rendimiento y confiabilidad | PASS | Creación de producto + precios atómica con restauración ante error; el repreciado ocurre en memoria antes de persistir. |
| Excepción spec 005 | No aplica | 006 es funcional; no usa la excepción visual. |

## Decisiones de Diseño

1. **Lista de precios como entidad propia** (no como arreglo dentro del producto): permite consultar por proveedor (orden, ficha) y por producto (catálogo) y limpiar al eliminar cualquiera de los dos.
2. **Activación por proveedor**: `applySupplierPriceList(entityId, lines, currency)` devuelve las líneas sin cambios si el proveedor no tiene lista (compatibilidad con `002`) y, si la tiene, fija precios o lanza `PRODUCT_NOT_IN_PRICE_LIST` / `PRICE_CURRENCY_MISMATCH`.
3. **Obligatoriedad con sesión**: siguiendo el caso límite de `004` («sin sesión se conserva acceso completo para pruebas y usos internos»), la regla de al menos un proveedor se exige cuando hay sesión activa. El parámetro `requireAtLeastOne` permite forzarla en cualquier contexto.
4. **Permiso `pricelists.manage`**: separa «gestionar productos/stock» (Bodeguero) de «mantener precios y crear productos» (Gerente, Administrador).
5. **Folios**: el `folio` numérico de `001` se mantiene como correlativo interno de la solicitud (formato visible `SOL-0001`); `ocFolio` es un correlativo independiente asignado en la transición a `aprobado`. No se rompe la unicidad ni el tipo de `001` FR-010.
6. **Filtro con grupos**: las opciones se declaran en `STATUS_FILTER_OPTIONS`; `filterOrders` resuelve el valor a una lista de estados con `statusesForFilter`. Las insignias de estado de `004` no cambian.

## Estructura del Proyecto

```text
src/
├── auth.js                    # + PRICELISTS_MANAGE (Administrador, Gerente)
├── domain/
│   ├── price-list.js          # NUEVO: validación de vínculos, repreciado, productos por proveedor
│   └── purchasing.js          # + errores 006, folios SOL/OC, opciones del filtro de estado
├── purchasing-storage.js      # + clave supplier-prices, servicios de lista, enforcement, folios, ficha
├── purchasing-list-query.js   # filtro de estado por grupo o estado
├── purchasing-demo-data.js    # + listas de precios demo
├── product-catalog.js         # + filas proveedor–precio–moneda, permisos de creación
├── supplier-summary-view.js   # NUEVO: ficha del proveedor e identificación tributaria
├── purchase-order-detail.js   # + N° de solicitud, Folio OC, identificación extranjera
├── purchase-order-print.js    # ídem
├── module-config.js           # + ocFolio en BASE_FIELDS.document
├── app.js                     # orden con lista, filtro, búsqueda, folios, ayuda de Moneda
└── styles.css                 # estilos mínimos de los controles nuevos
index.html                     # sección de precios, ayudas, contenedor de la ficha
tests/
├── unit/price-list-006.test.js
├── unit/supplier-prices-storage-006.test.js
└── integration/purchasing-006.test.js
```

## Validación

```bash
npm test -- --run
npm run lint
```

Recorrido manual en [quickstart.md](quickstart.md).

## Seguimiento de Complejidad

| Desviación | Motivo | Alternativa descartada |
|---|---|---|
| Regla de al menos un proveedor solo con sesión activa | Conservar el modo sin sesión de `004` usado por pruebas e integraciones internas, sin modificar pruebas existentes. | Exigirla siempre obligaba a reescribir pruebas de `001`–`004` que crean productos sin proveedor. |
| Lista de precios opcional por proveedor | Los datos anteriores a 006 no tienen listas; exigirla dejaría órdenes y proveedores existentes inutilizables. | Migración automática con precios inventados. |
