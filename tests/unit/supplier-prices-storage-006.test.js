import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, loadDocuments } from '../../src/storage.js';
import { clearSession, ensureDefaultUsers, login } from '../../src/auth.js';
import { PURCHASING_CONFIG, normalizeConfig, setActiveConfig } from '../../src/module-config.js';
import {
  KEYS,
  addCategory,
  addEmployee,
  addProduct,
  changeOrderStatus,
  clearPurchasingData,
  createProductWithSupplierPrices,
  deleteProduct,
  deleteSupplierPrice,
  getLinesForOrder,
  getSupplierPriceList,
  getSupplierPricesForProduct,
  getSupplierSummary,
  loadProducts,
  loadSupplierPrices,
  replaceOrderLines,
  savePurchaseOrder,
  setProductSupplierPrices,
  upsertSupplierPrice
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

let seed;

function seedBase() {
  const category = addCategory({ nombre: 'Insumos' });
  const national = addEntity({ name: 'Proveedor Uno', code: '12.345.678-5', origin: 'Nacional', category: 'Insumos', paymentTerms: 'Contado' });
  const other = addEntity({ name: 'Proveedor Dos', code: '11.111.111-1', origin: 'Nacional', category: 'Insumos', paymentTerms: '30 días' });
  const foreign = addEntity({ name: 'Foreign Co.', origin: 'Extranjero', foreignTaxId: 'SG-1', category: 'Insumos', paymentTerms: '60 días' });
  const employee = addEmployee({ nombre: 'Ana Pérez' });
  return { category, national, other, foreign, employee };
}

function newProduct(nombre = 'Lápiz', links = []) {
  return createProductWithSupplierPrices(
    { nombre, unidad_medida: 'unidad', stock: 5, id_categoria: seed.category.id_categoria },
    links
  );
}

function order(entityId, lines, overrides = {}) {
  return savePurchaseOrder({
    entityId,
    id_empleado: seed.employee.id_empleado,
    endDate: '2026-12-10',
    paymentTerms: 'Contado',
    lines,
    ...overrides
  });
}

beforeEach(() => {
  installMemoryStorage();
  setActiveConfig(normalizeConfig(PURCHASING_CONFIG).config);
  clearSession();
  seed = seedBase();
});

describe('006 · creación de productos vinculados a proveedores', () => {
  it('crea el producto y sus precios acordados con uno o más proveedores', () => {
    const product = newProduct('Lápiz', [
      { entity_id: seed.national.entity_id, precio: 1200 },
      { entity_id: seed.foreign.entity_id, precio: 1.5, moneda: 'EUR' }
    ]);
    expect(product.supplierPrices).toHaveLength(2);
    expect(getSupplierPricesForProduct(product.id_producto)).toEqual(expect.arrayContaining([
      expect.objectContaining({ entity_id: seed.national.entity_id, precio: 1200, moneda: 'CLP' }),
      expect.objectContaining({ entity_id: seed.foreign.entity_id, precio: 1.5, moneda: 'EUR' })
    ]));
    expect(KEYS.supplierPrices).toBe('erp_purchasing:supplier-prices');
  });

  it('con sesión exige al menos un proveedor y no persiste nada si falla', () => {
    ensureDefaultUsers();
    login('GER-001');
    expect(() => newProduct('Sin proveedor', [])).toThrow(/al menos a un proveedor/);
    expect(() => newProduct('Precio malo', [{ entity_id: seed.national.entity_id, precio: -1 }])).toThrow(/mayor que cero/);
    expect(loadProducts()).toHaveLength(0);
    expect(loadSupplierPrices()).toHaveLength(0);
    expect(newProduct('Con proveedor', [{ entity_id: seed.national.entity_id, precio: 900 }]).supplierPrices).toHaveLength(1);
  });

  it('solo Gerente y Administrador mantienen las listas de precios', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    ensureDefaultUsers();
    for (const userId of ['BOD-001', 'COMP-001', 'CONS-001']) {
      login(userId);
      expect(() => upsertSupplierPrice({ entity_id: seed.other.entity_id, id_producto: product.id_producto, precio: 5 }))
        .toThrow(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
      expect(() => newProduct(`Nuevo ${userId}`, [{ entity_id: seed.national.entity_id, precio: 10 }]))
        .toThrow(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
    }
    for (const userId of ['GER-001', 'ADMIN-001']) {
      login(userId);
      expect(upsertSupplierPrice({ entity_id: seed.other.entity_id, id_producto: product.id_producto, precio: 950 }).precio).toBe(950);
    }
    expect(getSupplierPricesForProduct(product.id_producto)).toHaveLength(2);
  });

  it('reemplaza vínculos, impide quitar el último con sesión y limpia la lista al eliminar el producto', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    setProductSupplierPrices(product.id_producto, [{ entity_id: seed.other.entity_id, precio: 980 }]);
    expect(getSupplierPricesForProduct(product.id_producto).map(entry => entry.entity_id)).toEqual([seed.other.entity_id]);
    ensureDefaultUsers();
    login('GER-001');
    expect(() => deleteSupplierPrice(seed.other.entity_id, product.id_producto)).toThrow(/al menos a un proveedor/);
    expect(() => setProductSupplierPrices(product.id_producto, [])).toThrow(/al menos a un proveedor/);
    clearSession();
    deleteProduct(product.id_producto);
    expect(loadSupplierPrices()).toHaveLength(0);
  });
});

describe('006 · órdenes con lista de precios', () => {
  it('fija el precio de la línea desde la lista e ignora el precio enviado', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1200 }]);
    const detail = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 3, costo_unitario: 1 }]);
    expect(detail.lines[0].costo_unitario).toBe(1200);
    expect(detail.totals.neto).toBe(3600);
    expect(detail.totals.total).toBe(4284);
  });

  it('rechaza productos que no están en la lista del proveedor elegido', () => {
    const own = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1200 }]);
    const foreignOnly = newProduct('Chip', [{ entity_id: seed.other.entity_id, precio: 50 }]);
    expect(() => order(seed.national.entity_id, [
      { id_producto: own.id_producto, cantidad: 1 },
      { id_producto: foreignOnly.id_producto, cantidad: 1 }
    ])).toThrow(expect.objectContaining({ code: 'PRODUCT_NOT_IN_PRICE_LIST' }));
    expect(loadDocuments()).toHaveLength(0);
  });

  it('respeta la moneda del precio acordado en proveedores extranjeros', () => {
    const product = newProduct('Chip', [{ entity_id: seed.foreign.entity_id, precio: 3, moneda: 'EUR' }]);
    expect(() => order(seed.foreign.entity_id, [{ id_producto: product.id_producto, cantidad: 2 }], { currency: 'USD' }))
      .toThrow(expect.objectContaining({ code: 'PRICE_CURRENCY_MISMATCH' }));
    const detail = order(seed.foreign.entity_id, [{ id_producto: product.id_producto, cantidad: 2 }], { currency: 'EUR' });
    expect(detail.currency).toBe('EUR');
    expect(detail.totals.total).toBe(6);
  });

  it('reprecia al editar líneas y conserva el precio manual en proveedores sin lista (002)', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    const detail = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }]);
    upsertSupplierPrice({ entity_id: seed.national.entity_id, id_producto: product.id_producto, precio: 1100 });
    replaceOrderLines(detail.id, [{ id_producto: product.id_producto, cantidad: 2, costo_unitario: 5 }]);
    expect(getLinesForOrder(detail.id)[0].costo_unitario).toBe(1100);

    const legacy = addProduct({ nombre: 'Clip', unidad_medida: 'caja', stock: 1, id_categoria: seed.category.id_categoria });
    const manual = order(seed.foreign.entity_id, [{ id_producto: legacy.id_producto, cantidad: 1, costo_unitario: 77 }]);
    expect(getSupplierPriceList(seed.foreign.entity_id)).toHaveLength(0);
    expect(manual.lines[0].costo_unitario).toBe(77);
  });
});

