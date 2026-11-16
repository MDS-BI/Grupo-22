// 007 · US4 — presupuesto mensual por área (solo CLP).

export function monthKey(value = new Date()) {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : '';
}

/** Gasto del área en el mes: OC emitidas por mes de emisión; solo CLP se descuenta. */
export function areaSpend(orders = [], metadataByOrder = new Map(), areaId = '', month = monthKey()) {
  const result = { clp: 0, otherCurrencies: {} };
  for (const order of orders) {
    if (!['aprobado', 'recibido'].includes(order.status)) continue;
    if ((metadataByOrder.get(order.id)?.id_area || '') !== areaId) continue;
    if (monthKey(order.startDate) !== month) continue;
    const currency = String(order.currency || 'CLP').toUpperCase();
    const amount = Number(order.totals?.total ?? order.totalAmount ?? 0);
    if (currency === 'CLP') result.clp += amount;
    else result.otherCurrencies[currency] = (result.otherCurrencies[currency] || 0) + amount;
  }
  return result;
}

/** Estado del presupuesto antes y después de aprobar una OC por `orderTotal` (CLP). */
export function budgetStatus(budget, spend = { clp: 0 }, orderTotal = 0) {
  if (budget === null || budget === undefined || budget === '') {
    return { defined: false, budget: null, spent: spend.clp, available: null, availableAfter: null, exceeds: false, excessAmount: 0 };
  }
  const amount = Number(budget);
  const available = amount - spend.clp;
  const availableAfter = available - Number(orderTotal || 0);
  return {
    defined: true,
    budget: amount,
    spent: spend.clp,
    available,
    availableAfter,
    exceeds: availableAfter < 0,
    excessAmount: availableAfter < 0 ? -availableAfter : 0
  };
}
