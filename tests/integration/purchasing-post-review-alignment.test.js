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

function setFilterValue(id, value, eventName = 'change') {
  const element = qs(id);
  element.value = value;
  element.dispatchEvent(new dom.window.Event(eventName, { bubbles: true }));
}

function selectRubros(ids) {
  const select = qs('entities-filter-rubros');
  for (const option of select.options) option.selected = ids.includes(option.value);
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

describe('alineación con 001 y 002', () => {
  it('conserva Rubro múltiple y Origen en Proveedores', async () => {
    const { storage } = await bootPurchasing(dom);
    qs('nav-entities').click();
    qs('entity-list-new').click();

    expect(qs('supplier-rubros').multiple).toBe(true);
    expect(qs('supplier-rubros').getAttribute('multiple')).not.toBeNull();
    expect(qs('origin').tagName).toBe('SELECT');
    expect([...qs('origin').options].map(option => option.value)).toEqual(expect.arrayContaining(['', 'Nacional', 'Extranjero']));
    expect(qs('foreignTaxId')).not.toBeNull();
    expect(qs('entity-form').querySelector('#category')).toBeNull();
    expect(qs('entity-table-rubro-heading').textContent).toBe('Rubros');

    const rubro = storage.addRubro({ nombre: 'Oficina' });
    const entity = storage.addEntity({
      name: 'Proveedor Oficina',
      code: '11.111.111-1',
      origin: 'Nacional',
      rubro_ids: [rubro.id_rubro],
      paymentTerms: 'Contado'
    });
    expect(entity.rubro_ids).toEqual([rubro.id_rubro]);
    expect(storage.loadEntities().find(item => item.id === entity.id).origin).toBe('Nacional');
  });

  it('filtra Proveedores por Rubro con coincidencia OR', async () => {
    const { storage } = await bootPurchasing(dom);
    const rubroA = storage.addRubro({ nombre: 'Rubro A' });
    const rubroB = storage.addRubro({ nombre: 'Rubro B' });
    const rubroC = storage.addRubro({ nombre: 'Rubro C' });
    for (const [name, code, rubro] of [
      ['Proveedor A', '22.222.222-2', rubroA],
      ['Proveedor B', '33.333.333-3', rubroB],
      ['Proveedor C', '44.444.444-4', rubroC]
    ]) {
      storage.addEntity({
        name,
        code,
        origin: 'Nacional',
        rubro_ids: [rubro.id_rubro],
        paymentTerms: 'Contado'
      });
    }

    qs('nav-entities').click();
    selectRubros([rubroA.id_rubro, rubroB.id_rubro]);

    const rows = [...qs('entity-table-body').querySelectorAll('tr')].map(row => row.textContent);
    expect(rows.some(text => text.includes('Proveedor A'))).toBe(true);
    expect(rows.some(text => text.includes('Proveedor B'))).toBe(true);
    expect(rows.some(text => text.includes('Proveedor C'))).toBe(false);
    expect(qs('entity-filter-summary').textContent).toContain('Rubros: Rubro A, Rubro B');
  });

  it('filtra Proveedores por Origen', async () => {
    const { storage } = await bootPurchasing(dom);
    storage.addEntity({ name: 'Nacional Uno', code: '55.555.555-5', origin: 'Nacional', category: 'Insumos', paymentTerms: 'Contado' });
    storage.addEntity({ name: 'Extranjero Uno', code: '66.666.666-6', origin: 'Extranjero', foreignTaxId: 'TAX-66', category: 'Insumos', paymentTerms: 'Contado' });

    qs('nav-entities').click();
    setFilterValue('entities-filter-origin', 'Extranjero');

    const text = qs('entity-table-body').textContent;
    expect(text).toContain('Extranjero Uno');
    expect(text).not.toContain('Nacional Uno');
    expect(qs('entity-filter-summary').textContent).toContain('Origen: Extranjero');
  });

  it('mantiene retirados los campos de totales de la orden', async () => {
    await bootPurchasing(dom);
    qs('nav-documents').click();
    qs('document-list-new').click();
    for (const id of ['startDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'notes']) {
      const field = qs(id)?.closest('.field');
      expect(field?.hidden).toBe(true);
      expect(dom.window.getComputedStyle(field).display).toBe('none');
    }
    expect(qs('document-form').querySelector('#document-lines-heading')).not.toBeNull();
    expect(qs('document-form').querySelector('#document-lines-table')).not.toBeNull();
  });

  it('asigna automáticamente la fecha de emisión al aprobar una solicitud', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    const draft = createOrder(purchasing, storage, seedData, { status: 'pendiente', folio: 4001 });
    expect(purchasing.getPurchaseOrderDetail(draft.id).order.startDate).toBeFalsy();

    const approved = purchasing.changeOrderStatus(draft.id, 'aprobado', '2026-11-14T15:30:00.000Z');
    expect(approved.order.startDate).toBe('2026-11-14');
    expect(approved.order.status).toBe('aprobado');

    const direct = createOrder(purchasing, storage, seedData, { status: 'aprobado', folio: 4002 });
    expect(purchasing.getPurchaseOrderDetail(direct.id).order.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa las etiquetas Rubro/Categoría y Solicitud/Orden de Compra emitida', async () => {
    const { purchasing, storage, seedData } = await bootPurchasing(dom);
    const request = createOrder(purchasing, storage, seedData, { status: 'borrador', folio: 4003 });
    const emitted = createOrder(purchasing, storage, seedData, { status: 'aprobado', folio: 4004 });

    qs('nav-entities').click();
    expect(qs('entities-filter-rubros-label').textContent).toBe('Rubros');
    qs('nav-products').click();
    expect(qs('product-filter-category').closest('.field').querySelector('label').textContent).toBe('Categoría');
    expect([...qs('product-table').querySelectorAll('th')].map(th => th.textContent).join(' ')).toContain('Categoría');

    qs('nav-documents').click();
    const options = [...qs('documents-filter-status').options].map(option => option.textContent);
    expect(options).toEqual(expect.arrayContaining(['Solicitud de compra', 'Orden de Compra emitida']));

    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${request.id}"]`).click();
    expect(qs('order-detail-view').textContent).toContain('Solicitud de compra');
    expect(qs('order-detail-view').textContent).toContain('Sin emitir');

    qs('order-actions').querySelector('[data-action="close-order-detail"]').click();
    qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${emitted.id}"]`).click();
    expect(qs('order-detail-view').textContent).toContain('Orden de Compra emitida');
    expect(qs('order-detail-view').textContent).toContain('Fecha de emisión');
    expect(qs('order-detail-view').querySelector('[data-status="aprobado"]').textContent).toBe('Orden de Compra emitida');
  });
});