describe('006 · folios automáticos', () => {
  it('asigna el número de solicitud correlativo y el folio OC solo al aprobar', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    const first = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }]);
    const second = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }]);
    expect([first.folio, second.folio]).toEqual([1, 2]);
    expect(first.ocFolio).toBeUndefined();

    changeOrderStatus(second.id, 'pendiente');
    expect(loadDocuments().find(document => document.id === second.id).ocFolio).toBeUndefined();
    changeOrderStatus(second.id, 'aprobado');
    changeOrderStatus(first.id, 'pendiente');
    changeOrderStatus(first.id, 'aprobado');
    const documents = loadDocuments();
    expect(documents.find(document => document.id === second.id).ocFolio).toBe(1);
    expect(documents.find(document => document.id === first.id).ocFolio).toBe(2);

    changeOrderStatus(second.id, 'recibido');
    expect(loadDocuments().find(document => document.id === second.id).ocFolio).toBe(1);
  });

  it('conserva un folio informado explícitamente (compatibilidad con 001)', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    expect(order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }], { folio: 4001 }).folio).toBe(4001);
    expect(order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }]).folio).toBe(4002);
  });
});

describe('006 · ficha del proveedor', () => {
  it('resume historial y monto comprado solo con OC emitidas', () => {
    const product = newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    const draft = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 1 }]);
    const approved = order(seed.national.entity_id, [{ id_producto: product.id_producto, cantidad: 2 }]);
    changeOrderStatus(approved.id, 'pendiente');
    changeOrderStatus(approved.id, 'aprobado');
    const summary = getSupplierSummary(seed.national.entity_id);
    expect(summary.orders.map(item => item.id)).toEqual(expect.arrayContaining([draft.id, approved.id]));
    expect(summary.emittedCount).toBe(1);
    expect(summary.totalsByCurrency).toEqual({ CLP: 2380 });
    expect(summary.priceList).toHaveLength(1);
    expect(getSupplierSummary('no-existe')).toBeNull();
  });

  it('borra las listas de precios al limpiar los datos del módulo', () => {
    newProduct('Lápiz', [{ entity_id: seed.national.entity_id, precio: 1000 }]);
    clearPurchasingData();
    expect(loadSupplierPrices()).toEqual([]);
  });
});
