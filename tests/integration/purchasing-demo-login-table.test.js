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

async function showLoginGate() {
  const auth = await import('../../src/auth.js');
  auth.clearSession();
  const app = await import('../../src/app.js');
  await app.boot();
  await settle();
}

async function login(userId) {
  qs('login-user-id').value = userId;
  qs('login-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
}

async function acceptReplacement() {
  expect(qs('confirm-dialog').hidden).toBe(false);
  qs('confirm-dialog-accept').click();
  await settle();
}

describe('tabla Usuarios de prueba en el ingreso', () => {
  it('permanece ausente cuando no hay datos de demostración', async () => {
    await bootPurchasingAs(dom, 'ADMIN-001');
    await showLoginGate();
    expect(qs('auth-gate').hidden).toBe(false);
    expect(qs('demo-users-hints').hidden).toBe(true);
    expect(qs('login-demo-users-body').children).toHaveLength(0);
  });

  it('muestra una fila accesible por rol, sin credenciales, después de cargar la demostración', async () => {
    const { storage, purchasing } = await bootPurchasingAs(dom, 'ADMIN-001');
    storage.clearAll();
    purchasing.clearPurchasingData();

    qs('action-load-demo').click();
    await settle();
    expect(qs('confirm-dialog').hidden).toBe(true);

    await showLoginGate();
    const table = qs('demo-users-hints');
    expect(table.hidden).toBe(false);

    const accessibleTable = table.querySelector('table');
    expect(accessibleTable).not.toBeNull();
    expect(accessibleTable.querySelector('caption')).not.toBeNull();
    expect(accessibleTable.querySelectorAll('thead th')).toHaveLength(2);
    expect(accessibleTable.querySelector('thead th').getAttribute('scope')).toBe('col');

    const rows = [...qs('login-demo-users-body').querySelectorAll('tr')];
    expect(rows).toHaveLength(5);
    expect(rows.every(row => row.children.length === 2)).toBe(true);
    expect(rows.map(row => row.children[0].textContent)).toEqual([
      'DEMO-ADMIN', 'DEMO-GERENTE', 'DEMO-COMPRADOR', 'DEMO-BODEGUERO', 'DEMO-CONSULTA'
    ]);
    expect(rows.map(row => row.children[1].textContent)).toEqual([
      'Administrador', 'Gerente de Compras', 'Comprador', 'Bodeguero', 'Consulta'
    ]);
    expect(table.querySelector('input[type="password"]')).toBeNull();
  });

  it('se mantiene actualizada tras una sustitución', async () => {
    await bootPurchasingAs(dom, 'ADMIN-001');
    qs('action-load-demo').click();
    await acceptReplacement();
    await showLoginGate();

    await login('DEMO-ADMIN');
    expect(qs('auth-gate').hidden).toBe(true);
    qs('action-load-demo').click();
    await acceptReplacement();
    await showLoginGate();

    expect(qs('demo-users-hints').hidden).toBe(false);
    expect(qs('login-demo-users-body').querySelectorAll('tr')).toHaveLength(5);
  });
});
