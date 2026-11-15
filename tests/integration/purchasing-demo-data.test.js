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

describe('carga de datos de demostración desde el panel', () => {
  it('carga datos para un rol autorizado y muestra el resumen', async () => {
    const { purchasing, storage } = await bootPurchasingAs(dom, 'GER-001');
    expect(qs('action-load-demo').hidden).toBe(false);
    const suppliersBefore = storage.loadEntities().length;
    const ordersBefore = storage.loadDocuments().length;

    qs('action-load-demo').click();

    expect(qs('demo-feedback').textContent).toContain('Datos de demostración cargados');
    expect(qs('demo-feedback').textContent).toContain('proveedores');
    expect(storage.loadEntities().length).toBeGreaterThan(suppliersBefore);
    expect(storage.loadDocuments().length).toBeGreaterThan(ordersBefore);
    expect(purchasing.loadEmployees().some(employee => String(employee.cargo).length > 0)).toBe(true);
  });

  it('es aditiva y mantiene unicidad al cargar más de una vez', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    qs('action-load-demo').click();
    const firstEntities = storage.loadEntities().length;
    const firstDocuments = storage.loadDocuments().length;

    qs('action-load-demo').click();

    const suppliers = storage.loadEntities();
    const folios = storage.loadDocuments().map(document => String(document.folio));
    expect(suppliers.length).toBeGreaterThan(firstEntities);
    expect(storage.loadDocuments().length).toBeGreaterThan(firstDocuments);
    expect(new Set(suppliers.map(entity => entity.code)).size).toBe(suppliers.length);
    expect(new Set(suppliers.map(entity => entity.name)).size).toBe(suppliers.length);
    expect(new Set(folios).size).toBe(folios.length);
    expect(qs('demo-feedback').textContent).toContain('Datos de demostración cargados');
  });

  it('no expone la acción ni muta datos para roles sin permisos', async () => {
    const { storage } = await bootPurchasingAs(dom, 'BOD-001');
    expect(qs('action-load-demo').hidden).toBe(true);
    const before = JSON.stringify({
      entities: storage.loadEntities(),
      documents: storage.loadDocuments()
    });

    qs('action-load-demo').click();

    expect(qs('demo-feedback').textContent).toBe('No tienes permisos para ejecutar esta acción.');
    expect(JSON.stringify({
      entities: storage.loadEntities(),
      documents: storage.loadDocuments()
    })).toBe(before);
  });
});
