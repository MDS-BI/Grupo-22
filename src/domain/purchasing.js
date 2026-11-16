import { validateRut } from '../storage.js';

export { validateRut };

export const normalizeRut = rut => {
  const cleaned = String(rut || '')
    .replace(/[.\s-]/g, '')
    .toUpperCase();
  return cleaned ? `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}` : '';
};

export const PURCHASING_STATUSES = ['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado'];

export const PURCHASE_TRANSITIONS = {
  borrador: ['pendiente', 'cancelado'],
  pendiente: ['aprobado', 'cancelado'],
  aprobado: ['recibido'],
  recibido: [],
  cancelado: []
};

export const PURCHASING_ERRORS = {
  ORDER_INVALID: 'La orden tiene datos inválidos; revisa los campos marcados.',
  ORDER_NOT_FOUND: 'No se encontró la orden de compra.',
  ORDER_TERMINAL: 'La orden recibida o cancelada no puede modificarse.',
  NO_LINES: 'Debes agregar al menos una línea de detalle.',
  LINE_INVALID: 'La línea tiene datos inválidos; revisa producto, cantidad y precio.',
  LINE_NOT_FOUND: 'No se encontró la línea de detalle.',
  PRODUCT_NOT_FOUND: 'El producto seleccionado ya no existe.',
  PRODUCT_DUPLICATE: 'El producto ya está incluido en esta orden.',
  INVALID_TRANSITION: 'La acción no está permitida para el estado actual.',
  STOCK_ALREADY_APPLIED: 'La recepción de esta orden ya fue aplicada.',
  PERSISTENCE_ERROR: 'No fue posible guardar los cambios; se restauró el estado anterior.',
  SUPPLIER_ORIGIN_INVALID: 'El origen del proveedor debe ser Nacional o Extranjero.',
  CURRENCY_INVALID: 'La moneda no es válida para el origen del proveedor.',
  PAYMENT_TERMS_INVALID: 'La condición de pago debe ser una de: Contado, 30 días, 60 días, 90 días.',
  DATE_FORMAT_INVALID: 'La fecha debe tener formato dd-mm-aaaa y ser una fecha válida.',
  PRODUCT_NOT_IN_PRICE_LIST: 'El producto no está en la lista de precios del proveedor seleccionado.',
  PRICE_CURRENCY_MISMATCH: 'El precio acordado con el proveedor está en otra moneda; cambia la moneda de la orden.',
  AREA_REQUIRED: 'Debes seleccionar el área o centro de costo de la solicitud.',
  AREA_NOT_FOUND: 'El área seleccionada no existe o está inactiva.',
  SUPPLIER_INACTIVE: 'El proveedor está inactivo; reactívalo para crear nuevas solicitudes.',
  BUDGET_INVALID: 'El presupuesto debe ser un monto entero mayor o igual a cero.'
};

export const REQUEST_NUMBER_PREFIX = 'SOL-';
export const PURCHASE_ORDER_FOLIO_PREFIX = 'OC-';

function formatCorrelative(prefix, value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return '';
  return `${prefix}${String(number).padStart(4, '0')}`;
}

/** Número visible de la solicitud de compra (SOL-0001) a partir del folio correlativo interno. */
export function formatRequestNumber(folio) {
  return formatCorrelative(REQUEST_NUMBER_PREFIX, folio);
}

/** Folio visible de la Orden de Compra emitida (OC-0001); vacío mientras no se apruebe. */
export function formatPurchaseOrderFolio(ocFolio) {
  return formatCorrelative(PURCHASE_ORDER_FOLIO_PREFIX, ocFolio);
}

/** Siguiente correlativo: máximo existente + 1 (ignora valores no numéricos). */
export function nextCorrelative(values = []) {
  const max = values.reduce((acc, value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > acc ? number : acc;
  }, 0);
  return max + 1;
}

