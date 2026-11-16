# Feature Specification: Rediseño Visual del Módulo de Compras

**Feature Branch**: `005-compras-visual-redesign`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Rediseño visual completo del módulo de Compras por instrucción del profesor. EXCEPCIÓN APROBADA: este spec puede modificar la presentación visual (HTML, CSS y componentes de interfaz) del módulo base; NO cambia funcionalidades, reglas de negocio, permisos, flujo de estados ni modelo de datos de los specs 001 a 004, y todas las pruebas existentes deben seguir pasando."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nueva identidad visual y estructura de navegación (Priority: P1)

Como usuario del módulo de Compras, quiero una interfaz reconocible tipo "panel de operaciones" con una pantalla de ingreso dividida, una barra lateral agrupada y una barra superior con contexto, para orientarme rápido y percibir el módulo como una herramienta profesional de operaciones.

**Why this priority**: Es la base visual de todas las pantallas. Sin la identidad, los tokens y el armazón de navegación, el resto de los rediseños no puede aplicarse de forma consistente.

**Independent Test**: Se puede validar abriendo la pantalla de ingreso y el armazón interno: marca con patrón SVG, formulario, tarjetas de usuarios de prueba con cargo e ícono, barra lateral agrupada y contraíble, breadcrumbs, buscador global, menú de usuario con avatar de iniciales y cierre de sesión, e interruptor de modo oscuro.

**Acceptance Scenarios**:

1. **Given** un usuario sin sesión, **When** abre el módulo, **Then** ve una pantalla dividida con un panel de marca (nombre, lema y patrón gráfico SVG) y el formulario de ingreso, y puede ingresar con un solo clic desde una tarjeta de usuario de prueba que muestra el cargo y un ícono.
2. **Given** un usuario autenticado, **When** navega a cualquier pantalla interna, **Then** ve la barra lateral oscura con grupos Operación (Panel, Solicitudes, OC), Maestros (Proveedores, Productos) y Herramientas (Búsqueda), una barra superior con breadcrumbs, buscador global y menú de usuario.
3. **Given** que el usuario contrae la barra lateral, **When** recorre el módulo, **Then** la navegación permanece disponible como íconos con etiquetas accesibles.

---

### User Story 2 - Panel de control con lectura visual de la operación (Priority: P1)

Como Gerente, Bodeguero o Comprador, quiero un panel con indicadores, gráficos, ranking de proveedores y una lista de pendientes según mi cargo, para entender el estado de las compras sin salir de la pantalla principal.

**Why this priority**: El panel es la pantalla de entrada operativa y concentra el valor de lectura del módulo. Debe convivir con la nueva identidad visual sin alterar datos ni lógica.

**Independent Test**: Se puede validar con datos existentes de los specs 001–004: tarjetas de indicadores con ícono, número grande y detalle; gráficos de OC por estado y gasto mensual de los últimos 6 meses; ranking de los 5 proveedores con mayor monto; y lista "Requiere tu atención" que cambia según el cargo.

**Acceptance Scenarios**:

1. **Given** un usuario con cargo Gerente, **When** abre el Panel, **Then** la lista "Requiere tu atención" muestra las solicitudes pendientes de aprobar.
2. **Given** un usuario con cargo Bodeguero, **When** abre el Panel, **Then** la lista muestra las OC aprobadas por recibir y las atrasadas.
3. **Given** un usuario con cargo Comprador, **When** abre el Panel, **Then** la lista muestra sus borradores.
4. **Given** que existen OC y gastos registrados, **When** se dibujan los gráficos, **Then** estos solo reflejan datos ya existentes y ofrecen una alternativa textual o tabla equivalente.

---

### User Story 3 - Órdenes de compra legibles y accionables (Priority: P2)

Como usuario que gestiona OC, quiero alternar entre tabla y tablero por estado, un formulario con secciones ordenadas y un detalle con progreso, historial y totales, para revisar y operar órdenes con claridad.

**Why this priority**: Las OC son el núcleo del módulo. El rediseño debe mejorar la comprensión del flujo sin introducir nuevas acciones ni alterar transiciones de estado.

