# Tareas: Módulo de Compras y Adquisiciones (ERP)

**Entidad**: Proveedor | **Documento**: Orden de Compra
**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [research.md](research.md), [quickstart.md](quickstart.md), [contracts/entity-storage.md](contracts/entity-storage.md)
**Restricción clave**: SC-008 — la adaptación a Compras se hace por configuración (`src/module-config.js`) y puntos de extensión (`src/domain/purchasing.js`, componentes nuevos). Ninguna tarea debe modificar archivos centrales del módulo base para adaptar Compras.

## Formato: `[ID] [P?] [Historia] Descripción`

- `T###` es correlativo en todo el documento.
- `[P]` solo cuando el archivo es distinto y no depende de una tarea pendiente.
- `[USn]` indica la historia de usuario cubierta (no se usa en Setup, Fundacional ni Pulido).
- Cada tarea indica entre paréntesis los FR, XR o SC que cubre.

---

## Fase 1: Setup (Estructura del Proyecto y Configuración Inicial)

**Propósito**: Inicializar la estructura Vite y el entorno de pruebas compartido.

- [ ] T001 Crear la estructura Vite con `src/`, `tests/unit/`, `tests/integration/` y `tests/setup/` según la estructura del proyecto de plan.md (SC-006, SC-008)
- [ ] T002 [P] Configurar Vite y Vitest con jsdom en `package.json` y `vitest.config.mjs` (SC-006)
- [ ] T003 [P] Configurar el entorno de pruebas compartido en `tests/setup/` (SC-006)

**Checkpoint**: La aplicación base arranca con `npm run dev` y las pruebas se ejecutan con `npm test`.

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Crear el modelo de datos base, la persistencia, la carga de ModuleConfig y la sanitización de las que dependen todas las historias.

- [ ] T004 Crear el modelo de datos de Entity con los campos base de data-model.md en `src/storage.js` (FR-001, FR-002, FR-007, FR-022, XR-001, XR-004)
- [ ] T005 Crear el modelo de datos de Document con los campos base de data-model.md en `src/storage.js` (FR-008, FR-009, FR-022, XR-004)
- [ ] T006 Implementar la persistencia en localStorage, CRUD y eliminación en cascada entidad→documentos en `src/storage.js` (FR-007, FR-009, FR-022, XR-004)
- [ ] T007 Implementar el cargador de ModuleConfig con valores predeterminados, validación y reporte de errores en `src/module-config.js` (FR-023, FR-024, FR-025, XR-002, XR-005)
- [ ] T008 Configurar el módulo de Compras en `src/module-config.js`: `moduleName`, etiquetas Proveedor/Orden de Compra, `statusLifecycle` y `theme.accentColor` (FR-029, FR-038, XR-002, XR-005)
- [ ] T009 Implementar normalización de texto y sanitización XSS antes de renderizar en `src/storage.js` (FR-006, SC-006, XR-001)
- [ ] T010 Crear el esqueleto de arranque en `src/main.js` y `src/app.js`, cargar ModuleConfig y aplicar tokens base en `src/styles.css` (FR-023, XR-002, XR-005)
- [ ] T011 [P] Añadir pruebas unitarias de modelos, persistencia y cascada en `tests/unit/storage.test.js` (FR-001, FR-002, FR-003, FR-007, FR-008, FR-009, XR-004)
- [ ] T012 [P] Añadir pruebas unitarias de carga/validación de configuración y sanitización en `tests/unit/module-config.test.js` (FR-023, FR-024, FR-025, XR-002, XR-005)

**Checkpoint**: Los modelos persisten en localStorage, ModuleConfig carga con valores seguros y todo texto se sanitiza antes de insertarse en el DOM.

---

## Fase 3: Historia de Usuario 13 — Marco de espacio de trabajo ERP con marca (Prioridad: P1)

**Objetivo**: Envolver cada pantalla en un marco ERP persistente con barra superior de marca, barra lateral de módulos, resaltado activo y contracción responsiva.

**Prueba Independiente**: En cada pantalla, una barra superior muestra un logotipo derivado del nombre del módulo junto al nombre del módulo, una barra lateral ofrece botones de módulo para Panel, Entidades, Documentos y Buscar con el módulo activo resaltado visualmente, y navegar entre módulos nunca pierde datos.

### Pruebas para la Historia de Usuario 13

- [ ] T013 [P] [US13] Añadir prueba del Escenario 1: la barra superior muestra logotipo SVG derivado del nombre y el nombre del módulo en `tests/integration/workspace-shell.test.js` (FR-036, SC-009)
- [ ] T014 [P] [US13] Añadir prueba del Escenario 2: la barra lateral muestra los botones Panel, Entidades, Documentos y Buscar con etiquetas configuradas en `tests/integration/workspace-shell.test.js` (FR-012, FR-029)
- [ ] T015 [P] [US13] Añadir prueba del Escenario 3: el botón del módulo activo queda resaltado visualmente en `tests/integration/workspace-shell.test.js` (FR-037)
- [ ] T016 [P] [US13] Añadir prueba del Escenario 4: con ventana estrecha la barra lateral se contrae a iconos manteniéndose accesible en `tests/integration/workspace-shell.test.js` (FR-039)
- [ ] T017 [P] [US13] Añadir prueba del Escenario 5: el color de acento configurado se aplica y un valor inválido retrocede al predeterminado en `tests/integration/workspace-shell.test.js` (FR-038)
- [ ] T018 [P] [US13] Añadir prueba del Escenario 6: navegar entre módulos preserva entidades y documentos almacenados en `tests/integration/workspace-shell.test.js` (FR-022, SC-007)

