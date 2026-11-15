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
let policy;

beforeEach(async () => {
  vi.resetModules();
  globalThis.localStorage = createStorage();
  auth = await import('../../src/auth.js');
  policy = await import('../../src/access-policy.js');
});

function sessionFor(userId) {
  auth.ensureDefaultUsers();
  return auth.login(userId);
}

describe('access policy', () => {
  it('stays permissive without a session', () => {
    expect(policy.canCreateDocument(null)).toBe(true);
    expect(policy.canEditDocument(null)).toBe(true);
    expect(policy.canApprove(null)).toBe(true);
    expect(policy.canReject(null)).toBe(true);
    expect(policy.canCancel(null)).toBe(true);
    expect(policy.canViewCreditLimit(null)).toBe(true);
    expect(policy.sanitizeEntityPayload({ name: 'Proveedor', creditLimit: '5000' }, { session: null })).toEqual({
      name: 'Proveedor',
      creditLimit: '5000'
    });
  });

  it('separates approval, rejection and cancellation by role', () => {
    const comprador = sessionFor('COMP-001');
    const gerente = sessionFor('GER-001');
    const administrador = sessionFor('ADMIN-001');
    const consulta = sessionFor('CONS-001');

    expect(policy.canCreateDocument(comprador)).toBe(true);
    expect(policy.canEditDocument(comprador)).toBe(true);
    expect(policy.canApprove(comprador)).toBe(false);
    expect(policy.canReject(comprador)).toBe(false);
    expect(policy.canCancel(comprador)).toBe(true);
    expect(policy.canApprove(gerente)).toBe(true);
    expect(policy.canReject(gerente)).toBe(true);
    expect(policy.canApprove(administrador)).toBe(true);
    expect(policy.canReject(administrador)).toBe(true);
    expect(policy.canCreateDocument(consulta)).toBe(false);
  });

  it('labels documents by status and exposes the automatic emission date', () => {
    expect(policy.documentLabel('borrador')).toBe('Solicitud de compra');
    expect(policy.documentLabel('pendiente')).toBe('Solicitud de compra');
    expect(policy.documentLabel('aprobado')).toBe('Orden de Compra emitida');
    expect(policy.documentLabel('recibido')).toBe('Orden de Compra emitida');
    expect(policy.emissionDateFor('2026-11-15T03:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('hides the credit limit from the buyer and rejects unauthorized changes', () => {
    const comprador = sessionFor('COMP-001');
    const gerente = sessionFor('GER-001');
    expect(policy.canViewCreditLimit(comprador)).toBe(false);
    expect(policy.canViewCreditLimit(gerente)).toBe(true);

    expect(() => policy.sanitizeEntityPayload({ name: 'Proveedor', creditLimit: '9000' }, { session: comprador }))
      .toThrow(/permisos/i);
    expect(policy.sanitizeEntityPayload({ name: 'Proveedor', creditLimit: '' }, { session: comprador }))
      .toEqual({ name: 'Proveedor' });
    expect(policy.sanitizeEntityPayload(
      { name: 'Proveedor', creditLimit: '9000' },
      { session: comprador, existing: { name: 'Proveedor', creditLimit: 9000 } }
    )).toEqual({ name: 'Proveedor' });
    expect(policy.sanitizeEntityPayload({ name: 'Proveedor', creditLimit: '12000' }, { session: gerente }))
      .toEqual({ name: 'Proveedor', creditLimit: '12000' });
  });

  it('creates one requester employee per buyer and never links by name', () => {
    const first = sessionFor('COMP-001');
    const employees = [];
    const createEmployee = data => {
      const employee = { id_empleado: `emp-${employees.length + 1}`, ...data };
      employees.push(employee);
      return employee;
    };

    const own = policy.ensureRequesterEmployee({ session: first, employees, createEmployee });
    expect(own).toMatchObject({ nombre: 'Camila Vega', cargo: 'Compradora', userId: 'COMP-001' });
    expect(policy.ensureRequesterEmployee({ session: first, employees, createEmployee })).toBe(own);
    expect(employees).toHaveLength(1);

    const second = { userId: 'COMP-002', nombre: 'Camila Vega', cargo: 'Compradora', role: 'comprador' };
    const other = policy.ensureRequesterEmployee({ session: second, employees, createEmployee });
    expect(other.id_empleado).not.toBe(own.id_empleado);
    expect(other.userId).toBe('COMP-002');
    expect(employees).toHaveLength(2);
  });

  it('forces the buyer employee and rejects employees linked to another buyer', () => {
    const comprador = sessionFor('COMP-001');
    const employees = [
      { id_empleado: 'emp-1', nombre: 'Camila Vega', userId: 'COMP-001' },
      { id_empleado: 'emp-2', nombre: 'Otro Comprador', userId: 'COMP-002' }
    ];
    const createEmployee = data => ({ id_empleado: 'emp-new', ...data });

    expect(policy.resolveRequesterForSave({
      session: comprador,
      requestedEmployeeId: 'emp-unlinked',
      employees,
      createEmployee
    })).toBe('emp-1');
    expect(() => policy.resolveRequesterForSave({
      session: comprador,
      requestedEmployeeId: 'emp-2',
      employees,
      createEmployee
    })).toThrow(/permisos/i);
    expect(policy.resolveRequesterForSave({
      session: sessionFor('GER-001'),
      requestedEmployeeId: 'emp-2',
      employees,
      createEmployee
    })).toBe('emp-2');
    expect(() => policy.resolveRequesterForSave({
      session: sessionFor('GER-001'),
      requestedEmployeeId: 'missing',
      employees,
      createEmployee
    })).toThrow(/empleado solicitante registrado/i);
  });
});
