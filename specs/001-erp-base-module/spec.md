# Especificación de la Funcionalidad: Módulo de Compras y Adquisiciones (ERP)

**Rama de la funcionalidad**: 001-erp-base-module
**Creada**: 2026-11-06
**Estado**: Actualizada
**Entrada**: Módulo de Compras y Adquisiciones construido sobre el módulo base ERP, con Proveedor como dato maestro y Orden de Compra como documento transaccional con líneas de detalle.

## Propósito

Este módulo implementa el proceso de compra de una organización sobre las capacidades del módulo base ERP. Permite mantener el dato maestro de **Proveedor**, emitir **Órdenes de Compra** con líneas de detalle y totales calculados, administrar los datos maestros de apoyo (**Empleado**, **Categoría** y **Producto**), consultar un panel de control, buscar proveedores y órdenes, controlar el ciclo de vida de la orden con recepción de stock y adaptar toda la terminología mediante configuración.

El módulo base aporta el marco del espacio de trabajo, la navegación, la persistencia en `localStorage`, el cargador de configuración, la sanitización XSS, los campos personalizados y la integridad referencial. El módulo de Compras se limita a la configuración y a sus puntos de extensión, sin modificar el comportamiento central del módulo base.

## Escenarios de Usuario y Pruebas

### Historia de Usuario 1 - Registrar y mantener proveedores (Prioridad: P1)

Como **agente de compras**, quiero registrar, editar, visualizar y eliminar proveedores con su nombre, RUT, categoría y condición de pago, para mantener una base maestra confiable para las compras de la empresa.

**Por qué esta prioridad**: El proveedor es el dato maestro principal del módulo. Sin proveedores válidos no se pueden emitir órdenes de compra ni conservar el historial de adquisiciones.

**Prueba Independiente**: Un agente de compras puede crear un proveedor con nombre, RUT válido, categoría y condición de pago, editarlo, eliminarlo y comprobar que sus órdenes asociadas se eliminan en cascada.

**Escenarios de Aceptación**:

1. **Dado** que el agente de compras está en el formulario de proveedores, **cuando** ingresa nombre, RUT válido, categoría y condición de pago y confirma, **entonces** el sistema guarda el proveedor y lo muestra en la lista.
2. **Dado** que el agente ingresa un RUT con puntos o sin ellos, **cuando** guarda, **entonces** el sistema lo normaliza sin puntos y con guion, convierte el dígito verificador a mayúscula y lo valida con el algoritmo de módulo 11 (incluida la K); si el RUT es inválido, bloquea el guardado y explica el error.
3. **Dado** que el agente intenta registrar un proveedor cuyo RUT normalizado ya existe, **cuando** guarda, **entonces** el sistema rechaza el duplicado y muestra una alerta.
4. **Dado** que el agente deja en blanco el nombre, el RUT, la categoría o la condición de pago, **cuando** intenta guardar, **entonces** el sistema bloquea el guardado y señala los campos obligatorios.
5. **Dado** un proveedor existente, **cuando** el agente modifica su nombre, RUT, categoría o condición de pago y confirma, **entonces** los cambios se guardan de inmediato.
6. **Dado** un proveedor con órdenes de compra asociadas, **cuando** el agente solicita su eliminación y confirma, **entonces** el sistema elimina el proveedor, sus órdenes y las líneas de esas órdenes en cascada.

---

### Historia de Usuario 2 - Emitir órdenes de compra con líneas de detalle (Prioridad: P1)

Como **agente de compras**, quiero emitir órdenes de compra con folio único, proveedor, empleado solicitante, fechas y líneas de detalle, para registrar cada adquisición con su costo y sus impuestos de forma trazable.

**Por qué esta prioridad**: La orden de compra es el documento transaccional central del proceso. Sin ella el módulo solo sería un directorio de proveedores.

**Prueba Independiente**: Un agente de compras crea una orden de compra con proveedor, empleado, folio, fechas y al menos una línea, verifica que el neto, el IVA y el total son correctos, y comprueba que la orden queda asociada al proveedor.

**Escenarios de Aceptación**:

