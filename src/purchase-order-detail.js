import { getPurchaseOrderDetail } from './purchasing-storage.js';
import { documentLabel } from './access-policy.js';
import { calculateLineSubtotal, calculateOrderTotals, getAvailableActionItems, actionLabel, formatPurchaseOrderFolio, formatRequestNumber } from './domain/purchasing.js';
import { icon } from './ui-icons.js';

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

function fallbackCurrency(value, code = 'CLP') {
  const number = Number(value);
  const currency = String(code || 'CLP').toUpperCase();
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'CLP' ? 0 : 2,
        minimumFractionDigits: currency === 'CLP' ? 0 : 2
      }).format(number)
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
  const currency = options.formatCurrency || options.formatCurrencyCLP || fallbackCurrency;
  const formatDate = options.formatDate || fallbackDate;
  const order = detail.order || detail.document || detail;
  const lines = detail.lines || [];
  const taxRate = Number.isFinite(Number(detail.taxRate)) ? Number(detail.taxRate) : 0.19;
  const currencyCode = detail.currency || order.currency || 'CLP';
  const totals = detail.totals || calculateOrderTotals(lines, { taxRate, currency: currencyCode });
  const emissionDate = order.startDate ? formatDate(order.startDate) : 'Sin emitir';
  const employeeName = detail.employee?.nombre || detail.employee?.name || detail.employeeName || 'Empleado desconocido';
  const supplier = detail.supplier || {};
  const supplierName = supplier.name || supplier.nombre || '';
  const supplierCode = supplier.code || supplier.rut || '';
  const availableActions = detail.isLegacy ? [] : getAvailableActionItems(order.status);
  const actions = options.allowedNextStatuses
    ? availableActions.filter(action => options.allowedNextStatuses.includes(action.nextStatus))
    : availableActions;
  const stockApplied = Boolean(detail.stockApplied || detail.metadata?.stock_aplicado);
  const statusBadge = options.renderStatus
    ? options.renderStatus(order.status)
    : `<span class="status-badge">${escape(order.status || '')}</span>`;
  const typeLabel = documentLabel(order.status);

  const header = qs('order-detail-view');
  if (header) {
    header.innerHTML = `
      <div class="page-heading">
        <div><span class="eyebrow">${escape(typeLabel)}</span><h1>${escape(typeLabel)} · Folio ${escape(order.folio)}</h1></div>
        <p class="detail-reference"><strong>${escape(formatPurchaseOrderFolio(order.ocFolio) || formatRequestNumber(order.folio) || order.folio)}</strong></p>
      </div>
      ${renderStatusProgress(order.status, detail.history || [])}
      ${detail.isLegacy ? '<p class="legacy-note">Orden histórica sin metadatos de extensión; el empleado se muestra como desconocido.</p>' : ''}
      <dl class="detail-header">
        <div><dt>Proveedor</dt><dd>${escape(supplierName)}</dd></div>
        <div><dt>${supplier.origin === 'Extranjero' ? 'Identificación tributaria extranjera' : 'RUT'}</dt><dd>${escape(supplier.origin === 'Extranjero' ? (supplier.foreignTaxId || supplierCode) : supplierCode)}</dd></div>
        <div><dt>N° de solicitud</dt><dd>${escape(formatRequestNumber(order.folio) || order.folio)}</dd></div>
        <div><dt>Folio OC</dt><dd>${escape(formatPurchaseOrderFolio(order.ocFolio) || 'Sin emitir')}</dd></div>
        <div><dt>Empleado solicitante</dt><dd>${escape(employeeName)}</dd></div>
        <div><dt>Fecha de emisión</dt><dd>${escape(emissionDate)}</dd></div>
        <div><dt>Fecha de entrega</dt><dd>${escape(formatDate(order.endDate))}</dd></div>
        <div><dt>Estado</dt><dd>${statusBadge}</dd></div>
        <div><dt>Condición de pago</dt><dd>${escape(order.paymentTerms || '')}</dd></div>
        <div><dt>Moneda</dt><dd>${escape(currencyCode)}</dd></div>
        <div><dt>Stock aplicado</dt><dd class="${stockApplied ? 'stock-applied' : ''}">${stockApplied ? 'Sí' : 'No'}</dd></div>
      </dl>`;
  }

  const linesContainer = qs('order-lines-table');
  if (linesContainer) {
    const editable = !['recibido', 'cancelado'].includes(order.status) && options.canEditLines !== false;
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
                    <td>${escape(currency(line.costo_unitario, currencyCode))}</td>
                    <td>${escape(currency(calculateLineSubtotal(line), currencyCode))}</td>
                    ${editable ? `<td class="table-actions"><button type="button" class="danger" data-action="delete-line" data-product-id="${escape(line.id_producto)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button></td>` : ''}
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
      <h2 class="totals-heading">Totales</h2>
      <div><span>Neto</span><strong>${escape(currency(totals.neto, currencyCode))}</strong></div>
      <div><span>IVA (${Math.round(taxRate * 100)} %)</span><strong>${escape(currency(totals.iva, currencyCode))}</strong></div>
      <div class="order-total"><span>Total</span><strong>${escape(currency(totals.total, currencyCode))}</strong></div>`;
  }

  const actionsContainer = qs('order-actions');
  if (actionsContainer) {
    actionsContainer.innerHTML = `
      ${actions
        .map(action => `<button type="button" class="${action.nextStatus === 'cancelado' ? 'danger' : 'primary'}" data-action="transition" data-next-status="${escape(action.nextStatus)}">${icon('check', { className: 'ui-icon' })}${escape(action.label || actionLabel(action.nextStatus))}</button>`)
        .join('')}
      ${options.canPrint === false ? '' : `<button type="button" class="secondary" data-action="print-order">${icon('print', { className: 'ui-icon' })}Imprimir orden</button>`}
      <button type="button" class="secondary" data-action="close-order-detail">${icon('back', { className: 'ui-icon' })}${escape(options.backLabel || 'Volver a la lista')}</button>
      <span class="feedback" aria-live="polite"></span>`;
  }

  const historyContainer = qs('order-history');
  if (historyContainer) {
    const history = detail.history || [];
    historyContainer.innerHTML = `
      <h2>Historial de cambios de estado</h2>
      ${history.length
        ? `<ol class="timeline">${history
            .map(record => `<li class="timeline-item timeline-${escape(record.to)}"><span class="timeline-dot" aria-hidden="true"></span><strong>${escape(record.from)} → ${escape(record.to)}</strong> <span class="timeline-label">${escape(PROGRESS_LABELS[record.to] || record.to)}</span> <time datetime="${escape(record.changedAt)}">${escape(formatHistoryDate(record.changedAt))}</time></li>`)
            .join('')}</ol>`
        : '<p class="empty-row">Sin cambios de estado registrados.</p>'}
      ${stockApplied ? '<p class="stock-applied">Recepción aplicada al stock de los productos.</p>' : ''}`;
  }

  return detail;
}

// 005 · US3: barra de progreso de estados (borrador → pendiente → aprobado → recibido).
const PROGRESS_STEPS = ['borrador', 'pendiente', 'aprobado', 'recibido'];
const PROGRESS_LABELS = {
  borrador: 'Borrador',
  pendiente: 'Pendiente de aprobación',
  aprobado: 'Aprobada',
  recibido: 'Recibida',
  cancelado: 'Cancelada'
};

export function renderStatusProgress(status, history = []) {
  const current = String(status || '').trim();
  const cancelled = current === 'cancelado';
  const reached = cancelled
    ? (history.filter(record => record.to === 'cancelado').map(record => record.from).pop() || 'borrador')
    : current;
  const reachedIndex = Math.max(0, PROGRESS_STEPS.indexOf(reached));
  const items = PROGRESS_STEPS.map((step, index) => {
    let state = 'todo';
    if (index < reachedIndex || (!cancelled && index === reachedIndex && step === 'recibido')) state = 'done';
    else if (index === reachedIndex) state = cancelled ? 'stopped' : 'current';
    const label = PROGRESS_LABELS[step];
    const sr = state === 'done' ? 'completado' : state === 'current' ? 'estado actual' : state === 'stopped' ? 'detenida aquí' : 'pendiente';
    return `<li class="progress-step progress-${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="progress-marker" aria-hidden="true">${index + 1}</span><span class="progress-label">${label}</span><span class="sr-only"> (${sr})</span></li>`;
  }).join('');
  const cancelNote = cancelled ? '<li class="progress-step progress-cancelled" aria-current="step"><span class="progress-marker" aria-hidden="true">×</span><span class="progress-label">Cancelada</span></li>' : '';
  return `<ol class="status-progress" aria-label="Progreso de estados">${items}${cancelNote}</ol>`;
}
