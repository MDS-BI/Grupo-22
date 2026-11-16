import { describe, expect, it } from 'vitest';
import {
  PRICE_LIST_ERRORS,
  priceLinesFromList,
  productsForSupplier,
  validateProductSupplierPrices,
  validateSupplierPriceEntry
} from '../../src/domain/price-list.js';
import {
  STATUS_FILTER_OPTIONS,
  formatPurchaseOrderFolio,
  formatRequestNumber,
  nextCorrelative,
  statusFilterLabel,
  statusesForFilter
} from '../../src/domain/purchasing.js';
import { filterOrders } from '../../src/purchasing-list-query.js';
import { supplierTaxIdentity } from '../../src/supplier-summary-view.js';

const national = { entity_id: 'n1', name: 'Nacional SpA', origin: 'Nacional', code: '12.345.678-5' };
const foreign = { entity_id: 'f1', name: 'Foreign Co.', origin: 'Extranjero', code: '', foreignTaxId: 'SG-123' };

describe('006 · dominio de listas de precios', () => {
  it('valida proveedor, precio mayor que cero y moneda según el origen', () => {
    expect(validateSupplierPriceEntry({ entity_id: 'n1', precio: 1500 }, { supplier: national })).toMatchObject({
      valid: true,
      value: { entity_id: 'n1', precio: 1500, moneda: 'CLP' }
    });
    expect(validateSupplierPriceEntry({ entity_id: 'f1', precio: 12.5 }, { supplier: foreign }).value.moneda).toBe('USD');
    expect(validateSupplierPriceEntry({ entity_id: 'f1', precio: 12.5, moneda: 'EUR' }, { supplier: foreign }).valid).toBe(true);
    expect(validateSupplierPriceEntry({ entity_id: 'n1', precio: 10, moneda: 'USD' }, { supplier: national }).errors.moneda)
      .toBe(PRICE_LIST_ERRORS.CURRENCY_INVALID);
    expect(validateSupplierPriceEntry({ entity_id: 'n1', precio: 0 }, { supplier: national }).errors.precio)
      .toBe(PRICE_LIST_ERRORS.PRICE_INVALID);
    expect(validateSupplierPriceEntry({ entity_id: 'n1', precio: '' }, { supplier: national }).errors.precio)
      .toBe(PRICE_LIST_ERRORS.PRICE_INVALID);
    expect(validateSupplierPriceEntry({ precio: 10 }).errors.entity_id).toBe(PRICE_LIST_ERRORS.SUPPLIER_REQUIRED);
    expect(validateSupplierPriceEntry({ entity_id: 'x', precio: 10 }).errors.entity_id).toBe(PRICE_LIST_ERRORS.SUPPLIER_NOT_FOUND);
  });

  it('exige al menos un vínculo cuando corresponde y rechaza proveedores repetidos', () => {
    const suppliers = [national, foreign];
    expect(validateProductSupplierPrices([], { suppliers, requireAtLeastOne: true }).general).toBe(PRICE_LIST_ERRORS.LINKS_REQUIRED);
    expect(validateProductSupplierPrices([], { suppliers }).valid).toBe(true);
    const duplicated = validateProductSupplierPrices(
      [{ entity_id: 'n1', precio: 10 }, { entity_id: 'n1', precio: 12 }],
      { suppliers }
    );
    expect(duplicated.valid).toBe(false);
    expect(duplicated.rows[0]).toMatchObject({ index: 1, errors: { entity_id: PRICE_LIST_ERRORS.SUPPLIER_DUPLICATE } });
    const ok = validateProductSupplierPrices(
      [{ entity_id: 'n1', precio: 10 }, { entity_id: 'f1', precio: 2, moneda: 'EUR' }],
      { suppliers, requireAtLeastOne: true }
    );
    expect(ok.valid).toBe(true);
    expect(ok.values).toHaveLength(2);
  });

  it('fija el precio de las líneas desde la lista y rechaza productos fuera de ella o en otra moneda', () => {
    const list = [{ entity_id: 'f1', id_producto: 'p1', precio: 7, moneda: 'USD' }];
    expect(priceLinesFromList([{ id_producto: 'p1', cantidad: 2, costo_unitario: 999 }], list, 'USD'))
      .toEqual([{ id_producto: 'p1', cantidad: 2, costo_unitario: 7 }]);
    expect(() => priceLinesFromList([{ id_producto: 'p2', cantidad: 1 }], list, 'USD'))
      .toThrow(expect.objectContaining({ code: 'PRODUCT_NOT_IN_PRICE_LIST' }));
    expect(() => priceLinesFromList([{ id_producto: 'p1', cantidad: 1 }], list, 'EUR'))
      .toThrow(expect.objectContaining({ code: 'PRICE_CURRENCY_MISMATCH' }));
  });

  it('ofrece solo los productos del proveedor en la moneda de la orden', () => {
    const products = [{ id_producto: 'p1', nombre: 'A' }, { id_producto: 'p2', nombre: 'B' }, { id_producto: 'p3', nombre: 'C' }];
    const list = [
      { id_producto: 'p1', precio: 5, moneda: 'USD' },
      { id_producto: 'p3', precio: 4, moneda: 'EUR' }
    ];
    expect(productsForSupplier(products, list, 'USD').map(item => item.product.id_producto)).toEqual(['p1']);
    expect(productsForSupplier(products, list, 'EUR').map(item => item.product.id_producto)).toEqual(['p3']);
  });
});

describe('006 · filtro de estado, folios e identificación tributaria', () => {
  it('declara un nombre único por opción de filtro', () => {
    const labels = STATUS_FILTER_OPTIONS.map(option => option.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(expect.arrayContaining([
      'Solicitud – Borrador',
      'Solicitud – Pendiente de aprobación',
      'OC emitida – Aprobada',
      'OC – Recibida',
      'Cancelada'
    ]));
    expect(statusFilterLabel('pendiente')).toBe('Solicitud – Pendiente de aprobación');
    expect(statusesForFilter('tipo:oc')).toEqual(['aprobado', 'recibido']);
    expect(statusesForFilter('cancelado')).toEqual(['cancelado']);
  });

  it('filtra órdenes por estado específico o por tipo de documento', () => {
    const orders = ['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado'].map(status => ({ id: status, status }));
    expect(filterOrders(orders, { status: 'tipo:solicitud' }).map(order => order.id)).toEqual(['borrador', 'pendiente']);
    expect(filterOrders(orders, { status: 'tipo:oc' }).map(order => order.id)).toEqual(['aprobado', 'recibido']);
    expect(filterOrders(orders, { status: 'cancelado' }).map(order => order.id)).toEqual(['cancelado']);
  });

  it('formatea números correlativos SOL y OC', () => {
    expect(formatRequestNumber(1)).toBe('SOL-0001');
    expect(formatRequestNumber(2001)).toBe('SOL-2001');
    expect(formatPurchaseOrderFolio(12)).toBe('OC-0012');
    expect(formatPurchaseOrderFolio(undefined)).toBe('');
    expect(nextCorrelative([3, '7', null, 'x'])).toBe(8);
    expect(nextCorrelative([])).toBe(1);
  });

  it('muestra RUT o identificación extranjera sin valores vacíos', () => {
    expect(supplierTaxIdentity(national)).toBe('12.345.678-5');
    expect(supplierTaxIdentity(foreign)).toBe('ID tributario ext. SG-123');
    expect(supplierTaxIdentity({ origin: 'Extranjero' })).toBe('');
  });
});
