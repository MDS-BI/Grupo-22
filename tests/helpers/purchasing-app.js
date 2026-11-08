import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

export const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

export function installDom() {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  const window = dom.window;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  globalThis.print = vi.fn();
  window.scrollTo = vi.fn();
  window.localStorage.clear();
  return dom;
}

export async function bootPurchasing(dom) {
  vi.resetModules();
  const configModule = await import('../../src/module-config.js');
  const storage = await import('../../src/storage.js');
  const purchasing = await import('../../src/purchasing-storage.js');
  const normalized = configModule.normalizeConfig(configModule.PURCHASING_CONFIG);
  configModule.setActiveConfig(normalized.config);

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
  const seedData = { category, product, other, employee, supplier };

  const { initApp } = await import('../../src/app.js');
  await initApp(normalized);
  return { configModule, storage, purchasing, seedData, normalized };
}

export function createOrder(purchasing, storage, seedData, overrides = {}) {
  return purchasing.savePurchaseOrder({
    entityId: seedData.supplier.entity_id,
    id_empleado: seedData.employee.id_empleado,
    folio: 1001,
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    paymentTerms: 'Crédito 30 días',
    status: 'borrador',
    lines: [
      { id_producto: seedData.product.id_producto, cantidad: 2, costo_unitario: 1000 }
    ],
    ...overrides
  });
}

export function qs(id) {
  return document.getElementById(id);
}

export function submitForm(dom, id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
