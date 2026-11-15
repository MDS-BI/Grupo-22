import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../helpers/purchasing-app.js';
import {
  PURCHASING_CONFIG,
  normalizeConfig,
  setActiveConfig
} from '../../src/module-config.js';
import {
  ROLE_DEFINITIONS,
  getSession,
  loadDemoUsers,
  loadUsers,
  login,
  roleLabel,
  saveUsers
} from '../../src/auth.js';
import {
  addEmployee,
  loadEmployees
} from '../../src/purchasing-storage.js';
import { ensureRequesterEmployee } from '../../src/access-policy.js';
import { DEMO_USER_DEFINITIONS, loadDemoData } from '../../src/purchasing-demo-data.js';

let dom;

beforeEach(() => {
  dom = installDom();
  setActiveConfig(normalizeConfig(PURCHASING_CONFIG).config);
});

function loadAsAdmin(options = {}) {
  return loadDemoData({ session: { role: 'administrador' }, today: new Date(2026, 10, 14), ...options });
}

describe('usuarios de prueba de la demostración', () => {
  it('crea un usuario activo por rol con identificador estable, cargo visible y empleado propio', () => {
    const result = loadAsAdmin();
    expect(result.ok).toBe(true);

    const users = loadDemoUsers();
    expect(users).toHaveLength(Object.keys(ROLE_DEFINITIONS).length);
    expect(new Set(users.map(user => user.role))).toEqual(new Set(Object.keys(ROLE_DEFINITIONS)));
    expect(new Set(users.map(user => user.userId)).size).toBe(users.length);
    expect(users.every(user => user.activo)).toBe(true);

    const employees = loadEmployees();
    const linkedEmployeeIds = [];
    for (const user of users) {
      expect(user.userId).toBe(DEMO_USER_DEFINITIONS.find(definition => definition.role === user.role).userId);
      expect(user.cargo).toBe(roleLabel(user.role));
      expect(user.id_empleado).toBeTruthy();
      const employee = employees.find(item => (item.id_empleado || item.id) === user.id_empleado);
      expect(employee).toBeTruthy();
      expect(employee.cargo).toBe(user.cargo);
      expect(String(employee.userId).toUpperCase()).toBe(user.userId);
      linkedEmployeeIds.push(user.id_empleado);
    }
    expect(new Set(linkedEmployeeIds).size).toBe(users.length);
  });

  it('conserva los usuarios que no son de prueba', () => {
    const external = {
      userId: 'EXT-001',
      nombre: 'Usuario Externo',
      cargo: 'Analista externo',
      role: 'consulta',
      activo: true
    };
    saveUsers([...loadUsers(), external]);

    const result = loadAsAdmin();
    expect(result.ok).toBe(true);
    expect(loadUsers().some(user => user.userId === 'EXT-001')).toBe(true);
    expect(loadUsers().filter(user => user.userId === 'EXT-001')).toHaveLength(1);
  });

  it('reutiliza el empleado propio del Comprador sin duplicarlo', () => {
    expect(loadAsAdmin().ok).toBe(true);
    login('DEMO-COMPRADOR');

    const before = loadEmployees();
    const session = getSession();
    const own = ensureRequesterEmployee({ session, employees: before, createEmployee: addEmployee });

    expect(own).toBeTruthy();
    expect(own.id_empleado).toBe(session.id_empleado);
    expect(loadEmployees()).toHaveLength(before.length);
  });

  it('invalida la sesión de un usuario de prueba reemplazado y conserva la de un usuario real', () => {
    expect(loadAsAdmin().ok).toBe(true);
    login('DEMO-GERENTE');
    const demoReplacement = loadAsAdmin({ session: getSession(), replaceExisting: true });
    expect(demoReplacement.ok).toBe(true);
    expect(demoReplacement.sessionInvalidated).toBe(true);
    expect(getSession()).toBeNull();

    login('GER-001');
    const realReplacement = loadAsAdmin({ session: getSession(), replaceExisting: true });
    expect(realReplacement.ok).toBe(true);
    expect(realReplacement.sessionInvalidated).toBe(false);
    expect(getSession()?.userId).toBe('GER-001');
  });
});
