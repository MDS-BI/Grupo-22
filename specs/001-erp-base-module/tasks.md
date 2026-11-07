# Tareas: Módulo de Compras y Adquisiciones (ERP)

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [research.md](research.md), [quickstart.md](quickstart.md), [contracts/entity-storage.md](contracts/entity-storage.md)

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/

**Pruebas**: Obligatorias por la Constitución II (Test-First & Verification). Las pruebas de cada historia se escriben primero y deben fallar antes de la implementación.

**Restricción clave**: SC-008 — la adaptación a Compras se realiza mediante `src/module-config.js` y puntos de extensión (`src/domain/purchasing.js`, componentes nuevos). No se modifican archivos centrales del módulo base para adaptar Compras.

**Alcance**: exactamente las 6 historias de usuario de `spec.md` (HU1–HU6). No se generan fases ni tareas para historias adicionales.

## Formato: `[ID] [P?] [Historia] Descripción`

- `T###` es correlativo en todo el documento.
- `[P]` solo cuando la tarea usa archivos distintos y no depende de otra tarea pendiente.
- `[USn]` indica la historia de usuario cubierta (no se usa en Setup, Fundacional ni Pulido).
- Cada tarea indica entre paréntesis los FR, XR o SC que cubre.

## Orden obligatorio de prioridades

1. Fase 1: Setup.
2. Fase 2: Fundacional (capacidades heredadas).
3. Fases 3–6: historias P1 en orden HU1 → HU2 → HU3 → HU6.
4. Fases 7–8: historias P2 en orden HU4 → HU5.
5. Fase 9: Pulido.

---

## Fase 1: Setup (Estructura del Proyecto y Configuración Inicial)

**Propósito**: Inicializar la estructura Vite, el entorno de pruebas y las herramientas de calidad compartidas.

- [ ] T001 Completar la estructura Vite con `index.html`, `src/main.js`, `src/app.js`, `src/styles.css`, `src/storage.js`, `src/module-config.js`, `src/domain/`, `src/components/`, `tests/unit/`, `tests/integration/` y `tests/setup/` según `plan.md` (SC-006, SC-008)
- [ ] T002 [P] Configurar Vite, Vitest, jsdom y scripts `dev`, `build`, `preview`, `test` en `package.json` y `vitest.config.mjs` (SC-006)
- [ ] T003 [P] Crear el entorno compartido de pruebas con DOM, `localStorage`, alertas y helpers de arranque en `tests/setup/dom.js` (SC-006)
- [ ] T004 Configurar linting y formato con scripts de verificación en `package.json`, `eslint.config.js` y `.prettierrc` (SC-006)
- [ ] T005 Auditar la suite heredada, reescribir o retirar pruebas de Entidad/Documento que contradigan el spec de 6 HU y eliminar casos de historias fuera del alcance en `tests/unit/` y `tests/integration/` (SC-006, SC-008)

**Checkpoint**: La aplicación arranca con `npm run dev`, la suite se ejecuta con `npm test` y no quedan pruebas de historias fuera del alcance.

---

## Fase 2: Fundacional (Capacidades Heredadas y Prerrequisitos Bloqueantes)

**Propósito**: Crear el almacenamiento base, la carga de ModuleConfig, la sanitización, los campos personalizados y el marco de navegación de los que dependen las 6 historias.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede comenzar hasta completar esta fase.

- [ ] T006 Implementar el almacenamiento base de entidades con `id`, `entity_id`, marcas de tiempo, CRUD y valores extendidos en `src/storage.js` (FR-054, FR-055, XR-001, XR-004)
- [ ] T007 Implementar el almacenamiento base de documentos vinculados por `entity_id`, CRUD y cascada entidad→documentos en `src/storage.js` (FR-054, FR-055, XR-004)
- [ ] T008 Crear el adaptador de almacenamiento para las claves `erp_purchasing:employees`, `erp_purchasing:categories`, `erp_purchasing:products` y `erp_purchasing:purchase-order-lines` en `src/storage.js` (FR-055, XR-001, XR-004)
- [ ] T009 Implementar el cargador de ModuleConfig con precedencia (configuración válida de Compras → defaults integrados de Compras), validación, reporte de errores y retroceso seguro en `src/module-config.js` (FR-047, FR-048, FR-049, FR-056, XR-002)
- [ ] T010 Implementar normalización de texto para búsqueda (mayúsculas, tildes y RUT) y utilidades de escape XSS en `src/storage.js` (FR-033, FR-058, XR-003)
- [ ] T011 Implementar la normalización y validación de definiciones `customFields` (target, key, label, type, required, options) en `src/module-config.js` y `src/storage.js` (FR-057, XR-001)
- [ ] T012 Crear el arranque de la aplicación, la carga de configuración y la aplicación de tokens de tema en `src/main.js`, `src/app.js` y `src/styles.css` (FR-056, FR-058, XR-002, XR-005)
- [ ] T013 Implementar el marco del espacio de trabajo con barra superior de marca, logotipo derivado, barra lateral y navegación activa en `src/components/shell.js` (FR-052, FR-053, XR-005)
- [ ] T014 Implementar la contracción responsiva de la barra lateral a una columna de iconos operables en `src/styles.css` (FR-059)
- [ ] T015 [P] Crear el renderizador reutilizable de campos personalizados para formularios, validación, listas y búsqueda en `src/components/custom-fields.js` (FR-057, XR-001)
- [ ] T016 [P] Añadir pruebas de almacenamiento base, cascada y claves de extensión en `tests/unit/storage.test.js` (FR-054, FR-055, XR-004)
- [ ] T017 [P] Añadir pruebas de carga/validación de configuración, normalización, sanitización XSS y campos personalizados en `tests/unit/module-config.test.js` y `tests/unit/text-utils.test.js` (FR-048, FR-049, FR-056, FR-057, FR-058, XR-001, XR-002)
- [ ] T018 [P] Añadir pruebas del marco, navegación sin pérdida de datos, barra lateral responsiva y etiquetas base en `tests/integration/workspace-shell.test.js` (FR-052, FR-053, FR-054, FR-059)
- [ ] T019 Registrar el hook de limpieza en cascada de líneas al eliminar una orden en `src/app.js` (FR-003, FR-017, XR-004)

