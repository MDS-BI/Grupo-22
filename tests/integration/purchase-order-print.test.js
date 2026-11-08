import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('purchase order print view', () => {
  it('renders the complete document without application controls', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente', '2026-11-07T12:00:00.000Z');
    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    qs('order-actions').querySelector('[data-action="print-order"]').click();

    expect(qs('view-print').hidden).toBe(false);
    expect(qs('view-order-detail').hidden).toBe(true);
    expect(globalThis.print).toHaveBeenCalled();
    const printView = qs('print-order-view');
    expect(printView.textContent).toContain('Orden de Compra');
    expect(printView.textContent).toContain('1001');
    expect(printView.textContent).toContain('Proveedor Uno');
    expect(printView.textContent).toContain('12345678-5');
    expect(printView.textContent).toContain('Lápiz');
    expect(printView.textContent).toContain('2.380');
    expect(printView.textContent).toContain('07-11-2026 09:00');
    expect(printView.querySelector('button')).toBeNull();
    expect(printView.querySelector('form')).toBeNull();
  });
});
