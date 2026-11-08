# Tasks: Extensión de Órdenes de Compra con Detalle, Flujo, Recepción e Impresión

**Input**: Documentos de diseño en `specs/002-purchase-order-workflow/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/purchase-order-workflow.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Incluidas porque la Constitución exige pruebas unitarias para lógica y de integración para flujos visibles. Escribir primero las pruebas indicadas y verificar que fallan antes de implementar.

**Organización**: Las tareas se agrupan por historia de usuario para permitir implementación y validación independiente. Los identificadores de historia siguen el orden y prioridad de `spec.md`.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo con otras tareas de la misma fase porque usa archivos distintos y no depende de tareas incompletas.
- **[Story]**: Historia de usuario a la que pertenece la tarea: `[US1]`, `[US2]`, `[US3]`, `[US4]` o `[US5]`.
- Cada tarea incluye rutas exactas de archivos del proyecto.

## Path Conventions

- Proyecto único: `src/` y `tests/` en la raíz.
- Documentación de la funcionalidad: `specs/002-purchase-order-workflow/`.
- Pruebas unitarias: `tests/unit/`.
- Pruebas de integración: `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar los puntos de extensión de la SPA y los módulos nuevos sin implementar comportamiento.

- [x] T001 Crear esqueletos exportables con funciones `init` vacías en `src/purchase-order-lines.js`, `src/purchase-order-detail.js`, `src/purchase-order-print.js` y `src/product-catalog.js`.
- [x] T001a Instalar y configurar ESLint en `eslint.config.js` y agregar el script `lint` en `package.json`.
- [x] T001b Instalar y configurar Prettier en `.prettierrc.json` y agregar el script `format` en `package.json`.
- [x] T002 [P] Agregar en `index.html` los contenedores `order-detail-view`, `order-lines-table`, `order-totals`, `order-actions`, `order-history`, `print-order-view`, `products-view` y los accesos de navegación necesarios.
- [x] T003 [P] Agregar en `src/styles.css` secciones base para detalle, líneas, historial, catálogo y `@media print`, sin estilos definitivos todavía.
- [x] T004 Ejecutar la línea base de `npm test -- --run` y `npm run build` definidos en `package.json` y confirmar que las 116 pruebas existentes y el build siguen pasando.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida de persistencia, transacciones, errores y shell de detalle que bloquea todas las historias.

**⚠️ CRITICAL**: Ninguna historia de usuario puede considerarse completa hasta terminar esta fase.

- [x] T005 [P] Escribir pruebas fallidas para claves nuevas, metadatos, legado, carga agregada y cascada en `tests/integration/purchase-order-persistence.test.js`.
- [x] T006 [P] Escribir pruebas fallidas para fases del diario y recuperación de transacciones en `tests/unit/purchase-order-transactions.test.js`.
- [x] T007 Extender `KEYS` y los helpers seguros de lectura/escritura en `src/purchasing-storage.js` con `order-metadata`, `status-history`, `transactions` y operaciones CRUD de metadatos.
- [x] T008 Implementar en `src/purchasing-storage.js` `getPurchaseOrderDetail` y `listPurchaseOrdersWithActions`, combinando documento base, metadatos, líneas e historial; tratar órdenes sin metadatos como legado.
- [x] T009 Implementar en `src/purchasing-storage.js` `beginTransaction`, `markTransactionApplied`, `clearTransaction` y `recoverTransactions` con fases `prepared`/`applied` e instantáneas `before`/`after`.
- [x] T010 Agregar en `src/domain/purchasing.js` el mapa `PURCHASING_ERRORS` y un helper que convierta códigos del contrato en mensajes orientados al usuario.
- [x] T011 Invocar la recuperación de transacciones antes de renderizar la aplicación en `src/main.js` y exponer el resultado para mostrar errores de recuperación.
- [x] T012 Implementar el shell de detalle y la acción de cierre en `src/purchase-order-detail.js`, y conectarlo desde `src/app.js` mediante `showOrderDetail` y delegación de `data-action`.

**Checkpoint**: La base de persistencia, recuperación y navegación está lista; las historias pueden comenzar.

---

## Phase 3: User Story 1 - Registrar líneas de detalle y calcular totales (Priority: P1) 🎯 MVP

