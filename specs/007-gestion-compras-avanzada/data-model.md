# Modelo de Datos: Gestión de Compras Avanzada

**Rama**: `007-gestion-compras-avanzada` | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Contexto base**: [001](../001-erp-base-module/data-model.md), [002](../002-purchase-order-workflow/data-model.md), [003](../003-purchasing-ux-improvements/data-model.md), [004](../004-authentication-rbac/data-model.md), [005](../005-compras-visual-redesign/data-model.md), [006](../006-supplier-price-lists/data-model.md).

## Alcance del modelo

| Elemento | Estado en 007 | Origen | Observaciones |
|---|---|---|---|
| `stock_minimo` en PRODUCTO | Campo nuevo | 007 US2 | Entero ≥ 0; 0 = sin control |
| `estado` en PROVEEDOR | Campo nuevo | 007 US6 | `activo` \| `inactivo`; ausente = activo |
| `tramos` en LISTA_PRECIO | Campo nuevo | 007 US7 | Lista ordenada de `{ desde, precio }` |
| `id_area` en METADATA_ORDEN | Campo nuevo | 007 US4 | FK a AREA; obligatorio solo al enviar a revisión |
| AREA y PRESUPUESTO_MENSUAL | Entidades nuevas | 007 US4 | Presupuesto mensual en CLP |
| RUBRO y PROVEEDOR_RUBRO | Entidades nuevas | 005/007 | Relación N:M con PROVEEDOR |
| USUARIO | Entidad existente | 004 | Rol RBAC vinculado a EMPLEADO |
| HISTORIAL_ESTADO | Entidad existente | 002 | Fuente de la fecha de recepción para la evaluación |
| LECTURA_NOTIFICACIÓN | Entidad nueva | 007 US5 | Estado de lectura por usuario |
| Evaluación, reporte, aviso, opción de compra y carrito | Vistas derivadas | 007 | No se persisten; se calculan al mostrar |

## Claves de persistencia

| Clave de `localStorage` | Entidad o registro | Estado | Detalle |
|---|---|---|---|
| `erp_base_module:entities` | PROVEEDOR | Existente | Entidad base renombrada; agrega `estado` y `rubro_ids` |
| `erp_base_module:documents` | ORDEN_COMPRA | Existente | Documento base renombrado; agrega `ocFolio` y `currency` |
| `erp_auth:users` | USUARIO | Existente | Rol RBAC y vínculo con EMPLEADO |
| `erp_auth:session` | Sesión activa | Existente | Referencia al `userId`; no es entidad del MER |
| `erp_purchasing:employees` | EMPLEADO | Existente | Datos maestros |
| `erp_purchasing:categories` | CATEGORÍA | Existente | Datos maestros |
| `erp_purchasing:rubros` | RUBRO | Existente (005) | Datos maestros |
| `erp_purchasing:products` | PRODUCTO | Existente | Agrega `stock_minimo` |
| `erp_purchasing:supplier-prices` | LISTA_PRECIO | Existente (006) | Agrega `tramos` por cantidad |
| `erp_purchasing:purchase-order-lines` | DETALLE_COMPRA | Existente | Líneas de la orden |
| `erp_purchasing:order-metadata` | METADATA_ORDEN | Existente | Agrega `id_area` |
| `erp_purchasing:status-history` | HISTORIAL_ESTADO | Existente | Inmutable; fecha de recepción |
| `erp_purchasing:transactions` | TRANSACCIÓN | Existente | Recuperación ante fallos |
| `erp_purchasing:areas` | AREA | Nueva | Centros de costo |
| `erp_purchasing:budgets` | PRESUPUESTO_MENSUAL | Nueva | Montos CLP por área y mes |
| `erp_purchasing:notification-reads` | LECTURA_NOTIFICACIÓN | Nueva | Objeto `{ [userId]: string[] }` |

| Cobertura de las claves nuevas | Detalle |
|---|---|
| Registro | Incluidas en `KEYS` de `src/purchasing-storage.js` |
| Sustitución de demo | Cubiertas por `snapshotPurchasingData`, `restorePurchasingData` y `clearPurchasingData` (003 FR-086) |

## Entidades persistidas

