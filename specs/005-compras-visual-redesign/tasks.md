# Tareas: Rediseño Visual del Módulo de Compras (005)

**Entrada**: Documentos de diseño en `specs/005-compras-visual-redesign/`  
**Prerrequisitos**: `plan.md` (requerido), `spec.md` (requerido), `research.md`, `data-model.md`, `contracts/ui-preservation-contract.md`, `quickstart.md`

**Pruebas**: Incluidas como tareas explícitas (nuevas pruebas de integración de UI) según solicitud. Las 356 pruebas existentes NO se modifican.  
**Organización**: Tareas agrupadas por historia de usuario para implementación y validación independiente.

## Formato: `[ID] [P?] [Historia?] Descripción`

- **[P]**: Paralelizable (archivos distintos, sin dependencia de tareas incompletas)
- **[Historia]**: `[US1]`–`[US5]` según `spec.md`
- Cada tarea incluye ruta(s) de archivo concreta(s)

## Notas de Preservación (obligatorias)

- Solo HTML/CSS/componentes de interfaz. **Sin cambios de comportamiento** en `src/domain/`, `src/purchasing-storage.js`, `src/storage.js`, `src/auth.js`.
- Conservar todos los `id`, `data-action` y atributos `data-*` usados por pruebas (ver `specs/005-compras-visual-redesign/contracts/ui-preservation-contract.md`).
- Sin frameworks ni librerías; SVG propio; tipografías `.woff2` locales (sin recursos externos).
- Cada fase cierra con verificación: `npm test -- --run` y `npm run lint`.

---

## Fase 1: Configuración (compartida)

**Propósito**: Preparar estructura de archivos UI, fuentes y directorio de pruebas de integración.

- [X] T001 Crear estructura de módulos UI en `src/ui-theme.js`, `src/ui-shell.js`, `src/ui-dashboard.js`, `src/ui-charts.js` y directorio `src/styles/` según `specs/005-compras-visual-redesign/plan.md`
- [X] T002 [P] Crear directorio de fuentes locales `public/fonts/` y agregar archivos `.woff2` de Space Grotesk e Inter en `public/fonts/`
- [X] T003 [P] Crear directorio de pruebas de integración de UI en `tests/integration/` (o convención existente del proyecto) con archivos base: `tests/integration/theme.integration.test.js`, `tests/integration/shell-sidebar.integration.test.js`, `tests/integration/oc-board.integration.test.js`, `tests/integration/rubro-chips.integration.test.js`, `tests/integration/dashboard-role.integration.test.js`
- [X] T004 Inventariar y registrar `id`, `data-action` y `data-*` referenciados por pruebas en `tests/` y actualizar `specs/005-compras-visual-redesign/contracts/ui-preservation-contract.md`
- [X] T005 Verificación de fase: ejecutar `npm test -- --run` y `npm run lint` (356 pruebas existentes en verde, sin modificar tests)

---

## Fase 2: Base Fundacional — Tokens, Fuentes y Tema (bloqueante)

**Propósito**: Establecer tokens CSS (claro/oscuro), tipografías locales y preferencia de tema. DEBE completarse antes de las historias de usuario.  
**Prueba independiente**: Alternar tema y recargar; la preferencia persiste en `localStorage` o cae a `prefers-color-scheme` sin romper pruebas existentes.

