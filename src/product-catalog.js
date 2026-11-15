import {
  loadProducts,
  loadCategories,
  addProduct,
  addCategory,
  updateCategory,
  updateProduct,
  deleteProduct,
  deleteCategory
} from './purchasing-storage.js';
import { icon } from './ui-icons.js';
import { PERMISSION_DENIED_MESSAGE } from './auth.js';
import { mountPanelForm, openSidePanel, closeSidePanel } from './ui-side-panel.js';
import { filterProducts, sortRows } from './purchasing-list-query.js';
import { applySortState, emptyStateRow, filterSummary, toggleSort } from './purchasing-list-view.js';

let catalogOptions = {};
let activeTab = 'catalogo';
let editingProductId = '';
let editingCategoryId = '';
let boundContainer = null;
let boundCanManage = null;

const productFilters = { categoryId: '', query: '' };
const productSort = { key: null, direction: 'asc' };
const categorySort = { key: null, direction: 'asc' };

function qs(id) {
  return document.getElementById(id);
}

function escape(value) {
  if (catalogOptions.escapeHtml) return catalogOptions.escapeHtml(value);
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function canManage() {
  return catalogOptions.canManage !== false;
}

function productId(product) {
  return product.id_producto || product.id;
}

function categoryId(category) {
  return category.id_categoria || category.id;
}

function categoryName(category) {
  return category?.nombre || category?.name || '';
}

function productName(product) {
  return product.nombre || product.name || '';
}

function showFeedback(message, formFeedback = false) {
  const listFeedback = qs('product-feedback');
  if (listFeedback) listFeedback.textContent = message;
  if (formFeedback) {
    const formElement = qs('product-form-feedback');
    if (formElement) formElement.textContent = message;
  }
}

function denyPermission() {
  showFeedback(PERMISSION_DENIED_MESSAGE, true);
}

function setError(id, message) {
  const element = qs(id);
  if (element) element.textContent = message || '';
}

function clearProductErrors() {
  for (const id of ['error-product-nombre', 'error-product-unidad', 'error-product-stock', 'error-product-categoria']) {
    setError(id, '');
  }
}

function clearCategoryErrors() {
  setError('error-category-nombre', '');
}

function renderCategoryOptions(selected = '') {
  const select = qs('product-categoria');
  if (!select) return;
  select.innerHTML = '<option value="">Seleccionar categoría</option>' +
    loadCategories()
      .map(category => `<option value="${escape(categoryId(category))}">${escape(categoryName(category))}</option>`)
      .join('');
  select.value = selected;
}

function renderCategoryFilterOptions() {
  const select = qs('product-filter-category');
  if (!select) return;
  if (productFilters.categoryId && !loadCategories().some(category => String(categoryId(category)) === String(productFilters.categoryId))) {
    productFilters.categoryId = '';
  }
  select.innerHTML = '<option value="">Todas</option>' +
    loadCategories()
      .map(category => `<option value="${escape(categoryId(category))}">${escape(categoryName(category))}</option>`)
      .join('');
  select.value = productFilters.categoryId;
}

function renderProductTable() {
  const body = qs('product-table-body');
  if (!body) return;
  const manage = canManage();
  const categories = new Map(loadCategories().map(category => [String(categoryId(category)), categoryName(category)]));
  const filtered = filterProducts(loadProducts(), productFilters);
  const rows = sortRows(filtered, productSort, {
    nombre: product => productName(product),
    unidad_medida: product => product.unidad_medida || product.unit || '',
    id_categoria: product => categories.get(String(product.id_categoria)) || '',
    stock: product => Number(product.stock || 0)
  });
  body.innerHTML = rows.length
    ? rows.map(product => `<tr>
        <td>${escape(productName(product))}</td>
        <td>${escape(product.unidad_medida || product.unit || '')}</td>
        <td>${escape(categories.get(String(product.id_categoria)) || '')}</td>
        <td>${escape(Number(product.stock || 0))}</td>
        ${manage ? `<td class="table-actions">
          <button type="button" class="secondary" data-action="edit-product" data-id="${escape(productId(product))}">${icon('edit', { className: 'ui-icon' })}Editar</button>
          <button type="button" class="danger" data-action="delete-product" data-id="${escape(productId(product))}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>
        </td>` : ''}
      </tr>`).join('')
    : emptyStateRow({
        colspan: manage ? 5 : 4,
        message: 'No hay productos para los filtros seleccionados.',
        action: manage ? 'new-product' : '',
        actionLabel: '+ Nuevo'
      });
  applySortState(qs('product-table'), productSort);
  const summary = qs('product-filter-summary');
  if (summary) {
    summary.textContent = filterSummary([
      ['Buscar', productFilters.query],
      ['Categoría', categories.get(String(productFilters.categoryId)) || '']
    ]);
  }
  const clear = qs('product-filter-clear');
  if (clear) clear.hidden = !(productFilters.query || productFilters.categoryId);
}

function renderCategoryTable() {
  const body = qs('category-table-body');
  if (!body) return;
  const manage = canManage();
  const products = loadProducts();
  const rows = sortRows(loadCategories(), categorySort, {
    nombre: category => categoryName(category),
    products: category => products.filter(product => String(product.id_categoria) === String(categoryId(category))).length
  }).map(category => ({
    category,
    count: products.filter(product => String(product.id_categoria) === String(categoryId(category))).length
  }));
  body.innerHTML = rows.length
    ? rows.map(({ category, count }) => `<tr>
        <td>${escape(categoryName(category))}</td>
        <td>${escape(count)}</td>
        ${manage ? `<td class="table-actions">
          <button type="button" class="secondary" data-action="edit-category" data-id="${escape(categoryId(category))}">${icon('edit', { className: 'ui-icon' })}Editar</button>
          <button type="button" class="danger" data-action="delete-category" data-id="${escape(categoryId(category))}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>
        </td>` : ''}
      </tr>`).join('')
    : emptyStateRow({
        colspan: manage ? 3 : 2,
        message: 'Sin categorías registradas.',
        action: manage ? 'new-category' : '',
        actionLabel: '+ Nueva'
      });
  applySortState(qs('category-table'), categorySort);
}

function clearProductForm() {
  editingProductId = '';
  if (qs('product-id')) qs('product-id').value = '';
  if (qs('product-nombre')) qs('product-nombre').value = '';
  if (qs('product-unidad')) qs('product-unidad').value = '';
  if (qs('product-stock')) qs('product-stock').value = '0';
  if (qs('product-submit-button')) qs('product-submit-button').textContent = 'Guardar producto';
  if (qs('product-form-feedback')) qs('product-form-feedback').textContent = '';
  clearProductErrors();
  renderCategoryOptions();
}

function clearCategoryForm() {
  editingCategoryId = '';
  if (qs('category-id')) qs('category-id').value = '';
  if (qs('category-nombre')) qs('category-nombre').value = '';
  if (qs('category-submit-button')) qs('category-submit-button').textContent = 'Guardar categoría';
  if (qs('category-form-feedback')) qs('category-form-feedback').textContent = '';
  clearCategoryErrors();
}

function validateCategoryName(name) {
  if (!name) return { valid: false, message: 'El nombre de la categoría es obligatorio.' };
  const duplicate = loadCategories().some(category => (
    String(categoryId(category)) !== String(editingCategoryId || '')
    && categoryName(category).trim().toLowerCase() === name.toLowerCase()
  ));
  if (duplicate) return { valid: false, message: 'Ya existe una categoría con ese nombre.' };
  return { valid: true, message: '' };
}

function submitProduct() {
  if (!canManage()) {
    denyPermission();
    return;
  }
  const data = {
    nombre: qs('product-nombre').value,
    unidad_medida: qs('product-unidad').value,
    stock: qs('product-stock').value,
    id_categoria: qs('product-categoria').value
  };
  const errors = {};
  if (!String(data.nombre || '').trim()) errors.nombre = 'El nombre es obligatorio';
  if (!String(data.unidad_medida || '').trim()) errors.unidad_medida = 'La unidad de medida es obligatoria';
  if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) errors.stock = 'El stock debe ser un entero no negativo';
  if (!data.id_categoria || !loadCategories().some(category => String(categoryId(category)) === String(data.id_categoria))) {
    errors.id_categoria = 'La categoría es obligatoria';
  }
  clearProductErrors();
  setError('error-product-nombre', errors.nombre);
  setError('error-product-unidad', errors.unidad_medida);
  setError('error-product-stock', errors.stock);
  setError('error-product-categoria', errors.id_categoria);
  if (Object.keys(errors).length) return;
  try {
    const payload = {
      nombre: String(data.nombre).trim(),
      unidad_medida: String(data.unidad_medida).trim(),
      stock: Number(data.stock),
      id_categoria: data.id_categoria
    };
    if (editingProductId) updateProduct(editingProductId, payload);
    else addProduct(payload);
    clearProductForm();
    closeSidePanel({ force: true });
    showFeedback('');
    renderCategoryFilterOptions();
    renderProductTable();
    renderCategoryTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    showFeedback(error.message, true);
  }
}

