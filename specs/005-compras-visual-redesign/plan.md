# Plan de Implementación: Rediseño Visual del Módulo de Compras (005)

**Rama**: `005-compras-visual-redesign` | **Fecha**: 2026-11-16 | **Spec**: `specs/005-compras-visual-redesign/spec.md`  
**Entrada**: Especificación de funcionalidad 005 y restricciones técnicas del usuario.

## Resumen

Rediseño visual completo de la SPA existente (Vite + JavaScript sin framework, persistencia en `localStorage`) bajo la excepción "Spec 005" de la constitución: solo HTML, CSS y componentes de interfaz. Se preserva íntegramente el comportamiento de dominio, validaciones, permisos y contratos de persistencia (`src/domain`, `src/purchasing-storage.js`, `src/storage.js`, `src/auth.js`). La presentación se implementa con tokens CSS (claro/oscuro), tipografías `.woff2` locales, SVG propio para gráficos/marca y módulos UI pequeños para no inflar `src/app.js`, conservando todos los `id`, `data-action` y estructuras leídas por las pruebas.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES modules, Vite) + HTML + CSS  
**Dependencias principales**: Vite (build/dev). Sin frameworks ni librerías de UI/gráficos/iconos en runtime; SVG y UI propios.  
**Almacenamiento**: `localStorage` existente para datos de dominio (sin cambios). Nueva clave de presentación: preferencia de tema UI (cliente).  
**Pruebas**: Vitest (suite existente, 356 pruebas) + ESLint; nuevas pruebas de integración para lo visible (tema, barra lateral, tablero, chips, panel por rol).  
**Plataforma destino**: Navegador (SPA).  
**Tipo de proyecto**: Web SPA (frontend único).  
**Objetivos de rendimiento**: Mantener presupuestos de rendimiento definidos en 001 (sin regresiones de carga/respuesta ni desplazamientos/layout costosos).  
**Restricciones**: No cambiar `src/domain`, `src/purchasing-storage.js`, `src/storage.js`, `src/auth.js` en comportamiento; no cargar recursos desde internet; conservar `id`, `data-*` y estructuras usadas por tests; sin conversión de monedas en métricas.  
**Escala/alcance**: Todas las pantallas del módulo de Compras; vistas login, panel, OC (tabla/tablero/detalle/impresión), proveedores, productos, búsqueda y formularios.

## Verificación de Constitución

*GATE: debe pasar antes de Fase 0 y revalidarse tras Fase 1.*

| Puerta | Estado | Nota |
|---|---|---|
| Excepción Spec 005 (solo presentación) | PASS | Cambios limitados a HTML/CSS/UI; dominio y contratos intactos. |
| Preservación specs 001–004 y 006 | PASS | FR-002/Entidades clave de 005 explícitos; sin cambios funcionales. |
| Sin frameworks/librerías | PASS | SVG propio, JS/CSS propios, fuentes locales. |
| Pruebas existentes intactas | PASS | 356 pruebas deben pasar sin modificarlas; se conservan `id`/`data-*`. |
| Presupuestos rendimiento 001 | PASS | Sin dependencias nuevas de runtime, SVG ligero, respeto a reduced-motion. |
| Sin recursos externos | PASS | `.woff2` en `public/fonts`, `@font-face` local. |

**Post-diseño (Fase 1)**: PASS. `research.md`, `data-model.md` y `contracts/` confirman ausencia de entidades/contratos de dominio nuevos y definen preservación de selectores.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/005-compras-visual-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-preservation-contract.md
└── tasks.md             # Fase posterior (/speckit.tasks)
```

### Código fuente (repositorio)

```text
src/
├── app.js                     # Orquestación existente (inflado mínimamente; delegar a UI)
├── auth.js                    # SIN cambio de comportamiento
├── domain/                    # SIN cambio de comportamiento
├── purchasing-storage.js      # SIN cambio de comportamiento
├── storage.js                 # SIN cambio de comportamiento
├── styles.css                 # Punto de entrada estilos; importa tokens/temas
├── styles/
│   └── tokens.css             # (nuevo) variables CSS tema claro/oscuro
├── ui-theme.js                # (nuevo) preferencia tema: localStorage + prefers-color-scheme
├── ui-shell.js                # (nuevo) barra lateral, topbar, breadcrumbs, buscador, menú, reservas 007
├── ui-dashboard.js            # (nuevo) tarjetas, gráficos SVG, ranking, "Requiere tu atención" por rol
└── ui-charts.js               # (nuevo) generadores SVG puros (barras/estado/gasto, patrón marca)

