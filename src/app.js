import {
  loadEntities, saveEntities, validateEntity, addEntity, updateEntity, deleteEntity,
  loadDocuments, validateDocument, addDocument, updateDocument, deleteDocument,
  searchEntities
} from './storage.js';
import {
  DEFAULT_CONFIG, PURCHASING_CONFIG, normalizeConfig, loadModuleConfig,
  setActiveConfig, getConfig
} from './module-config.js';

let config;
let configErrors = [];

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
  qs('nav-search-label').textContent = 'Búsqueda';
  qs('action-new-entity-title').textContent =
    labels.entity === 'Entidad' ? 'Nueva Entidad' :
    labels.entity === 'Cliente' ? 'Nuevo Cliente' :
    labels.entity === 'Proveedor' ? 'Nuevo Proveedor' : `Nuevo ${labels.entity}`;
  qs('action-new-document-title').textContent = `Nuevo ${labels.document}`;
  qs('action-open-entities-title').textContent = labels.entities;
  qs('action-find-title').textContent = 'Buscar registros';
  qs('stat-entities-label').textContent = labels.entities;
  qs('stat-documents-label').textContent = labels.documents;
  qs('entities-view-heading').textContent = labels.entities;
  qs('entity-form-heading').textContent = `Agregar / Editar ${labels.entity}`;
  qs('edit-entity-heading').textContent = labels.entity === 'Entidad'
    ? 'Editar o eliminar la entidad'
    : `Editar o eliminar el ${labels.entity.toLowerCase()}`;
  qs('delete-entity').textContent = labels.entity === 'Entidad'
    ? 'Eliminar la entidad seleccionada'
    : `Eliminar el ${labels.entity.toLowerCase()} seleccionado`;
  qs('documents-view-heading').textContent = labels.documents;
  qs('document-form-heading').textContent = `Agregar / Editar ${labels.document}`;
  qs('edit-document-heading').textContent = labels.document === 'Documento'
    ? 'Editar o eliminar el documento'
    : `Editar o eliminar el ${labels.document.toLowerCase()}`;
  qs('delete-document').textContent = labels.document === 'Documento'
    ? 'Eliminar el documento seleccionado'
    : `Eliminar el ${labels.document.toLowerCase()} seleccionado`;
  qs('search-view-heading').textContent = `Buscar ${labels.entities}`;
  qs('submit-button').textContent = `Guardar ${labels.entity}`;
  qs('document-submit-button').textContent = `Guardar ${labels.document}`;
  qs('code').previousElementSibling.textContent = config.moduleName === 'Adquisiciones y Compras' ? 'RUT' : 'Código';
}

