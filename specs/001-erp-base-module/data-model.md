# Modelo de Datos: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

## Entidad: Entity (registro de datos maestros)

Representa el dato maestro central del módulo (p. ej., cliente, proveedor, artículo) con su identidad fiscal, contacto y condiciones comerciales.

| Campo | Tipo | Descripción | Restricciones |
|---|---|---|---|
| id | string | Identificador interno único del registro de entidad | Obligatorio, generado automáticamente |
| entity_id | string | Identificador público usado para vincular documentos a esta entidad | Obligatorio, generado automáticamente, único |
| name | string | Nombre o razón social de la entidad | Obligatorio, no vacío |
| code | string | Código o clave de negocio que identifica la entidad; en Compras almacena el RUT y se etiqueta "RUT" | Obligatorio, no vacío |
| email | string | Correo electrónico principal de contacto | Opcional; debe tener formato de correo válido si se proporciona |
| phone | string | Teléfono de contacto | Opcional |
| address | string | Dirección fiscal o comercial | Opcional |
| category | string | Clasificación opcional como tipo, grupo o clase | Opcional |
| description | string | Descripción corta o notas | Opcional |
| targetDate | string | Fecha objetivo opcional en formato YYYY-MM-DD; los módulos personalizados definen su significado (p. ej., fecha de vencimiento, fecha de revisión) | Opcional, debe ser una fecha de calendario válida si se proporciona |
| creditLimit | number | Límite de crédito extendido a la entidad en la moneda configurada | Opcional, debe ser un número no negativo |
| paymentTerms | string | Condiciones de pago acordadas (p. ej., contado, neto 30) | Opcional |
| createdAt | string | Marca de tiempo de cuándo se creó la entidad | Obligatorio |
| updatedAt | string | Marca de tiempo de la última actualización de la entidad | Obligatorio |

## Entidad: Document (registro transaccional)

Representa un documento transaccional vinculado a una entidad (p. ej., pedido, factura, contrato), identificado por serie y folio y con desglose económico.

| Campo | Tipo | Descripción | Restricciones |
|---|---|---|---|
| id | string | Identificador único del documento | Obligatorio, generado automáticamente |
| entity_id | string | Identificador de la entidad a la que pertenece este documento | Obligatorio, debe referenciar el entity_id de una entidad existente |
| series | string | Serie del documento (p. ej., FAC, A, NV) que agrupa folios consecutivos | Opcional |
| folio | number | Folio consecutivo que, junto con la serie, forma el número oficial del documento | Obligatorio, debe ser un entero positivo |
| startDate | string | Fecha de inicio en formato YYYY-MM-DD | Obligatorio, debe ser una fecha de calendario válida |
| endDate | string | Fecha de fin en formato YYYY-MM-DD | Obligatorio, debe ser una fecha de calendario válida, debe ser igual o posterior a startDate |
| quantity | number | Cantidad asociada al documento | Opcional, debe ser un entero positivo |
| subtotal | number | Importe antes de descuentos e impuestos | Opcional, debe ser un número no negativo |
| discount | number | Descuento aplicado sobre el subtotal | Opcional, debe ser un número no negativo y no puede superar el subtotal |
| taxAmount | number | Impuesto calculado para el documento | Opcional, debe ser un número no negativo |
| totalAmount | number | Importe total del documento en la moneda configurada | Opcional, debe ser un número no negativo |
| currency | string | Código de moneda para los importes del documento (p. ej., MXN, USD, EUR) | Opcional |
| paymentTerms | string | Condiciones de pago del documento (p. ej., contado, neto 30) | Opcional |
| notes | string | Notas u observaciones libres del documento | Opcional |
| status | string | Estado del documento; texto libre en el módulo base. En Compras se restringe a borrador, pendiente, aprobado, recibido o cancelado | Opcional; en Compras debe pertenecer al ciclo configurado |
| createdAt | string | Marca de tiempo de cuándo se creó el documento | Obligatorio |
| updatedAt | string | Marca de tiempo de la última actualización del documento | Obligatorio |

## Entidad: ModuleConfig

Objeto de configuración cargado al arrancar que adapta el módulo base en un módulo específico.

