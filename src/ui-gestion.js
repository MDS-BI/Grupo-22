// 007 · Capa de interfaz de gestión: Reportes (US3/US1/US4), campana de notificaciones (US5)
// y tarjeta de reposición del Panel (US2). La lógica vive en purchasing-management.js y domain/.
import {
  getSpendReport,
  getAllSupplierEvaluations,
  getNotifications,
  loadNotificationReads,
  markNotificationsRead,
  listBelowMinimum,
  createSuggestedRequests,
  loadAreas,
  loadBudgets,
  saveArea,
  setAreaActive,
  setBudget,
  budgetFor,
  orderReference,
  loadEmployees
} from './purchasing-management.js';
import { GROUP_BY, toCsv, csvNumber } from './domain/reports.js';
import { unreadCount } from './domain/notifications.js';
import { monthKey, areaSpend } from './domain/budget.js';
import { parseDateInput, formatDateMask } from './domain/purchasing.js';
import { loadDocuments, loadEntities } from './storage.js';
import { getLinesForOrder, loadOrderMetadata, loadStatusHistory } from './purchasing-storage.js';
import { stockEvolution } from './ui-dashboard.js';
import { stockEvolutionLineChartSvg } from './ui-charts.js';
import { PERMISSIONS } from './auth.js';

let ctx = null;
const reportState = { tab: 'spend', groupBy: 'proveedor', from: '', to: '', month: monthKey() };
let notificationsOpen = false;

const fallbackEscape = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function esc(value) {
  return (ctx?.escapeHtml || fallbackEscape)(value);
}

function money(value, currency = 'CLP') {
  return ctx?.formatMoney ? ctx.formatMoney(value, currency) : `${currency} ${value}`;
}

function el(id) {
  return document.getElementById(id);
}

function can(permission) {
  return ctx?.canUse ? ctx.canUse(permission) : false;
}

/** Contexto que entrega app.js (helpers de formato, permisos y navegación). */
export function configureGestion(context) {
  ctx = context;
}

// --- Exportación CSV ---------------------------------------------------------------------------

export let lastCsvExport = null;

export function downloadCsv(filename, text) {
  lastCsvExport = { filename, text };
  try {
    if (typeof URL?.createObjectURL !== 'function') return;
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    // jsdom o navegadores sin Blob: el contenido queda en lastCsvExport.
  }
}

