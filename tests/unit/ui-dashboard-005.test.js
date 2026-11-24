import { describe, expect, it } from 'vitest';
import {
  attentionItemsForRole,
  countByStatus,
  isOverdueOrder,
  monthlySpend,
  stockEvolution,
  topSuppliers
} from '../../src/ui-dashboard.js';
import {
  spendColumnsSvg,
  statusBarChartSvg,
  stockEvolutionLineChartSvg,
  topSuppliersBarChartSvg
} from '../../src/ui-charts.js';

const today = new Date(2026, 10, 16);
const suppliers = [{ entity_id: 's1', name: 'Uno' }, { entity_id: 's2', name: 'Dos' }];
const orders = [
  { id: 'a', entity_id: 's1', status: 'aprobado', startDate: '2026-11-02', endDate: '2026-11-10', totalAmount: 1000, currency: 'CLP', folio: 1, ocFolio: 1 },
  { id: 'b', entity_id: 's2', status: 'recibido', startDate: '2026-10-05', endDate: '2026-10-20', totalAmount: 3000, currency: 'CLP', folio: 2, ocFolio: 2 },
  { id: 'c', entity_id: 's2', status: 'aprobado', startDate: '2026-11-03', endDate: '2026-12-01', totalAmount: 50, currency: 'USD', folio: 3, ocFolio: 3 },
  { id: 'd', entity_id: 's1', status: 'pendiente', endDate: '2026-11-01', totalAmount: 700, currency: 'CLP', folio: 4 },
  { id: 'e', entity_id: 's1', status: 'borrador', endDate: '2026-12-10', totalAmount: 200, currency: 'CLP', folio: 5, id_empleado: 'emp-1' },
  { id: 'f', entity_id: 's1', status: 'aprobado', startDate: '2026-03-01', endDate: '2026-03-10', totalAmount: 9999, currency: 'CLP', folio: 6, ocFolio: 4 },
  { id: 'g', entity_id: 's2', status: 'cancelado', endDate: '2026-11-01', totalAmount: 400, currency: 'CLP', folio: 7 }
];

describe('005 · cálculos del Panel', () => {
  it('cuenta órdenes por estado en el orden del ciclo', () => {
    expect(countByStatus(orders, ['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado']).map(item => item.count))
      .toEqual([1, 1, 3, 1, 1]);
  });

  it('suma gasto de OC emitidas por mes de emisión y por moneda, solo los últimos 6 meses', () => {
    const spend = monthlySpend(orders, { today, months: 6 });
    expect(spend.buckets.map(bucket => bucket.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(spend.buckets.at(-1).totals).toEqual({ CLP: 1000, USD: 50 });
    expect(spend.buckets.at(-2).totals).toEqual({ CLP: 3000 });
    expect(spend.currencies).toEqual(['CLP', 'USD']);
  });

  it('arma el top de proveedores por moneda sin convertir montos', () => {
    const top = topSuppliers(orders, suppliers, { limit: 5 });
    expect(top.CLP.map(row => [row.name, row.total])).toEqual([['Uno', 10999], ['Dos', 3000]]);
    expect(top.USD.map(row => [row.name, row.total])).toEqual([['Dos', 50]]);
  });

  it('detecta atraso solo en órdenes abiertas con entrega vencida', () => {
    expect(isOverdueOrder(orders[0], today)).toBe(true);
    expect(isOverdueOrder(orders[1], today)).toBe(false);
    expect(isOverdueOrder(orders[6], today)).toBe(false);
  });

  it('define "Requiere tu atención" por rol de 004', () => {
    const ids = (role, extra = {}) => attentionItemsForRole(role, orders, { suppliers, today, ...extra }).map(item => item.id);
    expect(ids('gerente')).toEqual(['d']);
    expect(ids('administrador')).toEqual(['d']);
    expect(ids('bodeguero').sort()).toEqual(['a', 'c', 'd', 'f']);
    expect(ids('comprador', { ownEmployeeId: 'emp-1' })).toEqual(['e']);
    expect(ids('comprador')).toEqual([]);
    expect(ids('consulta').sort()).toEqual(['a', 'd', 'f']);
    const [item] = attentionItemsForRole('gerente', orders, { suppliers, today });
    expect(item).toMatchObject({ reference: 'SOL-0004', supplier: 'Uno', reason: 'Pendiente de aprobación · atrasada' });
  });

  it('dibuja gráficos SVG accesibles', () => {
    const status = statusBarChartSvg([{ status: 'aprobado', label: 'OC emitida – Aprobada', count: 3 }]);
    expect(status).toContain('role="img"');
    expect(status).toContain('OC emitida – Aprobada: 3');
    const spend = spendColumnsSvg([{ label: 'Nov 26', totals: { CLP: 1000 } }], 'CLP', { formatMoney: (value, currency) => `${currency} ${value}` });
    expect(spend).toContain('Nov 26: CLP 1000');
  });

  it('dibuja barras por proveedor y una serie de stock con mínimo', () => {
    const topChart = topSuppliersBarChartSvg([{ name: 'Proveedor Uno', total: 2380 }], 'CLP', { formatMoney: value => `CLP ${value}` });
    expect(topChart).toContain('<rect');
    expect(topChart).toContain('Proveedor Uno');
    expect(topChart).toContain('CLP 2380');
    expect(topChart).toContain('chart-top-rank');
    expect(topChart).toContain('chart-top-value');
    const stockChart = stockEvolutionLineChartSvg([
      { label: '11-01', value: 4 },
      { label: 'Hoy', value: 9 }
    ], 10);
    expect(stockChart).toContain('<polyline');
    expect(stockChart).toContain('<circle');
    expect(stockChart).toContain('chart-min-line');
    expect(stockChart).toContain('Mín. 10');
  });

  it('reconstruye la evolución del stock desde las recepciones', () => {
    const low = [{ product: { id_producto: 'p1', stock: 4, stock_minimo: 10 } }];
    const received = [{ id: 'o1', status: 'recibido', ocFolio: 1, updatedAt: '2026-11-10T00:00:00Z' }];
    const linesByOrder = new Map([['o1', [{ id_producto: 'p1', cantidad: 6 }]]]);
    const historyByOrder = new Map([['o1', [{ to: 'recibido', changedAt: '2026-11-10T00:00:00Z' }]]]);
    const evolution = stockEvolution(low, received, { linesByOrder, historyByOrder });
    expect(evolution.minimum).toBe(10);
    expect(evolution.points.map(point => point.value)).toEqual([0, 6, 4]);
    expect(evolution.points.at(-1).label).toBe('Hoy');
    expect(evolution.simulated).toBe(false);
  });

  it('simula la evolución cuando no hay recepciones y nunca deja el gráfico vacío', () => {
    const low = [{ product: { id_producto: 'p1', stock: 4, stock_minimo: 10 } }];
    const evolution = stockEvolution(low, []);
    expect(evolution.simulated).toBe(true);
    expect(evolution.points).toHaveLength(5);
    expect(evolution.points.at(-1)).toMatchObject({ label: 'Hoy', value: 4 });
    const chart = stockEvolutionLineChartSvg(evolution.points, evolution.minimum);
    expect(chart).toContain('<polyline');
    expect(chart).toContain('Mín. 10');
  });
});