| Campo | Tipo | Descripción | Restricciones |
|---|---|---|---|
| moduleName | string | Nombre visible del módulo adaptado | Obligatorio, no vacío |
| labels | object | Mapeos de términos como `{ entity: "Proveedor", entities: "Proveedores", document: "Orden de Compra", documents: "Órdenes de Compra", employee: "Empleado", employees: "Empleados", category: "Categoría", categories: "Categorías", product: "Producto", products: "Productos", purchaseOrderLine: "Detalle de compra", purchaseOrderLines: "Detalles de compra" }` | Opcional; en Compras se usan las etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra |
| customFields | array | Definiciones de campos por tipo de registro: `{ target: "entity"\|"document", key, label, type: "text"\|"number"\|"date"\|"select", required: boolean, options?: string[] }` | Opcional; las claves NO DEBEN chocar con nombres de campos base |
| statusLifecycle | object | Estados ordenados y transiciones permitidas para documentos, p. ej., `{ statuses: ["cotización", "pedido", "facturado"], transitions: { cotización: ["pedido"], pedido: ["facturado"], facturado: [] } }` | Opcional |
| theme | object | Opciones de marca, p. ej., `{ accentColor: "#0f62fe" }`; aplicado como propiedad personalizada de CSS en todo el marco del espacio de trabajo | Opcional; accentColor debe ser un color CSS válido o retrocede al predeterminado |

## Reglas de ModuleConfig

- La configuración se carga una vez al arrancar y se aplica en todas las pantallas. La precedencia es: (1) archivo de configuración de Compras válido; (2) si falta o es inválido, valores predeterminados integrados de Compras (etiquetas de Proveedor, Orden de Compra, Empleado, Categoría, Producto y Detalle de compra en singular y plural; ciclo `borrador → pendiente → aprobado → recibido` con cancelación desde `borrador` o `pendiente`; color de acento predeterminado; sin campos personalizados) más un aviso visible del problema. Los términos Entidad/Documento solo se usan en el módulo base sin instancia de Compras y nunca deben mostrarse en Compras.
- Los valores inválidos o conflictivos deben informarse con claridad en lugar de fallar silenciosamente.
- Las claves de campos personalizados no deben chocar con los nombres de campos base (`id`, `entity_id`, `name`, `code`, `email`, `phone`, `address`, `category`, `description`, `targetDate`, `creditLimit`, `paymentTerms`, `series`, `folio`, `startDate`, `endDate`, `quantity`, `subtotal`, `discount`, `taxAmount`, `totalAmount`, `currency`, `notes`, `status`).
- Los valores de campos personalizados se persisten junto a los campos base sin cambios de esquema en el almacenamiento.
- Un ciclo de vida configurado reemplaza la entrada de estado de texto libre; sin uno, el estado permanece como texto libre.

## Reglas de Validación

### Entidad

- Una entidad debe incluir un nombre no vacío.
- Una entidad debe incluir un código no vacío.
- El teléfono, dirección, categoría, descripción y condiciones de pago son opcionales en el módulo base pero deben almacenarse como cadenas recortadas.
- El correo electrónico es opcional pero, cuando está presente, debe tener formato de correo válido.
- El límite de crédito es opcional pero, cuando está presente, debe ser un número no negativo.
- La fecha objetivo es opcional pero, cuando está presente, debe ser una fecha de calendario válida en formato YYYY-MM-DD.
- Un entity_id debe generarse automáticamente y debe ser único entre todas las entidades.

### Documento

- Un documento debe referenciar una entidad existente mediante entity_id.
- Un documento debe incluir un folio entero positivo; la serie es opcional y, cuando existe, se combina con el folio para formar el número oficial del documento (p. ej., `FAC-1001`).
- Un documento debe incluir fechas de inicio y fin válidas; la fecha de fin debe ser igual o posterior a la fecha de inicio.
- La cantidad es opcional y debe ser un entero positivo.
- Subtotal, descuento, impuesto e importe total son opcionales y deben ser números no negativos; el descuento no puede superar el subtotal.
- La aplicación debe normalizar el texto para un comportamiento de búsqueda consistente.

> Nota: el cálculo automático de totales (p. ej., `total = subtotal - descuento + impuesto`) queda como punto de extensión; el módulo base valida cada importe de forma independiente para evitar sorpresas por redondeo.