public/
└── fonts/
    ├── space-grotesk-*.woff2  # (nuevo) local
    └── inter-*.woff2          # (nuevo) local

tests/
├── ... (existentes, 356, sin modificar)
└── integration/ (o ubicación existente)
    ├── theme.integration.test.*        # (nuevo)
    ├── shell-sidebar.integration.test.* # (nuevo)
    ├── oc-board.integration.test.*      # (nuevo)
    ├── rubro-chips.integration.test.*   # (nuevo)
    └── dashboard-role.integration.test.*# (nuevo)
```

**Decisión de estructura**: SPA de archivo único lógico (`src/`) extendida con módulos UI pequeños y `styles/tokens.css` para aislar presentación; sin tocar módulos de dominio/persistencia/auth.

## Fases de Implementación

Cada fase termina con: `npm test -- --run` (356 pruebas existentes en verde) y `npm run lint` en verde, más las pruebas nuevas de integración de la fase.

### Fase 0 — Investigación y base (research)
- Confirmar puntos de montaje en `app.js`/HTML, inventario real de `id`/`data-*` usados por tests, y convención de tests de integración del proyecto.
- Definir contrato de tokens (nombres CSS vars) y clave `localStorage` del tema.

### Fase 1 — Tokens, tipografías y tema
- `src/styles/tokens.css` (claro/oscuro) importado desde `src/styles.css`.
- `public/fonts/*.woff2` + `@font-face` en CSS.
- `src/ui-theme.js`: leer/escribir preferencia en `localStorage`, fallback a `prefers-color-scheme`, aplicar atributo/clase de tema, exponer toggle.
- Prueba integración: tema (persistencia, fallback sistema, toggle).

### Fase 2 — Armazón y navegación (shell/login)
- Login dividido (marca SVG + formulario), tarjetas usuarios de prueba con `login()` de 004.
- Sidebar agrupada (Operación: Panel + "Solicitudes y Órdenes de Compra" única; Maestros; Herramientas: Búsqueda + "Reportes" reservado oculto/deshabilitado), colapsable a íconos.
- Topbar: breadcrumbs, buscador global (solo navega a Búsqueda existente), espacio campana reservado (oculto/deshabilitado), menú usuario, toggle tema.
- `src/ui-shell.js` + SVG patrón de marca en `src/ui-charts.js` (o helper SVG).
- Prueba integración: barra lateral/colapso y reservas 007.

### Fase 3 — Panel de control
- `src/ui-dashboard.js` + `src/ui-charts.js`: tarjetas indicadores, gráfico OC por estado, gasto mensual últimos 6 meses y top 5 proveedores (OC emitidas aprobado/recibido por fecha emisión, separado por moneda, sin conversión), SVG propio con alternativa textual/tabla.
- "Requiere tu atención" por rol 004 (gerente/admin, bodeguero, comprador, consulta solo lectura) con lógica de consulta reutilizable (presentación) para 007.
- Prueba integración: panel por rol y métricas por moneda/estados vacíos.

### Fase 4 — Órdenes de compra
- Listado: alternar tabla/tablero por estado (tablero solo lectura), sin arrastrar.
- Formulario: Cabecera → Detalle → Totales (sin tarjeta de totales vacía). Detalle: progreso de estados, timeline historial, totales, acciones permitidas destacadas.
- Impresión: documento formal, folio destacado OC-0001 o SOL-0001 si no emitida.
- Prueba integración: tablero alternable y preservación de acciones/ids.

### Fase 5 — Maestros y formularios
- Proveedores: tabla/tarjetas (avatar iniciales, chips rubro, Nacional/Extranjero).
- Productos: barra stock y "Sin stock".
- Chips de rubros: UI de chips sincronizada con selects múltiples originales (`supplier-rubros`, `search-rubros`, etc.) que permanecen ocultos y sincronizados.
- Formulario producto (006): tabla proveedores/precios cabe en panel lateral (móvil filas apiladas); preservar ficha proveedor en Búsqueda, costo unitario no editable con lista de precios y ayuda Moneda.
- Prueba integración: chips (sincronía con select) y vistas alternables.

### Fase 6 — Accesibilidad, adaptabilidad y pulido
- Contraste AA, foco visible, teclado completo, `prefers-reduced-motion`, responsive (sidebar colapsada media, menú desplegable + tarjetas apiladas en pequeño), modo oscuro coherente.
- Revisión final de presupuestos 001 y que no hay recursos externos.

## Seguimiento de Complejidad

Sin violaciones de constitución que justificar. Complejidad controlada mediante módulos UI pequeños y delegación desde `app.js`.