1. **Dado** un proveedor, un empleado, una categoría y un producto existentes, **cuando** el agente crea una orden con folio, fecha de emisión, fecha de entrega y líneas de detalle, **entonces** el sistema guarda la orden asociada al proveedor y al empleado.
2. **Dado** que el agente ingresa un folio que ya existe en otra orden, **cuando** intenta guardar, **entonces** el sistema rechaza el folio duplicado con una explicación.
3. **Dado** que el agente ingresa una fecha de entrega anterior a la fecha de emisión, **cuando** intenta guardar, **entonces** el sistema rechaza la orden con una explicación clara.
4. **Dado** que el agente agrega una línea con producto, cantidad y precio unitario, **cuando** guarda, **entonces** el sistema valida que el producto exista, que la cantidad sea un entero positivo y que el precio unitario no sea negativo.
5. **Dado** una orden con varias líneas, **cuando** el sistema calcula los importes, **entonces** el subtotal de cada línea se deriva de cantidad × precio unitario sin persistirse, el neto es la suma de los subtotales, el IVA es el 19 % del neto y el total es la suma del neto y el IVA, redondeados a dos decimales.
6. **Dado** que el agente administra empleados, categorías o productos, **cuando** crea, edita o elimina uno de estos registros, **entonces** el sistema lo guarda y lo deja disponible para las órdenes, bloqueando la eliminación de registros referenciados por una orden.
7. **Dado** una orden existente, **cuando** el agente edita sus líneas o sus datos de cabecera, **entonces** el sistema recalcula neto, IVA y total; cuando elimina la orden, elimina también sus líneas.

---

### Historia de Usuario 3 - Panel de control de compras (Prioridad: P1)

Como **gerente de compras**, quiero un panel de inicio con acciones rápidas, recuentos, órdenes por estado y órdenes atrasadas, para conocer el estado del área y derivar trabajo sin navegar entre pantallas.

**Por qué esta prioridad**: El panel es el punto de entrada del módulo y da visibilidad inmediata del volumen y de los atrasos de compra.

**Prueba Independiente**: El gerente abre la aplicación, ve las acciones rápidas y los indicadores, y desde una acción rápida abre directamente el formulario correspondiente.

**Escenarios de Aceptación**:

1. **Dado** que el gerente abre la aplicación, **cuando** carga el panel, **entonces** se muestran las acciones rápidas Nuevo Proveedor, Nueva Orden de Compra, Gestionar Proveedores y Buscar.
2. **Dados** proveedores y órdenes almacenados, **cuando** el gerente ve el panel, **entonces** las tarjetas muestran el recuento actual de proveedores y de órdenes de compra.
3. **Dadas** órdenes en distintos estados, **cuando** el gerente ve el panel, **entonces** se muestra el recuento de órdenes por estado.
4. **Dadas** órdenes con fecha de entrega anterior a la fecha actual local (America/Santiago) y estado distinto de recibido o cancelado, **cuando** el gerente ve el panel, **entonces** se muestra el recuento de órdenes atrasadas; una orden con entrega hoy no está atrasada.
5. **Dado** que no existen proveedores ni órdenes, **cuando** se muestra el panel, **entonces** las tarjetas indican cero sin errores.
6. **Dado** que un agente creó, editó o eliminó registros, **cuando** el gerente vuelve al panel, **entonces** los recuentos reflejan el cambio.
7. **Dado** que el gerente activa una acción rápida, **cuando** la usa, **entonces** se abre la pantalla o el formulario correspondiente listo para operar; en el MVP, Buscar abre la búsqueda básica de proveedores por nombre y RUT.

---

### Historia de Usuario 4 - Buscar proveedores y órdenes (Prioridad: P2)

Como **jefe de inventario**, quiero buscar proveedores por nombre, RUT o categoría y buscar órdenes por fecha de entrega, para encontrar rápidamente quién abastece un insumo y cuándo se espera la recepción.

**Por qué esta prioridad**: Facilita la planificación de bodega y el seguimiento de entregas, pero no es indispensable para emitir compras.