**Checkpoint**: Los datos persisten, ModuleConfig carga con valores seguros, los campos personalizados se validan y renderizan, todo texto se escapa y toda pantalla nace dentro del marco navegable.

---

## Fase 3: Historia de Usuario 1 — Registrar y mantener proveedores (Prioridad: P1) 🎯 MVP

**Objetivo**: Permitir crear, editar, listar y eliminar proveedores con nombre, RUT normalizado y validado por módulo 11, categoría, condición de pago y unicidad de RUT.

**Prueba Independiente**: Un agente de compras crea un proveedor con nombre, RUT válido, categoría y condición de pago, lo edita, lo elimina y comprueba que sus órdenes y líneas asociadas desaparecen en cascada.

### Pruebas para la Historia de Usuario 1

> **NOTA: Escribir estas pruebas primero y verificar que fallan antes de implementar.**

- [ ] T020 [P] [US1] Añadir prueba de normalización de RUT con puntos, espacios, letra minúscula y K, y validación módulo 11 válida/inválida en `tests/unit/purchasing.test.js` (FR-005)
- [ ] T021 [P] [US1] Añadir prueba de RUT inválido, RUT duplicado, categoría vacía y condición de pago vacía rechazados; proveedor válido guardado y retroalimentación de error en `tests/integration/suppliers.test.js` (FR-001, FR-004, FR-005, FR-006, FR-007)
- [ ] T022 [US1] Añadir prueba de rechazo de RUT duplicado tras normalizar formatos distintos en `tests/integration/suppliers.test.js` (FR-006)
- [ ] T023 [US1] Añadir prueba de creación, edición, listado y selección de proveedores con etiquetas configuradas en `tests/integration/suppliers.test.js` (FR-001, FR-002, FR-008)
- [ ] T024 [US1] Añadir prueba de eliminación de proveedor con órdenes y líneas asociadas en cascada en `tests/integration/suppliers.test.js` (FR-003)

### Implementación para la Historia de Usuario 1

- [ ] T025 [US1] Implementar `normalizeRut`, validación módulo 11 (incluida K) y validaciones de nombre, categoría y condición de pago; incluir aserciones de RUT inválido, RUT duplicado, categoría vacía y condición de pago vacía rechazados, y proveedor válido guardado en `src/domain/purchasing.js` (FR-004, FR-005, FR-006, FR-007)
- [ ] T026 [US1] Implementar la persistencia de proveedores usando el campo base `code` como RUT etiquetado "RUT", junto con `name`, `category` y `paymentTerms`, con verificación de RUT único, en `src/domain/purchasing.js` (FR-001, FR-006, XR-004)
- [ ] T027 [US1] Implementar el formulario de proveedor con campos obligatorios, modo crear/editar y errores junto al campo en `src/components/entity-form.js` (FR-001, FR-002, FR-004, FR-007)
- [ ] T028 [US1] Implementar la lista de proveedores, selección, acciones de editar/eliminar y estado vacío en `src/app.js` (FR-007, FR-008)
- [ ] T029 [US1] Integrar crear, editar y eliminar proveedores, incluida la cascada proveedor→órdenes→líneas, en `src/app.js` (FR-001, FR-002, FR-003, XR-004)
- [ ] T030 [US1] Añadir estilos y mensajes accesibles para el formulario y la lista de proveedores en `src/styles.css` (FR-007)

**Checkpoint**: El agente de compras puede crear, editar, listar y eliminar proveedores; el RUT se normaliza, valida y no se duplica; la cascada elimina órdenes y líneas.

---

## Fase 4: Historia de Usuario 2 — Emitir órdenes de compra con líneas de detalle (Prioridad: P1)

**Objetivo**: Emitir órdenes de compra con folio único global, proveedor, empleado solicitante, fechas y al menos una línea, calculando neto, IVA y total; administrar Empleado, Categoría y Producto como datos maestros de apoyo.

