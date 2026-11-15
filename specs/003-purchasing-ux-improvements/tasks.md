# Tasks: Mejoras de UX del módulo de Compras

**Input**: Design documents from `/specs/003-purchasing-ux-improvements/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Se incluyen tareas de prueba porque la constitución y el plan exigen cobertura automatizada para comportamiento visible y regresiones de 001/002.

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y validación independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias de tareas incompletas)
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1, US2, etc.)
- Todas las tareas incluyen rutas exactas de archivo

## Path Conventions

- Aplicación de una sola página en la raíz del repositorio.
- Código en `src/`, pruebas en `tests/`, documentos en `specs/003-purchasing-ux-improvements/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificar la base y preparar infraestructura compartida sin cambiar reglas ni modelo.

- [x] T001 Verificar la línea base ejecutando `npm test -- --run`, `npm run build` y `npm run lint` desde `package.json`; registrar el total de pruebas de 001/002 antes de empezar.
- [x] T002 [P] Agregar contenedores globales vacíos `#side-panel`, `#toast-region` y `#confirm-dialog` en `index.html`, sin lógica todavía.
- [x] T003 [P] Crear `src/ui-icons.js` con un registro de iconos SVG inline reutilizables (`currentColor`, `aria-hidden` por defecto).
- [x] T003a Reemplazar los íconos actuales de la barra lateral y de las acciones (Nuevo, Editar, Eliminar, Buscar y flujo de OC) por los de `src/ui-icons.js` en `index.html`, `src/app.js`, `src/product-catalog.js` y `src/purchase-order-detail.js`.
- [x] T003b Agregar prueba de accesibilidad de iconos en `tests/integration/purchasing-accessibility.test.js`: cada ícono de acción o navegación tiene nombre accesible (`aria-label` o texto visible asociado) y los decorativos usan `aria-hidden="true"`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base compartida que deben usar todas las historias.

**CRITICAL**: Ninguna historia debe comenzar hasta completar esta fase.

- [ ] T004 [P] Agregar tokens y utilidades CSS compartidas en `src/styles.css`: foco visible, `sr-only`, tamaños de icono, z-index de panel/diálogos y contenedores de feedback.
- [ ] T005 [P] Ampliar `tests/helpers/purchasing-app.js` con helpers para abrir/cerrar panel, consultar toasts, resolver confirmaciones y sembrar datos de prueba.
- [ ] T005a [P] Implementar `src/ui-side-panel.js` como componente compartido completo: apertura/cierre, foco atrapado, Esc, retorno de foco, dirty guard API y modo móvil.
- [ ] T005b [P] Implementar `src/ui-feedback.js` como componente compartido de notificaciones y confirmación: `notify`, `confirm`, `aria-live`, `alertdialog`, éxito 5 s y error persistente.
- [ ] T005e Agregar al componente compartido de notificaciones un botón de cierre manual por toast, operable con teclado y con nombre accesible, en `src/ui-feedback.js`.
- [ ] T005c [P] Implementar `src/purchasing-status.js` como componente compartido de etiquetas de estado: texto, clase y badge seguro.
- [ ] T005d [P] Agregar pruebas de contrato de los componentes compartidos en `tests/integration/purchasing-shared-components.test.js` para panel, notificaciones, confirmación, estados e íconos SVG.

**Checkpoint**: Infraestructura y componentes compartidos listos; las historias pueden comenzar.

---

## Phase 3: User Story 1 - Gestionar registros desde listas a ancho completo con panel lateral (Priority: P1) - MVP

**Goal**: Listas de Proveedores, Órdenes de Compra y Productos a ancho completo, con `+ Nuevo` y alta/edición en panel lateral accesible.

**Independent Test**: Abrir cada lista, crear y editar un registro desde el panel, guardar, cerrar con Esc, comprobar retorno de foco y comportamiento en viewport estrecho.

### Tests for User Story 1

- [ ] T006 [P] [US1] Escribir pruebas de integración para listas a ancho completo, `+ Nuevo` y acciones de fila en `tests/integration/purchasing-lists-panel.test.js`.
- [ ] T007 [P] [US1] Escribir pruebas de integración para apertura/cierre del panel, foco inicial, Esc, retorno de foco y dirty guard en `tests/integration/purchasing-side-panel.test.js`.
- [ ] T008 [P] [US1] Escribir pruebas de integración para secciones, grilla de dos columnas, obligatorios y errores bajo el campo en `tests/integration/purchasing-forms-panel.test.js`.
- [ ] T008a [US1] Agregar aserciones de accesibilidad en `tests/integration/purchasing-side-panel.test.js` y `tests/integration/purchasing-forms-panel.test.js`: Tab/Shift+Tab, foco visible, Esc cierra el panel y devuelve el foco.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Integrar el componente compartido `src/ui-side-panel.js` con los formularios de Proveedores, Órdenes y Productos, incluyendo backdrop y restauración de foco al cerrar.
- [ ] T010 [P] [US1] Extraer los formularios de proveedor, orden y producto a elementos `<template>` en `index.html`, conservando IDs, campos y validaciones existentes.
- [ ] T011 [US1] Implementar la estructura base de `src/purchasing-list-view.js` para renderizar listas a ancho completo, botón `+ Nuevo`, filas y acciones ver/editar/eliminar.
- [ ] T012 [US1] Refactorizar `src/app.js` para usar `src/ui-side-panel.js` y `src/purchasing-list-view.js` en Proveedores y Órdenes de Compra, conservando guardado y validaciones actuales.
- [ ] T013 [US1] Refactorizar `src/product-catalog.js` para usar el panel lateral y la lista compartida, conservando el CRUD y las validaciones actuales.
- [ ] T014 [US1] Agregar estilos de panel, formularios en dos columnas, listas a ancho completo y panel a pantalla completa en móvil en `src/styles.css`.
- [ ] T015 [US1] Integrar detección de cambios sin guardar, valores iniciales y foco de origen en `src/app.js` y `src/product-catalog.js`.
- [ ] T016 [P] [US1] Actualizar las pruebas de entidades para abrir el panel antes de interactuar con el formulario en `tests/integration/create-entity.test.js` y `tests/integration/edit-delete-entity.test.js`.
- [ ] T017 [P] [US1] Actualizar las pruebas de órdenes para abrir el panel antes de interactuar con el formulario en `tests/integration/add-document.test.js`, `tests/integration/manage-document.test.js`, `tests/integration/purchase-order-flow.test.js`, `tests/integration/purchase-order-lines.test.js` y `tests/integration/purchase-order-employee.test.js`.
- [ ] T018 [P] [US1] Actualizar las pruebas de productos para abrir el panel antes de interactuar con el formulario en `tests/integration/product-catalog.test.js`.
- [ ] T019 [US1] Ejecutar y corregir las pruebas específicas de US1 en `tests/integration/purchasing-lists-panel.test.js`, `tests/integration/purchasing-side-panel.test.js` y `tests/integration/purchasing-forms-panel.test.js`.