### Implementación de la Historia de Usuario 13

- [ ] T019 [US13] Crear `src/components/shell.js` con barra superior, logotipo monograma SVG, barra lateral, etiquetas configuradas y resaltado activo (FR-011, FR-036, FR-037, XR-002, XR-005)
- [ ] T020 [US13] Implementar el enrutamiento de módulos y la vista de gestión sin lista de entidades en `src/app.js` (FR-013, FR-014, FR-015, FR-016, FR-022)
- [ ] T021 [P] [US13] Añadir estilos de barra superior, barra lateral y tokens de diseño en `src/styles.css` (FR-011, FR-037, XR-005)
- [ ] T022 [US13] Implementar la contracción de la barra lateral a una columna de iconos en `src/styles.css` (FR-039)
- [ ] T023 [US13] Aplicar `theme.accentColor` como propiedad personalizada de CSS con retroceso seguro en `src/styles.css` (FR-038, XR-005)

**Checkpoint**: Todas las pantallas se renderizan dentro del marco con marca, con navegación por barra lateral funcional y sin pérdida de datos.

---

## Fase 4: Historia de Usuario 1 — Registrar y mantener proveedores (Prioridad: P1)

**Objetivo**: Permitir registrar, visualizar, editar y eliminar proveedores con validación de campos obligatorios y unicidad de RUT/código.

**Prueba Independiente**: Un agente de compras puede navegar a la pantalla de gestión, crear un nuevo proveedor con sus campos obligatorios, modificar sus datos existentes, eliminar un registro sin documentos vinculados y verificar que los cambios se reflejan inmediatamente en la lista.

### Pruebas para la Historia de Usuario 1

- [ ] T024 [P] [US1] Añadir prueba del Escenario 1: crear un proveedor con RUT/código, razón social y contacto válidos y verlo en el registro maestro en `tests/integration/create-entity.test.js` (FR-001, FR-005)
- [ ] T025 [P] [US1] Añadir prueba del Escenario 2: dejar un campo obligatorio en blanco bloquea el guardado y muestra el mensaje en `tests/integration/create-entity.test.js` (FR-006)
- [ ] T026 [P] [US1] Añadir prueba del Escenario 3: actualizar contacto o dirección guarda los cambios de inmediato en `tests/integration/edit-delete-entity.test.js` (FR-002, FR-007)
- [ ] T027 [P] [US1] Añadir prueba del Escenario 4: RUT o código duplicado se rechaza con alerta de error en `tests/integration/create-entity.test.js` (FR-001, FR-006)
- [ ] T028 [P] [US1] Añadir prueba del Escenario 5: eliminar un proveedor sin órdenes asociadas lo elimina del sistema en `tests/integration/edit-delete-entity.test.js` (FR-003, FR-009)

### Implementación de la Historia de Usuario 1

- [ ] T029 [US1] Implementar la validación específica de Proveedor (campos obligatorios, correo válido y unicidad de código/RUT) en `src/domain/purchasing.js` (FR-001, FR-006, XR-001, XR-003)
- [ ] T030 [US1] Implementar el formulario de Proveedor con etiquetas configuradas en `src/components/entity-form.js` (FR-001, FR-029, XR-002)
- [ ] T031 [US1] Implementar la lista de Proveedores y su estado vacío en `src/components/entity-list.js` (FR-005, FR-022)
- [ ] T032 [US1] Integrar crear y editar Proveedor mediante el punto de extensión en `src/app.js` (FR-001, FR-002, FR-007)
- [ ] T033 [US1] Integrar eliminar Proveedor y la cascada a sus documentos en `src/app.js` (FR-003, FR-009)

**Checkpoint**: El agente de compras puede crear, editar, listar y eliminar proveedores, con validación y unicidad funcionando.

---

## Fase 5: Historia de Usuario 2 — Emitir órdenes de compra asociadas a un proveedor (Prioridad: P1)

**Objetivo**: Permitir crear, editar y eliminar órdenes de compra vinculadas a un proveedor, con folio, empleado, fechas, líneas de detalle y total calculado.

**Prueba Independiente**: Un agente selecciona un proveedor en la pantalla de gestión, crea una OC con número, fecha de emisión y monto, la edita y verifica que queda asociada a ese proveedor.

### Pruebas para la Historia de Usuario 2

- [ ] T034 [P] [US2] Añadir prueba del Escenario 1: crear una OC con proveedor, fecha de emisión y monto la guarda asociada exactamente a ese proveedor en `tests/integration/create-purchase-order.test.js` (FR-008, FR-009)
- [ ] T035 [P] [US2] Añadir prueba del Escenario 2: dejar en blanco el número o el monto impide guardar y explica qué falta en `tests/integration/create-purchase-order.test.js` (FR-006, FR-008)
- [ ] T036 [P] [US2] Añadir prueba del Escenario 3: seleccionar un proveedor muestra los detalles de su OC en la vista de gestión en `tests/integration/create-purchase-order.test.js` (FR-008, FR-018)
- [ ] T037 [P] [US2] Añadir prueba del Escenario 4: una fecha de entrega anterior a la de emisión se rechaza con explicación en `tests/integration/create-purchase-order.test.js` (FR-006, FR-008)
- [ ] T038 [P] [US2] Añadir prueba unitaria del cálculo de total y redondeo a dos decimales a partir de las líneas en `tests/unit/purchasing.test.js` (XR-003)
- [ ] T039 [P] [US2] Añadir prueba unitaria de unicidad de folio, cantidad positiva, costo no negativo y ausencia de líneas duplicadas en `tests/unit/purchasing.test.js` (XR-003)

