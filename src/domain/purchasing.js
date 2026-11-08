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
  PERSISTENCE_ERROR: 'No fue posible guardar los cambios; se restauró el estado anterior.'
};

export const ACTION_LABELS = {
  pendiente: 'Enviar a revisión',
  cancelado: 'Cancelar',
  aprobado: 'Aprobar',
  recibido: 'Marcar recibida'
};

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

export function calculateOrderTotals(lines = []) {
  const neto = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.cantidad || 0) * Number(line.costo_unitario ?? line.unitPrice ?? 0), 0)
  );
  const iva = roundMoney(neto * 0.19);
  return { neto, iva, total: roundMoney(neto + iva), subtotal: neto, taxAmount: iva, totalAmount: roundMoney(neto + iva) };
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
