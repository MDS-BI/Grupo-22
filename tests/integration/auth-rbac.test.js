import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom, qs } from '../helpers/purchasing-app.js';

const styles = fs.readFileSync(fileURLToPath(new URL('../../src/styles.css', import.meta.url)), 'utf8');
const PERMISSION_DENIED = 'No tienes permisos para ejecutar esta acción.';

let dom;

beforeEach(() => {
  dom = installDom();
  const style = dom.window.document.createElement('style');
  style.textContent = styles;
  dom.window.document.head.appendChild(style);
});

function expectHidden(id) {
  const element = qs(id);
  expect(element).not.toBeNull();
  expect(element.hidden).toBe(true);
  expect(dom.window.getComputedStyle(element).display).toBe('none');
}

function expectVisible(id) {
  const element = qs(id);
  expect(element).not.toBeNull();
  expect(element.hidden).toBe(false);
  expect(dom.window.getComputedStyle(element).display).not.toBe('none');
}

afterEach(() => {
  dom.window.close();
});

function submitLogin(userId) {
  qs('login-user-id').value = userId;
  qs('login-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function bootAndLogin(userId) {
  vi.resetModules();
  const app = await import('../../src/app.js');
  await app.boot();
  if (userId !== undefined) {
    submitLogin(userId);
    await settle();
  }
  return app;
}

async function seedApprovedOrder() {
  const purchasing = await import('../../src/purchasing-storage.js');
  const storage = await import('../../src/storage.js');
  const category = purchasing.addCategory({ nombre: 'Insumos' });
  const product = purchasing.addProduct({
    nombre: 'Lápiz',
    unidad_medida: 'unidad',
    stock: 5,
    id_categoria: category.id_categoria
  });
  const employee = purchasing.addEmployee({ nombre: 'Ana Pérez' });
  const supplier = storage.addEntity({
    name: 'Proveedor Uno',
    code: '12.345.678-5',
    category: 'Insumos',
    paymentTerms: 'Contado'
  });
  const order = purchasing.savePurchaseOrder({
    entityId: supplier.entity_id,
    id_empleado: employee.id_empleado,
    folio: 1001,
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    paymentTerms: 'Contado',
    status: 'aprobado',
    lines: [{ id_producto: product.id_producto, cantidad: 2, costo_unitario: 1000 }]
  });
  return { purchasing, storage, order, category, product, employee, supplier };
}

function openOrderDetail() {
  qs('nav-documents').click();
  qs('document-table-body').querySelector('[data-action="view-order"]').click();
}

function transitionStatuses() {
  return [...qs('order-actions').querySelectorAll('[data-action="transition"]')].map(button => button.dataset.nextStatus);
}

describe('User ID login flow', () => {
  it('shows the access gate until a valid User ID authenticates', async () => {
    await bootAndLogin();
    expectVisible('auth-gate');
    expectHidden('app-shell');

    submitLogin('NO-EXISTE');
    await settle();
    expect(qs('login-error').textContent).toContain('no está registrado');
    expectVisible('auth-gate');

    submitLogin('COMP-001');
    await settle();
    expectHidden('auth-gate');
    expectVisible('app-shell');
    expect(qs('session-user').textContent).toContain('Camila Vega');
    expect(qs('session-role').textContent).toBe('Comprador');
  });

  it('restores the session after a reload and allows logout', async () => {
    await bootAndLogin('GER-001');
    expectVisible('app-shell');

    vi.resetModules();
    const app = await import('../../src/app.js');
    await app.boot();
    expectHidden('auth-gate');
    expect(qs('session-role').textContent).toBe('Gerente de Compras');

    qs('logout-button').click();
    expectVisible('auth-gate');
    expectHidden('app-shell');
  });
});

describe('role-based interface deployment', () => {
  it('shows a purchaser their purchasing views but hides approval controls', async () => {
    await bootAndLogin('COMP-001');
    expectVisible('nav-entities');
    expectVisible('nav-documents');
    expectVisible('nav-products');
    expectVisible('action-new-document');

    await seedApprovedOrder();
    openOrderDetail();
    expect(transitionStatuses()).toEqual([]);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
  });

  it('deploys the warehouse view with receipt actions and stock management only', async () => {
    await bootAndLogin('BOD-001');
    expectHidden('nav-entities');
    expectVisible('nav-documents');
    expectHidden('action-new-entity');
    expectHidden('action-new-document');
    expectHidden('document-form');

    await seedApprovedOrder();
    qs('nav-products').click();
    expect(qs('product-form')).not.toBeNull();
    expect(qs('product-table-body').querySelector('[data-action="edit-product"]')).not.toBeNull();

    openOrderDetail();
    expect(transitionStatuses()).toEqual(['recibido']);
  });

  it('deploys a read-only consultation interface', async () => {
    await bootAndLogin('CONS-001');
    expectVisible('nav-entities');
    expectVisible('nav-documents');
    expectHidden('action-new-entity');
    expectHidden('action-new-document');
    expectHidden('entity-form');
    expectHidden('document-form');

    const storage = await import('../../src/storage.js');
    storage.addEntity({ name: 'Proveedor Uno', code: '12.345.678-5', category: 'Insumos', paymentTerms: 'Contado' });
    qs('nav-entities').click();
    expect(qs('entity-table-body').querySelector('[data-action="edit"]')).toBeNull();
    expect(qs('entity-table-body').querySelector('[data-action="delete"]')).toBeNull();

    qs('nav-products').click();
    expect(qs('product-form')).toBeNull();
    expect(qs('product-table-body').querySelector('[data-action="edit-product"]')).toBeNull();
  });

  it('deploys the full administrative interface', async () => {
    await bootAndLogin('ADMIN-001');
    for (const nav of ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-products', 'nav-search']) {
      expectVisible(nav);
    }
    expectVisible('action-new-entity');
    expectVisible('action-new-document');
    expectVisible('entity-form');
    expectVisible('document-form');

    await seedApprovedOrder();
    openOrderDetail();
    expect(transitionStatuses()).toEqual(['recibido']);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).not.toBeNull();
  });

  it('deploys the same full interface for the purchasing manager', async () => {
    await bootAndLogin('GER-001');
    for (const nav of ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-products', 'nav-search']) {
      expectVisible(nav);
    }
    expectVisible('action-new-entity');
    expectVisible('action-new-document');
    expectVisible('entity-form');
    expectVisible('document-form');

    await seedApprovedOrder();
    openOrderDetail();
    expect(transitionStatuses()).toEqual(['recibido']);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).not.toBeNull();
  });
});

