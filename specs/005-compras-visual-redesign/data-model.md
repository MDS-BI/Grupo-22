# Modelo de Datos: Rediseño Visual 005

**Fecha**: 2026-11-16 | **Spec**: `specs/005-compras-visual-redesign/spec.md`

## Resumen

Este rediseño **no introduce entidades nuevas de dominio ni modifica el modelo de datos existente**. Respeta íntegramente los contratos de persistencia y estructuras de `src/domain`, `src/purchasing-storage.js`, `src/storage.js` y `src/auth.js` (sin cambios de comportamiento).

## Entidades de Dominio (reutilizadas, solo lectura/presentación)

Se reutilizan tal como están definidas en specs 001–004 y 006:

| Entidad | Uso en 005 (presentación) | Cambios |
|---|---|---|
| **Orden de Compra** | Listados tabla/tablero, detalle, progreso, historial, totales, impresión, métricas | Ninguno (lectura). Folios `SOL-`/`OC-` preservados. |
| **Solicitud de Compra** | Estados/insignias, "Requiere tu atención" por rol, folio en impresión si no emitida | Ninguno |
| **Proveedor** | Vistas tabla/tarjetas, ranking top 5, ficha en Búsqueda (006) | Ninguno |
| **Producto** | Stock visual, formulario con tabla proveedores/precios (006) | Ninguno |
| **Usuario** | Login tarjetas (`login()` 004), menú/avatar/rol, filtros de atención por rol | Ninguno |

## Preferencia de Presentación (cliente, fuera del dominio)

Único dato nuevo, de alcance UI únicamente:

- **Entidad lógica**: Preferencia de tema
- **Alcance**: Presentación del cliente (no dominio, no permisos, no datos de negocio)
- **Almacenamiento**: `localStorage` (clave dedicada de UI, p.ej. `compras.ui.theme`)
- **Valores**: `"light"` | `"dark"` | *ausente* (sin preferencia guardada)
- **Reglas**:
  - Si hay valor guardado, se aplica.
  - Si no hay valor, se sigue `prefers-color-scheme` del sistema.
  - El cambio vía interruptor actualiza la preferencia guardada.
- **Validación**: Solo valores permitidos; valores inválidos/ausentes → fallback a `prefers-color-scheme`.
- **Relaciones**: Ninguna con entidades de dominio.
- **Migración**: No aplica (lectura tolerante a ausencia).

## Estados e Insignias (presentación de estados existentes)

No se crean estados; se representan visualmente los existentes con nombres específicos iguales al filtro del 006:
- "Solicitud – Borrador"
- "Solicitud – Pendiente de aprobación"
- "OC emitida – Aprobada"
- "OC – Recibida"
- "Cancelada"

## Métricas Derivadas (cálculo en vista, sin persistir)

- **Gasto por mes** y **Top 5 proveedores**: suma del total de OC emitidas (aprobado y recibido) por fecha de emisión, separado por moneda, sin convertir. Calculado en memoria/UI a partir de datos existentes; no se persiste.
- **Requiere tu atención**: consulta derivada por rol 004 (gerente/admin, bodeguero, comprador, consulta) sobre datos existentes; reutilizable en presentación para 007.

## Contratos de Persistencia

- `src/purchasing-storage.js`, `src/storage.js`, `src/auth.js`: **sin cambios de comportamiento ni de esquema**.
- No se agregan claves de dominio; solo la clave de preferencia de tema UI en `localStorage` (espacio de presentación).
