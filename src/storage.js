import { getConfig, BASE_FIELDS, withArticle, withIndefiniteArticle } from './module-config.js';
import { getSession } from './auth.js';
import { sanitizeEntityPayload } from './access-policy.js';
import {
  PAYMENT_TERMS,
  isValidPaymentTerm,
  validateCreditLimitField,
  validateSupplierTaxIdentity
} from './domain/purchasing.js';

const ENTITY_KEY = 'erp_base_module:entities';
const DOCUMENT_KEY = 'erp_base_module:documents';
const RUBRO_KEY = 'erp_purchasing:rubros';
const EXTENSION_KEYS = [
  'erp_purchasing:purchase-order-lines',
  'erp_purchasing:order-metadata',
  'erp_purchasing:status-history',
  'erp_purchasing:transactions'
];

function now() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function read(key) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function write(key, records) {
  globalThis.localStorage?.setItem(key, JSON.stringify(records));
}

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeRut(value) {
  const cleaned = text(value).replace(/[.\s]/g, '').replace(/-/g, '').toUpperCase();
  if (!cleaned) return '';
  if (cleaned.length < 2) return cleaned;
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
}

export function validateRut(rut) {
  const normalized = normalizeRut(rut);
  if (!/^\d{1,8}-[\dK]$/.test(normalized)) return false;
  const [body, verifier] = normalized.split('-');
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expected === verifier;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function rubroKey(value) {
  return text(value).toLowerCase();
}

export function loadRubros() {
  return read(RUBRO_KEY);
}

export function saveRubros(rubros) {
  write(RUBRO_KEY, rubros);
}

export function findRubroByName(name) {
  const key = rubroKey(name);
  if (!key) return null;
  return loadRubros().find(rubro => rubroKey(rubro.nombre ?? rubro.name) === key) || null;
}

export function addRubro(input = {}) {
  const nombre = text(input.nombre ?? input.name);
  if (!nombre) throw new Error('El nombre del Rubro es obligatorio');
  if (findRubroByName(nombre)) throw new Error('El Rubro ya existe');
  const timestamp = now();
  const id = uid('rubro');
  const rubro = { id, id_rubro: id, nombre, createdAt: timestamp, updatedAt: timestamp };
  saveRubros([...loadRubros(), rubro]);
  return rubro;
}

export function updateRubro(id, updates = {}) {
  const rubros = loadRubros();
  const index = rubros.findIndex(rubro => (rubro.id_rubro || rubro.id) === id);
  if (index < 0) throw new Error('No se encontró el Rubro');
  const nombre = text(updates.nombre ?? updates.name ?? rubros[index].nombre);
  if (!nombre) throw new Error('El nombre del Rubro es obligatorio');
  const duplicate = rubros.some(
    (rubro, position) => position !== index && rubroKey(rubro.nombre ?? rubro.name) === rubroKey(nombre)
  );
  if (duplicate) throw new Error('El Rubro ya existe');
  rubros[index] = { ...rubros[index], nombre, updatedAt: now() };
  saveRubros(rubros);
  return rubros[index];
}

export function deleteRubro(id) {
  const rubros = loadRubros();
  const referenced = read(ENTITY_KEY).some(
    entity => Array.isArray(entity.rubro_ids) && entity.rubro_ids.map(String).includes(String(id))
  );
  if (referenced) throw new Error('No se puede eliminar un Rubro asignado a un proveedor');
  const next = rubros.filter(rubro => (rubro.id_rubro || rubro.id) !== id);
  if (next.length === rubros.length) throw new Error('No se encontró el Rubro');
  saveRubros(next);
  return true;
}

export function ensureRubro(name) {
  return findRubroByName(name) || addRubro({ nombre: name });
}

function migrateSupplierRubros(entities) {
  if (getConfig().moduleName !== 'Adquisiciones y Compras') return entities;
  const rubros = loadRubros();
  let changed = false;
  const next = entities.map(entity => {
    if (Array.isArray(entity.rubro_ids) && entity.rubro_ids.filter(Boolean).length) return entity;
    const category = text(entity.category);
    if (!category) return entity;
    let rubro = rubros.find(item => rubroKey(item.nombre ?? item.name) === rubroKey(category));
    if (!rubro) {
      const timestamp = now();
      const id = uid('rubro');
      rubro = { id, id_rubro: id, nombre: category, createdAt: timestamp, updatedAt: timestamp };
      rubros.push(rubro);
    }
    changed = true;
    return { ...entity, rubro_ids: [rubro.id_rubro || rubro.id] };
  });
  if (changed) {
    saveRubros(rubros);
    write(ENTITY_KEY, next);
  }
  return next;
}

export function loadEntities() {
  return migrateSupplierRubros(read(ENTITY_KEY));
}

export function saveEntities(entities) {
  write(ENTITY_KEY, entities);
}

export function validateEntity(input = {}) {
  const errors = {};
  const config = getConfig();
  const inPurchasing = config.moduleName === 'Adquisiciones y Compras';
  const origin = text(input.origin);
  const foreign = inPurchasing && origin === 'Extranjero';
  const name = text(input.name);
  const code = text(input.code);
  if (!name) errors.name = 'El nombre es obligatorio';
  if (!code && !foreign) errors.code = 'El código es obligatorio';
  if (input.email !== undefined && text(input.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.email))) {
    errors.email = 'El correo electrónico debe tener un formato válido';
  }
  const creditLimit = validateCreditLimitField(input.creditLimit);
  if (!creditLimit.valid) errors.creditLimit = creditLimit.message;
  if (input.targetDate !== undefined && text(input.targetDate) && !validDate(text(input.targetDate))) {
    errors.targetDate = 'La fecha debe tener formato YYYY-MM-DD y ser una fecha válida';
  }

  if (inPurchasing) {
    if (!foreign && code) {
      if (!validateRut(code)) {
        errors.code = 'El RUT no es válido según módulo 11, incluida la K';
      } else {
        const duplicate = loadEntities().some(
          entity => entity.id !== input.id && normalizeRut(entity.code) === normalizeRut(code)
        );
        if (duplicate) errors.code = 'El RUT ya existe';
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'origin')) {
      const identity = validateSupplierTaxIdentity(
        { origin, code, foreignTaxId: input.foreignTaxId },
        { validateRut }
      );
      if (identity.errors.origin) errors.origin = identity.errors.origin;
      if (foreign && identity.errors.foreignTaxId) errors.foreignTaxId = identity.errors.foreignTaxId;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'rubro_ids')) {
      const ids = Array.isArray(input.rubro_ids) ? input.rubro_ids.filter(Boolean).map(String) : [];
      const rubros = loadRubros();
      if (!ids.length) {
        errors.rubro_ids = 'Debes seleccionar al menos un Rubro';
      } else if (ids.some(id => !rubros.some(rubro => String(rubro.id_rubro || rubro.id) === id))) {
        errors.rubro_ids = 'Uno o más Rubros seleccionados no existen';
      }
    } else if (!text(input.category)) {
      errors.category = 'La categoría es obligatoria';
    }
    if (Object.prototype.hasOwnProperty.call(input, 'paymentTerms')) {
      const terms = text(input.paymentTerms);
      if (!terms) {
        errors.paymentTerms = 'La condición de pago es obligatoria';
      } else if (!isValidPaymentTerm(terms)) {
        const stored = input.id ? read(ENTITY_KEY).find(entity => entity.id === input.id) : null;
        const unchangedLegacy = stored && text(stored.paymentTerms) === terms;
        if (!unchangedLegacy) {
          errors.paymentTerms = `La condición de pago debe ser una de: ${PAYMENT_TERMS.join(', ')}`;
        }
      }
    }
  }

  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    const value = input[field.key];
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
      errors[field.key] = `${field.label} es obligatorio`;
    }
    if (field.type === 'number' && value !== undefined && value !== '' && !Number.isFinite(Number(value))) {
      errors[field.key] = `${field.label} debe ser un número`;
    }
    if (field.type === 'select' && value !== undefined && value !== '' && !field.options.includes(value)) {
      errors[field.key] = `${field.label} debe ser uno de: ${field.options.join(', ')}`;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addEntity(input) {
  input = sanitizeEntityPayload(input, { session: getSession() });
  const result = validateEntity(input);
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  const timestamp = now();
  const config = getConfig();
  const purchasing = config.moduleName === 'Adquisiciones y Compras';
  const entity = {
    id: uid('entity'),
    entity_id: uid('ent'),
    name: text(input.name),
    code: purchasing ? normalizeRut(input.code) : text(input.code),
    ...(input.email !== undefined ? { email: text(input.email) } : {}),
    ...(input.phone !== undefined ? { phone: text(input.phone) } : {}),
    ...(input.address !== undefined ? { address: text(input.address) } : {}),
    ...(input.category !== undefined ? { category: text(input.category) } : {}),
    ...(input.description !== undefined ? { description: text(input.description) } : {}),
    ...(input.targetDate !== undefined ? { targetDate: text(input.targetDate) } : {}),
    ...(input.creditLimit !== undefined && input.creditLimit !== '' ? { creditLimit: Number(input.creditLimit) } : {}),
    ...(input.paymentTerms !== undefined ? { paymentTerms: text(input.paymentTerms) } : {}),
    ...(purchasing && input.origin !== undefined ? { origin: text(input.origin) } : {}),
    ...(purchasing && input.foreignTaxId !== undefined ? { foreignTaxId: text(input.foreignTaxId) } : {}),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  let rubroIds = Array.isArray(input.rubro_ids) ? input.rubro_ids.filter(Boolean).map(String) : [];
  if (purchasing && !rubroIds.length && text(input.category)) {
    rubroIds = [ensureRubro(text(input.category)).id_rubro];
  }
  if (rubroIds.length) entity.rubro_ids = rubroIds;
  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    if (input[field.key] !== undefined) entity[field.key] = field.type === 'number' ? Number(input[field.key]) : input[field.key];
  }
  const entities = loadEntities();
  entities.push(entity);
  saveEntities(entities);
  return entity;
}

export function updateEntity(id, updates) {
  const entities = loadEntities();
  const index = entities.findIndex(entity => entity.id === id);
  if (index < 0) throw new Error(`No se encontr� ${withArticle(getConfig().labels.entity)}`);
  updates = sanitizeEntityPayload(updates, { session: getSession(), existing: entities[index] });
  const next = { ...entities[index], ...updates, id: entities[index].id, entity_id: entities[index].entity_id, updatedAt: now() };
  const config = getConfig();
  const allowed = new Set([...BASE_FIELDS.entity, ...config.customFields.filter(field => field.target === 'entity').map(field => field.key)]);
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) delete next[key];
  }
  next.name = text(next.name);
  const purchasing = config.moduleName === 'Adquisiciones y Compras';
  next.code = purchasing ? normalizeRut(next.code) : text(next.code);
  if (next.category !== undefined) next.category = text(next.category);
  if (next.origin !== undefined) next.origin = text(next.origin);
  if (next.foreignTaxId !== undefined) next.foreignTaxId = text(next.foreignTaxId);
  if (next.paymentTerms !== undefined) next.paymentTerms = text(next.paymentTerms);
  if (Array.isArray(next.rubro_ids)) next.rubro_ids = next.rubro_ids.filter(Boolean).map(String);
  if (purchasing && (!Array.isArray(next.rubro_ids) || !next.rubro_ids.length) && text(next.category)) {
    next.rubro_ids = [ensureRubro(text(next.category)).id_rubro];
  }
  if (Array.isArray(next.rubro_ids) && !next.rubro_ids.length) delete next.rubro_ids;
  const result = validateEntity({ ...next, id });
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  if (next.creditLimit !== undefined && next.creditLimit !== '') next.creditLimit = Number(next.creditLimit);
  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    if (next[field.key] !== undefined && next[field.key] !== '' && field.type === 'number') next[field.key] = Number(next[field.key]);
  }
  entities[index] = next;
  saveEntities(entities);
  return next;
}

