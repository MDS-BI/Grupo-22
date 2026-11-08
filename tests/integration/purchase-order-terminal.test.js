import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs } from '../helpers/purchasing-app.js';

let dom;
let app;
let order;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
  order = createOrder(app.purchasing, app.storage, app.seedData);
  app.purchasing.changeOrderStatus(order.id, 'cancelado');
});

afterEach(() => {
  dom.window.close();
});

describe('terminal purchase orders', () => {
  it('opens terminal orders in read-only mode', () => {
    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="edit"]').click();
    expect(qs('document-submit-button').disabled).toBe(true);
    expect(qs('add-line-button').disabled).toBe(true);
    expect(qs('line-product').disabled).toBe(true);
    expect(qs('document-feedback').textContent).toContain('no puede modificarse');
  });

  it('rejects direct header and line updates on terminal orders', () => {
    expect(() => app.storage.updateDocument(order.id, { notes: 'Cambio' })).toThrow(/no puede modificarse/i);
    expect(() => app.purchasing.addOrUpdatePurchaseOrderLine(order.id, {
      id_producto: app.seedData.product.id_producto,
      cantidad: 1,
      costo_unitario: 10
    })).toThrow(/no puede modificarse/i);
  });
});
