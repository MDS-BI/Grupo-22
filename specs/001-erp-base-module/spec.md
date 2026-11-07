# Especificación de la Funcionalidad: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama de la funcionalidad**: 001-erp-base-module  
**Creada**: 2026-07-08  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Construir un módulo base de software de planificación de recursos empresariales (ERP) que pueda extenderse en módulos ERP personalizados. Debe proporcionar gestión de datos maestros (entidades) y documentos transaccionales vinculados con capacidades de crear/editar/eliminar/buscar."

## Propósito

Este proyecto sirve como módulo base reutilizable para construir módulos ERP personalizados. Establece los patrones comunes que todo módulo ERP necesita: gestionar registros de datos maestros (**Entidades**) y sus **Documentos** transaccionales asociados, con navegación, validación, persistencia y búsqueda ya implementadas, de modo que los módulos personalizados solo necesiten definir sus campos y reglas específicos del dominio.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Registrar y mantener proveedores (Prioridad: P1)

Como agente de compras, quiero registrar, editar, visualizar y eliminar la información de los proveedores (RUT/identificador, razón social, contacto y categoría), para mantener una base de datos maestra centralizada y actualizada para la gestión de adquisiciones de la empresa.

**Por qué esta prioridad**: El proveedor es la entidad maestra principal del módulo de compras. Sin un registro actualizado de proveedores, el sistema no puede emitir órdenes de compra ni vincular operaciones transaccionales.

**Prueba Independiente**: Un agente de compras puede navegar a la pantalla de gestión, crear un nuevo proveedor con sus campos obligatorios, modificar sus datos existentes, eliminar un registro sin documentos vinculados y verificar que los cambios se reflejan inmediatamente en la lista.

**Escenarios de Aceptación**:

1. **Dado** que el agente de compras está en el formulario de gestión de proveedores, **cuando** ingresa una nueva entidad con RUT/código, razón social y contacto válidos, **entonces** el sistema guarda el proveedor y lo muestra en el registro maestro.
2. **Dado** que el agente está creando o editando un proveedor, **cuando** deja en blanco un campo obligatorio (como RUT o razón social), **entonces** el sistema bloquea el guardado y muestra un mensaje indicando los datos requeridos.
3. **Dado** un proveedor existente, **cuando** el agente actualiza su información de contacto o dirección y confirma la acción, **entonces** los datos actualizados se guardan de forma inmediata.
4. **Dado** que se intenta registrar un proveedor cuyo RUT o código identificador ya existe en el sistema, **cuando** el usuario intenta guardar, **entonces** el sistema rechaza el duplicado y muestra una alerta de error.
5. **Dado** un proveedor registrado que no posee órdenes de compra asociadas, **cuando** el agente solicita su eliminación y confirma la acción, **entonces** el proveedor se elimina del sistema.
---

### Historia de Usuario 2 - Emitir órdenes de compra asociadas a un proveedor (Prioridad: P1)

Como agente de compras, quiero crear, editar y eliminar órdenes de compra vinculadas a un proveedor, para registrar cada adquisición junto al proveedor que la abastece.

Por qué esta prioridad: La orden de compra es el documento transaccional central del proceso. Sin ella el módulo solo sería un directorio de proveedores.

Prueba Independiente: Un agente selecciona un proveedor en la pantalla de gestión, crea una OC con número, fecha de emisión y monto, la edita y verifica que queda asociada a ese proveedor.

Escenarios de Aceptación:

1. **Dado** un proveedor existente, cuando el agente crea una orden de compra con número, fecha de emisión y monto, entonces la OC se guarda asociada exactamente a ese proveedor.
2. **Dado** que el agente está creando una OC, cuando deja en blanco el número o el monto, entonces el sistema impide guardar y explica qué información se requiere.
3. **Dada** una OC existente, cuando el agente selecciona su proveedor en la pantalla de gestión, entonces los detalles de la OC se muestran en la vista de gestión de Órdenes de Compra.
4. **Dado** que el agente registra una fecha de entrega anterior a la fecha de emisión, cuando intenta guardar, entonces el sistema rechaza el registro con una explicación clara.
---

### Historia de Usuario 3 - Panel de control de compras (Prioridad: P1)

Como gerente de compras, quiero un panel de inicio con el total de proveedores y órdenes de compra y con accesos rápidos a las tareas clave, para conocer el estado del área de un vistazo y derivar trabajo sin perder tiempo navegando.

