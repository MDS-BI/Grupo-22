# Especificación de Funcionalidad: Rediseño Visual del Módulo de Compras

**Rama de Funcionalidad**: `005-compras-visual-redesign`  
**Creado**: 2026-11-15  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Rediseño visual completo del módulo de Compras por instrucción del profesor. EXCEPCIÓN APROBADA: este spec puede modificar la presentación visual (HTML, CSS y componentes de interfaz) del módulo base; NO cambia funcionalidades, reglas de negocio, permisos, flujo de estados ni modelo de datos de los specs 001 a 004, y todas las pruebas existentes deben seguir pasando."

## Aclaraciones

### Sesión 2026-11-15

- P: ¿Cómo debe actualizarse la spec 005? → R: Traducir títulos al español (estilo 001-004/006), preservar elementos del 006 y navegación del 003, definir atención por rol 004, sin frameworks/librerías en todo el módulo (SVG propio), gráficos y métricas según reglas acordadas, chips sincronizados con select oculto, insignias con nombres del 006, impresión con folio OC/SOL, tipografías woff2 locales, modo oscuro con localStorage y prefers-color-scheme, y reservar estructura para 007 (Reportes y campana ocultos/deshabilitados).

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Nueva identidad visual y estructura de navegación (Prioridad: P1)

Como usuario del módulo de Compras, quiero una interfaz reconocible tipo "panel de operaciones" con una pantalla de ingreso dividida, una barra lateral agrupada y una barra superior con contexto, para orientarme rápido y percibir el módulo como una herramienta profesional de operaciones.

**Por qué esta prioridad**: Es la base visual de todas las pantallas. Sin la identidad, los tokens y el armazón de navegación, el resto de los rediseños no puede aplicarse de forma consistente.

**Prueba independiente**: Se puede validar abriendo la pantalla de ingreso y el armazón interno: marca con patrón SVG, formulario, tarjetas de usuarios de prueba con cargo e ícono, barra lateral agrupada y contraíble, breadcrumbs, buscador global, menú de usuario con avatar de iniciales y cierre de sesión, interruptor de modo oscuro y espacio reservado para la campana de notificaciones del 007 (oculta o deshabilitada).

**Escenarios de Aceptación**:

1. **Dado** un usuario sin sesión, **Cuando** abre el módulo, **Entonces** ve una pantalla dividida con un panel de marca (nombre, lema y patrón gráfico SVG) y el formulario de ingreso, y puede ingresar con un solo clic desde una tarjeta de usuario de prueba que muestra el cargo y un ícono, usando el mismo `login()` definido en 004.
2. **Dado** un usuario autenticado, **Cuando** navega a cualquier pantalla interna, **Entonces** ve la barra lateral oscura con grupos Operación (Panel y "Solicitudes y Órdenes de Compra" como una sola entrada, según 003 FR-067), Maestros (Proveedores, Productos) y Herramientas (Búsqueda y una entrada "Reportes" reservada, oculta o deshabilitada hasta que el 007 la implemente), una barra superior con breadcrumbs, buscador global, espacio reservado para campana de notificaciones (oculto o deshabilitado hasta 007) y menú de usuario.
3. **Dado** que el usuario contrae la barra lateral, **Cuando** recorre el módulo, **Entonces** la navegación permanece disponible como íconos con etiquetas accesibles.

---

### Historia de Usuario 2 - Panel de control con lectura visual de la operación (Prioridad: P1)

Como Gerente, Administrador, Bodeguero, Comprador o usuario de Consulta, quiero un panel con indicadores, gráficos, ranking de proveedores y una lista de pendientes según mi rol, para entender el estado de las compras sin salir de la pantalla principal.

**Por qué esta prioridad**: El panel es la pantalla de entrada operativa y concentra el valor de lectura del módulo. Debe convivir con la nueva identidad visual sin alterar datos ni lógica.

**Prueba independiente**: Se puede validar con datos existentes de los specs 001–004 y 006: tarjetas de indicadores con ícono, número grande y detalle; gráficos de OC por estado y gasto mensual de los últimos 6 meses; ranking de los 5 proveedores con mayor monto; y lista "Requiere tu atención" que cambia según el rol de 004.

**Escenarios de Aceptación**:

