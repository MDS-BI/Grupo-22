# Modelo de Datos: Extensión de Órdenes de Compra

**Rama**: `002-purchase-order-workflow`
**Fecha**: 2026-11-07
**Especificación**: [spec.md](spec.md)
**Contexto base**: [data-model.md del módulo de Compras](../001-erp-base-module/data-model.md)

## Alcance del Modelo

Esta extensión conserva las entidades del módulo de Compras y añade la información necesaria para operar líneas de detalle, recepción idempotente, historial de estados e impresión. La cabecera de la orden sigue almacenada en la clave base `erp_base_module:documents`; los datos propios de la extensión se guardan en claves separadas para no modificar el esquema ni el comportamiento del módulo base.

## Claves de Persistencia

| Clave | Contenido | Estado |
|---|---|---|
| `erp_base_module:entities` | Proveedores | Existente, sin cambios |
| `erp_base_module:documents` | Cabecera de órdenes de compra | Existente, sin cambios |
| `erp_purchasing:employees` | Empleados | Existente |
| `erp_purchasing:categories` | Categorías | Existente |
| `erp_purchasing:products` | Productos y stock | Existente; se amplía su mantenimiento |
| `erp_purchasing:purchase-order-lines` | Líneas de detalle | Existente |
| `erp_purchasing:order-metadata` | Empleado solicitante y marca de stock aplicado | Nueva |
| `erp_purchasing:status-history` | Historial de cambios de estado | Nueva |
| `erp_purchasing:transactions` | Diario de transacciones de recepción y estado | Nueva |

## Entidades

### Orden de Compra

Documento transaccional del módulo de Compras. Se compone de la cabecera base y un registro de metadatos de extensión.

**Cabecera base** (`erp_base_module:documents`):

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | string | PK autogenerada, única |
| `entity_id` | string | FK a Proveedor; obligatorio |
| `folio` | number | Entero positivo, único global |
| `startDate` | string \| null | Fecha de emisión `YYYY-MM-DD`; `null` en `borrador` o `pendiente`; se asigna automáticamente al pasar a `aprobado` |
| `endDate` | string | Fecha de entrega `YYYY-MM-DD`; capturada con máscara `dd-mm-aaaa` y persistida en ISO; igual o posterior a `startDate` cuando esta exista |
| `status` | string | `borrador`, `pendiente`, `aprobado`, `recibido` o `cancelado`; no se captura manualmente |
| `totalAmount` | number | Total calculado, dos decimales internos |
| `currency` | string | `CLP` para origen Nacional; `USD` o `EUR` para origen Extranjero |
| `paymentTerms` | string | Condición de pago tomada de la lista fija del proveedor; obligatoria |
| `notes` | — | No utilizada en la OC; el formulario no captura notas |
| `quantity` / `subtotal` / `discount` / `taxAmount` | — | No utilizados en la OC; los importes se derivan de las líneas |
| `createdAt` / `updatedAt` | string | ISO 8601 |
| Campos base opcionales | varios | Se conservan sin cambios, salvo los campos indicados como no utilizados |

**Metadatos de extensión** (`erp_purchasing:order-metadata`):

| Campo | Tipo | Restricciones |
|---|---|---|
| `id_orden_compra` | string | PK de la extensión; FK a `documents.id`; único |
| `id_empleado` | string | FK a Empleado; obligatorio |
| `stock_aplicado` | boolean | Por defecto `false`; `true` solo si la orden está recibida |
| `appliedAt` | string \| null | ISO 8601 cuando se aplicó stock; `null` en caso contrario |
| `createdAt` / `updatedAt` | string | ISO 8601 |

**Invariantes**:

