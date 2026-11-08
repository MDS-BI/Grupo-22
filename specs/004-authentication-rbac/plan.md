# Plan de Implementación: Autenticación por User ID y RBAC

**Rama**: `004-authentication-rbac` | **Fecha**: 2026-11-08 | **Especificación**: [spec.md](spec.md)

**Entrada**: Extensión del módulo de Compras para incorporar inicio de sesión por User ID, directorio local de usuarios, resolución de roles y permisos, y control de acceso a vistas, acciones, catálogo y transiciones de estado, conservando la arquitectura SPA, la persistencia en `localStorage` y el comportamiento de los módulos `001` y `002`.

## Resumen

La extensión se implementa sobre la SPA Vite/JavaScript existente. Añade un módulo de autenticación (`src/auth.js`) con el directorio de usuarios, la sesión activa, el catálogo de permisos y la resolución de roles. La interfaz incorpora una pantalla de acceso y una sección de sesión en la barra superior, y el arranque de producción (`boot()`) decide entre login e inicialización.

El control de acceso se aplica en tres capas: navegación y botones, renderizado condicional de formularios y acciones, y guardas en los manejadores de eventos. Las transiciones de estado se filtran combinando el ciclo canónico de Compras con el permiso del estado destino. El catálogo de productos admite un modo de solo lectura para roles sin gestión.

No se modifican las claves, entidades ni reglas del módulo base ni de la extensión de órdenes de compra. La autenticación agrega dos claves propias: `erp_auth:users` y `erp_auth:session`.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript ES2022, HTML5, CSS.

**Dependencias Principales**: Vite 8.2, Vitest 4.1 y jsdom 30. Sin framework de interfaz ni backend.

**Almacenamiento**: `localStorage` del navegador.

- `erp_auth:users`: directorio local de usuarios.
- `erp_auth:session`: sesión activa.
- `erp_base_module:*` y `erp_purchasing:*`: datos existentes, sin cambios de esquema.

**Pruebas**: Vitest con jsdom. Pruebas unitarias para normalización, login, sesión y permisos; pruebas de integración para la puerta de acceso, restauración de sesión, cierre de sesión y despliegue de interfaz por rol.

**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles.

**Tipo de Proyecto**: Aplicación web de una sola página, local y sin servidor.

**Objetivos de Rendimiento**:

- Resolver la sesión y aplicar el control de acceso en ≤ 50 ms al arrancar.
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
| IV. Rendimiento y confiabilidad | PASS | La resolución de permisos es en memoria; la lectura de sesión es acotada y no altera los presupuestos del módulo base. Las guardas evitan operaciones no autorizadas. |
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
- Filtrado de transiciones de estado por permiso del estado destino.
- Guardas en manejadores de eventos con mensaje uniforme de permisos.
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
- **D7**: Transiciones derivadas del ciclo canónico y filtradas por permiso del estado destino.
- **D8**: Catálogo de productos con modo de solo lectura.
- **D9**: Login integrado en la SPA y el marco existentes.
- **D10**: Pruebas con Vitest y jsdom.

## Fase 1 - Diseño

### Modelo de datos

El detalle está en [data-model.md](data-model.md). Entidades y conceptos principales:

- **Usuario**: `userId`, `nombre`, `cargo`, `role`, `activo`.
- **Sesión**: `userId`, `nombre`, `role`, `loginAt`.
- **Rol**: `administrador`, `gerente`, `comprador`, `bodeguero`, `consulta`.
- **Permiso**: claves estables para vistas, acciones y transiciones.
- **Mapeo de transiciones**: estado destino → permiso requerido.

### Contratos

El detalle está en [contracts/auth-rbac.md](contracts/auth-rbac.md). Cubre:

- Operaciones de almacenamiento y de autenticación.
- Matriz de permisos y comportamiento de la interfaz por rol.
- Contrato de arranque (`boot()` vs. `initApp()`).
- Contrato de la pantalla de acceso y errores.
- Accesibilidad y limitaciones de seguridad.

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
├── styles.css                 # estilos de acceso, sesión y utilidades
├── product-catalog.js         # catálogo con modo de solo lectura
├── purchase-order-detail.js   # detalle con acciones, impresión y edición filtradas
└── (resto de módulos existentes sin cambios de contrato)

