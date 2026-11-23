# Especificación de la Funcionalidad: Gestión de Compras Avanzada

**Rama de la funcionalidad**: `007-gestion-compras-avanzada`

**Creada**: 2026-11-16

**Estado**: Implementada (2026-11-16). Ver la nota de implementación al final de `tasks.md`.

**Entrada**: Pedido del profesor: «más funcionalidad». El grupo propuso seis capacidades nuevas sobre el módulo de Compras: evaluación de proveedores, stock mínimo con solicitud sugerida, reportes, presupuesto por área, bandeja de notificaciones y mejoras rápidas (duplicar OC, proveedor inactivo, exportar a CSV). En la revisión del 2026-11-16 se agregó una séptima: la nueva solicitud es poco intuitiva porque obliga a elegir primero el proveedor; al comprar un producto, el sistema debe ofrecer los proveedores que ya lo venden con su precio acordado según la cantidad.

**Contexto base**: [Módulo base](../001-erp-base-module/spec.md), [Flujo de órdenes de compra](../002-purchase-order-workflow/spec.md), [UX y datos de demostración](../003-purchasing-ux-improvements/spec.md), [Autenticación y RBAC](../004-authentication-rbac/spec.md), [Rediseño visual](../005-compras-visual-redesign/spec.md) y [Listas de precios por proveedor](../006-supplier-price-lists/spec.md). Esta funcionalidad es incremental: solo modifica el comportamiento de `001`–`006` en los puntos enumerados en [Cambios declarados sobre especificaciones anteriores](#cambios-declarados-sobre-especificaciones-anteriores). Reutiliza los espacios que el `005` dejó reservados: la entrada «Reportes» de la barra lateral (`#nav-reports`) y la campana de la barra superior (`#notifications-placeholder`).

## Propósito

Hasta `006`, el módulo registra el ciclo de una compra (solicitud, aprobación, recepción y stock) con precios acordados por proveedor, pero no ayuda a decidir: no mide a los proveedores, no avisa cuándo reponer, no controla el gasto por área ni resume lo comprado. El `007` agrega esa capa de gestión usando solo datos que el sistema ya registra (fechas comprometidas, historial de estados, totales, stock y listas de precios) más tres datos nuevos: stock mínimo por producto, área de cada solicitud y presupuesto mensual por área.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Evaluar a los proveedores por su cumplimiento (Prioridad: P1)

Como **Gerente de Compras**, quiero ver en la ficha de cada proveedor su puntualidad, su atraso promedio, cuántas OC le hemos emitido, cuánto le hemos comprado y una calificación A/B/C, para decidir a quién seguir comprando.

**Por qué esta prioridad**: Usa información que hoy existe pero no se aprovecha (fecha comprometida e historial de recepción) y responde directamente al pedido de «más funcionalidad».

**Prueba Independiente**: Con datos de demostración, ingresar como `GER-001`, abrir la ficha de un proveedor desde Búsqueda y comprobar el porcentaje de entregas a tiempo, los días promedio de atraso, la cantidad de OC, el monto comprado y la calificación.

**Escenarios de Aceptación**:

1. **Dado** un proveedor con OC recibidas, **cuando** el Gerente abre su ficha, **entonces** ve la sección «Evaluación del proveedor» con: % de entregas a tiempo, días promedio de atraso, n° de OC emitidas, n° de OC recibidas, monto total comprado por moneda y calificación.
2. **Dada** una OC recibida, **cuando** la fecha de recepción (paso a `recibido` en el historial) es igual o anterior a la fecha de entrega comprometida, **entonces** cuenta como entrega a tiempo; si es posterior, cuenta como atrasada con la diferencia en días corridos.
3. **Dado** el porcentaje a tiempo, **cuando** es ≥ 90 %, **entonces** la calificación es **A**; entre 70 % y 89,9 %, **B**; bajo 70 %, **C**.
4. **Dado** un proveedor sin OC recibidas, **cuando** se abre su ficha, **entonces** la calificación es «Sin datos» y no se muestran porcentajes.
5. **Dado** un rol sin el permiso `reports.view` (Comprador, Bodeguero, Consulta), **cuando** abre la ficha, **entonces** no ve la sección de evaluación. Esta restricción aplica a la ficha, las tarjetas y Reportes; no afecta a la excepción de visualización de la tabla comparativa de US7 (FR-005).
6. **Dada** la lista de Proveedores en vista de tarjetas (`005`), **cuando** el usuario tiene `reports.view`, **entonces** cada tarjeta muestra la calificación como etiqueta.

---

### Historia de Usuario 7 - Comprar por producto comparando proveedores y precios por cantidad (Prioridad: P1)

Como **Comprador**, quiero empezar una solicitud eligiendo el producto y la cantidad, y que el sistema me muestre los proveedores que ya lo venden con el precio acordado para esa cantidad, para elegir la mejor opción sin saber de antemano a quién comprarle.

**Por qué esta prioridad**: Es el recorrido natural de una compra y corrige la observación de la revisión: hoy hay que elegir el proveedor antes de ver qué vende. Además incorpora descuentos por volumen, habituales en los acuerdos con proveedores.

**Prueba Independiente**: Con datos de demostración, abrir «+ Nueva solicitud» → «Comprar por producto», buscar un producto con dos proveedores, ingresar una cantidad que cruce un tramo de precio, comprobar la tabla comparativa (con su columna «Calificación» visible para el Comprador según FR-005) y la opción destacada, agregar dos productos de proveedores distintos y guardar: se crean dos solicitudes, una por proveedor.

**Escenarios de Aceptación**:

1. **Dado** el formulario de nueva solicitud, **cuando** se abre, **entonces** ofrece dos modos: «Comprar por producto» (por defecto) y «Elegir proveedor primero» (el flujo actual del `006`).
2. **Dado** el modo «Comprar por producto», **cuando** el Comprador busca un producto y escribe una cantidad, **entonces** ve una tabla con cada proveedor **activo** que lo vende: precio unitario aplicable a esa cantidad, tramo aplicado, total neto, moneda y calificación (Historia 1). La calificación mostrada en esta tabla sigue la excepción de FR-005: se muestra a los roles que usan este modo (requiere `documents.create`) sin exigir `reports.view`; el grade calculado por `gradeFor` (FR-004) se usa además como valor **interno** del criterio de FR-011 con independencia del rol. Ante ofertas en monedas mixtas, la tabla se ordena con el mismo criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre), sin conversión automática de moneda.
3. **Dada** la tabla comparativa, **cuando** se muestra, **entonces** la primera opción según el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación A > B > C > Sin datos → nombre alfabéticamente menor; sin conversión de moneda) queda destacada como «Mejor precio» y se elige con un clic; también se puede elegir otra.
4. **Dado** un precio acordado con tramos (por ejemplo 1–9 a $1.000, 10–49 a $950, 50 o más a $900), **cuando** la cantidad cambia, **entonces** el precio unitario se recalcula con el tramo cuya cantidad mínima es la mayor que no supera la cantidad.
5. **Dados** productos elegidos de proveedores distintos, **cuando** se guarda, **entonces** se crea una solicitud por proveedor con sus líneas, el mismo empleado y fecha de entrega; el borrador se guarda sin `id_area` y el área se exige al enviar a revisión (regla única de FR-018), y el aviso informa los números creados (por ejemplo «Se crearon SOL-0012 y SOL-0013»).
6. **Dado** un producto sin proveedores activos con precio, **cuando** se busca, **entonces** se indica «Sin proveedores con precio acordado» y no se puede agregar.
7. **Dado** el modo «Elegir proveedor primero» o la edición de una solicitud existente, **cuando** se agregan líneas, **entonces** el precio también usa los tramos según la cantidad y sigue sin ser editable (`006` FR-011).
8. **Dado** el formulario de producto, **cuando** un rol con `pricelists.manage` edita el precio acordado con un proveedor, **entonces** puede agregar tramos «desde N unidades: precio»; un precio sin tramos equivale a un único tramo desde 1 unidad.