### PROVEEDOR

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `entity_id` / `id` | string (UUID) | PK | Generado automáticamente; vínculo con órdenes y listas de precio |
| `code` (`codigo`) | string | — | Obligatorio, no vacío; único en la práctica del módulo |
| `name` (`nombre`) | string | — | Obligatorio, no vacío |
| `taxId` / `foreignTaxId` (`rut`) | string | — | Opcional; RUT chileno o identificación extranjera |
| `email` | string | — | Opcional; formato válido |
| `phone` (`telefono`) | string | — | Opcional |
| `address` (`direccion`) | string | — | Opcional |
| `origin` | enum `Nacional` \| `Extranjero` | — | Define moneda por defecto e IVA |
| `paymentTerms` | enum `Contado` \| `30 días` \| `60 días` \| `90 días` | — | Opcional; usado al crear solicitudes |
| `rubro_ids` | string[] | FK → RUBRO vía PROVEEDOR_RUBRO | 0..N rubros |
| `estado` | enum `activo` \| `inactivo` | — | 007; ausente = `activo`; editable con `entities.update` |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |

### EMPLEADO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_empleado` / `id` | string (UUID) | PK | Generado automáticamente |
| `userId` | string | FK → USUARIO.userId | Opcional; presente en los usuarios de demostración |
| `nombre` | string | — | Obligatorio |
| `cargo` | string | — | Opcional |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría; no se elimina si tiene Órdenes asociadas |

### USUARIO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `userId` | string 2–40, `[A-Z0-9._@-]` | PK | Obligatorio; se normaliza a mayúsculas |
| `nombre` | string | — | Obligatorio; por defecto el `userId` |
| `cargo` | string | — | Opcional |
| `role` | enum `administrador` \| `gerente` \| `comprador` \| `bodeguero` \| `consulta` | — | Obligatorio; define el conjunto de permisos RBAC; valor inválido → `consulta` |
| `activo` | boolean | — | Por defecto `true` |
| `id_empleado` | string | FK → EMPLEADO.id_empleado | Opcional; vincula la sesión con el solicitante |

### ROL_Y_PERMISO (dimensión RBAC derivada de USUARIO.role)

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `role` | enum | PK, FK → USUARIO.role | Uno de los cinco roles declarados |
| `permiso` | string | PK | 21 permisos tras 007: 19 de 004 + `reports.view` + `budgets.manage` |
| `etiqueta` | string | — | Etiqueta legible del rol |

### CATEGORÍA

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_categoria` / `id` | string (UUID) | PK | Generado automáticamente |
| `nombre` | string | — | Obligatorio; único sin distinguir mayúsculas; bloqueada si tiene productos |

### RUBRO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_rubro` / `id` | string (UUID) | PK | Generado automáticamente |
| `nombre` | string | — | Obligatorio; único sin distinguir mayúsculas ni tildes |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |

### PROVEEDOR_RUBRO (asociación N:M)

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `entity_id` | string (UUID) | PK, FK → PROVEEDOR.entity_id | Mitad de la clave compuesta |
| `id_rubro` | string (UUID) | PK, FK → RUBRO.id_rubro | Mitad de la clave compuesta |

| Representación física de PROVEEDOR_RUBRO | Detalle |
|---|---|
| Implementación | Arreglo `rubro_ids` dentro de PROVEEDOR |
| Equivalencia lógica | Tabla de unión con clave primaria compuesta (`entity_id`, `id_rubro`) |

### PRODUCTO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_producto` / `id` | string (UUID) | PK | Generado automáticamente |
| `nombre` | string | — | Obligatorio |
| `unidad_medida` | string | — | Opcional (unidad, kilo, caja, etc.) |
| `stock` | integer | — | ≥ 0; por defecto 0; se incrementa al recibir |
| `stock_minimo` | integer | — | 007; ≥ 0; ausente = 0; editable con `products.manage` |
| `id_categoria` | string (UUID) | FK → CATEGORÍA.id_categoria | Obligatorio en el formulario |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |

### ORDEN_COMPRA

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string (UUID) | PK | Generado automáticamente |
| `entity_id` | string (UUID) | FK → PROVEEDOR.entity_id | Obligatorio; proveedor activo para órdenes nuevas |
| `folio` | integer | — | Correlativo de solicitud (`SOL-0001`); obligatorio, positivo |
| `ocFolio` | integer | — | Correlativo de OC (`OC-0001`); se asigna una sola vez al aprobar |
| `startDate` (`fecha_emision`) | date `aaaa-mm-dd` | — | Obligatoria |
| `endDate` (`fecha_entrega`) | date `aaaa-mm-dd` | — | Obligatoria; ≥ `startDate` |
| `status` | enum `borrador` \| `pendiente` \| `aprobado` \| `recibido` \| `cancelado` | — | Controlado por `statusLifecycle` |
| `currency` | enum `CLP` \| `USD` \| `EUR` | — | Según origen del proveedor; sin conversión entre monedas |
| `paymentTerms` | enum | — | Condición de pago acordada |
| `subtotal`, `discount`, `taxAmount`, `totalAmount` | number | — | `totalAmount` ≥ 0; calculado desde las líneas |
| `notes`, `series`, `quantity` | string / number | — | Campos opcionales del documento base |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |
| `id_empleado` | string (UUID) | FK → EMPLEADO vía METADATA_ORDEN | Registrador de la orden |
| `id_area` | string (UUID) | FK → AREA vía METADATA_ORDEN | 007; opcional en borrador; obligatorio al enviar a revisión si hay áreas activas |

### DETALLE_COMPRA

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_orden_compra` | string (UUID) | PK, FK → ORDEN_COMPRA.id | Mitad de la clave compuesta |
| `id_producto` | string (UUID) | PK, FK → PRODUCTO.id_producto | Mitad de la clave compuesta; no repetido en una orden |
| `cantidad` | integer | — | Obligatoria, > 0 |
| `costo_unitario` | number | — | Obligatorio, ≥ 0; recalculado desde LISTA_PRECIO cuando existe |
| `totalNeto` | number | — | Derivado: `cantidad × costo_unitario` del tramo aplicable |

### LISTA_PRECIO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string (UUID) | PK | Generado automáticamente |
| `id_producto` | string (UUID) | FK → PRODUCTO.id_producto | Obligatorio |
| `entity_id` | string (UUID) | FK → PROVEEDOR.entity_id | Obligatorio |
| `precio` | number | — | > 0; precio base; sincronizado con el tramo `desde: 1` |
| `moneda` | enum `CLP` \| `USD` \| `EUR` | — | Obligatoria; permitida según `origin` del proveedor |
| `tramos` | TRAMO_PRECIO[] anidado | FK lógico → TRAMO_PRECIO | 007; opcional; ausente = único tramo `desde: 1` |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |

| Restricción de LISTA_PRECIO | Regla |
|---|---|
| Unicidad | Un precio acordado por par (`entity_id`, `id_producto`) |
| Escritura | Solo roles con `pricelists.manage` (Gerente y Administrador) |
| Precio guardado en orden | `applySupplierPriceList` → `unitPriceFor` recalcula `costo_unitario` desde la lista vigente; el payload del cliente nunca es fuente de verdad (FR-033/SC-010) |

### TRAMO_PRECIO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_lista_precio` | string (UUID) | PK, FK → LISTA_PRECIO.id | Mitad de la clave compuesta |
| `desde` | integer | PK | ≥ 1; único dentro de la lista; el tramo `desde: 1` es obligatorio si existen tramos |
| `precio` | number | — | > 0, expresado en la `moneda` de LISTA_PRECIO |

| Regla de TRAMO_PRECIO | Detalle |
|---|---|
| Persistencia | Anidados en `LISTA_PRECIO.tramos`, ordenados por `desde` |
| Precio aplicable | Tramo con mayor `desde ≤ q` para una cantidad `q` |

