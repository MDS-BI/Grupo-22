import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs, submitForm } from '../helpers/purchasing-app.js';

let dom;
let app;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
});

afterEach(() => {
  dom.window.close();
});

function fillHeader() {
  qs('nav-documents').click();
  qs('document-entity').value = app.seedData.supplier.entity_id;
  qs('document-employee').value = app.seedData.employee.id_empleado;
  qs('folio').value = '1001';
  qs('startDate').value = '2026-11-01';
  qs('endDate').value = '2026-11-10';
}

function addLine(product, quantity, cost) {
  qs('line-product').value = product.id_producto;
  qs('line-quantity').value = String(quantity);
  qs('line-cost').value = String(cost);
  qs('add-line-button').click();
}

describe('purchase order line editor', () => {
  it('adds, edits and deletes lines with immediate recalculation', () => {
    fillHeader();
    addLine(app.seedData.product, 2, 1000);
    addLine(app.seedData.other, 3, 500);
    expect(qs('document-lines-body').textContent).toContain('Lápiz');
    expect(qs('document-lines-body').textContent).toContain('Papel');
    expect(qs('document-totals').textContent).toContain('4.165');

    qs('document-lines-body').querySelectorAll('[data-action="edit-line"]')[0].click();
    qs('line-quantity').value = '4';
    qs('add-line-button').click();
    expect(qs('document-totals').textContent).toContain('6.545');

    qs('document-lines-body').querySelectorAll('[data-action="delete-line"]')[0].click();
    expect(qs('document-totals').textContent).toContain('4.760');
  });

  it('rejects duplicate products and invalid quantities with field errors', () => {
    fillHeader();
    addLine(app.seedData.product, 2, 1000);
    addLine(app.seedData.product, 1, 1000);
    expect(qs('error-line-product').textContent).toContain('mismo producto');

    addLine(app.seedData.other, 0, 500);
    expect(qs('error-line-quantity').textContent).toContain('entero positivo');
  });

  it('blocks saving an order without lines', () => {
    fillHeader();
    addLine(app.seedData.product, 2, 1000);
    qs('document-lines-body').querySelector('[data-action="delete-line"]').click();
    submitForm(dom, 'document-form');
    expect(app.storage.loadDocuments()).toHaveLength(0);
    expect(qs('document-feedback').textContent).toContain('al menos una línea');
  });

  it('loads existing order lines into the editor', () => {
    const order = createOrder(app.purchasing, app.storage, app.seedData);
    qs('nav-documents').click();
    qs('document-table-body').querySelector('[data-action="edit"]').click();
    expect(qs('document-lines-body').textContent).toContain('Lápiz');
    expect(qs('document-totals').textContent).toContain('2.380');
    expect(qs('document-id').value).toBe(order.id);
  });
});