**Independent Test**: Se puede validar sobre el listado de OC, el formulario de creación/edición y el detalle: conmutación tabla/tablero, orden Cabecera → Detalle de compra → Totales, barra de progreso borrador → pendiente → aprobado → recibido, línea de tiempo del historial, tarjeta de totales y acciones permitidas destacadas.

**Acceptance Scenarios**:

1. **Given** el listado de OC, **When** el usuario alterna la vista, **Then** puede elegir entre tabla y tablero por columnas de estado, y el tablero es de solo lectura (sin arrastrar tarjetas).
2. **Given** el formulario de OC, **When** el usuario lo recorre, **Then** las secciones aparecen en orden Cabecera, Detalle de compra y Totales al final, y nunca se muestra una tarjeta de totales vacía.
3. **Given** el detalle de una OC, **When** el usuario lo abre, **Then** ve la barra de progreso de estados, la línea de tiempo vertical del historial, la tarjeta de totales y solo las acciones permitidas como botones destacados.
4. **Given** una OC en cualquier estado, **When** el usuario imprime, **Then** obtiene un documento formal con logotipo y datos del módulo, folio destacado, datos del proveedor y solicitante, tabla de líneas, totales y espacio para firma del aprobador.

---

### User Story 4 - Maestros y formularios con presentación consistente (Priority: P3)

Como usuario que consulta proveedores, productos y formularios, quiero vistas alternativas y controles visuales coherentes, para reconocer información de un vistazo y capturar datos con menos fricción.

**Why this priority**: Mejora la consistencia y la lectura de los maestros, pero depende de la identidad y del armazón definidos en las historias anteriores.

**Independent Test**: Se puede validar en Proveedores, Productos y formularios: vista tabla/tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional/Extranjero; barra de stock y etiqueta "Sin stock"; chips seleccionables en lugar de selección múltiple de rubros; controles con el estilo del sistema.

**Acceptance Scenarios**:

1. **Given** el listado de proveedores, **When** el usuario alterna la vista, **Then** puede elegir entre tabla y tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional o Extranjero.
2. **Given** un producto con stock mayor que cero, **When** se muestra en el listado, **Then** aparece una barra de nivel de stock; si el stock es cero, **Then** aparece la etiqueta "Sin stock".
3. **Given** un formulario con rubros, **When** el usuario selecciona rubros, **Then** lo hace mediante chips seleccionables y el resto de los selectores y campos mantiene el estilo del sistema.

---

### User Story 5 - Accesibilidad, movimiento y adaptabilidad (Priority: P3)

Como usuario con distintas capacidades y dispositivos, quiero una interfaz accesible y adaptable, para operar el módulo con teclado, con movimiento reducido y en pantallas de cualquier tamaño.

**Why this priority**: Es un requisito transversal de calidad y cumplimiento; se aplica sobre todos los rediseños y puede validarse de forma independiente.

**Independent Test**: Se puede validar con auditoría de contraste, navegación por teclado, emulación de `prefers-reduced-motion` y vistas en anchos medianos y pequeños.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla, **When** se audita el contraste, **Then** el texto cumple al menos 4,5:1 y el foco es visible.
2. **Given** un usuario que navega solo con teclado, **When** recorre controles, menús y acciones, **Then** puede operar toda la interfaz sin ratón.
3. **Given** una preferencia de movimiento reducido, **When** se abren paneles o se muestran notificaciones, **Then** las transiciones se atenúan o desactivan.
4. **Given** una pantalla mediana, **When** se muestra la navegación, **Then** la barra lateral aparece contraída; en pantallas pequeñas, **Then** se usa un menú desplegable y las tablas se convierten en tarjetas apiladas.

---

### Edge Cases

