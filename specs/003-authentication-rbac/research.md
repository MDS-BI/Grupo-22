# Investigación de Implementación: Autenticación por User ID y RBAC

**Rama**: `003-authentication-rbac`
**Fecha**: 2026-11-08
**Especificación**: [spec.md](spec.md)

## Objetivo

Resolver las decisiones técnicas necesarias para incorporar inicio de sesión por **User ID**, resolución de rol, permisos y control de acceso a vistas, acciones, catálogo y transiciones de estado sobre la SPA Vite/JavaScript existente, sin backend, sin contraseñas y con persistencia en `localStorage`.

## Decisiones

### D1 - Autenticación de demostración basada solo en User ID

- **Decisión**: El acceso se realiza ingresando un User ID registrado. No se solicitan contraseñas, tokens ni segundo factor. La identificación se complementa con el nombre, cargo y rol almacenados en el directorio local.
- **Justificación**: El proyecto no tiene backend ni servicio de identidad. Un identificador local permite demostrar el RBAC y la experiencia por rol sin introducir criptografía ni gestión de secretos, que estarían fuera de alcance y darían una falsa sensación de seguridad.
- **Alternativas consideradas**: Contraseñas locales hasheadas con Web Crypto; se descarta porque exige gestión de credenciales, recuperación y migración, y no aporta una frontera de seguridad real en una SPA sin servidor. Integración con proveedor OIDC; se descarta por infraestructura y alcance.

### D2 - Persistir directorio y sesión en claves propias

- **Decisión**: Guardar el directorio en `erp_auth:users` y la sesión en `erp_auth:session`, ambas en `localStorage`, sin reutilizar ni modificar las claves del módulo base ni de Compras.
- **Justificación**: Mantiene separadas las responsabilidades de identidad y de negocio, evita migraciones del esquema existente y permite limpiar la sesión sin afectar los datos de la aplicación.
- **Alternativas consideradas**: Guardar usuarios y sesión dentro de `erp_base_module:*`; se descarta porque mezcla autenticación con datos maestros y complica la auditoría y el borrado selectivo. Usar `sessionStorage`; se descarta porque la sesión debe sobrevivir a recargas y aperturas de pestaña.

### D3 - Modelo de permisos declarativo con roles estáticos

- **Decisión**: Definir un catálogo central de permisos (`PERMISSIONS`) y un mapa de roles (`ROLE_DEFINITIONS`) que asigna permisos a `administrador`, `gerente`, `comprador`, `bodeguero` y `consulta`. La interfaz consulta permisos mediante `can(permission, sessionOrRole)`.
- **Justificación**: Un catálogo único evita cadenas mágicas dispersas, facilita probar la matriz de permisos y permite que la interfaz y los manejadores de eventos compartan la misma fuente de verdad.
- **Alternativas consideradas**: Comprobar el nombre del rol directamente en cada vista; se descarta porque duplica reglas y vuelve frágil cualquier cambio. Permisos por usuario; se descarta porque el requisito es RBAC y el directorio solo asigna un rol.

### D4 - Resolver el rol dinámicamente al leer la sesión

- **Decisión**: `getSession()` no confía ciegamente en la instantánea guardada: busca al usuario en el directorio vigente, valida que exista y esté activo, y actualiza nombre y rol en la sesión. Si el usuario desaparece o se desactiva, la sesión se limpia.
- **Justificación**: Permite que un cambio de rol o la desactivación de un usuario surtan efecto sin obligarlo a cerrar sesión manualmente, y evita sesiones huérfanas tras editar el directorio.
- **Alternativas consideradas**: Guardar el rol solo en la sesión y no volver a consultar; se descarta porque un rol revocado seguiría vigente hasta el cierre de sesión.

### D5 - Aplicar el control en tres capas

- **Decisión**: El control de acceso se aplica en (1) visibilidad de navegación y botones, (2) renderizado condicional de formularios, acciones de fila, impresión y edición de líneas, y (3) guardas en los manejadores de eventos antes de ejecutar la operación. La capa 3 es obligatoria aunque la interfaz ya haya ocultado el control.
- **Justificación**: Ocultar un botón mejora la experiencia, pero no impide invocar el evento por consola o por un control manipulado. Las guardas garantizan que una acción no autorizada no modifique datos y permiten mostrar un mensaje uniforme.
- **Alternativas consideradas**: Solo ocultar controles; se descarta por ser una autorización aparente. Solo bloquear en el almacenamiento; se descarta porque la experiencia mostraría acciones inútiles y los mensajes serían menos claros.

### D6 - Mantener `initApp()` permisivo y concentrar el login en `boot()`

