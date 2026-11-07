import { getConfig, BASE_FIELDS, withArticle, withIndefiniteArticle } from './module-config.js';

const ENTITY_KEY = 'erp_base_module:entities';
const DOCUMENT_KEY = 'erp_base_module:documents';

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

export function loadEntities() {
  return read(ENTITY_KEY);
}

export function saveEntities(entities) {
  write(ENTITY_KEY, entities);
}

export function validateEntity(input = {}) {
  const errors = {};
  const name = text(input.name);
  const code = text(input.code);
  if (!name) errors.name = 'El nombre es obligatorio';
  if (!code) errors.code = 'El código es obligatorio';
  if (input.email !== undefined && text(input.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.email))) {
    errors.email = 'El correo electrónico debe tener un formato válido';
  }
  if (input.creditLimit !== undefined && input.creditLimit !== '' && (!Number.isFinite(Number(input.creditLimit)) || Number(input.creditLimit) < 0)) {
    errors.creditLimit = 'El límite de crédito debe ser un número no negativo';
  }
  if (input.targetDate !== undefined && text(input.targetDate) && !validDate(text(input.targetDate))) {
    errors.targetDate = 'La fecha debe tener formato YYYY-MM-DD y ser una fecha válida';
  }

  const config = getConfig();
  const inPurchasing = config.moduleName === 'Adquisiciones y Compras';
  if (inPurchasing) {
    if (!validateRut(code)) errors.code = 'El RUT no es válido según módulo 11, incluida la K';
    if (!text(input.category)) errors.category = 'La categoría es obligatoria';
    if (!text(input.paymentTerms)) errors.paymentTerms = 'La condición de pago es obligatoria';
    const duplicate = loadEntities().some(entity => entity.id !== input.id && normalizeRut(entity.code) === normalizeRut(code));
    if (code && !duplicate && validateRut(code) && duplicate) errors.code = 'El RUT ya existe';
    if (duplicate) errors.code = 'El RUT ya existe';
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
  const result = validateEntity(input);
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  const timestamp = now();
  const purchasing = getConfig().moduleName === 'Adquisiciones y Compras';
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
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const config = getConfig();
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
  if (index < 0) throw new Error(`No se encontró ${withArticle(getConfig().labels.entity)}`);
  const next = { ...entities[index], ...updates, id: entities[index].id, entity_id: entities[index].entity_id, updatedAt: now() };
  const config = getConfig();
  const allowed = new Set([...BASE_FIELDS.entity, ...config.customFields.filter(field => field.target === 'entity').map(field => field.key)]);
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) delete next[key];
  }
  const result = validateEntity({ ...next, id });
  if (!result.valid) throw new Error(Object.values(result.errors).join('. '));
  next.name = text(next.name);
  next.code = getConfig().moduleName === 'Adquisiciones y Compras' ? normalizeRut(next.code) : text(next.code);
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

export function searchEntities(term) {
  const query = normalizeSearchText(term);
  if (!query) return loadEntities();
  return loadEntities().filter(entity => normalizeSearchText(
    Object.entries(entity).map(([key, value]) => typeof value === 'object' ? '' : `${key}:${value}`).join(' ')
  ).includes(query));
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
  if (!validDate(text(input.startDate))) errors.startDate = `La ${labels.startDate.toLowerCase()} debe ser una fecha válida`;
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

export function deleteDocument(id) {
  saveDocuments(loadDocuments().filter(document => document.id !== id));
}

export function deleteDocumentsForEntity(entityId) {
  saveDocuments(loadDocuments().filter(document => document.entity_id !== entityId));
}

export function clearAll() {
  saveEntities([]);
  saveDocuments([]);
}

export { normalizeRut, uid };
