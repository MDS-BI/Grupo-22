import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootPurchasing,
  bootPurchasingAs,
  createOrder,
  installDom,
  installStyles,
  qs
} from '../helpers/purchasing-app.js';

const DENIED = 'No tienes permisos para ejecutar esta acción.';
let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

function openOrder(orderId) {
  qs('nav-documents').click();
  qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${orderId}"]`).click();
}

function transitionStatuses() {
  return [...qs('order-actions').querySelectorAll('[data-action="transition"]')]
    .map(button => button.dataset.nextStatus);
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('post-review document labels and emission date', () => {
  it('uses Solicitud de compra and Orden de Compra emitida across purchasing surfaces', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const draft = createOrder(purchasing, storage, seedData, { status: 'borrador', folio: 4001 });
    createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4002 });
    const approved = createOrder(purchasing, storage, seedData, {
      status: 'aprobado',
      folio: 4003,
      startDate: '2026-11-01'
    });

    qs('nav-documents').click();
    const tableText = qs('document-table-body').textContent;
    expect(tableText).toContain('Solicitud de compra');
    expect(tableText).toContain('Orden de Compra emitida');
    expect(qs('documents-filter-status').textContent).toContain('Solicitud de compra');
    expect(qs('documents-filter-status').textContent).toContain('Orden de Compra emitida');

    qs('action-new-document').click();
    expect(qs('document-type-label').textContent).toBe('Solicitud de compra');
    qs('cancel-panel')?.click();

    openOrder(draft.id);
    expect(qs('order-detail-view').textContent).toContain('Solicitud de compra');

    openOrder(approved.id);
    expect(qs('order-detail-view').textContent).toContain('Orden de Compra emitida');
    qs('order-actions').querySelector('[data-action="print-order"]').click();
    expect(qs('print-order-view').textContent).toContain('Orden de Compra emitida');
    expect(qs('print-order-view').textContent).toContain('01-11-2026');
  });

  it('fills the emission date only when the pending request is approved', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'GER-001');
    const order = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4100 });
    expect(purchasing.getPurchaseOrderDetail(order.id).order.startDate).toBeNull();

    openOrder(order.id);
    const approve = qs('order-actions').querySelector('[data-action="transition"][data-next-status="aprobado"]');
    approve.click();

    const approved = purchasing.getPurchaseOrderDetail(order.id);
    expect(approved.order.status).toBe('aprobado');
    expect(approved.order.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(qs('order-detail-view').textContent).not.toContain('Sin emitir');
    expect(globalThis.confirm.mock.calls[0][0]).toContain('Orden de Compra emitida');
  });
});

