# Tasks: Autenticación por User ID y RBAC

**Input**: Documentos de diseño en `specs/004-authentication-rbac/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/auth-rbac.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Incluidas porque la Constitución exige pruebas unitarias para la lógica y de integración para los flujos visibles. Las pruebas de esta funcionalidad se escribieron junto con la implementación y se verificaron contra el comportamiento final.

**Organización**: Las tareas se agrupan por historia de usuario. Los identificadores siguen el orden y la prioridad de `spec.md`. El estado refleja la implementación verificada al 2026-11-08.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo con otras tareas de la misma fase porque usa archivos distintos y no depende de tareas incompletas.
- **[Story]**: Historia de usuario a la que pertenece la tarea: `[US1]`, `[US2]`, `[US3]`, `[US4]` o `[US5]`.
- Cada tarea incluye rutas exactas de archivos del proyecto.

## Path Conventions

- Proyecto único: `src/` y `tests/` en la raíz.
- Documentación de la funcionalidad: `specs/004-authentication-rbac/`.
- Pruebas unitarias: `tests/unit/`.
- Pruebas de integración: `tests/integration/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar los puntos de extensión del arranque y la estructura de pruebas sin implementar comportamiento.

- [x] T001 Revisar el arranque existente en `src/main.js` y `src/app.js` para identificar el punto de entrada de producción y el punto de entrada usado por pruebas.
- [x] T002 [P] Confirmar las claves de persistencia de identidad `erp_auth:users` y `erp_auth:session` y verificar que no colisionan con `erp_base_module:*` ni `erp_purchasing:*`.
- [x] T003 [P] Verificar la línea base de `npm test -- --run`, `npm run build` y `npm run lint` antes de integrar la funcionalidad.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Construir el módulo de autenticación, el directorio, la sesión y el catálogo de permisos que bloquean todas las historias.

**⚠️ CRITICAL**: Ninguna historia se considera completa hasta terminar esta fase.

- [x] T004 Crear `src/auth.js` con las constantes `AUTH_USERS_KEY` y `AUTH_SESSION_KEY`, el catálogo `PERMISSIONS` y las definiciones `ROLE_DEFINITIONS`.
- [x] T005 [P] Implementar en `src/auth.js` `normalizeUserId`, `loadUsers`, `ensureDefaultUsers`, `saveUsers` y `findUser`, incluyendo normalización, validación de formato, siembra de usuarios de demostración y degradación segura ante datos inválidos.
- [x] T006 [P] Implementar en `src/auth.js` `roleDefinition`, `roleLabel`, `permissionsFor` y `can`, con degradación de roles desconocidos a `consulta`.
- [x] T007 Implementar en `src/auth.js` `login`, `getSession`, `clearSession` e `isAuthenticated`, incluyendo re-resolución dinámica del usuario y del rol, invalidación de usuarios inactivos o eliminados y persistencia de la sesión.
- [x] T008 Implementar en `src/auth.js` `transitionPermission` y `canTransitionTo` con el mapeo inicial por estado destino (`pendiente` → envío, `aprobado` → aprobación, `recibido` → recepción, `cancelado` → cancelación); el mapeo explícito por origen y destino se completa en T063 y T063a.
- [x] T009 [P] Escribir pruebas unitarias de login, sesión, normalización, rechazo de usuarios inválidos, cierre de sesión, re-resolución de rol y re-siembra ante un directorio inválido o corrupto en `tests/unit/auth.test.js`.
- [x] T010 [P] Escribir pruebas unitarias de la matriz completa rol-permiso, de la paridad entre `gerente` y `administrador` y del mapeo de transiciones en `tests/unit/auth.test.js`.

**Checkpoint**: El módulo de autenticación y permisos está implementado y probado; las historias pueden comenzar.

---

## Phase 3: User Story 1 - Acceder con User ID y mantener la sesión (Priority: P1) 🎯 MVP

**Goal**: Mostrar la pantalla de acceso sin sesión, autenticar por User ID, restaurar la sesión entre recargas y permitir el cierre de sesión.

