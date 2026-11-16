import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootPurchasing,
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

function change(element) {
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function optionValues(select) {
  return [...select.options].map(option => option.value).filter(Boolean);
}

function openNewProduct() {
  qs('nav-products').click();
  qs('product-list-new').click();
}

function fillProduct(nombre, categoryId) {
  qs('product-nombre').value = nombre;
  qs('product-unidad').value = 'unidad';
  qs('product-stock').value = '3';
  qs('product-categoria').value = categoryId;
}

function addPriceRow(entityId, price) {
  qs('product-price-add').click();
  const rows = qs('product-prices-body').querySelectorAll('tr[data-price-row]');
  const row = rows[rows.length - 1];
  const supplier = row.querySelector('[data-field="entity_id"]');
  supplier.value = entityId;
  change(supplier);
  const refreshed = qs('product-prices-body').querySelectorAll('tr[data-price-row]')[rows.length - 1];
  refreshed.querySelector('[data-field="precio"]').value = String(price);
}

describe('006 · producto vinculado a proveedores al crearlo', () => {
  it('el Gerente crea un producto con uno o más proveedores y su precio acordado', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'GER-001');
    const second = storage.addEntity({ name: 'Proveedor Dos', code: '11.111.111-1', category: 'Insumos', paymentTerms: 'Contado' });
    openNewProduct();
    expect(qs('product-prices-section').hidden).toBe(false);

    fillProduct('Toner', seedData.category.id_categoria);
    submitForm(dom, 'product-form');
    expect(qs('error-product-prices').textContent).toContain('al menos a un proveedor');
    expect(purchasing.loadProducts().some(product => product.nombre === 'Toner')).toBe(false);

    addPriceRow(seedData.supplier.entity_id, 15000);
    addPriceRow(second.entity_id, 14500);
    submitForm(dom, 'product-form');

    const toner = purchasing.loadProducts().find(product => product.nombre === 'Toner');
    expect(toner).toBeTruthy();
    expect(purchasing.getSupplierPricesForProduct(toner.id_producto).map(entry => entry.precio).sort()).toEqual([14500, 15000]);
    const row = [...qs('product-table-body').querySelectorAll('tr')].find(item => item.textContent.includes('Toner'));
    expect(row.textContent).toContain('Proveedor Uno');
    expect(row.textContent).toContain('Proveedor Dos');
  });

  it('el Bodeguero edita productos pero no crea productos ni mantiene listas de precios', async () => {
    const { purchasing, seedData } = await bootPurchasingAs(dom, 'BOD-001');
    qs('nav-products').click();
    expect(qs('product-list-new')).toBeNull();
    expect(qs('product-prices-section').hidden).toBe(true);

    fillProduct('Intento', seedData.category.id_categoria);
    submitForm(dom, 'product-form');
    expect(qs('product-form-feedback').textContent).toContain('Solo Gerente o Administrador');
    expect(purchasing.loadProducts().some(product => product.nombre === 'Intento')).toBe(false);

    qs('product-table-body').querySelector('[data-action="edit-product"]').click();
    qs('product-stock').value = '12';
    submitForm(dom, 'product-form');
    expect(purchasing.loadProducts().some(product => Number(product.stock) === 12)).toBe(true);
  });
});

