// 005 · US2 — cálculos de presentación del Panel. Solo leen datos existentes; no persisten nada.
import { formatPurchaseOrderFolio, formatRequestNumber } from './domain/purchasing.js';

export const EMITTED_STATUSES = Object.freeze(['aprobado', 'recibido']);
const OPEN_STATUSES = Object.freeze(['borrador', 'pendiente', 'aprobado']);
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function text(value) {
  return String(value ?? '').trim();
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function amountOf(order) {
  const value = Number(order?.totals?.total ?? order?.total ?? order?.totalAmount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function currencyOf(order) {
  return text(order?.currency).toUpperCase() || 'CLP';
}

export function isOverdueOrder(order, today = new Date()) {
  const endDate = text(order?.endDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return false;
  if (!OPEN_STATUSES.includes(order.status)) return false;
  return endDate < dateKey(today);
}

/** Cantidad de órdenes por estado, en el orden del ciclo de vida. */
export function countByStatus(orders = [], statuses = []) {
  return statuses.map(status => ({ status, count: orders.filter(order => order.status === status).length }));
}

/** Gasto de OC emitidas por mes de emisión (últimos `months` meses), separado por moneda. */
export function monthlySpend(orders = [], { today = new Date(), months = 6 } = {}) {
  const buckets = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: `${MONTH_NAMES[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`, totals: {} });
  }
  const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
  for (const order of orders) {
    if (!EMITTED_STATUSES.includes(order.status)) continue;
    const bucket = byKey.get(text(order.startDate).slice(0, 7));
    if (!bucket) continue;
    const currency = currencyOf(order);
    bucket.totals[currency] = (bucket.totals[currency] || 0) + amountOf(order);
  }
  const currencies = [...new Set(buckets.flatMap(bucket => Object.keys(bucket.totals)))].sort((a, b) =>
    a === 'CLP' ? -1 : b === 'CLP' ? 1 : a.localeCompare(b)
  );
  return { buckets, currencies };
}

/** Proveedores con mayor monto en OC emitidas, agrupados por moneda (sin convertir). */
export function topSuppliers(orders = [], suppliers = [], { limit = 5 } = {}) {
  const names = new Map(suppliers.map(supplier => [supplier.entity_id, supplier.name]));
  const byCurrency = {};
  for (const order of orders) {
    if (!EMITTED_STATUSES.includes(order.status)) continue;
    const currency = currencyOf(order);
    byCurrency[currency] ||= new Map();
    const current = byCurrency[currency].get(order.entity_id) || { entity_id: order.entity_id, name: names.get(order.entity_id) || 'Proveedor eliminado', total: 0, count: 0 };
    current.total += amountOf(order);
    current.count += 1;
    byCurrency[currency].set(order.entity_id, current);
  }
  return Object.fromEntries(Object.entries(byCurrency).map(([currency, map]) => [
    currency,
    [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, limit)
  ]));
}

function shortDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[2]}-${match[3]}` : '';
}

function lookup(map, key) {
  if (map instanceof Map) return map.get(key) ?? map.get(String(key));
  return map?.[key] ?? map?.[String(key)];
}

function simulatedEvolution(current, minimum) {
  const gap = Math.max(1, minimum - current, current);
  const ratios = [0.85, 0.65, 0.45, 0.2, 0];
  return ratios.map((ratio, index) => ({
    label: index === ratios.length - 1 ? 'Hoy' : `D-${ratios.length - 1 - index}`,
    reference: '',
    value: Math.max(0, Math.round(current + gap * ratio))
  }));
}

export function stockEvolution(items = [], orders = [], { linesByOrder = new Map(), historyByOrder = new Map(), limit = 5 } = {}) {
  const selected = items.slice(0, limit);
  const ids = new Set(selected.map(({ product }) => product.id_producto || product.id));
  const minimum = selected.reduce((sum, { product }) => sum + Math.max(0, Number(product.stock_minimo || 0)), 0);
  const current = selected.reduce((sum, { product }) => sum + Math.max(0, Number(product.stock || 0)), 0);
  if (!ids.size) return { points: simulatedEvolution(current, minimum), minimum, simulated: true };
  const receipts = orders.flatMap(order => {
    if (order.status !== 'recibido') return [];
    const lines = lookup(linesByOrder, order.id) || [];
    const quantity = lines.reduce((sum, line) => ids.has(line.id_producto || line.productId)
      ? sum + Math.max(0, Number(line.cantidad || 0))
      : sum, 0);
    if (!quantity) return [];
    const history = lookup(historyByOrder, order.id) || [];
    const change = history.find(item => item.to === 'recibido');
    const date = text(change?.changedAt || order.updatedAt || '').slice(0, 10);
    const reference = formatPurchaseOrderFolio(order.ocFolio) || formatRequestNumber(order.folio) || text(order.folio);
    return [{ date, label: shortDate(date) || text(reference), reference, quantity }];
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (!receipts.length) return { points: simulatedEvolution(current, minimum), minimum, simulated: true };
  const before = receipts.reduce((sum, receipt) => sum + receipt.quantity, 0);
  let running = Math.max(0, current - before);
  const points = [{ label: receipts[0].label, reference: '', value: running }];
  for (const receipt of receipts) {
    running += receipt.quantity;
    points.push({ label: receipt.label, reference: receipt.reference, value: running });
  }
  points.push({ label: 'Hoy', reference: '', value: current });
  return { points, minimum, simulated: false };
}

function attentionItem(order, reason, names) {
  return {
    id: order.id,
    status: order.status,
    reason,
    reference: [formatRequestNumber(order.folio) || text(order.folio), formatPurchaseOrderFolio(order.ocFolio)].filter(Boolean).join(' · '),
    supplier: names.get(order.entity_id) || '',
    endDate: text(order.endDate),
    total: amountOf(order),
    currency: currencyOf(order)
  };
}

/**
 * "Requiere tu atención" según el rol de 004 (FR-018). Reutilizable por la bandeja del 007.
 * - administrador, gerente: solicitudes pendientes de aprobar
 * - bodeguero: OC aprobadas por recibir y OC atrasadas
 * - comprador: sus borradores (empleado propio)
 * - consulta: OC atrasadas (solo lectura)
 */
export function attentionItemsForRole(role, orders = [], { suppliers = [], ownEmployeeId = '', today = new Date() } = {}) {
  const names = new Map(suppliers.map(supplier => [supplier.entity_id, supplier.name]));
  const items = [];
  const push = (order, reason) => items.push(attentionItem(order, reason, names));
  const normalizedRole = text(role) || 'administrador';
  for (const order of orders) {
    const overdue = isOverdueOrder(order, today);
    if (normalizedRole === 'administrador' || normalizedRole === 'gerente') {
      if (order.status === 'pendiente') push(order, overdue ? 'Pendiente de aprobación · atrasada' : 'Pendiente de aprobación');
    } else if (normalizedRole === 'bodeguero') {
      if (order.status === 'aprobado') push(order, overdue ? 'Por recibir · atrasada' : 'Por recibir');
      else if (overdue) push(order, 'Atrasada');
    } else if (normalizedRole === 'comprador') {
      if (order.status === 'borrador' && ownEmployeeId && text(order.id_empleado) === ownEmployeeId) push(order, 'Borrador por enviar');
    } else if (overdue) {
      push(order, 'Atrasada');
    }
  }
  return items.sort((a, b) => (a.endDate || '9999').localeCompare(b.endDate || '9999'));
}

export const ATTENTION_TITLES = Object.freeze({
  administrador: 'Solicitudes por aprobar',
  gerente: 'Solicitudes por aprobar',
  bodeguero: 'OC por recibir y atrasadas',
  comprador: 'Tus borradores',
  consulta: 'OC atrasadas'
});

export function attentionTitle(role) {
  return ATTENTION_TITLES[text(role)] || ATTENTION_TITLES.administrador;
}