### AREA

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id_area` | string (UUID) | PK | Generado automáticamente |
| `nombre` | string | — | Obligatorio, único sin distinguir mayúsculas ni tildes, ≤ 80 caracteres |
| `activa` | boolean | — | Por defecto `true`; una inactiva no se ofrece en solicitudes nuevas |
| `presupuesto_mensual_clp` | number | Derivado de PRESUPUESTO_MENSUAL | CLP entero ≥ 0 por mes `aaaa-mm`; ausente = sin presupuesto |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría; escritura con `budgets.manage` |

### PRESUPUESTO_MENSUAL

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string (UUID) | PK | Generado automáticamente |
| `id_area` | string (UUID) | FK → AREA.id_area | Obligatorio |
| `mes` | string `aaaa-mm` | — | Obligatorio |
| `monto` | integer | — | CLP ≥ 0; 0 se considera definido |
| `createdAt`, `updatedAt` | string ISO | — | Auditoría |
| (`id_area`, `mes`) | compuesta | UK | Un presupuesto por área y mes |

### METADATA_ORDEN

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string (UUID) | PK | Generado automáticamente |
| `id_orden_compra` | string (UUID) | FK → ORDEN_COMPRA.id, UK | Una metadata por orden |
| `id_empleado` | string (UUID) | FK → EMPLEADO.id_empleado | Obligatorio en órdenes creadas por el módulo |
| `id_area` | string (UUID) | FK → AREA.id_area | 007; opcional en borradores; validado con `AREA_REQUIRED` al pasar a `pendiente` |
| `stock_aplicado` | boolean | — | Controla la idempotencia de la recepción |
| `appliedAt`, `createdAt`, `updatedAt` | string ISO | — | Auditoría |

### HISTORIAL_ESTADO

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string (UUID) | PK | Generado automáticamente; inmutable |
| `id_orden_compra` | string (UUID) | FK → ORDEN_COMPRA.id | Obligatorio |
| `from` | enum de estados | — | Estado anterior |
| `to` | enum de estados | — | Estado nuevo; transición validada por `statusLifecycle` |
| `changedAt` | string ISO | — | Fecha/hora del cambio (`America/Santiago`); si `to = recibido`, es la fecha de recepción para la evaluación |

### TRANSACCIÓN

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `id` | string | PK | Identificador de la transacción recuperable |
| `type` | enum `transition` \| `receipt` | — | Tipo de operación |
| `id_orden_compra` | string (UUID) | FK → ORDEN_COMPRA.id | Orden afectada |
| `before`, `after` | objeto | — | Snapshot de `KEYS` para restaurar ante fallo |
| `appliedAt` | string ISO | — | Se marca al confirmar; luego se limpia |

### LECTURA_NOTIFICACIÓN

| Atributo | Tipo | PK/FK | Restricciones |
|---|---|---|---|
| `userId` | string | PK, FK → USUARIO.userId | Clave del objeto `{ [userId]: string[] }` |
| `idsLeidos` | string[] | — | Identificadores `<tipo>:<idOrden>:<estado>`; máximo 500 por usuario (los más recientes) |

## Permisos agregados en 007

| Permiso | administrador | gerente | comprador | bodeguero | consulta |
|---|:---:|:---:|:---:|:---:|:---:|
| `reports.view` | ✓ | ✓ | — | — | — |
| `budgets.manage` | ✓ | ✓ | — | — | — |

| Regla de visibilidad | Detalle |
|---|---|
| `reports.view` | Ficha, tarjetas y Reportes |
| Excepción US7 | Tabla comparativa visible para roles con `documents.create`, sin `reports.view` (FR-005) |
| Cálculo interno | El grade de FR-004 se calcula siempre como entrada de FR-011 |

## Vistas derivadas (no persistidas)

### EVALUACIÓN_PROVEEDOR

| Atributo | Cálculo |
|---|---|
| `emitidas` | OC del proveedor en `aprobado` o `recibido` |
| `recibidas` | OC en `recibido` con fecha comprometida válida |
| `aTiempo` | Recibidas con `fechaRecepcion ≤ endDate` |
| `porcentajeATiempo` | `aTiempo / recibidas × 100` (1 decimal) |
| `atrasoPromedio` | Promedio de `max(0, fechaRecepcion − endDate)` en días corridos |
| `montoPorMoneda` | Suma de totales de OC emitidas, agrupada por moneda |
| `calificacion` | A ≥ 90 %; B ≥ 70 % y < 90 %; C < 70 %; «Sin datos» si `recibidas = 0` |
| `aproximada` | `true` si alguna fecha de recepción provino de `updatedAt` |

### REPORTE_GASTO

| Atributo | Descripción |
|---|---|
| `grupo` | Proveedor, rubro, área («Sin área») o mes (`aaaa-mm`) |
| `cantidadOC` | OC emitidas del grupo en el rango de fechas |
| `montos` | `{ CLP, USD, EUR }`, sin conversión de moneda |
| `porcentaje` | % del total de su moneda; no aplica a la agrupación por rubro |
| `nota` | Aviso cuando un proveedor pertenece a varios rubros |

### OPCION_COMPRA

| Atributo | Descripción |
|---|---|
| `entity_id`, `proveedor` | Proveedor activo con precio para el producto |
| `cantidad` | Cantidad solicitada |
| `tramo` | `desde` del tramo aplicable |
| `precioUnitario`, `totalNeto`, `moneda` | Según el tramo aplicable |
| `calificacion` | Grade interno de FR-004, usado por FR-011 con independencia del rol |
| `mejor` | Primera opción del ranking de FR-011, sin conversión de moneda |

### AVISO_NOTIFICACION

| Atributo | Descripción |
|---|---|
| `id` | `<tipo>:<idOrden>:<estado>` |
| `tipo` | `pendiente-aprobacion` \| `presupuesto-excedido` \| `por-recibir` \| `atrasada` \| `aprobada` \| `rechazada` |
| `orderId`, `referencia`, `texto`, `fecha` | Datos para mostrar y abrir el detalle |
| `leido` | Según LECTURA_NOTIFICACIÓN del usuario |

### CARRITO_COMPRA

| Atributo | Descripción |
|---|---|
| `entity_id` | Proveedor elegido para el grupo de líneas |
| `id_producto` | Producto del carrito |
| `cantidad` | Suma de cantidades repetidas del mismo producto y proveedor |

| Regla de CARRITO_COMPRA | Detalle |
|---|---|
| Persistencia | Temporal; vive en el formulario y no se guarda en `localStorage` |
| Guardado | Una ORDEN_COMPRA por proveedor en una operación atómica |

## Relaciones y cardinalidades

| Relación | Cardinalidad | Claves que la implementan | Regla principal |
|---|---|---|---|
| PROVEEDOR → ORDEN_COMPRA | 1:N | `ORDEN_COMPRA.entity_id` → `PROVEEDOR.entity_id` | Una orden pertenece a un proveedor; inactivo = sin nuevas órdenes |
| EMPLEADO → ORDEN_COMPRA | 1:N | `METADATA_ORDEN.id_empleado` → `EMPLEADO.id_empleado` | Registrador de la orden |
| USUARIO → EMPLEADO | 1:1 opcional | `USUARIO.id_empleado` → `EMPLEADO.id_empleado` | Vincula la sesión RBAC al solicitante |
| USUARIO → ROL_Y_PERMISO | N:1 | `USUARIO.role` → `ROL_Y_PERMISO.role` | RBAC por rol |
| CATEGORÍA → PRODUCTO | 1:N | `PRODUCTO.id_categoria` → `CATEGORÍA.id_categoria` | Una categoría agrupa productos |
| PROVEEDOR ↔ RUBRO | N:M | PROVEEDOR_RUBRO(`entity_id`, `id_rubro`) | Un proveedor tiene varios rubros y un rubro puede aplicar a varios proveedores |
| PRODUCTO ↔ ORDEN_COMPRA | N:M | DETALLE_COMPRA(`id_orden_compra`, `id_producto`) | Una orden tiene al menos una línea |
| PRODUCTO ↔ PROVEEDOR | N:M | LISTA_PRECIO(`id_producto`, `entity_id`) | Precio acordado por par; con tramos por cantidad y moneda |
| LISTA_PRECIO → TRAMO_PRECIO | 1:N | `TRAMO_PRECIO.id_lista_precio` → `LISTA_PRECIO.id` | Tramo con mayor `desde ≤ cantidad` |
| AREA → PRESUPUESTO_MENSUAL | 1:N | `PRESUPUESTO_MENSUAL.id_area` → `AREA.id_area` | Único por área y mes, en CLP |
| AREA → ORDEN_COMPRA | 1:N opcional | `METADATA_ORDEN.id_area` → `AREA.id_area` | Obligatoria al enviar a revisión si hay áreas activas |
| ORDEN_COMPRA → HISTORIAL_ESTADO | 1:N | `HISTORIAL_ESTADO.id_orden_compra` → `ORDEN_COMPRA.id` | Registro inmutable de transiciones |
| ORDEN_COMPRA → LECTURA_NOTIFICACIÓN | 1:N derivada | `<tipo>:<idOrden>:<estado>` en `idsLeidos` | Los avisos se derivan; solo se guarda su lectura |
