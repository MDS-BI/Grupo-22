# Feature Specification: Mejora de la Experiencia de Usuario del Módulo de Compras

**Feature Branch**: `003-purchasing-ux-improvements`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Mejora de la experiencia de usuario del módulo de Compras, sin cambiar reglas de negocio ni el modelo de datos existentes de los specs 001 y 002 (solo se referencian, no se copian): (1) en Proveedores, Órdenes de Compra y Productos, la lista se muestra a ancho completo con un botón \"+ Nuevo\" que abre el formulario en un panel lateral, también usado para editar; (2) formularios en dos columnas agrupados en secciones con títulos (Proveedor: Datos generales, Contacto, Condiciones comerciales; OC: Cabecera, Detalle de compra, Totales), campos obligatorios marcados con asterisco y errores bajo cada campo; (3) estados de OC como etiquetas de color (borrador gris, pendiente amarillo, aprobado azul, recibido verde, cancelado rojo) con texto, no solo color; (4) las tarjetas del panel son clicables y abren la lista correspondiente ya filtrada (por ejemplo, Atrasadas abre las OC atrasadas y cada estado abre las OC en ese estado); (5) filtros y orden en las listas: OC por estado, proveedor y rango de fechas de entrega; proveedores y productos por categoría; orden por columna; botón \"Limpiar filtros\"; (6) notificaciones breves de éxito y error al guardar, eliminar o cambiar estado, y ventana de confirmación antes de eliminar o cancelar; (7) estados vacíos con un mensaje y un botón para crear el primer registro; (8) íconos SVG en línea consistentes en la barra lateral y las acciones; (9) botón \"Cargar datos de demostración\" que crea proveedores, empleados, categorías, productos y OC de ejemplo en todos los estados, incluida al menos una atrasada; si ya existen datos, pide confirmación y no borra nada. Debe cumplir WCAG 2.1 AA (teclado, foco visible, contraste 4,5:1, el panel lateral se cierra con Esc y devuelve el foco) y funcionar en pantallas estrechas, donde el panel lateral ocupa toda la pantalla."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestionar registros desde listas a ancho completo con panel lateral (Priority: P1)

Como usuario del módulo de Compras, quiero ver las listas de Proveedores, Órdenes de Compra y Productos ocupando el ancho disponible y crear o editar registros en un panel lateral, para trabajar con más contexto y sin perder de vista la lista.

**Why this priority**: Es la base de la nueva experiencia. Cambia el punto de entrada de todas las tareas de alta y edición y debe existir antes de añadir filtros, notificaciones o datos de demostración.

**Independent Test**: Abrir cada una de las tres listas, crear un registro desde "+ Nuevo", editarlo desde la fila correspondiente y comprobar que el panel se abre, guarda, cierra y devuelve el foco al control que lo abrió.

**Acceptance Scenarios**:

1. **Given** que el usuario está en la lista de Proveedores, Órdenes de Compra o Productos, **When** la consulta, **Then** la lista ocupa el ancho disponible y muestra un botón primario "+ Nuevo".
2. **Given** una lista visible, **When** el usuario activa "+ Nuevo", **Then** se abre un panel lateral con el formulario de creación y el foco se mueve al primer campo o al título del panel.
3. **Given** una fila existente, **When** el usuario elige editarla, **Then** se abre el mismo panel lateral con los datos precargados y el foco en el primer campo editable.
4. **Given** el panel lateral abierto, **When** el usuario guarda datos válidos, **Then** el panel se cierra, la lista refleja el cambio y el foco vuelve al botón que abrió el panel.
5. **Given** el panel lateral abierto sin cambios, **When** el usuario cancela o presiona Esc, **Then** el panel se cierra sin guardar y el foco vuelve al control de origen.
6. **Given** el panel lateral abierto con cambios sin guardar, **When** el usuario cancela o presiona Esc, **Then** se solicita confirmación antes de descartar los cambios; si el usuario rechaza la confirmación, el panel permanece abierto y conserva los datos.
7. **Given** una pantalla estrecha, **When** el usuario abre el panel lateral, **Then** el panel ocupa toda la pantalla y sigue siendo operable con teclado.

---

### User Story 2 - Encontrar órdenes mediante tarjetas, filtros y orden (Priority: P1)

Como responsable de compras, quiero abrir listas ya filtradas desde las tarjetas del panel y combinar filtros y orden por columna, para localizar rápidamente las órdenes que necesito revisar.

**Why this priority**: Reduce el tiempo de búsqueda y conecta el panel con la operación diaria. Aporta valor incluso si las demás mejoras visuales aún no existen.

**Independent Test**: Desde el panel, activar una tarjeta de estado y otra de Atrasadas; comprobar que la lista de Órdenes de Compra se abre con el filtro correspondiente, que se puede añadir proveedor y rango de fechas, ordenar por columna y limpiar todos los filtros.

**Acceptance Scenarios**:

