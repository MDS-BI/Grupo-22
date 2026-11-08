# Especificación de la Funcionalidad: Autenticación por User ID y Control de Acceso por Roles (RBAC)

**Rama de la funcionalidad**: `003-authentication-rbac`

**Creada**: 2026-11-08

**Estado**: Implementada

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
5. **Dada** una orden cuyo estado destino no está autorizado para el rol, **cuando** el usuario abre el detalle, **entonces** esa acción no aparece entre los botones.
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
- **FR-018**: El rol `comprador` DEBE poder crear y editar proveedores, crear y editar órdenes, enviar a revisión y cancelar, pero NO DEBE aprobar, recibir ni gestionar productos.
- **FR-019**: El rol `bodeguero` DEBE ver panel, órdenes, productos y búsqueda, recibir órdenes y gestionar productos y stock, pero NO DEBE ver proveedores ni crear o editar órdenes.
- **FR-020**: El rol `consulta` DEBE tener acceso de solo lectura a panel, proveedores, órdenes, productos y búsqueda, y DEBE poder imprimir órdenes.
- **FR-021**: El sistema DEBE mapear cada estado destino de una transición a un permiso: `pendiente` a envío, `aprobado` a aprobación, `recibido` a recepción y `cancelado` a cancelación.
- **FR-022**: El sistema NO DEBE conceder una transición cuando el rol carezca del permiso correspondiente.

#### Control de acceso en la interfaz

- **FR-023**: El sistema DEBE ocultar los accesos de navegación a las vistas para las que el rol no tiene permiso.
- **FR-024**: El sistema DEBE ocultar los botones de creación, búsqueda y demás accesos directos cuando el rol no tenga el permiso correspondiente.
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

### Entidades Clave

- **Usuario**: Persona registrada en el directorio local. Se identifica por un `userId` único y contiene nombre, cargo, rol y estado activo.
- **Sesión**: Vínculo temporal entre la aplicación y un usuario autenticado. Contiene `userId`, nombre, rol y marca de ingreso; se persiste en `localStorage`.
- **Rol**: Perfil de acceso que agrupa un conjunto de permisos. Los roles son `administrador`, `gerente`, `comprador`, `bodeguero` y `consulta`.
- **Permiso**: Acción o vista autorizada, identificada por una clave estable (por ejemplo, `documents.create` u `orders.approve`).
- **Transición de Estado**: Cambio del ciclo de vida de una orden de compra que requiere un permiso específico según el estado destino.

**Relaciones**: un usuario tiene exactamente un rol; un rol agrupa cero o más permisos; una sesión referencia exactamente un usuario; una transición de estado requiere exactamente un permiso.

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
