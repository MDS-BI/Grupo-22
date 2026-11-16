# Tasks: Gestión de Compras Avanzada

**Input**: Documentos de diseño en `specs/007-gestion-compras-avanzada/`

**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/gestion-compras.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Incluidas. La constitución exige pruebas unitarias para la lógica y de integración para los flujos visibles. Las pruebas de cada historia se escriben antes o junto con su implementación. Ninguna prueba existente se modifica.

**Organización**: Por historia de usuario (`spec.md`). Las historias US1, US7, US2 y US3 son P1; US4 y US5, P2; US6, P3.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias incompletas).
- **[Story]**: `[US1]` a `[US7]`.

## Path Conventions

- Proyecto único: `src/` y `tests/` en la raíz. Documentación: `specs/007-gestion-compras-avanzada/`.

---

## Phase 1: Setup

- [ ] T001 Verificar la línea base en `main`: `npm test -- --run`, `npm run lint` y `npm run build` sin errores; registrar la cantidad de pruebas.
- [ ] T002 [P] Apuntar `.specify/feature.json` a `specs/007-gestion-compras-avanzada`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Las historias dependen de esta fase.

- [ ] T003 Agregar `PERMISSIONS.REPORTS_VIEW` (`reports.view`, Administrador y Gerente) y `PERMISSIONS.BUDGETS_MANAGE` (`budgets.manage`, Administrador) en `src/auth.js`.
- [ ] T004 Agregar `areas`, `budgets` y `notificationReads` a `KEYS` en `src/purchasing-storage.js`.
- [ ] T005 Agregar `estado` a `BASE_FIELDS.entity` en `src/module-config.js` (ausente = `activo`).
- [ ] T006 [P] Aceptar `stock_minimo` (entero ≥ 0, por defecto 0) en `validateProductData` y `updateProduct` (`src/purchasing-storage.js`).
- [ ] T007 [P] Agregar a `src/domain/purchasing.js` los errores `AREA_REQUIRED`, `AREA_NOT_FOUND`, `SUPPLIER_INACTIVE` y `BUDGET_INVALID`.
- [ ] T008 [P] Pruebas unitarias de la fase base en `tests/unit/purchasing-storage-007.test.js` (permisos nuevos, `KEYS`, `stock_minimo`, `estado` conservado por `updateEntity`, limpieza de demo).

**Checkpoint**: Las pruebas anteriores siguen pasando; nada visible cambia todavía.

---

## Phase 3: User Story 1 - Evaluación de proveedores (P1) 🎯 MVP

**Goal**: Ficha y tarjetas del proveedor muestran puntualidad, atraso, OC, monto y calificación A/B/C.

- [ ] T009 [P] [US1] Pruebas unitarias en `tests/unit/supplier-evaluation-007.test.js`: a tiempo, atrasada, sin fecha comprometida, recepción aproximada, umbrales 90/70, «Sin datos».
- [ ] T010 [US1] Implementar `receiptDateOf`, `evaluateSupplier` y `gradeFor` en `src/domain/supplier-evaluation.js`.
- [ ] T011 [US1] Implementar `getSupplierEvaluation(entityId)` en `src/purchasing-storage.js` (historial indexado por orden).
- [ ] T012 [US1] Agregar la sección `#supplier-evaluation` a `src/supplier-summary-view.js` y la etiqueta `.supplier-grade` a las tarjetas de proveedor en `src/app.js`, visibles solo con `reports.view`.
- [ ] T013 [P] [US1] Estilos de calificación (A verde, B ámbar, C rojo, Sin datos gris; contraste AA) en `src/styles.css`.
- [ ] T014 [P] [US1] Pruebas de integración por rol en `tests/integration/evaluation-007.test.js`.
- [ ] T015 [US1] Verificación de fase: `npm test -- --run` y `npm run lint`.

---

## Phase 3b: User Story 7 - Comprar por producto con precios por cantidad (P1)