1. **Given** el panel con tarjetas, **When** el usuario activa una tarjeta de estado de Órdenes de Compra, **Then** se abre la lista de Órdenes de Compra filtrada por ese estado y el filtro activo es visible.
2. **Given** el panel con tarjetas, **When** el usuario activa la tarjeta Atrasadas, **Then** se abre la lista de Órdenes de Compra filtrada por órdenes atrasadas según la regla vigente del módulo.
3. **Given** la lista de Órdenes de Compra, **When** el usuario combina estado, proveedor y rango de fechas de entrega, **Then** la lista muestra solo las órdenes que cumplen todos los filtros.
4. **Given** las listas de Proveedores o Productos, **When** el usuario selecciona una categoría, **Then** la lista muestra solo los registros de esa categoría.
5. **Given** una lista con filtros activos, **When** el usuario activa "Limpiar filtros", **Then** todos los filtros se restablecen y vuelven a mostrarse todos los registros.
6. **Given** una lista visible, **When** el usuario elige ordenar por una columna, **Then** la lista se ordena de forma ascendente y un segundo clic la ordena de forma descendente.
7. **Given** una lista filtrada y ordenada, **When** el usuario cambia un filtro o el orden, **Then** los datos persistidos no se modifican y la lista se actualiza de inmediato.

---

### User Story 3 - Recibir retroalimentación clara y evitar acciones destructivas accidentales (Priority: P2)

Como usuario del módulo, quiero ver notificaciones breves y confirmaciones antes de eliminar o cancelar, para saber si mis acciones tuvieron efecto y evitar pérdidas accidentales.

**Why this priority**: Aumenta la confianza en la operación y reduce errores irreversibles. Depende de que las acciones de alta, edición, eliminación y cambio de estado ya existan.

**Independent Test**: Guardar un registro, eliminarlo y cambiar el estado de una orden; comprobar las notificaciones de éxito y error, y verificar que cancelar una confirmación no altera los datos.

**Acceptance Scenarios**:

1. **Given** una operación de guardado exitosa, **When** finaliza, **Then** se muestra una notificación breve de éxito que no bloquea la interfaz.
2. **Given** una operación de guardado, eliminación o cambio de estado fallida, **When** finaliza, **Then** se muestra una notificación de error comprensible y los datos permanecen sin cambios.
3. **Given** una acción de eliminación de proveedor, producto u orden, **When** el usuario la activa, **Then** se solicita confirmación antes de ejecutar la eliminación.
4. **Given** una orden en estado borrador o pendiente, **When** el usuario elige cancelarla, **Then** se solicita confirmación antes de cambiar el estado a cancelado.
5. **Given** una ventana de confirmación visible, **When** el usuario cancela o presiona Esc, **Then** la acción no se ejecuta y los datos no cambian.
6. **Given** una notificación de éxito visible, **When** transcurren 5 segundos, **Then** la notificación desaparece sin requerir interacción.
7. **Given** una notificación de error visible, **When** transcurren 5 segundos, **Then** la notificación permanece visible hasta que el usuario la descarte manualmente.

---

### User Story 4 - Comprender estados y comenzar desde listas vacías (Priority: P2)

Como usuario nuevo o con datos incompletos, quiero reconocer los estados de las órdenes y saber qué hacer cuando una lista está vacía, para orientarme sin asistencia.

**Why this priority**: Mejora la comprensión del flujo y elimina pantallas sin salida. Se apoya en las listas y formularios ya existentes.

**Independent Test**: Revisar órdenes en todos los estados y comprobar que cada etiqueta incluye texto y color; abrir listas sin registros y comprobar el mensaje y el botón de creación; aplicar filtros sin coincidencias y comprobar la acción de limpiar.

**Acceptance Scenarios**:

1. **Given** una orden en cualquier estado canónico, **When** el usuario la ve en una lista o en su detalle, **Then** el estado aparece como una etiqueta con texto y un color asociado: borrador gris, pendiente amarillo, aprobado azul, recibido verde y cancelado rojo.
2. **Given** una etiqueta de estado, **When** el usuario la percibe sin distinguir colores, **Then** el texto permite identificar el estado sin ambigüedad.
3. **Given** una lista sin registros, **When** el usuario la abre, **Then** se muestra un mensaje explicativo y un botón para crear el primer registro.
4. **Given** una lista con registros pero sin coincidencias para los filtros activos, **When** el usuario la consulta, **Then** se muestra un mensaje de "sin resultados" y una acción para limpiar los filtros, no la acción de crear el primer registro.
5. **Given** el botón de creación del estado vacío, **When** el usuario lo activa, **Then** se abre el panel lateral de creación correspondiente.

---

### User Story 5 - Cargar datos de demostración de forma segura (Priority: P2)

Como usuario que evalúa o presenta el módulo, quiero cargar un conjunto de datos de ejemplo con proveedores, empleados, categorías, productos y órdenes en todos los estados, para explorar la experiencia sin crear datos manualmente.

**Why this priority**: Facilita la validación y las demos, pero la operación principal no depende de ella. Debe ser segura para no poner en riesgo datos reales.

**Independent Test**: Ejecutar la carga en un entorno vacío y comprobar los registros creados; repetirla con datos existentes, cancelar la confirmación y verificar que nada cambió; aceptar la confirmación y verificar que los datos previos siguen intactos.

