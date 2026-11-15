import { describe, expect, it } from 'vitest';
import { filterOrders, sortRows } from '../../src/purchasing-list-query.js';

const today = new Date(2026, 10, 15);

const orders = [
  { id: '1', folio: 1, status: 'borrador', entity_id: 'E1', id_empleado: 'OWN', endDate: '2026-11-20', total: 1000 },
  { id: '2', folio: 2, status: 'pendiente', entity_id: 'E1', id_empleado: 'OWN', endDate: '2026-11-10', total: 2000 },
  { id: '3', folio: 3, status: 'aprobado', entity_id: 'E2', id_empleado: 'OTHER', endDate: '2026-11-18', total: 3000 },
  { id: '4', folio: 4, status: 'recibido', entity_id: 'E1', id_empleado: 'OWN', endDate: '2026-11-12', total: 4000 },
  { id: '5', folio: 5, status: 'borrador', entity_id: 'E2', id_empleado: 'OTHER', endDate: '2026-11-08', total: 5000 }
];

function snapshot(rows) {
  return rows.map(row => ({ ...row }));
}

describe('filtro Solo mis OC', () => {
  it('coincide por empleado propio usando el contexto o el filtro', () => {
    const byContext = filterOrders(orders, { mineOnly: true }, { ownEmployeeId: 'OWN', today });
    expect(byContext.map(order => order.id)).toEqual(['1', '2', '4']);

    const byFilter = filterOrders(orders, { mineOnly: true, ownEmployeeId: 'OTHER' }, { today });
    expect(byFilter.map(order => order.id)).toEqual(['3', '5']);
  });

  it('devuelve vacío cuando no hay empleado propio', () => {
    expect(filterOrders(orders, { mineOnly: true }, { today })).toEqual([]);
  });

  it('se combina con estado, proveedor, rango de entrega y atraso', () => {
    const rows = filterOrders(orders, {
      mineOnly: true,
      status: 'borrador',
      entityId: 'E1',
      from: '2026-11-01',
      to: '2026-11-30'
    }, { ownEmployeeId: 'OWN', today });
    expect(rows.map(order => order.id)).toEqual(['1']);

    const overdue = filterOrders(orders, { mineOnly: true, overdueOnly: true }, { ownEmployeeId: 'OWN', today });
    expect(overdue.map(order => order.id)).toEqual(['2']);
  });

  it('mantiene el orden estable y no muta los datos', () => {
    const before = snapshot(orders);
    const filtered = filterOrders(orders, { mineOnly: true }, { ownEmployeeId: 'OWN', today });
    const sorted = sortRows(filtered, { key: 'folio', direction: 'asc' });
    expect(sorted.map(order => order.id)).toEqual(['1', '2', '4']);
    expect(orders).toEqual(before);
  });
});
