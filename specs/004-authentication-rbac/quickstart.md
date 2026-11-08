# Quickstart de Validación: Autenticación por User ID y RBAC

**Rama**: `004-authentication-rbac`
**Fecha**: 2026-11-08
**Especificación**: [spec.md](spec.md)
**Modelo de datos**: [data-model.md](data-model.md)
**Contratos**: [contracts/auth-rbac.md](contracts/auth-rbac.md)

## Prerrequisitos

- Node.js y npm instalados.
- Dependencias del proyecto instaladas.
- Navegador moderno con soporte de `localStorage`.
- Datos de demostración del módulo de Compras para validar acciones de orden (proveedor, empleado, categoría y productos).

## Preparación

```powershell
npm install
npm run dev
```

Abrir la URL que entrega Vite, normalmente `http://localhost:5173`.

## Validación Automatizada

```powershell
npm test -- --run
npm run build
npm run lint
```

**Resultado esperado**: todas las pruebas pasan, el build termina sin errores y `npm run lint` no reporta errores.

Cobertura mínima esperada:

- Unitarias: siembra del directorio, login por User ID, normalización, rechazo de usuarios inválidos o inactivos, cierre de sesión y re-resolución de rol.
- Unitarias: permisos por rol y mapeo de estados destino a permisos.
- Integración: puerta de acceso, error de acceso, restauración de sesión, cierre de sesión y despliegue de interfaz por rol.
- Integración: compatibilidad de las pruebas existentes que inicializan la aplicación sin sesión.

## Usuarios de Demostración

| User ID | Nombre | Rol |
|---|---|---|
| `ADMIN-001` | Valentina Ríos | Administrador |
| `GER-001` | Martín Soto | Gerente de Compras |
| `COMP-001` | Camila Vega | Comprador |
| `BOD-001` | Diego Fuentes | Bodeguero |
| `CONS-001` | Ana Pérez | Consulta |

## Escenarios Manuales

### 1. Acceder con User ID y conservar la sesión

1. Abrir la aplicación sin sesión previa.
2. Verificar que se muestra la pantalla de acceso y que la aplicación no es visible.
3. Ingresar `comp-001` en minúsculas.
4. Confirmar el formulario.
5. Verificar que la aplicación se muestra, que la barra superior indica "Camila Vega — COMP-001" y el rol "Comprador".
6. Recargar la página.

**Resultado esperado**: la sesión se restaura y no se vuelve a pedir el User ID.

### 2. Validar errores de acceso

1. Cerrar sesión si hay una activa.
2. Enviar el formulario con el campo vacío.
3. Ingresar `NO-EXISTE` y confirmar.
4. Ingresar `CONS-001`, desactivar ese usuario en el directorio local y volver a intentar.

**Resultado esperado**:

- Campo vacío: mensaje que solicita el User ID.
- Usuario desconocido: mensaje "El User ID no está registrado en el sistema."
- Usuario inactivo: mensaje que indica que el usuario está inactivo.
- La pantalla de acceso permanece visible en todos los casos.

### 3. Validar el rol Administrador

1. Ingresar con `ADMIN-001`.
2. Recorrer la navegación y las vistas de panel, proveedores, órdenes, productos y búsqueda.
3. Abrir una orden aprobada.

**Resultado esperado**: todas las vistas y acciones están disponibles, incluidas aprobar, recibir, cancelar, imprimir y gestionar productos.

### 4. Validar el rol Gerente de Compras

1. Ingresar con `GER-001`.
2. Verificar la navegación y los formularios de proveedor, orden y producto.
3. Abrir una orden pendiente y una aprobada.

**Resultado esperado**: puede aprobar, recibir y cancelar; gestiona proveedores, órdenes y productos; la interfaz es equivalente a la del administrador salvo por los permisos no diferenciados.

### 5. Validar el rol Comprador

