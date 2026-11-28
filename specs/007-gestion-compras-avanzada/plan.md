# Plan de Implementación: Gestión de Compras Avanzada

**Rama**: `007-gestion-compras-avanzada` | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md)

**Entrada**: Siete historias de gestión sobre el módulo de Compras (evaluación de proveedores, compra por producto con precios por cantidad, stock mínimo y solicitud sugerida, reportes, presupuesto por área, notificaciones y mejoras rápidas), reutilizando los espacios reservados por el `005` y las listas de precios del `006`, sin alterar `001`–`006` fuera de los cambios declarados.

## Resumen

La lógica nueva es mayoritariamente de **cálculo sobre datos existentes**, por lo que se implementa como funciones puras en módulos de `src/domain/` (`supplier-evaluation.js`, `price-tiers.js`, `reorder.js`, `budget.js`, `reports.js`, `notifications.js`, además de `price-list.js` del `006`). La persistencia agrega tres claves a `KEYS` y cuatro campos opcionales con valor por defecto (`stock_minimo`, `estado`, `id_area` y `tramos`), lo que mantiene compatibles los datos y las pruebas anteriores. La interfaz se concentra en `src/ui-gestion.js` (Reportes, Evaluación, Áreas y presupuestos, campana y tarjeta de reposición) y `src/ui-purchase-mode.js` (compra por producto), con `src/app.js` como orquestador de eventos y navegación, reutilizando los tokens y componentes visuales del `005` (tarjetas, chips, tablas, gráficos SVG).

## Contexto Técnico

| Aspecto | Decisión | Evidencia en el repositorio |
|---|---|---|
| Lenguaje y marcado | JavaScript ES2022 (módulos ES), HTML5 y CSS | `"type": "module"` en `package.json`; `index.html` como entry point |
| Empaquetado y servidor de desarrollo | Vite 8.2 | `npm run dev`, `npm run build` y `npm run preview` en `package.json` |
| Pruebas | Vitest 4.1 + jsdom 30 | `npm test -- --run`; `vitest.config.mjs` con `fileParallelism: false` |
| Calidad | ESLint 10 + Prettier 3 | `npm run lint`, `npm run format`; `eslint.config.js` |
| Persistencia | `localStorage`, sin backend ni llamadas de red | `src/storage.js` y `src/purchasing-storage.js` leen/escriben JSON por clave |
| Claves nuevas en 007 | `erp_purchasing:areas`, `erp_purchasing:budgets`, `erp_purchasing:notification-reads` | Incluidas en `KEYS`; cubiertas por snapshot/restore/clear |
| Campos nuevos en 007 | `stock_minimo`, `estado`, `id_area`, `tramos` | Producto, proveedor, metadata de orden y precio acordado del `006` |
| Estrategia de pruebas | Unitarias puras + integración con DOM simulado | `tests/unit/` y `tests/integration/`; helper `tests/helpers/purchasing-app.js` |
| Objetivos de rendimiento | Reportes con 2.000 OC en ≤ 1 s (SC-008); Panel ≤ 500 ms | Cálculos lineales e historial indexado por orden una sola vez por cálculo |

Las pruebas existentes se mantienen sin cambiar su intención; solo se ajustan los conteos de demostración (12→16).

**Restricciones**:

- No cambiar la intención de las pruebas existentes; solo se ajustan los conteos de demostración (12→16). No cambiar transiciones ni la matriz de `004` más allá de los dos permisos nuevos.
- Toda creación de órdenes pasa por `savePurchaseOrder` para heredar las reglas de `002`, `004` y `006`. Los borradores creados por sugeridas y carrito pueden omitir `id_area`; `AREA_REQUIRED` se valida solo al enviar a revisión (FR-018/T033). Punto de aplicación: `src/purchasing-storage.js` → `changeOrderStatus(orderId, 'pendiente')`, con el valor de `#document-area` leído en el submit de `src/app.js` (T034) y el error definido en `src/domain/purchasing.js` (T007); prueba dedicada T065.
- Sanitizar todo texto en el DOM; CSV con escapado RFC 4180.
- El precio guardado se recalcula siempre en servidor desde la lista vigente; la UI solo propone un precio y el payload del cliente nunca es fuente de verdad (FR-033/SC-010, T064).
- WCAG 2.1 AA; los gráficos con tabla equivalente; la bandeja operable con teclado y `Escape`.

