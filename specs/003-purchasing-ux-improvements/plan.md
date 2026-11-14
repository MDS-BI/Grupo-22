# Implementation Plan: Mejoras de UX del módulo de Compras

**Branch**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08 | **Actualizado**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-purchasing-ux-improvements/spec.md`

## Summary

Rediseñar la experiencia del módulo de Compras sin tocar el modelo de datos ni las reglas de negocio de 001/002: listas a ancho completo con acciones visibles, formularios de alta/edición en un panel lateral accesible, secciones en dos columnas y campos obligatorios claros, badges de estado con texto y color, tarjetas de proveedores, productos y órdenes navegables con filtros, filtros/orden en memoria por cada columna visible, notificaciones no bloqueantes, confirmaciones propias, estados vacíos útiles, iconos SVG inline, datos de demostración y rendimiento verificado con 500 proveedores y 2.000 órdenes.

La implementación mantiene Vite, JavaScript vanilla, HTML/CSS, `localStorage`, ESLint y Prettier. No se incorporan frameworks ni librerías de UI. Los componentes de panel, feedback, iconos y listas son propios y se apoyan en los módulos y tokens existentes.

Los ajustes post-revisión del 2026-11-14 (FR-060 a FR-074 y Fase F) precisan el alcance: el detalle de Orden de Compra es una vista propia y no un bloque debajo de la lista; las listas vuelven a ocupar el ancho completo con «+ Nuevo» y panel lateral; los formularios se mantienen en dos columnas por secciones; Productos separa la gestión de Categorías en una pestaña o sección propia; la barra lateral queda ordenada como Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda; y todo elemento de 003 respeta los permisos de 004 en interfaz y servicio. Estos ajustes prevalecen sobre cualquier punto anterior de este plan que entre en conflicto y no renumeran ni desmarcan tareas existentes.

## Technical Context

**Language/Version**: JavaScript ES2022 (módulos ESM), HTML5 y CSS3; Node.js compatible con Vite 8 y Vitest 4.

**Primary Dependencies**: Vite 8.2, Vitest 4.1, jsdom 30, ESLint 10, Prettier 3. Sin dependencias de runtime para UI.

**Storage**: `localStorage` del navegador mediante los módulos existentes `src/storage.js` y `src/purchasing-storage.js`. No se crean claves ni campos persistentes nuevos.

**Testing**: Vitest + jsdom. Pruebas unitarias para consultas/filtros/orden/estado y pruebas de integración sobre la app montada en jsdom. Comandos de cierre: `npm test -- --run`, `npm run build`, `npm run lint`.

**Target Platform**: Aplicación web SPA ejecutada en navegadores modernos de escritorio y móvil; sin backend.

**Project Type**: Aplicación web de una sola página, frontend-only, con persistencia local.

**Performance Goals**:

- Lista de 2.000 órdenes y 500 proveedores renderizada en ≤1 s.
- Filtrado y ordenamiento en memoria sobre 2.000 órdenes en ≤300 ms.
- Dashboard con 2.000 órdenes en ≤500 ms.
- Apertura/cierre del panel lateral y cambio de filtros percibidos en ≤200 ms.
- Sin bloqueos del hilo principal superiores a 100 ms durante la interacción normal.

**Constraints**:

- No modificar el modelo de datos ni las reglas de negocio de 001/002.
- Mantener el ciclo `borrador → pendiente → aprobado → recibido`; `cancelado` desde `borrador`/`pendiente`; `recibido`/`cancelado` terminales.
- El detalle de una Orden de Compra es una vista propia: no se renderiza debajo de la lista ni de otra pantalla, conserva filtros/orden al volver y las vistas inactivas usan `display: none` efectivo.
- Las listas de Proveedores, Solicitudes y Órdenes de Compra y Productos ocupan el ancho completo con «+ Nuevo» y panel lateral; los formularios usan dos columnas por secciones cuando el ancho lo permite y una columna en móvil.
- Productos incluye una pestaña o sección «Categorías» propia; el formulario de producto solo selecciona categorías existentes y no las crea.
- La barra lateral respeta el orden Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda.
- Todo elemento incorporado por 003 respeta los permisos de 004 en interfaz y servicio: ocultar o deshabilitar controles sin permiso, excluirlos del orden de tabulación, revalidar en el servicio y mostrar error persistente sin mutar datos.
- Filtros y orden exclusivamente en memoria; sin backend ni consultas remotas.
- Sin frameworks ni librerías de componentes/iconos. Iconos SVG inline con `currentColor`.
- Formularios con los mismos IDs, campos y validaciones existentes, reutilizados dentro del panel, alineados con los campos vigentes de 001/002: Rubro múltiple y Origen en Proveedores, sin `targetDate`, sin Cantidad/Subtotal/Descuento/Impuesto/Importe total/Notas/selector de Estado en Órdenes y fecha de emisión automática al aprobar.
- Confirmaciones y notificaciones propias; no usar `window.confirm`, `alert` ni `prompt`.
- Accesibilidad WCAG 2.1 AA: foco visible, navegación por teclado, etiquetas, `aria-live`, contraste y foco atrapado en diálogos.
- Responsive: panel lateral a ancho completo en ventanas estrechas; listas y acciones utilizables sin desplazamiento horizontal.
- La carga de demostración es aditiva: nunca elimina ni sobrescribe datos existentes.
- Si una mejora exige cambiar el modelo o las reglas, detenerse y reportarlo.

**Scale/Scope**: 500 proveedores, 2.000 órdenes de compra, 500 productos, hasta 50 líneas por orden. Pantallas afectadas: Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos (con pestaña o sección Categorías), Búsqueda, detalle de orden como vista propia y diálogos/panel globales.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio / estándar                 | Evaluación | Evidencia del plan                                                                                                                                                               |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Calidad de código y simplicidad   | PASS       | Módulos pequeños y cohesivos; helpers puros para consultas; reutilización de `isOverdue`, validaciones y storage existentes; sin abstracciones nuevas innecesarias.              |
| II. Pruebas primero y regresión      | PASS       | Se agregan pruebas unitarias e integración para cada comportamiento; se actualizan las pruebas existentes al nuevo flujo de panel; se conserva la suite de 001/002.              |
| III. Consistencia UX y accesibilidad | PASS       | Se reutilizan tokens, tablas, badges y patrones existentes; panel y confirmación con foco atrapado, Esc, retorno de foco y etiquetas ARIA; iconos decorativos con `aria-hidden`. |
| IV. Rendimiento y persistencia local | PASS       | Filtros/orden en una pasada con índices en memoria; render por fragmentos/HTML; presupuestos explícitos para 500 proveedores y 2.000 órdenes; sin claves nuevas.                 |
| V. Seguridad y integridad de datos   | PASS       | No se alteran reglas ni datos existentes; demo aditiva y limpieza best-effort; validaciones y errores actuales se mantienen.                                                     |
| Estándares de calidad                | PASS       | ESLint/Prettier, build de Vite y suite completa como gates de cierre.                                                                                                            |
| Sin violaciones que justificar       | PASS       | No se requiere tabla de complejidad adicional.                                                                                                                                   |

## Project Structure

### Documentation (this feature)

```text
specs/003-purchasing-ux-improvements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── purchasing-ux.md
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
index.html
src/
├── app.js                         # Navegación, detalle como vista propia, formularios y refresco de vistas
├── styles.css                     # Tokens, layout, panel, badges, filtros, categorías, responsive
├── storage.js                     # Persistencia base existente (sin cambios de modelo)
├── purchasing-storage.js          # Persistencia de compras existente (sin cambios de modelo)
├── module-config.js               # Configuración de etiquetas/estados existente
├── product-catalog.js             # Catálogo y pestaña/sección Categorías; panel y filtros
├── purchase-order-detail.js       # Detalle como vista propia; badge y feedback compartidos
├── purchase-order-lines.js        # Editor de líneas existente
├── purchase-order-print.js        # Impresión existente
├── domain/
│   └── purchasing.js              # Reglas existentes; se reutiliza `isOverdue`
├── purchasing-list-query.js       # NUEVO: filtros, orden y derivaciones puras
├── purchasing-list-view.js        # NUEVO: render de listas, controles y estados vacíos
├── purchasing-status.js           # NUEVO: etiquetas/clases de estado compartidas
├── purchasing-demo-data.js        # NUEVO: carga aditiva de datos de demostración
├── ui-side-panel.js               # NUEVO: panel lateral, foco, dirty guard y responsive
├── ui-feedback.js                 # NUEVO: toasts y diálogo de confirmación
└── ui-icons.js                    # NUEVO: iconos SVG inline reutilizables