---

### Historia de Usuario 2 - Detectar productos bajo el mínimo y generar la solicitud sugerida (Prioridad: P1)

Como **Bodeguero**, quiero definir un stock mínimo por producto y ver cuáles están bajo ese mínimo; como **Comprador**, quiero generar con un clic las solicitudes para reponerlos con el proveedor de mejor precio.

**Por qué esta prioridad**: Conecta el stock (`002`) con las listas de precios (`006`) y reduce trabajo manual; es la funcionalidad más visible en la demostración.

**Prueba Independiente**: Definir un mínimo mayor que el stock de un producto, comprobar que aparece en «Productos bajo el mínimo» del Panel y, como Comprador, pulsar «Crear solicitud sugerida» y comprobar el borrador generado.

**Escenarios de Aceptación**:

1. **Dado** el formulario de producto, **cuando** un rol con `products.manage` lo edita, **entonces** puede ingresar «Stock mínimo» (entero ≥ 0; 0 significa sin control).
2. **Dado** un producto con stock mínimo > 0 y stock **menor o igual** al mínimo, **cuando** se abre el Panel, **entonces** aparece en la tarjeta «Productos bajo el mínimo» con su stock, su mínimo y la cantidad sugerida.
3. **Dado** un producto bajo el mínimo, **cuando** se calcula la cantidad sugerida, **entonces** es `2 × mínimo − stock actual` (reponer hasta el doble del mínimo), con un mínimo de 1.
4. **Dados** productos bajo el mínimo con lista de precios, **cuando** el Comprador pulsa «Crear solicitud sugerida», **entonces** el sistema crea **un borrador por proveedor**, eligiendo para cada producto el proveedor primero según el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación A > B > C > Sin datos → nombre alfabéticamente menor; sin conversión de moneda), aplicando los tramos de la Historia 7 a la cantidad sugerida, con la cantidad sugerida y el precio de la lista. Los borradores se crean sin exigir `id_area`, aunque haya áreas activas; el área se asigna al enviar a revisión (regla única de FR-018).
5. **Dado** un producto bajo el mínimo sin ningún proveedor en su lista de precios, **cuando** se generan las solicitudes, **entonces** se omite y el aviso de resultado lo nombra.
6. **Dados** los borradores generados, **cuando** el Comprador los abre, **entonces** siguen el flujo normal de `002` y `004` (editar, enviar a revisión, aprobar); quedan asociados al empleado de la sesión. Los borradores pueden guardarse sin `id_area` aunque haya áreas activas; si las hay, el Comprador debe elegir un área activa válida **al enviarlos a revisión**, momento en que se valida `AREA_REQUIRED` y se guarda en la metadata de la orden (regla única de FR-018).
7. **Dado** el Bodeguero, **cuando** ve el Panel, **entonces** ve la tarjeta «Productos bajo el mínimo» pero no el botón «Crear solicitud sugerida» (requiere `documents.create`).