**Acceptance Scenarios**:

1. **Given** un módulo sin datos, **When** el usuario activa "Cargar datos de demostración", **Then** se crean proveedores, empleados, categorías, productos y órdenes de compra de ejemplo sin pedir confirmación.
2. **Given** la carga de demostración completada, **When** el usuario revisa las órdenes, **Then** existe al menos una orden en cada estado canónico y al menos una orden atrasada según la regla vigente.
3. **Given** que ya existen datos, **When** el usuario activa "Cargar datos de demostración", **Then** se solicita confirmación antes de continuar.
4. **Given** la confirmación de carga con datos existentes, **When** el usuario cancela o presiona Esc, **Then** no se crea, modifica ni elimina ningún registro.
5. **Given** la confirmación aceptada con datos existentes, **When** finaliza la carga, **Then** los registros de demostración se añaden sin borrar ni sobrescribir los datos previos.
6. **Given** una carga de demostración exitosa, **When** finaliza, **Then** se muestra una notificación de éxito y las listas reflejan los nuevos registros.

---

### User Story 6 - Usar el módulo con teclado, lector de pantalla y pantallas estrechas (Priority: P3)

Como usuario con necesidades de accesibilidad o en un dispositivo móvil, quiero operar el módulo con teclado y con un diseño adaptable, para completar las tareas sin depender del ratón ni de una pantalla amplia.

**Why this priority**: Es un requisito transversal obligatorio. Se valida sobre las historias anteriores y puede comprobarse de forma independiente en cada pantalla.

**Independent Test**: Recorrer con teclado la barra lateral, las listas, los filtros, el panel lateral y las confirmaciones; verificar foco visible, cierre con Esc y retorno de foco; repetir en una pantalla estrecha y comprobar que el panel ocupa toda la pantalla.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla del módulo, **When** el usuario navega solo con teclado, **Then** todos los controles interactivos son alcanzables y operables en un orden lógico.
2. **Given** un control enfocado, **When** el usuario lo recorre con teclado, **Then** el foco es claramente visible.
3. **Given** el panel lateral abierto, **When** el usuario presiona Esc, **Then** el panel se cierra y el foco vuelve al control que lo abrió.
4. **Given** una confirmación o notificación, **When** el usuario la recibe con un lector de pantalla, **Then** el mensaje se anuncia de forma comprensible.
5. **Given** una pantalla estrecha, **When** el usuario usa listas, filtros y formularios, **Then** el contenido se adapta sin pérdida de información ni controles inaccesibles.
6. **Given** cualquier texto o control, **When** se evalúa el contraste, **Then** cumple al menos 4,5:1 para texto normal y los estados no dependen solo del color.

---

### Edge Cases

- **Lista vacía sin filtros**: se muestra el mensaje de primer registro y el botón de creación.
- **Lista con registros pero filtros sin coincidencias**: se muestra un estado de "sin resultados" con la acción de limpiar filtros.
- **Rango de fechas inválido**: si la fecha inicial es posterior a la final, se impide aplicar el filtro y se muestra un error junto al campo.
- **Filtros combinados**: si la combinación no tiene coincidencias, se mantienen visibles los filtros activos y la acción de limpiarlos.
- **Tarjeta sin coincidencias**: al abrir una lista desde una tarjeta, si no hay registros, se muestra el estado de "sin resultados" con el filtro visible y la opción de limpiarlo.
- **Panel lateral con cambios sin guardar**: cerrar con Esc o con la acción de cancelar solicita confirmación antes de descartar los cambios; si el usuario rechaza la confirmación, el panel permanece abierto y conserva los datos ingresados.
- **Error al guardar desde el panel**: el panel permanece abierto, conserva los datos ingresados y muestra el error junto al campo correspondiente y una notificación de error.
- **Eliminación o cancelación cancelada**: la confirmación cerrada sin aceptar no altera datos, historial ni stock.
- **Eliminación del registro que originó el foco**: si el control de origen ya no existe, el foco vuelve a un lugar equivalente de la lista o al encabezado de la vista.
- **Carga de demostración con datos existentes**: cancelar la confirmación no crea ni elimina nada; aceptar solo añade datos.
- **Carga de demostración fallida**: los datos existentes permanecen intactos y se informa el error.
- **Etiquetas de estado largas o listas estrechas**: el texto del estado sigue siendo legible y no se reemplaza por solo color.
- **Pantalla muy estrecha**: el panel lateral ocupa toda la pantalla y las listas siguen permitiendo acceder a todas las columnas y acciones.
- **Orden atrasada en estado terminal**: no se considera atrasada si la regla vigente la excluye por estar recibida o cancelada.

## Requirements *(mandatory)*

### Functional Requirements

#### Listas, panel lateral y formularios