/** Opciones del filtro de estado: dos grupos por tipo de documento y un nombre específico por estado. */
export const STATUS_FILTER_OPTIONS = Object.freeze([
  { value: 'tipo:solicitud', label: 'Solicitud de compra', statuses: ['borrador', 'pendiente'] },
  { value: 'borrador', label: 'Solicitud – Borrador', statuses: ['borrador'] },
  { value: 'pendiente', label: 'Solicitud – Pendiente de aprobación', statuses: ['pendiente'] },
  { value: 'tipo:oc', label: 'Orden de Compra emitida', statuses: ['aprobado', 'recibido'] },
  { value: 'aprobado', label: 'OC emitida – Aprobada', statuses: ['aprobado'] },
  { value: 'recibido', label: 'OC – Recibida', statuses: ['recibido'] },
  { value: 'cancelado', label: 'Cancelada', statuses: ['cancelado'] }
]);

export function statusesForFilter(value) {
  const key = String(value ?? '').trim();
  if (!key) return [];
  const option = STATUS_FILTER_OPTIONS.find(item => item.value === key);
  return option ? [...option.statuses] : [key];
}

export function statusFilterLabel(value) {
  const key = String(value ?? '').trim();
  return STATUS_FILTER_OPTIONS.find(item => item.value === key)?.label || key;
}

export const ACTION_LABELS = {
  pendiente: 'Enviar a revisión',
  cancelado: 'Cancelar',
  aprobado: 'Aprobar',
  recibido: 'Marcar recibida'
};

export const PAYMENT_TERMS = ['Contado', '30 días', '60 días', '90 días'];

export const SUPPLIER_ORIGINS = ['Nacional', 'Extranjero'];

export const SUPPLIER_ORIGIN_RULES = {
  Nacional: { currencies: ['CLP'], currency: 'CLP', taxRate: 0.19 },
  Extranjero: { currencies: ['USD', 'EUR'], currency: 'USD', taxRate: 0 }
};

export const LEGACY_PAYMENT_TERM_LABEL = 'Otra (valor anterior)';

export function isValidPaymentTerm(value) {
  return PAYMENT_TERMS.includes(String(value ?? '').trim());
}

export function paymentTermLabel(value) {
  const term = String(value ?? '').trim();
  if (!term) return '';
  return isValidPaymentTerm(term) ? term : LEGACY_PAYMENT_TERM_LABEL;
}

export function isValidSupplierOrigin(value) {
  return SUPPLIER_ORIGINS.includes(String(value ?? '').trim());
}

export function resolveSupplierOrigin(supplierOrOrigin) {
  const raw = typeof supplierOrOrigin === 'string'
    ? supplierOrOrigin
    : supplierOrOrigin?.origin;
  const origin = String(raw ?? '').trim();
  if (!origin) return 'Nacional';
  if (!isValidSupplierOrigin(origin)) throw createPurchasingError('SUPPLIER_ORIGIN_INVALID');
  return origin;
}

export function originRules(originOrSupplier) {
  return SUPPLIER_ORIGIN_RULES[resolveSupplierOrigin(originOrSupplier)];
}

export function currenciesForOrigin(originOrSupplier) {
  return [...originRules(originOrSupplier).currencies];
}

export function defaultCurrencyForOrigin(originOrSupplier) {
  return originRules(originOrSupplier).currency;
}

export function taxRateForOrigin(originOrSupplier) {
  return originRules(originOrSupplier).taxRate;
}

export function resolveCurrency(originOrSupplier, requested) {
  const rules = originRules(originOrSupplier);
  const currency = String(requested ?? '').trim().toUpperCase();
  if (!currency) return rules.currency;
  if (!rules.currencies.includes(currency)) throw createPurchasingError('CURRENCY_INVALID');
  return currency;
}

export function resolvePaymentTerms(requested, supplierTerms) {
  const requestedTerm = String(requested ?? '').trim();
  if (isValidPaymentTerm(requestedTerm)) return requestedTerm;
  const supplierTerm = String(supplierTerms ?? '').trim();
  if (isValidPaymentTerm(supplierTerm)) return supplierTerm;
  throw createPurchasingError('PAYMENT_TERMS_INVALID');
}

export function validateCreditLimitField(value) {
  if (value === undefined || value === null || value === '') return { valid: true };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { valid: false, message: 'El límite de crédito debe ser un número no negativo' };
  }
  return { valid: true };
}

