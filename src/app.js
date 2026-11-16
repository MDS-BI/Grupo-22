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
  configureGestion,
  initGestion,
  renderReports,
  renderNotifications,
  renderReorderCard,
  gradeTag,
  downloadCsv,
  csvFilename
} from './ui-gestion.js';
import {
  configurePurchaseMode,
  bindPurchaseMode,
  resetPurchaseMode,
  setDefaultPurchaseMode,
  isProductMode,
  cartError,
  getCart
} from './ui-purchase-mode.js';
import {
  createRequestsFromCart,
  duplicatePurchaseOrder,
  getAreaBudgetForOrder,
  getAllSupplierEvaluations,
  loadAreas,
  orderReference,
  ordersCountForSupplier,
  setSupplierStatus,
  supplierIsActive
} from './purchasing-management.js';
import { toCsv, csvNumber } from './domain/reports.js';
import {
  closeSidePanel,
  initSidePanel,
  mountPanelForm,
  openSidePanel
} from './ui-side-panel.js';
import { initTheme, toggleTheme } from './ui-theme.js';
import {
  applyStackedLabels,
  bindGlobalSearch,
  ensureShellScaffold,
  isSmallScreen,
  navGroupFor,
  syncThemeToggle,
  toggleMobileNav,
  updateBreadcrumb
} from './ui-shell.js';
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
import {
  STATUS_FILTER_OPTIONS,
  formatPurchaseOrderFolio,
  formatRequestNumber,
  statusFilterLabel
} from './domain/purchasing.js';
import { productsForSupplier } from './domain/price-list.js';
import {
  getSupplierPriceList,
  getSupplierSummary,
  loadOrderMetadata,
  nextRequestFolio
} from './purchasing-storage.js';
import { renderSupplierSummary, supplierTaxIdentity } from './supplier-summary-view.js';
import {
  attentionItemsForRole,
  attentionTitle,
  countByStatus,
  isOverdueOrder,
  monthlySpend,
  topSuppliers
} from './ui-dashboard.js';
import { spendColumnsSvg, statusBarChartSvg } from './ui-charts.js';
import { mountChips } from './ui-chips.js';
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
  search: PERMISSIONS.SEARCH_VIEW,
  reports: PERMISSIONS.REPORTS_VIEW
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

// 005 (T019f): avatar con iniciales y cargo junto al usuario de la sesión.
function renderSessionAvatar() {
  const info = qs('session-info');
  if (!info || !activeSession) return;
  let avatar = qs('session-avatar');
  if (!avatar) {
    avatar = document.createElement('span');
    avatar.id = 'session-avatar';
    avatar.className = 'avatar avatar-sm';
    avatar.setAttribute('aria-hidden', 'true');
    info.insertBefore(avatar, info.firstChild);
  }
  avatar.textContent = initialsOf(activeSession.nombre || activeSession.userId);
  const user = loadUsers().find(item => item.userId === activeSession.userId);
  const cargo = String(user?.cargo || activeSession.cargo || '').trim();
  info.title = cargo ? `${activeSession.nombre} · ${cargo}` : activeSession.nombre || '';
}