**Prueba Independiente**: Un agente crea una orden con proveedor, empleado, folio, fechas y al menos una línea, verifica que neto, IVA y total son correctos y comprueba que la orden queda asociada al proveedor.

### Pruebas para la Historia de Usuario 2

- [ ] T031 [P] [US2] Añadir prueba de creación de orden con proveedor, empleado, folio, fechas y líneas asociadas en `tests/integration/purchase-orders.test.js` (FR-009, FR-023)
- [ ] T032 [P] [US2] Añadir prueba de folio duplicado, fecha de entrega anterior a emisión y orden sin líneas en `tests/unit/purchasing.test.js` (FR-010, FR-011, FR-012)
- [ ] T033 [US2] Añadir prueba de línea con producto inexistente, cantidad no entera o no positiva, precio negativo y producto duplicado en `tests/unit/purchasing.test.js` (FR-013, FR-018)
- [ ] T034 [US2] Añadir prueba de subtotal derivado no persistido, neto, IVA del 19 %, total redondeado a dos decimales y recálculo al editar en `tests/unit/purchasing.test.js` (FR-014, FR-015, FR-016)
- [ ] T035 [P] [US2] Añadir prueba de CRUD de empleados, categorías y productos, unicidad de categoría y bloqueo de eliminación referenciada en `tests/integration/master-data.test.js` (FR-019, FR-020, FR-021, FR-022)
- [ ] T036 [US2] Añadir prueba de edición de cabecera/líneas con recálculo y de eliminación de orden con sus líneas en `tests/integration/purchase-orders.test.js` (FR-016, FR-017, FR-023)

### Implementación para la Historia de Usuario 2

- [ ] T037 [US2] Implementar modelos y persistencia CRUD de Empleado, Categoría y Producto en `src/domain/purchasing.js` (FR-019, FR-020, FR-021, XR-001, XR-004)
- [ ] T038 [US2] Implementar la persistencia de líneas de compra con clave compuesta orden+producto y rechazo de duplicados en `src/domain/purchasing.js` (FR-009, FR-012, FR-018, XR-001)
- [ ] T039 [US2] Implementar unicidad global de folio, validación de fechas y exigencia de al menos una línea en `src/domain/purchasing.js` (FR-010, FR-011, FR-012)
- [ ] T040 [US2] Implementar validación de líneas y cálculo de subtotal derivado, neto, IVA del 19 %, total y redondeo a dos decimales en `src/domain/purchasing.js` (FR-013, FR-014, FR-015, FR-016)
- [ ] T041 [US2] Implementar el bloqueo de eliminación de empleado, categoría o producto referenciado por una orden en `src/domain/purchasing.js` (FR-022)
- [ ] T042 [P] [US2] Implementar los formularios de Empleado, Categoría y Producto con validaciones y etiquetas configuradas en `src/components/master-data-form.js` (FR-019, FR-020, FR-021)
- [ ] T043 [P] [US2] Implementar la cabecera de orden con proveedor, empleado, folio, fecha de emisión, fecha de entrega y estado en `src/components/document-form.js` (FR-009, FR-023)
- [ ] T044 [P] [US2] Implementar el editor de líneas con producto, cantidad, precio unitario, alta/baja y prevención de duplicados en `src/components/purchase-order-lines.js` (FR-012, FR-013, FR-018)
- [ ] T045 [US2] Renderizar la lista y el detalle de órdenes con proveedor, empleado, fechas, estado, líneas, neto, IVA y total en `src/app.js` (FR-023)
- [ ] T046 [US2] Integrar crear, editar y eliminar órdenes, recálculo de importes y eliminación de líneas en `src/app.js` (FR-016, FR-017, FR-009)
- [ ] T047 [US2] Integrar las pantallas de datos maestros y el bloqueo de borrado referenciado en la navegación en `src/app.js` (FR-019, FR-020, FR-021, FR-022)
- [ ] T048 [US2] Añadir estilos para cabecera de orden, editor de líneas y totales en `src/styles.css` (FR-023)

**Checkpoint**: Se pueden administrar empleados, categorías y productos; crear, editar y eliminar órdenes con líneas; y los importes se recalculan con la regla neto + IVA 19 % = total.

---

## Fase 5: Historia de Usuario 3 — Panel de control de compras (Prioridad: P1)

**Objetivo**: Mostrar el panel de inicio con cuatro acciones rápidas, recuentos de proveedores y órdenes, órdenes por estado y órdenes atrasadas; la acción Buscar abre la búsqueda básica por nombre y RUT.

**Prueba Independiente**: El gerente abre la aplicación, ve las acciones rápidas y los indicadores, usa Buscar para encontrar proveedores por nombre o RUT, y desde cualquier acción rápida abre la pantalla o formulario correspondiente.

### Pruebas para la Historia de Usuario 3

