# Contratos: Autenticación por User ID y RBAC

**Rama**: `004-authentication-rbac`
**Fecha**: 2026-11-08
**Actualizado**: 2026-11-14
**Especificación**: [spec.md](../spec.md)
**Modelo de datos**: [data-model.md](../data-model.md)

## Alcance

La funcionalidad es una aplicación web local sin API externa. Los contratos documentan las interfaces internas de autenticación, los permisos por rol, el control de acceso observable en la interfaz y los límites de seguridad de la solución. Los ajustes post-revisión del 2026-11-14 añaden contratos de denominación por estado, aprobación y rechazo, empleado solicitante, límite de crédito restringido, integración con `003` y defensa en servicios.

## Contrato de Almacenamiento

| Clave | Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|---|
| `erp_auth:users` | Leer directorio (`loadUsers`) | — | Arreglo normalizado de usuarios; siembra por defecto si está ausente o vacío | Datos inválidos se descartan; nunca lanza |
| `erp_auth:users` | Guardar directorio (`saveUsers`) | Arreglo de usuarios | Arreglo normalizado persistido | Usuarios inválidos se filtran; escritura best-effort |
| `erp_auth:users` | Sembrar directorio (`ensureDefaultUsers`) | — | Usuarios de demostración persistidos solo si no hay usuarios válidos | Escritura best-effort |
| `erp_auth:session` | Leer sesión (`getSession`) | — | Sesión vigente o `null` | Sesión inválida se elimina y retorna `null` |
| `erp_auth:session` | Iniciar sesión (`login`) | `userId` | Sesión persistida | `USER_ID_REQUIRED`, `USER_NOT_FOUND`, `USER_INACTIVE` |
| `erp_auth:session` | Cerrar sesión (`clearSession`) | — | Clave eliminada | Ninguno; best-effort |

**Nota**: Si `localStorage` no está disponible, la lectura devuelve valores por defecto y la escritura se ignora sin romper la aplicación. La sesión y el control de acceso siguen funcionando en memoria durante la ejecución actual.

## Contrato de Autenticación (`src/auth.js`)

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| `normalizeUserId(value)` | Valor arbitrario | String en mayúsculas, sin espacios externos | — |
| `loadUsers()` | — | Arreglo de usuarios normalizados | — |
| `ensureDefaultUsers()` | — | Arreglo de usuarios, sembrando los de demostración si no hay usuarios válidos | — |
| `saveUsers(users)` | Arreglo | Arreglo normalizado persistido | — |
| `findUser(userId)` | `userId` | Usuario o `null` | — |
| `roleDefinition(role)` | Rol | Definición del rol o `null` | — |
| `roleLabel(role)` | Rol | Etiqueta visible o el valor original | — |
| `permissionsFor(role)` | Rol | `Set` de permisos | — |
| `can(permission, sessionOrRole)` | Permiso y sesión o rol | `true` si el rol tiene el permiso | — |
| `transitionPermission(currentStatus, nextStatus)` | Estado de origen y estado destino, ambos obligatorios | Permiso asociado o `null` si falta alguno o la transición no está definida | — |
| `canTransitionTo(currentStatus, nextStatus, sessionOrRole)` | Estado de origen, estado destino y sesión o rol | `true` solo si ambos estados están presentes y el rol tiene el permiso | — |
| `login(userId)` | `userId` | Sesión persistida | `USER_ID_REQUIRED`, `USER_NOT_FOUND`, `USER_INACTIVE` |
| `getSession()` | — | Sesión vigente o `null` | — |
| `clearSession()` | — | — | — |
| `isAuthenticated()` | — | `true` si existe sesión vigente | — |

### Contrato de normalización

- `normalizeUserId` aplica `trim` y mayúsculas; `comp-001` se resuelve como `COMP-001`.
- Un usuario solo se persiste si su `userId` cumple `^[A-Z0-9._@-]{2,40}$`.
- Un rol desconocido se normaliza a `consulta`.
- Un usuario es inactivo solo si `activo` o `active` es explícitamente `false`.
- Un `nombre` vacío se reemplaza por el `userId`.

### Contrato de sesión

- La sesión contiene `{ userId, nombre, role, loginAt }`.
- La Sesión no almacena `cargo`; el nombre y el cargo del empleado solicitante se obtienen del registro de Usuario resuelto por `userId`.
- `login` siembra el directorio antes de buscar y no permite usuarios inactivos.
- `getSession` re-resuelve el usuario en el directorio vigente:
  - Si no existe o está inactivo, elimina la sesión y retorna `null`.
  - Si el nombre o el rol cambiaron, actualiza la sesión persistida.
