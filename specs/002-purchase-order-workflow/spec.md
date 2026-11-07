# Especificación de la Funcionalidad: Extensión de Órdenes de Compra con Detalle, Flujo, Recepción e Impresión

**Rama de la funcionalidad**: `002-purchase-order-workflow`

**Creada**: 2026-11-07

**Estado**: Draft

**Entrada**: Extensión del módulo de Compras para incorporar líneas de detalle en las órdenes de compra, cálculo automático de subtotales, neto, IVA y total, acciones de flujo según el estado, recepción con actualización única de stock, vista de detalle imprimible e historial de cambios de estado con fecha y hora, manteniendo la persistencia local y sin roles reales.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Registrar líneas de detalle y calcular totales (Prioridad: P1)

Como **agente de compras**, quiero agregar, editar y quitar líneas con producto, cantidad y precio unitario en una orden de compra, para que el sistema calcule automáticamente el subtotal de cada línea, el neto, el IVA y el total.

**Por qué esta prioridad**: Es la base de la extensión. Sin líneas de detalle no existen costos, impuestos ni cantidades que recibir en stock.

**Prueba Independiente**: Crear una orden en borrador con dos productos, modificar cantidades y precios, eliminar una línea y comprobar que los subtotales, el neto, el IVA del 19 % y el total se recalculan correctamente en cada cambio.

**Escenarios de Aceptación**:

1. **Dado** que el usuario está editando una orden en borrador y existen productos disponibles, **cuando** agrega una línea con producto, cantidad y precio unitario válidos, **entonces** la línea aparece en la orden con su subtotal calculado.
2. **Dada** una orden con varias líneas, **cuando** el usuario consulta los importes, **entonces** el sistema muestra el subtotal de cada línea, el neto, el IVA del 19 % y el total.
3. **Dada** una orden con líneas, **cuando** el usuario cambia la cantidad o el precio unitario de una línea, **entonces** el subtotal, el neto, el IVA y el total se actualizan de inmediato.
4. **Dada** una orden con líneas, **cuando** el usuario elimina una línea, **entonces** la línea desaparece y los importes se recalculan sin incluirla.
5. **Dada** una línea en edición, **cuando** el usuario ingresa una cantidad no positiva, un precio unitario negativo, un producto inexistente o un producto ya incluido en la orden, **entonces** el sistema rechaza la línea y explica el motivo.
6. **Dada** una orden sin líneas válidas, **cuando** el usuario intenta guardarla o enviarla a revisión, **entonces** el sistema bloquea la acción e indica que debe agregar al menos una línea.

---

### Historia de Usuario 2 - Ejecutar el flujo de estados con acciones visibles (Prioridad: P2)

Como **responsable de compras**, quiero ver únicamente las acciones válidas para el estado actual de la orden y ejecutar la transición correspondiente, para operar el ciclo de vida sin elegir combinaciones inválidas.

**Por qué esta prioridad**: El flujo guiado evita errores operativos y hace explícito el siguiente paso de cada orden.

**Prueba Independiente**: Crear órdenes en cada estado y verificar que solo aparecen las acciones permitidas; ejecutar cada acción y comprobar que la orden pasa al estado esperado y que las acciones se actualizan.

**Escenarios de Aceptación**:

1. **Dada** una orden en borrador, **cuando** el usuario consulta sus acciones, **entonces** solo puede enviarla a revisión o cancelarla.
2. **Dada** una orden pendiente, **cuando** el usuario consulta sus acciones, **entonces** solo puede aprobarla o cancelarla.
3. **Dada** una orden aprobada, **cuando** el usuario consulta sus acciones, **entonces** solo puede marcarla como recibida.
4. **Dada** una orden recibida o cancelada, **cuando** el usuario consulta sus acciones, **entonces** no se ofrece ninguna transición de estado.
5. **Dada** una orden con una acción válida disponible, **cuando** el usuario la ejecuta, **entonces** el estado cambia al estado destino, la acción se confirma visualmente y las acciones disponibles se actualizan.
6. **Dada** una orden en cualquier estado, **cuando** se intenta una transición no permitida por cualquier vía, **entonces** el sistema la rechaza y no modifica la orden.
7. **Dada** una lista o el detalle de una orden, **cuando** el usuario la consulta, **entonces** el estado actual es identificable de forma clara.
8. **Dada** una orden de compra sin empleado solicitante, **cuando** el usuario intenta guardarla, **entonces** el sistema impide guardar y muestra un mensaje claro indicando que debe seleccionar un empleado.