## Relaciones

- Cada entidad se almacena independientemente y aparece como una única fila en la lista de entidades.
- Cada entidad tiene un entity_id usado para conectarse a sus documentos.
- Cada documento pertenece exactamente a una entidad, vinculada por el entity_id de la entidad.
- Cuando se elimina una entidad, todos los documentos que referencian su entity_id también se eliminan.
- Las operaciones de búsqueda se realizan sobre los registros de entidad almacenados, incluyendo identidad fiscal, contacto y condiciones comerciales.

## Notas de Extensibilidad

- Los módulos personalizados pueden añadir campos específicos del dominio a cualquiera de los dos tipos de registro; los campos base anteriores deben mantener sus nombres y semántica para que el almacenamiento, la validación y la integridad referencial permanezcan intactos.
- El campo `status` es intencionadamente de texto libre a nivel base para que cada módulo personalizado pueda imponer su propio ciclo de vida (p. ej., estados de pedidos, estados de aprobación).
- La unicidad de folio por serie, las partidas de documento (líneas con producto, cantidad y precio) y la numeración automática son puntos de extensión naturales para módulos que los requieran.

# Data Model - Módulo de Adquisiciones y Compras

## Modelo Entidad-Relación (MER)

### Entidades y atributos

| Entidad | Atributo | Tipo | Clave |
|---|---|---|---|
| PROVEEDOR | id_proveedor | string | PK, autogenerado |
| PROVEEDOR | rut | string | Normalizado con guion, único, validado por módulo 11 incluida K |
| PROVEEDOR | nombre | string | |
| PROVEEDOR | categoria | string | Obligatoria |
| PROVEEDOR | condicion_pago | string | Obligatoria |
| PROVEEDOR | email | string | Opcional |
| PROVEEDOR | telefono | string | Opcional |
| PROVEEDOR | direccion | string | Opcional |
| EMPLEADO | id_empleado | string | PK, autogenerado |
| EMPLEADO | nombre | string | |
| EMPLEADO | cargo | string | |
| CATEGORIA | id_categoria | string | PK, autogenerado |
| CATEGORIA | nombre | string | Único sin distinguir mayúsculas |
| PRODUCTO | id_producto | string | PK, autogenerado |
| PRODUCTO | id_categoria | string | FK (CATEGORIA.id_categoria) |
| PRODUCTO | nombre | string | |
| PRODUCTO | unidad_medida | string | |
| PRODUCTO | stock | int | Entero no negativo |
| ORDEN_COMPRA | id_orden_compra | string | PK, autogenerado |
| ORDEN_COMPRA | id_proveedor | string | FK (PROVEEDOR.id_proveedor) |
| ORDEN_COMPRA | id_empleado | string | FK (EMPLEADO.id_empleado) |
| ORDEN_COMPRA | folio | int | Entero positivo, único global |
| ORDEN_COMPRA | fecha_emision | date | Fecha de emisión |
| ORDEN_COMPRA | fecha_entrega | date | Igual o posterior a fecha_emision |
| ORDEN_COMPRA | estado | string | borrador, pendiente, aprobado, recibido o cancelado |
| ORDEN_COMPRA | neto | decimal | Derivado de las líneas; no persistido |
| ORDEN_COMPRA | iva | decimal | 19 % del neto; no persistido |
| ORDEN_COMPRA | total | decimal | neto + IVA; derivado, persistido como totalAmount |
| ORDEN_COMPRA | stock_aplicado | boolean | Por defecto `false`; evita doble aplicación de stock |
| DETALLE_COMPRA | id_orden_compra | string | PK, FK (ORDEN_COMPRA.id_orden_compra) |
| DETALLE_COMPRA | id_producto | string | PK, FK (PRODUCTO.id_producto) |
| DETALLE_COMPRA | cantidad | int | Entero positivo |
| DETALLE_COMPRA | costo_unitario | decimal | Número no negativo |
| DETALLE_COMPRA | subtotal | decimal | Derivado (`cantidad × costo_unitario`); NO persistido |

Los identificadores `id_*` son cadenas autogeneradas, no enteros. El folio de la orden es entero positivo y único a nivel global; Compras no usa series. El subtotal de cada línea de detalle es un valor derivado y no se almacena. `stock_aplicado` comienza en `false` y pasa a `true` cuando la recepción aplica stock por primera vez.