- **FR-001**: El sistema DEBE mostrar las listas de Proveedores, Órdenes de Compra y Productos a ancho completo.
- **FR-002**: Cada lista DEBE mostrar un botón primario "+ Nuevo" que abra el formulario de creación en un panel lateral.
- **FR-003**: El mismo panel lateral DEBE usarse para editar un registro existente, precargando sus datos.
- **FR-004**: El panel lateral DEBE abrirse sin ocultar permanentemente la lista y DEBE cerrarse al guardar, cancelar o presionar Esc. Si existen cambios sin guardar, cancelar o presionar Esc DEBE solicitar confirmación antes de descartarlos; si se rechaza la confirmación, el panel DEBE permanecer abierto y conservar los datos.
- **FR-005**: Al cerrar el panel lateral, el foco DEBE volver al control que lo abrió o a un control equivalente si este ya no existe.
- **FR-006**: Los formularios de Proveedor DEBEN agruparse en las secciones "Datos generales", "Contacto" y "Condiciones comerciales".
- **FR-007**: Los formularios de Orden de Compra DEBEN agruparse en las secciones "Cabecera", "Detalle de compra" y "Totales".
- **FR-008**: Los formularios DEBEN organizarse en dos columnas cuando el ancho lo permita y en una columna en pantallas estrechas.
- **FR-009**: Los campos obligatorios DEBEN marcarse con un asterisco visible y una indicación accesible de obligatoriedad.
- **FR-010**: Los errores de validación DEBEN mostrarse bajo el campo afectado, con un mensaje comprensible y asociado programáticamente al campo.
- **FR-011**: El sistema DEBE impedir guardar mientras existan errores de validación y DEBE conservar los datos ingresados.
- **FR-012**: El panel lateral DEBE ser operable con teclado y DEBE contener el foco mientras está abierto hasta que se cierre.
- **FR-013**: En pantallas estrechas, el panel lateral DEBE ocupar toda la pantalla.
- **FR-014**: Las mejoras de presentación NO DEBEN cambiar las reglas de negocio, validaciones, estados, cálculos ni el modelo de datos definidos en los specs 001 y 002.

#### Estados de órdenes

- **FR-015**: El sistema DEBE mostrar el estado de una Orden de Compra como una etiqueta que incluya texto y color.
- **FR-016**: Los colores asociados DEBEN ser gris para borrador, amarillo para pendiente, azul para aprobado, verde para recibido y rojo para cancelado.
- **FR-017**: La identificación del estado NO DEBE depender solo del color; el texto DEBE ser suficiente para reconocerlo.
- **FR-018**: Las etiquetas de estado DEBEN aparecer en las listas y en el detalle de la orden.
- **FR-019**: Las etiquetas y sus combinaciones de color y texto DEBEN cumplir el contraste mínimo de WCAG 2.1 AA.

#### Panel de inicio y navegación filtrada

- **FR-020**: Las tarjetas del panel DEBEN ser clicables y operables con teclado.
- **FR-021**: Una tarjeta de estado de Órdenes de Compra DEBE abrir la lista filtrada por ese estado.
- **FR-022**: La tarjeta Atrasadas DEBE abrir la lista de Órdenes de Compra filtrada por órdenes atrasadas según la regla vigente del módulo.
- **FR-023**: Las tarjetas de Proveedores y Productos DEBEN abrir la lista correspondiente cuando existan.
- **FR-024**: Al abrir una lista desde una tarjeta, el filtro aplicado DEBE ser visible y removible.

#### Filtros y orden

- **FR-025**: La lista de Órdenes de Compra DEBE permitir filtrar por estado, proveedor y rango de fechas de entrega.
- **FR-026**: El rango de fechas de entrega DEBE ser inclusivo y DEBE validarse antes de aplicarse.
- **FR-027**: Las listas de Proveedores y Productos DEBEN permitir filtrar por categoría.
- **FR-028**: Los filtros DEBEN poder combinarse y DEBEN mostrar solo los registros que cumplen todos los criterios activos.
- **FR-029**: Cada lista DEBE ofrecer un botón "Limpiar filtros" que restablezca todos los filtros a su estado inicial.
- **FR-030**: Las listas DEBEN permitir ordenar por cada columna visible, alternando entre ascendente y descendente.
- **FR-031**: El orden DEBE aplicarse sobre el conjunto filtrado y DEBE conservarse mientras el usuario permanezca en la lista.
- **FR-032**: Los filtros y el orden NO DEBEN modificar los datos persistidos.
- **FR-033**: Cuando una lista no tenga registros, DEBE mostrar un mensaje y un botón para crear el primer registro.
- **FR-034**: Cuando una lista tenga registros pero los filtros no produzcan coincidencias, DEBE mostrar un mensaje de "sin resultados" y una acción para limpiar los filtros.

#### Notificaciones y confirmaciones

- **FR-035**: El sistema DEBE mostrar una notificación breve de éxito después de guardar, eliminar o cambiar de estado correctamente.
- **FR-036**: El sistema DEBE mostrar una notificación de error comprensible cuando una operación de guardado, eliminación o cambio de estado falle.
- **FR-037**: Las notificaciones NO DEBEN bloquear la interacción y DEBEN anunciarse a tecnologías de asistencia.
- **FR-038**: Las notificaciones de éxito DEBEN ocultarse automáticamente a los 5 segundos y DEBEN poder descartarse manualmente; las notificaciones de error DEBEN permanecer visibles hasta que el usuario las descarte manualmente.
- **FR-039**: El sistema DEBE solicitar confirmación antes de eliminar un proveedor, producto u orden.
- **FR-040**: El sistema DEBE solicitar confirmación antes de cambiar una orden a cancelado.
- **FR-041**: Cancelar o cerrar una confirmación NO DEBE ejecutar la acción ni modificar datos, historial o stock.
- **FR-042**: Las ventanas de confirmación DEBEN ser operables con teclado, cerrarse con Esc y devolver el foco al control de origen.

