# Plan de Implementación: Extensión de Órdenes de Compra con Detalle, Flujo, Recepción e Impresión

**Rama**: `002-purchase-order-workflow` | **Fecha**: 2026-11-07 | **Especificación**: [spec.md](spec.md)

**Entrada**: Extensión del módulo de Compras para incorporar líneas de detalle, totales automáticos, acciones de flujo según estado, recepción con actualización única de stock, historial de estados y vista de detalle imprimible, con persistencia local y sin roles reales.

## Resumen

La extensión se implementa sobre la SPA Vite/JavaScript existente. Agrega un editor de líneas con totales derivados, acciones de estado contextuales, recepción idempotente con actualización de stock, historial de cambios y una vista imprimible. La cabecera de la orden permanece en `erp_base_module:documents`; los datos propios de la extensión se guardan en claves de `localStorage` separadas para no alterar el esquema del módulo base.

La recepción se ejecuta como una transacción local con diario de recuperación para cumplir la regla de todo o nada. La interfaz reutiliza el marco, la terminología, los estilos, la sanitización y el arnés de pruebas existentes.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript ES2022, HTML5, CSS.

**Dependencias Principales**: Vite 8.2, Vitest 4.1 y jsdom 30. Sin framework de interfaz ni backend.

**Almacenamiento**: `localStorage` del navegador.

- `erp_base_module:entities`: proveedores existentes.
- `erp_base_module:documents`: cabecera base de órdenes.
- `erp_purchasing:employees`: empleados existentes.
- `erp_purchasing:categories`: categorías existentes.
- `erp_purchasing:products`: productos y stock.
- `erp_purchasing:purchase-order-lines`: líneas de detalle existentes.
- `erp_purchasing:order-metadata`: empleado solicitante, `stock_aplicado` y `appliedAt`.
- `erp_purchasing:status-history`: historial append-only de estados.
- `erp_purchasing:transactions`: diario de transacciones para recuperación.

**Pruebas**: Vitest con jsdom. Pruebas unitarias para dominio y pruebas de integración para flujos de interfaz, persistencia y recuperación.

**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles.

**Tipo de Proyecto**: Aplicación web de una sola página, local y sin servidor.

**Objetivos de Rendimiento**:

- Renderizar la lista de 2.000 órdenes en ≤ 1 s.
- Abrir el detalle de una orden de 50 líneas en ≤ 200 ms.
- Recalcular totales al editar una línea en ≤ 100 ms.
- Completar la recepción de una orden de 50 líneas en ≤ 1 s.
- Generar la vista imprimible de una orden de 50 líneas en ≤ 500 ms.
- Mantener los presupuestos del módulo base: búsqueda ≤ 300 ms y panel ≤ 500 ms con 500 proveedores y 2.000 órdenes.

**Restricciones**:

- Sin backend, autenticación, roles ni permisos diferenciados.
- Una sola bodega y sin recepciones parciales.
- Se conservan las claves y la semántica de los campos del módulo base.
- Todo contenido introducido por el usuario se sanitiza antes de insertarse en el DOM.
- La interfaz debe cumplir WCAG 2.1 AA.
- La impresión usa la impresión nativa del navegador, sin PDF en servidor.
- No se avanza a implementación sin pruebas y build correctos.

**Escala/Alcance**: 500 productos, 2.000 órdenes, hasta 50 líneas por orden y hasta 5 cambios de estado por orden en el flujo normal.

**Incógnitas**: Ninguna. El contexto técnico no contiene `NEEDS CLARIFICATION`.

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

| Principio | Estado | Evidencia |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Las reglas de totales, transiciones, recepción e historial se concentran en `src/domain/purchasing.js` y el almacenamiento en `src/purchasing-storage.js`; la interfaz se separa en módulos enfocados. |
| II. Pruebas y verificación | PASS | Se definen pruebas unitarias y de integración antes o junto con cada comportamiento visible, incluida la recuperación de transacciones y la idempotencia del stock. |
| III. Consistencia de experiencia | PASS | Se reutilizan el marco, las etiquetas, los estados vacíos, las validaciones y los patrones visuales existentes; se exige accesibilidad WCAG 2.1 AA. |
| IV. Rendimiento y confiabilidad | PASS | Se fijan presupuestos medibles y la recepción usa diario de transacción, rollback y `stock_aplicado` para evitar dobles aplicaciones. |
| Estándares de calidad | PASS | Se incorporan ESLint y Prettier con los scripts `lint` y `format`, y el cierre exige `npm run lint` sin errores además de `npm test -- --run` y `npm run build`. |

No se identifican violaciones que requieran justificación de complejidad.

## Alcance

### Incluido