**Prueba Independiente**: El jefe de inventario abre la búsqueda, busca por categoría, fecha de entrega o RUT con o sin puntos y con o sin guion, y ve resultados coincidentes o un estado vacío claro. La búsqueda básica por nombre y RUT ya está disponible desde HU3.

**Alcance de HU4**: amplía la búsqueda básica de HU3 con filtros por categoría y fecha de entrega, comparación sin tildes y rendimiento medible.

**Escenarios de Aceptación**:

1. **Dado** que el jefe de inventario está en la búsqueda, **cuando** introduce un nombre, un RUT o una categoría, **entonces** solo se muestran los proveedores coincidentes.
2. **Dado** un RUT almacenado como `12345678-9`, **cuando** el jefe lo busca con puntos (`12.345.678-9`), sin puntos o sin guion, **entonces** el sistema normaliza ambos valores y devuelve las coincidencias.
3. **Dada** una búsqueda escrita con mayúsculas, minúsculas, tildes o sin tildes, **cuando** se envía, **entonces** el sistema no distingue mayúsculas ni tildes al comparar.
4. **Dado** que el jefe busca por fecha de entrega, **cuando** introduce una fecha, **entonces** se muestran las órdenes de compra cuya fecha de entrega coincide.
5. **Dada** una búsqueda sin coincidencias, **cuando** se envía, **entonces** se muestra un estado vacío claro y se permite intentar de nuevo.
6. **Dados** al menos 500 proveedores y 2.000 órdenes almacenados, **cuando** el jefe busca, **entonces** los resultados aparecen en un máximo de 300 ms medidos con `performance.now()` en una prueba automatizada.

---

### Historia de Usuario 5 - Ciclo de vida de la orden de compra con recepción (Prioridad: P2)

Como **gerente de compras o jefe de inventario**, quiero que la orden de compra siga un ciclo de vida controlado y que la recepción actualice el stock una sola vez, para asegurar trazabilidad y evitar duplicaciones.

**Por qué esta prioridad**: Otorga gobernanza y consistencia al inventario. La operación básica de compra puede funcionar antes de habilitar el flujo completo de estados.

**Prueba Independiente**: Un usuario intenta una transición inválida y el sistema la rechaza; al pasar una orden a recibido, el stock de sus productos aumenta exactamente una vez y un segundo intento no lo duplica.

**Escenarios de Aceptación**:

1. **Dada** una orden en estado borrador, **cuando** el usuario edita su estado, **entonces** solo se ofrecen las transiciones válidas: pendiente o cancelado.
2. **Dada** una orden en estado pendiente, **cuando** el usuario edita su estado, **entonces** solo se ofrecen aprobado o cancelado.
3. **Dada** una orden en estado aprobado, **cuando** el usuario edita su estado, **entonces** solo se ofrece recibido.
4. **Dada** una orden en cualquier estado, **cuando** se intenta una transición inválida por cualquier vía, **entonces** el sistema la rechaza con una explicación clara.
5. **Dada** una orden en estado aprobado, **cuando** pasa a recibido, **entonces** el stock de cada producto de sus líneas aumenta según la cantidad correspondiente y la orden registra que el stock fue aplicado.
6. **Dada** una orden ya recibida, **cuando** se intenta aplicar nuevamente la recepción, **entonces** el stock no se modifica porque el campo `stock_aplicado` impide la doble aplicación.
7. **Dada** una orden cancelada, **cuando** se consulta su stock, **entonces** el stock no se modifica.
8. **Dadas** las listas y vistas de detalle, **cuando** el usuario las consulta, **entonces** el estado actual de cada orden es identificable de un vistazo.

---

### Historia de Usuario 6 - Configuración del módulo de Compras (Prioridad: P1)

Como **administrador del ERP**, quiero configurar el nombre, los colores, las etiquetas y el ciclo de vida del módulo de Compras, para adaptar la aplicación a la terminología de la organización sin modificar el código fuente.

**Por qué esta prioridad**: La configuración define la identidad del módulo y garantiza que ninguna pantalla use terminología genérica. Es la base para que el módulo sea reutilizable y comprensible para los usuarios.

**Prueba Independiente**: El administrador modifica el nombre del módulo, el color de acento, las etiquetas y el ciclo de vida, guarda la configuración y verifica que todas las pantallas reflejan los cambios; una configuración inválida se informa y se usan los valores predeterminados.

