# Modelo de Datos: Gestión de Compras Avanzada

**Rama**: `007-gestion-compras-avanzada`
**Fecha**: 2026-11-16
**Especificación**: [spec.md](spec.md)
**Contexto base**: [001](../001-erp-base-module/data-model.md), [002](../002-purchase-order-workflow/data-model.md), [004](../004-authentication-rbac/data-model.md), [006](../006-supplier-price-lists/data-model.md)

## Alcance del Modelo

Se agregan dos entidades persistidas (**Área**, **Presupuesto mensual**), un registro por usuario (**Lecturas de notificaciones**), cuatro campos opcionales en entidades existentes (`stock_minimo`, `estado`, `id_area` y `tramos` del precio acordado), dos permisos y tres vistas derivadas (**Evaluación**, **Reporte de gasto**, **Aviso**). Todos los campos nuevos son opcionales y tienen un valor por defecto que reproduce el comportamiento anterior.

## Claves de Persistencia

| Clave | Contenido | Estado |
|---|---|---|
| `erp_purchasing:areas` | Áreas / centros de costo | Nueva, incluida en `KEYS` |
| `erp_purchasing:budgets` | Presupuestos mensuales por área | Nueva, incluida en `KEYS` |
| `erp_purchasing:notification-reads` | Avisos leídos por usuario | Nueva, incluida en `KEYS` |
| `erp_purchasing:products` | Productos | Existente; agrega `stock_minimo` |
| `erp_base_module:entities` | Proveedores | Existente; agrega `estado` |
| `erp_purchasing:order-metadata` | Metadata de orden (empleado) | Existente; agrega `id_area` |
| `erp_purchasing:status-history` | Historial de estados | Existente, sin cambios (fuente de la fecha de recepción) |
| `erp_purchasing:supplier-prices` | Precios acordados (`006`) | Existente; agrega `tramos` |

Al estar en `KEYS`, las claves nuevas quedan cubiertas por `snapshotPurchasingData`, `restorePurchasingData` y `clearPurchasingData` (sustitución de demo, `003` FR-086).

## Entidades

### Área — nueva

| Campo | Tipo | Restricciones |
|---|---|---|
| `id_area` | string | PK; UUID |
| `nombre` | string | Obligatorio; único sin distinguir mayúsculas ni tildes; ≤ 80 caracteres |
| `activa` | boolean | Por defecto `true`; un área inactiva no se ofrece en solicitudes nuevas |
| `createdAt`, `updatedAt` | string ISO | — |

Reglas: no se elimina un área referenciada por una orden (se desactiva). Escritura con `budgets.manage`.

### Presupuesto mensual — nueva

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | string | PK; UUID |
| `id_area` | string | FK → Área |
| `mes` | string | `aaaa-mm` |
| `monto` | number | CLP, ≥ 0, entero |
| `createdAt`, `updatedAt` | string ISO | — |

Reglas: único por (`id_area`, `mes`). Escritura con `budgets.manage`.

### Lecturas de notificaciones — nueva

Objeto `{ [userId]: string[] }` con los identificadores de avisos leídos (`<tipo>:<idOrden>:<estado>`). Se recorta a los 500 más recientes por usuario.

### Producto — campo agregado

| Campo | Tipo | Restricciones |
|---|---|---|
| `stock_minimo` | integer | ≥ 0; ausente = 0 (sin control). Editable con `products.manage`. |

### Proveedor — campo agregado

| Campo | Tipo | Restricciones |
|---|---|---|
| `estado` | `'activo'` \| `'inactivo'` | Ausente = `activo`. Editable con `entities.update`. Se agrega a `BASE_FIELDS.entity` para que `updateEntity` lo conserve. |

### Precio acordado (`006`) — campo agregado

| Campo | Tipo | Restricciones |
|---|---|---|
| `tramos` | `{ desde: integer, precio: number }[]` | Opcional. `desde` ≥ 1 y único; `precio` > 0 en la moneda del precio acordado. Se guarda ordenado por `desde`. |

Reglas:

- El campo `precio` del `006` se conserva y equivale al tramo `desde: 1`. Si `tramos` existe, el tramo desde 1 es obligatorio y `precio` se sincroniza con él.
- Precio aplicable a una cantidad `q`: el del tramo con el mayor `desde ≤ q`.
- Escritura con `pricelists.manage` (`006`).

### Metadata de orden — campo agregado

| Campo | Tipo | Restricciones |
|---|---|---|
| `id_area` | string | FK → Área; obligatorio en solicitudes nuevas o editadas solo si existe al menos un área activa. |

### Permisos — agregados

| Permiso | Administrador | Gerente | Comprador | Bodeguero | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|
| `reports.view` | ✓ | ✓ | — | — | — |
| `budgets.manage` | ✓ | ✓ | — | — | — |

## Vistas Derivadas (no persistidas)

### Evaluación del proveedor

| Campo | Cálculo |
|---|---|
| `emitidas` | OC del proveedor en `aprobado` o `recibido` |
| `recibidas` | OC en `recibido` con fecha comprometida válida |
| `aTiempo` | recibidas con `fechaRecepcion ≤ endDate` |
| `porcentajeATiempo` | `aTiempo / recibidas × 100` (1 decimal) |
| `atrasoPromedio` | promedio de `max(0, fechaRecepcion − endDate)` en días |
| `montoPorMoneda` | suma de totales de OC emitidas por moneda |
| `calificacion` | A ≥ 90; B ≥ 70; C < 70; `Sin datos` si `recibidas = 0` |
| `aproximada` | `true` si alguna fecha de recepción proviene de `updatedAt` |

### Fila de reporte de gasto

| Campo | Descripción |
|---|---|
| `grupo` | Proveedor, rubro, área («Sin área») o mes (`aaaa-mm`) |
| `cantidadOC` | OC emitidas del grupo en el rango |
| `montos` | `{ CLP, USD, EUR }` |
| `porcentaje` | % del total de su moneda (no aplica a la agrupación por rubro) |

### Opción de compra (comparación de proveedores)

| Campo | Descripción |
|---|---|
| `entity_id`, `proveedor` | Proveedor activo con precio para el producto |
| `cantidad` | Cantidad solicitada |
| `tramo` | `desde` del tramo aplicado |
| `precioUnitario`, `totalNeto`, `moneda` | Según el tramo aplicable |
| `calificacion` | Evaluación (US1) o «Sin datos» |
| `mejor` | `true` para la opción destacada (FR-011) |

### Carrito de solicitud (temporal, en el formulario)

`[{ entity_id, id_producto, cantidad }]`, agrupado por `entity_id` al guardar; cada grupo se convierte en una solicitud.

### Aviso

| Campo | Descripción |
|---|---|
| `id` | `<tipo>:<idOrden>:<estado>` |
| `tipo` | `pendiente-aprobacion`, `presupuesto-excedido`, `por-recibir`, `atrasada`, `aprobada`, `rechazada` |
| `orderId`, `referencia`, `texto`, `fecha` | Para mostrar y abrir el detalle |
| `leido` | Según lecturas del usuario |

## Relaciones

```text
Área 1 ──< Presupuesto mensual
Área 1 ──< Metadata de orden >── 1 Orden de compra
Proveedor (estado) 1 ──< Orden de compra 1 ──< Historial de estados
Producto (stock_minimo) ──< Precio acordado (006) >── Proveedor
```