- [X] T006 [P] Definir tokens CSS (colores identidad #0F2A3D/#F59E0B, estados 006, tipografía, espaciado, radios, sombras, números tabulares) para tema claro y oscuro en `src/styles/tokens.css`
- [X] T007 [P] Declarar `@font-face` para Space Grotesk e Inter con respaldo del sistema en `src/styles/tokens.css` o `src/styles.css` apuntando a `public/fonts/*.woff2` (sin recursos externos)
- [X] T008 Importar tokens/temas desde `src/styles.css` y aplicar variables base al layout existente en `src/styles.css` preservando selectores/ids usados por tests
- [X] T009 Implementar lectura/escritura de preferencia de tema (`light`/`dark`/ausente) en `localStorage` con fallback a `prefers-color-scheme` y API de toggle en `src/ui-theme.js` (ver `specs/005-compras-visual-redesign/data-model.md`)
- [X] T010 Integrar inicialización y toggle de tema en el arranque/render de `src/app.js` (y/o contenedor raíz HTML correspondiente) sin alterar lógica de dominio ni contratos de `src/auth.js`/storage
- [X] T011 [P] [US5] Crear pruebas de integración de tema (persistencia, fallback sistema, toggle, atributo/clase aplicado) en `tests/integration/theme.integration.test.js`
- [X] T012 Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

**Checkpoint**: Tokens, fuentes locales y tema operativo; historias de usuario pueden comenzar.

---

## Fase 3: Historia de Usuario 1 — Identidad visual y estructura de navegación (Prioridad: P1) 🎯 MVP

**Objetivo**: Pantalla de ingreso dividida y armazón interno (sidebar agrupada/colapsable, topbar con breadcrumbs/buscador/menú, reservas 007).  
**Prueba independiente**: Abrir login y shell autenticado; validar marca SVG, tarjetas de prueba con `login()` 004, grupos de navegación (incl. entrada única "Solicitudes y Órdenes de Compra"), buscador a Búsqueda existente, reservas "Reportes"/campana ocultas o deshabilitadas, colapso a íconos.

- [X] T013 [P] [US1] Implementar generador SVG del patrón de marca y helpers de íconos en `src/ui-charts.js` (SVG propio, sin librerías)
- [X] T014 [US1] Implementar pantalla de ingreso dividida (panel de marca + formulario) y tarjetas de usuarios de prueba con cargo/ícono usando el mismo `login()` de `src/auth.js` en `src/app.js` y `src/ui-shell.js`, conservando ids/`data-*` de login
- [X] T015 [US1] Implementar barra lateral agrupada (Operación: Panel y "Solicitudes y Órdenes de Compra" como una sola entrada; Maestros: Proveedores, Productos; Herramientas: Búsqueda y "Reportes" reservado oculto/deshabilitado) y estado colapsable a íconos con etiquetas accesibles en `src/ui-shell.js` y `src/styles.css`
- [X] T016 [US1] Implementar barra superior (breadcrumbs, buscador global que solo navega a la vista Búsqueda existente con el texto escrito, espacio campana reservado oculto/deshabilitado, menú de usuario con avatar/iniciales/cargo/cierre de sesión y toggle de tema) en `src/ui-shell.js` y `src/app.js`
- [X] T017 [US1] Integrar renderizado del shell en `src/app.js` manteniendo estructuras y selectores contractuales (`specs/005-compras-visual-redesign/contracts/ui-preservation-contract.md`)
- [X] T018 [P] [US1] Crear pruebas de integración de shell/sidebar (agrupación, entrada única Solicitudes y Órdenes, colapso, reservas 007 ocultas/deshabilitadas, buscador a Búsqueda existente) en `tests/integration/shell-sidebar.integration.test.js`
- [X] T019 [US1] Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

### Correcciones post-revisión de US1 (2026-11-16)

Hallazgos de la revisión del commit `91ffa37` sobre T002, T014, T015 y T016:

- [X] T019a [US1] Reemplazar los `.woff2` de 4 bytes de `public/fonts/` por Inter y Space Grotesk variables reales (subconjunto latino de Fontsource, licencia SIL OFL 1.1, con `LICENSE-*.txt`)
- [X] T019b [US1] Corregir `ensureNavOrder()` en `src/app.js` para ordenar los botones dentro de sus grupos (`data-nav-group`) sin cambiar el orden de 003; los grupos de `src/ui-shell.js` pasan a `div[role=group]` con título asociado; prueba en `tests/integration/shell-sidebar.integration.test.js`
- [X] T019c [US1] Aplicar identidad en `src/styles.css`: barra lateral `#0F2A3D`, ítem activo con contraste AA e indicador ámbar, acción principal `.primary` ámbar `#F59E0B` con texto oscuro, buscador integrado en la barra superior (sin el recuadro de `form`)
- [X] T019d [US1] Tarjetas de usuarios de prueba: la tabla accesible de 003 se presenta como tarjetas con ícono y cargo; cada tarjeta ingresa con un clic enviando el mismo formulario de `login()` (004); prueba en `tests/integration/login-theme-005.integration.test.js`
- [X] T019e [US1] Botón de tema con íconos SVG y `aria-label` que cambia según el tema; campana reservada con ícono SVG en lugar de emoji
- [ ] T019f [US1] Menú de usuario con avatar de iniciales y cargo (FR-013): hoy la barra superior muestra nombre, User ID y rol, sin avatar
- [ ] T019g [US1] La etiqueta visible del botón `nav-documents` sigue diciendo "Órdenes de Compra" (su `aria-label` ya dice "Solicitudes y Órdenes de Compra"); unificar sin romper las pruebas de 003

**Checkpoint**: US1 funcional e independiente (MVP visual/navegación).

---

## Fase 4: Historia de Usuario 2 — Panel de control con lectura visual de la operación (Prioridad: P1)

**Objetivo**: Panel con indicadores, gráficos SVG, ranking y "Requiere tu atención" por rol 004.  
**Prueba independiente**: Con datos existentes, validar tarjetas, gráficos de estado y gasto (6 meses, emitidas aprobado/recibido, separado por moneda), top 5 proveedores, alternativas textuales/tabla, y lista por rol (gerente/admin, bodeguero, comprador, consulta).

- [X] T020 [P] [US2] Implementar funciones SVG puras para gráfico de OC por estado, gasto mensual y ranking top 5 con alternativas textuales/tabla en `src/ui-charts.js`
- [X] T021 [US2] Implementar cálculo en presentación de métricas (OC emitidas aprobado/recibido por fecha de emisión, separadas por moneda, sin conversión) y estados vacíos en `src/ui-dashboard.js`
- [X] T022 [US2] Implementar consulta reutilizable "Requiere tu atención" por rol 004 (Gerente/Administrador: pendientes de aprobar; Bodeguero: aprobadas por recibir y atrasadas; Comprador: sus borradores; Consulta: OC atrasadas solo lectura) en `src/ui-dashboard.js`
- [X] T023 [US2] Integrar tarjetas de indicadores, gráficos, ranking y lista "Requiere tu atención" en la vista Panel de `src/app.js` y `src/styles.css` preservando contenedores/ids existentes
- [X] T024 [P] [US2] Crear pruebas de integración de panel por rol y métricas (separación por moneda, estados vacíos, definición consulta/atención) en `tests/integration/dashboard-role.integration.test.js`
- [X] T024a [US2] Insignias de estado: la denominación de 004 se conserva en el elemento `[data-status]` y se agrega el estado específico al lado (`.status-detail`), sin romper las pruebas que leen la insignia; el desglose del Panel usa los nombres únicos del filtro 006
- [X] T025 [US2] Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

**Checkpoint**: US1 y US2 operativas de forma independiente.

---

## Fase 5: Historia de Usuario 3 — Órdenes de compra legibles y accionables (Prioridad: P2)

**Objetivo**: Listado tabla/tablero, formulario ordenado, detalle con progreso/historial/totales e impresión formal.  
**Prueba independiente**: Alternar tabla/tablero (solo lectura), validar orden Cabecera→Detalle→Totales sin tarjeta vacía, progreso/timeline/acciones permitidas, e impresión con folio OC-0001 o SOL-0001 si no emitida.

- [X] T026 [US3] Implementar alternancia de vista tabla/tablero por columnas de estado (tablero solo lectura, sin arrastrar) en `src/app.js` y `src/styles.css` conservando ids/`data-action` de OC
- [X] T027 [US3] Reestructurar visualmente formulario de OC en secciones Cabecera, Detalle de compra y Totales (ocultar/omitir tarjeta de totales vacía) en `src/app.js` y `src/styles.css` sin cambiar validaciones ni flujo
- [X] T028 [US3] Implementar detalle de OC con barra de progreso de estados, línea de tiempo vertical de historial, tarjeta de totales y acciones permitidas destacadas en `src/app.js` y `src/styles.css`
- [X] T029 [US3] Implementar estilos de impresión de OC/documento formal (logo/datos módulo, folio destacado OC o SOL, proveedor/solicitante, líneas, totales, firma aprobador) en `src/styles.css` y plantilla/markup en `src/app.js`
- [X] T030 [P] [US3] Crear pruebas de integración de tablero OC (alternancia tabla/tablero, solo lectura, preservación de ids/acciones) en `tests/integration/oc-board.integration.test.js`
- [X] T031 [US3] Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

**Checkpoint**: US3 operativa e independiente; flujo de estados sin cambios.

---

## Fase 6: Historia de Usuario 4 — Maestros y formularios con presentación consistente (Prioridad: P3)

**Objetivo**: Vistas alternativas en proveedores/productos y controles (chips de rubros sincronizados, stock, ficha 006).  
**Prueba independiente**: Alternar vistas proveedores, ver barra/etiqueta stock, seleccionar rubros por chips con selects originales ocultos y sincronizados, y validar formulario producto/ficha proveedor/ayuda Moneda del 006 sin cortes (móvil apilado).

- [ ] T032 [US4] Implementar alternancia tabla/tarjetas en Proveedores con avatar de iniciales, chips de rubro y etiqueta Nacional/Extranjero en `src/app.js` y `src/styles.css`
- [ ] T033 [US4] Implementar indicador visual de nivel de stock y etiqueta "Sin stock" en listados de Productos en `src/app.js` y `src/styles.css`
- [ ] T034 [US4] Implementar componente visual de chips de rubros sincronizado bidireccionalmente con selects múltiples originales (`supplier-rubros`, `search-rubros` y equivalentes) manteniéndolos ocultos en DOM en `src/ui-shell.js` o `src/app.js` y `src/styles.css`
- [ ] T035 [US4] Ajustar presentación del formulario de producto y ficha de proveedor en Búsqueda (006) para que la tabla de proveedores y precios quepa en panel lateral (móvil filas apiladas) preservando costo unitario no editable con lista de precios y ayuda de Moneda en `src/app.js` y `src/styles.css`
- [ ] T036 [P] [US4] Crear pruebas de integración de chips de rubros (sincronía con select oculto, selección/reflejo de valor) en `tests/integration/rubro-chips.integration.test.js`
- [ ] T037 [US4] Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

**Checkpoint**: US4 operativa e independiente; elementos 006 preservados.

---

## Fase 7: Historia de Usuario 5 — Accesibilidad, movimiento y adaptabilidad (Prioridad: P3)

**Objetivo**: WCAG 2.1 AA, teclado completo, reduced-motion y responsive (sidebar colapsada/menú desplegable, tarjetas apiladas).  
**Prueba independiente**: Auditar contraste y foco, navegar solo con teclado, emular `prefers-reduced-motion`/`prefers-color-scheme` y validar anchos medianos/pequeños sin scroll horizontal.

- [ ] T038 [P] [US5] Aplicar estilos de foco visible, contraste AA y etiquetas/alternativas textuales para gráficos y controles en `src/styles.css` y `src/ui-charts.js`
- [ ] T039 [P] [US5] Implementar reglas responsive (sidebar contraída en mediano, menú desplegable y tablas→tarjetas apiladas con etiquetas en pequeño) en `src/styles.css` y `src/ui-shell.js`
- [ ] T040 [US5] Implementar soporte `prefers-reduced-motion` para transiciones/animaciones y verificar coherencia de modo oscuro en `src/styles.css` y `src/ui-theme.js`
- [ ] T041 [US5] Revisar y ajustar orden de tabulación/atributos accesibles en vistas principales (`src/app.js`, `src/ui-shell.js`) sin alterar ids/`data-*`
- [ ] T042 [US5] Ampliar pruebas de integración de accesibilidad/adaptabilidad (si la convención lo permite) o validar cobertura manual documentada en `tests/integration/shell-sidebar.integration.test.js` y `tests/integration/theme.integration.test.js`
- [ ] T043 [US5] Verificación de fase: ejecutar `npm test -- --run` y `npm run lint`

**Checkpoint**: Todas las historias de usuario cumplen criterios de accesibilidad y adaptabilidad.

---

## Fase 8: Pulido y aspectos transversales

**Propósito**: Consolidación, rendimiento y validación final según quickstart.

- [ ] T044 [P] Revisar que no existan recursos externos cargados (fuentes/íconos/gráficos) y que `.woff2`/SVG sean locales en `src/styles.css`, `public/fonts/` y `src/ui-charts.js`
- [ ] T045 [P] Revisar presupuestos de rendimiento 001 y optimizar peso/ejecución de SVG y CSS en `src/ui-charts.js` y `src/styles.css`
- [ ] T046 Ejecutar validación manual completa descrita en `specs/005-compras-visual-redesign/quickstart.md` y ajustar hallazgos en archivos `src/*` correspondientes
- [ ] T047 Verificación final de fase: ejecutar `npm test -- --run` y `npm run lint`

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Fase 1 (Configuración)**: sin dependencias.
- **Fase 2 (Base fundacional)**: depende de Fase 1 — **bloquea** todas las historias.
- **Fase 3 (US1, P1)**: depende de Fase 2 — base de shell para el resto.
- **Fase 4 (US2, P1)**: depende de Fase 2 y se integra sobre shell de US1 (Fase 3).
- **Fase 5 (US3, P2)**: depende de Fase 2 y shell US1; independiente de US2 en datos, pero comparte navegación.
- **Fase 6 (US4, P3)**: depende de Fase 2 y shell US1.
- **Fase 7 (US5, P3)**: depende de Fases 3–6 (aplica transversalmente a lo construido).
- **Fase 8 (Pulido)**: depende de Fases 3–7.

### Dependencias de historias de usuario

- **US1 (P1)**: tras fundación — sin dependencia de otras historias (MVP).
- **US2 (P1)**: tras US1 (se muestra dentro del shell/panel).
- **US3 (P2)**: tras US1; puede planificarse en paralelo a US2 si se coordinan cambios en `src/app.js`.
- **US4 (P3)**: tras US1; paralelizable con US2/US3 con coordinación en `src/app.js`/`src/styles.css`.
- **US5 (P3)**: transversal, ideal tras estabilizar US1–US4.

### Oportunidades de paralelismo

- T002, T003 en paralelo (Fase 1); T006, T007 en paralelo (Fase 2); T011 paralelo a T010 si la API de tema está definida.
- T013 paralelo a preparación de markup; T018/T024/T030/T036 pruebas en paralelo a ajustes finales de su fase.
- Fase 8: T044 y T045 en paralelo.

---

## Ejemplos de ejecución en paralelo

```text
# Fase 2
T006: src/styles/tokens.css (variables claro/oscuro)
T007: src/styles/tokens.css|src/styles.css (@font-face locales)
T011: tests/integration/theme.integration.test.js

# US1
T013: src/ui-charts.js (SVG marca/íconos)
T018: tests/integration/shell-sidebar.integration.test.js

# US2
T020: src/ui-charts.js (gráficos)
T024: tests/integration/dashboard-role.integration.test.js
```

---

## Estrategia de implementación

### MVP primero (US1)
1. Completar Fase 1 y Fase 2.
2. Completar Fase 3 (US1) y validar de forma independiente.
3. Demostrar/entregar incremento de identidad + navegación.

### Entrega incremental
1. Base (F1–F2) → US1 → US2 (P1 completo) → US3 (P2) → US4 y US5 (P3) → Pulido.
2. Cada fase termina con `npm test -- --run` y `npm run lint` en verde, preservando las 356 pruebas existentes.

### Nota de coordinación
Varias tareas tocan `src/app.js` y `src/styles.css`; cuando se trabaje en paralelo, integrar por secciones/vistas para evitar conflictos y re-ejecutar la verificación de fase.

---

## Resumen

- **Total de tareas**: 47
- **Tareas por historia/fase**: Configuración 5, Base fundacional 7 (incl. prueba tema US5-tag y verificación), US1 7, US2 6, US3 6, US4 6, US5 6, Pulido 4
- **Pruebas nuevas explícitas**: T011, T018, T024, T030, T036 (y extensión T042) en `tests/integration/*.integration.test.js`
- **Verificaciones por fase**: T005, T012, T019, T025, T031, T037, T043, T047 (`npm test -- --run` y `npm run lint`)
- **MVP sugerido**: Fases 1–3 (hasta US1, T019)
- **Criterios de prueba independiente**: definidos en cada fase de historia (US1–US5)
- **Validación de formato**: todas las tareas siguen `- [ ] T### [P?] [US?] Descripción con ruta de archivo`