**Escenarios de Aceptación**:

1. **Dado** que el administrador define el nombre del módulo y un color de acento válido, **cuando** se recarga la aplicación, **entonces** la barra superior, el logotipo y los controles principales reflejan ambos valores.
2. **Dado** que el administrador define las etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra en singular y plural, **cuando** navega por las pantallas, **entonces** todas las etiquetas visibles usan esos términos y ninguna dice "Entidad" ni "Documento".
3. **Dado** que el administrador define los estados y transiciones del ciclo de vida, **cuando** se edita el estado de una orden, **entonces** solo se ofrecen las transiciones configuradas.
4. **Dada** una configuración inválida, **cuando** arranca la aplicación, **entonces** el sistema muestra un aviso visible con los problemas y continúa con los valores predeterminados integrados de Compras sin fallar.
5. **Dado** que no existe configuración o la configuración de Compras no es válida, **cuando** arranca la aplicación, **entonces** se usan los valores predeterminados integrados de Compras: etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra y sus plurales, ciclo de vida estándar, color de acento predeterminado y sin campos personalizados, junto con un aviso visible del problema.

---

## Capacidades heredadas del módulo base (no son historias de usuario)

Las siguientes capacidades ya existen en el módulo base y el módulo de Compras las hereda sin convertirlas en historias de usuario:

- **Marco de espacio de trabajo**: barra superior persistente con logotipo derivado del nombre del módulo y barra lateral de navegación.
- **Navegación sin pérdida de datos**: cambiar entre Panel, Proveedores, Órdenes de Compra y Buscar conserva todos los registros almacenados.
- **Persistencia en localStorage**: proveedores, órdenes, líneas y datos maestros de apoyo sobreviven a la recarga y a la navegación.
- **Cargador de ModuleConfig**: la configuración se carga al arrancar, se valida y se aplica en todas las pantallas.
- **Capacidad de campos personalizados**: los campos declarados en la configuración aparecen en formularios, validación, listas y búsqueda.
- **Sanitización XSS**: todo contenido introducido por el usuario se escapa antes de insertarse en el DOM.
- **Barra lateral contraíble**: en pantallas estrechas la barra lateral se reduce a iconos manteniéndose accesible y operable.

## Fuera de alcance del MVP

- Autenticación, roles, permisos y límites de aprobación por monto.
- Backend y base de datos; la persistencia es local en el navegador.
- Facturas, conciliación de pagos y cobros.
- Presupuestos y control presupuestario.
- Recepciones parciales de mercadería.
- Gestión de múltiples bodegas o ubicaciones de stock.
- Sincronización con servicios externos.

## Casos Límite

