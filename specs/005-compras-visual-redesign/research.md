# Investigación: Rediseño Visual 005

**Fecha**: 2026-11-16 | **Rama**: `005-compras-visual-redesign`

## 1. Enfoque de rediseño sobre SPA existente

- **Decision**: Implementar el rediseño como capa de presentación sobre la SPA Vite + JavaScript sin framework existente, agregando módulos UI (`ui-theme.js`, `ui-shell.js`, `ui-dashboard.js`, `ui-charts.js`) y tokens CSS, sin reescribir la orquestación de negocio.
- **Rationale**: Minimiza riesgo de regresión en 356 pruebas, respeta la excepción 005 (solo HTML/CSS/UI) y evita inflar `src/app.js`.
- **Alternatives considered**: Reescritura completa de vistas en `app.js` (rechazada: alto riesgo y archivo monolítico); introducir framework/librería UI (rechazada: prohibido por spec/constitución).

## 2. Preservación de contratos de pruebas

- **Decision**: Tratar todos los `id`, atributos `data-*` (incl. `data-action`) y estructuras DOM que leen las pruebas como contrato estable; envolver/añadir contenedores y clases visuales alrededor sin eliminarlos ni renombrarlos.
- **Rationale**: SC-001/FR-003 exigen 356 pruebas existentes pasando sin modificarlas.
- **Alternatives considered**: Actualizar tests para nuevo DOM (rechazada: explícitamente prohibido); reemplazar controles (rechazada: rompe selectores). 
- **Nota de implementación**: Fase 0 debe inventariar selectores usados en `tests/` antes de tocar vistas.

## 3. Tokens y temas (claro/oscuro)

- **Decision**: Definir tokens como variables CSS en `src/styles/tokens.css` (o equivalente) importado desde `src/styles.css`, con conjuntos para tema claro y oscuro; toggle de presentación gestionado por `ui-theme.js`.
- **Rationale**: Consistencia (FR-009), mantenimiento y soporte AA en ambos modos (FR-014, FR-028).
- **Alternatives considered**: Valores hardcodeados por componente (rechazada: inconsistencia); tema solo por media query sin preferencia guardada (rechazada: no cumple FR-014).

## 4. Persistencia de preferencia de tema

- **Decision**: Guardar preferencia en `localStorage` bajo una clave dedicada de UI (p.ej. `compras.ui.theme` con valores `light`/`dark`/ausente). Si no hay preferencia, seguir `prefers-color-scheme`.
- **Rationale**: FR-014 y spec aclaran comportamiento exacto; es presentación de cliente, no dato de dominio.
- **Alternatives considered**: Guardar en storage de dominio (rechazada: altera contratos de persistencia conceptuales y está fuera de alcance); solo en memoria (rechazada: no persiste entre sesiones).

## 5. Tipografías locales

- **Decision**: Incluir Space Grotesk (títulos) e Inter (texto) como `.woff2` en `public/fonts/` con `@font-face` y pila de respaldo del sistema; sin CDN ni fetch externo.
- **Rationale**: FR-007 y supuestos prohíben carga desde internet.
- **Alternatives considered**: Google Fonts/CDN (rechazada); solo fuentes del sistema (rechazada: no cumple identidad).

## 6. Gráficos y marca en SVG propio

- **Decision**: Generar gráficos (OC por estado, gasto mensual 6 meses, ranking top 5) y patrón de marca mediante funciones puras en `src/ui-charts.js` que retornan/inyectan SVG; siempre con alternativa textual o tabla equivalente.
- **Rationale**: FR-001/FR-016 prohíben librerías; FR-004 exige datos existentes; SC-007 exige equivalencia textual.
- **Alternatives considered**: Chart.js/D3/canvas raster (rechazada: librerías o menor accesibilidad); imágenes estáticas (rechazada: no reflejan datos).

## 7. Métricas: gasto y top proveedores

- **Decision**: Calcular suma del total de OC emitidas (estado aprobado y recibido) por fecha de emisión, agrupado por mes y separado por moneda, sin conversión; ranking top 5 proveedores por monto bajo la misma regla, separado por moneda cuando aplique.
- **Rationale**: Decisiones 9 y aclaraciones de spec/FR-004 y casos límite.
- **Alternatives considered**: Convertir a moneda única (rechazada); incluir borradores/pendientes (rechazada: definición acordada es "emitidas aprobado/recibido").

## 8. "Requiere tu atención" por rol

- **Decision**: Definir la consulta por rol 004 en lógica de presentación reutilizable: Gerente/Administrador → solicitudes pendientes de aprobar; Bodeguero → OC aprobadas por recibir y atrasadas; Comprador → sus borradores; Consulta → OC atrasadas en solo lectura. Exponer resultado de forma reutilizable para futura bandeja 007.
- **Rationale**: FR-018 y decisión 7; reutilización sin implementar 007.
- **Alternatives considered**: Definir por cargo libre o duplicar lógica en 007 (rechazada).

## 9. Navegación y reservas 007

- **Decision**: Operación mantiene Panel y "Solicitudes y Órdenes de Compra" como una sola entrada (003 FR-067). En Herramientas se reserva "Reportes" y en topbar espacio para campana, ambos ocultos o deshabilitados hasta 007. Buscador global solo navega a vista Búsqueda existente con el texto escrito.
- **Rationale**: FR-012/FR-013 y decisiones 5, 6, 8.
- **Alternatives considered**: Separar Solicitudes y OC o implementar búsqueda nueva (rechazada).

## 10. Chips de rubros y selects originales

- **Decision**: Renderizar chips seleccionables como UI y mantener los `<select multiple>` originales (`supplier-rubros`, `search-rubros` y equivalentes) en el DOM ocultos y sincronizados bidireccionalmente en valor/estado.
- **Rationale**: FR-026 y decisión 10; preserva compatibilidad con pruebas y lógica existente que lea los selects.
- **Alternatives considered**: Eliminar select y leer solo chips (rechazada: riesgo de romper tests/comportamiento).

## 11. Insignias de estado y folios

- **Decision**: Insignias con color propio + etiqueta textual usando nombres exactos del 006: "Solicitud – Borrador", "Solicitud – Pendiente de aprobación", "OC emitida – Aprobada", "OC – Recibida", "Cancelada". Impresión destaca folio OC (`OC-0001`) o, si no emitida, N° solicitud (`SOL-0001`).
- **Rationale**: FR-006/FR-023 y decisiones 11, 12.
- **Alternatives considered**: Etiquetas libres o folio único (rechazada).

## 12. Estrategia de pruebas por fase

- **Decision**: Cada fase ejecuta `npm test -- --run` (356 existentes) y `npm run lint`; añadir pruebas de integración nuevas para lo visible (tema, barra lateral, tablero, chips, panel por rol) en la ubicación/convención existente del repo.
- **Rationale**: Restricción explícita del usuario y SC-001; valida comportamiento visible sin tocar tests existentes.
- **Alternatives considered**: Pruebas solo al final (rechazada: feedback tardío); modificar tests existentes (rechazada).
