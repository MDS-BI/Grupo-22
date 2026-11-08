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
- [x] T008 Implementar en `src/auth.js` `transitionPermission` y `canTransitionTo` con el mapeo `pendiente` → envío, `aprobado` → aprobación, `recibido` → recepción y `cancelado` → cancelación.
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
- [x] T018 [P] [US1] Añadir en `src/styles.css` los estilos de la pantalla de acceso, la barra de sesión y la utilidad `[hidden]`.

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
- [x] T026 [P] [US2] Añadir en `src/styles.css` los ajustes necesarios para la barra de sesión y los controles ocultos.

**Checkpoint**: US2 funciona de forma independiente con los cinco usuarios de demostración.

---

## Phase 5: User Story 3 - Ejecutar transiciones de orden según permisos (Priority: P2)

**Goal**: Filtrar las transiciones de estado del detalle de orden por permiso del estado destino y defender la ejecución en el manejador.

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

- [x] T033 [P] [US4] Ampliar las pruebas de integración de consulta para verificar la ausencia de formulario y acciones en productos, y el rechazo de impresión y envío de formulario no autorizados sin mutar datos, en `tests/integration/auth-rbac.test.js`.
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
- [x] T045 [P] Verificar que los controles ocultos por permisos no son accesibles por teclado ni por navegación.
- [x] T046 [P] Documentar la autenticación, los roles, los usuarios de demostración y las claves de persistencia en `README.md`.
- [x] T047 [P] Verificar que las claves y el esquema de `erp_base_module:*` y `erp_purchasing:*` no cambiaron.
- [x] T048 Ejecutar `npm test -- --run` y confirmar que las 205 pruebas pasan, incluidas las 24 de autenticación y RBAC.
- [x] T049 Ejecutar `npm run build` y confirmar que termina sin errores.
- [x] T050 Ejecutar `npm run lint` y confirmar que no reporta errores.
- [x] T051 Recorrer los escenarios manuales de `specs/004-authentication-rbac/quickstart.md` con los cinco usuarios de demostración.

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

### Parallel Opportunities

- Foundational: T005 y T006; T009 y T010.
- US1: T011 y T012; T018 puede ejecutarse con T013-T017.
- US2: T019, T020 y T021.
- US3: T027 y T028.
- US4: T033 y T034; T039 puede ejecutarse con T035-T038.
- US5: T040 y T041.
- Polish: T044, T045, T046 y T047.

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