function showView(name) {
  for (const view of ['dashboard', 'entities', 'documents', 'search']) {
    qs(`view-${view}`).hidden = view !== name;
  }
  document.querySelectorAll('.nav-module').forEach(button => {
    if (button.dataset.module === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'entities') renderEntitySelectors();
  if (name === 'documents') {
    renderDocumentEntityOptions();
    renderDocumentSelectors();
    renderStatusControl();
  }
  if (name === 'search') renderSearch();
}

function clearEntityForm() {
  qs('entity-id').value = '';
  for (const id of ['name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'creditLimit', 'paymentTerms', 'targetDate']) qs(id).value = '';
  for (const field of config.customFields.filter(item => item.target === 'entity')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = '';
  }
  qs('submit-button').textContent = `Guardar ${config.labels.entity}`;
  document.querySelectorAll('[id^="error-"]').forEach(element => element.textContent = '');
}

function clearDocumentForm() {
  qs('document-id').value = '';
  for (const id of ['document-entity', 'series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'docPaymentTerms', 'notes', 'status']) qs(id).value = '';
  for (const field of config.customFields.filter(item => item.target === 'document')) {
    if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = '';
  }
  qs('document-submit-button').textContent = `Guardar ${config.labels.document}`;
  renderStatusControl();
}

function renderEntitySelectors() {
  const entities = loadEntities();
  const options = entities.map(entity => `<option value="${escapeHtml(entity.id)}">${escapeHtml(entity.name)} — ${escapeHtml(entity.code)}</option>`).join('');
  qs('edit-entity').innerHTML = `<option value="">Seleccionar...</option>${options}`;
}

function renderDocumentEntityOptions() {
  qs('document-entity').innerHTML = `<option value="">Seleccionar ${config.labels.entity}</option>` +
    loadEntities().map(entity => `<option value="${escapeHtml(entity.entity_id)}">${escapeHtml(entity.name)}</option>`).join('');
}

function renderDocumentSelectors() {
  const documents = loadDocuments();
  qs('edit-document').innerHTML = `<option value="">Seleccionar...</option>` +
    documents.map(document => `<option value="${escapeHtml(document.id)}">Folio ${escapeHtml(document.folio)}${document.status ? ` — ${escapeHtml(document.status)}` : ''}</option>`).join('');
  qs('document-list').innerHTML = documents.length
    ? documents.map(document => `<article class="document-item"><strong>Folio ${escapeHtml(document.folio)}</strong>${document.status ? ` · <span class="status-badge">${escapeHtml(document.status)}</span>` : ''}</article>`).join('')
    : '<p>Sin registros.</p>';
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

function renderDashboard() {
  const entities = loadEntities();
  const documents = loadDocuments();
  qs('stat-entities').textContent = String(entities.length);
  qs('stat-documents').textContent = String(documents.length);
  qs('stat-statuses').textContent = String(documents.filter(document => document.status).length);
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
    const custom = customLabels.map(field => entity[field.key] !== undefined && entity[field.key] !== ''
      ? `${escapeHtml(field.label)}: ${escapeHtml(entity[field.key])}` : '').filter(Boolean).join(' · ');
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
    name: qs('name').value, code: qs('code').value, taxId: qs('taxId').value,
    email: qs('email').value, phone: qs('phone').value, address: qs('address').value,
    category: qs('category').value, creditLimit: qs('creditLimit').value,
    paymentTerms: qs('paymentTerms').value, targetDate: qs('targetDate').value
  };
  for (const field of config.customFields.filter(item => item.target === 'entity')) data[field.key] = qs(`cf-${field.key}`).value;
  return data;
}

function collectDocument() {
  const data = {
    entityId: qs('document-entity').value, series: qs('series').value, folio: qs('folio').value,
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
    const element = qs(`error-${key}`) || qs(`error-cf-${key}`) || qs(`error-${key === 'entity_id' ? 'document-entity' : key}`);
    if (element) element.textContent = message;
  }
}

function bindEvents() {
  qs('nav-dashboard').addEventListener('click', () => showView('dashboard'));
  qs('nav-entities').addEventListener('click', () => showView('entities'));
  qs('nav-documents').addEventListener('click', () => showView('documents'));
  qs('nav-search').addEventListener('click', () => showView('search'));
  qs('action-new-entity').addEventListener('click', () => { clearEntityForm(); showView('entities'); qs('name').focus(); });
  qs('action-open-entities').addEventListener('click', () => showView('entities'));
  qs('action-new-document').addEventListener('click', () => { clearDocumentForm(); showView('documents'); qs('document-entity').focus(); });
  qs('action-find').addEventListener('click', () => { showView('search'); qs('search-input').focus(); });
  qs('search-input').addEventListener('input', renderSearch);

  qs('sidebar-toggle').addEventListener('click', () => qs('sidebar').classList.toggle('collapsed'));

  qs('entity-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = collectEntity();
    const id = qs('entity-id').value;
    const validation = validateEntity({ ...data, ...(id ? { id } : {}) });
    showEntityErrors(validation.errors);
    if (!validation.valid) return;
    try {
      if (id) {
        updateEntity(id, data);
      }
      else addEntity(data);
      clearEntityForm();
      renderEntitySelectors();
      if (id) qs('edit-entity').value = id;
      renderDocumentEntityOptions();
      renderDashboard();
    } catch (error) {
      qs('entity-feedback').textContent = error.message;
    }
  });

  qs('edit-entity').addEventListener('change', () => {
    const entity = loadEntities().find(item => item.id === qs('edit-entity').value);
    if (!entity) return;
    qs('entity-id').value = entity.id;
    for (const key of ['name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'creditLimit', 'paymentTerms', 'targetDate']) qs(key).value = entity[key] ?? '';
    for (const field of config.customFields.filter(item => item.target === 'entity')) {
      if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = entity[field.key] ?? '';
    }
    qs('submit-button').textContent = 'Actualizar';
  });

  qs('delete-entity').addEventListener('click', () => {
    const id = qs('edit-entity').value || qs('entity-id').value;
    if (!id || !globalThis.confirm('¿Eliminar el registro seleccionado?')) return;
    deleteEntity(id);
    clearEntityForm();
    renderEntitySelectors();
    renderDocumentEntityOptions();
    renderDocumentSelectors();
    renderDashboard();
  });

  qs('document-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = collectDocument();
    const id = qs('document-id').value;
    const validation = validateDocument(data);
    showEntityErrors(validation.errors);
    if (!validation.valid) return;
    try {
      if (id) updateDocument(id, data);
      else addDocument(data);
      clearDocumentForm();
      renderDocumentSelectors();
      renderDashboard();
    } catch (error) {
      qs('document-feedback').textContent = error.message;
    }
  });

  qs('edit-document').addEventListener('change', () => {
    const document = loadDocuments().find(item => item.id === qs('edit-document').value);
    if (!document) { clearDocumentForm(); return; }
    qs('document-id').value = document.id;
    renderStatusControl(document.id);
    for (const key of ['document-entity', 'series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'notes']) {
      if (key === 'document-entity') qs(key).value = document.entity_id || '';
      else qs(key).value = document[key] ?? '';
    }
    qs('docPaymentTerms').value = document.paymentTerms ?? '';
    qs('status').value = document.status ?? '';
    for (const field of config.customFields.filter(item => item.target === 'document')) {
      if (qs(`cf-${field.key}`)) qs(`cf-${field.key}`).value = document[field.key] ?? '';
    }
    qs('document-submit-button').textContent = `Actualizar ${config.labels.document}`;
  });

  qs('delete-document').addEventListener('click', () => {
    const id = qs('edit-document').value;
    if (!id || !globalThis.confirm('¿Eliminar el documento seleccionado?')) return;
    deleteDocument(id);
    clearDocumentForm();
    renderDocumentSelectors();
    renderDashboard();
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
  setActiveConfig(config);
  document.documentElement.style.setProperty('--accent', config.theme.accentColor);
  relabel();
  renderLogo();
  renderCustomFields('entity', 'entity-custom-fields');
  renderCustomFields('document', 'document-custom-fields');
  renderDocumentEntityOptions();
  renderStatusControl();
  bindEvents();
  renderEntitySelectors();
  renderDocumentSelectors();
  renderDashboard();
  showView('dashboard');
  if (configErrors.length) {
    qs('config-warning').hidden = false;
    qs('config-warning').textContent = `Problemas de configuración: ${configErrors.join('. ')}`;
  } else {
    qs('config-warning').hidden = true;
  }
}

export async function boot() {
  await initApp();
}
