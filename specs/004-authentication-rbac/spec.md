# Especificación de la Funcionalidad: Autenticación por User ID y Control de Acceso por Roles (RBAC)

**Rama de la funcionalidad**: `004-authentication-rbac`

**Creada**: 2026-11-08

**Actualizada**: 2026-11-14

**Estado**: Implementada (ajustes post-revisión del 2026-11-14 pendientes de implementación)

**Entrada**: Extensión del módulo de Compras para incorporar el ingreso mediante **User ID**, la resolución del rol del usuario desde un directorio local y el despliegue de vistas, acciones y transiciones de estado según los permisos del rol, manteniendo la persistencia en `localStorage`, la interfaz en español y la arquitectura SPA existente.

**Contexto base**: [Especificación del módulo base ERP](../001-erp-base-module/spec.md) y [Extensión de órdenes de compra](../002-purchase-order-workflow/spec.md). Esta funcionalidad no modifica la especificación ni el comportamiento original de `001` ni `002`; documenta una entrega incremental sobre ellos.

## Propósito

El módulo de Compras funcionaba sin autenticación y con acceso completo para cualquier usuario. Esta extensión incorpora una pantalla de acceso por **User ID** y un modelo de permisos por rol que limita lo que cada perfil puede ver y hacer. El objetivo es que un usuario autenticado vea únicamente las vistas, los botones, las acciones de fila, las transiciones de estado y las capacidades de mantenimiento que su rol autoriza, sin alterar los datos ni las reglas de negocio del módulo base.

La autenticación es local y de demostración: identifica a la persona mediante un identificador registrado y resuelve su rol, pero no reemplaza un sistema de identidad corporativo. No se almacenan contraseñas ni credenciales.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Acceder con User ID y mantener la sesión (Prioridad: P1)

Como **usuario del módulo**, quiero ingresar mi User ID en una pantalla de acceso para que el sistema me identifique, muestre mi nombre y rol, y conserve la sesión mientras recargo o navego por la aplicación.

**Por qué esta prioridad**: Es la puerta de entrada de toda la funcionalidad. Sin autenticación no es posible resolver el rol ni aplicar permisos.

**Prueba Independiente**: Abrir la aplicación sin sesión, comprobar que se muestra la pantalla de acceso, ingresar un User ID registrado, verificar el nombre y rol en la barra superior, recargar y comprobar que la sesión se restaura.

**Escenarios de Aceptación**:

1. **Dado** que no existe una sesión activa, **cuando** el usuario abre la aplicación, **entonces** ve la pantalla de acceso y no ve la aplicación.
2. **Dado** que el usuario ingresa un User ID registrado y activo, **cuando** confirma el formulario, **entonces** la aplicación se muestra con su nombre y su rol en la barra superior.
3. **Dada** una sesión activa, **cuando** el usuario recarga la página, **entonces** la sesión se restaura y no se vuelve a pedir el User ID.
4. **Dado** que el usuario ingresa un User ID vacío, desconocido o inactivo, **cuando** confirma, **entonces** la pantalla de acceso permanece visible y se muestra un mensaje claro.
5. **Dado** que el directorio de usuarios no existe o está vacío, **cuando** el sistema arranca, **entonces** siembra los usuarios de demostración y permite el acceso con ellos.
6. **Dado** un directorio local con el rol de un usuario modificado, **cuando** se lee la sesión, **entonces** el rol vigente se vuelve a resolver desde el directorio y la sesión se actualiza.

---

### Historia de Usuario 2 - Ver solo las vistas y acciones permitidas por rol (Prioridad: P1)

Como **usuario autenticado**, quiero que la aplicación muestre únicamente las secciones y los controles que mi rol permite, para operar sin exponerme a acciones que no me corresponden.

**Por qué esta prioridad**: Es el efecto principal del RBAC y define la experiencia diaria de cada perfil.

**Prueba Independiente**: Ingresar con cada usuario de demostración y comprobar que la navegación, los botones de creación, los formularios y las acciones de fila visibles coinciden con la matriz de permisos.

**Escenarios de Aceptación**:

1. **Dado** un usuario administrador, **cuando** inicia sesión, **entonces** ve todas las vistas y todas las acciones.
2. **Dado** un usuario gerente de compras, **cuando** inicia sesión, **entonces** ve las vistas del módulo, gestiona proveedores, órdenes y productos, y puede aprobar, recibir y cancelar órdenes.
3. **Dado** un usuario comprador, **cuando** inicia sesión, **entonces** puede crear y editar proveedores y órdenes, enviar a revisión y cancelar, pero no ve acciones de aprobación ni de recepción.
4. **Dado** un usuario bodeguero, **cuando** inicia sesión, **entonces** no ve la vista de proveedores ni los formularios de orden, pero sí ve órdenes, productos, búsqueda, recepción y mantenimiento de stock.
5. **Dado** un usuario de consulta, **cuando** inicia sesión, **entonces** ve las vistas en modo solo lectura, sin formularios ni acciones de creación, edición o eliminación, y conserva la impresión de órdenes.
6. **Dado** un usuario cuyo rol no tiene acceso a la vista actual, **cuando** la aplicación aplica el control de acceso, **entonces** se muestra la primera vista permitida para ese rol.
7. **Dado** un usuario sin permiso de creación o edición, **cuando** consulta una tabla, **entonces** las acciones de fila que no le corresponden no se renderizan.

---

### Historia de Usuario 3 - Ejecutar transiciones de orden según permisos (Prioridad: P2)

Como **responsable del flujo de compras**, quiero que las acciones de cambio de estado se filtren según mi rol, para que solo los perfiles autorizados puedan enviar, aprobar, recibir o cancelar una orden.

**Por qué esta prioridad**: El flujo de estados del módulo 002 ya existe; esta historia evita que cualquier usuario pueda ejecutar transiciones sensibles.

**Prueba Independiente**: Sembrar una orden aprobada, ingresar con comprador, bodeguero y gerente, y comprobar qué transiciones aparecen y cuáles pueden ejecutarse en cada caso.

**Escenarios de Aceptación**:

1. **Dada** una orden en borrador, **cuando** el usuario tiene permiso de envío, **entonces** puede enviarla a revisión.
2. **Dada** una orden pendiente, **cuando** el usuario tiene permiso de aprobación, **entonces** puede aprobarla.
3. **Dada** una orden aprobada, **cuando** el usuario tiene permiso de recepción, **entonces** puede marcarla como recibida.
4. **Dada** una orden en un estado cancelable, **cuando** el usuario tiene permiso de cancelación, **entonces** puede cancelarla.
5. **Dada** una transición cuyo estado de origen y destino no está autorizado para el rol, **cuando** el usuario abre el detalle, **entonces** esa acción no aparece entre los botones.
6. **Dado** un intento de ejecutar una transición no autorizada por cualquier vía, **cuando** el sistema procesa la acción, **entonces** la rechaza, informa la falta de permisos y no modifica la orden.
7. **Dada** una orden terminal, **cuando** cualquier rol la consulta, **entonces** no se ofrecen transiciones, aunque el rol tenga permisos de flujo.

---

### Historia de Usuario 4 - Operar en modo solo lectura y gestionar productos según rol (Prioridad: P2)

Como **usuario con permisos limitados**, quiero que las vistas de solo lectura oculten formularios y acciones de mantenimiento, y que el catálogo de productos respete mi permiso de gestión, para no intentar operaciones que el sistema rechazará.

**Por qué esta prioridad**: Completa la experiencia de los perfiles de consulta y bodega, que comparten vistas con perfiles operativos.

**Prueba Independiente**: Ingresar con consulta y comprobar que proveedores, órdenes y productos no muestran formularios ni acciones; ingresar con bodeguero y comprobar que productos sí permite alta, edición y ajuste de stock.

**Escenarios de Aceptación**:

1. **Dado** un usuario sin permiso de creación ni edición de proveedores, **cuando** abre la vista de proveedores, **entonces** el formulario no se muestra.
2. **Dado** un usuario sin permiso de creación ni edición de órdenes, **cuando** abre la vista de órdenes, **entonces** el formulario no se muestra.
3. **Dado** un usuario sin permiso de gestión de productos, **cuando** abre el catálogo, **entonces** ve la tabla en modo solo lectura, sin formulario ni acciones de producto.
4. **Dado** un usuario con permiso de gestión de productos, **cuando** abre el catálogo, **entonces** puede crear, editar, eliminar y ajustar stock según las reglas existentes.
5. **Dado** un usuario sin permiso de impresión, **cuando** abre el detalle de una orden, **entonces** el botón de impresión no se muestra.
6. **Dado** un usuario sin permiso de edición de líneas, **cuando** abre el detalle de una orden no terminal, **entonces** no se muestran acciones de eliminación de líneas ni el editor correspondiente.

