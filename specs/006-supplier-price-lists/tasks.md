# Tasks: Listas de Precios por Proveedor y Ajustes Funcionales de Compras

**Input**: Documentos de diseño en `specs/006-supplier-price-lists/`

**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/supplier-price-lists.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Incluidas porque la Constitución exige pruebas unitarias para la lógica y de integración para los flujos visibles. Las pruebas se escribieron junto con la implementación y se verificaron contra el comportamiento final.

**Organización**: Las tareas se agrupan por historia de usuario según `spec.md`. El estado refleja la implementación verificada al 2026-11-15.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo con otras tareas de la misma fase (archivos distintos, sin dependencias incompletas).
- **[Story]**: `[US1]` a `[US6]`.

## Path Conventions

- Proyecto único: `src/` y `tests/` en la raíz.
- Documentación: `specs/006-supplier-price-lists/`.

---

## Phase 1: Setup

- [x] T001 Verificar la línea base: `npm test -- --run` (51 archivos, 325 pruebas) y `npm run lint` sin errores.
- [x] T002 [P] Confirmar que la clave `erp_purchasing:supplier-prices` no colisiona con las claves de `001`–`004`.
- [x] T003 [P] Actualizar `.specify/feature.json` para apuntar a `specs/006-supplier-price-lists`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Las historias dependen de esta fase.

- [x] T004 Agregar `PERMISSIONS.PRICELISTS_MANAGE` (`pricelists.manage`) al rol `gerente` en `src/auth.js` (el `administrador` lo recibe por tener todos los permisos).
- [x] T005 [P] Crear `src/domain/price-list.js` con `validateSupplierPriceEntry`, `validateProductSupplierPrices`, `priceLinesFromList`, `productsForSupplier` y `PRICE_LIST_ERRORS`.
- [x] T006 [P] Agregar a `src/domain/purchasing.js` los errores `PRODUCT_NOT_IN_PRICE_LIST` y `PRICE_CURRENCY_MISMATCH`, `formatRequestNumber`, `formatPurchaseOrderFolio`, `nextCorrelative`, `STATUS_FILTER_OPTIONS`, `statusesForFilter` y `statusFilterLabel`.
- [x] T007 Agregar `supplierPrices` a `KEYS` y los servicios de lista de precios en `src/purchasing-storage.js` (`loadSupplierPrices`, `getSupplierPricesForProduct`, `getSupplierPriceList`, `findSupplierPrice`, `supplierHasPriceList`, `applySupplierPriceList`).
- [x] T008 Agregar `ocFolio` a `BASE_FIELDS.document` en `src/module-config.js` para que `updateDocument` lo conserve.
- [x] T009 [P] Pruebas unitarias del dominio en `tests/unit/price-list-006.test.js`.

**Checkpoint**: Dominio y persistencia listos; las 325 pruebas previas siguen pasando.

---

## Phase 3: User Story 1 - Crear producto vinculado a proveedores (P1) 🎯 MVP

**Goal**: El producto se crea con uno o más proveedores y el precio acordado de cada uno.

- [x] T010 [US1] Implementar `createProductWithSupplierPrices` (atómico, ≥ 1 vínculo con sesión) y `setProductSupplierPrices` en `src/purchasing-storage.js`.
- [x] T011 [US1] Eliminar los precios del producto en `deleteProduct` (`src/purchasing-storage.js`).
- [x] T012 [US1] Agregar la sección «Proveedores y precios acordados» al `product-form-template` de `index.html`.
- [x] T013 [US1] Implementar filas proveedor–precio–moneda, validación por fila y guardado en `src/product-catalog.js`; columna «Proveedores y precios» en la tabla.
- [x] T014 [US1] Pasar `canManagePrices`, `requirePriceLinks` y `formatMoney` al catálogo desde `src/app.js`.
- [x] T015 [P] [US1] Pruebas unitarias de creación atómica, reemplazo y eliminación en `tests/unit/supplier-prices-storage-006.test.js`.
- [x] T016 [P] [US1] Prueba de integración del Gerente creando un producto con dos proveedores en `tests/integration/purchasing-006.test.js`.

---

## Phase 4: User Story 2 - Mantenimiento restringido de listas (P1)

- [x] T017 [US2] Exigir `pricelists.manage` en `createProductWithSupplierPrices`, `setProductSupplierPrices`, `upsertSupplierPrice` y `deleteSupplierPrice` (`src/purchasing-storage.js`).
- [x] T018 [US2] Ocultar «+ Nuevo» y la sección de precios sin `pricelists.manage` y rechazar la creación forzada con `PRODUCT_CREATE_DENIED_MESSAGE` en `src/product-catalog.js`.
- [x] T019 [P] [US2] Pruebas de permisos por rol (Bodeguero, Comprador, Consulta, Gerente, Administrador) en `tests/unit/supplier-prices-storage-006.test.js`.
- [x] T020 [P] [US2] Prueba de integración del Bodeguero (sin crear, con edición de stock) en `tests/integration/purchasing-006.test.js`.