- **RUT inválido**: se rechaza con explicación y no se guarda el proveedor, incluida una K inválida.
- **RUT con puntos, sin puntos o sin guion**: se normaliza sin puntos y con guion antes de validar y comparar.
- **RUT duplicado**: se rechaza aunque los formatos de entrada sean distintos.
- **Campos obligatorios vacíos del proveedor**: se bloquea el guardado y se señalan los campos.
- **Eliminación de proveedor con órdenes**: se eliminan en cascada el proveedor, sus órdenes y las líneas de esas órdenes.
- **Eliminación de empleado, categoría o producto referenciado por una orden**: se bloquea con un mensaje explicativo para preservar el historial.
- **Folio duplicado**: se rechaza porque el folio es único a nivel global.
- **Fecha de entrega anterior a la fecha de emisión**: se rechaza la orden.
- **Orden sin líneas de detalle**: se rechaza porque debe tener al menos una línea.
- **Cantidad de línea no positiva, precio unitario negativo o producto inexistente**: se rechaza la línea con explicación.
- **Producto repetido en dos líneas de la misma orden**: se rechaza la línea duplicada.
- **Importes con decimales**: subtotal, neto, IVA y total se redondean a dos decimales para evitar errores de coma flotante.
- **Recepción repetida de la misma orden**: el stock no se duplica gracias a `stock_aplicado`.
- **Transición de estado inválida**: se rechaza por cualquier vía con una explicación.
- **Cancelación desde un estado no permitido**: se rechaza; solo se permite desde borrador o pendiente.
- **Edición de una orden recibida o cancelada**: se bloquea para proteger el historial.
- **Eliminación de una orden**: se eliminan también sus líneas.
- **Panel sin registros**: muestra cero en todos los indicadores sin errores.
- **OC atrasada**: se considera atrasada solo si `fecha_entrega` es anterior a la fecha actual local (America/Santiago) y el estado no es recibido ni cancelado; una entrega de hoy no está atrasada.
- **Búsqueda sin coincidencias**: muestra un estado vacío claro y permite reintentar.
- **500 proveedores y 2.000 órdenes**: la búsqueda responde en ≤ 300 ms, el panel carga en ≤ 500 ms y las listas renderizan en ≤ 1 s, medidos con `performance.now()` en pruebas automatizadas.
- **Configuración inválida**: se muestra un aviso visible con los problemas y se retrocede a los valores predeterminados integrados de Compras.
- **Ausencia de configuración**: se usan los valores predeterminados integrados de Compras y se muestra un aviso visible.
- **Color de acento inválido**: se usa el color predeterminado sin errores.
- **Contenido del usuario con HTML o atributos de eventos**: se escapa antes de renderizarse para prevenir XSS.
- **Accesibilidad**: toda acción es operable con teclado, el foco es visible, los inputs tienen etiqueta, el contraste es ≥ 4,5:1 y la barra lateral contraída usa `aria-label`.
- **Recarga o enlace profundo a una pantalla**: la aplicación restaura una vista válida sin perder datos.

## Requisitos

### Requisitos Funcionales

#### HU1 — Proveedores

- **FR-001**: El sistema DEBE permitir crear un proveedor con nombre, RUT, categoría y condición de pago (HU1).
- **FR-002**: El sistema DEBE permitir editar los datos de un proveedor existente (HU1).
- **FR-003**: El sistema DEBE permitir eliminar un proveedor y eliminar en cascada sus órdenes de compra y las líneas de esas órdenes (HU1).
- **FR-004**: El sistema DEBE validar que nombre, RUT, categoría y condición de pago sean obligatorios y mostrar los campos faltantes (HU1).
- **FR-005**: El sistema DEBE normalizar el RUT eliminando puntos y espacios, insertando un guion antes del dígito verificador y convirtiendo la letra verificadora a mayúscula, y DEBE validarlo con el algoritmo de módulo 11, incluida la K (HU1).
- **FR-006**: El sistema DEBE rechazar un RUT duplicado tras la normalización (HU1).
- **FR-007**: El sistema DEBE mostrar retroalimentación clara cuando una operación de proveedor no pueda completarse (HU1).
- **FR-008**: El sistema DEBE mostrar la lista de proveedores y permitir seleccionar uno para editarlo o eliminarlo (HU1).

#### HU2 — Órdenes de compra, líneas y datos maestros de apoyo

- **FR-009**: El sistema DEBE permitir crear una orden de compra con folio, proveedor, empleado solicitante, fecha de emisión, fecha de entrega y al menos una línea de detalle (HU2).
- **FR-010**: El sistema DEBE exigir que el folio sea un entero positivo y único a nivel global entre todas las órdenes (HU2).
- **FR-011**: El sistema DEBE rechazar una fecha de entrega anterior a la fecha de emisión (HU2).
- **FR-012**: El sistema DEBE exigir al menos una línea de detalle por orden de compra (HU2).
- **FR-013**: El sistema DEBE validar que cada línea tenga un producto existente, una cantidad entera positiva y un precio unitario no negativo (HU2).
- **FR-014**: El sistema DEBE derivar el subtotal de cada línea como cantidad × precio unitario y NO DEBE persistirlo (HU2).
- **FR-015**: El sistema DEBE calcular el neto como la suma de los subtotales de las líneas, el IVA como el 19 % del neto y el total como neto + IVA, redondeando a dos decimales (HU2).
- **FR-016**: El sistema DEBE permitir editar una orden y recalcular sus importes cuando cambien sus líneas o su cabecera (HU2).
- **FR-017**: El sistema DEBE permitir eliminar una orden y eliminar sus líneas asociadas (HU2).
- **FR-018**: El sistema DEBE rechazar dos líneas con el mismo producto dentro de una misma orden (HU2).
- **FR-019**: El sistema DEBE ofrecer un mantenedor simple de empleados con nombre y cargo obligatorios (HU2).
- **FR-020**: El sistema DEBE ofrecer un mantenedor simple de categorías con nombre obligatorio y único sin distinguir mayúsculas (HU2).
- **FR-021**: El sistema DEBE ofrecer un mantenedor simple de productos con nombre, unidad de medida, stock entero no negativo y categoría existente (HU2).
- **FR-022**: El sistema DEBE bloquear la eliminación de un empleado, categoría o producto referenciado por una orden, explicando qué registros lo impiden (HU2).
- **FR-023**: El sistema DEBE mostrar las órdenes con su proveedor, empleado, fechas, estado, líneas, neto, IVA y total (HU2).