---

### Historia de Usuario 5 - Cerrar sesión y volver a la pantalla de acceso (Prioridad: P3)

Como **usuario autenticado**, quiero cerrar mi sesión para que la aplicación vuelva a solicitar un User ID y otra persona pueda ingresar con su propio rol.

**Por qué esta prioridad**: Es una capacidad de higiene operativa; la autenticación y el control de acceso funcionan sin ella, pero su ausencia obligaría a borrar el almacenamiento local.

**Prueba Independiente**: Iniciar sesión, pulsar "Cerrar sesión", comprobar que se borra la sesión, que vuelve la pantalla de acceso y que la aplicación queda oculta; recargar y comprobar que sigue sin sesión.

**Escenarios de Aceptación**:

1. **Dada** una sesión activa, **cuando** el usuario pulsa "Cerrar sesión", **entonces** la sesión se elimina del almacenamiento y vuelve la pantalla de acceso.
2. **Dada** una sesión cerrada, **cuando** el usuario recarga, **entonces** la aplicación sigue pidiendo un User ID.
3. **Dado** otro usuario, **cuando** ingresa su User ID tras un cierre de sesión, **entonces** la interfaz se despliega con los permisos de su propio rol.

### Casos Límite

- **User ID con espacios o minúsculas**: se normaliza con `trim` y mayúsculas antes de buscar.
- **User ID con formato inválido**: se rechaza aunque exista una coincidencia parcial.
- **Usuario inactivo**: no puede iniciar sesión y una sesión previa se invalida.
- **Usuario eliminado del directorio**: la sesión previa se invalida al leerla.
- **Rol desconocido en el directorio**: se resuelve como `consulta` para degradar a solo lectura.
- **Sesión corrupta o almacenamiento no disponible**: se trata como ausencia de sesión sin romper la aplicación.
- **Sin sesión activa llamando a `initApp()` directamente**: se conserva el acceso completo para pruebas y usos internos; el login real se aplica en `boot()`.
- **Cambio de rol durante una sesión**: la siguiente lectura de sesión aplica el nuevo rol.
- **Dispositivo compartido**: al cerrar sesión se elimina la sesión local; el directorio de usuarios permanece.
- **Intentos de acción sin permiso**: se rechazan en el manejador aunque el botón se haya mostrado u ocultado manualmente.
- **Vista actual no permitida tras cambiar de rol**: se redirige a la primera vista autorizada.
- **Comprador intenta aprobar o rechazar desde la consola o forzando el botón**: la operación se rechaza, no se modifica el estado, no se agrega historial y no se altera el stock.
- **Comprador intenta asignar otro empleado solicitante manipulando el payload**: se rechaza el guardado completo sin modificar la solicitud.
- **Comprador sin empleado vinculado**: se crea una sola vez un empleado nuevo con el nombre y cargo del Usuario de la sesión, se persiste el vínculo por `userId` y se reutiliza en las siguientes solicitudes.
- **Dos compradores con el mismo nombre**: cada uno recibe un empleado propio distinto; no se reutiliza un empleado por coincidencia de nombre y un empleado no puede quedar vinculado a más de un usuario.
- **Comprador edita un proveedor con límite de crédito**: el valor persistido se conserva; si el payload intenta modificarlo, se rechaza la operación.
- **Aprobación de una solicitud sin fecha de emisión**: se completa `startDate` con la fecha del cambio de estado.
- **Aprobación de una solicitud con fecha de emisión válida**: la fecha se conserva y no se recalcula.
- **Botón "+ Nuevo" de `003` visible sin permiso de creación**: se oculta, no se puede abrir el panel y una apertura forzada se rechaza.
- **Tarjeta del panel que apunta a una vista no permitida**: no es navegable y no abre la lista.
- **Filtro o columna sobre un campo restringido**: no se ofrece en la interfaz y un intento forzado no revela el valor.
- **Acción rechazada con el feedback de `003`**: se muestra un error persistente y nunca una notificación de éxito.
- **Carga de datos de demostración con un rol sin permiso de aprobación**: no debe crear órdenes aprobadas para ese rol ni servir como vía alternativa de aprobación.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