### Implementación de la Historia de Usuario 2

- [ ] T040 [US2] Crear los modelos de extensión Empleado, Categoría, Producto y Detalle de compra en `src/domain/purchasing.js` (XR-001, XR-004)
- [ ] T041 [US2] Implementar la persistencia de las extensiones en las claves `erp_purchasing:*` desde `src/domain/purchasing.js` (XR-001, XR-004)
- [ ] T042 [US2] Implementar el cálculo de total, validación de folio y reglas de líneas en `src/domain/purchasing.js` (FR-008, FR-009, XR-003)
- [ ] T043 [US2] Implementar la cabecera de Orden de Compra (proveedor, empleado, folio, fechas y estado) en `src/components/document-form.js` (FR-008, FR-018, FR-029)
- [ ] T044 [P] [US2] Implementar los formularios de datos maestros Empleado, Categoría y Producto en `src/components/master-data-form.js` (XR-001, XR-002)
- [ ] T045 [P] [US2] Implementar el editor de líneas de compra (producto, cantidad y costo unitario) en `src/components/purchase-order-lines.js` (FR-008, XR-001)
- [ ] T046 [US2] Integrar crear, editar y eliminar OC con sus líneas mediante el punto de extensión en `src/app.js` (FR-008, FR-018, SC-008)
- [ ] T047 [US2] Implementar la eliminación de líneas al eliminar una orden en `src/domain/purchasing.js` (FR-009, XR-004)

**Checkpoint**: Se pueden gestionar Empleado, Categoría y Producto, y crear/editar/eliminar órdenes con líneas y total correcto asociadas a un proveedor.

---

## Fase 6: Historia de Usuario 3 — Panel de control de compras (Prioridad: P1)

**Objetivo**: Reemplazar la vista de bienvenida por un panel con acciones rápidas y estadísticas en vivo de proveedores y órdenes.

**Prueba Independiente**: El gerente abre la aplicación, ve las tarjetas con el número de proveedores y de OC, y desde una acción rápida abre directamente el formulario de nueva OC.

### Pruebas para la Historia de Usuario 3

- [ ] T048 [P] [US3] Añadir prueba del Escenario 1: el panel muestra acciones rápidas para Nuevo Proveedor, Nueva OC, Gestionar Proveedores y Buscar en `tests/integration/dashboard.test.js` (FR-010, FR-033, FR-021)
- [ ] T049 [P] [US3] Añadir prueba del Escenario 2: las tarjetas muestran el recuento actual de proveedores y OC en `tests/integration/dashboard.test.js` (FR-035, SC-010)
- [ ] T050 [P] [US3] Añadir prueba del Escenario 3: crear o eliminar registros actualiza las estadísticas al volver al panel en `tests/integration/dashboard.test.js` (FR-035, SC-010)
- [ ] T051 [P] [US3] Añadir prueba del Escenario 4: sin registros las tarjetas muestran cero sin errores en `tests/integration/dashboard.test.js` (FR-035, SC-010)

### Implementación de la Historia de Usuario 3

- [ ] T052 [US3] Implementar el panel base con acciones rápidas y tarjetas de estadísticas en `src/components/dashboard.js` (FR-010, FR-033, FR-034, FR-035)
- [ ] T053 [P] [US3] Implementar el panel de indicadores de compras (gasto, estados, entregas, stock) en `src/components/purchasing-dashboard.js` (FR-035, SC-010)
- [ ] T054 [US3] Integrar las acciones rápidas con la gestión/búsqueda y refrescar contadores en `src/app.js` y `src/styles.css` (FR-010, FR-035, SC-010)

**Checkpoint**: La aplicación abre en un panel funcional con acciones rápidas y estadísticas que coinciden con el almacenamiento.

---

## Fase 7: Historia de Usuario 5 — Controlar el ciclo de vida de la orden de compra (Prioridad: P1)

**Objetivo**: Restringir el ciclo de vida de la OC a transiciones válidas, bloquear estados no aprobados y aplicar stock al recibir.

**Prueba Independiente**: Un usuario intenta cambiar una orden de compra en estado “Solicitada” directamente a “Aprobada” o “Recibida”; el sistema bloquea la acción, muestra una alerta explicativa y solo habilita la transición hacia “Cotizada”.

### Pruebas para la Historia de Usuario 5

- [ ] T055 [P] [US5] Añadir prueba del Escenario 1: al editar el estado solo se ofrecen las transiciones válidas en `tests/integration/document-lifecycle.test.js` (FR-030)
- [ ] T056 [P] [US5] Añadir prueba del Escenario 2: forzar Recibida o Cerrada sin aprobación se rechaza con explicación en `tests/integration/document-lifecycle.test.js` (FR-030)
- [ ] T057 [P] [US5] Añadir prueba del Escenario 3: el estado actual de cada OC se destaca con una etiqueta visible en la lista en `tests/integration/document-lifecycle.test.js` (FR-030, FR-037)

### Implementación de la Historia de Usuario 5