---

### Historia de Usuario 3 - Consultar reportes de gasto y exportarlos (Prioridad: P1)

Como **Gerente o Administrador**, quiero una pantalla de reportes con el gasto por proveedor, rubro, área y mes, con filtro de fechas, gráfico y exportación a CSV, para rendir cuentas y planificar compras.

**Por qué esta prioridad**: Es la vista de gestión que hoy no existe; reutiliza la entrada «Reportes» reservada por el `005`.

**Prueba Independiente**: Con datos de demostración, abrir «Reportes» como `GER-001`, cambiar la agrupación y el rango de fechas, comprobar que la tabla y el gráfico cambian, y exportar a CSV.

**Escenarios de Aceptación**:

1. **Dado** un rol con `reports.view`, **cuando** navega, **entonces** la entrada «Reportes» de Herramientas está visible y habilitada; para los demás roles sigue oculta.
2. **Dada** la pantalla Reportes, **cuando** se abre, **entonces** muestra el gasto de los últimos 6 meses agrupado por proveedor, con selector de agrupación (Proveedor, Rubro, Área, Mes) y filtro de fecha desde/hasta.
3. **Dado** el gasto, **cuando** se calcula, **entonces** suma el total (con IVA) de las OC emitidas (`aprobado` y `recibido`) por fecha de emisión, separado por moneda y sin convertir monedas.
4. **Dada** la agrupación por Rubro, **cuando** un proveedor tiene varios rubros, **entonces** su gasto se cuenta completo en cada rubro y una nota lo advierte; la tabla no muestra un total general para esa agrupación.
5. **Dada** la agrupación por Área, **cuando** una OC no tiene área (anterior al `007`), **entonces** se agrupa como «Sin área».
6. **Dado** el resultado, **cuando** se muestra, **entonces** incluye una tabla (grupo, n° de OC, monto por moneda, % del total de su moneda) y un gráfico de barras SVG con su tabla equivalente accesible.
7. **Dado** el botón «Exportar CSV», **cuando** se pulsa, **entonces** descarga un archivo con las mismas filas y columnas de la tabla, separado por punto y coma, en UTF-8 con BOM, con nombre `reporte-gasto-<agrupación>-<desde>-<hasta>.csv`.
8. **Dado** un rango sin OC emitidas, **cuando** se aplica, **entonces** se muestra un estado vacío y la exportación queda deshabilitada.

---

### Historia de Usuario 4 - Controlar el presupuesto mensual por área (Prioridad: P2)

Como **Administrador**, quiero definir áreas y su presupuesto mensual; como **Gerente**, quiero ver al aprobar cuánto lleva gastado el área ese mes y recibir una advertencia si la OC lo excede.

**Prueba Independiente**: Crear un área con presupuesto, crear una solicitud asociada y, al aprobarla como Gerente, comprobar el gasto del mes, el disponible y la advertencia cuando se excede.

**Escenarios de Aceptación**:

1. **Dado** un rol con `budgets.manage` (Administrador o Gerente), **cuando** abre «Áreas y presupuestos» (pestaña en Reportes), **entonces** puede crear, editar y desactivar áreas (nombre único) y fijar su presupuesto mensual en CLP por mes (`aaaa-mm`).
2. **Dada** al menos un área activa, **cuando** se crea o edita una solicitud, **entonces** el formulario pide «Área» (`#document-area`, T034); el campo es obligatorio **al enviar a revisión** (`AREA_REQUIRED`, validado en `changeOrderStatus`, T033), no para guardar un borrador; si no hay áreas activas, el campo no aparece y rige el comportamiento de `002`.
3. **Dada** una solicitud pendiente con área, **cuando** el Gerente abre su detalle, **entonces** ve: presupuesto del mes, gastado del mes (OC emitidas del área en el mes de emisión, en CLP), disponible y el disponible tras aprobar.
4. **Dado** que el total de la OC supera el disponible, **cuando** el Gerente pulsa «Aprobar», **entonces** el diálogo de confirmación muestra la advertencia «Esta OC excede el presupuesto del área en $X» y permite aprobar igual (advertencia, no bloqueo).
5. **Dada** una OC en moneda extranjera, **cuando** se calcula el presupuesto, **entonces** no se suma al gasto en CLP y el detalle indica «OC en USD/EUR: no se descuenta del presupuesto en CLP».
6. **Dado** un área sin presupuesto para el mes, **cuando** se aprueba, **entonces** el detalle indica «Sin presupuesto definido para este mes» sin advertencia.