**Independent Test**: Abrir la aplicación sin sesión, comprobar la puerta de acceso, ingresar un User ID válido, verificar nombre y rol, recargar, cerrar sesión y comprobar el retorno a la puerta de acceso.

### Tests for User Story 1

- [x] T011 [P] [US1] Escribir pruebas de integración de la puerta de acceso, el error de User ID desconocido y el nombre/rol en la barra superior en `tests/integration/auth-rbac.test.js`.
- [x] T012 [P] [US1] Escribir pruebas de integración de restauración de sesión tras recarga y de cierre de sesión en `tests/integration/auth-rbac.test.js`.

### Implementation for User Story 1

- [x] T013 [US1] Añadir en `index.html` el contenedor `#app-shell` oculto inicialmente, la pantalla `#auth-gate`, el formulario `#login-form`, el campo `#login-user-id`, el error `#login-error` y la lista de ayuda `#login-user-hints`.
- [x] T014 [US1] Añadir en `index.html` la sección de sesión con `#session-info`, `#session-user`, `#session-role` y `#logout-button`.
- [x] T015 [US1] Implementar en `src/app.js` `renderSessionInfo`, `renderLoginHints`, `revealLoginGate`, `hideLoginGate`, `handleLogin`, `handleLogout` y `bindAuthEvents`.
- [x] T016 [US1] Implementar en `src/app.js` el arranque `boot()` que muestra la puerta de acceso sin sesión e inicializa la aplicación con sesión vigente.
- [x] T017 [US1] Integrar `ensureDefaultUsers` y `getSession` en el arranque, y asegurar que la sesión se resuelve al inicializar la aplicación.
- [x] T018 [P] [US1] Añadir en `src/styles.css` los estilos de la pantalla de acceso, la barra de sesión y la utilidad global `[hidden] { display: none !important; }` para que el ocultamiento sea efectivo frente a reglas `display` de componentes.

**Checkpoint**: US1 funciona de forma independiente y constituye el MVP de acceso.

---

## Phase 4: User Story 2 - Ver solo las vistas y acciones permitidas por rol (Priority: P1)

**Goal**: Desplegar la navegación, los formularios, los botones y las acciones de fila según la matriz de permisos.

**Independent Test**: Ingresar con cada usuario de demostración y comprobar que la interfaz visible coincide con la matriz de permisos.

### Tests for User Story 2

- [x] T019 [P] [US2] Escribir pruebas de integración del despliegue del comprador, incluida la ausencia de acciones de aprobación y la presencia de impresión, en `tests/integration/auth-rbac.test.js`.
- [x] T020 [P] [US2] Escribir pruebas de integración del despliegue del bodeguero, incluida la ausencia de proveedores y de formularios de orden, en `tests/integration/auth-rbac.test.js`.
- [x] T021 [P] [US2] Escribir pruebas de integración del despliegue de consulta en modo solo lectura en proveedores y productos en `tests/integration/auth-rbac.test.js`.

### Implementation for User Story 2

- [x] T022 [US2] Definir en `src/app.js` `VIEW_PERMISSIONS`, `canUse`, `canAccessView` y `firstAllowedView`.
- [x] T023 [US2] Implementar en `src/app.js` `applyAccessControl` para ocultar navegación, botones de creación, búsqueda, formularios de proveedor/orden y redirigir a la primera vista permitida.
- [x] T024 [US2] Aplicar el filtrado de acciones de fila de proveedores y órdenes en `src/app.js` según `entities.update`, `entities.delete`, `documents.update` y `documents.delete`.
- [x] T025 [US2] Aplicar el control de acceso en `showView` y en los manejadores de eventos de alta, edición, eliminación y búsqueda en `src/app.js`.
- [x] T026 [P] [US2] Añadir en `src/styles.css` los ajustes necesarios para la barra de sesión y garantizar que todo control oculto por permisos tenga `display: none` efectivo en el estilo computado.

**Checkpoint**: US2 funciona de forma independiente con los cinco usuarios de demostración.

---

## Phase 5: User Story 3 - Ejecutar transiciones de orden según permisos (Priority: P2)