export function deleteEntity(id) {
  const entities = loadEntities();
  const entity = entities.find(item => item.id === id);
  if (!entity) return false;
  saveEntities(entities.filter(item => item.id !== id));
  deleteDocumentsForEntity(entity.entity_id);
  return true;
}

export function normalizeSearchText(value) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function searchEntities(term, options = {}) {
  const query = normalizeSearchText(term);
  const selectedRubros = Array.isArray(options.rubroIds) ? options.rubroIds.filter(Boolean).map(String) : [];
  const rubros = loadRubros();
  const rubroName = id => {
    const rubro = rubros.find(item => String(item.id_rubro || item.id) === String(id));
    return rubro ? rubro.nombre || rubro.name || '' : '';
  };
  let entities = loadEntities();
  if (selectedRubros.length) {
    entities = entities.filter(
      entity => Array.isArray(entity.rubro_ids) && entity.rubro_ids.some(id => selectedRubros.includes(String(id)))
    );
  }
  if (!query) return entities;
  return entities.filter(entity => {
    const rubroNames = Array.isArray(entity.rubro_ids) ? entity.rubro_ids.map(rubroName).filter(Boolean).join(' ') : '';
    const haystack = `${Object.entries(entity).map(([key, value]) => typeof value === 'object' ? '' : `${key}:${value}`).join(' ')} ${rubroNames}`;
    return normalizeSearchText(haystack).includes(query);
  });
}

