import { describe, expect, it } from 'vitest';
import { evaluateSupplier, gradeFor, receiptDateOf } from '../../src/domain/supplier-evaluation.js';
import { compareSupplierOptions, groupCartBySupplier, normalizeTiers, unitPriceFor, validateTiers } from '../../src/domain/price-tiers.js';
import { buildSuggestedRequests, isBelowMinimum, suggestedQuantity } from '../../src/domain/reorder.js';
import { areaSpend, budgetStatus, monthKey } from '../../src/domain/budget.js';
import { spendReport, toCsv } from '../../src/domain/reports.js';
import { notificationsFor, unreadCount } from '../../src/domain/notifications.js';
import { priceLinesFromList, validateSupplierPriceEntry } from '../../src/domain/price-list.js';

const received = (id, endDate, receivedAt) => ({ order: { id, status: 'recibido', endDate, totalAmount: 1000, currency: 'CLP', updatedAt: receivedAt }, history: [{ to: 'recibido', changedAt: `${receivedAt}T12:00:00.000Z` }] });

describe('007 · evaluación de proveedores', () => {
  it('mide puntualidad, atraso promedio y calificación A/B/C', () => {
    const cases = [received('a', '2026-11-10', '2026-11-10'), received('b', '2026-11-10', '2026-11-13'), received('c', '2026-11-10', '2026-11-09')];
    const history = Object.fromEntries(cases.map(item => [item.order.id, item.history]));
    const result = evaluateSupplier(cases.map(item => item.order), history);
    expect(result).toMatchObject({ emitidas: 3, recibidas: 3, aTiempo: 2, porcentajeATiempo: 66.7, atrasoPromedio: 1, calificacion: 'C', aproximada: false });
    expect(result.montoPorMoneda).toEqual({ CLP: 3000 });
    expect([gradeFor(90, 1), gradeFor(89.9, 1), gradeFor(70, 1), gradeFor(69.9, 1), gradeFor(100, 0)]).toEqual(['A', 'B', 'B', 'C', 'Sin datos']);
  });

  it('usa updatedAt como fecha aproximada y omite OC sin fecha comprometida', () => {
    expect(receiptDateOf({ status: 'recibido', updatedAt: '2026-11-05T10:00:00Z' }, [])).toEqual({ date: '2026-11-05', approximate: true });
    const result = evaluateSupplier([{ id: 'x', status: 'recibido', endDate: '', totalAmount: 5 }], {});
    expect(result).toMatchObject({ recibidas: 1, evaluables: 0, calificacion: 'Sin datos', porcentajeATiempo: null });
  });
});

describe('007 · tramos de precio y comparación', () => {
  const entry = { precio: 1000, tramos: [{ desde: 50, precio: 900 }, { desde: 1, precio: 1000 }, { desde: 10, precio: 950 }] };

  it('aplica el tramo correcto en los bordes', () => {
    expect([1, 9, 10, 49, 50, 500].map(qty => unitPriceFor(entry, qty).precio)).toEqual([1000, 1000, 950, 950, 900, 900]);
    expect(unitPriceFor({ precio: 700 }, 99)).toEqual({ precio: 700, desde: 1 });
    expect(normalizeTiers(entry).map(tier => tier.desde)).toEqual([1, 10, 50]);
  });

  it('valida tramos', () => {
    expect(validateTiers([{ desde: 1, precio: 10 }, { desde: 5, precio: 9 }]).valid).toBe(true);
    expect(validateTiers([{ desde: 5, precio: 9 }]).valid).toBe(false);
    expect(validateTiers([{ desde: 1, precio: 10 }, { desde: 1, precio: 9 }]).valid).toBe(false);
    expect(validateTiers([{ desde: 1, precio: 0 }]).valid).toBe(false);
    const supplier = { entity_id: 's', origin: 'Nacional' };
    expect(validateSupplierPriceEntry({ entity_id: 's', precio: 10, tramos: [{ desde: 1, precio: 10 }, { desde: 5, precio: 8 }] }, { supplier }).value.tramos).toHaveLength(2);
  });

  it('fija el precio de la línea según la cantidad', () => {
    const list = [{ entity_id: 's', id_producto: 'p', moneda: 'CLP', ...entry }];
    expect(priceLinesFromList([{ id_producto: 'p', cantidad: 12, costo_unitario: 1 }], list, 'CLP')[0].costo_unitario).toBe(950);
  });

  it('compara proveedores activos y destaca el mejor (CLP, total, calificación, nombre)', () => {
    const suppliers = [{ entity_id: 'a', name: 'Alfa' }, { entity_id: 'b', name: 'Beta' }, { entity_id: 'c', name: 'Gama', estado: 'inactivo' }, { entity_id: 'd', name: 'Delta' }];
    const prices = [
      { entity_id: 'a', id_producto: 'p', precio: 1000, moneda: 'CLP' },
      { entity_id: 'b', id_producto: 'p', precio: 1100, moneda: 'CLP', tramos: [{ desde: 1, precio: 1100 }, { desde: 10, precio: 900 }] },
      { entity_id: 'c', id_producto: 'p', precio: 1, moneda: 'CLP' },
      { entity_id: 'd', id_producto: 'p', precio: 2, moneda: 'USD' }
    ];
    expect(compareSupplierOptions('p', 5, prices, suppliers).map(option => option.entity_id)).toEqual(['a', 'b', 'd']);
    const at10 = compareSupplierOptions('p', 10, prices, suppliers);
    expect(at10[0]).toMatchObject({ entity_id: 'b', precioUnitario: 900, totalNeto: 9000, tramo: 10, mejor: true });
    const tie = [{ entity_id: 'a', id_producto: 'q', precio: 5, moneda: 'CLP' }, { entity_id: 'b', id_producto: 'q', precio: 5, moneda: 'CLP' }];
    expect(compareSupplierOptions('q', 1, tie, suppliers, { b: { calificacion: 'A' }, a: { calificacion: 'C' } })[0].entity_id).toBe('b');
  });

  it('agrupa el carrito por proveedor sumando repetidos', () => {
    expect(groupCartBySupplier([
      { entity_id: 'a', id_producto: 'p', cantidad: 2 },
      { entity_id: 'b', id_producto: 'p', cantidad: 1 },
      { entity_id: 'a', id_producto: 'p', cantidad: 3 },
      { entity_id: 'a', id_producto: 'q', cantidad: 1 }
    ])).toEqual([
      { entity_id: 'a', lines: [{ id_producto: 'p', cantidad: 5 }, { id_producto: 'q', cantidad: 1 }] },
      { entity_id: 'b', lines: [{ id_producto: 'p', cantidad: 1 }] }
    ]);
  });
});

