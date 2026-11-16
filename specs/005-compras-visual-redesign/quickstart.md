# Quickstart de Validación: Rediseño Visual 005

Guía para validar el rediseño visual de extremo a extremo sin incluir detalles de implementación interna. Complementa `plan.md`, `research.md`, `data-model.md` y `contracts/ui-preservation-contract.md`.

## Prerrequisitos

- Node.js y npm instalados (versiones compatibles con el proyecto).
- Dependencias instaladas: `npm install`.
- Navegador moderno para validación manual (soporte CSS variables, SVG, `prefers-color-scheme`).
- Rama: `005-compras-visual-redesign`.

## Configuración

1. Instalar dependencias (si aplica): `npm install`.
2. Iniciar entorno de desarrollo: `npm run dev` (Vite) y abrir la URL indicada.
3. (Opcional) Build de verificación: `npm run build`.

## Verificación Automatizada (obligatoria en cada fase)

Ejecutar al final de cada fase de implementación:

1. **Pruebas existentes (no modificadas)**  
   - Comando: `npm test -- --run`  
   - Resultado esperado: **356 pruebas existentes en verde**, 0 fallos.
2. **Lint**  
   - Comando: `npm run lint`  
   - Resultado esperado: sin errores.

## Pruebas Nuevas de Integración (visibles)

Agregar y ejecutar pruebas de integración para:
- **Tema**: preferencia guardada en `localStorage`, fallback a `prefers-color-scheme`, toggle claro/oscuro.
- **Barra lateral/shell**: agrupación, colapso a íconos, reservas 007 ocultas/deshabilitadas, breadcrumbs/buscador/menú.
- **Tablero OC**: alternancia tabla/tablero por estado, tablero solo lectura.
- **Chips de rubros**: sincronía con selects originales ocultos (`supplier-rubros`, `search-rubros`).
- **Panel por rol**: "Requiere tu atención" según rol 004 (gerente/admin, bodeguero, comprador, consulta).

Resultado esperado: todas las nuevas pruebas en verde junto con las 356 existentes.

## Escenarios de Validación Manual

### 1. Login e identidad
- Abrir módulo sin sesión: pantalla dividida (marca con patrón SVG + formulario).
- Usar tarjeta de usuario de prueba (un clic, `login()` 004): ingresa y muestra cargo/ícono.

### 2. Armazón y navegación
- Sidebar con Operación (Panel + "Solicitudes y Órdenes de Compra" como una sola entrada), Maestros (Proveedores, Productos), Herramientas (Búsqueda y "Reportes" reservado oculto/deshabilitado). Colapsar/expandir.
- Topbar: breadcrumbs, buscador global que navega solo a Búsqueda existente con texto, espacio campana reservado oculto/deshabilitado, menú usuario (avatar, cargo, cierre).
- Pantalla mediana: sidebar contraída. Pantalla pequeña: menú desplegable y tablas como tarjetas apiladas.

### 3. Tema claro/oscuro
- Activar modo oscuro: aplica tokens y contraste AA; recargar y verificar persistencia (`localStorage`).
- Borrar preferencia y cambiar `prefers-color-scheme` del sistema: el módulo sigue al sistema.

### 4. Panel de control por rol
- Verificar tarjetas, gráfico OC por estado, gasto mensual (6 meses) y top 5 proveedores (SVG propio + alternativa textual/tabla).
- Métricas: solo OC emitidas (aprobado/recibido) por fecha de emisión, separadas por moneda, sin conversión.
- "Requiere tu atención": gerente/admin (pendientes de aprobar), bodeguero (aprobadas por recibir y atrasadas), comprador (sus borradores), consulta (OC atrasadas, solo lectura).

### 5. Órdenes de compra
- Alternar tabla/tablero por estado (tablero sin arrastrar).
- Formulario: Cabecera → Detalle → Totales (nunca tarjeta de totales vacía).
- Detalle: barra de progreso, timeline historial, totales, acciones permitidas destacadas.
- Impresión: folio destacado OC (`OC-0001`) o SOL (`SOL-0001`) si no emitida, datos completos y espacio de firma.

### 6. Proveedores, productos y formularios (incl. 006)
- Proveedores: alternar tabla/tarjetas (avatar iniciales, chips rubro, Nacional/Extranjero).
- Productos: barra de stock y "Sin stock" cuando corresponde.
- Rubros: chips seleccionables con select múltiple original oculto y sincronizado (`supplier-rubros`, `search-rubros`).
- Formulario de producto: tabla proveedores/precios cabe en panel lateral (móvil filas apiladas); ficha proveedor en Búsqueda, costo unitario no editable con lista de precios y ayuda de Moneda preservados.

### 7. Accesibilidad y movimiento
- Navegación completa por teclado y foco visible.
- Contraste de texto ≥ 4,5:1 en claro y oscuro.
- `prefers-reduced-motion`: transiciones atenuadas/desactivadas.

### 8. Preservación y rendimiento
- Confirmar que `id`/`data-*` contractuales siguen presentes (ver `contracts/ui-preservation-contract.md`).
- Sin recursos cargados desde internet (tipografías/íconos/gráficos locales).
- Sin regresión perceptible respecto a presupuestos de rendimiento de 001.

## Criterio de Éxito del Quickstart

- 356 pruebas existentes + nuevas pruebas de integración + lint en verde por fase.
- Todos los escenarios manuales anteriores cumplen el comportamiento y restricciones de la spec 005.
- Ningún cambio de comportamiento en dominio, validaciones, permisos ni contratos de persistencia.
