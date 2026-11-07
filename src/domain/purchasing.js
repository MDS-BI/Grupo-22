import { validateRut } from '../storage.js';

export { validateRut };

export const normalizeRut = rut => {
  const cleaned = String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
  return cleaned ? `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}` : '';
};

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateOrderTotals(lines = []) {
  const neto = roundMoney(lines.reduce((sum, line) => sum + Number(line.cantidad || 0) * Number(line.costo_unitario ?? line.unitPrice ?? 0), 0));
  const iva = roundMoney(neto * 0.19);
  return { neto, iva, total: roundMoney(neto + iva) };
}

export const calculateLineSubtotal = line => roundMoney(Number(line.cantidad || 0) * Number(line.costo_unitario ?? line.unitPrice ?? 0));

export function validatePurchaseOrderLine(line = {}) {
  const errors = {};
  if (!line.id_producto) errors.id_producto = 'El producto es obligatorio';
  if (!Number.isInteger(Number(line.cantidad)) || Number(line.cantidad) <= 0) errors.cantidad = 'La cantidad debe ser un entero positivo';
  if (!Number.isFinite(Number(line.costo_unitario)) || Number(line.costo_unitario) < 0) errors.costo_unitario = 'El costo unitario debe ser un número no negativo';
  if (line.duplicate) errors.id_producto = 'No se permiten dos líneas con el mismo producto';
  return { valid: Object.keys(errors).length === 0, errors };
}

export const PURCHASE_TRANSITIONS = {
  borrador: ['pendiente', 'cancelado'],
  pendiente: ['aprobado', 'cancelado'],
  aprobado: ['recibido'],
  recibido: [],
  cancelado: []
};

export function canTransition(current, next) {
  return current === next || Boolean(PURCHASE_TRANSITIONS[current]?.includes(next));
}

export function isOverdue(order, today = new Date()) {
  if (!order?.endDate || ['recibido', 'cancelado'].includes(order.status)) return false;
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = String(order.endDate).split('-').map(Number);
  const delivery = new Date(year, month - 1, day);
  return delivery < localToday;
}