---

### Historia de Usuario 5 - Recibir avisos en la bandeja de notificaciones (Prioridad: P2)

Como **usuario de cualquier rol**, quiero una campana con un contador y avisos según mi rol, para enterarme de lo que requiere mi acción sin revisar listas.

**Prueba Independiente**: Como Comprador, enviar una solicitud y, como Gerente, aprobarla; volver como Comprador y comprobar el aviso «Solicitud aprobada», el contador y que se puede marcar como leído.

**Escenarios de Aceptación**:

1. **Dada** una sesión activa, **cuando** se muestra la barra superior, **entonces** la campana (`#notifications-placeholder`) está visible con un contador de avisos no leídos (oculto si es 0).
2. **Dado** el rol, **cuando** se abre la bandeja, **entonces** muestra: Gerente y Administrador → solicitudes pendientes de aprobar y presupuestos excedidos del mes; Bodeguero → OC por recibir y atrasadas; Comprador → sus solicitudes aprobadas o rechazadas (canceladas desde `pendiente`) de los últimos 30 días; Consulta → OC atrasadas.
3. **Dados** los avisos, **cuando** se calculan, **entonces** se derivan del estado actual y del historial (no se guardan copias); los avisos de pendientes y atrasadas reutilizan la consulta «Requiere tu atención» del `005`.
4. **Dado** un aviso, **cuando** el usuario hace clic, **entonces** se marca como leído y se abre el detalle de la orden; «Marcar todo como leído» marca todos.
5. **Dado** un aviso leído, **cuando** la situación cambia (por ejemplo, la OC vuelve a estar atrasada en otro estado), **entonces** se genera un aviso nuevo con otro identificador.
6. **Dado** el estado de lectura, **cuando** se cierra sesión y se vuelve a ingresar en el mismo navegador, **entonces** se conserva por usuario.

---

### Historia de Usuario 6 - Mejoras rápidas: duplicar OC, proveedor inactivo y exportar listas (Prioridad: P3)

Como **usuario de Compras**, quiero duplicar una OC como nuevo borrador, inactivar un proveedor en vez de eliminarlo y exportar las listas a CSV.

**Escenarios de Aceptación**:

1. **Dada** una orden en cualquier estado, **cuando** un rol con `documents.create` pulsa «Duplicar», **entonces** se crea un borrador nuevo con el mismo proveedor, área, condición de pago y líneas, con los precios **vigentes** de la lista del `006`, folio correlativo nuevo y sin folio OC; las líneas cuyo producto ya no está en la lista se omiten y se informa cuáles.
2. **Dado** un proveedor, **cuando** un rol con `entities.update` pulsa «Inactivar», **entonces** el proveedor queda inactivo: no aparece en el selector de nuevas solicitudes ni en las sugeridas, conserva sus OC, su ficha y su evaluación, y se muestra con la etiqueta «Inactivo» en listas y búsqueda; «Reactivar» lo revierte.
3. **Dado** un proveedor con OC, **cuando** se pide eliminarlo, **entonces** el diálogo de confirmación advierte que se eliminarán sus N órdenes (`001` FR-003) y recomienda usar la acción «Inactivar», disponible junto a «Eliminar» en la misma fila o tarjeta.
4. **Dadas** las listas de Proveedores, Productos y Solicitudes y Órdenes de Compra, **cuando** se pulsa «Exportar CSV», **entonces** se descargan las filas visibles con los filtros activos, con las mismas columnas de la tabla, en el formato CSV de la Historia 3.
5. **Dada** una OC de un proveedor inactivo, **cuando** se edita o duplica, **entonces** se informa que el proveedor está inactivo y no se permite duplicar hasta reactivarlo.

### Casos Límite

