// 007 · US3 — reportes de gasto (OC emitidas) y exportación CSV.
import { monthKey } from './budget.js';

export const GROUP_BY = Object.freeze({ proveedor: 'Proveedor', rubro: 'Rubro', area: 'Área', mes: 'Mes' });
const EMITTED = ['aprobado', 'recibido'];

function day(value) {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Gasto agrupado. `context`: { suppliers, rubros, areas, metadata (Map id → metadata) }.
 * Devuelve { rows: [{ key, label, count, amounts, percentages }], currencies, totals, note, error }.
 */
export function spendReport(orders = [], { groupBy = 'proveedor', from = '', to = '', suppliers = [], rubros = [], areas = [], metadata = new Map() } = {}) {
  if (from && to && from > to) return { rows: [], currencies: [], totals: {}, note: '', error: 'La fecha desde no puede ser posterior a la fecha hasta.' };
  const supplierMap = new Map(suppliers.map(supplier => [supplier.entity_id, supplier]));
  const rubroMap = new Map(rubros.map(rubro => [String(rubro.id_rubro || rubro.id), rubro.nombre || rubro.name]));
  const areaMap = new Map(areas.map(area => [area.id_area, area.nombre]));
  const groups = new Map();
  const totals = {};
  const add = (key, label, order, currency, amount) => {
    const group = groups.get(key) || { key, label, count: 0, amounts: {} };
    group.count += 1;
    group.amounts[currency] = (group.amounts[currency] || 0) + amount;
    groups.set(key, group);
  };
  for (const order of orders) {
    if (!EMITTED.includes(order.status)) continue;
    const emission = day(order.startDate);
    if (!emission || (from && emission < from) || (to && emission > to)) continue;
    const currency = String(order.currency || 'CLP').toUpperCase();
    const amount = Number(order.totals?.total ?? order.totalAmount ?? 0);
    totals[currency] = (totals[currency] || 0) + amount;
    const supplier = supplierMap.get(order.entity_id);
    if (groupBy === 'rubro') {
      const ids = supplier?.rubro_ids?.length ? supplier.rubro_ids.map(String) : ['__none__'];
      for (const id of ids) add(id, id === '__none__' ? 'Sin rubro' : (rubroMap.get(id) || 'Rubro eliminado'), order, currency, amount);
    } else if (groupBy === 'area') {
      const areaId = metadata.get(order.id)?.id_area || '';
      add(areaId || '__none__', areaId ? (areaMap.get(areaId) || 'Área eliminada') : 'Sin área', order, currency, amount);
    } else if (groupBy === 'mes') {
      const key = monthKey(emission);
      add(key, key, order, currency, amount);
    } else {
      add(order.entity_id, supplier?.name || 'Proveedor eliminado', order, currency, amount);
    }
  }
  const currencies = Object.keys(totals).sort((a, b) => (a === 'CLP' ? -1 : b === 'CLP' ? 1 : a.localeCompare(b)));
  const rows = [...groups.values()].map(row => ({
    ...row,
    percentages: groupBy === 'rubro'
      ? {}
      : Object.fromEntries(Object.entries(row.amounts).map(([currency, amount]) => [currency, totals[currency] ? Math.round((amount / totals[currency]) * 1000) / 10 : 0]))
  }));
  rows.sort(groupBy === 'mes'
    ? (a, b) => a.key.localeCompare(b.key)
    : (a, b) => (b.amounts.CLP || 0) - (a.amounts.CLP || 0) || Object.values(b.amounts)[0] - Object.values(a.amounts)[0] || a.label.localeCompare(b.label));
  const note = groupBy === 'rubro' ? 'Un proveedor con varios rubros suma su gasto completo en cada uno; por eso no hay total general.' : '';
  return { rows, currencies, totals, note, error: '' };
}

function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV con BOM UTF-8, separador `;` y escapado RFC 4180. `columns`: [{ key, label }]. */
export function toCsv(columns = [], rows = []) {
  const header = columns.map(column => csvField(column.label)).join(';');
  const body = rows.map(row => columns.map(column => csvField(typeof column.value === 'function' ? column.value(row) : row[column.key])).join(';'));
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

/** Número para CSV: sin separador de miles y con punto decimal. */
export function csvNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}
