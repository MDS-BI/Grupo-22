# Plan de Implementación: Autenticación por User ID y RBAC

**Rama**: `004-authentication-rbac` | **Fecha**: 2026-11-08 | **Actualizado**: 2026-11-14 | **Especificación**: [spec.md](spec.md)

**Entrada**: Extensión del módulo de Compras para incorporar inicio de sesión por User ID, directorio local de usuarios, resolución de roles y permisos, y control de acceso a vistas, acciones, catálogo y transiciones de estado, conservando la arquitectura SPA, la persistencia en `localStorage` y el comportamiento de los módulos `001` y `002`. Los ajustes post-revisión del 2026-11-14 añaden la denominación por estado, la separación entre aprobar y rechazar, el empleado solicitante vinculado, la restricción del límite de crédito y la defensa en servicios.

## Resumen

La extensión se implementa sobre la SPA Vite/JavaScript existente. Añade un módulo de autenticación (`src/auth.js`) con el directorio de usuarios, la sesión activa, el catálogo de permisos y la resolución de roles. La interfaz incorpora una pantalla de acceso y una sección de sesión en la barra superior, y el arranque de producción (`boot()`) decide entre login e inicialización.

El control de acceso se aplica en tres capas: navegación y botones, renderizado condicional de formularios y acciones, y guardas en los manejadores de eventos. Las transiciones de estado se filtran combinando el ciclo canónico de Compras con el permiso del estado de origen y destino. El catálogo de productos admite un modo de solo lectura para roles sin gestión.

No se modifican las claves, entidades ni reglas del módulo base ni de la extensión de órdenes de compra. La autenticación agrega dos claves propias: `erp_auth:users` y `erp_auth:session`.

Los ajustes post-revisión refuerzan el RBAC en una cuarta capa: reglas de negocio reutilizables en `src/access-policy.js` que validan el rol y el estado actual antes de mutar proveedores, solicitudes o transiciones. La misma política alimenta la interfaz para que nunca se renderice una acción que el servicio vaya a rechazar. La denominación «Solicitud de compra» / «Orden de Compra emitida» se deriva del estado persistido, y el vínculo `Usuario.id_empleado` resuelve el empleado solicitante del `comprador` sin duplicarlo.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript ES2022, HTML5, CSS.

**Dependencias Principales**: Vite 8.2, Vitest 4.1 y jsdom 30. Sin framework de interfaz ni backend.

**Almacenamiento**: `localStorage` del navegador.

- `erp_auth:users`: directorio local de usuarios.
- `erp_auth:session`: sesión activa.
- `erp_base_module:*` y `erp_purchasing:*`: datos existentes, sin cambios de esquema.

**Pruebas**: Vitest con jsdom. Pruebas unitarias para normalización, login, sesión y permisos; pruebas de integración para la puerta de acceso, restauración de sesión, cierre de sesión, despliegue de interfaz por rol y ocultamiento efectivo con `display: none` en el estilo computado. Las pruebas inyectan `src/styles.css` en JSDOM para validar reglas CSS reales.

**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles.

**Tipo de Proyecto**: Aplicación web de una sola página, local y sin servidor.

**Objetivos de Rendimiento**:

- Resolver la sesión y aplicar el control de acceso en ≤ 50 ms al arrancar, medido como promedio de 100 ejecuciones con `performance.now()` sobre el volumen de prueba definido.
- Mantener los presupuestos del módulo base: panel ≤ 500 ms y búsqueda ≤ 300 ms con 500 proveedores y 2.000 órdenes.
- No introducir consultas adicionales al almacenamiento por cada render de tabla, salvo la lectura del directorio al resolver la sesión.

**Restricciones**:

- Sin backend, sin contraseñas y sin proveedor de identidad.
- El RBAC es local y de demostración; no es una frontera de seguridad frente a un usuario con control del navegador.
- Se conservan las claves, la semántica y los datos de los módulos `001` y `002`.
- Todo contenido introducido por el usuario se sanitiza antes de insertarse en el DOM.
- La interfaz debe cumplir WCAG 2.1 AA.
- No se avanza a implementación sin pruebas, build y lint correctos.