describe('006 · orden de compra con la lista de precios del proveedor', () => {
  it('solo ofrece los productos del proveedor y completa el precio sin permitir editarlo', async () => {
    const { purchasing, seedData } = await bootPurchasing(dom);
    purchasing.upsertSupplierPrice({ entity_id: seedData.supplier.entity_id, id_producto: seedData.product.id_producto, precio: 1200 });
    qs('nav-documents').click();
    qs('document-entity').value = seedData.supplier.entity_id;
    change(qs('document-entity'));

    expect(optionValues(qs('line-product'))).toEqual([seedData.product.id_producto]);
    qs('line-product').value = seedData.product.id_producto;
    change(qs('line-product'));
    expect(qs('line-cost').value).toBe('1200');
    expect(qs('line-cost').readOnly).toBe(true);
    expect(qs('line-cost-help').hidden).toBe(false);

    qs('line-cost').value = '1';
    qs('line-quantity').value = '2';
    qs('add-line-button').click();
    expect(qs('document-totals').textContent).toContain('2.856');

    qs('document-employee').value = seedData.employee.id_empleado;
    qs('endDate').value = '10-12-2026';
    submitForm(dom, 'document-form');
    const [order] = purchasing.listPurchaseOrdersWithActions();
    expect(order.lines[0].costo_unitario).toBe(1200);
  });

  it('mantiene el precio manual para proveedores sin lista de precios (002)', async () => {
    const { seedData } = await bootPurchasing(dom);
    qs('nav-documents').click();
    qs('document-entity').value = seedData.supplier.entity_id;
    change(qs('document-entity'));
    expect(optionValues(qs('line-product'))).toHaveLength(2);
    expect(qs('line-cost').readOnly).toBe(false);
  });

  it('muestra la ayuda de Moneda según el origen del proveedor', async () => {
    const { storage, seedData } = await bootPurchasing(dom);
    const foreign = storage.addEntity({ name: 'Foreign Co.', origin: 'Extranjero', foreignTaxId: 'SG-9', category: 'Insumos', paymentTerms: 'Contado' });
    qs('nav-documents').click();
    qs('document-entity').value = seedData.supplier.entity_id;
    change(qs('document-entity'));
    expect(qs('currency-help').hidden).toBe(false);
    expect(qs('currency-help').textContent).toBe('Moneda fija CLP para proveedores nacionales.');
    expect(qs('currency').getAttribute('aria-describedby')).toBe('currency-help');
    qs('document-entity').value = foreign.entity_id;
    change(qs('document-entity'));
    expect(qs('currency-help').textContent).toContain('USD o EUR');
  });
});

describe('006 · folios automáticos', () => {
  it('no pide folio, asigna SOL correlativo y el folio OC al aprobar', async () => {
    const { purchasing, seedData } = await bootPurchasing(dom);
    qs('nav-documents').click();
    expect(qs('folio').closest('.field').hidden).toBe(true);

    qs('document-entity').value = seedData.supplier.entity_id;
    change(qs('document-entity'));
    qs('document-employee').value = seedData.employee.id_empleado;
    qs('endDate').value = '10-12-2026';
    qs('line-product').value = seedData.product.id_producto;
    qs('line-quantity').value = '1';
    qs('line-cost').value = '500';
    qs('add-line-button').click();
    submitForm(dom, 'document-form');

    const [order] = purchasing.listPurchaseOrdersWithActions();
    expect(order.folio).toBe(1);
    expect(qs('document-table-body').textContent).toContain('SOL-0001');

    purchasing.changeOrderStatus(order.id, 'pendiente');
    purchasing.changeOrderStatus(order.id, 'aprobado');
    qs('nav-dashboard').click();
    qs('nav-documents').click();
    expect(qs('document-table-body').textContent).toContain('OC-0001');
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    expect(qs('order-detail-view').textContent).toContain('SOL-0001');
    expect(qs('order-detail-view').textContent).toContain('OC-0001');
  });
});

describe('006 · filtro de estado con nombres específicos', () => {
  it('no repite nombres y filtra por estado o por tipo de documento', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    createOrder(purchasing, storage, seedData, { folio: 10, status: 'borrador' });
    createOrder(purchasing, storage, seedData, { folio: 11, status: 'pendiente' });
    qs('nav-documents').click();
    const labels = [...qs('documents-filter-status').options].map(option => option.textContent);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(expect.arrayContaining([
      'Solicitud – Borrador',
      'Solicitud – Pendiente de aprobación',
      'OC emitida – Aprobada',
      'OC – Recibida',
      'Cancelada'
    ]));

    qs('documents-filter-status').value = 'pendiente';
    change(qs('documents-filter-status'));
    expect(qs('document-table-body').querySelectorAll('tr[data-order-id]')).toHaveLength(1);
    expect(qs('document-table-body').textContent).toContain('SOL-0011');

    qs('documents-filter-status').value = 'tipo:solicitud';
    change(qs('documents-filter-status'));
    expect(qs('document-table-body').querySelectorAll('tr[data-order-id]')).toHaveLength(2);
  });
});