**Goal**: Permitir crear una orden con productos, editar o eliminar líneas y ver subtotales, neto, IVA y total recalculados.

**Independent Test**: Crear una orden en borrador con dos productos, modificar cantidades y precios, eliminar una línea y comprobar subtotales, neto, IVA del 19 % y total después de cada cambio.

### Tests for User Story 1

- [x] T013 [P] [US1] Escribir pruebas unitarias fallidas para validación de líneas, duplicados, subtotales, redondeo y totales en `tests/unit/purchasing-workflow.test.js`.
- [x] T014 [P] [US1] Escribir pruebas de integración fallidas para agregar, editar y eliminar líneas, recálculo inmediato, duplicado y bloqueo sin líneas en `tests/integration/purchase-order-lines.test.js`.
- [x] T014a [P] [US1] Escribir pruebas de integración fallidas para el selector de empleado obligatorio, la validación con mensaje claro y la visualización del empleado en el detalle en `tests/integration/purchase-order-employee.test.js`.
- [x] T015 [P] [US1] Escribir pruebas de integración fallidas para mantenimiento de productos, stock visible y bloqueo de eliminación de producto referenciado en `tests/integration/product-catalog.test.js`.

### Implementation for User Story 1

- [x] T016 [US1] Extender `src/domain/purchasing.js` con validación de líneas, detección de duplicados, subtotales, totales persistibles y regla de orden terminal.
- [x] T017 [US1] Implementar en `src/purchasing-storage.js` el guardado/actualización de líneas por orden, total persistido y guardado de orden con metadatos, rechazando órdenes sin líneas.
- [x] T018 [US1] Implementar en `src/purchasing-storage.js` actualización, eliminación y ajuste de stock de productos, bloqueando la eliminación de productos referenciados.
- [x] T019 [P] [US1] Implementar la vista de catálogo mínimo en `src/product-catalog.js` con alta, edición, eliminación y stock, usando los patrones visuales existentes.
- [x] T019a [US1] Implementar el selector de empleado y la validación obligatoria con mensaje claro en `src/app.js`, persistiendo `id_empleado` en `src/purchasing-storage.js`.
- [x] T020 [P] [US1] Implementar el editor de líneas en `src/purchase-order-lines.js` con selector de producto, cantidad, costo, subtotal calculado, errores por campo y bloqueo de edición terminal.
- [x] T021 [US1] Conectar catálogo y editor de líneas en `src/app.js`, incluyendo guardar orden, recalcular totales, refrescar la tabla y bloquear guardado sin líneas.
- [x] T021a [P] [US1] Escribir pruebas fallidas para el rechazo de `updateDocument` y de líneas en órdenes `recibido`/`cancelado`, y para el formulario en solo lectura, en `tests/integration/purchase-order-terminal.test.js`.
- [x] T021b [US1] Implementar en `src/storage.js` y `src/purchasing-storage.js` el rechazo de cualquier cambio de cabecera o de líneas en órdenes con estado `recibido` o `cancelado`.
- [x] T021c [US1] Implementar en `src/app.js` y `src/purchase-order-lines.js` el formulario en modo solo lectura para órdenes con estado `recibido` o `cancelado`.
- [x] T022 [US1] Agregar estilos accesibles para editor de líneas, totales y catálogo en `src/styles.css`.
- [x] T022a [US1] Mostrar el empleado solicitante en la vista de detalle en `src/purchase-order-detail.js`.

**Checkpoint**: User Story 1 funciona de forma independiente y constituye el MVP.

---

## Phase 4: User Story 2 - Ejecutar el flujo de estados con acciones visibles (Priority: P2)

**Goal**: Mostrar solo acciones válidas por estado y ejecutar transiciones seguras con actualización inmediata.

**Independent Test**: Crear o sembrar órdenes en cada estado, verificar las acciones visibles, ejecutar cada acción válida y comprobar estado, acciones e historial; intentar una transición inválida sin cambios.

### Tests for User Story 2

