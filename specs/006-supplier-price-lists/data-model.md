# Modelo de Datos: Listas de Precios por Proveedor y Ajustes Funcionales de Compras

**Rama**: `006-supplier-price-lists`
**Fecha**: 2026-11-15
**Especificación**: [spec.md](spec.md)
**Contexto base**: [Modelo del módulo base](../001-erp-base-module/data-model.md), [Modelo de órdenes de compra](../002-purchase-order-workflow/data-model.md) y [Modelo de autenticación](../004-authentication-rbac/data-model.md)

## Alcance del Modelo

Se agrega una entidad persistida (**Precio acordado**), un campo opcional en el documento (`ocFolio`), un permiso (`pricelists.manage`) y dos vistas derivadas (**Ficha del proveedor** y **Opción de filtro de estado**). Las demás entidades conservan sus campos y reglas.

## Claves de Persistencia

| Clave | Contenido | Estado |
|---|---|---|
| `erp_purchasing:supplier-prices` | Precios acordados producto–proveedor | Nueva |
| `erp_base_module:documents` | Documentos y órdenes | Existente; agrega `ocFolio` opcional |
| `erp_base_module:entities` | Proveedores | Existente, sin cambios |
| `erp_purchasing:products` | Productos y stock | Existente, sin cambios |
| `erp_purchasing:purchase-order-lines` | Líneas de detalle | Existente, sin cambios (el precio puede provenir de la lista) |
| `erp_purchasing:employees`, `categories`, `order-metadata`, `status-history`, `transactions` | — | Existentes, sin cambios |
| `erp_auth:users`, `erp_auth:session` | — | Existentes, sin cambios |

## Entidades

### Precio acordado (SupplierPrice) — nueva

Vínculo entre un producto y un proveedor con el precio acordado. Un elemento del arreglo en `erp_purchasing:supplier-prices`.

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | string | PK; UUID |
| `id_producto` | string | FK → Producto; obligatorio |
| `entity_id` | string | FK → Proveedor; obligatorio |
| `precio` | number | Obligatorio; > 0; redondeado a 2 decimales; neto, sin IVA |
| `moneda` | string | `CLP` si el proveedor es Nacional; `USD` o `EUR` si es Extranjero (por defecto `USD`) |
| `createdAt` | string ISO | Se conserva al actualizar |
| `updatedAt` | string ISO | Se renueva en cada cambio |

**Reglas**:

- Único por par (`id_producto`, `entity_id`).
- Con sesión activa, todo producto creado o editado DEBE tener al menos un precio acordado vigente.
- Vigencia: solo se consideran los precios cuyo producto y proveedor existen.
- Eliminación en cascada al eliminar el producto.
- Escritura restringida a `pricelists.manage` (Administrador, Gerente); la demostración usa `skipAccessCheck` igual que el resto de su siembra.

### Documento / Orden de compra — campo agregado

| Campo | Tipo | Restricciones |
|---|---|---|
| `folio` | integer | Existente (`001` FR-010: positivo y único). En Compras, si no se informa, se asigna `máximo + 1`. Se muestra como `SOL-0001`. |
| `ocFolio` | integer | **Nuevo**, opcional. Se asigna una sola vez al pasar a `aprobado` (o al crear con estado inicial `aprobado`) como `máximo ocFolio + 1`. Se muestra como `OC-0001`. No cambia en `recibido`. |

### Línea de detalle — regla agregada

| Campo | Regla 006 |
|---|---|
| `costo_unitario` | Si el proveedor de la orden tiene lista de precios, se toma de la lista (`precio`) e ignora el valor recibido; el producto debe estar en la lista y su `moneda` debe coincidir con la moneda de la orden. Sin lista, rige `002`. |

### Permiso — agregado

| Permiso | Administrador | Gerente | Comprador | Bodeguero | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|
| `pricelists.manage` | ✓ | ✓ | — | — | — |

Crear productos requiere `products.manage` **y** `pricelists.manage` cuando hay sesión activa. El Bodeguero conserva `products.manage` para editar datos, stock y eliminar.

## Vistas Derivadas (no persistidas)

### Ficha del proveedor

Resultado de `getSupplierSummary(entityId)`:

| Campo | Descripción |
|---|---|
| `supplier` | Proveedor completo |
| `orders` | Órdenes del proveedor con totales, más recientes primero |
| `emittedCount` | Cantidad de OC en `aprobado` o `recibido` |
| `totalsByCurrency` | Suma de `total` de las OC emitidas, agrupada por moneda |
| `priceList` | Precios acordados vigentes del proveedor |

### Opción del filtro de estado

`STATUS_FILTER_OPTIONS` en `src/domain/purchasing.js`:

| Valor | Etiqueta | Estados |
|---|---|---|
| `tipo:solicitud` | Solicitud de compra | `borrador`, `pendiente` |
| `borrador` | Solicitud – Borrador | `borrador` |
| `pendiente` | Solicitud – Pendiente de aprobación | `pendiente` |
| `tipo:oc` | Orden de Compra emitida | `aprobado`, `recibido` |
| `aprobado` | OC emitida – Aprobada | `aprobado` |
| `recibido` | OC – Recibida | `recibido` |
| `cancelado` | Cancelada | `cancelado` |

## Relaciones

```text
Producto 1 ──< Precio acordado >── 1 Proveedor
Proveedor 1 ──< Orden de compra 1 ──< Línea >── 1 Producto
Línea.costo_unitario = Precio acordado.precio   (si el proveedor tiene lista)
```

## Errores Nuevos

| Código | Mensaje |
|---|---|
| `PRODUCT_NOT_IN_PRICE_LIST` | El producto no está en la lista de precios del proveedor seleccionado. |
| `PRICE_CURRENCY_MISMATCH` | El precio acordado con el proveedor está en otra moneda; cambia la moneda de la orden. |
| `PRICE_LIST_INVALID` | Mensajes de validación de vínculos (proveedor obligatorio o inexistente, proveedor repetido, precio inválido, moneda inválida, al menos un proveedor). |
