import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootPurchasingAs,
  createOrder,
  installDom,
  qs,
  submitForm
} from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

afterEach(() => {
  dom.window.close();
});

function change(element, type = 'change') {
  element.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
}

/** Arranca como administrador con un segundo proveedor y precios (con tramos) para Lápiz y Papel. */
async function bootWithPrices(userId = 'ADMIN-001', { scaffold = false } = {}) {
  if (scaffold) {
    const shell = await import('../../src/ui-shell.js');
    shell.ensureShellScaffold();
  }
  const ctx = await bootPurchasingAs(dom, userId);
  const { storage, purchasing, seedData } = ctx;
  const second = storage.addEntity({ name: 'Proveedor Dos', code: '11.111.111-1', category: 'Insumos', paymentTerms: 'Contado' });
  const options = { skipAccessCheck: true };
  purchasing.upsertSupplierPrice({ entity_id: seedData.supplier.entity_id, id_producto: seedData.product.id_producto, precio: 1000, tramos: [{ desde: 1, precio: 1000 }, { desde: 10, precio: 900 }] }, options);
  purchasing.upsertSupplierPrice({ entity_id: second.entity_id, id_producto: seedData.product.id_producto, precio: 950 }, options);
  purchasing.upsertSupplierPrice({ entity_id: second.entity_id, id_producto: seedData.other.id_producto, precio: 4000 }, options);
  const mode = await import('../../src/ui-purchase-mode.js');
  const gestion = await import('../../src/ui-gestion.js');
  const management = await import('../../src/purchasing-management.js');
  return { ...ctx, second, mode, gestion, management };
}

function openNewRequest() {
  qs('nav-documents').click();
  qs('document-list-new').click();
}

function chooseProduct(productId, quantity) {
  qs('pbp-product').value = productId;
  change(qs('pbp-product'));
  qs('pbp-quantity').value = String(quantity);
  change(qs('pbp-quantity'), 'input');
}