#### Datos de demostración

- **FR-043**: El sistema DEBE ofrecer una acción "Cargar datos de demostración".
- **FR-044**: La carga DEBE crear proveedores, empleados, categorías, productos y órdenes de compra de ejemplo.
- **FR-045**: Los datos de demostración DEBEN incluir al menos una orden en cada estado canónico y al menos una orden atrasada.
- **FR-046**: Los datos de demostración DEBEN respetar las reglas de negocio y validaciones vigentes del módulo.
- **FR-047**: Si no existen datos, la carga DEBE ejecutarse sin confirmación previa.
- **FR-048**: Si ya existen datos, el sistema DEBE solicitar confirmación antes de cargar los datos de demostración.
- **FR-049**: Aceptar la confirmación DEBE añadir los datos de demostración sin borrar, sobrescribir ni modificar los datos existentes.
- **FR-050**: Cancelar o cerrar la confirmación NO DEBE crear, modificar ni eliminar ningún registro.
- **FR-051**: Al finalizar una carga exitosa, el sistema DEBE mostrar una notificación de éxito y actualizar las listas y el panel.
- **FR-052**: Si la carga falla, los datos existentes DEBEN permanecer intactos y el sistema DEBE informar el error.

#### Iconografía y accesibilidad

- **FR-053**: La barra lateral y las acciones DEBEN usar iconos SVG en línea con un estilo visual consistente.
- **FR-054**: Los iconos decorativos DEBEN ocultarse a tecnologías de asistencia y los iconos accionables DEBEN tener un nombre accesible.
- **FR-055**: Todos los controles interactivos DEBEN ser alcanzables y operables con teclado en un orden lógico.
- **FR-056**: El foco DEBE ser visible en todos los elementos interactivos.
- **FR-057**: El texto normal y los controles DEBEN cumplir un contraste mínimo de 4,5:1 según WCAG 2.1 AA.
- **FR-058**: Las listas, formularios, filtros, notificaciones y confirmaciones DEBEN cumplir WCAG 2.1 AA en estructura, etiquetas, nombres accesibles y anuncios.
- **FR-059**: La interfaz DEBE adaptarse a pantallas estrechas sin pérdida de información ni controles inaccesibles.

#### Ajustes post-revisión (2026-11-14)

> Estos requisitos complementan y, en caso de conflicto, prevalecen sobre FR-001 a FR-059 y sobre las tareas previas de 003, sin renumerar ni desmarcar lo existente.

- **FR-060**: El detalle de una Orden de Compra DEBE ser una vista propia y NO DEBE mostrarse debajo de la lista ni de ninguna otra pantalla; al activar una orden desde la lista, el detalle DEBE reemplazar la vista visible.
- **FR-061**: La vista de detalle DEBE ofrecer un botón "Volver a Órdenes de Compra" que regrese a la lista, restaure los filtros y el orden vigentes y devuelva el foco a un control equivalente.
- **FR-062**: Cuando otra vista esté activa, el detalle DEBE permanecer oculto con `display: none` efectivo, sin ocupar espacio ni ser alcanzable por teclado o tecnologías de asistencia.
- **FR-063**: Las listas de Proveedores, Solicitudes y Órdenes de Compra y Productos DEBEN mantenerse a ancho completo, con el botón "+ Nuevo" que abre el formulario en panel lateral. Si una entrega posterior degradó este diseño, DEBE restituirse sin cambiar reglas de negocio.
- **FR-064**: Los formularios DEBEN mantenerse o restituirse en dos columnas cuando el ancho lo permita, agrupados en secciones: Proveedor (Datos generales con Rubro múltiple y Origen, Contacto, Condiciones comerciales), Orden (Cabecera, Detalle de compra, Totales) y Producto (Datos del producto). En pantallas estrechas DEBEN usar una columna.
- **FR-065**: En Productos, la gestión de categorías DEBE estar en una pestaña o sección "Categorías" propia de la pantalla, con listado, creación, edición y eliminación según las reglas vigentes de 001.
- **FR-066**: El formulario de producto NO DEBE permitir crear categorías; DEBE limitarse a seleccionar una categoría existente y conservar la validación de categoría obligatoria y existente.
- **FR-067**: La barra lateral DEBE presentar el orden Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda, respetando la visibilidad por rol de 004.
- **FR-068**: Todo elemento incorporado por 003 ("+ Nuevo", panel lateral, tarjetas clicables, filtros y orden, datos de demostración y vista de detalle) DEBE respetar los permisos de 004 en la interfaz y en el servicio: ocultar o deshabilitar controles sin permiso, excluirlos del orden de tabulación, revalidar en el servicio y mostrar error persistente sin mutar datos.
- **FR-069**: La carga de datos de demostración DEBE crear al menos un empleado por cada cargo existente, considerando los cargos presentes en el directorio de usuarios y en los empleados registrados, sin crear cargos nuevos.
- **FR-070**: La carga de demostración DEBE respetar los permisos de 004 en las transiciones que ejecuta. Si el rol activo no puede aprobar, recibir o cancelar, NO DEBE usar la carga como vía alternativa: DEBE limitarse a los estados alcanzables e informar la limitación. Para roles con permisos completos se mantiene FR-045.
- **FR-071**: Los filtros de Proveedores DEBEN operar sobre uno o más Rubros (coincidencia OR) y Origen, no sobre el campo de texto `category`; los de Productos sobre Categoría; los de Órdenes sobre estado, proveedor, rango de entrega y atraso. NO DEBEN ofrecerse filtros o columnas sobre datos restringidos por 004. Este requisito prevalece sobre FR-027 para Proveedores y las menciones anteriores a «categoría» de Proveedores en historias o escenarios se interpretan como Rubro(s) y Origen.
- **FR-072**: Los formularios y el detalle de 003 NO DEBEN reintroducir los campos retirados por 002 (Cantidad, Subtotal, Descuento, Impuesto, Importe total, Notas, selector de Estado y fecha de emisión manual) ni "Fecha objetivo" de 001. La fecha de emisión DEBE asignarse automáticamente al aprobar y mostrarse como "Sin emitir" en borrador/pendiente.
- **FR-073**: Las etiquetas DEBEN mantener "Rubro/Rubros" para Proveedores y "Categoría" para Productos según 001, y "Solicitud de compra"/"Orden de Compra emitida" según el estado y 004, en listas, detalle, panel, filtros y notificaciones.
- **FR-074**: La vista de detalle DEBE respetar las reglas de 004: denominación por estado, fecha de emisión, empleado solicitante de solo lectura para comprador, aprobar/rechazar solo para gerente/administrador y ausencia del límite de crédito para comprador; NO DEBE renderizar acciones que el servicio rechazará.

