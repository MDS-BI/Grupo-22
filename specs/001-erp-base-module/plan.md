# Plan de Implementación: Módulo Base de Software de Planificación de Recursos Empresariales (ERP)

**Rama**: `001-erp-base-module` | **Fecha**: 2026-07-08 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/001-erp-base-module/spec.md`

## Resumen

Construir una aplicación web ligera con Vite que sirva como módulo base de software de planificación de recursos empresariales (ERP). El módulo proporciona la base común que todo módulo ERP personalizado necesita: gestión de datos maestros (Entidades), documentos transaccionales vinculados (Documentos), flujos de crear/editar/eliminar/buscar, validación y persistencia local — construida principalmente con HTML, CSS y JavaScript vanilla. La aplicación se presenta como un espacio de trabajo ERP coherente: una barra superior con marca (logotipo derivado + nombre del módulo) y una barra lateral persistente de botones de módulo envuelven cada pantalla, y la pantalla de entrada es un panel estilo ERP que ofrece botones de acción rápida para las tareas clave (nueva entidad, nuevo documento, abrir áreas de gestión, buscar registros) además de estadísticas de registros en vivo. La adaptación a un módulo específico (p. ej., Ventas) se realiza mediante un único archivo de configuración (`src/module-config.js`) que cubre terminología, campos personalizados, ciclo de vida de documentos y color de acento, de modo que el código central permanece intacto.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, sin framework de interfaz pesado  
**Almacenamiento**: localStorage del navegador para una instancia del módulo de espacio único  
**Pruebas**: Vitest con jsdom para pruebas unitarias y de interacción  
**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles  
**Tipo de Proyecto**: Aplicación web  
**Objetivos de Rendimiento**: Ines nteraccioresponsivas para listas de hasta 500 registros; la búsqueda y las actualizaciones de la interfaz deben sentirse instantáneas  
**Objetivos de Rendimiento**: Interacciones responsivas para listas de hasta 500 registros; la búsqueda y las actualizaciones de la interfaz deben sentirse instantáneas  
**Restricciones**: Huella mínima de librerías, despliegue simple, sin backend requerido; la estructura debe mantenerse extensible para módulos personalizados  
**Escala/Alcance**: Módulo base con CRUD de datos maestros (Entidad) y documentos transaccionales (Documento), búsqueda y capacidades de navegación

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

- Calidad: La implementación usará una estructura JavaScript pequeña y modular con límites de función claros y nomenclatura consistente, manteniendo las preocupaciones base (almacenamiento, identidad, integridad referencial) separadas de la lógica específica del dominio para que los módulos personalizados puedan extenderlas.
- Pruebas: Los flujos centrales de crear, editar, eliminar y buscar estarán cubiertos por pruebas automatizadas antes de completar.
- Experiencia de Usuario: La interfaz proporcionará mensajes de validación claros, estados vacíos y comportamiento de formulario consistente, presentados dentro de un marco de espacio de trabajo ERP con marca (barra superior + barra lateral) que se ve y se comporta idénticamente en todas las pantallas.
- Rendimiento: La búsqueda y el renderizado de listas se optimizarán para colecciones de hasta 500 registros usando actualizaciones ligeras del DOM.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/001-erp-base-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Código Fuente (raíz del repositorio)

```text
src/
├── main.js
├── styles.css
├── storage.js
├── app.js
├── module-config.js
└── components/
    ├── shell.js        (marco del espacio de trabajo: barra superior, logotipo SVG, barra lateral, estado de módulo activo)
    ├── dashboard.js    (vista de inicio: cuadrícula de acciones rápidas + tarjetas de estadísticas en vivo)
    ├── entity-form.js  (formulario de creación/edición de entidades con campos personalizados)
    └── document-form.js (formulario de creación/edición de documentos con campos personalizados y ciclo de vida de estados)

tests/
├── unit/
├── integration/
└── setup/
```

**Decisión de Estructura**: Una aplicación Vite simple con un único punto de entrada HTML, un pequeño conjunto de módulos JavaScript y CSS en un archivo separado. Se usará localStorage para la persistencia de modo que la aplicación permanezca ligera y autónoma. Los componentes se dividen en pares de entidad (datos maestros) y documento (transaccional) que reflejan los dos conceptos centrales del módulo base, de modo que un módulo personalizado pueda renombrar o extender cada par de forma independiente. `shell.js` posee el marco del espacio de trabajo ERP — un logotipo monograma SVG en línea derivado del nombre del módulo, la barra superior y la barra lateral de módulos — envolviendo todas las vistas para que la marca y la navegación permanezcan consistentes sin duplicar marcado. `dashboard.js` renderiza los botones de acción rápida y las tarjetas de estadísticas de la pantalla de entrada, leyendo los recuentos del almacenamiento cada vez que se vuelve visible. `module-config.js` centraliza todos los puntos de adaptación — nombre del módulo, etiquetas de términos, definiciones de campos personalizados, ciclo de vida de estados y color de acento — manteniendo la personalización del dominio fuera del código central; el estilo se controla mediante propiedades personalizadas de CSS (tokens de diseño) en `styles.css` para que el color de acento configurado se aplique globalmente.

## Seguimiento de Complejidad

Este plan no introdujo violaciones de la constitución.

# Plan de Implementación: Módulo de Compras y Adquisiciones ERP

**Rama**: `002-erp-purchasing-module` | **Fecha**: 2026-10-20 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-erp-purchasing-module/spec.md` y diagrama de modelo relacional (`PROVEEDOR`, `ORDEN_COMPRA`, `DETALLE_COMPRA`, `PRODUCTO`, `CATEGORIA`, `EMPLEADO`).

