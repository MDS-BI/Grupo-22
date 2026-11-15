import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, qs, submitForm } from '../helpers/purchasing-app.js';
import { formatCurrency } from '../../src/domain/purchasing.js';

let dom;
let app;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
  qs('nav-documents').click();
});

afterEach(() => {
  dom.window.close();
});

function selectEntity(entityId) {
  qs('nav-documents').click();
  qs('document-entity').value = entityId;
  qs('document-entity').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function addLine(productId, quantity = '2', cost = '1000') {
  qs('line-product').value = productId;
  qs('line-quantity').value = quantity;
  qs('line-cost').value = cost;
  qs('add-line-button').click();
}

describe('purchase order form post-review adjustments', () => {
  it('shows read-only totals and hides manual header fields and the status selector', () => {
    expect(qs('document-lines-heading').textContent).toBe('Detalle de compra');
    expect(qs('document-totals').querySelector('input')).toBeNull();
    for (const id of ['startDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'notes']) {
      expect(qs(id).closest('.field').hidden).toBe(true);
    }
    expect(qs('status').closest('.field').hidden).toBe(true);
  });

  it('fixes CLP and supplier payment terms for a national supplier', () => {
    const supplier = app.storage.addEntity({
      name: 'Proveedor Nacional',
      code: '11.111.111-1',
      category: 'Insumos',
      paymentTerms: 'Contado',
      origin: 'Nacional'
    });

    selectEntity(supplier.entity_id);
    expect(qs('currency').value).toBe('CLP');
    expect(qs('currency').disabled).toBe(true);
    expect(qs('docPaymentTerms').value).toBe('Contado');

    addLine(app.seedData.product.id_producto);
    expect(qs('document-totals').textContent).toContain(formatCurrency(2380, 'CLP'));
    expect(qs('document-totals').textContent).toContain('IVA (19 %)');
  });

  it('allows USD/EUR, applies 0 % tax and persists only permitted header fields for a foreign supplier', () => {
    const foreign = app.storage.addEntity({
      name: 'Proveedor Global',
      origin: 'Extranjero',
      foreignTaxId: 'TAX-900',
      category: 'Insumos',
      paymentTerms: '30 días'
    });

    selectEntity(foreign.entity_id);
    expect([...qs('currency').options].map(option => option.value)).toEqual(['USD', 'EUR']);
    expect(qs('currency').value).toBe('USD');
    expect(qs('docPaymentTerms').value).toBe('30 días');

    qs('currency').value = 'EUR';
    addLine(app.seedData.product.id_producto);
    expect(qs('document-totals').textContent).toContain(formatCurrency(2000, 'EUR'));
    expect(qs('document-totals').textContent).toContain('IVA (0 %)');

    qs('document-employee').value = app.seedData.employee.id_empleado;
    qs('folio').value = '2002';
    qs('endDate').value = '10-11-2026';
    qs('quantity').value = '9';
    qs('notes').value = 'No debe guardarse';
    qs('status').value = 'aprobado';
    submitForm(dom, 'document-form');

    const order = app.purchasing.listPurchaseOrdersWithActions().find(item => item.folio === 2002);
    expect(order).toBeTruthy();
    expect(order.status).toBe('borrador');
    expect(order.startDate).toBeNull();
    expect(order.endDate).toBe('2026-11-10');
    expect(order.currency).toBe('EUR');
    expect(order.paymentTerms).toBe('30 días');
    expect(order.totalAmount).toBe(2000);
    expect(order.quantity).toBeUndefined();
    expect(order.subtotal).toBeUndefined();
    expect(order.discount).toBeUndefined();
    expect(order.taxAmount).toBeUndefined();
    expect(order.notes).toBeUndefined();
  });

  it('masks the delivery date as dd-mm-aaaa before submitting', () => {
    qs('endDate').value = '10112026';
    qs('endDate').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('endDate').value).toBe('10-11-2026');
  });
});