Por qué esta prioridad: El panel es el punto de entrada del módulo. Le da a la gerencia visibilidad inmediata del volumen de operación.

Prueba Independiente: El gerente abre la aplicación, ve las tarjetas con el número de proveedores y de OC, y desde una acción rápida abre directamente el formulario de nueva OC.

Escenarios de Aceptación:

Dado que el gerente abre la aplicación, cuando carga el panel, entonces se muestran acciones rápidas para Nuevo Proveedor, Nueva Orden de Compra, Gestionar Proveedores y Buscar.
Dados proveedores y órdenes de compra almacenados, cuando el gerente ve el panel, entonces las tarjetas de estadísticas muestran el recuento actual de cada uno.
Dado que un agente creó o eliminó órdenes de compra, cuando el gerente vuelve al panel, entonces las estadísticas reflejan el cambio.
Dado que no existen registros, cuando se muestra el panel, entonces las tarjetas indican cero sin errores.

---

### Historia de Usuario 4 - Buscar proveedores y fechas de entrega comprometidas (Prioridad: P2)

Como jefe de inventario, quiero buscar proveedores por nombre, RUT, categoría o fecha de entrega comprometida, para saber rápidamente quién abastece un insumo y cuándo debo esperar la recepción en bodega.

Por qué esta prioridad: Facilita la planificación de bodega y el seguimiento de quiebres de stock, pero no es indispensable para registrar compras.

Prueba Independiente: El jefe de inventario abre la pantalla de búsqueda desde la barra lateral, busca la categoría “insumos eléctricos” y ve solo los proveedores coincidentes con su fecha objetivo visible.

Escenarios de Aceptación:

1. Dado que el jefe de inventario está en la pantalla de búsqueda, cuando introduce un nombre, RUT o categoría, entonces solo se muestran los proveedores coincidentes.
2. Dados proveedores con fecha objetivo de entrega registrada, cuando se muestran en los resultados, entonces la fecha es identificable de un vistazo.
3. Dada una búsqueda sin coincidencias, cuando se envía, entonces se muestra un estado vacío claro y puede intentar de nuevo.
4. Dados cientos de proveedores almacenados, cuando busca, entonces los resultados aparecen sin retraso perceptible.

---

### Historia de Usuario 5 - Controlar el ciclo de vida de la orden de compra (Prioridad: P1)

Como gerente de compras, quiero monitorear una orden de compra de forma en la que esta siga un orden definido por etapas (Solicitada, Cotizada, Aprovada, Recibida, Cerrada) de manera en la que no se determine el ciclo como recibido o cerrado sin tener aprobación previa.

**Por qué esta prioridad**: Otorga gobernanza, trazabilidad y reduce el riesgo de fraude en el proceso de compras. Sin embargo, la operación básica puede funcionar inicialmente permitiendo cambios de estado libres.

**Prueba Independiente**: Un usuario intenta cambiar una orden de compra en estado “Solicitada” directamente a “Aprobada” o “Recibida”; el sistema bloquea la acción, muestra una alerta explicativa y solo habilita la transición hacia “Cotizada”.

**Escenarios de Aceptación**:

1. **Dado** que una orden de compra está en un estado determinado, cuando un usuario intenta modificar su estado, **entonces** el sistema solo despliega como opciones elegibles las transiciones válidas del flujo.   
2. **Dada** una orden de compra en estado “Solicitada” o “Cotizada”, cuando se intenta forzar el estado a “Recibida” o “Cerrada”, **entonces** el sistema rechaza la operación y notifica que se requiere la aprobación previa.   
3. **Dada** la lista o vista general de órdenes de compra, cuando el gerente de compras ingresa a gestionarlas, **entonces** el estado actual de cada documento se destaca visualmente con una etiqueta o indicador claro.

---

### Historia de Usuario 6 - Configurar perfil del módulo de compras (Prioridad: P2)

Como administrador del sistema, quiero configurar las opciones generales, roles y permisos del módulo de compras, para controlar qué puede hacer cada integrante del equipo y mantener el flujo de adquisiciones ordenado.

**Por qué esta prioridad**: Es clave para la gestión del ERP, ya que permite definir las atribuciones de los usuarios antes de que comiencen a emitir órdenes o gestionar proveedores.

**Prueba Independiente**: El administrador entra al panel de configuración del módulo, modifica los permisos de un rol (o un parámetro global), guarda los cambios y verifica en la pantalla que los ajustes quedaron registrados correctamente.

**Escenarios de Aceptación**:

1. **Dado** que estoy en la pantalla de configuración de perfil del módulo de compras, **cuando** creo o edito un rol de usuario (agente, gerente o jefe de inventario), **entonces** el sistema guarda los permisos asignados sin errores.
2. **Dado** que estoy definiendo los accesos del módulo, **cuando** habilito o restringo una sección específica para un rol, **entonces** el sistema actualiza la vista permitida para esos usuarios.
3. **Dado** que establezco parámetros del módulo, **cuando** configuro un límite presupuestario o tope de compra por rol, **entonces** el sistema valida esos límites al momento de operar.
4. **Dado** que guardo la configuración, **cuando** confirmo los cambios en la interfaz, **entonces** el sistema muestra un mensaje de éxito y actualiza los datos.

---


---

### Casos Límite

- ¿Qué ocurre cuando un usuario intenta guardar una entidad sin nombre o código obligatorio?
- ¿Cómo gestiona el sistema una búsqueda que no devuelve coincidencias?
- ¿Qué ocurre si un usuario intenta editar o eliminar una entidad que ya no existe?
- ¿Qué ocurre cuando un usuario introduce una fecha objetivo que no es una fecha de calendario válida?
- ¿Qué ocurre con los documentos de una entidad cuando esta se elimina?
- ¿Qué ocurre cuando un usuario introduce una fecha final anterior a la fecha inicial en un documento?
- ¿Qué ocurre cuando la configuración declara un campo personalizado cuya clave choca con un nombre de campo base?
- ¿Qué ocurre cuando la configuración referencia un tipo de campo desconocido o una definición de transición de ciclo de vida inválida?
- ¿Qué ocurre cuando los registros almacenados contienen valores de campos personalizados que ya no están declarados en la configuración?
- ¿Qué ocurre cuando un usuario abre la aplicación directamente en la pantalla de gestión o búsqueda (p. ej., vía enlace profundo o recarga del navegador) sin pasar por el panel de inicio?
- ¿Qué ocurre cuando un usuario pulsa el botón atrás del navegador estando en la pantalla de gestión o búsqueda?
- ¿Qué ocurre si un usuario navega fuera de la pantalla de gestión mientras un formulario aún tiene cambios sin guardar?
- ¿Permanecen intactas las entidades y los documentos al navegar entre el panel, la gestión y la búsqueda?
- ¿Qué ocurre cuando el panel se abre con cero entidades o cero documentos (valores estadísticos)?
- ¿Qué ocurre cuando el color de acento configurado no es un valor de color válido?
- ¿Cómo mantiene la barra lateral contraída las etiquetas de módulo accesibles en ventanas gráficas estrechas?

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: El sistema DEBE permitir a los usuarios crear un registro de entidad con al menos un nombre y un código.
- **FR-002**: El sistema DEBE permitir a los usuarios editar los detalles de un registro de entidad existente.
- **FR-003**: El sistema DEBE permitir a los usuarios eliminar un registro de entidad existente.
- **FR-004**: El sistema DEBE permitir a los usuarios buscar registros de entidad por nombre, código, categoría u otras palabras clave descriptivas.
- **FR-005**: El sistema DEBE mostrar una lista clara de entidades e indicar cuándo ningún resultado coincide con una búsqueda.
- **FR-006**: El sistema DEBE presentar retroalimentación clara cuando falta información obligatoria o no se puede completar una acción.
- **FR-007**: El sistema DEBE mantener los datos de entidad consistentes tras operaciones de creación, edición y eliminación.
- **FR-008**: El sistema DEBE permitir a los usuarios añadir, editar y eliminar detalles de documentos de una entidad.
- **FR-009**: El sistema DEBE asociar cada documento exactamente a una entidad y eliminar los documentos asociados cuando la entidad se elimina.
- **FR-010**: El sistema DEBE mostrar un panel de inicio como vista inicial, con botones de acción rápida claramente etiquetados para las tareas ERP clave.
- **FR-011**: El sistema DEBE envolver cada pantalla en un marco de espacio de trabajo persistente compuesto por una barra superior con marca y una barra lateral de navegación de módulos.
- **FR-012**: La barra lateral DEBE proporcionar botones de módulo para Panel, Entidades, Documentos y Buscar, etiquetados desde la configuración del módulo.
- **FR-013**: El botón de módulo Entidades DEBE mostrar el contenido de gestión de entidades.
- **FR-014**: El botón de módulo Documentos DEBE mostrar el contenido de gestión de documentos en la pantalla de gestión.
- **FR-015**: El botón de módulo Panel DEBE devolver al usuario al panel de inicio.
- **FR-016**: La pantalla de gestión NO DEBE mostrar la lista de entidades.
- **FR-017**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar entidades.
- **FR-018**: La pantalla de gestión DEBE proporcionar la funcionalidad de crear, editar y eliminar documentos.
- **FR-019**: El sistema DEBE navegar a una pantalla de búsqueda dedicada cuando se selecciona el botón Buscar en la barra lateral.
- **FR-020**: La pantalla de búsqueda DEBE permitir buscar entidades por nombre, código, categoría, descripción o fecha objetivo.
- **FR-021**: La pantalla de búsqueda DEBE ser accesible tanto desde la barra lateral como desde la acción rápida de buscar registros del panel.
- **FR-022**: El sistema DEBE mantener los datos de entidades y documentos intactos y consistentes durante la navegación entre pantallas.
- **FR-023**: El sistema DEBE cargar la configuración del módulo al arrancar y aplicarla en todas las pantallas.
- **FR-024**: El sistema DEBE retroceder a los valores predeterminados integrados (terminología Entidad/Documento, sin campos personalizados, sin ciclo de vida) cuando no se proporciona configuración.
- **FR-025**: El sistema DEBE informar claramente de una configuración inválida o conflictiva en lugar de fallar silenciosamente.
- **FR-026**: El sistema DEBE mostrar los campos personalizados declarados en los formularios de creación/edición con tipos de entrada que coincidan con sus tipos declarados.
- **FR-027**: El sistema DEBE validar los valores de campos personalizados, incluidos los obligatorios, antes de guardar, usando la misma experiencia de retroalimentación que la validación base.
- **FR-028**: El sistema DEBE incluir los valores de campos personalizados en los resultados de búsqueda y mostrarlos en listas y vistas de detalle.
- **FR-029**: El sistema DEBE derivar todas las etiquetas visibles para el usuario de la configuración del módulo en lugar de texto fijo en el código.
- **FR-030**: El sistema DEBE aplicar las transiciones de estado configuradas en los documentos independientemente de cómo se envíe un cambio.
- **FR-031**: El sistema DEBE mantener el estado del documento como texto libre cuando no hay ciclo de vida configurado.
- **FR-032**: El sistema DEBE mantener el renderizado de listas y la búsqueda ágiles y correctos para conjuntos de datos de al menos 500 registros de entidad.
- **FR-033**: El panel DEBE ofrecer al menos cuatro botones de acción rápida: nueva entidad, nuevo documento, abrir gestión de entidades y buscar registros.
- **FR-034**: Activar la acción rápida de nueva entidad o nuevo documento DEBE abrir el área de gestión correspondiente con un formulario vacío listo para introducir datos.
- **FR-035**: El panel DEBE mostrar tarjetas de estadísticas con el número de entidades y documentos almacenados, actualizadas cada vez que se muestra el panel.
- **FR-036**: La barra superior DEBE mostrar un logotipo derivado del nombre del módulo junto con el nombre del módulo configurado en cada pantalla.
- **FR-037**: La barra lateral DEBE resaltar visualmente el módulo activo en cada pantalla.
- **FR-038**: La configuración PUEDE definir un color de acento; el sistema DEBE aplicarlo consistentemente en todo el marco y retroceder de forma segura a los valores integrados cuando esté ausente o sea inválido.
- **FR-039**: En ventanas gráficas estrechas, la barra lateral DEBE contraerse a una columna de iconos manteniéndose operable.