**Checkpoint**: US1 funcional y verificable de forma independiente.

---

## Phase 4: User Story 2 - Encontrar órdenes mediante tarjetas, filtros y orden (Priority: P1)

**Goal**: Tarjetas navegables con filtros preaplicados y filtros/orden en memoria por cada columna visible.

**Independent Test**: Abrir una lista desde una tarjeta de estado y desde Atrasadas; combinar estado, proveedor y rango de fechas; ordenar por columna; limpiar filtros y verificar que los datos persistidos no cambian.

### Tests for User Story 2

- [ ] T020 [P] [US2] Escribir pruebas unitarias de filtros, rango de fechas inclusivo, orden estable, no mutación y derivaciones en `tests/unit/purchasing-list-query.test.js`.
- [ ] T021 [P] [US2] Escribir pruebas de integración de filtros, orden por columna, `aria-sort`, limpiar filtros y rango inválido en `tests/integration/purchasing-list-controls.test.js`.
- [ ] T022 [P] [US2] Escribir pruebas de integración de tarjetas navegables y filtros preaplicados en `tests/integration/purchasing-dashboard-filters.test.js`.
- [ ] T022a [US2] Agregar aserciones de accesibilidad en `tests/integration/purchasing-list-controls.test.js` y `tests/integration/purchasing-dashboard-filters.test.js`: filtros/orden por teclado, foco visible, activación de tarjetas y `aria-sort`.

### Implementation for User Story 2

- [ ] T023 [P] [US2] Implementar `src/purchasing-list-query.js` con filtros combinables, orden estable, validación de fechas y derivaciones de filas.
- [ ] T024 [US2] Extender `src/purchasing-list-view.js` con controles de filtro, encabezados ordenables, resumen de filtros activos y botón `Limpiar filtros`.
- [ ] T025 [US2] Integrar filtros y orden de Órdenes de Compra en `src/app.js`, incluyendo estado, proveedor, fechas y atrasadas.
- [ ] T026 [US2] Integrar filtros y orden de Proveedores en `src/app.js`, incluyendo categoría y orden por columnas visibles.
- [ ] T027 [US2] Integrar filtros y orden de Productos en `src/product-catalog.js`, incluyendo categoría y orden por columnas visibles.
- [ ] T028 [US2] Convertir tarjetas, desglose por estado y Atrasadas en controles navegables en `src/app.js` e `index.html`; agregar tarjeta de Productos con contador.
- [ ] T029 [US2] Agregar estilos de filtros, orden, resumen de filtros y tarjetas navegables en `src/styles.css`.
- [ ] T030 [US2] Manejar rango de fechas inválido y conservación de filtros activos sin modificar datos en `src/app.js` y `src/purchasing-list-view.js`.
- [ ] T031 [US2] Ejecutar y corregir las pruebas específicas de US2 en `tests/unit/purchasing-list-query.test.js`, `tests/integration/purchasing-list-controls.test.js` y `tests/integration/purchasing-dashboard-filters.test.js`.

**Checkpoint**: US2 funcional sobre la base de US1.

---

## Phase 5: User Story 3 - Recibir retroalimentación clara y evitar acciones destructivas accidentales (Priority: P2)

**Goal**: Toasts de éxito/error no bloqueantes y confirmaciones propias antes de eliminar o cancelar.

**Independent Test**: Guardar, eliminar y cambiar estado; verificar toast de éxito a los 5 s, error persistente y que cancelar una confirmación no altera datos.

### Tests for User Story 3

- [ ] T032 [P] [US3] Escribir pruebas de integración de toasts, auto-cierre a los 5 s, errores persistentes, confirmaciones y retorno de foco en `tests/integration/purchasing-feedback.test.js`.
- [ ] T032a [US3] Agregar aserciones de accesibilidad en `tests/integration/purchasing-feedback.test.js`: confirmación por teclado, Esc cancela, foco visible, retorno de foco y `aria-live`.
- [ ] T032b [US3] Agregar prueba de integración y accesibilidad del cierre manual de toasts con teclado en `tests/integration/purchasing-feedback.test.js`: botón con nombre accesible, foco visible y activación con Enter/Espacio.

### Implementation for User Story 3