**Incógnitas**: Ninguna bloqueante. Umbrales A/B/C, regla de reposición y advertencia de presupuesto son propuestas ajustables con `/speckit.clarify` sin cambiar la arquitectura.

## Verificación de la Constitución

| Principio | Estado | Evidencia |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Módulos de dominio puros en `src/domain/`, vistas de gestión en `ui-gestion.js` y `ui-purchase-mode.js`; `app.js` enlaza eventos y navegación. |
| II. Test-first y verificación | PASS | Pruebas unitarias por módulo antes de la vista; integración por historia; batería completa en cada fase. |
| III. Consistencia de UX | PASS | Reutiliza componentes del `005` (tarjetas, chips, gráficos, insignias) y los mensajes en español del sistema. |
| IV. Rendimiento y confiabilidad | PASS | Cálculos lineales con índices; creación de solicitudes sugeridas con restauración ante error (snapshot de `KEYS`). |
| Excepción spec 005 | No aplica | El 007 es funcional; no usa la excepción visual. |

## Decisiones de Diseño

1. **Vistas derivadas, no persistidas**: evaluación, reportes y avisos se calculan al mostrarse; así no hay datos que se desincronicen y la sustitución de demo no deja residuos. Solo se guardan las lecturas de avisos.
2. **Fecha de recepción desde el historial**: `status-history` ya registra el paso a `recibido` con `changedAt`; no se agrega campo nuevo a la orden.
3. **Área en la metadata de orden** (igual que `id_empleado` en `003`): no toca `BASE_FIELDS.document` ni la validación de `001`.
4. **Área: una sola regla** (activación condicional del `006`): los borradores se guardan sin `id_area` aunque haya áreas activas; el área es obligatoria solo al enviar a revisión y solo si existe al menos un área activa. Así los datos y las pruebas anteriores siguen funcionando y las sugeridas mantienen la generación en un clic (SC-002).
5. **Proveedor inactivo como campo de la entidad base**: se agrega `estado` a `BASE_FIELDS.entity`; la eliminación en cascada de `001` FR-003 no cambia.
6. **Solicitudes sugeridas atómicas**: se toma un snapshot de `KEYS` y, si falla la creación de algún borrador, se restaura todo.
7. **CSV propio**: función `toCsv` con BOM y `;` para Excel en configuración chilena; descarga con `Blob` y un enlace temporal.
8. **Tramos dentro del precio acordado**: se agregan como lista opcional en la misma entrada del `006` (no como entidad aparte); `unitPriceFor` reemplaza la lectura directa de `precio` en `applySupplierPriceList`, de modo que el `006` sigue siendo el único punto que fija precios y un precio sin tramos se comporta igual que antes. Separación de responsabilidades: la lista fija los tramos, la UI calcula para mostrar y el servidor recalcula el precio de cada línea en `savePurchaseOrder`, `replaceOrderLines`, `addPurchaseOrderLine` y `addOrUpdatePurchaseOrderLine`, ignorando el payload (FR-033/SC-010, T064).
9. **Compra por producto como modo del mismo formulario**: el modo «Comprar por producto» arma un carrito y, al guardar, llama a `savePurchaseOrder` una vez por proveedor dentro de un snapshot, sin exigir `id_area` en el borrador (T033); el modo «Elegir proveedor primero» reutiliza el formulario existente, así las pruebas del `002`–`006` sobre ese formulario no cambian.
10. **Calificación interna vs. mostrada**: `gradeFor` se calcula siempre como entrada de FR-011, con independencia del rol; ficha, tarjetas y Reportes exigen `reports.view` y solo la tabla comparativa de US7 muestra la columna a roles con `documents.create` (excepción explícita de FR-005).