1. **Dado** un usuario con rol Gerente o Administrador, **Cuando** abre el Panel, **Entonces** la lista "Requiere tu atención" muestra las solicitudes pendientes de aprobar.
2. **Dado** un usuario con rol Bodeguero, **Cuando** abre el Panel, **Entonces** la lista muestra las OC aprobadas por recibir y las atrasadas.
3. **Dado** un usuario con rol Comprador, **Cuando** abre el Panel, **Entonces** la lista muestra sus borradores.
4. **Dado** un usuario con rol Consulta, **Cuando** abre el Panel, **Entonces** la lista muestra las OC atrasadas en solo lectura, con la misma definición reutilizable por la bandeja de notificaciones del 007.
5. **Dado** que existen OC y gastos registrados, **Cuando** se dibujan los gráficos, **Entonces** estos solo reflejan datos ya existentes, se separan por moneda (sin convertir), y ofrecen una alternativa textual o tabla equivalente.

---

### Historia de Usuario 3 - Órdenes de compra legibles y accionables (Prioridad: P2)

Como usuario que gestiona OC, quiero alternar entre tabla y tablero por estado, un formulario con secciones ordenadas y un detalle con progreso, historial y totales, para revisar y operar órdenes con claridad.

**Por qué esta prioridad**: Las OC son el núcleo del módulo. El rediseño debe mejorar la comprensión del flujo sin introducir nuevas acciones ni alterar transiciones de estado.

**Prueba independiente**: Se puede validar sobre el listado de OC, el formulario de creación/edición y el detalle: conmutación tabla/tablero, orden Cabecera → Detalle de compra → Totales, barra de progreso por estados, línea de tiempo del historial, tarjeta de totales y acciones permitidas destacadas.

**Escenarios de Aceptación**:

1. **Dado** el listado de OC, **Cuando** el usuario alterna la vista, **Entonces** puede elegir entre tabla y tablero por columnas de estado, y el tablero es de solo lectura (sin arrastrar tarjetas).
2. **Dado** el formulario de OC, **Cuando** el usuario lo recorre, **Entonces** las secciones aparecen en orden Cabecera, Detalle de compra y Totales al final, y nunca se muestra una tarjeta de totales vacía.
3. **Dado** el detalle de una OC, **Cuando** el usuario lo abre, **Entonces** ve la barra de progreso de estados, la línea de tiempo vertical del historial, la tarjeta de totales y solo las acciones permitidas como botones destacados.
4. **Dado** una OC en cualquier estado, **Cuando** el usuario imprime, **Entonces** obtiene un documento formal con logotipo y datos del módulo, folio destacado (folio OC `OC-0001`; si no está emitida, el N° de solicitud `SOL-0001`), datos del proveedor y solicitante, tabla de líneas, totales y espacio para firma del aprobador.

---

### Historia de Usuario 4 - Maestros y formularios con presentación consistente (Prioridad: P3)

Como usuario que consulta proveedores, productos y formularios, quiero vistas alternativas y controles visuales coherentes, para reconocer información de un vistazo y capturar datos con menos fricción.

**Por qué esta prioridad**: Mejora la consistencia y la lectura de los maestros, pero depende de la identidad y del armazón definidos en las historias anteriores.

**Prueba independiente**: Se puede validar en Proveedores, Productos, Búsqueda y formularios (incluidos los del 006): vista tabla/tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional/Extranjero; barra de stock y etiqueta "Sin stock"; chips seleccionables con select múltiple original oculto y sincronizado; controles con el estilo del sistema.

**Escenarios de Aceptación**:

1. **Dado** el listado de proveedores, **Cuando** el usuario alterna la vista, **Entonces** puede elegir entre tabla y tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional o Extranjero.
2. **Dado** un producto con stock mayor que cero, **Cuando** se muestra en el listado, **Entonces** aparece una barra de nivel de stock; si el stock es cero, **Entonces** aparece la etiqueta "Sin stock".
3. **Dado** un formulario con rubros (por ejemplo `supplier-rubros` y `search-rubros`), **Cuando** el usuario selecciona rubros, **Entonces** lo hace mediante chips seleccionables mientras el select múltiple original se mantiene oculto y sincronizado, y el resto de los selectores y campos mantiene el estilo del sistema.
4. **Dado** el formulario de producto y la ficha del proveedor en Búsqueda definidos en 006, **Cuando** se aplica el rediseño, **Entonces** la tabla de proveedores y precios cabe en el panel lateral sin cortarse (en móvil, filas apiladas) y se preservan la ficha del proveedor y la ayuda de Moneda.

---

### Historia de Usuario 5 - Accesibilidad, movimiento y adaptabilidad (Prioridad: P3)

Como usuario con distintas capacidades y dispositivos, quiero una interfaz accesible y adaptable, para operar el módulo con teclado, con movimiento reducido y en pantallas de cualquier tamaño.

**Por qué esta prioridad**: Es un requisito transversal de calidad y cumplimiento; se aplica sobre todos los rediseños y puede validarse de forma independiente.

