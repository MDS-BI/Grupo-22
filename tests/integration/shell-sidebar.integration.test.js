import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasing, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
  installStyles(dom);
});

afterEach(() => {
  dom.window.close();
});

describe('shell y barra lateral (005 US1)', () => {
  it('mantiene navegación principal y permite colapsar la barra lateral', async () => {
    await bootPurchasing(dom);
    expect(qs('nav-documents').getAttribute('aria-label')).toBe('Solicitudes y Órdenes de Compra');
    expect(qs('sidebar-toggle')).not.toBeNull();
    qs('sidebar-toggle').click();
    expect(qs('sidebar').classList.contains('collapsed') || qs('sidebar').dataset.collapsed === 'true').toBe(true);
  });

  it('muestra reservas 007 no navegables (reportes/campana) ocultas o deshabilitadas', async () => {
    await bootPurchasing(dom);
    const reports = document.getElementById('nav-reports');
    if (reports) {
      expect(reports.hidden || reports.disabled || reports.getAttribute('aria-disabled') === 'true').toBe(true);
    }
    const bell = document.getElementById('notifications-placeholder');
    if (bell) {
      expect(bell.hidden || bell.getAttribute('aria-hidden') === 'true').toBe(true);
    }
  });
});

describe('agrupación de la barra lateral (005 US1)', () => {
  it('mantiene cada botón dentro de su grupo después de inicializar la app', async () => {
    const shell = await import('../../src/ui-shell.js');
    shell.ensureShellScaffold();
    await bootPurchasing(dom);
    const groupOf = id => qs(id)?.closest('[data-nav-group]')?.dataset.navGroup;
    expect(groupOf('nav-dashboard')).toBe('operacion');
    expect(groupOf('nav-documents')).toBe('operacion');
    expect(groupOf('nav-entities')).toBe('maestros');
    expect(groupOf('nav-products')).toBe('maestros');
    expect(groupOf('nav-search')).toBe('herramientas');
    const order = [...qs('sidebar').querySelectorAll('.nav-module:not(.nav-reserved)')].map(button => button.id);
    expect(order).toEqual(['nav-dashboard', 'nav-documents', 'nav-entities', 'nav-products', 'nav-search']);
    expect([...qs('sidebar').children].every(child => child.matches('[data-nav-group]'))).toBe(true);
  });
});
