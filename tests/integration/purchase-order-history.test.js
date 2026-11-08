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

function openDetail(order) {
  qs('nav-documents').click();
  qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
}

describe('purchase order history UI', () => {
  it('shows an understandable empty state for orders without history', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    openDetail(order);
    expect(qs('order-history').textContent).toContain('Sin cambios de estado');
  });

  it('renders each change with dd-mm-aaaa HH:mm in America/Santiago', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente', '2026-11-07T12:00:00.000Z');
    app.purchasing.changeOrderStatus(order.id, 'aprobado', '2026-11-07T13:30:00.000Z');
    openDetail(order);
    const history = qs('order-history');
    expect(history.textContent).toContain('borrador → pendiente');
    expect(history.textContent).toContain('07-11-2026 09:00');
    expect(history.textContent).toContain('07-11-2026 10:30');
  });
});
