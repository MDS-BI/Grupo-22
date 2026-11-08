import { getPurchaseOrderDetail } from './purchasing-storage.js';
import { getConfig } from './module-config.js';
import { calculateLineSubtotal, calculateOrderTotals } from './domain/purchasing.js';
import { formatHistoryDate } from './purchase-order-detail.js';

function qs(id) {
  return document.getElementById(id);
}

function escapeValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatCurrency(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(number)
    : String(value ?? '');
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || '');
}

export function init() {}

export function renderPrintable(detailOrId, options = {}) {
  const detail = typeof detailOrId === 'string' ? getPurchaseOrderDetail(detailOrId) : detailOrId;
  if (!detail) return null;
  const escape = options.escapeHtml || escapeValue;
  const currency = options.formatCurrencyCLP || formatCurrency;
  const date = options.formatDate || formatDate;
  const order = detail.order || detail.document || detail;
  const lines = detail.lines || [];
  const totals = detail.totals || calculateOrderTotals(lines);
  const config = getConfig();
  const employeeName = detail.employee?.nombre || detail.employee?.name || detail.employeeName || 'Empleado desconocido';
  const supplier = detail.supplier || {};
  const supplierName = supplier.name || supplier.nombre || '';
  const supplierCode = supplier.code || supplier.rut || '';
  const stockApplied = Boolean(detail.stockApplied || detail.metadata?.stock_aplicado);
  const container = qs('print-order-view');
  if (!container) return detail;

  container.innerHTML = `
    <article class="print-document">
      <header>
        <p class="eyebrow">${escape(config.moduleName)}</p>
        <h1>${escape(config.labels.document)} · Folio ${escape(order.folio)}</h1>
      </header>
      <dl class="print-meta">
        <div><dt>Proveedor</dt><dd>${escape(supplierName)}</dd></div>
        <div><dt>RUT</dt><dd>${escape(supplierCode)}</dd></div>
        <div><dt>Empleado solicitante</dt><dd>${escape(employeeName)}</dd></div>
        <div><dt>Condición de pago</dt><dd>${escape(order.paymentTerms || '')}</dd></div>
        <div><dt>Fecha de emisión</dt><dd>${escape(date(order.startDate))}</dd></div>
        <div><dt>Fecha de entrega</dt><dd>${escape(date(order.endDate))}</dd></div>
        <div><dt>Estado</dt><dd>${escape(order.status || '')}</dd></div>
        <div><dt>Stock aplicado</dt><dd>${stockApplied ? 'Sí' : 'No'}</dd></div>
      </dl>
      <table>
        <thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${lines.length
            ? lines
                .map(line => {
                  const product = line.producto || line.product || {};
                  return `<tr>
                    <td>${escape(product.nombre || product.name || '')}</td>
                    <td>${escape(product.unidad_medida || product.unit || '')}</td>
                    <td>${escape(line.cantidad)}</td>
                    <td>${escape(currency(line.costo_unitario))}</td>
                    <td>${escape(currency(calculateLineSubtotal(line)))}</td>
                  </tr>`;
                })
                .join('')
            : '<tr><td colspan="5" class="empty-row">Sin líneas de detalle.</td></tr>'}
        </tbody>
      </table>
      <div class="print-totals">
        <div><span>Neto</span><strong>${escape(currency(totals.neto))}</strong></div>
        <div><span>IVA (19 %)</span><strong>${escape(currency(totals.iva))}</strong></div>
        <div><span>Total</span><strong>${escape(currency(totals.total))}</strong></div>
      </div>
      <section class="print-history">
        <h2>Historial de cambios de estado</h2>
        ${detail.history?.length
          ? `<ol>${detail.history
              .map(record => `<li>${escape(record.from)} → ${escape(record.to)} · ${escape(formatHistoryDate(record.changedAt))}</li>`)
              .join('')}</ol>`
          : '<p>Sin cambios de estado registrados.</p>'}
        ${stockApplied ? '<p>Recepción aplicada al stock de los productos.</p>' : ''}
      </section>
    </article>`;
  return detail;
}