### Requisitos de Extensibilidad *(obligaciones del módulo base)*

Los módulos personalizados construidos sobre esta base DEBEN poder:

- **XR-001**: Extender los registros de entidad y documento con campos adicionales específicos del dominio sin cambiar la estructura de almacenamiento base.
- **XR-002**: Reetiquetar pantallas, pestañas, formularios y listas con terminología específica del módulo sin alterar el comportamiento de navegación.
- **XR-003**: Añadir reglas de validación específicas del módulo junto a las reglas de validación base.
- **XR-004**: Apoyarse en el módulo base para generación de identidad, marcas de tiempo, integridad referencial entre entidades y documentos, y eliminación en cascada.
- **XR-005**: Remarcar el espacio de trabajo —nombre del módulo, logotipo derivado y color de acento— únicamente mediante configuración.

### Entidades Clave *(incluir si la funcionalidad implica datos)*

- **Entidad**: Un registro de datos maestros gestionado por el módulo, que incluye su nombre, código de negocio, detalles descriptivos, categoría de clasificación, una fecha objetivo opcional y un entity_id autogenerado. Los módulos personalizados definen qué representa una Entidad en el mundo real (p. ej., cliente, producto, activo).
- **Documento**: Detalles transaccionales adjuntos a una entidad, vinculados a ella por el entity_id de la entidad. Los módulos personalizados definen qué representa un Documento (p. ej., pedido, factura, contrato).
- **ModuleConfig**: El objeto de adaptación cargado al arrancar que define el nombre del módulo, las etiquetas de terminología, las definiciones de campos personalizados y el ciclo de vida de estados de documentos. Consulte data-model.md para su forma completa.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Los usuarios pueden crear una nueva entidad y verla en la lista en menos de 2 minutos.
- **SC-002**: Los usuarios pueden encontrar una entidad existente mediante la búsqueda en menos de 10 segundos tras introducir un término relevante.
- **SC-003**: Al menos el 90% de los usuarios de prueba pueden completar tareas de crear, editar, eliminar y buscar sin ayuda.
- **SC-004**: El sistema sigue siendo utilizable para un conjunto de datos de al menos 500 registros de entidad sin pérdida de funcionalidad central.
- **SC-005**: Un usuario puede alcanzar las pantallas de gestión y búsqueda desde el panel o la barra lateral en menos de 10 segundos en el primer uso.
- **SC-006**: Toda la funcionalidad existente de gestión de entidades y documentos sigue operativa tras el rediseño del marco ERP y el panel (sin regresiones).
- **SC-007**: Los usuarios pueden navegar entre las pantallas de panel, gestión y búsqueda sin perder ninguna entidad ni documento almacenado.
- **SC-008**: Un desarrollador puede producir un módulo adaptado usando solo el archivo de configuración, con cero modificaciones en archivos fuente centrales.
- **SC-009**: Cada pantalla presenta el mismo marco con marca, y los usuarios pueden identificar en qué módulo están de un vistazo.
- **SC-010**: Las estadísticas de registros mostradas en el panel siempre coinciden con el número de entidades y documentos almacenados.