- [ ] T033 [P] [US3] Integrar la API del componente compartido `src/ui-feedback.js` con los flujos de US3, ajustando mensajes y confirmaciones sin reimplementar el componente.
- [ ] T033a [US3] Implementar foco atrapado en la ventana de confirmación de `src/ui-feedback.js`: Tab y Shift+Tab no salen de la ventana, Esc la cierra y devuelve el foco al elemento que la abrió.
- [ ] T033b [US3] Agregar prueba de integración de foco atrapado, cierre con Esc y retorno de foco de la confirmación en `tests/integration/purchasing-feedback.test.js`.
- [ ] T034 [US3] Integrar toasts de éxito/error en guardado, eliminación y cambio de estado de `src/app.js`.
- [ ] T035 [US3] Integrar toasts de éxito/error en guardado y eliminación de `src/product-catalog.js`.
- [ ] T036 [US3] Reemplazar `window.confirm` por el diálogo propio en eliminaciones y cancelación de órdenes en `src/app.js` y `src/product-catalog.js`.
- [ ] T037 [US3] Integrar feedback y confirmación en transiciones de estado y acciones del detalle en `src/app.js` y `src/purchase-order-detail.js`.
- [ ] T038 [US3] Agregar estilos de toasts y diálogo de confirmación en `src/styles.css`.
- [ ] T039 [P] [US3] Actualizar las pruebas existentes que simulan `window.confirm` en `tests/integration/edit-delete-entity.test.js`, `tests/integration/manage-document.test.js`, `tests/integration/purchase-order-status.test.js` y `tests/integration/product-catalog.test.js`.
- [ ] T040 [US3] Ejecutar y corregir las pruebas específicas de US3 en `tests/integration/purchasing-feedback.test.js`.

**Checkpoint**: US3 funcional e integrada con US1/US2.

---

## Phase 6: User Story 4 - Comprender estados y comenzar desde listas vacías (Priority: P2)

**Goal**: Badges de estado con texto y color, y estados vacíos diferenciados para "sin registros" y "sin resultados".

**Independent Test**: Revisar órdenes en todos los estados; comprobar texto/color en lista y detalle; abrir listas vacías y filtros sin coincidencias y verificar mensaje/acción correctos.

### Tests for User Story 4

- [ ] T041 [P] [US4] Escribir pruebas unitarias de etiquetas, clases y estados desconocidos en `tests/unit/purchasing-status.test.js`.
- [ ] T042 [P] [US4] Escribir pruebas de integración de badges en lista/detalle/dashboard y estados vacíos diferenciados en `tests/integration/purchasing-status-empty.test.js`.
- [ ] T042a [US4] Agregar aserciones de accesibilidad en `tests/integration/purchasing-status-empty.test.js`: estado con texto y color, acciones de estado vacío por teclado y foco visible.

### Implementation for User Story 4

- [ ] T043 [P] [US4] Integrar el componente compartido `src/purchasing-status.js` con los estados reales de US4 y ajustar sus helpers (`statusLabel`, `statusClass`, `renderStatusBadge`) sin reimplementar el componente.
- [ ] T044 [US4] Aplicar badges compartidos en la lista de órdenes, el detalle y el dashboard en `src/purchasing-list-view.js`, `src/purchase-order-detail.js` y `src/app.js`.
- [ ] T045 [US4] Implementar estados vacíos diferenciados y acciones de crear/limpiar filtros en `src/purchasing-list-view.js`.
- [ ] T046 [US4] Agregar estilos de badges con contraste AA y estados vacíos en `src/styles.css`.
- [ ] T047 [P] [US4] Actualizar las pruebas existentes de badges y dashboard en `tests/integration/dashboard.test.js`, `tests/integration/purchase-order-status.test.js` y `tests/integration/search-entities.test.js`.
- [ ] T048 [US4] Ejecutar y corregir las pruebas específicas de US4 en `tests/unit/purchasing-status.test.js` y `tests/integration/purchasing-status-empty.test.js`.

**Checkpoint**: US4 funcional sobre listas y dashboard.

---

## Phase 7: User Story 5 - Cargar datos de demostración de forma segura (Priority: P2)

**Goal**: Acción de demo aditiva, con confirmación si hay datos, todos los estados y al menos una orden atrasada.

**Independent Test**: Cargar demo en entorno vacío; repetir con datos existentes, cancelar y verificar que nada cambió; aceptar y comprobar que los datos previos siguen intactos.

### Tests for User Story 5

- [ ] T049 [P] [US5] Escribir pruebas unitarias de generación de demo, unicidad de RUT/folio/nombres, estados cubiertos y orden atrasada en `tests/unit/purchasing-demo-data.test.js`.
- [ ] T050 [P] [US5] Escribir pruebas de integración de carga vacía, confirmación con datos existentes, cancelación, éxito y fallo con limpieza en `tests/integration/purchasing-demo-data.test.js`.
- [ ] T050a [US5] Agregar aserciones de accesibilidad en `tests/integration/purchasing-demo-data.test.js`: acción y confirmación por teclado, Esc cancela, foco visible y retorno de foco.

### Implementation for User Story 5

- [ ] T051 [P] [US5] Implementar `src/purchasing-demo-data.js` con dataset determinista, APIs existentes, valores únicos, todos los estados y limpieza best-effort.
- [ ] T052 [US5] Agregar la acción "Cargar datos de demostración" en `index.html` y `src/app.js`.
- [ ] T053 [US5] Integrar confirmación condicional, toasts de éxito/error y refresco de dashboard/listas en `src/app.js`.
- [ ] T054 [US5] Agregar estilos de la acción de demo en `src/styles.css`.
- [ ] T055 [US5] Verificar que la demo no crea claves nuevas ni modifica datos existentes en `src/purchasing-demo-data.js` y `tests/integration/purchasing-demo-data.test.js`.
- [ ] T056 [US5] Ejecutar y corregir las pruebas específicas de US5 en `tests/unit/purchasing-demo-data.test.js` y `tests/integration/purchasing-demo-data.test.js`.

