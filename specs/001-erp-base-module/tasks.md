# Tareas: Módulo de Adquisiciones y Compras (Historias de Usuario 1-6)

**Entrada**: Documentos de diseño desde `/specs/001-erp-base-module/`
**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para las historias de usuario), research.md, data-model.md, contracts/
**Alcance**: Historias de Usuario 1 a 6 de `spec.md` (proveedores, órdenes de compra, panel, búsqueda, ciclo de vida y perfil de configuración).
**Pruebas**: Incluidas porque el plan y la especificación exigen pruebas unitarias y de integración para cada regla del módulo.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias).
- **[Historia]**: Historia de usuario a la que pertenece la tarea (`US1`-`US6`).
- Las rutas indicadas corresponden a la estructura definida en `plan.md`.

## Rutas del Proyecto

- **Código fuente**: `src/`
- **Pruebas**: `tests/unit/`, `tests/integration/`, `tests/setup/`
- **Configuración**: `src/module-config.js`
- **Dominio de compras**: `src/domain/purchasing.js`

---

## Fase 1: Configuración (Infraestructura Compartida)

**Propósito**: Inicializar e integrar la estructura del proyecto Vite/Vitest sobre la que se construyen las seis historias.

- [ ] T001 Verificar la estructura Vite con `src/`, `tests/unit/`, `tests/integration/`, `tests/setup/` y los archivos de configuración del proyecto
- [ ] T002 Confirmar las dependencias de desarrollo Vite, Vitest y jsdom en `package.json`
- [ ] T003 [P] Configurar el linting y formateo del proyecto JavaScript vanilla

---

## Fase 2: Fundacional (Prerrequisitos Bloqueantes)

**Propósito**: Preparar el almacenamiento, el dominio y el esqueleto de la aplicación de los que dependen las seis historias.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede completarse hasta que esta fase esté lista.

- [ ] T004 Extender el modelo de proveedor en `src/storage.js` con los campos del MER (`code`, `name`, `taxId`, `email`, `phone`, `address`, `category`, `targetDate`) y sus validaciones
- [ ] T005 Implementar la persistencia en `localStorage` de proveedores con generación automática de `id`, `entity_id`, marcas de tiempo y normalización de texto en `src/storage.js`
- [ ] T006 Implementar el almacenamiento de órdenes de compra en `src/storage.js` con `entity_id`, `folio`, `startDate`, `endDate`, `totalAmount` y `status`, incluyendo validación referencial al proveedor
- [ ] T007 Crear el esqueleto de la aplicación, el enrutamiento de vistas y el estado inicial vacío en `src/app.js` e `index.html`
- [ ] T008 [P] Configurar `userConfig` con nombre del módulo, etiquetas Proveedor/Orden de Compra, ciclo de vida y tema en `src/module-config.js`
- [ ] T009 [P] Construir la hoja de estilos compartida y los tokens de diseño ERP en `src/styles.css`
- [ ] T010 Crear el esqueleto de reglas de dominio de compras en `src/domain/purchasing.js` (totales, fechas, estados y restricciones de borrado)
- [ ] T011 [P] Añadir pruebas unitarias base para validación de proveedores y órdenes en `tests/unit/storage.test.js`
- [ ] T012 [P] Añadir el andamiaje de pruebas de integración y el setup de jsdom en `tests/setup/`

**Punto de control**: El almacenamiento, la configuración, el dominio y el esqueleto de la aplicación están listos.

---

## Fase 3: Historia de Usuario 1 - Registrar y mantener proveedores (Prioridad: P1) 🎯 MVP

**Objetivo**: Permitir crear, editar, visualizar y eliminar proveedores con RUT/código, razón social, contacto y categoría, aplicando validaciones y protegiendo la integridad referencial.

**Prueba Independiente**: Un agente crea un proveedor con sus campos obligatorios, lo edita, intenta duplicar su RUT/código, elimina un proveedor sin órdenes y verifica que los cambios se reflejan de inmediato en la lista.

### Pruebas para la Historia de Usuario 1

