# Contrato de Almacenamiento de Entidades

## Propósito

La aplicación almacena los registros de entidad localmente en el navegador usando `localStorage`.

## Forma de los Datos

Cada registro de entidad debe incluir:

- `id`: cadena única
- `entity_id`: cadena única, generada automáticamente, usada para vincular documentos
- `name`: cadena no vacía
- `code`: cadena no vacía
- `taxId`: cadena opcional (identificación fiscal)
- `email`: cadena opcional con formato de correo válido cuando está presente
- `phone`: cadena opcional
- `address`: cadena opcional
- `category`: cadena opcional; en Compras queda como legado de migración a Rubro
- `description`: cadena opcional
- `targetDate`: cadena de fecha opcional (YYYY-MM-DD) válida cuando está presente; no se usa en el Proveedor de Compras
- `creditLimit`: número opcional mayor o igual a 0
- `paymentTerms`: cadena opcional; en Compras se restringe a Contado, 30 días, 60 días o 90 días
- `rubro_ids`: arreglo opcional de identificadores de Rubro; en Compras es obligatorio con al menos un elemento
- `origin`: cadena opcional; en Compras es obligatoria y vale Nacional o Extranjero
- `foreignTaxId`: cadena opcional; obligatoria en Compras cuando `origin` es Extranjero
- `createdAt`: cadena de marca de tiempo ISO
- `updatedAt`: cadena de marca de tiempo ISO

## Operaciones

- `loadEntities()`: devuelve todas las entidades almacenadas.
- `saveEntities(entities)`: persiste la lista completa.
- `addEntity(entity)`: añade una nueva entidad.
- `updateEntity(id, updates)`: actualiza una entidad existente.
- `deleteEntity(id)`: elimina una entidad por id.

## Almacenamiento de Rubros (extensión de Compras)

Cada registro de Rubro se persiste en `erp_purchasing:rubros` e incluye:

- `id_rubro`: cadena única generada automáticamente
- `nombre`: cadena no vacía y única sin distinguir mayúsculas
- `createdAt`: cadena de marca de tiempo ISO
- `updatedAt`: cadena de marca de tiempo ISO

Operaciones:

- `loadRubros()`: devuelve todos los Rubros almacenados.
- `saveRubros(rubros)`: persiste la lista completa.
- `addRubro(rubro)`: añade un Rubro y rechaza nombres duplicados sin distinguir mayúsculas.
- `updateRubro(id, updates)`: actualiza un Rubro existente manteniendo la unicidad del nombre.
- `deleteRubro(id)`: elimina un Rubro; se bloquea si algún Proveedor lo referencia en `rubro_ids`.
- `migrateProviderCategoriesToRubros()`: al cargar, convierte cada `category` en texto de los Proveedores en un Rubro con ese nombre, reutiliza el Rubro si ya existe y actualiza `rubro_ids`; `category` queda como legado.

## Extensiones de la instancia Compras

- El Proveedor usa `rubro_ids` como lista de identificadores de Rubro y exige al menos uno. `category` deja de usarse para nuevos Proveedores y solo se conserva para la migración.
- `origin` es obligatorio y solo admite `Nacional` o `Extranjero`.
- Para `origin = Nacional`, `code` contiene el RUT normalizado, validado por módulo 11 (incluida K) y único. Para `origin = Extranjero`, se exige `foreignTaxId` en texto y no se aplica la validación de RUT.
- `paymentTerms` solo admite Contado, 30 días, 60 días o 90 días; un valor histórico distinto se presenta como "Otra (valor anterior)" hasta que se edite.
- `creditLimit` es opcional, pero cuando se informa debe ser un número mayor o igual a 0; un negativo se rechaza con un mensaje bajo el campo.
- El formulario de Proveedor no incluye `targetDate`.
- La búsqueda de Proveedores por Rubro acepta uno o más identificadores y devuelve los Proveedores que coincidan con cualquiera de ellos, manteniendo la búsqueda por nombre y RUT y la comparación sin tildes.

## Almacenamiento de Documentos

Cada registro de documento debe incluir:

- `id`: cadena única
- `entity_id`: el entity_id autogenerado de la entidad vinculada
- `series`: cadena opcional que agrupa folios consecutivos
- `folio`: entero positivo obligatorio; junto con la serie forma el número oficial del documento
- `startDate`: cadena de fecha de calendario válida
- `endDate`: cadena de fecha de calendario válida, igual o posterior a startDate
- `quantity`: entero positivo opcional
- `subtotal`: número no negativo opcional
- `discount`: número no negativo opcional; no puede superar el subtotal
- `taxAmount`: número no negativo opcional
- `totalAmount`: número no negativo opcional
- `currency`: cadena opcional
- `paymentTerms`: cadena opcional
- `notes`: cadena opcional
- `status`: cadena opcional
- `createdAt`: cadena de marca de tiempo ISO
- `updatedAt`: cadena de marca de tiempo ISO

Operaciones:

- `loadDocuments()`: devuelve todos los documentos almacenados.
- `saveDocuments(documents)`: persiste la lista completa.
- `addDocument(document)`: añade un nuevo documento.
- `updateDocument(id, updates)`: actualiza un documento existente.
- `deleteDocument(id)`: elimina un documento por id.
- `deleteDocumentsForEntity(entityId)`: elimina todos los documentos vinculados a una entidad eliminada.

## Expectativas de Validación

- Un `name` o `code` faltante debe rechazarse antes de la persistencia.
- En Compras, un `rubro_ids` vacío o ausente debe rechazarse; cada identificador debe referenciar un Rubro existente.
- En Compras, un `origin` ausente o distinto de Nacional/Extranjero debe rechazarse. Con Origen Nacional, el RUT vacío o inválido por módulo 11 debe rechazarse; con Origen Extranjero, un `foreignTaxId` vacío debe rechazarse.
- En Compras, un `paymentTerms` fuera de Contado, 30 días, 60 días o 90 días debe rechazarse al editar; los valores históricos se muestran como "Otra (valor anterior)" hasta entonces.
- Un `email` presente debe tener formato de correo válido y un `creditLimit` presente debe ser un número mayor o igual a 0; un negativo se rechaza con un mensaje bajo el campo.
- Un documento sin `folio` entero positivo debe rechazarse; un `discount` mayor que el `subtotal` debe rechazarse.
- Un entity_id debe generarse automáticamente y debe ser único.
- Un documento sin un `entity_id` que coincida con una entidad existente debe rechazarse.
- Eliminar una entidad también debe eliminar todos los documentos vinculados a su entity_id.
- Las operaciones de almacenamiento deben preservar el orden actual de la lista y actualizar las marcas de tiempo.

## Expectativas de Extensibilidad

- Los campos adicionales añadidos por módulos personalizados deben persistirse junto a los campos base sin manejo especial en la capa de almacenamiento.
- Las extensiones de Compras (`rubro_ids`, `origin` y `foreignTaxId`) se persisten junto a los campos base sin alterar la semántica de `category` para otros módulos.
- Las operaciones base anteriores permanecen estables para que los módulos personalizados puedan construir sobre ellas sin modificación.