- [ ] T058 [US5] Implementar las transiciones de estado y el rechazo de transiciones inválidas en `src/domain/purchasing.js` (FR-030, XR-003)
- [ ] T059 [US5] Implementar el control de estado con solo transiciones válidas en `src/components/document-form.js` (FR-030)
- [ ] T060 [US5] Implementar el aumento de stock al pasar a recibido con marca de aplicación idempotente en `src/domain/purchasing.js` (FR-030, XR-004)
- [ ] T061 [US5] Integrar el modo lectura de órdenes recibidas/canceladas y el estado visible en `src/app.js` (FR-030, FR-031)

**Checkpoint**: Las órdenes solo avanzan por transiciones permitidas, el estado es visible y el stock se aplica exactamente una vez.

---

## Fase 8: Historia de Usuario 7 — Declarar campos personalizados para los registros (Prioridad: P1)

**Objetivo**: Hacer que los campos personalizados declarados fluyan por formularios, validación, persistencia, listas y búsqueda.

**Prueba Independiente**: Un desarrollador declara un campo numérico obligatorio personalizado en las entidades; se muestra como entrada numérica en el formulario, bloquea el guardado cuando está en blanco, muestra los valores guardados en las listas y coincide en las búsquedas.

### Pruebas para la Historia de Usuario 7

- [ ] T062 [P] [US7] Añadir prueba del Escenario 1: un campo numérico obligatorio se muestra como entrada numérica y bloquea el guardado en blanco en `tests/integration/custom-fields.test.js` (FR-026, FR-027)
- [ ] T063 [P] [US7] Añadir prueba del Escenario 2: el valor guardado de un campo personalizado se muestra en lista y detalle en `tests/integration/custom-fields.test.js` (FR-028)
- [ ] T064 [P] [US7] Añadir prueba del Escenario 3: buscar por el valor de un campo personalizado devuelve los registros coincidentes en `tests/integration/custom-fields.test.js` (FR-028)
- [ ] T065 [P] [US7] Añadir prueba del Escenario 4: sin campos personalizados el comportamiento es idéntico al módulo base en `tests/integration/custom-fields.test.js` (FR-024)

### Implementación de la Historia de Usuario 7

- [ ] T066 [US7] Renderizar dinámicamente los campos personalizados declarados en `src/components/entity-form.js` y `src/components/document-form.js` (FR-026, FR-029)
- [ ] T067 [US7] Incluir los campos personalizados en validación y persistencia desde `src/domain/purchasing.js` (FR-027, XR-001, XR-003)
- [ ] T068 [US7] Incluir los campos personalizados en listas, detalle y búsqueda en `src/app.js` (FR-028)
- [ ] T069 [US7] Integrar el retroceso sin configuración y la experiencia base en `src/app.js` (FR-024, FR-026)

**Checkpoint**: Los campos personalizados declarados aparecen, validan, se persisten y se buscan sin cambios en el código central.

---

## Fase 9: Historia de Usuario 4 — Buscar proveedores y fechas de entrega comprometidas (Prioridad: P2)

**Objetivo**: Buscar proveedores por nombre, RUT, categoría o fecha objetivo y mostrar la fecha de un vistazo.

**Prueba Independiente**: El jefe de inventario abre la pantalla de búsqueda desde la barra lateral, busca la categoría “insumos eléctricos” y ve solo los proveedores coincidentes con su fecha objetivo visible.

### Pruebas para la Historia de Usuario 4

- [ ] T070 [P] [US4] Añadir prueba del Escenario 1: buscar por nombre, RUT o categoría muestra solo los proveedores coincidentes en `tests/integration/search-suppliers.test.js` (FR-004, FR-020)
- [ ] T071 [P] [US4] Añadir prueba del Escenario 2: la fecha objetivo de los resultados es identificable de un vistazo en `tests/integration/search-suppliers.test.js` (FR-020)
- [ ] T072 [P] [US4] Añadir prueba del Escenario 3: una búsqueda sin coincidencias muestra un estado vacío claro en `tests/integration/search-suppliers.test.js` (FR-005)
- [ ] T073 [P] [US4] Añadir prueba del Escenario 4: con cientos de proveedores los resultados aparecen sin retraso perceptible en `tests/integration/search-suppliers.test.js` (FR-032, SC-004)

### Implementación de la Historia de Usuario 4

- [ ] T074 [US4] Implementar la búsqueda de proveedores por nombre, RUT, categoría y fecha objetivo en `src/domain/purchasing.js` (FR-004, FR-020, XR-003)
- [ ] T075 [US4] Implementar la interfaz de búsqueda y los resultados en `src/components/entity-list.js` (FR-004, FR-005)
- [ ] T076 [US4] Integrar la búsqueda con el enrutamiento y mostrar la fecha objetivo en `src/app.js` (FR-020)

**Checkpoint**: El jefe de inventario encuentra proveedores por sus datos clave y ve sus fechas en los resultados.

---

## Fase 10: Historia de Usuario 6 — Configurar perfil del módulo de compras (Prioridad: P2) — BLOQUEADA

**Objetivo**: Configurar roles, permisos y límites presupuestarios del módulo de compras.

**Prueba Independiente**: El administrador entra al panel de configuración del módulo, modifica los permisos de un rol (o un parámetro global), guarda los cambios y verifica en la pantalla que los ajustes quedaron registrados correctamente.

**Tareas**: Ninguna. `plan.md` excluye explícitamente "Autenticación, roles y permisos" y `spec.md` no asigna FR a esta historia. No se inventan tareas hasta resolver la contradicción (ver Dudas abiertas D3).