- [ ] T013 [P] [US1] Añadir pruebas unitarias de validación de proveedores (campos obligatorios, correo válido, RUT/código duplicado) en `tests/unit/purchasing-supplier.test.js`
- [ ] T014 [P] [US1] Añadir pruebas de integración para crear, editar, eliminar y rechazar duplicados de proveedores en `tests/integration/suppliers.test.js`
- [ ] T015 [P] [US1] Añadir pruebas de integración para bloquear la eliminación de un proveedor con órdenes asociadas en `tests/integration/suppliers.test.js`

### Implementación de la Historia de Usuario 1

- [ ] T016 [P] [US1] Crear el formulario de proveedor con RUT/código, razón social, contacto y categoría en `src/components/entity-form.js`, mostrando errores junto a cada campo
- [ ] T017 [P] [US1] Crear la lista de proveedores con acciones de editar y eliminar en `src/components/entity-list.js`
- [ ] T018 [US1] Implementar el CRUD de proveedores, la detección de RUT/código duplicado y la normalización de búsqueda en `src/storage.js`
- [ ] T019 [US1] Conectar los flujos de alta, edición y eliminación de proveedores con retroalimentación visual en `src/app.js`
- [ ] T020 [US1] Bloquear la eliminación de proveedores con órdenes de compra y explicar el motivo en `src/domain/purchasing.js` y `src/app.js`

**Punto de control**: La Historia de Usuario 1 está completamente funcional y puede validarse de forma independiente.

---

## Fase 4: Historia de Usuario 2 - Emitir órdenes de compra asociadas a un proveedor (Prioridad: P1)

**Objetivo**: Permitir crear, editar y eliminar órdenes de compra vinculadas a un proveedor, con folio/número, fecha de emisión, fecha de entrega y monto, validando los datos obligatorios y la coherencia de fechas.

**Prueba Independiente**: Un agente selecciona un proveedor, crea una OC con número, fecha de emisión, fecha de entrega y monto, la edita, la elimina y comprueba que queda asociada exactamente a ese proveedor.

### Pruebas para la Historia de Usuario 2

- [ ] T021 [P] [US2] Añadir pruebas unitarias de validación de órdenes (folio/monto obligatorios, fechas válidas, entrega igual o posterior a emisión) en `tests/unit/purchasing-order.test.js`
- [ ] T022 [P] [US2] Añadir pruebas de integración para crear, editar y eliminar una OC vinculada a un proveedor en `tests/integration/purchase-orders.test.js`
- [ ] T023 [P] [US2] Añadir pruebas de integración para filtrar y visualizar las OC de un proveedor seleccionado en `tests/integration/purchase-orders.test.js`

### Implementación de la Historia de Usuario 2

- [ ] T024 [P] [US2] Crear el formulario de orden de compra con selector de proveedor, folio, fecha de emisión, fecha de entrega y monto en `src/components/document-form.js`
- [ ] T025 [P] [US2] Crear la vista de listado de órdenes de compra con filtro por proveedor en `src/components/document-list.js`
- [ ] T026 [US2] Implementar el CRUD de órdenes de compra y la relación obligatoria con el proveedor en `src/storage.js`
- [ ] T027 [US2] Implementar la validación de campos obligatorios y de fechas (entrega anterior a emisión) en `src/domain/purchasing.js`
- [ ] T028 [US2] Conectar el alta, edición y eliminación de OC, así como el filtro por proveedor, en `src/app.js`
- [ ] T029 [US2] Eliminar en cascada las órdenes de compra cuando se elimina un proveedor en `src/storage.js`

**Punto de control**: Las Historias de Usuario 1 y 2 funcionan de forma independiente y los proveedores quedan vinculados a sus órdenes.

---

## Fase 5: Historia de Usuario 3 - Panel de control de compras (Prioridad: P1)

**Objetivo**: Ofrecer un panel de inicio con el total de proveedores y órdenes de compra, además de accesos rápidos a las tareas clave del módulo.

**Prueba Independiente**: El gerente abre la aplicación, ve las tarjetas con el número de proveedores y de OC, usa una acción rápida y aterriza en el formulario o pantalla correspondiente.

### Pruebas para la Historia de Usuario 3

- [ ] T030 [P] [US3] Añadir pruebas de integración para las tarjetas de estadísticas y las acciones rápidas del panel en `tests/integration/dashboard.test.js`
- [ ] T031 [P] [US3] Añadir pruebas de integración para el estado en cero y la actualización de estadísticas tras crear o eliminar OC en `tests/integration/dashboard.test.js`

