import {
  loadProducts,
  loadCategories,
  addProduct,
  addCategory,
  updateProduct,
  deleteProduct
} from './purchasing-storage.js';
import { icon } from './ui-icons.js';

let catalogOptions = {};
let editingProductId = '';
let boundContainer = null;

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

function productId(product) {
  return product.id_producto || product.id;
}

function renderCategoryOptions(selected = '') {
  const select = qs('product-categoria');
  if (!select) return;
  select.innerHTML = '<option value="">Seleccionar categoría</option>' +
    loadCategories().map(category => `<option value="${escape(category.id_categoria || category.id)}">${escape(category.nombre || category.name || '')}</option>`).join('');
  select.value = selected;
}

function renderTable() {
  const body = qs('product-table-body');
  if (!body) return;
  const canManage = catalogOptions.canManage !== false;
  const categories = new Map(loadCategories().map(category => [category.id_categoria || category.id, category]));
  const products = loadProducts();
  body.innerHTML = products.length
    ? products.map(product => `<tr>
        <td>${escape(product.nombre || product.name || '')}</td>
        <td>${escape(product.unidad_medida || product.unit || '')}</td>
        <td>${escape(categories.get(product.id_categoria)?.nombre || categories.get(product.id_categoria)?.name || '')}</td>
        <td>${escape(Number(product.stock || 0))}</td>
        ${canManage ? `<td class="table-actions">
          <button type="button" class="secondary" data-action="edit-product" data-id="${escape(productId(product))}">${icon('edit', { className: 'ui-icon' })}Editar</button>
          <button type="button" class="danger" data-action="delete-product" data-id="${escape(productId(product))}">${icon('trash', { className: 'ui-icon' })}Eliminar</button>
        </td>` : ''}
      </tr>`).join('')
    : `<tr><td colspan="${canManage ? 5 : 4}" class="empty-row">Sin productos registrados.</td></tr>`;
}

function clearForm() {
  editingProductId = '';
  if (qs('product-id')) qs('product-id').value = '';
  if (qs('product-nombre')) qs('product-nombre').value = '';
  if (qs('product-unidad')) qs('product-unidad').value = '';
  if (qs('product-stock')) qs('product-stock').value = '0';
  if (qs('product-categoria')) qs('product-categoria').value = '';
  if (qs('product-feedback')) qs('product-feedback').textContent = '';
  if (qs('product-submit-button')) qs('product-submit-button').textContent = 'Guardar producto';
  for (const id of ['error-product-nombre', 'error-product-unidad', 'error-product-stock', 'error-product-categoria']) {
    if (qs(id)) qs(id).textContent = '';
  }
}

function showErrors(errors) {
  for (const id of ['error-product-nombre', 'error-product-unidad', 'error-product-stock', 'error-product-categoria']) {
    if (qs(id)) qs(id).textContent = '';
  }
  if (errors.nombre) qs('error-product-nombre').textContent = errors.nombre;
  if (errors.unidad_medida) qs('error-product-unidad').textContent = errors.unidad_medida;
  if (errors.stock) qs('error-product-stock').textContent = errors.stock;
  if (errors.id_categoria) qs('error-product-categoria').textContent = errors.id_categoria;
}

function submitProduct() {
  if (catalogOptions.canManage === false) return;
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
  if (!data.id_categoria || !loadCategories().some(category => (category.id_categoria || category.id) === data.id_categoria)) {
    errors.id_categoria = 'La categoría es obligatoria';
  }
  showErrors(errors);
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
    clearForm();
    renderCategoryOptions();
    renderTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    qs('product-feedback').textContent = error.message;
  }
}

function editProduct(id) {
  if (catalogOptions.canManage === false) return;
  const product = loadProducts().find(item => productId(item) === id);
  if (!product) return;
  editingProductId = id;
  qs('product-id').value = id;
  qs('product-nombre').value = product.nombre || product.name || '';
  qs('product-unidad').value = product.unidad_medida || product.unit || '';
  qs('product-stock').value = product.stock ?? 0;
  renderCategoryOptions(product.id_categoria || '');
  qs('product-submit-button').textContent = 'Actualizar producto';
  qs('product-nombre').focus();
}

function removeProduct(id) {
  if (catalogOptions.canManage === false) return;
  if (!globalThis.confirm('¿Eliminar este producto del catálogo?')) return;
  try {
    deleteProduct(id);
    if (editingProductId === id) clearForm();
    renderTable();
    catalogOptions.onChanged?.();
  } catch (error) {
    qs('product-feedback').textContent = error.message;
  }
}

function addCategoryFromForm() {
  if (catalogOptions.canManage === false) return;
  const input = qs('new-category-name');
  const name = String(input?.value || '').trim();
  if (!name) return;
  const category = addCategory({ nombre: name });
  input.value = '';
  renderCategoryOptions(category.id_categoria || category.id);
  renderTable();
  catalogOptions.onChanged?.();
}

export function init(options = {}) {
  catalogOptions = options;
  const container = qs('products-view');
  if (!container) return;
  const canManage = catalogOptions.canManage !== false;
  const form = `
      <form id="product-form" class="catalog-form" novalidate>
        <h2>Agregar / Editar producto</h2>
        <input type="hidden" id="product-id">
        <div class="field"><label for="product-nombre">Nombre</label><input id="product-nombre"><small class="field-error" aria-live="polite" id="error-product-nombre"></small></div>
        <div class="field"><label for="product-unidad">Unidad de medida</label><input id="product-unidad"><small class="field-error" aria-live="polite" id="error-product-unidad"></small></div>
        <div class="field"><label for="product-stock">Stock</label><input id="product-stock" type="number" min="0" step="1" value="0"><small class="field-error" aria-live="polite" id="error-product-stock"></small></div>
        <div class="field"><label for="product-categoria">Categoría</label><select id="product-categoria"></select><small class="field-error" aria-live="polite" id="error-product-categoria"></small></div>
        <div class="field"><label for="new-category-name">Nueva categoría</label><div class="inline-control"><input id="new-category-name" placeholder="Nombre de la categoría"><button type="button" class="secondary" id="add-category-button">${icon('plus', { className: 'ui-icon' })}Agregar</button></div></div>
        <button class="primary" type="submit" id="product-submit-button">Guardar producto</button>
        <div id="product-feedback" class="feedback" aria-live="polite"></div>
      </form>`;
  container.innerHTML = `
    <div class="product-grid${canManage ? '' : ' single-column'}">
      ${canManage ? form : ''}
      <section>
        <h2>Catálogo y stock</h2>
        <div class="table-wrapper">
          <table class="data-table" id="product-table">
            <thead><tr><th>Producto</th><th>Unidad</th><th>Categoría</th><th>Stock</th>${canManage ? '<th>Acciones</th>' : ''}</tr></thead>
            <tbody id="product-table-body"></tbody>
          </table>
        </div>
      </section>
    </div>`;
  renderCategoryOptions();
  renderTable();
  clearForm();
  qs('product-form')?.addEventListener('submit', event => {
    event.preventDefault();
    submitProduct();
  });
  qs('add-category-button')?.addEventListener('click', addCategoryFromForm);
  if (boundContainer !== container) {
    boundContainer = container;
    container.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'edit-product') editProduct(button.dataset.id);
      if (button.dataset.action === 'delete-product') removeProduct(button.dataset.id);
    });
  }
}

export function renderCatalog(options = catalogOptions) {
  init(options);
}
