import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig, DEFAULT_CONFIG } from '../../src/module-config.js';
import { addEntity, loadEntities } from '../../src/storage.js';

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
  const first = addEntity({ name: 'Acme', code: 'AC-001' });
  addEntity({ name: 'Globex', code: 'GL-002' });
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(DEFAULT_CONFIG));
  globalThis.__firstId = first.id;
});

afterEach(() => {
  dom.window.close();
});

function clickEntityAction(id, action) {
  qs('entity-table-body').querySelector(`button[data-action="${action}"][data-id="${id}"]`).click();
}

describe('User Story 2 - edit and remove entities', () => {
  it('edits an existing entity through the table and persists the change', () => {
    qs('nav-entities').click();
    clickEntityAction(globalThis.__firstId, 'edit');
    expect(qs('entity-id').value).toBe(globalThis.__firstId);
    expect(qs('submit-button').textContent).toBe('Actualizar');
    expect(qs('name').value).toBe('Acme');

    qs('name').value = 'Acme Updated';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()[0].name).toBe('Acme Updated');
  });

  it('deletes an entity from the table so it disappears from storage', () => {
    qs('nav-entities').click();
    clickEntityAction(globalThis.__firstId, 'delete');
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(loadEntities().length).toBe(1);
    expect(loadEntities()[0].code).toBe('GL-002');
  });

  it('stays responsive and correct when many entities exist', () => {
    for(let i = 0; i < 300; i++){
      addEntity({ name: `Bulk ${i}`, code: `B-${String(i).padStart(4, '0')}` });
    }
    qs('nav-entities').click();
    expect(qs('entity-table-body').querySelectorAll('tr').length).toBe(302);
    const target = loadEntities().find(e => e.code === 'B-0150');
    clickEntityAction(target.id, 'edit');
    expect(qs('name').value).toBe('Bulk 150');
    qs('name').value = 'Bulk 150 Renamed';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().find(e => e.code === 'B-0150').name).toBe('Bulk 150 Renamed');
  });
});
