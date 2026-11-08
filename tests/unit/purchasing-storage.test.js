import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeConfig, PURCHASING_CONFIG, setActiveConfig } from '../../src/module-config.js';
import {
  addEntity,
  loadDocuments,
  saveDocuments
} from '../../src/storage.js';
import {
  addEmployee,
  addCategory,
  addProduct,
  updateProduct,
  deleteProduct,
  loadProducts,
  getLinesForOrder,
  savePurchaseOrder,
  getPurchaseOrderDetail,
  listPurchaseOrdersWithActions,
  getAvailableActionsForOrder,
  addOrUpdatePurchaseOrderLine,
  deletePurchaseOrderLine,
  changeOrderStatus,
  receivePurchaseOrder,
  loadOrderHistory,
  loadOrderMetadata,
  loadStatusHistory,
  loadPurchaseOrderLines,
  savePurchaseOrderLines,
  loadTransactions,
  beginTransaction,
  markTransactionApplied,
  recoverTransactions,
  deletePurchaseOrder,
  KEYS
} from '../../src/purchasing-storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

function seed({ secondProduct = true } = {}) {
  const category = addCategory({ nombre: 'Insumos' });
  const product = addProduct({
    nombre: 'Lápiz',
    unidad_medida: 'unidad',
    stock: 5,
    id_categoria: category.id_categoria
  });
  const other = secondProduct
    ? addProduct({
        nombre: 'Papel',
        unidad_medida: 'resma',
        stock: 2,
        id_categoria: category.id_categoria
      })
    : null;
  const employee = addEmployee({ nombre: 'Ana Pérez' });
  const supplier = addEntity({
    name: 'Proveedor Uno',
    code: '12.345.678-5',
    category: 'Insumos',
    paymentTerms: 'Contado'
  });
  return { category, product, other, employee, supplier };
}

function createOrder(seedData, overrides = {}) {
  return savePurchaseOrder({
    entityId: seedData.supplier.entity_id,
    id_empleado: seedData.employee.id_empleado,
    folio: 1001,
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    paymentTerms: 'Crédito 30 días',
    status: 'borrador',
    lines: [
      {
        id_producto: seedData.product.id_producto,
        cantidad: 2,
        costo_unitario: 1000
      }
    ],
    ...overrides
  });
}

beforeEach(() => {
  store.clear();
  setActiveConfig(normalizeConfig(PURCHASING_CONFIG).config);
});