**Checkpoint**: No aplica hasta que se decida si la historia se implementa o se retira del spec.

---

## Fase 11: Historia de Usuario 8 — Buscar y encontrar entidades rápidamente (Prioridad: P2)

**Objetivo**: Permitir buscar y filtrar proveedores rápidamente con estado vacío y buen rendimiento.

**Prueba Independiente**: Un usuario puede introducir un término de búsqueda y ver solo las entidades coincidentes.

### Pruebas para la Historia de Usuario 8

- [ ] T077 [P] [US8] Añadir prueba del Escenario 1: buscar con un término coincidente muestra solo las entidades coincidentes en `tests/integration/search-entities.test.js` (FR-004, FR-005)
- [ ] T078 [P] [US8] Añadir prueba del Escenario 2: una búsqueda sin coincidencias muestra un estado vacío claro y permite reintentar en `tests/integration/search-entities.test.js` (FR-005)
- [ ] T079 [P] [US8] Añadir prueba del Escenario 3: con cientos de entidades los resultados aparecen con prontitud en `tests/integration/search-entities.test.js` (FR-032, SC-004)

### Implementación de la Historia de Usuario 8

- [ ] T080 [US8] Implementar el filtrado de búsqueda normalizado en `src/storage.js` (FR-004, XR-003)
- [ ] T081 [US8] Integrar el renderizado de resultados y el estado vacío en `src/components/entity-list.js` y `src/app.js` (FR-005, FR-022)

**Checkpoint**: La búsqueda de proveedores es rápida, coherente y muestra un estado vacío claro.

---

## Fase 12: Historia de Usuario 9 — Registrar una fecha objetivo (Prioridad: P2)

**Objetivo**: Permitir adjuntar una fecha objetivo opcional a un proveedor y mostrarla en la lista.

**Prueba Independiente**: Un usuario puede fijar una fecha en una entidad y verla mostrada en la lista.

### Pruebas para la Historia de Usuario 9

- [ ] T082 [P] [US9] Añadir prueba del Escenario 1: introducir una fecha objetivo la guarda y la muestra en la lista en `tests/integration/target-date.test.js` (FR-020)
- [ ] T083 [P] [US9] Añadir prueba del Escenario 2: las entidades con fecha son identificables de un vistazo en `tests/integration/target-date.test.js` (FR-020)
- [ ] T084 [P] [US9] Añadir prueba del Escenario 3: dejar la fecha en blanco guarda la entidad sin fecha en `tests/integration/target-date.test.js` (FR-020)

### Implementación de la Historia de Usuario 9

- [ ] T085 [US9] Implementar la validación y persistencia de `targetDate` como fecha opcional válida en `src/storage.js` (FR-020)
- [ ] T086 [US9] Añadir la entrada de fecha objetivo al formulario en `src/components/entity-form.js` (FR-020)
- [ ] T087 [US9] Mostrar la fecha objetivo en la lista de proveedores en `src/components/entity-list.js` (FR-020)

**Checkpoint**: La fecha objetivo se guarda opcionalmente y se distingue en la lista.

---

## Fase 13: Historia de Usuario 10 — Registrar los detalles de documentos de una entidad (Prioridad: P2)

**Objetivo**: Registrar detalles de documentos vinculados a un proveedor y eliminarlos en cascada.

**Prueba Independiente**: Un usuario puede añadir un documento a una entidad y ver los detalles del documento mostrados junto a esa entidad.

### Pruebas para la Historia de Usuario 10

- [ ] T088 [P] [US10] Añadir prueba del Escenario 1: añadir un documento con detalles lo guarda asociado a esa entidad en `tests/integration/add-document.test.js` (FR-008, FR-009)
- [ ] T089 [P] [US10] Añadir prueba del Escenario 2: seleccionar la entidad muestra los detalles de su documento en `tests/integration/manage-document.test.js` (FR-008)
- [ ] T090 [P] [US10] Añadir prueba del Escenario 3: eliminar la entidad elimina sus documentos asociados en `tests/integration/manage-document.test.js` (FR-009)
- [ ] T091 [P] [US10] Añadir prueba del Escenario 4: la información obligatoria vacía impide guardar y explica qué falta en `tests/integration/manage-document.test.js` (FR-006, FR-008)

### Implementación de la Historia de Usuario 10

- [ ] T092 [US10] Implementar el modelo y la validación de documentos vinculados en `src/storage.js` (FR-008, XR-004)
- [ ] T093 [US10] Implementar el formulario y la lista de documentos en `src/components/document-form.js` (FR-008, FR-005)
- [ ] T094 [US10] Integrar crear, editar, eliminar y la cascada en `src/app.js` (FR-009)

**Checkpoint**: Los documentos quedan vinculados a su proveedor y desaparecen en cascada al eliminarlo.

---

## Fase 14: Historia de Usuario 11 — Buscar entidades en una pantalla dedicada (Prioridad: P2)

**Objetivo**: Proporcionar una pantalla de búsqueda dedicada accesible desde la barra lateral o una acción rápida.

**Prueba Independiente**: Un usuario puede abrir la pantalla de búsqueda desde la barra lateral o una acción rápida, introducir un término de búsqueda y ver solo las entidades coincidentes.

### Pruebas para la Historia de Usuario 11