export function validateSupplierTaxIdentity(input = {}, options = {}) {
  const errors = {};
  const origin = String(input.origin ?? '').trim();
  const code = String(input.code ?? '').trim();
  const foreignTaxId = String(input.foreignTaxId ?? '').trim();
  if (!origin) {
    errors.origin = 'El origen es obligatorio';
  } else if (!isValidSupplierOrigin(origin)) {
    errors.origin = 'El origen debe ser Nacional o Extranjero';
  }
  if (origin === 'Extranjero') {
    if (!foreignTaxId) errors.foreignTaxId = 'La identificación tributaria extranjera es obligatoria';
  } else if (!code) {
    errors.code = 'El RUT es obligatorio';
  } else if (typeof options.validateRut === 'function' && !options.validateRut(code)) {
    errors.code = 'El RUT no es válido según módulo 11, incluida la K';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createPurchasingError(code, message) {
  const error = new Error(message || PURCHASING_ERRORS[code] || code);
  error.code = code;
  return error;
}

export function purchasingErrorMessage(errorOrCode) {
  if (errorOrCode && typeof errorOrCode === 'object') {
    if (errorOrCode.code && PURCHASING_ERRORS[errorOrCode.code]) return PURCHASING_ERRORS[errorOrCode.code];
    return errorOrCode.message || PURCHASING_ERRORS.PERSISTENCE_ERROR;
  }
  return PURCHASING_ERRORS[errorOrCode] || String(errorOrCode || PURCHASING_ERRORS.PERSISTENCE_ERROR);
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateLineSubtotal(line = {}) {
  return roundMoney(Number(line.cantidad || 0) * Number(line.costo_unitario ?? line.unitPrice ?? 0));
}

export function calculateOrderTotals(lines = [], options = {}) {
  const taxRate = Number.isFinite(Number(options.taxRate)) ? Number(options.taxRate) : 0.19;
  const neto = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.cantidad || 0) * Number(line.costo_unitario ?? line.unitPrice ?? 0), 0)
  );
  const iva = roundMoney(neto * taxRate);
  return {
    neto,
    iva,
    total: roundMoney(neto + iva),
    subtotal: neto,
    taxAmount: iva,
    totalAmount: roundMoney(neto + iva),
    taxRate,
    currency: options.currency || ''
  };
}

const moneyFormatters = new Map();

export function formatCurrency(value, currency = 'CLP') {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  const code = String(currency || 'CLP').trim().toUpperCase();
  if (!moneyFormatters.has(code)) {
    moneyFormatters.set(code, new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'CLP' ? 0 : 2,
      minimumFractionDigits: code === 'CLP' ? 0 : 2
    }));
  }
  return moneyFormatters.get(code).format(number);
}

export function parseDateInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { valid: false };
  let iso;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match) {
    iso = raw;
  } else {
    match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
    if (!match) return { valid: false };
    iso = `${match[3]}-${match[2]}-${match[1]}`;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? { valid: true, iso } : { valid: false };
}

export function normalizeDateInput(value) {
  const parsed = parseDateInput(value);
  if (!parsed.valid) throw createPurchasingError('DATE_FORMAT_INVALID');
  return parsed.iso;
}

export function formatDateMask(value) {
  const parsed = parseDateInput(value);
  if (!parsed.valid) return String(value ?? '');
  return parsed.iso.split('-').reverse().join('-');
}