#### Datos de demostración completos (2026-11-15)

> Estos requisitos precisan y, en caso de conflicto, prevalecen sobre FR-043 a FR-052 y sobre los escenarios de la historia US5 relativos a la carga aditiva. No se renumera ni se desmarca lo existente. La carga con datos existentes deja de ser aditiva: pasa a ser sustitutiva y solo se ejecuta con confirmación explícita.

- **FR-075**: La acción "Cargar datos de demostración" DEBE generar en una sola operación un conjunto completo formado por usuarios de prueba, empleados, proveedores, rubros, categorías, productos y órdenes de compra, además de cumplir los requisitos vigentes de 001, 002 y 004.
- **FR-076**: La carga DEBE crear o actualizar exactamente un usuario de prueba activo por cada rol definido en 004 (Administrador, Gerente, Comprador, Bodeguero y Consulta, o los que defina 004), con un identificador estable y único, un cargo visible que corresponda a la etiqueta de ese rol y un vínculo con exactamente un empleado propio. Los usuarios de prueba NO DEBEN crear roles, cargos, permisos ni claves nuevas, y un empleado de prueba NO DEBE quedar vinculado a más de un usuario.
- **FR-077**: La carga DEBE incluir los empleados propios de todos los usuarios de prueba y al menos un empleado por cada cargo existente, sin reutilizar empleados por coincidencia de nombre y sin duplicar el empleado de un mismo usuario.
- **FR-078**: La pantalla de ingreso DEBE mostrar una tabla "Usuarios de prueba" con una fila por usuario de prueba y las columnas de identificador y cargo, solo cuando existan datos de demostración cargados. Sin datos de demostración la tabla NO DEBE mostrarse. La tabla DEBE ser accesible, actualizarse tras cargar o reemplazar los datos y NO DEBE mostrar credenciales.
- **FR-079**: La carga DEBE crear exactamente 8 proveedores ficticios con nombres claramente inventados y distintos de empresas reales: 6 de Origen Nacional con RUT único y válido por módulo 11, y 2 de Origen Extranjero con identificación tributaria extranjera. Los proveedores DEBEN usar al menos 3 Rubros distintos, al menos uno DEBE tener 2 o más Rubros y DEBEN cubrir al menos 3 condiciones de pago de la lista fija de 001.
- **FR-080**: La carga DEBE crear exactamente 5 categorías de producto con nombres distintos.
- **FR-081**: La carga DEBE crear exactamente 15 productos con nombres distintos, categoría existente, unidad de medida no vacía y stock entero no negativo y variado. Al menos 2 productos DEBEN conservar stock 0 después de aplicadas las recepciones de la demostración y DEBEN existir al menos 3 valores positivos distintos.
- **FR-082**: La carga DEBE crear exactamente 12 órdenes de compra con al menos una orden en cada estado canónico. Al menos 2 órdenes DEBEN estar atrasadas según la regla vigente de 002. Al menos 1 orden DEBE pertenecer a un proveedor extranjero y usar moneda USD sin IVA. Las órdenes DEBEN distribuirse entre al menos 3 empleados solicitantes distintos, incluido el empleado propio del usuario de prueba Comprador; al menos 3 órdenes DEBEN usar ese empleado propio y al menos 3 DEBEN usar otros solicitantes, de modo que el filtro "Solo mis OC" muestre un subconjunto distinto del total.
- **FR-083**: Las órdenes de demostración DEBEN generarse con los servicios y transiciones vigentes, sin escribir estados directamente. Las órdenes en `recibido` DEBEN tener `stock_aplicado = true`, `appliedAt` informado y el stock aplicado exactamente una vez; las órdenes en `aprobado` y `recibido` DEBEN tener fecha de emisión válida asignada al aprobar; las órdenes en `borrador` o `pendiente` NO DEBEN tener fecha de emisión; las canceladas NO DEBEN modificar el stock. Totales, IVA y moneda DEBEN respetar 001 y 002.
- **FR-084**: La lista de Órdenes de Compra DEBE ofrecer al rol Comprador un filtro "Solo mis OC" que limite los resultados a las órdenes cuyo empleado solicitante sea el empleado propio vinculado a su usuario. El filtro DEBE poder combinarse con estado, proveedor, rango de entrega y atraso, DEBE reflejarse en el resumen de filtros y DEBE restablecerse con "Limpiar filtros". El filtro NO DEBE exponer datos de otros solicitantes, NO DEBE modificar datos persistidos y NO DEBE ofrecerse a roles sin empleado propio. Este requisito prevalece sobre FR-071 y sobre la restricción de filtros por empleado de 004 solo para este filtro de órdenes propias.
- **FR-085**: Si ya existen datos del módulo de Compras o datos de demostración, activar "Cargar datos de demostración" NO DEBE modificar nada hasta que el usuario elija una de estas dos acciones: "Reemplazar por datos de demostración" o "Cancelar". "Cancelar", cerrar la confirmación o presionar Esc NO DEBE crear, modificar ni eliminar registros, usuarios ni la sesión.
- **FR-086**: Aceptar "Reemplazar por datos de demostración" DEBE eliminar el conjunto previo del módulo (proveedores, órdenes, líneas, metadatos, historial, transacciones de stock, empleados, categorías, rubros y productos) y los usuarios de prueba previos, y luego crear únicamente el conjunto de demostración completo. NO DEBE mezclar, conservar ni añadir registros del conjunto reemplazado. Los usuarios de autenticación que no sean de prueba y la sesión activa DEBEN conservarse, salvo que la sesión corresponda a un usuario de prueba eliminado, en cuyo caso se DEBE volver a la pantalla de ingreso.
- **FR-087**: La sustitución DEBE ser atómica. Si falla cualquier paso, el sistema DEBE restaurar el conjunto previo completo, no DEBE dejar datos de demostración parciales ni mezclados, DEBE informar el error y NO DEBE mostrar una notificación de éxito.
- **FR-088**: Una carga o sustitución exitosa DEBE mostrar una notificación con las cantidades creadas, actualizar listas, filtros, panel, opciones de proveedor/producto y la tabla "Usuarios de prueba", y garantizar la unicidad de identificadores de usuario, RUT nacionales y folios. Repetir la sustitución DEBE producir los mismos conteos, sin duplicados.
- **FR-089**: Los usuarios de prueba DEBEN usar exclusivamente los roles y la matriz de permisos de 004. Cada uno DEBE poder ingresar con su identificador y, una vez autenticado, DEBE ver solo las vistas, formularios, acciones de fila, transiciones, impresión y gestión de productos y stock que su rol permite, tanto en la interfaz como en la revalidación del servicio. La carga NO DEBE conceder permisos adicionales ni usar una transición no autorizada para producir estados; si el rol activo no puede ejecutar todas las transiciones, NO DEBE usar la carga como vía alternativa y DEBE informar la limitación conforme a FR-070.