- `clearSession` elimina solo la sesión; no modifica el directorio.
- `isAuthenticated` equivale a `getSession() !== null`.

### Contrato de permisos

- Los permisos son claves estables declaradas en `PERMISSIONS`.
- Un rol obtiene sus permisos exclusivamente de `ROLE_DEFINITIONS`.
- `can` acepta una sesión (`{ role }`) o un nombre de rol.
- `can` retorna `false` si no hay rol o el rol es inexistente.
- `administrador` recibe todos los permisos declarados.
- Las transiciones se mapean por estado de origen y destino, no por acción textual: `borrador` → `pendiente` = `orders.submit`; `borrador` → `cancelado` = `orders.cancel`; `pendiente` → `aprobado` = `orders.approve`; `pendiente` → `cancelado` = `orders.reject`; `aprobado` → `recibido` = `orders.receive`.
- La resolución exige siempre estado de origen y estado destino. Si falta el estado de origen, `transitionPermission` y `canTransitionTo` rechazan la transición y no conceden permiso por defecto. No existe una ruta de compatibilidad por estado de destino.
- `orders.reject` existe solo para `administrador` y `gerente`.

## Contrato de Política de Acceso (`src/access-policy.js`)

Módulo puro, sin DOM, compartido por la interfaz y los servicios. Recibe la sesión vigente; si no hay sesión, conserva el comportamiento permisivo de `initApp()`.

| Operación | Entrada | Salida | Errores esperados |
|---|---|---|---|
| `documentLabel(status)` | Estado persistido | «Solicitud de compra» para `borrador`/`pendiente`/`cancelado`; «Orden de Compra emitida» para `aprobado`/`recibido` | — |
| `canCreateDocument(session)` | Sesión o `null` | `true` con `documents.create` o sin sesión | — |
| `canEditDocument(session, status)` | Sesión y estado actual | `true` con `documents.update` y estado editable, o sin sesión | — |
| `canApprove(session, status)` | Sesión y estado actual | `true` solo en `pendiente` con `orders.approve` | — |
| `canReject(session, status)` | Sesión y estado actual | `true` solo en `pendiente` con `orders.reject` | — |
| `canCancel(session, status)` | Sesión y estado actual | `true` en `borrador` con `orders.cancel`; `true` en `pendiente` con `orders.reject`; sin sesión, `true` | — |
| `canViewCreditLimit(session)` | Sesión o `null` | `true` para `administrador`, `gerente` y `consulta`; `false` para `comprador`; `true` sin sesión | — |
| `sanitizeEntityPayload(session, payload, persisted)` | Sesión, payload entrante y entidad persistida | Payload saneado; conserva `creditLimit` persistido para `comprador` | `PERMISSION_DENIED` si el `comprador` intenta cambiarlo |
| `ensureRequesterEmployee(session, adapters)` | Sesión `comprador` y adaptadores de empleados/usuarios | Empleado vinculado, creado una sola vez si falta | — |
| `resolveRequesterForSave(session, requestedId, adapters)` | Sesión, `id_empleado` solicitado y adaptadores | `id_empleado` permitido | `PERMISSION_DENIED` si el `comprador` envía otro; `VALIDATION_ERROR` si `administrador`/`gerente` omiten un empleado existente |
| `emissionDateFor(order, now)` | Orden y fecha de referencia | `startDate` válido existente o fecha `YYYY-MM-DD` en America/Santiago | — |

**Invariantes**:

- La política no crea transiciones nuevas: solo filtra las que el ciclo canónico de `002` ya permite para el estado actual.
- La interfaz y los servicios invocan la misma función para una misma decisión; no se duplican condiciones de rol en los manejadores.
- Sin sesión, todas las operaciones mantienen el comportamiento permisivo histórico, salvo las que dependen de un usuario concreto (`ensureRequesterEmployee`, `resolveRequesterForSave`), que no aplican.

## Contrato de Aprobación, Rechazo y Emisión

| Estado actual | Acción | Permiso | Efecto |
|---|---|---|---|
| `borrador` | Enviar a aprobación | `orders.submit` | `pendiente`; sin fecha de emisión |
| `borrador` | Cancelar | `orders.cancel` | `cancelado`; etiqueta «Solicitud de compra» |
| `pendiente` | Aprobar | `orders.approve` | `aprobado`; etiqueta «Orden de Compra emitida»; completa `startDate` solo si falta |
| `pendiente` | Rechazar (cancelar) | `orders.reject` | `cancelado`; etiqueta «Solicitud de compra»; sin fecha de emisión nueva |
| `aprobado` | Recibir | `orders.receive` | `recibido`; conserva etiqueta y fecha de emisión |
| `recibido` / `cancelado` | — | — | Sin acciones |