tests/
├── unit/
│   └── auth.test.js
└── integration/
    └── auth-rbac.test.js
```

**Decisión de Estructura**: La lógica de identidad y permisos se aísla en `src/auth.js` para poder probarla sin DOM. `src/app.js` actúa como punto de integración y mantiene las guardas de interfaz. Los módulos de vista reciben opciones explícitas (`canManage`, `canPrint`, `canEditLines`, `allowedNextStatuses`) en lugar de consultar la sesión directamente, lo que preserva su bajo acoplamiento y permite probarlos de forma aislada.

## Reevaluación de la Constitución Post-Diseño

| Principio | Estado | Evidencia de diseño |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Módulo de autenticación dedicado; opciones explícitas en las vistas; sin duplicar la matriz de estados de Compras. |
| II. Pruebas y verificación | PASS | Cobertura unitaria de la lógica y de integración del DOM y del despliegue por rol. |
| III. Consistencia de experiencia | PASS | Acceso, sesión y mensajes siguen los patrones visuales y de feedback existentes; interfaz en español. |
| IV. Rendimiento y confiabilidad | PASS | Resolución de permisos en memoria, sin llamadas adicionales por render; guardas que evitan mutaciones no autorizadas. |
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
- Mapeo de estados destino a permisos.

### Integración (`tests/integration/auth-rbac.test.js`)

- La puerta de acceso permanece visible hasta un User ID válido.
- Error visible ante User ID desconocido.
- Nombre y rol en la barra superior tras autenticarse.
- Restauración de sesión tras recargar.
- Cierre de sesión y retorno a la puerta de acceso.
- Comprador: vistas operativas, sin transiciones de aprobación y con impresión.
- Bodeguero: sin proveedores ni formularios de orden; con recepción y gestión de productos.
- Consulta: solo lectura en proveedores y productos, sin formularios ni acciones.
- Administrador y gerente: despliegue completo de vistas, formularios, transiciones y edición de líneas.
- Rechazo de transición, impresión, eliminación de línea y envío de formulario no autorizados sin mutar datos.
- Compatibilidad: las pruebas existentes que llaman a `initApp()` sin sesión siguen pasando.

### Rendimiento

- No se añaden pruebas de rendimiento específicas; el control de acceso es un filtrado en memoria y la lectura de sesión es acotada. Se conservan los presupuestos del módulo base.

### Accesibilidad

- Foco en el campo de User ID al mostrar la puerta de acceso.
- Error de acceso con `aria-live="polite"`.
- Botones con texto comprensible.
- Controles ocultos no accesibles por teclado.
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

## Riesgos y Decisiones Abiertas

| Riesgo o decisión | Tratamiento |
|---|---|
| El User ID no es una credencial secreta | Se documenta como autenticación de demostración y se declara que un despliegue real requiere autorización del lado del servidor. |
| `initApp()` sin sesión conserva acceso completo | Es intencional para compatibilidad de pruebas; `boot()` es el punto de entrada de producción y aplica el login. Se documenta en contrato y README. |
| Sesión compartida en el mismo navegador | Se ofrece cierre de sesión y se re-resuelve el usuario; la sincronización entre pestañas queda fuera de alcance. |
| Directorio editable sin pantalla administrativa | Se administra por código o `saveUsers`; la administración visual queda fuera de alcance. |
| Cambios de rol durante la sesión | La siguiente lectura de sesión aplica el rol vigente y redirige si la vista actual deja de estar permitida. |
| Regresiones en pruebas existentes | El control de acceso se aplica solo cuando hay sesión; la suite base se ejecuta sin ella y debe seguir pasando. |

## Seguimiento de Complejidad

No se introducen nuevos proyectos, servidores ni dependencias de ejecución. La complejidad adicional se limita a:

- Un módulo de autenticación dedicado, necesario para separar identidad y permisos de la lógica de negocio.
- Una pantalla de acceso y una sección de sesión en el marco existente.
- Opciones de permiso explícitas en dos módulos de vista, necesarias para evitar que consulten la sesión global.

No hay violaciones de la constitución que requieran una justificación adicional.