- [x] T023 [P] [US2] Escribir pruebas unitarias fallidas para acciones disponibles, transiciones inválidas, estados terminales y registro de historial en `tests/unit/purchasing-workflow.test.js`; agregar aserciones para `borrador → pendiente` sin líneas (rechazado con `NO_LINES`) y con una línea válida (aceptado).
- [x] T024 [P] [US2] Escribir pruebas de integración fallidas para la matriz de acciones, cambio de estado visible y rechazo sin mutación en `tests/integration/purchase-order-status.test.js`; agregar aserciones para `borrador → pendiente` sin líneas (rechazado con `NO_LINES`) y con una línea válida (aceptado).

### Implementation for User Story 2

- [x] T025 [US2] Extender `src/domain/purchasing.js` con `getAvailableActions`, `assertTransition`, `isTerminalStatus` y creación del registro de cambio de estado, derivando las acciones únicamente del ciclo canónico.
- [x] T025a [P] [US2] Escribir una prueba fallida para una configuración de Compras con una transición no canónica, que debe ser rechazada con aviso y debe usar el ciclo canónico, en `tests/unit/module-config.test.js`.
- [x] T025b [US2] Implementar en `src/module-config.js` el rechazo de estados o transiciones no canónicas de Compras con aviso, y mostrar el aviso en `src/app.js`, aplicando el ciclo canónico.
- [x] T026 [US2] Implementar `changeOrderStatus` en `src/purchasing-storage.js` usando el diario de transacciones, actualizando el documento y agregando exactamente un registro de historial; rechazar `borrador → pendiente` con `NO_LINES` si no hay al menos una línea válida y aceptar la transición con una línea válida.
- [x] T027 [US2] Renderizar estado actual y acciones contextuales en `src/purchase-order-detail.js`, incluyendo estados terminales sin transiciones.
- [x] T028 [US2] Conectar acciones `data-action="transition"` con confirmación, refresco de detalle y manejo de errores en `src/app.js`.
- [x] T029 [US2] Agregar estilos de acciones y estados en `src/styles.css`.

**Checkpoint**: User Story 2 funciona de forma independiente con datos sembrados y se integra con US1 para el flujo completo.

---

## Phase 5: User Story 3 - Recibir una orden y actualizar stock una sola vez (Priority: P2)

**Goal**: Recibir una orden aprobada, sumar cantidades al stock exactamente una vez y recuperar la consistencia ante fallos.

**Independent Test**: Recibir una orden aprobada con dos productos, comprobar el stock, repetir la recepción sin cambios, cancelar otra orden sin stock y forzar un fallo para verificar rollback.

### Tests for User Story 3

- [x] T030 [P] [US3] Escribir pruebas unitarias fallidas para planificación de recepción, idempotencia, rollback y recuperación en `tests/unit/purchase-order-transactions.test.js`.
- [x] T031 [P] [US3] Escribir pruebas de integración fallidas para recibir, repetir recepción, cancelar sin stock y ausencia de cambios parciales en `tests/integration/purchase-order-receipt.test.js`.

### Implementation for User Story 3

- [x] T032 [US3] Extender `src/domain/purchasing.js` con `planReceipt`, validación de líneas recibibles y cálculo de stock esperado.
- [x] T033 [US3] Implementar `receivePurchaseOrder` en `src/purchasing-storage.js` con diario `prepared`/`applied`, stock, metadatos, estado, historial, rollback y recuperación.
- [x] T034 [US3] Mostrar la acción de recepción y la marca de stock aplicado en `src/purchase-order-detail.js` e `index.html`.
- [x] T035 [US3] Conectar la recepción con confirmación, mensajes de error y refresco de stock/estado en `src/app.js`.

**Checkpoint**: User Story 3 funciona de forma independiente con órdenes aprobadas sembradas y productos existentes.

---

## Phase 6: User Story 4 - Consultar el historial de cambios de estado (Priority: P2)

**Goal**: Mostrar el historial inmutable de transiciones con estado anterior, estado nuevo y fecha/hora, conservado tras recargas.

**Independent Test**: Sembrar una orden con varios cambios de estado, comprobar orden cronológico, formato de fecha/hora, estado vacío, persistencia tras recarga y eliminación en cascada.

### Tests for User Story 4

- [x] T036 [P] [US4] Escribir pruebas unitarias fallidas para lectura cronológica, inmutabilidad y cascada del historial en `tests/unit/purchase-order-history.test.js`.
- [x] T037 [P] [US4] Escribir pruebas de integración fallidas para visualización, estado vacío y persistencia del historial en `tests/integration/purchase-order-history.test.js`.

