import { getPurchaseOrderDetail } from './purchasing-storage.js';
import { documentLabel } from './access-policy.js';
import { getConfig } from './module-config.js';
import { calculateLineSubtotal, calculateOrderTotals, formatPurchaseOrderFolio, formatRequestNumber, statusFilterLabel } from './domain/purchasing.js';
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

function formatCurrency(value, code = 'CLP') {
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

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || '');
}

export function init() {}

export function renderPrintable(detailOrId, options = {}) {
  const detail = typeof detailOrId === 'string' ? getPurchaseOrderDetail(detailOrId) : detailOrId;
  if (!detail) return null;
  const escape = options.escapeHtml || escapeValue;
  const currency = options.formatCurrency || options.formatCurrencyCLP || formatCurrency;
  const date = options.formatDate || formatDate;
  const order = detail.order || detail.document || detail;
  const lines = detail.lines || [];
  const taxRate = Number.isFinite(Number(detail.taxRate)) ? Number(detail.taxRate) : 0.19;
  const currencyCode = detail.currency || order.currency || 'CLP';
  const totals = detail.totals || calculateOrderTotals(lines, { taxRate, currency: currencyCode });
  const emissionDate = order.startDate ? date(order.startDate) : 'Sin emitir';
  const config = getConfig();
  const employeeName = detail.employee?.nombre || detail.employee?.name || detail.employeeName || 'Empleado desconocido';
  const supplier = detail.supplier || {};
  const supplierName = supplier.name || supplier.nombre || '';
  const supplierCode = supplier.code || supplier.rut || '';
  const stockApplied = Boolean(detail.stockApplied || detail.metadata?.stock_aplicado);
  const typeLabel = documentLabel(order.status);
  const container = qs('print-order-view');
  if (!container) return detail;

  container.innerHTML = `
    <article class="print-document">
      <header class="print-header">
        <div class="print-brand">
          <svg class="print-logo" viewBox="0 0 36 36" width="44" height="44" aria-hidden="true"><rect width="36" height="36" rx="8" fill="#0F2A3D"></rect><path d="M8 24l6-10 5 6 4-4 5 8" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          <div><p class="eyebrow">${escape(config.moduleName)}</p><p class="print-module-sub">Módulo de Adquisiciones y Compras</p></div>
        </div>
        <div class="print-folio">
          <span>${escape(typeLabel)}</span>
          <strong>${escape(formatPurchaseOrderFolio(order.ocFolio) || formatRequestNumber(order.folio) || order.folio)}</strong>
        </div>
        <h1>${escape(typeLabel)} · Folio ${escape(order.folio)}</h1>
      </header>
      <dl class="print-meta">
        <div><dt>Proveedor</dt><dd>${escape(supplierName)}</dd></div>
        <div><dt>${supplier.origin === 'Extranjero' ? 'Identificación tributaria extranjera' : 'RUT'}</dt><dd>${escape(supplier.origin === 'Extranjero' ? (supplier.foreignTaxId || supplierCode) : supplierCode)}</dd></div>
        <div><dt>N° de solicitud</dt><dd>${escape(formatRequestNumber(order.folio) || order.folio)}</dd></div>
        <div><dt>Folio OC</dt><dd>${escape(formatPurchaseOrderFolio(order.ocFolio) || 'Sin emitir')}</dd></div>
        <div><dt>Empleado solicitante</dt><dd>${escape(employeeName)}</dd></div>
        <div><dt>Condición de pago</dt><dd>${escape(order.paymentTerms || '')}</dd></div>
        <div><dt>Fecha de emisión</dt><dd>${escape(emissionDate)}</dd></div>
        <div><dt>Fecha de entrega</dt><dd>${escape(date(order.endDate))}</dd></div>
        <div><dt>Estado</dt><dd>${escape(statusFilterLabel(order.status) || order.status || '')}</dd></div>
        <div><dt>Moneda</dt><dd>${escape(currencyCode)}</dd></div>
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
                    <td>${escape(currency(line.costo_unitario, currencyCode))}</td>
                    <td>${escape(currency(calculateLineSubtotal(line), currencyCode))}</td>
                  </tr>`;
                })
                .join('')
            : '<tr><td colspan="5" class="empty-row">Sin líneas de detalle.</td></tr>'}
        </tbody>
      </table>
      <div class="print-totals">
        <div><span>Neto</span><strong>${escape(currency(totals.neto, currencyCode))}</strong></div>
        <div><span>IVA (${Math.round(taxRate * 100)} %)</span><strong>${escape(currency(totals.iva, currencyCode))}</strong></div>
        <div><span>Total</span><strong>${escape(currency(totals.total, currencyCode))}</strong></div>
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
      <section class="print-signatures">
        <div><span class="signature-line"></span><p>Solicitante: ${escape(employeeName)}</p></div>
        <div><span class="signature-line"></span><p>${order.ocFolio || ['aprobado', 'recibido'].includes(order.status) ? 'Firma del aprobador' : 'Aprobador: pendiente de aprobación'}</p><p class="print-note">El sistema no registra el nombre del aprobador.</p></div>
      </section>
      <footer class="print-footer">Sistema de Orden de Compra</footer>
    </article>`;
  return detail;
}
