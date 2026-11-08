# Checklist de Requisitos: Autenticación por User ID y RBAC

**Propósito**: Verificar que la especificación de autenticación y control de acceso por roles sea completa, clara, testeable y consistente con los módulos `001` y `002`, sin ambigüedades críticas ni detalles de implementación innecesarios.
**Creada**: 2026-11-08
**Feature**: [spec.md](../spec.md)

## Completitud de requisitos

- [x] CHK001 El inicio de sesión por User ID está cubierto, incluidos normalización, usuario desconocido e inactivo.
- [x] CHK002 La persistencia del directorio y de la sesión está declarada con sus claves propias.
- [x] CHK003 La restauración de sesión entre recargas y el cierre de sesión están cubiertos.
- [x] CHK004 Los cinco roles y sus alcances están definidos.
- [x] CHK005 La matriz de permisos cubre panel, proveedores, órdenes, productos, búsqueda, impresión y transiciones.
- [x] CHK006 Las historias de usuario tienen prioridad, valor explicado, prueba independiente y escenarios de aceptación.
- [x] CHK007 Los requisitos cubren navegación, botones, formularios, acciones de fila, impresión y edición de líneas.
- [x] CHK008 Los requisitos cubren el catálogo de productos en modo solo lectura.
- [x] CHK009 Los requisitos cubren el filtrado de transiciones por permiso del estado destino.
- [x] CHK010 La defensa de acciones en los manejadores está declarada además del ocultamiento visual.
- [x] CHK011 La compatibilidad con las pruebas y los módulos existentes está declarada.

## Claridad y testabilidad

- [x] CHK012 No quedan marcadores `[NEEDS CLARIFICATION]` en la especificación.
- [x] CHK013 Los escenarios usan estructura Dado/Cuando/Entonces y describen resultados observables.
- [x] CHK014 Los términos "sesión activa", "usuario activo" y "rol permitido" están acotados por reglas concretas.
- [x] CHK015 La normalización del User ID es verificable.
- [x] CHK016 La re-resolución del rol al leer la sesión es verificable.
- [x] CHK017 La diferencia entre `boot()` e `initApp()` sin sesión está explícita.
- [x] CHK018 La matriz de permisos permite verificar cada rol sin ambigüedad.
- [x] CHK019 El mensaje uniforme de permisos está especificado.
- [x] CHK020 La invalidación de sesión por usuario eliminado o inactivo es verificable.

## Criterios de éxito

- [x] CHK021 Todos los criterios de éxito son medibles y verificables.
- [x] CHK022 Los criterios cubren acceso, sesión, permisos, transiciones y rechazo de operaciones no autorizadas.
- [x] CHK023 Los criterios evitan detalles de implementación y pueden validarse desde la experiencia del usuario.
- [x] CHK024 Existe un criterio de éxito para la suite completa, el build y el lint.

## Entidades y datos

- [x] CHK025 Las entidades Usuario y Sesión y sus atributos funcionales están identificados.
- [x] CHK026 Los conceptos Rol y Permiso están definidos como derivados y con claves estables.
- [x] CHK027 Las relaciones usuario-rol, rol-permiso, usuario-sesión y transición-permiso están declaradas.
- [x] CHK028 Las claves `erp_auth:users` y `erp_auth:session` están separadas de las claves de negocio.
- [x] CHK029 La siembra de usuarios de demostración y la degradación de roles desconocidos están especificadas.
- [x] CHK030 La eliminación de sesión y la invalidación por usuario inactivo están definidas.

## Alcance y supuestos

- [x] CHK031 La autenticación se declara como local y de demostración, sin contraseñas ni proveedor de identidad.
- [x] CHK032 La ausencia de administración visual de usuarios está documentada como fuera de alcance.
- [x] CHK033 La limitación de seguridad del RBAC en el cliente está documentada.
- [x] CHK034 La persistencia en `localStorage` y la ausencia de sincronización entre pestañas o usuarios están documentadas.
- [x] CHK035 La no modificación de las claves y reglas de `001` y `002` está declarada.
- [x] CHK036 La interfaz en español y las convenciones visuales existentes están declaradas.
- [x] CHK037 La accesibilidad de la pantalla de acceso está considerada.

## Preparación para planificación

- [x] CHK038 Las historias de usuario pueden implementarse y probarse de forma independiente.
- [x] CHK039 Los requisitos no contradicen las especificaciones `001` ni `002`.
- [x] CHK040 Los requisitos no imponen frameworks, librerías ni estructuras de código.
- [x] CHK041 El alcance excluye explícitamente contraseñas, tokens, segundo factor, OIDC y autorización del servidor.
- [x] CHK042 La especificación está lista para pasar a `/speckit.plan` sin bloques de aclaración pendientes.
- [x] CHK043 Las tareas de `tasks.md` referencian rutas reales del repositorio.

## Notas

- Validación realizada el 2026-11-08: 43 de 43 ítems cumplidos.
- No fue necesario agregar aclaraciones: la descripción de entrada, el código implementado y el contexto de los módulos `001` y `002` permitieron resolver los vacíos con supuestos razonables.
- La autenticación por User ID es una identificación local de demostración, no una credencial secreta; esta limitación se repite en spec, plan, contrato y README para evitar interpretaciones erróneas.
- El comportamiento permisivo de `initApp()` sin sesión es intencional y está documentado como mecanismo de compatibilidad; el flujo de producción usa `boot()`.
- El commit automático posterior a la especificación es un hook opcional y no se ejecutó sin autorización explícita.
