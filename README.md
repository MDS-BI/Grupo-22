# Módulo Base ERP (Vite + JavaScript Vanilla)

Aplicación mínima de una sola página que sirve como módulo base de software de planificación de recursos empresariales (ERP). Proporciona la base común para construir módulos ERP personalizados: gestión de datos maestros (Entidades) y documentos transaccionales vinculados (Documentos), con crear/editar/eliminar/buscar, validación y persistencia en el `localStorage` del navegador, usando Vite y HTML, CSS y JavaScript vanilla.

La interfaz de usuario está totalmente en **español** (términos predeterminados: Entidad / Documento; nombre del módulo: Módulo Base ERP), incluidas las etiquetas, los mensajes de validación, los estados vacíos y los diálogos.

Las entidades incluyen campos estándar de datos maestros ERP (nombre, código, identificación fiscal, correo, teléfono, dirección, categoría, fecha objetivo, límite de crédito, condiciones de pago). Los documentos usan numeración por serie + folio e incluyen un desglose monetario (subtotal, descuento, impuesto, total), moneda, condiciones de pago, notas, cantidad, fechas y estado.

La aplicación se presenta como un espacio de trabajo ERP coherente:

- **Marco del espacio de trabajo**: cada pantalla vive dentro de un marco con marca: una barra superior con un logotipo (un monograma SVG derivado del nombre del módulo) y el nombre del módulo, más una barra lateral persistente con botones de módulo (Panel, Entidades, Documentos, Búsqueda y, en Adquisiciones y Compras, Productos). El módulo activo se resalta (`aria-current="page"`), y la barra lateral se contrae a una columna de iconos en ventanas estrechas.
- **Panel de inicio**: la pantalla de entrada ofrece botones de acción rápida para las tareas ERP clave (nueva entidad, nuevo documento, abrir las áreas de gestión, buscar registros) y tarjetas de estadísticas en vivo con el número de registros.
- **Tokens de diseño**: el estilo se controla mediante propiedades personalizadas de CSS en `src/styles.css`, de modo que los cambios de marca se aplican globalmente.

## Instalación

Instala las dependencias y ejecuta el servidor de desarrollo:

```bash
npm install
npm run dev
```

Abre http://localhost:5173 (o la URL que imprima Vite).

## Pruebas

Ejecuta la suite completa de pruebas (unitarias + de integración) con:

```bash
npm test
```

O una ejecución única, sin modo watch:

```bash
npx vitest run
```

Validación completa antes de cerrar un cambio:

```bash
npm test -- --run
npm run build
npm run lint
```

## Construcción de módulos personalizados

Los módulos ERP personalizados construidos sobre esta base definen:

- Qué representa una **Entidad** (p. ej., cliente, producto, activo) y sus campos específicos del dominio.
- Qué representa un **Documento** (p. ej., pedido, factura, contrato).
- Las etiquetas y reglas de validación propias del módulo.

El módulo base se encarga de la generación de identidad, las marcas de tiempo, la integridad referencial entre entidades y documentos, la eliminación en cascada, la navegación y la búsqueda. Consulta `specs/001-erp-base-module/` para ver la especificación completa.

## Personalización mediante configuración

Toda la personalización vive en un solo lugar: el objeto `userConfig` al inicio de `src/module-config.js`. Los desarrolladores editan esta única exportación; no se requieren cambios en el código central. Opciones disponibles:

- `moduleName`: nombre visible en la barra superior, el panel y el título del documento; también deriva el monograma del logotipo.
- `labels`: renombra los términos Entidad/Documento en todas las pantallas, incluidos los botones de la barra lateral, las acciones rápidas, los formularios y los mensajes. Los artículos y concordancias del español (el/la, seleccionado/a) se derivan de la primera palabra de cada término configurado.
- `customFields`: declara campos adicionales por tipo de registro con `target` (`entity` o `document`), `key`, `label`, `type` (`text`, `number`, `date` o `select`), `required` opcional y `options` para los select. Las claves no deben chocar con los nombres de campos base (ver `specs/001-erp-base-module/data-model.md`). Los valores se persisten junto a los registros y aparecen en los resultados de búsqueda.
- `statusLifecycle`: restringe los estados de los documentos a una lista configurada de `statuses` con `transitions` permitidas entre ellos. Sin él, el estado sigue siendo un campo de texto libre.
- `theme.accentColor`: un color hexadecimal (p. ej., `"#0f62fe"`) aplicado en todo el marco como resaltados y controles principales. Los valores inválidos retroceden al predeterminado.