- [ ] T049 [P] [US3] Añadir prueba de acciones rápidas Nuevo Proveedor, Nueva Orden de Compra, Gestionar Proveedores y Buscar, y que Buscar abra la búsqueda básica y filtre por nombre y RUT en `tests/integration/dashboard.test.js` (FR-024, FR-030, FR-031)
- [ ] T050 [US3] Añadir prueba de recuentos de proveedores, órdenes, órdenes por estado y órdenes atrasadas, incluido el estado vacío en cero, en `tests/integration/dashboard.test.js` (FR-025, FR-026, FR-027, FR-028, SC-007, SC-011)
- [ ] T051 [US3] Añadir prueba de actualización de indicadores al volver al panel tras crear, editar, eliminar o cambiar estado en `tests/integration/dashboard.test.js` (FR-029, SC-010)
- [ ] T052 [US3] Añadir prueba de OC atrasada con `fecha_entrega` anterior a la fecha actual local (America/Santiago) y estado distinto de recibido o cancelado; una entrega de hoy no está atrasada, en `tests/integration/dashboard.test.js` (FR-027, SC-011)

### Implementación para la Historia de Usuario 3

- [ ] T053 [P] [US3] Implementar el panel de inicio con las cuatro acciones rápidas y etiquetas configuradas en `src/components/dashboard.js` (FR-024, FR-030)
- [ ] T054 [P] [US3] Implementar los indicadores de compras: recuentos, órdenes por estado y órdenes atrasadas con `fecha_entrega` anterior a la fecha actual local (America/Santiago) y estado distinto de recibido/cancelado, en `src/components/purchasing-dashboard.js` (FR-025, FR-026, FR-027, FR-028)
- [ ] T055 [US3] Implementar la pantalla de búsqueda básica de proveedores por nombre y RUT y su estado vacío en `src/app.js` (FR-030, FR-031)
- [ ] T056 [US3] Integrar el enrutamiento del panel, los manejadores de las cuatro acciones rápidas, incluida Buscar → búsqueda básica por nombre/RUT, y el refresco al mostrar en `src/app.js` (FR-029, FR-030, SC-010)
- [ ] T057 [US3] Añadir estilos de tarjetas, acciones rápidas, estado vacío del panel y búsqueda básica en `src/styles.css` (FR-028)

**Checkpoint**: El panel abre por defecto, muestra cero sin errores, sus indicadores coinciden con el almacenamiento, las cuatro acciones rápidas funcionan y Buscar abre la búsqueda básica por nombre/RUT.

---

## Fase 6: Historia de Usuario 6 — Configuración del módulo de Compras (Prioridad: P1)

**Objetivo**: Configurar nombre, color de acento, etiquetas de todas las entidades y ciclo de vida, aplicándolos en todas las pantallas sin modificar código central.

**Prueba Independiente**: El administrador modifica nombre, color, etiquetas y ciclo de vida, guarda la configuración y verifica que todas las pantallas reflejan los cambios; una configuración inválida se informa y se usan los valores predeterminados.

### Pruebas para la Historia de Usuario 6

- [ ] T058 [P] [US6] Añadir prueba de aplicación del nombre del módulo y color de acento válido tras recargar en `tests/integration/module-config.test.js` (FR-046, FR-050)
- [ ] T059 [P] [US6] Añadir prueba de etiquetas configuradas en barra lateral, pantallas, formularios, listas y mensajes, sin “Entidad” ni “Documento”, en `tests/integration/config-labels.test.js` (FR-046, FR-047, FR-051, SC-012)
- [ ] T060 [P] [US6] Añadir prueba de que el control de estado ofrece solo las transiciones configuradas en `tests/integration/config-lifecycle.test.js` (FR-046, XR-006)
- [ ] T061 [P] [US6] Añadir prueba de configuración ausente, inválida y válida; verificar defaults integrados de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra, aviso visible y que no aparezcan “Entidad” ni “Documento”, en `tests/unit/module-config.test.js` (FR-047, FR-048, FR-049, FR-050)

### Implementación para la Historia de Usuario 6

- [ ] T062 [US6] Definir la configuración completa de Compras en `src/module-config.js`: nombre, etiquetas singular/plural de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra, ciclo de vida estándar y color de acento predeterminado (FR-046, FR-049, XR-002, XR-005, XR-006)
- [ ] T063 [US6] Implementar la validación de nombre, etiquetas, ciclo de vida y color de acento, con reporte de errores y retroceso a predeterminados en `src/module-config.js` (FR-048, FR-050)
- [ ] T064 [US6] Aplicar nombre, etiquetas y color configurados en `src/components/shell.js`, `src/components/entity-form.js`, `src/components/document-form.js`, `src/components/master-data-form.js`, `src/components/purchase-order-lines.js`, `src/app.js` y `src/styles.css` (FR-047, FR-051, XR-002, XR-005)
- [ ] T065 [US6] Conectar el ciclo de vida configurado con las opciones y transiciones de estado en `src/domain/purchasing.js` y `src/components/document-form.js` (FR-046, XR-006)
- [ ] T066 [US6] Mostrar un aviso claro de configuración inválida sin impedir el arranque en `src/app.js` y `src/styles.css` (FR-048)
- [ ] T067 [US6] Documentar la configuración, los valores predeterminados y la adaptación sin cambios centrales en `README.md` (SC-008, XR-002)

