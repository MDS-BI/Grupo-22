// 007 · US7 — precios por tramo de cantidad, comparación de proveedores y carrito multi-proveedor.
import { roundMoney } from './purchasing.js';

export const TIER_ERRORS = Object.freeze({
  FROM_INVALID: 'La cantidad mínima del tramo debe ser un entero mayor o igual a 1.',
  FROM_DUPLICATE: 'Hay dos tramos con la misma cantidad mínima.',
  PRICE_INVALID: 'El precio del tramo debe ser mayor que cero.',
  BASE_REQUIRED: 'Debe existir un tramo desde 1 unidad.'
});

function num(value) {
  return Number(value);
}

/** Tramos ordenados por `desde`; un precio sin tramos equivale a un único tramo desde 1. */
export function normalizeTiers(entry = {}) {
  const tiers = Array.isArray(entry.tramos) && entry.tramos.length
    ? entry.tramos.map(tier => ({ desde: num(tier.desde), precio: num(tier.precio) }))
    : [{ desde: 1, precio: num(entry.precio ?? entry.price) }];
  return tiers.sort((a, b) => a.desde - b.desde);
}

/** Valida una lista de tramos `{ desde, precio }`. */
export function validateTiers(tiers = []) {
  const errors = [];
  const seen = new Set();
  tiers.forEach((tier, index) => {
    const desde = num(tier.desde);
    const precio = num(tier.precio);
    if (!Number.isInteger(desde) || desde < 1) errors.push({ index, field: 'desde', message: TIER_ERRORS.FROM_INVALID });
    else if (seen.has(desde)) errors.push({ index, field: 'desde', message: TIER_ERRORS.FROM_DUPLICATE });
    else seen.add(desde);
    if (!Number.isFinite(precio) || precio <= 0) errors.push({ index, field: 'precio', message: TIER_ERRORS.PRICE_INVALID });
  });
  if (tiers.length && !seen.has(1)) errors.push({ index: -1, field: 'desde', message: TIER_ERRORS.BASE_REQUIRED });
  return { valid: errors.length === 0, errors };
}

/** Precio del tramo con mayor `desde` que no supera la cantidad. */
export function unitPriceFor(entry = {}, quantity = 1) {
  const qty = Math.max(1, num(quantity) || 1);
  const tiers = normalizeTiers(entry);
  let applied = tiers[0];
  for (const tier of tiers) if (tier.desde <= qty) applied = tier;
  return { precio: roundMoney(applied.precio), desde: applied.desde };
}

const GRADE_RANK = { A: 0, B: 1, C: 2, 'Sin datos': 3 };

function supplierActive(supplier) {
  return String(supplier?.estado || 'activo') !== 'inactivo';
}

/**
 * Opciones de compra de un producto para una cantidad: proveedores activos con precio,
 * ordenadas con la mejor primero (CLP antes que otras monedas, menor total, mejor calificación, nombre).
 */
export function compareSupplierOptions(productId, quantity, priceEntries = [], suppliers = [], evaluations = {}) {
  const supplierMap = new Map(suppliers.map(supplier => [supplier.entity_id, supplier]));
  const qty = Math.max(1, num(quantity) || 1);
  const options = priceEntries
    .filter(entry => entry.id_producto === productId)
    .map(entry => ({ entry, supplier: supplierMap.get(entry.entity_id) }))
    .filter(({ supplier }) => supplier && supplierActive(supplier))
    .map(({ entry, supplier }) => {
      const { precio, desde } = unitPriceFor(entry, qty);
      const grade = evaluations[supplier.entity_id]?.calificacion || 'Sin datos';
      return {
        entity_id: supplier.entity_id,
        proveedor: supplier.name,
        cantidad: qty,
        tramo: desde,
        precioUnitario: precio,
        totalNeto: roundMoney(precio * qty),
        moneda: entry.moneda || 'CLP',
        calificacion: grade,
        tramos: normalizeTiers(entry),
        mejor: false
      };
    });
  options.sort((a, b) =>
    (a.moneda === 'CLP' ? 0 : 1) - (b.moneda === 'CLP' ? 0 : 1) ||
    a.totalNeto - b.totalNeto ||
    (GRADE_RANK[a.calificacion] ?? 3) - (GRADE_RANK[b.calificacion] ?? 3) ||
    a.proveedor.localeCompare(b.proveedor));
  if (options.length) options[0].mejor = true;
  return options;
}

/** Agrupa el carrito por proveedor, sumando cantidades repetidas del mismo producto. */
export function groupCartBySupplier(cart = []) {
  const groups = new Map();
  for (const item of cart) {
    if (!item?.entity_id || !item?.id_producto) continue;
    const group = groups.get(item.entity_id) || { entity_id: item.entity_id, lines: [] };
    const existing = group.lines.find(line => line.id_producto === item.id_producto);
    if (existing) existing.cantidad += Math.max(1, num(item.cantidad) || 1);
    else group.lines.push({ id_producto: item.id_producto, cantidad: Math.max(1, num(item.cantidad) || 1) });
    groups.set(item.entity_id, group);
  }
  return [...groups.values()];
}
