// 007 · US7: "Comprar por producto". El usuario elige el producto y la cantidad, ve los
// proveedores que lo venden con su precio pactado (según el tramo) y arma un carrito; al guardar
// se crea una solicitud por proveedor (createRequestsFromCart). El modo "Por proveedor" es el
// formulario de siempre (001–006) y es el único disponible al editar una solicitud existente.
import { getPurchaseOptions, purchasableProducts, getAllSupplierEvaluations } from './purchasing-management.js';
import { groupCartBySupplier } from './domain/price-tiers.js';
import { gradeTag } from './ui-gestion.js';

let ctx = null;
let defaultMode = 'supplier';
let mode = 'supplier';
let cart = [];

function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  return ctx.escapeHtml(value);
}

function money(value, currency) {
  return ctx.formatMoney(value, currency);
}

export function configurePurchaseMode(context) {
  ctx = context;
}

/** El arranque real (boot) abre las solicitudes nuevas en "Comprar por producto". */
export function setDefaultPurchaseMode(value) {
  defaultMode = value === 'product' ? 'product' : 'supplier';
}

export function isProductMode() {
  return mode === 'product' && !el('purchase-mode')?.hidden;
}

export function getCart() {
  return cart.map(item => ({ ...item }));
}

function supplierOnlyElements() {
  return [
    el('document-entity')?.closest('.field'),
    el('currency')?.closest('.field'),
    el('docPaymentTerms')?.closest('.field'),
    document.querySelector('#document-form .order-line-editor')
  ].filter(Boolean);
}

function applyMode() {
  const form = el('document-form');
  if (!form) return;
  const product = isProductMode();
  form.classList.toggle('mode-product', product);
  for (const element of supplierOnlyElements()) element.toggleAttribute('data-hidden-by-mode', product);
  for (const element of supplierOnlyElements()) element.hidden = product;
  const section = el('purchase-by-product');
  if (section) section.hidden = !product;
  for (const button of el('purchase-mode')?.querySelectorAll('[data-purchase-mode]') || []) {
    button.setAttribute('aria-pressed', String(button.dataset.purchaseMode === mode));
  }
  const submit = el('document-submit-button');
  if (submit && product) updateSubmitLabel();
  else if (submit && submit.dataset.supplierLabel) submit.textContent = submit.dataset.supplierLabel;
}

function updateSubmitLabel() {
  const submit = el('document-submit-button');
  if (!submit) return;
  if (!submit.dataset.supplierLabel || !isProductMode()) return;
  const groups = groupCartBySupplier(cart).length;
  submit.textContent = groups > 1 ? `Crear ${groups} solicitudes` : 'Crear solicitud';
}

export function setPurchaseMode(next) {
  const submit = el('document-submit-button');
  if (submit && mode !== 'product') submit.dataset.supplierLabel = submit.textContent;
  mode = next === 'product' ? 'product' : 'supplier';
  if (submit && !submit.dataset.supplierLabel) submit.dataset.supplierLabel = submit.textContent;
  applyMode();
  if (isProductMode()) {
    renderProductOptions();
    renderOptions();
    renderCart();
  }
}

/** Nueva solicitud: muestra el selector y aplica el modo por defecto. Edición: solo "Por proveedor". */
export function resetPurchaseMode({ editing = false, enabled = true } = {}) {
  cart = [];
  const toggle = el('purchase-mode');
  if (!toggle) return;
  toggle.hidden = editing || !enabled;
  const submit = el('document-submit-button');
  if (submit) submit.dataset.supplierLabel = submit.textContent;
  mode = editing || !enabled ? 'supplier' : defaultMode;
  if (el('pbp-quantity')) el('pbp-quantity').value = '1';
  if (el('error-pbp')) el('error-pbp').textContent = '';
  applyMode();
  if (isProductMode()) {
    renderProductOptions();
    renderOptions();
    renderCart();
  }
}