**Checkpoint**: Nombre, color, etiquetas y ciclo de vida se aplican de extremo a extremo; sin configuración se usan los valores de Compras; una configuración inválida no rompe la aplicación.

---

## Fase 7: Historia de Usuario 4 — Buscar proveedores y órdenes (Prioridad: P2)

**Objetivo**: Ampliar la búsqueda básica de proveedores de HU3 con filtros por categoría y fecha de entrega de órdenes, comparación sin tildes y cumplimiento de los umbrales de rendimiento.

**Prueba Independiente**: El jefe de inventario usa la búsqueda básica por nombre/RUT y luego filtra por categoría o fecha de entrega, sin distinguir tildes, y obtiene resultados dentro de los umbrales definidos.

### Pruebas para la Historia de Usuario 4

- [ ] T068 [P] [US4] Añadir prueba de búsqueda de proveedores por nombre, RUT con o sin puntos y con o sin guion, y filtro por categoría en `tests/integration/search.test.js` (FR-031)
- [ ] T069 [US4] Añadir prueba de búsqueda sin distinción de mayúsculas ni tildes en `tests/integration/search.test.js` (FR-033)
- [ ] T070 [US4] Añadir prueba de búsqueda de órdenes por fecha de entrega y resultados con estado y fechas en `tests/integration/search.test.js` (FR-032, FR-036)
- [ ] T071 [US4] Añadir prueba de estado vacío claro y posibilidad de reintentar cuando no hay coincidencias en `tests/integration/search.test.js` (FR-034)
- [ ] T072 [P] [US4] Añadir prueba de rendimiento con 500 proveedores y 2.000 órdenes: búsqueda ≤300 ms y listas ≤1 s, medida con `performance.now()`, en `tests/integration/search-performance.test.js` (FR-035, SC-004)

### Implementación para la Historia de Usuario 4

- [ ] T073 [US4] Ampliar la búsqueda normalizada de proveedores por nombre, RUT y categoría, y de órdenes por fecha de entrega, incluyendo comparación sin tildes, en `src/domain/purchasing.js` (FR-031, FR-032, FR-033, FR-035)
- [ ] T074 [US4] Ampliar la pantalla de búsqueda con filtros de categoría y fecha, resultados con estado y fechas, y estado vacío con reintento en `src/app.js` (FR-031, FR-032, FR-034, FR-036)
- [ ] T075 [US4] Conectar la entrada Buscar de la barra lateral con la pantalla de búsqueda, sin duplicar la acción rápida ya implementada en HU3, en `src/app.js` (FR-030, FR-034)
- [ ] T076 [US4] Añadir estilos para filtros, resultados de búsqueda y estado vacío en `src/styles.css` (FR-034)

**Checkpoint**: La búsqueda encuentra proveedores por nombre, RUT o categoría y órdenes por fecha de entrega, no distingue mayúsculas ni tildes y cumple búsqueda ≤300 ms y listas ≤1 s con 500 proveedores y 2.000 órdenes.

---

## Fase 8: Historia de Usuario 5 — Ciclo de vida de la orden de compra con recepción (Prioridad: P2)

**Objetivo**: Controlar los estados borrador, pendiente, aprobado, recibido y cancelado; rechazar transiciones inválidas; aplicar stock exactamente una vez al recibir; bloquear la edición de órdenes terminales.

**Prueba Independiente**: Una transición inválida se rechaza; al pasar una orden a recibido el stock aumenta exactamente una vez y un segundo intento no lo duplica.

### Pruebas para la Historia de Usuario 5

- [ ] T077 [P] [US5] Añadir prueba de transiciones válidas por estado y rechazo de transiciones inválidas por cualquier vía en `tests/unit/purchasing.test.js` (FR-037, FR-038, FR-039, FR-040)
- [ ] T078 [US5] Añadir prueba de recepción que suma stock una sola vez, `stock_aplicado` que impide duplicar y cancelación que no modifica stock en `tests/unit/purchasing.test.js` (FR-041, FR-042, FR-045)
- [ ] T079 [P] [US5] Añadir prueba de estado visible y edición bloqueada para órdenes recibidas o canceladas en `tests/integration/order-lifecycle.test.js` (FR-043, FR-044)
- [ ] T080 [US5] Añadir prueba de integración aprobado→recibido con incremento exacto de stock en productos en `tests/integration/order-lifecycle.test.js` (FR-041, FR-042, SC-009)

### Implementación para la Historia de Usuario 5

