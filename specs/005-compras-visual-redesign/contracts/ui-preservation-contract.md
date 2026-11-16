# Contrato de Preservación de UI (005)

**Propósito**: Garantizar que el rediseño visual no rompa las pruebas automatizadas existentes (356) ni el comportamiento observable que estas validan. Este documento define qué debe preservarse; no introduce APIs de red.

## Reglas de Contrato

1. **Conservar todos los `id`** del HTML referenciados por pruebas en `tests/`. No renombrar ni eliminar.
2. **Conservar todos los atributos `data-action`** y demás `data-*` usados por pruebas o por la lógica existente (delegación de eventos, selección de filas, toggles, etc.). Se pueden añadir nuevos atributos, pero no quitar ni cambiar valores esperados.
3. **Conservar estructuras/jerarquías** que las pruebas consultan (por ejemplo, presencia de formularios, tablas, botones, contenedores específicos, roles/atributos semánticos si son asertados). Los componentes visuales nuevos se agregan alrededor/envolviendo, no en reemplazo de los nodos contractuales.
4. **Comportamiento de dominio intacto**: `src/domain`, `src/purchasing-storage.js`, `src/storage.js`, `src/auth.js` sin cambios de comportamiento. El login de tarjetas de prueba debe usar el mismo `login()` de 004.
5. **Selects de rubros sincronizados**: Los `<select multiple>` originales (p.ej. `supplier-rubros`, `search-rubros` y equivalentes usados en formularios/búsqueda) deben permanecer en el DOM, ocultos visualmente, y mantenerse sincronizados en valor/selección con los chips.
6. **Navegación**: "Solicitudes y Órdenes de Compra" permanece como una sola entrada (003 FR-067). Buscador global solo navega a la vista Búsqueda existente con el texto escrito.
7. **Estados/folios**: Insignias con nombres exactos del filtro 006 ("Solicitud – Borrador", "Solicitud – Pendiente de aprobación", "OC emitida – Aprobada", "OC – Recibida", "Cancelada"). Folios `SOL-`/`OC-` preservados; impresión destaca OC o SOL según emisión.

## Inventario de Selectores (Fase 0 — verificado T004)

Inventario realizado sobre `tests/` (búsqueda de `getElementById`/`qs`/`id="`/`data-action`/`data-*`). **No se elimina ni renombra ninguno** de estos contratos.

### `id` / estructuras críticas verificadas por tests
- **Autenticación/Login**: `auth-gate`, `app-shell`, `login-form`, `login-user-id`, `login-error`, `login-submit`, `demo-users-hints`, `login-demo-users-body`, `session-info`, `session-user`, `session-role`, `logout-button`.
- **Shell/Navegación**: `sidebar`, `sidebar-toggle`, `nav-dashboard`, `nav-entities`, `nav-documents`, `nav-products`, `nav-search`, `nav-*-label`, `view-dashboard`, `view-entities`, `view-documents`, `view-products`, `view-search`, `view-order-detail`, `view-print`.
- **Panel**: `dashboard-heading`, `stat-*` (`stat-entities-card`, `stat-documents-card`, `stat-statuses-label`, `stat-status-breakdown`, `stat-overdue-card`, `stat-products-card`, etc.), acciones rápidas `action-new-entity`, `action-new-document`, `action-open-entities`, `action-find`, `action-load-demo`, `demo-feedback`.
- **Proveedores/Entidades**: `entities-view-heading`, `entity-form`, `entity-table`, `entity-table-body`, `entity-table-rubro-heading`, `entities-filter-rubros`, `entities-filter-origin`, `entities-filter-clear`, `entity-filter-summary`, `supplier-rubros`, `search-rubros`, `entity-list-new`.
- **Órdenes/Documentos**: `documents-view-heading`, `document-form`, `document-table`, `document-table-body`, `documents-filter-*`, `document-filter-summary`, `document-entity`, `document-employee`, `folio`, `startDate`, `endDate`, `currency`, `docPaymentTerms`, `status`, `document-type-label`, `document-submit-button`, `document-list-new`, `document-feedback`, `order-detail-view`, `order-lines-table`, `order-totals`, `order-actions`, `order-history`, `print-order-view`, `line-*`.
- **Productos/Búsqueda**: `products-view`, `search-input`, `search-results-list`, `search-empty`, `supplier-summary`.
- **Comunes**: `side-panel`, `confirm-dialog`, `confirm-dialog-accept`, `toast-region`, `config-warning`.

### `data-*` / acciones preservadas
- Navegación: `data-module` en `.nav-module` (`dashboard|entities|documents|products|search`) y `aria-current`.
- Acciones de tabla/vistas: `data-action` usados por flujos existentes (p.ej. `new-entity`, `new-document`, `clear-entity-filters`, `clear-document-filters`, `add-line`, `open-supplier-summary`, `close-order-detail`, `view-order`, etc. según vistas renderizadas) y `data-id`/`data-order-id`/`data-sort`.
- Formularios/controles: `data-form-section`, `data-readonly-employee`, `data-emission-date`, `data-feedback-container`, atributos de iconos `data-icon`.

### Extensiones aditivas 005 (sin romper contratos)
- Nuevos contenedores/ids de presentación agregados alrededor (no en reemplazo): `theme-toggle`, `topbar-center`, `breadcrumbs`, `breadcrumb-current`, `global-search-form`, `global-search-input`, `notifications-placeholder` (reserva 007, oculta/deshabilitada), `nav-reports` (reserva 007, oculta/deshabilitada), agrupadores `.nav-group` envolviendo botones existentes. `#sidebar`, `#sidebar-toggle`, `#auth-gate`, `#demo-users-hints` y `#login-demo-users-body` se conservan.

## Reservas de Estructura 007 (nuevas, no deben interferir)

- Entrada "Reportes" en grupo Herramientas: **oculta o deshabilitada** hasta 007 (no navegable, no rompe tests).
- Espacio para campana de notificaciones en topbar: **oculto o deshabilitado** hasta 007.
- "Requiere tu atención": lógica de consulta por rol definida de forma reutilizable para la bandeja 007 (presentación), sin implementar notificaciones.

## Criterio de Aceptación del Contrato

- `npm test -- --run` pasa con las 356 pruebas existentes **sin modificarlas**.
- `npm run lint` en verde.
- Ningún `id`/`data-*` previamente existente referenciado por tests es eliminado o renombrado.