tests/
├── helpers/
│   └── purchasing-app.js          # Se amplía para abrir panel y esperar feedback
├── unit/
│   ├── purchasing-list-query.test.js
│   ├── purchasing-status.test.js
│   └── purchasing-demo-data.test.js
└── integration/
    ├── purchasing-side-panel.test.js
    ├── purchasing-list-controls.test.js
    ├── purchasing-feedback.test.js
    ├── purchasing-dashboard-filters.test.js
    ├── purchasing-demo-data.test.js
    ├── purchasing-accessibility.test.js
    ├── purchasing-performance.test.js
    ├── purchasing-order-detail-view.test.js
    ├── product-categories.test.js
    ├── navigation-order.test.js
    ├── purchasing-rbac-003.test.js
    └── purchasing-post-review-alignment.test.js
```

**Structure Decision**: Se conserva la organización plana de `src/` y la carpeta `src/domain/` ya existente. Los nuevos módulos se agregan como archivos hermanos para no reestructurar el proyecto. Los formularios existentes se extraen a plantillas `<template>` en `index.html` y se montan en `#side-panel` reutilizando IDs, campos y validaciones; no se duplican reglas.

## Phase 0: Research Decisions

Las decisiones completas y alternativas descartadas se documentan en [research.md](./research.md). Resumen:

1. **Stack y componentes**: mantener Vite/JS/localStorage y construir panel, feedback, iconos y listas con módulos propios; descartar frameworks y librerías de UI.
2. **Panel lateral**: usar un contenedor fijo `role="dialog"` con `aria-modal`, foco atrapado, Esc, retorno de foco y guardia de cambios; descartar `<dialog>` nativo por diferencias de soporte/estilo y por necesitar el mismo control en jsdom.
3. **Formularios**: mover el markup existente a plantillas y montarlo en el panel; conservar IDs y validaciones; agrupar en secciones y marcar obligatorios con `aria-required` y texto visible/oculto.
4. **Consultas**: implementar `purchasing-list-query.js` como funciones puras sin mutación, con filtros combinables, orden estable y rango de fechas inclusivo; reutilizar `isOverdue` de `src/domain/purchasing.js`.
5. **Feedback**: toasts propios en una región `aria-live` (éxito 5 s, error persistente) y confirmación propia `role="alertdialog"` con foco atrapado; reemplazar `window.confirm` en acciones destructivas.
6. **Dashboard**: convertir tarjetas/desgloses en controles navegables que abren la lista de proveedores, productos u órdenes con filtro de estado, proveedor o atraso; conservar contadores y acciones rápidas.
7. **Demo**: cargar datos aditivos con las APIs existentes, valores únicos, todos los estados y al menos una orden atrasada; confirmar solo si ya hay datos; limpieza best-effort si falla.
8. **Rendimiento**: filtrar/ordenar en una pasada con `Map`/`Set` y comparador precalculado; renderizar filas con HTML/fragmentos; medir con presupuestos de la sección técnica.
9. **Accesibilidad**: foco visible, `aria-sort`, `aria-pressed`, etiquetas asociadas, nombres accesibles en botones de icono y contraste de badges.
10. **Pruebas**: unitarias para helpers/estado/demo y de integración para panel, filtros, dashboard, feedback, accesibilidad y performance; actualizar pruebas existentes al flujo de panel.

## Phase 1: Design

### Data Model

No hay cambios persistentes. Se añaden solo modelos de vista en memoria (filtros, orden, panel, toasts, confirmación) y una carga de demostración que usa las claves existentes. Ver [data-model.md](./data-model.md).

### Contracts

Los contratos de comportamiento de panel, feedback, consultas, listas, estado, demo y accesibilidad están en [contracts/purchasing-ux.md](./contracts/purchasing-ux.md).

### Quickstart

El flujo de ejecución, validación manual y comandos de prueba están en [quickstart.md](./quickstart.md).

## Implementation Phases

### Fase A: Fundaciones UI

- Crear `ui-icons.js` con SVG inline y `currentColor`; reemplazar iconos de la barra lateral y acciones por este set consistente.
- Crear `ui-feedback.js` con toasts y confirmación.
- Crear `ui-side-panel.js` con apertura/cierre, foco, Esc, dirty guard y modo móvil.
- Agregar contenedores globales y estilos base en `index.html`/`styles.css`.
- Reemplazar confirmaciones nativas existentes por el diálogo propio.

### Fase B: Listas y estado

- Crear `purchasing-status.js` con etiquetas, clases y contraste.
- Crear `purchasing-list-query.js` con filtros/orden/derivaciones puras.
- Crear `purchasing-list-view.js` con encabezado, botón `+ Nuevo`, controles, tabla, orden accesible por cada columna visible y estados vacíos.
- Integrar listas de proveedores, órdenes y productos; retirar layout de dos columnas lista/formulario.
- Convertir tarjetas y desgloses del dashboard en accesos filtrados; añadir tarjeta de productos con contador si no existe para cumplir FR-023.

### Fase C: Formularios en panel

- Extraer formularios de entidad, orden y producto a plantillas.
- Montar en panel con secciones, grilla de dos columnas cuando el ancho lo permita, una columna en móvil, obligatorios y errores existentes.
- Mantener creación/edición, líneas, totales y guardado actuales.
- Implementar confirmación al cerrar con cambios sin guardar y retorno de foco.
- Adaptar detalle de orden a badges y feedback compartidos.

### Fase D: Demo y rendimiento

- Crear `purchasing-demo-data.js` con dataset determinista, único y aditivo.
- Integrar acción de demo en dashboard con confirmación condicional y toasts.
- Añadir pruebas de performance con 500 proveedores y 2.000 órdenes.
- Optimizar si se exceden los presupuestos, sin cambiar reglas ni modelo.

