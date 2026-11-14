# Quickstart: Mejoras de UX del módulo de Compras

**Feature**: `003-purchasing-ux-improvements` | **Date**: 2026-11-08

## Requisitos

- Node.js compatible con Vite 8 y Vitest 4.
- Dependencias instaladas (`node_modules`).
- Navegador moderno con `localStorage`.

## Ejecutar la aplicación

```powershell
npm install
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://localhost:5173`).

## Validación automatizada

```powershell
npm test -- --run
npm run build
npm run lint
```

Resultado esperado:

- Toda la suite de 001/002/003 pasa.
- Build de Vite sin errores.
- ESLint sin errores.

## Validación manual

### 1. Panel lateral y formularios

1. Ir a **Proveedores**.
2. Verificar que la lista ocupa el ancho disponible y que `+ Nuevo` está visible.
3. Activar `+ Nuevo`: se abre el panel lateral, el foco entra en el primer campo y el fondo no es interactuable.
4. Verificar secciones, grilla de dos columnas (una en móvil), campos obligatorios marcados y errores junto a cada campo al guardar vacío. En Proveedor, comprobar Rubro múltiple y Origen dentro de Datos generales; en Producto, comprobar que la categoría solo se selecciona y no se crea en el formulario.
5. Completar y guardar: aparece toast de éxito, se cierra el panel y la lista se actualiza.
6. Editar un registro, cambiar un campo y cerrar con Esc: aparece confirmación.
7. Cancelar la confirmación: el panel sigue abierto con los cambios.
8. Confirmar: se cierra y el foco vuelve al disparador.
9. Repetir con **Órdenes de compra** (cabecera/detalle/totales) y **Productos**.
10. Probar Tab/Shift+Tab: el foco no escapa del panel.
11. Reducir el viewport a ancho móvil: el panel ocupa el ancho completo y las acciones siguen usables.

### 2. Listas, filtros y orden

1. Ir a **Órdenes de compra**.
2. Filtrar por estado, proveedor y rango de fechas; verificar que los filtros se combinan.
3. Introducir un rango inválido (desde > hasta): se muestra error y no se aplica.
4. Activar `Solo atrasadas`: solo aparecen órdenes no terminales con entrega vencida.
5. Ordenar por cada columna visible (folio, proveedor, empleado, fechas, estado, total); verificar `aria-sort` y alternancia asc/desc.
6. Activar `Limpiar filtros`: vuelven todos los registros.
7. Verificar estado vacío sin registros y sin coincidencias; cada uno ofrece la acción correcta.
8. Repetir filtros/orden en **Proveedores** (uno o más Rubros y Origen) y **Productos** (Categoría).
9. Verificar badges de estado con texto y color en lista y detalle.

### 3. Dashboard

1. Ir a **Panel**.
2. Activar la tarjeta de proveedores: abre la lista de proveedores.
3. Activar la tarjeta de productos: abre la lista de productos.
4. Activar la tarjeta de órdenes: abre la lista de órdenes.
5. Activar un estado del desglose: abre órdenes filtradas por ese estado.
6. Activar **Atrasadas**: abre órdenes filtradas por atraso.
7. Verificar que el filtro se refleja en los controles y se puede limpiar.
8. Usar acciones rápidas **Nuevo proveedor** y **Nueva orden**: abren el panel en creación.

### 4. Notificaciones y confirmaciones

1. Guardar un registro: toast de éxito visible y desaparece a los 5 s.
2. Provocar un error de validación/persistencia: toast de error permanece hasta cerrarlo.
3. Eliminar un proveedor/producto/orden: aparece confirmación; cancelar no elimina.
4. Cancelar una orden: aparece confirmación; cancelar no cambia el estado.
5. Verificar que Esc cancela y que el foco vuelve al disparador.
6. Verificar que no se usan diálogos nativos del navegador.

### 5. Datos de demostración

1. Con `localStorage` limpio, activar **Cargar datos de demostración**.
2. Verificar que se crean al menos 3 proveedores, un empleado por cada cargo existente, 3 categorías, 6 productos y 6 órdenes.
3. Verificar que existen los cinco estados y al menos una orden atrasada.
4. Verificar que las órdenes tienen líneas y totales coherentes.
5. Con datos existentes, activar de nuevo: aparece confirmación.
6. Cancelar: no se modifica nada.
7. Confirmar: se agregan datos sin borrar ni sobrescribir los existentes.
8. Verificar que no se crearon claves nuevas en `localStorage`.

### 6. Accesibilidad

