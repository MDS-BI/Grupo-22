import {
  loadEntities, validateEntity, addEntity, updateEntity, deleteEntity,
  loadDocuments, validateDocument, addDocument, updateDocument, deleteDocument,
  searchEntities
} from './storage.js';
import {
  loadModuleConfig, setActiveConfig, newLabelFor, withArticle
} from './module-config.js';
import {
  loadEmployees,
  loadProducts,
  getLinesForOrder,
  getOrderMetadata,
  savePurchaseOrder,
  deletePurchaseOrder,
  changeOrderStatus,
  recoverTransactions,
  getPurchaseOrderDetail,
  addOrUpdatePurchaseOrderLine,
  deletePurchaseOrderLine
} from './purchasing-storage.js';
import {
  validatePurchaseOrderLine,
  isTerminalStatus,
  purchasingErrorMessage,
  getAvailableActionItems
} from './domain/purchasing.js';
import {
  PERMISSIONS,
  can,
  clearSession,
  ensureDefaultUsers,
  getSession,
  loadUsers,
  login,
  roleLabel,
  transitionPermission
} from './auth.js';
import { init as initProductCatalog } from './product-catalog.js';
import { renderDetail } from './purchase-order-detail.js';
import { renderPrintable } from './purchase-order-print.js';
import { renderLineEditor } from './purchase-order-lines.js';
import { hydrateIcons, icon } from './ui-icons.js';

let config;
let configErrors = [];
let draftLines = [];
let currentOrderId = null;
let recoveryResult = null;
let activeSession = null;
let currentViewName = 'dashboard';
let appEventsBound = false;
let authEventsBound = false;

const PERMISSION_DENIED = 'No tienes permisos para ejecutar esta acción.';

const VIEW_PERMISSIONS = {
  dashboard: PERMISSIONS.DASHBOARD_VIEW,
  entities: PERMISSIONS.ENTITIES_VIEW,
  documents: PERMISSIONS.DOCUMENTS_VIEW,
  products: PERMISSIONS.PRODUCTS_VIEW,
  search: PERMISSIONS.SEARCH_VIEW
};

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function monogram(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || '');
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCurrencyCLP(value) {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? clpFormatter.format(number) : String(value);
}

function canUse(permission) {
  if (!activeSession) return true;
  return can(permission, activeSession);
}

function allowedNextStatuses(status) {
  return getAvailableActionItems(status)
    .map(action => action.nextStatus)
    .filter(nextStatus => canUse(transitionPermission(nextStatus)));
}

function canAccessView(name) {
  if (name === 'order-detail' || name === 'print') return canUse(PERMISSIONS.DOCUMENTS_VIEW);
  const permission = VIEW_PERMISSIONS[name];
  return permission ? canUse(permission) : true;
}

function firstAllowedView() {
  for (const view of ['dashboard', 'entities', 'documents', 'products', 'search']) {
    if (canAccessView(view)) return view;
  }
  return 'dashboard';
}

function renderSessionInfo() {
  const info = qs('session-info');
  if (!info) return;
  if (activeSession) {
    info.hidden = false;
    qs('session-user').textContent = `${activeSession.nombre} · ${activeSession.userId}`;
    qs('session-role').textContent = roleLabel(activeSession.role);
  } else {
    info.hidden = true;
  }
}

function applyAccessControl() {
  const shell = qs('app-shell');
  if (shell) shell.hidden = false;
  renderSessionInfo();
  for (const [view, permission] of Object.entries(VIEW_PERMISSIONS)) {
    const button = qs(`nav-${view}`);
    if (button) button.hidden = !canUse(permission);
  }
  for (const [id, permission] of [
    ['action-new-entity', PERMISSIONS.ENTITIES_CREATE],
    ['action-new-document', PERMISSIONS.DOCUMENTS_CREATE],
    ['action-open-entities', PERMISSIONS.ENTITIES_VIEW],
    ['action-find', PERMISSIONS.SEARCH_VIEW]
  ]) {
    const button = qs(id);
    if (button) button.hidden = !canUse(permission);
  }
  const entityForm = qs('entity-form');
  if (entityForm) {
    entityForm.hidden = !(canUse(PERMISSIONS.ENTITIES_CREATE) || canUse(PERMISSIONS.ENTITIES_UPDATE));
  }
  const documentForm = qs('document-form');
  if (documentForm) {
    documentForm.hidden = !(canUse(PERMISSIONS.DOCUMENTS_CREATE) || canUse(PERMISSIONS.DOCUMENTS_UPDATE));
  }
  if (!canAccessView(currentViewName)) showView(firstAllowedView());
}