- **Datos anteriores al `007`**: productos sin stock mínimo (= 0, sin control), órdenes sin área («Sin área»), proveedores sin campo de estado (= activos).
- **OC recibida sin registro en el historial** (datos sembrados directamente): se usa `updatedAt` como fecha de recepción y la evaluación lo indica como «fecha aproximada».
- **Fecha comprometida vacía o inválida**: la OC no cuenta para la puntualidad, sí para montos.
- **Empate de precio entre proveedores** en la solicitud sugerida: la calificación (A > B > C > Sin datos) y luego el nombre alfabéticamente menor son los últimos pasos del criterio de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre), sin conversión de moneda. El grade de FR-004 se aplica como dato interno del desempate aunque la columna no sea visible para el rol (FR-005).
- **Producto bajo el mínimo que ya tiene un borrador o una solicitud pendiente** con ese producto: no se vuelve a sugerir y la tarjeta lo marca «En solicitud SOL-XXXX».
- **Proveedor inactivo**: no se usa para solicitudes sugeridas aunque tenga el mejor precio.
- **Área desactivada**: no aparece para solicitudes nuevas; sus OC siguen en reportes con su nombre.
- **Presupuesto 0**: se considera definido; cualquier OC lo excede.
- **CSV con campos que contienen `;`, comillas o saltos de línea**: se encierran entre comillas dobles y las comillas internas se duplican.
- **Reporte con rango invertido** (desde > hasta): se muestra un error de validación y no se calcula.
- **Sin sesión** (`initApp()` directo, `004`): acceso completo, como en las especificaciones anteriores.
- **Carga de demostración**: incluye áreas, presupuestos, mínimos, tramos de precio y fechas de recepción variadas; la sustitución (`003` FR-086) elimina también los datos nuevos.
- **Tramos mal definidos** (cantidad mínima repetida, menor que 1 o precio ≤ 0): se rechazan al guardar el precio acordado.
- **Cambio de tramos con una solicitud abierta**: las líneas se reprecian al volver a guardarse la solicitud (`006`); las OC aprobadas conservan su precio.
- **Carrito con productos repetidos del mismo proveedor**: se suman las cantidades en una sola línea y se recalcula el tramo.
- **Carrito con un mismo producto de dos proveedores**: se permite (son dos solicitudes distintas).
- **Falla al crear una de las solicitudes del carrito**: no se crea ninguna (operación atómica) y se informa el error.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

#### Evaluación de proveedores

- **FR-001**: El sistema DEBE calcular por proveedor: n° de OC emitidas (`aprobado` + `recibido`), n° de OC recibidas, monto comprado por moneda (OC emitidas), % de entregas a tiempo y días promedio de atraso sobre las OC recibidas con fecha comprometida válida.
- **FR-002**: La fecha de recepción DEBE ser la del registro del historial que lleva la OC a `recibido`; si no existe, `updatedAt`, marcada como aproximada.
- **FR-003**: Los días de atraso DEBEN ser `max(0, días corridos entre la fecha comprometida y la fecha de recepción)`; el promedio se calcula sobre todas las OC recibidas evaluables.
- **FR-004**: La calificación DEBE ser A (≥ 90 % a tiempo), B (≥ 70 % y < 90 %), C (< 70 %) o «Sin datos» (sin OC recibidas evaluables).
- **FR-005**: La ficha del proveedor (`006` FR-022), las tarjetas de proveedor (`005`) y el resto de vistas de evaluación DEBEN mostrar la evaluación solo a roles con `reports.view`. El grade de FR-004 es un valor **interno** usado por el criterio de FR-011 con independencia del rol y de la visibilidad de la columna. **Excepción explícita de visualización**: la tabla comparativa de «Comprar por producto» (US7, FR-035) DEBE mostrar la columna «Calificación» a los roles que usan ese modo (requiere `documents.create`), sin exigir `reports.view`; la excepción NO se extiende a la ficha, las tarjetas ni a Reportes.

#### Stock mínimo y solicitud sugerida

- **FR-006**: El producto DEBE admitir `stock_minimo` (entero ≥ 0, por defecto 0); solo roles con `products.manage` lo editan.
- **FR-007**: Un producto está «bajo el mínimo» cuando `stock_minimo > 0` y `stock ≤ stock_minimo`.
- **FR-008**: La cantidad sugerida DEBE ser `max(1, 2 × stock_minimo − stock)`.
- **FR-009**: El Panel DEBE mostrar la tarjeta «Productos bajo el mínimo» a roles con `products.view`, indicando los que ya están en un borrador o solicitud pendiente.
- **FR-010**: «Crear solicitud sugerida» (requiere `documents.create`) DEBE crear un borrador por proveedor con los productos bajo el mínimo no incluidos en solicitudes abiertas, eligiendo el proveedor **activo** primero según el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre), sin conversión de moneda, y DEBE informar los borradores creados y los productos omitidos.
- **FR-011**: Ante ofertas de un mismo producto en monedas mixtas, proveedores y opciones DEBEN ordenarse por un único criterio determinista, **sin conversión automática de moneda**: (1) ofertas en CLP primero; (2) entre las restantes, la moneda por defecto del proveedor; (3) dentro de la misma moneda, menor precio numérico del tramo aplicable; (4) mejor calificación (FR-004: A > B > C > Sin datos); (5) nombre del proveedor alfabéticamente menor. Este criterio rige la elección de proveedor de FR-010 y la opción destacada de FR-035/US7. **US1 (FR-004, `gradeFor`) es dependencia dura de US2 y US7**: el paso (4) es obligatorio en toda comparación y no se admite omitirlo ni aplicar un desempate alternativo; no existe ruta de implementación sin la calificación.
- **FR-012**: Los borradores generados DEBEN crearse con el servicio de `002` (`savePurchaseOrder`), con el empleado de la sesión, fecha de entrega a 7 días y la condición de pago del proveedor, de modo que todas las reglas de `002`, `004` y `006` se apliquen. `savePurchaseOrder` NO DEBE exigir `id_area` al guardar el borrador, aunque haya áreas activas: `AREA_REQUIRED` se valida solo al enviar a revisión, en `changeOrderStatus` (`src/purchasing-storage.js`, T033), según la regla única de FR-018.

