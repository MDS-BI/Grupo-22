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

async function openConfirmation() {
  qs('action-load-demo').click();
  await settle();
}

async function accept() {
  expect(qs('confirm-dialog').hidden).toBe(false);
  qs('confirm-dialog-accept').click();
  await settle();
}

describe('sustitución segura de datos de demostración', () => {
  it('carga sin confirmación en un entorno vacío', async () => {
    const { storage, purchasing } = await bootPurchasingAs(dom, 'ADMIN-001');
    storage.clearAll();
    purchasing.clearPurchasingData();

    await openConfirmation();

    expect(qs('confirm-dialog').hidden).toBe(true);
    expect(qs('demo-feedback').textContent).toContain('Datos de demostración cargados');
    expect(storage.loadEntities()).toHaveLength(8);
  });

  it('ofrece Reemplazar o Cancelar y no muta datos al cancelar o presionar Esc', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    const before = JSON.stringify({
      entities: storage.loadEntities(),
      documents: storage.loadDocuments(),
      session: dom.window.localStorage.getItem('erp_auth:session')
    });

    await openConfirmation();
    expect(qs('confirm-dialog').hidden).toBe(false);
    expect(qs('confirm-dialog-accept').textContent).toBe('Reemplazar por datos de demostración');
    expect(qs('confirm-dialog-cancel').textContent).toBe('Cancelar');

    qs('confirm-dialog-cancel').click();
    await settle();
    expect(qs('confirm-dialog').hidden).toBe(true);
    expect(JSON.stringify({
      entities: storage.loadEntities(),
      documents: storage.loadDocuments(),
      session: dom.window.localStorage.getItem('erp_auth:session')
    })).toBe(before);

    await openConfirmation();
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(qs('confirm-dialog').hidden).toBe(true);
    expect(JSON.stringify({
      entities: storage.loadEntities(),
      documents: storage.loadDocuments(),
      session: dom.window.localStorage.getItem('erp_auth:session')
    })).toBe(before);
  });

  it('elimina el conjunto previo, conserva la sesión real y produce conteos exactos', async () => {
    const { storage, purchasing } = await bootPurchasingAs(dom, 'ADMIN-001');
    expect(storage.loadEntities().some(entity => entity.name === 'Proveedor Uno')).toBe(true);

    await openConfirmation();
    await accept();

    expect(storage.loadEntities().some(entity => entity.name === 'Proveedor Uno')).toBe(false);
    expect(storage.loadEntities()).toHaveLength(8);
    expect(storage.loadDocuments()).toHaveLength(12);
    expect(storage.loadRubros()).toHaveLength(3);
    expect(purchasing.loadCategories()).toHaveLength(5);
    expect(purchasing.loadProducts()).toHaveLength(15);
    expect(qs('session-user').textContent).toContain('ADMIN-001');
  });

  it('repetir la sustitución mantiene los mismos conteos sin duplicados', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    await openConfirmation();
    await accept();

    const first = {
      entities: storage.loadEntities().length,
      documents: storage.loadDocuments().length,
      folios: new Set(storage.loadDocuments().map(document => document.folio)).size
    };

    await openConfirmation();
    await accept();

    expect(storage.loadEntities()).toHaveLength(first.entities);
    expect(storage.loadDocuments()).toHaveLength(first.documents);
    expect(new Set(storage.loadDocuments().map(document => document.folio)).size).toBe(first.folios);
    expect(new Set(storage.loadEntities().map(entity => entity.name)).size).toBe(first.entities);
  });

  it('restaura el conjunto previo y muestra error persistente si falla la sustitución', async () => {
    const { storage, purchasing } = await bootPurchasingAs(dom, 'ADMIN-001');
    const entitiesBefore = storage.loadEntities();
    const productsBefore = purchasing.loadProducts();
    const categoriesBefore = purchasing.loadCategories();

    const realStorage = globalThis.localStorage;
    let failed = false;
    const guarded = new Proxy(realStorage, {
      get(target, property) {
        if (property === 'setItem') {
          return (key, value) => {
            if (!failed && key === 'erp_purchasing:products') {
              failed = true;
              throw new Error('fallo de almacenamiento inyectado');
            }
            return target.setItem(key, value);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    globalThis.localStorage = guarded;

    try {
      await openConfirmation();
      await accept();
    } finally {
      globalThis.localStorage = realStorage;
    }

    expect(failed).toBe(true);
    expect(qs('demo-feedback').textContent).toContain('fallo de almacenamiento inyectado');
    expect(qs('demo-feedback').textContent).not.toContain('Datos de demostración cargados');
    expect(storage.loadEntities()).toEqual(entitiesBefore);
    expect(purchasing.loadProducts()).toEqual(productsBefore);
    expect(purchasing.loadCategories()).toEqual(categoriesBefore);
    expect(dom.window.localStorage.getItem('erp_auth:users')).not.toContain('DEMO-ADMIN');
  });
});