#### HU3 — Panel de control

- **FR-024**: El panel DEBE mostrar las acciones rápidas Nuevo Proveedor, Nueva Orden de Compra, Gestionar Proveedores y Buscar (HU3).
- **FR-025**: El panel DEBE mostrar el recuento actual de proveedores y de órdenes de compra (HU3).
- **FR-026**: El panel DEBE mostrar el recuento de órdenes por estado (HU3).
- **FR-027**: El panel DEBE mostrar el recuento de órdenes atrasadas, entendidas como aquellas con `fecha_entrega` anterior a la fecha actual local (America/Santiago) y estado distinto de recibido o cancelado; una orden con entrega hoy no está atrasada (HU3).
- **FR-028**: El panel DEBE mostrar cero en todos los indicadores cuando no existan registros, sin errores (HU3).
- **FR-029**: El panel DEBE recalcular sus indicadores cada vez que se muestra (HU3).
- **FR-030**: Las acciones rápidas DEBEN abrir la pantalla o el formulario correspondiente listo para operar; en el MVP, Buscar DEBE abrir la búsqueda básica de proveedores por nombre y RUT (HU3).

#### HU4 — Búsqueda de proveedores y órdenes

- **FR-031**: El sistema DEBE permitir buscar proveedores por nombre, RUT con o sin puntos y con o sin guion, y categoría (HU4).
- **FR-032**: El sistema DEBE permitir buscar órdenes de compra por fecha de entrega (HU4).
- **FR-033**: La búsqueda NO DEBE distinguir mayúsculas ni tildes (HU4).
- **FR-034**: La búsqueda DEBE mostrar un estado vacío claro y permitir reintentar cuando no haya coincidencias (HU4).
- **FR-035**: Con 500 proveedores y 2.000 órdenes, la búsqueda DEBE responder en ≤ 300 ms, el panel DEBE cargar en ≤ 500 ms y las listas DEBEN renderizar en ≤ 1 s, medidos con `performance.now()` en pruebas automatizadas (HU4).
- **FR-036**: Los resultados de búsqueda DEBEN mostrar el estado y las fechas relevantes de las órdenes (HU4).

#### HU5 — Ciclo de vida y recepción

- **FR-037**: El sistema DEBE admitir los estados borrador, pendiente, aprobado, recibido y cancelado (HU5).
- **FR-038**: El sistema DEBE permitir las transiciones borrador → pendiente → aprobado → recibido (HU5).
- **FR-039**: El sistema DEBE permitir cancelar solo desde borrador o pendiente (HU5).
- **FR-040**: El sistema DEBE rechazar cualquier transición inválida, independientemente de la vía por la que se intente (HU5).
- **FR-041**: Al pasar una orden a recibido, el sistema DEBE sumar el stock de cada producto según la cantidad de su línea (HU5).
- **FR-042**: El sistema DEBE persistir el campo `stock_aplicado` y usarlo para garantizar que el stock se aplique una sola vez por orden (HU5).
- **FR-043**: El sistema DEBE mostrar el estado actual de cada orden en listas y vistas de detalle (HU5).
- **FR-044**: El sistema DEBE bloquear la edición de cabecera y líneas de una orden recibida o cancelada (HU5).
- **FR-045**: La cancelación de una orden NO DEBE modificar el stock (HU5).