function submitCategory() {
  if (!canManage()) {
    denyPermission();
    return;
  }
  const name = String(qs('category-nombre').value || '').trim();
  const validation = validateCategoryName(name);
  clearCategoryErrors();
  if (!validation.valid) {
    setError('error-category-nombre', validation.message);
    return;
  }
  try {
    if (editingCategoryId) updateCategory(editingCategoryId, { nombre: name });
    else addCategory({ nombre: name });
    clearCategoryForm();
    closeSidePanel({ force: true });
    if (qs('category-feedback')) qs('category-feedback').textContent = '';
    renderCategoryOptions();
    renderCategoryFilterOptions();
    renderProductTable();
    renderCategoryTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    if (qs('category-form-feedback')) qs('category-form-feedback').textContent = error.message;
  }
}

function openProductForm(product = null) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  ensureForms(true);
  clearProductForm();
  if (product) {
    editingProductId = productId(product);
    qs('product-id').value = editingProductId;
    qs('product-nombre').value = productName(product);
    qs('product-unidad').value = product.unidad_medida || product.unit || '';
    qs('product-stock').value = product.stock ?? 0;
    renderCategoryOptions(product.id_categoria || '');
    qs('product-submit-button').textContent = 'Actualizar producto';
  }
  openSidePanel({
    title: product ? 'Editar producto' : 'Agregar producto',
    form: qs('product-form'),
    trigger: document.activeElement,
    focus: qs('product-nombre')
  });
}