**Checkpoint**: US5 funcional e integrada con feedback/dashboard.

---

## Phase 8: User Story 6 - Usar el módulo con teclado, lector de pantalla y pantallas estrechas (Priority: P3)

**Goal**: Flujo completo operable por teclado, con ARIA, contraste, foco visible y panel a pantalla completa en móvil.

**Independent Test**: Recorrer barra lateral, listas, filtros, panel y confirmaciones solo con teclado; verificar foco visible, Esc, retorno de foco, anuncios y viewport estrecho.

### Tests for User Story 6

- [ ] T057 [P] [US6] Escribir pruebas de integración de navegación por teclado, foco, ARIA, `aria-sort`, `aria-live` y panel a pantalla completa en `tests/integration/purchasing-accessibility.test.js`.
- [ ] T057a [US6] Agregar una prueba transversal de accesibilidad en `tests/integration/purchasing-accessibility.test.js` que recorra las seis historias y verifique teclado, foco visible, Esc y retorno de foco.

### Implementation for User Story 6

- [ ] T058 [US6] Auditar y corregir etiquetas, roles, `aria-required`, `aria-invalid`, `aria-describedby`, `aria-sort`, `aria-pressed` y regiones live en `index.html`, `src/app.js`, `src/purchasing-list-view.js`, `src/ui-side-panel.js` y `src/ui-feedback.js`.
- [ ] T059 [US6] Agregar estilos de foco visible, contraste AA, reducción de movimiento y layout responsive en `src/styles.css`.
- [ ] T060 [US6] Asegurar panel a pantalla completa y acciones de tabla accesibles en viewport estrecho en `src/styles.css` y `src/purchasing-list-view.js`.
- [ ] T061 [US6] Ejecutar y corregir las pruebas específicas de US6 en `tests/integration/purchasing-accessibility.test.js`.

**Checkpoint**: US6 verificada sobre las historias anteriores.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Rendimiento, documentación, limpieza y validación final.

- [ ] T062 [P] Agregar pruebas de rendimiento con 500 proveedores y 2.000 órdenes para lista, filtro/orden y dashboard en `tests/integration/purchasing-performance.test.js`.
- [ ] T063 Optimizar consultas/render si se exceden los presupuestos en `src/purchasing-list-query.js`, `src/purchasing-list-view.js` y `src/app.js`.
- [ ] T064 [P] Actualizar `README.md` con el nuevo flujo de panel, filtros, feedback y datos de demostración.
- [ ] T065 Eliminar markup/CSS obsoleto de formularios inline en `index.html` y `src/styles.css`.
- [ ] T066 Ejecutar la suite completa `npm test -- --run` desde `package.json` y corregir regresiones de 001/002/003.
- [ ] T067 Ejecutar `npm run build` desde `package.json` y corregir errores de construcción.
- [ ] T068 Ejecutar `npm run lint` desde `package.json` y corregir errores de estilo.
- [ ] T069 Ejecutar la validación manual de `specs/003-purchasing-ux-improvements/quickstart.md` en escritorio y viewport estrecho.
- [ ] T070 Verificar explícitamente que no cambiaron claves de `localStorage`, modelo de datos ni transiciones de 002 en `src/storage.js`, `src/purchasing-storage.js` y `src/domain/purchasing.js`.
- [ ] T070a [P] Agregar prueba de no regresión de CRUD de proveedores con validación de RUT en `tests/integration/purchasing-regression-001.test.js`.
- [ ] T070b [P] Agregar prueba de no regresión de líneas de detalle y aprobación de órdenes en `tests/integration/purchasing-regression-002-lines-approval.test.js`.
- [ ] T070c [P] Agregar prueba de no regresión de recepción con actualización de stock en `tests/integration/purchasing-regression-002-receipt.test.js`.
- [ ] T070d Ejecutar `npm test -- --run` y `npm run lint` desde `package.json` después de agregar las pruebas de regresión, sin errores.

---

## Phase 10: Ajustes post-revisión

**Purpose**: Restituir y verificar el diseño de 003 frente a lo implementado en 001, 002 y 004: detalle como vista propia, listas a ancho completo con panel lateral, formularios en dos columnas, categorías separadas en Productos, orden de navegación, permisos en interfaz y servicio y alineación de campos y etiquetas.

**Prerequisites**: Fases 1-9 completadas; 001, 002 y 004 implementados con sus ajustes post-revisión. Si algún módulo de 003 no existe, la tarea se implementa sobre el archivo planificado y se valida al integrarse.

**Nota de precedencia**: Las tareas de esta fase precisan y, en caso de conflicto, prevalecen sobre las tareas anteriores de 003. No se renumera, reordena ni desmarca ninguna tarea existente.

**Tareas existentes que requieren ajuste de texto al ejecutarse** (se listan aquí y no se reescriben en silencio):

- **T010**: al extraer plantillas, conservar solo los campos vigentes de 001/002 y no incluir la creación de categorías dentro del formulario de producto.
- **T011**: la acción «ver» de una OC abre el detalle como vista propia, no un bloque debajo de la lista.
- **T012/T013**: el refactor debe mantener lista a ancho completo, panel lateral y, en Productos, la gestión de Categorías separada del formulario.
- **T017/T018**: las pruebas actualizadas deben cubrir también detalle propio, sección Categorías y campos vigentes.
- **T020/T023/T026**: los filtros de Proveedores operan sobre Rubro(s) y Origen, no sobre el campo de texto `category`.
- **T037/T044**: el detalle y sus acciones deben respetar la vista propia, las denominaciones y los permisos de 004.
- **T051/T052/T053**: la demo crea al menos un empleado por cargo existente y respeta los permisos en sus transiciones y acción.
- **T058**: la auditoría de accesibilidad incluye pestañas de Categorías, detalle propio y controles ocultos fuera del orden de tabulación.
- **T070a/T070b/T070c**: las pruebas de no regresión deben cubrir los campos vigentes de 001/002 y los permisos de 004.