describe('purchasing storage', () => {
  it('creates a purchase order with employee, metadata, line and computed totals', () => {
    const seedData = seed();
    const detail = createOrder(seedData);
    expect(detail.folio).toBe(1001);
    expect(detail.employee.nombre).toBe('Ana Pérez');
    expect(detail.supplier.name).toBe('Proveedor Uno');
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0].producto.nombre).toBe('Lápiz');
    expect(detail.totals).toMatchObject({ neto: 2000, iva: 380, total: 2380 });
    expect(loadOrderMetadata()[0].id_empleado).toBe(seedData.employee.id_empleado);
    expect(loadDocuments()[0].totalAmount).toBe(2380);
  });

  it('requires an employee and at least one line', () => {
    const seedData = seed();
    expect(() => createOrder(seedData, { id_empleado: '' })).toThrow(/empleado/i);
    expect(() => createOrder(seedData, { lines: [] })).toThrow(/al menos una línea/i);
  });

  it('rejects duplicate, missing and invalid products', () => {
    const seedData = seed();
    expect(() => createOrder(seedData, {
      lines: [
        { id_producto: seedData.product.id_producto, cantidad: 1, costo_unitario: 10 },
        { id_producto: seedData.product.id_producto, cantidad: 2, costo_unitario: 10 }
      ]
    })).toThrow(/ya está incluido/i);
    expect(() => createOrder(seedData, {
      lines: [{ id_producto: 'missing', cantidad: 1, costo_unitario: 10 }]
    })).toThrow(/ya no existe/i);
    expect(() => createOrder(seedData, {
      lines: [{ id_producto: seedData.product.id_producto, cantidad: 0, costo_unitario: 10 }]
    })).toThrow(/datos inválidos/i);
  });

  it('adds, updates and recalculates lines', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    addOrUpdatePurchaseOrderLine(order.id, {
      id_producto: seedData.other.id_producto,
      cantidad: 3,
      costo_unitario: 500
    });
    expect(getPurchaseOrderDetail(order.id).totals).toMatchObject({ neto: 3500, iva: 665, total: 4165 });
    addOrUpdatePurchaseOrderLine(order.id, {
      id_producto: seedData.product.id_producto,
      cantidad: 4,
      costo_unitario: 1000
    });
    expect(getPurchaseOrderDetail(order.id).totals).toMatchObject({ neto: 5500, iva: 1045, total: 6545 });
  });

  it('does not allow deleting the last line', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    expect(() => deletePurchaseOrderLine(order.id, seedData.product.id_producto)).toThrow(/al menos una línea/i);
    expect(getLinesForOrder(order.id)).toHaveLength(1);
  });

  it('returns not found for missing orders and lines', () => {
    expect(() => getLinesForOrder('missing')).toThrow(/No se encontró la orden/i);
    expect(() => getPurchaseOrderDetail('missing')).toThrow(/No se encontró la orden/i);
    expect(() => getAvailableActionsForOrder('missing')).toThrow(/No se encontró la orden/i);
    expect(() => loadOrderHistory('missing')).toThrow(/No se encontró la orden/i);
  });

  it('walks the canonical state machine and stores chronological history', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    expect(getAvailableActionsForOrder(order.id)).toEqual(['pendiente', 'cancelado']);
    changeOrderStatus(order.id, 'pendiente', '2026-11-07T10:00:00.000Z');
    changeOrderStatus(order.id, 'aprobado', '2026-11-07T11:00:00.000Z');
    const history = loadOrderHistory(order.id);
    expect(history.map(change => change.to)).toEqual(['pendiente', 'aprobado']);
    expect(history[0].changedAt).toBe('2026-11-07T10:00:00.000Z');
    expect(() => changeOrderStatus(order.id, 'cancelado')).toThrow(/no está permitida/i);
  });

  it('blocks sending to review when there are no valid lines', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    savePurchaseOrderLines([]);
    expect(() => changeOrderStatus(order.id, 'pendiente')).toThrow(/al menos una línea/i);
    expect(getPurchaseOrderDetail(order.id).status).toBe('borrador');
    expect(loadStatusHistory()).toHaveLength(0);
  });

  it('applies stock exactly once when receiving an approved order', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    changeOrderStatus(order.id, 'pendiente');
    changeOrderStatus(order.id, 'aprobado');
    const received = receivePurchaseOrder(order.id);
    expect(received.status).toBe('recibido');
    expect(received.stockApplied).toBe(true);
    expect(loadProducts().find(product => product.id_producto === seedData.product.id_producto).stock).toBe(7);
    expect(loadOrderHistory(order.id).map(change => change.to)).toEqual(['pendiente', 'aprobado', 'recibido']);
    expect(() => receivePurchaseOrder(order.id)).toThrow(/ya fue aplicada/i);
    expect(loadProducts().find(product => product.id_producto === seedData.product.id_producto).stock).toBe(7);
  });

  it('blocks editing and line changes on terminal orders', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    changeOrderStatus(order.id, 'cancelado');
    expect(() => createOrder(seedData, { id: order.id, folio: 1001 })).toThrow(/no puede modificarse/i);
    expect(() => addOrUpdatePurchaseOrderLine(order.id, {
      id_producto: seedData.product.id_producto,
      cantidad: 1,
      costo_unitario: 10
    })).toThrow(/no puede modificarse/i);
  });

  it('lists orders with actions and stock flags', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    const list = listPurchaseOrdersWithActions();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(order.id);
    expect(list[0].actions).toEqual(['pendiente', 'cancelado']);
    expect(list[0].employee.nombre).toBe('Ana Pérez');
  });

  it('rolls back a prepared transaction and clears applied transactions', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    const before = {
      documents: loadDocuments(),
      products: loadProducts(),
      metadata: loadOrderMetadata(),
      history: loadStatusHistory(),
      lines: loadPurchaseOrderLines()
    };
    beginTransaction({ type: 'transition', id_orden_compra: order.id, before, after: before });
    saveDocuments([]);
    const recovery = recoverTransactions();
    expect(recovery.recovered).toBe(1);
    expect(loadDocuments()).toHaveLength(1);
    expect(loadTransactions()).toEqual([]);

    const applied = beginTransaction({ type: 'transition', id_orden_compra: order.id, before, after: before });
    markTransactionApplied(applied);
    expect(recoverTransactions().cleared).toBe(1);
    expect(loadTransactions()).toEqual([]);
  });

  it('cascades order deletion without reverting applied stock', () => {
    const seedData = seed();
    const order = createOrder(seedData);
    changeOrderStatus(order.id, 'pendiente');
    changeOrderStatus(order.id, 'aprobado');
    receivePurchaseOrder(order.id);
    const stockAfterReceipt = loadProducts().find(product => product.id_producto === seedData.product.id_producto).stock;
    deletePurchaseOrder(order.id);
    expect(loadDocuments()).toEqual([]);
    expect(loadPurchaseOrderLines()).toEqual([]);
    expect(loadOrderMetadata()).toEqual([]);
    expect(loadStatusHistory()).toEqual([]);
    expect(loadProducts().find(product => product.id_producto === seedData.product.id_producto).stock).toBe(stockAfterReceipt);
  });

  it('validates product data and protects referenced products', () => {
    const seedData = seed();
    expect(() => addProduct({ nombre: '', unidad_medida: 'u', stock: 0, id_categoria: seedData.category.id_categoria })).toThrow(/nombre/i);
    expect(() => addProduct({ nombre: 'X', unidad_medida: 'u', stock: -1, id_categoria: seedData.category.id_categoria })).toThrow(/stock/i);
    expect(() => updateProduct(seedData.product.id_producto, { stock: -1 })).toThrow(/stock/i);
    const order = createOrder(seedData);
    expect(() => deleteProduct(seedData.product.id_producto)).toThrow(/referenciado/i);
    deletePurchaseOrder(order.id);
    expect(deleteProduct(seedData.product.id_producto)).toBe(true);
  });

  it('exposes stable storage keys', () => {
    expect(KEYS.lines).toBe('erp_purchasing:purchase-order-lines');
    expect(KEYS.statusHistory).toBe('erp_purchasing:status-history');
  });
});
