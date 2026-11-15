import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasing, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

const styles = fs.readFileSync(fileURLToPath(new URL('../../src/styles.css', import.meta.url)), 'utf8');
let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

function fieldHidden(id) {
  const element = qs(id);
  expect(element).not.toBeNull();
  return element.closest('.field')?.hidden === true;
}

describe('formularios en panel lateral por secciones', () => {
  it('organiza Proveedores en dos columnas por secciones con los campos vigentes', async () => {
    await bootPurchasing(dom);
    qs('nav-entities').click();
    qs('entity-list-new').click();

    const form = qs('entity-form');
    const sections = [...form.querySelectorAll('.form-section')];
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.map(section => section.dataset.formSection)).toEqual(['general', 'contact', 'commercial']);
    for (const section of sections) {
      expect(section.querySelector('.form-grid')).not.toBeNull();
    }
    expect(form.querySelector('#origin')).not.toBeNull();
    expect(form.querySelector('#foreignTaxId')).not.toBeNull();
    expect(qs('supplier-rubros').multiple).toBe(true);
    expect(qs('supplier-rubros').getAttribute('multiple')).not.toBeNull();
    expect(qs('supplier-rubros').selectedOptions).toBeDefined();
    expect(form.querySelector('#category')).toBeNull();
    expect(form.querySelector('#targetDate')).toBeNull();
    expect(form.querySelector('#new-rubro-name')).not.toBeNull();
  });

  it('organiza la orden en cabecera, totales ocultos y detalle de compra', async () => {
    await bootPurchasing(dom);
    qs('nav-documents').click();
    qs('document-list-new').click();

    const form = qs('document-form');
    expect(form.querySelectorAll('.form-section').length).toBeGreaterThanOrEqual(2);
    expect(form.querySelector('[data-form-section="header"] .form-grid')).not.toBeNull();
    expect(form.querySelector('[data-form-section="legacy"] .form-grid')).not.toBeNull();
    expect(form.querySelector('#document-entity')).not.toBeNull();
    expect(form.querySelector('#document-employee')).not.toBeNull();
    expect(form.querySelector('#endDate')).not.toBeNull();
    expect(form.querySelector('#document-lines-heading')).not.toBeNull();
    expect(form.querySelector('#document-lines-table')).not.toBeNull();
    expect(form.querySelector('#category')).toBeNull();
    expect(form.querySelector('#targetDate')).toBeNull();
    expect(form.querySelector('#new-category-name')).toBeNull();

    for (const id of ['startDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'notes']) {
      expect(fieldHidden(id)).toBe(true);
    }
  });

  it('conserva el formulario de producto sin creación de categorías', async () => {
    await bootPurchasing(dom);
    qs('nav-products').click();
    qs('product-list-new').click();

    const form = qs('product-form');
    expect(form.querySelector('.form-section .form-grid')).not.toBeNull();
    expect(form.querySelector('#product-nombre')).not.toBeNull();
    expect(form.querySelector('#product-unidad')).not.toBeNull();
    expect(form.querySelector('#product-stock')).not.toBeNull();
    expect(form.querySelector('#product-categoria')).not.toBeNull();
    expect(form.querySelector('#category-nombre')).toBeNull();
    expect(form.querySelector('#new-category-name')).toBeNull();
    expect(form.querySelector('[data-action="new-category"]')).toBeNull();
    expect(form.querySelector('#product-categoria').tagName).toBe('SELECT');
  });

  it('define dos columnas y una columna efectiva en móvil', async () => {
    await bootPurchasing(dom);
    qs('nav-entities').click();
    qs('entity-list-new').click();
    const grid = qs('entity-form').querySelector('.form-grid');
    const computed = dom.window.getComputedStyle(grid).gridTemplateColumns;
    expect(computed === '' || computed.includes('1fr')).toBe(true);
    expect(styles).toMatch(/\.form-grid\s*\{[^}]*grid-template-columns\s*:\s*repeat\(2/);
    expect(styles).toMatch(/@media\s*\(max-width\s*:\s*800px\)\s*\{[\s\S]*?\.form-grid\s*\{\s*grid-template-columns\s*:\s*1fr/);
    expect(styles).toMatch(/\.form-grid\s+\.field-span\s*\{[^}]*grid-column\s*:\s*1\s*\/\s*-1/);
  });
});
