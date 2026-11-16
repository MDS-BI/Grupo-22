// 007 · US1 — evaluación de proveedores a partir del historial de estados y las fechas comprometidas.

export const EMITTED = Object.freeze(['aprobado', 'recibido']);

function dayKey(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function daysBetween(fromKey, toKey) {
  const from = Date.UTC(...fromKey.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0)));
  const to = Date.UTC(...toKey.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0)));
  return Math.round((to - from) / 86400000);
}

/** Fecha de recepción: paso a `recibido` del historial; si no existe, `updatedAt` (aproximada). */
export function receiptDateOf(order = {}, history = []) {
  if (order.status !== 'recibido') return null;
  const record = [...history].reverse().find(item => item.to === 'recibido');
  const fromHistory = dayKey(record?.changedAt);
  if (fromHistory) return { date: fromHistory, approximate: false };
  const fallback = dayKey(order.updatedAt);
  return fallback ? { date: fallback, approximate: true } : null;
}

export function gradeFor(percentage, received) {
  if (!received) return 'Sin datos';
  if (percentage >= 90) return 'A';
  if (percentage >= 70) return 'B';
  return 'C';
}

/**
 * Evalúa las OC de un proveedor. `historyByOrder`: Map o objeto id → registros de historial.
 * Los montos usan `totals.total` o `totalAmount`.
 */
export function evaluateSupplier(orders = [], historyByOrder = {}) {
  const historyOf = id => (historyByOrder instanceof Map ? historyByOrder.get(id) : historyByOrder[id]) || [];
  const emitted = orders.filter(order => EMITTED.includes(order.status));
  const amounts = {};
  for (const order of emitted) {
    const currency = String(order.currency || 'CLP').toUpperCase();
    amounts[currency] = (amounts[currency] || 0) + Number(order.totals?.total ?? order.totalAmount ?? 0);
  }
  let evaluable = 0;
  let onTime = 0;
  let delayTotal = 0;
  let approximate = false;
  let receivedCount = 0;
  for (const order of orders) {
    if (order.status !== 'recibido') continue;
    receivedCount += 1;
    const committed = dayKey(order.endDate);
    const receipt = receiptDateOf(order, historyOf(order.id));
    if (!committed || !receipt) continue;
    evaluable += 1;
    approximate ||= receipt.approximate;
    const delay = Math.max(0, daysBetween(committed, receipt.date));
    if (delay === 0) onTime += 1;
    delayTotal += delay;
  }
  const porcentajeATiempo = evaluable ? Math.round((onTime / evaluable) * 1000) / 10 : null;
  return {
    emitidas: emitted.length,
    recibidas: receivedCount,
    evaluables: evaluable,
    aTiempo: onTime,
    porcentajeATiempo,
    atrasoPromedio: evaluable ? Math.round((delayTotal / evaluable) * 10) / 10 : null,
    montoPorMoneda: amounts,
    calificacion: gradeFor(porcentajeATiempo ?? 0, evaluable),
    aproximada: approximate
  };
}