**Goal**: Filtrar las transiciones de estado del detalle de orden por permiso del estado de origen y destino y defender la ejecución en el manejador.

**Independent Test**: Sembrar una orden aprobada, ingresar con comprador, bodeguero y gerente, y comprobar las transiciones visibles y ejecutables.

### Tests for User Story 3

- [x] T027 [P] [US3] Escribir pruebas de integración de las transiciones visibles para comprador (`[]`) y bodeguero (`['recibido']`) en una orden aprobada, y del rechazo de una transición no autorizada sin mutar la orden, en `tests/integration/auth-rbac.test.js`.
- [x] T028 [P] [US3] Escribir pruebas unitarias del mapeo de estados destino a permisos en `tests/unit/auth.test.js`.

### Implementation for User Story 3

- [x] T029 [US3] Implementar en `src/app.js` `allowedNextStatuses` combinando `getAvailableActionItems` del dominio con `transitionPermission` y `canUse`.
- [x] T030 [US3] Propagar `allowedNextStatuses` a `detailOptions` y a `renderDetail` en `src/app.js`.
- [x] T031 [US3] Filtrar las acciones de transición en `src/purchase-order-detail.js` según `options.allowedNextStatuses`.
- [x] T032 [US3] Añadir la guarda de permiso en el manejador `data-action="transition"` de `src/app.js`, impidiendo la ejecución no autorizada y mostrando el mensaje uniforme.

**Checkpoint**: US3 funciona de forma independiente y se integra con el ciclo de vida de `002`.

---

## Phase 6: User Story 4 - Operar en modo solo lectura y gestionar productos según rol (Priority: P2)

**Goal**: Ocultar formularios y acciones de mantenimiento según permisos y ofrecer el catálogo de productos en modo solo lectura cuando corresponda.

**Independent Test**: Ingresar con consulta y comprobar la ausencia de formularios y acciones; ingresar con bodeguero y comprobar la gestión de productos.

### Tests for User Story 4

- [x] T033 [P] [US4] Ampliar las pruebas de integración de consulta para verificar la ausencia de formulario y acciones en productos, la impresión permitida (FR-020) y el rechazo de envío de formulario no autorizado sin mutar datos, en `tests/integration/auth-rbac.test.js`. Se elimina la aserción de rechazo de impresión porque ningún rol carece de `orders.print` en la matriz vigente.
- [x] T034 [P] [US4] Ampliar las pruebas de integración del bodeguero para verificar el formulario y las acciones de producto, y el rechazo de eliminación de línea no autorizada sin mutar la orden, en `tests/integration/auth-rbac.test.js`.

### Implementation for User Story 4

- [x] T035 [US4] Añadir el modo `canManage` a `src/product-catalog.js`, omitiendo formulario, columna de acciones y funciones de alta, edición, eliminación y categoría cuando sea `false`.
- [x] T036 [US4] Propagar `canManage: canUse(PERMISSIONS.PRODUCTS_MANAGE)` desde `src/app.js` al inicializar el catálogo.
- [x] T037 [US4] Añadir `canPrint` y `canEditLines` a `detailOptions` en `src/app.js` y aplicarlos en `src/purchase-order-detail.js`.
- [x] T038 [US4] Añadir guardas de permiso en `src/app.js` para impresión, eliminación de líneas y acciones de orden.
- [x] T039 [P] [US4] Añadir en `src/styles.css` el estilo `.product-grid.single-column` para el catálogo de solo lectura.

**Checkpoint**: US4 funciona de forma independiente y completa la experiencia de los perfiles de solo lectura y bodega.

---

## Phase 7: User Story 5 - Cerrar sesión y volver a la pantalla de acceso (Priority: P3)

**Goal**: Eliminar la sesión persistida y volver a la puerta de acceso, permitiendo el ingreso de otro usuario.

**Independent Test**: Iniciar sesión, cerrar sesión, comprobar que la aplicación se oculta y que un nuevo User ID ingresa con su propio rol.

### Tests for User Story 5

- [x] T040 [P] [US5] Escribir la prueba de integración de cierre de sesión y retorno a la puerta de acceso en `tests/integration/auth-rbac.test.js`.
- [x] T041 [P] [US5] Verificar en pruebas unitarias que `clearSession` elimina la sesión persistida en `tests/unit/auth.test.js`.