1. Navegar toda la app solo con teclado.
2. Verificar foco visible, etiquetas, nombres accesibles de botones de icono y contraste.
3. Verificar que el panel y la confirmación atrapan el foco y lo restauran.
4. Verificar `aria-sort` en tablas y `aria-live` en notificaciones.
5. Probar zoom 200 % y viewport estrecho.

### 7. Rendimiento

1. Cargar un dataset de 500 proveedores y 2.000 órdenes (prueba automatizada o script de apoyo).
2. Medir render de lista, filtro/orden y dashboard.
3. Verificar presupuestos:
   - Lista ≤1 s.
   - Filtro/orden ≤300 ms.
   - Dashboard ≤500 ms.
   - Panel ≤200 ms.

### 8. Detalle, categorías y navegación post-revisión

1. Ir a **Solicitudes y Órdenes de Compra** y activar una fila: se abre el detalle como vista propia, sin quedar debajo de la lista ni de otras pantallas.
2. Verificar que el detalle muestra "Volver a Órdenes de Compra" y que al volver se conservan filtros, orden y foco.
3. Comprobar que el detalle inactivo no ocupa espacio ni es alcanzable con Tab.
4. En el detalle, verificar la denominación por estado ("Solicitud de compra" u "Orden de Compra emitida"), la fecha de emisión o "Sin emitir", y que no aparecen acciones que el rol no puede ejecutar.
5. Ir a **Productos** y abrir la pestaña o sección **Categorías**: crear, editar y eliminar una categoría; verificar unicidad y bloqueo si está referenciada.
6. Verificar que el formulario de producto solo permite seleccionar una categoría existente y que no contiene controles para crearla.
7. Comprobar el orden de la barra lateral: Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda.
8. Ingresar con cada rol de 004 y verificar que "+ Nuevo", panel, tarjetas, filtros, demo y detalle respetan sus permisos en la interfaz y en el servicio.

## Pruebas específicas

```powershell
npx vitest run tests/unit/purchasing-list-query.test.js
npx vitest run tests/unit/purchasing-status.test.js
npx vitest run tests/unit/purchasing-demo-data.test.js
npx vitest run tests/integration/purchasing-side-panel.test.js
npx vitest run tests/integration/purchasing-list-controls.test.js
npx vitest run tests/integration/purchasing-feedback.test.js
npx vitest run tests/integration/purchasing-dashboard-filters.test.js
npx vitest run tests/integration/purchasing-demo-data.test.js
npx vitest run tests/integration/purchasing-accessibility.test.js
npx vitest run tests/integration/purchasing-performance.test.js
npx vitest run tests/integration/purchasing-order-detail-view.test.js
npx vitest run tests/integration/product-categories.test.js
npx vitest run tests/integration/navigation-order.test.js
npx vitest run tests/integration/purchasing-rbac-003.test.js
npx vitest run tests/integration/purchasing-post-review-alignment.test.js
```

## Checklist de aceptación

- [ ] Listas a ancho completo con `+ Nuevo` y acciones visibles.
- [ ] Formularios en panel lateral con secciones, obligatorios y errores.
- [ ] Confirmación al cerrar con cambios sin guardar; cancelar conserva datos.
- [ ] Badges de estado con texto y color en lista, detalle y dashboard.
- [ ] Tarjetas del dashboard navegables y filtros preaplicados.
- [ ] Filtros/orden en memoria con rango inclusivo, atrasos y limpiar.
- [ ] Estados vacíos con acción útil.
- [ ] Toasts de éxito 5 s y errores persistentes; confirmaciones propias.
- [ ] Iconos SVG inline y accesibles.
- [ ] Demo aditiva con todos los estados, al menos una atrasada y un empleado por cargo existente.
- [ ] Detalle de OC como vista propia, con "Volver a Órdenes de Compra" y filtros/orden restaurados.
- [ ] Listas a ancho completo con "+ Nuevo" y panel lateral restituidos; formularios en dos columnas por secciones.
- [ ] Pestaña o sección "Categorías" en Productos; el formulario de producto solo selecciona categorías existentes.
- [ ] Barra lateral en orden Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos, Búsqueda.
- [ ] Elementos de 003 respetan los permisos de 004 en interfaz y servicio.
- [ ] Sin campos retirados por 001/002 reintroducidos (Rubro múltiple, Origen, sin campos manuales de OC, fecha de emisión automática).
- [ ] Sin cambios de modelo/reglas/claves de storage.
- [ ] Accesibilidad y responsive verificados.
- [ ] Rendimiento verificado con 500 proveedores y 2.000 órdenes.
- [ ] `npm test -- --run`, `npm run build` y `npm run lint` pasan.