- [ ] T095 [P] [US11] Añadir prueba del Escenario 1: un término coincidente muestra solo las entidades coincidentes en `tests/integration/search-screen.test.js` (FR-019, FR-004)
- [ ] T096 [P] [US11] Añadir prueba del Escenario 2: una búsqueda sin coincidencias muestra un estado vacío claro en `tests/integration/search-screen.test.js` (FR-005, FR-019)
- [ ] T097 [P] [US11] Añadir prueba del Escenario 3: con cientos de entidades los resultados aparecen con prontitud en `tests/integration/search-screen.test.js` (FR-032, SC-004)
- [ ] T098 [P] [US11] Añadir prueba del Escenario 4: el botón Panel de la barra lateral vuelve al panel desde la búsqueda en `tests/integration/search-screen.test.js` (FR-015, FR-019)

### Implementación de la Historia de Usuario 11

- [ ] T099 [US11] Implementar la vista de búsqueda dedicada y su enrutamiento desde la barra lateral y la acción rápida en `src/app.js` (FR-019, FR-021, SC-008)
- [ ] T100 [US11] Integrar la búsqueda, el estado vacío y el retorno al panel en `src/app.js` (FR-005, FR-019)

**Checkpoint**: Existe una pantalla de búsqueda dedicada que se abre desde la barra lateral y desde el panel.

---

## Fase 15: Historia de Usuario 12 — Configurar el ciclo de vida de estados de documentos (Prioridad: P2)

**Objetivo**: Aplicar los estados y transiciones configurados en los documentos y mantener el estado de texto libre cuando no hay configuración.

**Prueba Independiente**: Un desarrollador configura un ciclo de vida cotización→pedido→facturado; el control de estado ofrece solo estados siguientes válidos, las transiciones inválidas se rechazan con una explicación, y el estado es visible de un vistazo en las listas.

### Pruebas para la Historia de Usuario 12

- [ ] T101 [P] [US12] Añadir prueba del Escenario 1: solo se ofrecen los estados alcanzables por transiciones permitidas en `tests/integration/configurable-lifecycle.test.js` (FR-030)
- [ ] T102 [P] [US12] Añadir prueba del Escenario 2: una transición inválida enviada por cualquier vía se rechaza con explicación en `tests/integration/configurable-lifecycle.test.js` (FR-030)
- [ ] T103 [P] [US12] Añadir prueba del Escenario 3: el estado actual es identificable de un vistazo en listas y detalles en `tests/integration/configurable-lifecycle.test.js` (FR-030)
- [ ] T104 [P] [US12] Añadir prueba del Escenario 4: sin ciclo de vida configurado el estado permanece como texto libre en `tests/integration/configurable-lifecycle.test.js` (FR-031)

### Implementación de la Historia de Usuario 12

- [ ] T105 [US12] Validar y aplicar `statusLifecycle` desde la configuración en `src/module-config.js` y `src/domain/purchasing.js` (FR-030, FR-031, XR-002)
- [ ] T106 [US12] Implementar las opciones de estado y el retroceso a texto libre en `src/components/document-form.js` (FR-030, FR-031)

**Checkpoint**: El ciclo de vida configurado se aplica de extremo a extremo y sin configuración el estado es texto libre.

---

## Fase 16: Pulido y Preocupaciones Transversales

**Propósito**: Accesibilidad, rendimiento con 500 registros, documentación y regresión.

- [ ] T107 [P] Añadir refinamientos de accesibilidad (etiquetas, foco de teclado, `aria-current` y estructura semántica) en `src/components/shell.js` y `src/styles.css` (SC-009, XR-002)
- [ ] T108 Verificar y ajustar el rendimiento con 500 proveedores y 500 órdenes sin bloqueos en `src/components/entity-list.js` y `src/components/purchase-order-lines.js` (FR-032, SC-004)
- [ ] T109 Verificar la sanitización XSS de nombres, descripciones y notas en todos los componentes (SC-006)
- [ ] T110 Actualizar `README.md` con el módulo de Compras, el marco, el panel y la configuración (SC-006)
- [ ] T111 Ejecutar la suite completa de pruebas y corregir regresiones (SC-006)
- [ ] T112 Ejecutar la compilación de producción con Vite y verificar que no hay errores (SC-006)
- [ ] T113 Probar manualmente los flujos principales de proveedor, orden, recepción y búsqueda (SC-003, SC-005)

**Checkpoint**: La suite y la compilación pasan, la aplicación es accesible y responsiva con 500 registros, y la documentación está actualizada.

---

## Dependencias y Orden de Ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias.
- **Fase 2 (Fundacional)**: depende de Fase 1.
- **Fase 3 (US13)**: depende de Fase 2; se recomienda completarla antes de las interfaces de US1/US2 para que todas las pantallas nazcan dentro del marco.
- **Fase 4 (US1)**: depende de Fases 2 y 3.
- **Fase 5 (US2)**: depende de Fase 4 (necesita proveedores) y de Fase 2; incluye los datos maestros de la extensión.
- **Fase 6 (US3)**: depende de Fase 3 y de Fases 4-5 para los contadores.
- **Fase 7 (US5)**: depende de Fase 5 (órdenes) y de la configuración de estado de Fase 2.
- **Fase 8 (US7)**: depende de Fase 2; el spec la vincula al perfil de configuración (ver Dudas abiertas D7).
- **Fase 9 (US4)**: depende de Fase 4 y de Fase 11 (lógica de búsqueda); puede adelantarse si T080 se hace antes.
- **Fase 10 (US6)**: bloqueada por contradicción entre plan y spec.
- **Fase 11 (US8)**: depende de Fase 4.
- **Fase 12 (US9)**: depende de Fase 4.
- **Fase 13 (US10)**: depende de Fases 4 y 5.
- **Fase 14 (US11)**: depende de Fase 11 (búsqueda) y Fase 6 (acción rápida/panel).
- **Fase 15 (US12)**: depende de Fase 2 (configuración) y Fase 5 (documentos).
- **Fase 16 (Pulido)**: depende de que las historias implementadas estén completas.

