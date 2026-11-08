# Research: Mejoras de UX del módulo de Compras

**Feature**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08

## Objetivo

Resolver las decisiones técnicas necesarias para implementar la especificación 003 sin modificar el modelo de datos ni las reglas de negocio existentes, manteniendo Vite, JavaScript vanilla, HTML/CSS, `localStorage`, ESLint y Prettier.

## Decisiones

### D1. Mantener el stack y construir componentes propios

**Decisión**: Usar Vite, JavaScript ESM, HTML y CSS existentes. Crear módulos propios para panel, feedback, iconos, listas y datos demo. No agregar frameworks ni librerías de UI/iconos.

**Rationale**: La aplicación ya es una SPA vanilla con patrones consolidados y suite de pruebas. Agregar una librería incrementaría el bundle, introduciría un modelo de componentes ajeno y rompería la restricción explícita del usuario.

**Alternativas descartadas**:

- React/Vue/Svelte: reescritura innecesaria, mayor superficie de regresión.
- Librería de componentes: no aporta suficiente valor frente a los patrones existentes.
- Librería de iconos: el requisito pide SVG inline; además evita dependencias y permite `currentColor`.

### D2. Panel lateral propio con `role="dialog"`

**Decisión**: Implementar `ui-side-panel.js` como contenedor fijo con `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, foco inicial, ciclo de Tab/Shift+Tab, cierre con Esc, retorno de foco y guardia de cambios sin guardar.

**Rationale**: Se necesita el mismo comportamiento en escritorio y móvil, control total de estilos y pruebas en jsdom. Un componente propio permite integrar la confirmación de cambios sin guardar con el diálogo de confirmación compartido.

**Alternativas descartadas**:

- `<dialog>` nativo: buen soporte moderno, pero estilos/backdrop variables y comportamiento de foco diferente entre navegadores/jsdom; además no resuelve por sí solo la guardia de cambios.
- Librería de modales: dependencia innecesaria y difícil de alinear con los tokens existentes.
- Panel no modal: no cumple foco atrapado ni la expectativa de edición enfocada.

**Detalles**:

- Al abrir, guardar `document.activeElement` y enfocar el primer campo o el título.
- Al cerrar, restaurar el foco al disparador; si ya no existe, usar un fallback de la vista.
- Si hay cambios, abrir confirmación; cancelar mantiene el panel y los datos.
- En viewport estrecho, el panel ocupa el ancho completo.
- El fondo se marca como inerte o `aria-hidden` mientras el panel está abierto, con fallback si `inert` no está disponible.

### D3. Formularios existentes en plantillas, montados en el panel

**Decisión**: Extraer el markup de los formularios de entidad, orden y producto a elementos `<template>` en `index.html`. El panel clona la plantilla correspondiente y reutiliza los mismos IDs, campos, atributos y validaciones. Los formularios se agrupan en secciones: datos generales/contacto/condiciones para proveedor; cabecera/detalle/totales para orden; datos del producto para producto. La grilla usa dos columnas cuando el ancho lo permite y una columna en pantallas estrechas.

**Rationale**: Evita duplicar reglas y mantiene el código de guardado existente. Conservar IDs reduce el riesgo de regresión. Las plantillas permiten que el formulario viva dentro del panel sin reestructurar las vistas.

**Alternativas descartadas**:

- Reescribir formularios en JavaScript: duplicaría markup y aumentaría el riesgo.
- Mantener formularios inline y ocultarlos: no cumple el patrón de panel lateral ni el layout de lista a ancho completo.
- Duplicar formularios para creación/edición: viola simplicidad y aumenta el mantenimiento.

**Detalles**:

- Los campos obligatorios se marcan con `aria-required="true"` y un asterisco visible con texto accesible.
- Los errores existentes se muestran junto al campo y en un resumen con `role="alert"`.
- El guardado sigue usando las funciones actuales de `storage.js`/`purchasing-storage.js`.
- Los listeners se delegan en el contenedor del panel o se enlazan al montar, evitando duplicados.

### D4. Consultas de lista puras y en memoria

**Decisión**: Crear `purchasing-list-query.js` con funciones puras para filtrar y ordenar proveedores, órdenes y productos. Aceptar estado de filtros/orden y devolver nuevos arreglos, sin mutar las entradas. Reutilizar `isOverdue` de `src/domain/purchasing.js`.

**Rationale**: Facilita pruebas unitarias, evita efectos secundarios y permite medir rendimiento sin DOM. La escala (500 proveedores/2.000 órdenes) es manejable en memoria.

**Alternativas descartadas**:

- Filtrar en el DOM: difícil de testear, propenso a inconsistencias y más lento.
- Backend/consultas remotas: no existe backend y el requisito es local.
- Índices persistentes: complejidad innecesaria para el volumen y la frecuencia de uso.

**Detalles**:

- Filtros de órdenes: estado, proveedor, rango de fechas de entrega, solo atrasadas.
- Filtros de proveedores: categoría.
- Filtros de productos: categoría.
- Orden por cada columna visible: proveedor (nombre, código/RUT, categoría, correo, teléfono); orden (folio, proveedor, empleado, fecha de emisión, fecha de entrega, estado, total); producto (nombre, categoría, unidad, stock).
- Orden estable con desempate por índice original.
- Rango de fechas inclusivo; rango inválido se rechaza con mensaje y no se aplica.
- Normalización de texto con `Intl.Collator` en español para orden alfabético.

### D5. Feedback propio: toasts y confirmación

**Decisión**: Crear `ui-feedback.js` con una región de toasts y un diálogo de confirmación. Éxitos se ocultan a los 5 s; errores permanecen hasta descarte manual. Confirmación con `role="alertdialog"`, foco atrapado, Esc = cancelar y retorno de foco.

**Rationale**: Reemplaza `window.confirm`/alertas nativas, cumple el requisito de notificaciones no bloqueantes y permite pruebas deterministas con timers falsos.

**Alternativas descartadas**:

- `window.confirm`/`alert`: bloqueantes, inconsistentes y no estilizables.
- Librería de toasts: dependencia innecesaria.
- Notificaciones dentro del formulario: se pierden al cerrar el panel y no sirven para acciones globales.

**Detalles**:

- Contenedor de toasts con `aria-live="polite"`; errores con `role="alert"`.
- Botón de cierre con nombre accesible.
- No robar foco al mostrar un toast.
- Confirmaciones para eliminar proveedor/producto/orden, cancelar orden, cerrar panel con cambios y cargar demo con datos existentes.
- La confirmación devuelve una promesa `true/false`.

### D6. Badges de estado compartidos

**Decisión**: Crear `purchasing-status.js` con etiquetas, clases CSS y un helper de render/atributos para los cinco estados. Usarlo en lista, detalle y dashboard.

**Rationale**: Garantiza consistencia de texto/color y evita duplicar mapas. El texto siempre acompaña al color para accesibilidad.

**Alternativas descartadas**:

- Colores solo por CSS según texto: difícil de mantener y propenso a errores.
- Badge específico por vista: inconsistencia visual y de pruebas.

**Detalles**:

- Estados: `borrador`, `pendiente`, `aprobado`, `recibido`, `cancelado`.
- Clases con contraste AA; no depender solo del color.
- `data-status` para pruebas y estilos.
- En el detalle se reemplaza el badge genérico actual.

### D7. Dashboard como punto de entrada filtrado

**Decisión**: Convertir tarjetas y desgloses de estado en botones/controles navegables. Al activarlos, abrir la vista de órdenes, proveedores o productos con el filtro correspondiente ya aplicado. Mantener contadores y acciones rápidas. Añadir una tarjeta de productos con contador si el panel aún no la expone.

**Rationale**: Cumple el requisito de tarjetas navegables y reduce pasos. Usar botones reales mejora teclado y semántica.

**Alternativas descartadas**:

- Tarjetas solo informativas: no cumple la especificación.
- Enlaces con `href="#"`: semántica pobre y manejo manual innecesario.
- Filtros en el dashboard: duplicaría controles; se prefiere abrir la lista filtrada.

**Detalles**:

- Proveedores → lista de proveedores.
- Productos → lista de productos.
- Órdenes → lista de órdenes.
- Cada estado → lista de órdenes filtrada por estado.
- Atrasadas → lista filtrada por atraso.
- El filtro debe reflejarse en los controles de la lista y poder limpiarse.

### D8. Datos de demostración aditivos y deterministas

**Decisión**: Crear `purchasing-demo-data.js` que use las APIs existentes para agregar un dataset pequeño, único y representativo: al menos 3 proveedores, 2 empleados, 3 categorías, 6 productos y 6 órdenes (una por estado y al menos una atrasada). Confirmar solo si ya existen datos. Si falla, limpiar best-effort los registros creados en orden inverso de dependencia, sin tocar los existentes.

**Rationale**: Permite evaluar filtros, badges y dashboard sin datos manuales, respetando las reglas y sin claves nuevas. La confirmación evita mezclas accidentales; la limpieza evita residuos parciales.

**Alternativas descartadas**:

- Datos hardcodeados en el DOM: no prueba persistencia ni reglas.
- Nueva clave `demo-data`: viola el requisito de no crear claves nuevas.
- Reemplazar datos existentes: destructivo y prohibido.
- Generación aleatoria: pruebas no deterministas.

**Detalles**:

- Folios desde el máximo existente + 1.
- RUT válidos y únicos; nombres con sufijo si colisionan.
- Fechas coherentes; la orden atrasada debe ser no terminal y tener `endDate` anterior a hoy.
- Para `recibido`, aprobar y recibir usando las funciones existentes (aplica stock).
- Para `cancelado`, crear y cancelar desde un estado permitido.
- Refrescar dashboard/listas y mostrar toast de éxito.
- Si hay datos existentes, confirmar antes; cancelar no modifica nada.

### D9. Rendimiento y renderizado

**Decisión**: Filtrar/ordenar antes de renderizar; construir filas con HTML/fragmentos en una operación; evitar consultas repetidas al DOM y `localStorage` dentro de bucles. Medir con 500 proveedores y 2.000 órdenes.

**Rationale**: El volumen es moderado y no requiere virtualización. La mayor ganancia está en evitar trabajo repetido y renders intermedios.

**Alternativas descartadas**:

- Virtualización: complejidad alta para el volumen y no requerida.
- Paginación: cambia la UX de lista completa y no está en la spec.
- Web Workers: sobredimensionado para filtros simples en memoria.

**Detalles**:

- Precalcular índices (`Map` de proveedores/productos) una vez por render.
- Comparadores reutilizables y `Intl.Collator` instanciado una vez.
- Render de tabla con `innerHTML` controlado y escape existente.
- Presupuestos: lista ≤1 s, filtro/orden ≤300 ms, dashboard ≤500 ms.
- Si se excede, optimizar antes de considerar virtualización.

### D10. Accesibilidad y responsive

**Decisión**: Implementar foco visible, etiquetas asociadas, `aria-required`, `aria-invalid`, `aria-describedby`, `aria-sort`, `aria-pressed`, `aria-live`, nombres accesibles en botones de icono y contraste AA. Panel a ancho completo en viewport estrecho.

**Rationale**: Cumple WCAG 2.1 AA y la spec. El uso de controles nativos y ARIA estándar reduce complejidad.

**Alternativas descartadas**:

- Solo mouse: incumple accesibilidad.
- Tooltips como única etiqueta: no accesibles.
- Iconos sin texto alternativo: ambiguos para lectores de pantalla.

**Detalles**:

- Iconos decorativos `aria-hidden="true"`; botones con `aria-label` o texto visible.
- Orden de tabla con `<button>` en `<th>` y `aria-sort` en el `th`.
- Filtros con `<label>` visibles; chips/resumen de filtros con botón de limpiar.
- Estado vacío con mensaje y acción; `role="status"` si corresponde.
- En móvil, acciones de fila no se ocultan; se apilan o usan menú accesible.

### D11. Estrategia de pruebas

**Decisión**: Unitarias para helpers puros y demo; integración para DOM/UX; performance con dataset grande; regresión de 001/002.

**Rationale**: Separa lógica de presentación, permite pruebas rápidas y cubre los riesgos principales (foco, filtros, timers, persistencia).

**Alternativas descartadas**:

- Solo pruebas end-to-end: lentas y frágiles.
- Solo unitarias: no cubren foco/ARIA/integración.
- Snapshot tests: poco útiles para comportamiento.

**Detalles**:

- `vi.useFakeTimers()` para el auto-cierre de 5 s.
- `document.activeElement` para foco.
- Helpers para abrir panel y esperar render.
- Pruebas de demo con localStorage limpio y con datos existentes.
- Performance con umbrales y margen para CI.

### D12. Sin cambios de modelo ni reglas

**Decisión**: No agregar campos, claves ni transiciones. Los nuevos módulos solo leen/escriben mediante las APIs existentes. El estado de filtros/orden/panel/toasts es efímero.

**Rationale**: Requisito explícito del usuario y de la spec. Reduce riesgo de regresión en 001/002.

**Alternativas descartadas**:

- Campos para filtros guardados: no solicitado; requeriría modelo nuevo.
- Nuevos estados o transiciones: prohibido.
- Persistir preferencias de orden: no solicitado y añade claves.

## Resumen de decisiones

| Área        | Decisión                                                             |
| ----------- | -------------------------------------------------------------------- |
| Stack       | Vite + JS vanilla + HTML/CSS + localStorage                          |
| UI          | Componentes propios; SVG inline                                      |
| Panel       | `role="dialog"`, foco atrapado, dirty guard, responsive              |
| Formularios | Plantillas con IDs/validaciones existentes, secciones y obligatorios |
| Listas      | Ancho completo, `+ Nuevo`, filtros/orden en memoria, estados vacíos  |
| Feedback    | Toasts 5 s/errores persistentes; confirmación propia                 |
| Badges      | Texto + color con contraste AA, módulo compartido                    |
| Dashboard   | Tarjetas navegables con filtros preaplicados                         |
| Demo        | Aditiva, determinista, todos los estados, limpieza best-effort       |
| Performance | Índices/comparadores, render único, presupuestos explícitos          |
| Datos       | Sin cambios persistentes ni reglas nuevas                            |