- [ ] T081 [US5] Implementar los estados y el validador de transiciones con mensajes de rechazo en `src/domain/purchasing.js` (FR-037, FR-038, FR-039, FR-040)
- [ ] T082 [US5] Implementar la recepción idempotente con persistencia de `stock_aplicado` y suma de stock por producto en `src/domain/purchasing.js` (FR-041, FR-042, FR-045, XR-004)
- [ ] T083 [US5] Implementar el bloqueo de edición de cabecera y líneas en órdenes recibidas o canceladas en `src/domain/purchasing.js` y `src/app.js` (FR-044)
- [ ] T084 [US5] Renderizar solo las transiciones válidas y las etiquetas de estado en listas y detalle en `src/components/document-form.js` y `src/app.js` (FR-037, FR-038, FR-039, FR-043)
- [ ] T085 [US5] Integrar la acción de recepción, el refresco de stock, la vista de solo lectura y el estado visible en `src/app.js` (FR-041, FR-043, FR-044)
- [ ] T086 [US5] Añadir estilos para estados, badges y modo de solo lectura en `src/styles.css` (FR-043, FR-044)

**Checkpoint**: Solo se ofrecen transiciones válidas, el estado es visible, la recepción actualiza el stock exactamente una vez y las órdenes terminales quedan inmutables.

---

## Fase 9: Pulido y Preocupaciones Transversales

**Propósito**: Accesibilidad, seguridad, rendimiento, documentación, regresión y validación final de las 6 historias.

- [ ] T087 [P] Añadir prueba automatizada de rendimiento con 500 proveedores y 2.000 órdenes: búsqueda ≤300 ms, carga del panel ≤500 ms y render de listas ≤1 s, medidas con `performance.now()`, en `tests/integration/performance.test.js` (FR-035, SC-004)
- [ ] T088 [P] Añadir prueba automatizada de accesibilidad WCAG 2.1 AA: acciones operables con teclado, foco visible, inputs con etiqueta asociada, contraste mínimo 4,5:1 y `aria-label` en iconos de la barra lateral contraída, en `tests/integration/accessibility.test.js` (FR-060, SC-013)
- [ ] T089 [P] Revisar y ajustar accesibilidad (etiquetas asociadas, foco de teclado visible, contraste ≥4,5:1, `aria-current`, `aria-label` en iconos de barra lateral contraída, encabezados y semántica) en `src/components/shell.js`, `src/components/entity-form.js`, `src/components/document-form.js`, `src/components/master-data-form.js`, `src/components/purchase-order-lines.js` y `src/styles.css` (FR-059, FR-060, SC-013)
- [ ] T090 [P] Verificar y cubrir la sanitización XSS de nombres, descripciones, notas y campos personalizados con HTML y atributos de eventos en `tests/integration/xss.test.js` (FR-058)
- [ ] T091 Verificar el rendimiento con 500 proveedores y 2.000 órdenes en panel, listas y búsqueda, y optimizar el renderizado por fragmentos en `src/components/purchasing-dashboard.js` y `src/app.js` (FR-035, SC-004)
- [ ] T092 [P] Actualizar `README.md` con flujos de compra, configuración, claves de almacenamiento y comandos de desarrollo/pruebas/compilación (SC-006, XR-002)
- [ ] T093 Ejecutar la suite completa de pruebas unitarias e integración y corregir regresiones de las 6 historias (SC-003, SC-006)
- [ ] T094 Ejecutar linting y formato, y corregir advertencias de calidad en `src/` y `tests/` (SC-006)
- [ ] T095 Ejecutar la compilación de producción con Vite y verificar que no hay errores en `index.html`, `src/` y `src/styles.css` (SC-006)
- [ ] T096 Ejecutar la validación manual de `quickstart.md`: proveedor, orden con dos líneas, recepción, búsqueda por nombre/RUT/categoría, OC atrasada, accesibilidad, recarga y navegación (SC-001, SC-002, SC-003, SC-005, SC-006, SC-011, SC-013)
- [ ] T097 Validar SC-008: confirmar que la adaptación de Compras se logra solo con `src/module-config.js` y puntos de extensión, sin cambios en archivos centrales (SC-008, XR-002)
- [ ] T098 Validar SC-012: revisar todas las pantallas y confirmar que no aparecen las etiquetas “Entidad” ni “Documento” (FR-047, SC-012)
- [ ] T099 Realizar limpieza final de código, nombres y duplicación en `src/domain/purchasing.js`, `src/components/` y `src/app.js` sin alterar comportamiento (SC-006, XR-002)

**Checkpoint**: La suite, el lint y la compilación pasan; se cumplen los umbrales de rendimiento con 500 proveedores y 2.000 órdenes; la aplicación cumple WCAG 2.1 AA, es segura, la documentación está actualizada y los flujos de las 6 HU quedan validados.

---

## Dependencias y Orden de Ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias.
- **Fase 2 (Fundacional)**: depende de Fase 1 y bloquea todas las historias.
- **Fase 3 (HU1, P1)**: depende de Fase 2.
- **Fase 4 (HU2, P1)**: depende de Fase 2 y de HU1 para contar con proveedores.
- **Fase 5 (HU3, P1)**: depende de HU1 y HU2 para calcular recuentos y atrasos.
- **Fase 6 (HU6, P1)**: depende de Fase 2 y de las pantallas de HU1–HU3 para aplicar etiquetas y ciclo de vida en toda la interfaz.
- **Fase 7 (HU4, P2)**: depende de HU1, HU2 y HU3; debe iniciarse después de completar todas las fases P1 (3–6) porque amplía la búsqueda básica.
- **Fase 8 (HU5, P2)**: depende de HU2 y HU6; debe iniciarse después de completar todas las fases P1 (3–6).
- **Fase 9 (Pulido)**: depende de que las 6 historias estén completas.

