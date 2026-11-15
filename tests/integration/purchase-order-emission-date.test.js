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

function openOrder(orderId) {
  qs('nav-documents').click();
  qs('document-table-body')
    .querySelector(`[data-action="view-order"][data-id="${orderId}"]`)
    .click();
}

describe('purchase order emission date', () => {
  it('shows Sin emitir for draft and pending orders', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    expect(order.startDate).toBeNull();

    openOrder(order.id);
    expect(qs('order-detail-view').textContent).toContain('Sin emitir');

    app.purchasing.changeOrderStatus(order.id, 'pendiente', '2026-11-06T12:00:00.000Z');
    openOrder(order.id);
    expect(qs('order-detail-view').textContent).toContain('Sin emitir');
  });

  it('assigns the approval date in America/Santiago and shows it in detail and print', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente', '2026-11-06T12:00:00.000Z');
    app.purchasing.changeOrderStatus(order.id, 'aprobado', '2026-11-07T02:30:00.000Z');

    const stored = app.storage.loadDocuments().find(item => item.id === order.id);
    expect(stored.startDate).toBe('2026-11-06');

    openOrder(order.id);
    expect(qs('order-detail-view').textContent).toContain('06-11-2026');
    expect(qs('order-detail-view').textContent).not.toContain('Sin emitir');

    qs('order-actions').querySelector('[data-action="print-order"]').click();
    expect(qs('print-order-view').textContent).toContain('06-11-2026');
    expect(qs('print-order-view').textContent).not.toContain('Sin emitir');
  });
});
