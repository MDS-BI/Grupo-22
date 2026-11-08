import {
  loadDocuments,
  saveDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  loadEntities
} from './storage.js';
import {
  calculateOrderTotals,
  validatePurchaseOrderLine,
  getAvailableActions,
  isTerminalStatus,
  assertTransition,
  createStatusChange,
  planReceipt,
  createPurchasingError,
  PURCHASING_ERRORS
} from './domain/purchasing.js';

const KEYS = {
  employees: 'erp_purchasing:employees',
  categories: 'erp_purchasing:categories',
  products: 'erp_purchasing:products',
  lines: 'erp_purchasing:purchase-order-lines',
  orderMetadata: 'erp_purchasing:order-metadata',
  statusHistory: 'erp_purchasing:status-history',
  transactions: 'erp_purchasing:transactions'
};

function read(key) {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function write(key, value) {
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function record(listKey, data, prefix) {
  const timestamp = now();
  const item = { ...data, id: uid(prefix), createdAt: timestamp, updatedAt: timestamp };
  if (prefix === 'employee') item.id_empleado = item.id;
  if (prefix === 'category') item.id_categoria = item.id;
  if (prefix === 'product') item.id_producto = item.id;
  const records = read(KEYS[listKey]);
  records.push(item);
  write(KEYS[listKey], records);
  return item;
}

export const loadEmployees = () => read(KEYS.employees);
export const addEmployee = data => record('employees', data, 'employee');

export function deleteEmployee(employeeId) {
  const referenced = loadOrderMetadata().some(metadata => metadata.id_empleado === employeeId);
  if (referenced) {
    const error = new Error('No se puede eliminar un empleado referenciado por una orden de compra.');
    error.code = 'EMPLOYEE_REFERENCED';
    throw error;
  }
  const employees = loadEmployees();
  const next = employees.filter(employee => (employee.id_empleado || employee.id) !== employeeId);
  if (next.length === employees.length) throw createPurchasingError('EMPLOYEE_NOT_FOUND', 'No se encontró el empleado.');
  write(KEYS.employees, next);
  return true;
}

export const loadCategories = () => read(KEYS.categories);
export const addCategory = data => record('categories', data, 'category');

export function deleteCategory(categoryId) {
  const referenced = loadProducts().some(product => product.id_categoria === categoryId);
  if (referenced) {
    const error = new Error('No se puede eliminar una categoría referenciada por un producto.');
    error.code = 'CATEGORY_REFERENCED';
    throw error;
  }
  const categories = loadCategories();
  const next = categories.filter(category => (category.id_categoria || category.id) !== categoryId);
  if (next.length === categories.length) throw createPurchasingError('CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
  write(KEYS.categories, next);
  return true;
}

export const loadProducts = () => read(KEYS.products);
export const saveProducts = products => write(KEYS.products, products);

function validateProductData(data, current = {}) {
  const nombre = String(data.nombre ?? data.name ?? current.nombre ?? current.name ?? '').trim();
  const unidad = String(data.unidad_medida ?? data.unit ?? current.unidad_medida ?? current.unit ?? '').trim();
  const stockValue = data.stock ?? current.stock ?? 0;
  const categoria = data.id_categoria ?? current.id_categoria ?? '';
  if (!nombre) {
    const error = new Error('El nombre del producto es obligatorio');
    error.code = 'PRODUCT_INVALID';
    throw error;
  }
  if (!unidad) {
    const error = new Error('La unidad de medida es obligatoria');
    error.code = 'PRODUCT_INVALID';
    throw error;
  }
  if (!Number.isInteger(Number(stockValue)) || Number(stockValue) < 0) {
    const error = new Error('El stock debe ser un entero no negativo');
    error.code = 'PRODUCT_INVALID';
    throw error;
  }
  if (!categoria || !loadCategories().some(category => (category.id_categoria || category.id) === categoria)) {
    const error = new Error('La categoría es obligatoria');
    error.code = 'PRODUCT_INVALID';
    throw error;
  }
  return { nombre, unidad_medida: unidad, stock: Number(stockValue), id_categoria: categoria };
}

export function addProduct(data) {
  return record('products', validateProductData(data), 'product');
}
export const loadPurchaseOrderLines = () => read(KEYS.lines);
export const savePurchaseOrderLines = lines => write(KEYS.lines, lines);
export const loadOrderMetadata = () => read(KEYS.orderMetadata);
export const saveOrderMetadata = metadata => write(KEYS.orderMetadata, metadata);
export const loadStatusHistory = () => read(KEYS.statusHistory);
export const saveStatusHistory = history => write(KEYS.statusHistory, history);
export const loadTransactions = () => read(KEYS.transactions);
export const saveTransactions = transactions => write(KEYS.transactions, transactions);

function findOrder(orderId) {
  return loadDocuments().find(document => document.id === orderId);
}

function requireOrder(orderId) {
  const order = findOrder(orderId);
  if (!order) throw createPurchasingError('ORDER_NOT_FOUND');
  return order;
}

function requireEditable(order) {
  if (isTerminalStatus(order.status)) throw createPurchasingError('ORDER_TERMINAL');
}

function productIdOf(line) {
  return line.id_producto || line.productId;
}

function productById(productId) {
  return loadProducts().find(product => (product.id_producto || product.id) === productId);
}

function validateLineForOrder(line, existingLines = [], ignoreProductId = null) {
  const result = validatePurchaseOrderLine(line, { existingLines, ignoreLine: { id_producto: ignoreProductId } });
  const productId = productIdOf(line);
  if (!productId) result.errors.id_producto = PURCHASING_ERRORS.PRODUCT_NOT_FOUND;
  else if (!productById(productId)) result.errors.id_producto = PURCHASING_ERRORS.PRODUCT_NOT_FOUND;
  const duplicate = existingLines.some(
    existing => productIdOf(existing) === productId && productIdOf(existing) !== ignoreProductId
  );
  if (duplicate) result.errors.id_producto = PURCHASING_ERRORS.PRODUCT_DUPLICATE;
  return { valid: Object.keys(result.errors).length === 0, errors: result.errors };
}

function normalizeLines(orderId, lines) {
  return lines.map(line => ({
    id_orden_compra: orderId,
    id_producto: productIdOf(line),
    cantidad: Number(line.cantidad),
    costo_unitario: Number(line.costo_unitario ?? line.unitPrice ?? 0)
  }));
}

function validateLinesForOrder(orderId, lines, ignoreProductId = null) {
  const normalized = normalizeLines(orderId, lines);
  const seen = new Set();
  normalized.forEach(line => {
    if (!productIdOf(line) || !productById(productIdOf(line))) {
      throw createPurchasingError('PRODUCT_NOT_FOUND');
    }
    if (seen.has(productIdOf(line))) throw createPurchasingError('PRODUCT_DUPLICATE');
    seen.add(productIdOf(line));
    const result = validatePurchaseOrderLine(line);
    if (!result.valid) throw createPurchasingError('LINE_INVALID');
  });
  if (ignoreProductId) {
    const remaining = normalized.filter(line => productIdOf(line) !== ignoreProductId);
    if (remaining.length !== normalized.length - 1) {
      throw createPurchasingError('LINE_INVALID');
    }
  }
  return normalized;
}

function updateOrderTotals(orderId, lines, timestamp = now()) {
  const totals = calculateOrderTotals(lines);
  const documents = loadDocuments();
  const index = documents.findIndex(document => document.id === orderId);
  if (index >= 0) {
    documents[index] = { ...documents[index], totalAmount: totals.total, updatedAt: timestamp };
    saveDocuments(documents);
  }
  return totals;
}

export function getLinesForOrder(orderId) {
  requireOrder(orderId);
  return loadPurchaseOrderLines().filter(line => line.id_orden_compra === orderId);
}

export function replaceOrderLines(orderId, lines, options = {}) {
  const order = requireOrder(orderId);
  if (!options.allowTerminal) requireEditable(order);
  const normalized = validateLinesForOrder(orderId, lines);
  if (normalized.length === 0) throw createPurchasingError('NO_LINES');
  const remaining = loadPurchaseOrderLines().filter(line => line.id_orden_compra !== orderId);
  savePurchaseOrderLines([...remaining, ...normalized]);
  updateOrderTotals(orderId, normalized, options.timestamp || now());
  return normalized;
}

export const savePurchaseOrderLinesForOrder = replaceOrderLines;
export const saveOrderLines = replaceOrderLines;

export function addPurchaseOrderLine(line) {
  const orderId = line.id_orden_compra || line.orderId;
  if (!orderId) throw createPurchasingError('ORDER_NOT_FOUND');
  const order = requireOrder(orderId);
  requireEditable(order);
  const existing = getLinesForOrder(orderId);
  const result = validateLineForOrder(line, existing);
  if (!result.valid) {
    const message = Object.values(result.errors).join('. ');
    if (message.includes(PURCHASING_ERRORS.PRODUCT_DUPLICATE)) {
      throw createPurchasingError('PRODUCT_DUPLICATE', message);
    }
    if (message.includes(PURCHASING_ERRORS.PRODUCT_NOT_FOUND)) {
      throw createPurchasingError('PRODUCT_NOT_FOUND', message);
    }
    throw createPurchasingError('LINE_INVALID', message);
  }
  const normalized = normalizeLines(orderId, [line])[0];
  savePurchaseOrderLines([...loadPurchaseOrderLines(), normalized]);
  updateOrderTotals(orderId, getLinesForOrder(orderId));
  return normalized;
}

export function addOrUpdatePurchaseOrderLine(orderId, line) {
  const order = requireOrder(orderId);
  requireEditable(order);
  const existing = getLinesForOrder(orderId);
  const productId = productIdOf(line);
  const current = existing.find(item => productIdOf(item) === productId);
  const others = existing.filter(item => productIdOf(item) !== productId);
  const result = validateLineForOrder(line, current ? others : existing, current ? productId : null);
  if (!result.valid) {
    const message = Object.values(result.errors).join('. ');
    if (message.includes(PURCHASING_ERRORS.PRODUCT_DUPLICATE)) {
      throw createPurchasingError('PRODUCT_DUPLICATE');
    }
    throw createPurchasingError('LINE_INVALID', message);
  }
  const normalized = normalizeLines(orderId, [line])[0];
  const next = current
    ? existing.map(item => (productIdOf(item) === productId ? normalized : item))
    : [...existing, normalized];
  replaceOrderLines(orderId, next);
  return getLinesForOrder(orderId);
}

export const saveOrderLine = addOrUpdatePurchaseOrderLine;
export const upsertPurchaseOrderLine = addOrUpdatePurchaseOrderLine;

export function deletePurchaseOrderLine(orderId, productId) {
  const order = requireOrder(orderId);
  requireEditable(order);
  const existing = getLinesForOrder(orderId);
  const next = existing.filter(line => productIdOf(line) !== productId);
  if (next.length === existing.length) throw createPurchasingError('LINE_NOT_FOUND');
  if (next.length === 0) throw createPurchasingError('NO_LINES');
  replaceOrderLines(orderId, next);
  return next;
}

export function deleteLinesForOrder(orderId) {
  savePurchaseOrderLines(loadPurchaseOrderLines().filter(line => line.id_orden_compra !== orderId));
}

export function getOrderMetadata(orderId) {
  return loadOrderMetadata().find(metadata => metadata.id_orden_compra === orderId) || null;
}

export function upsertOrderMetadata(orderId, data = {}) {
  const metadata = loadOrderMetadata();
  const index = metadata.findIndex(item => item.id_orden_compra === orderId);
  const timestamp = now();
  if (index >= 0) {
    const next = {
      ...metadata[index],
      ...data,
      id_orden_compra: orderId,
      updatedAt: timestamp
    };
    metadata[index] = next;
    saveOrderMetadata(metadata);
    return next;
  }
  const item = {
    id: uid('metadata'),
    id_orden_compra: orderId,
    id_empleado: data.id_empleado || data.idEmpleado || data.employeeId || '',
    stock_aplicado: Boolean(data.stock_aplicado),
    appliedAt: data.appliedAt || null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  metadata.push(item);
  saveOrderMetadata(metadata);
  return item;
}

export function saveOrderMetadataForOrder(orderId, data = {}) {
  return upsertOrderMetadata(orderId, data);
}

export function deleteOrderMetadata(orderId) {
  saveOrderMetadata(loadOrderMetadata().filter(metadata => metadata.id_orden_compra !== orderId));
}

function employeeFor(metadata) {
  if (!metadata?.id_empleado) return null;
  return loadEmployees().find(employee => (employee.id_empleado || employee.id) === metadata.id_empleado) || null;
}

function supplierFor(order) {
  return loadEntities().find(entity => entity.entity_id === order.entity_id) || null;
}

export function loadOrderHistory(orderId) {
  const history = loadStatusHistory()
    .filter(record => record.id_orden_compra === orderId)
    .sort((a, b) => String(a.changedAt).localeCompare(String(b.changedAt)));
  if (!history.length && !findOrder(orderId)) throw createPurchasingError('ORDER_NOT_FOUND');
  return history;
}

export function addOrderHistory(orderId, from, to, changedAt = now()) {
  const change = createStatusChange(orderId, from, to, changedAt);
  saveStatusHistory([...loadStatusHistory(), change]);
  return change;
}

function snapshotState() {
  return {
    documents: loadDocuments(),
    products: loadProducts(),
    metadata: loadOrderMetadata(),
    history: loadStatusHistory(),
    lines: loadPurchaseOrderLines()
  };
}

function restoreState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  if (Array.isArray(snapshot.documents)) saveDocuments(snapshot.documents);
  if (Array.isArray(snapshot.orders)) saveDocuments(snapshot.orders);
  if (snapshot.order && snapshot.order.id) {
    const documents = loadDocuments();
    const index = documents.findIndex(document => document.id === snapshot.order.id);
    if (index >= 0) documents[index] = snapshot.order;
    else documents.push(snapshot.order);
    saveDocuments(documents);
  }
  if (Array.isArray(snapshot.products)) saveProducts(snapshot.products);
  if (Array.isArray(snapshot.metadata)) saveOrderMetadata(snapshot.metadata);
  if (Array.isArray(snapshot.orderMetadata)) saveOrderMetadata(snapshot.orderMetadata);
  if (Array.isArray(snapshot.history)) saveStatusHistory(snapshot.history);
  if (Array.isArray(snapshot.statusHistory)) saveStatusHistory(snapshot.statusHistory);
  if (Array.isArray(snapshot.lines)) savePurchaseOrderLines(snapshot.lines);
}

export function beginTransaction(typeOrInput, orderId, before, after) {
  const input = typeof typeOrInput === 'object' && typeOrInput !== null
    ? typeOrInput
    : { type: typeOrInput, id_orden_compra: orderId, before, after };
  const transaction = {
    id: uid('transaction'),
    type: input.type || 'transition',
    id_orden_compra: input.id_orden_compra || input.orderId,
    phase: 'prepared',
    before: input.before || null,
    after: input.after || null,
    createdAt: now(),
    appliedAt: null
  };
  saveTransactions([...loadTransactions(), transaction]);
  return transaction;
}

export function markTransactionApplied(idOrTransaction, appliedAt = now()) {
  const id = typeof idOrTransaction === 'object' ? idOrTransaction.id : idOrTransaction;
  const transactions = loadTransactions();
  const index = transactions.findIndex(transaction => transaction.id === id);
  if (index < 0) return null;
  transactions[index] = { ...transactions[index], phase: 'applied', appliedAt };
  saveTransactions(transactions);
  return transactions[index];
}

export function clearTransaction(idOrTransaction) {
  const id = typeof idOrTransaction === 'object' ? idOrTransaction.id : idOrTransaction;
  saveTransactions(loadTransactions().filter(transaction => transaction.id !== id));
}

export function recoverTransactions() {
  const transactions = loadTransactions();
  let recovered = 0;
  let cleared = 0;
  const errors = [];
  for (const transaction of transactions) {
    try {
      if (transaction.phase === 'prepared') {
        restoreState(transaction.before);
        recovered += 1;
      } else if (transaction.phase === 'applied') {
        cleared += 1;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  saveTransactions([]);
  return { recovered, cleared, errors, total: transactions.length };
}

function transitionSnapshot(order, nextStatus, change, timestamp) {
  const before = snapshotState();
  return {
    before,
    after: {
      ...before,
      documents: before.documents.map(document =>
        document.id === order.id ? { ...document, status: nextStatus, updatedAt: timestamp } : document
      ),
      history: [...before.history, change]
    }
  };
}

export function changeOrderStatus(orderId, nextStatus, changedAt = now()) {
  const order = requireOrder(orderId);
  if (nextStatus === 'recibido') return receivePurchaseOrder(orderId, changedAt);
  const lines = getLinesForOrder(orderId);
  const validLines = lines.filter(line => validateLineForOrder(line, []).valid);
  assertTransition(order.status, nextStatus, { hasLines: validLines.length > 0 });
  const change = createStatusChange(orderId, order.status, nextStatus, changedAt);
  const snapshots = transitionSnapshot(order, nextStatus, change, changedAt);
  const transaction = beginTransaction({
    type: 'transition',
    id_orden_compra: orderId,
    before: snapshots.before,
    after: snapshots.after
  });
  try {
    saveDocuments(snapshots.after.documents);
    saveStatusHistory(snapshots.after.history);
    markTransactionApplied(transaction);
    clearTransaction(transaction);
  } catch {
    restoreState(snapshots.before);
    clearTransaction(transaction);
    throw createPurchasingError('PERSISTENCE_ERROR');
  }
  return getPurchaseOrderDetail(orderId);
}

export function receivePurchaseOrder(orderId, changedAt = now()) {
  const order = requireOrder(orderId);
  const metadata = getOrderMetadata(orderId);
  if (metadata?.stock_aplicado || order.status === 'recibido') {
    throw createPurchasingError('STOCK_ALREADY_APPLIED');
  }
  const lines = getLinesForOrder(orderId);
  const plan = planReceipt(order, lines, loadProducts(), metadata);
  const change = createStatusChange(orderId, order.status, 'recibido', changedAt);
  const before = snapshotState();
  const after = {
    ...before,
    documents: before.documents.map(document =>
      document.id === orderId ? { ...document, status: 'recibido', updatedAt: changedAt } : document
    ),
    products: before.products.map(product => {
      const update = plan.updates.find(item => item.id_producto === (product.id_producto || product.id));
      return update ? { ...product, stock: update.stock_nuevo, updatedAt: changedAt } : product;
    }),
    metadata: before.metadata.map(item =>
      item.id_orden_compra === orderId
        ? { ...item, stock_aplicado: true, appliedAt: changedAt, updatedAt: changedAt }
        : item
    ),
    history: [...before.history, change]
  };
  if (!metadata) {
    after.metadata.push({
      id: uid('metadata'),
      id_orden_compra: orderId,
      id_empleado: '',
      stock_aplicado: true,
      appliedAt: changedAt,
      createdAt: changedAt,
      updatedAt: changedAt
    });
  }
  const transaction = beginTransaction({
    type: 'receipt',
    id_orden_compra: orderId,
    before,
    after
  });
  try {
    saveProducts(after.products);
    saveDocuments(after.documents);
    saveOrderMetadata(after.metadata);
    saveStatusHistory(after.history);
    markTransactionApplied(transaction);
    clearTransaction(transaction);
  } catch {
    restoreState(before);
    clearTransaction(transaction);
    throw createPurchasingError('PERSISTENCE_ERROR');
  }
  return getPurchaseOrderDetail(orderId);
}

function enrichLines(lines, products = loadProducts()) {
  const productMap = new Map(products.map(product => [product.id_producto || product.id, product]));
  return lines.map(line => {
    const product = productMap.get(line.id_producto) || null;
    return { ...line, producto: product, product };
  });
}

export function getPurchaseOrderDetail(orderId) {
  const order = requireOrder(orderId);
  const metadata = getOrderMetadata(orderId);
  const products = loadProducts();
  const lines = enrichLines(getLinesForOrder(orderId), products);
  const totals = calculateOrderTotals(lines);
  const history = loadOrderHistory(orderId);
  const actions = getAvailableActions(order.status);
  const employee = employeeFor(metadata);
  const supplier = supplierFor(order);
  return {
    ...order,
    order,
    document: order,
    metadata,
    employee,
    employeeName: employee?.nombre || employee?.name || 'Empleado desconocido',
    supplier,
    lines,
    totals,
    history,
    actions,
    availableActions: actions,
    isLegacy: !metadata,
    stockApplied: Boolean(metadata?.stock_aplicado)
  };
}

export function listPurchaseOrdersWithActions() {
  const metadata = loadOrderMetadata();
  const lines = loadPurchaseOrderLines();
  const employees = loadEmployees();
  const suppliers = loadEntities();
  const products = loadProducts();
  return loadDocuments().map(order => {
    const orderMetadata = metadata.find(item => item.id_orden_compra === order.id) || null;
    const orderLines = enrichLines(lines.filter(line => line.id_orden_compra === order.id), products);
    const employee = orderMetadata
      ? employees.find(item => (item.id_empleado || item.id) === orderMetadata.id_empleado) || null
      : null;
    const supplier = suppliers.find(item => item.entity_id === order.entity_id) || null;
    return {
      ...order,
      order,
      metadata: orderMetadata,
      employee,
      supplier,
      lines: orderLines,
      totals: calculateOrderTotals(orderLines),
      actions: getAvailableActions(order.status),
      isLegacy: !orderMetadata,
      stockApplied: Boolean(orderMetadata?.stock_aplicado)
    };
  });
}

export function getAvailableActionsForOrder(orderId) {
  const order = requireOrder(orderId);
  return getAvailableActions(order.status);
}

export const getOrderActions = getAvailableActionsForOrder;

export function savePurchaseOrder(input = {}) {
  const orderInput = input.order || input.document || input;
  const lines = input.lines || input.items || input.orderLines || orderInput.lines || [];
  const metadataInput = input.metadata || {};
  const orderId = input.id || input.orderId || input.id_orden_compra || orderInput.id;
  const employeeId =
    input.id_empleado ||
    input.idEmpleado ||
    input.employeeId ||
    metadataInput.id_empleado ||
    orderInput.id_empleado ||
    orderInput.idEmpleado;
  if (!employeeId) {
    throw createPurchasingError('ORDER_INVALID', 'Debe seleccionar un empleado solicitante.');
  }
  if (!loadEmployees().some(employee => (employee.id_empleado || employee.id) === employeeId)) {
    throw createPurchasingError('ORDER_INVALID', 'Debe seleccionar un empleado solicitante registrado.');
  }
  if (!Array.isArray(lines) || lines.length === 0) throw createPurchasingError('NO_LINES');

  const normalized = validateLinesForOrder(orderId || 'pending', lines);
  const totals = calculateOrderTotals(normalized);
  const header = {
    entityId: input.entityId || input.entity_id || orderInput.entityId || orderInput.entity_id,
    folio: input.folio ?? orderInput.folio,
    startDate: input.startDate ?? orderInput.startDate,
    endDate: input.endDate ?? orderInput.endDate,
    paymentTerms: input.paymentTerms ?? orderInput.paymentTerms ?? input.docPaymentTerms,
    notes: input.notes ?? orderInput.notes,
    currency: input.currency ?? orderInput.currency,
    totalAmount: totals.total
  };

  if (orderId) {
    const current = requireOrder(orderId);
    requireEditable(current);
    const requestedStatus = input.status ?? orderInput.status;
    if (requestedStatus && requestedStatus !== current.status) throw createPurchasingError('INVALID_TRANSITION');
    updateDocument(orderId, { ...header, status: current.status });
    replaceOrderLines(orderId, lines);
    upsertOrderMetadata(orderId, { id_empleado: employeeId });
    return getPurchaseOrderDetail(orderId);
  }

  const created = addDocument({
    ...header,
    status: input.status || orderInput.status || 'borrador'
  });
  try {
    replaceOrderLines(created.id, lines);
    upsertOrderMetadata(created.id, { id_empleado: employeeId });
    return getPurchaseOrderDetail(created.id);
  } catch (error) {
    deleteLinesForOrder(created.id);
    deleteOrderMetadata(created.id);
    deleteDocument(created.id);
    throw error;
  }
}

export const savePurchaseOrderWithLines = savePurchaseOrder;
export const saveOrderWithLines = savePurchaseOrder;

export function deletePurchaseOrder(orderId) {
  const order = requireOrder(orderId);
  deleteLinesForOrder(orderId);
  deleteOrderMetadata(orderId);
  saveStatusHistory(loadStatusHistory().filter(record => record.id_orden_compra !== orderId));
  saveTransactions(loadTransactions().filter(transaction => transaction.id_orden_compra !== orderId));
  deleteDocument(order.id);
  return true;
}

export function updateProduct(productId, updates = {}) {
  const products = loadProducts();
  const index = products.findIndex(product => (product.id_producto || product.id) === productId);
  if (index < 0) throw createPurchasingError('PRODUCT_NOT_FOUND');
  const current = products[index];
  const validated = validateProductData(updates, current);
  const next = { ...current, ...validated, updatedAt: now() };
  products[index] = next;
  saveProducts(products);
  return next;
}

export function deleteProduct(productId) {
  const referenced = loadPurchaseOrderLines().some(line => productIdOf(line) === productId);
  if (referenced) {
    const error = new Error('No se puede eliminar un producto referenciado por una orden de compra.');
    error.code = 'PRODUCT_REFERENCED';
    throw error;
  }
  const products = loadProducts();
  const next = products.filter(product => (product.id_producto || product.id) !== productId);
  if (next.length === products.length) throw createPurchasingError('PRODUCT_NOT_FOUND');
  saveProducts(next);
  return true;
}

export const listOrders = listPurchaseOrdersWithActions;
export const getOrderDetail = getPurchaseOrderDetail;
export const saveOrder = savePurchaseOrder;
export const deleteOrder = deletePurchaseOrder;

export { KEYS };
