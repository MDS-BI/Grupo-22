import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootPurchasingAs,
  installDom,
  installStyles,
  qs
} from '../helpers/purchasing-app.js';

const DENIED = 'No tienes permisos para ejecutar esta acción.';
let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function acceptReplacement() {
  if (qs('confirm-dialog').hidden) return;
  qs('confirm-dialog-accept').click();
  await settle();
}

async function login(userId) {
  const auth = await import('../../src/auth.js');
  auth.clearSession();
  auth.login(userId);
  const app = await import('../../src/app.js');
  const configModule = await import('../../src/module-config.js');
  const normalized = configModule.normalizeConfig(configModule.PURCHASING_CONFIG);
  await app.initApp(normalized);
}

async function loadDemoAndLogin(userId) {
  const modules = await bootPurchasingAs(dom, 'ADMIN-001');
  qs('action-load-demo').click();
  await settle();
  await acceptReplacement();
  await login(userId);
  return modules;
}

function openOrderByStatus(purchasing, status) {
  const order = purchasing.listPurchaseOrdersWithActions().find(item => item.status === status);
  expect(order).toBeTruthy();
  qs('nav-documents').click();
  qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
  return order;
}

function transitionStatuses() {
  return [...qs('order-actions').querySelectorAll('[data-action="transition"]')].map(button => button.dataset.nextStatus);
}

describe('ingreso con usuarios de prueba y matriz de permisos', () => {
  it('permite al Administrador y al Gerente usar todas las superficies', async () => {
    for (const userId of ['DEMO-ADMIN', 'DEMO-GERENTE']) {
      const { purchasing } = await loadDemoAndLogin(userId);
      for (const nav of ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-products', 'nav-search']) {
        expect(qs(nav).hidden).toBe(false);
      }
      expect(qs('action-load-demo').hidden).toBe(false);
      expect(qs('entity-form').hidden).toBe(false);
      expect(qs('document-form').hidden).toBe(false);
      openOrderByStatus(purchasing, 'aprobado');
      expect(transitionStatuses()).toEqual(['recibido']);
      expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
      expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).not.toBeNull();
    }
  });

  it('limita al Comprador a sus permisos y a su empleado propio', async () => {
    const { purchasing } = await loadDemoAndLogin('DEMO-COMPRADOR');
    expect(qs('action-load-demo').hidden).toBe(true);
    expect(qs('entity-list-new').hidden).toBe(false);
    expect(qs('document-list-new').hidden).toBe(false);

    qs('nav-products').click();
    expect(qs('product-form')).toBeNull();
    expect(qs('product-list-new')).toBeNull();

    const order = openOrderByStatus(purchasing, 'aprobado');
    expect(transitionStatuses()).toEqual([]);
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).not.toBeNull();

    const before = purchasing.getPurchaseOrderDetail(order.id);
    const button = dom.window.document.createElement('button');
    button.dataset.action = 'transition';
    button.dataset.nextStatus = 'recibido';
    qs('order-actions').appendChild(button);
    button.click();
    expect(qs('order-actions').querySelector('.feedback').textContent).toBe(DENIED);
    expect(purchasing.getPurchaseOrderDetail(order.id)).toEqual(before);
  });

  it('limita al Bodeguero a recepción y gestión de productos', async () => {
    const { purchasing } = await loadDemoAndLogin('DEMO-BODEGUERO');
    expect(qs('nav-entities').hidden).toBe(true);
    expect(qs('nav-documents').hidden).toBe(false);
    expect(qs('nav-products').hidden).toBe(false);
    expect(qs('action-load-demo').hidden).toBe(true);
    expect(qs('entity-list-new').hidden).toBe(true);
    expect(qs('document-list-new').hidden).toBe(true);

    qs('nav-products').click();
    expect(qs('product-form')).not.toBeNull();

    const order = openOrderByStatus(purchasing, 'aprobado');
    expect(transitionStatuses()).toEqual(['recibido']);
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).toBeNull();
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();
    expect(order.status).toBe('aprobado');
  });

  it('deja a la Consulta en modo solo lectura', async () => {
    const { purchasing } = await loadDemoAndLogin('DEMO-CONSULTA');
    expect(qs('action-load-demo').hidden).toBe(true);
    expect(qs('entity-list-new').hidden).toBe(true);
    expect(qs('document-list-new').hidden).toBe(true);
    expect(qs('entity-form').hidden).toBe(true);
    expect(qs('document-form').hidden).toBe(true);

    qs('nav-products').click();
    expect(qs('product-form')).toBeNull();

    const order = openOrderByStatus(purchasing, 'aprobado');
    expect(transitionStatuses()).toEqual([]);
    expect(qs('order-lines-table').querySelector('[data-action="delete-line"]')).toBeNull();
    expect(qs('order-actions').querySelector('[data-action="print-order"]')).not.toBeNull();

    const before = purchasing.getPurchaseOrderDetail(order.id);
    const button = dom.window.document.createElement('button');
    button.dataset.action = 'delete-line';
    button.dataset.productId = order.lines[0].id_producto;
    qs('order-lines-table').appendChild(button);
    button.click();
    expect(qs('order-actions').querySelector('.feedback').textContent).toBe(DENIED);
    expect(purchasing.getOrderMetadata(order.id)).toEqual(before.metadata);
  });
});