**Reglas**:

- `comprador` no puede ejecutar `orders.approve` ni `orders.reject`; su intento se rechaza con `PERMISSION_DENIED` y no muta estado, historial ni stock.
- `orders.cancel` no habilita cancelar una solicitud `pendiente`; para ese estado se exige `orders.reject`.
- La etiqueta se recalcula al cambiar el estado y se usa en listas, tarjetas, filtros, panel lateral, detalle, impresión, confirmaciones y notificaciones.
- La fecha de emisión se muestra junto a «Orden de Compra emitida» y usa `startDate` de `002`; si el documento no está aprobado, el detalle y la impresión muestran «Sin emitir». Una fecha válida existente nunca se sobrescribe.

## Contrato del Límite de Crédito

| Rol | Formulario / panel | Listas, tarjetas, filtros y detalle | Escritura |
|---|---|---|---|
| `administrador` | Visible | Visible | Permitida |
| `gerente` | Visible | Visible | Permitida |
| `consulta` | No aplica | Visible en solo lectura | No permitida |
| `comprador` | Oculto con `display: none` efectivo o ausente del DOM | Oculto | Conserva el valor persistido; cambio intentado → `PERMISSION_DENIED` |
| `bodeguero` | Sin acceso a proveedores | Sin acceso | No aplica |

- El `comprador` no recibe el valor en el payload de edición; si lo envía, el servicio lo rechaza sin mutar el proveedor ni mostrar éxito.
- Los filtros, columnas, resúmenes y la búsqueda no ofrecen el campo al `comprador`.
- Un control oculto no debe ser accesible por teclado ni por tecnologías de asistencia.

## Contrato del Empleado Solicitante

| Rol | Asignación | Editable | Validación de servicio |
|---|---|---|---|
| `comprador` | Automática mediante `Usuario.id_empleado`; un solo empleado propio por comprador y como máximo un usuario por empleado | No; solo lectura | Fuerza el vínculo propio; otro `id_empleado` → `PERMISSION_DENIED` |
| `administrador` | Selección desde empleados registrados | Sí | Exige un empleado existente |
| `gerente` | Selección desde empleados registrados | Sí | Exige un empleado existente |
| `bodeguero` / `consulta` | Sin creación ni edición | No aplica | No aplica |

- `ensureRequesterEmployee` resuelve el vínculo por `userId`; si no existe, crea un empleado nuevo con el nombre y el cargo del Usuario de la sesión y persiste el vínculo en `erp_auth:users`. No reutiliza empleados por coincidencia de nombre.
- Cada `comprador` tiene exactamente un empleado propio; un empleado puede estar vinculado como máximo a un usuario. Dos compradores con el mismo nombre obtienen empleados distintos.
- El nombre y el cargo se obtienen del registro de Usuario resuelto por `userId`; la entidad Sesión no cambia.
- El vínculo se reutiliza en todas las solicitudes del mismo `comprador`; no se duplica por nombre.
- El empleado solicitante sigue siendo obligatorio conforme a `002`.

## Contrato de Integración con `003`

| Elemento de `003` | Permiso o regla | Comportamiento sin permiso |
|---|---|---|
| Botón «+ Nuevo» de cada lista | Permiso de creación de la lista | Oculto con `display: none`; fuera del orden de tabulación |
| Apertura del panel lateral en creación/edición | Permiso de creación o edición | Se rechaza con error persistente; el panel no se abre |
| Tarjeta clicable del panel | Permiso de vista de la lista destino | No navegable; oculta o deshabilitada de forma accesible |
| Filtros, columnas y resúmenes | Visibilidad por rol del campo | No se ofrece el filtro ni se revela el valor |
| Vista de detalle | Permisos de acción y campos restringidos | No renderiza acciones rechazables ni campos ocultos |
| Notificaciones de `003` | Resultado real de la operación | Error persistente; nunca éxito falso |

- La visibilidad incondicional de «+ Nuevo» descrita en `003` queda subordinada a la matriz de permisos de esta funcionalidad.
- La carga de datos de demostración de `003` no debe crear órdenes `aprobado` para roles sin `orders.approve`.

## Contrato de Control de Acceso en la Interfaz

### Elementos y comportamiento