function editProduct(id) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  const product = loadProducts().find(item => String(productId(item)) === String(id));
  if (!product) return;
  openProductForm(product);
}

function removeProduct(id) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  if (!globalThis.confirm('¿Eliminar este producto del catálogo?')) return;
  try {
    deleteProduct(id);
    if (editingProductId === id) clearProductForm();
    showFeedback('');
    renderProductTable();
    renderCategoryTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    showFeedback(error.message, true);
  }
}

function openCategoryForm(category = null) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  ensureForms(true);
  clearCategoryForm();
  if (category) {
    editingCategoryId = categoryId(category);
    qs('category-id').value = editingCategoryId;
    qs('category-nombre').value = categoryName(category);
    qs('category-submit-button').textContent = 'Actualizar categoría';
  }
  openSidePanel({
    title: category ? 'Editar categoría' : 'Agregar categoría',
    form: qs('category-form'),
    trigger: document.activeElement,
    focus: qs('category-nombre')
  });
}

function editCategory(id) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  const category = loadCategories().find(item => String(categoryId(item)) === String(id));
  if (!category) return;
  openCategoryForm(category);
}

function removeCategory(id) {
  if (!canManage()) {
    denyPermission();
    return;
  }
  if (!globalThis.confirm('¿Eliminar esta categoría?')) return;
  try {
    deleteCategory(id);
    if (editingCategoryId === id) clearCategoryForm();
    if (qs('category-feedback')) qs('category-feedback').textContent = '';
    renderCategoryOptions();
    renderCategoryFilterOptions();
    renderProductTable();
    renderCategoryTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    if (qs('category-feedback')) qs('category-feedback').textContent = error.message;
  }
}