**Goal**: La nueva solicitud parte por el producto, compara proveedores con el precio del tramo y crea una solicitud por proveedor.

- [ ] T055 [P] [US7] Pruebas unitarias en `tests/unit/price-tiers-007.test.js`: normalización sin tramos, validación (desde ≥ 1, único, tramo 1 obligatorio, precio > 0), tramo aplicable en los bordes (9, 10, 49, 50), comparación con proveedor inactivo excluido y empates, agrupación del carrito sumando repetidos.
- [ ] T056 [US7] Implementar `normalizeTiers`, `validateTiers`, `unitPriceFor`, `compareSupplierOptions` y `groupCartBySupplier` en `src/domain/price-tiers.js`.
- [ ] T057 [US7] Usar `unitPriceFor` en `applySupplierPriceList` y aceptar `tramos` en `upsertSupplierPrice`, `setProductSupplierPrices` y `createProductWithSupplierPrices`; agregar `setSupplierPriceTiers` (`src/purchasing-storage.js`). Verificar que las pruebas del `006` siguen pasando sin cambios.
- [ ] T058 [US7] Implementar `getPurchaseOptions` y `createRequestsFromCart` (atómico, una solicitud por proveedor vía `savePurchaseOrder`) en `src/purchasing-storage.js`.
- [ ] T059 [US7] Agregar tramos por proveedor al formulario de producto (`[data-action="add-tier"]`, validación por fila) en `src/product-catalog.js` e `index.html`, y mostrarlos en la ficha del proveedor (`src/supplier-summary-view.js`).
- [ ] T060 [US7] Implementar `src/ui-purchase-by-product.js`: selector de modo `#purchase-mode`, búsqueda `#purchase-product-search`, cantidad `#purchase-quantity`, tabla `#purchase-options` con «Mejor precio» y `[data-action="choose-option"]`, carrito `#purchase-cart` agrupado por proveedor y `#purchase-cart-save` con aviso de los folios creados. El modo «Elegir proveedor primero» muestra el formulario existente sin cambios.
- [ ] T061 [US7] Recalcular el precio de la línea según el tramo al cambiar la cantidad en el modo «Elegir proveedor primero» (`renderLineProductOptions` / `addDraftLine` en `src/app.js`).
- [ ] T062 [P] [US7] Pruebas de integración en `tests/integration/purchase-by-product-007.test.js`: comparación con dos proveedores, cambio de tramo, carrito con dos proveedores → dos solicitudes, producto sin proveedores, falla atómica, precio manipulado (SC-010).
- [ ] T063 [US7] Verificación de fase.

---

## Phase 4: User Story 2 - Stock mínimo y solicitud sugerida (P1)

**Goal**: Productos bajo el mínimo en el Panel y borradores por proveedor con un clic.

- [ ] T016 [P] [US2] Pruebas unitarias en `tests/unit/reorder-007.test.js`: bajo mínimo con `stock ≤ mínimo`, cantidad `2×mín − stock`, preferencia CLP, empate por calificación y nombre, proveedor inactivo excluido, producto sin lista omitido, producto en solicitud abierta.
- [ ] T017 [US2] Implementar `isBelowMinimum`, `suggestedQuantity`, `pickSupplier` y `buildSuggestedRequests` en `src/domain/reorder.js`, usando `compareSupplierOptions` de US7 para el precio del tramo cuando esté disponible.
- [ ] T018 [US2] Implementar `listBelowMinimum` y `createSuggestedRequests` (atómico con snapshot de `KEYS`, vía `savePurchaseOrder`) en `src/purchasing-storage.js`.
- [ ] T019 [US2] Agregar el campo `#product-stock-minimo` al formulario y una columna «Mínimo» a la tabla en `index.html` y `src/product-catalog.js`.
- [ ] T020 [US2] Agregar la tarjeta `#insight-reorder` con `#reorder-list` y el botón `#reorder-create` (solo `documents.create`) al Panel en `index.html`, `src/ui-dashboard.js` y `src/app.js`; aviso de resultado con borradores creados y productos omitidos.
- [ ] T021 [P] [US2] Pruebas de integración en `tests/integration/reorder-007.test.js` (Bodeguero ve sin botón; Comprador genera; segundo clic no duplica).
- [ ] T022 [US2] Verificación de fase.