Si la configuración es inválida (tipos desconocidos, claves incorrectas, transiciones que referencian estados desconocidos, colores de acento no hexadecimales), la aplicación muestra los problemas en un banner y retrocede a los valores predeterminados en lugar de romperse.

## Módulo de Adquisiciones y Compras

El módulo de Adquisiciones y Compras gestiona el proceso de compra de bienes a proveedores dentro del sistema ERP. Permite registrar y dar seguimiento a las órdenes de compra, gestionar el detalle de productos adquiridos, sus cantidades, costos unitarios, el estado de la orden y la recepción de mercancía, actualizando el inventario al momento de recibirla.

### Funcionalidades clave

- **Datos maestros**: Gestión de proveedores, empleados, categorías y productos.
- **Documentos transaccionales**: Órdenes de compra con numeración por serie y folio.
- **Detalle de transacciones**: Líneas con producto, cantidad, costo unitario y cálculo de totales.
- **Control de estados**: Seguimiento del ciclo de vida de las órdenes de compra.
- **Integración con inventario**: Actualización de existencias al recibir la mercancía.
- **Trazabilidad**: Registro de responsable, proveedor, fechas, y relación entre productos, categorías y órdenes de compra.

### Experiencia de uso

- **Barra lateral**: el orden es Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda y Reportes. Cada botón aparece solo si el rol de la sesión puede acceder a su vista.
- **Listas y formularios**: las listas ocupan el ancho disponible y ofrecen `+ Nuevo` cuando el rol puede crear. Los formularios se abren en un panel lateral con secciones y dos columnas (una en móvil), sin convivir con la lista en un layout de dos columnas.
- **Detalle como vista propia**: al activar una fila de una solicitud u orden, la lista y las demás vistas se ocultan y se muestra únicamente el detalle. El botón **Volver a Órdenes de Compra** restaura la lista con sus filtros, orden y foco.
- **Categorías**: la pantalla Productos incluye las secciones **Catálogo** y **Categorías**. En Catálogo se administran productos; en Categorías se pueden crear, editar y eliminar categorías (con unicidad sin distinguir mayúsculas y bloqueo si están referenciadas). El formulario de producto solo permite elegir una categoría existente.
- **Permisos de 004**: las acciones de 003 respetan los roles `administrador`, `gerente`, `comprador`, `bodeguero` y `consulta` tanto en la interfaz como en la revalidación del servicio. Los botones, tarjetas, filtros, datos de demostración y acciones del detalle se ocultan o rechazan cuando el rol no tiene el permiso correspondiente.
- **Filtro Solo mis OC**: en Órdenes de Compra, el rol Comprador puede limitar la lista a las órdenes de su empleado propio. El filtro se combina con estado, proveedor, rango de entrega y atraso, se refleja en el resumen y se restablece con **Limpiar filtros**.
- **Datos de demostración**: la acción **Cargar datos de demostración** crea un conjunto completo y determinista de 8 proveedores, 3 rubros, 5 categorías, 15 productos, 5 usuarios de prueba con empleado propio, 3 áreas con presupuesto y 16 órdenes en todos los estados (incluidas atrasadas y una extranjera en USD). Desde el 007 también trae stock mínimo, precios con tramos por cantidad y proveedores con calificación A, B y C. Si ya existen datos, solicita confirmación y reemplaza el conjunto de forma atómica; cancelar no modifica nada. La pantalla de ingreso muestra la tabla **Usuarios de prueba** solo cuando la demostración está cargada.
- **Listas de precios (006)**: cada producto se vincula al crearlo con uno o más proveedores y el precio acordado con cada uno (solo Gerente y Administrador mantienen las listas). En la orden de compra solo se ofrecen los productos del proveedor elegido y el precio unitario se completa desde la lista, sin poder editarse. La demostración incluye listas de precios coherentes con sus órdenes.
- **Folios automáticos (006)**: la solicitud no pide folio; recibe un número correlativo `SOL-0001` y, al aprobarse, un folio de OC correlativo `OC-0001`.
- **Comprar por producto (007)**: la solicitud nueva parte eligiendo el producto y la cantidad. El sistema muestra los proveedores que lo venden con su precio pactado según el tramo de cantidad, marca el **Mejor precio** y arma un carrito; al guardar crea una solicitud por proveedor. El modo **Por proveedor** sigue disponible.
- **Evaluación de proveedores (007)**: calificación A (≥ 90 % de entregas a tiempo), B (≥ 70 %) o C (menos de 70 %), visible en Proveedores, en la ficha y en Reportes para Gerente y Administrador.
- **Stock mínimo (007)**: cada producto puede tener un mínimo. El Panel muestra **Productos bajo el mínimo** y crea solicitudes sugeridas (hasta el doble del mínimo, con el mejor precio, una por proveedor).
- **Reportes (007)**: gasto de OC emitidas por proveedor, rubro, área o mes, con gráfico y exportación CSV; evaluación de proveedores; áreas y presupuestos mensuales en CLP.
- **Presupuesto por área (007)**: si hay áreas activas, la solicitud pide área. El detalle muestra el presupuesto del mes y al aprobar se advierte si se excede (no bloquea).
- **Notificaciones (007)**: la campana muestra avisos según el rol (por aprobar, por recibir, atrasadas, aprobadas o rechazadas, presupuesto excedido) con contador de no leídos.
- **Mejoras rápidas (007)**: **Duplicar** una orden, **Inactivar** proveedores (no aparecen en solicitudes nuevas) y **Exportar CSV** de Proveedores y de Solicitudes y OC.
- **Ficha del proveedor (006)**: en Búsqueda, un clic en el proveedor abre su ficha con datos, lista de precios, historial de órdenes y monto total comprado (OC emitidas). Los proveedores extranjeros muestran su identificación tributaria extranjera.