### Implementación de la Historia de Usuario 3

- [ ] T032 [P] [US3] Añadir el marcado del panel (encabezado, cuadrícula de acciones rápidas y tarjetas de estadísticas) en `index.html`
- [ ] T033 [US3] Renderizar y refrescar los recuentos de proveedores y órdenes de compra desde el almacenamiento cada vez que se muestra el panel en `src/components/dashboard.js`
- [ ] T034 [US3] Conectar las acciones rápidas Nuevo Proveedor, Nueva Orden de Compra, Gestionar Proveedores y Buscar en `src/app.js`
- [ ] T035 [P] [US3] Dar estilo al encabezado, las tarjetas de acción rápida y los mosaicos de estadísticas en `src/styles.css`
- [ ] T036 [US3] Asegurar el estado vacío con contadores en cero sin errores en `src/components/dashboard.js`

**Punto de control**: La aplicación abre en un panel funcional con estadísticas actualizadas y cada tarea clave a un clic.

---

## Fase 6: Historia de Usuario 4 - Buscar proveedores y fechas de entrega comprometidas (Prioridad: P2)

**Objetivo**: Proporcionar una pantalla de búsqueda dedicada para encontrar proveedores por nombre, RUT, categoría o fecha de entrega comprometida, mostrando la fecha de un vistazo y un estado vacío claro.

**Prueba Independiente**: El jefe de inventario abre la búsqueda desde la barra lateral, busca una categoría y ve solo los proveedores coincidentes con su fecha objetivo visible.

### Pruebas para la Historia de Usuario 4

- [ ] T037 [P] [US4] Añadir pruebas unitarias para la búsqueda normalizada por nombre, RUT, categoría y fecha en `tests/unit/search.test.js`
- [ ] T038 [P] [US4] Añadir pruebas de integración para la pantalla de búsqueda, el estado vacío y la visualización de fechas en `tests/integration/search-suppliers.test.js`
- [ ] T039 [P] [US4] Añadir una prueba de rendimiento con al menos 500 proveedores en `tests/integration/search-suppliers.test.js`

### Implementación de la Historia de Usuario 4

- [ ] T040 [P] [US4] Añadir el marcado de la pantalla de búsqueda dedicada (entrada y lista de resultados) en `index.html`
- [ ] T041 [US4] Implementar la búsqueda normalizada por nombre, RUT, categoría y fecha de entrega comprometida en `src/storage.js` y `src/domain/purchasing.js`
- [ ] T042 [P] [US4] Renderizar los resultados con la fecha objetivo visible y el estado vacío en `src/components/search-bar.js` y `src/components/entity-list.js`
- [ ] T043 [US4] Conectar la navegación a la pantalla de búsqueda desde la barra lateral y la acción rápida del panel en `src/app.js`
- [ ] T044 [US4] Mantener los resultados sincronizados tras crear, editar o eliminar proveedores y órdenes en `src/app.js`

**Punto de control**: La Historia de Usuario 4 es funcional y la búsqueda responde con conjuntos de datos grandes.

---

## Fase 7: Historia de Usuario 5 - Controlar el ciclo de vida de la orden de compra (Prioridad: P1)

**Objetivo**: Hacer que las órdenes de compra sigan el flujo Solicitada → Cotizada → Aprobada → Recibida → Cerrada, ofreciendo solo transiciones válidas y bloqueando el paso a Recibida o Cerrada sin aprobación previa.

**Prueba Independiente**: Un usuario intenta cambiar una OC de Solicitada directamente a Recibida o Cerrada, el sistema bloquea la acción con una alerta y solo habilita la transición a Cotizada.

### Pruebas para la Historia de Usuario 5

- [ ] T045 [P] [US5] Añadir pruebas unitarias para las transiciones válidas e inválidas del ciclo de vida en `tests/unit/purchasing-status.test.js`
- [ ] T046 [P] [US5] Añadir pruebas de integración para el control de estado que solo ofrece transiciones válidas en `tests/integration/purchase-order-lifecycle.test.js`
- [ ] T047 [P] [US5] Añadir pruebas de integración para rechazar el paso a Recibida o Cerrada sin aprobación previa en `tests/integration/purchase-order-lifecycle.test.js`

