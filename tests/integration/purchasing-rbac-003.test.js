import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
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

describe('permisos de 004 en las superficies de 003', () => {
  it('oculta + Nuevo, panel de producto, demo y categorías cuando el rol no puede gestionar', async () => {
    const { purchasing, storage } = await bootPurchasingAs(dom, 'COMP-001');
    expect(qs('action-load-demo').hidden).toBe(true);
    expect(qs('entity-list-new').hidden).toBe(false);
    expect(qs('document-list-new').hidden).toBe(false);

    qs('nav-products').click();
    expect(qs('product-list-new')).toBeNull();
    expect(qs('product-form')).toBeNull();
    expect(qs('category-list-new')).toBeNull();
    qs('products-tab-categorias').click();
    expect(qs('category-form')).toBeNull();

    const entitiesBefore = storage.loadEntities();
    const documentsBefore = storage.loadDocuments();
    const productsBefore = purchasing.loadProducts();
    qs('action-load-demo').click();
    expect(qs('demo-feedback').textContent).toBe(DENIED);
    expect(storage.loadEntities()).toEqual(entitiesBefore);
    expect(storage.loadDocuments()).toEqual(documentsBefore);
    expect(purchasing.loadProducts()).toEqual(productsBefore);
  });

  it('rechaza la creación de productos por vía forzada sin mutar el catálogo', async () => {
    const { purchasing } = await bootPurchasingAs(dom, 'CONS-001');
    qs('nav-products').click();
    qs('products-tab-categorias').click();
    const before = purchasing.loadProducts();

    const edit = dom.window.document.createElement('button');
    edit.dataset.action = 'edit-product';
    edit.dataset.id = before[0].id_producto;
    qs('product-table-body').appendChild(edit);
    edit.click();

    expect(qs('product-feedback').textContent).toBe(DENIED);
    expect(purchasing.loadProducts()).toEqual(before);
    expect(qs('side-panel-dialog').hidden).toBe(true);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('respeta tarjetas y detalle del bodeguero sin exponer acciones no permitidas', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'BOD-001');
    expect(qs('stat-entities-card').hidden).toBe(true);
    expect(qs('stat-documents-card').hidden).toBe(false);
    expect(qs('stat-products-card').hidden).toBe(false);
    expect(qs('stat-overdue-card').hidden).toBe(false);
    expect(qs('action-load-demo').hidden).toBe(true);

    const order = createOrder(purchasing, storage, seedData, { status: 'aprobado', folio: 3001 });
    openOrder(order.id);

    expect(transitionStatuses()).toEqual(['recibido']);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).toBeNull();
  });

  it('impide que el comprador apruebe o rechace una solicitud pendiente, incluso por vía forzada', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'COMP-001');
    const order = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 3002 });
    openOrder(order.id);

    expect(transitionStatuses()).toEqual([]);
    const before = purchasing.getPurchaseOrderDetail(order.id);

    for (const status of ['aprobado', 'cancelado']) {
      const button = dom.window.document.createElement('button');
      button.dataset.action = 'transition';
      button.dataset.nextStatus = status;
      qs('order-actions').appendChild(button);
      button.click();
      expect(qs('order-actions').querySelector('.feedback').textContent).toBe(DENIED);
    }

    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(purchasing.getPurchaseOrderDetail(order.id)).toEqual(before);
  });

  it('mantiene errores persistentes y sin falsos éxitos en envíos forzados', async () => {
    const { storage } = await bootPurchasingAs(dom, 'CONS-001');
    const before = storage.loadEntities();

    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(qs('entity-feedback').textContent).toBe(DENIED);
    expect(qs('entity-feedback').textContent).not.toContain('guard');
    expect(storage.loadEntities()).toEqual(before);

    qs('nav-documents').click();
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(qs('document-feedback').textContent).toBe(DENIED);
    expect(storage.loadDocuments()).toEqual([]);
  });

  it('no expone filtros restringidos ni acciones de edición en el detalle de consulta', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'CONS-001');
    const order = createOrder(purchasing, storage, seedData, { status: 'aprobado', folio: 3003 });
    openOrder(order.id);

    expect(qs('view-order-detail').textContent).not.toMatch(/Límite de crédito/i);
    expect(qs('documents-filter-error')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).toBeNull();
    expect(transitionStatuses()).toEqual([]);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
  });
});