---

### Historia de Usuario 3 - Recibir una orden y actualizar stock una sola vez (Prioridad: P2)

Como **jefe de inventario**, quiero que al marcar una orden aprobada como recibida se incremente el stock de sus productos exactamente una vez, para reflejar la mercadería recibida sin duplicar existencias.

**Por qué esta prioridad**: La recepción conecta la compra con el inventario y evita diferencias por doble aplicación.

**Prueba Independiente**: Recibir una orden aprobada con dos productos, comprobar el aumento de stock de cada uno, intentar recibirla nuevamente y verificar que el stock no cambia; cancelar otra orden y comprobar que el stock tampoco cambia.

**Escenarios de Aceptación**:

1. **Dada** una orden aprobada con líneas válidas, **cuando** el usuario la marca como recibida, **entonces** el stock de cada producto aumenta según la cantidad de su línea.
2. **Dada** una orden ya recibida, **cuando** se intenta aplicar nuevamente la recepción, **entonces** el stock no se modifica y el sistema informa que la recepción ya fue aplicada.
3. **Dada** una orden cancelada, **cuando** el usuario consulta o intenta cualquier acción sobre su recepción, **entonces** el stock permanece sin cambios.
4. **Dada** una recepción con varias líneas, **cuando** no sea posible aplicarla por una línea inválida, **entonces** no se aplica parcialmente ningún cambio de stock.
5. **Dada** una recepción completada, **cuando** el usuario consulta la orden, **entonces** la orden queda marcada como recibida y como stock ya aplicado.

---

### Historia de Usuario 4 - Consultar el historial de cambios de estado (Prioridad: P2)

Como **responsable de compras**, quiero consultar un historial de los cambios de estado de cada orden con la fecha y hora en que ocurrieron, para auditar su avance y resolver dudas sobre cuándo fue aprobada, recibida o cancelada.

**Por qué esta prioridad**: Aporta trazabilidad al flujo y respalda la operación sin depender de registros externos.

**Prueba Independiente**: Avanzar una orden por varios estados y comprobar que el historial muestra cada transición con estado anterior, estado nuevo y fecha/hora, en orden cronológico; verificar que una transición rechazada no agrega registros.

**Escenarios de Aceptación**:

1. **Dada** una orden que cambia de estado correctamente, **cuando** el usuario consulta su historial, **entonces** aparece un registro con el estado anterior, el estado nuevo y la fecha y hora del cambio.
2. **Dada** una orden con varios cambios de estado, **cuando** el usuario consulta el historial, **entonces** los registros aparecen en orden cronológico y se distinguen unos de otros.
3. **Dada** una transición inválida rechazada, **cuando** el usuario consulta el historial, **entonces** no se agrega ningún registro.
4. **Dada** una orden recibida o cancelada, **cuando** el usuario consulta su historial, **entonces** los registros anteriores se conservan sin alteraciones.
5. **Dada** una orden con historial, **cuando** el usuario recarga la aplicación o navega a otra pantalla y vuelve, **entonces** el historial se mantiene completo.
6. **Dada** una orden sin cambios de estado posteriores a su creación, **cuando** el usuario consulta el historial, **entonces** se muestra un estado vacío claro.

---

### Historia de Usuario 5 - Imprimir el detalle de la orden de compra (Prioridad: P3)

Como **agente de compras**, quiero abrir una vista de detalle imprimible de la orden de compra, para compartir o archivar el documento con su información comercial y su trazabilidad.