### Key Entities *(include if feature involves data)*

- **Proveedor**: registro existente del spec 001; la mejora solo cambia cómo se lista, filtra, crea y edita.
- **Producto**: registro existente del spec 002; la mejora solo cambia su listado, filtrado, alta y edición.
- **Categoría**: dato existente usado para clasificar y filtrar productos; su gestión se realiza en una sección propia de Productos. Los proveedores se clasifican por Rubro(s) y Origen.
- **Empleado**: dato existente usado por las órdenes de compra; la carga de demostración puede crear ejemplos.
- **Orden de Compra**: documento existente del spec 002; se conservan sus estados, líneas, totales, historial, recepción y reglas de negocio.
- **Estado de Orden de Compra**: valor canónico existente del spec 002; la mejora solo añade su representación visual como etiqueta con texto y color.
- **Datos de demostración**: conjunto de registros de ejemplo generado por una acción explícita; no introduce un nuevo modelo de datos persistente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede abrir el formulario de creación de cualquiera de las tres listas con una sola acción desde el botón "+ Nuevo".
- **SC-002**: Un usuario puede abrir, completar y guardar un registro desde el panel lateral sin perder el contexto de la lista.
- **SC-003**: El 100 % de los campos obligatorios muestra un asterisco visible y el 100 % de los errores de validación aparece bajo el campo afectado.
- **SC-004**: El 100 % de las órdenes muestra su estado con texto y color, y ninguna etiqueta depende solo del color para identificarse.
- **SC-005**: Un usuario puede localizar las órdenes de un estado o las atrasadas desde el panel en una sola acción.
- **SC-006**: Un usuario puede aplicar y limpiar filtros combinados de estado, proveedor y rango de fechas en menos de 30 segundos.
- **SC-007**: El 100 % de las listas ofrece orden ascendente y descendente por cada columna visible.
- **SC-008**: El 100 % de las operaciones de guardado, eliminación y cambio de estado muestra una notificación de éxito o error comprensible.
- **SC-009**: El 100 % de las eliminaciones y cancelaciones de órdenes solicita confirmación antes de ejecutarse.
- **SC-010**: Cancelar una confirmación no produce cambios en los datos en el 100 % de los casos verificados.
- **SC-011**: El 100 % de las listas vacías muestra un mensaje y un botón para crear el primer registro; el 100 % de las listas sin resultados muestra una acción para limpiar filtros.
- **SC-012**: Una carga de demostración en un entorno vacío crea al menos un proveedor, un empleado, una categoría, un producto y una orden en cada estado canónico, incluida al menos una atrasada.
- **SC-013**: Repetir la carga de demostración con datos existentes y cancelar la confirmación deja el conjunto de datos exactamente igual.
- **SC-014**: Un usuario puede completar las tareas principales de creación, edición, filtrado, eliminación y cambio de estado usando solo el teclado.
- **SC-015**: El foco vuelve al control de origen en el 100 % de los cierres del panel lateral y de las confirmaciones.
- **SC-016**: En una pantalla estrecha, el panel lateral ocupa toda la pantalla y todas las acciones principales siguen siendo accesibles.
- **SC-017**: Las combinaciones de texto y color de estados y controles alcanzan una relación de contraste mínima de 4,5:1.
- **SC-018**: El 100 % de los iconos de la barra lateral y de las acciones usa un conjunto visual consistente y mantiene un nombre accesible cuando es accionable.
- **SC-019**: El 100 % de los cierres del panel lateral con cambios sin guardar solicita confirmación; rechazar la confirmación conserva los cambios y mantiene el panel abierto.
- **SC-020**: El 100 % de las notificaciones de éxito desaparece a los 5 segundos y el 100 % de las notificaciones de error permanece visible hasta su descarte manual.