describe('007 · US7 comprar por producto', () => {
  it('muestra los proveedores con su precio por tramo y marca el mejor precio', async () => {
    const { mode, seedData, second } = await bootWithPrices();
    mode.setDefaultPurchaseMode('product');
    openNewRequest();
    expect(qs('purchase-mode').hidden).toBe(false);
    expect(qs('purchase-by-product').hidden).toBe(false);
    expect(qs('document-entity').closest('.field').hidden).toBe(true);

    chooseProduct(seedData.product.id_producto, 2);
    let rows = [...qs('pbp-options').querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Proveedor Dos');
    expect(rows[0].textContent).toContain('Mejor precio');
    expect(rows[1].textContent).toContain('Desde 10 u.');

    chooseProduct(seedData.product.id_producto, 10);
    rows = [...qs('pbp-options').querySelectorAll('tbody tr')];
    expect(rows[0].textContent).toContain('Proveedor Uno');
    expect(rows[0].querySelector('[data-action="pbp-add"]').dataset.entityId).toBe(seedData.supplier.entity_id);
    expect(rows[1].querySelector('[data-action="pbp-add"]').dataset.entityId).toBe(second.entity_id);
  });

  it('crea una solicitud por proveedor con los precios pactados', async () => {
    const { mode, seedData, purchasing, storage } = await bootWithPrices();
    mode.setDefaultPurchaseMode('product');
    openNewRequest();
    chooseProduct(seedData.product.id_producto, 10);
    qs('pbp-options').querySelector('[data-action="pbp-add"]').click();
    chooseProduct(seedData.other.id_producto, 3);
    qs('pbp-options').querySelector('[data-action="pbp-add"]').click();
    expect(qs('pbp-cart').textContent).toContain('2 solicitudes');
    expect(qs('document-submit-button').textContent).toBe('Crear 2 solicitudes');

    qs('document-employee').value = seedData.employee.id_empleado;
    submitForm(dom, 'document-form');

    const orders = storage.loadDocuments();
    expect(orders).toHaveLength(2);
    const lines = orders.flatMap(order => purchasing.getLinesForOrder(order.id));
    expect(lines.find(line => line.id_producto === seedData.product.id_producto).costo_unitario).toBe(900);
    expect(lines.find(line => line.id_producto === seedData.other.id_producto).costo_unitario).toBe(4000);
    expect(orders.every(order => order.status === 'borrador')).toBe(true);
  });

  it('pide carrito y empleado antes de guardar, y al editar solo ofrece "Por proveedor"', async () => {
    const { mode, seedData, storage, purchasing } = await bootWithPrices();
    mode.setDefaultPurchaseMode('product');
    openNewRequest();
    qs('document-employee').value = seedData.employee.id_empleado;
    submitForm(dom, 'document-form');
    expect(qs('document-feedback').textContent).toContain('Agrega al menos un producto');
    expect(storage.loadDocuments()).toHaveLength(0);

    const order = createOrder(purchasing, storage, seedData);
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="edit"][data-id="${order.id}"]`).click();
    expect(qs('purchase-mode').hidden).toBe(true);
    expect(qs('purchase-by-product').hidden).toBe(true);
    expect(qs('document-entity').closest('.field').hidden).toBe(false);
  });
});

describe('007 · US7 tramos en la ficha del producto', () => {
  it('agrega un tramo "desde N unidades" bajo el precio del proveedor y lo guarda', async () => {
    const { purchasing, seedData } = await bootWithPrices();
    qs('nav-products').click();
    qs('product-table-body').querySelector(`[data-action="edit-product"][data-id="${seedData.other.id_producto}"]`).click();
    const addTier = qs('product-prices-body').querySelector('[data-action="add-tier"]');
    addTier.click();
    qs('product-prices-body').querySelector('[data-tier-field="desde"]').value = '20';
    qs('product-prices-body').querySelector('[data-tier-field="precio"]').value = '3500';
    submitForm(dom, 'product-form');
    const entry = purchasing.loadSupplierPrices().find(item => item.id_producto === seedData.other.id_producto);
    expect(entry.tramos).toEqual([{ desde: 1, precio: 4000 }, { desde: 20, precio: 3500 }]);
    expect(qs('product-table-body').textContent).toContain('desde 20 u.');
  });
});

describe('007 · US2 stock mínimo y reposición', () => {
  it('guarda el stock mínimo desde el formulario y lo muestra en el catálogo', async () => {
    const { purchasing, seedData } = await bootWithPrices();
    qs('nav-products').click();
    qs('product-table-body').querySelector(`[data-action="edit-product"][data-id="${seedData.product.id_producto}"]`).click();
    qs('product-stock-minimo').value = '8';
    submitForm(dom, 'product-form');
    const saved = purchasing.loadProducts().find(product => product.id_producto === seedData.product.id_producto);
    expect(saved.stock_minimo).toBe(8);
    expect(qs('product-table-body').textContent).toContain('Bajo mínimo 8');
  });

  it('el Panel lista los productos bajo el mínimo y crea las solicitudes sugeridas', async () => {
    const { purchasing, seedData, storage } = await bootWithPrices();
    purchasing.updateProduct(seedData.product.id_producto, { stock_minimo: 6 });
    qs('nav-dashboard').click();
    expect(qs('insight-reorder').hidden).toBe(false);
    expect(qs('reorder-list').textContent).toContain('Lápiz');
    expect(qs('reorder-list').textContent).toContain('Sugerido: 7');

    qs('reorder-create').click();
    expect(storage.loadDocuments()).toHaveLength(1);
    expect(qs('reorder-feedback').textContent).toContain('Se creó');
    expect(qs('reorder-list').textContent).toContain('En SOL-');
  });
});

describe('007 · US3 reportes y US1 evaluación', () => {
  it('habilita "Reportes" en el menú y agrupa el gasto emitido', async () => {
    const { purchasing, storage, seedData, gestion } = await bootWithPrices('ADMIN-001', { scaffold: true });
    const order = createOrder(purchasing, storage, seedData);
    purchasing.changeOrderStatus(order.id, 'pendiente');
    purchasing.changeOrderStatus(order.id, 'aprobado');

    const nav = qs('nav-reports');
    expect(nav.hidden).toBe(false);
    expect(nav.disabled).toBe(false);
    nav.click();
    expect(qs('view-reports').hidden).toBe(false);
    expect(qs('reports-table').textContent).toContain('Proveedor Uno');
    expect(qs('reports-table').textContent).toContain('100 %');

    qs('reports-export').click();
    expect(gestion.lastCsvExport.filename).toMatch(/^gasto-por-proveedor-\d{8}\.csv$/);
    expect(gestion.lastCsvExport.text.startsWith('﻿Proveedor;Cantidad de OC')).toBe(true);

    qs('reports-tab-suppliers').click();
    expect(qs('reports-suppliers-table').textContent).toContain('Sin datos');
  });

  it('oculta Reportes al bodeguero y muestra la calificación en Proveedores', async () => {
    const { purchasing, storage, seedData } = await bootWithPrices('ADMIN-001', { scaffold: true });
    const order = createOrder(purchasing, storage, seedData, { endDate: '2099-12-31' });
    purchasing.changeOrderStatus(order.id, 'pendiente');
    purchasing.changeOrderStatus(order.id, 'aprobado');
    purchasing.changeOrderStatus(order.id, 'recibido');
    qs('nav-entities').click();
    expect(qs('entity-table-body').textContent).toContain('Calificación A');

    qs('nav-search').click();
    qs('search-results-list').querySelector(`[data-action="open-supplier-summary"][data-id="${seedData.supplier.entity_id}"]`).click();
    expect(qs('supplier-evaluation').textContent).toContain('1 de 1 entregas a tiempo');
  });
});

describe('007 · US4 áreas y presupuestos', () => {
  it('pide área cuando existen áreas activas y avisa al aprobar si excede el presupuesto', async () => {
    const { purchasing, storage, seedData, management } = await bootWithPrices();
    const area = management.saveArea({ nombre: 'Operaciones' });
    const today = new Date();
    management.setBudget(area.id_area, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, 1000);
    qs('nav-documents').click();
    qs('document-list-new').click();
    expect(qs('document-area-field').hidden).toBe(false);

    const order = createOrder(purchasing, storage, seedData, { id_area: area.id_area });
    purchasing.changeOrderStatus(order.id, 'pendiente');
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    expect(qs('order-budget').textContent).toContain('Excede el presupuesto');

    qs('order-actions').querySelector('[data-next-status="aprobado"]').click();
    expect(globalThis.confirm.mock.calls.at(-1)[0]).toContain('excede el presupuesto de Operaciones');
    expect(purchasing.getPurchaseOrderDetail(order.id).status).toBe('aprobado');
  });
});

describe('007 · US5 notificaciones', () => {
  it('enciende la campana con el contador y marca como leído al abrir', async () => {
    const shell = await import('../../src/ui-shell.js');
    shell.ensureShellScaffold();
    const { purchasing, storage, seedData } = await bootWithPrices('GER-001');
    const order = createOrder(purchasing, storage, seedData);
    purchasing.changeOrderStatus(order.id, 'pendiente');
    qs('nav-dashboard').click();
    const bell = qs('notifications-placeholder');
    expect(bell.hidden).toBe(false);
    expect(bell.querySelector('.notification-badge').textContent).toBe('1');
    bell.click();
    expect(qs('notifications-panel').hidden).toBe(false);
    qs('notifications-panel').querySelector('[data-notification-id]').click();
    expect(qs('view-order-detail').hidden).toBe(false);
    expect(bell.querySelector('.notification-badge').hidden).toBe(true);
  });
});

describe('007 · US6 duplicar, inactivar, exportar y avisos', () => {
  it('duplica una orden como solicitud nueva en borrador', async () => {
    const { purchasing, storage, seedData } = await bootWithPrices();
    const order = createOrder(purchasing, storage, seedData);
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    qs('order-actions').querySelector('[data-action="duplicate-order"]').click();
    const orders = storage.loadDocuments();
    expect(orders).toHaveLength(2);
    const copy = orders.find(item => item.id !== order.id);
    expect(copy.status).toBe('borrador');
    expect(purchasing.getLinesForOrder(copy.id)[0].costo_unitario).toBe(1000);
  });

  it('inactiva un proveedor, lo saca de las solicitudes nuevas y avisa la cascada al eliminar', async () => {
    const { purchasing, storage, seedData, second } = await bootWithPrices();
    createOrder(purchasing, storage, seedData);
    qs('nav-entities').click();
    qs('entity-table-body').querySelector(`[data-action="toggle-status"][data-id="${second.id}"]`).click();
    expect(storage.loadEntities().find(entity => entity.id === second.id).estado).toBe('inactivo');
    expect(qs('entity-table-body').textContent).toContain('Inactivo');
    expect([...qs('document-entity').options].map(option => option.value)).not.toContain(second.entity_id);

    globalThis.confirm.mockReturnValueOnce(false);
    qs('entity-table-body').querySelector(`[data-action="delete"][data-id="${seedData.supplier.id}"]`).click();
    expect(globalThis.confirm.mock.calls.at(-1)[0]).toContain('También se eliminarán sus 1 solicitud(es)/OC asociadas');
    expect(storage.loadEntities()).toHaveLength(2);
  });

  it('exporta la lista de solicitudes y OC a CSV y filtra fechas en dd-mm-aaaa', async () => {
    const { purchasing, storage, seedData, gestion } = await bootWithPrices();
    createOrder(purchasing, storage, seedData, { endDate: '2026-11-10' });
    qs('nav-documents').click();
    expect(qs('documents-filter-from').type).toBe('text');
    expect(qs('documents-filter-from').placeholder).toBe('dd-mm-aaaa');
    qs('documents-export').click();
    expect(gestion.lastCsvExport.filename).toMatch(/^solicitudes-y-oc-/);
    expect(gestion.lastCsvExport.text).toContain('SOL-1001;;Proveedor Uno;');
  });
});