function setActiveTab(tab, { focus = false, initial = false } = {}) {
  const next = tab === 'categorias' ? 'categorias' : 'catalogo';
  activeTab = next;
  const container = qs('products-view');
  if (!container) return;
  for (const button of container.querySelectorAll('[role="tab"]')) {
    const selected = button.dataset.tab === next;
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
  }
  for (const panel of container.querySelectorAll('[role="tabpanel"]')) {
    panel.hidden = panel.id !== `product-panel-${next}`;
  }
  if (focus && !initial) qs(`products-tab-${next}`)?.focus();
}

function ensureForms(manage) {
  if (!manage) {
    qs('product-form')?.remove();
    qs('category-form')?.remove();
    return;
  }
  for (const [templateId, formId, handler] of [
    ['product-form-template', 'product-form', submitProduct],
    ['category-form-template', 'category-form', submitCategory]
  ]) {
    let form = qs(formId);
    if (!form) {
      const template = qs(templateId);
      if (!template?.content?.firstElementChild) continue;
      form = template.content.firstElementChild.cloneNode(true);
      mountPanelForm(form);
      form.hidden = true;
    }
    if (!form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', event => {
        event.preventDefault();
        handler();
      });
    }
  }
  renderCategoryOptions(qs('product-categoria')?.value || '');
}

function catalogMarkup(manage) {
  return `
    <div class="catalog-toolbar">
      <div class="tabs" role="tablist" aria-label="Productos y categorías">
        <button type="button" role="tab" class="tab-button" id="products-tab-catalogo" data-tab="catalogo" aria-controls="product-panel-catalogo" aria-selected="true">Catálogo</button>
        <button type="button" role="tab" class="tab-button" id="products-tab-categorias" data-tab="categorias" aria-controls="product-panel-categorias" aria-selected="false" tabindex="-1">Categorías</button>
      </div>
    </div>
    <section role="tabpanel" class="tab-panel" id="product-panel-catalogo" aria-labelledby="products-tab-catalogo">
      <div class="page-heading">
        <div><h2>Catálogo y stock</h2></div>
        ${manage ? '<button type="button" class="primary" id="product-list-new" data-action="new-product">+ Nuevo</button>' : ''}
      </div>
      <div class="list-filters" id="product-filters">
        <div class="field"><label for="product-filter-query">Buscar</label><input id="product-filter-query" type="search" autocomplete="off"></div>
        <div class="field"><label for="product-filter-category">Categoría</label><select id="product-filter-category"><option value="">Todas</option></select></div>
        <button type="button" class="secondary" id="product-filter-clear" data-action="clear-product-filters" hidden>Limpiar filtros</button>
      </div>
      <p class="filter-summary" id="product-filter-summary" aria-live="polite"></p>
      <div class="table-wrapper">
        <table class="data-table" id="product-table">
          <thead><tr>
            <th data-sort-key="nombre" aria-sort="none"><button type="button" class="sort-button" data-sort="nombre">Producto<span class="sort-indicator" aria-hidden="true"></span></button></th>
            <th data-sort-key="unidad_medida" aria-sort="none"><button type="button" class="sort-button" data-sort="unidad_medida">Unidad<span class="sort-indicator" aria-hidden="true"></span></button></th>
            <th data-sort-key="id_categoria" aria-sort="none"><button type="button" class="sort-button" data-sort="id_categoria">Categoría<span class="sort-indicator" aria-hidden="true"></span></button></th>
            <th data-sort-key="stock" aria-sort="none"><button type="button" class="sort-button" data-sort="stock">Stock<span class="sort-indicator" aria-hidden="true"></span></button></th>
            ${manage ? '<th>Acciones</th>' : ''}
          </tr></thead>
          <tbody id="product-table-body"></tbody>
        </table>
      </div>
      <div id="product-feedback" class="feedback" aria-live="polite"></div>
    </section>
    <section role="tabpanel" class="tab-panel" id="product-panel-categorias" aria-labelledby="products-tab-categorias" hidden>
      <div class="page-heading">
        <div><h2>Categorías</h2></div>
        ${manage ? '<button type="button" class="primary" id="category-list-new" data-action="new-category">+ Nueva</button>' : ''}
      </div>
      <div class="table-wrapper">
        <table class="data-table" id="category-table">
          <thead><tr>
            <th data-sort-key="nombre" aria-sort="none"><button type="button" class="sort-button" data-sort="nombre">Categoría<span class="sort-indicator" aria-hidden="true"></span></button></th>
            <th data-sort-key="products" aria-sort="none"><button type="button" class="sort-button" data-sort="products">Productos<span class="sort-indicator" aria-hidden="true"></span></button></th>
            ${manage ? '<th>Acciones</th>' : ''}
          </tr></thead>
          <tbody id="category-table-body"></tbody>
        </table>
      </div>
      <div id="category-feedback" class="feedback" aria-live="polite"></div>
    </section>`;
}

