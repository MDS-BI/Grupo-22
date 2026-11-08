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

describe('purchase order persistence', () => {
  it('removes lines, metadata and history when an order is deleted', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    app.purchasing.changeOrderStatus(order.id, 'pendiente');
    expect(app.purchasing.loadPurchaseOrderLines(order.id).length).toBeGreaterThan(0);
    app.purchasing.deletePurchaseOrder(order.id);
    expect(app.storage.loadDocuments()).toHaveLength(0);
    expect(app.purchasing.loadPurchaseOrderLines()).toEqual([]);
    expect(app.purchasing.getOrderMetadata(order.id)).toBeNull();
    expect(app.purchasing.loadStatusHistory()).toEqual([]);
  });

  it('opens legacy documents without metadata, lines or status actions', () => {
    const legacy = app.storage.addDocument({
      entityId: app.seedData.supplier.entity_id,
      folio: 900,
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      paymentTerms: 'Contado',
      status: 'pendiente'
    });
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${legacy.id}"]`).click();
    expect(qs('order-detail-view').textContent).toContain('Orden histórica');
    expect(qs('order-detail-view').textContent).toContain('Empleado desconocido');
    expect(qs('order-lines-table').textContent).toContain('Sin líneas');
    expect(qs('order-history').textContent).toContain('Sin cambios de estado');
    expect(qs('order-actions').querySelector('[data-action="transition"]')).toBeNull();
  });
});