function stamp(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

export function csvFilename(base) {
  return `${base}-${stamp()}.csv`;
}

// --- US1: calificación -------------------------------------------------------------------------

export function gradeTag(evaluation) {
  if (!evaluation) return '';
  if (typeof evaluation === 'string') {
    const cls = evaluation === 'Sin datos' ? 'none' : evaluation.toLowerCase();
    return `<span class="grade-tag grade-${esc(cls)}">${evaluation === 'Sin datos' ? 'Sin datos' : `Calificación ${esc(evaluation)}`}</span>`;
  }
  const grade = evaluation.calificacion || 'Sin datos';
  const cls = grade === 'Sin datos' ? 'none' : grade.toLowerCase();
  const title = grade === 'Sin datos'
    ? 'Sin órdenes recibidas para evaluar'
    : `${num(evaluation.porcentajeATiempo)} % a tiempo (${evaluation.aTiempo} de ${evaluation.evaluables})`;
  return `<span class="grade-tag grade-${esc(cls)}" title="${esc(title)}">${grade === 'Sin datos' ? 'Sin datos' : `Calificación ${esc(grade)}`}</span>`;
}

function evaluationRows() {
  const evaluations = getAllSupplierEvaluations();
  return loadEntities().map(entity => ({ entity, evaluation: evaluations[entity.entity_id] }));
}

function num(value) {
  return String(value ?? '').replace('.', ',');
}

function amountsText(amounts = {}) {
  const entries = Object.entries(amounts);
  return entries.length ? entries.map(([currency, amount]) => money(amount, currency)).join(' · ') : '—';
}

// --- US3: reportes -----------------------------------------------------------------------------

function reportsMarkup() {
  return `
    <div class="page-heading"><div><span class="eyebrow">Análisis</span><h1 id="reports-heading">Reportes</h1></div></div>
    <div class="tabs report-tabs" role="tablist" aria-label="Secciones de reportes">
      <button type="button" class="tab-button" role="tab" id="reports-tab-spend" data-tab="spend" aria-controls="reports-panel-spend">Gasto</button>
      <button type="button" class="tab-button" role="tab" id="reports-tab-suppliers" data-tab="suppliers" aria-controls="reports-panel-suppliers">Evaluación de proveedores</button>
      <button type="button" class="tab-button" role="tab" id="reports-tab-budgets" data-tab="budgets" aria-controls="reports-panel-budgets">Áreas y presupuestos</button>
    </div>
    <div id="reports-panel-spend" role="tabpanel" aria-labelledby="reports-tab-spend">
      <div class="list-filters report-filters">
        <div class="field"><label for="reports-group-by">Agrupar por</label><select id="reports-group-by">
          ${Object.entries(GROUP_BY).map(([value, label]) => `<option value="${value}">${esc(label)}</option>`).join('')}
        </select></div>
        <div class="field"><label for="reports-from">Fecha desde</label><input id="reports-from" type="text" placeholder="dd-mm-aaaa" inputmode="numeric" autocomplete="off"></div>
        <div class="field"><label for="reports-to">Fecha hasta</label><input id="reports-to" type="text" placeholder="dd-mm-aaaa" inputmode="numeric" autocomplete="off"></div>
        <div class="field report-export"><button type="button" class="secondary" id="reports-export">Exportar CSV</button></div>
      </div>
      <p class="field-error" id="reports-error" aria-live="polite"></p>
      <p class="insight-subtitle" id="reports-summary"></p>
      <div class="chart-host report-chart" id="reports-chart"></div>
      <div class="table-wrap"><table class="data-table" id="reports-table"><thead></thead><tbody></tbody></table></div>
      <p class="insight-note" id="reports-note"></p>
    </div>
    <div id="reports-panel-suppliers" role="tabpanel" aria-labelledby="reports-tab-suppliers" hidden>
      <p class="insight-subtitle">A: ≥ 90 % de entregas a tiempo · B: ≥ 70 % · C: menos de 70 % · Sin datos: aún no recibe órdenes.</p>
      <div class="report-export-row"><button type="button" class="secondary" id="reports-suppliers-export">Exportar CSV</button></div>
      <div class="table-wrap"><table class="data-table" id="reports-suppliers-table">
        <thead><tr><th scope="col">Proveedor</th><th scope="col">Calificación</th><th scope="col">OC emitidas</th><th scope="col">Recibidas</th><th scope="col">% a tiempo</th><th scope="col">Atraso promedio</th><th scope="col">Monto emitido</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div id="reports-panel-budgets" role="tabpanel" aria-labelledby="reports-tab-budgets" hidden>
      <div class="list-filters">
        <div class="field"><label for="budget-month">Mes</label><input id="budget-month" type="month"></div>
        <form id="area-form" class="inline-form" novalidate>
          <div class="field"><label for="area-name">Nueva área</label><input id="area-name" type="text" maxlength="60" placeholder="Ej.: Operaciones"></div>
          <button type="submit" class="primary" id="area-add">Agregar área</button>
        </form>
      </div>
      <p class="feedback" id="budget-feedback" role="status" aria-live="polite"></p>
      <div class="table-wrap"><table class="data-table" id="budget-table">
        <thead><tr><th scope="col">Área</th><th scope="col">Estado</th><th scope="col">Presupuesto (CLP)</th><th scope="col">Gastado</th><th scope="col">Disponible</th><th scope="col">Uso</th><th scope="col">Acciones</th></tr></thead>
        <tbody></tbody>
      </table></div>
      <p class="insight-note">El gasto considera las OC emitidas (aprobadas y recibidas) en CLP del mes. Exceder el presupuesto avisa al aprobar, pero no bloquea.</p>
    </div>`;
}

function ensureReportsMarkup() {
  const view = el('view-reports');
  if (!view || view.dataset.ready) return view;
  view.innerHTML = reportsMarkup();
  view.dataset.ready = 'true';
  bindReports(view);
  return view;
}

function reportBarsSvg(rows, currency) {
  const data = rows.filter(row => row.amounts[currency]).slice(0, 8);
  if (!data.length) return '';
  const width = 640;
  const rowHeight = 34;
  const height = data.length * rowHeight + 8;
  const max = Math.max(1, ...data.map(row => row.amounts[currency]));
  const summary = data.map(row => `${row.label}: ${money(row.amounts[currency], currency)}`).join(', ');
  const bars = data.map((row, index) => {
    const y = index * rowHeight + 4;
    const barWidth = Math.max(4, Math.round((row.amounts[currency] / max) * 360));
    return `<g>
      <text x="0" y="${y + 20}" class="chart-label report-label">${esc(row.label.length > 26 ? `${row.label.slice(0, 25)}…` : row.label)}</text>
      <rect x="190" y="${y + 6}" width="${barWidth}" height="20" rx="5" class="chart-bar"></rect>
      <text x="${196 + barWidth}" y="${y + 21}" class="chart-value report-value">${esc(money(row.amounts[currency], currency))}</text>
    </g>`;
  }).join('');
  return `<svg class="chart chart-report" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gasto por ${esc(GROUP_BY[reportState.groupBy])} en ${esc(currency)}: ${esc(summary)}">${bars}</svg>`;
}

function currentReport() {
  return getSpendReport({ groupBy: reportState.groupBy, from: reportState.from, to: reportState.to });
}

function renderSpendPanel() {
  const report = currentReport();
  const errorEl = el('reports-error');
  if (errorEl) errorEl.textContent = report.error || '';
  const table = el('reports-table');
  const currencies = report.currencies;
  const label = GROUP_BY[reportState.groupBy];
  const showPct = reportState.groupBy !== 'rubro';
  table.querySelector('thead').innerHTML = `<tr><th scope="col">${esc(label)}</th><th scope="col">OC</th>${currencies.map(currency => `<th scope="col">Monto ${esc(currency)}</th>${showPct ? `<th scope="col">% ${esc(currency)}</th>` : ''}`).join('')}</tr>`;
  table.querySelector('tbody').innerHTML = report.rows.length
    ? report.rows.map(row => `<tr><td>${esc(row.label)}</td><td>${row.count}</td>${currencies.map(currency => `<td>${row.amounts[currency] ? esc(money(row.amounts[currency], currency)) : '—'}</td>${showPct ? `<td>${row.percentages[currency] ? `${num(row.percentages[currency])} %` : '—'}</td>` : ''}`).join('')}</tr>`).join('')
    : `<tr><td colspan="${2 + currencies.length * (showPct ? 2 : 1)}" class="empty-row">${report.error ? 'Corrige el rango de fechas.' : 'Sin OC emitidas en el período.'}</td></tr>`;
  const main = currencies[0] || 'CLP';
  el('reports-chart').innerHTML = report.rows.length ? reportBarsSvg(report.rows, main) : '';
  const totals = currencies.map(currency => money(report.totals[currency], currency)).join(' · ');
  el('reports-summary').textContent = report.rows.length
    ? `Total emitido: ${totals}${currencies.length > 1 ? ' (monedas sin convertir)' : ''}.`
    : '';
  el('reports-note').textContent = report.note || '';
  el('reports-export').disabled = !report.rows.length;
}

export function spendReportCsv() {
  const report = currentReport();
  const showPct = reportState.groupBy !== 'rubro';
  const columns = [
    { key: 'label', label: GROUP_BY[reportState.groupBy] },
    { key: 'count', label: 'Cantidad de OC' },
    ...report.currencies.flatMap(currency => [
      { key: `m_${currency}`, label: `Monto ${currency}`, value: row => csvNumber(row.amounts[currency] || 0) },
      ...(showPct ? [{ key: `p_${currency}`, label: `% ${currency}`, value: row => csvNumber(row.percentages[currency] || 0) }] : [])
    ])
  ];
  return toCsv(columns, report.rows);
}

export function supplierEvaluationCsv() {
  const columns = [
    { key: 'name', label: 'Proveedor', value: row => row.entity.name },
    { key: 'code', label: 'RUT / ID', value: row => row.entity.code || row.entity.foreignTaxId || '' },
    { key: 'grade', label: 'Calificación', value: row => row.evaluation?.calificacion || 'Sin datos' },
    { key: 'emitidas', label: 'OC emitidas', value: row => row.evaluation?.emitidas ?? 0 },
    { key: 'recibidas', label: 'Recibidas', value: row => row.evaluation?.recibidas ?? 0 },
    { key: 'pct', label: '% a tiempo', value: row => (row.evaluation?.evaluables ? csvNumber(row.evaluation.porcentajeATiempo) : '') },
    { key: 'delay', label: 'Atraso promedio (días)', value: row => (row.evaluation?.evaluables ? csvNumber(row.evaluation.atrasoPromedio) : '') }
  ];
  return toCsv(columns, evaluationRows());
}

function renderSuppliersPanel() {
  const rows = evaluationRows();
  const order = { A: 0, B: 1, C: 2, 'Sin datos': 3 };
  rows.sort((a, b) => (order[a.evaluation?.calificacion] ?? 3) - (order[b.evaluation?.calificacion] ?? 3) || a.entity.name.localeCompare(b.entity.name));
  el('reports-suppliers-table').querySelector('tbody').innerHTML = rows.length
    ? rows.map(({ entity, evaluation }) => `<tr>
        <td>${esc(entity.name)}${entity.estado === 'inactivo' ? ' <span class="inactive-tag">Inactivo</span>' : ''}</td>
        <td>${gradeTag(evaluation)}${evaluation?.aproximada ? ' <small class="muted" title="Algunas fechas de recepción son aproximadas">≈</small>' : ''}</td>
        <td>${evaluation?.emitidas ?? 0}</td>
        <td>${evaluation?.recibidas ?? 0}</td>
        <td>${evaluation?.evaluables ? `${num(evaluation.porcentajeATiempo)} %` : '—'}</td>
        <td>${evaluation?.evaluables ? `${num(evaluation.atrasoPromedio)} días` : '—'}</td>
        <td>${esc(amountsText(evaluation?.montoPorMoneda))}</td>
      </tr>`).join('')
    : '<tr><td colspan="7" class="empty-row">Sin proveedores registrados.</td></tr>';
}

function renderBudgetsPanel() {
  const monthInput = el('budget-month');
  if (monthInput && monthInput.value !== reportState.month) monthInput.value = reportState.month;
  const metadata = new Map(loadOrderMetadata().map(item => [item.id_orden_compra, item]));
  const orders = loadDocuments();
  const areas = loadAreas();
  el('budget-table').querySelector('tbody').innerHTML = areas.length
    ? areas.map(area => {
        const budget = budgetFor(area.id_area, reportState.month);
        const spend = areaSpend(orders, metadata, area.id_area, reportState.month);
        const amount = budget ? Number(budget.monto) : null;
        const available = amount === null ? null : amount - spend.clp;
        const pct = amount ? Math.min(100, Math.round((spend.clp / amount) * 100)) : 0;
        const over = amount !== null && spend.clp > amount;
        return `<tr data-area-id="${esc(area.id_area)}">
          <td>${esc(area.nombre)}</td>
          <td>${area.activa === false ? '<span class="inactive-tag">Inactiva</span>' : 'Activa'}</td>
          <td><label class="sr-only" for="budget-${esc(area.id_area)}">Presupuesto de ${esc(area.nombre)}</label><input id="budget-${esc(area.id_area)}" class="budget-input" type="number" min="0" step="1000" value="${amount ?? ''}" placeholder="Sin definir"></td>
          <td>${esc(money(spend.clp, 'CLP'))}${Object.keys(spend.otherCurrencies || {}).length ? ` <small class="muted">+ ${esc(amountsText(spend.otherCurrencies))}</small>` : ''}</td>
          <td class="${over ? 'budget-over' : ''}">${available === null ? 'Sin presupuesto' : esc(money(available, 'CLP'))}</td>
          <td>${amount ? `<span class="budget-meter${over ? ' is-over' : pct >= 80 ? ' is-warn' : ''}" title="${pct} %"><span style="width:${Math.max(3, pct)}%"></span></span>` : '—'}</td>
          <td class="table-actions">
            <button type="button" class="secondary" data-action="save-budget">Guardar</button>
            <button type="button" class="secondary" data-action="toggle-area">${area.activa === false ? 'Activar' : 'Inactivar'}</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="7" class="empty-row">Aún no hay áreas. Agrega la primera arriba.</td></tr>';
}

function setReportTab(tab) {
  const allowed = tab === 'budgets' && !can(PERMISSIONS.BUDGETS_MANAGE) ? 'spend' : tab;
  reportState.tab = allowed;
  for (const name of ['spend', 'suppliers', 'budgets']) {
    const button = el(`reports-tab-${name}`);
    const panel = el(`reports-panel-${name}`);
    if (button) button.setAttribute('aria-selected', String(name === allowed));
    if (panel) panel.hidden = name !== allowed;
  }
}

export function renderReports() {
  const view = ensureReportsMarkup();
  if (!view) return;
  const budgetsTab = el('reports-tab-budgets');
  if (budgetsTab) budgetsTab.hidden = !can(PERMISSIONS.BUDGETS_MANAGE);
  const suppliersTab = el('reports-tab-suppliers');
  if (suppliersTab) suppliersTab.hidden = !can(PERMISSIONS.ENTITIES_VIEW);
  if (reportState.tab === 'suppliers' && suppliersTab?.hidden) reportState.tab = 'spend';
  setReportTab(reportState.tab);
  el('reports-group-by').value = reportState.groupBy;
  renderSpendPanel();
  if (!suppliersTab?.hidden) renderSuppliersPanel();
  if (can(PERMISSIONS.BUDGETS_MANAGE)) renderBudgetsPanel();
}

function maskDate(value) {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function bindReports(view) {
  view.addEventListener('click', event => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      setReportTab(tab.dataset.tab);
      renderReports();
      return;
    }
    if (event.target.closest('#reports-export')) {
      downloadCsv(csvFilename(`gasto-por-${reportState.groupBy}`), spendReportCsv());
      return;
    }
    if (event.target.closest('#reports-suppliers-export')) {
      downloadCsv(csvFilename('evaluacion-proveedores'), supplierEvaluationCsv());
      return;
    }
    const action = event.target.closest('#budget-table [data-action]');
    if (!action) return;
    const row = action.closest('tr[data-area-id]');
    const feedback = el('budget-feedback');
    try {
      if (action.dataset.action === 'save-budget') {
        const input = row.querySelector('.budget-input');
        setBudget(row.dataset.areaId, reportState.month, input.value);
        feedback.textContent = 'Presupuesto guardado.';
      } else {
        const area = loadAreas().find(item => item.id_area === row.dataset.areaId);
        setAreaActive(row.dataset.areaId, area?.activa === false);
        feedback.textContent = area?.activa === false ? 'Área activada.' : 'Área inactivada: ya no se ofrece en nuevas solicitudes.';
      }
      renderBudgetsPanel();
      ctx?.onDataChanged?.();
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
  el('reports-group-by').addEventListener('change', event => {
    reportState.groupBy = event.target.value;
    renderSpendPanel();
  });
  for (const [id, key] of [['reports-from', 'from'], ['reports-to', 'to']]) {
    el(id).addEventListener('input', event => {
      const masked = maskDate(event.target.value);
      if (event.target.value !== masked) event.target.value = masked;
      const parsed = parseDateInput(masked);
      if (masked && !parsed.valid) return;
      reportState[key] = parsed.valid ? parsed.iso : '';
      renderSpendPanel();
    });
  }
  el('budget-month').addEventListener('change', event => {
    if (/^\d{4}-\d{2}$/.test(event.target.value)) {
      reportState.month = event.target.value;
      renderBudgetsPanel();
    }
  });
  el('area-form').addEventListener('submit', event => {
    event.preventDefault();
    const feedback = el('budget-feedback');
    try {
      saveArea({ nombre: el('area-name').value });
      el('area-name').value = '';
      feedback.textContent = 'Área agregada.';
      renderBudgetsPanel();
      ctx?.onDataChanged?.();
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
}

export function reportsFiltersLabel() {
  return [reportState.from && `desde ${formatDateMask(reportState.from)}`, reportState.to && `hasta ${formatDateMask(reportState.to)}`].filter(Boolean).join(' ');
}

// --- US5: notificaciones -----------------------------------------------------------------------

const NOTIFICATION_ICONS = {
  aprobada: '✓',
  rechazada: '✕',
  'pendiente-aprobacion': '⏳',
  'por-recibir': '📦',
  atrasada: '⚠',
  'presupuesto-excedido': '$'
};

function currentNotifications() {
  const session = ctx?.getSession?.();
  if (!session) return { items: [], reads: [] };
  const items = getNotifications({ role: session.role, ownEmployeeId: ctx.ownEmployeeId?.() || '', today: new Date() });
  return { items, reads: loadNotificationReads(session.userId || session.id || session.username) };
}

function sessionUserId() {
  const session = ctx?.getSession?.();
  return session ? (session.userId || session.id || session.username) : '';
}

function ensureNotificationPanel(bell) {
  let panel = el('notifications-panel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'notifications-panel';
  panel.className = 'notifications-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notificaciones');
  panel.hidden = true;
  bell.parentElement.style.position = 'relative';
  bell.insertAdjacentElement('afterend', panel);
  panel.addEventListener('click', event => {
    const markAll = event.target.closest('[data-action="mark-all-read"]');
    if (markAll) {
      const { items } = currentNotifications();
      markNotificationsRead(sessionUserId(), items.map(item => item.id));
      renderNotifications();
      return;
    }
    const item = event.target.closest('[data-notification-id]');
    if (!item) return;
    markNotificationsRead(sessionUserId(), [item.dataset.notificationId]);
    setNotificationsOpen(false);
    renderNotifications();
    if (item.dataset.orderId) ctx?.openOrderDetail?.(item.dataset.orderId);
  });
  return panel;
}

function setNotificationsOpen(open) {
  notificationsOpen = open;
  const bell = el('notifications-placeholder');
  const panel = el('notifications-panel');
  if (bell) bell.setAttribute('aria-expanded', String(open));
  if (panel) panel.hidden = !open;
}

function relativeDay(value) {
  if (!value) return '';
  const day = String(value).slice(0, 10);
  return formatDateMask(day);
}

export function renderNotifications() {
  const bell = el('notifications-placeholder');
  if (!bell) return;
  const session = ctx?.getSession?.();
  bell.hidden = !session;
  bell.disabled = !session;
  bell.removeAttribute('aria-disabled');
  bell.classList.add('notification-bell');
  if (!session) return;
  const { items, reads } = currentNotifications();
  const unread = unreadCount(items, reads);
  let badge = bell.querySelector('.notification-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notification-badge';
    bell.appendChild(badge);
  }
  badge.textContent = unread === 0 ? '' : unread > 99 ? '99+' : String(unread);
  badge.hidden = unread === 0;
  bell.setAttribute('aria-label', unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones');
  bell.setAttribute('aria-haspopup', 'dialog');
  const panel = ensureNotificationPanel(bell);
  const readSet = new Set(reads);
  panel.innerHTML = `
    <div class="notifications-head"><strong>Notificaciones</strong>${unread ? '<button type="button" class="link-button" data-action="mark-all-read">Marcar todas como leídas</button>' : ''}</div>
    ${items.length
      ? `<ul class="notifications-list">${items.slice(0, 30).map(item => `<li><button type="button" class="notification-item${readSet.has(item.id) ? '' : ' is-unread'}" data-notification-id="${esc(item.id)}" data-order-id="${esc(item.orderId || '')}">
          <span class="notification-icon notification-${esc(item.tipo)}" aria-hidden="true">${NOTIFICATION_ICONS[item.tipo] || '•'}</span>
          <span class="notification-text"><strong>${esc(item.referencia)}</strong> ${esc(item.texto)}${item.fecha ? `<small>${esc(relativeDay(item.fecha))}</small>` : ''}</span>
        </button></li>`).join('')}</ul>`
      : '<p class="insight-empty">No tienes notificaciones.</p>'}`;
  panel.hidden = !notificationsOpen;
  if (!bell.dataset.notificationsBound) {
    bell.dataset.notificationsBound = 'true';
    bell.addEventListener('click', event => {
      event.stopPropagation();
      setNotificationsOpen(!notificationsOpen);
      if (notificationsOpen) panel.querySelector('button')?.focus();
    });
    document.addEventListener('click', event => {
      if (notificationsOpen && !event.target.closest('#notifications-panel, #notifications-placeholder')) setNotificationsOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && notificationsOpen) {
        setNotificationsOpen(false);
        bell.focus();
      }
    });
  }
}

// --- US2: reposición en el Panel ---------------------------------------------------------------

function requesterId() {
  return ctx?.ownEmployeeId?.() || loadEmployees()[0]?.id_empleado || loadEmployees()[0]?.id || '';
}

export function renderReorderCard() {
  const card = el('insight-reorder');
  if (!card) return;
  card.hidden = !can(PERMISSIONS.PRODUCTS_VIEW);
  if (card.hidden) return;
  const items = listBelowMinimum();
  const pending = items.filter(item => !item.inRequest);
  const activeAreas = loadAreas().filter(area => area.activa !== false);
  const canCreate = can(PERMISSIONS.DOCUMENTS_CREATE);
  el('reorder-subtitle').textContent = items.length
    ? `${items.length} producto${items.length === 1 ? '' : 's'} en o bajo su stock mínimo`
    : 'Todos los productos están sobre su mínimo';
  el('reorder-list').innerHTML = items.length
    ? items.map(({ product, quantity, inRequest }) => `<li class="reorder-item">
        <span class="reorder-name"><strong>${esc(product.nombre)}</strong><small>Stock ${esc(product.stock ?? 0)} · mínimo ${esc(product.stock_minimo)}</small></span>
        <span class="reorder-meta">${inRequest ? `<span class="reorder-open">En ${esc(inRequest.folio)}</span>` : `Sugerido: <strong>${quantity}</strong>`}</span>
      </li>`).join('')
    : '<li class="insight-empty">Nada que reponer por ahora.</li>';
  const documents = loadDocuments();
  const linesByOrder = new Map(documents
    .filter(order => order.status === 'recibido')
    .map(order => [order.id, getLinesForOrder(order.id)]));
  const historyByOrder = new Map();
  for (const change of loadStatusHistory()) {
    if (!historyByOrder.has(change.id_orden_compra)) historyByOrder.set(change.id_orden_compra, []);
    historyByOrder.get(change.id_orden_compra).push(change);
  }
  const evolution = stockEvolution(items, documents, { linesByOrder, historyByOrder });
  const chart = el('chart-stock');
  if (chart) {
    chart.innerHTML = stockEvolutionLineChartSvg(evolution.points, evolution.minimum, { title: 'Evolución del stock' });
  }
  const chartBody = el('chart-stock-table')?.querySelector('tbody');
  if (chartBody) {
    chartBody.innerHTML = evolution.points.map(point => `<tr><td>${esc(point.label)}</td><td>${esc(point.reference)}</td><td>${esc(point.value)}</td></tr>`).join('');
  }
  const chartNote = el('chart-stock-note');
  if (chartNote) {
    chartNote.textContent = !items.length
      ? 'Sin productos bajo el mínimo.'
      : evolution.withoutHistory
        ? 'Sin historial de recepciones: se muestra solo el stock actual frente al mínimo.'
        : `Stock total de los primeros ${Math.min(items.length, 5)} productos. Línea de mínimo: ${evolution.minimum}.`;
  }
  const areaField = el('reorder-area-field');
  if (areaField) {
    areaField.hidden = !canCreate || !pending.length || !activeAreas.length;
    const select = el('reorder-area');
    const previous = select.value;
    select.innerHTML = activeAreas.map(area => `<option value="${esc(area.id_area)}">${esc(area.nombre)}</option>`).join('');
    if (activeAreas.some(area => area.id_area === previous)) select.value = previous;
  }
  const button = el('reorder-create');
  button.hidden = !canCreate || !pending.length;
  button.textContent = 'Crear solicitudes sugeridas';
}

function bindReorder() {
  const button = el('reorder-create');
  if (!button || button.dataset.bound) return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    const feedback = el('reorder-feedback');
    const pending = listBelowMinimum().filter(item => !item.inRequest).length;
    if (!pending) return;
    if (!globalThis.confirm(`¿Crear solicitudes en borrador para ${pending} producto${pending === 1 ? '' : 's'}? Se agrupan por proveedor con el mejor precio.`)) return;
    try {
      const result = createSuggestedRequests({ id_empleado: requesterId(), id_area: el('reorder-area-field')?.hidden ? '' : el('reorder-area')?.value });
      const created = result.created.map(order => orderReference(order)).join(', ');
      const skipped = result.skipped.filter(item => item.reason === 'no-supplier').map(item => item.product.nombre);
      feedback.textContent = result.created.length
        ? `${result.created.length === 1 ? 'Se creó 1 solicitud' : `Se crearon ${result.created.length} solicitudes`} en borrador: ${created}.${skipped.length ? ` Sin proveedor con precio: ${skipped.join(', ')}.` : ''}`
        : `No se creó ninguna solicitud.${skipped.length ? ` Sin proveedor con precio: ${skipped.join(', ')}.` : ''}`;
      ctx?.onDataChanged?.();
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
}

export function initGestion() {
  bindReorder();
}

export { loadBudgets };
