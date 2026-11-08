import { describe, it, expect, beforeEach } from 'vitest';
import { addDocument, addEntity, loadDocuments } from '../../src/storage.js';
import {
  addCategory,
  addOrderHistory,
  addProduct,
  deletePurchaseOrder,
  loadOrderHistory,
  loadStatusHistory,
  replaceOrderLines,
  saveStatusHistory
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

function seedOrder() {
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
    status: 'borrador'
  });
  replaceOrderLines(order.id, [{ id_producto: product.id_producto, cantidad: 2, costo_unitario: 1000 }]);
  return order;
}

beforeEach(() => {
  installMemoryStorage();
});

describe('purchase order history persistence', () => {
  it('reads records chronologically without mutating the stored order', () => {
    const order = seedOrder();
    saveStatusHistory([
      { id: 'h2', id_orden_compra: order.id, from: 'pendiente', to: 'aprobado', changedAt: '2026-11-07T13:00:00.000Z' },
      { id: 'h1', id_orden_compra: order.id, from: 'borrador', to: 'pendiente', changedAt: '2026-11-07T12:00:00.000Z' }
    ]);
    const history = loadOrderHistory(order.id);
    expect(history.map(record => record.id)).toEqual(['h1', 'h2']);
    expect(loadStatusHistory().map(record => record.id)).toEqual(['h2', 'h1']);
  });

  it('appends successful changes and keeps previous records intact', () => {
    const order = seedOrder();
    const first = addOrderHistory(order.id, 'borrador', 'pendiente', '2026-11-07T12:00:00.000Z');
    addOrderHistory(order.id, 'pendiente', 'aprobado', '2026-11-07T13:00:00.000Z');
    const history = loadOrderHistory(order.id);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ ...first, from: 'borrador', to: 'pendiente' });
    expect(loadDocuments()[0].status).toBe('borrador');
  });

  it('removes history when the order is deleted', () => {
    const order = seedOrder();
    addOrderHistory(order.id, 'borrador', 'pendiente');
    deletePurchaseOrder(order.id);
    expect(loadStatusHistory()).toEqual([]);
    expect(() => loadOrderHistory(order.id)).toThrow(/no se encontró/i);
  });
});