describe('post-review buyer restrictions', () => {
  it('hides and rejects approve or reject without mutating state, history or stock', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'COMP-001');
    const order = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4200 });
    openOrder(order.id);

    expect(transitionStatuses()).toEqual([]);
    const before = purchasing.getPurchaseOrderDetail(order.id);
    const productsBefore = purchasing.loadProducts();

    for (const status of ['aprobado', 'cancelado']) {
      const button = dom.window.document.createElement('button');
      button.dataset.action = 'transition';
      button.dataset.nextStatus = status;
      qs('order-actions').appendChild(button);
      button.click();
      expect(qs('order-actions').querySelector('.feedback').textContent).toBe(DENIED);
    }

    expect(() => purchasing.changeOrderStatus(order.id, 'aprobado')).toThrow(/permisos/i);
    expect(() => purchasing.changeOrderStatus(order.id, 'cancelado')).toThrow(/permisos/i);
    expect(purchasing.getPurchaseOrderDetail(order.id)).toEqual(before);
    expect(purchasing.loadProducts()).toEqual(productsBefore);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('assigns one own read-only employee and rejects an employee of another buyer', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'COMP-001');
    const ownEmployees = purchasing.loadEmployees().filter(employee => employee.userId === 'COMP-001');
    expect(ownEmployees).toHaveLength(1);
    expect(ownEmployees[0]).toMatchObject({ nombre: 'Camila Vega', cargo: 'Compradora' });

    qs('action-new-document').click();
    expect(qs('document-employee').disabled).toBe(true);
    expect(qs('document-employee').value).toBe(ownEmployees[0].id_empleado);

    const other = purchasing.addEmployee({ nombre: 'Comprador Dos', cargo: 'Comprador', userId: 'COMP-002' });
    expect(() => createOrder(purchasing, storage, seedData, {
      id_empleado: other.id_empleado,
      folio: 4301
    })).toThrow(/permisos/i);

    createOrder(purchasing, storage, seedData, { folio: 4302 });
    createOrder(purchasing, storage, seedData, { folio: 4303 });
    expect(purchasing.loadEmployees().filter(employee => employee.userId === 'COMP-001')).toHaveLength(1);
  });

  it('keeps same-name buyers on different employees linked by userId', async () => {
    const auth = await import('../../src/auth.js');
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'COMP-001');
    const firstOrder = createOrder(purchasing, storage, seedData, { folio: 4401 });

    auth.saveUsers([
      ...auth.loadUsers(),
      { userId: 'COMP-002', nombre: 'Camila Vega', cargo: 'Compradora', role: 'comprador', activo: true }
    ]);
    auth.login('COMP-002');
    const secondOrder = createOrder(purchasing, storage, seedData, { folio: 4402 });

    const employees = purchasing.loadEmployees().filter(employee => employee.userId);
    const first = employees.find(employee => employee.userId === 'COMP-001');
    const second = employees.find(employee => employee.userId === 'COMP-002');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first.id_empleado).not.toBe(second.id_empleado);
    expect(first.nombre).toBe(second.nombre);
    expect(new Set(employees.map(employee => employee.userId)).size).toBe(employees.length);
    expect(purchasing.getPurchaseOrderDetail(firstOrder.id).employee.id_empleado).toBe(first.id_empleado);
    expect(purchasing.getPurchaseOrderDetail(secondOrder.id).employee.id_empleado).toBe(second.id_empleado);
  });

  it('hides the credit limit and preserves or rejects its persisted value', async () => {
    const { storage, seedData, normalized } = await bootPurchasing(dom);
    const supplier = storage.updateEntity(seedData.supplier.id, { creditLimit: 50000 });
    const auth = await import('../../src/auth.js');
    auth.ensureDefaultUsers();
    auth.login('COMP-001');
    const app = await import('../../src/app.js');
    await app.initApp(normalized);

    const field = qs('creditLimit').closest('.field');
    expect(field.hidden).toBe(true);
    expect(dom.window.getComputedStyle(field).display).toBe('none');

    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('nav-search').click();
    expect(qs('app-shell').textContent).not.toContain('Límite de crédito');
    expect(qs('entity-table-body').textContent).not.toContain('50.000');
    expect(qs('document-table-body').textContent).not.toContain('50.000');
    expect(qs('search-results-list').textContent).not.toContain('50.000');

    const preserved = storage.updateEntity(supplier.id, { name: 'Proveedor Uno Actualizado', creditLimit: '' });
    expect(preserved.creditLimit).toBe(50000);
    expect(() => storage.updateEntity(supplier.id, { creditLimit: 75000 })).toThrow(/permisos/i);
    expect(storage.loadEntities().find(entity => entity.id === supplier.id).creditLimit).toBe(50000);
    expect(() => storage.addEntity({
      name: 'Proveedor Nuevo',
      code: '11.111.111-1',
      creditLimit: 1000
    })).toThrow(/permisos/i);
  });
});

describe('post-review consultation, manager and administrator surfaces', () => {
  it('keeps feedback persistent on restricted 003 surfaces without false success', async () => {
    const { storage } = await bootPurchasingAs(dom, 'CONS-001');
    expect(qs('action-new-document').hidden).toBe(true);
    expect(qs('document-form').hidden).toBe(true);

    const before = storage.loadEntities();
    submitForm('entity-form');
    expect(qs('entity-feedback').textContent).toBe(DENIED);
    expect(storage.loadEntities()).toEqual(before);

    qs('nav-documents').click();
    const documentsBefore = storage.loadDocuments();
    submitForm('document-form');
    expect(qs('document-feedback').textContent).toBe(DENIED);
    expect(qs('document-feedback').textContent).not.toContain('guard');
    expect(storage.loadDocuments()).toEqual(documentsBefore);
    expect(qs('documents-filter-error')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).toBeNull();
  });

  it.each(['ADMIN-001', 'GER-001'])('lets %s select the requester, approve and reject requests', async userId => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, userId);
    qs('action-new-document').click();
    expect(qs('document-employee').disabled).toBe(false);
    expect(qs('document-employee').querySelector(`option[value="${seedData.employee.id_empleado}"]`)).not.toBeNull();

    const toApprove = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4501 });
    const toReject = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4502 });

    openOrder(toApprove.id);
    expect(transitionStatuses()).toEqual(expect.arrayContaining(['aprobado', 'cancelado']));
    expect(qs('document-table-body')).not.toBeNull();
    qs('order-actions').querySelector('[data-action="transition"][data-next-status="aprobado"]').click();
    expect(purchasing.getPurchaseOrderDetail(toApprove.id).order.status).toBe('aprobado');

    openOrder(toReject.id);
    qs('order-actions').querySelector('[data-action="transition"][data-next-status="cancelado"]').click();
    expect(purchasing.getPurchaseOrderDetail(toReject.id).order.status).toBe('cancelado');
  });
});
