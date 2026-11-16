import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, loadDocuments, loadEntities, updateEntity } from '../../src/storage.js';
import { clearSession, ensureDefaultUsers, login, permissionsFor } from '../../src/auth.js';
import { PURCHASING_CONFIG, normalizeConfig, setActiveConfig } from '../../src/module-config.js';
import * as storage from '../../src/purchasing-storage.js';
import * as management from '../../src/purchasing-management.js';

function installMemoryStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    get length() { return data.size; }
  };
}

let seed;

beforeEach(() => {
  installMemoryStorage();
  setActiveConfig(normalizeConfig(PURCHASING_CONFIG).config);
  clearSession();
  const category = storage.addCategory({ nombre: 'Insumos' });
  const uno = addEntity({ name: 'Proveedor Uno', code: '12.345.678-5', origin: 'Nacional', category: 'Insumos', paymentTerms: 'Contado' });
  const dos = addEntity({ name: 'Proveedor Dos', code: '11.111.111-1', origin: 'Nacional', category: 'Insumos', paymentTerms: '30 días' });
  const employee = storage.addEmployee({ nombre: 'Ana Pérez' });
  const lapiz = storage.createProductWithSupplierPrices(
    { nombre: 'Lápiz', unidad_medida: 'unidad', stock: 2, stock_minimo: 5, id_categoria: category.id_categoria },
    [{ entity_id: uno.entity_id, precio: 1000, tramos: [{ desde: 1, precio: 1000 }, { desde: 10, precio: 900 }] }, { entity_id: dos.entity_id, precio: 950 }]
  );
  const papel = storage.createProductWithSupplierPrices(
    { nombre: 'Papel', unidad_medida: 'resma', stock: 1, stock_minimo: 3, id_categoria: category.id_categoria },
    [{ entity_id: dos.entity_id, precio: 4000 }]
  );
  seed = { category, uno, dos, employee, lapiz, papel };
});

describe('007 · base', () => {
  it('declara permisos nuevos con paridad Gerente–Administrador y conserva campos nuevos', () => {
    expect([...permissionsFor('gerente')]).toEqual(expect.arrayContaining(['reports.view', 'budgets.manage']));
    expect([...permissionsFor('comprador')]).not.toContain('reports.view');
    expect(storage.loadProducts().find(item => item.nombre === 'Lápiz').stock_minimo).toBe(5);
    updateEntity(seed.uno.id, { ...seed.uno, estado: 'inactivo' });
    expect(loadEntities().find(item => item.id === seed.uno.id).estado).toBe('inactivo');
    expect(() => storage.updateProduct(seed.lapiz.id_producto, { stock_minimo: -1 })).toThrow(/stock mínimo/);
  });
});

describe('007 · compra por producto (US7)', () => {
  it('compara proveedores con el tramo aplicable y crea una solicitud por proveedor', () => {
    expect(management.getPurchaseOptions(seed.lapiz.id_producto, 5).map(option => [option.proveedor, option.precioUnitario])).toEqual([['Proveedor Dos', 950], ['Proveedor Uno', 1000]]);
    expect(management.getPurchaseOptions(seed.lapiz.id_producto, 10)[0]).toMatchObject({ proveedor: 'Proveedor Uno', precioUnitario: 900, tramo: 10, mejor: true });
    const created = management.createRequestsFromCart([
      { entity_id: seed.uno.entity_id, id_producto: seed.lapiz.id_producto, cantidad: 6 },
      { entity_id: seed.uno.entity_id, id_producto: seed.lapiz.id_producto, cantidad: 6 },
      { entity_id: seed.dos.entity_id, id_producto: seed.papel.id_producto, cantidad: 2 }
    ], { id_empleado: seed.employee.id_empleado });
    expect(created).toHaveLength(2);
    expect(created[0].lines[0]).toMatchObject({ cantidad: 12, costo_unitario: 900 });
    expect(created[1].lines[0]).toMatchObject({ cantidad: 2, costo_unitario: 4000 });
  });

  it('no crea ninguna solicitud si una falla', () => {
    updateEntity(seed.dos.id, { ...seed.dos, estado: 'inactivo' });
    expect(() => management.createRequestsFromCart([
      { entity_id: seed.uno.entity_id, id_producto: seed.lapiz.id_producto, cantidad: 1 },
      { entity_id: seed.dos.entity_id, id_producto: seed.papel.id_producto, cantidad: 1 }
    ], { id_empleado: seed.employee.id_empleado })).toThrow(expect.objectContaining({ code: 'SUPPLIER_INACTIVE' }));
    expect(loadDocuments()).toHaveLength(0);
  });

  it('valida y guarda tramos por proveedor', () => {
    const saved = management.setSupplierPriceTiers(seed.dos.entity_id, seed.papel.id_producto, [{ desde: 1, precio: 4000 }, { desde: 5, precio: 3500 }]);
    expect(saved.tramos).toHaveLength(2);
    expect(() => management.setSupplierPriceTiers(seed.dos.entity_id, seed.papel.id_producto, [{ desde: 5, precio: 1 }])).toThrow(/desde 1/);
  });
});