---

## Phase 5: User Story 3 - Reportes de gasto (P1)

**Goal**: Vista Reportes con agrupación, rango, tabla, gráfico y CSV.

- [ ] T023 [P] [US3] Pruebas unitarias en `tests/unit/reports-007.test.js`: agrupaciones, rango, monedas separadas, «Sin área», nota por rubro, rango invertido; `toCsv` con BOM, `;` y escapado.
- [ ] T024 [US3] Implementar `spendReport` y `toCsv` en `src/domain/reports.js`.
- [ ] T025 [US3] Agregar `#view-reports` en `index.html` y habilitar `#nav-reports` según `reports.view` (`src/ui-shell.js`, `src/app.js`, `canAccessView`).
- [ ] T026 [US3] Implementar `src/ui-reports.js`: filtros `#reports-group-by`, `#reports-from`, `#reports-to`; tabla `#reports-table`; gráfico `#reports-chart` (reutiliza `src/ui-charts.js`) con tabla accesible; estado vacío; `#reports-export`.
- [ ] T027 [P] [US3] Pruebas de integración en `tests/integration/reports-007.test.js` (visibilidad por rol, cambio de agrupación, CSV generado, coherencia con la ficha del proveedor, SC-003).
- [ ] T028 [P] [US3] Prueba de rendimiento con 2.000 OC (≤ 1 s) en `tests/integration/reports-007.test.js`.
- [ ] T029 [US3] Verificación de fase.

---

## Phase 6: User Story 4 - Presupuesto por área (P2)

**Goal**: Áreas, presupuestos mensuales, área en la solicitud y advertencia al aprobar.

- [ ] T030 [P] [US4] Pruebas unitarias en `tests/unit/budget-007.test.js`: gasto del mes solo en CLP, disponible, exceso, presupuesto 0, sin presupuesto.
- [ ] T031 [US4] Implementar `monthKey`, `areaSpend` y `budgetStatus` en `src/domain/budget.js`.
- [ ] T032 [US4] Implementar `loadAreas`, `saveArea`, `setAreaActive`, `loadBudgets`, `setBudget` y `getAreaBudgetForOrder` en `src/purchasing-storage.js`, con permiso `budgets.manage`.
- [ ] T033 [US4] Exigir `id_area` en `savePurchaseOrder` solo si hay áreas activas (`AREA_REQUIRED`) y guardarlo en la metadata de la orden.
- [ ] T034 [US4] Agregar el selector `#document-area` al formulario de solicitud (`index.html`, `src/app.js`), oculto si no hay áreas activas.
- [ ] T035 [US4] Implementar la pestaña «Áreas y presupuestos» (`#reports-tab-areas`, `#areas-table`, `#area-form`, `#budget-form`) en `src/ui-reports.js`, visible solo con `budgets.manage`.
- [ ] T036 [US4] Mostrar `#order-budget` en el detalle (`src/purchase-order-detail.js`) para roles con `orders.approve` y agregar la advertencia al texto de confirmación de «Aprobar» en `src/app.js`.
- [ ] T037 [P] [US4] Pruebas de integración en `tests/integration/budget-007.test.js`.
- [ ] T038 [US4] Verificación de fase.

---

## Phase 7: User Story 5 - Notificaciones (P2)

**Goal**: Campana con contador y bandeja por rol, con estado de lectura por usuario.