export function loadDocuments() {
  return read(DOCUMENT_KEY);
}

export function saveDocuments(documents) {
  write(DOCUMENT_KEY, documents);
}

export function validateDocument(input = {}) {
  const errors = {};
  const config = getConfig();
  const labels = config.labels;
  const entityId = input.entityId || input.entity_id;
  if (!loadEntities().some(entity => entity.entity_id === entityId)) {
    errors.entity_id = `Debe seleccionar ${withIndefiniteArticle(labels.entity)} existente`;
  }
  if (input.folio === undefined || input.folio === null || text(input.folio) === '') {
    errors.folio = 'El folio es obligatorio';
  } else {
    const folio = Number(input.folio);
    if (!Number.isInteger(folio) || folio <= 0) errors.folio = 'El folio debe ser un entero positivo';
    else if (config.moduleName === 'Adquisiciones y Compras' && loadDocuments().some(document => document.id !== input.id && Number(document.folio) === folio)) {
      errors.folio = 'El folio ya existe';
    }
  }
  const purchasing = config.moduleName === 'Adquisiciones y Compras';
  if (purchasing) {
    if (input.startDate !== undefined && text(input.startDate) && !validDate(text(input.startDate))) {
      errors.startDate = `La ${labels.startDate.toLowerCase()} debe ser una fecha válida`;
    }
  } else if (!validDate(text(input.startDate))) {
    errors.startDate = `La ${labels.startDate.toLowerCase()} debe ser una fecha válida`;
  }
  if (!validDate(text(input.endDate))) errors.endDate = `La ${labels.endDate.toLowerCase()} debe ser una fecha válida`;
  else if (validDate(text(input.startDate)) && text(input.endDate) < text(input.startDate)) errors.endDate = `La ${labels.endDate.toLowerCase()} debe ser igual o posterior a la ${labels.startDate.toLowerCase()}`;
  if (input.quantity !== undefined && input.quantity !== '' && (!Number.isInteger(Number(input.quantity)) || Number(input.quantity) <= 0)) errors.quantity = 'La cantidad debe ser un entero positivo';
  for (const key of ['subtotal', 'discount', 'taxAmount', 'totalAmount']) {
    if (input[key] !== undefined && input[key] !== '' && (!Number.isFinite(Number(input[key])) || Number(input[key]) < 0)) errors[key] = `${key} debe ser un número no negativo`;
  }
  if (input.discount !== undefined && input.subtotal !== undefined && Number(input.discount) > Number(input.subtotal)) errors.discount = 'El descuento no puede superar el subtotal';

  for (const field of config.customFields.filter(item => item.target === 'document')) {
    const value = input[field.key];
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) errors[field.key] = `${field.label} es obligatorio`;
    if (field.type === 'number' && value !== undefined && value !== '' && !Number.isFinite(Number(value))) errors[field.key] = `${field.label} debe ser un número`;
    if (field.type === 'select' && value !== undefined && value !== '' && !field.options.includes(value)) errors[field.key] = `${field.label} debe ser uno de: ${field.options.join(', ')}`;
  }
  if (config.statusLifecycle?.statuses?.length && input.status && !config.statusLifecycle.statuses.includes(input.status)) {
    errors.status = `El estado debe ser uno de: ${config.statusLifecycle.statuses.join(', ')}`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addDocument(input) {
  const result = validateDocument(input);
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  const timestamp = now();
  const document = {
    id: uid('document'),
    entity_id: input.entityId || input.entity_id,
    folio: Number(input.folio),
    startDate: text(input.startDate),
    endDate: text(input.endDate),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  for (const key of ['series', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'paymentTerms', 'notes', 'status']) {
    if (input[key] !== undefined && input[key] !== '') document[key] = key === 'quantity' || key === 'folio' ? input[key] : input[key];
  }
  if (input.paymentTerms === undefined && input.docPaymentTerms !== undefined) document.paymentTerms = input.docPaymentTerms;
  const config = getConfig();
  for (const field of config.customFields.filter(item => item.target === 'document')) {
    if (input[field.key] !== undefined) document[field.key] = field.type === 'number' ? Number(input[field.key]) : input[field.key];
  }
  for (const key of ['quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount']) {
    if (document[key] !== undefined && document[key] !== '') document[key] = Number(document[key]);
  }
  const documents = loadDocuments();
  documents.push(document);
  saveDocuments(documents);
  return document;
}

export function updateDocument(id, updates) {
  const documents = loadDocuments();
  const index = documents.findIndex(document => document.id === id);
  if (index < 0) throw new Error(`No se encontró ${withArticle(getConfig().labels.document)}`);
  const current = documents[index];
  if (['recibido', 'cancelado'].includes(current.status)) {
    const error = new Error('La orden recibida o cancelada no puede modificarse.');
    error.code = 'ORDER_TERMINAL';
    throw error;
  }
  const next = { ...current, id: current.id, entity_id: updates.entityId || updates.entity_id || current.entity_id, updatedAt: now() };
  for (const key of ['series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'paymentTerms', 'notes', 'status']) {
    if (updates[key] !== undefined) next[key] = updates[key];
  }
  if (updates.docPaymentTerms !== undefined) next.paymentTerms = updates.docPaymentTerms;
  const activeConfig = getConfig();
  for (const field of activeConfig.customFields.filter(item => item.target === 'document')) {
    if (updates[field.key] !== undefined) next[field.key] = field.type === 'number' ? Number(updates[field.key]) : updates[field.key];
  }
  delete next.entityId;
  const allowedDocumentKeys = new Set([...BASE_FIELDS.document, ...activeConfig.customFields.filter(field => field.target === 'document').map(field => field.key)]);
  for (const key of Object.keys(next)) {
    if (!allowedDocumentKeys.has(key)) delete next[key];
  }
  const config = getConfig();
  if (config.statusLifecycle && next.status !== current.status && config.statusLifecycle.transitions[current.status]?.includes(next.status) === false) {
    throw new Error('Transición de estado inválida');
  }
  const result = validateDocument(next);
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  if (next.folio !== undefined) next.folio = Number(next.folio);
  for (const key of ['quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount']) {
    if (next[key] !== undefined && next[key] !== '') next[key] = Number(next[key]);
  }
  documents[index] = next;
  saveDocuments(documents);
  return next;
}

function removeExtensionRecords(orderIds) {
  if (!orderIds.size) return;
  for (const key of EXTENSION_KEYS) {
    try {
      const value = globalThis.localStorage?.getItem(key);
      if (!value) continue;
      const records = JSON.parse(value);
      if (!Array.isArray(records)) continue;
      const filtered = records.filter(record => !orderIds.has(record.id_orden_compra));
      globalThis.localStorage?.setItem(key, JSON.stringify(filtered));
    } catch {
      // Extension records are best-effort cleanup; the base document deletion still succeeds.
    }
  }
}

export function deleteDocument(id) {
  const documents = loadDocuments();
  const target = documents.find(document => document.id === id);
  saveDocuments(documents.filter(document => document.id !== id));
  if (target) removeExtensionRecords(new Set([target.id]));
}

export function deleteDocumentsForEntity(entityId) {
  const documents = loadDocuments();
  const removed = documents.filter(document => document.entity_id === entityId);
  saveDocuments(documents.filter(document => document.entity_id !== entityId));
  removeExtensionRecords(new Set(removed.map(document => document.id)));
}

export function clearAll() {
  saveEntities([]);
  saveDocuments([]);
  saveRubros([]);
}

export { normalizeRut, uid };