describe('007 · reposición (US2)', () => {
  it('lista bajo mínimo y genera borradores por proveedor sin duplicar', () => {
    expect(management.listBelowMinimum().map(item => [item.product.nombre, item.quantity])).toEqual([['Lápiz', 8], ['Papel', 5]]);
    const result = management.createSuggestedRequests({ id_empleado: seed.employee.id_empleado });
    expect(result.created).toHaveLength(1);
    expect(result.created[0].lines.map(line => [line.cantidad, line.costo_unitario])).toEqual([[8, 950], [5, 4000]]);
    expect(management.listBelowMinimum().every(item => item.inRequest)).toBe(true);
    expect(management.createSuggestedRequests({ id_empleado: seed.employee.id_empleado }).created).toHaveLength(0);
  });
});

describe('007 · áreas y presupuesto (US4)', () => {
  it('exige área cuando hay áreas activas y calcula el presupuesto al aprobar', () => {
    const area = management.saveArea({ nombre: 'Operaciones' });
    expect(() => management.saveArea({ nombre: 'operaciones' })).toThrow(/Ya existe/);
    const month = new Date().toISOString().slice(0, 7);
    management.setBudget(area.id_area, month, 5000);
    expect(() => storage.savePurchaseOrder({ entityId: seed.dos.entity_id, id_empleado: seed.employee.id_empleado, endDate: '2099-01-01', lines: [{ id_producto: seed.papel.id_producto, cantidad: 1 }] }))
      .toThrow(expect.objectContaining({ code: 'AREA_REQUIRED' }));
    const order = storage.savePurchaseOrder({ entityId: seed.dos.entity_id, id_empleado: seed.employee.id_empleado, id_area: area.id_area, endDate: '2099-01-01', lines: [{ id_producto: seed.papel.id_producto, cantidad: 2 }] });
    storage.changeOrderStatus(order.id, 'pendiente');
    const status = management.getAreaBudgetForOrder(order.id);
    expect(status).toMatchObject({ defined: true, budget: 5000, spent: 0, available: 5000, exceeds: true });
    expect(status.excessAmount).toBe(9520 - 5000);
    expect(management.budgetAlerts()).toHaveLength(1);
    storage.changeOrderStatus(order.id, 'aprobado');
    expect(management.getAreaBudgetForOrder(order.id)).toMatchObject({ spent: 9520, available: -4520 });
    management.setAreaActive(area.id_area, false);
    expect(storage.savePurchaseOrder({ entityId: seed.dos.entity_id, id_empleado: seed.employee.id_empleado, endDate: '2099-01-01', lines: [{ id_producto: seed.papel.id_producto, cantidad: 1 }] }).id).toBeTruthy();
  });

  it('restringe áreas y presupuestos a budgets.manage', () => {
    ensureDefaultUsers();
    login('COMP-001');
    expect(() => management.saveArea({ nombre: 'X' })).toThrow(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
    login('GER-001');
    expect(management.saveArea({ nombre: 'X' }).nombre).toBe('X');
  });
});

describe('007 · mejoras rápidas (US6) y avisos (US5)', () => {
  it('duplica con precios vigentes y bloquea proveedores inactivos', () => {
    const order = storage.savePurchaseOrder({ entityId: seed.uno.entity_id, id_empleado: seed.employee.id_empleado, endDate: '2099-01-01', lines: [{ id_producto: seed.lapiz.id_producto, cantidad: 10 }] });
    storage.upsertSupplierPrice({ entity_id: seed.uno.entity_id, id_producto: seed.lapiz.id_producto, precio: 1100 });
    const { order: copy, omitted } = management.duplicatePurchaseOrder(order.id);
    expect(copy.id).not.toBe(order.id);
    expect(copy.folio).toBe(order.folio + 1);
    expect(copy.lines[0].costo_unitario).toBe(1100);
    expect(omitted).toEqual([]);
    management.setSupplierStatus(seed.uno.id, 'inactivo');
    expect(() => management.duplicatePurchaseOrder(order.id)).toThrow(expect.objectContaining({ code: 'SUPPLIER_INACTIVE' }));
    expect(management.ordersCountForSupplier(seed.uno.entity_id)).toBe(2);
  });

  it('guarda lecturas de avisos por usuario', () => {
    management.markNotificationsRead('GER-001', ['a', 'b']);
    management.markNotificationsRead('GER-001', ['b', 'c']);
    expect(management.loadNotificationReads('GER-001')).toEqual(['a', 'b', 'c']);
    expect(management.loadNotificationReads('COMP-001')).toEqual([]);
  });
});
