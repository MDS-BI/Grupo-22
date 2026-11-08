import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let configModule;
let storage;
let purchasing;
let seedData;

function qs(id) {
  return document.getElementById(id);
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  globalThis.print = vi.fn();
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();

  configModule = await import('../../src/module-config.js');
  storage = await import('../../src/storage.js');
  purchasing = await import('../../src/purchasing-storage.js');
  configModule.setActiveConfig(configModule.normalizeConfig(configModule.PURCHASING_CONFIG).config);

  const category = purchasing.addCategory({ nombre: 'Insumos' });
  const product = purchasing.addProduct({
    nombre: 'Lápiz',
    unidad_medida: 'unidad',
    stock: 5,
    id_categoria: category.id_categoria
  });
  const other = purchasing.addProduct({
    nombre: 'Papel',
    unidad_medida: 'resma',
    stock: 2,
    id_categoria: category.id_categoria
  });
  const employee = purchasing.addEmployee({ nombre: 'Ana Pérez' });
  const supplier = storage.addEntity({
    name: 'Proveedor Uno',
    code: '12.345.678-5',
    category: 'Insumos',
    paymentTerms: 'Contado'
  });
  seedData = { category, product, other, employee, supplier };

  const { initApp } = await import('../../src/app.js');
  await initApp(configModule.normalizeConfig(configModule.PURCHASING_CONFIG));
});

afterEach(() => {
  dom.window.close();
});

describe('purchase order workflow UI', () => {
  it('shows purchasing navigation and renders the product catalog', () => {
    expect(qs('nav-products')).not.toBeNull();
    expect(qs('nav-products-label').textContent).toBe('Productos');
    qs('nav-products').click();
    expect(qs('view-products').hidden).toBe(false);
    expect(qs('product-table-body').textContent).toContain('Lápiz');
    expect(qs('product-table-body').textContent).toContain('Papel');

    qs('product-nombre').value = 'Toner';
    qs('product-unidad').value = 'cartucho';
    qs('product-stock').value = '4';
    qs('product-categoria').value = seedData.category.id_categoria;
    submitForm('product-form');
    expect(purchasing.loadProducts()).toHaveLength(3);
    expect(qs('product-table-body').textContent).toContain('Toner');
  });

  it('creates an order with lines, walks the state machine, receives stock and prints it', () => {
    qs('nav-documents').click();
    qs('document-entity').value = seedData.supplier.entity_id;
    qs('document-employee').value = seedData.employee.id_empleado;
    qs('folio').value = '1001';
    qs('startDate').value = '2026-11-01';
    qs('endDate').value = '2026-11-10';
    qs('docPaymentTerms').value = 'Crédito 30 días';
    qs('notes').value = 'Compra de insumos';

    qs('line-product').value = seedData.product.id_producto;
    qs('line-quantity').value = '2';
    qs('line-cost').value = '1000';
    qs('add-line-button').click();
    expect(qs('document-lines-body').textContent).toContain('Lápiz');
    expect(qs('document-totals').textContent).toContain('2.380');

    qs('line-product').value = seedData.other.id_producto;
    qs('line-quantity').value = '3';
    qs('line-cost').value = '500';
    qs('add-line-button').click();
    expect(qs('document-totals').textContent).toContain('4.165');

    submitForm('document-form');
    expect(storage.loadDocuments()).toHaveLength(1);
    const order = storage.loadDocuments()[0];
    expect(order.status).toBe('borrador');
    expect(purchasing.getLinesForOrder(order.id)).toHaveLength(2);

    qs('document-table-body').querySelector('[data-action="view-order"]').click();
    expect(qs('view-order-detail').hidden).toBe(false);
    expect(qs('order-detail-view').textContent).toContain('1001');
    expect(qs('order-detail-view').textContent).toContain('Ana Pérez');
    expect(qs('order-lines-table').textContent).toContain('Lápiz');

    qs('order-actions').querySelector('[data-next-status="pendiente"]').click();
    expect(storage.loadDocuments()[0].status).toBe('pendiente');
    qs('order-actions').querySelector('[data-next-status="aprobado"]').click();
    expect(storage.loadDocuments()[0].status).toBe('aprobado');
    qs('order-actions').querySelector('[data-next-status="recibido"]').click();
    expect(storage.loadDocuments()[0].status).toBe('recibido');

    expect(purchasing.loadProducts().find(product => product.id_producto === seedData.product.id_producto).stock).toBe(7);
    expect(purchasing.loadProducts().find(product => product.id_producto === seedData.other.id_producto).stock).toBe(5);
    expect(qs('order-history').textContent).toContain('recibido');
    expect(qs('order-detail-view').textContent).toContain('Sí');

    qs('order-actions').querySelector('[data-action="print-order"]').click();
    expect(qs('view-print').hidden).toBe(false);
    expect(globalThis.print).toHaveBeenCalled();
    expect(qs('print-order-view').textContent).toContain('Adquisiciones y Compras');
    expect(qs('print-order-view').textContent).toContain('Orden de Compra');
    expect(qs('print-order-view').textContent).toContain('Lápiz');
    expect(qs('print-order-view').textContent).toContain('Ana Pérez');
    expect(qs('print-order-view').querySelectorAll('button').length).toBe(0);
  });

  it('shows legacy orders without extension metadata as historical records', () => {
    const legacy = storage.addDocument({
      entityId: seedData.supplier.entity_id,
      folio: 2000,
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      status: 'borrador'
    });
    qs('nav-documents').click();
    const viewButton = qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${legacy.id}"]`);
    viewButton.click();
    expect(qs('order-detail-view').textContent).toContain('sin metadatos');
    expect(qs('order-detail-view').textContent).toContain('Empleado desconocido');
    expect(qs('order-history').textContent).toContain('Sin cambios de estado');
    expect(qs('order-actions').querySelector('[data-action="transition"]')).toBeNull();
  });
});