### Implementation for User Story 5

- [x] T042 [US5] Implementar `handleLogout` en `src/app.js` para limpiar la sesión, resetear `activeSession` y revelar la puerta de acceso.
- [x] T043 [US5] Conectar `#logout-button` en `bindAuthEvents` y asegurar que el evento se registra una sola vez.

**Checkpoint**: US5 funciona de forma independiente y completa el ciclo de acceso.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar documentación, accesibilidad, compatibilidad y verificación final.

- [x] T044 [P] Revisar la accesibilidad de la pantalla de acceso: foco inicial, `aria-live` para errores, etiquetas y operabilidad por teclado en `index.html` y `src/styles.css`.
- [x] T045 [P] Verificar de forma automatizada que los controles ocultos por permisos tienen `display: none` en el estilo computado y no son accesibles por teclado ni por navegación, inyectando `src/styles.css` en JSDOM.
- [x] T046 [P] Documentar la autenticación, los roles, los usuarios de demostración y las claves de persistencia en `README.md`.
- [x] T047 [P] Verificar que las claves y el esquema de `erp_base_module:*` y `erp_purchasing:*` no cambiaron.
- [x] T048 Ejecutar `npm test -- --run` y confirmar que toda la suite pasa, incluidas las pruebas de autenticación y RBAC.
- [x] T049 Ejecutar `npm run build` y confirmar que termina sin errores.
- [x] T050 Ejecutar `npm run lint` y confirmar que no reporta errores.
- [x] T051 Recorrer los escenarios manuales de `specs/004-authentication-rbac/quickstart.md` con los cinco usuarios de demostración.
- [x] T052 [P] Añadir pruebas de integración del mensaje uniforme y de la no mutación para altas, ediciones y eliminaciones forzadas de proveedores y órdenes en `tests/integration/auth-rbac.test.js`.
- [x] T053 [P] Añadir pruebas de integración del mensaje uniforme y de la no mutación para el mantenimiento de productos sin `products.manage` en `tests/integration/auth-rbac.test.js`.
- [x] T054 Centralizar `PERMISSION_DENIED_MESSAGE` y aplicar feedback uniforme en los guards silenciosos de `src/app.js` y `src/product-catalog.js`.
- [x] T055 [P] Fijar en pruebas unitarias que `comprador` tiene `documents.delete` y no tiene `entities.delete`, alineado con la matriz normativa, en `tests/unit/auth.test.js`.

---

## Phase 9: Ajustes post-revisión

**Purpose**: Incorporar la denominación por estado, la separación entre aprobar y rechazar, el empleado solicitante vinculado, la restricción del límite de crédito y la defensa en servicios, propagando estas reglas a la experiencia de `003`.

**Prerequisites**: Phase 8 completada. La Fase 9 del 004 se ejecuta solo después de completar la implementación del spec 003 (ui-side-panel, ui-feedback, purchasing-list-view, purchasing-list-query, purchasing-status, purchasing-demo-data). No se crean tareas para los módulos de 003 en esta funcionalidad.

### Tests for Phase 9