function renderProductOptions() {
  const select = el('pbp-product');
  if (!select) return;
  const previous = select.value;
  const items = purchasableProducts().sort((a, b) => Number(b.purchasable) - Number(a.purchasable) || String(a.product.nombre).localeCompare(String(b.product.nombre), 'es'));
  select.innerHTML = '<option value="">Seleccionar producto</option>' + items.map(({ product, purchasable }) => {
    const id = product.id_producto || product.id;
    return `<option value="${esc(id)}"${purchasable ? '' : ' disabled'}>${esc(product.nombre)}${product.unidad_medida ? ` (${esc(product.unidad_medida)})` : ''}${purchasable ? '' : ' — sin proveedor con precio'}</option>`;
  }).join('');
  if ([...select.options].some(option => option.value === previous && !option.disabled)) select.value = previous;
}

function quantity() {
  const value = Number(el('pbp-quantity')?.value);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function nextTierHint(option) {
  const tiers = Array.isArray(option.tramos) ? option.tramos : [];
  const next = tiers.find(tier => Number(tier.desde) > option.cantidad);
  return next ? `<small class="tier-hint">Desde ${esc(next.desde)} u.: ${esc(money(next.precio, option.moneda))} c/u</small>` : '';
}

function renderOptions() {
  const host = el('pbp-options');
  if (!host) return;
  const productId = el('pbp-product')?.value;
  const qty = quantity();
  if (!productId) {
    host.innerHTML = '<p class="insight-empty">Elige un producto para ver qué proveedores lo venden y a qué precio.</p>';
    return;
  }
  if (!qty) {
    host.innerHTML = '<p class="field-error">La cantidad debe ser un entero mayor que cero.</p>';
    return;
  }
  const options = getPurchaseOptions(productId, qty, getAllSupplierEvaluations());
  if (!options.length) {
    host.innerHTML = '<p class="insight-empty">Ningún proveedor activo tiene precio pactado para este producto.</p>';
    return;
  }
  host.scrollLeft = 0;
  host.innerHTML = `<table class="data-table pbp-table">
    <colgroup><col style="width:42%"><col style="width:22%"><col style="width:20%"><col style="width:16%"></colgroup>
    <caption class="sr-only">Proveedores que venden el producto</caption>
    <thead><tr><th scope="col">Proveedor</th><th scope="col">Precio unitario</th><th scope="col">Total neto (${qty} u.)</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead>
    <tbody>${options.map(option => `<tr class="${option.mejor ? 'is-best' : ''}">
      <td><span class="pbp-supplier"><strong>${esc(option.proveedor)}</strong>${option.mejor ? '<span class="best-tag">Mejor precio</span>' : ''}${gradeTag(option.calificacion || null)}</span></td>
      <td>${esc(money(option.precioUnitario, option.moneda))}${option.tramo > 1 ? ` <small class="tier-applied">tramo desde ${esc(option.tramo)} u.</small>` : ''}${nextTierHint(option)}</td>
      <td><strong>${esc(money(option.totalNeto, option.moneda))}</strong></td>
      <td><button type="button" class="${option.mejor ? 'primary' : 'secondary'}" data-action="pbp-add" data-entity-id="${esc(option.entity_id)}">Agregar</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function priceCart() {
  const productNames = new Map(purchasableProducts().map(({ product }) => [product.id_producto || product.id, product.nombre]));
  const evaluations = getAllSupplierEvaluations();
  cart = cart.map(item => {
    const option = getPurchaseOptions(item.id_producto, item.cantidad, evaluations).find(entry => entry.entity_id === item.entity_id);
    return option
      ? { ...item, nombre: productNames.get(item.id_producto) || item.nombre, proveedor: option.proveedor, precioUnitario: option.precioUnitario, totalNeto: option.totalNeto, moneda: option.moneda, available: true }
      : { ...item, available: false };
  });
}

function renderCart() {
  const host = el('pbp-cart');
  if (!host) return;
  priceCart();
  const groups = groupCartBySupplier(cart);
  updateSubmitLabel();
  if (!cart.length) {
    host.innerHTML = '<p class="insight-empty">El carrito está vacío. Agrega productos desde la tabla de arriba.</p>';
    return;
  }
  host.innerHTML = `<table class="data-table pbp-cart-table">
    <thead><tr><th scope="col">Producto</th><th scope="col">Proveedor</th><th scope="col">Cantidad</th><th scope="col">Precio unitario</th><th scope="col">Total neto</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead>
    <tbody>${cart.map((item, index) => `<tr>
      <td>${esc(item.nombre)}</td>
      <td>${esc(item.proveedor || '')}</td>
      <td><label class="sr-only" for="pbp-cart-qty-${index}">Cantidad de ${esc(item.nombre)}</label><input id="pbp-cart-qty-${index}" class="pbp-cart-qty" type="number" min="1" step="1" value="${esc(item.cantidad)}" data-cart-index="${index}"></td>
      <td>${item.available ? esc(money(item.precioUnitario, item.moneda)) : '<span class="field-error">Sin precio</span>'}</td>
      <td>${item.available ? esc(money(item.totalNeto, item.moneda)) : '—'}</td>
      <td><button type="button" class="danger" data-action="pbp-remove" data-cart-index="${index}">Quitar</button></td>
    </tr>`).join('')}</tbody>
  </table>
  <p class="pbp-summary">${groups.length > 1
    ? `Se crearán <strong>${groups.length} solicitudes</strong>, una por proveedor (${groups.map(group => esc(cart.find(item => item.entity_id === group.entity_id)?.proveedor || '')).join(', ')}).`
    : `Se creará <strong>1 solicitud</strong> para ${esc(cart[0].proveedor || '')}.`} Los precios se toman de la lista pactada al guardar.</p>`;
}

function addToCart(entityId) {
  const productId = el('pbp-product')?.value;
  const qty = quantity();
  if (!productId || !qty) return;
  const existing = cart.find(item => item.id_producto === productId && item.entity_id === entityId);
  if (existing) existing.cantidad += qty;
  else cart.push({ id_producto: productId, entity_id: entityId, cantidad: qty, nombre: el('pbp-product').selectedOptions[0]?.textContent || '' });
  if (el('error-pbp')) el('error-pbp').textContent = '';
  renderCart();
  el('pbp-product')?.focus();
}

export function bindPurchaseMode() {
  const form = el('document-form');
  if (!form || form.dataset.purchaseModeBound) return;
  form.dataset.purchaseModeBound = 'true';
  el('purchase-mode')?.addEventListener('click', event => {
    const button = event.target.closest('[data-purchase-mode]');
    if (button) setPurchaseMode(button.dataset.purchaseMode);
  });
  el('pbp-product')?.addEventListener('change', renderOptions);
  el('pbp-quantity')?.addEventListener('input', renderOptions);
  el('purchase-by-product')?.addEventListener('click', event => {
    const add = event.target.closest('[data-action="pbp-add"]');
    if (add) {
      addToCart(add.dataset.entityId);
      return;
    }
    const remove = event.target.closest('[data-action="pbp-remove"]');
    if (remove) {
      cart.splice(Number(remove.dataset.cartIndex), 1);
      renderCart();
    }
  });
  el('purchase-by-product')?.addEventListener('change', event => {
    const input = event.target.closest('.pbp-cart-qty');
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isInteger(value) || value <= 0) {
      el('error-pbp').textContent = 'La cantidad debe ser un entero mayor que cero.';
      return;
    }
    cart[Number(input.dataset.cartIndex)].cantidad = value;
    renderCart();
  });
}

/** Valida el carrito; devuelve un mensaje de error o '' si se puede guardar. */
export function cartError() {
  if (!cart.length) return 'Agrega al menos un producto al carrito.';
  priceCart();
  const missing = cart.find(item => !item.available);
  if (missing) return `${missing.nombre} ya no tiene precio con ${missing.proveedor || 'el proveedor elegido'}; quítalo del carrito.`;
  return '';
}

export function clearCart() {
  cart = [];
  renderCart();
}
