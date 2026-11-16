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

async function acceptReplacement() {
  expect(qs('confirm-dialog').hidden).toBe(false);
  qs('confirm-dialog-accept').click();
  await settle();
}

describe('carga de datos de demostración desde el panel', () => {
  it('reemplaza los datos para un rol autorizado y muestra el resumen', async () => {
    const { purchasing, storage } = await bootPurchasingAs(dom, 'GER-001');
    expect(qs('action-load-demo').hidden).toBe(false);

    qs('action-load-demo').click();
    await acceptReplacement();

    expect(qs('demo-feedback').textContent).toContain('Datos de demostración cargados');
    expect(qs('demo-feedback').textContent).toContain('proveedores');
    expect(qs('demo-feedback').textContent).toContain('usuarios de prueba');
    expect(storage.loadEntities()).toHaveLength(8);
    expect(storage.loadDocuments()).toHaveLength(16);
    expect(storage.loadEntities().every(entity => entity.name.startsWith('Demo '))).toBe(true);
    expect(purchasing.loadEmployees().some(employee => String(employee.cargo).length > 0)).toBe(true);
  });

  it('es sustitutiva, atómica y mantiene unicidad al reemplazar de nuevo', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    qs('action-load-demo').click();
    await acceptReplacement();

    const firstEntities = storage.loadEntities().length;
    const firstDocuments = storage.loadDocuments().length;

    qs('action-load-demo').click();
    await acceptReplacement();

    const suppliers = storage.loadEntities();
    const folios = storage.loadDocuments().map(document => String(document.folio));
    expect(suppliers).toHaveLength(firstEntities);
    expect(storage.loadDocuments()).toHaveLength(firstDocuments);
    expect(new Set(suppliers.filter(entity => entity.origin === 'Nacional').map(entity => entity.code)).size)
      .toBe(6);
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