### Dependencias entre historias

- **HU1 → HU2**: la orden requiere un proveedor existente.
- **HU1/HU2 → HU3**: el panel lee proveedores, órdenes y estados.
- **HU2/HU6 → HU5**: la recepción usa órdenes y el ciclo de vida configurado.
- **HU1/HU2/HU3 → HU4**: la búsqueda por categoría y fecha amplía la búsqueda básica por nombre/RUT de HU3.
- **HU6 → todas**: las etiquetas y el color se aplican en todas las pantallas.

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar antes de la implementación.
- Los modelos y reglas de dominio van antes de formularios y pantallas.
- Los formularios y editores van antes de la integración en `src/app.js`.
- La historia debe quedar funcional y probada antes de pasar a la siguiente prioridad.

### Oportunidades de paralelización

- T002 y T003 en Setup; T004 después de T002 porque ambos modifican `package.json`.
- T015 (campos personalizados) y T016–T018 (pruebas) en Fundacional; T008 y T010 son secuenciales sobre `src/storage.js`.
- T016, T017 y T018 (pruebas de almacenamiento, configuración y marco) entre sí.
- Todas las pruebas marcadas `[P]` dentro de una misma historia.
- T042, T043 y T044 (formularios maestros, cabecera de orden y editor de líneas) una vez completado el dominio de HU2.
- T053 y T054 (panel de inicio e indicadores de compras) entre sí.
- T087, T088, T089, T090 y T092 (rendimiento, accesibilidad automatizada, accesibilidad manual, pruebas XSS y documentación) antes de la validación final.

---

## Ejemplo de Paralelización: Historia de Usuario 2

```bash
# Una vez completado el dominio de HU2, lanzar en paralelo:
Task: "Implementar formularios de Empleado, Categoría y Producto en src/components/master-data-form.js"
Task: "Implementar cabecera de orden en src/components/document-form.js"
Task: "Implementar editor de líneas en src/components/purchase-order-lines.js"

# Lanzar en paralelo las pruebas de HU2:
Task: "Pruebas de folio, fechas y mínimo de líneas en tests/unit/purchasing.test.js"
Task: "Pruebas de líneas y totales en tests/unit/purchasing.test.js"
Task: "Pruebas de datos maestros en tests/integration/master-data.test.js"
```

---

## Estrategia de Implementación

### MVP (todas las historias P1)

1. Completar Fase 1: Setup.
2. Completar Fase 2: Fundacional.
3. Completar Fase 3: HU1 Proveedores.
4. Completar Fase 4: HU2 Órdenes, líneas y datos maestros.
5. Completar Fase 5: HU3 Panel y búsqueda básica.
6. Completar Fase 6: HU6 Configuración.
7. **DETENERSE Y VALIDAR**: HU1–HU3 y HU6 funcionan de forma integrada, incluida la búsqueda básica por nombre/RUT desde la acción Buscar; las P2 aún no son necesarias.

### Entrega incremental

1. Setup + Fundacional → base lista.
2. HU1 → proveedores operativos.
3. HU2 → órdenes con líneas y totales.
4. HU3 → visibilidad del área de compras y búsqueda básica por nombre/RUT.
5. HU6 → terminología, identidad y ciclo de vida configurables.
6. HU4 → búsqueda avanzada.
7. HU5 → gobernanza de estados y recepción de stock.
8. Pulido → accesibilidad, seguridad, rendimiento y documentación.

Cada historia agrega valor sin romper las anteriores y puede validarse de forma independiente en su checkpoint.

---

## Cobertura de Requisitos Funcionales