- ¿Qué muestra el Panel cuando no hay OC, gastos o proveedores registrados? Debe mostrar estados vacíos claros, sin gráficos engañosos ni errores.
- ¿Qué ocurre si una OC no tiene aprobador registrado al imprimir? Debe conservar el espacio de firma con una indicación explícita de ausencia.
- ¿Cómo se comportan los gráficos y el ranking cuando hay menos de 5 proveedores o menos de 6 meses de historia? Deben adaptarse a los datos disponibles sin inventar valores.
- ¿Qué sucede con una OC sin líneas de detalle? El formulario no debe mostrar una tarjeta de totales vacía.
- ¿Cómo se leen tablas convertidas en tarjetas apiladas con muchos campos? Deben mantener etiquetas de campo para no perder contexto.
- ¿Qué ocurre en modo oscuro con colores de estado y de acción? Deben mantener contraste AA y distinción entre estados.
- ¿Cómo se comportan las microinteracciones si el sistema tiene movimiento reducido? Deben desactivarse o acortarse sin ocultar información.
- ¿Qué pasa si el usuario usa lectores de pantalla con los gráficos? Debe existir texto alternativo o tabla equivalente asociada.

## Requirements *(mandatory)*

### Scope and Preservation Constraints

- **FR-001**: El rediseño MUST limitarse a la presentación visual (HTML, CSS y componentes de interfaz) del módulo de Compras.
- **FR-002**: El rediseño MUST NOT cambiar funcionalidades, reglas de negocio, permisos, flujo de estados ni modelo de datos definidos en los specs 001 a 004.
- **FR-003**: Todas las pruebas automatizadas existentes MUST seguir pasando; cualquier regresión es bloqueante.
- **FR-004**: Los gráficos, rankings e indicadores MUST leer únicamente datos ya existentes, sin crear, inferir ni persistir datos nuevos del dominio.

### Visual Identity and Tokens