**Por qué esta prioridad**: Facilita la entrega y el respaldo documental, pero la operación principal de compra puede completarse sin impresión.

**Prueba Independiente**: Abrir la vista imprimible desde una orden con líneas e historial, comprobar que contiene todos los datos requeridos y que la previsualización de impresión no incluye navegación, formularios ni acciones de la aplicación.

**Escenarios de Aceptación**:

1. **Dada** una orden existente en cualquier estado, **cuando** el usuario elige ver su detalle imprimible, **entonces** se abre una vista dedicada a esa orden.
2. **Dada** la vista imprimible, **cuando** el usuario la revisa, **entonces** muestra folio, proveedor, fechas, estado, líneas con producto, cantidad, precio unitario y subtotal, además de neto, IVA y total.
3. **Dada** una orden con historial de estados, **cuando** el usuario revisa la vista imprimible, **entonces** el historial aparece con sus fechas y horas.
4. **Dada** la vista imprimible, **cuando** el usuario abre la previsualización de impresión, **entonces** solo se presenta el documento de la orden, sin barra lateral, navegación, botones ni formularios de edición.
5. **Dada** una orden con muchas líneas, **cuando** se imprime, **entonces** el contenido se distribuye en páginas legibles sin cortar líneas de forma que se pierda información.

### Casos Límite

- **Orden sin líneas**: no se puede guardar ni enviar a revisión.
- **Producto repetido**: no se permiten dos líneas con el mismo producto en una orden.
- **Cantidad igual a cero, negativa o no entera**: la línea se rechaza.
- **Precio unitario negativo**: la línea se rechaza.
- **Producto eliminado o inexistente al editar una orden**: la línea se rechaza con una explicación clara.
- **Edición de una orden recibida o cancelada**: se bloquea para proteger el historial y el stock.
- **Recepción repetida**: el stock no se duplica y se informa que ya fue aplicada.
- **Recepción con líneas inválidas**: no se aplica ningún cambio de stock.
- **Cancelación**: nunca modifica el stock.
- **Transición inválida**: se rechaza sin modificar el estado ni agregar historial.
- **Orden sin historial**: se muestra un estado vacío comprensible.
- **Recarga o navegación durante el flujo**: las líneas, los importes, el estado y el historial se conservan.
- **Importes con fracciones**: los cálculos se redondean según el formato monetario vigente del módulo.
- **Impresión de una orden extensa**: las líneas y los totales se mantienen legibles y completos en varias páginas.
- **Eliminación de una orden**: se eliminan también sus líneas e historial, sin afectar el stock ya recibido.
- **Eliminación de un producto referenciado**: se bloquea para preservar las órdenes y su historial.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

#### Líneas de detalle e importes

- **FR-001**: El sistema DEBE permitir agregar una o más líneas de detalle a una orden de compra con producto, cantidad y precio unitario.
- **FR-002**: El sistema DEBE permitir editar la cantidad y el precio unitario de una línea mientras la orden no esté recibida ni cancelada.
- **FR-003**: El sistema DEBE permitir eliminar una línea mientras la orden no esté recibida ni cancelada.
- **FR-004**: El sistema DEBE exigir al menos una línea válida para guardar la orden o enviarla a revisión.
- **FR-005**: El sistema DEBE exigir que el producto de cada línea exista en el catálogo del módulo.
- **FR-006**: El sistema DEBE exigir que la cantidad sea un entero positivo y que el precio unitario sea mayor o igual a cero.
- **FR-007**: El sistema DEBE rechazar dos líneas con el mismo producto dentro de una misma orden.
- **FR-008**: El sistema DEBE calcular el subtotal de cada línea como cantidad × precio unitario, sin permitir que el usuario lo edite directamente.
- **FR-009**: El sistema DEBE calcular el neto como la suma de los subtotales, el IVA como el 19 % del neto y el total como el neto más el IVA.
- **FR-010**: El sistema DEBE redondear los importes calculados según el formato monetario vigente del módulo.
- **FR-011**: El sistema DEBE recalcular subtotal, neto, IVA y total cada vez que se agregue, edite o elimine una línea.
- **FR-012**: El sistema DEBE mostrar el desglose de subtotal por línea, neto, IVA y total en el detalle de la orden.
- **FR-013**: El sistema DEBE bloquear la edición de cabecera y líneas de una orden recibida o cancelada.

