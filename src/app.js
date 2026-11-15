import {
  loadEntities, validateEntity, addEntity, updateEntity, deleteEntity,
  loadDocuments, validateDocument, addDocument, updateDocument, deleteDocument,
  searchEntities, loadRubros, addRubro
} from './storage.js';
import {
  loadModuleConfig, setActiveConfig, newLabelFor, withArticle
} from './module-config.js';
import {
  loadEmployees,
  addEmployee,
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
  getAvailableActionItems,
  PAYMENT_TERMS,
  paymentTermLabel,
  currenciesForOrigin,
  defaultCurrencyForOrigin,
  formatCurrency as formatMoney,
  formatDateMask,
  isValidPaymentTerm,
  parseDateInput,
  resolveCurrency,
  resolveSupplierOrigin,
  taxRateForOrigin
} from './domain/purchasing.js';
import {
  PERMISSIONS,
  PERMISSION_DENIED_MESSAGE,
  can,
  clearSession,
  ensureDefaultUsers,
  getSession,
  loadDemoUsers,
  loadUsers,
  login,
  roleLabel,
  transitionPermission
} from './auth.js';
import { init as initProductCatalog } from './product-catalog.js';
import {
  canViewCreditLimit,
  documentLabel,
  ensureRequesterEmployee
} from './access-policy.js';
import { renderDetail } from './purchase-order-detail.js';
import { renderPrintable } from './purchase-order-print.js';
import { renderLineEditor } from './purchase-order-lines.js';
import { hydrateIcons, icon } from './ui-icons.js';
import {
  closeSidePanel,
  initSidePanel,
  mountPanelForm,
  openSidePanel
} from './ui-side-panel.js';
import {
  buildOrderRows,
  filterEntities,
  filterOrders,
  hasActiveFilters,
  sortRows,
  validateDateRange
} from './purchasing-list-query.js';
import {
  applySortState,
  emptyStateRow,
  filterSummary,
  renderFilterError,
  toggleSort
} from './purchasing-list-view.js';
import { renderStatusBadge, statusLabel } from './purchasing-status.js';
import { loadDemoData, requiresDemoReplacement } from './purchasing-demo-data.js';
import { confirmAction } from './ui-feedback.js';

let config;
let configErrors = [];
let draftLines = [];
let currentOrderId = null;
let recoveryResult = null;
let activeSession = null;
let currentViewName = 'dashboard';
let appEventsBound = false;
let authEventsBound = false;
let draftCurrency = 'CLP';
let draftTaxRate = 0.19;
let detailReturn = null;

const entityFilters = { rubros: [], origin: '' };
const entitySort = { key: null, direction: 'asc' };
const documentFilters = { status: '', entityId: '', from: '', to: '', overdueOnly: false, mineOnly: false };
const documentSort = { key: null, direction: 'asc' };

const PERMISSION_DENIED = PERMISSION_DENIED_MESSAGE;

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

function formatCurrencyCLP(value) {
  return formatMoney(value, 'CLP');
}

function canUse(permission) {
  if (!activeSession) return true;
  return can(permission, activeSession);
}

function ownEmployeeId() {
  if (!activeSession) return '';
  if (activeSession.id_empleado) return activeSession.id_empleado;
  const userId = String(activeSession.userId || '').trim().toUpperCase();
  if (!userId) return '';
  const employee = loadEmployees().find(item =>
    String(item.userId ?? item.user_id ?? '').trim().toUpperCase() === userId
  );
  return employee ? (employee.id_empleado || employee.id) : '';
}

function canFilterOwnOrders() {
  return Boolean(isPurchasing() && activeSession?.role === 'comprador' && ownEmployeeId());
}

function showPermissionDenied(feedbackId = 'document-feedback') {
  const feedback = qs(feedbackId);
  if (feedback) feedback.textContent = PERMISSION_DENIED;
}

function syncCreditLimitVisibility() {
  const input = qs('creditLimit');
  if (!input) return;
  const field = input.closest('.field');
  const hidden = !canViewCreditLimit(activeSession);
  input.disabled = hidden;
  if (field) {
    field.hidden = hidden;
    field.classList.toggle('credit-limit-hidden', hidden);
    field.setAttribute('aria-hidden', String(hidden));
  }
}

function syncRequesterControl() {  const select = qs('document-employee');
  if (!select) return;
  const field = select.closest('.field');
  const readOnly = activeSession?.role === 'comprador';
  if (readOnly) {
    const own = ensureRequesterEmployee({
      session: activeSession,
      employees: loadEmployees(),
      createEmployee: addEmployee
    });
    const ownId = own ? (own.id_empleado || own.id) : '';
    if (ownId) {
      if (![...select.options].some(option => option.value === ownId)) {
        const option = document.createElement('option');
        option.value = ownId;
        option.textContent = own.nombre || own.name || '';
        select.appendChild(option);
      }
      select.value = ownId;
    }
  }
  select.disabled = readOnly;
  select.setAttribute('aria-readonly', String(readOnly));
  if (field) field.classList.toggle('read-only-employee', readOnly);
}

function syncDocumentTypeLabel(status = '') {
  const label = qs('document-type-label');
  if (label) label.textContent = documentLabel(status || 'borrador');
}