#### Autenticación y sesión

- **FR-001**: El sistema DEBE mostrar una pantalla de acceso cuando no exista una sesión activa y DEBE ocultar la aplicación hasta autenticarse.
- **FR-002**: El sistema DEBE autenticar mediante un User ID registrado y activo, sin solicitar contraseña.
- **FR-003**: El sistema DEBE normalizar el User ID eliminando espacios externos y convirtiéndolo a mayúsculas.
- **FR-004**: El sistema DEBE rechazar User IDs vacíos, con formato inválido, desconocidos o de usuarios inactivos, con un mensaje claro.
- **FR-005**: El sistema DEBE sembrar un directorio de usuarios de demostración cuando el directorio local no exista, esté vacío o no contenga usuarios válidos tras la normalización.
- **FR-006**: El sistema DEBE persistir el directorio de usuarios y la sesión activa en `localStorage`.
- **FR-007**: El sistema DEBE restaurar la sesión activa entre recargas y navegación dentro de la aplicación.
- **FR-008**: El sistema DEBE volver a resolver el usuario y su rol desde el directorio al leer la sesión, invalidándola si el usuario ya no existe o está inactivo.
- **FR-009**: El sistema DEBE mostrar el nombre y el rol del usuario autenticado en la barra superior.
- **FR-010**: El sistema DEBE permitir cerrar sesión, eliminar la sesión persistida y volver a la pantalla de acceso.
- **FR-011**: El sistema DEBE mostrar en la pantalla de acceso la lista de usuarios activos disponibles como ayuda.
- **FR-012**: El sistema DEBE tratar un rol desconocido como `consulta` para evitar conceder permisos por error.

#### Roles y permisos

- **FR-013**: El sistema DEBE definir los roles `administrador`, `gerente`, `comprador`, `bodeguero` y `consulta`.
- **FR-014**: El sistema DEBE resolver los permisos de cada rol desde una definición central y no desde la interfaz.
- **FR-015**: El sistema DEBE declarar permisos para panel, proveedores, órdenes, productos, búsqueda, impresión y transiciones de estado.
- **FR-016**: El rol `administrador` DEBE tener todos los permisos declarados.
- **FR-017**: El rol `gerente` DEBE gestionar proveedores, órdenes y productos, y DEBE poder enviar, aprobar, recibir y cancelar órdenes.
- **FR-018**: El rol `comprador` DEBE poder crear y editar proveedores, crear, editar y eliminar órdenes, enviar a revisión y cancelar, pero NO DEBE eliminar proveedores, aprobar, recibir ni gestionar productos.
- **FR-019**: El rol `bodeguero` DEBE ver panel, órdenes, productos y búsqueda, recibir órdenes y gestionar productos y stock, pero NO DEBE ver proveedores ni crear, editar o eliminar órdenes.
- **FR-020**: El rol `consulta` DEBE tener acceso de solo lectura a panel, proveedores, órdenes, productos y búsqueda, y DEBE poder imprimir órdenes.
- **FR-021**: El sistema DEBE mapear cada transición por estado de origen y destino al permiso ya definido en la matriz: `borrador` → `pendiente` = `orders.submit` (enviar a aprobación); `borrador` → `cancelado` = `orders.cancel`; `pendiente` → `aprobado` = `orders.approve` (aprobar); `pendiente` → `cancelado` = `orders.reject`; `aprobado` → `recibido` = `orders.receive` (recibir).
- **FR-022**: El sistema NO DEBE conceder una transición cuando falte el estado de origen o el estado destino, la transición no esté definida o el rol carezca del permiso correspondiente. La resolución DEBE exigir siempre ambos estados y NO DEBE autorizar por defecto una transición a partir del estado de destino únicamente.

**Matriz normativa de permisos por rol**:

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
| `orders.reject` | ✓ | ✓ | — | — | — |
| `products.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `products.manage` | ✓ | ✓ | — | ✓ | — |
| `search.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `orders.print` | ✓ | ✓ | ✓ | ✓ | ✓ |

