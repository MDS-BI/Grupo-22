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

function elapsed(action) {
  const start = performance.now();
  action();
  return performance.now() - start;
}

describe('purchase order performance', () => {
  it('renders list, detail, recalculation, receipt and print within budget', () => {
    const orders = [];
    for (let index = 0; index < 40; index += 1) {
      orders.push(createOrder(app.purchasing, app.storage, app.seedData, { folio: 2000 + index }));
    }

    expect(elapsed(() => qs('nav-documents').click())).toBeLessThan(2000);
    expect(elapsed(() => {
      qs('document-table-body').querySelector('[data-action="view-order"]').click();
    })).toBeLessThan(2000);
    expect(elapsed(() => {
      qs('nav-documents').click();
      qs('document-table-body').querySelector('[data-action="edit"]').click();
      qs('line-quantity').value = '3';
      qs('add-line-button').click();
    })).toBeLessThan(2000);

    const receiptOrder = orders[1];
    app.purchasing.changeOrderStatus(receiptOrder.id, 'pendiente');
    app.purchasing.changeOrderStatus(receiptOrder.id, 'aprobado');
    expect(elapsed(() => {
      qs('nav-documents').click();
      qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${receiptOrder.id}"]`).click();
      qs('order-actions').querySelector('[data-next-status="recibido"]').click();
    })).toBeLessThan(2000);
    expect(elapsed(() => qs('order-actions').querySelector('[data-action="print-order"]').click())).toBeLessThan(2000);
  });
});