describe('007 · reposición', () => {
  it('detecta bajo mínimo, calcula la cantidad y agrupa por proveedor', () => {
    const products = [
      { id_producto: 'p1', nombre: 'A', stock: 3, stock_minimo: 5 },
      { id_producto: 'p2', nombre: 'B', stock: 5, stock_minimo: 5 },
      { id_producto: 'p3', nombre: 'C', stock: 9, stock_minimo: 5 },
      { id_producto: 'p4', nombre: 'D', stock: 0, stock_minimo: 2 },
      { id_producto: 'p5', nombre: 'E', stock: 0, stock_minimo: 0 },
      { id_producto: 'p6', nombre: 'F', stock: 1, stock_minimo: 4 }
    ];
    expect(products.map(isBelowMinimum)).toEqual([true, true, false, true, false, true]);
    expect(suggestedQuantity(products[0])).toBe(7);
    expect(suggestedQuantity({ stock: 20, stock_minimo: 1 })).toBe(1);
    const suppliers = [{ entity_id: 's1', name: 'Uno' }, { entity_id: 's2', name: 'Dos' }];
    const prices = [
      { entity_id: 's1', id_producto: 'p1', precio: 10, moneda: 'CLP' },
      { entity_id: 's2', id_producto: 'p1', precio: 12, moneda: 'CLP' },
      { entity_id: 's2', id_producto: 'p2', precio: 5, moneda: 'CLP' },
      { entity_id: 's1', id_producto: 'p6', precio: 5, moneda: 'CLP' }
    ];
    const plan = buildSuggestedRequests(products, prices, suppliers, [{ id_producto: 'p6', status: 'borrador', folio: 'SOL-0009' }]);
    expect(plan.groups.map(group => [group.entity_id, group.lines.map(line => [line.id_producto, line.cantidad])])).toEqual([
      ['s1', [['p1', 7]]],
      ['s2', [['p2', 5]]]
    ]);
    expect(plan.skipped.map(item => [item.product.id_producto, item.reason])).toEqual([['p4', 'no-supplier'], ['p6', 'open']]);
  });
});

describe('007 · presupuesto', () => {
  it('suma solo OC emitidas en CLP del área y mes', () => {
    const orders = [
      { id: 'a', status: 'aprobado', startDate: '2026-11-03', totalAmount: 100, currency: 'CLP' },
      { id: 'b', status: 'recibido', startDate: '2026-11-20', totalAmount: 50, currency: 'CLP' },
      { id: 'c', status: 'aprobado', startDate: '2026-11-05', totalAmount: 7, currency: 'USD' },
      { id: 'd', status: 'pendiente', startDate: null, totalAmount: 999, currency: 'CLP' },
      { id: 'e', status: 'aprobado', startDate: '2026-10-30', totalAmount: 30, currency: 'CLP' }
    ];
    const metadata = new Map(orders.map(order => [order.id, { id_area: 'x' }]));
    expect(areaSpend(orders, metadata, 'x', '2026-11')).toEqual({ clp: 150, otherCurrencies: { USD: 7 } });
    expect(budgetStatus(200, { clp: 150 }, 80)).toMatchObject({ defined: true, available: 50, availableAfter: -30, exceeds: true, excessAmount: 30 });
    expect(budgetStatus(0, { clp: 0 }, 1).exceeds).toBe(true);
    expect(budgetStatus(null, { clp: 10 }, 1)).toMatchObject({ defined: false, exceeds: false });
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
  });
});

