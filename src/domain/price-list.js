import { normalizeTiers, unitPriceFor, validateTiers } from './price-tiers.js';
import {
  createPurchasingError,
  currenciesForOrigin,
  defaultCurrencyForOrigin,
  roundMoney
} from './purchasing.js';

export const PRICE_LIST_ERRORS = Object.freeze({
  SUPPLIER_REQUIRED: 'Debes seleccionar un proveedor.',
  SUPPLIER_NOT_FOUND: 'El proveedor seleccionado ya no existe.',
  SUPPLIER_DUPLICATE: 'El proveedor ya está vinculado a este producto.',
  PRICE_INVALID: 'El precio acordado debe ser un número mayor que cero.',
  CURRENCY_INVALID: 'La moneda del precio no es válida para el origen del proveedor.',
  LINKS_REQUIRED: 'El producto debe vincularse al menos a un proveedor con su precio acordado.'
});

function text(value) {
  return String(value ?? '').trim();
}

export function supplierIdOf(entry = {}) {
  return text(entry.entity_id ?? entry.entityId ?? entry.supplierId);
}

export function productIdOfEntry(entry = {}) {
  return text(entry.id_producto ?? entry.productId);
}

export function priceOf(entry = {}) {
  return Number(entry.precio ?? entry.price);
}

/**
 * Valida un vínculo producto–proveedor–precio. La moneda por defecto es la del origen del
 * proveedor (CLP para Nacional, USD para Extranjero).
 */
export function validateSupplierPriceEntry(entry = {}, { supplier = null } = {}) {
  const errors = {};
  if (!supplierIdOf(entry)) errors.entity_id = PRICE_LIST_ERRORS.SUPPLIER_REQUIRED;
  else if (!supplier) errors.entity_id = PRICE_LIST_ERRORS.SUPPLIER_NOT_FOUND;
  const price = priceOf(entry);
  const rawPrice = entry.precio ?? entry.price;
  if (rawPrice === '' || rawPrice === null || rawPrice === undefined || !Number.isFinite(price) || price <= 0) {
    errors.precio = PRICE_LIST_ERRORS.PRICE_INVALID;
  }
  let moneda = '';
  if (supplier) {
    try {
      const allowed = currenciesForOrigin(supplier);
      moneda = text(entry.moneda ?? entry.currency).toUpperCase() || defaultCurrencyForOrigin(supplier);
      if (!allowed.includes(moneda)) errors.moneda = PRICE_LIST_ERRORS.CURRENCY_INVALID;
    } catch {
      errors.moneda = PRICE_LIST_ERRORS.CURRENCY_INVALID;
    }
  }
  // 007: tramos por cantidad opcionales; el tramo desde 1 define el precio base.
  let tramos = null;
  if (Array.isArray(entry.tramos) && entry.tramos.length) {
    const tierCheck = validateTiers(entry.tramos);
    if (!tierCheck.valid) errors.tramos = [...new Set(tierCheck.errors.map(error => error.message))].join(' ');
    else {
      tramos = normalizeTiers({ tramos: entry.tramos }).map(tier => ({ desde: tier.desde, precio: roundMoney(tier.precio) }));
      if (errors.precio && tramos[0]?.precio > 0) delete errors.precio;
    }
  }
  const base = tramos ? tramos[0].precio : roundMoney(price);
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { entity_id: supplierIdOf(entry), precio: base, moneda, ...(tramos && tramos.length > 1 ? { tramos } : {}) }
  };
}

/** Valida el conjunto de vínculos de un producto: sin proveedores repetidos y, si se exige, al menos uno. */
export function validateProductSupplierPrices(entries = [], { suppliers = [], requireAtLeastOne = false } = {}) {
  const supplierMap = new Map(suppliers.map(supplier => [text(supplier.entity_id), supplier]));
  const rows = [];
  const values = [];
  const seen = new Set();
  entries.forEach((entry, index) => {
    const id = supplierIdOf(entry);
    const result = validateSupplierPriceEntry(entry, { supplier: supplierMap.get(id) || null });
    if (id && seen.has(id)) result.errors.entity_id = PRICE_LIST_ERRORS.SUPPLIER_DUPLICATE;
    if (id) seen.add(id);
    const valid = Object.keys(result.errors).length === 0;
    if (!valid) rows.push({ index, errors: result.errors });
    else values.push(result.value);
  });
  const general = requireAtLeastOne && entries.length === 0 ? PRICE_LIST_ERRORS.LINKS_REQUIRED : '';
  return { valid: rows.length === 0 && !general, rows, general, values };
}

/**
 * Aplica la lista de precios del proveedor a las líneas de una orden: cada producto debe estar
 * en la lista en la moneda de la orden y el precio unitario se toma de la lista (no editable).
 */
export function priceLinesFromList(lines = [], priceEntries = [], currency = '') {
  const code = text(currency).toUpperCase();
  return lines.map(line => {
    const productId = text(line.id_producto ?? line.productId);
    const entry = priceEntries.find(item => productIdOfEntry(item) === productId);
    if (!entry) throw createPurchasingError('PRODUCT_NOT_IN_PRICE_LIST');
    if (code && text(entry.moneda).toUpperCase() && text(entry.moneda).toUpperCase() !== code) {
      throw createPurchasingError('PRICE_CURRENCY_MISMATCH');
    }
    return { ...line, costo_unitario: unitPriceFor(entry, Number(line.cantidad ?? line.quantity ?? 1)).precio };
  });
}

/** Productos que se pueden pedir a un proveedor en la moneda indicada. */
export function productsForSupplier(products = [], priceEntries = [], currency = '') {
  const code = text(currency).toUpperCase();
  const byProduct = new Map(
    priceEntries
      .filter(entry => !code || !text(entry.moneda) || text(entry.moneda).toUpperCase() === code)
      .map(entry => [productIdOfEntry(entry), entry])
  );
  return products
    .filter(product => byProduct.has(text(product.id_producto || product.id)))
    .map(product => ({ product, entry: byProduct.get(text(product.id_producto || product.id)) }));
}
