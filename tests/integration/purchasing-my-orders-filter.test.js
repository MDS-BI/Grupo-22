import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootPurchasingAs,
  installDom,
  installStyles,
  qs
} from '../helpers/purchasing-app.js';

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

async function login(userId) {
  const auth = await import('../../src/auth.js');
  auth.clearSession();
  auth.login(userId);
  const app = await import('../../src/app.js');
  const configModule = await import('../../src/module-config.js');
  const normalized = configModule.normalizeConfig(configModule.PURCHASING_CONFIG);
  await app.initApp(normalized);
}

async function loadDemoFor(userId) {
  const modules = await bootPurchasingAs(dom, 'ADMIN-001');
  qs('action-load-demo').click();
  await settle();
  if (!qs('confirm-dialog').hidden) {
    qs('confirm-dialog-accept').click();
    await settle();
  }
  await login(userId);
  return modules;
}

function visibleOrderIds() {
  return [...qs('document-table-body').querySelectorAll('tr[data-order-id]')]
    .map(row => row.dataset.orderId);
}

describe('filtro Solo mis OC', () => {
  it('solo se ofrece al Comprador con empleado propio', async () => {
    await loadDemoFor('DEMO-BODEGUERO');
    qs('nav-documents').click();
    expect(qs('documents-filter-mine-field').hidden).toBe(true);

    await login('DEMO-COMPRADOR');
    qs('nav-documents').click();

    const field = qs('documents-filter-mine-field');
    expect(field.hidden).toBe(false);
    const input = qs('documents-filter-mine');
    expect(input.type).toBe('checkbox');
    expect(input.disabled).toBe(false);
    expect(dom.window.document.querySelector('label[for="documents-filter-mine"]')?.textContent).toBe('Solo mis OC');
  });

  it('muestra el subconjunto propio, se combina con otros filtros y se limpia', async () => {
    const { purchasing } = await loadDemoFor('DEMO-COMPRADOR');
    const ownEmployee = purchasing.loadEmployees()
      .find(employee => String(employee.userId || '').toUpperCase() === 'DEMO-COMPRADOR');
    const ownId = ownEmployee.id_empleado || ownEmployee.id;

    qs('nav-documents').click();
    const allIds = visibleOrderIds();
    expect(allIds).toHaveLength(12);

    const documentsBefore = JSON.stringify({
      documents: purchasing.listPurchaseOrdersWithActions(),
      metadata: purchasing.loadOrderMetadata()
    });

    qs('documents-filter-mine').checked = true;
    qs('documents-filter-mine').dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const ownIds = visibleOrderIds();
    expect(ownIds.length).toBeGreaterThanOrEqual(3);
    expect(ownIds.length).toBeLessThan(allIds.length);
    for (const orderId of ownIds) {
      expect(purchasing.getOrderMetadata(orderId)?.id_empleado).toBe(ownId);
    }
    expect(qs('document-filter-summary').textContent).toContain('Solo mis OC');

    const status = purchasing.getPurchaseOrderDetail(ownIds[0]).status;
    qs('documents-filter-status').value = status;
    qs('documents-filter-status').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const combined = visibleOrderIds();
    expect(combined.length).toBeGreaterThanOrEqual(1);
    expect(combined.every(orderId => ownIds.includes(orderId))).toBe(true);

    qs('documents-filter-clear').click();
    expect(qs('documents-filter-mine').checked).toBe(false);
    expect(visibleOrderIds()).toHaveLength(12);

    expect(JSON.stringify({
      documents: purchasing.listPurchaseOrdersWithActions(),
      metadata: purchasing.loadOrderMetadata()
    })).toBe(documentsBefore);
  });
});