function renderLoginHints() {
  const list = qs('login-user-hints');
  if (!list) return;
  ensureDefaultUsers();
  list.innerHTML = loadUsers()
    .filter(user => user.activo)
    .map(user => `<li><span><code>${escapeHtml(user.userId)}</code> · ${escapeHtml(user.nombre)}</span><span class="hint-role">${escapeHtml(roleLabel(user.role))}</span></li>`)
    .join('');
}

function revealLoginGate() {
  const gate = qs('auth-gate');
  if (gate) gate.hidden = false;
  const shell = qs('app-shell');
  if (shell) shell.hidden = true;
  renderLoginHints();
  qs('login-user-id')?.focus();
}

function hideLoginGate() {
  const gate = qs('auth-gate');
  if (gate) gate.hidden = true;
}

async function handleLogin(event) {
  event.preventDefault();
  const input = qs('login-user-id');
  const error = qs('login-error');
  if (error) error.textContent = '';
  try {
    login(input?.value);
    hideLoginGate();
    await initApp();
  } catch (loginError) {
    if (error) error.textContent = loginError.message;
    input?.focus();
  }
}

function handleLogout() {
  clearSession();
  activeSession = null;
  revealLoginGate();
}

function bindAuthEvents() {
  if (authEventsBound) return;
  authEventsBound = true;
  ensureDefaultUsers();
  renderLoginHints();
  qs('login-form')?.addEventListener('submit', handleLogin);
  qs('logout-button')?.addEventListener('click', handleLogout);
}

function renderLogo() {
  qs('logo-mark').innerHTML = `<svg viewBox="0 0 36 36" role="img" aria-label="${escapeHtml(config.moduleName)}"><rect width="36" height="36" rx="8" fill="var(--accent)"/><text x="18" y="23" text-anchor="middle" font-size="13" font-weight="700" fill="white">${escapeHtml(monogram(config.moduleName))}</text></svg>`;
}

function relabel() {
  const labels = config.labels;
  document.title = config.moduleName;
  qs('brand-name').textContent = config.moduleName;
  qs('dashboard-heading').textContent = config.moduleName;
  qs('nav-entities-label').textContent = labels.entities;
  qs('nav-documents-label').textContent = labels.documents;
  if (qs('nav-products-label')) qs('nav-products-label').textContent = labels.products;
  qs('nav-search-label').textContent = 'Búsqueda';
  qs('action-new-entity-title').textContent = newLabelFor(labels.entity);
  qs('action-new-document-title').textContent = newLabelFor(labels.document);
  qs('action-open-entities-title').textContent = `Gestionar ${labels.entities}`;
  qs('action-find-title').textContent = 'Buscar';
  qs('stat-entities-label').textContent = labels.entities;
  qs('stat-documents-label').textContent = labels.documents;
  qs('stat-statuses-label').textContent = `${labels.documents} por estado`;
  qs('entities-view-heading').textContent = labels.entities;
  qs('entity-form-heading').textContent = `Agregar / Editar ${labels.entity}`;
  qs('edit-entity-heading').textContent = `Editar o eliminar ${withArticle(labels.entity)}`;
  qs('documents-view-heading').textContent = labels.documents;
  qs('document-form-heading').textContent = `Agregar / Editar ${labels.document}`;
  qs('document-entity-label').textContent = labels.entity;
  qs('document-employee-label').textContent = `Empleado solicitante`;
  qs('edit-document-heading').textContent = `Editar o eliminar ${withArticle(labels.document)}`;
  qs('document-lines-heading').textContent = `Detalles de ${labels.purchaseOrderLines?.toLowerCase() || 'compra'}`;
  qs('products-view-heading').textContent = labels.products;
  qs('search-view-heading').textContent = `Buscar ${labels.entities}`;
  qs('submit-button').textContent = `Guardar ${labels.entity}`;
  qs('document-submit-button').textContent = `Guardar ${labels.document}`;
  qs('startDate-label').textContent = labels.startDate;
  qs('endDate-label').textContent = labels.endDate;
  qs('code').previousElementSibling.textContent = config.moduleName === 'Adquisiciones y Compras' ? 'RUT' : 'Código';
}

function ensureProductsNav() {
  const existing = qs('nav-products');
  if (!isPurchasing()) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const button = document.createElement('button');
  button.className = 'nav-module';
  button.dataset.module = 'products';
  button.id = 'nav-products';
  button.innerHTML = '<span data-icon="products"></span><span class="nav-label" id="nav-products-label"></span>';
  const searchButton = qs('nav-search');
  searchButton.parentNode.insertBefore(button, searchButton);
  button.querySelector('.nav-label').textContent = config.labels.products;
  hydrateIcons(button);
}

