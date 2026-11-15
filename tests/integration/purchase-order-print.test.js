import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs } from '../helpers/purchasing-app.js';
import { formatCurrency } from '../../src/domain/purchasing.js';

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

  it('prints the automatic emission date and 19 % tax for a national order', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente', '2026-11-06T12:00:00.000Z');
    app.purchasing.changeOrderStatus(order.id, 'aprobado', '2026-11-07T02:30:00.000Z');

    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    qs('order-actions').querySelector('[data-action="print-order"]').click();

    const printView = qs('print-order-view');
    expect(printView.textContent).toContain('06-11-2026');
    expect(printView.textContent).toContain('IVA (19 %)');
    expect(printView.textContent).toContain(formatCurrency(2380, 'CLP'));
    expect(printView.textContent).toContain('CLP');
  });

  it('prints the foreign currency, 0 % tax and Sin emitir for a foreign order', () => {
    const foreign = app.storage.addEntity({
      name: 'Proveedor Global',
      origin: 'Extranjero',
      foreignTaxId: 'TAX-900',
      category: 'Insumos',
      paymentTerms: '30 días'
    });
    const order = createOrder(app.purchasing, app.storage, app.seedData, {
      entityId: foreign.entity_id,
      folio: 2002,
      currency: 'EUR',
      paymentTerms: '30 días'
    });

    qs('nav-documents').click();
    qs('document-table-body')
      .querySelector(`[data-action="view-order"][data-id="${order.id}"]`)
      .click();
    qs('order-actions').querySelector('[data-action="print-order"]').click();

    const printView = qs('print-order-view');
    expect(printView.textContent).toContain('Proveedor Global');
    expect(printView.textContent).toContain(formatCurrency(2000, 'EUR'));
    expect(printView.textContent).toContain('IVA (0 %)');
    expect(printView.textContent).toContain('Sin emitir');
    expect(printView.textContent).toContain('EUR');
    expect(printView.textContent).not.toContain('IVA (19 %)');
  });
});