- **Decisión**: `initApp()` resuelve la sesión existente y aplica el control de acceso, pero si no hay sesión mantiene el comportamiento histórico de acceso completo. `boot()` es el punto de entrada real: si no hay sesión, muestra la pantalla de acceso y no inicializa la aplicación.
- **Justificación**: Las pruebas de integración existentes y los usos internos llaman a `initApp()` directamente sin autenticarse. Forzar el login allí rompería la suite y obligaría a sembrar sesiones en decenas de pruebas ajenas a esta funcionalidad. La separación conserva compatibilidad y mantiene el login real en el arranque de producción.
- **Alternativas consideradas**: Exigir sesión en `initApp()`; se descarta por regresión masiva en pruebas. Modificar todas las pruebas existentes para iniciar sesión; se descarta porque acopla la suite base a una extensión posterior.

### D7 - Derivar las transiciones de estado desde el ciclo canónico y filtrarlas por permiso

- **Decisión**: Las acciones de estado se obtienen con `getAvailableActionItems(status)` del dominio de Compras y luego se filtran por el permiso asociado al estado destino (`pendiente` → envío, `aprobado` → aprobación, `recibido` → recepción, `cancelado` → cancelación). El detalle recibe `allowedNextStatuses`; el manejador de la transición vuelve a comprobar el permiso.
- **Justificación**: Evita reimplementar el ciclo de vida y garantiza que el RBAC solo reduzca las acciones ya válidas, sin abrir transiciones que el dominio rechazaría.
- **Alternativas consideradas**: Duplicar la matriz de estados en `auth.js`; se descarta porque dos fuentes de verdad pueden divergir. Filtrar solo en el DOM; se descarta por la capa 3 de D5.

### D8 - Catálogo de productos con modo de solo lectura

- **Decisión**: El catálogo recibe `canManage` desde `app.js`. Cuando es `false`, no renderiza el formulario, no muestra la columna de acciones y sus funciones de alta, edición, eliminación y creación de categoría retornan sin operar.
- **Justificación**: Permite que `consulta` y `comprador` vean productos sin mantenimiento, y que `bodeguero` y `gerente` los gestionen, reutilizando el mismo módulo sin duplicar vistas.
- **Alternativas consideradas**: Ocultar por completo el catálogo a los roles sin gestión; se descarta porque `consulta` y `comprador` necesitan consultar productos. Crear un catálogo separado de solo lectura; se descarta por duplicación.

### D9 - Integrar el login en la SPA y el marco existentes

- **Decisión**: Añadir una pantalla `auth-gate` y una sección de sesión en la barra superior dentro de `index.html`, con estilos en `src/styles.css`, sin router ni framework. `boot()` decide entre login e inicialización; el cierre de sesión vuelve a mostrar la puerta de acceso.
- **Justificación**: Respeta la arquitectura y el lenguaje visual del proyecto, evita nuevas dependencias y permite probar el flujo con jsdom.
- **Alternativas consideradas**: Página de login separada; se descarta porque la aplicación es una SPA y perdería el estado en memoria. Framework de rutas; se descarta por alcance y stack.

### D10 - Probar con Vitest y jsdom la matriz de roles y las guardas

- **Decisión**: Mantener Vitest + jsdom. Añadir pruebas unitarias de normalización, login, sesión, resolución dinámica de rol, permisos y mapeo de transiciones, y pruebas de integración para la puerta de acceso, restauración de sesión, cierre de sesión y despliegue de interfaz por rol.
- **Justificación**: Es el arnés existente, no requiere infraestructura nueva y permite verificar tanto la lógica pura como el DOM y los efectos de los manejadores.
- **Alternativas consideradas**: Pruebas end-to-end con navegador real; se posponen porque no hay Playwright ni Cypress configurados.

## Resolución de Incógnitas

No quedan marcadores `NEEDS CLARIFICATION` en el contexto técnico. Las decisiones cubren identificación, persistencia, modelo de permisos, aplicación en interfaz, compatibilidad con pruebas, transiciones, catálogo y verificación.

## Riesgos Residuales

- **Seguridad local**: El User ID no es una credencial secreta y el almacenamiento es manipulable. El RBAC es una barrera de experiencia y operación, no una frontera de seguridad frente a un usuario con control del navegador. Debe declararse en la documentación y en el contrato.
- **Compatibilidad de pruebas**: El acceso completo de `initApp()` sin sesión es intencional, pero podría confundirse con una omisión de seguridad. Debe documentarse que el punto de entrada de producción es `boot()`.
- **Sesión compartida en el navegador**: Cualquier persona con acceso al mismo perfil puede reutilizar la sesión hasta que se cierre. El cierre de sesión y la re-resolución de usuarios reducen el riesgo, pero no lo eliminan.
- **Directorio editable**: `saveUsers` permite modificar roles, pero no existe una pantalla administrativa ni auditoría de cambios. Se asume administración por código o consola.
