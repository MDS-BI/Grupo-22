# Investigación de Implementación: Extensión de Órdenes de Compra

**Rama**: `002-purchase-order-workflow`
**Fecha**: 2026-11-07
**Especificación**: [spec.md](spec.md)

## Objetivo

Resolver las decisiones técnicas necesarias para implementar líneas de detalle, totales, flujo de estados, recepción con stock, historial y vista imprimible sobre la aplicación Vite/JavaScript existente, sin backend, sin roles reales y con persistencia en `localStorage`.

## Decisiones

### D1 — Mantener la arquitectura SPA actual sin framework adicional

- **Decisión**: Extender la aplicación Vite existente con módulos JavaScript ES2022 y reutilizar `src/app.js`, `src/storage.js`, `src/module-config.js`, `src/purchasing-storage.js`, `src/domain/purchasing.js`, `index.html` y `src/styles.css`. Las nuevas responsabilidades de interfaz se separarán en módulos enfocados para no seguir engordando `app.js`.
- **Justificación**: Es la arquitectura ya probada del proyecto, no requiere backend ni nuevas dependencias y permite reutilizar el marco visual, la navegación, el etiquetado y la sanitización vigentes.
- **Alternativas consideradas**: Añadir un framework de interfaz (React/Vue) o un backend; se descartan porque cambian el stack, amplían el alcance y no son necesarios para una extensión local.

### D2 — Persistir los metadatos de la orden en una extensión separada

- **Decisión**: Mantener la cabecera base en `erp_base_module:documents` y persistir los datos propios de la extensión en `erp_purchasing:order-metadata`, con `id_orden_compra`, `id_empleado`, `stock_aplicado` y `appliedAt`. Las líneas permanecen en `erp_purchasing:purchase-order-lines`.
- **Justificación**: `storage.js` filtra las claves del documento a `BASE_FIELDS.document`; agregar campos propios al documento base obligaría a modificar el almacenamiento central. Una extensión separada conserva la semántica y las claves del módulo base, y permite evolucionar los campos de Compras sin tocar el CRUD genérico.
- **Alternativas consideradas**: Añadir `id_empleado` y `stock_aplicado` a `BASE_FIELDS.document`; se descarta porque contamina el contrato base. Guardar todo en un único documento extendido; se descarta por el mismo motivo.

### D3 — Calcular con dos decimales internos y mostrar CLP sin decimales

- **Decisión**: Reutilizar `roundMoney` del dominio para calcular subtotal, neto, IVA y total con dos decimales. Persistir el total en `totalAmount` con dos decimales internos y formatear todos los importes en la interfaz como pesos chilenos (CLP) sin decimales, usando el formateador existente.
- **Justificación**: Respeta la regla de cálculo del módulo base y la corrección de experiencia que muestra CLP sin decimales. Evita errores de coma flotante en las pruebas y mantiene consistencia visual.
- **Alternativas consideradas**: Usar pesos enteros en todos los cálculos; se descarta porque perdería precisión en el IVA. Mostrar dos decimales en pantalla; se descarta porque contradice el formato CLP ya aplicado.

### D4 — Recepción idempotente con transacción local y recuperación

- **Decisión**: Implementar la recepción como una transacción local en `localStorage` con un diario en `erp_purchasing:transactions`. La transacción guarda las instantáneas previas y posteriores de productos, documento, metadatos e historial, aplica los cambios y se marca como completada. Al arrancar, las transacciones incompletas se revierten; las completadas se descartan. El campo persistido `stock_aplicado` sigue siendo la garantía funcional contra una segunda recepción.
- **Justificación**: `localStorage` no ofrece transacciones entre claves. El diario permite cumplir la regla de recepción completa o nula y recuperar el estado si una escritura falla o la aplicación se interrumpe entre escrituras.
- **Alternativas consideradas**: Escribir directamente producto y orden sin diario; se descarta porque puede dejar stock actualizado sin orden marcada o viceversa. Utilizar una sola clave global para todo el estado; se descarta porque rompe las claves y la arquitectura del módulo base.

### D5 — Historial append-only con marca de tiempo local

- **Decisión**: Persistir el historial en `erp_purchasing:status-history` como registros inmutables con `id`, `id_orden_compra`, `from`, `to` y `changedAt`. `changedAt` se guarda en ISO 8601 y se muestra en zona horaria America/Santiago con formato `dd-mm-aaaa HH:mm`. No se registra actor porque no existen roles ni autenticación.
- **Justificación**: Un registro append-only simplifica la auditoría, evita ediciones manuales y permite reconstruir la línea de tiempo sin modificar el documento base.
- **Alternativas consideradas**: Guardar el historial dentro del documento base; se descarta para no alterar el esquema base ni mezclar lectura y auditoría. Registrar solo el último cambio; se descarta porque no cumple el requisito de historial completo.

