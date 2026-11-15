import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootPurchasing,
  createOrder,
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

async function openDocuments() {
  qs('nav-documents').click();
}

describe('detalle de orden como vista propia', () => {
  it('oculta la lista y cualquier otra vista al abrir una orden', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    const order = createOrder(purchasing, storage, seedData, { folio: 2001 });
    openDocuments();

    const row = qs('document-table-body').querySelector('tr[data-order-id]');
    expect(row).not.toBeNull();
    expect(row.tabIndex).toBe(0);

    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${order.id}"]`).click();

    expect(qs('view-documents').hidden).toBe(true);
    expect(qs('view-order-detail').hidden).toBe(false);
    expect(dom.window.getComputedStyle(qs('view-documents')).display).toBe('none');
    expect(dom.window.getComputedStyle(qs('view-order-detail')).display).not.toBe('none');
    for (const view of ['dashboard', 'entities', 'products', 'search', 'print']) {
      expect(qs(`view-${view}`).hidden).toBe(true);
    }
    expect(qs('order-detail-view').textContent).toContain('Folio 2001');
    expect(qs('order-detail-view').closest('#view-documents')).toBeNull();
  });

  it('activa el detalle desde la fila con teclado y no deja el detalle activo al volver', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    createOrder(purchasing, storage, seedData, { folio: 2002 });
    openDocuments();

    const row = qs('document-table-body').querySelector('tr[data-order-id]');
    row.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(qs('view-order-detail').hidden).toBe(false);
    expect(qs('view-documents').hidden).toBe(true);

    qs('order-actions').querySelector('[data-action="close-order-detail"]').click();
    expect(qs('view-documents').hidden).toBe(false);
    expect(qs('view-order-detail').hidden).toBe(true);
    expect(dom.window.getComputedStyle(qs('view-order-detail')).display).toBe('none');
  });

  it('restaura filtros, orden y foco al pulsar Volver a Órdenes de Compra', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    const first = createOrder(purchasing, storage, seedData, { folio: 2003, status: 'borrador' });
    createOrder(purchasing, storage, seedData, { folio: 2004, status: 'pendiente' });
    openDocuments();

    const statusFilter = qs('documents-filter-status');
    statusFilter.value = 'borrador';
    statusFilter.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const folioSort = qs('document-table').querySelector('th[data-sort-key="folio"] button[data-sort]');
    folioSort.click();
    expect(qs('document-table').querySelector('th[data-sort-key="folio"]').getAttribute('aria-sort')).toBe('ascending');

    const trigger = qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${first.id}"]`);
    trigger.focus();
    trigger.click();

    expect(dom.window.document.activeElement).toBe(
      qs('order-actions').querySelector('[data-action="close-order-detail"]')
    );
    const back = qs('order-actions').querySelector('[data-action="close-order-detail"]');
    expect(back.textContent).toContain('Volver a Órdenes de Compra');
    back.click();

    expect(qs('documents-filter-status').value).toBe('borrador');
    expect(qs('document-table').querySelector('th[data-sort-key="folio"]').getAttribute('aria-sort')).toBe('ascending');
    expect(dom.window.document.activeElement).not.toBeNull();
    expect(dom.window.document.activeElement.dataset.action).toBe('view-order');
    expect(dom.window.document.activeElement.dataset.id).toBe(first.id);
  });

  it('mantiene el detalle inactivo fuera de la vista y sin controles enfocables visibles', async () => {
    await bootPurchasing(dom);
    expect(qs('view-order-detail').hidden).toBe(true);
    expect(dom.window.getComputedStyle(qs('view-order-detail')).display).toBe('none');
    expect(qs('view-order-detail').closest('section.view[hidden]')).not.toBeNull();

    for (const view of ['view-entities', 'view-documents', 'view-products', 'view-search', 'view-print']) {
      expect(qs(view).hidden).toBe(true);
    }
  });
});
