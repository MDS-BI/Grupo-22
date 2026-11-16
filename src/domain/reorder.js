// 007 · US2 — stock mínimo y solicitudes sugeridas.
import { compareSupplierOptions } from './price-tiers.js';

const OPEN = ['borrador', 'pendiente'];

export function isBelowMinimum(product = {}) {
  const minimum = Number(product.stock_minimo || 0);
  return minimum > 0 && Number(product.stock || 0) <= minimum;
}

export function suggestedQuantity(product = {}) {
  const minimum = Number(product.stock_minimo || 0);
  return Math.max(1, 2 * minimum - Number(product.stock || 0));
}

/** Mejor opción de compra (FR-011) para un producto y cantidad, o null. */
export function pickSupplier(productId, quantity, priceEntries, suppliers, evaluations = {}) {
  return compareSupplierOptions(productId, quantity, priceEntries, suppliers, evaluations)[0] || null;
}

/**
 * Productos bajo el mínimo agrupados por proveedor elegido. `openLines`: [{ id_producto, folio, status }]
 * de órdenes abiertas para no volver a sugerir lo que ya está en una solicitud.
 */
export function buildSuggestedRequests(products = [], priceEntries = [], suppliers = [], openLines = [], evaluations = {}) {
  const inOpen = new Map();
  for (const line of openLines) if (OPEN.includes(line.status) && !inOpen.has(line.id_producto)) inOpen.set(line.id_producto, line);
  const groups = new Map();
  const skipped = [];
  for (const product of products) {
    if (!isBelowMinimum(product)) continue;
    const productId = product.id_producto || product.id;
    if (inOpen.has(productId)) {
      skipped.push({ product, reason: 'open', folio: inOpen.get(productId).folio });
      continue;
    }
    const quantity = suggestedQuantity(product);
    const option = pickSupplier(productId, quantity, priceEntries, suppliers, evaluations);
    if (!option) {
      skipped.push({ product, reason: 'no-supplier' });
      continue;
    }
    const group = groups.get(option.entity_id) || { entity_id: option.entity_id, proveedor: option.proveedor, currency: option.moneda, lines: [] };
    group.lines.push({ id_producto: productId, cantidad: quantity, costo_unitario: option.precioUnitario });
    groups.set(option.entity_id, group);
  }
  return { groups: [...groups.values()], skipped };
}
