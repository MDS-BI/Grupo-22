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
import { loadDocuments, loadEntities, loadRubros } from '../../src/storage.js';
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

describe('datos de demostración', () => {
  it('crea al menos un empleado por cargo existente y datos únicos', () => {
    const result = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 14) });
    expect(result.ok).toBe(true);

    const cargos = new Set(loadEmployees().map(employee => String(employee.cargo || '').trim()).filter(Boolean));
    for (const user of loadUsers()) {
      if (user.cargo) expect(cargos.has(user.cargo)).toBe(true);
    }

    const suppliers = loadEntities().filter(entity => entity.name.startsWith('Demo '));
    const products = loadProducts().filter(product => product.nombre.startsWith('Demo '));
    const categories = loadCategories().filter(category => category.nombre.startsWith('Demo '));
    const rubros = loadRubros().filter(rubro => rubro.nombre.startsWith('Demo '));
    const folios = loadDocuments().map(document => String(document.folio));

    expect(unique(suppliers.map(entity => entity.code))).toBe(true);
    expect(unique(suppliers.map(entity => entity.name))).toBe(true);
    expect(unique(products.map(product => product.nombre))).toBe(true);
    expect(unique(categories.map(category => category.nombre))).toBe(true);
    expect(unique(rubros.map(rubro => rubro.nombre))).toBe(true);
    expect(unique(folios)).toBe(true);
    expect(result.created.orders.length).toBe(6);
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

  it('mantiene la carga aditiva con nombres, RUT y folios únicos al repetirla', () => {
    const first = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 14) });
    expect(first.ok).toBe(true);
    const afterFirst = snapshotCounts();

    const second = loadDemoData({ session: { role: 'gerente' }, today: new Date(2026, 10, 15) });
    expect(second.ok).toBe(true);
    const afterSecond = snapshotCounts();

    expect(afterSecond.entities).toBeGreaterThan(afterFirst.entities);
    expect(afterSecond.documents).toBeGreaterThan(afterFirst.documents);
    expect(afterSecond.products).toBeGreaterThan(afterFirst.products);
    expect(afterSecond.categories).toBeGreaterThan(afterFirst.categories);

    const suppliers = loadEntities();
    expect(unique(suppliers.map(entity => entity.code))).toBe(true);
    expect(unique(suppliers.map(entity => entity.name))).toBe(true);
    expect(unique(loadProducts().map(product => product.nombre))).toBe(true);
    expect(unique(loadDocuments().map(document => String(document.folio)))).toBe(true);
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