- Una orden con estado `recibido` debe tener `stock_aplicado = true`.
- Una orden con `stock_aplicado = true` debe estar en estado `recibido`.
- Una orden sin recepción debe tener `stock_aplicado = false` y `appliedAt = null`.
- Una orden en `borrador` o `pendiente` no debe tener fecha de emisión; una orden en `aprobado` o `recibido` debe tener `startDate` asignada.
- La `currency` debe ser `CLP` para proveedores Nacionales y `USD` o `EUR` para proveedores Extranjeros.
- La `paymentTerms` debe pertenecer a la lista fija de condiciones de pago del proveedor.
- El total persistido debe coincidir con la suma de los subtotales de las líneas más el impuesto correspondiente al origen (19 % para Nacional, 0 % para Extranjero), con dos decimales internos.

### Detalle de Compra

Línea de una orden. Se persiste en `erp_purchasing:purchase-order-lines`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `id_orden_compra` | string | Parte de la PK; FK a Orden de Compra |
| `id_producto` | string | Parte de la PK; FK a Producto |
| `cantidad` | number | Entero positivo |
| `costo_unitario` | number | Número no negativo; valor histórico de la compra |
| `subtotal` | number | Derivado (`cantidad × costo_unitario`); no persistido |

La clave primaria es compuesta por `id_orden_compra` e `id_producto`. No se permiten dos líneas con el mismo producto en una misma orden. El subtotal de línea, el neto, el impuesto y el total son valores derivados de solo lectura; no se capturan ni se editan desde el formulario.

### Producto

Bien adquirido. Se persiste en `erp_purchasing:products`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `id_producto` | string | PK autogenerada, única |
| `nombre` | string | Obligatorio, no vacío |
| `unidad_medida` | string | Obligatorio, no vacío |
| `stock` | number | Entero no negativo; por defecto 0 |
| `id_categoria` | string | FK a Categoría; obligatorio |
| `createdAt` / `updatedAt` | string | ISO 8601 |

### Cambio de Estado

Registro inmutable de una transición exitosa. Se persiste en `erp_purchasing:status-history`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | string | PK autogenerada, única |
| `id_orden_compra` | string | FK a Orden de Compra; obligatorio |
| `from` | string | Estado anterior; debe ser distinto de `to` |
| `to` | string | Estado nuevo; debe ser una transición permitida |
| `changedAt` | string | ISO 8601; momento de la transición |

**Reglas**:

- Solo se agrega un registro cuando la transición fue aceptada.
- Los registros no se editan ni se eliminan individualmente.
- El historial se muestra en orden cronológico ascendente.
- La fecha se presenta en America/Santiago con formato `dd-mm-aaaa HH:mm`.
- No se registra actor porque el módulo no tiene autenticación ni roles reales.
- Al eliminar la orden se elimina todo su historial.

### Transacción de Recepción

Registro temporal del diario de transacciones. Se persiste en `erp_purchasing:transactions` y permite recuperar la consistencia si una operación se interrumpe.

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | string | PK autogenerada, única |
| `type` | string | `receipt` o `transition` |
| `id_orden_compra` | string | FK a Orden de Compra |
| `phase` | string | `prepared` o `applied` |
| `before` | object | Instantánea de los registros afectados antes de la operación |
| `after` | object | Instantánea esperada después de la operación |
| `createdAt` | string | ISO 8601 |
| `appliedAt` | string \| null | ISO 8601 cuando la transacción se completó |

**Fases**:

1. `prepared`: la transacción fue registrada y los cambios pueden estar aplicados parcialmente.
2. `applied`: todos los cambios fueron escritos y la transacción puede limpiarse.

**Recuperación al arrancar**:

- Una transacción `prepared` se revierte usando `before`.
- Una transacción `applied` se conserva o se limpia una vez verificada.
- Una transacción de recepción nunca puede dejar stock actualizado sin `stock_aplicado = true`, ni `stock_aplicado = true` sin el stock actualizado.

### Empleado y Proveedor

Se reutilizan las entidades existentes. El empleado se referencia desde `erp_purchasing:order-metadata` y el proveedor desde `entity_id` de la cabecera base. Ambos se muestran en el detalle y en la impresión.