| FR | Tareas que lo cubren |
|---|---|
| FR-001 | T023, T026, T027, T029 |
| FR-002 | T023, T027, T029 |
| FR-003 | T019, T024, T029 |
| FR-004 | T021, T025, T027 |
| FR-005 | T020, T025 |
| FR-006 | T022, T026 |
| FR-007 | T021, T025, T027, T028, T030 |
| FR-008 | T023, T028 |
| FR-009 | T031, T038, T043, T046 |
| FR-010 | T032, T039 |
| FR-011 | T032, T039 |
| FR-012 | T032, T038, T044 |
| FR-013 | T033, T040, T044 |
| FR-014 | T034, T040 |
| FR-015 | T034, T040 |
| FR-016 | T034, T036, T046 |
| FR-017 | T019, T036, T046 |
| FR-018 | T033, T038, T044 |
| FR-019 | T035, T037, T042, T047 |
| FR-020 | T035, T037, T042, T047 |
| FR-021 | T035, T037, T042, T047 |
| FR-022 | T035, T041, T047 |
| FR-023 | T031, T036, T043, T045, T048 |
| FR-024 | T049, T053, T056 |
| FR-025 | T050, T054 |
| FR-026 | T050, T054 |
| FR-027 | T050, T052, T054 |
| FR-028 | T050, T054, T057 |
| FR-029 | T051, T056 |
| FR-030 | T049, T053, T056, T075 |
| FR-031 | T049, T055, T056, T068, T073, T074 |
| FR-032 | T070, T073, T074 |
| FR-033 | T010, T069, T073 |
| FR-034 | T071, T074, T075, T076 |
| FR-035 | T072, T073, T087, T091 |
| FR-036 | T070, T074 |
| FR-037 | T077, T081, T084 |
| FR-038 | T077, T081, T084 |
| FR-039 | T077, T081, T084 |
| FR-040 | T077, T081 |
| FR-041 | T078, T080, T082, T085 |
| FR-042 | T078, T080, T082 |
| FR-043 | T079, T084, T085, T086 |
| FR-044 | T079, T083, T085, T086 |
| FR-045 | T078, T082 |
| FR-046 | T060, T062, T065 |
| FR-047 | T059, T064, T098 |
| FR-048 | T009, T061, T063, T066 |
| FR-049 | T009, T061, T062 |
| FR-050 | T058, T061, T063 |
| FR-051 | T059, T064 |
| FR-052 | T013, T018 |
| FR-053 | T013, T018 |
| FR-054 | T006, T007, T018 |
| FR-055 | T006, T007, T008, T016 |
| FR-056 | T009, T012, T017 |
| FR-057 | T011, T015, T017 |
| FR-058 | T010, T012, T017, T090 |
| FR-059 | T014, T018, T089 |
| FR-060 | T088, T089 |

## Cobertura de Extensibilidad y Criterios de Éxito

- **XR-001**: T006, T008, T011, T015, T037, T038, T040, T041.
- **XR-002**: T009, T012, T059, T064, T067, T092, T097, T099.
- **XR-003**: T010, T025, T026, T040, T073.
- **XR-004**: T006, T007, T008, T016, T019, T026, T037, T038, T041, T082.
- **XR-005**: T012, T013, T059, T064.
- **XR-006**: T060, T062, T065.
- **SC-001**: T023, T096.
- **SC-002**: T031, T034, T096.
- **SC-003**: T093, T096.
- **SC-004**: T072, T087, T091.
- **SC-005**: T071, T096.
- **SC-006**: T001–T005, T016–T018, T093–T096.
- **SC-007**: T050.
- **SC-008**: T001, T005, T062, T067, T097.
- **SC-009**: T080, T082.
- **SC-010**: T051, T056.
- **SC-011**: T050, T052, T054.
- **SC-012**: T059, T064, T098.
- **SC-013**: T088, T089, T096.

---

## Decisiones de Alineación

Estas decisiones resuelven las diferencias entre `spec.md`, `plan.md` y `data-model.md`; `spec.md` es la fuente de verdad para estas tareas.

1. **Proveedor**: el campo base `code` almacena el RUT normalizado y se etiqueta "RUT"; se usan además `name`, `category` y `paymentTerms`; no se usa un campo fiscal separado.
2. **Orden de compra**: `fecha_emision` se persiste en `startDate` y `fecha_entrega` en `endDate`; el folio es único global y debe ser entero positivo.
3. **Líneas**: se persisten en `erp_purchasing:purchase-order-lines` con clave compuesta orden+producto; el subtotal es derivado y no se persiste.
4. **Importes**: neto = suma de subtotales; IVA = 19 % del neto; total = neto + IVA; todo redondeado a dos decimales.
5. **Ciclo de vida estándar**: `borrador → pendiente → aprobado → recibido`; cancelación solo desde `borrador` o `pendiente`; `recibido` y `cancelado` son terminales.
6. **Recepción**: se persiste `stock_aplicado` en la orden para garantizar una sola aplicación de stock.
7. **Configuración**: las etiquetas de Empleado, Categoría, Producto y Detalle de compra amplían `labels` en `ModuleConfig`; no se declaran `customFields` concretos para Compras, pero la capacidad base de campos personalizados se implementa y prueba en Fundacional.
8. **Archivos centrales**: las tareas de Compras se concentran en `src/module-config.js`, `src/domain/purchasing.js`, componentes nuevos y `src/app.js`; cualquier cambio en archivos centrales debe limitarse a puntos de extensión y validarse contra SC-008.
9. **Configuración**: la configuración válida de Compras tiene precedencia; si falta o es inválida se usan los defaults integrados de Compras y se muestra un aviso visible. “Entidad/Documento” solo existen en el módulo base sin instancia de Compras.
10. **Búsqueda MVP**: HU3/P1 incluye búsqueda básica por nombre y RUT desde la acción Buscar; HU4/P2 agrega categoría, fecha, comparación sin tildes y rendimiento.
11. **Criterios medibles**: con 500 proveedores y 2.000 órdenes, búsqueda ≤300 ms, panel ≤500 ms y listas ≤1 s, medidos con `performance.now()`; accesibilidad WCAG 2.1 AA según FR-060 y SC-013.
