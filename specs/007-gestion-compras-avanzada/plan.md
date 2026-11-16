# Plan de Implementación: Gestión de Compras Avanzada

**Rama**: `007-gestion-compras-avanzada` | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md)

**Entrada**: Siete historias de gestión sobre el módulo de Compras (evaluación de proveedores, compra por producto con precios por cantidad, stock mínimo y solicitud sugerida, reportes, presupuesto por área, notificaciones y mejoras rápidas), reutilizando los espacios reservados por el `005` y las listas de precios del `006`, sin alterar `001`–`006` fuera de los cambios declarados.

## Resumen

La lógica nueva es mayoritariamente de **cálculo sobre datos existentes**, por lo que se implementa como funciones puras en cinco módulos de dominio nuevos, probados con pruebas unitarias. La persistencia agrega tres claves a `KEYS` y tres campos opcionales con valor por defecto, lo que mantiene compatibles los datos y las pruebas anteriores. La interfaz se agrega en módulos de vista propios (`ui-reports.js`, `ui-notifications.js`, `ui-areas.js`) para no seguir inflando `src/app.js`, con los tokens y componentes visuales del `005` (tarjetas, chips, tablas, gráficos SVG).

## Contexto Técnico

**Lenguaje/Versión**: JavaScript ES2022, HTML5, CSS.

**Dependencias Principales**: Vite 8.2, Vitest 4.1, jsdom 30, ESLint 10. Sin dependencias nuevas (CSV y gráficos propios).

**Almacenamiento**: `localStorage`. Claves nuevas `erp_purchasing:areas`, `erp_purchasing:budgets` y `erp_purchasing:notification-reads`; campos opcionales `stock_minimo` (producto), `estado` (proveedor, agregado a `BASE_FIELDS.entity`), `id_area` (metadata de orden) y `tramos` (precio acordado del `006`).

**Pruebas**: Unitarias para cada módulo de dominio (casos límite de la especificación) y para los servicios; integración por historia y por rol. Sin modificar pruebas existentes.

**Objetivos de Rendimiento**: Reportes con 2.000 OC en ≤ 1 s (SC-008); el panel conserva su presupuesto de `001` (≤ 500 ms): el cálculo de bajo mínimo y avisos es lineal y se hace una vez por render. El historial se indexa por orden una sola vez por cálculo.

**Restricciones**:

- No modificar pruebas existentes; no cambiar transiciones ni la matriz de `004` más allá de los dos permisos nuevos.
- Toda creación de órdenes pasa por `savePurchaseOrder` para heredar las reglas de `002`, `004` y `006`.
- Sanitizar todo texto en el DOM; CSV con escapado RFC 4180.
- WCAG 2.1 AA; los gráficos con tabla equivalente; la bandeja operable con teclado y `Escape`.

**Incógnitas**: Ninguna bloqueante. Umbrales A/B/C, regla de reposición y advertencia de presupuesto son propuestas ajustables con `/speckit.clarify` sin cambiar la arquitectura.

## Verificación de la Constitución

| Principio | Estado | Evidencia |
|---|---|---|
| I. Calidad y mantenibilidad | PASS | Cinco módulos de dominio puros y tres módulos de vista; `app.js` solo enlaza eventos y navegación. |
| II. Test-first y verificación | PASS | Pruebas unitarias por módulo antes de la vista; integración por historia; batería completa en cada fase. |
| III. Consistencia de UX | PASS | Reutiliza componentes del `005` (tarjetas, chips, gráficos, insignias) y los mensajes en español del sistema. |
| IV. Rendimiento y confiabilidad | PASS | Cálculos lineales con índices; creación de solicitudes sugeridas con restauración ante error (snapshot de `KEYS`). |
| Excepción spec 005 | No aplica | El 007 es funcional; no usa la excepción visual. |

## Decisiones de Diseño