describe('denied actions do not mutate data', () => {
  it('rejects a workflow transition without changing the order status', async () => {
    await bootAndLogin('COMP-001');
    const { purchasing, order } = await seedApprovedOrder();
    openOrderDetail();

    const button = document.createElement('button');
    button.dataset.action = 'transition';
    button.dataset.nextStatus = 'recibido';
    qs('order-actions').appendChild(button);
    button.click();

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe(PERMISSION_DENIED);
    expect(purchasing.getPurchaseOrderDetail(order.id).status).toBe('aprobado');
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('rejects printing without the print permission', async () => {
    vi.resetModules();
    const auth = await import('../../src/auth.js');
    const permissions = auth.ROLE_DEFINITIONS.consulta.permissions;
    const printIndex = permissions.indexOf(auth.PERMISSIONS.ORDERS_PRINT);
    expect(printIndex).toBeGreaterThanOrEqual(0);
    permissions.splice(printIndex, 1);

    const app = await import('../../src/app.js');
    await app.boot();
    submitLogin('CONS-001');
    await settle();

    const { order } = await seedApprovedOrder();
    openOrderDetail();
    const button = document.createElement('button');
    button.dataset.action = 'print-order';
    qs('order-actions').appendChild(button);
    button.click();

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe(PERMISSION_DENIED);
    expect(globalThis.print).not.toHaveBeenCalled();
    expectHidden('view-print');
    expect(order.status).toBe('aprobado');
  });

  it('rejects deleting an order line without the update permission', async () => {
    await bootAndLogin('BOD-001');
    const { purchasing, order } = await seedApprovedOrder();
    openOrderDetail();
    const before = purchasing.getLinesForOrder(order.id);

    const button = document.createElement('button');
    button.dataset.action = 'delete-line';
    button.dataset.productId = order.lines[0].id_producto;
    qs('order-lines-table').appendChild(button);
    button.click();

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe(PERMISSION_DENIED);
    expect(purchasing.getLinesForOrder(order.id)).toEqual(before);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('rejects submitting an order form without the create permission', async () => {
    await bootAndLogin('CONS-001');
    const storage = await import('../../src/storage.js');
    const before = storage.loadDocuments();

    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(qs('document-feedback').textContent).toBe(PERMISSION_DENIED);
    expect(storage.loadDocuments()).toEqual(before);
  });

  it('rejects entity and document creation shortcuts without mutating data', async () => {
    await bootAndLogin('CONS-001');
    const storage = await import('../../src/storage.js');
    const entitiesBefore = storage.loadEntities();
    const documentsBefore = storage.loadDocuments();

    qs('action-new-entity').click();
    expect(qs('entity-feedback').textContent).toBe(PERMISSION_DENIED);
    expect(storage.loadEntities()).toEqual(entitiesBefore);

    qs('action-new-document').click();
    expect(qs('document-feedback').textContent).toBe(PERMISSION_DENIED);
    expect(storage.loadDocuments()).toEqual(documentsBefore);
  });

  it('rejects submitting an entity form without the create permission', async () => {
    await bootAndLogin('CONS-001');
    const storage = await import('../../src/storage.js');
    const before = storage.loadEntities();

    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(qs('entity-feedback').textContent).toBe(PERMISSION_DENIED);
    expect(storage.loadEntities()).toEqual(before);
  });

  it('rejects forced entity edits and deletions without mutating data', async () => {
    await bootAndLogin('CONS-001');
    const storage = await import('../../src/storage.js');
    const entity = storage.addEntity({
      name: 'Proveedor Uno',
      code: '12.345.678-5',
      category: 'Insumos',
      paymentTerms: 'Contado'
    });
    const before = storage.loadEntities();

    qs('nav-entities').click();
    for (const action of ['edit', 'delete']) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.dataset.id = entity.id;
      qs('entity-table-body').appendChild(button);
      button.click();
      expect(qs('entity-feedback').textContent).toBe(PERMISSION_DENIED);
    }

    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(storage.loadEntities()).toEqual(before);
  });

  it('rejects forced order edits and deletions without mutating data', async () => {
    await bootAndLogin('CONS-001');
    const { purchasing, storage, order } = await seedApprovedOrder();
    const before = storage.loadDocuments();

    qs('nav-documents').click();
    for (const action of ['edit', 'delete']) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.dataset.id = order.id;
      qs('document-table-body').appendChild(button);
      button.click();
      expect(qs('document-feedback').textContent).toBe(PERMISSION_DENIED);
    }

    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(storage.loadDocuments()).toEqual(before);
    expect(purchasing.getPurchaseOrderDetail(order.id).status).toBe('aprobado');
  });

  it('rejects forced product maintenance without mutating the catalog', async () => {
    await bootAndLogin('CONS-001');
    const { purchasing, product } = await seedApprovedOrder();
    const before = purchasing.loadProducts();

    qs('nav-products').click();
    for (const action of ['edit-product', 'delete-product']) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.dataset.id = product.id_producto;
      qs('product-table-body').appendChild(button);
      button.click();
      expect(qs('product-feedback').textContent).toBe(PERMISSION_DENIED);
    }

    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(purchasing.loadProducts()).toEqual(before);
  });
});