### Implementation for User Story 4

- [x] T038 [US4] Implementar `loadOrderHistory` con orden cronológico y eliminación en cascada en `src/purchasing-storage.js`.
- [x] T039 [US4] Renderizar el historial y el estado vacío en `src/purchase-order-detail.js`, formateando `changedAt` como `dd-mm-aaaa HH:mm` en America/Santiago.
- [x] T040 [US4] Agregar estilos de historial y estado vacío en `src/styles.css`.
- [x] T041 [US4] Conectar la eliminación de una orden con la limpieza de líneas, metadatos, historial y transacciones en `src/app.js` y `src/purchasing-storage.js`.

**Checkpoint**: User Story 4 funciona de forma independiente con historial sembrado y conserva datos al recargar.

---

## Phase 7: User Story 5 - Imprimir el detalle de la orden de compra (Priority: P3)

**Goal**: Abrir una vista limpia e imprimible con los datos comerciales, totales e historial de cualquier orden.

**Independent Test**: Abrir la vista imprimible de una orden con líneas e historial, verificar todos los datos requeridos, la ausencia de navegación/acciones y las reglas de paginación.

### Tests for User Story 5

- [x] T042 [P] [US5] Escribir pruebas de integración fallidas para contenido imprimible, historial, totales, ocultamiento de navegación y reglas de paginación en `tests/integration/purchase-order-print.test.js`.
- [x] T042a [P] [US5] Agregar una aserción fallida para el empleado solicitante en la vista imprimible en `tests/integration/purchase-order-print.test.js`.

### Implementation for User Story 5

- [x] T043 [US5] Implementar la construcción de la vista imprimible desde el detalle de orden en `src/purchase-order-print.js`, incluyendo proveedor, empleado, fechas, estado, líneas y totales.
- [x] T044 [US5] Agregar la sección de impresión, encabezado, tabla y acceso de impresión en `index.html`.
- [x] T045 [US5] Conectar `data-action="print-order"` y la impresión nativa con limpieza posterior en `src/app.js`.
- [x] T046 [US5] Implementar reglas `@media print`, ocultamiento de navegación/acciones, repetición de encabezados y saltos de página en `src/styles.css`.
- [x] T047 [US5] Agregar al documento imprimible el historial con fecha/hora y la indicación de recepción con stock aplicado en `src/purchase-order-print.js`.

**Checkpoint**: User Story 5 funciona de forma independiente con datos sembrados y completa el flujo de impresión.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar casos transversales de legado, accesibilidad, rendimiento, documentación y verificación final.

- [x] T048 [P] Implementar el tratamiento visual de órdenes históricas sin metadatos en `src/purchase-order-detail.js`, mostrando empleado desconocido y bloqueando acciones que dependan de la extensión.
- [x] T049 [P] Revisar accesibilidad en `index.html` y `src/styles.css`: foco visible, contraste, etiquetas, `aria-live` para errores y operabilidad por teclado.
- [x] T050 [P] Agregar pruebas de rendimiento para lista, detalle, recálculo, recepción e impresión en `tests/integration/purchase-order-performance.test.js`.
- [x] T051 [P] Revisar mensajes de error, sanitización y escape de contenido en `src/purchase-order-lines.js` y `src/purchase-order-print.js`.
- [x] T052 [P] Actualizar `README.md` con el flujo de órdenes de compra, recepción, historial, impresión y comandos de validación.
- [x] T053 Ejecutar `npm test -- --run`, `npm run build` y los escenarios manuales de `specs/002-purchase-order-workflow/quickstart.md`; corregir cualquier regresión antes de cerrar.
- [x] T053a Ejecutar `npm run lint` sin errores.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y bloquea las historias.
- **User Stories (Phase 3–7)**: dependen de Foundational.
  - **US1**: puede iniciar inmediatamente después de Foundational; no depende de otras historias.
  - **US2**: puede iniciar después de Foundational; su prueba end-to-end se integra con US1.
  - **US3**: depende de US2 para la transición `aprobado → recibido` y el registro de historial.
  - **US4**: depende de US2/US3 para recibir registros; sus pruebas independientes pueden sembrar historial.
  - **US5**: depende de US1 y US4 para el contenido completo; sus pruebas independientes pueden sembrar líneas e historial.
