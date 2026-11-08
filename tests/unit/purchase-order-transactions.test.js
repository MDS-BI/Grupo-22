import { describe, it, expect, beforeEach } from 'vitest';
import { addDocument, addEntity, loadDocuments } from '../../src/storage.js';
import {
  addCategory,
  addProduct,
  beginTransaction,
  clearTransaction,
  loadOrderHistory,
  loadProducts,
  loadStatusHistory,
  loadTransactions,
  markTransactionApplied,
  receivePurchaseOrder,
  recoverTransactions,
  replaceOrderLines
} from '../../src/purchasing-storage.js';

function installMemoryStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    }
  };
}

function seedApprovedOrder() {
  const category = addCategory({ nombre: 'Insumos' });
  const product = addProduct({
    nombre: 'Lápiz',
    unidad_medida: 'unidad',
    stock: 5,
    id_categoria: category.id_categoria
  });
  const supplier = addEntity({
    name: 'Proveedor Uno',
    code: '12.345.678-5',
    category: 'Insumos',
    paymentTerms: 'Contado'
  });
  const order = addDocument({
    entityId: supplier.entity_id,
    folio: 1001,
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    paymentTerms: 'Contado',
    status: 'aprobado'
  });
  replaceOrderLines(order.id, [{ id_producto: product.id_producto, cantidad: 2, costo_unitario: 1000 }]);
  return { category, product, supplier, order };
}

beforeEach(() => {
  installMemoryStorage();
});

describe('transaction journal', () => {
  it('records prepared and applied phases and can be cleared', () => {
    const transaction = beginTransaction({ type: 'receipt', id_orden_compra: 'order-1', before: { products: [] }, after: { products: [] } });
    expect(transaction.phase).toBe('prepared');
    expect(loadTransactions()).toHaveLength(1);
    const applied = markTransactionApplied(transaction, '2026-11-07T12:00:00.000Z');
    expect(applied).toMatchObject({ phase: 'applied', appliedAt: '2026-11-07T12:00:00.000Z' });
    clearTransaction(transaction);
    expect(loadTransactions()).toEqual([]);
  });

  it('restores prepared snapshots and discards applied journal entries on recovery', () => {
    const { product, order } = seedApprovedOrder();
    const before = {
      documents: loadDocuments(),
      products: loadProducts(),
      metadata: [],
      history: [],
      lines: []
    };
    beginTransaction({ type: 'receipt', id_orden_compra: order.id, before });
    globalThis.localStorage.setItem(
      'erp_purchasing:products',
      JSON.stringify(loadProducts().map(item => ({ ...item, stock: 999 })))
    );
    const applied = beginTransaction({ type: 'transition', id_orden_compra: order.id, before: null });
    markTransactionApplied(applied);
    const result = recoverTransactions();
    expect(result).toMatchObject({ recovered: 1, cleared: 1, total: 2, errors: [] });
    expect(loadProducts().find(item => item.id_producto === product.id_producto).stock).toBe(5);
    expect(loadTransactions()).toEqual([]);
  });
});

describe('purchase order receipt transaction', () => {
  it('applies stock and history once and is idempotent', () => {
    const { product, order } = seedApprovedOrder();
    receivePurchaseOrder(order.id, '2026-11-07T12:00:00.000Z');
    expect(loadDocuments()[0].status).toBe('recibido');
    expect(loadProducts().find(item => item.id_producto === product.id_producto).stock).toBe(7);
    expect(loadStatusHistory()).toHaveLength(1);
    expect(loadTransactions()).toEqual([]);
    expect(() => receivePurchaseOrder(order.id)).toThrow(/ya fue aplicada/i);
    expect(loadProducts().find(item => item.id_producto === product.id_producto).stock).toBe(7);
    expect(loadStatusHistory()).toHaveLength(1);
  });

  it('rolls back products, status and history when persistence fails', () => {
    const { product, order } = seedApprovedOrder();
    const originalSetItem = globalThis.localStorage.setItem.bind(globalThis.localStorage);
    let writes = 0;
    globalThis.localStorage.setItem = (key, value) => {
      writes += 1;
      if (writes === 2) throw new Error('fallo simulado');
      originalSetItem(key, value);
    };
    expect(() => receivePurchaseOrder(order.id)).toThrow(/se restauró el estado anterior/i);
    globalThis.localStorage.setItem = originalSetItem;
    expect(loadDocuments()[0].status).toBe('aprobado');
    expect(loadProducts().find(item => item.id_producto === product.id_producto).stock).toBe(5);
    expect(loadStatusHistory()).toEqual([]);
    expect(loadTransactions()).toEqual([]);
  });

  it('does not receive orders that are not approved or have no lines', () => {
    const { order, supplier } = seedApprovedOrder();
    const empty = addDocument({
      entityId: supplier.entity_id,
      folio: 1002,
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      paymentTerms: 'Contado',
      status: 'aprobado'
    });
    expect(() => receivePurchaseOrder(empty.id)).toThrow(/al menos una línea/i);
    const draft = addDocument({
      entityId: supplier.entity_id,
      folio: 1003,
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      paymentTerms: 'Contado',
      status: 'borrador'
    });
    expect(() => receivePurchaseOrder(draft.id)).toThrow(/no está permitida/i);
    expect(order.status).toBe('aprobado');
  });
});
