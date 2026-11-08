# Modelo de Datos: Autenticación por User ID y RBAC

**Rama**: `004-authentication-rbac`
**Fecha**: 2026-11-08
**Especificación**: [spec.md](spec.md)
**Contexto base**: [Modelo de datos del módulo base](../001-erp-base-module/data-model.md) y [Modelo de datos de órdenes de compra](../002-purchase-order-workflow/data-model.md)

## Alcance del Modelo

Esta extensión añade dos entidades persistidas propias de la identidad (**Usuario** y **Sesión**) y dos conceptos derivados no persistidos (**Rol** y **Permiso**). No modifica las entidades, claves ni relaciones del módulo base ni de la extensión de órdenes de compra. Las decisiones de autorización se calculan en memoria a partir del rol del usuario autenticado.

## Claves de Persistencia

| Clave | Contenido | Estado |
|---|---|---|
| `erp_auth:users` | Directorio local de usuarios | Nueva |
| `erp_auth:session` | Sesión activa | Nueva |
| `erp_base_module:entities` | Proveedores | Existente, sin cambios |
| `erp_base_module:documents` | Documentos y órdenes | Existente, sin cambios |
| `erp_purchasing:employees` | Empleados | Existente, sin cambios |
| `erp_purchasing:categories` | Categorías | Existente, sin cambios |
| `erp_purchasing:products` | Productos y stock | Existente, sin cambios |
| `erp_purchasing:purchase-order-lines` | Líneas de detalle | Existente, sin cambios |
| `erp_purchasing:order-metadata` | Metadatos de orden | Existente, sin cambios |
| `erp_purchasing:status-history` | Historial de estados | Existente, sin cambios |
| `erp_purchasing:transactions` | Diario de transacciones | Existente, sin cambios |

## Entidades

### Usuario

Persona registrada en el directorio local. Se persiste como un elemento del arreglo en `erp_auth:users`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `userId` | string | PK; único; normalizado a mayúsculas; patrón `^[A-Z0-9._@-]{2,40}$` |
| `nombre` | string | Obligatorio, no vacío; si falta se usa el `userId` |
| `cargo` | string | Opcional; puede quedar vacío |
| `role` | string | Obligatorio; uno de los cinco roles; si es desconocido se normaliza a `consulta` |
| `activo` | boolean | Por defecto `true`; un usuario inactivo no puede autenticarse |

**Invariantes**:

- No puede haber dos usuarios con el mismo `userId` normalizado.
- Todo usuario persistido debe tener un rol válido tras la normalización.
- Un usuario inactivo no puede iniciar sesión ni mantener una sesión vigente.
- El directorio nunca queda vacío tras el arranque: si falta, está vacío o no contiene usuarios válidos, se siembran los usuarios de demostración.

**Usuarios de demostración**:

| `userId` | `nombre` | `cargo` | `role` | `activo` |
|---|---|---|---|---|
| `ADMIN-001` | Valentina Ríos | Administradora del sistema | `administrador` | `true` |
| `GER-001` | Martín Soto | Gerente de Compras | `gerente` | `true` |
| `COMP-001` | Camila Vega | Compradora | `comprador` | `true` |
| `BOD-001` | Diego Fuentes | Jefe de Bodega | `bodeguero` | `true` |
| `CONS-001` | Ana Pérez | Analista de Compras | `consulta` | `true` |

### Sesión

Vínculo temporal entre la aplicación y un usuario autenticado. Se persiste en `erp_auth:session`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `userId` | string | FK a Usuario; obligatorio; normalizado |
| `nombre` | string | Instantánea del nombre al iniciar sesión; se re-resuelve al leer |
| `role` | string | Instantánea del rol al iniciar sesión; se re-resuelve al leer |
| `loginAt` | string | ISO 8601; momento del inicio de sesión |

**Invariantes**:

- Solo puede existir una sesión activa por navegador.
- La sesión es válida únicamente si el usuario referenciado existe y está activo.
- Al leer la sesión, `nombre` y `role` se actualizan desde el directorio vigente.
- Si el usuario fue eliminado o desactivado, la sesión se elimina y se considera no autenticado.
- Al cerrar sesión se elimina la clave `erp_auth:session`.

### Rol

Perfil de acceso no persistido. Agrupa permisos y se identifica por una clave estable.

| Rol | Etiqueta visible | Descripción |
|---|---|---|
| `administrador` | Administrador | Acceso completo a todas las vistas y acciones. |
| `gerente` | Gerente de Compras | Gestión completa de proveedores, órdenes y productos; envía, aprueba, recibe y cancela órdenes. |
| `comprador` | Comprador | Crea y edita proveedores y órdenes, envía a revisión y cancela; no aprueba, no recibe y no gestiona productos. |
| `bodeguero` | Bodeguero | Consulta órdenes y productos, recibe mercancía y gestiona productos y stock; no ve proveedores ni crea o edita órdenes. |
| `consulta` | Consulta | Solo lectura de panel, proveedores, órdenes, productos y búsqueda; puede imprimir órdenes. |

**Invariante**: el rol de una sesión siempre corresponde a una clave de `ROLE_DEFINITIONS`; cualquier valor desconocido se degrada a `consulta`.

