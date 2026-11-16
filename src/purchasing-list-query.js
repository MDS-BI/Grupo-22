import { statusesForFilter } from './domain/purchasing.js';
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function text(value) {
  return String(value ?? '').trim();
}

function normalizeDate(value) {
  const raw = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? raw : '';
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function validateDateRange(from, to) {
  const start = normalizeDate(from);
  const end = normalizeDate(to);
  if (!start || !end) return { valid: true, message: '' };
  if (start > end) {
    return { valid: false, message: 'La fecha desde no puede ser posterior a la fecha hasta.' };
  }
  return { valid: true, message: '' };
}

export function filterEntities(entities, filters = {}, context = {}) {
  const terms = Array.isArray(filters) ? [] : entities;
  const rubroIds = (filters.rubros || filters.rubroIds || []).map(String).filter(Boolean);
  const origin = text(filters.origin);
  const query = text(filters.query).toLowerCase();
  const rubros = context.rubros || [];
  return terms.filter(entity => {
    if (origin && text(entity.origin || 'Nacional') !== origin) return false;
    if (rubroIds.length) {
      const entityRubros = (entity.rubro_ids || []).map(String);
      if (!rubroIds.some(id => entityRubros.includes(id))) return false;
    }
    if (query) {
      const rubroNames = (entity.rubro_ids || [])
        .map(id => rubros.find(rubro => String(rubro.id_rubro || rubro.id) === String(id)))
        .filter(Boolean)
        .map(rubro => rubro.nombre || rubro.name || '')
        .join(' ');
      const haystack = `${entity.name || ''} ${entity.code || ''} ${entity.email || ''} ${rubroNames}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function filterOrders(orders, filters = {}, context = {}) {
  const { valid } = validateDateRange(filters.from, filters.to);
  if (!valid) return [];
  const status = text(filters.status);
  const entityId = text(filters.entityId);
  const from = normalizeDate(filters.from);
  const to = normalizeDate(filters.to);
  const mineOnly = Boolean(filters.mineOnly);
  const ownEmployeeId = text(filters.ownEmployeeId || context.ownEmployeeId);
  const today = context.today || new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return orders.filter(order => {
    if (status && !statusesForFilter(status).includes(order.status)) return false;
    if (entityId && order.entity_id !== entityId) return false;
    if (mineOnly && (!ownEmployeeId || text(order.id_empleado) !== ownEmployeeId)) return false;
    const delivery = normalizeDate(order.endDate);
    if (from && (!delivery || delivery < from)) return false;
    if (to && (!delivery || delivery > to)) return false;
    if (filters.overdueOnly) {
      if (!delivery || ['recibido', 'cancelado'].includes(order.status)) return false;
      if (delivery >= todayKey) return false;
    }
    return true;
  });
}

export function filterProducts(products, filters = {}) {
  const categoryId = text(filters.categoryId || filters.id_categoria);
  const query = text(filters.query).toLowerCase();
  return products.filter(product => {
    if (categoryId && String(product.id_categoria) !== categoryId) return false;
    if (query && !`${product.nombre || product.name || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function valueFor(row, key, accessors) {
  if (accessors && typeof accessors[key] === 'function') return accessors[key](row);
  return row?.[key];
}

function compareValues(left, right) {
  if (typeof left === 'number' || typeof right === 'number') {
    return numericValue(left) - numericValue(right);
  }
  const leftText = text(left);
  const rightText = text(right);
  if (/^\d{4}-\d{2}-\d{2}$/.test(leftText) && /^\d{4}-\d{2}-\d{2}$/.test(rightText)) {
    return leftText.localeCompare(rightText);
  }
  return collator.compare(leftText, rightText);
}

export function sortRows(rows, sort = {}, accessors = {}) {
  const key = sort?.key;
  if (!key) return rows.slice();
  const direction = sort.direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareValues(valueFor(left.row, key, accessors), valueFor(right.row, key, accessors));
      if (comparison !== 0) return comparison * direction;
      return left.index - right.index;
    })
    .map(entry => entry.row);
}

export function buildOrderRows(orders, context = {}) {
  const entityNames = context.entityNames || new Map();
  const employeeNames = context.employeeNames || new Map();
  const totals = context.totals || new Map();
  return orders.map(order => ({
    ...order,
    entityName: entityNames.get(order.entity_id) || '',
    employeeName: employeeNames.get(order.id_empleado) || '',
    total: totals.get(order.id) ?? order.totalAmount ?? 0
  }));
}

export function hasActiveFilters(filters = {}) {
  return Object.entries(filters).some(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return text(value) !== '';
  });
}