### Implementación de la Historia de Usuario 5

- [ ] T048 [P] [US5] Declarar los estados Solicitada, Cotizada, Aprobada, Recibida y Cerrada con sus transiciones en `src/module-config.js`
- [ ] T049 [US5] Implementar la validación de transiciones permitidas y el bloqueo de estados terminales sin aprobación en `src/domain/purchasing.js`
- [ ] T050 [US5] Restringir las opciones de estado del formulario de OC a las transiciones válidas y rechazar envíos inválidos en `src/components/document-form.js` y `src/storage.js`
- [ ] T051 [P] [US5] Añadir una etiqueta o insignia visual del estado actual en la lista y el detalle de órdenes en `src/components/document-list.js` y `src/styles.css`
- [ ] T052 [US5] Conectar el cambio de estado con alertas explicativas ante transiciones inválidas en `src/app.js`

**Punto de control**: El ciclo de vida de las órdenes se controla de extremo a extremo y el estado es visible de un vistazo.

---

## Fase 8: Historia de Usuario 6 - Configurar perfil del módulo de compras (Prioridad: P2)

**Objetivo**: Permitir al administrador configurar opciones generales, roles (agente, gerente, jefe de inventario) y permisos del módulo, restringir secciones por rol y validar límites presupuestarios o topes de compra.

**Prueba Independiente**: El administrador entra al panel de configuración, modifica los permisos de un rol y un parámetro global, guarda los cambios, ve el mensaje de éxito y comprueba que los ajustes quedaron registrados.

### Pruebas para la Historia de Usuario 6

- [ ] T053 [P] [US6] Añadir pruebas unitarias para la validación de roles, permisos y límites presupuestarios en `tests/unit/module-profile.test.js`
- [ ] T054 [P] [US6] Añadir pruebas de integración para crear y editar roles, guardar la configuración y mostrar el mensaje de éxito en `tests/integration/module-profile.test.js`
- [ ] T055 [P] [US6] Añadir pruebas de integración para la visibilidad de secciones según el rol y la validación del tope de compra al operar en `tests/integration/module-profile.test.js`

### Implementación de la Historia de Usuario 6

- [ ] T056 [P] [US6] Añadir el marcado de la pantalla de configuración del perfil (roles, secciones, parámetros y límite presupuestario) en `index.html`
- [ ] T057 [US6] Extender el esquema de `userConfig` con roles, permisos por sección y límites de compra por rol en `src/module-config.js`
- [ ] T058 [P] [US6] Crear el panel de configuración con alta/edición de roles, habilitación de secciones y parámetros del módulo en `src/components/module-profile.js`
- [ ] T059 [US6] Aplicar la visibilidad de secciones y la navegación permitida según el rol activo en `src/app.js` y `src/components/shell.js`
- [ ] T060 [US6] Validar el límite presupuestario o tope de compra al crear o editar una orden de compra en `src/domain/purchasing.js`
- [ ] T061 [US6] Persistir la configuración del perfil en `localStorage` y mostrar mensajes de éxito y error en `src/module-config.js` y `src/app.js`
- [ ] T062 [P] [US6] Dar estilo a la pantalla de configuración y a los controles de roles en `src/styles.css`

**Punto de control**: La configuración del módulo se guarda y se aplica a la navegación, los permisos y la operación de compras.

---

## Fase 9: Pulido y Preocupaciones Transversales

**Propósito**: Mejorar la calidad, accesibilidad, seguridad y rendimiento de las seis historias.

- [ ] T063 [P] Añadir refinamientos de accesibilidad para etiquetas, foco de teclado, `aria-current` y estructura semántica en las pantallas de proveedores, órdenes, panel, búsqueda y configuración
- [ ] T064 [P] Sanitizar todo contenido introducido por el usuario (nombres, RUT, notas y descripciones) antes de renderizarlo en el DOM para prevenir XSS
- [ ] T065 [P] Pulir los estados vacíos, los mensajes de validación y el diseño responsivo en `src/styles.css` y los componentes
- [ ] T066 [P] Verificar que la barra lateral se contrae de forma accesible y que el módulo activo permanece resaltado
- [ ] T067 Verificar el rendimiento con al menos 500 proveedores y 500 órdenes de compra (renderizado, búsqueda y estadísticas)
- [ ] T068 Ejecutar la suite completa de pruebas y la compilación de producción para comprobar que no hay regresiones
- [ ] T069 Probar manualmente los flujos principales de las seis historias y actualizar la documentación afectada en `README.md` si corresponde