### Tests for Phase 10

- [X] T071 [P] Escribir pruebas de integración del detalle como vista propia en `tests/integration/purchasing-order-detail-view.test.js`: al abrir una OC se oculta la lista y cualquier otra vista, el detalle no queda debajo, "Volver a Órdenes de Compra" restaura lista, filtros, orden y foco, y el detalle inactivo no es accesible.
- [X] T072 [P] Ampliar `tests/integration/purchasing-lists-panel.test.js` para verificar listas a ancho completo, "+ Nuevo" y panel lateral en Proveedores, Solicitudes y Órdenes de Compra y Productos, sin layout de lista y formulario en dos columnas.
- [X] T073 [P] Ampliar `tests/integration/purchasing-forms-panel.test.js` para verificar formularios en dos columnas por secciones, una columna en móvil, campos vigentes de 001/002 y ausencia de campos retirados.
- [X] T074 [P] Escribir pruebas de integración de la sección "Categorías" en Productos en `tests/integration/product-categories.test.js`: listado, alta, edición, eliminación, unicidad sin distinguir mayúsculas, bloqueo por referencia y ausencia de alta de categorías en el formulario de producto.
- [X] T075 [P] Escribir pruebas de integración del orden de la barra lateral en `tests/integration/navigation-order.test.js`: Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda, con visibilidad por rol y sin afectar `aria-current`.
- [X] T076 [P] Escribir pruebas de integración de los permisos de 004 sobre "+ Nuevo", panel lateral, tarjetas, filtros/orden, datos de demostración y detalle en `tests/integration/purchasing-rbac-003.test.js`, incluyendo rechazo en servicio, error persistente y no mutación.
- [X] T077 [P] Ampliar `tests/unit/purchasing-demo-data.test.js` y `tests/integration/purchasing-demo-data.test.js`: al menos un empleado por cargo existente, unicidad y límites de estados según los permisos del rol.
- [X] T078 [P] Escribir pruebas de alineación con 001/002 en `tests/integration/purchasing-post-review-alignment.test.js`: Rubro múltiple y Origen en Proveedores, filtros por Rubro, campos retirados de OC, fecha de emisión automática y etiquetas Rubro/Categoría y Solicitud/Orden emitida.
- [X] T078a [P] Agregar aserciones de accesibilidad de la fase en `tests/integration/purchasing-order-detail-view.test.js`, `tests/integration/product-categories.test.js` y `tests/integration/navigation-order.test.js`: foco al abrir y volver del detalle, pestañas de Categorías con semántica y teclado, y controles ocultos fuera del orden de tabulación.

### Implementation for Phase 10

- [X] T079 Corregir `index.html`, `src/styles.css` y `src/app.js` para que el detalle sea una vista propia: las vistas inactivas DEBEN quedar con `display: none` efectivo, sin apilar el detalle bajo la lista, y abrirse al activar una fila de OC.
- [X] T080 Añadir el botón "Volver a Órdenes de Compra" en `src/purchase-order-detail.js` y su manejador en `src/app.js`, restaurando filtros, orden y foco de la lista.
- [X] T081 Verificar y restituir en `src/purchasing-list-view.js`, `src/app.js`, `src/product-catalog.js`, `index.html` y `src/styles.css` las listas a ancho completo con "+ Nuevo" y el panel lateral, eliminando restos del layout lista/formulario en dos columnas.
- [X] T082 Verificar y restituir las plantillas de formulario en `index.html` y `src/app.js`: dos columnas por secciones, una columna en móvil, campos vigentes de 001/002 y sin campos reintroducidos.
- [X] T083 Implementar la pestaña o sección "Categorías" en la pantalla Productos en `index.html`, `src/product-catalog.js` y `src/styles.css`, y retirar la creación de categorías del formulario de producto, conservando `canManage` de 004.
- [X] T084 Reordenar la barra lateral en `index.html` y ajustar etiquetas y visibilidad en `src/app.js` y `src/module-config.js`: Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda.
- [X] T085 Aplicar los permisos de 004 en `src/ui-side-panel.js`, `src/purchasing-list-view.js`, `src/purchasing-list-query.js`, `src/purchasing-demo-data.js`, `src/purchase-order-detail.js`, `src/app.js` y `src/product-catalog.js`: alta/edición, tarjetas, filtros restringidos, demo, detalle y revalidación en servicio.
- [X] T086 Ajustar los datos de demostración en `src/purchasing-demo-data.js` para crear al menos un empleado por cargo existente, respetar los permisos en las transiciones y mantener unicidad y carga aditiva.
- [X] T087 Alinear filtros y columnas con 001/002 en `src/purchasing-list-query.js`, `src/purchasing-list-view.js`, `src/app.js` y `src/product-catalog.js`: Rubro múltiple con coincidencia OR, Origen, Categoría de producto y ausencia de filtros restringidos por 004.
- [X] T088 Actualizar las pruebas existentes afectadas por el detalle propio, la sección Categorías, el orden de navegación y los campos vigentes en `tests/integration/create-entity.test.js`, `tests/integration/edit-delete-entity.test.js`, `tests/integration/add-document.test.js`, `tests/integration/manage-document.test.js`, `tests/integration/purchase-order-flow.test.js`, `tests/integration/purchase-order-lines.test.js`, `tests/integration/purchase-order-employee.test.js`, `tests/integration/product-catalog.test.js`, `tests/integration/dashboard.test.js` y `tests/integration/search-entities.test.js`.
- [X] T089 Agregar estilos de detalle propio, pestañas de Categorías, panel restituido y foco/contraste en `src/styles.css`.
- [X] T090 Actualizar `README.md` y `specs/003-purchasing-ux-improvements/quickstart.md` con el detalle como vista propia, la sección Categorías, el orden de navegación y los permisos de 004.
- [X] T091 Ejecutar `npm test -- --run`, `npm run build` y `npm run lint` desde `package.json`, corregir regresiones y completar la validación manual de `quickstart.md`.