## Módulo de Adquisiciones y Compras: Modelo Entidad-Relación (MER)

Esta sección explica, en palabras, el modelo de datos del módulo personalizado de **Adquisiciones y Compras** y cómo funciona sobre el módulo base. El módulo cubre el proceso de comprar bienes a proveedores: a quién se compra, qué se compra, quién registra la compra y cuánto cuesta.

### Diagrama

El diagrama del modelo entidad-relación se encuentra en el archivo: [MER-adquisiciones-compras.txt](MER-adquisiciones-compras.txt)

*Figura: MER del módulo. En referencia al archivo de texto, se identifican los elementos que vienen del módulo base (Proveedor = Entidad, Orden de compra = Documento) y las extensiones propias del módulo (Empleado, Categoría, Producto, Detalle de compra).*

### Las entidades, en palabras

- **Proveedor**: la empresa o persona a quien se le compra. Es el dato maestro del módulo. Tiene un código de negocio y un nombre (ambos obligatorios), además de su identificación fiscal (RUT), correo, teléfono y dirección.
- **Empleado**: la persona de la organización que registra una orden de compra. Guarda su nombre y su cargo.
- **Categoría**: un grupo para organizar los productos (por ejemplo, insumos de oficina o materias primas). Solo tiene un identificador y un nombre.
- **Producto**: el bien que se adquiere. Guarda su nombre, su unidad de medida (unidad, kilo, caja...) y el `stock` disponible. Cada producto pertenece a una categoría.
- **Orden de compra**: el documento transaccional del módulo. Representa un pedido hecho a un proveedor y registrado por un empleado. Se identifica por su folio, tiene una fecha de emisión y una fecha de entrega esperada, un estado (por ejemplo, pendiente o recibido) y un total.
- **Detalle de compra**: cada línea de una orden. Indica qué producto se pide, en qué cantidad y a qué costo unitario. Es la entidad que une las órdenes con los productos.

### Las relaciones y sus cardinalidades