**Asignación de transiciones**: `borrador` → `pendiente` usa `orders.submit`; `borrador` → `cancelado` usa `orders.cancel`; `pendiente` → `aprobado` usa `orders.approve`; `pendiente` → `cancelado` usa `orders.reject`; `aprobado` → `recibido` usa `orders.receive`.

El `comprador` puede eliminar órdenes, pero no proveedores. La eliminación de órdenes conserva las reglas de negocio del módulo `002`.

`orders.reject` habilita rechazar (cancelar) una solicitud en `pendiente`; `orders.cancel` conserva la cancelación de solicitudes en `borrador`. El `comprador` mantiene `orders.cancel` y no recibe `orders.reject`. La paridad entre `gerente` y `administrador` se mantiene, y ambos incorporan el nuevo permiso.

#### Control de acceso en la interfaz

- **FR-023**: El sistema DEBE ocultar los accesos de navegación a las vistas para las que el rol no tiene permiso, con `display: none` efectivo en el estilo computado y no solo mediante el atributo `hidden`.
- **FR-024**: El sistema DEBE ocultar los botones de creación, búsqueda y demás accesos directos cuando el rol no tenga el permiso correspondiente, con `display: none` efectivo en el estilo computado.
- **FR-025**: El sistema DEBE ocultar los formularios de proveedor y de orden cuando el rol no pueda crear ni editar el registro correspondiente.
- **FR-026**: El sistema DEBE omitir las acciones de fila de edición y eliminación cuando el rol no tenga permiso.
- **FR-027**: El sistema DEBE redirigir a la primera vista permitida cuando la vista actual no sea accesible para el rol.
- **FR-028**: El sistema DEBE filtrar las transiciones de estado del detalle de orden según los permisos del rol, además de las reglas del ciclo de vida.
- **FR-029**: El sistema DEBE ocultar la impresión de la orden cuando el rol no tenga permiso de impresión.
- **FR-030**: El sistema DEBE ocultar la edición y eliminación de líneas cuando el rol no tenga permiso de actualización de órdenes.
- **FR-031**: El sistema DEBE mostrar el catálogo de productos en modo solo lectura cuando el rol no tenga permiso de gestión de productos.

#### Defensa de acciones

- **FR-032**: El sistema DEBE validar el permiso en los manejadores de eventos antes de ejecutar cualquier alta, edición, eliminación, impresión o transición.
- **FR-033**: El sistema DEBE informar "No tienes permisos para ejecutar esta acción." cuando se invoque una operación no autorizada.
- **FR-034**: El sistema NO DEBE modificar datos cuando una operación se rechaza por falta de permisos.
- **FR-035**: El sistema NO DEBE confiar únicamente en ocultar controles en el DOM como mecanismo de autorización.

#### Compatibilidad y persistencia

- **FR-036**: El sistema DEBE conservar las claves, entidades, reglas y datos del módulo base y de la extensión de órdenes de compra.
- **FR-037**: El sistema DEBE usar claves de persistencia propias de autenticación (`erp_auth:users` y `erp_auth:session`) sin mezclarlas con las claves del módulo de Compras.
- **FR-038**: El sistema DEBE degradar de forma segura cuando `localStorage` no esté disponible o contenga datos inválidos.
- **FR-039**: El sistema DEBE mantener el comportamiento de `initApp()` sin sesión para no romper el arranque directo usado por pruebas y usos internos; `boot()` DEBE aplicar el login real.
- **FR-040**: El sistema DEBE mantener la interfaz, los mensajes y la terminología en español.

#### Solicitud de compra y emisión

