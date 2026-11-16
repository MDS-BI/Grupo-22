import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootPurchasingAs, createOrder, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;
beforeEach(() => { dom = installDom(); installStyles(dom); });
afterEach(() => { dom.window.close(); vi.restoreAllMocks(); });

function luminance(hex) {
  const [r, g, b] = hex.replace('#', '').match(/../g).map(part => parseInt(part, 16) / 255)
    .map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('Accesibilidad y adaptabilidad (005 US5)', () => {
  it('cumple contraste AA en las combinaciones de la identidad', () => {
    const pairs = [
      ['#CBD5E1', '#0F2A3D'], // texto de la barra lateral
      ['#94A3B8', '#0F2A3D'], // títulos de grupo
      ['#FFFFFF', '#1E4258'], // ítem activo
      ['#13202B', '#F59E0B'], // acción principal ámbar
      ['#13202B', '#D97706'], // acción principal al pasar el cursor
      ['#92400E', '#FEF3C7'], // insignia pendiente
      ['#B91C1C', '#FEE2E2'], // atrasada
      ['#1D4ED8', '#DBEAFE'], // aprobada
      ['#166534', '#DCFCE7'], // recibida
      ['#FBBF24', '#0F2A3D']  // total destacado
    ];
    for (const [fg, bg] of pairs) expect(contrast(fg, bg), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it('respeta prefers-reduced-motion en las transiciones nuevas', () => {
    const css = fs.readFileSync(fileURLToPath(new URL('../../src/styles.css', import.meta.url)), 'utf8');
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('transition:none !important');
    expect(block).toContain('transform:none');
  });

  it('muestra el nombre completo de Solicitudes y Órdenes de Compra y el avatar del usuario', async () => {
    await bootPurchasingAs(dom, 'GER-001');
    expect(qs('nav-documents').textContent.replace(/\s+/g, ' ').trim()).toBe('Solicitudes y Órdenes de Compra');
    expect(qs('nav-documents-label').textContent).toBe('Órdenes de Compra');
    expect(qs('session-avatar').textContent).toBe('MS');
    expect(qs('session-info').title).toContain('Gerente de Compras');
  });

  it('etiqueta cada celda para la vista de tarjetas apiladas en celular', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    createOrder(purchasing, storage, seedData, { folio: 5 });
    qs('nav-documents').click();
    const table = qs('document-table');
    expect(table.classList.contains('stacked-table')).toBe(true);
    const cells = [...table.querySelector('tbody tr').children].map(cell => cell.dataset.label);
    expect(cells.slice(0, 5)).toEqual(['Folio', 'Proveedor', 'Fecha de entrega', 'Total', 'Estado']);
  });

  it('abre y cierra la navegación como menú desplegable en pantallas pequeñas', async () => {
    await bootPurchasingAs(dom, 'ADMIN-001');
    dom.window.matchMedia = vi.fn(query => ({ matches: query.includes('max-width: 720px'), media: query, addEventListener() {}, removeEventListener() {} }));
    qs('sidebar-toggle').click();
    expect(qs('sidebar').classList.contains('mobile-open')).toBe(true);
    expect(qs('sidebar-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(qs('sidebar').classList.contains('collapsed')).toBe(false);
    qs('nav-products').click();
    expect(qs('sidebar').classList.contains('mobile-open')).toBe(false);
    expect(qs('view-products').hidden).toBe(false);
  });
});
