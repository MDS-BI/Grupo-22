# Contratos: Autenticación por User ID y RBAC

**Rama**: `003-authentication-rbac`
**Fecha**: 2026-11-08
**Especificación**: [spec.md](../spec.md)
**Modelo de datos**: [data-model.md](../data-model.md)

## Alcance

La funcionalidad es una aplicación web local sin API externa. Los contratos documentan las interfaces internas de autenticación, los permisos por rol, el control de acceso observable en la interfaz y los límites de seguridad de la solución.

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
| `transitionPermission(nextStatus)` | Estado destino | Permiso asociado o `null` | — |
| `canTransitionTo(nextStatus, sessionOrRole)` | Estado destino y sesión o rol | `true` si puede ejecutar la transición | — |
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
- Las transiciones se mapean por estado destino y no por acción textual.

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
| `#entity-form` | `entities.create` u `entities.update` | Oculto |
| `#document-form` | `documents.create` u `documents.update` | Oculto |
| Acciones `edit` / `delete` de proveedor | `entities.update` / `entities.delete` | No se renderizan |
| Acciones `edit` / `delete` de orden | `documents.update` / `documents.delete` | No se renderizan |
| Botón `print-order` | `orders.print` | Oculto |
| Acciones `transition` | Permiso del estado destino | No se renderizan |
| Eliminación de línea en detalle | `documents.update` | Oculta |
| Formulario y acciones del catálogo | `products.manage` | No se renderizan; catálogo en solo lectura |
| `#session-info` | Sesión activa | Oculto |
| `#auth-gate` | Sin sesión | Visible |

### Reglas de despliegue

- Si la vista actual deja de estar permitida, se muestra la primera vista permitida en el orden `dashboard`, `entities`, `documents`, `products`, `search`.
- Las vistas `order-detail` y `print` requieren `documents.view`.
- El detalle de orden combina las acciones válidas del ciclo de vida con los permisos del rol; nunca muestra una acción que el dominio no permita.
- La impresión requiere `orders.print` tanto para mostrar el botón como para ejecutar la acción.
- La edición de líneas requiere `documents.update` y que la orden no sea terminal.
- El catálogo sin `products.manage` no permite alta, edición, eliminación ni creación de categoría, aunque se invoque la función directamente.

### Contrato de defensa de acciones

- Toda operación de alta, edición, eliminación, impresión o transición comprueba el permiso en su manejador antes de operar.
- Si falta el permiso, se muestra el mensaje `No tienes permisos para ejecutar esta acción.` y no se modifica ningún dato.
- Ocultar un control no reemplaza la comprobación en el manejador.

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

Los errores de inicio de sesión se muestran en `#login-error`. Los errores de permisos se muestran en el área de feedback de la vista correspondiente.

## Contrato de Accesibilidad

- El formulario de acceso es operable con teclado y el campo recibe el foco al mostrarse.
- El error de acceso se anuncia mediante `aria-live="polite"`.
- Los botones de sesión y cierre tienen texto comprensible.
- La lista de usuarios de ayuda usa elementos de lista y `code` para el identificador.
- Los controles ocultos por permisos no deben quedar accesibles por navegación de teclado.

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