El proveedor aporta dos datos comerciales definidos en 001: su origen (`Nacional` o `Extranjero`) y su condición de pago. El origen determina el impuesto y la moneda de la orden; la condición de pago se ofrece desde la misma lista fija del proveedor y se preselecciona con el valor de ese proveedor.

## Relaciones y Cardinalidades

| Origen | Cardinalidad | Destino | Regla |
|---|---:|---|---|
| Proveedor | 1 | Orden de Compra | 0..N; cada orden tiene exactamente un proveedor |
| Empleado | 1 | Orden de Compra | 0..N; cada orden tiene exactamente un empleado |
| Orden de Compra | 1 | Detalle de Compra | 1..N; toda orden operable tiene al menos una línea |
| Producto | 1 | Detalle de Compra | 0..N; un producto puede aparecer en muchas órdenes |
| Orden de Compra | 1 | Cambio de Estado | 0..N; se agrega uno por transición exitosa |
| Orden de Compra | 1 | Transacción de Recepción | 0..N; una recepción completada por orden |
| Categoría | 1 | Producto | 0..N; cada producto tiene una categoría |

## Estados y Transiciones

| Estado actual | Acciones permitidas | Estado destino |
|---|---|---|
| `borrador` | Enviar a revisión | `pendiente` |
| `borrador` | Cancelar | `cancelado` |
| `pendiente` | Aprobar | `aprobado` |
| `pendiente` | Cancelar | `cancelado` |
| `aprobado` | Marcar recibida | `recibido` |
| `recibido` | Sin acciones | — |
| `cancelado` | Sin acciones | — |

La matriz es únicamente el ciclo canónico de Compras. Si la configuración define estados o transiciones distintos, la validación los rechaza, muestra un aviso y aplica el ciclo canónico. Cualquier transición fuera de la matriz se rechaza sin modificar la orden, el stock ni el historial.

Al ejecutar la transición `pendiente → aprobado`, el sistema asigna `startDate` con la fecha del día en la zona horaria local del módulo (America/Santiago). Antes de esa transición, la orden se muestra como «Sin emitir» en el detalle y en la impresión.

## Reglas de Cálculo

- `subtotal_linea = cantidad × costo_unitario`.
- `neto = suma(subtotal_linea)`.
- `impuesto = neto × 0,19` cuando el origen del proveedor es Nacional; `impuesto = 0` cuando el origen es Extranjero.
- `total = neto + impuesto`.
- Todos los cálculos se redondean a dos decimales internos con la función de dominio existente.
- El subtotal de línea, el neto y el impuesto son derivados y no se persisten; el total se persiste en `totalAmount`.
- La interfaz muestra los importes con el símbolo de la moneda de la orden: CLP sin decimales y USD/EUR con dos decimales.
- El IVA de importación de proveedores Extranjeros se paga en aduana y no forma parte de la OC.
- El subtotal de línea, el neto, el impuesto y el total se muestran en solo lectura y no admiten edición manual.

## Reglas de Validación

### Orden

- Debe existir el proveedor referenciado.
- Debe existir el empleado referenciado.
- El empleado solicitante debe seleccionarse de la lista de empleados registrados; si falta, la orden no se guarda y se muestra un mensaje claro.
- El folio debe ser un entero positivo y único a nivel global.
- La fecha de emisión no se captura: debe ser nula en `borrador` o `pendiente` y válida en `aprobado` o `recibido`.
- La fecha de entrega debe ser válida, capturarse con máscara `dd-mm-aaaa`, persistirse en ISO y ser igual o posterior a la fecha de emisión cuando esta exista.
- El estado debe pertenecer al ciclo canónico y no se captura manualmente; toda orden nueva inicia en `borrador`.
- El origen del proveedor debe ser `Nacional` o `Extranjero`; si no puede determinarse, la orden no se guarda.
- La `currency` debe ser `CLP` para origen Nacional y `USD` o `EUR` para origen Extranjero; una moneda distinta se rechaza.
- La `paymentTerms` debe pertenecer a la lista fija de condiciones de pago del proveedor.
- El formulario no admite cantidad, subtotal, descuento, impuesto, importe total ni notas en la cabecera; si se envían, se ignoran o se rechazan.
- Debe tener al menos una línea válida para guardar o enviar a revisión.
- La transición `borrador → pendiente` devuelve `NO_LINES` si la orden no tiene al menos una línea válida.
- La cabecera y las líneas no se editan si el estado es `recibido` o `cancelado`.
- La interfaz muestra la cabecera y las líneas en modo solo lectura cuando el estado es `recibido` o `cancelado`.