#### Flujo de estados

- **FR-014**: El sistema DEBE admitir los estados borrador, pendiente, aprobado, recibido y cancelado.
- **FR-015**: El sistema DEBE permitir la secuencia borrador → pendiente → aprobado → recibido.
- **FR-016**: El sistema DEBE permitir cancelar únicamente desde borrador o pendiente.
- **FR-017**: El sistema DEBE mostrar solo las acciones de estado válidas para el estado actual de la orden.
- **FR-018**: El sistema DEBE ejecutar el cambio de estado cuando el usuario active una acción válida y actualizar las acciones disponibles.
- **FR-019**: El sistema DEBE rechazar cualquier transición inválida, independientemente de la vía por la que se intente, sin modificar la orden.
- **FR-020**: El sistema DEBE mostrar el estado actual de forma clara en listas, detalle e impresión.
- **FR-021**: El sistema NO DEBE ofrecer transiciones de estado para órdenes recibidas o canceladas.

#### Recepción y stock

- **FR-022**: El sistema DEBE actualizar el stock de cada producto al pasar una orden aprobada a recibida, sumando la cantidad de su línea.
- **FR-023**: El sistema DEBE registrar de forma persistente que el stock de una orden ya fue aplicado.
- **FR-024**: El sistema DEBE impedir que el stock se aplique más de una vez para la misma orden.
- **FR-025**: El sistema DEBE informar con claridad cuando se intente recibir nuevamente una orden ya recibida.
- **FR-026**: El sistema NO DEBE modificar el stock al cancelar una orden.
- **FR-027**: El sistema DEBE aplicar la recepción de forma completa o no aplicarla, sin actualizaciones parciales de stock.

#### Historial de estados

- **FR-028**: El sistema DEBE registrar cada cambio de estado exitoso con estado anterior, estado nuevo y fecha y hora del cambio.
- **FR-029**: El sistema DEBE mostrar el historial de una orden en orden cronológico.
- **FR-030**: El sistema DEBE conservar los registros de historial sin permitir su edición manual.
- **FR-031**: El sistema NO DEBE registrar en el historial las transiciones rechazadas.
- **FR-032**: El sistema DEBE conservar el historial ante recargas y navegación dentro de la aplicación.
- **FR-033**: El sistema DEBE eliminar el historial cuando se elimine la orden a la que pertenece.

#### Vista imprimible

- **FR-034**: El sistema DEBE permitir abrir una vista de detalle imprimible para cualquier orden de compra existente.
- **FR-035**: La vista imprimible DEBE incluir folio, proveedor, fechas, estado, líneas con producto, cantidad, precio unitario y subtotal, neto, IVA y total.
- **FR-036**: La vista imprimible DEBE incluir el historial de cambios de estado con fecha y hora cuando exista.
- **FR-037**: La vista imprimible DEBE omitir navegación, acciones y formularios de edición al imprimirse.
- **FR-038**: La vista imprimible DEBE mantener legibles y completas las líneas y totales cuando el contenido ocupa varias páginas.

#### Persistencia y acceso

- **FR-039**: El sistema DEBE conservar líneas, importes, estados, historial y la marca de stock aplicado ante recargas y navegación dentro de la aplicación.
- **FR-040**: La persistencia DEBE ser local al navegador utilizado, sin requerir un servidor ni sincronización entre usuarios.
- **FR-041**: El sistema NO DEBE requerir autenticación, roles ni permisos diferenciados para ejecutar las acciones de la extensión.
- **FR-042**: El sistema DEBE mostrar mensajes claros cuando una operación no pueda completarse.
- **FR-043**: El empleado solicitante DEBE ser obligatorio para toda OC creada o guardada desde la interfaz y DEBE seleccionarse de la lista de empleados registrados; si falta, el sistema impide guardar con un mensaje claro. Las OC históricas sin empleado se muestran como «Empleado desconocido» en solo lectura. El empleado se muestra en la vista de detalle y en la impresión.

