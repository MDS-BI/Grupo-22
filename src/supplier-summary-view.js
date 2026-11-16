import { documentLabel } from './access-policy.js';
import { formatPurchaseOrderFolio, formatRequestNumber } from './domain/purchasing.js';

function fallbackEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

/**
 * 006: identificación tributaria visible del proveedor. Nacional → RUT; Extranjero → identificación
 * tributaria extranjera. Nunca devuelve separadores vacíos.
 */
export function supplierTaxIdentity(supplier = {}) {
  const origin = String(supplier.origin ?? '').trim();
  const code = String(supplier.code ?? '').trim();
  const foreign = String(supplier.foreignTaxId ?? '').trim();
  if (origin === 'Extranjero') return foreign ? `ID tributario ext. ${foreign}` : code;
  return code || (foreign ? `ID tributario ext. ${foreign}` : '');
}

function definition(label, value, escape) {
  const text = String(value ?? '').trim();
  return text ? `<div><dt>${escape(label)}</dt><dd>${escape(text)}</dd></div>` : '';
}

/** HTML de la ficha del proveedor: datos, monto total comprado, lista de precios e historial de OC. */
export function renderSupplierSummary(summary, options = {}) {
  const escape = options.escapeHtml || fallbackEscape;
  const money = options.formatMoney || ((value, currency) => `${currency} ${value}`);
  const date = options.formatDate || (value => value || '');
  const termLabel = options.paymentTermLabel || (value => value);
  const badge = options.statusBadge || (status => escape(status));
  const productName = options.productName || (() => '');
  const { supplier, orders, totalsByCurrency, emittedCount, priceList = [] } = summary;
  const isForeign = String(supplier.origin ?? '').trim() === 'Extranjero';

  const totals = Object.entries(totalsByCurrency);
  const totalsHtml = totals.length
    ? totals.map(([currency, amount]) => `<strong class="supplier-total" data-currency="${escape(currency)}">${escape(money(amount, currency))}</strong>`).join(' ')
    : `<strong class="supplier-total">${escape(money(0, isForeign ? 'USD' : 'CLP'))}</strong>`;

  const priceRows = priceList.length
    ? priceList.map(entry => `<tr><td>${escape(productName(entry.id_producto))}</td><td>${escape(money(entry.precio, entry.moneda))}</td></tr>`).join('')
    : '<tr><td colspan="2" class="empty-row">Sin lista de precios.</td></tr>';

  const orderRows = orders.length
    ? orders.map(order => {
        const request = formatRequestNumber(order.folio) || String(order.folio ?? '');
        const oc = formatPurchaseOrderFolio(order.ocFolio);
        return `<tr data-order-id="${escape(order.id)}">
          <td>${escape(request)}${oc ? ` · ${escape(oc)}` : ''}</td>
          <td>${escape(documentLabel(order.status))}</td>
          <td>${badge(order.status)}</td>
          <td>${escape(date(order.startDate))}</td>
          <td>${escape(money(order.totals?.total ?? order.totalAmount ?? 0, order.currency || 'CLP'))}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="empty-row">Este proveedor no tiene órdenes registradas.</td></tr>';

  return `
    <div class="supplier-summary-heading">
      <h2 tabindex="-1">Ficha del proveedor · ${escape(supplier.name)}</h2>
      <button type="button" class="secondary" data-action="close-supplier-summary">Cerrar ficha</button>
    </div>
    <dl class="detail-header">
      ${definition('Origen', supplier.origin || 'Nacional', escape)}
      ${isForeign ? definition('Identificación tributaria extranjera', supplier.foreignTaxId, escape) : definition('RUT', supplier.code, escape)}
      ${definition('Rubros', options.rubroNames, escape)}
      ${definition('Correo', supplier.email, escape)}
      ${definition('Teléfono', supplier.phone, escape)}
      ${definition('Dirección', supplier.address, escape)}
      ${definition('Condición de pago', termLabel(supplier.paymentTerms), escape)}
      ${options.canViewCreditLimit ? definition('Límite de crédito', supplier.creditLimit, escape) : ''}
    </dl>
    <p class="supplier-total-row">Monto total comprado (${escape(emittedCount)} OC emitidas): ${totalsHtml}</p>
    <h3>Lista de precios</h3>
    <div class="table-wrapper">
      <table class="data-table" id="supplier-summary-prices">
        <thead><tr><th>Producto</th><th>Precio acordado</th></tr></thead>
        <tbody>${priceRows}</tbody>
      </table>
    </div>
    <h3>Historial de órdenes</h3>
    <div class="table-wrapper">
      <table class="data-table" id="supplier-summary-orders">
        <thead><tr><th>N° / Folio</th><th>Documento</th><th>Estado</th><th>Emisión</th><th>Total</th></tr></thead>
        <tbody>${orderRows}</tbody>
      </table>
    </div>`;
}
