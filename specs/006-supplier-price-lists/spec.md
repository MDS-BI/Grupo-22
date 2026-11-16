# Especificación de la Funcionalidad: Listas de Precios por Proveedor y Ajustes Funcionales de Compras

**Rama de la funcionalidad**: `006-supplier-price-lists`

**Creada**: 2026-11-15

**Estado**: Implementada

**Entrada**: Observación del profesor: «el producto no se vincula al proveedor al crearlo». El producto DEBE vincularse a uno o más proveedores al momento de crearlo, con el precio acordado con cada proveedor. Se suman los ajustes funcionales pendientes registrados por el equipo: nombres específicos en el filtro de estado, ficha del proveedor desde Búsqueda, ayuda del campo Moneda, lista de precios aplicada a la orden de compra, folios automáticos y visualización correcta de proveedores extranjeros.

**Contexto base**: [Módulo base](../001-erp-base-module/spec.md), [Flujo de órdenes de compra](../002-purchase-order-workflow/spec.md), [UX y datos de demostración](../003-purchasing-ux-improvements/spec.md) y [Autenticación y RBAC](../004-authentication-rbac/spec.md). Esta funcionalidad es incremental: solo modifica el comportamiento de `001`–`004` en los puntos enumerados en [Cambios declarados sobre especificaciones anteriores](#cambios-declarados-sobre-especificaciones-anteriores). El spec `005` (presentación visual, excepción aprobada en la constitución) queda reservado y no forma parte de esta entrega.

## Propósito

Hasta `004`, un producto existía en el catálogo sin relación con los proveedores, y el precio de cada línea de la orden se digitaba a mano. Esta extensión incorpora la **lista de precios producto–proveedor–precio**: cada producto se crea vinculado a uno o más proveedores con su precio acordado, y la orden de compra usa esa lista para ofrecer solo los productos del proveedor elegido y completar el precio automáticamente. Además, cierra seis ajustes funcionales detectados en la revisión del sprint anterior.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Crear un producto vinculado a sus proveedores con el precio acordado (Prioridad: P1)

Como **Gerente de Compras o Administrador**, quiero vincular un producto a uno o más proveedores con el precio acordado con cada uno al momento de crearlo, para que el catálogo refleje a quién y a cuánto se compra cada producto.

**Por qué esta prioridad**: Es la observación directa del profesor y la base de las historias 2 y 3.

**Prueba Independiente**: Ingresar como `GER-001`, abrir «+ Nuevo» en Productos, intentar guardar sin proveedores (debe rechazarse), agregar dos proveedores con su precio y guardar; comprobar los vínculos en la tabla de productos.

**Escenarios de Aceptación**:

1. **Dado** un Gerente o Administrador, **cuando** crea un producto, **entonces** el formulario incluye la sección «Proveedores y precios acordados» con filas proveedor–precio–moneda.
2. **Dado** el formulario de producto nuevo sin proveedores vinculados, **cuando** el usuario guarda, **entonces** el sistema rechaza el guardado con el mensaje «El producto debe vincularse al menos a un proveedor con su precio acordado.» y no crea el producto.
3. **Dado** un vínculo con precio vacío, cero o negativo, o un proveedor repetido, **cuando** el usuario guarda, **entonces** se informa el error de la fila y no se persiste nada.
4. **Dado** un proveedor Nacional, **cuando** se vincula, **entonces** la moneda del precio queda fija en CLP; **dado** un proveedor Extranjero, **entonces** la moneda puede ser USD o EUR.
5. **Dados** vínculos válidos, **cuando** el usuario guarda, **entonces** el producto y todos sus precios se crean en una sola operación y la tabla de productos muestra «Proveedor (precio)» por cada vínculo.
6. **Dado** un producto existente, **cuando** el Gerente o Administrador lo edita, **entonces** puede agregar, cambiar o quitar vínculos, sin dejar el producto sin proveedor.

---

### Historia de Usuario 2 - Mantener las listas de precios solo con perfiles autorizados (Prioridad: P1)

Como **responsable de compras**, quiero que solo el Gerente y el Administrador mantengan las listas de precios, para que los precios acordados no se alteren desde perfiles operativos.

**Por qué esta prioridad**: Sin este control, cualquier perfil con gestión de productos podría cambiar el precio que luego se aplica automáticamente a las órdenes.

**Prueba Independiente**: Ingresar como `BOD-001`, comprobar que no aparece «+ Nuevo» en Productos, que la sección de precios está oculta y que puede seguir editando datos y stock; intentar crear un producto o un precio por servicio y comprobar el rechazo.

**Escenarios de Aceptación**:

1. **Dado** un Bodeguero, **cuando** abre Productos, **entonces** no ve «+ Nuevo» ni la sección de precios, y conserva la edición de datos y stock.
2. **Dado** un Bodeguero que fuerza el envío del formulario de producto nuevo, **cuando** el sistema lo procesa, **entonces** lo rechaza con «Solo Gerente o Administrador pueden crear productos…» y no crea el producto.
3. **Dado** un Comprador, Bodeguero o Consulta, **cuando** se intenta crear o cambiar un precio por cualquier vía, **entonces** el servicio responde `PERMISSION_DENIED` sin modificar datos.
4. **Dado** un Gerente o Administrador, **cuando** agrega o cambia un precio, **entonces** la operación se persiste.

---

### Historia de Usuario 3 - Armar la orden con la lista de precios del proveedor (Prioridad: P1)

Como **Comprador**, quiero que al elegir un proveedor la orden solo me ofrezca sus productos y complete el precio acordado, para ingresar únicamente la cantidad y no equivocarme de precio.

**Por qué esta prioridad**: Es el uso operativo de la lista de precios y elimina la digitación manual del precio.

**Prueba Independiente**: Vincular un producto a un proveedor con precio 1.200; en la solicitud elegir ese proveedor, comprobar que el selector solo muestra ese producto, que el costo unitario se completa con 1.200 y no es editable, y que la orden guardada conserva 1.200 aunque se manipule el campo.

**Escenarios de Aceptación**:

1. **Dado** un proveedor con lista de precios, **cuando** se elige en la solicitud, **entonces** el selector de productos muestra solo los productos de su lista en la moneda de la orden, con el precio visible.
2. **Dado** un producto de la lista, **cuando** se selecciona, **entonces** el costo unitario se completa automáticamente y queda de solo lectura, con un texto de ayuda que lo explica.
3. **Dado** un costo unitario manipulado en la interfaz o en el servicio, **cuando** se guarda la línea o la orden, **entonces** el precio persistido es el de la lista.
4. **Dado** un producto que no está en la lista del proveedor, **cuando** se intenta agregar o guardar, **entonces** se rechaza con `PRODUCT_NOT_IN_PRICE_LIST`.
5. **Dado** un proveedor Extranjero con precio acordado en EUR, **cuando** la orden está en USD, **entonces** el producto no se ofrece y el servicio rechaza la línea con `PRICE_CURRENCY_MISMATCH`.
6. **Dado** un borrador con líneas, **cuando** se cambia el proveedor o la moneda, **entonces** las líneas se reprecian con la nueva lista y se quitan, con aviso, las que no pertenecen a ella.
7. **Dado** un proveedor sin lista de precios (datos anteriores a 006), **cuando** se arma la orden, **entonces** se conserva el comportamiento de `002`: todos los productos y precio manual.

---

### Historia de Usuario 4 - Folios automáticos de solicitud y de OC (Prioridad: P2)

Como **Comprador**, quiero que la solicitud no me pida folio y reciba un número correlativo, y que el folio de la OC se asigne al aprobarse, para evitar folios repetidos o inventados.

**Por qué esta prioridad**: Elimina un dato manual propenso a errores y distingue la solicitud de la OC emitida.

**Prueba Independiente**: Crear una solicitud sin folio y comprobar `SOL-0001` en la lista; aprobarla y comprobar `OC-0001` en la lista y en el detalle.

**Escenarios de Aceptación**:

1. **Dado** el formulario de solicitud en Compras, **cuando** se abre, **entonces** no muestra el campo Folio.
2. **Dada** una solicitud nueva sin folio, **cuando** se guarda, **entonces** recibe el siguiente correlativo y se muestra como `SOL-0001`, `SOL-0002`, etc.
3. **Dada** una solicitud, **cuando** pasa a `aprobado`, **entonces** recibe una única vez el siguiente folio de OC, mostrado como `OC-0001`, `OC-0002`, etc., en el orden de aprobación.
4. **Dada** una OC emitida, **cuando** se recibe, **entonces** conserva su folio de OC.
5. **Dado** el detalle o la vista imprimible, **cuando** se consulta, **entonces** muestran «N° de solicitud» y «Folio OC» («Sin emitir» mientras no se apruebe).
6. **Dado** un folio informado explícitamente por servicio (compatibilidad), **cuando** se guarda, **entonces** se respeta si es único y positivo, según `001` FR-010.

---

### Historia de Usuario 5 - Filtrar por estado con nombres específicos (Prioridad: P2)

Como **usuario de Compras**, quiero que el filtro de estado muestre un nombre distinto para cada opción, para no confundir opciones que hoy se ven repetidas.

**Prueba Independiente**: Abrir Solicitudes y Órdenes de Compra y comprobar que las opciones del filtro no se repiten; filtrar por «Solicitud – Pendiente de aprobación» y por el grupo «Solicitud de compra».

**Escenarios de Aceptación**:

1. **Dado** el filtro de estado, **cuando** se despliega, **entonces** muestra: Solicitud de compra (grupo), Solicitud – Borrador, Solicitud – Pendiente de aprobación, Orden de Compra emitida (grupo), OC emitida – Aprobada, OC – Recibida y Cancelada, sin nombres repetidos.
2. **Dado** un estado específico, **cuando** se selecciona, **entonces** la lista muestra solo las órdenes en ese estado.
3. **Dado** un grupo, **cuando** se selecciona, **entonces** la lista muestra las órdenes de todos los estados del grupo.
4. **Dado** un filtro activo, **cuando** se muestra el resumen de filtros, **entonces** usa el mismo nombre de la opción.

---

### Historia de Usuario 6 - Ficha del proveedor desde Búsqueda y proveedores extranjeros legibles (Prioridad: P2)

Como **usuario de Compras**, quiero hacer clic en un proveedor de la Búsqueda para ver su ficha con datos, historial de OC y monto total comprado, y quiero que los proveedores extranjeros se muestren con su identificación tributaria y sin separadores vacíos.

**Prueba Independiente**: Buscar un proveedor, hacer clic y comprobar la ficha; crear un proveedor extranjero y comprobar que la Búsqueda y la lista de Proveedores muestran su identificación sin « · · ».

**Escenarios de Aceptación**:

1. **Dado** un resultado de proveedor en Búsqueda, **cuando** el usuario hace clic, **entonces** se abre la ficha con origen, RUT o identificación extranjera, rubros, contacto, condición de pago y, si el rol puede verlo, límite de crédito.
2. **Dada** la ficha, **cuando** se muestra, **entonces** incluye la lista de precios del proveedor y el historial de órdenes (N° de solicitud, folio OC, tipo de documento, estado, emisión y total), más recientes primero.
3. **Dada** la ficha, **cuando** se muestra, **entonces** el monto total comprado suma solo OC emitidas (`aprobado` y `recibido`), agrupado por moneda.
4. **Dado** un proveedor Extranjero sin RUT, **cuando** aparece en Búsqueda o en la lista de Proveedores, **entonces** se muestra «ID tributario ext. …» y nunca separadores vacíos.
5. **Dado** el campo Moneda de la solicitud, **cuando** el proveedor es Nacional, **entonces** se muestra la ayuda «Moneda fija CLP para proveedores nacionales.»; **cuando** es Extranjero, se indica que puede elegir USD o EUR.

### Casos Límite

- **Producto sin proveedores creado antes de 006**: se mantiene; al editarlo con sesión activa se exige vincular al menos un proveedor.
- **Proveedor eliminado**: sus precios dejan de considerarse vigentes (se ignoran al leer la lista del producto y del proveedor).
- **Producto eliminado**: se eliminan sus precios.
- **Quitar el último vínculo de un producto con sesión activa**: se rechaza.
- **Cambio de precio en la lista**: las líneas de órdenes no terminales se reprecian al volver a guardarse; las OC recibidas o canceladas conservan su precio histórico.
- **Modo sin sesión (`initApp()` directo, pruebas e integraciones internas, según `004`)**: se permite crear productos sin vínculos para conservar la compatibilidad; con sesión real la regla de al menos un proveedor es obligatoria.
- **Orden con estado inicial `aprobado` creada por servicio**: recibe folio OC al crearse.
- **Folio informado que ya existe**: se rechaza según `001` FR-010.
- **Filtro con un valor de estado guardado que ya no existe**: se restablece a «Todos».
- **Proveedor de la ficha eliminado mientras está abierta**: la ficha se cierra al refrescar la Búsqueda.
- **Recarga de demostración**: la sustitución elimina también las listas de precios anteriores.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

#### Lista de precios producto–proveedor

- **FR-001**: El sistema DEBE persistir vínculos producto–proveedor con `precio` acordado (> 0) y `moneda`, en la clave `erp_purchasing:supplier-prices`.
- **FR-002**: Un producto NO DEBE tener dos vínculos con el mismo proveedor.
- **FR-003**: La moneda del precio DEBE ser CLP para proveedores Nacionales y USD o EUR para Extranjeros (por defecto USD), según las reglas de origen de `002` FR-046 a FR-048.
- **FR-004**: El formulario de producto DEBE incluir la sección «Proveedores y precios acordados» para agregar, editar y quitar vínculos.
- **FR-005**: Con sesión activa, crear un producto DEBE exigir al menos un vínculo válido; producto y vínculos DEBEN crearse en una sola operación sin persistencia parcial.
- **FR-006**: Con sesión activa, el sistema NO DEBE permitir dejar un producto sin vínculos al editarlo o al quitar un precio.
- **FR-007**: Solo los roles con el nuevo permiso `pricelists.manage` (Gerente y Administrador) DEBEN poder crear productos y crear, cambiar o quitar precios; el servicio DEBE rechazar a los demás con `PERMISSION_DENIED`.
- **FR-008**: La tabla de productos DEBE mostrar los proveedores vinculados con su precio y moneda.
- **FR-009**: Al eliminar un producto, el sistema DEBE eliminar sus precios; los precios de proveedores eliminados NO DEBEN considerarse vigentes.

#### Orden de compra con lista de precios

- **FR-010**: Si el proveedor de la orden tiene lista de precios, el selector de productos DEBE ofrecer solo los productos de su lista en la moneda de la orden, mostrando el precio.
- **FR-011**: Si el proveedor tiene lista de precios, el costo unitario DEBE completarse desde la lista y NO DEBE ser editable; el servicio DEBE fijar el precio de la lista aunque reciba otro valor.
- **FR-012**: El servicio DEBE rechazar con `PRODUCT_NOT_IN_PRICE_LIST` un producto que no esté en la lista del proveedor y con `PRICE_CURRENCY_MISMATCH` un precio acordado en otra moneda.
- **FR-013**: Al cambiar el proveedor o la moneda de un borrador, el sistema DEBE repreciar las líneas y quitar, informando al usuario, las que no pertenezcan a la nueva lista.
- **FR-014**: Si el proveedor no tiene lista de precios, el sistema DEBE conservar el comportamiento de `002` (todos los productos y precio manual).

#### Folios automáticos

- **FR-015**: En Compras, el formulario de solicitud NO DEBE mostrar el campo Folio.
- **FR-016**: Una solicitud sin folio DEBE recibir el siguiente correlativo (máximo + 1), mostrado como `SOL-` más cuatro dígitos.
- **FR-017**: Al pasar a `aprobado`, la orden DEBE recibir una sola vez el siguiente folio de OC (`ocFolio`), mostrado como `OC-` más cuatro dígitos, y DEBE conservarlo en estados posteriores.
- **FR-018**: La lista, el detalle, la vista imprimible, la Búsqueda y la ficha del proveedor DEBEN mostrar el número de solicitud y, si existe, el folio de OC; la Búsqueda DEBE encontrar órdenes por `SOL-…` y `OC-…`.

#### Filtro de estado

- **FR-019**: El filtro de estado de Compras DEBE ofrecer opciones con nombre único: «Solicitud de compra» (borrador + pendiente), «Solicitud – Borrador», «Solicitud – Pendiente de aprobación», «Orden de Compra emitida» (aprobado + recibido), «OC emitida – Aprobada», «OC – Recibida» y «Cancelada».
- **FR-020**: Filtrar por un grupo DEBE incluir todos sus estados; filtrar por un estado DEBE incluir solo ese estado. El resumen de filtros DEBE usar el nombre de la opción.

#### Búsqueda, ficha del proveedor y proveedores extranjeros

- **FR-021**: Cada proveedor de la Búsqueda DEBE ser un control activable que abre su ficha.
- **FR-022**: La ficha DEBE mostrar datos del proveedor (respetando la restricción del límite de crédito de `004`), lista de precios, historial de órdenes y monto total comprado por moneda, sumando solo OC `aprobado` y `recibido`.
- **FR-023**: Los proveedores extranjeros DEBEN mostrarse con su identificación tributaria extranjera en Búsqueda, lista de Proveedores, ficha, detalle y vista imprimible, sin separadores vacíos.
- **FR-024**: El campo Moneda DEBE mostrar la ayuda «Moneda fija CLP para proveedores nacionales.» para proveedores Nacionales e indicar USD o EUR para Extranjeros, asociada con `aria-describedby`.

#### Datos de demostración

- **FR-025**: La carga de demostración DEBE crear listas de precios en las que todo producto tenga al menos un proveedor, todo proveedor (incluido el extranjero sin órdenes) tenga lista y cada línea de las órdenes demo coincida con el precio de la lista.
- **FR-026**: La notificación de carga DEBE informar la cantidad de precios acordados creados, y la sustitución DEBE eliminar las listas anteriores.

### Cambios declarados sobre especificaciones anteriores

| Spec / FR afectado | Comportamiento anterior | Comportamiento con 006 |
|---|---|---|
| `001` FR-009 | La orden se crea con folio informado por el usuario. | En Compras el folio se asigna automáticamente si no se informa (FR-015, FR-016). FR-010 (entero positivo y único) se mantiene. |
| `001` FR-013, `002` FR-001, FR-002 y FR-006 | El precio unitario de la línea se ingresa y edita manualmente. | Con proveedor con lista, el precio proviene de la lista y no es editable (FR-011). Sin lista, se mantiene. |
| `002` FR-005 | El producto de la línea debe existir en el catálogo. | Además debe pertenecer a la lista del proveedor cuando este tiene lista (FR-012). |
| `001` FR-021 | Mantenedor de productos con nombre, unidad, stock y categoría. | Agrega la sección de proveedores y precios, obligatoria al crear con sesión (FR-004, FR-005). |
| `002` FR-035 | La vista imprimible incluye folio. | Incluye además N° de solicitud y Folio OC (FR-018). |
| `003` FR-025, FR-071 y FR-073 | El filtro de estado listaba «Solicitud de compra»/«Orden de Compra emitida» repetidos por estado. | Opciones con nombre único por grupo y por estado (FR-019, FR-020). Las insignias de estado de `004` no cambian. |
| `003` FR-044, FR-075, FR-081, FR-086 y FR-088 | La demostración no tenía listas de precios. | Crea listas de precios, las informa y las reemplaza (FR-025, FR-026). |
| `004` FR-015 y matriz de permisos | 18 permisos. | Se agrega `pricelists.manage` para Administrador y Gerente (FR-007); la paridad Gerente–Administrador se conserva. |
| `004` FR-019 | El Bodeguero gestiona productos, incluida su creación. | El Bodeguero conserva edición de datos, stock y eliminación, pero NO crea productos ni mantiene precios (FR-007). |
| `001` FR-031 y FR-036, FR-070 | Resultados de proveedores como texto; el extranjero se mostraba con RUT vacío. | El proveedor abre su ficha (FR-021, FR-022) y se muestra su identificación extranjera (FR-023). |

`002` FR-047 y FR-048 (reglas de moneda) no cambian; FR-024 solo agrega texto de ayuda.

### Entidades Clave

- **Precio acordado (SupplierPrice)**: vínculo producto–proveedor con precio y moneda. Ver [data-model.md](data-model.md).
- **Orden de compra**: agrega `ocFolio` (folio correlativo de OC asignado al aprobar). El `folio` existente pasa a ser el correlativo de la solicitud.
- **Ficha del proveedor**: vista derivada, no persistida.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: El 100 % de los productos creados con sesión activa queda vinculado al menos a un proveedor con precio.
- **SC-002**: Con proveedor con lista, el 100 % de las líneas guardadas usa el precio de la lista, aun si se manipula el campo o el payload.
- **SC-003**: Ninguna opción del filtro de estado repite su nombre.
- **SC-004**: El 100 % de las solicitudes nuevas sin folio recibe un correlativo único y el 100 % de las OC aprobadas recibe un folio OC único y estable.
- **SC-005**: La ficha del proveedor se abre con un clic desde la Búsqueda y su monto total coincide con la suma de las OC emitidas.
- **SC-006**: Las 325 pruebas existentes de `001`–`004` siguen pasando sin modificaciones, junto con las nuevas pruebas de `006`, y `npm run lint` no informa errores.

## Supuestos

- El precio acordado es neto (sin IVA); el IVA se sigue calculando según el origen del proveedor (`002` FR-047/FR-048).
- Un producto puede tener precios con varios proveedores; no se modela vigencia por fechas ni historial de precios en esta entrega.
- El correlativo es el máximo existente + 1 y es local a un navegador, consistente con la persistencia en `localStorage`.
- El Gerente y el Administrador mantienen las listas; el Comprador solo las usa al armar la orden.
- La presentación visual general (spec `005`) se aborda por separado; 006 solo agrega los controles necesarios con el estilo existente.