describe('007 · reportes y CSV', () => {
  const orders = [
    { id: 'a', entity_id: 's1', status: 'aprobado', startDate: '2026-10-03', totalAmount: 100, currency: 'CLP' },
    { id: 'b', entity_id: 's2', status: 'recibido', startDate: '2026-11-20', totalAmount: 300, currency: 'CLP' },
    { id: 'c', entity_id: 's2', status: 'aprobado', startDate: '2026-11-05', totalAmount: 7, currency: 'USD' },
    { id: 'd', entity_id: 's1', status: 'borrador', startDate: null, totalAmount: 999, currency: 'CLP' }
  ];
  const context = {
    suppliers: [{ entity_id: 's1', name: 'Uno', rubro_ids: ['r1', 'r2'] }, { entity_id: 's2', name: 'Dos', rubro_ids: ['r1'] }],
    rubros: [{ id_rubro: 'r1', nombre: 'Insumos' }, { id_rubro: 'r2', nombre: 'Aseo' }],
    areas: [{ id_area: 'x', nombre: 'TI' }],
    metadata: new Map([['b', { id_area: 'x' }]])
  };

  it('agrupa por proveedor, área, mes y rubro, con monedas separadas', () => {
    const bySupplier = spendReport(orders, { ...context, groupBy: 'proveedor' });
    expect(bySupplier.rows.map(row => [row.label, row.count, row.amounts])).toEqual([['Dos', 2, { CLP: 300, USD: 7 }], ['Uno', 1, { CLP: 100 }]]);
    expect(bySupplier.rows[0].percentages).toEqual({ CLP: 75, USD: 100 });
    expect(spendReport(orders, { ...context, groupBy: 'area' }).rows.map(row => row.label).sort()).toEqual(['Sin área', 'TI']);
    expect(spendReport(orders, { ...context, groupBy: 'mes' }).rows.map(row => row.key)).toEqual(['2026-10', '2026-11']);
    const byRubro = spendReport(orders, { ...context, groupBy: 'rubro' });
    expect(byRubro.rows.find(row => row.label === 'Insumos').amounts).toEqual({ CLP: 400, USD: 7 });
    expect(byRubro.note).toContain('varios rubros');
    expect(spendReport(orders, { ...context, from: '2026-11-01', to: '2026-11-30' }).rows).toHaveLength(1);
    expect(spendReport(orders, { ...context, from: '2026-12-01', to: '2026-11-01' }).error).toContain('posterior');
  });

  it('exporta CSV con BOM, punto y coma y escapado', () => {
    const csv = toCsv([{ key: 'a', label: 'Nombre' }, { key: 'b', label: 'Nota' }], [{ a: 'Peña; Cía', b: 'dice "hola"' }, { a: 'x', b: 'línea\nnueva' }]);
    expect(csv.startsWith('﻿Nombre;Nota\r\n')).toBe(true);
    expect(csv).toContain('"Peña; Cía";"dice ""hola"""');
    expect(csv).toContain('x;"línea\nnueva"');
  });
});

describe('007 · notificaciones', () => {
  const today = new Date('2026-11-16T12:00:00Z');
  const suppliers = [{ entity_id: 's', name: 'Uno' }];
  const orders = [
    { id: 'p', entity_id: 's', status: 'pendiente', endDate: '2099-01-01', folio: 1, totalAmount: 1 },
    { id: 'a', entity_id: 's', status: 'aprobado', endDate: '2026-11-01', folio: 2, ocFolio: 1, totalAmount: 1, id_empleado: 'e1' },
    { id: 'r', entity_id: 's', status: 'cancelado', endDate: '2099-01-01', folio: 3, totalAmount: 1, id_empleado: 'e1' }
  ];
  const historyByOrder = new Map([
    ['a', [{ from: 'pendiente', to: 'aprobado', changedAt: '2026-11-10T10:00:00Z' }]],
    ['r', [{ from: 'pendiente', to: 'cancelado', changedAt: '2026-11-12T10:00:00Z' }]]
  ]);

  it('deriva avisos por rol con identificadores estables', () => {
    const context = { orders, suppliers, historyByOrder, today, ownEmployeeId: 'e1', budgetAlerts: [{ orderId: 'p', reference: 'SOL-0001', area: 'TI', month: '2026-11' }] };
    expect(notificationsFor('gerente', context).map(item => item.id)).toEqual(['pendiente-aprobacion:p:pendiente', 'presupuesto-excedido:p:2026-11']);
    expect(notificationsFor('bodeguero', context).map(item => item.tipo)).toEqual(['atrasada']);
    expect(notificationsFor('comprador', context).map(item => item.id).sort()).toEqual(['aprobada:a:aprobado', 'rechazada:r:cancelado']);
    expect(notificationsFor('consulta', context).map(item => item.tipo)).toEqual(['atrasada']);
    const items = notificationsFor('gerente', context);
    expect(unreadCount(items, ['pendiente-aprobacion:p:pendiente'])).toBe(1);
  });
});