- [ ] T056 [P] Ampliar `tests/unit/auth.test.js` con `orders.reject`, la matriz de roles y el mapeo explícito por estado de origen y destino (`borrador` → `pendiente` con `orders.submit`; `borrador` → `cancelado` con `orders.cancel`; `pendiente` → `aprobado` con `orders.approve`; `pendiente` → `cancelado` con `orders.reject`; `aprobado` → `recibido` con `orders.receive`).
- [ ] T057 [P] Crear `tests/unit/access-policy.test.js` con las reglas de creación, edición, aprobación, rechazo, cancelación, etiqueta por estado, fecha de emisión, límite de crédito y empleado solicitante, incluido el comportamiento permisivo sin sesión.
- [ ] T058 [P] Crear `tests/integration/auth-rbac-post-review.test.js` con la denominación «Solicitud de compra» / «Orden de Compra emitida» en listas, tarjetas, filtros, panel lateral, detalle, impresión y notificaciones, y con la fecha de emisión tras aprobar.
- [ ] T059 [P] Añadir pruebas de integración de que el `comprador` no ve ni ejecuta aprobar o rechazar, y de que sus intentos forzados se rechazan sin mutar estado, historial ni stock.
- [ ] T060 [P] Añadir pruebas de integración del empleado solicitante: asignación automática y de solo lectura para `comprador` con vínculo por `userId`, creación de un empleado nuevo con nombre y cargo del Usuario cuando falta el vínculo, un solo empleado propio por comprador y como máximo un usuario por empleado, selección manual para `administrador`/`gerente` y rechazo de payload manipulado.
- [ ] T060a [P] Añadir una prueba de integración de que dos compradores con el mismo nombre obtienen empleados distintos vinculados por `userId`, y de que no se reutiliza un empleado por coincidencia de nombre ni se vincula un mismo empleado a dos usuarios, en `tests/integration/auth-rbac-post-review.test.js`.
- [ ] T061 [P] Añadir pruebas de integración del límite de crédito: oculto para `comprador` en formulario, listas, tarjetas, filtros, detalle, búsqueda, impresión y notificaciones; conservación del valor persistido y rechazo de cambios.
- [ ] T062 [P] Añadir pruebas de integración de las superficies de `003` (`+ Nuevo`, panel lateral, tarjetas, filtros y detalle) y del feedback persistente sin falsos éxitos.
- [ ] T062a [P] Añadir una prueba de integración para `administrador` y `gerente` que verifique la navegación visible, los formularios permitidos, la aprobación y el rechazo de una solicitud `pendiente`, y la selección del empleado solicitante, en `tests/integration/auth-rbac-post-review.test.js`.

### Implementation for Phase 9

