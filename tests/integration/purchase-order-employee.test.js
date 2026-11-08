import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, qs, submitForm } from '../helpers/purchasing-app.js';

let dom;
let app;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
  qs('nav-documents').click();
  qs('document-entity').value = app.seedData.supplier.entity_id;
  qs('folio').value = '1001';
  qs('startDate').value = '2026-11-01';
  qs('endDate').value = '2026-11-10';
  qs('line-product').value = app.seedData.product.id_producto;
  qs('line-quantity').value = '2';
  qs('line-cost').value = '1000';
  qs('add-line-button').click();
});

afterEach(() => {
  dom.window.close();
});

describe('purchase order employee', () => {
  it('requires an employee and shows a clear validation message', () => {
    submitForm(dom, 'document-form');
    expect(app.storage.loadDocuments()).toHaveLength(0);
    expect(qs('error-document-employee').textContent).toContain('empleado');
  });

  it('persists and displays the selected employee in the order detail', () => {
    qs('document-employee').value = app.seedData.employee.id_empleado;
    submitForm(dom, 'document-form');
    expect(app.purchasing.getOrderMetadata(app.storage.loadDocuments()[0].id).id_empleado).toBe(app.seedData.employee.id_empleado);
    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    expect(qs('order-detail-view').textContent).toContain('Ana Pérez');
  });
});