**Checkpoint**: El diseño de 003 queda restituido y verificado frente a 001/002/004, con detalle propio, categorías separadas, navegación ordenada y permisos aplicados en interfaz y servicio.

---

## Phase 11: Datos de demostración completos

**Purpose**: Completar el conjunto de demostración para que cubra usuarios de prueba por rol, proveedores, productos y órdenes realistas, con sustitución segura y verificación de permisos por cargo.

**Prerequisites**: Fases 1-10 completadas y 004 implementado con su matriz de permisos. La acción "Cargar datos de demostración", la confirmación compartida y el filtro "Solo mis OC" se implementan sobre los módulos existentes sin cambiar claves, estados ni transiciones de 001/002/004.

**Nota de precedencia**: Esta fase implementa FR-075 a FR-089 y, en caso de conflicto, prevalece sobre las tareas y supuestos aditivos de US5 y la Fase 7. No se renumera, reordena ni desmarca ninguna tarea existente. La carga con datos existentes pasa a ser sustitutiva y atómica.

### Tests for Phase 11

- [x] T092 [P] Ampliar `tests/unit/purchasing-demo-data.test.js` para verificar el dataset completo: 8 proveedores ficticios con 6 RUT nacionales válidos por módulo 11 y únicos más 2 extranjeros con identificación tributaria, al menos 3 Rubros con uno multirrubro y al menos 3 condiciones de pago; 5 categorías; 15 productos con unidad de medida y stock variado, al menos 2 en 0 tras las recepciones y al menos 3 valores positivos distintos; 12 órdenes con al menos una por estado, al menos 2 atrasadas, 1 extranjera en USD sin IVA y al menos 3 solicitantes distintos.
- [x] T093 [P] Escribir pruebas unitarias de usuarios de prueba y vínculos en `tests/unit/purchasing-demo-users.test.js`: un usuario activo por cada rol de 004, identificadores estables y únicos, cargo visible alineado con el rol, un empleado propio por usuario sin reutilización por nombre, vínculo reutilizado por el Comprador sin duplicar el empleado y usuarios no de prueba preservados.
- [x] T094 [P] Escribir pruebas de integración de la tabla "Usuarios de prueba" en la pantalla de ingreso en `tests/integration/purchasing-demo-login-table.test.js`: ausente sin datos de demostración, visible con una fila por rol después de cargar, columnas de identificador y cargo, semántica de tabla accesible, sin credenciales y actualizada tras una sustitución.
- [x] T095 [P] Escribir pruebas de integración de la sustitución segura en `tests/integration/purchasing-demo-replace.test.js`: carga sin confirmación en entorno vacío; confirmación con las acciones "Reemplazar por datos de demostración" y "Cancelar" cuando hay datos; Cancelar, Esc y cierre sin mutaciones ni cambios de sesión; reemplazo que elimina proveedores, órdenes, productos, empleados, categorías, rubros y usuarios de prueba previos sin mezclar; conteos exactos y repetibles; fallo inyectado que restaura el conjunto previo y muestra error persistente sin falso éxito.
- [x] T096 [P] Escribir pruebas de integración de ingreso y matriz de permisos por cargo en `tests/integration/purchasing-demo-users-rbac.test.js`: tras cargar la demo con un rol autorizado, cada usuario de prueba puede iniciar sesión y comprobar en administrador, gerente, comprador, bodeguero y consulta las vistas, "+ Nuevo", formularios, acciones de fila, transiciones, impresión y gestión de productos/stock permitidas; además, verificar que las acciones forzadas sin permiso se rechazan sin mutar datos y que el Comprador solo ve sus propias OC con "Solo mis OC".
- [x] T097 [P] Ampliar `tests/unit/purchasing-list-query.test.js` con el filtro "Solo mis OC": coincidencia por empleado propio, combinación con estado, proveedor, rango de entrega y atraso, orden estable, no mutación y resultado vacío cuando el empleado propio no tiene órdenes.
- [x] T098 [P] Escribir pruebas de integración del filtro "Solo mis OC" en `tests/integration/purchasing-my-orders-filter.test.js`: control visible solo para el Comprador, etiqueta y foco accesibles, subconjunto correcto, combinación con los demás filtros, resumen de filtro activo, "Limpiar filtros", ausencia de datos de otros solicitantes y sin cambios persistidos.

### Implementation for Phase 11