### Relaciones y cardinalidades

| Entidad de origen | Cardinalidad | Entidad relacionada | Cardinalidad | Descripción |
|---|---:|---|---:|---|
| PROVEEDOR | 1 | ORDEN_COMPRA | 0..N | Un proveedor puede tener cero o muchas órdenes de compra; cada orden corresponde a un proveedor. |
| EMPLEADO | 1 | ORDEN_COMPRA | 0..N | Un empleado puede registrar cero o muchas órdenes de compra; cada orden la registra un empleado. |
| CATEGORIA | 1 | PRODUCTO | 0..N | Una categoría puede clasificar cero o muchos productos; cada producto pertenece a una categoría. |
| PRODUCTO | 1 | DETALLE_COMPRA | 0..N | Un producto puede aparecer en cero o muchos detalles de compra; cada detalle corresponde a un producto. |
| ORDEN_COMPRA | 1 | DETALLE_COMPRA | 1..N | Una orden contiene uno o más detalles de compra; cada detalle pertenece a una orden. |

La clave primaria de `DETALLE_COMPRA` es compuesta por `id_orden_compra` e `id_producto`.

### Mapeo a entidades base

| Concepto de Compras | Almacenamiento base | Mapeo |
|---|---|---|
| Proveedor | `erp_base_module:entities` | `nombre`→`name`; `rut`→`code` (etiquetado "RUT"); `categoria`→`category`; `condicion_pago`→`paymentTerms`; `id` y `entity_id` son cadenas autogeneradas |
| Orden de Compra | `erp_base_module:documents` | `id`, `entity_id`, `folio`; `fecha_emision`→`startDate`; `fecha_entrega`→`endDate`; `estado`→`status`; `total`→`totalAmount`; `stock_aplicado` se persiste como extensión de Compras |
| Detalle de Compra | `erp_purchasing:purchase-order-lines` | `id_orden_compra`, `id_producto`, `cantidad`, `costo_unitario`; el `subtotal` es derivado y no se persiste |

### Reglas de la instancia Compras

- Todo proveedor debe tener `nombre`, `rut`, `categoria` y `condicion_pago` no vacíos.
- El `rut` se almacena en `code`, se normaliza eliminando puntos y espacios, insertando un guion antes del dígito verificador, convierte la letra verificadora a mayúscula, se valida con módulo 11 (incluida K) y debe ser único tras la normalización.
- Los campos base `description`, `targetDate` y `creditLimit` no se usan en Compras; `code` se usa para el RUT y `category`/`paymentTerms` son obligatorios en la instancia Compras.
- Toda orden debe referenciar un proveedor y un empleado existentes, tener folio entero positivo y único global, fechas válidas con `fecha_entrega >= fecha_emision` y al menos una línea de detalle.
- Una orden está atrasada si `fecha_entrega` es anterior a la fecha actual local (America/Santiago) y su estado no es recibido ni cancelado; una entrega de hoy no está atrasada.
- Cada línea debe referenciar un producto existente, tener cantidad entera positiva y costo unitario no negativo; no se permiten dos líneas con el mismo producto en una orden.
- El subtotal de línea es `cantidad × costo_unitario` y no se persiste. El neto es la suma de subtotales, el IVA es el 19 % del neto y el total es neto + IVA, con redondeo a dos decimales.
- Los estados permitidos son `borrador`, `pendiente`, `aprobado`, `recibido` y `cancelado`. Las transiciones son `borrador → pendiente`, `pendiente → aprobado` y `aprobado → recibido`; la cancelación solo se permite desde `borrador` o `pendiente`.
- Al pasar a `recibido`, el stock de cada producto aumenta según la cantidad de su línea. La operación es idempotente mediante `stock_aplicado`, que comienza en `false` y evita una segunda aplicación.
- Las órdenes en estado `recibido` o `cancelado` son inmutables: no admiten edición de cabecera ni de líneas.
- Eliminar un proveedor elimina en cascada sus órdenes y las líneas de esas órdenes. Eliminar una orden elimina sus líneas.
- La eliminación de un empleado, categoría o producto referenciado por una orden se bloquea con una explicación.