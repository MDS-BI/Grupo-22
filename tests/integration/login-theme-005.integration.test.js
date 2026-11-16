import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasingAs, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

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

describe('ingreso y barra superior (005 US1)', () => {
  it('permite ingresar con un clic desde una tarjeta de usuario de prueba usando el login de 004', async () => {
    await bootPurchasingAs(dom, 'ADMIN-001');
    qs('action-load-demo').click();
    qs('confirm-dialog-accept')?.click();
    await settle();
    await showLoginGate();

    const cards = [...qs('login-demo-users-body').querySelectorAll('[data-action="login-demo-user"]')];
    expect(cards).toHaveLength(5);
    expect(cards[1].getAttribute('aria-label')).toContain('DEMO-GERENTE');
    cards[1].click();
    await settle();

    expect(qs('auth-gate').hidden).toBe(true);
    const auth = await import('../../src/auth.js');
    expect(auth.getSession()?.userId).toBe('DEMO-GERENTE');
  });

  it('usa íconos accesibles en el botón de tema y en la campana reservada', async () => {
    await bootPurchasingAs(dom, 'ADMIN-001');
    await showLoginGate();
    const toggle = qs('theme-toggle');
    expect(toggle.querySelector('svg')).not.toBeNull();
    const before = document.documentElement.dataset.theme;
    expect(toggle.getAttribute('aria-label')).toBe(before === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    toggle.click();
    const after = document.documentElement.dataset.theme;
    expect(after).not.toBe(before);
    expect(toggle.getAttribute('aria-label')).toBe(after === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    const bell = qs('notifications-placeholder');
    expect(bell.querySelector('svg')).not.toBeNull();
    expect(bell.textContent.trim()).toBe('');
  });
});