| Elemento | Permiso | Comportamiento sin permiso |
|---|---|---|
| `#nav-dashboard` | `dashboard.view` | Oculto |
| `#nav-entities` | `entities.view` | Oculto |
| `#nav-documents` | `documents.view` | Oculto |
| `#nav-products` | `products.view` | Oculto |
| `#nav-search` | `search.view` | Oculto |
| `#action-new-entity` | `entities.create` | Oculto |
| `#action-new-document` | `documents.create` | Oculto |
| `#action-open-entities` | `entities.view` | Oculto |
| `#action-find` | `search.view` | Oculto |
| «+ Nuevo» de cualquier lista de `003` | Permiso de creación de la lista | Oculto con `display: none` y fuera del orden de tabulación |
| Panel lateral de `003` en creación/edición | Permiso de creación o edición | No se abre; error persistente ante apertura forzada |
| Tarjetas clicables del panel de `003` | Permiso de vista de la lista destino | No navegables; ocultas o deshabilitadas de forma accesible |
| Filtros, columnas y resúmenes de `003` | Visibilidad por rol del campo | No se ofrecen ni revelan campos restringidos |
| `#entity-form` | `entities.create` u `entities.update` | Oculto |
| `#document-form` | `documents.create` u `documents.update` | Oculto |
| Campo `#creditLimit` | `administrador`, `gerente`, `consulta` | Oculto con `display: none` efectivo o ausente del DOM para `comprador` |
| Selector de empleado solicitante | `administrador` o `gerente` | Solo lectura con el empleado propio para `comprador` |
| Acciones `edit` / `delete` de proveedor | `entities.update` / `entities.delete` | No se renderizan |
| Acciones `edit` / `delete` de orden | `documents.update` / `documents.delete` | No se renderizan |
| Botón `print-order` | `orders.print` | Oculto |
| Acciones `transition` | Permiso del estado de origen y destino | No se renderizan |
| Acciones de aprobar y rechazar | `orders.approve` / `orders.reject` en `pendiente` | No se renderizan |
| Eliminación de línea en detalle | `documents.update` | Oculta |
| Formulario y acciones del catálogo | `products.manage` | No se renderizan; catálogo en solo lectura |
| `#session-info` | Sesión activa | Oculto |
| `#auth-gate` | Sin sesión | Visible |

**Matriz de borrado**: la matriz normativa de `spec.md` y `data-model.md` prevalece. El `comprador` puede ejecutar `documents.delete`, pero no `entities.delete`; `bodeguero` y `consulta` no pueden ejecutar ninguno de los dos. Los guards de los manejadores deben aplicar exactamente esta regla.

### Reglas de despliegue

- Si la vista actual deja de estar permitida, se muestra la primera vista permitida en el orden `dashboard`, `entities`, `documents`, `products`, `search`.
- Las vistas `order-detail` y `print` requieren `documents.view`.
- El detalle de orden combina las acciones válidas del ciclo de vida con los permisos del rol y el estado actual; nunca muestra una acción que el dominio no permita.
- El detalle, las listas, las tarjetas, los filtros y las notificaciones usan la denominación derivada del estado.
- El `comprador` nunca recibe el límite de crédito ni un selector editable de empleado.
- La impresión requiere `orders.print` tanto para mostrar el botón como para ejecutar la acción.
- El rol `consulta` puede imprimir (FR-020); en la matriz vigente los cinco roles tienen `orders.print`, por lo que no existe un rol de prueba sin ese permiso.
- El detalle y la impresión muestran «Solicitud de compra» u «Orden de Compra emitida» según el estado, la fecha de emisión o «Sin emitir» cuando no está aprobada, el empleado solicitante, ocultan el límite de crédito al `comprador` y solo renderizan las acciones permitidas para el rol.
- La edición de líneas requiere `documents.update` y que la orden no sea terminal.
- El catálogo sin `products.manage` no permite alta, edición, eliminación ni creación de categoría, aunque se invoque la función directamente.
- Todo elemento oculto por permisos DEBE tener `display: none` efectivo en el estilo computado; el atributo `hidden` por sí solo no es suficiente si otra regla CSS define `display`.

### Contrato de defensa de acciones

- Toda operación de alta, edición, eliminación, impresión o transición comprueba el permiso en su manejador antes de operar.
- Los servicios de proveedores, solicitudes y transiciones revalidan la política de acceso antes de mutar datos, aunque la interfaz haya omitido el control.
- Si falta el permiso, se muestra una notificación de error persistente con el mensaje `No tienes permisos para ejecutar esta acción.` y no se modifica ningún dato.
- Una operación rechazada no registra historial de estados ni transacciones, no altera el stock, no cierra el panel y no descarta los datos ingresados.
- Ocultar un control no reemplaza la comprobación en el manejador ni en el servicio.
- La validación usa la sesión vigente; sin sesión se conserva el comportamiento permisivo de `initApp()`.