#### HU6 — Configuración del módulo

- **FR-046**: `ModuleConfig` DEBE permitir definir el nombre del módulo, el color de acento, el ciclo de vida y las etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra en singular y plural (HU6).
- **FR-047**: Ninguna etiqueta visible DEBE decir "Entidad" o "Documento" en Compras; esos términos solo se usan en el módulo base sin instancia de Compras (HU6).
- **FR-048**: El sistema DEBE informar con claridad una configuración inválida mediante un aviso visible y continuar con los valores predeterminados integrados de Compras (HU6).
- **FR-049**: Sin configuración válida, el sistema DEBE usar los valores predeterminados integrados de Compras: etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra en singular y plural, ciclo de vida estándar, color de acento predeterminado y sin campos personalizados, mostrando además un aviso visible del problema de configuración (HU6).
- **FR-050**: El sistema DEBE aplicar el color de acento configurado y retroceder al predeterminado cuando el valor sea inválido (HU6).
- **FR-051**: El sistema DEBE aplicar las etiquetas configuradas en todas las pantallas, formularios, listas, mensajes y barra lateral (HU6).

#### Capacidades heredadas del módulo base

- **FR-052**: El sistema DEBE envolver cada pantalla en un marco con barra superior de marca y barra lateral persistente (Heredada).
- **FR-053**: La barra lateral DEBE ofrecer Panel, Proveedores, Órdenes de Compra y Buscar, con el módulo activo resaltado (Heredada).
- **FR-054**: La navegación entre pantallas NO DEBE perder proveedores, órdenes, líneas ni datos maestros (Heredada).
- **FR-055**: El sistema DEBE persistir proveedores, órdenes, líneas y datos maestros en `localStorage` (Heredada).
- **FR-056**: El sistema DEBE cargar y aplicar `ModuleConfig` al arrancar (Heredada).
- **FR-057**: El sistema DEBE soportar campos personalizados declarados en `ModuleConfig` en formularios, validación, listas y búsqueda (Heredada).
- **FR-058**: El sistema DEBE sanitizar todo contenido introducido por el usuario antes de renderizarlo en el DOM, escapando HTML y atributos de eventos para prevenir XSS (Heredada).
- **FR-059**: En pantallas estrechas, la barra lateral DEBE contraerse a una columna de iconos manteniéndose operable y accesible (Heredada).

#### Requisitos de calidad

- **FR-060**: La interfaz DEBE cumplir WCAG 2.1 AA: todas las acciones operables con teclado, foco visible, todo input con etiqueta asociada, contraste mínimo de 4,5:1 y `aria-label` en los iconos de la barra lateral contraída (Transversal).

### Requisitos de Extensibilidad

Los módulos personalizados construidos sobre esta base DEBEN poder:

- **XR-001**: Extender proveedores, órdenes y líneas con campos adicionales sin cambiar la estructura de almacenamiento base.
- **XR-002**: Reetiquetar todas las pantallas y términos visibles mediante `ModuleConfig` sin alterar la navegación ni el comportamiento.
- **XR-003**: Añadir reglas de validación específicas del dominio junto a las reglas de Compras.
- **XR-004**: Apoyarse en el módulo base para generación de identidad, marcas de tiempo, integridad referencial y eliminación en cascada.
- **XR-005**: Remarcar el espacio de trabajo con nombre del módulo, logotipo derivado y color de acento únicamente mediante configuración.
- **XR-006**: Definir estados y transiciones del ciclo de vida de la orden mediante configuración.

### Entidades Clave

