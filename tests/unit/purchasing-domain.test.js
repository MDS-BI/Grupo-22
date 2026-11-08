import { describe, it, expect } from 'vitest';
import {
  calculateLineSubtotal,
  calculateOrderTotals,
  validatePurchaseOrderLine,
  validatePurchaseOrderLines,
  getAvailableActions,
  getAvailableActionItems,
  assertTransition,
  createStatusChange,
  planReceipt,
  isOverdue,
  normalizeRut,
  PURCHASING_ERRORS
} from '../../src/domain/purchasing.js';

describe('purchasing domain', () => {
  it('calculates line subtotals and order totals with 19 percent IVA', () => {
    const lines = [
      { cantidad: 2, costo_unitario: 1000 },
      { cantidad: 1, costo_unitario: 500 }
    ];
    expect(calculateLineSubtotal(lines[0])).toBe(2000);
    expect(calculateOrderTotals(lines)).toMatchObject({ neto: 2500, iva: 475, total: 2975 });
  });

  it('rounds monetary values to two decimals', () => {
    expect(calculateOrderTotals([{ cantidad: 3, costo_unitario: 0.335 }])).toMatchObject({
      neto: 1.01,
      iva: 0.19,
      total: 1.2
    });
  });

  it('validates quantity, cost and duplicate products', () => {
    expect(validatePurchaseOrderLine({ id_producto: 'p1', cantidad: 0, costo_unitario: 10 }).valid).toBe(false);
    expect(validatePurchaseOrderLine({ id_producto: 'p1', cantidad: 1.5, costo_unitario: 10 }).valid).toBe(false);
    expect(validatePurchaseOrderLine({ id_producto: 'p1', cantidad: 1, costo_unitario: -1 }).valid).toBe(false);
    const duplicate = validatePurchaseOrderLine(
      { id_producto: 'p1', cantidad: 1, costo_unitario: 10 },
      { existingLines: [{ id_producto: 'p1', cantidad: 2, costo_unitario: 5 }] }
    );
    expect(duplicate.errors.id_producto).toContain('mismo producto');
    expect(validatePurchaseOrderLines([], { requireLines: true }).errors[0].message).toBe(PURCHASING_ERRORS.NO_LINES);
  });

  it('returns the canonical action matrix', () => {
    expect(getAvailableActions('borrador')).toEqual(['pendiente', 'cancelado']);
    expect(getAvailableActions('pendiente')).toEqual(['aprobado', 'cancelado']);
    expect(getAvailableActions('aprobado')).toEqual(['recibido']);
    expect(getAvailableActions('recibido')).toEqual([]);
    expect(getAvailableActions('cancelado')).toEqual([]);
    expect(getAvailableActionItems('borrador').map(item => item.label)).toEqual(['Enviar a revisión', 'Cancelar']);
  });

  it('rejects invalid and line-less transitions', () => {
    expect(() => assertTransition('borrador', 'aprobado')).toThrow();
    expect(() => assertTransition('borrador', 'pendiente', { hasLines: false })).toThrow(PURCHASING_ERRORS.NO_LINES);
    expect(() => assertTransition('recibido', 'cancelado')).toThrow();
    expect(assertTransition('borrador', 'pendiente', { hasLines: true })).toBe(true);
  });

  it('creates chronological status changes', () => {
    const change = createStatusChange('order-1', 'borrador', 'pendiente', '2026-11-07T12:00:00.000Z');
    expect(change).toMatchObject({
      id_orden_compra: 'order-1',
      from: 'borrador',
      to: 'pendiente',
      changedAt: '2026-11-07T12:00:00.000Z'
    });
    expect(() => createStatusChange('order-1', 'borrador', 'recibido')).toThrow();
  });

  it('plans receipt stock updates only from approved status', () => {
    const products = [{ id_producto: 'p1', stock: 5 }];
    const lines = [{ id_producto: 'p1', cantidad: 3, costo_unitario: 10 }];
    const plan = planReceipt({ id: 'o1', status: 'aprobado' }, lines, products);
    expect(plan.updates[0]).toMatchObject({ stock_anterior: 5, stock_nuevo: 8 });
    expect(() => planReceipt({ id: 'o1', status: 'pendiente' }, lines, products)).toThrow(PURCHASING_ERRORS.INVALID_TRANSITION);
    expect(() => planReceipt({ id: 'o1', status: 'aprobado' }, lines, products, { stock_aplicado: true })).toThrow(PURCHASING_ERRORS.STOCK_ALREADY_APPLIED);
    expect(() => planReceipt({ id: 'o1', status: 'aprobado' }, [], products)).toThrow(PURCHASING_ERRORS.NO_LINES);
  });

  it('detects overdue non-terminal orders', () => {
    const today = new Date(2026, 10, 7);
    expect(isOverdue({ endDate: '2026-11-06', status: 'aprobado' }, today)).toBe(true);
    expect(isOverdue({ endDate: '2026-11-08', status: 'aprobado' }, today)).toBe(false);
    expect(isOverdue({ endDate: '2026-11-06', status: 'recibido' }, today)).toBe(false);
  });

  it('normalizes Chilean RUT values', () => {
    expect(normalizeRut('12.345.678-9')).toBe('12345678-9');
  });
});