function renderSessionInfo() {
  const info = qs('session-info');
  if (!info) return;
  if (activeSession) {
    info.hidden = false;
    qs('session-user').textContent = `${activeSession.nombre} · ${activeSession.userId}`;
    qs('session-role').textContent = roleLabel(activeSession.role);
    renderSessionAvatar();
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
  // 007 · US3: "Reportes" deja de ser una reserva del 005 y pasa a ser navegable.
  const reportsButton = qs('nav-reports');
  if (reportsButton) {
    const allowed = isPurchasing() && canUse(PERMISSIONS.REPORTS_VIEW);
    reportsButton.hidden = !allowed;
    reportsButton.disabled = !allowed;
    reportsButton.setAttribute('aria-disabled', String(!allowed));
    reportsButton.dataset.module = 'reports';
    if (!reportsButton.dataset.bound) {
      reportsButton.dataset.bound = 'true';
      reportsButton.addEventListener('click', () => showView('reports'));
    }
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

function demoUserIcon() {
  return '<svg class="demo-user-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 4-6 8-6s8 2 8 6"></path></svg>';
}

function renderLoginDemoUsersTable() {
  const container = qs('demo-users-hints');
  const body = qs('login-demo-users-body');
  if (!container || !body) return;
  const demoUsers = loadDemoUsers();
  container.hidden = demoUsers.length === 0;
  body.innerHTML = demoUsers
    .map(user => `<tr><td><button type="button" class="demo-user-login" data-action="login-demo-user" data-user-id="${escapeHtml(user.userId)}" aria-label="Ingresar como ${escapeHtml(user.userId)}, ${escapeHtml(user.cargo || roleLabel(user.role))}">${demoUserIcon()}<code>${escapeHtml(user.userId)}</code></button></td><td>${escapeHtml(user.cargo || roleLabel(user.role))}</td></tr>`)
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
  qs('login-demo-users-body')?.addEventListener('click', event => {
    const button = event.target.closest('[data-action="login-demo-user"]');
    if (!button) return;
    const input = qs('login-user-id');
    const form = qs('login-form');
    if (!input || !form) return;
    input.value = button.dataset.userId || '';
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  });
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
  // 005: si el armazón agrupó la navegación, cada botón se ordena dentro de su grupo
  // (Operación, Maestros, Herramientas) conservando el orden de 003.
  const grouped = sidebar.querySelector('[data-nav-group]');
  for (const id of order) {
    const button = qs(id);
    if (!button) continue;
    const group = grouped ? sidebar.querySelector(`[data-nav-group="${navGroupFor(id)}"]`) : null;
    if (!group) {
      sidebar.append(button);
      continue;
    }
    const reserved = group.querySelector('.nav-reserved');
    if (reserved) group.insertBefore(button, reserved);
    else group.append(button);
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
  // 005 (T019g): el texto visible coincide con el nombre accesible sin cambiar #nav-documents-label.
  const label = qs('nav-documents-label');
  let prefix = button.querySelector('.nav-label-prefix');
  if (isPurchasing() && label && !prefix) {
    const group = document.createElement('span');
    group.className = 'nav-label-group';
    prefix = document.createElement('span');
    prefix.className = 'nav-label-prefix';
    prefix.textContent = 'Solicitudes y ';
    label.replaceWith(group);
    group.append(prefix, label);
  } else if (!isPurchasing() && prefix) {
    const group = prefix.parentElement;
    group.replaceWith(label);
  }
}


function showView(name) {
  if (!canAccessView(name)) name = firstAllowedView();
  currentViewName = name;
  for (const view of ['dashboard', 'entities', 'documents', 'products', 'search', 'reports', 'order-detail', 'print']) {
    const element = qs(`view-${view}`);
    if (element) element.hidden = view !== name;
  }
  document.querySelectorAll('.nav-module').forEach(button => {
    if (button.dataset.module === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const labels = { dashboard: 'Panel', entities: config?.labels?.entities || 'Proveedores', documents: config?.labels?.documents || 'Órdenes de Compra', products: config?.labels?.products || 'Productos', search: 'Búsqueda', reports: 'Reportes', 'order-detail': 'Detalle', print: 'Impresión' };
  updateBreadcrumb(labels[name] || name);
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
  if (name === 'reports') renderReports();
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
  if (isPurchasing()) mountChips(select, { labelId: 'supplier-rubros-label', emptyText: 'Sin rubros registrados' });
}

function renderSearchRubroOptions() {
  const select = qs('search-rubros');
  if (!select) return;
  const selected = new Set([...select.selectedOptions].map(option => option.value));
  select.innerHTML = loadRubros()
    .map(rubro => `<option value="${escapeHtml(rubroValue(rubro))}"${selected.has(rubroValue(rubro)) ? ' selected' : ''}>${escapeHtml(rubroLabel(rubro))}</option>`)
    .join('');
  if (isPurchasing()) mountChips(select, { labelId: 'search-rubros-label', emptyText: 'Sin rubros registrados' });
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
  if (isPurchasing()) mountChips(select, { labelId: 'entities-filter-rubros-label', emptyText: 'Sin rubros registrados' });
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
  lastEntityRows = rows;
  const evaluations = isPurchasing() && canUse(PERMISSIONS.REPORTS_VIEW) ? getAllSupplierEvaluations() : {};
  const exportButton = qs('entities-export');
  if (exportButton) exportButton.hidden = !isPurchasing() || !rows.length;
  qs('entity-table-body').innerHTML = rows.length
    ? rows.map(entity => `<tr${isPurchasing() && !supplierIsActive(entity) ? ' class="is-inactive"' : ''}>
        <td>${escapeHtml(entity.name)}${entityTags(entity, evaluations)}</td>
        <td>${escapeHtml(isPurchasing() ? supplierTaxIdentity(entity) : entity.code)}</td>
        <td>${escapeHtml(renderEntityRubroCell(entity))}</td>
        <td>${escapeHtml(entity.origin || '')}</td>
        <td>${escapeHtml(isPurchasing() ? paymentTermLabel(entity.paymentTerms) : entity.paymentTerms ?? '')}</td>
        <td class="table-actions">
          ${canEdit ? `<button type="button" class="secondary" data-action="edit" data-id="${escapeHtml(entity.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
          ${canEdit && isPurchasing() ? `<button type="button" class="secondary" data-action="toggle-status" data-id="${escapeHtml(entity.id)}">${supplierIsActive(entity) ? 'Inactivar' : 'Reactivar'}</button>` : ''}
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
  applyStackedLabels(qs('entity-table'));
  renderEntityCards(rows, { canEdit, canDelete, evaluations });
  const summary = qs('entity-filter-summary');
  if (summary) summary.textContent = isPurchasing() ? entityFilterSummary() : '';
  const clear = qs('entities-filter-clear');
  if (clear) clear.hidden = !(isPurchasing() && hasActiveFilters(entityFilters));
}


// 007 · US1/US6: etiquetas "Inactivo" y calificación A/B/C junto al nombre del proveedor.
let lastEntityRows = [];
let lastDocumentRows = [];

function entityTags(entity, evaluations = {}) {
  if (!isPurchasing()) return '';
  const inactive = supplierIsActive(entity) ? '' : ' <span class="inactive-tag">Inactivo</span>';
  const evaluation = evaluations[entity.entity_id];
  return `${inactive}${evaluation ? ` ${gradeTag(evaluation)}` : ''}`;
}

function exportEntitiesCsv() {
  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'id', label: 'RUT / ID tributario', value: entity => supplierTaxIdentity(entity) },
    { key: 'rubros', label: 'Rubros', value: entity => renderEntityRubroCell(entity) },
    { key: 'origin', label: 'Origen', value: entity => entity.origin || '' },
    { key: 'paymentTerms', label: 'Condición de pago', value: entity => paymentTermLabel(entity.paymentTerms) },
    { key: 'estado', label: 'Estado', value: entity => (supplierIsActive(entity) ? 'Activo' : 'Inactivo') }
  ];
  downloadCsv(csvFilename('proveedores'), toCsv(columns, lastEntityRows));
}

function exportDocumentsCsv() {
  const columns = [
    { key: 'solicitud', label: 'N° solicitud', value: row => formatRequestNumber(row.folio) || row.folio },
    { key: 'oc', label: 'Folio OC', value: row => formatPurchaseOrderFolio(row.ocFolio) || '' },
    { key: 'proveedor', label: 'Proveedor', value: row => row.entityName },
    { key: 'estado', label: 'Estado', value: row => statusFilterLabel(row.status) },
    { key: 'emision', label: 'Fecha de emisión', value: row => (row.startDate ? formatDateMask(row.startDate) : '') },
    { key: 'entrega', label: 'Fecha de entrega', value: row => (row.endDate ? formatDateMask(row.endDate) : '') },
    { key: 'moneda', label: 'Moneda', value: row => row.currency || 'CLP' },
    { key: 'total', label: 'Total', value: row => csvNumber(row.total) }
  ];
  downloadCsv(csvFilename('solicitudes-y-oc'), toCsv(columns, lastDocumentRows));
}

// 005 · US4: vista de tarjetas de proveedores (avatar de iniciales, chips de rubro y origen).
let entityViewMode = 'table';

function initialsOf(name) {
  const words = String(name || '').replace(/^Demo\s+/i, '').split(/\s+/).filter(word => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(word));
  return (words.slice(0, 2).map(word => word[0]).join('') || '?').toUpperCase();
}

function entityRubroNames(entity) {
  const rubros = loadRubros();
  return (entity.rubro_ids || [])
    .map(id => rubros.find(item => rubroValue(item) === String(id)))
    .filter(Boolean)
    .map(rubroLabel);
}

function renderEntityCards(rows, { canEdit, canDelete, evaluations = {} }) {
  const container = qs('entity-cards');
  const toggle = qs('entities-view-toggle');
  const tableWrapper = qs('entity-table')?.closest('.table-wrapper');
  if (!container || !toggle) return;
  toggle.hidden = !isPurchasing();
  const showCards = isPurchasing() && entityViewMode === 'cards';
  container.hidden = !showCards;
  if (tableWrapper) tableWrapper.hidden = showCards;
  for (const button of toggle.querySelectorAll('[data-view-mode]')) {
    button.setAttribute('aria-pressed', button.dataset.viewMode === entityViewMode ? 'true' : 'false');
  }
  if (!showCards) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = rows.length
    ? `<ul class="supplier-card-list">${rows.map(entity => {
        const foreign = String(entity.origin || '').trim() === 'Extranjero';
        const chips = entityRubroNames(entity).map(name => `<li class="chip chip-static">${escapeHtml(name)}</li>`).join('');
        return `<li class="supplier-card">
          <div class="supplier-card-head">
            <span class="avatar" aria-hidden="true">${escapeHtml(initialsOf(entity.name))}</span>
            <div class="supplier-card-title"><strong>${escapeHtml(entity.name)}</strong><span>${escapeHtml(supplierTaxIdentity(entity))}</span></div>
            <span class="origin-tag ${foreign ? 'origin-foreign' : 'origin-national'}">${foreign ? 'Extranjero' : 'Nacional'}</span>
          </div>
          ${entityTags(entity, evaluations) ? `<p class="supplier-card-tags">${entityTags(entity, evaluations)}</p>` : ''}
          ${chips ? `<ul class="chip-list" aria-label="Rubros">${chips}</ul>` : '<p class="supplier-card-muted">Sin rubros</p>'}
          <p class="supplier-card-muted">Condición de pago: ${escapeHtml(paymentTermLabel(entity.paymentTerms) || '—')}</p>
          ${canEdit || canDelete ? `<div class="supplier-card-actions">
            ${canEdit ? `<button type="button" class="secondary" data-card-action="edit" data-id="${escapeHtml(entity.id)}">${icon('edit', { className: 'ui-icon' })}Editar</button>` : ''}
            ${canEdit ? `<button type="button" class="secondary" data-card-action="toggle-status" data-id="${escapeHtml(entity.id)}">${supplierIsActive(entity) ? 'Inactivar' : 'Reactivar'}</button>` : ''}
            ${canDelete ? `<button type="button" class="danger" data-card-action="delete" data-id="${escapeHtml(entity.id)}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>` : ''}
          </div>` : ''}
        </li>`;
      }).join('')}</ul>`
    : '<p class="insight-empty">No hay proveedores para los filtros seleccionados.</p>';
}

function toggleSupplierStatus(entity) {
  const feedback = qs('entity-feedback');
  if (!canUse(PERMISSIONS.ENTITIES_UPDATE)) {
    if (feedback) feedback.textContent = PERMISSION_DENIED;
    return;
  }
  const activate = !supplierIsActive(entity);
  if (!activate && !globalThis.confirm(`¿Inactivar a ${entity.name}? No aparecerá en solicitudes nuevas; sus órdenes existentes no cambian.`)) return;
  try {
    setSupplierStatus(entity.id, activate ? 'activo' : 'inactivo');
    renderEntityTable();
    renderDocumentEntityOptions();
    announce(activate ? `${entity.name} quedó activo.` : `${entity.name} quedó inactivo.`);
  } catch (error) {
    if (feedback) feedback.textContent = error.message;
  }
}

function renderDocumentEntityOptions() {
  const selectedEntity = qs('document-entity').value;
  const selectedEmployee = qs('document-employee').value;
  // 007 · US6: los proveedores inactivos no se ofrecen en solicitudes nuevas (sí el ya elegido).
  qs('document-entity').innerHTML = `<option value="">Seleccionar ${config.labels.entity}</option>` +
    loadEntities()
      .filter(entity => !isPurchasing() || supplierIsActive(entity) || entity.entity_id === selectedEntity)
      .map(entity => `<option value="${escapeHtml(entity.entity_id)}">${escapeHtml(entity.name)}${supplierIsActive(entity) ? '' : ' (inactivo)'}</option>`).join('');
  qs('document-employee').innerHTML = `<option value="">Seleccionar empleado</option>` +
    loadEmployees().map(employee => `<option value="${escapeHtml(employee.id_empleado || employee.id)}">${escapeHtml(employee.nombre || employee.name || '')}</option>`).join('');
  qs('document-entity').value = selectedEntity;
  qs('document-employee').value = selectedEmployee;
  syncRequesterControl();
  renderLineProductOptions();
  renderAreaOptions(qs('document-area')?.value || '');
}

/** 007 · US4: área solicitante (solo áreas activas; obligatoria si existe alguna). */
function renderAreaOptions(selected = '') {
  const select = qs('document-area');
  const field = qs('document-area-field');
  if (!select || !field) return;
  const areas = isPurchasing() ? loadAreas() : [];
  const options = areas.filter(area => area.activa !== false || area.id_area === selected);
  field.hidden = !options.some(area => area.activa !== false) && !selected;
  select.innerHTML = '<option value="">Seleccionar área</option>' + options
    .map(area => `<option value="${escapeHtml(area.id_area)}">${escapeHtml(area.nombre)}${area.activa === false ? ' (inactiva)' : ''}</option>`).join('');
  select.value = selected;
}

/** 007 · US7: guarda el carrito de "Comprar por producto" (una solicitud por proveedor). */
function submitProductPurchase() {
  const feedback = qs('document-feedback');
  if (!canUse(PERMISSIONS.DOCUMENTS_CREATE)) {
    feedback.textContent = PERMISSION_DENIED;
    return;
  }
  const employeeId = qs('document-employee').value;
  const areaVisible = !qs('document-area-field')?.hidden;
  const areaId = areaVisible ? qs('document-area').value : '';
  const rawEndDate = qs('endDate').value;
  const parsedEndDate = parseDateInput(rawEndDate);
  const errors = {};
  if (!employeeId) errors.id_empleado = 'Debe seleccionar un empleado solicitante.';
  if (areaVisible && !areaId) errors.id_area = 'Debe seleccionar el área solicitante.';
  if (rawEndDate && !parsedEndDate.valid) errors.endDate = 'La fecha debe tener formato dd-mm-aaaa.';
  setFieldError('error-document-employee', errors.id_empleado);
  setFieldError('error-document-area', errors.id_area);
  setFieldError('error-endDate', errors.endDate);
  const cartMessage = cartError();
  feedback.textContent = cartMessage;
  if (Object.keys(errors).length || cartMessage) return;
  try {
    const created = createRequestsFromCart(getCart(), {
      id_empleado: employeeId,
      id_area: areaId,
      endDate: parsedEndDate.valid ? parsedEndDate.iso : ''
    });
    clearDocumentForm();
    closeSidePanel({ force: true });
    renderDocumentFilterOptions();
    renderDocumentTable();
    renderDashboard();
    const message = created.length > 1
      ? `Se crearon ${created.length} solicitudes en borrador: ${created.map(order => orderReference(order)).join(', ')}.`
      : `Se creó la solicitud ${orderReference(created[0])} en borrador.`;
    announce(message);
  } catch (error) {
    feedback.textContent = error.message || purchasingErrorMessage(error);
  }
}

function setFieldError(id, message = '') {
  const element = qs(id);
  if (element) element.textContent = message || '';
}

function announce(message) {
  let region = qs('app-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'app-announcer';
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  region.textContent = message;
  region.classList.add('is-visible');
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => region.classList.remove('is-visible'), 5000);
}

/** 006: lista de precios del proveedor seleccionado en el formulario (vacía si no tiene). */
function draftPriceList() {
  if (!isPurchasing()) return [];
  const entityId = qs('document-entity')?.value;
  return entityId ? getSupplierPriceList(entityId) : [];
}

function renderLineProductOptions() {
  const select = qs('line-product');
  if (!select) return;
  const selected = select.value;
  const priceList = draftPriceList();
  const options = priceList.length
    ? productsForSupplier(loadProducts(), priceList, draftCurrency).map(({ product, entry }) =>
        `<option value="${escapeHtml(product.id_producto || product.id)}" data-price="${escapeHtml(entry.precio)}">${escapeHtml(product.nombre || product.name || '')} · ${escapeHtml(formatMoney(entry.precio, entry.moneda || draftCurrency))}</option>`)
    : loadProducts().map(product => `<option value="${escapeHtml(product.id_producto || product.id)}">${escapeHtml(product.nombre || product.name || '')}</option>`);
  select.innerHTML = '<option value="">Seleccionar producto</option>' + options.join('');
  select.value = [...select.options].some(option => option.value === selected) ? selected : '';
  syncLineCostFromPriceList();
}

/** 006: con lista de precios, el costo unitario se completa desde la lista y no es editable. */
function syncLineCostFromPriceList() {
  const cost = qs('line-cost');
  if (!cost) return;
  const priceList = draftPriceList();
  const help = qs('line-cost-help');
  if (!priceList.length) {
    cost.readOnly = false;
    if (help) help.hidden = true;
    return;
  }
  cost.readOnly = true;
  if (help) help.hidden = false;
  const entry = priceList.find(item => item.id_producto === qs('line-product')?.value);
  cost.value = entry ? String(entry.precio) : '';
}

/** 006: al cambiar proveedor o moneda, reprecia el borrador y quita productos fuera de la lista. */
function applyPriceListToDraft() {
  const priceList = draftPriceList();
  if (!priceList.length || currentOrderId) return '';
  const allowed = productsForSupplier(loadProducts(), priceList, draftCurrency);
  const prices = new Map(allowed.map(({ entry }) => [entry.id_producto, Number(entry.precio)]));
  const before = draftLines.length;
  draftLines = draftLines
    .filter(line => prices.has(line.id_producto))
    .map(line => ({ ...line, costo_unitario: prices.get(line.id_producto) }));
  const removed = before - draftLines.length;
  return removed > 0
    ? `Se quitaron ${removed} línea(s) con productos que no están en la lista de precios del proveedor.`
    : '';
}

function renderDocumentFilterOptions() {
  const statusSelect = qs('documents-filter-status');
  if (statusSelect) {
    const statuses = config.statusLifecycle?.statuses || [];
    // 006: en Compras cada opción tiene un nombre único (grupo por tipo de documento + estado específico).
    const filterOptions = isPurchasing()
      ? STATUS_FILTER_OPTIONS.filter(option => option.statuses.every(status => statuses.includes(status)))
      : statuses.map(status => ({ value: status, label: status }));
    if (documentFilters.status && !filterOptions.some(option => option.value === documentFilters.status)) documentFilters.status = '';
    const options = ['<option value="">Todos</option>']
      .concat(filterOptions.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`));
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
  if (qs('documents-filter-from')) qs('documents-filter-from').value = formatDateMask(documentFilters.from);
  if (qs('documents-filter-to')) qs('documents-filter-to').value = formatDateMask(documentFilters.to);
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

function renderFolioCell(document) {
  const request = formatRequestNumber(document.folio) || String(document.folio ?? '');
  const oc = formatPurchaseOrderFolio(document.ocFolio);
  return `<span class="request-number">${escapeHtml(request)}</span>${oc ? `<span class="oc-folio">${escapeHtml(oc)}</span>` : ''}`;
}

// 005 · US3: vista tablero (solo lectura) por columnas de estado, sobre las mismas filas filtradas.
let documentViewMode = 'table';
const BOARD_COLUMNS = Object.freeze([
  ['borrador', 'Solicitud – Borrador'],
  ['pendiente', 'Solicitud – Pendiente de aprobación'],
  ['aprobado', 'OC emitida – Aprobada'],
  ['recibido', 'OC – Recibida'],
  ['cancelado', 'Cancelada']
]);

function renderDocumentBoard(rows, entityNames) {
  const board = qs('document-board');
  const toggle = qs('documents-view-toggle');
  const tableWrapper = qs('document-table')?.closest('.table-wrapper');
  if (!board || !toggle) return;
  const purchasing = isPurchasing();
  toggle.hidden = !purchasing;
  const showBoard = purchasing && documentViewMode === 'board';
  board.hidden = !showBoard;
  if (tableWrapper) tableWrapper.hidden = showBoard;
  for (const button of toggle.querySelectorAll('[data-view-mode]')) {
    button.setAttribute('aria-pressed', button.dataset.viewMode === documentViewMode ? 'true' : 'false');
  }
  if (!showBoard) {
    board.innerHTML = '';
    return;
  }
  const today = new Date();
  board.innerHTML = BOARD_COLUMNS.map(([status, label]) => {
    const items = rows.filter(row => row.status === status);
    const cards = items.map(row => {
      const reference = [formatRequestNumber(row.folio) || row.folio, formatPurchaseOrderFolio(row.ocFolio)].filter(Boolean).join(' · ');
      const overdue = isOverdueOrder(row, today);
      return `<li><button type="button" class="board-card" data-action="board-view-order" data-id="${escapeHtml(row.id)}" aria-label="Ver detalle de ${escapeHtml(reference)}">
        <span class="board-card-head"><strong>${escapeHtml(reference)}</strong>${overdue ? '<span class="board-flag">Atrasada</span>' : ''}</span>
        <span class="board-card-supplier">${escapeHtml(row.entityName ?? entityNames.get(row.entity_id) ?? '')}</span>
        <span class="board-card-foot"><span>Entrega ${escapeHtml(formatDate(row.endDate))}</span><strong>${escapeHtml(formatMoney(row.total ?? row.totalAmount, row.currency || 'CLP'))}</strong></span>
      </button></li>`;
    }).join('');
    return `<section class="board-column board-column-${status}" aria-labelledby="board-heading-${status}">
      <h3 id="board-heading-${status}"><span>${escapeHtml(label)}</span><span class="board-count">${items.length}</span></h3>
      <ul class="board-list">${cards || '<li class="board-empty">Sin órdenes</li>'}</ul>
    </section>`;
  }).join('');
}

function setDocumentViewMode(mode) {
  documentViewMode = mode === 'board' ? 'board' : 'table';
  renderDocumentTable();
}

function documentFilterSummary() {
  const entity = loadEntities().find(item => item.entity_id === documentFilters.entityId);
  return filterSummary([
    ['Estado', documentFilters.status ? statusFilterLabel(documentFilters.status) : ''],
    ['Proveedor', entity?.name || ''],
    ['Desde', documentFilters.from ? formatDateMask(documentFilters.from) : ''],
    ['Hasta', documentFilters.to ? formatDateMask(documentFilters.to) : ''],
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
  lastDocumentRows = sorted;
  const documentsExport = qs('documents-export');
  if (documentsExport) documentsExport.hidden = !isPurchasing() || !sorted.length;
  const canEdit = canUse(PERMISSIONS.DOCUMENTS_UPDATE);
  const canDelete = canUse(PERMISSIONS.DOCUMENTS_DELETE);
  const canCreate = canUse(PERMISSIONS.DOCUMENTS_CREATE);
  qs('document-table-body').innerHTML = sorted.length
    ? sorted.map(document => {
        const status = isPurchasing() ? renderStatusBadge(document.status) : (document.status ? `<span class="status-badge">${escapeHtml(document.status)}</span>` : '');
        return `<tr data-order-id="${escapeHtml(document.id)}" tabindex="0" role="button" aria-label="Ver detalle de la orden ${escapeHtml(document.folio)}">
        <td>${isPurchasing() ? renderFolioCell(document) : escapeHtml(document.folio)}</td>
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
  applyStackedLabels(qs('document-table'));
  renderDocumentBoard(sorted, entityNames);
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
    replacement.setAttribute('aria-describedby', 'currency-help');
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
  syncCurrencyHelp(origin);
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
  // 006: la solicitud no pide folio; el correlativo se asigna automáticamente al guardar.
  const folioField = qs('folio')?.closest('.field');
  if (folioField) folioField.hidden = true;
  // 005 · US3 (FR-020/021): la sección heredada de totales manuales queda oculta (todos sus campos
  // ya lo estaban); el formulario queda Cabecera → Detalle de compra → Totales.
  const legacySection = qs('document-legacy-fields');
  if (legacySection) legacySection.hidden = true;
}

/** 006: texto de ayuda de Moneda según el origen del proveedor. */
function syncCurrencyHelp(origin) {
  const help = qs('currency-help');
  if (!help) return;
  help.hidden = !isPurchasing();
  help.textContent = origin === 'Extranjero'
    ? 'Proveedor extranjero: elige USD o EUR.'
    : 'Moneda fija CLP para proveedores nacionales.';
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
  // 005 · US3 (FR-021): sin líneas no se muestra una tarjeta de totales vacía.
  const totals = qs('document-totals');
  if (totals && isPurchasing()) totals.hidden = draftLines.length === 0;
  const totalsHeading = qs('document-totals-heading');
  if (totalsHeading && totals) totalsHeading.hidden = totals.hidden;
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
  const priceList = draftPriceList();
  let notInList = false;
  if (priceList.length && line.id_producto) {
    const entry = productsForSupplier(loadProducts(), priceList, draftCurrency)
      .find(item => item.entry.id_producto === line.id_producto)?.entry;
    if (entry) line.costo_unitario = entry.precio;
    else notInList = true;
  }
  const validation = validatePurchaseOrderLine(line, { existingLines: draftLines });
  if (notInList) {
    validation.errors.id_producto = purchasingErrorMessage('PRODUCT_NOT_IN_PRICE_LIST');
    validation.valid = false;
  }
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
    canManagePrices: canUse(PERMISSIONS.PRICELISTS_MANAGE),
    requirePriceLinks: Boolean(activeSession),
    formatMoney,
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
      `${created.supplierPrices?.length || 0} precios acordados`,
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
    renderStatus: renderStatusBadge,
    ...(isPurchasing() ? gestionDetailOptions(detail, order) : {})
  };
}

/** 007 · US4/US6: área, bloque de presupuesto y botón "Duplicar" en el detalle. */
function gestionDetailOptions(detail, order) {
  const options = {};
  const areaId = detail.metadata?.id_area || getOrderMetadata(order.id)?.id_area;
  const area = areaId ? loadAreas().find(item => item.id_area === areaId) : null;
  if (areaId) options.areaName = area ? `${area.nombre}${area.activa === false ? ' (inactiva)' : ''}` : 'Área eliminada';
  const budget = budgetInfoFor(order);
  if (budget) options.extraHeaderHtml = budgetBlockHtml(budget);
  if (canUse(PERMISSIONS.DOCUMENTS_CREATE) && !detail.isLegacy) {
    options.extraActionsHtml = `<button type="button" class="secondary" data-action="duplicate-order">${icon('plus', { className: 'ui-icon' })}Duplicar</button>`;
  }
  return options;
}

function budgetInfoFor(order) {
  if (!canUse(PERMISSIONS.BUDGETS_MANAGE) && !canUse(PERMISSIONS.ORDERS_APPROVE)) return null;
  try {
    return getAreaBudgetForOrder(order.id);
  } catch {
    return null;
  }
}

function budgetBlockHtml(info) {
  const month = info.month ? `${info.month.slice(5, 7)}-${info.month.slice(0, 4)}` : '';
  if (!info.defined) {
    return `<div class="order-budget" id="order-budget"><strong>Presupuesto ${escapeHtml(info.area?.nombre || '')} · ${escapeHtml(month)}</strong><span>Sin presupuesto definido para el mes.</span></div>`;
  }
  const pending = info.availableAfter !== info.available;
  return `<div class="order-budget${info.exceeds ? ' is-over' : ''}" id="order-budget">
    <strong>Presupuesto ${escapeHtml(info.area?.nombre || '')} · ${escapeHtml(month)}</strong>
    <span>Presupuesto ${escapeHtml(formatMoney(info.budget, 'CLP'))} · Gastado ${escapeHtml(formatMoney(info.spent, 'CLP'))} · Disponible ${escapeHtml(formatMoney(info.available, 'CLP'))}</span>
    ${pending && info.availableAfter >= 0 ? `<span>Si se aprueba esta solicitud quedan <strong>${escapeHtml(formatMoney(info.availableAfter, 'CLP'))}</strong>.</span>` : ''}
    ${info.exceeds ? `<span class="budget-warning">⚠ Excede el presupuesto del área en ${escapeHtml(formatMoney(info.excessAmount, 'CLP'))}.</span>` : ''}
    ${info.currency && info.currency !== 'CLP' ? '<span class="muted">Esta orden está en moneda extranjera y no se descuenta del presupuesto en CLP.</span>' : ''}
  </div>`;
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

/** 007 · US6: crea una solicitud nueva en borrador con las mismas líneas y precios vigentes. */
function duplicateCurrentOrder() {
  const feedback = qs('order-actions').querySelector('.feedback');
  if (!canUse(PERMISSIONS.DOCUMENTS_CREATE)) {
    if (feedback) feedback.textContent = PERMISSION_DENIED;
    return;
  }
  try {
    const metadata = getOrderMetadata(currentOrderId);
    const area = metadata?.id_area ? loadAreas().find(item => item.id_area === metadata.id_area) : null;
    const result = duplicatePurchaseOrder(currentOrderId, {
      id_empleado: activeSession?.role === 'comprador' ? ownEmployeeId() : (metadata?.id_empleado || ownEmployeeId()),
      ...(area && area.activa !== false ? { id_area: area.id_area } : {})
    });
    renderDocumentTable();
    renderDashboard();
    openOrderDetail(result.order.id);
    const message = `Solicitud ${orderReference(result.order)} creada como copia.${result.omitted.length ? ` Se omitieron ${result.omitted.length} producto(s) sin precio vigente.` : ''}`;
    const nextFeedback = qs('order-actions').querySelector('.feedback');
    if (nextFeedback) nextFeedback.textContent = message;
    announce(message);
  } catch (error) {
    if (feedback) feedback.textContent = error.message || purchasingErrorMessage(error);
  }
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
    ? statuses.map(status => `<li data-status="${escapeHtml(status)}"${isPurchasing() ? ' role="button" tabindex="0"' : ''}><span>${isPurchasing() ? `<span class="status-dot status-dot-${escapeHtml(status)}" aria-hidden="true"></span>` : ''}${escapeHtml(isPurchasing() ? statusFilterLabel(status) : status)}</span><strong>${documents.filter(document => document.status === status).length}</strong></li>`).join('')
    : '<li class="empty-row">Sin estados configurados.</li>';
  const today = new Date();
  const overdue = documents.filter(document => {
    if (!document.endDate || ['recibido', 'cancelado'].includes(document.status)) return false;
    const [year, month, day] = document.endDate.split('-').map(Number);
    return new Date(year, month - 1, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;
  qs('stat-overdue').textContent = String(overdue);
  renderDashboardInsights(documents, entities);
  if (isPurchasing()) {
    renderReorderCard();
    renderNotifications();
  }
}

/** 005 · US2: detalle de indicadores, gráficos, top 5 y "Requiere tu atención" (solo lectura). */
function renderDashboardInsights(documents, entities) {
  const container = qs('dashboard-insights');
  if (!container) return;
  container.hidden = !isPurchasing() || !canUse(PERMISSIONS.DOCUMENTS_VIEW);
  for (const id of ['stat-entities-detail', 'stat-documents-detail', 'stat-overdue-detail', 'stat-products-detail']) {
    if (qs(id)) qs(id).textContent = '';
  }
  if (container.hidden) return;
  const today = new Date();
  const metadata = new Map(loadOrderMetadata().map(item => [item.id_orden_compra, item]));
  const orders = documents.map(document => ({ ...document, id_empleado: metadata.get(document.id)?.id_empleado || '' }));
  const statuses = config.statusLifecycle?.statuses || [];

  const foreign = entities.filter(entity => String(entity.origin || '').trim() === 'Extranjero').length;
  setText('stat-entities-detail', entities.length ? `${entities.length - foreign} nacionales · ${foreign} extranjeros` : 'Sin proveedores registrados');
  const emitted = orders.filter(order => ['aprobado', 'recibido'].includes(order.status)).length;
  const requests = orders.filter(order => ['borrador', 'pendiente'].includes(order.status)).length;
  setText('stat-documents-detail', `${requests} solicitudes · ${emitted} OC emitidas`);
  setText('stat-overdue-detail', 'Entrega vencida y sin recibir');
  const products = loadProducts();
  const outOfStock = products.filter(product => Number(product.stock || 0) === 0).length;
  setText('stat-products-detail', outOfStock ? `${outOfStock} sin stock` : 'Todos con stock');

  const counts = countByStatus(orders, statuses).map(item => ({
    ...item,
    label: statusFilterLabel(item.status),
    shortLabel: STATUS_SHORT_LABELS[item.status] || item.status
  }));
  qs('chart-status').innerHTML = orders.length
    ? statusBarChartSvg(counts, { title: 'Órdenes por estado' })
    : '<p class="insight-empty">Aún no hay órdenes registradas.</p>';
  qs('chart-status-table').querySelector('tbody').innerHTML = counts
    .map(item => `<tr><td>${escapeHtml(item.label)}</td><td>${item.count}</td></tr>`).join('');

  const spend = monthlySpend(orders, { today, months: 6 });
  const mainCurrency = spend.currencies[0] || 'CLP';
  setText('chart-spend-subtitle', `Últimos 6 meses por fecha de emisión · ${mainCurrency}`);
  qs('chart-spend').innerHTML = spend.currencies.length
    ? spendColumnsSvg(spend.buckets, mainCurrency, { formatMoney, title: 'Gasto mensual' })
    : '<p class="insight-empty">Sin OC emitidas en los últimos 6 meses.</p>';
  qs('chart-spend-table').querySelector('tbody').innerHTML = spend.buckets
    .map(bucket => `<tr><td>${escapeHtml(bucket.label)}</td><td>${escapeHtml(spend.currencies.map(currency => formatMoney(bucket.totals[currency] || 0, currency)).join(' · ') || formatMoney(0, 'CLP'))}</td></tr>`).join('');
  const others = spend.currencies.slice(1).map(currency => {
    const total = spend.buckets.reduce((sum, bucket) => sum + (bucket.totals[currency] || 0), 0);
    return `${formatMoney(total, currency)} en ${currency}`;
  });
  setText('chart-spend-other', others.length ? `También: ${others.join(' · ')} (sin convertir).` : '');

  const topSection = qs('insight-top');
  if (topSection) topSection.hidden = !canUse(PERMISSIONS.ENTITIES_VIEW);
  const top = topSuppliers(orders, entities, { limit: 5 });
  const currencies = Object.keys(top).sort((a, b) => (a === 'CLP' ? -1 : b === 'CLP' ? 1 : a.localeCompare(b)));
  qs('top-suppliers').innerHTML = currencies.length
    ? currencies.map(currency => {
        const rows = top[currency];
        const max = Math.max(1, ...rows.map(row => row.total));
        return `<div class="top-group"><h3>${escapeHtml(currency)}</h3><ol class="top-list">${rows.map(row => `<li>
          <span class="top-name">${escapeHtml(row.name)}</span>
          <span class="top-bar" aria-hidden="true"><span style="width:${Math.max(4, Math.round((row.total / max) * 100))}%"></span></span>
          <strong class="top-amount">${escapeHtml(formatMoney(row.total, currency))}</strong>
        </li>`).join('')}</ol></div>`;
      }).join('')
    : '<p class="insight-empty">Sin OC emitidas todavía.</p>';

  const role = activeSession?.role || 'administrador';
  const items = attentionItemsForRole(role, orders, { suppliers: entities, ownEmployeeId: ownEmployeeId(), today });
  setText('attention-subtitle', `${attentionTitle(role)} · ${items.length}`);
  qs('attention-list').innerHTML = items.length
    ? items.slice(0, 6).map(item => `<li><button type="button" class="attention-item" data-action="open-attention" data-id="${escapeHtml(item.id)}">
        <span class="attention-main"><strong>${escapeHtml(item.reference)}</strong><span>${escapeHtml(item.supplier)}</span></span>
        <span class="attention-meta"><span class="attention-reason${isOverdueOrder(item, today) ? ' is-overdue' : ''}">${escapeHtml(item.reason)}</span><strong>${escapeHtml(formatMoney(item.total, item.currency))}</strong></span>
      </button></li>`).join('')
    : '<li class="insight-empty">Nada pendiente por ahora.</li>';
}

const STATUS_SHORT_LABELS = Object.freeze({
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  aprobado: 'Aprobada',
  recibido: 'Recibida',
  cancelado: 'Cancelada'
});

function setText(id, value) {
  const element = qs(id);
  if (element) element.textContent = value;
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
    if (isPurchasing()) {
      // 006: sin separadores vacíos; los extranjeros muestran su identificación tributaria.
      const parts = [entity.name, supplierTaxIdentity(entity), rubros].filter(part => String(part ?? '').trim());
      const label = parts.map(part => escapeHtml(part)).join(' · ') + (custom ? ` · ${custom}` : '');
      return `<article class="entity-item"><button type="button" class="link-button" data-action="open-supplier-summary" data-id="${escapeHtml(entity.entity_id)}" aria-label="Ver ficha de ${escapeHtml(entity.name)}">${label}</button>${linkedStatus ? ` ${linkedStatus}` : ''}</article>`;
    }
    return `<article class="entity-item">${escapeHtml(entity.name)} · ${escapeHtml(entity.code)}${rubros ? ` · ${escapeHtml(rubros)}` : ''}${custom ? ` · ${custom}` : ''}${linkedStatus ? ` ${linkedStatus}` : ''}</article>`;
  }).join('');
  for (const document of loadDocuments()) {
    const numbers = isPurchasing() ? ` ${formatRequestNumber(document.folio)} ${formatPurchaseOrderFolio(document.ocFolio)}` : '';
    const haystack = `${document.folio} ${document.startDate} ${document.endDate} ${document.status || ''}${numbers}`.toLowerCase();
    if (query && haystack.includes(query.toLowerCase())) {
      const badge = isPurchasing()
        ? renderStatusBadge(document.status)
        : `<span class="status-badge">${escapeHtml(document.status || '')}</span>`;
      const reference = isPurchasing()
        ? [formatRequestNumber(document.folio), formatPurchaseOrderFolio(document.ocFolio)].filter(Boolean).join(' · ')
        : `Folio ${document.folio}`;
      qs('search-results-list').insertAdjacentHTML('beforeend', `<article class="document-item">${escapeHtml(reference)} · ${escapeHtml(isPurchasing() ? statusLabel(document.status) : document.status || '')}${badge}</article>`);
    }
  }
  qs('search-empty').hidden = qs('search-results-list').children.length > 0;
  const summary = qs('supplier-summary');
  if (summary && summary.dataset.entityId && !loadEntities().some(entity => entity.entity_id === summary.dataset.entityId)) {
    closeSupplierSummary();
  }
}

/** 006: ficha del proveedor desde Búsqueda (datos, historial de OC y monto total comprado). */
function openSupplierSummary(entityId) {
  const container = qs('supplier-summary');
  if (!container || !canUse(PERMISSIONS.SEARCH_VIEW)) return;
  const summary = getSupplierSummary(entityId);
  if (!summary) return;
  container.innerHTML = renderSupplierSummary(summary, {
    escapeHtml,
    formatMoney,
    formatDate,
    paymentTermLabel,
    rubroNames: renderEntityRubroCell(summary.supplier),
    canViewCreditLimit: canViewCreditLimit(activeSession),
    statusBadge: renderStatusBadge,
    ...(isPurchasing() && canUse(PERMISSIONS.REPORTS_VIEW)
      ? { evaluation: getAllSupplierEvaluations()[entityId], gradeTag }
      : {}),
    productName: productId => {
      const product = loadProducts().find(item => (item.id_producto || item.id) === productId);
      return product?.nombre || product?.name || '';
    }
  });
  container.dataset.entityId = entityId;
  container.hidden = false;
  container.querySelector('h2')?.focus();
}

function closeSupplierSummary() {
  const container = qs('supplier-summary');
  if (!container) return;
  container.hidden = true;
  container.innerHTML = '';
  delete container.dataset.entityId;
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
      paymentTerms: qs('docPaymentTerms')?.value ?? '',
      ...(qs('document-area') && !qs('document-area-field')?.hidden ? { id_area: qs('document-area').value } : {})
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
  resetPurchaseMode({ editing: true });
  if (qs('document-area')) {
    renderAreaOptions(metadata?.id_area || '');
  }
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
    resetPurchaseMode({ editing: false, enabled: isPurchasing() });
    showView('documents');
    openSidePanel({
      title: `Agregar ${config.labels.document}`,
      form: qs('document-form'),
      trigger: document.activeElement,
      focus: isProductMode() ? qs('pbp-product') : qs('document-entity')
    });
  };
  qs('action-new-entity').addEventListener('click', openNewEntity);
  qs('entity-list-new')?.addEventListener('click', openNewEntity);
  qs('action-open-entities').addEventListener('click', () => showView('entities'));
  qs('action-new-document').addEventListener('click', openNewDocument);
  qs('entities-export')?.addEventListener('click', exportEntitiesCsv);
  qs('documents-export')?.addEventListener('click', exportDocumentsCsv);
  qs('document-list-new')?.addEventListener('click', openNewDocument);
  qs('action-find').addEventListener('click', () => { showView('search'); qs('search-input').focus(); });
  qs('search-input').addEventListener('input', renderSearch);
  qs('search-rubros')?.addEventListener('change', renderSearch);
  qs('search-results-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action="open-supplier-summary"]');
    if (button) openSupplierSummary(button.dataset.id);
  });
  qs('supplier-summary')?.addEventListener('click', event => {
    if (event.target.closest('[data-action="close-supplier-summary"]')) closeSupplierSummary();
  });
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
  // 007 (pendiente del 005): filtros de fecha en formato dd-mm-aaaa con máscara.
  for (const [id, key] of [['documents-filter-from', 'from'], ['documents-filter-to', 'to']]) {
    const input = qs(id);
    if (!input) continue;
    input.type = 'text';
    input.placeholder = 'dd-mm-aaaa';
    input.setAttribute('inputmode', 'numeric');
    input.autocomplete = 'off';
    const apply = () => {
      const masked = maskDateInput(input.value);
      if (input.value !== masked) input.value = masked;
      const parsed = parseDateInput(masked);
      const next = parsed.valid ? parsed.iso : '';
      if (masked && !parsed.valid) return;
      if (documentFilters[key] === next) return;
      documentFilters[key] = next;
      renderDocumentTable();
    };
    input.addEventListener('input', apply);
    input.addEventListener('change', apply);
  }
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
  qs('attention-list')?.addEventListener('click', event => {
    const button = event.target.closest('[data-action="open-attention"]');
    if (button) openOrderDetail(button.dataset.id);
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

  qs('sidebar-toggle').addEventListener('click', () => {
    if (isSmallScreen()) {
      toggleMobileNav();
      return;
    }
    qs('sidebar').classList.toggle('collapsed');
  });
  qs('sidebar').addEventListener('click', event => {
    if (event.target.closest('.nav-module') && isSmallScreen()) toggleMobileNav(false);
  });

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

  qs('entities-view-toggle')?.addEventListener('click', event => {
    const button = event.target.closest('[data-view-mode]');
    if (!button) return;
    entityViewMode = button.dataset.viewMode === 'cards' ? 'cards' : 'table';
    renderEntityTable();
  });
  qs('entity-cards')?.addEventListener('click', event => {
    const button = event.target.closest('[data-card-action]');
    if (!button) return;
    // Reutiliza exactamente las acciones (y permisos) de la tabla, que sigue en el DOM.
    const target = [...qs('entity-table-body').querySelectorAll('button[data-action]')]
      .find(item => item.dataset.action === button.dataset.cardAction && item.dataset.id === button.dataset.id);
    target?.click();
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
    if (button.dataset.action === 'toggle-status') {
      toggleSupplierStatus(entity);
      return;
    }
    if (!canUse(PERMISSIONS.ENTITIES_DELETE)) {
      qs('entity-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    // 007 · US6: la eliminación sigue en cascada (001 FR-003) pero avisa cuántas órdenes se pierden.
    const linkedOrders = isPurchasing() ? ordersCountForSupplier(entity.entity_id) : 0;
    const deleteText = linkedOrders
      ? `¿Eliminar ${withArticle(config.labels.entity)} ${entity.name}?\n\nTambién se eliminarán sus ${linkedOrders} solicitud(es)/OC asociadas. Si solo quieres dejar de comprarle, usa «Inactivar».`
      : `¿Eliminar ${withArticle(config.labels.entity)} ${entity.name}?`;
    if (!globalThis.confirm(deleteText)) return;
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
      qs('document-feedback').textContent = applyPriceListToDraft();
      renderLineProductOptions();
      renderDraftLines();
    });
    qs('document-form').addEventListener('change', event => {
      if (event.target?.id === 'currency') {
        syncDraftPricing();
        qs('document-feedback').textContent = applyPriceListToDraft();
        renderLineProductOptions();
        renderDraftLines();
      }
      if (event.target?.id === 'line-product') syncLineCostFromPriceList();
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
    if (isPurchasing() && !qs('document-id').value && isProductMode()) {
      submitProductPurchase();
      return;
    }
    if (isPurchasing()) syncDraftPricing();
    const data = collectDocument();
    const id = qs('document-id').value;
    const permission = id ? PERMISSIONS.DOCUMENTS_UPDATE : PERMISSIONS.DOCUMENTS_CREATE;
    if (!canUse(permission)) {
      qs('document-feedback').textContent = PERMISSION_DENIED;
      return;
    }
    if (isPurchasing() && !String(data.folio ?? '').trim()) {
      const current = id ? loadDocuments().find(document => document.id === id) : null;
      data.folio = current?.folio ?? nextRequestFolio();
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
  qs('documents-view-toggle')?.addEventListener('click', event => {
    const button = event.target.closest('[data-view-mode]');
    if (button) setDocumentViewMode(button.dataset.viewMode);
  });
  qs('document-board')?.addEventListener('click', event => {
    const card = event.target.closest('[data-action="board-view-order"]');
    if (card) openOrderDetail(card.dataset.id);
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
    if (action === 'duplicate-order') {
      duplicateCurrentOrder();
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
      let confirmText = `¿Confirmar el cambio de estado a "${statusLabel(nextStatus)}"?`;
      if (isPurchasing() && nextStatus === 'aprobado') {
        const budget = budgetInfoFor(currentDocument || { id: currentOrderId });
        if (budget?.defined && budget.exceeds) {
          confirmText += `\n\nAtención: esta solicitud excede el presupuesto de ${budget.area?.nombre || 'su área'} en ${formatMoney(budget.excessAmount, 'CLP')}. Puedes aprobarla igual.`;
        }
      }
      if (!globalThis.confirm(confirmText)) return;
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
  configureGestion({
    escapeHtml,
    formatMoney,
    canUse,
    getSession: () => activeSession,
    ownEmployeeId,
    openOrderDetail,
    onDataChanged: () => {
      renderDocumentEntityOptions();
      renderDocumentTable();
      renderDashboard();
    }
  });
  configurePurchaseMode({ escapeHtml, formatMoney });
  bindPurchaseMode();
  initGestion();
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
  // 007 · US7: en la aplicación real, la solicitud nueva abre en "Comprar por producto".
  setDefaultPurchaseMode('product');
  const initialTheme = initTheme();
  bindAuthEvents();
  ensureShellScaffold();
  syncThemeToggle(initialTheme);
  bindGlobalSearch((q) => {
    if (!getSession()) return;
    showView('search');
    const input = qs('search-input');
    if (input) { input.value = q || ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  const themeToggle = qs('theme-toggle');
  if (themeToggle && !themeToggle.dataset.bound) {
    themeToggle.dataset.bound = '1';
    themeToggle.addEventListener('click', () => syncThemeToggle(toggleTheme()));
  }
  if (!getSession()) {
    revealLoginGate();
    return;
  }
  hideLoginGate();
  await initApp();
}