- [ ] T063 Añadir `ORDERS_REJECT: 'orders.reject'` a `PERMISSIONS`, incluirlo en `gerente` (el `administrador` lo hereda de `Object.values(PERMISSIONS)`) y hacer que `transitionPermission` y `canTransitionTo` reciban el estado de origen en `src/auth.js`, con el mapeo explícito `borrador` → `pendiente` = `orders.submit`, `borrador` → `cancelado` = `orders.cancel`, `pendiente` → `aprobado` = `orders.approve`, `pendiente` → `cancelado` = `orders.reject` y `aprobado` → `recibido` = `orders.receive`.
- [ ] T063a Migrar TODAS las llamadas a `transitionPermission` y `canTransitionTo` en `src/` a la firma con estado de origen y destino, sin dejar ninguna con la forma antigua de solo destino; actualizar las pruebas existentes de transiciones (T028 y relacionadas) a la nueva firma y comprobar que no queda ninguna invocación con la forma antigua.
- [ ] T063b Añadir una prueba de regresión en `tests/unit/auth.test.js` que verifique, sobre `transitionPermission` y `canTransitionTo`, que (a) el `comprador` NO puede ejecutar `pendiente` → `cancelado`; (b) `gerente` y `administrador` SÍ pueden ejecutarla; (c) el `comprador` SÍ puede ejecutar `borrador` → `cancelado`; y (d) una llamada sin estado de origen es rechazada.
- [ ] T064 Crear `src/access-policy.js` con `documentLabel`, `canCreateDocument`, `canEditDocument`, `canApprove`, `canReject`, `canCancel`, `canViewCreditLimit`, `sanitizeEntityPayload`, `ensureRequesterEmployee`, `resolveRequesterForSave` y `emissionDateFor`.
- [ ] T065 Añadir en `index.html` los puntos de extensión para la etiqueta de documento, la fecha de emisión, el empleado de solo lectura y el contenedor de feedback persistente, conservando los identificadores existentes.
- [ ] T066 Integrar en `src/app.js` la etiqueta por estado, la fecha de emisión, el empleado de solo lectura para `comprador`, la selección manual para `administrador`/`gerente` y el ocultamiento efectivo del límite de crédito.
- [ ] T066a Actualizar `src/purchase-order-detail.js` para mostrar «Solicitud de compra» u «Orden de Compra emitida» según el estado, la fecha de emisión automática («Sin emitir» si no está aprobada), el empleado solicitante, ocultar el límite de crédito al `comprador` y renderizar solo las acciones permitidas para el rol.
- [ ] T066b Actualizar `src/purchase-order-print.js` para mostrar «Solicitud de compra» u «Orden de Compra emitida» según el estado, la fecha de emisión automática («Sin emitir» si no está aprobada), el empleado solicitante, ocultar el límite de crédito al `comprador` y mostrar solo las acciones permitidas para el rol.
- [ ] T067 Añadir en `src/storage.js` la guarda de servicio que conserva `creditLimit` y rechaza con `PERMISSION_DENIED` un payload del `comprador` que intente crearlo o modificarlo, sin mutar el proveedor.
- [ ] T068 Añadir en `src/purchasing-storage.js` las guardas de servicio para altas, ediciones, aprobación, rechazo y cancelación según el estado actual, incluida la asignación forzada del empleado propio y el completado de `startDate` solo cuando falte.
- [ ] T069 Implementar en `src/app.js` y en el módulo de feedback de `003` la notificación persistente de error, sin cierre del panel, sin descarte de datos y sin notificación de éxito ante rechazos.
- [ ] T070 Integrar las reglas en `src/ui-side-panel.js`, `src/purchasing-list-view.js`, `src/purchasing-list-query.js` y `src/purchasing-demo-data.js`: visibilidad de «+ Nuevo», apertura del panel, tarjetas navegables, filtros/columnas restringidos y datos de demostración sin aprobaciones no autorizadas.
- [ ] T071 [P] Añadir en `src/styles.css` los estilos de la etiqueta por estado, el dato de empleado de solo lectura y el ocultamiento efectivo del límite de crédito y de las acciones restringidas.
- [ ] T072 [P] Actualizar `README.md` y `specs/004-authentication-rbac/quickstart.md` con la denominación por estado, los nuevos permisos, el empleado solicitante y el límite de crédito restringido.
- [ ] T073 Ejecutar `npm test -- --run`, `npm run build` y `npm run lint`, recorrer los escenarios post-revisión de `quickstart.md` con los cinco usuarios de demostración e incluir una prueba automatizada que mida con `performance.now()` la resolución de sesión y permisos y verifique ≤ 50 ms como promedio de 100 ejecuciones sobre el volumen de prueba definido (500 proveedores y 2.000 órdenes).

**Checkpoint**: Los ajustes post-revisión se aplican de forma coherente en interfaz y servicios, con pruebas unitarias, de integración, build y lint correctos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y bloquea las historias.
- **User Stories (Phase 3-7)**: dependen de Foundational.
  - **US1**: puede iniciar inmediatamente después de Foundational.
  - **US2**: requiere US1 para que exista una sesión y una puerta de acceso.
  - **US3**: requiere US2 para el despliegue del detalle y el modelo de permisos.
  - **US4**: requiere US2 para el control de formularios y acciones.
  - **US5**: requiere US1 para la sesión activa.
- **Polish (Phase 8)**: depende de todas las historias.
- **Ajustes post-revisión (Phase 9)**: depende de Polish. La Fase 9 del 004 se ejecuta solo después de completar la implementación del spec 003 (ui-side-panel, ui-feedback, purchasing-list-view, purchasing-list-query, purchasing-status, purchasing-demo-data).

### User Story Dependencies

- **US1 (P1)**: independiente; es el MVP y habilita el resto.
- **US2 (P1)**: requiere US1 para autenticarse y aplicar permisos.
- **US3 (P2)**: requiere US2 y el ciclo de vida de `002`.
- **US4 (P2)**: requiere US2 y los módulos de vista existentes.
- **US5 (P3)**: requiere US1.

### Within Each User Story

- Las pruebas se escribieron junto con la implementación y se ejecutaron contra el comportamiento final.
- El módulo de autenticación se implementó antes de la integración en `app.js`.
- La integración en `app.js` se completó antes de los ajustes de estilos.
- La verificación de pruebas, build y lint se realizó al cierre.
- En Phase 9, las pruebas T056-T062a se escriben antes de la implementación T063-T071; T063a se ejecuta junto con T063, T063b se ejecuta después de T063a sobre el mismo archivo de pruebas, T066a y T066b junto con T066, y la verificación T073 se ejecuta al final.