- **FR-041**: Mientras un documento esté en estado `borrador` o `pendiente`, el sistema DEBE mostrarlo como «Solicitud de compra» en listas, tarjetas, filtros, panel lateral, detalle, impresión, confirmaciones, notificaciones y títulos de acción.
- **FR-042**: Cuando una solicitud se apruebe, el sistema DEBE mostrarla como «Orden de Compra emitida» en todos los lugares anteriores y DEBE conservar esa denominación en los estados `aprobado` y `recibido`. Una solicitud cancelada antes de la aprobación DEBE conservar la denominación «Solicitud de compra».
- **FR-043**: La denominación DEBE derivarse del estado persistido, actualizarse al cambiar de estado sin recargar y NO DEBE depender del rol del usuario.
- **FR-044**: El rol `comprador` DEBE poder crear, editar, enviar a aprobación y cancelar solicitudes en `borrador`; NO DEBE poder aprobar ni rechazar solicitudes en `pendiente`.
- **FR-045**: Solo los roles `gerente` y `administrador` DEBEN poder aprobar una solicitud en `pendiente`.
- **FR-046**: Solo los roles `gerente` y `administrador` DEBEN poder ejecutar `pendiente` → `cancelado` con `orders.reject`; el `comprador` solo DEBE poder ejecutar `borrador` → `cancelado` con `orders.cancel` y NO DEBE poder rechazar una solicitud en `pendiente`. La evaluación DEBE exigir el estado de origen y el estado destino; sin estado de origen, la transición se rechaza y no se concede permiso por defecto.
- **FR-047**: Al aprobar una solicitud, el servicio DEBE registrar la fecha de emisión en el campo `startDate` definido por `002` usando la fecha del cambio de estado en America/Santiago cuando el campo esté vacío, y DEBE conservar la fecha válida ya informada. La fecha de emisión DEBE mostrarse junto a la denominación «Orden de Compra emitida».

#### Empleado solicitante

- **FR-048**: Para el rol `comprador`, el empleado solicitante DEBE asignarse automáticamente al propio usuario y DEBE mostrarse como dato de solo lectura, sin selector editable, en el formulario o panel lateral de la solicitud.
- **FR-049**: El sistema DEBE resolver el empleado propio del `comprador` mediante un vínculo `id_empleado` en su registro de Usuario, usando el `userId` de la sesión. Cada `comprador` DEBE tener exactamente un empleado propio y un empleado DEBE estar vinculado como máximo a un usuario. Si el vínculo no existe, DEBE crear un empleado nuevo con el nombre y el cargo del Usuario de la sesión, persistir el vínculo y reutilizarlo en adelante. NO DEBE reutilizar empleados por coincidencia de nombre.
- **FR-050**: Para los roles `administrador` y `gerente`, el empleado solicitante DEBE seleccionarse de la lista de empleados registrados y DEBE seguir siendo obligatorio.
- **FR-051**: El servicio DEBE forzar el `id_empleado` propio en las altas y ediciones de solicitudes del `comprador` y DEBE rechazar con `PERMISSION_DENIED` cualquier intento de asignar otro empleado, sin guardar ni modificar la solicitud.

#### Límite de crédito de proveedores

- **FR-052**: El sistema NO DEBE mostrar el límite de crédito al rol `comprador` en el formulario o panel lateral, las listas, las tarjetas, los filtros, el detalle de proveedor, la búsqueda, la impresión ni las notificaciones. El campo DEBE quedar oculto con `display: none` efectivo o ausente del DOM.
- **FR-053**: El sistema DEBE mostrar el límite de crédito a los roles `administrador`, `gerente` y `consulta` cuando su permiso de vista de proveedores lo permita, en modo de solo lectura para `consulta`.
- **FR-054**: Al guardar un proveedor como `comprador`, el servicio DEBE conservar el límite de crédito persistido y DEBE rechazar con `PERMISSION_DENIED` cualquier payload que intente crear o modificar el campo, sin mutar el proveedor ni mostrar una notificación de éxito.

#### Integración con la experiencia de `003`

