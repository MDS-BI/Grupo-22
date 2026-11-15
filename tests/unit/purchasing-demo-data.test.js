import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../helpers/purchasing-app.js';
import {
  PURCHASING_CONFIG,
  normalizeConfig,
  setActiveConfig
} from '../../src/module-config.js';
import {
  loadCategories,
  loadEmployees,
  loadProducts,
  loadPurchaseOrderLines,
  loadStatusHistory,
  getPurchaseOrderDetail
} from '../../src/purchasing-storage.js';
import { loadDocuments, loadEntities, loadRubros, validateRut } from '../../src/storage.js';
import { PERMISSIONS, ROLE_DEFINITIONS, loadUsers } from '../../src/auth.js';
import { loadDemoData } from '../../src/purchasing-demo-data.js';

let dom;

beforeEach(() => {
  dom = installDom();
  setActiveConfig(normalizeConfig(PURCHASING_CONFIG).config);
});

function snapshotCounts() {
  return {
    entities: loadEntities().length,
    documents: loadDocuments().length,
    employees: loadEmployees().length,
    products: loadProducts().length,
    categories: loadCategories().length,
    rubros: loadRubros().length,
    lines: loadPurchaseOrderLines().length,
    history: loadStatusHistory().length
  };
}

function unique(values) {
  return new Set(values).size === values.length;
}

function normalizedRut(value) {
  return String(value ?? '').replace(/[.\s]/g, '').toUpperCase();
}

function todayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('datos de demostración', () => {
  it('crea un empleado por cargo y el dataset completo, único y coherente', () => {
    const today = new Date(2026, 10, 14);
    const result = loadDemoData({ session: { role: 'administrador' }, today });
    expect(result.ok).toBe(true);

    const cargos = new Set(loadEmployees().map(employee => String(employee.cargo || '').trim()).filter(Boolean));
    for (const user of loadUsers()) {
      if (user.cargo) expect(cargos.has(user.cargo)).toBe(true);
    }

    const suppliers = loadEntities().filter(entity => entity.name.startsWith('Demo '));
    const national = suppliers.filter(entity => entity.origin === 'Nacional');
    const foreign = suppliers.filter(entity => entity.origin === 'Extranjero');
    const products = loadProducts().filter(product => product.nombre.startsWith('Demo '));
    const categories = loadCategories().filter(category => category.nombre.startsWith('Demo '));
    const rubros = loadRubros().filter(rubro => rubro.nombre.startsWith('Demo '));
    const folios = loadDocuments().map(document => String(document.folio));

    expect(suppliers).toHaveLength(8);
    expect(national).toHaveLength(6);
    expect(foreign).toHaveLength(2);
    expect(unique(national.map(entity => normalizedRut(entity.code)))).toBe(true);
    expect(national.every(entity => validateRut(entity.code))).toBe(true);
    expect(foreign.every(entity => String(entity.foreignTaxId || '').trim().length > 0)).toBe(true);
    expect(unique(foreign.map(entity => entity.foreignTaxId))).toBe(true);
    expect(unique(suppliers.map(entity => entity.name))).toBe(true);

    expect(rubros).toHaveLength(3);
    expect(new Set(suppliers.flatMap(entity => entity.rubro_ids || [])).size).toBeGreaterThanOrEqual(3);
    expect(suppliers.some(entity => (entity.rubro_ids || []).length >= 2)).toBe(true);
    expect(new Set(suppliers.map(entity => entity.paymentTerms)).size).toBeGreaterThanOrEqual(3);

    expect(categories).toHaveLength(5);
    expect(products).toHaveLength(15);
    expect(unique(categories.map(category => category.nombre))).toBe(true);
    expect(unique(products.map(product => product.nombre))).toBe(true);
    expect(products.every(product => String(product.unidad_medida || '').trim().length > 0)).toBe(true);
    expect(products.every(product => Number.isInteger(Number(product.stock)) && Number(product.stock) >= 0)).toBe(true);
    expect(products.filter(product => Number(product.stock) === 0).length).toBeGreaterThanOrEqual(2);
    expect(new Set(products.filter(product => Number(product.stock) > 0).map(product => Number(product.stock))).size)
      .toBeGreaterThanOrEqual(3);

    expect(result.created.orders).toHaveLength(12);
    expect(unique(folios)).toBe(true);

    const details = result.created.orders.map(orderId => getPurchaseOrderDetail(orderId));
    const statuses = new Set(details.map(order => order.status));
    expect(statuses).toEqual(new Set(['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado']));

    const key = todayKey(today);
    const overdue = details.filter(order =>
      order.endDate && order.endDate < key && !['recibido', 'cancelado'].includes(order.status)
    );
    expect(overdue.length).toBeGreaterThanOrEqual(2);

    const foreignOrder = details.find(order => order.origin === 'Extranjero');
    expect(foreignOrder).toBeTruthy();
    expect(foreignOrder.currency).toBe('USD');
    expect(foreignOrder.taxRate).toBe(0);

    const requesterIds = new Set(details.map(order => order.metadata?.id_empleado).filter(Boolean));
    expect(requesterIds.size).toBeGreaterThanOrEqual(3);

    const buyerEmployee = loadEmployees().find(employee => String(employee.userId || '').toUpperCase() === 'DEMO-COMPRADOR');
    expect(buyerEmployee).toBeTruthy();
    const buyerOrderId = buyerEmployee.id_empleado || buyerEmployee.id;
    expect(details.filter(order => order.metadata?.id_empleado === buyerOrderId).length).toBeGreaterThanOrEqual(3);
    expect(details.filter(order => order.metadata?.id_empleado !== buyerOrderId).length).toBeGreaterThanOrEqual(3);

    for (const order of details) {
      if (['aprobado', 'recibido'].includes(order.status)) expect(order.startDate).toBeTruthy();
      else expect(order.startDate).toBeFalsy();
      if (order.status === 'recibido') {
        expect(order.stockApplied).toBe(true);
        expect(order.metadata?.appliedAt).toBeTruthy();
      }
    }
  });

  it('respeta los límites de estado según los permisos del rol', () => {
    const original = [...ROLE_DEFINITIONS.gerente.permissions];
    ROLE_DEFINITIONS.gerente.permissions = original.filter(permission =>
      permission !== PERMISSIONS.ORDERS_APPROVE && permission !== PERMISSIONS.ORDERS_RECEIVE
    );
    try {
      const result = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 14) });
      expect(result.ok).toBe(true);
      expect(result.limitations.length).toBeGreaterThan(0);

      const statuses = result.created.orders.map(orderId => getPurchaseOrderDetail(orderId).status);
      expect(statuses).not.toContain('aprobado');
      expect(statuses).not.toContain('recibido');
      expect(statuses).toContain('borrador');
      expect(statuses).toContain('pendiente');
      expect(statuses).toContain('cancelado');
    } finally {
      ROLE_DEFINITIONS.gerente.permissions = original;
    }
  });

  it('rechaza la carga para un rol que no puede gestionar productos', () => {
    const before = snapshotCounts();
    const result = loadDemoData({ session: { role: 'comprador' } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('permisos');
    expect(snapshotCounts()).toEqual(before);
  });

  it('genera el conjunto completo de estados para un rol con todos los permisos', () => {
    const result = loadDemoData({ session: { role: 'administrador' }, today: new Date(2026, 10, 14) });
    expect(result.ok).toBe(true);
    expect(result.limitations).toEqual([]);
    const statuses = result.created.orders.map(orderId => getPurchaseOrderDetail(orderId).status);
    expect(new Set(statuses)).toEqual(new Set(['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado']));
  });

  it('exige confirmación y reemplaza sin mezclar datos al repetir la carga', () => {
    const first = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 14) });
    expect(first.ok).toBe(true);
    const afterFirst = snapshotCounts();

    const blocked = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 15) });
    expect(blocked.ok).toBe(false);
    expect(blocked.requiresConfirmation).toBe(true);
    expect(blocked.error).toContain('Confirma');
    expect(snapshotCounts()).toEqual(afterFirst);

    const second = loadDemoData({
      session: { role: 'gerente' },
      today: new Date(2026, 10, 15),
      replaceExisting: true
    });
    expect(second.ok).toBe(true);
    expect(snapshotCounts()).toEqual(afterFirst);

    const suppliers = loadEntities();
    const national = suppliers.filter(entity => entity.origin === 'Nacional');
    expect(unique(national.map(entity => normalizedRut(entity.code)))).toBe(true);
    expect(unique(suppliers.map(entity => entity.name))).toBe(true);
    expect(unique(loadProducts().map(product => product.nombre))).toBe(true);
    expect(unique(loadDocuments().map(document => String(document.folio)))).toBe(true);
  });

  it('restaura el conjunto previo si falla durante la sustitución', () => {
    const before = snapshotCounts();
    const usersBefore = loadUsers().map(user => user.userId);

    const result = loadDemoData({
      session: { role: 'administrador' },
      today: new Date(2026, 10, 14),
      onBeforeCreate() {
        throw new Error('fallo inyectado');
      }
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('fallo inyectado');
    expect(snapshotCounts()).toEqual(before);
    expect(loadUsers().map(user => user.userId)).toEqual(usersBefore);
  });

  it('rechaza la carga sin permisos sin mutar datos', () => {
    const before = snapshotCounts();
    const result = loadDemoData({ session: { role: 'consulta' } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('permisos');
    expect(snapshotCounts()).toEqual(before);
  });

  it('conserva el comportamiento permisivo sin sesión', () => {
    const result = loadDemoData({ today: new Date(2026, 10, 14) });
    expect(result.ok).toBe(true);
    expect(result.limitations).toEqual([]);
  });
});