**Prueba independiente**: Se puede validar con auditoría de contraste, navegación por teclado, emulación de `prefers-reduced-motion`, `prefers-color-scheme` y vistas en anchos medianos y pequeños.

**Escenarios de Aceptación**:

1. **Dado** cualquier pantalla, **Cuando** se audita el contraste, **Entonces** el texto cumple al menos 4,5:1 y el foco es visible.
2. **Dado** un usuario que navega solo con teclado, **Cuando** recorre controles, menús y acciones, **Entonces** puede operar toda la interfaz sin ratón.
3. **Dado** una preferencia de movimiento reducido, **Cuando** se abren paneles o se muestran notificaciones, **Entonces** las transiciones se atenúan o desactivan.
4. **Dado** una pantalla mediana, **Cuando** se muestra la navegación, **Entonces** la barra lateral aparece contraída; en pantallas pequeñas, **Entonces** se usa un menú desplegable y las tablas se convierten en tarjetas apiladas.
5. **Dado** la preferencia de presentación del usuario, **Cuando** activa el modo oscuro, **Entonces** la preferencia se guarda en `localStorage`; si no hay preferencia guardada, **Entonces** el módulo sigue la del sistema (`prefers-color-scheme`).

---

### Casos Límite

- ¿Qué muestra el Panel cuando no hay OC, gastos o proveedores registrados? Debe mostrar estados vacíos claros, sin gráficos engañosos ni errores.
- ¿Qué ocurre si una OC no tiene aprobador registrado al imprimir? Debe conservar el espacio de firma con una indicación explícita de ausencia.
- ¿Cómo se comportan los gráficos y el ranking cuando hay menos de 5 proveedores o menos de 6 meses de historia? Deben adaptarse a los datos disponibles sin inventar valores.
- ¿Cómo se calcula el gasto por mes y el top 5 de proveedores cuando hay OC en distintas monedas? Debe sumar el total de las OC emitidas (aprobado y recibido) por fecha de emisión, separado por moneda, sin convertir monedas.
- ¿Qué sucede con una OC sin líneas de detalle? El formulario no debe mostrar una tarjeta de totales vacía.
- ¿Cómo se leen tablas convertidas en tarjetas apiladas con muchos campos? Deben mantener etiquetas de campo para no perder contexto.
- ¿Qué ocurre en modo oscuro con colores de estado y de acción? Deben mantener contraste AA y distinción entre estados.
- ¿Cómo se comportan las microinteracciones si el sistema tiene movimiento reducido? Deben desactivarse o acortarse sin ocultar información.
- ¿Qué pasa si el usuario usa lectores de pantalla con los gráficos? Debe existir texto alternativo o tabla equivalente asociada.

## Requisitos *(obligatorio)*

### Alcance y Restricciones de Preservación

- **FR-001**: El rediseño MUST limitarse a la presentación visual (HTML, CSS y JavaScript propio de interfaz) del módulo de Compras, sin frameworks ni librerías en todo el módulo; los gráficos MUST implementarse en SVG propio.
- **FR-002**: El rediseño MUST NOT cambiar funcionalidades, reglas de negocio, permisos, flujo de estados ni modelo de datos definidos en los specs 001 a 004 y 006. Debe preservar, entre otros: listas de precios en el formulario de producto, folios `SOL-`/`OC-`, filtro de estado con nombres únicos del 006, ficha del proveedor en Búsqueda, costo unitario no editable con lista de precios y ayuda de Moneda.
- **FR-003**: Todas las pruebas automatizadas existentes MUST pasar SIN modificarlas. Es obligatorio conservar todos los `id` y atributos `data-*` del HTML que usan las pruebas.
- **FR-004**: Los gráficos, rankings e indicadores MUST leer únicamente datos ya existentes, sin crear, inferir ni persistir datos nuevos del dominio. Gasto por mes y top 5 de proveedores MUST calcularse como la suma del total de las OC emitidas (aprobado y recibido) por fecha de emisión, separado por moneda, sin convertir monedas.

### Identidad Visual y Tokens