### Permiso

Capacidad atómica no persistida. Se identifica por una clave estable.

| Permiso | Alcance |
|---|---|
| `dashboard.view` | Ver el panel. |
| `entities.view` | Ver proveedores. |
| `entities.create` | Crear proveedores. |
| `entities.update` | Editar proveedores. |
| `entities.delete` | Eliminar proveedores. |
| `documents.view` | Ver órdenes de compra. |
| `documents.create` | Crear órdenes de compra. |
| `documents.update` | Editar órdenes y sus líneas. |
| `documents.delete` | Eliminar órdenes de compra. |
| `orders.submit` | Enviar una orden a revisión (`pendiente`). |
| `orders.approve` | Aprobar una orden (`aprobado`). |
| `orders.receive` | Recibir una orden (`recibido`). |
| `orders.cancel` | Cancelar una orden (`cancelado`). |
| `products.view` | Ver productos y stock. |
| `products.manage` | Crear, editar, eliminar productos, categorías y ajustar stock. |
| `search.view` | Ver y usar la búsqueda. |
| `orders.print` | Imprimir órdenes de compra. |

## Matriz de Permisos por Rol

| Permiso | Administrador | Gerente | Comprador | Bodeguero | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `entities.view` | ✓ | ✓ | ✓ | — | ✓ |
| `entities.create` | ✓ | ✓ | ✓ | — | — |
| `entities.update` | ✓ | ✓ | ✓ | — | — |
| `entities.delete` | ✓ | ✓ | — | — | — |
| `documents.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `documents.create` | ✓ | ✓ | ✓ | — | — |
| `documents.update` | ✓ | ✓ | ✓ | — | — |
| `documents.delete` | ✓ | ✓ | ✓ | — | — |
| `orders.submit` | ✓ | ✓ | ✓ | — | — |
| `orders.approve` | ✓ | ✓ | — | — | — |
| `orders.receive` | ✓ | ✓ | — | ✓ | — |
| `orders.cancel` | ✓ | ✓ | ✓ | — | — |
| `products.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `products.manage` | ✓ | ✓ | — | ✓ | — |
| `search.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `orders.print` | ✓ | ✓ | ✓ | ✓ | ✓ |

## Mapeo de Transiciones a Permisos

| Estado destino | Acción visible | Permiso requerido |
|---|---|---|
| `pendiente` | Enviar a revisión | `orders.submit` |
| `aprobado` | Aprobar | `orders.approve` |
| `recibido` | Marcar recibida | `orders.receive` |
| `cancelado` | Cancelar | `orders.cancel` |
| `borrador` | — (estado inicial) | — |

El permiso filtra las acciones que el ciclo canónico de Compras ya considera válidas para el estado actual. No crea transiciones nuevas ni relaja las reglas del dominio.

## Relaciones y Cardinalidades

| Origen | Cardinalidad | Destino | Regla |
|---|---:|---|---|
| Rol | 1 | Usuario | 1..N; cada usuario tiene exactamente un rol |
| Rol | 1 | Permiso | 0..N; cada rol agrupa un conjunto de permisos |
| Usuario | 1 | Sesión | 0..1; cada navegador mantiene como máximo una sesión activa |
| Estado destino | 1 | Permiso | 1; cada transición exige exactamente un permiso |

## Estados de la Sesión

| Estado | Condición | Comportamiento |
|---|---|---|
| Sin sesión | No existe `erp_auth:session` o es inválida | Se muestra la pantalla de acceso |
| Sesión válida | La sesión referencia un usuario existente y activo | Se muestra la aplicación con los permisos del rol |
| Sesión invalidada | El usuario fue eliminado o desactivado | Se limpia la sesión y se muestra la pantalla de acceso |

## Reglas de Normalización y Validación

- `userId` se normaliza con `String(value).trim().toUpperCase()`.
- Un `userId` debe cumplir `^[A-Z0-9._@-]{2,40}$`; si no, el usuario no se persiste.
- `role` se normaliza a minúsculas; si no está en `ROLE_DEFINITIONS`, se usa `consulta`.
- `activo` es `false` solo cuando el valor es explícitamente `false` o `active` es `false`; en cualquier otro caso es `true`.
- `nombre` vacío se reemplaza por el `userId`.
- Una sesión sin `userId` se considera inválida.
- Los datos corruptos en `localStorage` se ignoran y se usan los valores por defecto.

## Reglas de Eliminación y Cascada

- Eliminar o desactivar un usuario invalida su sesión en la siguiente lectura; no elimina datos de negocio.
- Cerrar sesión elimina solo `erp_auth:session`; el directorio de usuarios permanece.
- Borrar el directorio de usuarios provoca que el siguiente arranque siembre los usuarios de demostración.
- Los datos del módulo base y de órdenes de compra no se eliminan ni modifican por cambios de autenticación.

## Volumen y Escala

- Directorio pequeño de usuarios (decenas), consistente con un módulo de demostración.
- Una sesión activa por navegador.
- La resolución de permisos es una operación en memoria sobre conjuntos estáticos; no depende del volumen de datos de negocio.
- La lectura de sesión consulta el directorio en cada arranque y restauración, sin afectar los presupuestos de rendimiento del módulo base.
