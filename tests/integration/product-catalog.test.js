import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, createOrder, qs, submitForm } from '../helpers/purchasing-app.js';

let dom;
let app;

beforeEach(async () => {
  dom = installDom();
  app = await bootPurchasing(dom);
  qs('nav-products').click();
});

afterEach(() => {
  dom.window.close();
});

describe('product catalog', () => {
  it('shows products and stock, and allows creating and editing products', () => {
    expect(qs('product-table-body').textContent).toContain('Lápiz');
    expect(qs('product-table-body').textContent).toContain('5');

    qs('product-nombre').value = 'Toner';
    qs('product-unidad').value = 'cartucho';
    qs('product-stock').value = '4';
    qs('product-categoria').value = app.seedData.category.id_categoria;
    submitForm(dom, 'product-form');
    expect(app.purchasing.loadProducts()).toHaveLength(3);

    const tonerRow = [...qs('product-table-body').querySelectorAll('tr')]
      .find(row => row.textContent.includes('Toner'));
    tonerRow.querySelector('[data-action="edit-product"]').click();
    qs('product-stock').value = '9';
    submitForm(dom, 'product-form');
    expect(app.purchasing.loadProducts().find(product => product.nombre === 'Toner').stock).toBe(9);
  });

  it('blocks deleting a product referenced by a purchase order', () => {
    createOrder(app.purchasing, app.storage, app.seedData);
    qs('nav-products').click();
    const row = [...qs('product-table-body').querySelectorAll('tr')]
      .find(item => item.textContent.includes('Lápiz'));
    row.querySelector('[data-action="delete-product"]').click();
    expect(qs('product-feedback').textContent).toContain('referenciado');
    expect(app.purchasing.loadProducts().some(product => product.nombre === 'Lápiz')).toBe(true);
  });
});