## Assumptions

- Las reglas de negocio, estados, transiciones, cálculos, validaciones y modelo de datos de los specs 001 y 002 se mantienen sin cambios; esta funcionalidad solo mejora la presentación y las interacciones.
- El botón "+ Nuevo" es la vía principal de creación, pero las acciones de fila para editar y eliminar se conservan.
- La eliminación se ejecuta desde la lista o el detalle existente; el panel lateral se usa para crear y editar, no para eliminar.
- Los filtros afectan solo la vista actual y no se persisten entre recargas; la lista conserva el orden elegido mientras el usuario permanezca en ella.
- El rango de fechas de entrega es inclusivo en ambos extremos y usa la fecha de entrega de la orden.
- La regla de "orden atrasada" es la vigente en el spec 002: fecha de entrega anterior a hoy y estado no terminal.
- Las notificaciones de éxito desaparecen automáticamente a los 5 segundos; las notificaciones de error son no bloqueantes y permanecen visibles hasta que el usuario las descarte manualmente. Los errores de campo permanecen junto al campo mientras este sea inválido.
- Los datos de demostración son aditivos y nunca eliminan ni sobrescriben datos existentes; si ya hay datos, la confirmación protege al usuario y puede cancelarse sin efectos.
- Los datos de demostración usan valores únicos y válidos para folios, RUT y demás identificadores, de modo que no colisionan con los registros existentes.
- La acción "Cargar datos de demostración" es visible para el usuario del módulo y no requiere roles ni permisos adicionales.
- La interfaz debe funcionar en navegadores modernos de escritorio y móvil, con navegación por teclado y tecnologías de asistencia compatibles.
- Las pantallas estrechas se refieren a anchos de teléfono habituales; el panel lateral pasa a pantalla completa en esos casos.
- Los colores exactos de las etiquetas de estado pueden ajustarse dentro de la paleta del módulo siempre que se respeten los colores indicados y el contraste mínimo.
- El "cargo" de FR-069 se toma de los valores ya existentes en el directorio de usuarios y en los empleados registrados; la carga de demostración no crea cargos nuevos.
- Los ajustes post-revisión de 003 no reabren ni renumeran requisitos ni tareas anteriores; cuando existe conflicto, prevalecen los requisitos FR-060 a FR-074.
- Los ajustes de datos de demostración completos del 2026-11-15 prevalecen sobre el supuesto aditivo anterior: con datos existentes, la acción solo sustituye el conjunto del módulo tras confirmación explícita y nunca mezcla datos; cancelar no altera nada. Los usuarios de prueba se derivan de los roles de 004 y no crean cargos, roles ni permisos nuevos.
