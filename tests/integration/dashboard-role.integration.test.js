import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasingAs, createOrder, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;
beforeEach(() => { dom = installDom(); installStyles(dom); });
afterEach(() => { dom.window.close(); });

function emissionDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

describe('Panel por rol (005 US2)', () => {
  it('muestra indicadores con detalle, gráficos SVG con tabla equivalente y top 5', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'GER-001');
    createOrder(purchasing, storage, seedData, { folio: 10, status: 'aprobado', startDate: emissionDate(), endDate: '2099-01-01' });
    createOrder(purchasing, storage, seedData, { folio: 11, status: 'pendiente', endDate: '2099-01-01' });
    qs('nav-dashboard').click();

    expect(qs('dashboard-insights').hidden).toBe(false);
    expect(qs('stat-documents-detail').textContent).toBe('1 solicitudes · 1 OC emitidas');
    expect(qs('chart-status').querySelector('svg[role="img"]').getAttribute('aria-label')).toContain('OC emitida – Aprobada: 1');
    expect(qs('chart-status-table').querySelectorAll('tbody tr')).toHaveLength(5);
    expect(qs('chart-spend').querySelector('svg[role="img"]')).not.toBeNull();
    expect(qs('top-suppliers').textContent).toContain('Proveedor Uno');
    expect(qs('top-suppliers').textContent).toContain('2.380');
    expect(qs('stat-status-breakdown').textContent).toContain('Solicitud – Pendiente de aprobación');
  });

  it('lista las solicitudes por aprobar para el Gerente y abre el detalle', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'GER-001');
    const pending = createOrder(purchasing, storage, seedData, { folio: 21, status: 'pendiente', endDate: '2099-01-01' });
    createOrder(purchasing, storage, seedData, { folio: 22, status: 'borrador', endDate: '2099-01-01' });
    qs('nav-dashboard').click();

    expect(qs('attention-subtitle').textContent).toBe('Solicitudes por aprobar · 1');
    const item = qs('attention-list').querySelector('[data-action="open-attention"]');
    expect(item.textContent).toContain('SOL-0021');
    item.click();
    expect(qs('view-order-detail').hidden).toBe(false);
    expect(qs('order-detail-view').textContent).toContain('SOL-0021');
    expect(pending.id).toBe(item.dataset.id);
  });

  it('muestra al Bodeguero las OC por recibir y no le muestra el ranking de proveedores', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'BOD-001');
    createOrder(purchasing, storage, seedData, { folio: 31, status: 'aprobado', startDate: emissionDate(), endDate: '2099-01-01' });
    createOrder(purchasing, storage, seedData, { folio: 32, status: 'pendiente', endDate: '2099-01-01' });
    qs('nav-dashboard').click();

    expect(qs('attention-subtitle').textContent).toBe('OC por recibir y atrasadas · 1');
    expect(qs('attention-list').textContent).toContain('Por recibir');
    expect(qs('insight-top').hidden).toBe(true);
  });

  it('muestra estados vacíos sin gráficos cuando no hay órdenes', async () => {
    await bootPurchasingAs(dom, 'CONS-001');
    qs('nav-dashboard').click();
    expect(qs('chart-status').textContent).toContain('Aún no hay órdenes registradas');
    expect(qs('chart-spend').textContent).toContain('Sin OC emitidas');
    expect(qs('attention-list').textContent).toContain('Nada pendiente');
  });

  it('acompaña la denominación del documento con el estado específico en las insignias', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    createOrder(purchasing, storage, seedData, { folio: 41, status: 'aprobado', startDate: emissionDate() });
    qs('nav-documents').click();
    const stack = qs('document-table-body').querySelector('.status-stack');
    expect(stack.querySelector('[data-status="aprobado"]').textContent).toBe('Orden de Compra emitida');
    expect(stack.querySelector('.status-detail').textContent).toBe('Aprobada');
  });
});