### Dependencias entre historias

- US1 → US2 (el proveedor es prerequisito de la orden).
- US2 → US5 (el ciclo de vida opera sobre órdenes con líneas).
- US5 → US12 (el ciclo configurable formaliza el ciclo de vida de US5).
- US1/US2 → US3 (las estadísticas leen proveedores y órdenes).
- US4/US8 → US11 (la pantalla dedicada reutiliza la lógica de búsqueda).
- US7 depende del perfil de configuración según el spec; ver D7.
- US6 queda bloqueada y no bloquea al resto porque no tiene FR asociados.

### Ejemplos de tareas que se pueden ejecutar en paralelo

- T002 y T003 (configuración de Vite y entorno de pruebas).
- T011 y T012 (pruebas unitarias de almacenamiento y configuración).
- T013-T018 (pruebas de US13) entre sí.
- T024-T028 (pruebas de US1) entre sí.
- T040, T044 y T045 (modelos de extensión, formularios maestros y editor de líneas).
- T052 y T053 (panel base y panel de indicadores de compras).
- T070-T073 (pruebas de búsqueda de proveedores) entre sí.
- T077-T079 y T095-T098 (pruebas de búsqueda) entre sí.
- T107, T109 y T110 (accesibilidad, verificación XSS y documentación) antes de T111-T113.

### Estrategia MVP

Completar **Fases 1, 2, 3, 4, 5, 6 y 7** para la primera versión usable:

1. Setup y fundacional (T001-T012).
2. Marco ERP (T013-T023).
3. Proveedores (T024-T033).
4. Órdenes de compra con líneas y total (T034-T047).
5. Panel con acciones rápidas y estadísticas (T048-T054).
6. Ciclo de vida con recepción y stock (T055-T061).

Con esto ya se puede crear un proveedor, emitir una orden con líneas, ver su total, avanzar su estado y consultar el panel. Las fases P2 (US4, US8, US9, US10, US11, US12) y el pulido se añaden después. US6 queda fuera del MVP por estar bloqueada.

### Tabla de cobertura de FR

| FR | Tareas que lo cubren | Estado |
|---|---|---|
| FR-001 | T004, T024, T029, T030, T032 | Cubierto |
| FR-002 | T004, T026, T032 | Cubierto |
| FR-003 | T028, T033 | Cubierto |
| FR-004 | T070, T074, T075, T077, T080, T095 | Cubierto |
| FR-005 | T024, T031, T072, T075, T078, T081, T096, T100 | Cubierto |
| FR-006 | T009, T025, T027, T029, T035, T037, T091, T109 | Cubierto |
| FR-007 | T004, T006, T026, T032 | Cubierto |
| FR-008 | T005, T034-T047, T088-T094 | Cubierto |
| FR-009 | T005, T006, T028, T034, T042, T047, T088, T090, T094 | Cubierto |
| FR-010 | T048, T052, T054 | Cubierto |
| FR-011 | T019, T021 | Cubierto |
| FR-012 | T014, T019 | Cubierto |
| FR-013 | T020 | Cubierto |
| FR-014 | T020 | Cubierto |
| FR-015 | T020, T098 | Cubierto |
| FR-016 | T020 | Cubierto |
| FR-017 | T032, T033 | Cubierto |
| FR-018 | T036, T043, T046 | Cubierto |
| FR-019 | T095, T099, T100 | Cubierto |
| FR-020 | T070-T076, T082-T087 | Cubierto |
| FR-021 | T048, T099 | Cubierto |
| FR-022 | T006, T018, T031, T081 | Cubierto |
| FR-023 | T007, T010, T012 | Cubierto |
| FR-024 | T007, T012, T065, T069 | Cubierto |
| FR-025 | T007, T012 | Cubierto |
| FR-026 | T062, T066, T069 | Cubierto |
| FR-027 | T062, T067 | Cubierto |
| FR-028 | T063, T064, T068 | Cubierto |
| FR-029 | T008, T014, T019, T030, T043, T066 | Cubierto |
| FR-030 | T055-T061, T101-T106 | Cubierto |
| FR-031 | T061, T104, T106 | Cubierto |
| FR-032 | T073, T079, T097, T108 | Cubierto |
| FR-033 | T048, T052 | Cubierto |
| FR-034 | T048, T052 | Cubierto |
| FR-035 | T049, T050, T051, T053, T054 | Cubierto |
| FR-036 | T013, T019 | Cubierto |
| FR-037 | T015, T019, T021, T057 | Cubierto |
| FR-038 | T017, T023 | Cubierto |
| FR-039 | T016, T022 | Cubierto |

**FR sin tarea**: ninguno (no se usa ⚠️ en esta tabla). Advertencia: FR-016, FR-029 y FR-031 dependen de decisiones registradas en Dudas abiertas, aunque tienen tareas asignadas.

### Cobertura de XR y SC