describe('006 · ficha del proveedor desde Búsqueda', () => {
  it('abre la ficha con datos, historial de OC y monto total comprado', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    const draft = createOrder(purchasing, storage, seedData, { folio: 20, status: 'borrador' });
    const approved = createOrder(purchasing, storage, seedData, { folio: 21, status: 'aprobado', startDate: '2026-11-01' });
    qs('action-find').click();
    qs('search-input').value = 'Proveedor Uno';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    qs('search-results-list').querySelector('[data-action="open-supplier-summary"]').click();
    const summary = qs('supplier-summary');
    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toContain('Ficha del proveedor · Proveedor Uno');
    expect(summary.textContent).toContain(seedData.supplier.code);
    expect(summary.querySelectorAll('#supplier-summary-orders tbody tr[data-order-id]')).toHaveLength(2);
    expect(summary.querySelector(`[data-order-id="${draft.id}"]`).textContent).toContain('SOL-0020');
    expect(summary.querySelector(`[data-order-id="${approved.id}"]`).textContent).toContain('OC-0001');
    expect(summary.textContent).toContain('1 OC emitidas');
    expect(summary.querySelector('.supplier-total').textContent).toContain('2.380');

    summary.querySelector('[data-action="close-supplier-summary"]').click();
    expect(summary.hidden).toBe(true);
  });

  it('encuentra órdenes por número de solicitud y folio OC', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    createOrder(purchasing, storage, seedData, { folio: 30, status: 'aprobado', startDate: '2026-11-01' });
    qs('action-find').click();
    qs('search-input').value = 'oc-0001';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-results-list').textContent).toContain('SOL-0030 · OC-0001');
  });

  it('muestra la identificación extranjera sin separadores vacíos', async () => {
    const { storage } = await bootPurchasing(dom);
    storage.addEntity({ name: 'Foreign Co.', origin: 'Extranjero', foreignTaxId: 'SG-77', category: 'Insumos', paymentTerms: 'Contado' });
    qs('action-find').click();
    qs('search-input').value = 'Foreign';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const text = qs('search-results-list').textContent;
    expect(text).toContain('Foreign Co. · ID tributario ext. SG-77');
    expect(text).not.toMatch(/·\s*·/);
    expect(text.trim()).not.toMatch(/·$/);

    qs('nav-entities').click();
    expect(qs('entity-table-body').textContent).toContain('ID tributario ext. SG-77');
  });
});

describe('006 · datos de demostración con listas de precios', () => {
  it('vincula cada producto y cada proveedor demo y usa los precios de la lista en las órdenes', async () => {
    const { purchasing, storage } = await bootPurchasingAs(dom, 'GER-001');
    qs('action-load-demo').click();
    qs('confirm-dialog-accept').click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(qs('demo-feedback').textContent).toContain('precios acordados');
    const products = purchasing.loadProducts();
    expect(products).toHaveLength(15);
    for (const product of products) {
      expect(purchasing.getSupplierPricesForProduct(product.id_producto).length, product.nombre).toBeGreaterThan(0);
    }
    for (const supplier of storage.loadEntities()) {
      expect(purchasing.getSupplierPriceList(supplier.entity_id).length, supplier.name).toBeGreaterThan(0);
    }
    for (const order of purchasing.listPurchaseOrdersWithActions()) {
      for (const line of order.lines) {
        expect(purchasing.findSupplierPrice(order.entity_id, line.id_producto)?.precio).toBe(line.costo_unitario);
      }
      if (['aprobado', 'recibido'].includes(order.status)) expect(order.ocFolio).toBeGreaterThan(0);
    }
  });
});