- Editor de líneas con producto, cantidad, precio unitario y subtotal derivado.
- Cálculo automático de neto, IVA del 19 % y total con dos decimales internos y visualización CLP sin decimales.
- Acciones de estado contextuales según el ciclo canónico de Compras.
- Recepción de órdenes aprobadas con actualización única de stock.
- Historial append-only con estado anterior, estado nuevo y fecha/hora.
- Vista de detalle e impresión nativa del navegador.
- Persistencia local de líneas, totales, metadatos, historial y marca de stock aplicado.
- Mantenimiento mínimo de productos y stock como dependencia habilitante de la extensión.
- Tratamiento de órdenes históricas sin metadatos como legado de solo lectura.

### Excluido

- Autenticación, roles, permisos y registro del actor de cada cambio.
- Recepciones parciales, devoluciones, múltiples bodegas y transferencias de stock.
- Sincronización entre pestañas, dispositivos o usuarios.
- Generación de PDF en servidor, firma electrónica y envío por correo.
- Facturación, pagos, presupuestos y ventas.
- Numeración automática de folios.

## Fase 0 — Investigación

Las decisiones completas están en [research.md](research.md). Resumen:

- **D1**: Extender la SPA Vite existente sin framework adicional.
- **D2**: Persistir metadatos de la orden en una clave de extensión separada.
- **D3**: Calcular con dos decimales internos y mostrar CLP sin decimales.
- **D4**: Recepción idempotente con diario de transacciones y recuperación.
- **D5**: Historial append-only con `changedAt` en ISO 8601 y visualización en America/Santiago.
- **D6**: En Compras, usar únicamente el ciclo canónico `borrador → pendiente → aprobado → recibido` y `cancelado` desde `borrador` o `pendiente`; rechazar configuraciones distintas con aviso y derivar las acciones solo del ciclo canónico.
- **D7**: Vista imprimible dentro de la SPA con CSS `@media print`.
- **D8**: Reutilizar y completar el catálogo mínimo de productos y stock.
- **D9**: Probar con Vitest y jsdom.
- **D10**: Tratar órdenes históricas sin metadatos como legado de solo lectura.

## Fase 1 — Diseño

### Modelo de datos

El detalle está en [data-model.md](data-model.md). Entidades principales:

- **Orden de Compra**: cabecera base más metadatos de empleado y stock aplicado.
- **Detalle de Compra**: línea con producto, cantidad, costo unitario y subtotal derivado.
- **Producto**: nombre, unidad, categoría y stock entero no negativo.
- **Cambio de Estado**: registro inmutable de transición.
- **Transacción de Recepción**: diario temporal para atomicidad y recuperación.

### Contratos

El detalle está en [contracts/purchase-order-workflow.md](contracts/purchase-order-workflow.md). Cubre:

- Operaciones de almacenamiento de órdenes, líneas, estados y recepción.
- Atomicidad, idempotencia e historial.
- Acciones de interfaz, matriz de estados y contrato de impresión.
- Códigos de error y reglas de accesibilidad.

### Quickstart

La guía de validación está en [quickstart.md](quickstart.md). Incluye comandos, escenarios manuales y resultados esperados.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-purchase-order-workflow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── purchase-order-workflow.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Fase 2, generado por /speckit.tasks
```

### Código Fuente (raíz del repositorio)

```text
index.html
src/
├── main.js
├── app.js                         # integración de vistas y eventos existentes
├── styles.css                     # estilos de pantalla e impresión
├── storage.js                     # CRUD base, sin cambios de esquema
├── purchasing-storage.js          # órdenes, metadatos, líneas, historial y transacciones
├── module-config.js               # etiquetas y ciclo de vida
├── domain/
│   └── purchasing.js              # totales, validaciones, transiciones y recepción
├── purchase-order-lines.js        # editor de líneas y recálculo de totales
├── purchase-order-detail.js       # detalle, acciones de estado e historial
├── purchase-order-print.js        # vista imprimible
└── product-catalog.js             # consulta y mantenimiento mínimo de productos y stock