**Escala/Alcance**: Directorio de decenas de usuarios, una sesión por navegador y los mismos volúmenes de negocio del módulo base.

**Incógnitas**: Ninguna. El contexto técnico no contiene `NEEDS CLARIFICATION`.

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

| Principio | Estado | Evidencia |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | La autenticación y el RBAC se concentran en `src/auth.js`; la integración de interfaz se limita a `src/app.js` y a opciones explícitas en los módulos de vista. No se duplican reglas de negocio. |
| II. Pruebas y verificación | PASS | Se añaden pruebas unitarias de login, sesión, normalización, permisos y transiciones, y pruebas de integración de la puerta de acceso y del despliegue por rol. |
| III. Consistencia de experiencia | PASS | La pantalla de acceso y la sección de sesión reutilizan el marco visual, la terminología en español y los patrones de feedback del módulo. |
| IV. Rendimiento y confiabilidad | PASS | La resolución de permisos es en memoria; la lectura de sesión es acotada. El presupuesto de 50 ms se valida con una prueba automatizada que mide con `performance.now()` la resolución de sesión y permisos y exige ≤ 50 ms como promedio de 100 ejecuciones sobre el volumen de prueba definido. Las guardas evitan operaciones no autorizadas. |
| Estándares de calidad | PASS | El cierre exige `npm test -- --run`, `npm run build` y `npm run lint` sin errores. |

No se identifican violaciones que requieran justificación de complejidad.

## Alcance

### Incluido

- Pantalla de acceso por User ID con mensajes de error y ayuda de usuarios activos.
- Directorio local de usuarios con cinco roles y cinco usuarios de demostración.
- Persistencia de directorio y sesión en claves propias.
- Restauración de sesión entre recargas y re-resolución dinámica del rol.
- Cierre de sesión.
- Catálogo central de permisos y matriz de roles.
- Control de acceso a navegación, botones, formularios, acciones de fila, impresión, edición de líneas y catálogo.
- Filtrado de transiciones de estado por permiso del estado de origen y destino.
- Guardas en manejadores de eventos con mensaje uniforme de permisos.
- Denominación visible derivada del estado: «Solicitud de compra» y «Orden de Compra emitida», incluida la fecha de emisión.
- Separación entre aprobar (`orders.approve`) y rechazar (`orders.reject`) solicitudes `pendiente`; el `comprador` solo cancela `borrador`.
- Empleado solicitante automático y de solo lectura para el `comprador`, con vínculo persistido `Usuario.id_empleado`; selección manual para `administrador` y `gerente`.
- Límite de crédito oculto para el `comprador` y conservado en sus ediciones de proveedores.
- Integración de los elementos de `003` (`+ Nuevo`, panel lateral, tarjetas, filtros y detalle) con la matriz de permisos.
- Defensa en servicios con feedback de error persistente y sin falsos éxitos.
- Pruebas unitarias y de integración.
- Documentación en `README.md`.

### Excluido

- Contraseñas, tokens, cifrado, segundo factor y recuperación de credenciales.
- Integración con proveedor de identidad, OAuth, OIDC o directorio corporativo.
- Administración visual de usuarios y roles.
- Auditoría de accesos, bloqueo por intentos y registro de sesiones históricas.
- Autorización del lado del servidor.
- Sincronización de sesión entre pestañas, dispositivos o usuarios.
- Cambios en las reglas de negocio, claves o datos de los módulos `001` y `002`.

## Fase 0 - Investigación

Las decisiones completas están en [research.md](research.md). Resumen:

- **D1**: Autenticación de demostración basada solo en User ID, sin contraseñas.
- **D2**: Directorio y sesión en claves `erp_auth:*` separadas.
- **D3**: Catálogo declarativo de permisos y mapa estático de roles.
- **D4**: Re-resolución dinámica del rol al leer la sesión.
- **D5**: Control en tres capas: visibilidad, renderizado condicional y guardas en manejadores.
- **D6**: `initApp()` permisivo sin sesión; `boot()` aplica el login real.
- **D7**: Transiciones derivadas del ciclo canónico y filtradas por permiso del estado de origen y destino.
- **D8**: Catálogo de productos con modo de solo lectura.
- **D9**: Login integrado en la SPA y el marco existentes.
- **D10**: Pruebas con Vitest y jsdom.