## Suposiciones

- El módulo base gestiona datos para un único espacio de trabajo en lugar de una base de datos multiinquilino compartida.
- La adaptación a un módulo específico se realiza mediante un archivo de configuración del módulo en lugar de editando archivos fuente centrales.
- Cada entidad incluye información básica suficiente para identificación y seguimiento; los módulos personalizados aportan los campos específicos del dominio.
- La versión inicial se centra en la gestión central de datos maestros y documentos en lugar de capacidades ERP avanzadas como flujos de aprobación, períodos de contabilización o informes.
- La búsqueda se realiza sobre los registros de entidad almacenados.
- La pantalla de gestión consolida los formularios de añadir/editar entidad y añadir/editar documento en una sola pantalla de gestión.
- La navegación entre áreas ocurre mediante una barra lateral persistente; la pantalla de gestión aloja ambos paneles de gestión y no muestra la lista de entidades.
- El logotipo se genera como un monograma SVG en línea derivado del nombre del módulo; no se requieren recursos de imagen externos.
- Se puede configurar un color de acento opcional para la marca; el resto de la paleta base permanece fija.
- Solo se muestra una pantalla a la vez; no hay diseño lado a lado del contenido de gestión y búsqueda.
- La navegación entre pantallas se maneja dentro de la aplicación (p. ej., cambio de vistas), y el botón atrás del navegador debe comportarse de forma predecible.
- Los datos siguen persistiéndose en el localStorage del navegador y no se ven afectados por la navegación entre pantallas.
- La pantalla de búsqueda se centra en encontrar y ver entidades; la edición permanece en la pantalla de gestión.
<<<<<<< HEAD
- El contenido del usuario introducido por el usuario (nombres, descripciones, notas de documentos) DEBE sanitizarse antes de renderizarse en el DOM para prevenir ataques de inyección de scripts (XSS). El módulo base DEBE escapar HTML y atributos de eventos al mostrar datos de localStorage.

=======
- El contenido del usuario introducido por el usuario (nombres, descripciones, notas de documentos) DEBE sanitizarse antes de renderizarse en el DOM para prevenir ataques de inyección de scripts (XSS). El módulo base DEBE escapar HTML y atributos de eventos al mostrar datos de localStorage.
>>>>>>> fa1ce0695321737f446693557588fd5628d89be7