| Relación | Cardinalidad | Cómo se lee |
|---|---|---|
| Proveedor → Orden de compra | 1:N | Un proveedor puede recibir muchas órdenes; cada orden pertenece exactamente a un proveedor. |
| Empleado → Orden de compra | 1:N | Un empleado puede registrar muchas órdenes; cada orden la registra un solo empleado. |
| Orden de compra → Detalle de compra | 1:N (mínimo 1) | Una orden tiene al menos una línea y puede tener varias. |
| Producto → Detalle de compra | 1:N | Un producto puede aparecer en muchas líneas de distintas órdenes. |
| Categoría → Producto | 1:N | Una categoría agrupa muchos productos; cada producto tiene una sola categoría. |

Entre **Orden de compra** y **Producto** existe en realidad una relación de muchos a muchos: una orden incluye varios productos y un producto se compra en varias órdenes. Se resuelve con la entidad intermedia **Detalle de compra**, cuya clave primaria es compuesta: el par (orden, producto) identifica cada línea.

### Cómo se apoya en el módulo base

El módulo base solo conoce dos tipos de registro: **Entidad** y **Documento**. El MER se construye sobre ellos y los amplía donde hace falta.

| En el MER | En el módulo base | Tratamiento |
|---|---|---|
| Proveedor | Entidad | Se usa directamente. Se renombra la etiqueta con `labels`. |
| Orden de compra | Documento | Se usa directamente. Se renombra la etiqueta con `labels` y se controla el estado con `statusLifecycle`. |
| Empleado, Producto y Categoría | Sin equivalente | **Extensión**: son datos maestros adicionales que el base no gestiona. |
| Detalle de compra | Sin equivalente | **Extensión**: el documento base maneja una sola cantidad. La especificación indica que las partidas de documento (líneas con producto, cantidad y precio) son un punto de extensión natural. |

**Correspondencia de campos del Proveedor (Entidad base)**

| Campo del MER | Campo base | Notas |
|---|---|---|
| `entity_id` | `entity_id` | Generado automáticamente y único; es el vínculo con las órdenes. |
| `codigo` | `code` | Obligatorio, no vacío. |
| `nombre` | `name` | Obligatorio, no vacío. |
| `rut` | `taxId` | Opcional; se guarda recortado. |
| `email` | `email` | Opcional; debe tener formato de correo válido. |
| `telefono` | `phone` | Opcional. |
| `direccion` | `address` | Opcional. |

**Correspondencia de campos de la Orden de compra (Documento base)**

| Campo del MER | Campo base | Notas |
|---|---|---|
| `id_orden_compra` | `id` | Generado automáticamente. |
| `entity_id` | `entity_id` | Debe referenciar un proveedor existente. |
| `id_empleado` | Sin equivalente | Vínculo con el empleado; forma parte de la extensión. |
| `folio` | `folio` | Entero positivo obligatorio. |
| `fecha_emision` | `startDate` | Obligatoria, formato `YYYY-MM-DD`. |
| `fecha_entrega` | `endDate` | Obligatoria; igual o posterior a `startDate`. |
| `estado` | `status` | Texto libre, o controlado por `statusLifecycle`. |
| `total` | `totalAmount` | Número no negativo. |

El módulo base ofrece además campos opcionales que este MER no modela, pero que pueden incorporarse si el proceso de compras los necesita: en la entidad, `category`, `description`, `targetDate`, `creditLimit` y `paymentTerms`; en el documento, `series`, `subtotal`, `discount`, `taxAmount`, `currency`, `paymentTerms`, `notes` y `quantity`.

### Cómo funciona el flujo de compra