## Fase 1 - Diseño

### Modelo de datos

El detalle está en [data-model.md](data-model.md). Entidades y conceptos principales:

- **Usuario**: `userId`, `nombre`, `cargo`, `role`, `activo`, `id_empleado` opcional.
- **Sesión**: `userId`, `nombre`, `role`, `loginAt`.
- **Rol**: `administrador`, `gerente`, `comprador`, `bodeguero`, `consulta`.
- **Permiso**: claves estables para vistas, acciones y transiciones, incluido `orders.reject`.
- **Mapeo de transiciones**: `borrador` → `pendiente` = `orders.submit`; `borrador` → `cancelado` = `orders.cancel`; `pendiente` → `aprobado` = `orders.approve`; `pendiente` → `cancelado` = `orders.reject`; `aprobado` → `recibido` = `orders.receive`.
- **Denominación visible**: `borrador` y `pendiente` → «Solicitud de compra»; `aprobado` y `recibido` → «Orden de Compra emitida».
- **Campo restringido**: `creditLimit` oculto y no editable para `comprador`.
- **Empleado solicitante**: vínculo `Usuario.id_empleado` para `comprador`, con exactamente un empleado propio por comprador y como máximo un usuario por empleado; selección manual para `administrador` y `gerente`. Si falta el vínculo se crea un empleado nuevo con nombre y cargo del Usuario de la sesión, sin reutilizar por nombre.

### Contratos

El detalle está en [contracts/auth-rbac.md](contracts/auth-rbac.md). Cubre:

- Operaciones de almacenamiento y de autenticación.
- Matriz de permisos y comportamiento de la interfaz por rol.
- Contrato de arranque (`boot()` vs. `initApp()`).
- Contrato de la pantalla de acceso y errores.
- Accesibilidad y limitaciones de seguridad.
- Contrato de aprobación y rechazo según estado actual.
- Contrato del empleado solicitante y del límite de crédito restringido.
- Contrato de defensa en servicios y de integración con `003`.

### Quickstart

La guía de validación está en [quickstart.md](quickstart.md). Incluye comandos, escenarios manuales por rol y resultados esperados.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/004-authentication-rbac/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-rbac.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Código Fuente (raíz del repositorio)

```text
index.html                     # pantalla de acceso y sección de sesión en la barra superior
src/
├── main.js                    # arranque de la aplicación
├── app.js                     # boot(), login/logout, gating de vistas y acciones
├── auth.js                    # directorio, sesión, roles, permisos y transiciones
├── access-policy.js           # reglas puras de rol/estado y vínculo del empleado solicitante
├── styles.css                 # estilos de acceso, sesión y utilidades
├── product-catalog.js         # catálogo con modo de solo lectura
├── purchase-order-detail.js   # detalle con denominación, emisión, empleado y acciones filtradas
├── purchase-order-print.js    # impresión con denominación, emisión, empleado y campos filtrados
└── (resto de módulos existentes sin cambios de contrato)

tests/
├── unit/
│   ├── auth.test.js
│   └── access-policy.test.js
└── integration/
    ├── auth-rbac.test.js
    └── auth-rbac-post-review.test.js
```

**Decisión de Estructura**: La lógica de identidad y permisos se aísla en `src/auth.js` para poder probarla sin DOM. Las reglas post-revisión que combinan rol, estado y campos restringidos se concentran en `src/access-policy.js`, también sin DOM, para que interfaz y servicios compartan una única fuente de verdad. `src/app.js` actúa como punto de integración y mantiene las guardas de interfaz. Los módulos de vista reciben opciones explícitas (`canManage`, `canPrint`, `canEditLines`, `allowedNextStatuses`, `documentLabel`, `canEditEmployee`, `showCreditLimit`) en lugar de consultar la sesión directamente, lo que preserva su bajo acoplamiento y permite probarlos de forma aislada.