## Estructura del Proyecto

```text
index.html                         # entry point de Vite; vistas, formularios e ids estables
src/
├── main.js                        # arranque de la aplicación (boot)
├── app.js                         # orquestación: eventos, navegación, submit con #document-area
├── auth.js                        # usuarios, sesión, RBAC y REPORTS_VIEW / BUDGETS_MANAGE
├── module-config.js               # BASE_FIELDS.entity incluye estado; configuración del módulo
├── access-policy.js               # resolución del empleado solicitante desde la sesión RBAC
├── storage.js                     # claves base, entidades, documentos, rubros y snapshots
├── purchasing-storage.js          # KEYS, persistencia de 007 y recálculo de precios en los 4 servicios
├── purchasing-management.js       # servicios de 007: evaluación, opciones, carrito, áreas, notificaciones
├── purchasing-demo-data.js        # carga/sustitución atómica de la demostración del 007
├── purchasing-list-query.js       # consultas y filtros de listas
├── purchasing-list-view.js        # render de listas de solicitudes y OC
├── domain/
│   ├── purchasing.js              # estados, transiciones, totales y PURCHASING_ERRORS
│   ├── price-list.js              # validación de listas y priceLinesFromList (usa unitPriceFor)
│   ├── price-tiers.js             # normalizar/validar tramos, unitPriceFor, ranking FR-011, carrito
│   ├── supplier-evaluation.js     # receiptDateOf, evaluateSupplier, gradeFor
│   ├── reorder.js                 # isBelowMinimum, suggestedQuantity, pickSupplier
│   ├── budget.js                  # monthKey, areaSpend, budgetStatus
│   ├── reports.js                 # spendReport, toCsv (BOM, ';', RFC 4180)
│   └── notifications.js           # notificationsFor, unreadCount
├── ui-gestion.js                  # Reportes + pestañas, campana, tarjeta de reposición
├── ui-purchase-mode.js            # «Comprar por producto», comparación y carrito
├── ui-dashboard.js                # Panel con «Productos bajo el mínimo»
├── ui-shell.js / ui-side-panel.js # navegación y panel lateral con permisos
├── supplier-summary-view.js       # ficha del proveedor con evaluación y tramos
├── product-catalog.js             # catálogo, stock mínimo y tramos por proveedor
├── purchase-order-detail.js       # detalle, presupuesto del área y Duplicar
├── purchase-order-lines.js        # líneas de la orden
├── purchase-order-print.js        # impresión del detalle
├── ui-chips.js / ui-charts.js     # chips de rubros y gráficos SVG con tabla equivalente
├── ui-theme.js / ui-feedback.js   # tema claro/oscuro y mensajes accesibles
└── styles.css / styles/tokens.css # estilos y tokens visuales del 005
tests/
├── helpers/purchasing-app.js      # montaje de JSDOM y localStorage por prueba
├── unit/gestion-dominio-007.test.js
├── unit/purchasing-management-007.test.js
├── unit/purchasing-demo-data.test.js
├── unit/auth.test.js, storage.test.js, purchasing-workflow.test.js, ...
└── integration/gestion-007.test.js, purchasing-006.test.js, purchase-order-*.test.js, ...
```

## Orden de Implementación y Reparto

