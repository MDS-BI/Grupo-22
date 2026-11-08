import { getPurchaseOrderDetail } from './purchasing-storage.js';
import { calculateLineSubtotal, calculateOrderTotals, getAvailableActionItems, actionLabel } from './domain/purchasing.js';

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

function fallbackDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || '');
}

export function formatHistoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.day}-${values.month}-${values.year} ${values.hour}:${values.minute}`;
}

export function init() {}

export function renderDetail(detailOrId, options = {}) {
  const detail = typeof detailOrId === 'string' ? getPurchaseOrderDetail(detailOrId) : detailOrId;
  if (!detail) return null;
  const escape = options.escapeHtml || fallbackEscape;
  const currency = options.formatCurrencyCLP || fallbackCurrency;
  const formatDate = options.formatDate || fallbackDate;
  const order = detail.order || detail.document || detail;
  const lines = detail.lines || [];
  const totals = detail.totals || calculateOrderTotals(lines);
  const employeeName = detail.employee?.nombre || detail.employee?.name || detail.employeeName || 'Empleado desconocido';
  const supplier = detail.supplier || {};
  const supplierName = supplier.name || supplier.nombre || '';
  const supplierCode = supplier.code || supplier.rut || '';
  const actions = detail.isLegacy ? [] : getAvailableActionItems(order.status);
  const stockApplied = Boolean(detail.stockApplied || detail.metadata?.stock_aplicado);

  const header = qs('order-detail-view');
  if (header) {
    header.innerHTML = `
      <div class="page-heading">
        <div><span class="eyebrow">Detalle de orden</span><h1>Folio ${escape(order.folio)}</h1></div>
      </div>
      ${detail.isLegacy ? '<p class="legacy-note">Orden histórica sin metadatos de extensión; el empleado se muestra como desconocido.</p>' : ''}
      <dl class="detail-header">
        <div><dt>Proveedor</dt><dd>${escape(supplierName)}</dd></div>
        <div><dt>RUT</dt><dd>${escape(supplierCode)}</dd></div>
        <div><dt>Empleado solicitante</dt><dd>${escape(employeeName)}</dd></div>
        <div><dt>Fecha de emisión</dt><dd>${escape(formatDate(order.startDate))}</dd></div>
        <div><dt>Fecha de entrega</dt><dd>${escape(formatDate(order.endDate))}</dd></div>
        <div><dt>Estado</dt><dd><span class="status-badge">${escape(order.status || '')}</span></dd></div>
        <div><dt>Condición de pago</dt><dd>${escape(order.paymentTerms || '')}</dd></div>
        <div><dt>Stock aplicado</dt><dd class="${stockApplied ? 'stock-applied' : ''}">${stockApplied ? 'Sí' : 'No'}</dd></div>
      </dl>
      ${order.notes ? `<p><strong>Notas:</strong> ${escape(order.notes)}</p>` : ''}`;
  }

  const linesContainer = qs('order-lines-table');
  if (linesContainer) {
    const editable = !['recibido', 'cancelado'].includes(order.status);
    linesContainer.innerHTML = `
      <h2>Líneas de detalle</h2>
      <div class="table-wrapper">
        <table class="data-table" id="order-lines">
          <thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th>${editable ? '<th>Acciones</th>' : ''}</tr></thead>
          <tbody>
            ${lines.length
              ? lines.map(line => {
                  const product = line.producto || line.product || {};
                  return `<tr>
                    <td>${escape(product.nombre || product.name || '')}</td>
                    <td>${escape(product.unidad_medida || product.unit || '')}</td>
                    <td>${escape(line.cantidad)}</td>
                    <td>${escape(currency(line.costo_unitario))}</td>
                    <td>${escape(currency(calculateLineSubtotal(line)))}</td>
                    ${editable ? `<td class="table-actions"><button type="button" class="danger" data-action="delete-line" data-product-id="${escape(line.id_producto)}">Eliminar</button></td>` : ''}
                  </tr>`;
                }).join('')
              : `<tr><td colspan="${editable ? 6 : 5}" class="empty-row">Sin líneas de detalle.</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  const totalsContainer = qs('order-totals');
  if (totalsContainer) {
    totalsContainer.innerHTML = `
      <div><span>Neto</span><strong>${escape(currency(totals.neto))}</strong></div>
      <div><span>IVA (19 %)</span><strong>${escape(currency(totals.iva))}</strong></div>
      <div class="order-total"><span>Total</span><strong>${escape(currency(totals.total))}</strong></div>`;
  }

  const actionsContainer = qs('order-actions');
  if (actionsContainer) {
    actionsContainer.innerHTML = `
      <button type="button" class="primary" data-action="print-order">Imprimir orden</button>
      ${actions
        .map(action => `<button type="button" class="secondary" data-action="transition" data-next-status="${escape(action.nextStatus)}">${escape(action.label || actionLabel(action.nextStatus))}</button>`)
        .join('')}
      <button type="button" class="secondary" data-action="close-order-detail">Volver a la lista</button>
      <span class="feedback" aria-live="polite"></span>`;
  }

  const historyContainer = qs('order-history');
  if (historyContainer) {
    const history = detail.history || [];
    historyContainer.innerHTML = `
      <h2>Historial de cambios de estado</h2>
      ${history.length
        ? `<ol>${history
            .map(record => `<li><strong>${escape(record.from)} → ${escape(record.to)}</strong> <time datetime="${escape(record.changedAt)}">${escape(formatHistoryDate(record.changedAt))}</time></li>`)
            .join('')}</ol>`
        : '<p class="empty-row">Sin cambios de estado registrados.</p>'}
      ${stockApplied ? '<p class="stock-applied">Recepción aplicada al stock de los productos.</p>' : ''}`;
  }

  return detail;
}