## Reevaluación de la Constitución Post-Diseño

| Principio | Estado | Evidencia de diseño |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Módulo de autenticación dedicado; opciones explícitas en las vistas; sin duplicar la matriz de estados de Compras. |
| II. Pruebas y verificación | PASS | Cobertura unitaria de la lógica y de integración del DOM y del despliegue por rol. |
| III. Consistencia de experiencia | PASS | Acceso, sesión y mensajes siguen los patrones visuales y de feedback existentes; interfaz en español. |
| IV. Rendimiento y confiabilidad | PASS | Resolución de permisos en memoria, sin llamadas adicionales por render; prueba automatizada con `performance.now()` que valida ≤ 50 ms (promedio de 100 ejecuciones) para sesión y permisos; guardas que evitan mutaciones no autorizadas. |
| Complejidad | PASS | Un módulo nuevo y una integración acotada; no se añaden dependencias ni servicios. |

## Estrategia de Pruebas

### Unitarias (`tests/unit/auth.test.js`)

- Siembra del directorio y login por User ID sin distinguir mayúsculas.
- Rechazo de User ID vacío, desconocido e inactivo.
- Cierre de sesión y eliminación de la sesión persistida.
- Re-resolución dinámica del rol cuando cambia el directorio.
- Re-siembra del directorio cuando los datos almacenados son inválidos o corruptos.
- Matriz completa rol-permiso para los cinco roles.
- Permisos del comprador: operación sin aprobación, recepción ni gestión de productos.
- Permisos del bodeguero: recepción y stock, sin creación de órdenes ni edición de proveedores.
- Permisos de consulta: solo lectura e impresión.
- Administrador con todos los permisos declarados.
- Paridad explícita entre `gerente` y `administrador`.
- Mapeo de transiciones por estado de origen y destino a permisos, con `borrador` → `pendiente` = `orders.submit`, `borrador` → `cancelado` = `orders.cancel`, `pendiente` → `aprobado` = `orders.approve`, `pendiente` → `cancelado` = `orders.reject` y `aprobado` → `recibido` = `orders.receive`.
- Matriz de denominación por estado y fecha de emisión conservada o completada.
- Reglas del empleado solicitante: vínculo propio del `comprador` por `userId`, un solo empleado por comprador y como máximo un usuario por empleado, creación de un empleado nuevo con el nombre y cargo del Usuario cuando falta el vínculo, dos compradores con el mismo nombre obtienen empleados distintos, selección manual de `administrador`/`gerente` y rechazo de payload manipulado.
- Reglas del límite de crédito: ocultamiento para `comprador` y conservación del valor persistido.
- Reglas de integración con `003`: visibilidad de `+ Nuevo`, panel lateral, tarjetas, filtros y detalle.

### Unitarias de política (`tests/unit/access-policy.test.js`)

- Respuestas de `canCreateDocument`, `canEditDocument`, `canApprove`, `canReject` y `canCancel` por rol y estado.
- Resolución idempotente de `ensureRequesterEmployee(session, adapters)`, incluida la creación única del empleado propio y la reutilización del vínculo por `userId`.
- Rechazo de `creditLimit` manipulado y conservación del valor persistido en actualizaciones del `comprador`.
- Etiqueta visible y presencia de fecha de emisión por estado.
- Comportamiento permisivo cuando no hay sesión, consistente con `initApp()`.

### Integración (`tests/integration/auth-rbac.test.js`)

