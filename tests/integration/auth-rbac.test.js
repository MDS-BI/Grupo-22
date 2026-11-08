import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom, qs } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

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
  return { purchasing, storage, order };
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
    expect(qs('auth-gate').hidden).toBe(false);
    expect(qs('app-shell').hidden).toBe(true);

    submitLogin('NO-EXISTE');
    await settle();
    expect(qs('login-error').textContent).toContain('no está registrado');
    expect(qs('auth-gate').hidden).toBe(false);

    submitLogin('COMP-001');
    await settle();
    expect(qs('auth-gate').hidden).toBe(true);
    expect(qs('app-shell').hidden).toBe(false);
    expect(qs('session-user').textContent).toContain('Camila Vega');
    expect(qs('session-role').textContent).toBe('Comprador');
  });

  it('restores the session after a reload and allows logout', async () => {
    await bootAndLogin('GER-001');
    expect(qs('app-shell').hidden).toBe(false);

    vi.resetModules();
    const app = await import('../../src/app.js');
    await app.boot();
    expect(qs('auth-gate').hidden).toBe(true);
    expect(qs('session-role').textContent).toBe('Gerente de Compras');

    qs('logout-button').click();
    expect(qs('auth-gate').hidden).toBe(false);
    expect(qs('app-shell').hidden).toBe(true);
  });
});

describe('role-based interface deployment', () => {
  it('shows a purchaser their purchasing views but hides approval controls', async () => {
    await bootAndLogin('COMP-001');
    expect(qs('nav-entities').hidden).toBe(false);
    expect(qs('nav-documents').hidden).toBe(false);
    expect(qs('nav-products').hidden).toBe(false);
    expect(qs('action-new-document').hidden).toBe(false);

    await seedApprovedOrder();
    openOrderDetail();
    expect(transitionStatuses()).toEqual([]);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
  });

  it('deploys the warehouse view with receipt actions and stock management only', async () => {
    await bootAndLogin('BOD-001');
    expect(qs('nav-entities').hidden).toBe(true);
    expect(qs('nav-documents').hidden).toBe(false);
    expect(qs('action-new-entity').hidden).toBe(true);
    expect(qs('action-new-document').hidden).toBe(true);
    expect(qs('document-form').hidden).toBe(true);

    await seedApprovedOrder();
    qs('nav-products').click();
    expect(qs('product-form')).not.toBeNull();
    expect(qs('product-table-body').querySelector('[data-action="edit-product"]')).not.toBeNull();

    openOrderDetail();
    expect(transitionStatuses()).toEqual(['recibido']);
  });

  it('deploys a read-only consultation interface', async () => {
    await bootAndLogin('CONS-001');
    expect(qs('nav-entities').hidden).toBe(false);
    expect(qs('nav-documents').hidden).toBe(false);
    expect(qs('action-new-entity').hidden).toBe(true);
    expect(qs('action-new-document').hidden).toBe(true);
    expect(qs('entity-form').hidden).toBe(true);
    expect(qs('document-form').hidden).toBe(true);

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
      expect(qs(nav).hidden).toBe(false);
    }
    expect(qs('action-new-entity').hidden).toBe(false);
    expect(qs('action-new-document').hidden).toBe(false);
    expect(qs('entity-form').hidden).toBe(false);
    expect(qs('document-form').hidden).toBe(false);

    await seedApprovedOrder();
    openOrderDetail();
    expect(transitionStatuses()).toEqual(['recibido']);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).not.toBeNull();
  });

  it('deploys the same full interface for the purchasing manager', async () => {
    await bootAndLogin('GER-001');
    for (const nav of ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-products', 'nav-search']) {
      expect(qs(nav).hidden).toBe(false);
    }
    expect(qs('action-new-entity').hidden).toBe(false);
    expect(qs('action-new-document').hidden).toBe(false);
    expect(qs('entity-form').hidden).toBe(false);
    expect(qs('document-form').hidden).toBe(false);

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

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
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

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
    expect(globalThis.print).not.toHaveBeenCalled();
    expect(qs('view-print').hidden).toBe(true);
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

    expect(qs('order-actions').querySelector('.feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
    expect(purchasing.getLinesForOrder(order.id)).toEqual(before);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('rejects submitting an order form without the create permission', async () => {
    await bootAndLogin('CONS-001');
    const storage = await import('../../src/storage.js');
    const before = storage.loadDocuments();

    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(qs('document-feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
    expect(storage.loadDocuments()).toEqual(before);
  });
});
