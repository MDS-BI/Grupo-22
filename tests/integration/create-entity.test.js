import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig, DEFAULT_CONFIG } from '../../src/module-config.js';
import { loadEntities } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(DEFAULT_CONFIG));
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 1 - create and organize entities', () => {
  it('creates a new entity that appears in storage and the table', () => {
    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('Acme');
    expect(all[0].code).toBe('AC-001');
    expect(all[0].entity_id).toBeDefined();
    const row = qs('entity-table-body').querySelector('tr');
    expect(row.textContent).toContain('Acme');
    expect(row.textContent).toContain('AC-001');
  });

  it('persists ERP identity and commercial fields entered through the form', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('email').value = 'ventas@acme.mx';
    qs('phone').value = '555-1234';
    qs('address').value = 'Av. Reforma 100';
    qs('creditLimit').value = '50000';
    qs('paymentTerms').value = 'neto 30';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const saved = loadEntities()[0];
    expect(saved.taxId).toBeUndefined();
    expect(saved.email).toBe('ventas@acme.mx');
    expect(saved.phone).toBe('555-1234');
    expect(saved.address).toBe('Av. Reforma 100');
    expect(saved.creditLimit).toBe(50000);
    expect(saved.paymentTerms).toBe('neto 30');
  });

  it('rejects a malformed email with an explanation', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('email').value = 'no-es-correo';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(0);
    expect(qs('error-email').textContent).toContain('correo electrónico');
  });

  it('prevents saving when required information is blank and explains what is needed', () => {
    qs('nav-entities').click();
    qs('name').value = '';
    qs('code').value = '';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(0);
    expect(qs('error-name').textContent).toContain('obligatorio');
    expect(qs('error-code').textContent).toContain('obligatorio');
  });
});

describe('post-review supplier form', () => {
  let purchaseDom;
  let storage;
  let rubroA;
  let rubroB;

  function selectRubros(ids) {
    const select = qs('supplier-rubros');
    for (const option of select.options) option.selected = ids.includes(option.value);
  }

  function submitForm() {
    qs('entity-form').dispatchEvent(new purchaseDom.window.Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(async () => {
    purchaseDom = new JSDOM(html, { url: 'http://localhost/' });
    const w = purchaseDom.window;
    globalThis.window = w;
    globalThis.document = w.document;
    globalThis.localStorage = w.localStorage;
    globalThis.alert = vi.fn();
    globalThis.confirm = vi.fn(() => true);
    w.scrollTo = vi.fn();
    w.localStorage.clear();
    vi.resetModules();
    const configModule = await import('../../src/module-config.js');
    storage = await import('../../src/storage.js');
    const purchasing = await import('../../src/purchasing-storage.js');
    rubroA = purchasing.addRubro({ nombre: 'Insumos' });
    rubroB = purchasing.addRubro({ nombre: 'Servicios' });
    const { initApp } = await import('../../src/app.js');
    await initApp(configModule.normalizeConfig(configModule.PURCHASING_CONFIG));
  });

  afterEach(() => {
    purchaseDom.window.close();
  });

  it('renders the purchasing supplier fields and Rubro labels', () => {
    qs('nav-entities').click();
    expect(qs('targetDate')).toBeNull();
    expect(qs('origin')).not.toBeNull();
    expect(qs('foreignTaxId')).not.toBeNull();
    expect(qs('supplier-rubros').multiple).toBe(true);
    expect(qs('supplier-rubros-label').textContent).toBe('Rubros');
    expect(qs('paymentTerms').tagName).toBe('SELECT');
    const values = [...qs('paymentTerms').options].map(option => option.value);
    expect(values).toEqual(expect.arrayContaining(['Contado', '30 días', '60 días', '90 días']));
  });

  it('creates a supplier with zero credit limit and multiple Rubros', () => {
    qs('nav-entities').click();
    qs('name').value = 'Proveedor Nacional';
    qs('code').value = '11.111.111-1';
    qs('origin').value = 'Nacional';
    qs('creditLimit').value = '0';
    qs('paymentTerms').value = 'Contado';
    selectRubros([rubroA.id_rubro, rubroB.id_rubro]);
    submitForm();
    const saved = storage.loadEntities()[0];
    expect(saved).toBeDefined();
    expect(saved.creditLimit).toBe(0);
    expect(saved.rubro_ids).toEqual(expect.arrayContaining([rubroA.id_rubro, rubroB.id_rubro]));
    expect(saved.targetDate).toBeUndefined();
  });

  it('rejects negative credit limits and missing Rubros with field messages', () => {
    qs('nav-entities').click();
    qs('name').value = 'Proveedor Nacional';
    qs('code').value = '11.111.111-1';
    qs('origin').value = 'Nacional';
    qs('creditLimit').value = '-1';
    qs('paymentTerms').value = 'Contado';
    submitForm();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('error-creditLimit').textContent).toContain('no negativo');

    qs('creditLimit').value = '1000';
    submitForm();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('error-rubro_ids').textContent).toContain('al menos un');
  });

  it('requires a foreign tax id for suppliers from abroad', () => {
    qs('nav-entities').click();
    qs('name').value = 'Proveedor Extranjero';
    qs('code').value = '';
    qs('origin').value = 'Extranjero';
    qs('creditLimit').value = '2500';
    qs('paymentTerms').value = '30 días';
    selectRubros([rubroA.id_rubro]);
    submitForm();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('error-foreignTaxId').textContent).toContain('obligatoria');

    qs('foreignTaxId').value = 'TAX-999';
    submitForm();
    const saved = storage.loadEntities()[0];
    expect(saved).toBeDefined();
    expect(saved.origin).toBe('Extranjero');
    expect(saved.foreignTaxId).toBe('TAX-999');
  });
});
