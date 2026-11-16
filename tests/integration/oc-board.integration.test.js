import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasingAs, createOrder, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;
beforeEach(() => { dom = installDom(); installStyles(dom); });
afterEach(() => { dom.window.close(); });

function boardButton(mode) {
  return qs('documents-view-toggle').querySelector(`[data-view-mode="${mode}"]`);
}

describe('Órdenes de compra (005 US3)', () => {
  it('alterna entre tabla y tablero de solo lectura por columnas de estado', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const draft = createOrder(purchasing, storage, seedData, { folio: 50, status: 'borrador' });
    createOrder(purchasing, storage, seedData, { folio: 51, status: 'aprobado', startDate: '2026-11-01' });
    qs('nav-documents').click();

    expect(qs('documents-view-toggle').hidden).toBe(false);
    expect(qs('document-board').hidden).toBe(true);
    boardButton('board').click();

    expect(boardButton('board').getAttribute('aria-pressed')).toBe('true');
    expect(qs('document-board').hidden).toBe(false);
    expect(qs('document-table').closest('.table-wrapper').hidden).toBe(true);
    const columns = [...qs('document-board').querySelectorAll('.board-column h3 span:first-child')].map(span => span.textContent);
    expect(columns).toEqual(['Solicitud – Borrador', 'Solicitud – Pendiente de aprobación', 'OC emitida – Aprobada', 'OC – Recibida', 'Cancelada']);
    expect(qs('document-board').querySelector('.board-column-aprobado').textContent).toContain('SOL-0051 · OC-0001');
    expect(qs('document-board').querySelector('[draggable="true"]')).toBeNull();

    qs('document-board').querySelector(`[data-id="${draft.id}"]`).click();
    expect(qs('view-order-detail').hidden).toBe(false);

    qs('order-actions').querySelector('[data-action="close-order-detail"]').click();
    boardButton('table').click();
    expect(qs('document-board').hidden).toBe(true);
    expect(qs('document-table').closest('.table-wrapper').hidden).toBe(false);
  });

  it('respeta los filtros en el tablero', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    createOrder(purchasing, storage, seedData, { folio: 60, status: 'borrador' });
    createOrder(purchasing, storage, seedData, { folio: 61, status: 'pendiente' });
    qs('nav-documents').click();
    boardButton('board').click();
    qs('documents-filter-status').value = 'pendiente';
    qs('documents-filter-status').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('document-board').querySelectorAll('.board-card')).toHaveLength(1);
    expect(qs('document-board').textContent).toContain('SOL-0061');
  });

  it('ordena el formulario Cabecera → Detalle → Totales sin tarjeta de totales vacía', async () => {
    const { seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    qs('nav-documents').click();
    qs('document-list-new').click();
    expect(qs('document-legacy-fields').hidden).toBe(true);
    expect(qs('document-totals').hidden).toBe(true);
    expect(qs('document-totals-heading').hidden).toBe(true);

    qs('document-entity').value = seedData.supplier.entity_id;
    qs('line-product').value = seedData.product.id_producto;
    qs('line-quantity').value = '2';
    qs('line-cost').value = '1000';
    qs('add-line-button').click();
    expect(qs('document-totals').hidden).toBe(false);
    expect(qs('document-totals').textContent).toContain('2.380');
  });

  it('muestra progreso de estados, línea de tiempo y acciones destacadas en el detalle', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const order = createOrder(purchasing, storage, seedData, { folio: 70, status: 'borrador' });
    purchasing.changeOrderStatus(order.id, 'pendiente');
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();

    const steps = [...qs('order-detail-view').querySelectorAll('.status-progress .progress-step')];
    expect(steps.map(step => step.className.replace('progress-step ', ''))).toEqual(['progress-done', 'progress-current', 'progress-todo', 'progress-todo']);
    expect(qs('order-detail-view').querySelector('[aria-current="step"]').textContent).toContain('Pendiente de aprobación');
    expect(qs('order-history').querySelector('.timeline-item').textContent).toContain('borrador → pendiente');
    const approve = qs('order-actions').querySelector('[data-next-status="aprobado"]');
    expect(approve.className).toBe('primary');
    expect(qs('order-actions').querySelector('[data-next-status="cancelado"]').className).toBe('danger');
  });

  it('marca la cancelación en el progreso', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const order = createOrder(purchasing, storage, seedData, { folio: 80, status: 'borrador' });
    purchasing.changeOrderStatus(order.id, 'cancelado');
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    expect(qs('order-detail-view').querySelector('.progress-stopped')).not.toBeNull();
    expect(qs('order-detail-view').querySelector('.progress-cancelled').textContent).toContain('Cancelada');
  });

  it('imprime un documento formal con folio OC destacado y espacio de firmas', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const order = createOrder(purchasing, storage, seedData, { folio: 90, status: 'aprobado', startDate: '2026-11-01' });
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    qs('order-actions').querySelector('[data-action="print-order"]').click();
    const printView = qs('print-order-view');
    expect(printView.querySelector('.print-folio strong').textContent).toBe('OC-0001');
    expect(printView.querySelector('.print-logo')).not.toBeNull();
    expect(printView.querySelectorAll('.signature-line')).toHaveLength(2);
    expect(printView.textContent).toContain('Firma del aprobador');
    expect(printView.textContent).toContain('Solicitante: Ana Pérez');
  });

  it('destaca el N° de solicitud al imprimir una solicitud no emitida', async () => {
    const { purchasing, storage, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    const order = createOrder(purchasing, storage, seedData, { folio: 91, status: 'borrador' });
    qs('nav-documents').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();
    qs('order-actions').querySelector('[data-action="print-order"]').click();
    expect(qs('print-order-view').querySelector('.print-folio strong').textContent).toBe('SOL-0091');
    expect(qs('print-order-view').textContent).toContain('Aprobador: pendiente de aprobación');
  });
});
