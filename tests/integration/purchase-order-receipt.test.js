import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs } from '../helpers/purchasing-app.js';

let dom;
let app;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
});

afterEach(() => {
  dom.window.close();
});

describe('purchase order receipt', () => {
  it('receives an approved order once and updates stock exactly once', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente');
    app.purchasing.changeOrderStatus(order.id, 'aprobado');
    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    qs('order-actions').querySelector('[data-next-status="recibido"]').click();
    expect(app.storage.loadDocuments()[0].status).toBe('recibido');
    expect(app.purchasing.loadProducts().find(product => product.nombre === 'Lápiz').stock).toBe(7);
    expect(qs('order-actions').querySelector('[data-action="transition"]')).toBeNull();
    expect(qs('order-detail-view').textContent).toContain('Sí');
    expect(() => app.purchasing.receivePurchaseOrder(order.id)).toThrow(/ya fue aplicada/i);
    expect(app.purchasing.loadProducts().find(product => product.nombre === 'Lápiz').stock).toBe(7);
  });

  it('does not change stock when a cancelled order is viewed', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'cancelado');
    const before = app.purchasing.loadProducts().map(product => product.stock);
    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    expect(qs('order-actions').querySelector('[data-action="transition"]')).toBeNull();
    expect(app.purchasing.loadProducts().map(product => product.stock)).toEqual(before);
  });

  it('does not apply partial stock when a receipt line is invalid', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente');
    app.purchasing.changeOrderStatus(order.id, 'aprobado');
    const otherStock = app.purchasing.loadProducts().find(product => product.nombre === 'Papel').stock;
    app.purchasing.saveProducts(app.purchasing.loadProducts().filter(product => product.nombre !== 'Lápiz'));
    expect(() => app.purchasing.receivePurchaseOrder(order.id)).toThrow(/ya no existe/i);
    expect(app.storage.loadDocuments()[0].status).toBe('aprobado');
    expect(app.purchasing.loadProducts().find(product => product.nombre === 'Papel').stock).toBe(otherStock);
  });
});