#### Reportes

- **FR-013**: Se DEBE agregar el permiso `reports.view` para Administrador y Gerente; la entrada «Reportes» reservada por el `005` (FR-012 del `005`) DEBE mostrarse solo a esos roles. Este permiso rige la ficha, las tarjetas, la entrada «Reportes» y sus vistas; NO rige la columna «Calificación» de la tabla comparativa de US7, sujeta a la excepción de FR-005 para roles con `documents.create`.
- **FR-014**: La pantalla Reportes DEBE agrupar el gasto de OC emitidas por Proveedor, Rubro, Área o Mes de emisión, con filtro de fecha desde/hasta (por defecto, los últimos 6 meses), separado por moneda.
- **FR-015**: Cada reporte DEBE mostrar tabla y gráfico de barras SVG con tabla equivalente accesible, más un estado vacío cuando no hay datos.
- **FR-016**: La exportación CSV DEBE usar `;` como separador, UTF-8 con BOM, encabezados en español, montos sin separador de miles y punto decimal, y el escapado de RFC 4180 para campos con `;`, comillas o saltos de línea.

#### Presupuesto por área

- **FR-017**: Se DEBE agregar el permiso `budgets.manage` (Administrador y Gerente, para conservar la paridad Gerente–Administrador de `004`) y las entidades Área (nombre único, activa/inactiva) y Presupuesto mensual (área, mes `aaaa-mm`, monto CLP ≥ 0, único por área y mes).
- **FR-018 (regla única de área)**: Los borradores creados con `savePurchaseOrder` —solicitud sugerida de US2, carrito de US7 y formulario de `002`— PUEDEN guardarse sin `id_area`, aunque existan áreas activas. `AREA_REQUIRED` se valida **únicamente al enviar la solicitud a revisión** (pase a `pendiente` de `002`/`004`): si existe al menos un área activa, el envío DEBE exigir un `id_area` de un área activa y guardarlo en la metadata de la orden; si no hay áreas activas, rige el comportamiento de `002`. Esta regla sustituye cualquier exigencia de área en el momento de crear o editar el borrador. **Punto de aplicación**: `src/purchasing-storage.js` → `changeOrderStatus(orderId, 'pendiente')` (transición `borrador → pendiente`), con el error `AREA_REQUIRED` definido en `src/domain/purchasing.js`; el valor se toma del selector `#document-area` del formulario (`src/app.js`) en el submit (T033/T034).
- **FR-019**: El detalle de una solicitud pendiente con área DEBE mostrar, a roles con `orders.approve`, presupuesto, gastado y disponible del mes en curso, y el disponible tras aprobar.
- **FR-020**: Aprobar una OC que excede el disponible DEBE mostrar una advertencia en el diálogo de confirmación sin bloquear la aprobación.
- **FR-021**: El gasto del área DEBE considerar solo OC en CLP; las OC en otra moneda se informan aparte.

#### Notificaciones

- **FR-022**: La campana reservada por el `005` (FR-013 del `005`) DEBE mostrarse con sesión activa, con contador de no leídos y una bandeja accesible (botón con `aria-expanded`, lista con enlaces a cada orden).
- **FR-023**: Los avisos DEBEN derivarse del estado actual según el rol (Historia 5, escenario 2) y reutilizar la función de «Requiere tu atención» del `005`.
- **FR-024**: El estado de lectura DEBE guardarse por usuario en `localStorage`; cada aviso tiene un identificador estable `<tipo>:<idOrden>:<estado>`.

#### Mejoras rápidas

- **FR-025**: «Duplicar» (requiere `documents.create`) DEBE crear un borrador con precios vigentes de la lista y folio nuevo, omitiendo e informando líneas sin precio vigente.
- **FR-026**: El proveedor DEBE admitir el estado `activo`/`inactivo` (por defecto activo), editable con `entities.update`; los inactivos no se ofrecen en solicitudes nuevas, sugeridas ni duplicadas.
- **FR-027**: La confirmación de eliminar un proveedor con OC DEBE informar cuántas órdenes se eliminarán y recomendar la acción «Inactivar», que se muestra junto a «Eliminar».
- **FR-028**: Las listas de Proveedores, Productos y Solicitudes y Órdenes de Compra DEBEN permitir exportar a CSV las filas visibles con los filtros activos (formato FR-016).

#### Comprar por producto y precios por cantidad

