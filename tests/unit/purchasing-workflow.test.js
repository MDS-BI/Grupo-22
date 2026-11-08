import { describe, it, expect } from 'vitest';
import {
  ACTION_LABELS,
  PURCHASING_ERRORS,
  PURCHASE_TRANSITIONS,
  assertTransition,
  calculateLineSubtotal,
  calculateOrderTotals,
  canTransition,
  createStatusChange,
  getAvailableActionItems,
  getAvailableActions,
  isTerminalStatus,
  roundMoney,
  validatePurchaseOrderLine,
  validatePurchaseOrderLines
} from '../../src/domain/purchasing.js';

describe('purchasing line validation', () => {
  it('calculates subtotals and totals with two-decimal rounding', () => {
    expect(calculateLineSubtotal({ cantidad: 3, costo_unitario: 0.1 })).toBe(0.3);
    expect(calculateLineSubtotal({ cantidad: 2, costo_unitario: 1000 })).toBe(2000);
    const totals = calculateOrderTotals([
      { cantidad: 2, costo_unitario: 1000 },
      { cantidad: 3, costo_unitario: 500 }
    ]);
    expect(totals).toMatchObject({ neto: 3500, iva: 665, total: 4165, subtotal: 3500, totalAmount: 4165 });
  });

  it('rejects missing products, non-positive quantities, invalid costs and duplicates', () => {
    expect(validatePurchaseOrderLine({ cantidad: 1, costo_unitario: 10 }).errors.id_producto).toBeTruthy();
    expect(validatePurchaseOrderLine({ id_producto: 'p1', cantidad: 0, costo_unitario: 10 }).errors.cantidad).toBeTruthy();
    expect(validatePurchaseOrderLine({ id_producto: 'p1', cantidad: 1, costo_unitario: -1 }).errors.costo_unitario).toBeTruthy();
    const duplicate = validatePurchaseOrderLine(
      { id_producto: 'p1', cantidad: 1, costo_unitario: 10 },
      { existingLines: [{ id_producto: 'p1', cantidad: 2, costo_unitario: 5 }] }
    );
    expect(duplicate.errors.id_producto).toContain('mismo producto');
    expect(validatePurchaseOrderLines([], { requireLines: true }).errors[0].message).toBe(PURCHASING_ERRORS.NO_LINES);
  });
});

describe('purchasing status workflow', () => {
  it('exposes the canonical actions and terminal states', () => {
    expect(getAvailableActions('borrador')).toEqual(['pendiente', 'cancelado']);
    expect(getAvailableActions('pendiente')).toEqual(['aprobado', 'cancelado']);
    expect(getAvailableActions('aprobado')).toEqual(['recibido']);
    expect(getAvailableActions('recibido')).toEqual([]);
    expect(getAvailableActions('cancelado')).toEqual([]);
    expect(getAvailableActionItems('pendiente').map(item => item.label)).toEqual([
      ACTION_LABELS.aprobado,
      ACTION_LABELS.cancelado
    ]);
    expect(isTerminalStatus('recibido')).toBe(true);
    expect(isTerminalStatus('cancelado')).toBe(true);
    expect(isTerminalStatus('aprobado')).toBe(false);
  });

  it('rejects invalid and terminal transitions', () => {
    expect(canTransition('borrador', 'pendiente')).toBe(true);
    expect(canTransition('aprobado', 'cancelado')).toBe(false);
    expect(canTransition('recibido', 'cancelado')).toBe(false);
    expect(() => assertTransition('borrador', 'recibido')).toThrow(/no está permitida/i);
    expect(() => assertTransition('recibido', 'cancelado')).toThrow(/no está permitida/i);
    expect(PURCHASE_TRANSITIONS.aprobado).toEqual(['recibido']);
  });

  it('requires at least one line before sending a draft to review', () => {
    expect(() => assertTransition('borrador', 'pendiente', { hasLines: false })).toThrow(/al menos una línea/i);
    expect(assertTransition('borrador', 'pendiente', { hasLines: true })).toBe(true);
    expect(assertTransition('pendiente', 'aprobado', { hasLines: false })).toBe(true);
  });

  it('creates immutable history records for valid transitions only', () => {
    const change = createStatusChange('order-1', 'borrador', 'pendiente', '2026-11-07T12:00:00.000Z');
    expect(change).toMatchObject({
      id_orden_compra: 'order-1',
      from: 'borrador',
      to: 'pendiente',
      changedAt: '2026-11-07T12:00:00.000Z'
    });
    expect(() => createStatusChange('order-1', 'borrador', 'borrador')).toThrow(/no está permitida/i);
    expect(() => createStatusChange('order-1', 'recibido', 'cancelado')).toThrow(/no está permitida/i);
  });
});

describe('purchasing rounding helper', () => {
  it('rounds half values to two decimals', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
  });
});