1. **Vistas derivadas, no persistidas**: evaluación, reportes y avisos se calculan al mostrarse; así no hay datos que se desincronicen y la sustitución de demo no deja residuos. Solo se guardan las lecturas de avisos.
2. **Fecha de recepción desde el historial**: `status-history` ya registra el paso a `recibido` con `changedAt`; no se agrega campo nuevo a la orden.
3. **Área en la metadata de orden** (igual que `id_empleado` en `003`): no toca `BASE_FIELDS.document` ni la validación de `001`.
4. **Activación condicional** (patrón del `006`): el área solo es obligatoria si existe al menos un área activa; así los datos y las pruebas anteriores siguen funcionando.
5. **Proveedor inactivo como campo de la entidad base**: se agrega `estado` a `BASE_FIELDS.entity`; la eliminación en cascada de `001` FR-003 no cambia.
6. **Solicitudes sugeridas atómicas**: se toma un snapshot de `KEYS` y, si falla la creación de algún borrador, se restaura todo.
7. **CSV propio**: función `toCsv` con BOM y `;` para Excel en configuración chilena; descarga con `Blob` y un enlace temporal.
8. **Tramos dentro del precio acordado**: se agregan como lista opcional en la misma entrada del `006` (no como entidad aparte); `unitPriceFor` reemplaza la lectura directa de `precio` en `applySupplierPriceList`, de modo que el `006` sigue siendo el único punto que fija precios y un precio sin tramos se comporta igual que antes.
9. **Compra por producto como modo del mismo formulario**: el modo «Comprar por producto» arma un carrito y, al guardar, llama a `savePurchaseOrder` una vez por proveedor dentro de un snapshot; el modo «Elegir proveedor primero» reutiliza el formulario existente, así las pruebas del `002`–`006` sobre ese formulario no cambian.

## Estructura del Proyecto

```text
src/
├── auth.js                       # + REPORTS_VIEW, BUDGETS_MANAGE
├── module-config.js              # + estado en BASE_FIELDS.entity
├── domain/
│   ├── supplier-evaluation.js    # NUEVO
│   ├── price-tiers.js            # NUEVO: tramos, comparación de proveedores, carrito
│   ├── reorder.js                # NUEVO
│   ├── budget.js                 # NUEVO
│   ├── reports.js                # NUEVO (incluye toCsv)
│   └── notifications.js          # NUEVO
├── purchasing-storage.js         # + claves, áreas, presupuestos, sugeridas, duplicar, estado del proveedor, lecturas
├── purchasing-demo-data.js       # + áreas, presupuestos, mínimos, fechas de recepción
├── ui-reports.js                 # NUEVO: vista Reportes + pestaña Áreas y presupuestos
├── ui-notifications.js           # NUEVO: campana y bandeja
├── ui-purchase-by-product.js     # NUEVO: modo «Comprar por producto» y carrito
├── ui-dashboard.js               # + tarjeta "Productos bajo el mínimo"
├── supplier-summary-view.js      # + sección de evaluación
├── product-catalog.js            # + stock mínimo, tramos por proveedor, exportar CSV
├── purchase-order-detail.js      # + presupuesto del área, Duplicar
├── app.js                        # navegación a Reportes, área en el formulario, inactivar, exportar
└── styles.css                    # estilos de las piezas nuevas con tokens del 005
index.html                        # vista Reportes, bandeja, campos nuevos
tests/
├── unit/supplier-evaluation-007.test.js
├── unit/price-tiers-007.test.js
├── unit/reorder-007.test.js
├── unit/budget-007.test.js
├── unit/reports-007.test.js
├── unit/notifications-007.test.js
├── unit/purchasing-storage-007.test.js
└── integration/{evaluation,purchase-by-product,reorder,reports,budget,notifications,quick-actions}-007.test.js
```

## Orden de Implementación y Reparto

| Fase | Contenido | Responsable sugerido | Depende de |
|---|---|---|---|
| Base | Permisos, claves, campos nuevos, módulos de dominio vacíos con pruebas | Uno del grupo | — |
| US1 + US6 | Evaluación; duplicar, inactivar, exportar | Persona A | Base |
| US7 | Tramos por cantidad, comparación de proveedores y carrito | Persona A (después de US1) o quien termine primero | Base; usa la calificación de US1 si está disponible |
| US2 + US5 | Stock mínimo y sugeridas; notificaciones | Persona B | Base (US5 usa la consulta del 005) |
| US4 + US3 | Presupuesto por área; reportes | Persona C | Base (Reportes usa áreas de US4) |
| Demo y cierre | Datos demo, README, verificación completa | Uno del grupo | Todas |

Las ramas de cada persona salen de la rama del 007 después de integrar la fase Base, y se integran de una en una para limitar conflictos en `app.js`, `index.html` y `styles.css`.

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
| Área obligatoria solo si hay áreas activas | Compatibilidad con datos y pruebas previas | Exigirla siempre obligaba a modificar pruebas de `002`–`006` |
| Gasto por rubro contado en cada rubro | Un proveedor puede tener varios rubros y no hay criterio de prorrateo | Prorratear en partes iguales inventaría una distribución |
| Presupuesto solo en CLP | Sin tipo de cambio en el sistema | Convertir con un tipo de cambio fijo daría cifras engañosas |
| Dos modos de ingreso en la nueva solicitud | El modo por producto es el recorrido natural, pero el modo por proveedor lo usan las pruebas y flujos existentes | Reemplazar el formulario rompía pruebas de `002`–`006` |