- **XR-001**: T004, T029, T040, T041, T044, T045, T067.
- **XR-002**: T007, T008, T010, T012, T019, T030, T044, T105, T107.
- **XR-003**: T029, T038, T039, T042, T058, T067, T074, T080.
- **XR-004**: T004, T005, T006, T011, T040, T041, T047, T060, T092.
- **XR-005**: T007, T008, T010, T019, T021, T023.
- **SC-001**: T024, T032. **SC-002**: T070, T077. **SC-003**: T113. **SC-004**: T073, T079, T097, T108. **SC-005**: T113. **SC-006**: T001-T003, T009, T109-T112. **SC-007**: T018. **SC-008**: T001, T046, T099. **SC-009**: T013, T107. **SC-010**: T049-T054.

---

## Dudas Abiertas

1. **Conflicto de merge en el spec**: `spec.md:339-344` contiene marcadores `<<<<<<< HEAD`, `=======`, `>>>>>>>` y duplica el supuesto de sanitización XSS. Debe resolverse antes de implementar.
2. **Alcance spec vs plan**: `spec.md` describe el módulo base ERP; `plan.md` describe el módulo de Adquisiciones y Compras. Las tareas siguen el plan para Compras, pero el spec no ha sido reescrito para ese alcance.
3. **US6 (roles/permisos)**: `spec.md:97-110` exige configurar roles, permisos y límites, pero `plan.md:54` excluye "Autenticación, roles y permisos". La Fase 10 queda sin tareas hasta decidir si se implementa o se retira del spec.
4. **Campos de la Orden de Compra**: los escenarios de US2 hablan de "número, fecha de emisión y monto"; `plan.md:120-125` y `data-model.md:131-141` usan folio, empleado, líneas y total. Las tareas implementan el modelo del plan.
5. **Fecha de entrega**: US4 dice buscar proveedores por "fecha de entrega comprometida" y `spec.md:272` por `targetDate`; `plan.md:123` ubica `fecha_entrega` en la orden y `plan.md:76` marca `targetDate` como sin uso. Las tareas cubren búsqueda por `targetDate` en proveedores y entrega en la orden, pero la semántica debe confirmarse.
6. **Fecha objetivo del proveedor (US9)**: `plan.md:76` la declara opcional y sin uso en Compras, mientras `spec.md:146-157` la exige. Las tareas de la Fase 12 la implementan; confirmar si aplica a Proveedor.
7. **Dependencia de US7**: el spec dice que depende del "perfil de configuración (Historia de Usuario 5)", pero en `spec.md` la US5 es el ciclo de vida y el perfil es la US6 (bloqueada). Las tareas de US7 usan el cargador fundacional de ModuleConfig.
8. **Ciclo de vida**: `spec.md:83-87` usa Solicitada/Cotizada/Aprovada/Recibida/Cerrada; `plan.md:196-205` usa borrador/pendiente/aprobado/recibido/cancelado; `data-model.md:45` usa borrador/pendiente/aprobado/cancelado; `spec.md:200` ejemplifica cotización→pedido→facturado. Las tareas usan el ciclo del plan como configuración inicial; debe elegirse uno canónico.
9. **Entidades del MER sin historia**: Empleado, Categoría, Producto y Detalle de compra no tienen historia de usuario en `spec.md`. Se agruparon en US2 y el stock en US5; confirmar el mapeo.
10. **Campo de stock aplicado**: `plan.md:165` exige registrar internamente si el stock ya fue aplicado, pero `data-model.md` no define ese campo. Las tareas no inventan el nombre; se requiere definirlo en el modelo de datos.
11. **Tipo de identificadores**: `data-model.md:115-141` usa PK `int` para las entidades del MER, mientras `plan.md:84-138` usa `string` generado automáticamente. Las tareas siguen el plan; confirmar el tipo definitivo.
12. **Unicidad de folio**: `plan.md:163,335` decide unicidad global; `data-model.md:34` y el MER la describen por serie. Las tareas usan la regla global del plan.
13. **Subtotal de línea**: `data-model.md:141` incluye `subtotal` en Detalle de compra; `plan.md:140` lo declara derivado y no persistido. Las tareas usan el criterio del plan.
14. **`index.html`**: la estructura de `plan.md:228-250` no lo incluye, pero Vite requiere un punto de entrada HTML. Las tareas renderizan desde componentes en `src/app.js`; confirmar si existe `index.html` en la raíz.
15. **Etiquetas de pantallas extendidas**: FR-029 exige que todas las etiquetas visibles provengan de la configuración, pero `ModuleConfig` en `data-model.md:53-59` no define etiquetas para Empleado, Categoría, Producto ni Detalle. Confirmar si se amplía `labels` (requiere cambio de contrato) o se acepta texto fijo.
16. **Campos personalizados en Compras**: `plan.md:210` declara que no se usan `customFields`, pero `spec.md:114-127` exige la capacidad. Las tareas de US7 implementan la capacidad base; confirmar que no se necesita declarar campos personalizados concretos para Compras.
17. **Sanitización sin FR explícito**: el requisito XSS aparece en Suposiciones (`spec.md:340`) y en `plan.md:22,312`, pero no tiene FR propio. Las tareas lo trazan a SC-006/XR-001; confirmar la trazabilidad deseada.
18. **Estado del repositorio**: las tareas anteriores figuraban todas como completadas, pero no existe `src/` y no hay archivos de `src/` rastreados en git. Esta lista asume una implementación desde cero o una restauración previa del código.