## Resumen

Construir una aplicación web ligera adaptada al **Módulo de Compras y Adquisiciones** sobre la base de la arquitectura ERP ligera desarrollada con Vite, HTML, CSS y JavaScript vanilla. El módulo permite gestionar el ciclo completo de aprovisionamiento de la empresa mediante dos pilares de información: la **gestión de datos maestros de Proveedores** (Entidad) y la **emisión/seguimiento de Órdenes de Compra** (Documento Transaccional con sus detalles de productos). La interfaz se presenta en un espacio de trabajo ERP unificado con barra superior de marca (`Compras & Adquisiciones`), barra lateral de navegación persistente y un panel/dashboard principal de entrada que ofrece métricas clave en tiempo real (monto total de compras del mes, órdenes pendientes de recepción, proveedores activos, stock crítico) y botones de acción rápida para registrar proveedores, emitir órdenes de compra y consultar el historial. La adaptación del dominio se realiza a través de la configuración centralizada (`src/module-config.js`), personalizando campos (RUT, teléfono, dirección, productos, costo unitario, empleado emisor), ciclo de vida del documento (`Borrador` -> `Emitida` -> `Recibida` -> `Anulada`) y un color de acento azul índigo institucional, preservando la arquitectura base sin alterar la lógica de persistencia local.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, sin framework de interfaz pesado  
**Almacenamiento**: `localStorage` del navegador para la persistencia del módulo de compras  
**Pruebas**: Vitest con `jsdom` para pruebas unitarias y de integración de flujos de compra  
**Plataforma Objetivo**: Navegadores modernos de escritorio y dispositivos móviles  
**Tipo de Proyecto**: Aplicación web SPA  
**Objetivos de Rendimiento**: Interacciones responsivas para listas de hasta 500 registros (proveedores y órdenes de compra); las búsquedas por RUT, proveedor o folio de orden deben ser instantáneas  
**Restricciones**: Huella mínima de librerías, despliegue simple, sin backend requerido; mantener la integridad referencial básica entre Proveedores, Productos y Órdenes de Compra  
**Escala/Alcance**: Módulo de Compras con CRUD de Datos Maestros (Proveedores), Gestión de Documentos Transaccionales (Órdenes de Compra y Detalle de Compra), cálculo de totales y estados de ciclo de vida

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

- **Calidad**: La implementación mantendrá una arquitectura JavaScript modular donde la capa de almacenamiento (`storage.js`) gestionará de forma desacoplada las entidades relacionales del módulo de compras (`PROVEEDOR`, `ORDEN_COMPRA`, `DETALLE_COMPRA`, `PRODUCTO`), asegurando la validez del RUT y la integridad de las llaves foráneas antes de guardar.
- **Pruebas**: Cobertura de pruebas automatizadas para la creación/edición de Proveedores, la emisión de Órdenes de Compra con cálculo correcto de totales (`cantidad` x `costo_unitario`), cambios de estado del ciclo de vida y filtrado/búsqueda por folios o RUT.
- **Experiencia de Usuario**: Interfaz intuitiva con formularios estructurados, validaciones claras para campos obligatorios (RUT, Proveedor, Producto), retroalimentación visual de cambios de estado de la orden y un marco visual coherente con el estilo ERP (barra superior, logotipo de compras y barra lateral activa).
- **Rendimiento**: Renderizado eficiente del DOM para listados de compras y actualización inmediata de los indicadores del panel de control al registrar nuevas transacciones.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-erp-purchasing-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
src/
├── main.js
├── styles.css
├── storage.js
├── app.js
├── module-config.js
└── components/
    ├── shell.js           (marco del espacio de trabajo: barra superior, logotipo SVG de Compras, barra lateral)
    ├── dashboard.js       (panel de entrada: acciones rápidas de compras + tarjetas de métricas en vivo)
    ├── entity-form.js     (formulario maestro de Proveedores con campos personalizados: RUT, email, teléfono, dirección)
    ├── document-form.js   (formulario de Orden de Compra: selección de Proveedor, Empleado, ítems de Detalle_Compra con cálculo de total)
    ├── product-form.js    (formulario secundario para catálogo de Productos y Categorías)
    └── order-list.js      (vista de consulta y seguimiento de Órdenes de Compra y estados)

tests/
├── unit/
│   ├── supplier.test.js
│   ├── purchase-order.test.js
│   └── storage.test.js
├── integration/
│   └── purchasing-flow.test.js
└── setup/