- **FR-055**: El botón «+ Nuevo» de cada lista DEBE mostrarse solo cuando el rol tenga el permiso de creación correspondiente; sin permiso DEBE ocultarse con `display: none` efectivo y quedar fuera del orden de tabulación. Esta regla prevalece sobre la visibilidad incondicional descrita en `003`.
- **FR-056**: El panel lateral DEBE abrirse en modo creación o edición solo con el permiso correspondiente; una apertura forzada sin permiso DEBE rechazarse con un mensaje de error, sin abrir el panel ni modificar datos.
- **FR-057**: Las tarjetas clicables del panel DEBEN respetar el permiso de vista de su lista destino; una tarjeta sin acceso NO DEBE ser navegable ni abrir la vista, y DEBE ocultarse o deshabilitarse de forma accesible.
- **FR-058**: Los filtros y el orden DEBEN respetar la visibilidad por rol y NO DEBEN ofrecer filtros, columnas ni resúmenes sobre datos restringidos, como el límite de crédito o el empleado solicitante para el `comprador`.
- **FR-059**: La vista de detalle y la impresión DEBEN respetar la denominación por estado, la fecha de emisión o «Sin emitir» cuando la solicitud no esté aprobada, el empleado solicitante, las acciones de aprobar y rechazar solo para `gerente` y `administrador`, el empleado de solo lectura para `comprador`, la ausencia del límite de crédito para `comprador` y las mismas reglas de acción que el servicio.
- **FR-060**: Las listas y la vista de detalle NO DEBEN renderizar una acción que el servicio vaya a rechazar; si la acción se invoca por otra vía, DEBE producirse un error persistente y no un mensaje de éxito.

#### Defensa en servicios y feedback

- **FR-061**: Todo servicio de negocio que cree o edite proveedores, cree o edite solicitudes, asigne el empleado solicitante o ejecute transiciones de estado DEBE revalidar el permiso del rol antes de operar, aunque la interfaz haya omitido el control.
- **FR-062**: Cuando una operación se rechace por permisos, el sistema DEBE mostrar una notificación de error persistente, NO DEBE mostrar una notificación de éxito, NO DEBE cerrar el panel ni descartar los datos ingresados y NO DEBE modificar la entidad, el historial ni el stock.
- **FR-063**: Las operaciones rechazadas por permisos NO DEBEN registrarse en el historial de estados ni en el diario de transacciones, y el comportamiento permisivo de `initApp()` sin sesión DEBE conservarse para pruebas y usos internos.

### Entidades Clave

- **Usuario**: Persona registrada en el directorio local. Se identifica por un `userId` único y contiene nombre, cargo, rol y estado activo.
- **Sesión**: Vínculo temporal entre la aplicación y un usuario autenticado. Contiene `userId`, nombre, rol y marca de ingreso; se persiste en `localStorage`.
- **Rol**: Perfil de acceso que agrupa un conjunto de permisos. Los roles son `administrador`, `gerente`, `comprador`, `bodeguero` y `consulta`.
- **Permiso**: Acción o vista autorizada, identificada por una clave estable (por ejemplo, `documents.create` u `orders.approve`).
- **Transición de Estado**: Cambio del ciclo de vida de una orden de compra que requiere un permiso específico según el estado de origen y el estado destino.
- **Solicitud de Compra**: Denominación visible de un documento en `borrador` o `pendiente`; no es una entidad persistida distinta de la Orden de Compra de `002`.
- **Orden de Compra Emitida**: Denominación visible de un documento en `aprobado` o `recibido`; conserva la misma entidad y claves de la Orden de Compra de `002`.
- **Empleado Solicitante Vinculado**: Vínculo estable entre un Usuario `comprador` y un Empleado registrado, usado para asignar automáticamente el solicitante de sus solicitudes.