- **Proveedor**: Dato maestro de la empresa o persona a quien se compra. Incluye nombre, RUT normalizado con guion y único, categoría, condición de pago y marcas de tiempo. El RUT se almacena en el campo base `code`, etiquetado "RUT".
- **Empleado**: Persona de la organización que registra una orden de compra. Incluye nombre y cargo.
- **Categoría**: Agrupación de productos. Incluye nombre único sin distinguir mayúsculas.
- **Producto**: Bien que se adquiere. Incluye nombre, unidad de medida, stock entero no negativo y categoría existente.
- **Orden de Compra**: Documento transaccional asociado a un proveedor y a un empleado. Incluye folio único global, fecha de emisión, fecha de entrega, estado, neto, IVA, total y `stock_aplicado`.
- **Detalle de Compra**: Línea de una orden. Se identifica por la orden y el producto, e incluye cantidad y precio unitario. El subtotal es derivado y no se persiste.
- **ModuleConfig**: Objeto de configuración que define nombre del módulo, color de acento, etiquetas de todas las entidades y ciclo de vida de las órdenes.

**Relaciones**: un proveedor tiene muchas órdenes; un empleado registra muchas órdenes; una orden tiene al menos una línea; un producto aparece en muchas líneas; una categoría agrupa muchos productos. Una orden pertenece exactamente a un proveedor y a un empleado.

## Criterios de Éxito

### Resultados Medibles

- **SC-001**: Los usuarios pueden crear un proveedor con RUT válido, categoría y condición de pago y verlo en la lista en menos de 2 minutos.
- **SC-002**: Los usuarios pueden emitir una orden con al menos dos líneas y verificar neto, IVA y total correctos en menos de 5 minutos.
- **SC-003**: Al menos el 90 % de los usuarios de prueba completan tareas de proveedor, orden, recepción y búsqueda sin ayuda.
- **SC-004**: Con 500 proveedores y 2.000 órdenes de compra, la búsqueda responde en ≤ 300 ms, el panel carga en ≤ 500 ms y las listas renderizan en ≤ 1 s, medidos con `performance.now()` en pruebas automatizadas.
- **SC-005**: Los usuarios encuentran un proveedor u orden mediante la búsqueda en menos de 10 segundos tras introducir un término relevante.
- **SC-006**: Los usuarios pueden navegar y recargar la aplicación sin perder proveedores, órdenes, líneas ni datos maestros.
- **SC-007**: El panel muestra cero en todos los indicadores cuando no existen registros, sin errores.
- **SC-008**: Un administrador puede adaptar nombre, etiquetas y ciclo de vida usando solo `ModuleConfig`, con cero modificaciones en archivos fuente centrales.
- **SC-009**: Al recibir una orden, el stock de cada producto aumenta exactamente una vez, incluso si se intenta recibir de nuevo.
- **SC-010**: Los recuentos del panel coinciden siempre con el número de proveedores y órdenes almacenados.
- **SC-011**: El recuento de órdenes atrasadas coincide con las órdenes cuya `fecha_entrega` es anterior a la fecha actual local (America/Santiago) y cuyo estado no es recibido ni cancelado; una entrega de hoy no cuenta como atrasada.
- **SC-012**: Ninguna pantalla muestra las etiquetas "Entidad" o "Documento" en Compras.
- **SC-013**: La interfaz cumple WCAG 2.1 AA: todas las acciones son operables con teclado, el foco es visible, todo input tiene etiqueta asociada, el contraste mínimo es 4,5:1 y los iconos de la barra lateral contraída tienen `aria-label`.

## Suposiciones

- El módulo gestiona un único espacio de trabajo y no una base multiinquilino.
- La adaptación del módulo se realiza mediante un archivo de configuración y no editando archivos fuente centrales.
- La persistencia se realiza en el `localStorage` del navegador.
- El RUT corresponde al identificador tributario chileno, se normaliza sin puntos y con guion, y se valida con módulo 11, incluida la K.
- El IVA aplicable es del 19 % y los importes se expresan en una única moneda sin campo de moneda.
- Cada orden de compra tiene exactamente un proveedor, un empleado solicitante y al menos una línea de detalle.
- El stock se mantiene en una única bodega y no se admiten recepciones parciales.
- Los datos maestros de Empleado, Categoría y Producto son administrados por el módulo de Compras para satisfacer las órdenes.
- La interfaz de usuario está en español y la terminología proviene de `ModuleConfig`.
- Las ventas, facturación y presupuestos pertenecen a otros módulos y quedan fuera de este alcance.