---

## Phase 5: User Story 3 - Orden con la lista de precios (P1)

- [x] T021 [US3] Aplicar `applySupplierPriceList` en `savePurchaseOrder`, `replaceOrderLines`, `addPurchaseOrderLine` y `addOrUpdatePurchaseOrderLine` (`src/purchasing-storage.js`).
- [x] T022 [US3] Filtrar el selector de productos por la lista y moneda, completar el costo unitario de solo lectura y fijar el precio al agregar la línea en `src/app.js`.
- [x] T023 [US3] Repreciar y depurar el borrador al cambiar proveedor o moneda (`applyPriceListToDraft`) en `src/app.js`.
- [x] T024 [US3] Agregar `#line-cost-help` en `index.html`.
- [x] T025 [P] [US3] Pruebas de precio fijado, producto fuera de lista, moneda distinta, repreciado y proveedor sin lista en `tests/unit/supplier-prices-storage-006.test.js`.
- [x] T026 [P] [US3] Pruebas de integración del formulario con y sin lista en `tests/integration/purchasing-006.test.js`.

---

## Phase 6: User Story 4 - Folios automáticos (P2)

- [x] T027 [US4] Asignar `folio` correlativo cuando no se informa (`nextRequestFolio`) en `savePurchaseOrder` y en el envío del formulario de `src/app.js`.
- [x] T028 [US4] Asignar `ocFolio` al aprobar en `transitionSnapshot` y al crear con estado `aprobado` (`assignPurchaseOrderFolio`) en `src/purchasing-storage.js`.
- [x] T029 [US4] Ocultar el campo Folio en Compras (`applyPurchasingFormAdjustments`) y mostrar `SOL-`/`OC-` en la lista, la Búsqueda, el detalle (`src/purchase-order-detail.js`) y la vista imprimible (`src/purchase-order-print.js`).
- [x] T030 [P] [US4] Pruebas unitarias e integración de correlativos y folio OC.

---

## Phase 7: User Story 5 - Filtro de estado con nombres específicos (P2)

- [x] T031 [US5] Construir las opciones del filtro desde `STATUS_FILTER_OPTIONS` y usar `statusFilterLabel` en el resumen (`src/app.js`).
- [x] T032 [US5] Resolver grupos de estados en `filterOrders` (`src/purchasing-list-query.js`).
- [x] T033 [P] [US5] Pruebas de unicidad de nombres y filtrado por estado y grupo.

---

## Phase 8: User Story 6 - Ficha del proveedor, extranjeros y ayuda de Moneda (P2)

- [x] T034 [US6] Implementar `getSupplierSummary` en `src/purchasing-storage.js`.
- [x] T035 [US6] Crear `src/supplier-summary-view.js` con `renderSupplierSummary` y `supplierTaxIdentity`.
- [x] T036 [US6] Hacer activables los proveedores de la Búsqueda, abrir y cerrar la ficha (`#supplier-summary`) en `src/app.js` e `index.html`.
- [x] T037 [US6] Mostrar la identificación tributaria extranjera sin separadores vacíos en Búsqueda, lista de Proveedores, detalle e impresión.
- [x] T038 [US6] Agregar `#currency-help` con `aria-describedby` y actualizarlo según el origen (`syncCurrencyHelp`).
- [x] T039 [P] [US6] Pruebas de ficha, búsqueda por folio, identificación extranjera y ayuda de Moneda.

---

## Phase 9: Datos de demostración

- [x] T040 Sembrar precios acordados a partir de `ORDER_PLANS` y `EXTRA_PRICE_SEEDS` en `src/purchasing-demo-data.js` (todo producto y todo proveedor con lista; precios coherentes con las órdenes).
- [x] T041 Informar «precios acordados» en la notificación de carga (`src/app.js`).
- [x] T042 [P] Prueba de integración de la demostración con listas de precios en `tests/integration/purchasing-006.test.js`.

---

## Phase 10: Polish & Cross-Cutting

- [x] T043 [P] Estilos mínimos para los controles nuevos en `src/styles.css`, sin rediseño (reservado a 005).
- [x] T044 [P] Documentar 006 en `README.md`.
- [x] T045 Ejecutar `npm test -- --run` (54 archivos, 356 pruebas) y `npm run lint` sin errores.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → US3 (US3 depende de las listas creadas en US1).
- US4, US5 y US6 dependen solo de la Phase 2 y pueden ejecutarse en paralelo.
- La Phase 9 depende de US1 y US3; la Phase 10 cierra la entrega.