### D6 — Usar el ciclo de vida canónico y derivar las acciones solo de él

- **Decisión**: En Compras, el ciclo de vida es fijo y canónico: `borrador → pendiente → aprobado → recibido`, con `cancelado` desde `borrador` o `pendiente`. Si la configuración define estados o transiciones no canónicos, se rechazan, se muestra un aviso y se aplica el ciclo canónico. Las acciones de flujo se derivan solo del ciclo canónico. Las etiquetas de estado sí provienen de la configuración.
- **Justificación**: Un ciclo fijo permite validar las transiciones y la recepción de stock de forma determinista, manteniendo las etiquetas editables desde la configuración.
- **Alternativas consideradas**: Permitir estados o transiciones no canónicos; se descarta porque contradice la especificación y la regla de recepción de stock. Fijar también las etiquetas de estado en el dominio; se descarta porque la configuración sigue siendo la fuente de las etiquetas de estado.

### D7 — Vista imprimible dentro de la SPA con CSS de impresión

- **Decisión**: Añadir una vista de detalle imprimible en la misma SPA, con una sección dedicada y estilos `@media print` que oculten barra lateral, navegación, formularios y acciones. La impresión se dispara con la impresión nativa del navegador. La vista se construye desde la orden, sus líneas, los metadatos, el proveedor, el empleado y el historial.
- **Justificación**: No requiere generación de PDF ni servicios externos, cumple el supuesto de impresión nativa y permite validar el contenido con jsdom.
- **Alternativas consideradas**: Generar PDF en el navegador con una librería externa; se descarta por dependencia y alcance. Generar PDF en servidor; se descarta porque no hay backend.

### D8 — Reutilizar y completar el catálogo de productos mínimo

- **Decisión**: Reutilizar `loadProducts` y `addProduct` existentes, y añadir las operaciones de actualización, eliminación y ajuste de stock necesarias para la extensión. La interfaz incluirá el acceso mínimo requerido para consultar y mantener productos y stock; si el mantenedor visual de productos ya existe en el módulo base, se reutiliza sin duplicarlo.
- **Justificación**: La extensión no puede operar ni validarse sin productos y stock. El almacenamiento ya existe, pero el mantenimiento visual es una dependencia habilitante de esta entrega.
- **Alternativas consideradas**: Asumir que los productos se cargan por fuera de la interfaz; se descarta porque deja la funcionalidad inutilizable para el usuario final. Incluir un módulo de inventario completo; se descarta por estar fuera de alcance.

### D9 — Probar con Vitest y jsdom, incluyendo transacciones y flujo end-to-end

- **Decisión**: Mantener Vitest + jsdom. Añadir pruebas unitarias para totales, transiciones, historial y planificación de recepción; pruebas de integración para editor de líneas, botones de estado, recepción, recuperación de transacciones, historial, impresión y persistencia.
- **Justificación**: Es el arnés existente, no requiere infraestructura nueva y permite aislar `localStorage` y el DOM con las mismas convenciones del proyecto.
- **Alternativas consideradas**: Pruebas end-to-end con navegador real; se posponen porque no hay Playwright ni Cypress configurados y no son necesarias para el MVP.

### D10 — Tratar los documentos históricos sin metadatos como legado de solo lectura

- **Decisión**: Si una orden existente no tiene registro en `erp_purchasing:order-metadata`, se muestra como orden histórica incompleta, con empleado desconocido y sin acciones que dependan de la extensión. No se inventan empleados ni marcas de stock. Las órdenes nuevas y las que se completen desde la interfaz cumplen todas las invariantes de la extensión.
- **Justificación**: Evita modificar datos históricos de forma especulativa y previene aplicar stock sobre órdenes antiguas ya recibidas. La extensión no puede reconstruir retroactivamente quién registró una orden ni si su stock ya fue aplicado.
- **Alternativas consideradas**: Rellenar automáticamente `stock_aplicado = true` para órdenes recibidas; se descarta porque no hay evidencia de que el stock se haya aplicado. Bloquear toda la aplicación hasta migrar; se descarta por ser innecesariamente disruptivo.

## Resolución de Incógnitas

No quedan marcadores `NEEDS CLARIFICATION` en el contexto técnico. Las decisiones anteriores cubren persistencia, precisión monetaria, concurrencia local, historial, impresión, catálogo y pruebas.

## Riesgos Residuales

- El almacenamiento local no sincroniza pestañas ni dispositivos; dos pestañas podrían competir por una recepción. El diario y `stock_aplicado` reducen el riesgo dentro del modelo permitido.
- La impresión depende de las fuentes y márgenes del navegador; la validación automatizada comprobará contenido y ausencia de elementos de aplicación, no la calidad tipográfica final.
- El catálogo de productos puede requerir una interfaz mínima adicional si no está disponible en la rama base; se tratará como tarea habilitante, no como nueva historia de usuario.