- [x] T099 Implementar la creación o actualización de usuarios de prueba y sus vínculos en `src/purchasing-demo-data.js` y `src/auth.js`: un usuario activo por rol de 004 con identificador estable de prueba, cargo igual a la etiqueta del rol y vínculo `id_empleado`/`userId` con su empleado propio; conservar usuarios no de prueba, no crear roles ni claves y preservar el campo de vínculo en la normalización del directorio.
- [x] T100 Implementar el dataset maestro completo y determinista en `src/purchasing-demo-data.js`: 5 categorías, 15 productos con unidad y stock variado, 8 proveedores ficticios (6 nacionales con RUT válido por módulo 11 y únicos, 2 extranjeros), al menos 3 Rubros con uno multirrubro y al menos 3 condiciones de pago; asegurar que al menos 2 productos permanezcan en stock 0 después de las recepciones.
- [x] T101 Implementar las 12 órdenes de demostración en `src/purchasing-demo-data.js` con servicios y transiciones vigentes: distribución en todos los estados, al menos 2 atrasadas, 1 extranjera en USD sin IVA, al menos 3 solicitantes distintos con al menos 3 OC del empleado propio del Comprador y 3 de otros; fechas de emisión automáticas en aprobadas/recibidas, `stock_aplicado` y `appliedAt` en recibidas, y sin fecha de emisión en borrador/pendiente.
- [x] T102 Implementar la sustitución atómica en `src/purchasing-demo-data.js`, `src/storage.js`, `src/purchasing-storage.js` y `src/auth.js`: snapshot y restauración del conjunto previo del módulo y de los usuarios de prueba, borrado sin mezclar, conservación de usuarios no de prueba y de la sesión activa, y conteos exactos y repetibles.
- [x] T103 Integrar la confirmación condicional con las acciones "Reemplazar por datos de demostración" y "Cancelar" en `src/ui-feedback.js`, `src/app.js` e `index.html`, sin mutar nada antes de la decisión, cerrando con Esc y refrescando listas, panel y tabla de ingreso tras el éxito.
- [x] T104 Renderizar la tabla "Usuarios de prueba" en `index.html`, `src/app.js` y `src/styles.css`: caption y encabezados accesibles, filas de identificador y cargo, visible solo con datos de demostración, oculta sin ellos y actualizada tras cargar o reemplazar.
- [x] T105 Implementar el filtro "Solo mis OC" en `index.html`, `src/purchasing-list-query.js`, `src/purchasing-list-view.js` y `src/app.js`: control accesible solo para el Comprador, resolución del empleado propio según 004, combinación con los demás filtros, resumen, "Limpiar filtros" y revalidación sin mutar datos.
- [x] T106 Agregar estilos de la tabla "Usuarios de prueba", la confirmación de reemplazo y el filtro "Solo mis OC" en `src/styles.css`, con foco visible, contraste AA y adaptación a pantallas estrechas.
- [x] T107 Actualizar las pruebas y helpers afectados por la carga sustitutiva en `tests/helpers/purchasing-app.js`, `tests/integration/purchasing-demo-data.test.js`, `tests/integration/purchasing-rbac-003.test.js` y `tests/integration/auth-rbac.test.js`: reemplazar la expectativa aditiva, iniciar sesión con identificadores de prueba, ocultar la acción a roles sin permiso y conservar las pruebas de no regresión de claves, roles y transiciones.
- [x] T108 Ejecutar y corregir las pruebas específicas de la Fase 11 en `tests/unit/purchasing-demo-data.test.js`, `tests/unit/purchasing-demo-users.test.js`, `tests/unit/purchasing-list-query.test.js`, `tests/integration/purchasing-demo-login-table.test.js`, `tests/integration/purchasing-demo-replace.test.js`, `tests/integration/purchasing-demo-users-rbac.test.js` y `tests/integration/purchasing-my-orders-filter.test.js`.
- [x] T109 Actualizar `specs/003-purchasing-ux-improvements/quickstart.md` y `README.md` con el conjunto de demostración completo, los usuarios de prueba por rol, la sustitución segura y el filtro "Solo mis OC".
- [x] T110 Ejecutar `npm test -- --run`, `npm run build` y `npm run lint` desde `package.json`, y corregir regresiones de 001/002/003/004 antes de cerrar la fase.

**Checkpoint**: La demo carga un conjunto completo y coherente, reemplaza sin mezclar, muestra los usuarios de prueba solo cuando corresponde y cada cargo opera únicamente dentro de su matriz de permisos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational.
- **US2 (Phase 4)**: depende de Foundational y de la estructura base de listas de US1.
- **US3 (Phase 5)**: depende de US1 y US2 para acciones de guardar/eliminar/cambiar estado.
- **US4 (Phase 6)**: depende de US1 y US2 para listas/dashboard.
- **US5 (Phase 7)**: depende de US2 (dashboard) y US3 (confirmación/toasts).
- **US6 (Phase 8)**: depende de US1-US5.
- **Polish (Phase 9)**: depende de todas las historias deseadas.
- **Ajustes post-revisión (Phase 10)**: depende de Polish y de 001, 002 y 004 implementados con sus ajustes post-revisión.
- **Datos de demostración completos (Phase 11)**: depende de la Fase 10 y de 004 implementado; reutiliza la confirmación compartida de la Fase 2 y los filtros de la Fase 4, y sustituye la carga aditiva de US5.

### User Story Dependencies

- **US1 (P1)**: independiente tras Foundational; es el MVP.
- **US2 (P1)**: requiere la lista base de US1; no requiere US3-US5.
- **US3 (P2)**: requiere acciones de US1/US2; puede probarse con guardados/eliminaciones existentes.
- **US4 (P2)**: requiere listas de US1/US2; no requiere US3 ni US5.
- **US5 (P2)**: requiere dashboard de US2 y feedback de US3.
- **US6 (P3)**: transversal; valida el conjunto completo.

### Within Each User Story