| Fase | Contenido | Responsable sugerido | Depende de |
|---|---|---|---|
| Base | Permisos, claves, campos nuevos, módulos de dominio vacíos con pruebas | Uno del grupo | — |
| US1 + US6 | Evaluación; duplicar, inactivar, exportar | Persona A | Base; US1 es dependencia dura de US2 y US7 |
| US7 | Tramos por cantidad, comparación de proveedores y carrito | Persona A (después de US1) | Base + US1 (dependencia dura): la calificación de FR-004 es dato interno obligatorio del paso (4) de FR-011, sin omisión ni desempate alternativo; su visualización en la tabla sigue la excepción de FR-005 |
| US2 + US5 | Stock mínimo y sugeridas; notificaciones | Persona B | Base + US1 (dependencia dura para US2, que necesita la calificación de FR-004 en FR-011); US5 usa la consulta del 005 |
| US4 + US3 | Presupuesto por área; reportes | Persona C | Base (Reportes usa áreas de US4) |
| Demo y cierre | Datos demo, README, verificación completa | Uno del grupo | Todas |

Las ramas de cada persona salen de la rama del 007 después de integrar la fase Base, y se integran de una en una para limitar conflictos en `app.js`, `index.html` y `styles.css`.

## Estrategia de pruebas en Vitest

| Nivel | Ubicación | Qué cubre | Cómo se ejecuta |
|---|---|---|---|
| Dominio puro | `tests/unit/gestion-dominio-007.test.js` | Tramos (`unitPriceFor`, bordes 9/10/49/50), ranking de FR-011, `gradeFor`, gasto por área, CSV, avisos | Vitest con aserciones sin DOM |
| Servicios y persistencia | `tests/unit/purchasing-management-007.test.js`, `tests/unit/purchasing-storage-007.test.js`, `tests/unit/storage.test.js` | Permisos, claves, sugeridas atómicas, duplicación, inactivación, `AREA_REQUIRED`, precios recalculados en los cuatro servicios | Vitest con `localStorage` simulado por el helper |
| Integración visible | `tests/integration/gestion-007.test.js`, `tests/integration/purchasing-*.test.js`, `tests/integration/purchase-order-*.test.js` | Flujos por rol, navegación, filtros, bandeja, panel y detalle | Vitest + JSDOM mediante `tests/helpers/purchasing-app.js` |
| Rendimiento | Pruebas de reportes y demostración | 2.000 OC en ≤ 1 s (SC-008) y coherencia de los 16 pedidos demo | Vitest con temporización y snapshot de `KEYS` |
| Regresión 001–006 | Batería completa en `tests/unit/` y `tests/integration/` | Intención original intacta; solo cambian los conteos de demo 12→16 | `npm test -- --run` |

`vitest.config.mjs` fija `fileParallelism: false` porque las pruebas comparten claves de `localStorage` y el DOM simulado; cada prueba limpia su estado con los helpers de `tests/helpers/`. Las pruebas se escriben antes o junto con la implementación de cada historia, según exige la constitución del proyecto.

## Validación

```bash
npm test -- --run
npm run lint
npm run build
```

Recorrido manual en [quickstart.md](quickstart.md).

## Seguimiento de Complejidad

| Desviación | Motivo | Alternativa descartada |
|---|---|---|
| Área obligatoria al enviar, solo si hay áreas activas | Compatibilidad con datos y pruebas previas; borradores sin área en sugeridas y carrito | Exigirla al crear obligaba a añadir un selector de área a la sugerida y a la UI de compra por producto y rompía la generación en un clic (SC-002), además de modificar pruebas de `002`–`006` |
| Gasto por rubro contado en cada rubro | Un proveedor puede tener varios rubros y no hay criterio de prorrateo | Prorratear en partes iguales inventaría una distribución |
| Presupuesto solo en CLP | Sin tipo de cambio en el sistema | Convertir con un tipo de cambio fijo daría cifras engañosas |
| Ranking de ofertas sin conversión de moneda | CLP → moneda por defecto del proveedor → menor precio numérico en la misma moneda → calificación → nombre, según FR-011 | Convertir USD/EUR a CLP con un tipo fijo daría un orden engañoso |
| Dos modos de ingreso en la nueva solicitud | El modo por producto es el recorrido natural, pero el modo por proveedor lo usan las pruebas y flujos existentes | Reemplazar el formulario rompía pruebas de `002`–`006` |