- **FR-005**: El módulo MUST adoptar la identidad "panel de operaciones de compras": barra lateral azul petróleo oscuro (#0F2A3D), fondo gris muy claro y acción principal ámbar (#F59E0B) con texto oscuro que cumpla contraste.
- **FR-006**: Cada estado MUST tener un color propio, distinguible y accesible, además de una etiqueta textual que no dependa solo del color. Los nombres de las insignias MUST ser específicos e iguales a los del filtro del 006: "Solicitud – Borrador", "Solicitud – Pendiente de aprobación", "OC emitida – Aprobada", "OC – Recibida", "Cancelada".
- **FR-007**: Los títulos MUST usar la tipografía Space Grotesk y el texto general Inter, incluidas en el proyecto como archivos `.woff2` locales, con fuentes del sistema de respaldo; nada se carga desde internet.
- **FR-008**: Los montos y cantidades MUST usar números tabulares para alinear dígitos.
- **FR-009**: Los colores, tipografías, espaciados, radios y sombras MUST definirse como tokens reutilizables y aplicarse de forma consistente en todo el módulo.

### Pantalla de Ingreso y Armazón de la Aplicación

- **FR-010**: La pantalla de ingreso MUST dividirse en dos mitades: un panel de marca con nombre del módulo, lema y patrón gráfico SVG, y el formulario de ingreso al otro lado.
- **FR-011**: Las tarjetas de "Usuarios de prueba" MUST mostrar cargo e ícono y MUST permitir ingresar con un solo clic usando el mismo `login()` definido en 004.
- **FR-012**: La barra lateral MUST agrupar la navegación en Operación (Panel y "Solicitudes y Órdenes de Compra" como una sola entrada, 003 FR-067), Maestros (Proveedores, Productos) y Herramientas (Búsqueda y una entrada "Reportes" reservada, oculta o deshabilitada hasta que el 007 la implemente), y MUST poder contraerse a íconos.
- **FR-013**: La barra superior MUST mostrar breadcrumbs de la ruta actual, un buscador global que solo navega a la vista Búsqueda existente con el texto escrito (sin agregar búsquedas nuevas), un espacio reservado para la campana de notificaciones (oculto o deshabilitado hasta 007) y un menú de usuario con avatar de iniciales, cargo y cierre de sesión.
- **FR-014**: El módulo MUST ofrecer un interruptor de modo oscuro que preserve la legibilidad y el contraste AA. La preferencia de presentación MUST guardarse en `localStorage`; si no hay preferencia guardada, MUST seguir la del sistema (`prefers-color-scheme`).

### Panel de Control

- **FR-015**: El Panel MUST mostrar tarjetas de indicadores con ícono, número grande y detalle secundario.
- **FR-016**: El Panel MUST mostrar un gráfico de OC por estado y un gráfico de gasto por mes de los últimos 6 meses, dibujados en SVG propio.
- **FR-017**: El Panel MUST mostrar un ranking de los 5 proveedores con mayor monto.
- **FR-018**: El Panel MUST mostrar la lista "Requiere tu atención" según el rol de 004: Gerente y Administrador (solicitudes pendientes de aprobar), Bodeguero (OC aprobadas por recibir y atrasadas), Comprador (sus borradores) y Consulta (OC atrasadas en solo lectura). La definición de esta consulta MUST ser reutilizable por la bandeja de notificaciones del 007.

### Órdenes de Compra

- **FR-019**: El listado de OC MUST permitir alternar entre vista de tabla y vista de tablero por columnas de estado, siendo el tablero de solo lectura y sin arrastrar tarjetas.
- **FR-020**: El formulario de OC MUST presentar las secciones en orden Cabecera, Detalle de compra y Totales al final.
- **FR-021**: El formulario de OC MUST NOT mostrar una tarjeta de totales vacía.
- **FR-022**: El detalle de OC MUST mostrar una barra de progreso de estados, una línea de tiempo vertical con el historial, una tarjeta de totales y las acciones permitidas como botones destacados.
- **FR-023**: La impresión de la OC MUST producir un documento formal con encabezado de logotipo y datos del módulo, folio destacado (folio OC `OC-0001`; si no está emitida, el N° de solicitud `SOL-0001`), datos del proveedor y del solicitante, tabla de líneas, totales y espacio para firma del aprobador.

### Proveedores, Productos y Formularios

- **FR-024**: Proveedores MUST permitir alternar entre vista de tabla y vista de tarjetas con avatar de iniciales, chips de rubro y etiqueta Nacional o Extranjero.
- **FR-025**: Productos MUST mostrar un indicador visual de nivel de stock con barra y la etiqueta "Sin stock" cuando el nivel sea cero.
- **FR-026**: Los formularios MUST reemplazar visualmente la lista de selección múltiple de rubros por chips seleccionables, manteniendo el select múltiple original (`supplier-rubros`, `search-rubros` y equivalentes) oculto y sincronizado con los chips, y MUST mantener el estilo del sistema en selectores y campos. La tabla de proveedores y precios en el formulario de producto (006) MUST caber en el panel lateral sin cortarse (en móvil, filas apiladas).

### Interacción, Accesibilidad y Adaptabilidad

- **FR-027**: Las transiciones de paneles, notificaciones y hover MUST ser suaves y MUST respetar `prefers-reduced-motion`.
- **FR-028**: El módulo MUST cumplir WCAG 2.1 AA: contraste mínimo 4,5:1, foco visible, operabilidad total con teclado y texto alternativo o tabla equivalente para gráficos.
- **FR-029**: En pantallas medianas la barra lateral MUST aparecer contraída; en pantallas pequeñas MUST usar menú desplegable y convertir tablas en tarjetas apiladas.
- **FR-030**: El rediseño MUST mantener los presupuestos de rendimiento ya definidos para el proyecto.

### Entidades Clave *(incluir si la funcionalidad involucra datos)*

Este rediseño no crea ni modifica entidades del dominio. Reutiliza, solo para lectura y presentación, las entidades existentes de los specs 001–004 y 006:

- **Orden de Compra**: Documento con folio (`SOL-`/`OC-`), proveedor, solicitante, líneas de detalle, totales, estado, historial y datos de emisión/aprobación/recepción.
- **Proveedor**: Maestro con identificación, rubro, clasificación Nacional/Extranjero y ficha consultable en Búsqueda (006).
- **Producto**: Maestro con nivel de stock, datos de catálogo y listas de precios por proveedor en el formulario (006).
- **Solicitud de Compra**: Solicitud previa a la OC, con estado de aprobación.
- **Usuario**: Actor con rol (004), iniciales y permisos ya definidos.
- **Preferencia de presentación (UI)**: Ajuste visual del cliente (modo oscuro) guardado en `localStorage` o derivado de `prefers-color-scheme`; no forma parte del modelo de datos del dominio.
- **Reserva de estructura 007 (UI)**: Entrada "Reportes" en Herramientas y espacio para campana de notificaciones en la barra superior, ocultos o deshabilitados hasta implementación del 007.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: El 100 % de las pruebas automatizadas existentes pasa SIN modificarlas. Se conservan todos los `id` y atributos `data-*` del HTML que usan las pruebas.
- **SC-002**: El 100 % de las pantallas del módulo usa los tokens visuales definidos, sin colores, tipografías o espaciados fuera del sistema.
- **SC-003**: Todas las combinaciones de texto y fondo evaluadas en las pantallas rediseñadas alcanzan al menos 4,5:1 de contraste y el 100 % de los controles interactivos muestra foco visible.
- **SC-004**: Un usuario puede completar los recorridos principales (ingresar, consultar Panel, revisar OC, alternar vistas y abrir detalle) usando solo teclado.
- **SC-005**: Las vistas en anchos medianos y pequeños no presentan desplazamiento horizontal de página y mantienen todas las acciones accesibles.
- **SC-006**: Con movimiento reducido activado, no se ejecutan transiciones que puedan causar molestia y la información sigue siendo comprensible.
- **SC-007**: Los gráficos cuentan con una alternativa textual o tabla equivalente que comunica los mismos datos.
- **SC-008**: El módulo mantiene los tiempos de carga y respuesta dentro de los presupuestos de rendimiento ya definidos.

## Supuestos

- La excepción del spec 005 está aprobada: el alcance es exclusivamente visual y los specs 001–004 y 006 permanecen como fuente de verdad funcional y de datos.
- No se utilizan frameworks ni librerías en todo el módulo (HTML, CSS y JavaScript propios); gráficos e íconos se implementan como SVG propio.
- Los datos y las rutas existentes son suficientes; no se requieren cambios de backend, API, persistencia ni esquema.
- La navegación de Operación conserva "Solicitudes y Órdenes de Compra" como una sola entrada (003 FR-067); "Reportes" y la campana de notificaciones son reservas de estructura para 007, ocultas o deshabilitadas hasta su implementación.
- El buscador global solo navega a la vista Búsqueda existente con el texto escrito, sin búsquedas nuevas.
- La definición de "Requiere tu atención" por rol (004) es reutilizable por la bandeja de notificaciones del 007.
- El modo oscuro es una preferencia de presentación del usuario (localStorage o `prefers-color-scheme`) y no altera permisos ni datos del dominio.
- La impresión se realiza desde el navegador y reutiliza la información ya visible en la OC/Solicitud.
- Tipografías Space Grotesk e Inter se incluyen como archivos `.woff2` locales con respaldo del sistema; ningún recurso se carga desde internet.
- Los presupuestos de rendimiento y el marco de pruebas existentes se conservan tal como están definidos en el proyecto.
