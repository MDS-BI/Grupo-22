import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs } from '../helpers/purchasing-app.js';

let dom;
let app;
let order;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
  order = createOrder(app.purchasing, app.storage, app.seedData);
});

afterEach(() => {
  dom.window.close();
});

function openDetail() {
  qs('nav-documents').click();
  qs('document-table-body').querySelector('[data-action="view-order"]').click();
}

function actionStatuses() {
  return [...qs('order-actions').querySelectorAll('[data-action="transition"]')]
    .map(button => button.dataset.nextStatus);
}

describe('purchase order status actions', () => {
  it('renders only the canonical actions for each state', () => {
    openDetail();
    expect(actionStatuses()).toEqual(['pendiente', 'cancelado']);
    expect(qs('order-actions').textContent).toContain('Enviar a revisión');

    qs('order-actions').querySelector('[data-next-status="pendiente"]').click();
    expect(actionStatuses()).toEqual(['aprobado', 'cancelado']);
    qs('order-actions').querySelector('[data-next-status="aprobado"]').click();
    expect(actionStatuses()).toEqual(['recibido']);
  });

  it('rejects sending to review without lines without mutating the order', () => {
    app.purchasing.savePurchaseOrderLines([]);
    openDetail();
    qs('order-actions').querySelector('[data-next-status="pendiente"]').click();
    expect(app.storage.loadDocuments()[0].status).toBe('borrador');
    expect(app.purchasing.loadOrderHistory(order.id)).toEqual([]);
    expect(qs('order-actions').querySelector('.feedback').textContent).toContain('al menos una línea');
  });

  it('rejects invalid transitions without changing state or history', () => {
    expect(() => app.purchasing.changeOrderStatus(order.id, 'recibido')).toThrow(/no está permitida/i);
    expect(app.storage.loadDocuments()[0].status).toBe('borrador');
    expect(app.purchasing.loadOrderHistory(order.id)).toEqual([]);
  });
});