---

## Dependencias y Orden de Ejecución

### Dependencias entre Fases

- Configuración (Fase 1): Sin dependencias.
- Fundacional (Fase 2): Depende de completar la Configuración y bloquea las seis historias.
- Historia de Usuario 1 (Fase 3): Depende de la Fase 2 y es el MVP del módulo.
- Historia de Usuario 2 (Fase 4): Depende de la Fase 2 y de los proveedores de la US1 para vincular órdenes.
- Historia de Usuario 3 (Fase 5): Depende de la Fase 2 y se beneficia de US1 y US2 para mostrar estadísticas reales.
- Historia de Usuario 4 (Fase 6): Depende de la Fase 2 y de los datos de proveedores de la US1; puede avanzar en paralelo con US3.
- Historia de Usuario 5 (Fase 7): Depende de la Fase 2 y de las órdenes de compra de la US2.
- Historia de Usuario 6 (Fase 8): Depende de la Fase 2 y de la configuración de `src/module-config.js`; para validar topes de compra requiere la US2.
- Pulido (Fase 9): Depende de que las seis historias estén completas.

### Dependencias entre Historias

- **US1 (P1)**: Sin dependencias de otras historias; habilita los datos maestros de proveedores.
- **US2 (P1)**: Requiere US1 para asociar cada orden a un proveedor.
- **US3 (P1)**: Requiere US1 y US2 para mostrar estadísticas reales.
- **US4 (P2)**: Requiere US1 y puede integrarse con US2 para las fechas comprometidas.
- **US5 (P1)**: Requiere US2 y la configuración del ciclo de vida.
- **US6 (P2)**: Requiere la configuración base y la US2 para aplicar los topes de compra.

### Oportunidades Paralelas

- T003 puede ejecutarse en paralelo con el resto de la Fase 1.
- T008, T009, T011 y T012 pueden ejecutarse en paralelo dentro de la Fase 2.
- Las pruebas de cada historia pueden escribirse en paralelo con la implementación de esa misma historia.
- Después de completar US1, las historias US3 y US4 pueden avanzar en paralelo con US2 y US5.
- T035, T042 y T051 pueden ejecutarse en paralelo con las tareas de lógica correspondientes.
- En la Fase 9, T063, T064, T065 y T066 pueden ejecutarse en paralelo antes de las verificaciones finales T067-T069.

---

## Estrategia de Implementación

### MVP Primero (Historia de Usuario 1)

1. Completar la Fase 1 (Configuración).
2. Completar la Fase 2 (Fundacional).
3. Completar la Fase 3 (US1 - Proveedores).
4. **DETENERSE y VALIDAR**: probar la US1 de forma independiente.
5. Demostrar el MVP si está listo.

### Entrega Incremental

1. Completar Configuración y Fundacional.
2. Añadir US1, probar y demostrar.
3. Añadir US2, probar y demostrar.
4. Añadir US3, probar y demostrar.
5. Añadir US5, probar y demostrar.
6. Añadir US4 y US6, probar y demostrar.
7. Pulir y ejecutar la suite completa.

### Estrategia de Equipo en Paralelo

1. El equipo completa la Fase 1 y la Fase 2.
2. Una vez lista la base:
   - Desarrollador A: US1 y luego US4.
   - Desarrollador B: US2 y luego US5.
   - Desarrollador C: US3 y luego US6.
3. Integrar las historias y validar cada una de forma independiente.

---

## Notas

- `[P]` indica tareas que pueden ejecutarse en paralelo porque afectan archivos distintos.
- La etiqueta `[USx]` mantiene la trazabilidad entre tareas e historias de usuario.
- Cada historia debe completarse y validarse antes de pasar a la siguiente prioridad.
- Escribir las pruebas antes de la implementación y verificar que fallan primero.
- No se incluyen las Historias de Usuario 7 a 13 en este documento; quedan fuera del alcance solicitado.