function showView(name) {
  if (!canAccessView(name)) name = firstAllowedView();
  currentViewName = name;
  for (const view of ['dashboard', 'entities', 'documents', 'products', 'search', 'order-detail', 'print']) {
    const element = qs(`view-${view}`);
    if (element) element.hidden = view !== name;
  }
  document.querySelectorAll('.nav-module').forEach(button => {
    if (button.dataset.module === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'entities') renderEntityTable();
  if (name === 'documents') {
    renderDocumentEntityOptions();
    renderDocumentTable();
    renderStatusControl();
  }
  if (name === 'products') renderProductCatalog();
  if (name === 'search') renderSearch();
}

function clearEntityForm() {
  qs('entity-id').value = '';
  for (const id of ['name', 'code', 'email', 'phone', 'address', 'category', 'creditLimit', 'paymentTerms', 'targetDate']) qs(id).value = '';
  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = '';
  }
  qs('submit-button').textContent = `Guardar ${config.labels.entity}`;
  document.querySelectorAll('[id^="error-"]').forEach(element => element.textContent = '');
}

function clearDocumentForm() {
  qs('document-id').value = '';
  for (const id of ['document-entity', 'document-employee', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'docPaymentTerms', 'notes', 'status']) qs(id).value = '';
  for (const field of config.customFields.filter(item => item.target === 'document')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = '';
  }
  draftLines = [];
  currentOrderId = null;
  setDocumentFormReadOnly(false);
  clearLineInputs();
  renderDraftLines();
  qs('document-submit-button').textContent = `Guardar ${config.labels.document}`;
  renderStatusControl();
}

function renderEntityTable() {
  const entities = loadEntities();
  const canEdit = canUse(PERMISSIONS.ENTITIES_UPDATE);
  const canDelete = canUse(PERMISSIONS.ENTITIES_DELETE);
  qs('entity-table-body').innerHTML = entities.length
    ? entities.map(entity => `<tr>
        <td>${escapeHtml(entity.name)}</td>
        <td>${escapeHtml(entity.code)}</td>
        <td>${escapeHtml(entity.category ?? '')}</td>
        <td class="table-actions">
          ${canEdit ? `<button type="button" class="secondary" data-action="edit" data-id="${escapeHtml(entity.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
          ${canDelete ? `<button type="button" class="danger" data-action="delete" data-id="${escapeHtml(entity.id)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>` : ''}
        </td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty-row">Sin registros.</td></tr>';
}

function renderDocumentEntityOptions() {
  const selectedEntity = qs('document-entity').value;
  const selectedEmployee = qs('document-employee').value;
  qs('document-entity').innerHTML = `<option value="">Seleccionar ${config.labels.entity}</option>` +
    loadEntities().map(entity => `<option value="${escapeHtml(entity.entity_id)}">${escapeHtml(entity.name)}</option>`).join('');
  qs('document-employee').innerHTML = `<option value="">Seleccionar empleado</option>` +
    loadEmployees().map(employee => `<option value="${escapeHtml(employee.id_empleado || employee.id)}">${escapeHtml(employee.nombre || employee.name || '')}</option>`).join('');
  qs('document-entity').value = selectedEntity;
  qs('document-employee').value = selectedEmployee;
  renderLineProductOptions();
}

function renderLineProductOptions() {
  const select = qs('line-product');
  if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">Seleccionar producto</option>' +
    loadProducts().map(product => `<option value="${escapeHtml(product.id_producto || product.id)}">${escapeHtml(product.nombre || product.name || '')}</option>`).join('');
  select.value = selected;
}

function renderDocumentTable() {
  const documents = loadDocuments();
  const entityNames = new Map(loadEntities().map(entity => [entity.entity_id, entity.name]));
  const canEdit = canUse(PERMISSIONS.DOCUMENTS_UPDATE);
  const canDelete = canUse(PERMISSIONS.DOCUMENTS_DELETE);
  qs('document-table-body').innerHTML = documents.length
    ? documents.map(document => `<tr>
        <td>${escapeHtml(document.folio)}</td>
        <td>${escapeHtml(entityNames.get(document.entity_id) ?? '')}</td>
        <td>${escapeHtml(formatDate(document.endDate))}</td>
        <td>${escapeHtml(formatCurrencyCLP(document.totalAmount))}</td>
        <td>${document.status ? `<span class="status-badge">${escapeHtml(document.status)}</span>` : ''}</td>
        <td class="table-actions">
          <button type="button" class="secondary" data-action="view-order" data-id="${escapeHtml(document.id)}">${icon('view', { className: 'ui-icon' })}Ver detalle</button>
          ${canEdit ? `<button type="button" class="secondary" data-action="edit" data-id="${escapeHtml(document.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
          ${canDelete ? `<button type="button" class="danger" data-action="delete" data-id="${escapeHtml(document.id)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>` : ''}
        </td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="empty-row">Sin registros.</td></tr>';
}

function replaceStatusControl(tagName, options = []) {
  const current = qs('status');
  let replacement;
  if (tagName === 'select') {
    replacement = document.createElement('select');
    replacement.innerHTML = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.text)}</option>`).join('');
  } else {
    replacement = document.createElement('input');
    replacement.type = 'text';
  }
  replacement.id = 'status';
  current.replaceWith(replacement);
}

function renderStatusControl(documentId = '') {
  const lifecycle = config.statusLifecycle;
  const currentDocument = documentId ? loadDocuments().find(item => item.id === documentId) : null;
  if (!lifecycle) {
    replaceStatusControl('input');
  } else {
    if (currentDocument) {
      const options = [];
      if (currentDocument.status) options.push({ value: currentDocument.status, text: currentDocument.status });
      for (const next of lifecycle.transitions[currentDocument.status] || []) options.push({ value: next, text: next });
      replaceStatusControl('select', options);
    } else {
      const options = [{ value: '', text: '' }];
      for (const status of lifecycle.statuses) options.push({ value: status, text: status });
      replaceStatusControl('select', options);
    }
  }
}

function renderCustomFields(target, containerId) {
  const container = qs(containerId);
  container.hidden = config.customFields.filter(field => field.target === target).length === 0;
  container.innerHTML = config.customFields.filter(field => field.target === target).map(field => {
    const id = `cf-${field.key}`;
    const required = field.required ? ' *' : '';
    const label = `<label for="${escapeHtml(id)}">${escapeHtml(field.label)}${required}</label>`;
    if (field.type === 'select') {
      return `<div class="field custom-field">${label}<select id="${escapeHtml(id)}"><option value="">--</option>${field.options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select><small class="field-error" id="error-cf-${escapeHtml(field.key)}"></small></div>`;
    }
    return `<div class="field custom-field">${label}<input id="${escapeHtml(id)}" type="${field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}"><small class="field-error" id="error-cf-${escapeHtml(field.key)}"></small></div>`;
  }).join('');
}

function isPurchasing() {
  return config?.moduleName === 'Adquisiciones y Compras';
}

function clearLineInputs() {
  for (const id of ['line-product', 'line-quantity', 'line-cost']) {
    const element = qs(id);
    if (element) element.value = '';
  }
  for (const id of ['error-line-product', 'error-line-quantity', 'error-line-cost']) {
    const element = qs(id);
    if (element) element.textContent = '';
  }
}

function setDocumentFormReadOnly(readOnly) {
  const form = qs('document-form');
  if (!form) return;
  form.classList.toggle('read-only', readOnly);
  for (const element of form.querySelectorAll('input,select,textarea,button')) {
    element.disabled = readOnly;
  }
  if (!readOnly) {
    qs('document-submit-button').disabled = false;
    qs('add-line-button').disabled = false;
  }
}

function renderDraftLines() {
  renderLineEditor({
    body: qs('document-lines-body'),
    totals: qs('document-totals'),
    lines: draftLines,
    escapeHtml,
    formatCurrencyCLP
  });
}

function showLineErrors(errors) {
  for (const id of ['error-line-product', 'error-line-quantity', 'error-line-cost']) {
    const element = qs(id);
    if (element) element.textContent = '';
  }
  if (errors.id_producto) qs('error-line-product').textContent = errors.id_producto;
  if (errors.cantidad) qs('error-line-quantity').textContent = errors.cantidad;
  if (errors.costo_unitario) qs('error-line-cost').textContent = errors.costo_unitario;
}

function addDraftLine() {
  const permission = currentOrderId ? PERMISSIONS.DOCUMENTS_UPDATE : PERMISSIONS.DOCUMENTS_CREATE;
  if (!canUse(permission)) {
    qs('document-feedback').textContent = PERMISSION_DENIED;
    return;
  }
  const line = {
    id_producto: qs('line-product').value,
    cantidad: qs('line-quantity').value,
    costo_unitario: qs('line-cost').value
  };
  const validation = validatePurchaseOrderLine(line, { existingLines: draftLines });
  if (line.id_producto && !loadProducts().some(product => (product.id_producto || product.id) === line.id_producto)) {
    validation.errors.id_producto = purchasingErrorMessage('PRODUCT_NOT_FOUND');
    validation.valid = false;
  }
  showLineErrors(validation.errors);
  if (!validation.valid) return;
  const normalized = {
    id_orden_compra: currentOrderId || '',
    id_producto: line.id_producto,
    cantidad: Number(line.cantidad),
    costo_unitario: Number(line.costo_unitario)
  };
  if (currentOrderId) {
    try {
      addOrUpdatePurchaseOrderLine(currentOrderId, normalized);
      draftLines = getLinesForOrder(currentOrderId);
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('document-feedback').textContent = purchasingErrorMessage(error);
      return;
    }
  } else {
    draftLines.push(normalized);
  }
  clearLineInputs();
  renderDraftLines();
  qs('document-feedback').textContent = '';
}

function editDraftLine(index) {
  const permission = currentOrderId ? PERMISSIONS.DOCUMENTS_UPDATE : PERMISSIONS.DOCUMENTS_CREATE;
  if (!canUse(permission)) {
    qs('document-feedback').textContent = PERMISSION_DENIED;
    return;
  }
  const line = draftLines[index];
  if (!line) return;
  qs('line-product').value = line.id_producto;
  qs('line-quantity').value = line.cantidad;
  qs('line-cost').value = line.costo_unitario;
  if (currentOrderId) {
    draftLines = draftLines.filter((_, lineIndex) => lineIndex !== index);
  } else {
    draftLines.splice(index, 1);
  }
  renderDraftLines();
  qs('line-quantity').focus();
}

function removeDraftLine(index) {
  const permission = currentOrderId ? PERMISSIONS.DOCUMENTS_UPDATE : PERMISSIONS.DOCUMENTS_CREATE;
  if (!canUse(permission)) {
    qs('document-feedback').textContent = PERMISSION_DENIED;
    return;
  }
  const line = draftLines[index];
  if (!line) return;
  if (currentOrderId) {
    try {
      deletePurchaseOrderLine(currentOrderId, line.id_producto);
      draftLines = getLinesForOrder(currentOrderId);
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('document-feedback').textContent = purchasingErrorMessage(error);
      return;
    }
  } else {
    draftLines.splice(index, 1);
  }
  renderDraftLines();
  qs('document-feedback').textContent = '';
}

function renderProductCatalog() {
  initProductCatalog({
    escapeHtml,
    formatCurrencyCLP,
    canManage: canUse(PERMISSIONS.PRODUCTS_MANAGE),
    onChanged: () => {
      renderDocumentEntityOptions();
      renderDashboard();
    }
  });
}

function detailOptions(detail) {
  const order = detail.order || detail.document || detail;
  return {
    escapeHtml,
    formatCurrencyCLP,
    formatDate,
    canPrint: canUse(PERMISSIONS.ORDERS_PRINT),
    canEditLines: canUse(PERMISSIONS.DOCUMENTS_UPDATE),
    allowedNextStatuses: allowedNextStatuses(order.status)
  };
}

function openOrderDetail(orderId) {
  if (!canUse(PERMISSIONS.DOCUMENTS_VIEW)) return;
  currentOrderId = orderId;
  const detail = getPurchaseOrderDetail(orderId);
  renderDetail(detail, detailOptions(detail));
  showView('order-detail');
  qs('order-detail-view').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function printOrder(orderId) {
  if (!canUse(PERMISSIONS.ORDERS_PRINT)) {
    const feedback = qs('order-actions').querySelector('.feedback');
    if (feedback) feedback.textContent = PERMISSION_DENIED;
    return;
  }
  const detail = getPurchaseOrderDetail(orderId);
  renderPrintable(detail, { escapeHtml, formatCurrencyCLP, formatDate });
  showView('print');
  try {
    globalThis.print?.();
  } catch {
    // jsdom and some browsers do not implement print; the printable view remains available.
  }
}

function renderDashboard() {
  const entities = loadEntities();
  const documents = loadDocuments();
  qs('stat-entities').textContent = String(entities.length);
  qs('stat-documents').textContent = String(documents.length);
  const statuses = config.statusLifecycle?.statuses || [];
  qs('stat-status-breakdown').innerHTML = statuses.length
    ? statuses.map(status => `<li data-status="${escapeHtml(status)}"><span>${escapeHtml(status)}</span><strong>${documents.filter(document => document.status === status).length}</strong></li>`).join('')
    : '<li class="empty-row">Sin estados configurados.</li>';
  const today = new Date();
  const overdue = documents.filter(document => {
    if (!document.endDate || ['recibido', 'cancelado'].includes(document.status)) return false;
    const [year, month, day] = document.endDate.split('-').map(Number);
    return new Date(year, month - 1, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;
  qs('stat-overdue').textContent = String(overdue);
}

function renderSearch() {
  const query = qs('search-input').value;
  const results = searchEntities(query);
  const customLabels = config.customFields.filter(field => field.target === 'entity');
  qs('search-results-list').innerHTML = results.map(entity => {
    const custom = customLabels.map(field => {
      if (entity[field.key] === undefined || entity[field.key] === '') return '';
      const value = field.type === 'date' ? formatDate(entity[field.key]) : entity[field.key];
      return `${escapeHtml(field.label)}: ${escapeHtml(value)}`;
    }).filter(Boolean).join(' · ');
    const linkedDocument = loadDocuments().find(document => document.entity_id === entity.entity_id);
    return `<article class="entity-item">${escapeHtml(entity.name)} · ${escapeHtml(entity.code)}${custom ? ` · ${custom}` : ''}${linkedDocument?.status ? ` <span class="status-badge">${escapeHtml(linkedDocument.status)}</span>` : ''}</article>`;
  }).join('');
  for (const document of loadDocuments()) {
    const haystack = `${document.folio} ${document.startDate} ${document.endDate} ${document.status || ''}`.toLowerCase();
    if (query && haystack.includes(query.toLowerCase())) {
      qs('search-results-list').insertAdjacentHTML('beforeend', `<article class="document-item">Folio ${escapeHtml(document.folio)} · ${escapeHtml(document.status || '')}<span class="status-badge">${escapeHtml(document.status || '')}</span></article>`);
    }
  }
  qs('search-empty').hidden = qs('search-results-list').children.length > 0;
}

function collectEntity() {
  const data = {
    name: qs('name').value, code: qs('code').value,
    email: qs('email').value, phone: qs('phone').value, address: qs('address').value,
    category: qs('category').value, creditLimit: qs('creditLimit').value,
    paymentTerms: qs('paymentTerms').value, targetDate: qs('targetDate').value
  };
  for (const field of config.customFields.filter(item => item.target === 'entity')) data[field.key] = qs(`cf-${field.key}`).value;
  return data;
}

function collectDocument() {
  const data = {
    entityId: qs('document-entity').value, id_empleado: qs('document-employee').value,
    folio: qs('folio').value,
    startDate: qs('startDate').value, endDate: qs('endDate').value, quantity: qs('quantity').value,
    subtotal: qs('subtotal').value, discount: qs('discount').value, taxAmount: qs('taxAmount').value,
    totalAmount: qs('totalAmount').value, currency: qs('currency').value,
    paymentTerms: qs('docPaymentTerms').value, notes: qs('notes').value, status: qs('status').value
  };
  for (const field of config.customFields.filter(item => item.target === 'document')) data[field.key] = qs(`cf-${field.key}`).value;
  return data;
}

function showEntityErrors(errors) {
  document.querySelectorAll('[id^="error-"]').forEach(element => element.textContent = '');
  for (const [key, message] of Object.entries(errors)) {
    const mappedKey = key === 'entity_id' ? 'document-entity' : key === 'id_empleado' ? 'document-employee' : key;
    const element = qs(`error-${key}`) || qs(`error-cf-${key}`) || qs(`error-${mappedKey}`);
    if (element) element.textContent = message;
  }
}

function loadEntityIntoForm(entity) {
  qs('entity-id').value = entity.id;
  for (const key of ['name', 'code', 'email', 'phone', 'address', 'category', 'creditLimit', 'paymentTerms', 'targetDate']) {
    qs(key).value = entity[key] ?? '';
  }
  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = entity[field.key] ?? '';
  }
  qs('submit-button').textContent = 'Actualizar';
  qs('entity-feedback').textContent = '';
}

function loadDocumentIntoForm(document) {
  qs('document-id').value = document.id;
  currentOrderId = document.id;
  renderStatusControl(document.id);
  for (const key of ['folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'notes']) {
    qs(key).value = document[key] ?? '';
  }
  qs('document-entity').value = document.entity_id || '';
  const metadata = getOrderMetadata(document.id);
  qs('document-employee').value = metadata?.id_empleado || '';
  qs('docPaymentTerms').value = document.paymentTerms ?? '';
  qs('status').value = document.status ?? '';
  for (const field of config.customFields.filter(item => item.target === 'document')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = document[field.key] ?? '';
  }
  draftLines = getLinesForOrder(document.id);
  renderLineProductOptions();
  renderDraftLines();
  clearLineInputs();
  setDocumentFormReadOnly(isTerminalStatus(document.status));
  qs('document-submit-button').textContent = `Actualizar ${config.labels.document}`;
  qs('document-feedback').textContent = isTerminalStatus(document.status)
    ? purchasingErrorMessage('ORDER_TERMINAL')
    : metadata ? '' : 'Orden histórica sin empleado solicitante; selecciona un empleado para volver a guardarla.';
}

function bindEvents() {
  if (appEventsBound) return;
  appEventsBound = true;
  qs('nav-dashboard').addEventListener('click', () => showView('dashboard'));
  qs('nav-entities').addEventListener('click', () => showView('entities'));
  qs('nav-documents').addEventListener('click', () => showView('documents'));
  if (qs('nav-products')) qs('nav-products').addEventListener('click', () => showView('products'));
  qs('nav-search').addEventListener('click', () => showView('search'));
  qs('action-new-entity').addEventListener('click', () => {
    if (!canUse(PERMISSIONS.ENTITIES_CREATE)) return;
    clearEntityForm();
    showView('entities');
    qs('name').focus();
  });
  qs('action-open-entities').addEventListener('click', () => showView('entities'));
  qs('action-new-document').addEventListener('click', () => {
    if (!canUse(PERMISSIONS.DOCUMENTS_CREATE)) return;
    clearDocumentForm();
    showView('documents');
    qs('document-entity').focus();
  });
  qs('action-find').addEventListener('click', () => { showView('search'); qs('search-input').focus(); });
  qs('search-input').addEventListener('input', renderSearch);

  qs('sidebar-toggle').addEventListener('click', () => qs('sidebar').classList.toggle('collapsed'));

  qs('entity-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = collectEntity();
    const id = qs('entity-id').value;
    const permission = id ? PERMISSIONS.ENTITIES_UPDATE : PERMISSIONS.ENTITIES_CREATE;
    if (!canUse(permission)) {
      qs('entity-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    const validation = validateEntity({ ...data, ...(id ? { id } : {}) });
    showEntityErrors(validation.errors);
    if (!validation.valid) return;
    try {
      if (id) {
        updateEntity(id, data);
      }
      else addEntity(data);
      clearEntityForm();
      qs('entity-feedback').textContent = '';
      renderEntityTable();
      renderDocumentEntityOptions();
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('entity-feedback').textContent = error.message;
    }
  });

  qs('entity-table-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const entity = loadEntities().find(item => item.id === button.dataset.id);
    if (!entity) return;
    if (button.dataset.action === 'edit') {
      if (!canUse(PERMISSIONS.ENTITIES_UPDATE)) {
        qs('entity-feedback').textContent = PERMISSION_DENIED;
        return;
      }
      loadEntityIntoForm(entity);
      qs('name').focus();
      return;
    }
    if (!canUse(PERMISSIONS.ENTITIES_DELETE)) {
      qs('entity-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    if (!globalThis.confirm(`¿Eliminar ${withArticle(config.labels.entity)} ${entity.name}?`)) return;
    deleteEntity(entity.id);
    clearEntityForm();
    renderEntityTable();
    renderDocumentEntityOptions();
    renderDocumentTable();
    renderDashboard();
  });

  qs('add-line-button').addEventListener('click', addDraftLine);
  qs('document-lines-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === 'edit-line') editDraftLine(index);
    if (button.dataset.action === 'delete-line') removeDraftLine(index);
  });

  qs('document-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = collectDocument();
    const id = qs('document-id').value;
    const permission = id ? PERMISSIONS.DOCUMENTS_UPDATE : PERMISSIONS.DOCUMENTS_CREATE;
    if (!canUse(permission)) {
      qs('document-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    const validation = validateDocument(data);
    if (isPurchasing()) {
      if (!data.id_empleado) {
        validation.errors.id_empleado = 'Debe seleccionar un empleado solicitante.';
        validation.valid = false;
      }
      if (!draftLines.length) {
        qs('document-feedback').textContent = purchasingErrorMessage('NO_LINES');
        validation.valid = false;
      }
    }
    showEntityErrors(validation.errors);
    if (!validation.valid) return;
    try {
      if (isPurchasing()) {
        savePurchaseOrder({ ...data, ...(id ? { id } : {}), lines: draftLines });
      } else if (id) {
        updateDocument(id, data);
      } else {
        addDocument(data);
      }
      clearDocumentForm();
      qs('document-feedback').textContent = '';
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('document-feedback').textContent = error.message || purchasingErrorMessage(error);
    }
  });

  qs('document-table-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const document = loadDocuments().find(item => item.id === button.dataset.id);
    if (!document) return;
    if (button.dataset.action === 'view-order') {
      openOrderDetail(document.id);
      return;
    }
    if (button.dataset.action === 'edit') {
      if (!canUse(PERMISSIONS.DOCUMENTS_UPDATE)) {
        qs('document-feedback').textContent = PERMISSION_DENIED;
        return;
      }
      loadDocumentIntoForm(document);
      qs('folio').focus();
      return;
    }
    if (!canUse(PERMISSIONS.DOCUMENTS_DELETE)) {
      qs('document-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    if (!globalThis.confirm(`¿Eliminar ${withArticle(config.labels.document)} folio ${document.folio}?`)) return;
    if (isPurchasing()) deletePurchaseOrder(document.id);
    else deleteDocument(document.id);
    clearDocumentForm();
    renderDocumentTable();
    renderDashboard();
  });

  qs('order-actions').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'close-order-detail') {
      showView('documents');
      return;
    }
    if (action === 'print-order') {
      printOrder(currentOrderId);
      return;
    }
    if (action === 'transition') {
      const nextStatus = button.dataset.nextStatus;
      if (!canUse(transitionPermission(nextStatus))) {
        const feedback = qs('order-actions').querySelector('.feedback');
        if (feedback) feedback.textContent = PERMISSION_DENIED;
        return;
      }
      if (!globalThis.confirm(`¿Confirmar el cambio de estado a "${nextStatus}"?`)) return;
      try {
        const detail = changeOrderStatus(currentOrderId, nextStatus);
        renderDetail(detail, detailOptions(detail));
        renderDocumentTable();
        renderDashboard();
        qs('order-actions').querySelector('.feedback').textContent = 'Estado actualizado correctamente.';
      } catch (error) {
        const feedback = qs('order-actions').querySelector('.feedback');
        if (feedback) feedback.textContent = error.message || purchasingErrorMessage(error);
      }
    }
  });

  qs('order-lines-table').addEventListener('click', event => {
    const button = event.target.closest('button[data-action="delete-line"]');
    if (!button) return;
    if (!canUse(PERMISSIONS.DOCUMENTS_UPDATE)) {
      const feedback = qs('order-actions').querySelector('.feedback');
      if (feedback) feedback.textContent = PERMISSION_DENIED;
      return;
    }
    if (!globalThis.confirm('¿Eliminar esta línea de detalle?')) return;
    try {
      deletePurchaseOrderLine(currentOrderId, button.dataset.productId);
      const detail = getPurchaseOrderDetail(currentOrderId);
      renderDetail(detail, detailOptions(detail));
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('order-actions').querySelector('.feedback').textContent = error.message || purchasingErrorMessage(error);
    }
  });
}

export async function initApp(normalizedConfig, options = {}) {
  if (normalizedConfig?.config) {
    config = normalizedConfig.config;
    configErrors = normalizedConfig.errors || [];
  } else if (normalizedConfig) {
    config = normalizedConfig;
  } else {
    const loaded = await loadModuleConfig();
    config = loaded.config;
    configErrors = loaded.errors;
  }
  activeSession = getSession();
  setActiveConfig(config);
  ensureProductsNav();
  hydrateIcons();
  if (options.recoverTransactions !== false) {
    try {
      recoveryResult = recoverTransactions();
      globalThis.purchasingRecoveryResult = recoveryResult;
    } catch (error) {
      recoveryResult = { recovered: 0, cleared: 0, errors: [error.message], total: 0 };
    }
  }
  document.documentElement.style.setProperty('--accent', config.theme.accentColor);
  relabel();
  renderLogo();
  renderCustomFields('entity', 'entity-custom-fields');
  renderCustomFields('document', 'document-custom-fields');
  renderDocumentEntityOptions();
  renderStatusControl();
  renderDraftLines();
  bindEvents();
  applyAccessControl();
  renderEntityTable();
  renderDocumentTable();
  renderDashboard();
  showView('dashboard');
  const warnings = [...configErrors, ...(recoveryResult?.errors || [])];
  if (warnings.length) {
    qs('config-warning').hidden = false;
    qs('config-warning').textContent = `Problemas de configuración: ${warnings.join('. ')}`;
  } else {
    qs('config-warning').hidden = true;
  }
}

export function getRecoveryResult() {
  return recoveryResult;
}

export async function boot() {
  bindAuthEvents();
  if (!getSession()) {
    revealLoginGate();
    return;
  }
  hideLoginGate();
  await initApp();
}