- **FR-031**: El precio acordado (`006`) DEBE admitir tramos por cantidad: lista de `{ desde, precio }` con `desde` entero ≥ 1 único y `precio` > 0; el precio base del `006` equivale al tramo desde 1.
- **FR-032**: El precio unitario aplicable DEBE ser el del tramo con mayor `desde` que no supere la cantidad de la línea.
- **FR-033**: Toda línea de una orden de un proveedor con lista de precios DEBE usar el precio del tramo aplicable, en cualquier modo de ingreso y en el servicio. Las responsabilidades son distintas: la lista de precios del `006` fija los tramos, la UI calcula y muestra el tramo aplicable al usuario, y el **servidor es la única fuente de verdad del precio guardado**. En consecuencia, `savePurchaseOrder`, `replaceOrderLines`, `addPurchaseOrderLine` y `addOrUpdatePurchaseOrderLine` DEBEN recalcular `precioUnitario` y `totalNeto` de cada línea con `unitPriceFor` desde la lista vigente del proveedor, ignorando cualquier precio o tramo enviado por el cliente (SC-010).
- **FR-034**: El formulario de nueva solicitud DEBE ofrecer el modo «Comprar por producto» (por defecto) y el modo «Elegir proveedor primero» (`006`).
- **FR-035**: En «Comprar por producto», al indicar producto y cantidad, el sistema DEBE listar los proveedores activos con precio para ese producto, con precio unitario del tramo, tramo aplicado, total neto, moneda y calificación (visible según la excepción de FR-005: roles con `documents.create`, sin `reports.view`; el grade interno de FR-004 rige el desempate de FR-011 para todos los roles), ordenados y con la mejor opción destacada según el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación A > B > C > Sin datos → nombre alfabéticamente menor), sin conversión de moneda.
- **FR-036**: El carrito DEBE agrupar las líneas por proveedor (sumando cantidades repetidas del mismo producto y proveedor) y, al guardar, crear una solicitud por proveedor en una sola operación atómica mediante `savePurchaseOrder`. La UI de compra por producto NO DEBE incorporar selector de área: los borradores resultantes se guardan sin `id_area` y el área se exige al enviar a revisión (FR-018).
- **FR-037**: El aviso de resultado DEBE indicar los números de solicitud creados; si alguna falla, no se crea ninguna.
- **FR-038**: El formulario de producto DEBE permitir a roles con `pricelists.manage` agregar, editar y quitar tramos por proveedor, con validación por fila.
- **FR-039**: La solicitud sugerida (FR-010) y la duplicación (FR-025) DEBEN usar el precio del tramo aplicable a su cantidad.
- **FR-040**: La ficha del proveedor (`006`) DEBE mostrar los tramos de cada precio acordado.

#### Datos de demostración

- **FR-029**: La carga de demostración (`003`) DEBE incluir 3 áreas con presupuesto del mes en curso (uno de ellos excedido), stock mínimo en al menos 4 productos (2 bajo el mínimo), áreas en las órdenes demo, fechas de recepción que produzcan al menos un proveedor A, uno B y uno C, y tramos por cantidad en al menos 3 precios acordados de productos con más de un proveedor, coherentes con las cantidades de las órdenes demo.
- **FR-030**: La sustitución de datos demo DEBE eliminar también áreas, presupuestos y estados de lectura de notificaciones.

### Cambios declarados sobre especificaciones anteriores

| Spec / FR afectado | Comportamiento anterior | Comportamiento con 007 |
|---|---|---|
| `004` FR-015, FR-016, FR-017 | 19 permisos | Se agregan `reports.view` y `budgets.manage` (ambos para Administrador y Gerente). La paridad Gerente–Administrador se mantiene (la exige una prueba de `004`). |
| `005` FR-012 y FR-013 | «Reportes» y campana reservados y ocultos | Se habilitan según permisos (FR-013, FR-022). |
| `001` FR-021, `006` FR-004 | Producto con nombre, unidad, stock, categoría y precios | Agrega «Stock mínimo» (FR-006). |
| `002` FR-001 a FR-006 (formulario de solicitud) | Sin área | Los borradores se guardan sin exigir área; exige área activa **al enviar a revisión** si hay áreas activas (FR-018). |
| `002` (aprobación) | Confirmación simple | Muestra presupuesto y advertencia (FR-019, FR-020), sin cambiar la transición. |
| `001` FR-003 | Eliminar proveedor elimina en cascada sus OC | Se mantiene; la confirmación advierte cuántas OC se eliminarán y recomienda inactivar (FR-027). |
| `001` FR-008, `002` (selector de proveedor) | Todos los proveedores | Los inactivos no se ofrecen en solicitudes nuevas (FR-026). |
| `006` FR-022 (ficha del proveedor) | Datos, precios, historial y monto | Agrega la evaluación para `reports.view` (FR-005; excepción solo en la tabla comparativa de US7) y los tramos de cada precio (FR-040). |
| `006` FR-001 y FR-011 (precio acordado) | Un precio por producto y proveedor | El precio admite tramos por cantidad y la línea usa el tramo aplicable (FR-031 a FR-033); sin tramos, el comportamiento es idéntico. |
| `006` FR-004 (formulario de producto) | Proveedor, precio y moneda | Agrega tramos por proveedor (FR-038). |
| `006` FR-010 y `002` (formulario de solicitud) | Se elige primero el proveedor | Modo «Comprar por producto» por defecto con comparación de proveedores y carrito multi-proveedor; el modo anterior se conserva (FR-034 a FR-037). |
| `003` FR-075, FR-081, FR-086 (demostración) | Sin áreas ni mínimos; 12 órdenes | Agrega datos del 007 (FR-029, FR-030) y 4 órdenes recibidas de Fábrica de Ideas para la calificación B: la demo queda con **16 órdenes**. Las pruebas existentes siguen pasando sin cambiar su intención; solo se ajustan los conteos de demostración (12→16). |
| `005` US4 (filtros de Solicitudes y OC) | «Fecha desde/hasta» como `type="date"` (mm/dd/aaaa según el navegador) | Campos de texto con máscara `dd-mm-aaaa`, igual que la fecha de entrega. |
| `005` US5 (modo oscuro) | Fondos de hover y de filtros mezclados con blanco | Se mezclan con `--surface`: en modo claro no cambia nada y en modo oscuro el texto sigue legible. |