### Línea

- El producto debe existir.
- La cantidad debe ser un entero positivo.
- El costo unitario debe ser un número no negativo.
- No se permite repetir el producto en la misma orden.
- La línea no se edita si la orden está en estado terminal.

### Recepción

- Solo se aplica al pasar de `aprobado` a `recibido`.
- La orden debe tener `stock_aplicado = false`.
- Deben existir todas las líneas y productos referenciados.
- El stock nuevo de cada producto es `stock_anterior + cantidad`.
- La operación es completa o nula.
- Una segunda recepción no modifica el stock y devuelve un error de recepción ya aplicada.
- La cancelación no modifica el stock.

### Historial

- `from` y `to` deben ser estados distintos.
- La transición debe estar permitida.
- `changedAt` debe ser una fecha ISO válida.
- No se agregan registros por transiciones rechazadas.
- Los registros no se editan manualmente.

## Reglas de Eliminación y Cascada

- Eliminar una orden elimina sus líneas, metadatos, historial y transacciones asociadas.
- Eliminar un proveedor elimina en cascada sus órdenes y todos los registros de extensión asociados.
- Eliminar un empleado, categoría o producto referenciado por una orden se bloquea con un mensaje explicativo.
- Eliminar una orden recibida no revierte el stock ya aplicado.

## Mapeo al Modelo del Módulo de Compras

| Concepto | Base existente | Extensión nueva |
|---|---|---|
| Orden de Compra | `id`, `entity_id`, `folio`, `startDate` (automática), `endDate`, `status`, `totalAmount`, `currency`, `paymentTerms` | `id_empleado`, `stock_aplicado`, `appliedAt` |
| Detalle de Compra | — | `id_orden_compra`, `id_producto`, `cantidad`, `costo_unitario`; importes derivados de solo lectura |
| Producto | — | `nombre`, `unidad_medida`, `stock`, `id_categoria` |
| Cambio de Estado | — | `from`, `to`, `changedAt` |
| Transacción de Recepción | — | Diario para recuperación y atomicidad local |

Los campos base `quantity`, `subtotal`, `discount`, `taxAmount` y `notes` no se utilizan en la OC: la cantidad y el precio viven en las líneas, los importes se calculan y no se capturan, y las notas no forman parte del formulario.

## Datos Históricos sin Metadatos

Las órdenes creadas antes de esta extensión pueden existir sin un registro en `erp_purchasing:order-metadata`. Se tratan como legado:

- Se muestran con empleado desconocido y sin acciones de extensión que requieran metadatos.
- No se rellena automáticamente `stock_aplicado`, ni se infiere que su stock fue aplicado.
- No se les agrega historial retroactivo.
- Pueden consultarse e imprimirse con los datos disponibles.
- Las órdenes nuevas o completadas desde la interfaz cumplen las invariantes normales.

## Volumen y Escala

- Hasta 2.000 órdenes y 500 productos, consistente con el presupuesto del módulo base.
- Hasta 50 líneas por orden.
- Hasta 5 cambios de estado por orden en el flujo normal.
- El historial y las transacciones se leen bajo demanda por orden; no se renderizan completos en las listas.