- [ ] T039 [P] [US5] Pruebas unitarias en `tests/unit/notifications-007.test.js`: avisos por rol, identificadores estables, aprobada/rechazada de los últimos 30 días, presupuesto excedido, conteo de no leídos.
- [ ] T040 [US5] Implementar `notificationsFor` y `unreadCount` en `src/domain/notifications.js`, reutilizando `attentionItemsForRole` de `src/ui-dashboard.js`.
- [ ] T041 [US5] Implementar `loadNotificationReads` y `markNotificationsRead` (máximo 500 por usuario) en `src/purchasing-storage.js`.
- [ ] T042 [US5] Implementar `src/ui-notifications.js`: mostrar `#notifications-placeholder` con sesión, `#notifications-count`, panel `#notifications-panel` (teclado, `Escape`, `aria-expanded`), clic que marca como leído y abre el detalle, `#notifications-mark-all`.
- [ ] T043 [P] [US5] Pruebas de integración en `tests/integration/notifications-007.test.js` (flujo Comprador → Gerente → Comprador; persistencia tras cerrar sesión).
- [ ] T044 [US5] Verificación de fase.

---

## Phase 8: User Story 6 - Mejoras rápidas (P3)

- [ ] T045 [US6] Implementar `duplicatePurchaseOrder` (precio del tramo vigente, FR-039) en `src/purchasing-storage.js` y el botón `[data-action="duplicate-order"]` en `src/purchase-order-detail.js`.
- [ ] T046 [US6] Implementar `setSupplierStatus`, la acción `[data-action="toggle-supplier-status"]` en tabla y tarjetas, la etiqueta «Inactivo» y la exclusión de inactivos en el selector de solicitudes nuevas (`src/app.js`, `src/purchasing-storage.js`).
- [ ] T047 [US6] Ampliar la confirmación de eliminar proveedor con la cantidad de OC y la recomendación de inactivar (`src/app.js`).
- [ ] T048 [US6] Agregar `#entities-export`, `#products-export` y `#documents-export` con `toCsv` sobre las filas visibles (`src/app.js`, `src/product-catalog.js`).
- [ ] T049 [P] [US6] Pruebas de integración en `tests/integration/quick-actions-007.test.js`.
- [ ] T050 [US6] Verificación de fase.

---

## Phase 9: Datos de demostración y cierre

- [ ] T051 Ampliar `src/purchasing-demo-data.js`: 3 áreas con presupuesto del mes (uno excedido), área en cada orden demo, `stock_minimo` en 4 productos (2 bajo el mínimo), tramos en al menos 3 precios acordados coherentes con las cantidades de las órdenes demo y fechas de recepción en el historial que den proveedores A, B y C (FR-029).
- [ ] T052 [P] Prueba de integración de la demostración del 007 (FR-029, FR-030) en `tests/integration/reports-007.test.js`.
- [ ] T053 [P] Documentar el 007 en `README.md` y completar `quickstart.md`.
- [ ] T054 Ejecutar `npm test -- --run`, `npm run lint` y `npm run build`; recorrido manual del quickstart con capturas.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → historias.
- US1, US7, US2, US3 y US5 dependen solo de la Phase 2 y pueden avanzar en paralelo en ramas distintas.
- US7 debe integrarse antes de US2 y US6 si se quiere que la solicitud sugerida y la duplicación usen tramos desde el inicio; si no, usan el precio único del `006` y se ajustan al integrar US7.
- US4 (áreas) debe integrarse antes de la agrupación por Área de US3 y del aviso de presupuesto de US5; mientras tanto, ambas tratan las órdenes como «Sin área» y omiten ese aviso.
- US2 usa `gradeFor` de US1 para el desempate; si US1 no está, el desempate es solo por nombre.
- Phase 9 cierra la entrega.

## Parallel Example

- Persona A: T009–T015 (US1), luego T055–T063 (US7) y T045–T050 (US6).
- Persona B: T016–T022 (US2) y luego T039–T044 (US5).
- Persona C: T030–T038 (US4) y luego T023–T029 (US3).