export function emissionDateFor(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function validatePurchaseOrderLine(line = {}, options = {}) {
  const errors = {};
  const productId = line.id_producto || line.productId;
  if (!productId) errors.id_producto = 'El producto es obligatorio';
  if (!Number.isInteger(Number(line.cantidad)) || Number(line.cantidad) <= 0) {
    errors.cantidad = 'La cantidad debe ser un entero positivo';
  }
  if (!Number.isFinite(Number(line.costo_unitario)) || Number(line.costo_unitario) < 0) {
    errors.costo_unitario = 'El costo unitario debe ser un número no negativo';
  }
  const existingLines = options.existingLines || [];
  const duplicate =
    line.duplicate ||
    existingLines.some(
      existing =>
        (existing.id_producto || existing.productId) === productId &&
        (!options.ignoreLine ||
          (existing.id_producto || existing.productId) !== (options.ignoreLine.id_producto || options.ignoreLine.productId))
    );
  if (duplicate) errors.id_producto = 'No se permiten dos líneas con el mismo producto';
  return { valid: Object.keys(errors).length === 0, errors };
}

export const validateLine = validatePurchaseOrderLine;

export function validatePurchaseOrderLines(lines = [], options = {}) {
  const errors = [];
  const seen = new Set();
  lines.forEach((line, index) => {
    const result = validatePurchaseOrderLine(line);
    const productId = line.id_producto || line.productId;
    if (productId && seen.has(productId)) result.errors.id_producto = 'No se permiten dos líneas con el mismo producto';
    if (productId) seen.add(productId);
    for (const [field, message] of Object.entries(result.errors)) errors.push({ index, field, message });
  });
  if (!lines.length && options.requireLines) errors.push({ index: -1, field: 'lines', message: PURCHASING_ERRORS.NO_LINES });
  return { valid: errors.length === 0, errors };
}

export function isTerminalStatus(status) {
  return status === 'recibido' || status === 'cancelado';
}

export function canTransition(current, next) {
  return current === next || Boolean(PURCHASE_TRANSITIONS[current]?.includes(next));
}

export function getAvailableActions(status) {
  return [...(PURCHASE_TRANSITIONS[status] || [])];
}

export function getAvailableActionItems(status) {
  return getAvailableActions(status).map(nextStatus => ({
    status: nextStatus,
    nextStatus,
    value: nextStatus,
    label: ACTION_LABELS[nextStatus] || nextStatus
  }));
}

export function actionLabel(nextStatus) {
  return ACTION_LABELS[nextStatus] || nextStatus;
}

export function assertTransition(current, next, options = {}) {
  if (isTerminalStatus(current)) throw createPurchasingError('INVALID_TRANSITION');
  if (current === next) return true;
  if (current === 'borrador' && next === 'pendiente' && options.hasLines === false) {
    throw createPurchasingError('NO_LINES');
  }
  if (!canTransition(current, next)) throw createPurchasingError('INVALID_TRANSITION');
  return true;
}

function uid(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createStatusChange(orderId, from, to, changedAt = new Date().toISOString()) {
  if (from === to) throw createPurchasingError('INVALID_TRANSITION');
  if (!canTransition(from, to)) throw createPurchasingError('INVALID_TRANSITION');
  return {
    id: uid('history'),
    id_orden_compra: orderId,
    from,
    to,
    changedAt
  };
}

export function planReceipt(order, lines = [], products = [], metadata = null) {
  if (metadata?.stock_aplicado) throw createPurchasingError('STOCK_ALREADY_APPLIED');
  if (!order) throw createPurchasingError('ORDER_NOT_FOUND');
  if (order.status === 'recibido') throw createPurchasingError('STOCK_ALREADY_APPLIED');
  if (order.status !== 'aprobado') throw createPurchasingError('INVALID_TRANSITION');
  if (!Array.isArray(lines) || lines.length === 0) throw createPurchasingError('NO_LINES');

  const validation = validatePurchaseOrderLines(lines);
  if (!validation.valid) throw createPurchasingError('LINE_INVALID');

  const productMap = new Map(products.map(product => [product.id_producto || product.id, product]));
  const updates = [];
  const seen = new Set();

  for (const line of lines) {
    const productId = line.id_producto || line.productId;
    if (seen.has(productId)) throw createPurchasingError('PRODUCT_DUPLICATE');
    seen.add(productId);
    const product = productMap.get(productId);
    if (!product) throw createPurchasingError('PRODUCT_NOT_FOUND');
    const stockBefore = Number(product.stock || 0);
    const quantity = Number(line.cantidad);
    updates.push({
      id_producto: productId,
      producto: product,
      cantidad: quantity,
      stock_anterior: stockBefore,
      stock_nuevo: stockBefore + quantity,
      stockBefore,
      stockAfter: stockBefore + quantity
    });
  }

  return {
    order,
    lines,
    updates,
    stockUpdates: updates,
    items: updates,
    totals: calculateOrderTotals(lines)
  };
}

export function isOverdue(order, today = new Date()) {
  if (!order?.endDate || ['recibido', 'cancelado'].includes(order.status)) return false;
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = String(order.endDate)
    .split('-')
    .map(Number);
  const delivery = new Date(year, month - 1, day);
  return delivery < localToday;
}