### Entidades Clave

- **Orden de Compra**: Documento de compra identificado por un folio único. Contiene proveedor, fechas, estado actual, importes calculados e indicación de si el stock ya fue aplicado.
- **Detalle de Compra**: Línea perteneciente a una orden. Contiene un producto, una cantidad entera positiva y un precio unitario; su subtotal es calculado y no se edita directamente. Un producto no puede repetirse dentro de la misma orden.
- **Producto**: Bien adquirido al que se asocia el detalle y cuyo stock aumenta al recibir la orden.
- **Cambio de Estado**: Registro de una transición exitosa de una orden. Contiene estado anterior, estado nuevo y fecha y hora; pertenece a una única orden y no se modifica manualmente.
- **Empleado**: Persona registrada en el módulo; se identifica por su nombre e identificador y puede figurar como solicitante de una orden de compra.
- **Proveedor**: Contraparte de la orden de compra; se muestra en el detalle y en la vista imprimible.

**Relaciones**: una orden pertenece a un proveedor y tiene exactamente un empleado solicitante; un empleado puede tener muchas órdenes; la orden contiene al menos una línea de detalle; cada línea corresponde a un producto; una orden tiene cero o más cambios de estado; un producto puede aparecer en muchas líneas de distintas órdenes.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: El 100 % de las órdenes de prueba con dos o más líneas muestra subtotales, neto, IVA y total correctos tras cada alta, edición o eliminación de línea.
- **SC-002**: Los usuarios pueden crear una orden con al menos dos líneas y verificar sus totales en menos de 5 minutos.
- **SC-003**: El 100 % de los estados ofrece únicamente las acciones permitidas y ninguna transición inválida modifica la orden.
- **SC-004**: En el 100 % de las recepciones probadas, el stock aumenta exactamente una vez, incluso después de varios intentos de recepción.
- **SC-005**: El 100 % de los cambios de estado exitosos aparece en el historial con estado anterior, estado nuevo y fecha/hora, en orden cronológico.
- **SC-006**: El 100 % de las vistas imprimibles contiene los datos requeridos y se previsualiza sin navegación, acciones ni formularios de edición.
- **SC-007**: El 100 % de las líneas, estados, historiales y marcas de stock aplicado se conserva después de recargar la aplicación.
- **SC-008**: Al menos el 90 % de los usuarios de prueba completa el flujo de crear, enviar, aprobar, recibir e imprimir una orden sin ayuda.
- **SC-009**: Una transición de estado o una recepción fallida no produce cambios parciales ni registros de historial.

## Supuestos

- La extensión se construye sobre el módulo de Compras existente y conserva sus datos maestros, navegación, terminología configurable y reglas generales.
- El catálogo de productos y su stock ya forman parte del módulo de Compras; esta extensión consume esos datos y actualiza el stock al recibir.
- Se mantiene una única bodega y no se admiten recepciones parciales: la recepción aplica la totalidad de las cantidades de la orden.
- El IVA aplicable es del 19 % y los importes se expresan en la moneda única del módulo, en pesos chilenos (CLP) sin decimales en pantalla.
- El precio unitario se conserva en la línea como valor histórico de la compra y no se recalcula desde el catálogo.
- La fecha y hora del historial se registra en la zona horaria local del módulo (America/Santiago).
- No se registra el usuario que ejecuta cada transición, porque el módulo no utiliza autenticación ni roles reales.
- La impresión se realiza mediante la impresión nativa del navegador; no se genera un PDF en servidor ni se firma electrónicamente el documento.
- La persistencia se apoya en el almacenamiento local del navegador (`localStorage`) y no se sincroniza entre dispositivos o usuarios.
- La edición de cabecera y líneas se permite mientras la orden no esté recibida ni cancelada.
