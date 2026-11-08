import { loadProducts } from './purchasing-storage.js';
import { calculateLineSubtotal, calculateOrderTotals } from './domain/purchasing.js';

let lineOptions = {};

function qs(id) {
  return document.getElementById(id);
}

function fallbackEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function fallbackCurrency(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(number)
    : String(value ?? '');
}

function productMap(options = lineOptions) {
  if (options.products instanceof Map) return options.products;
  const products = options.products || loadProducts();
  return new Map(products.map(product => [product.id_producto || product.id, product]));
}

export function renderLineRows(body, lines = [], options = lineOptions) {
  if (!body) return;
  const escape = options.escapeHtml || fallbackEscape;
  const currency = options.formatCurrencyCLP || fallbackCurrency;
  const products = productMap(options);
  body.innerHTML = lines.length
    ? lines.map((line, index) => {
        const product = products.get(line.id_producto) || line.producto || line.product || {};
        return `<tr>
          <td>${escape(product.nombre || product.name || '')}</td>
          <td>${escape(product.unidad_medida || product.unit || '')}</td>
          <td>${escape(line.cantidad)}</td>
          <td>${escape(currency(line.costo_unitario))}</td>
          <td>${escape(currency(calculateLineSubtotal(line)))}</td>
          <td class="table-actions">
            <button type="button" class="secondary" data-action="edit-line" data-index="${index}">Editar</button>
            <button type="button" class="danger" data-action="delete-line" data-index="${index}">Eliminar</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" class="empty-row">Agrega al menos una línea de detalle.</td></tr>';
}

export function renderLineTotals(container, lines = [], options = lineOptions) {
  if (!container) return;
  const escape = options.escapeHtml || fallbackEscape;
  const currency = options.formatCurrencyCLP || fallbackCurrency;
  const totals = calculateOrderTotals(lines);
  container.innerHTML = `
    <div><span>Neto</span><strong>${escape(currency(totals.neto))}</strong></div>
    <div><span>IVA (19 %)</span><strong>${escape(currency(totals.iva))}</strong></div>
    <div class="order-total"><span>Total</span><strong>${escape(currency(totals.total))}</strong></div>`;
}

export function renderLineEditor(options = lineOptions) {
  const body = options.body || qs('document-lines-body');
  const totals = options.totals || qs('document-totals');
  renderLineRows(body, options.lines || [], options);
  renderLineTotals(totals, options.lines || [], options);
}

export function normalizeLineDraft(data = {}) {
  return {
    id_producto: String(data.id_producto ?? data.productId ?? ''),
    cantidad: Number(data.cantidad ?? data.quantity),
    costo_unitario: Number(data.costo_unitario ?? data.unitCost)
  };
}

export function init(options = {}) {
  lineOptions = options;
  if (options.render !== false) renderLineEditor(options);
}

export function reset() {
  lineOptions = {};
}
