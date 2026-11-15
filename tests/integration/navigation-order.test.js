import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasing, bootPurchasingAs, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

function navIds() {
  return [...qs('sidebar').querySelectorAll('.nav-module')].map(button => button.id);
}

function navLabels() {
  return [...qs('sidebar').querySelectorAll('.nav-module .nav-label')].map(label => label.textContent.trim());
}

describe('orden y visibilidad de la barra lateral', () => {
  it('ordena Panel, Solicitudes y Órdenes de Compra, Proveedores, Productos y Búsqueda', async () => {
    await bootPurchasing(dom);

    expect(navIds()).toEqual([
      'nav-dashboard',
      'nav-documents',
      'nav-entities',
      'nav-products',
      'nav-search'
    ]);
    expect(navLabels()).toEqual([
      'Panel',
      'Órdenes de Compra',
      'Proveedores',
      'Productos',
      'Búsqueda'
    ]);
    expect(qs('nav-documents').getAttribute('aria-label')).toBe('Solicitudes y Órdenes de Compra');
    expect(qs('nav-dashboard').getAttribute('aria-current')).toBe('page');
  });

  it('actualiza aria-current sin alterar el orden al navegar', async () => {
    await bootPurchasing(dom);
    const initialOrder = navIds();

    for (const module of ['documents', 'entities', 'products', 'search', 'dashboard']) {
      qs(`nav-${module}`).click();
      const current = [...qs('sidebar').querySelectorAll('[aria-current="page"]')];
      expect(current.map(button => button.id)).toEqual([`nav-${module}`]);
      expect(navIds()).toEqual(initialOrder);
    }
  });

  it('mantiene el mismo orden al iniciar sesión con cada rol', async () => {
    for (const user of ['ADMIN-001', 'GER-001', 'COMP-001', 'BOD-001', 'CONS-001']) {
      dom.window.close();
      dom = installDom();
      installStyles(dom);
      await bootPurchasingAs(dom, user);
      expect(navIds()).toEqual([
        'nav-dashboard',
        'nav-documents',
        'nav-entities',
        'nav-products',
        'nav-search'
      ]);
      expect(qs('nav-documents').getAttribute('aria-label')).toBe('Solicitudes y Órdenes de Compra');
    }
  });

  it('respeta la visibilidad por rol sin romper aria-current', async () => {
    await bootPurchasingAs(dom, 'BOD-001');

    expect(qs('nav-entities').hidden).toBe(true);
    expect(qs('nav-dashboard').hidden).toBe(false);
    expect(qs('nav-documents').hidden).toBe(false);
    expect(qs('nav-products').hidden).toBe(false);
    expect(qs('nav-search').hidden).toBe(false);
    expect(qs('nav-dashboard').getAttribute('aria-current')).toBe('page');

    qs('nav-documents').click();
    expect(qs('nav-documents').getAttribute('aria-current')).toBe('page');
    expect(qs('nav-dashboard').hasAttribute('aria-current')).toBe(false);
    expect(qs('nav-entities').getAttribute('aria-current')).toBeNull();
  });

  it('muestra todas las vistas a consulta sin habilitar acciones de escritura', async () => {
    await bootPurchasingAs(dom, 'CONS-001');
    for (const id of ['nav-dashboard', 'nav-documents', 'nav-entities', 'nav-products', 'nav-search']) {
      expect(qs(id).hidden).toBe(false);
    }
    expect(qs('entity-list-new').hidden).toBe(true);
    expect(qs('document-list-new').hidden).toBe(true);
  });
});
