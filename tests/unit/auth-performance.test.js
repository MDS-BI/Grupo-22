import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENTITY_KEY = 'erp_base_module:entities';
const DOCUMENT_KEY = 'erp_base_module:documents';

function createStorage() {
  const values = new Map();
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

let auth;

beforeEach(async () => {
  vi.resetModules();
  globalThis.localStorage = createStorage();
  auth = await import('../../src/auth.js');
  auth.ensureDefaultUsers();
  auth.login('GER-001');
});

describe('session and permission resolution performance', () => {
  it('stays under 50 ms on average over 100 runs with 500 suppliers and 2000 orders', () => {
    const suppliers = Array.from({ length: 500 }, (_, index) => ({
      id: `entity-${index}`,
      entity_id: `ent-${index}`,
      name: `Proveedor ${index}`,
      code: `${10000000 + index}-K`,
      creditLimit: index * 1000
    }));
    const orders = Array.from({ length: 2000 }, (_, index) => ({
      id: `order-${index}`,
      folio: 10000 + index,
      entity_id: suppliers[index % suppliers.length].entity_id,
      status: ['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado'][index % 5],
      totalAmount: index + 1
    }));
    globalThis.localStorage.setItem(ENTITY_KEY, JSON.stringify(suppliers));
    globalThis.localStorage.setItem(DOCUMENT_KEY, JSON.stringify(orders));
    expect(JSON.parse(globalThis.localStorage.getItem(ENTITY_KEY))).toHaveLength(500);
    expect(JSON.parse(globalThis.localStorage.getItem(DOCUMENT_KEY))).toHaveLength(2000);

    const runs = 100;
    const started = performance.now();
    for (let index = 0; index < runs; index += 1) {
      const session = auth.getSession();
      auth.can(auth.PERMISSIONS.DOCUMENTS_APPROVE, session);
      auth.can(auth.PERMISSIONS.ORDERS_REJECT, session);
      auth.permissionsFor(session.role);
    }
    const average = (performance.now() - started) / runs;

    expect(average).toBeLessThanOrEqual(50);
  });
});