tests/
├── unit/
│   ├── purchasing-workflow.test.js
│   └── purchase-order-transactions.test.js
├── integration/
│   ├── purchase-order-lines.test.js
│   ├── purchase-order-status.test.js
│   ├── purchase-order-print.test.js
│   └── purchase-order-persistence.test.js
└── (pruebas existentes del módulo base)
```

**Decisión de Estructura**: Se conserva la aplicación SPA y se añaden módulos enfocados en lugar de concentrar la extensión en `app.js`. El dominio y el almacenamiento quedan separados de la vista para poder probar totales, transiciones, historial y recuperación sin depender del DOM. La vista imprimible se mantiene dentro de la misma aplicación para reutilizar datos y estilos, pero con una sección y estilos de impresión dedicados.

## Reevaluación de la Constitución Post-Diseño

| Principio | Estado | Evidencia de diseño |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Separación dominio, almacenamiento y vistas; contratos explícitos; sin duplicar el CRUD base. |
| II. Pruebas y verificación | PASS | Cada contrato tiene escenarios unitarios o de integración asociados en la estrategia de pruebas. |
| III. Consistencia de experiencia | PASS | La matriz de acciones, los errores y la impresión reutilizan patrones y terminología del módulo. |
| IV. Rendimiento y confiabilidad | PASS | Presupuestos medibles, transacción local, recuperación al arrancar e idempotencia persistida. |
| Complejidad | PASS | No se añaden proyectos ni servicios; se introducen tres módulos de vista y un diario local justificados por la atomicidad y la mantenibilidad. |

## Estrategia de Pruebas

### Unitarias

- Cálculo de subtotal, neto, IVA y total con varias líneas, redondeo a dos decimales y visualización CLP.
- Validación de producto, cantidad entera positiva, costo no negativo y producto duplicado.
- Matriz de transiciones válidas e inválidas.
- Generación de historial solo para transiciones exitosas.
- Planificación de recepción con cantidades y stocks esperados.
- Idempotencia de recepción con `stock_aplicado`.
- Recuperación de transacciones `prepared` y `applied`.
- Reglas de legado para órdenes sin metadatos.

### Integración

- Crear, editar y eliminar líneas; verificar recálculo de totales.
- Guardar una orden sin líneas y comprobar el rechazo.
- Recorrer todos los estados y verificar las acciones visibles.
- Intentar una transición inválida y comprobar que no cambia estado ni historial.
- Recibir una orden, verificar stock, repetir la recepción y comprobar que no se duplica.
- Cancelar una orden y verificar que el stock no cambia.
- Consultar el historial antes y después de recargar.
- Abrir la vista imprimible y comprobar contenido, ausencia de navegación y estilos de impresión.
- Verificar persistencia de líneas, totales, metadatos, historial y `stock_aplicado`.
- Verificar que una orden histórica sin metadatos se muestra en modo legado.

### Rendimiento

- Lista de 2.000 órdenes renderizada en ≤ 1 s.
- Detalle de 50 líneas en ≤ 200 ms.
- Recálculo de 50 líneas en ≤ 100 ms.
- Recepción de 50 líneas en ≤ 1 s.
- Vista imprimible de 50 líneas en ≤ 500 ms.
- Medición con `performance.now()` en pruebas automatizadas.

### Accesibilidad

- Acciones operables con teclado y foco visible.
- Etiquetas asociadas a todos los campos de línea y estado.
- Errores anunciables y asociados al campo.
- Tablas con encabezados semánticos.
- Contraste mínimo 4,5:1.
- Botones con texto o `aria-label`.

## Fases de Implementación

### Fase 0 — Investigación

Completada en [research.md](research.md).

### Fase 1 — Diseño

Completada con [data-model.md](data-model.md), [contracts/purchase-order-workflow.md](contracts/purchase-order-workflow.md) y [quickstart.md](quickstart.md).

### Fase 2 — Tareas

Se generará con `/speckit.tasks` e incluirá, como mínimo:

1. Extender el dominio de compras con totales, validaciones, transiciones, historial y planificación de recepción.
2. Extender el almacenamiento de compras con metadatos, historial, transacciones y recuperación.
3. Implementar el editor de líneas y el recálculo de totales.
4. Implementar el detalle de orden, la matriz de acciones y el historial.
5. Implementar la recepción transaccional y la idempotencia de stock.
6. Implementar la vista imprimible y los estilos de impresión.
7. Completar el mantenimiento mínimo de productos y stock requerido para operar la extensión.
8. Añadir pruebas unitarias y de integración, verificar rendimiento, accesibilidad, build y regresiones.

## Riesgos y Decisiones Abiertas

| Riesgo o decisión | Tratamiento |
|---|---|
| `localStorage` no ofrece transacciones entre claves | Diario `erp_purchasing:transactions` con fases `prepared` y `applied`, rollback y recuperación al arrancar. |
| Dos pestañas podrían competir por una recepción | La marca `stock_aplicado` y la validación de estado reducen el riesgo; la sincronización entre pestañas está fuera de alcance y se documenta como limitación. |
| El mantenedor visual de productos no está completo en la rama actual | Se incluye una interfaz mínima de consulta y mantenimiento de productos y stock como dependencia habilitante (D8), sin crear una nueva historia de usuario. |
| Órdenes históricas sin metadatos | Se muestran como legado de solo lectura; no se infiere stock aplicado ni se inventan empleados (D10). |
| Precisión monetaria | Dos decimales internos y visualización CLP sin decimales; pruebas con tolerancia y comparación del total persistido. |
| La impresión varía según el navegador | Se valida el contenido y la ocultación de controles con jsdom; la calidad tipográfica final se revisa manualmente. |
| Crecimiento de `app.js` | La nueva lógica se separa en módulos de dominio, almacenamiento y vistas. |

## Seguimiento de Complejidad

No se introducen nuevos proyectos, servidores ni dependencias de ejecución. La complejidad adicional se limita a:

- Un diario de transacciones local, necesario para la regla de recepción completa o nula.
- Tres módulos de vista y un módulo de catálogo, necesarios para evitar un mayor crecimiento de `app.js`.
- Claves de extensión separadas, necesarias para no alterar el esquema del módulo base.

No hay violaciones de la constitución que requieran una justificación adicional.