- Pruebas primero y fallando antes de implementar.
- Módulos compartidos antes de integraciones.
- Implementación core antes de estilos.
- Actualización de pruebas existentes antes de ejecutar la suite específica.
- Completar y validar una historia antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- Setup: T002 y T003 en paralelo.
- Foundational: T004, T005 y T005a-T005c en paralelo; T005d tras T005a-T005c.
- US1: T006-T008 en paralelo; T008a tras T008; T009/T010 en paralelo; T016-T018 en paralelo.
- US2: T020-T022 en paralelo; T022a tras T022; T023 en paralelo con T028; T027 puede ir en paralelo con T025/T026 por archivo distinto.
- US3: T032 en paralelo con T033; T032a tras T032; T039 en paralelo con T034-T038.
- US4: T041/T042 en paralelo; T042a tras T042; T043 en paralelo con T047.
- US5: T049/T050 en paralelo; T050a tras T050; T051 en paralelo con T052; T054 en paralelo con T052/T053.
- US6: T057 en paralelo con T058-T060; T057a tras T057.
- Polish: T062 y T064 en paralelo; T070a-T070c en paralelo; T070d tras T070a-T070c.
- Ajustes post-revisión: T071-T078a en paralelo; T079 antes de T080; T084, T086 y T087 pueden ejecutarse en paralelo solo si no comparten archivo; T088 tras T081-T087; T089-T091 al final.
- Datos de demostración completos: T092-T098 en paralelo; T099 antes de T100/T101; T102 tras T099-T101; T103-T105 en paralelo sobre archivos distintos; T106 tras T103-T105; T107-T109 en paralelo; T110 al final.

---

## Parallel Example: User Story 1

```bash
# Pruebas de US1 en paralelo:
Task: "Escribir pruebas de listas a ancho completo en tests/integration/purchasing-lists-panel.test.js"
Task: "Escribir pruebas del panel lateral en tests/integration/purchasing-side-panel.test.js"
Task: "Escribir pruebas de formularios en tests/integration/purchasing-forms-panel.test.js"

# Implementación base en paralelo:
Task: "Integrar src/ui-side-panel.js"
Task: "Extraer formularios a plantillas en index.html"
```

## Parallel Example: User Story 2

```bash
Task: "Escribir pruebas unitarias de consultas en tests/unit/purchasing-list-query.test.js"
Task: "Escribir pruebas de filtros en tests/integration/purchasing-list-controls.test.js"
Task: "Escribir pruebas de dashboard en tests/integration/purchasing-dashboard-filters.test.js"
```

## Parallel Example: User Story 3

```bash
Task: "Escribir pruebas de feedback en tests/integration/purchasing-feedback.test.js"
Task: "Integrar src/ui-feedback.js"
Task: "Actualizar pruebas de confirmaciones existentes en tests/integration/purchase-order-status.test.js"
```

## Parallel Example: User Story 4

```bash
Task: "Escribir pruebas unitarias de estado en tests/unit/purchasing-status.test.js"
Task: "Escribir pruebas de badges y estados vacíos en tests/integration/purchasing-status-empty.test.js"
Task: "Actualizar pruebas de dashboard en tests/integration/dashboard.test.js"
```

## Parallel Example: User Story 5

```bash
Task: "Escribir pruebas unitarias de demo en tests/unit/purchasing-demo-data.test.js"
Task: "Escribir pruebas de integración de demo en tests/integration/purchasing-demo-data.test.js"
Task: "Implementar src/purchasing-demo-data.js"
```

## Parallel Example: User Story 6

```bash
Task: "Escribir pruebas de accesibilidad en tests/integration/purchasing-accessibility.test.js"
Task: "Agregar estilos de foco/contraste en src/styles.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational.
3. Completar Phase 3: US1.
4. Detenerse y validar US1 con sus pruebas específicas.
5. Demostrar listas a ancho completo y panel lateral funcionando.

### Incremental Delivery

1. Setup + Foundational -> base lista.
2. US1 -> validar y entregar MVP.
3. US2 -> validar filtros/orden/dashboard y entregar.
4. US3 -> validar feedback/confirmaciones y entregar.
5. US4 -> validar badges/estados vacíos y entregar.
6. US5 -> validar demo y entregar.
7. US6 -> validar accesibilidad/responsive y entregar.
8. Polish -> rendimiento, documentación y gates finales.
9. Ajustes post-revisión -> restituir detalle propio, categorías, navegación, permisos y alineación con 001/002/004.
10. Datos de demostración completos -> usuarios de prueba por rol, dataset completo, sustitución atómica y filtro "Solo mis OC".

### Parallel Team Strategy

1. Equipo completa Setup + Foundational.
2. Después de US1:
   - Persona A: US2.
   - Persona B: US3 sobre acciones existentes.
   - Persona C: US4 sobre listas/dashboard.
3. US5 requiere US2+US3; US6 se valida al final.

---

## Notes

- [P] significa archivos distintos y sin dependencia de tareas incompletas.
- [USx] mapea cada tarea a la historia correspondiente.
- Cada historia debe poder validarse con sus pruebas específicas.
- Verificar que las pruebas fallen antes de implementar.
- No cambiar modelo de datos, claves de storage, estados ni transiciones.
- No usar `window.confirm`, `alert` ni `prompt` en la implementación final.
- Ejecutar `npm test -- --run`, `npm run build` y `npm run lint` antes de cerrar.
- Phase 10 no renumera, reordena ni desmarca tareas anteriores; conserva el historial de las fases 1-9.
- Phase 11 no renumera ni desmarca tareas anteriores; la carga con datos existentes es sustitutiva, no aditiva, y los usuarios de prueba no crean roles, cargos ni permisos nuevos.
- El filtro "Solo mis OC" no expone datos de otros solicitantes ni modifica los datos persistidos.
- Ninguna tarea de 003 puede reintroducir campos retirados por 001/002 ni omitir los permisos de 004 en interfaz y servicio.
