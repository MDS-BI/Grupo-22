import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});

describe('authentication and role resolution', () => {
  it('seeds the user directory and authenticates by User ID regardless of case', () => {
    const session = auth.login('comp-001');
    expect(session.userId).toBe('COMP-001');
    expect(session.role).toBe('comprador');
    expect(session.nombre).toBe('Camila Vega');
    expect(auth.getSession()).toMatchObject({ userId: 'COMP-001', role: 'comprador' });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('rejects empty, unknown and inactive users', () => {
    expect(() => auth.login('')).toThrow(/User ID/);
    expect(() => auth.login('NO-EXISTE')).toThrow(/no está registrado/);
    const users = auth.loadUsers().map(user => (user.userId === 'CONS-001' ? { ...user, activo: false } : user));
    auth.saveUsers(users);
    expect(() => auth.login('CONS-001')).toThrow(/inactivo/);
  });

  it('logs out by clearing the persisted session', () => {
    auth.login('GER-001');
    expect(auth.getSession()).not.toBeNull();
    auth.clearSession();
    expect(auth.getSession()).toBeNull();
  });

  it('re-resolves the role dynamically when the user directory changes', () => {
    auth.login('COMP-001');
    const users = auth.loadUsers().map(user => (user.userId === 'COMP-001' ? { ...user, role: 'gerente' } : user));
    auth.saveUsers(users);
    expect(auth.getSession().role).toBe('gerente');
  });

  it('reseeds the user directory when stored entries normalize to an empty list', () => {
    globalThis.localStorage.setItem(auth.AUTH_USERS_KEY, JSON.stringify([{ rol: 'gerente' }, null, 'invalido']));
    expect(auth.loadUsers()).toEqual([]);

    const users = auth.ensureDefaultUsers();

    expect(users.map(user => user.userId)).toEqual(auth.DEFAULT_USERS.map(user => user.userId));
    expect(JSON.parse(globalThis.localStorage.getItem(auth.AUTH_USERS_KEY))).toHaveLength(auth.DEFAULT_USERS.length);
    expect(auth.login('ADMIN-001').role).toBe('administrador');
  });

  it('reseeds the user directory when the stored value is corrupt JSON', () => {
    globalThis.localStorage.setItem(auth.AUTH_USERS_KEY, '{corrupto');

    const users = auth.ensureDefaultUsers();

    expect(users.map(user => user.userId)).toEqual(auth.DEFAULT_USERS.map(user => user.userId));
    expect(auth.login('GER-001').role).toBe('gerente');
  });
});

describe('role-based permissions', () => {
  it('grants buyers operational purchasing permissions without approvals', () => {
    expect(auth.can(auth.PERMISSIONS.DOCUMENTS_CREATE, 'comprador')).toBe(true);
    expect(auth.can(auth.PERMISSIONS.ORDERS_SUBMIT, 'comprador')).toBe(true);
    expect(auth.can(auth.PERMISSIONS.ORDERS_APPROVE, 'comprador')).toBe(false);
    expect(auth.can(auth.PERMISSIONS.ORDERS_RECEIVE, 'comprador')).toBe(false);
    expect(auth.can(auth.PERMISSIONS.PRODUCTS_MANAGE, 'comprador')).toBe(false);
  });

  it('grants warehouse users receipt and stock permissions only', () => {
    expect(auth.can(auth.PERMISSIONS.ORDERS_RECEIVE, 'bodeguero')).toBe(true);
    expect(auth.can(auth.PERMISSIONS.PRODUCTS_MANAGE, 'bodeguero')).toBe(true);
    expect(auth.can(auth.PERMISSIONS.DOCUMENTS_CREATE, 'bodeguero')).toBe(false);
    expect(auth.can(auth.PERMISSIONS.ENTITIES_UPDATE, 'bodeguero')).toBe(false);
  });

  it('keeps consultation users read-only', () => {
    expect(auth.can(auth.PERMISSIONS.DOCUMENTS_VIEW, 'consulta')).toBe(true);
    expect(auth.can(auth.PERMISSIONS.ORDERS_PRINT, 'consulta')).toBe(true);
    for (const permission of [
      auth.PERMISSIONS.ENTITIES_CREATE,
      auth.PERMISSIONS.DOCUMENTS_CREATE,
      auth.PERMISSIONS.DOCUMENTS_DELETE,
      auth.PERMISSIONS.ORDERS_APPROVE,
      auth.PERMISSIONS.PRODUCTS_MANAGE
    ]) {
      expect(auth.can(permission, 'consulta')).toBe(false);
    }
  });

  it('grants administrators every declared permission', () => {
    for (const permission of Object.values(auth.PERMISSIONS)) {
      expect(auth.can(permission, 'administrador')).toBe(true);
    }
  });

  it('matches the complete role-permission matrix', () => {
    const all = Object.values(auth.PERMISSIONS);
    const readOnly = [
      'dashboard.view',
      'entities.view',
      'documents.view',
      'products.view',
      'search.view',
      'orders.print'
    ];
    const expected = {
      administrador: all,
      gerente: all,
      comprador: [
        ...readOnly,
        'entities.create',
        'entities.update',
        'documents.create',
        'documents.update',
        'documents.delete',
        'orders.submit',
        'orders.cancel'
      ],
      bodeguero: [
        'dashboard.view',
        'documents.view',
        'products.view',
        'search.view',
        'orders.print',
        'orders.receive',
        'products.manage'
      ],
      consulta: readOnly
    };

    for (const [role, granted] of Object.entries(expected)) {
      const grantedSet = new Set(granted);
      for (const permission of all) {
        expect(auth.can(permission, role), `${role} / ${permission}`).toBe(grantedSet.has(permission));
      }
    }
  });

  it('gives the purchasing manager the same full permission set as the administrator', () => {
    const administrator = [...auth.permissionsFor('administrador')].sort();
    const gerente = [...auth.permissionsFor('gerente')].sort();

    expect(gerente).toEqual(administrator);
    for (const permission of [
      auth.PERMISSIONS.ORDERS_CANCEL,
      auth.PERMISSIONS.ORDERS_SUBMIT,
      auth.PERMISSIONS.ORDERS_RECEIVE,
      auth.PERMISSIONS.ENTITIES_UPDATE,
      auth.PERMISSIONS.ENTITIES_DELETE,
      auth.PERMISSIONS.DOCUMENTS_UPDATE,
      auth.PERMISSIONS.DOCUMENTS_DELETE
    ]) {
      expect(auth.can(permission, 'gerente')).toBe(true);
    }
  });

  it('maps workflow transitions to the matching permission', () => {
    expect(auth.transitionPermission('pendiente')).toBe(auth.PERMISSIONS.ORDERS_SUBMIT);
    expect(auth.transitionPermission('aprobado')).toBe(auth.PERMISSIONS.ORDERS_APPROVE);
    expect(auth.transitionPermission('recibido')).toBe(auth.PERMISSIONS.ORDERS_RECEIVE);
    expect(auth.transitionPermission('cancelado')).toBe(auth.PERMISSIONS.ORDERS_CANCEL);
  });
});