### Entidades Clave

- **Área**: centro de costo al que se imputa una solicitud.
- **Presupuesto mensual**: monto en CLP asignado a un área para un mes.
- **Estado de lectura de notificaciones**: identificadores de avisos leídos por usuario.
- **Producto** (cambio): `stock_minimo`.
- **Precio acordado** (cambio, `006`): `tramos` por cantidad.
- **Carrito de solicitud**: vista temporal del formulario, no persistida.
- **Proveedor** (cambio): `estado` activo/inactivo.
- **Metadata de orden** (cambio): `id_area`.
- **Evaluación del proveedor**, **Reporte de gasto**, **Aviso**: vistas derivadas, no persistidas.

Ver [data-model.md](data-model.md).

## Criterios de Éxito *(obligatorio)*

- **SC-001**: Con datos demo, la ficha muestra calificaciones A, B y C para al menos un proveedor cada una, y sus porcentajes coinciden con un cálculo manual sobre el historial.
- **SC-002**: «Crear solicitud sugerida» genera en un clic los borradores de todos los productos bajo el mínimo con lista de precios, sin duplicar productos ya incluidos en solicitudes abiertas.
- **SC-003**: Los totales del reporte por proveedor coinciden con el monto comprado de la ficha (`006`) para el mismo rango.
- **SC-004**: El CSV exportado se abre en Excel con configuración regional chilena con columnas separadas y tildes correctas.
- **SC-005**: Aprobar una OC que excede el presupuesto muestra la advertencia en el 100 % de los casos y nunca la bloquea.
- **SC-006**: El contador de la campana coincide con los avisos no leídos de la bandeja para cada rol.
- **SC-007**: Las pruebas existentes de `001`–`006` siguen pasando sin cambiar su intención; solo se ajustan los conteos de demostración (12→16), junto con las nuevas pruebas del `007`; `npm run lint` y `npm run build` sin errores.
- **SC-008**: Reportes con 2.000 OC se calculan y dibujan en ≤ 1 s, consistente con los presupuestos de `001`.
- **SC-009**: Un Comprador crea una solicitud de un producto con dos proveedores en 4 acciones o menos (buscar, cantidad, elegir, guardar), viendo ambos precios antes de elegir.
- **SC-010**: Para cualquier cantidad, el precio de la línea guardada coincide con el tramo aplicable en el 100 % de los casos, aunque se manipule el campo, el payload o se omita el tramo; se verifica en los cuatro servicios de FR-033 y en los dos modos de ingreso, con independencia de lo que muestre la UI.

## Supuestos

- La puntualidad se mide en días corridos, sin calendario laboral.
- US1 (evaluación de proveedores, `gradeFor`) es dependencia dura de US2 y US7: la calificación interviene siempre en el paso (4) de FR-011, sin omisión ni desempate alternativo.
- El presupuesto es en CLP y la comparación de ofertas no convierte monedas (consistente con `005` y `006`): se aplica el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre).
- «Rechazada» corresponde a la transición `pendiente` → `cancelado` (`orders.reject`) de `002`/`004`.
- El sistema no registra quién aprobó (limitación conocida); los avisos al Comprador se basan en el empleado de la solicitud.
- Las cantidades sugeridas usan la regla «hasta el doble del mínimo»; un stock objetivo configurable queda para una versión posterior.
- Los umbrales A/B/C, la regla de reposición y la advertencia sin bloqueo son propuestas que el grupo puede ajustar con `/speckit.clarify`.
- Los tramos son por cantidad de la línea (no por monto total ni por acumulado mensual).
- El plazo de entrega por proveedor no se registra todavía; la comparación usa el criterio determinista de FR-011 (CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre), sin conversión de moneda.