1. **Se configura el módulo**: en `userConfig` se define el nombre del módulo, se renombran Entidad → Proveedor y Documento → Orden de Compra, y se declara el ciclo de vida de estados.
2. **Se registran los datos maestros**: proveedores (con nombre y código obligatorios), empleados, y las categorías y productos del catálogo.
3. **Se crea una orden de compra**: se elige el proveedor, se indica qué empleado la registra, el folio, la fecha de emisión y la fecha de entrega esperada. El sistema impide guardar si falta el proveedor, el folio o las fechas, o si la fecha de entrega es anterior a la de emisión.
4. **Se agregan las líneas de detalle**: por cada producto se indica la cantidad entera positiva y el costo unitario no negativo. El costo se guarda en la propia línea, de modo que el precio pagado queda como registro histórico aunque después cambie. No se permite repetir un producto dentro de la misma orden.
5. **Se calculan los importes**: el subtotal de cada línea es `cantidad × costo unitario`; el neto es la suma de subtotales, el IVA es el 19 % del neto y el total es `neto + IVA`. Los valores se recalculan al agregar, editar o eliminar una línea y se redondean según el formato monetario CLP.
6. **La orden avanza de estado**: el ciclo canónico es `borrador → pendiente → aprobado → recibido`, con cancelación permitida desde `borrador` o `pendiente`. Solo se muestran las acciones válidas y una transición inválida se rechaza sin modificar la orden ni agregar historial. Una orden sin líneas no puede guardarse ni enviarse a revisión.
7. **Al recibir la mercadería**, el `stock` de cada producto aumenta exactamente una vez según la cantidad de su línea. La recepción es idempotente: un segundo intento informa que el stock ya fue aplicado y no lo duplica. La operación es atómica y registra una transacción recuperable.
8. **Historial e impresión**: cada transición exitosa agrega un registro inmutable con estado anterior, estado nuevo y fecha/hora en `America/Santiago`. La vista de detalle permite imprimir la orden con proveedor, empleado, fechas, estado, líneas, totales e historial, sin navegación ni controles de edición.
9. **Integridad de los datos**: si se elimina un proveedor, el módulo base elimina en cascada sus órdenes de compra y los registros de extensión asociados. La eliminación de productos, empleados o categorías referenciados se bloquea. Eliminar una orden recibida no revierte el stock ya aplicado.

### Configuración sugerida

Ejemplo de `userConfig` para este módulo (los valores son una propuesta; ajustar a los requisitos reales):

```js
export const userConfig = {
  moduleName: "Adquisiciones y Compras",
  labels: {
    entity: "Proveedor",
    entities: "Proveedores",
    document: "Orden de Compra",
    documents: "Órdenes de Compra",
  },
  statusLifecycle: {
    statuses: ["borrador", "pendiente", "aprobado", "recibido", "cancelado"],
    transitions: {
      borrador: ["pendiente", "cancelado"],
      pendiente: ["aprobado", "cancelado"],
      aprobado: ["recibido"],
      recibido: [],
      cancelado: [],
    },
  },
  theme: { accentColor: "#0f62fe" },
};
```

Este ejemplo no declara `customFields`, porque todos los campos del MER son campos base o pertenecen a la extensión. Las claves reservadas de los campos base están listadas en `specs/001-erp-base-module/data-model.md`.

### Decisiones de diseño

- **El total es un dato derivado**: neto = suma de subtotales; IVA = 19 % del neto; total = neto + IVA. Siempre debe coincidir con las líneas de la orden.
- **El costo unitario vive en el detalle**: conserva el precio histórico de cada compra y no se recalcula desde el catálogo.
- **Empleado es una extensión**: el módulo base no gestiona empleados, por lo que se trata como un dato maestro adicional del módulo, igual que productos y categorías. Su vínculo con la orden se guarda en `erp_purchasing:order-metadata`.
- **Producto es compartido con otros módulos**: el módulo de ventas también necesitará productos, por lo que conviene reutilizar una sola definición.
- **Unicidad de folio**: la valida el módulo base; el folio debe ser un entero positivo y único a nivel global.
- **Historial y stock aplicado son datos de extensión**: se guardan en `erp_purchasing:status-history` y `erp_purchasing:order-metadata`, sin modificar el esquema base de documentos.

### Página de visualización del módulo

La página muestra los datos del módulo leyéndolos del `localStorage` (`erp_base_module:entities` y `erp_base_module:documents`). Propuesta de contenido:

- **Con los datos base** (proveedores y órdenes): gasto total por proveedor (suma de `totalAmount` agrupada por `entity_id`), compras por mes (según `startDate`), órdenes por estado y órdenes con entrega próxima o vencida (según `endDate`).
- **Con la extensión** (empleados, líneas, productos y categorías): compras por empleado, productos más comprados y su costo promedio, y stock actual por categoría.