### Parallel Opportunities

- Foundational: T005 y T006; T009 y T010.
- US1: T011 y T012; T018 puede ejecutarse con T013-T017.
- US2: T019, T020 y T021.
- US3: T027 y T028.
- US4: T033 y T034; T039 puede ejecutarse con T035-T038.
- US5: T040 y T041.
- Polish: T044, T045, T046 y T047.
- Ajustes post-revisión: T056-T062a en paralelo; T071 y T072 pueden ejecutarse con T063-T070 si no tocan los mismos archivos; T063a se ejecuta junto con T063, T063b se ejecuta después de T063a y T066a/T066b junto con T066.

---

## Parallel Example: Foundational

```text
Task: "Implementar normalización, carga y siembra en src/auth.js"
Task: "Implementar resolución de roles y permisos en src/auth.js"
Task: "Escribir pruebas unitarias de login y sesión en tests/unit/auth.test.js"
Task: "Escribir pruebas unitarias de la matriz de permisos en tests/unit/auth.test.js"
```

## Parallel Example: User Story 1

```text
Task: "Añadir la puerta de acceso y la sección de sesión en index.html"
Task: "Añadir estilos de acceso, sesión y [hidden] en src/styles.css"
Task: "Escribir pruebas de integración del flujo de login en tests/integration/auth-rbac.test.js"
```

## Parallel Example: User Story 2

```text
Task: "Pruebas del despliegue del comprador en tests/integration/auth-rbac.test.js"
Task: "Pruebas del despliegue del bodeguero en tests/integration/auth-rbac.test.js"
Task: "Pruebas del despliegue de consulta en tests/integration/auth-rbac.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Foundational.
2. Completar US1: puerta de acceso, login, restauración y cierre de sesión.
3. Ejecutar `npm test -- --run` y validar el escenario de US1 de `quickstart.md`.
4. Demostrar el MVP antes de continuar.

### Incremental Delivery

1. Foundational + US1 → acceso por User ID y sesión.
2. Añadir US2 → despliegue de vistas y acciones por rol.
3. Añadir US3 → transiciones de orden autorizadas.
4. Añadir US4 → solo lectura y gestión de productos.
5. Añadir US5 → cierre de sesión.
6. Polish → documentación, accesibilidad y verificación completa.
7. Ajustes post-revisión → denominación por estado, aprobación/rechazo, empleado solicitante, límite de crédito y defensa en servicios.

### Parallel Team Strategy

1. Completar Setup + Foundational en conjunto.
2. Después de Foundational:
   - Persona A: US1 y la integración de arranque.
   - Persona B: pruebas de US2 sin modificar archivos de US1.
3. Después de US2:
   - Persona A: US3.
   - Persona B: US4.
   - Persona C: US5 y documentación.
4. Integrar y ejecutar Polish al final.

---

## Notes

- Las pruebas son obligatorias por la Constitución y el plan.
- Lint y formato son obligatorios; el cierre exige `npm run lint` sin errores además de `npm test -- --run` y `npm run build`.
- No se modifica el esquema de `BASE_FIELDS.document` ni las claves de `001`/`002`.
- El acceso completo de `initApp()` sin sesión es intencional para compatibilidad de pruebas; `boot()` es el punto de entrada de producción.
- No se incluye administración visual de usuarios ni recuperación de credenciales.
- Evitar tareas que toquen el mismo archivo en paralelo.
- Phase 9 no renumera ni reordena tareas existentes y conserva sus marcas de completado.
- La Fase 9 del 004 se ejecuta solo después de completar la implementación del spec 003 (ui-side-panel, ui-feedback, purchasing-list-view, purchasing-list-query, purchasing-status, purchasing-demo-data); no se crean tareas para esos módulos.
- Toda operación rechazada por permisos debe mostrar error persistente y no registrar historial ni transacciones.
