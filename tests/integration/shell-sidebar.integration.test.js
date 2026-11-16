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