Consideraciones técnicas:

- La especificación exige **sanitizar** todo contenido introducido por el usuario antes de renderizarlo en el DOM (escapar HTML y atributos de eventos) para prevenir ataques XSS. La página de visualización debe cumplirlo al mostrar nombres de proveedores y de empleados.
- El panel y las listas deben seguir siendo ágiles con al menos 500 registros de entidad.
- Las estadísticas deben coincidir siempre con los datos almacenados.

## Autenticación y control de acceso basado en roles (RBAC)

El acceso a la aplicación comienza en una pantalla de inicio de sesión por **User ID**. Al autenticar un identificador registrado, el sistema resuelve el rol del usuario desde el directorio local y despliega únicamente las vistas, acciones y transiciones permitidas para ese perfil.

### Roles incluidos

| Rol | Alcance principal |
|---|---|
| Administrador | Acceso completo a todos los módulos y acciones. |
| Gerente de Compras | Gestión completa de proveedores, órdenes y productos; aprueba, recibe y cancela órdenes. |
| Comprador | Crea y edita proveedores y órdenes, envía a revisión y cancela; no aprueba ni recibe. |
| Bodeguero | Consulta órdenes, recibe mercancía y administra productos y stock; no crea ni edita órdenes. |
| Consulta | Acceso de solo lectura al panel, proveedores, órdenes, productos y búsqueda; puede imprimir órdenes. |

### Usuarios de demostración

| User ID | Nombre | Rol |
|---|---|---|
| `ADMIN-001` | Valentina Ríos | Administrador |
| `GER-001` | Martín Soto | Gerente de Compras |
| `COMP-001` | Camila Vega | Comprador |
| `BOD-001` | Diego Fuentes | Bodeguero |
| `CONS-001` | Ana Pérez | Consulta |

La carga de datos de demostración agrega además un usuario de prueba activo por rol, con identificador estable y un empleado propio vinculado:

| User ID | Cargo |
|---|---|
| `DEMO-ADMIN` | Administrador |
| `DEMO-GERENTE` | Gerente de Compras |
| `DEMO-COMPRADOR` | Comprador |
| `DEMO-BODEGUERO` | Bodeguero |
| `DEMO-CONSULTA` | Consulta |

El directorio se guarda en `erp_auth:users` y la sesión activa en `erp_auth:session`, ambos en `localStorage`. La pantalla de acceso muestra los usuarios disponibles y mantiene la sesión entre recargas. Al cerrar sesión se elimina la sesión y se vuelve a la pantalla de acceso.

## Notas

- Los datos se persisten en `localStorage` bajo las claves `erp_base_module:entities` y `erp_base_module:documents`.
- Eliminar una entidad también elimina sus documentos (cascada).
- Este proyecto usa intencionadamente HTML, CSS y JavaScript vanilla por simplicidad.

### Ajustes post-revisión de autenticación y RBAC

- La denominación del documento depende del estado: `borrador`, `pendiente` y `cancelado` se muestran como **Solicitud de compra**; `aprobado` y `recibido` como **Orden de Compra emitida**. El detalle y la impresión usan la misma etiqueta.
- La fecha de emisión se completa automáticamente al aprobar una solicitud. Mientras el documento no esté aprobado se muestra **Sin emitir**.
- El permiso `orders.reject` separa el rechazo de una solicitud `pendiente` de la cancelación de un `borrador`. El `comprador` conserva `orders.cancel` y `orders.submit`, pero no puede aprobar ni rechazar.
- Para `comprador`, el empleado solicitante se asigna automáticamente por `userId`, queda de solo lectura y se crea una sola vez con el nombre y cargo del Usuario. `administrador` y `gerente` pueden seleccionarlo manualmente.
- El `comprador` no ve el límite de crédito en formularios, listas, tarjetas, filtros, detalle, búsqueda, impresión ni notificaciones. El servicio conserva el valor persistido y rechaza intentos de creación o modificación con `PERMISSION_DENIED`.
- Las guardas de servicio revalidan altas, ediciones, aprobación, rechazo y cancelación sin mutar estado, historial ni stock ante operaciones no autorizadas.