- **Polish (Phase 8)**: depende de todas las historias incluidas en la entrega.

### User Story Dependencies

- **US1 (P1)**: independiente; es el MVP y habilita el resto del flujo.
- **US2 (P2)**: requiere el shell de detalle de Foundational e idealmente US1 para el flujo completo.
- **US3 (P2)**: requiere US2 para la semántica de transición y US1 para productos/líneas.
- **US4 (P2)**: requiere el registro de historial de US2 y la recepción de US3; la visualización se prueba con datos sembrados.
- **US5 (P3)**: requiere líneas de US1 e historial de US4; la vista se prueba con datos sembrados.

### Within Each User Story

- Las pruebas deben escribirse primero y fallar antes de la implementación.
- Dominio antes de almacenamiento.
- Almacenamiento antes de la conexión de interfaz.
- Conexión de interfaz antes de estilos finales.
- Verificar la prueba independiente antes de avanzar a la siguiente historia.

### Parallel Opportunities

- Setup: T002 y T003.
- Foundational: T005 y T006.
- US1: T013, T014 y T015; luego T019 y T020.
- US2: T023 y T024.
- US3: T030 y T031.
- US4: T036 y T037.
- US5: T042 puede ejecutarse mientras se preparan datos/imágenes de impresión.
- Polish: T048, T049, T050, T051 y T052.

---

## Parallel Example: User Story 1

```text
Task: "Escribir pruebas unitarias de líneas y totales en tests/unit/purchasing-workflow.test.js"
Task: "Escribir pruebas de integración del editor de líneas en tests/integration/purchase-order-lines.test.js"
Task: "Escribir pruebas de integración del catálogo en tests/integration/product-catalog.test.js"
```

Después de T016–T018:

```text
Task: "Implementar catálogo en src/product-catalog.js"
Task: "Implementar editor de líneas en src/purchase-order-lines.js"
```

## Parallel Example: User Story 2

```text
Task: "Pruebas unitarias de acciones y transiciones en tests/unit/purchasing-workflow.test.js"
Task: "Pruebas de integración de acciones por estado en tests/integration/purchase-order-status.test.js"
```

## Parallel Example: User Story 3

```text
Task: "Pruebas unitarias de recepción y rollback en tests/unit/purchase-order-transactions.test.js"
Task: "Pruebas de integración de recepción en tests/integration/purchase-order-receipt.test.js"
```

## Parallel Example: User Story 4

```text
Task: "Pruebas unitarias de historial en tests/unit/purchase-order-history.test.js"
Task: "Pruebas de integración de historial en tests/integration/purchase-order-history.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup y Foundational.
2. Completar US1: líneas, totales y catálogo mínimo.
3. Ejecutar `npm test -- --run` y validar el escenario de US1 de `quickstart.md`.
4. Detenerse y demostrar el MVP antes de continuar.

### Incremental Delivery

1. Foundational + US1 → MVP con líneas y totales.
2. Añadir US2 → flujo de estados guiado.
3. Añadir US3 → recepción con stock exacto.
4. Añadir US4 → historial consultable y persistente.
5. Añadir US5 → impresión.
6. Polish → legado, accesibilidad, rendimiento y regresión completa.

### Parallel Team Strategy

1. Completar Setup + Foundational en conjunto.
2. Después de Foundational:
   - Persona A: US1 como MVP.
   - Persona B: preparar pruebas de US2 sin modificar archivos de US1.
3. Después de US2:
   - Persona A: US3.
   - Persona B: US4.
   - Persona C: preparar pruebas y estructura de US5.
4. Integrar US5 y ejecutar Polish al final.

---

## Notes

- Las pruebas son obligatorias por la Constitución y el plan, no opcionales.
- Lint y formato son obligatorios; además de `npm test -- --run` y `npm run build`, el cierre exige `npm run lint` sin errores.
- No se debe modificar el esquema de `BASE_FIELDS.document`; los datos nuevos van en claves de extensión.
- Las órdenes históricas sin metadatos no se migran ni se les inventa `stock_aplicado`.
- Evitar tareas que toquen el mismo archivo en paralelo.