- **FR-005**: El módulo MUST adoptar la identidad "panel de operaciones de compras": barra lateral azul petróleo oscuro (#0F2A3D), fondo gris muy claro y acción principal ámbar (#F59E0B) con texto oscuro que cumpla contraste.
- **FR-006**: Cada estado de OC MUST tener un color propio, distinguible y accesible, además de una etiqueta textual que no dependa solo del color.
- **FR-007**: Los títulos MUST usar la tipografía Space Grotesk y el texto general Inter, con alternativas del sistema como respaldo.
- **FR-008**: Los montos y cantidades MUST usar números tabulares para alinear dígitos.
- **FR-009**: Los colores, tipografías, espaciados, radios y sombras MUST definirse como tokens reutilizables y aplicarse de forma consistente en todo el módulo.

### Entry Screen and Application Shell

- **FR-010**: La pantalla de ingreso MUST dividirse en dos mitades: un panel de marca con nombre del módulo, lema y patrón gráfico SVG, y el formulario de ingreso al otro lado.
- **FR-011**: Las tarjetas de "Usuarios de prueba" MUST mostrar cargo e ícono y MUST permitir ingresar con un solo clic.
- **FR-012**: La barra lateral MUST agrupar la navegación en Operación (Panel, Solicitudes, OC), Maestros (Proveedores, Productos) y Herramientas (Búsqueda), y MUST poder contraerse a íconos.
- **FR-013**: La barra superior MUST mostrar breadcrumbs de la ruta actual, un buscador global y un menú de usuario con avatar de iniciales, cargo y cierre de sesión.
- **FR-014**: El módulo MUST ofrecer un interruptor de modo oscuro que preserve la legibilidad y el contraste AA.

### Dashboard

- **FR-015**: El Panel MUST mostrar tarjetas de indicadores con ícono, número grande y detalle secundario.
- **FR-016**: El Panel MUST mostrar un gráfico de OC por estado y un gráfico de gasto por mes de los últimos 6 meses, dibujados en SVG propio.
- **FR-017**: El Panel MUST mostrar un ranking de los 5 proveedores con mayor monto.
- **FR-018**: El Panel MUST mostrar la lista "Requiere tu atención" según el cargo: Gerente (solicitudes pendientes de aprobar), Bodeguero (OC aprobadas por recibir y atrasadas) y Comprador (sus borradores).

### Purchase Orders

- **FR-019**: El listado de OC MUST permitir alternar entre vista de tabla y vista de tablero por columnas de estado, siendo el tablero de solo lectura y sin arrastrar tarjetas.
- **FR-020**: El formulario de OC MUST presentar las secciones en orden Cabecera, Detalle de compra y Totales al final.
- **FR-021**: El formulario de OC MUST NOT mostrar una tarjeta de totales vacía.
- **FR-022**: El detalle de OC MUST mostrar una barra de progreso de estados (borrador → pendiente → aprobado → recibido), una línea de tiempo vertical con el historial, una tarjeta de totales y las acciones permitidas como botones destacados.
- **FR-023**: La impresión de la OC MUST producir un documento formal con encabezado de logotipo y datos del módulo, folio destacado, datos del proveedor y del solicitante, tabla de líneas, totales y espacio para firma del aprobador.

### Suppliers, Products and Forms

- **FR-024**: Proveedores MUST permitir alternar entre vista de tabla y vista de tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional o Extranjero.
- **FR-025**: Productos MUST mostrar un indicador visual de nivel de stock con barra y la etiqueta "Sin stock" cuando el nivel sea cero.
- **FR-026**: Los formularios MUST reemplazar la lista de selección múltiple de rubros por chips seleccionables y mantener el estilo del sistema en selectores y campos.

### Interaction, Accessibility and Responsiveness

- **FR-027**: Las transiciones de paneles, notificaciones y hover MUST ser suaves y MUST respetar `prefers-reduced-motion`.
- **FR-028**: El módulo MUST cumplir WCAG 2.1 AA: contraste mínimo 4,5:1, foco visible, operabilidad total con teclado y texto alternativo o tabla equivalente para gráficos.
- **FR-029**: En pantallas medianas la barra lateral MUST aparecer contraída; en pantallas pequeñas MUST usar menú desplegable y convertir tablas en tarjetas apiladas.
- **FR-030**: El rediseño MUST mantener los presupuestos de rendimiento ya definidos para el proyecto.

### Key Entities *(include if feature involves data)*

Este rediseño no crea ni modifica entidades del dominio. Reutiliza, solo para lectura y presentación, las entidades existentes de los specs 001–004:

- **Orden de Compra**: Documento con folio, proveedor, solicitante, líneas de detalle, totales, estado e historial.
- **Proveedor**: Maestro con identificación, rubro y clasificación Nacional/Extranjero.
- **Producto**: Maestro con nivel de stock y datos de catálogo.
- **Solicitud de Compra**: Solicitud previa a la OC, con estado de aprobación.
- **Usuario**: Actor con cargo, iniciales y permisos ya definidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las pruebas automatizadas existentes sigue pasando sin modificaciones en su intención ni en sus resultados esperados.
- **SC-002**: El 100 % de las pantallas del módulo usa los tokens visuales definidos, sin colores, tipografías o espaciados fuera del sistema.
- **SC-003**: Todas las combinaciones de texto y fondo evaluadas en las pantallas rediseñadas alcanzan al menos 4,5:1 de contraste y el 100 % de los controles interactivos muestra foco visible.
- **SC-004**: Un usuario puede completar los recorridos principales (ingresar, consultar Panel, revisar OC, alternar vistas y abrir detalle) usando solo teclado.
- **SC-005**: Las vistas en anchos medianos y pequeños no presentan desplazamiento horizontal de página y mantienen todas las acciones accesibles.
- **SC-006**: Con movimiento reducido activado, no se ejecutan transiciones que puedan causar molestia y la información sigue siendo comprensible.
- **SC-007**: Los gráficos cuentan con una alternativa textual o tabla equivalente que comunica los mismos datos.
- **SC-008**: El módulo mantiene los tiempos de carga y respuesta dentro de los presupuestos de rendimiento ya definidos.

## Assumptions

- La excepción del spec 005 está aprobada: el alcance es exclusivamente visual y los specs 001–004 permanecen como fuente de verdad funcional.
- Los datos y las rutas existentes son suficientes; no se requieren cambios de backend, API, persistencia ni esquema.
- El modo oscuro es una preferencia de presentación del usuario y no altera permisos ni datos del dominio.
- La impresión se realiza desde el navegador y reutiliza la información ya visible en la OC.
- Los íconos y el patrón de marca se implementan como gráficos vectoriales propios, sin dependencias de imágenes externas.
- El contenido textual (etiquetas, mensajes y estados) se mantiene; el rediseño puede reorganizarlo visualmente sin cambiar su significado.
- Los presupuestos de rendimiento y el marco de pruebas existentes se conservan tal como están definidos en el proyecto.