function bindContainer(container) {
  if (boundContainer === container) return;
  boundContainer = container;
  container.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"][data-tab]');
    if (tab) {
      setActiveTab(tab.dataset.tab);
      return;
    }
    const sortButton = event.target.closest('button[data-sort]');
    if (sortButton) {
      const table = sortButton.closest('table');
      const state = table?.id === 'category-table' ? categorySort : productSort;
      const next = toggleSort(state, sortButton.dataset.sort);
      state.key = next.key;
      state.direction = next.direction;
      if (table?.id === 'category-table') renderCategoryTable();
      else renderProductTable();
      return;
    }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'new-product') openProductForm();
    else if (action === 'new-category') openCategoryForm();
    else if (action === 'edit-product') editProduct(button.dataset.id);
    else if (action === 'delete-product') removeProduct(button.dataset.id);
    else if (action === 'edit-category') editCategory(button.dataset.id);
    else if (action === 'delete-category') removeCategory(button.dataset.id);
    else if (action === 'clear-product-filters') {
      productFilters.categoryId = '';
      productFilters.query = '';
      if (qs('product-filter-query')) qs('product-filter-query').value = '';
      renderCategoryFilterOptions();
      renderProductTable();
    }
  });
  container.addEventListener('input', event => {
    if (event.target.id !== 'product-filter-query') return;
    productFilters.query = event.target.value;
    renderProductTable();
  });
  container.addEventListener('change', event => {
    if (event.target.id !== 'product-filter-category') return;
    productFilters.categoryId = event.target.value;
    renderProductTable();
  });
  container.addEventListener('keydown', event => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(tab);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].dataset.tab, { focus: true });
  });
}

export function init(options = {}) {
  catalogOptions = options;
  const container = qs('products-view');
  if (!container) return;
  const manage = canManage();
  if (container.dataset.catalogReady !== 'true' || boundCanManage !== manage) {
    container.innerHTML = catalogMarkup(manage);
    container.dataset.catalogReady = 'true';
    boundCanManage = manage;
    bindContainer(container);
  }
  ensureForms(manage);
  renderCategoryFilterOptions();
  renderProductTable();
  renderCategoryTable();
  setActiveTab(activeTab);
}

export function renderCatalog(options = catalogOptions) {
  init(options);
}