### Fase E: Pruebas y cierre

- Agregar unitarias de consultas, estado y demo.
- Agregar integración de panel, filtros, dashboard, feedback, accesibilidad y demo.
- Actualizar pruebas existentes que asumen formularios inline.
- Ejecutar `npm test -- --run`, `npm run build` y `npm run lint`.
- Verificar manualmente flujo completo en escritorio y viewport estrecho.

### Fase F: Ajustes post-revisión

- Corregir en `index.html`, `src/styles.css` y `src/app.js` el cambio de vistas para que el detalle de OC sea una vista propia y las vistas inactivas usen `display: none` efectivo, sin apilar el detalle bajo la lista.
- Añadir «Volver a Órdenes de Compra» en `src/purchase-order-detail.js` y restaurar filtros, orden y foco de la lista.
- Restituir listas a ancho completo con «+ Nuevo» y panel lateral en Proveedores, Solicitudes y Órdenes de Compra y Productos; eliminar restos del layout lista/formulario en dos columnas.
- Restituir formularios en dos columnas por secciones, una columna en móvil, y alinear campos y validaciones con 001/002.
- Separar la gestión de Categorías en una pestaña o sección propia de Productos y retirar la creación de categorías del formulario de producto.
- Reordenar la barra lateral como Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda.
- Aplicar los permisos de 004 a «+ Nuevo», panel, tarjetas, filtros/orden, demo y detalle, con revalidación en el servicio.
- Ajustar la demo para crear al menos un empleado por cargo existente y respetar los permisos en las transiciones.
- Alinear filtros de Proveedores con Rubro múltiple (OR) y Origen, y excluir filtros/columnas restringidos por 004.
- Agregar y actualizar pruebas de detalle propio, categorías, navegación, RBAC, demo y alineación con 001/002; ejecutar gates de cierre.

## Testing Strategy

- **Unitarias**: filtros combinados, rango de fechas inclusivo, orden ascendente/descendente, estabilidad, no mutación, `isOverdue`, etiquetas de estado, unicidad de demo y estados cubiertos.
- **Integración**: abrir/cerrar panel, foco inicial, Tab/Shift+Tab, Esc, dirty guard, retorno de foco, modo móvil; secciones y obligatorios; badges; tarjetas del dashboard; filtros/orden/limpiar/estados vacíos; toasts de 5 s y errores persistentes; confirmaciones; demo con y sin datos, cancelación y fallo; accesibilidad.
- **Post-revisión**: detalle como vista propia y retorno con filtros/orden; listas a ancho completo con panel; pestaña Categorías con unicidad y bloqueo por referencia; orden de navegación; permisos de 004 en todos los elementos de 003; demo con un empleado por cargo y transiciones autorizadas; alineación de campos y etiquetas con 001/002.
- **Regresión**: 001/002 deben seguir pasando; los tests que llenaban formularios inline se actualizan para abrir el panel, sin relajar aserciones de negocio.
- **Performance**: semilla de 500 proveedores y 2.000 órdenes; medir render de lista, filtro/orden y dashboard con `performance.now()` y umbrales definidos.

## Risks and Mitigations

| Riesgo                                              | Mitigación                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Mover formularios al panel rompe pruebas existentes | Actualizar helpers y pruebas para abrir el panel; conservar IDs, campos y validaciones.                                          |
| Foco atrapado complejo en jsdom                     | Implementar ciclo manual de focusables y probar Tab/Shift+Tab, Esc y retorno de foco.                                            |
| Render de 2.000 filas excede el presupuesto         | Filtrar/ordenar antes de renderizar, construir HTML en una sola operación y medir; optimizar comparadores/índices si hace falta. |
| Demo duplica datos o colisiona con existentes       | Valores únicos por RUT/folio/nombre, folios desde el máximo existente, confirmación si hay datos y limpieza best-effort.         |
| Badges con contraste insuficiente                   | Tokens de color con contraste AA y texto siempre presente; probar estados en claro/oscuro si aplica.                             |
| Cambios accidentales al modelo/reglas               | Reutilizar storage/domain existentes; revisión explícita y tests de regresión de 002.                                            |
| Detalle apilado bajo la lista por CSS               | Vista propia con `hidden`/`display: none` efectivo, orden de vistas centralizado y pruebas de visibilidad y foco.                |
| Permisos de 004 inconsistentes entre UI y servicio  | Helper de permisos compartido, revalidación en el servicio, pruebas por rol y error persistente sin mutación.                   |
| Categorías duplicadas o creadas desde el producto   | Reutilizar validaciones de 001, unicidad sin distinguir mayúsculas, sección propia y pruebas de bloqueo por referencia.          |

## Complexity Tracking

No hay violaciones constitucionales que justificar.