**Relaciones**: un usuario tiene exactamente un rol; un rol agrupa cero o más permisos; una sesión referencia exactamente un usuario; una transición de estado requiere exactamente un permiso; un usuario `comprador` se vincula con exactamente un empleado solicitante propio, vinculado por `userId`, y un empleado solicitante puede estar vinculado como máximo a un usuario; una «Solicitud de Compra» y una «Orden de Compra Emitida» son el mismo documento en estados distintos.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: El 100 % de los accesos con User ID registrado y activo abre la aplicación con el nombre y rol correctos.
- **SC-002**: El 100 % de los intentos con User ID vacío, inválido, desconocido o inactivo permanece en la pantalla de acceso con un mensaje comprensible.
- **SC-003**: El 100 % de las recargas con sesión activa restaura la sesión sin volver a pedir credenciales.
- **SC-004**: El 100 % de las vistas y acciones visibles para cada rol coincide con la matriz de permisos definida.
- **SC-005**: El 100 % de las transiciones de estado ofrecidas a cada rol corresponde a sus permisos y al ciclo de vida vigente.
- **SC-006**: El 100 % de los intentos de operación no autorizada se rechaza sin modificar datos.
- **SC-007**: El cierre de sesión elimina la sesión persistida y devuelve a la pantalla de acceso en el 100 % de los casos.
- **SC-008**: Al menos el 90 % de los usuarios de prueba identifica su rol y las acciones disponibles sin ayuda.
- **SC-009**: La suite completa de pruebas, el build y el lint finalizan sin errores tras la integración.
- **SC-010**: El 100 % de los documentos en `borrador` o `pendiente` se muestra como «Solicitud de compra» y el 100 % de los documentos en `aprobado` o `recibido` como «Orden de Compra emitida», en todas las superficies listadas.
- **SC-011**: El 100 % de los intentos del `comprador` de aprobar o rechazar una solicitud `pendiente` se rechaza sin modificar el estado, el historial ni el stock.
- **SC-012**: El 100 % de las órdenes aprobadas tiene una fecha de emisión visible y conserva una fecha válida conforme a `002`.
- **SC-013**: El 0 % de las vistas del `comprador` expone el límite de crédito y el 100 % de sus ediciones de proveedores conserva el valor persistido.
- **SC-014**: El 100 % de las solicitudes creadas o editadas por el `comprador` usa su empleado propio, incluso ante un payload manipulado.
- **SC-015**: El 100 % de los elementos de `003` listados respeta la matriz de permisos y el 100 % de las operaciones rechazadas muestra un error persistente sin falsos éxitos.

## Supuestos

- La autenticación es local y de demostración: el User ID identifica al usuario, pero no constituye una credencial secreta.
- No existen contraseñas, tokens, cifrado, servidor de identidad ni integración con directorio corporativo.
- El directorio de usuarios se administra por código o mediante `saveUsers`; esta entrega no incluye una pantalla de administración de usuarios.
- El rol se resuelve en el cliente y el almacenamiento local puede ser manipulado por el usuario; el RBAC protege la experiencia y evita errores operativos, no es una frontera de seguridad frente a un atacante con acceso al navegador.
- Los usuarios de demostración son `ADMIN-001`, `GER-001`, `COMP-001`, `BOD-001` y `CONS-001`.
- El rol `gerente` cubre la totalidad de los permisos declarados en el catálogo vigente; su matriz coincide intencionalmente con la del `administrador` y las pruebas lo verifican de forma explícita.
- La sesión persiste en el navegador hasta que el usuario cierre sesión o el usuario sea eliminado o desactivado.
- Se conservan las reglas de negocio, las claves de datos y el comportamiento del módulo base y de la extensión de órdenes de compra.
- La interfaz sigue las convenciones visuales y de accesibilidad del marco existente.
- Las pruebas existentes que llaman a `initApp()` sin sesión deben seguir funcionando con acceso completo; el login real se aplica en `boot()`.
- «Solicitud de compra» y «Orden de Compra emitida» son denominaciones visibles derivadas del estado; no crean entidades, tipos ni claves nuevas.
- `002` define `startDate` como fecha de emisión y la exige al guardar; esta revisión no altera esa validación y solo completa el valor automáticamente cuando falta.
- El vínculo `id_empleado` del `comprador` es un campo opcional de `erp_auth:users`; no modifica las claves ni el esquema de empleados de `002`.
- El empleado propio del `comprador` se crea una sola vez si no existe, con el nombre y cargo del Usuario de la sesión, y se vincula por `userId`; no se reutiliza por nombre y no se ofrece administración visual de ese vínculo.
- La entidad Session no cambia ni almacena `cargo`; el nombre y el cargo del empleado solicitante se obtienen del registro de Usuario resuelto por `userId`.
- `creditLimit` sigue persistiéndose para los demás roles; el `comprador` no lo ve ni puede cambiarlo, y sus ediciones conservan el valor existente.
- La visibilidad incondicional de «+ Nuevo» descrita en `003` queda subordinada a la matriz de permisos de esta funcionalidad.
- La validación de permisos en los servicios usa la sesión vigente; sin sesión se conserva el comportamiento permisivo para pruebas y usos internos.
- Las notificaciones de error por permisos siguen el contrato de `003`: son persistentes hasta que el usuario las descarte manualmente.
- La carga de datos de demostración de `003` no es una vía de aprobación: un rol sin permiso de aprobación no debe crear órdenes `aprobado` por esa acción.