function allowedNextStatuses(status) {
  return getAvailableActionItems(status)
    .map(action => action.nextStatus)
    .filter(nextStatus => canUse(transitionPermission(nextStatus, status)));
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
    ['action-find', PERMISSIONS.SEARCH_VIEW],
    ['entity-list-new', PERMISSIONS.ENTITIES_CREATE],
    ['document-list-new', PERMISSIONS.DOCUMENTS_CREATE]
  ]) {
    const button = qs(id);
    if (button) button.hidden = !canUse(permission);
  }
  const demoButton = qs('action-load-demo');
  if (demoButton) {
    demoButton.hidden = !isPurchasing()
      || !canUse(PERMISSIONS.ENTITIES_CREATE)
      || !canUse(PERMISSIONS.DOCUMENTS_CREATE)
      || !canUse(PERMISSIONS.PRODUCTS_MANAGE);
  }
  const cardPermissions = [
    ['stat-entities-card', PERMISSIONS.ENTITIES_VIEW],
    ['stat-documents-card', PERMISSIONS.DOCUMENTS_VIEW],
    ['stat-overdue-card', PERMISSIONS.DOCUMENTS_VIEW],
    ['stat-products-card', PERMISSIONS.PRODUCTS_VIEW]
  ];
  for (const [id, permission] of cardPermissions) {
    const card = qs(id);
    if (!card) continue;
    card.hidden = !canUse(permission) || (id === 'stat-products-card' && !isPurchasing());
    card.setAttribute('aria-disabled', card.hidden ? 'true' : 'false');
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

function renderLoginDemoUsersTable() {
  const container = qs('demo-users-hints');
  const body = qs('login-demo-users-body');
  if (!container || !body) return;
  const demoUsers = loadDemoUsers();
  container.hidden = demoUsers.length === 0;
  body.innerHTML = demoUsers
    .map(user => `<tr><td><code>${escapeHtml(user.userId)}</code></td><td>${escapeHtml(user.cargo || roleLabel(user.role))}</td></tr>`)
    .join('');
}

function revealLoginGate() {
  const gate = qs('auth-gate');
  if (gate) gate.hidden = false;
  const shell = qs('app-shell');
  if (shell) shell.hidden = true;
  renderLoginHints();
  renderLoginDemoUsersTable();
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
  renderLoginDemoUsersTable();
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
  qs('document-lines-heading').textContent = isPurchasing()
    ? 'Detalle de compra'
    : `Detalles de ${labels.purchaseOrderLines?.toLowerCase() || 'compra'}`;
  qs('products-view-heading').textContent = labels.products;
  qs('search-view-heading').textContent = `Buscar ${labels.entities}`;
  qs('submit-button').textContent = `Guardar ${labels.entity}`;
  qs('document-submit-button').textContent = `Guardar ${labels.document}`;
  qs('startDate-label').textContent = labels.startDate;
  qs('endDate-label').textContent = labels.endDate;
  qs('code').previousElementSibling.textContent = config.moduleName === 'Adquisiciones y Compras' ? 'RUT' : 'Código';
  if (qs('supplier-rubros-label')) qs('supplier-rubros-label').textContent = labels.supplierCategories || labels.categories;
  if (qs('entity-table-rubro-heading')) qs('entity-table-rubro-heading').textContent = labels.supplierCategories || labels.categories;
  if (qs('search-rubros-label')) qs('search-rubros-label').textContent = labels.supplierCategories || labels.categories;
  if (qs('entities-filter-rubros-label')) qs('entities-filter-rubros-label').textContent = labels.supplierCategories || labels.categories;
  syncCreditLimitVisibility();
  syncRequesterControl();
  syncDocumentTypeLabel(qs('status')?.value);
  setDocumentNavigationLabel();
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

function ensureNavOrder() {
  const sidebar = qs('sidebar');
  if (!sidebar) return;
  const order = isPurchasing()
    ? ['nav-dashboard', 'nav-documents', 'nav-entities', 'nav-products', 'nav-search']
    : ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-search'];
  for (const id of order) {
    const button = qs(id);
    if (button) sidebar.append(button);
  }
}

function mountTemplateForm(templateId) {
  const template = qs(templateId);
  if (!template || !template.content?.firstElementChild) return null;
  const form = template.content.firstElementChild.cloneNode(true);
  if (qs(form.id)) return qs(form.id);
  mountPanelForm(form);
  form.hidden = true;
  return form;
}

function mountFormTemplates() {
  if (!initSidePanel(qs('side-panel'))) return;
  mountTemplateForm('entity-form-template');
  mountTemplateForm('document-form-template');
}

function setDocumentNavigationLabel() {
  const button = qs('nav-documents');
  if (!button) return;
  if (isPurchasing()) button.setAttribute('aria-label', 'Solicitudes y Órdenes de Compra');
  else button.removeAttribute('aria-label');
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
  if (name === 'entities') {
    renderEntityFilterOptions();
    renderEntityTable();
  }
  if (name === 'documents') {
    renderDocumentEntityOptions();
    renderDocumentFilterOptions();
    renderDocumentTable();
    renderStatusControl();
  }
  if (name === 'products') renderProductCatalog();
  if (name === 'search') {
    renderSearchRubroOptions();
    renderSearch();
  }
}

function rubroLabel(rubro) {
  return rubro.nombre || rubro.name || '';
}

function rubroValue(rubro) {
  return String(rubro.id_rubro || rubro.id);
}

function renderRubroOptions(selectedIds = []) {
  const select = qs('supplier-rubros');
  if (!select) return;
  const selected = new Set((selectedIds || []).map(String));
  select.innerHTML = loadRubros()
    .map(rubro => `<option value="${escapeHtml(rubroValue(rubro))}"${selected.has(rubroValue(rubro)) ? ' selected' : ''}>${escapeHtml(rubroLabel(rubro))}</option>`)
    .join('');
}

function renderSearchRubroOptions() {
  const select = qs('search-rubros');
  if (!select) return;
  const selected = new Set([...select.selectedOptions].map(option => option.value));
  select.innerHTML = loadRubros()
    .map(rubro => `<option value="${escapeHtml(rubroValue(rubro))}"${selected.has(rubroValue(rubro)) ? ' selected' : ''}>${escapeHtml(rubroLabel(rubro))}</option>`)
    .join('');
}

function selectedSearchRubros() {
  const select = qs('search-rubros');
  return select ? [...select.selectedOptions].map(option => option.value) : [];
}

function renderPaymentTermsControl(value = '') {
  const existing = qs('paymentTerms');
  if (!existing) return;
  const term = String(value ?? '');
  if (!isPurchasing()) {
    existing.value = term;
    return;
  }
  if (existing.tagName !== 'SELECT') {
    const select = document.createElement('select');
    select.id = 'paymentTerms';
    existing.replaceWith(select);
  }
  const select = qs('paymentTerms');
  const isLegacy = term && !PAYMENT_TERMS.includes(term);
  const options = ['', ...PAYMENT_TERMS, ...(isLegacy ? [term] : [])];
  select.innerHTML = options
    .map(option => {
      if (!option) return '<option value=""></option>';
      if (isLegacy && option === term) return `<option value="${escapeHtml(option)}">Otra (valor anterior)</option>`;
      return `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`;
    })
    .join('');
  select.value = term;
}

function renderEntityRubroCell(entity) {
  const rubros = loadRubros();
  const names = (entity.rubro_ids || [])
    .map(id => {
      const rubro = rubros.find(item => rubroValue(item) === String(id));
      return rubro ? rubroLabel(rubro) : '';
    })
    .filter(Boolean);
  if (names.length) return names.join(', ');
  return entity.category ?? '';
}

function clearEntityForm() {
  qs('entity-id').value = '';
  for (const id of ['name', 'code', 'email', 'phone', 'address', 'category', 'creditLimit', 'origin', 'foreignTaxId']) {
    if (qs(id)) qs(id).value = '';
  }
  renderPaymentTermsControl('');
  renderRubroOptions([]);
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
  syncDocumentTypeLabel('borrador');
  syncRequesterControl();
  setDocumentFormReadOnly(false);
  clearLineInputs();
  if (isPurchasing()) syncDraftPricing({ preserveCurrency: false, preserveTerms: false });
  renderDraftLines();
  qs('document-submit-button').textContent = `Guardar ${config.labels.document}`;
  renderStatusControl();
}

function renderEntityFilterOptions() {
  const select = qs('entities-filter-rubros');
  if (!select) return;
  const selected = new Set(entityFilters.rubros.map(String));
  select.innerHTML = loadRubros()
    .map(rubro => `<option value="${escapeHtml(rubroValue(rubro))}"${selected.has(String(rubroValue(rubro))) ? ' selected' : ''}>${escapeHtml(rubroLabel(rubro))}</option>`)
    .join('');
  const origin = qs('entities-filter-origin');
  if (origin) origin.value = entityFilters.origin;
}

function entityFilterSummary() {
  const rubroNames = entityFilters.rubros
    .map(id => loadRubros().find(rubro => String(rubroValue(rubro)) === String(id)))
    .filter(Boolean)
    .map(rubroLabel);
  return filterSummary([
    ['Rubros', rubroNames],
    ['Origen', entityFilters.origin]
  ]);
}

function renderEntityTable() {
  const allEntities = loadEntities();
  const entities = isPurchasing()
    ? filterEntities(allEntities, entityFilters, { rubros: loadRubros() })
    : allEntities;
  const rows = sortRows(entities, entitySort, {
    name: entity => entity.name,
    code: entity => entity.code,
    rubros: entity => renderEntityRubroCell(entity),
    origin: entity => entity.origin || '',
    paymentTerms: entity => isPurchasing() ? paymentTermLabel(entity.paymentTerms) : entity.paymentTerms ?? ''
  });
  const canEdit = canUse(PERMISSIONS.ENTITIES_UPDATE);
  const canDelete = canUse(PERMISSIONS.ENTITIES_DELETE);
  const canCreate = canUse(PERMISSIONS.ENTITIES_CREATE);
  qs('entity-table-body').innerHTML = rows.length
    ? rows.map(entity => `<tr>
        <td>${escapeHtml(entity.name)}</td>
        <td>${escapeHtml(entity.code)}</td>
        <td>${escapeHtml(renderEntityRubroCell(entity))}</td>
        <td>${escapeHtml(entity.origin || '')}</td>
        <td>${escapeHtml(isPurchasing() ? paymentTermLabel(entity.paymentTerms) : entity.paymentTerms ?? '')}</td>
        <td class="table-actions">
          ${canEdit ? `<button type="button" class="secondary" data-action="edit" data-id="${escapeHtml(entity.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
          ${canDelete ? `<button type="button" class="danger" data-action="delete" data-id="${escapeHtml(entity.id)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>` : ''}
        </td>
      </tr>`).join('')
    : emptyStateRow({
        colspan: 6,
        message: isPurchasing() ? 'No hay proveedores para los filtros seleccionados.' : 'Sin registros.',
        action: canCreate && isPurchasing() ? 'new-entity' : '',
        actionLabel: '+ Nuevo'
      });
  applySortState(qs('entity-table'), entitySort);
  const summary = qs('entity-filter-summary');
  if (summary) summary.textContent = isPurchasing() ? entityFilterSummary() : '';
  const clear = qs('entities-filter-clear');
  if (clear) clear.hidden = !(isPurchasing() && hasActiveFilters(entityFilters));
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
  syncRequesterControl();
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

function renderDocumentFilterOptions() {
  const statusSelect = qs('documents-filter-status');
  if (statusSelect) {
    const statuses = config.statusLifecycle?.statuses || [];
    if (documentFilters.status && !statuses.includes(documentFilters.status)) documentFilters.status = '';
    const options = ['<option value="">Todos</option>']
      .concat(statuses.map(status => `<option value="${escapeHtml(status)}">${escapeHtml(isPurchasing() ? statusLabel(status) : status)}</option>`));
    statusSelect.innerHTML = options.join('');
    statusSelect.value = documentFilters.status;
  }
  const entitySelect = qs('documents-filter-entity');
  if (entitySelect) {
    if (documentFilters.entityId && !loadEntities().some(entity => entity.entity_id === documentFilters.entityId)) {
      documentFilters.entityId = '';
    }
    entitySelect.innerHTML = '<option value="">Todos</option>' +
      loadEntities().map(entity => `<option value="${escapeHtml(entity.entity_id)}">${escapeHtml(entity.name)}</option>`).join('');
    entitySelect.value = documentFilters.entityId;
  }
  if (qs('documents-filter-from')) qs('documents-filter-from').value = documentFilters.from;
  if (qs('documents-filter-to')) qs('documents-filter-to').value = documentFilters.to;
  if (qs('documents-filter-overdue')) qs('documents-filter-overdue').checked = documentFilters.overdueOnly;
  const canFilterMine = canFilterOwnOrders();
  if (!canFilterMine) documentFilters.mineOnly = false;
  const mineField = qs('documents-filter-mine-field');
  if (mineField) mineField.hidden = !canFilterMine;
  const mineInput = qs('documents-filter-mine');
  if (mineInput) {
    mineInput.checked = canFilterMine && documentFilters.mineOnly;
    mineInput.disabled = !canFilterMine;
  }
}

function documentFilterSummary() {
  const entity = loadEntities().find(item => item.entity_id === documentFilters.entityId);
  return filterSummary([
    ['Estado', documentFilters.status ? statusLabel(documentFilters.status) : ''],
    ['Proveedor', entity?.name || ''],
    ['Desde', documentFilters.from],
    ['Hasta', documentFilters.to],
    ['Solo atrasadas', documentFilters.overdueOnly],
    ['Solo mis OC', canFilterOwnOrders() && documentFilters.mineOnly]
  ]);
}

function renderDocumentTable() {
  const allDocuments = loadDocuments();
  const entityNames = new Map(loadEntities().map(entity => [entity.entity_id, entity.name]));
  const rows = buildOrderRows(
    allDocuments.map(document => ({
      ...document,
      id_empleado: getOrderMetadata(document.id)?.id_empleado || ''
    })),
    { entityNames }
  );
  const dateValidation = validateDateRange(documentFilters.from, documentFilters.to);
  const filtered = isPurchasing()
    ? filterOrders(rows, documentFilters, { ownEmployeeId: ownEmployeeId() })
    : rows;
  const sorted = sortRows(filtered, documentSort, {
    folio: row => Number(row.folio) || row.folio,
    entityName: row => row.entityName,
    endDate: row => row.endDate || '',
    total: row => Number(row.total ?? row.totalAmount ?? 0),
    status: row => row.status || ''
  });
  const canEdit = canUse(PERMISSIONS.DOCUMENTS_UPDATE);
  const canDelete = canUse(PERMISSIONS.DOCUMENTS_DELETE);
  const canCreate = canUse(PERMISSIONS.DOCUMENTS_CREATE);
  qs('document-table-body').innerHTML = sorted.length
    ? sorted.map(document => {
        const status = isPurchasing() ? renderStatusBadge(document.status) : (document.status ? `<span class="status-badge">${escapeHtml(document.status)}</span>` : '');
        return `<tr data-order-id="${escapeHtml(document.id)}" tabindex="0" role="button" aria-label="Ver detalle de la orden ${escapeHtml(document.folio)}">
        <td>${escapeHtml(document.folio)}</td>
        <td>${escapeHtml(document.entityName ?? entityNames.get(document.entity_id) ?? '')}</td>
        <td>${escapeHtml(formatDate(document.endDate))}</td>
        <td>${escapeHtml(formatMoney(document.total ?? document.totalAmount, document.currency || 'CLP'))}</td>
        <td>${status}</td>
        <td class="table-actions">
          <button type="button" class="secondary" data-action="view-order" data-id="${escapeHtml(document.id)}">${icon('view', { className: 'ui-icon' })}Ver detalle</button>
          ${canEdit ? `<button type="button" class="secondary" data-action="edit" data-id="${escapeHtml(document.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
          ${canDelete ? `<button type="button" class="danger" data-action="delete" data-id="${escapeHtml(document.id)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>` : ''}
        </td>
      </tr>`;
      }).join('')
    : emptyStateRow({
        colspan: 6,
        message: isPurchasing() ? 'No hay órdenes de compra para los filtros seleccionados.' : 'Sin registros.',
        action: canCreate && isPurchasing() ? 'new-document' : '',
        actionLabel: '+ Nuevo'
      });
  applySortState(qs('document-table'), documentSort);
  const summary = qs('document-filter-summary');
  if (summary) summary.textContent = isPurchasing() ? documentFilterSummary() : '';
  const clear = qs('documents-filter-clear');
  if (clear) clear.hidden = !(isPurchasing() && hasActiveFilters(documentFilters));
  const error = qs('documents-filter-error');
  if (error) renderFilterError(error, isPurchasing() ? dateValidation.message : '');
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
  if (isPurchasing()) {
    if (qs('status')?.tagName !== 'INPUT') replaceStatusControl('input');
    qs('status').type = 'hidden';
    qs('status').value = currentDocument?.status ?? '';
    return;
  }
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

function maskDateInput(value) {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatDateMask(raw);
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  let masked = digits.slice(0, 2);
  if (digits.length > 2) masked += `-${digits.slice(2, 4)}`;
  if (digits.length > 4) masked += `-${digits.slice(4, 8)}`;
  return masked;
}

function selectedSupplier() {
  const entityId = qs('document-entity')?.value;
  return loadEntities().find(entity => entity.entity_id === entityId) || null;
}

function supplierOrigin(supplier) {
  try {
    return resolveSupplierOrigin(supplier || {});
  } catch {
    return 'Nacional';
  }
}

function renderDocumentCurrencyControl(origin, value = '') {
  if (!isPurchasing() || !qs('currency')) return;
  let select = qs('currency');
  if (select.tagName !== 'SELECT') {
    const replacement = document.createElement('select');
    replacement.id = 'currency';
    select.replaceWith(replacement);
    select = replacement;
  }
  const allowed = currenciesForOrigin(origin);
  select.innerHTML = allowed.map(currency => `<option value="${escapeHtml(currency)}">${escapeHtml(currency)}</option>`).join('');
  const requested = String(value || '').trim().toUpperCase();
  select.value = allowed.includes(requested) ? requested : allowed[0];
  select.disabled = allowed.length === 1;
  select.dataset.origin = origin;
}

function renderDocumentPaymentTermsControl(value = '') {
  if (!isPurchasing() || !qs('docPaymentTerms')) return;
  let select = qs('docPaymentTerms');
  if (select.tagName !== 'SELECT') {
    const replacement = document.createElement('select');
    replacement.id = 'docPaymentTerms';
    select.replaceWith(replacement);
    select = replacement;
  }
  const term = String(value ?? '').trim();
  const options = ['', ...PAYMENT_TERMS];
  if (term && !PAYMENT_TERMS.includes(term)) options.push(term);
  select.innerHTML = options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option || 'Seleccionar condición')}</option>`).join('');
  select.value = options.includes(term) ? term : '';
}

function syncDraftPricing({ preserveCurrency = true, preserveTerms = true } = {}) {
  if (!isPurchasing()) return;
  const supplier = selectedSupplier();
  const origin = supplierOrigin(supplier);
  const requested = preserveCurrency ? qs('currency')?.value : '';
  let currency;
  try {
    currency = resolveCurrency(origin, requested);
  } catch {
    currency = defaultCurrencyForOrigin(origin);
  }
  renderDocumentCurrencyControl(origin, currency);
  draftCurrency = currency;
  draftTaxRate = taxRateForOrigin(origin);
  if (!preserveTerms) {
    renderDocumentPaymentTermsControl(isValidPaymentTerm(supplier?.paymentTerms) ? supplier.paymentTerms : '');
  }
}

function applyPurchasingFormAdjustments() {
  if (!isPurchasing()) return;
  for (const id of ['startDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'notes']) {
    const field = qs(id)?.closest('.field');
    if (field) field.hidden = true;
  }
  const statusField = qs('status')?.closest('.field');
  if (statusField) statusField.hidden = true;
  const endDate = qs('endDate');
  if (endDate) {
    endDate.type = 'text';
    endDate.placeholder = 'dd-mm-aaaa';
    endDate.setAttribute('inputmode', 'numeric');
    endDate.autocomplete = 'off';
    if (!endDate.dataset.maskBound) {
      endDate.addEventListener('input', () => {
        const masked = maskDateInput(endDate.value);
        if (endDate.value !== masked) endDate.value = masked;
      });
      endDate.dataset.maskBound = 'true';
    }
  }
  const endDateHelp = qs('endDate-help');
  if (endDateHelp) endDateHelp.hidden = false;
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
    if (isPurchasing()) {
      const currency = qs('currency');
      if (currency?.tagName === 'SELECT' && currency.options.length === 1) currency.disabled = true;
    }
  }
}

function renderDraftLines() {
  renderLineEditor({
    body: qs('document-lines-body'),
    totals: qs('document-totals'),
    lines: draftLines,
    escapeHtml,
    formatCurrency: formatMoney,
    formatCurrencyCLP,
    currency: draftCurrency,
    taxRate: draftTaxRate
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
  if (isPurchasing()) syncDraftPricing();
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

async function handleLoadDemo() {
  const feedback = qs('demo-feedback');
  if (!isPurchasing()) return;
  if (!canUse(PERMISSIONS.ENTITIES_CREATE)
    || !canUse(PERMISSIONS.DOCUMENTS_CREATE)
    || !canUse(PERMISSIONS.PRODUCTS_MANAGE)) {
    if (feedback) feedback.textContent = PERMISSION_DENIED;
    return;
  }
  const trigger = qs('action-load-demo');
  let replaceExisting = false;
  if (requiresDemoReplacement()) {
    const accepted = await confirmAction({
      title: 'Reemplazar por datos de demostración',
      message: 'Ya existen datos del módulo de Compras. Se eliminarán los proveedores, órdenes, productos, empleados, categorías, rubros y usuarios de prueba actuales antes de cargar el conjunto de demostración completo.',
      confirmLabel: 'Reemplazar por datos de demostración',
      cancelLabel: 'Cancelar',
      trigger
    });
    if (!accepted) return;
    replaceExisting = true;
  }
  const result = loadDemoData({ session: activeSession, replaceExisting });
  if (!result.ok) {
    if (feedback) feedback.textContent = result.error || 'No fue posible cargar los datos de demostración.';
    return;
  }
  if (feedback) {
    const created = result.created || {};
    const summary = [
      `${created.suppliers?.length || 0} proveedores`,
      `${created.rubros?.length || 0} rubros`,
      `${created.categories?.length || 0} categorías`,
      `${created.products?.length || 0} productos`,
      `${created.employees?.length || 0} empleados`,
      `${created.users?.length || 0} usuarios de prueba`,
      `${created.orders?.length || 0} órdenes`
    ].join(', ');
    feedback.textContent = `Datos de demostración cargados: ${summary}.${result.limitations?.length ? ` ${result.limitations.join(' ')}` : ''}`;
  }
  if (result.sessionInvalidated && !getSession()) {
    activeSession = null;
    revealLoginGate();
    return;
  }
  renderEntityFilterOptions();
  renderEntityTable();
  renderDocumentEntityOptions();
  renderDocumentFilterOptions();
  renderDocumentTable();
  renderLineProductOptions();
  renderDashboard();
  renderProductCatalog();
  renderLoginDemoUsersTable();
  if (currentOrderId) {
    try {
      const detail = getPurchaseOrderDetail(currentOrderId);
      renderDetail(detail, detailOptions(detail));
    } catch {
      currentOrderId = null;
      showView('documents');
    }
  }
}

function detailOptions(detail) {
  const order = detail.order || detail.document || detail;
  return {
    escapeHtml,
    formatCurrency: formatMoney,
    formatCurrencyCLP,
    formatDate,
    canPrint: canUse(PERMISSIONS.ORDERS_PRINT),
    canEditLines: canUse(PERMISSIONS.DOCUMENTS_UPDATE),
    allowedNextStatuses: allowedNextStatuses(order.status),
    backLabel: 'Volver a Órdenes de Compra',
    renderStatus: renderStatusBadge
  };
}

function openOrderDetail(orderId) {
  if (!canUse(PERMISSIONS.DOCUMENTS_VIEW)) {
    showPermissionDenied('document-feedback');
    return;
  }
  const trigger = document.activeElement;
  detailReturn = {
    orderId,
    triggerId: trigger?.dataset?.id || '',
    filters: { ...documentFilters },
    sort: { ...documentSort }
  };
  currentOrderId = orderId;
  const detail = getPurchaseOrderDetail(orderId);
  renderDetail(detail, detailOptions(detail));
  showView('order-detail');
  qs('order-detail-view').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  qs('order-actions').querySelector('[data-action="close-order-detail"]')?.focus();
}

function printOrder(orderId) {
  if (!canUse(PERMISSIONS.ORDERS_PRINT)) {
    const feedback = qs('order-actions').querySelector('.feedback');
    if (feedback) feedback.textContent = PERMISSION_DENIED;
    return;
  }
  const detail = getPurchaseOrderDetail(orderId);
  renderPrintable(detail, { escapeHtml, formatCurrency: formatMoney, formatCurrencyCLP, formatDate });
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
  if (qs('stat-products')) qs('stat-products').textContent = String(loadProducts().length);
  const statuses = config.statusLifecycle?.statuses || [];
  qs('stat-status-breakdown').innerHTML = statuses.length
    ? statuses.map(status => `<li data-status="${escapeHtml(status)}"${isPurchasing() ? ' role="button" tabindex="0"' : ''}><span>${escapeHtml(isPurchasing() ? statusLabel(status) : status)}</span><strong>${documents.filter(document => document.status === status).length}</strong></li>`).join('')
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
  const results = searchEntities(query, { rubroIds: selectedSearchRubros() });
  const customLabels = config.customFields.filter(field => field.target === 'entity');
  qs('search-results-list').innerHTML = results.map(entity => {
    const custom = customLabels.map(field => {
      if (entity[field.key] === undefined || entity[field.key] === '') return '';
      const value = field.type === 'date' ? formatDate(entity[field.key]) : entity[field.key];
      return `${escapeHtml(field.label)}: ${escapeHtml(value)}`;
    }).filter(Boolean).join(' · ');
    const rubros = renderEntityRubroCell(entity);
    const linkedDocument = loadDocuments().find(document => document.entity_id === entity.entity_id);
    const linkedStatus = linkedDocument?.status
      ? (isPurchasing() ? renderStatusBadge(linkedDocument.status) : `<span class="status-badge">${escapeHtml(linkedDocument.status)}</span>`)
      : '';
    return `<article class="entity-item">${escapeHtml(entity.name)} · ${escapeHtml(entity.code)}${rubros ? ` · ${escapeHtml(rubros)}` : ''}${custom ? ` · ${custom}` : ''}${linkedStatus ? ` ${linkedStatus}` : ''}</article>`;
  }).join('');
  for (const document of loadDocuments()) {
    const haystack = `${document.folio} ${document.startDate} ${document.endDate} ${document.status || ''}`.toLowerCase();
    if (query && haystack.includes(query.toLowerCase())) {
      const badge = isPurchasing()
        ? renderStatusBadge(document.status)
        : `<span class="status-badge">${escapeHtml(document.status || '')}</span>`;
      qs('search-results-list').insertAdjacentHTML('beforeend', `<article class="document-item">Folio ${escapeHtml(document.folio)} · ${escapeHtml(isPurchasing() ? statusLabel(document.status) : document.status || '')}${badge}</article>`);
    }
  }
  qs('search-empty').hidden = qs('search-results-list').children.length > 0;
}

function collectEntity() {
  const data = {
    name: qs('name').value, code: qs('code').value,
    email: qs('email').value, phone: qs('phone').value, address: qs('address').value,
    paymentTerms: qs('paymentTerms').value
  };
  if (canViewCreditLimit(activeSession)) data.creditLimit = qs('creditLimit').value;
  if (isPurchasing()) {
    data.origin = qs('origin')?.value ?? '';
    data.foreignTaxId = qs('foreignTaxId')?.value ?? '';
    const rubroSelect = qs('supplier-rubros');
    data.rubro_ids = rubroSelect ? [...rubroSelect.selectedOptions].map(option => option.value) : [];
  } else if (qs('category')) {
    data.category = qs('category').value;
    if (qs('targetDate')) data.targetDate = qs('targetDate').value;
  }
  for (const field of config.customFields.filter(item => item.target === 'entity')) data[field.key] = qs(`cf-${field.key}`).value;
  return data;
}

function collectDocument() {
  if (isPurchasing()) {
    const rawEndDate = qs('endDate').value;
    const parsedEndDate = parseDateInput(rawEndDate);
    const data = {
      entityId: qs('document-entity').value,
      id_empleado: qs('document-employee').value,
      folio: qs('folio').value,
      endDate: parsedEndDate.valid ? parsedEndDate.iso : rawEndDate,
      currency: qs('currency')?.value ?? '',
      paymentTerms: qs('docPaymentTerms')?.value ?? ''
    };
    for (const field of config.customFields.filter(item => item.target === 'document')) data[field.key] = qs(`cf-${field.key}`).value;
    return data;
  }
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
  for (const key of ['name', 'code', 'email', 'phone', 'address', 'creditLimit']) {
    if (qs(key)) qs(key).value = entity[key] ?? '';
  }
  if (isPurchasing()) {
    if (qs('origin')) qs('origin').value = entity.origin || 'Nacional';
    if (qs('foreignTaxId')) qs('foreignTaxId').value = entity.foreignTaxId ?? '';
    renderPaymentTermsControl(entity.paymentTerms ?? '');
    renderRubroOptions(entity.rubro_ids || []);
  } else {
    if (qs('category')) qs('category').value = entity.category ?? '';
    if (qs('targetDate')) qs('targetDate').value = entity.targetDate ?? '';
    renderPaymentTermsControl(entity.paymentTerms ?? '');
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
  for (const key of ['folio', 'startDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'notes']) {
    qs(key).value = document[key] ?? '';
  }
  qs('endDate').value = document.endDate
    ? (isPurchasing() ? formatDateMask(document.endDate) : document.endDate)
    : '';
  qs('document-entity').value = document.entity_id || '';
  const metadata = getOrderMetadata(document.id);
  qs('document-employee').value = metadata?.id_empleado || '';
  const supplier = selectedSupplier();
  const origin = supplierOrigin(supplier);
  draftCurrency = document.currency || defaultCurrencyForOrigin(origin);
  draftTaxRate = taxRateForOrigin(origin);
  renderDocumentCurrencyControl(origin, draftCurrency);
  renderDocumentPaymentTermsControl(document.paymentTerms ?? '');
  qs('status').value = document.status ?? '';
  for (const field of config.customFields.filter(item => item.target === 'document')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = document[field.key] ?? '';
  }
  draftLines = getLinesForOrder(document.id);
  renderLineProductOptions();
  renderDraftLines();
  clearLineInputs();
  setDocumentFormReadOnly(isTerminalStatus(document.status));
  renderDocumentCurrencyControl(origin, draftCurrency);
  qs('document-submit-button').textContent = `Actualizar ${config.labels.document}`;
  qs('document-feedback').textContent = isTerminalStatus(document.status)
    ? purchasingErrorMessage('ORDER_TERMINAL')
    : metadata ? '' : 'Orden hist��rica sin empleado solicitante; selecciona un empleado para volver a guardarla.';
  syncDocumentTypeLabel(document.status);
  syncRequesterControl();
}

function addRubroFromForm() {
  const input = qs('new-rubro-name');
  const select = qs('supplier-rubros');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const selected = select ? [...select.selectedOptions].map(option => option.value) : [];
  try {
    addRubro({ nombre: name });
    input.value = '';
    renderRubroOptions(selected);
    renderSearchRubroOptions();
    if (qs('error-rubro_ids')) qs('error-rubro_ids').textContent = '';
  } catch (error) {
    if (qs('error-rubro_ids')) qs('error-rubro_ids').textContent = error.message;
  }
}

function bindEvents() {
  if (appEventsBound) return;
  appEventsBound = true;
  qs('nav-dashboard').addEventListener('click', () => showView('dashboard'));
  qs('nav-entities').addEventListener('click', () => showView('entities'));
  qs('nav-documents').addEventListener('click', () => showView('documents'));
  if (qs('nav-products')) qs('nav-products').addEventListener('click', () => showView('products'));
  qs('nav-search').addEventListener('click', () => showView('search'));
  const openNewEntity = () => {
    if (!canUse(PERMISSIONS.ENTITIES_CREATE)) {
      showPermissionDenied('entity-feedback');
      return;
    }
    clearEntityForm();
    syncCreditLimitVisibility();
    showView('entities');
    openSidePanel({
      title: `Agregar ${config.labels.entity}`,
      form: qs('entity-form'),
      trigger: document.activeElement,
      focus: qs('name')
    });
  };
  const openNewDocument = () => {
    if (!canUse(PERMISSIONS.DOCUMENTS_CREATE)) {
      showPermissionDenied('document-feedback');
      return;
    }
    clearDocumentForm();
    syncRequesterControl();
    syncDocumentTypeLabel('borrador');
    showView('documents');
    openSidePanel({
      title: `Agregar ${config.labels.document}`,
      form: qs('document-form'),
      trigger: document.activeElement,
      focus: qs('document-entity')
    });
  };
  qs('action-new-entity').addEventListener('click', openNewEntity);
  qs('entity-list-new')?.addEventListener('click', openNewEntity);
  qs('action-open-entities').addEventListener('click', () => showView('entities'));
  qs('action-new-document').addEventListener('click', openNewDocument);
  qs('document-list-new')?.addEventListener('click', openNewDocument);
  qs('action-find').addEventListener('click', () => { showView('search'); qs('search-input').focus(); });
  qs('search-input').addEventListener('input', renderSearch);
  qs('search-rubros')?.addEventListener('change', renderSearch);
  qs('add-rubro-button')?.addEventListener('click', addRubroFromForm);

  qs('action-load-demo')?.addEventListener('click', handleLoadDemo);

  qs('entities-filter-rubros')?.addEventListener('change', event => {
    entityFilters.rubros = [...event.target.selectedOptions].map(option => option.value);
    renderEntityTable();
  });
  qs('entities-filter-origin')?.addEventListener('change', event => {
    entityFilters.origin = event.target.value;
    renderEntityTable();
  });
  qs('entities-filter-clear')?.addEventListener('click', () => {
    entityFilters.rubros = [];
    entityFilters.origin = '';
    renderEntityFilterOptions();
    renderEntityTable();
  });
  qs('documents-filter-status')?.addEventListener('change', event => {
    documentFilters.status = event.target.value;
    renderDocumentTable();
  });
  qs('documents-filter-entity')?.addEventListener('change', event => {
    documentFilters.entityId = event.target.value;
    renderDocumentTable();
  });
  qs('documents-filter-from')?.addEventListener('change', event => {
    documentFilters.from = event.target.value;
    renderDocumentTable();
  });
  qs('documents-filter-to')?.addEventListener('change', event => {
    documentFilters.to = event.target.value;
    renderDocumentTable();
  });
  qs('documents-filter-overdue')?.addEventListener('change', event => {
    documentFilters.overdueOnly = event.target.checked;
    renderDocumentTable();
  });
  qs('documents-filter-mine')?.addEventListener('change', event => {
    documentFilters.mineOnly = event.target.checked;
    renderDocumentTable();
  });
  qs('documents-filter-clear')?.addEventListener('click', () => {
    documentFilters.status = '';
    documentFilters.entityId = '';
    documentFilters.from = '';
    documentFilters.to = '';
    documentFilters.overdueOnly = false;
    documentFilters.mineOnly = false;
    renderDocumentFilterOptions();
    renderDocumentTable();
  });
  qs('entity-table')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-sort]');
    if (!button) return;
    const next = toggleSort(entitySort, button.dataset.sort);
    entitySort.key = next.key;
    entitySort.direction = next.direction;
    renderEntityTable();
  });
  qs('document-table')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-sort]');
    if (!button) return;
    const next = toggleSort(documentSort, button.dataset.sort);
    documentSort.key = next.key;
    documentSort.direction = next.direction;
    renderDocumentTable();
  });

  qs('stat-entities-card')?.addEventListener('click', () => {
    if (!canUse(PERMISSIONS.ENTITIES_VIEW)) return showPermissionDenied('demo-feedback');
    entityFilters.rubros = [];
    entityFilters.origin = '';
    showView('entities');
  });
  qs('stat-products-card')?.addEventListener('click', () => {
    if (!canUse(PERMISSIONS.PRODUCTS_VIEW)) return showPermissionDenied('demo-feedback');
    showView('products');
  });
  qs('stat-overdue-card')?.addEventListener('click', () => {
    if (!canUse(PERMISSIONS.DOCUMENTS_VIEW)) return showPermissionDenied('demo-feedback');
    documentFilters.overdueOnly = true;
    showView('documents');
    renderDocumentFilterOptions();
    renderDocumentTable();
  });
  qs('stat-status-breakdown')?.addEventListener('click', event => {
    const item = event.target.closest('[data-status]');
    if (!item || !canUse(PERMISSIONS.DOCUMENTS_VIEW)) return;
    documentFilters.status = item.dataset.status;
    showView('documents');
    renderDocumentFilterOptions();
    renderDocumentTable();
  });
  qs('stat-status-breakdown')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = event.target.closest('[data-status]');
    if (!item) return;
    event.preventDefault();
    item.click();
  });
  for (const id of ['stat-entities-card', 'stat-products-card', 'stat-overdue-card']) {
    qs(id)?.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.currentTarget.click();
    });
  }

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
      closeSidePanel({ force: true });
      qs('entity-feedback').textContent = '';
      renderEntityFilterOptions();
      renderEntityTable();
      renderDocumentEntityOptions();
      renderDocumentFilterOptions();
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('entity-feedback').textContent = error.message;
    }
  });

  qs('entity-table-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'new-entity') {
      openNewEntity();
      return;
    }
    const entity = loadEntities().find(item => item.id === button.dataset.id);
    if (!entity) return;
    if (button.dataset.action === 'edit') {
      if (!canUse(PERMISSIONS.ENTITIES_UPDATE)) {
        qs('entity-feedback').textContent = PERMISSION_DENIED;
        return;
      }
      loadEntityIntoForm(entity);
      openSidePanel({
        title: `Editar ${config.labels.entity}`,
        form: qs('entity-form'),
        trigger: button,
        focus: qs('name')
      });
      return;
    }
    if (!canUse(PERMISSIONS.ENTITIES_DELETE)) {
      qs('entity-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    if (!globalThis.confirm(`¿Eliminar ${withArticle(config.labels.entity)} ${entity.name}?`)) return;
    deleteEntity(entity.id);
    clearEntityForm();
    closeSidePanel({ force: true });
    renderEntityFilterOptions();
    renderEntityTable();
    renderDocumentEntityOptions();
    renderDocumentFilterOptions();
    renderDocumentTable();
    renderDashboard();
  });

  if (isPurchasing()) {
    qs('document-entity').addEventListener('change', () => {
      syncDraftPricing({ preserveCurrency: false, preserveTerms: false });
      renderDraftLines();
    });
  }

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
    if (isPurchasing()) syncDraftPricing();
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
      closeSidePanel({ force: true });
      qs('document-feedback').textContent = '';
      renderDocumentFilterOptions();
      renderDocumentTable();
      renderDashboard();
    } catch (error) {
      qs('document-feedback').textContent = error.message || purchasingErrorMessage(error);
    }
  });

  qs('document-table-body').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-order-id]');
    if (!row || event.target.closest('button')) return;
    event.preventDefault();
    openOrderDetail(row.dataset.orderId);
  });
  qs('document-table-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (button?.dataset.action === 'new-document') {
      openNewDocument();
      return;
    }
    if (!button) {
      const row = event.target.closest('tr[data-order-id]');
      if (row) openOrderDetail(row.dataset.orderId);
      return;
    }
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
      openSidePanel({
        title: `Editar ${config.labels.document}`,
        form: qs('document-form'),
        trigger: button,
        focus: qs('folio')
      });
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
    closeSidePanel({ force: true });
    renderDocumentFilterOptions();
    renderDocumentTable();
    renderDashboard();
  });

  qs('order-actions').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'close-order-detail') {
      const returnInfo = detailReturn;
      if (returnInfo) {
    documentFilters.status = returnInfo.filters.status;
    documentFilters.entityId = returnInfo.filters.entityId;
    documentFilters.from = returnInfo.filters.from;
    documentFilters.to = returnInfo.filters.to;
    documentFilters.overdueOnly = returnInfo.filters.overdueOnly;
    documentFilters.mineOnly = Boolean(returnInfo.filters.mineOnly);
        documentSort.key = returnInfo.sort.key;
        documentSort.direction = returnInfo.sort.direction;
      }
      showView('documents');
      renderDocumentFilterOptions();
      renderDocumentTable();
      const target = returnInfo?.orderId
        ? qs('document-table-body').querySelector(`[data-action="view-order"][data-id="${returnInfo.orderId}"]`)
        : null;
      (target || qs('nav-documents'))?.focus?.();
      detailReturn = null;
      return;
    }
    if (action === 'print-order') {
      printOrder(currentOrderId);
      return;
    }
    if (action === 'transition') {
      const nextStatus = button.dataset.nextStatus;
      const currentDocument = loadDocuments().find(item => item.id === currentOrderId);
      if (!canUse(transitionPermission(nextStatus, currentDocument?.status))) {
        const feedback = qs('order-actions').querySelector('.feedback');
        if (feedback) feedback.textContent = PERMISSION_DENIED;
        return;
      }
      if (!globalThis.confirm(`¿Confirmar el cambio de estado a "${statusLabel(nextStatus)}"?`)) return;
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
  ensureNavOrder();
  mountFormTemplates();
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
  renderRubroOptions([]);
  renderSearchRubroOptions();
  renderPaymentTermsControl('');
  renderDocumentEntityOptions();
  renderEntityFilterOptions();
  renderDocumentFilterOptions();
  renderStatusControl();
  applyPurchasingFormAdjustments();
  if (isPurchasing()) syncDraftPricing({ preserveCurrency: false, preserveTerms: false });
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