- La puerta de acceso permanece visible hasta un User ID válido.
- Error visible ante User ID desconocido.
- Nombre y rol en la barra superior tras autenticarse.
- Restauración de sesión tras recargar.
- Cierre de sesión y retorno a la puerta de acceso.
- Comprador: vistas operativas, sin transiciones de aprobación y con impresión.
- Bodeguero: sin proveedores ni formularios de orden; con recepción y gestión de productos.
- Consulta: solo lectura en proveedores y productos, sin formularios ni acciones, con impresión de órdenes permitida.
- Administrador y gerente: navegación visible, formularios permitidos, aprobación y rechazo de una solicitud `pendiente`, selección del empleado solicitante y edición de líneas.
- Rechazo uniforme con `No tienes permisos para ejecutar esta acción.` y sin mutar datos para transiciones, eliminación de línea, altas, ediciones y eliminaciones de proveedores, órdenes y productos no autorizados.
- Compatibilidad: las pruebas existentes que llaman a `initApp()` sin sesión siguen pasando.
- Comprador: «Solicitud de compra» en `borrador`/`pendiente`, sin botones de aprobar o rechazar, sin `creditLimit`, con empleado de solo lectura.
- Gerente y administrador: aprobar y rechazar disponibles solo en `pendiente`, con «Orden de Compra emitida» y fecha de emisión tras aprobar.
- Rechazo de payload manipulado de empleado y de límite de crédito sin mutación ni notificación de éxito.
- Detalle e impresión: denominación por estado, fecha de emisión o «Sin emitir», empleado solicitante, ausencia del límite de crédito para `comprador` y solo las acciones permitidas por el rol.
- Integración con `003`: `+ Nuevo` oculto sin permiso, panel lateral cerrado ante apertura forzada, tarjetas y filtros restringidos y detalle coherente con el servicio.

### Integración post-revisión (`tests/integration/auth-rbac-post-review.test.js`)

- Recorrido completo por rol de las superficies de `003` y de las acciones de aprobación/rechazo.
- Administrador y gerente: navegación visible, formularios permitidos, aprobación y rechazo de una solicitud `pendiente` y selección del empleado solicitante.
- Dos compradores con el mismo nombre obtienen empleados distintos vinculados por `userId`, sin reutilización por nombre.
- Verificación de que toda operación rechazada muestra error persistente, conserva el panel y no registra historial ni transacciones.
- Verificación de que la carga de datos de demostración no crea órdenes aprobadas para roles sin permiso de aprobación.

### Rendimiento

- Se añade una prueba automatizada que mide con `performance.now()` la resolución de sesión y permisos y exige ≤ 50 ms como promedio de 100 ejecuciones sobre el volumen de prueba definido para el módulo base (500 proveedores y 2.000 órdenes).
- Se conservan los presupuestos del módulo base: panel ≤ 500 ms y búsqueda ≤ 300 ms con 500 proveedores y 2.000 órdenes.

### Accesibilidad

- Foco en el campo de User ID al mostrar la puerta de acceso.
- Error de acceso con `aria-live="polite"`.
- Botones con texto comprensible.
- Controles ocultos con `display: none` efectivo y no accesibles por teclado.
- Contraste y foco visibles según los estilos existentes.

## Fases de Implementación

### Fase 0 - Investigación

Completada en [research.md](research.md).

### Fase 1 - Diseño

Completada con [data-model.md](data-model.md), [contracts/auth-rbac.md](contracts/auth-rbac.md) y [quickstart.md](quickstart.md).

### Fase 2 - Tareas

Detalladas en [tasks.md](tasks.md). Incluyen:

1. Crear el módulo de autenticación con directorio, sesión, roles y permisos.
2. Añadir la pantalla de acceso y la sección de sesión al HTML.
3. Integrar login, logout y control de acceso en `app.js`.
4. Extender el detalle de orden y el catálogo con opciones de permiso.
5. Añadir estilos de acceso y sesión.
6. Escribir pruebas unitarias y de integración.
7. Actualizar `README.md`.
8. Verificar pruebas, build y lint.

### Fase 3 - Ajustes post-revisión

Detalladas en [tasks.md](tasks.md), Phase 9. Incluyen:

1. Ampliar `src/auth.js` con `orders.reject` y el mapeo explícito de transición por estado de origen y destino.
2. Crear `src/access-policy.js` con las reglas de creación, edición, aprobación, rechazo, empleado solicitante y límite de crédito.
3. Extender `index.html` y `src/app.js` para la denominación por estado, el empleado de solo lectura, el límite de crédito restringido y la fecha de emisión.
4. Actualizar `src/purchase-order-detail.js` y `src/purchase-order-print.js` para la denominación por estado, la fecha de emisión o «Sin emitir», el empleado solicitante, la ausencia del límite de crédito para `comprador` y las acciones permitidas por rol.
5. Integrar los elementos de `003` (`+ Nuevo`, panel lateral, tarjetas, filtros y detalle) con la matriz de permisos.
6. Añadir feedback persistente de error y defensas en los servicios de proveedores y solicitudes.
7. Escribir pruebas unitarias de política e integración post-revisión.
8. Actualizar documentación de la funcionalidad y verificar pruebas, build y lint.

La Fase 9 del 004 se ejecuta solo después de completar la implementación del spec 003 (ui-side-panel, ui-feedback, purchasing-list-view, purchasing-list-query, purchasing-status, purchasing-demo-data). No se crean tareas para los módulos de 003 en esta funcionalidad.

## Riesgos y Decisiones Abiertas

| Riesgo o decisión | Tratamiento |
|---|---|
| El User ID no es una credencial secreta | Se documenta como autenticación de demostración y se declara que un despliegue real requiere autorización del lado del servidor. |
| `initApp()` sin sesión conserva acceso completo | Es intencional para compatibilidad de pruebas; `boot()` es el punto de entrada de producción y aplica el login. Se documenta en contrato y README. |
| Sesión compartida en el mismo navegador | Se ofrece cierre de sesión y se re-resuelve el usuario; la sincronización entre pestañas queda fuera de alcance. |
| Directorio editable sin pantalla administrativa | Se administra por código o `saveUsers`; la administración visual queda fuera de alcance. |
| Cambios de rol durante la sesión | La siguiente lectura de sesión aplica el rol vigente y redirige si la vista actual deja de estar permitida. |
| Regresiones en pruebas existentes | El control de acceso se aplica solo cuando hay sesión; la suite base se ejecuta sin ella y debe seguir pasando. |
| Doble fuente de verdad entre interfaz y servicios | Las reglas de rol/estado viven en `src/access-policy.js`; la interfaz y los servicios consumen la misma función y las pruebas comparan ambos caminos. |
| `002` no define una fecha de emisión automática | Se usa `startDate` como fecha de emisión y solo se completa al aprobar cuando está vacía; una fecha válida existente se conserva. Se documenta como supuesto. |
| El `comprador` no tiene empleado vinculado al inicio | `ensureRequesterEmployee` crea y persiste un empleado nuevo con el nombre y cargo del Usuario de la sesión, vinculado por `userId`; cada comprador tiene exactamente un empleado propio y un empleado puede estar vinculado como máximo a un usuario. No se reutiliza por nombre y se prueba que dos compradores con el mismo nombre obtienen empleados distintos. |
| Payload manipulado de `creditLimit` o `id_empleado` | El servicio revalida y rechaza con `PERMISSION_DENIED` sin mutar la entidad ni mostrar éxito. |
| Dependencia del spec `003` | La Fase 9 del 004 se ejecuta solo después de completar la implementación del spec 003 (ui-side-panel, ui-feedback, purchasing-list-view, purchasing-list-query, purchasing-status, purchasing-demo-data). No se crean tareas para los módulos de 003. |
| Datos de demostración de `003` con órdenes aprobadas | Se verifica que la acción de demo no cree órdenes `aprobado` para roles sin `orders.approve`; se corrige o restringe en la integración. |

## Seguimiento de Complejidad

No se introducen nuevos proyectos, servidores ni dependencias de ejecución. La complejidad adicional se limita a:

- Un módulo de autenticación dedicado, necesario para separar identidad y permisos de la lógica de negocio.
- Un módulo de política de acceso (`src/access-policy.js`) compartido por interfaz y servicios, que evita duplicar reglas de rol/estado.
- Una pantalla de acceso y una sección de sesión en el marco existente.
- Opciones de permiso explícitas en los módulos de vista, necesarias para evitar que consulten la sesión global.

No hay violaciones de la constitución que requieran una justificación adicional.