### Contrato de arranque

| Punto de entrada | Sin sesión | Con sesión |
|---|---|---|
| `boot()` | Muestra `#auth-gate`, oculta `#app-shell`, no inicializa la aplicación | Oculta la puerta de acceso e inicializa la aplicación |
| `initApp()` llamado directamente | Mantiene acceso completo para pruebas y usos internos | Aplica los permisos de la sesión vigente |

`boot()` es el punto de entrada de producción. El comportamiento permisivo de `initApp()` sin sesión es intencional para conservar compatibilidad con la suite existente y no constituye el flujo de acceso real.

## Contrato de la Pantalla de Acceso

| Elemento | Comportamiento |
|---|---|
| `#auth-gate` | Visible cuando no hay sesión; oculta la aplicación |
| `#login-form` | Envía el User ID y evita la recarga |
| `#login-user-id` | Campo de User ID con autocompletado de usuario y mayúsculas |
| `#login-submit` | Ejecuta el inicio de sesión |
| `#login-error` | Muestra el error con `aria-live="polite"` |
| `#login-user-hints` | Lista los usuarios activos con su rol como ayuda |
| `#session-user` | Muestra nombre y User ID del usuario autenticado |
| `#session-role` | Muestra la etiqueta del rol |
| `#logout-button` | Cierra la sesión y vuelve a la pantalla de acceso |

### Flujo observable

1. Sin sesión, la aplicación arranca en la pantalla de acceso.
2. Un User ID válido oculta la pantalla de acceso, muestra la aplicación y renderiza el nombre y rol.
3. Un User ID inválido mantiene la pantalla de acceso y muestra un mensaje claro.
4. Recargar con sesión vigente restaura el acceso sin volver a pedir el User ID.
5. Cerrar sesión elimina la sesión y vuelve a la pantalla de acceso.
6. Un usuario inactivo o eliminado del directorio pierde la sesión en la siguiente lectura.

## Contrato de Errores

| Código | Mensaje orientado al usuario |
|---|---|
| `USER_ID_REQUIRED` | Ingresa tu User ID para iniciar sesión. |
| `USER_NOT_FOUND` | El User ID no está registrado en el sistema. |
| `USER_INACTIVE` | El usuario está inactivo; contacta al administrador. |
| `PERMISSION_DENIED` | No tienes permisos para ejecutar esta acción. |
| `VALIDATION_ERROR` | Revisa los datos obligatorios antes de guardar. |

Los errores de inicio de sesión se muestran en `#login-error`. Los errores de permisos se muestran como notificación persistente en el área de feedback de la vista correspondiente, sin cerrar el panel ni descartar los datos ingresados.

## Contrato de Accesibilidad

- El formulario de acceso es operable con teclado y el campo recibe el foco al mostrarse.
- El error de acceso se anuncia mediante `aria-live="polite"`.
- Los botones de sesión y cierre tienen texto comprensible.
- La lista de usuarios de ayuda usa elementos de lista y `code` para el identificador.
- Los controles ocultos por permisos no deben quedar accesibles por navegación de teclado.
- El límite de crédito oculto para el `comprador` no se expone a tecnologías de asistencia ni a la inspección del formulario.
- Las tarjetas no navegables y los botones deshabilitados deben comunicar su estado de forma accesible.
- Las notificaciones de error persistentes usan `aria-live` y conservan el foco en el contexto de la operación.

## Fuera de Contrato

- Contraseñas, tokens, cifrado, segundo factor y recuperación de credenciales.
- Integración con un proveedor de identidad o directorio corporativo.
- Administración visual de usuarios y roles.
- Auditoría de accesos, registro de intentos fallidos y bloqueo por intentos.
- Autorización del lado del servidor; no existe backend.
- Sincronización de sesión entre pestañas, dispositivos o usuarios.

## Limitaciones de Seguridad

- El User ID no es una credencial secreta; cualquiera que conozca un identificador activo puede ingresar.
- El directorio y la sesión viven en `localStorage`, que el usuario puede inspeccionar y modificar.
- El RBAC protege la experiencia y reduce errores operativos, pero no constituye una frontera de seguridad frente a un atacante con control del navegador.
- La sesión permanece en el perfil del navegador hasta el cierre de sesión o la invalidación del usuario.
- Para un despliegue real se requiere autenticación y autorización del lado del servidor.
