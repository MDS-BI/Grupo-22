import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasing, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

function closePanel() {
  qs('side-panel-dialog').querySelector('[data-action="close-panel"]').click();
}

describe('listas a ancho completo con panel lateral', () => {
  it('mantiene Proveedores como lista a ancho completo con filtros y + Nuevo', async () => {
    await bootPurchasing(dom);
    qs('nav-entities').click();

    const view = qs('view-entities');
    expect(view.querySelector('.two-column')).toBeNull();
    expect(view.querySelector('.list-section')).not.toBeNull();
    expect(qs('entity-filters')).not.toBeNull();
    expect(qs('entity-table')).not.toBeNull();
    expect(qs('entity-list-new').hidden).toBe(false);
    expect(qs('entity-list-new').textContent).toContain('+ Nuevo');
    expect(qs('entity-form').closest('#view-entities')).toBeNull();

    qs('entity-list-new').click();
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(qs('entity-form').hidden).toBe(false);
    expect(qs('side-panel-dialog').contains(qs('entity-form'))).toBe(true);
    closePanel();
  });

  it('mantiene Solicitudes y Órdenes de Compra como lista a ancho completo con panel', async () => {
    await bootPurchasing(dom);
    qs('nav-documents').click();

    const view = qs('view-documents');
    expect(view.querySelector('.two-column')).toBeNull();
    expect(qs('document-filters')).not.toBeNull();
    expect(qs('documents-filter-status')).not.toBeNull();
    expect(qs('documents-filter-entity')).not.toBeNull();
    expect(qs('document-list-new').hidden).toBe(false);
    expect(qs('document-form').closest('#view-documents')).toBeNull();

    qs('document-list-new').click();
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(qs('document-form').hidden).toBe(false);
    expect(qs('side-panel-dialog').contains(qs('document-form'))).toBe(true);
    expect(qs('side-panel-title').textContent).toContain('Orden de Compra');
    closePanel();
  });

  it('mantiene Productos y Categorías como listas a ancho completo con + Nuevo y panel', async () => {
    await bootPurchasing(dom);
    qs('nav-products').click();

    expect(qs('products-view').querySelector('.two-column')).toBeNull();
    expect(qs('product-list-new').hidden).toBe(false);
    expect(qs('product-filter-query')).not.toBeNull();
    expect(qs('product-filter-category')).not.toBeNull();
    expect(qs('product-form').closest('#view-products')).toBeNull();

    qs('product-list-new').click();
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(qs('product-form').hidden).toBe(false);
    expect(qs('side-panel-dialog').contains(qs('product-form'))).toBe(true);
    closePanel();

    qs('products-tab-categorias').click();
    expect(qs('category-list-new').hidden).toBe(false);
    expect(qs('category-table-body').textContent).toContain('Insumos');

    qs('category-list-new').click();
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(qs('category-form').hidden).toBe(false);
    expect(qs('side-panel-dialog').contains(qs('category-form'))).toBe(true);
  });

  it('no conserva el layout de lista y formulario en dos columnas', async () => {
    await bootPurchasing(dom);
    for (const view of ['entities', 'documents', 'products']) {
      qs(`nav-${view}`).click();
      expect(qs(`view-${view}`).querySelector('.two-column')).toBeNull();
      expect(qs(`view-${view}`).querySelector('.product-grid')).toBeNull();
    }
  });
});