1. Ingresar con `COMP-001`.
2. Verificar que puede crear y editar proveedores y órdenes.
3. Abrir una orden en borrador, enviarla a revisión y cancelar otra.
4. Abrir una orden pendiente y una aprobada.
5. Abrir el catálogo de productos.

**Resultado esperado**:

- Puede enviar a revisión y cancelar.
- No ve botones de aprobación ni de recepción.
- Puede imprimir órdenes.
- El catálogo no muestra formulario ni acciones de producto.

### 6. Validar el rol Bodeguero

1. Ingresar con `BOD-001`.
2. Verificar que la navegación no incluye proveedores.
3. Verificar que no se muestran los formularios de proveedor ni de orden.
4. Abrir una orden aprobada.
5. Abrir el catálogo de productos y crear o editar un producto.

**Resultado esperado**:

- Solo ve panel, órdenes, productos, búsqueda e impresión.
- Puede marcar la orden como recibida.
- No puede crear, editar ni eliminar órdenes ni proveedores.
- Puede gestionar productos y stock.

### 7. Validar el rol Consulta

1. Ingresar con `CONS-001`.
2. Recorrer proveedores, órdenes y productos.
3. Abrir el detalle de una orden.

**Resultado esperado**:

- No hay formularios de proveedor ni de orden.
- No hay acciones de edición ni eliminación en las tablas.
- El catálogo está en modo solo lectura.
- Puede consultar e imprimir órdenes.

### 8. Validar el cierre de sesión y el cambio de usuario

1. Con una sesión activa, pulsar "Cerrar sesión".
2. Verificar que vuelve la pantalla de acceso.
3. Recargar y comprobar que sigue sin sesión.
4. Ingresar con otro User ID, por ejemplo `BOD-001`.

**Resultado esperado**: la sesión anterior se elimina, la aplicación se oculta hasta el nuevo ingreso y la interfaz se despliega con los permisos del nuevo rol.

### 9. Validar la re-resolución del rol

1. Ingresar con `COMP-001`.
2. Modificar el rol de `COMP-001` a `gerente` en `erp_auth:users` y recargar.
3. Verificar que la barra superior muestra "Gerente de Compras" y que aparecen las acciones de aprobación.
4. Restaurar el rol a `comprador` o borrar `erp_auth:users` para volver a los usuarios de demostración.

**Resultado esperado**: el rol vigente se resuelve desde el directorio en cada lectura de sesión.

### 10. Validar la defensa de acciones

1. Ingresar con `CONS-001`.
2. Desde la consola del navegador, invocar una función de alta o edición de proveedor o una transición de orden, o forzar la ejecución de un manejador no autorizado.
3. Repetir con `COMP-001` intentando aprobar o recibir una orden.

**Resultado esperado**: la operación se rechaza, se muestra "No tienes permisos para ejecutar esta acción." y no se modifica ningún dato.

### 11. Validar la compatibilidad con los módulos base

1. Ejecutar la suite completa sin iniciar sesión en las pruebas de integración existentes.
2. Comprobar que las pruebas de `001` y `002` siguen pasando.
3. Verificar que las claves `erp_base_module:*` y `erp_purchasing:*` no cambian de esquema.

**Resultado esperado**: no hay regresiones y los datos de negocio se conservan.

## Criterios de Aceptación de la Validación

- Un User ID registrado y activo abre la aplicación con nombre y rol correctos.
- Un User ID vacío, desconocido o inactivo mantiene la pantalla de acceso con un mensaje claro.
- La sesión se conserva entre recargas y se elimina al cerrar sesión.
- Las vistas y acciones visibles coinciden con la matriz de permisos de cada rol.
- Las transiciones de estado ofrecidas corresponden al ciclo de vida y al permiso del rol.
- Las operaciones no autorizadas se rechazan sin modificar datos.
- El catálogo de productos respeta el permiso de gestión.
- Los módulos `001` y `002` siguen funcionando y sus pruebas pasan.
- La suite de pruebas, el build y el lint finalizan correctamente.
