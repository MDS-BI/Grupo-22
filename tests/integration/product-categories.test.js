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

async function bootCatalog() {
  const booted = await bootPurchasing(dom);
  qs('nav-products').click();
  return booted;
}

function submit(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function selectTab(id) {
  qs(id).click();
}

describe('sección Categorías en Productos', () => {
  it('lista las categorías existentes y permite alta en la pestaña Categorías', async () => {
    const { purchasing } = await bootCatalog();
    selectTab('products-tab-categorias');

    expect(qs('product-panel-categorias').hidden).toBe(false);
    expect(qs('product-panel-catalogo').hidden).toBe(true);
    expect(qs('category-table-body').textContent).toContain('Insumos');

    qs('category-list-new').click();
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(dom.window.document.activeElement).toBe(qs('category-nombre'));
    qs('category-nombre').value = 'Limpieza';
    submit('category-form');

    expect(qs('side-panel-dialog').hidden).toBe(true);
    expect(qs('category-table-body').textContent).toContain('Limpieza');
    expect(purchasing.loadCategories().some(category => category.nombre === 'Limpieza')).toBe(true);
    expect(qs('error-category-nombre').textContent).toBe('');
  });

  it('edita una categoría y conserva la unicidad sin distinguir mayúsculas', async () => {
    const { purchasing } = await bootCatalog();
    selectTab('products-tab-categorias');
    const category = purchasing.loadCategories().find(item => item.nombre === 'Insumos');

    qs('category-table-body').querySelector(`[data-action="edit-category"][data-id="${category.id_categoria}"]`).click();
    expect(qs('category-nombre').value).toBe('Insumos');
    qs('category-nombre').value = 'Insumos de oficina';
    submit('category-form');
    expect(purchasing.loadCategories().some(item => item.nombre === 'Insumos de oficina')).toBe(true);

    qs('category-list-new').click();
    qs('category-nombre').value = 'INSUMOS DE OFICINA';
    submit('category-form');
    expect(qs('error-category-nombre').textContent).toContain('Ya existe');
    expect(qs('side-panel-dialog').hidden).toBe(false);
    expect(purchasing.loadCategories().filter(item => item.nombre.toLowerCase() === 'insumos de oficina').length).toBe(1);

    const before = purchasing.loadCategories();
    expect(() => purchasing.addCategory({ nombre: 'insumos de oficina' })).toThrow(/Ya existe/);
    expect(purchasing.loadCategories()).toEqual(before);
  });

  it('bloquea la eliminación de categorías referenciadas y elimina las libres', async () => {
    const { purchasing } = await bootCatalog();
    selectTab('products-tab-categorias');
    const referenced = purchasing.loadCategories().find(item => item.nombre === 'Insumos');
    const before = purchasing.loadCategories();

    qs('category-table-body').querySelector(`[data-action="delete-category"][data-id="${referenced.id_categoria}"]`).click();
    expect(qs('category-feedback').textContent).toContain('referenciada');
    expect(purchasing.loadCategories()).toEqual(before);

    const free = purchasing.addCategory({ nombre: 'Temporal' });
    qs('nav-products').click();
    qs('products-tab-categorias').click();
    qs('category-table-body').querySelector(`[data-action="delete-category"][data-id="${free.id_categoria}"]`).click();
    expect(purchasing.loadCategories().some(item => item.nombre === 'Temporal')).toBe(false);
    expect(qs('category-table-body').textContent).not.toContain('Temporal');
  });

  it('no ofrece alta de categorías dentro del formulario de producto', async () => {
    await bootCatalog();
    qs('product-list-new').click();
    const productForm = qs('product-form');
    expect(productForm.querySelector('#category-nombre')).toBeNull();
    expect(productForm.querySelector('#new-category-name')).toBeNull();
    expect(productForm.querySelector('[data-action="new-category"]')).toBeNull();
    expect(productForm.querySelectorAll('form').length).toBe(0);
    expect(productForm.querySelector('#product-categoria').tagName).toBe('SELECT');
  });

  it('expone pestañas accesibles con semántica y navegación por teclado', async () => {
    await bootCatalog();
    const catalogTab = qs('products-tab-catalogo');
    const categoriesTab = qs('products-tab-categorias');

    expect(catalogTab.getAttribute('role')).toBe('tab');
    expect(categoriesTab.getAttribute('role')).toBe('tab');
    expect(catalogTab.getAttribute('aria-controls')).toBe('product-panel-catalogo');
    expect(categoriesTab.getAttribute('aria-controls')).toBe('product-panel-categorias');
    expect(qs('product-panel-catalogo').getAttribute('role')).toBe('tabpanel');
    expect(qs('product-panel-categorias').getAttribute('role')).toBe('tabpanel');
    expect(catalogTab.getAttribute('aria-selected')).toBe('true');
    expect(categoriesTab.getAttribute('aria-selected')).toBe('false');
    expect(catalogTab.tabIndex).toBe(0);
    expect(categoriesTab.tabIndex).toBe(-1);
    expect(dom.window.getComputedStyle(qs('product-panel-categorias')).display).toBe('none');

    catalogTab.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(dom.window.document.activeElement).toBe(categoriesTab);
    expect(categoriesTab.getAttribute('aria-selected')).toBe('true');
    expect(categoriesTab.tabIndex).toBe(0);
    expect(catalogTab.tabIndex).toBe(-1);
    expect(dom.window.getComputedStyle(qs('product-panel-categorias')).display).not.toBe('none');
    expect(dom.window.getComputedStyle(qs('product-panel-catalogo')).display).toBe('none');

    categoriesTab.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(dom.window.document.activeElement).toBe(catalogTab);
    expect(catalogTab.getAttribute('aria-selected')).toBe('true');
  });

  it('rechaza la edición forzada de categorías sin permiso sin mutar datos', async () => {
    const { purchasing } = await bootBookingAsConsulta();
    selectTab('products-tab-categorias');
    const before = purchasing.loadCategories();

    const button = dom.window.document.createElement('button');
    button.dataset.action = 'edit-category';
    button.dataset.id = before[0].id_categoria;
    qs('category-table-body').appendChild(button);
    button.click();

    expect(qs('product-feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
    expect(purchasing.loadCategories()).toEqual(before);
    expect(qs('category-list-new')).toBeNull();
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });
});

async function bootBookingAsConsulta() {
  const auth = await import('../../src/auth.js');
  auth.ensureDefaultUsers();
  auth.login('CONS-001');
  const booted = await bootPurchasing(dom);
  qs('nav-products').click();
  return booted;
}
