# Checklist de Requisitos: Extensión de Órdenes de Compra con Detalle, Flujo, Recepción e Impresión

**Propósito**: Verificar que la especificación de la extensión sea completa, clara, testeable y esté lista para planificación, sin ambigüedades críticas ni detalles de implementación innecesarios.
**Creada**: 2026-11-07
**Feature**: [spec.md](../spec.md)

## Completitud de requisitos

- [x] CHK001 Las cinco capacidades solicitadas están cubiertas: líneas de detalle, totales, flujo de estados, recepción con stock, historial e impresión.
- [x] CHK002 Cada historia de usuario tiene prioridad, valor explicado, prueba independiente y escenarios de aceptación.
- [x] CHK003 Los requisitos funcionales cubren alta, edición y eliminación de líneas.
- [x] CHK004 Los requisitos funcionales cubren subtotal, neto, IVA del 19 % y total.
- [x] CHK005 Los requisitos funcionales cubren todas las transiciones válidas y el rechazo de las inválidas.
- [x] CHK006 Los requisitos funcionales cubren la actualización única de stock y la protección contra doble recepción.
- [x] CHK007 Los requisitos funcionales cubren el historial con estado anterior, estado nuevo y fecha/hora.
- [x] CHK008 Los requisitos funcionales cubren la vista imprimible y su contenido mínimo.
- [x] CHK009 La persistencia local y la ausencia de roles reales están declaradas explícitamente.

## Claridad y testabilidad

- [x] CHK010 No quedan marcadores `[NEEDS CLARIFICATION]` en la especificación.
- [x] CHK011 Los escenarios usan estructura Dado/Cuando/Entonces y describen resultados observables.
- [x] CHK012 Los términos ambiguos como "correcto", "válido" o "claro" están acotados por reglas concretas o criterios medibles.
- [x] CHK013 Las reglas de cantidad entera positiva, precio no negativo y producto no repetido son verificables.
- [x] CHK014 La regla de recepción completa o nula evita resultados parciales ambiguos.
- [x] CHK015 La obligación de registrar solo transiciones exitosas en el historial es verificable.
- [x] CHK016 La regla de edición bloqueada para órdenes recibidas o canceladas es explícita.

## Criterios de éxito

- [x] CHK017 Todos los criterios de éxito son medibles y verificables.
- [x] CHK018 Los criterios de éxito cubren totales, flujo, stock, historial, impresión y persistencia.
- [x] CHK019 Los criterios de éxito evitan detalles de implementación y pueden validarse desde la experiencia del usuario.
- [x] CHK020 Existe un criterio de éxito para garantizar que una operación fallida no deje cambios parciales.

## Entidades y datos

- [x] CHK021 Las entidades clave y sus atributos funcionales están identificados.
- [x] CHK022 Las relaciones entre orden, detalle, producto, proveedor e historial están declaradas.
- [x] CHK023 La naturaleza derivada del subtotal y la inmutabilidad manual del historial están especificadas.
- [x] CHK024 La eliminación de una orden y su efecto sobre líneas e historial están definidos.

## Alcance y supuestos

- [x] CHK025 Los supuestos sobre catálogo de productos, bodega única y recepción completa están documentados.
- [x] CHK026 El tratamiento del IVA, la moneda y el redondeo está documentado.
- [x] CHK027 La ausencia de autenticación, roles y registro de actor está documentada.
- [x] CHK028 La dependencia del módulo de Compras existente y de sus datos maestros está documentada.
- [x] CHK029 La impresión nativa del navegador y la exclusión de PDF del servidor están documentadas.
- [x] CHK030 La persistencia local en `localStorage` y la ausencia de sincronización entre usuarios están documentadas.

## Preparación para planificación

- [x] CHK031 Las historias de usuario pueden implementarse y probarse de forma independiente.
- [x] CHK032 Los requisitos no contradicen la especificación base del módulo de Compras.
- [x] CHK033 Los requisitos no imponen frameworks, librerías ni estructuras de código.
- [x] CHK034 El alcance excluye explícitamente recepciones parciales, múltiples bodegas, autenticación y roles reales.
- [x] CHK035 La especificación está lista para pasar a `/speckit.plan` sin bloques de aclaración pendientes.

## Notas

- Validación realizada el 2026-11-07: 35 de 35 ítems cumplidos.
- No fue necesario agregar aclaraciones: la descripción de entrada y el contexto del módulo de Compras permitieron resolver los vacíos con supuestos razonables.
- El historial registra únicamente transiciones de estado exitosas; la creación de la orden no se considera un cambio de estado para esta extensión.
- El commit automático posterior a la especificación es un hook opcional y no se ejecutó sin autorización explícita.
