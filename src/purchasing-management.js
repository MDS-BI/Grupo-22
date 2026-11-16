// 007 — servicios de gestión de compras: evaluación, compra por producto, reposición,
// áreas y presupuestos, avisos y mejoras rápidas. Toda creación de órdenes pasa por
// `savePurchaseOrder` (002/004/006).
import { PERMISSIONS, getSession } from './auth.js';
import { loadDocuments, loadEntities, loadRubros, saveDocuments, updateEntity } from './storage.js';
import {
  assertPermissionFor,
  getOrderMetadata,
  getPurchaseOrderDetail,
  listPurchaseOrdersWithActions,
  loadAreas,
  loadBudgets,
  loadEmployees,
  loadNotificationReadsMap,
  loadOrderMetadata,
  loadProducts,
  loadPurchaseOrderLines,
  loadStatusHistory,
  loadSupplierPrices,
  restorePurchasingData,
  saveAreas,
  saveBudgets,
  saveNotificationReadsMap,
  savePurchaseOrder,
  saveSupplierPrices,
  snapshotPurchasingData
} from './purchasing-storage.js';
import { evaluateSupplier } from './domain/supplier-evaluation.js';
import { compareSupplierOptions, groupCartBySupplier, unitPriceFor, validateTiers, normalizeTiers } from './domain/price-tiers.js';
import { buildSuggestedRequests, isBelowMinimum, suggestedQuantity } from './domain/reorder.js';
import { areaSpend, budgetStatus, monthKey } from './domain/budget.js';
import { spendReport } from './domain/reports.js';
import { notificationsFor } from './domain/notifications.js';
import { createPurchasingError, formatPurchaseOrderFolio, formatRequestNumber } from './domain/purchasing.js';

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

function text(value) {
  return String(value ?? '').trim();
}

function normalizeName(value) {
  return text(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function validationError(message, code = 'ORDER_INVALID') {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function supplierIsActive(supplier) {
  return text(supplier?.estado || 'activo') !== 'inactivo';
}

function historyByOrder() {
  const map = new Map();
  for (const record of loadStatusHistory()) {
    const list = map.get(record.id_orden_compra) || [];
    list.push(record);
    map.set(record.id_orden_compra, list);
  }
  for (const list of map.values()) list.sort((a, b) => String(a.changedAt).localeCompare(String(b.changedAt)));
  return map;
}

export function orderReference(order) {
  return [formatRequestNumber(order.folio) || text(order.folio), formatPurchaseOrderFolio(order.ocFolio)].filter(Boolean).join(' · ');
}

// --- US1: evaluación ------------------------------------------------------------------------

export function getSupplierEvaluation(entityId, { orders = loadDocuments(), history = historyByOrder() } = {}) {
  return evaluateSupplier(orders.filter(order => order.entity_id === entityId), history);
}

export function getAllSupplierEvaluations() {
  const orders = loadDocuments();
  const history = historyByOrder();
  return Object.fromEntries(loadEntities().map(entity => [entity.entity_id, getSupplierEvaluation(entity.entity_id, { orders, history })]));
}

// --- US7: compra por producto -----------------------------------------------------------------

export function getPurchaseOptions(productId, quantity, evaluations = getAllSupplierEvaluations()) {
  return compareSupplierOptions(productId, quantity, loadSupplierPrices(), loadEntities(), evaluations);
}

/** Productos que se pueden comprar (con al menos un proveedor activo con precio). */
export function purchasableProducts() {
  const active = new Set(loadEntities().filter(supplierIsActive).map(entity => entity.entity_id));
  const withPrice = new Set(loadSupplierPrices().filter(entry => active.has(entry.entity_id)).map(entry => entry.id_producto));
  return loadProducts().map(product => ({ product, purchasable: withPrice.has(product.id_producto || product.id) }));
}

function withSnapshot(work) {
  const snapshot = { purchasing: snapshotPurchasingData(), documents: loadDocuments() };
  try {
    return work();
  } catch (error) {
    restorePurchasingData(snapshot.purchasing);
    saveDocuments(snapshot.documents);
    throw error;
  }
}

function defaultEndDate(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Crea una solicitud por proveedor a partir del carrito; todo o nada. */
export function createRequestsFromCart(cart = [], header = {}) {
  assertPermissionFor(PERMISSIONS.DOCUMENTS_CREATE);
  const groups = groupCartBySupplier(cart);
  if (!groups.length) throw createPurchasingError('NO_LINES');
  const suppliers = new Map(loadEntities().map(entity => [entity.entity_id, entity]));
  return withSnapshot(() => groups.map(group => {
    const supplier = suppliers.get(group.entity_id);
    const entry = loadSupplierPrices().find(item => item.entity_id === group.entity_id);
    return savePurchaseOrder({
      entityId: group.entity_id,
      id_empleado: header.id_empleado,
      id_area: header.id_area,
      endDate: header.endDate || defaultEndDate(),
      paymentTerms: header.paymentTerms || supplier?.paymentTerms,
      currency: header.currencyBySupplier?.[group.entity_id] || entry?.moneda,
      lines: group.lines.map(line => ({ ...line, costo_unitario: 0 }))
    });
  }));
}

// --- US2: stock mínimo y solicitud sugerida --------------------------------------------------------

function openOrderLines() {
  const documents = new Map(loadDocuments().map(document => [document.id, document]));
  return loadPurchaseOrderLines()
    .map(line => ({ ...line, order: documents.get(line.id_orden_compra) }))
    .filter(line => line.order && ['borrador', 'pendiente'].includes(line.order.status))
    .map(line => ({ id_producto: line.id_producto, status: line.order.status, folio: formatRequestNumber(line.order.folio), orderId: line.order.id }));
}

export function listBelowMinimum() {
  const open = openOrderLines();
  return loadProducts()
    .filter(isBelowMinimum)
    .map(product => {
      const productId = product.id_producto || product.id;
      const inRequest = open.find(line => line.id_producto === productId) || null;
      return { product, quantity: suggestedQuantity(product), inRequest };
    });
}

export function createSuggestedRequests(header = {}) {
  assertPermissionFor(PERMISSIONS.DOCUMENTS_CREATE);
  const evaluations = getAllSupplierEvaluations();
  const suppliers = loadEntities();
  const plan = buildSuggestedRequests(loadProducts(), loadSupplierPrices(), suppliers, openOrderLines(), evaluations);
  if (!plan.groups.length) return { created: [], skipped: plan.skipped };
  const created = withSnapshot(() => plan.groups.map(group => {
    const supplier = suppliers.find(item => item.entity_id === group.entity_id);
    return savePurchaseOrder({
      entityId: group.entity_id,
      id_empleado: header.id_empleado,
      id_area: header.id_area,
      endDate: defaultEndDate(),
      paymentTerms: supplier?.paymentTerms,
      currency: group.currency,
      lines: group.lines
    });
  }));
  return { created, skipped: plan.skipped };
}

// --- US4: áreas y presupuestos ----------------------------------------------------------------

export function saveArea(data = {}) {
  assertPermissionFor(PERMISSIONS.BUDGETS_MANAGE);
  const nombre = text(data.nombre);
  if (!nombre) throw validationError('El nombre del área es obligatorio.', 'AREA_INVALID');
  if (nombre.length > 80) throw validationError('El nombre del área no puede superar 80 caracteres.', 'AREA_INVALID');
  const areas = loadAreas();
  const duplicate = areas.find(area => normalizeName(area.nombre) === normalizeName(nombre) && area.id_area !== data.id_area);
  if (duplicate) throw validationError('Ya existe un área con ese nombre.', 'AREA_INVALID');
  const timestamp = now();
  if (data.id_area) {
    const index = areas.findIndex(area => area.id_area === data.id_area);
    if (index < 0) throw createPurchasingError('AREA_NOT_FOUND');
    areas[index] = { ...areas[index], nombre, updatedAt: timestamp };
    saveAreas(areas);
    return areas[index];
  }
  const area = { id_area: uid('area'), nombre, activa: true, createdAt: timestamp, updatedAt: timestamp };
  saveAreas([...areas, area]);
  return area;
}

export function setAreaActive(areaId, activa) {
  assertPermissionFor(PERMISSIONS.BUDGETS_MANAGE);
  const areas = loadAreas();
  const index = areas.findIndex(area => area.id_area === areaId);
  if (index < 0) throw createPurchasingError('AREA_NOT_FOUND');
  areas[index] = { ...areas[index], activa: Boolean(activa), updatedAt: now() };
  saveAreas(areas);
  return areas[index];
}

export function setBudget(areaId, month, amount) {
  assertPermissionFor(PERMISSIONS.BUDGETS_MANAGE);
  if (!loadAreas().some(area => area.id_area === areaId)) throw createPurchasingError('AREA_NOT_FOUND');
  const key = monthKey(month);
  if (!key) throw validationError('El mes debe tener formato aaaa-mm.', 'BUDGET_INVALID');
  const value = Number(amount);
  if (amount === '' || !Number.isInteger(value) || value < 0) throw createPurchasingError('BUDGET_INVALID');
  const budgets = loadBudgets();
  const index = budgets.findIndex(item => item.id_area === areaId && item.mes === key);
  const timestamp = now();
  const next = index >= 0
    ? { ...budgets[index], monto: value, updatedAt: timestamp }
    : { id: uid('budget'), id_area: areaId, mes: key, monto: value, createdAt: timestamp, updatedAt: timestamp };
  if (index >= 0) budgets[index] = next;
  else budgets.push(next);
  saveBudgets(budgets);
  return next;
}

export function budgetFor(areaId, month = monthKey()) {
  return loadBudgets().find(item => item.id_area === areaId && item.mes === month) || null;
}

function metadataMap() {
  return new Map(loadOrderMetadata().map(item => [item.id_orden_compra, item]));
}

/** Presupuesto del mes en curso para el área de una orden, o null si no tiene área. */
export function getAreaBudgetForOrder(orderId, today = new Date()) {
  const areaId = getOrderMetadata(orderId)?.id_area;
  if (!areaId) return null;
  const area = loadAreas().find(item => item.id_area === areaId);
  const detail = getPurchaseOrderDetail(orderId);
  const month = monthKey(today);
  const spend = areaSpend(loadDocuments(), metadataMap(), areaId, month);
  const budget = budgetFor(areaId, month);
  const orderTotal = detail.currency === 'CLP' && !['aprobado', 'recibido'].includes(detail.status) ? detail.totals.total : 0;
  return {
    area,
    month,
    currency: detail.currency,
    ...budgetStatus(budget ? budget.monto : null, spend, orderTotal),
    otherCurrencies: spend.otherCurrencies
  };
}

/** Avisos de presupuesto excedido: solicitudes pendientes que exceden el disponible de su área. */
export function budgetAlerts(today = new Date()) {
  const areas = new Map(loadAreas().map(area => [area.id_area, area]));
  return loadDocuments()
    .filter(order => order.status === 'pendiente')
    .map(order => ({ order, status: getAreaBudgetForOrder(order.id, today) }))
    .filter(({ status }) => status && status.defined && status.exceeds)
    .map(({ order, status }) => ({ orderId: order.id, reference: orderReference(order), area: areas.get(status.area?.id_area)?.nombre || '', month: status.month, excess: status.excessAmount }));
}

// --- US3: reportes ------------------------------------------------------------------------------

export function getSpendReport(options = {}) {
  return spendReport(listPurchaseOrdersWithActions(), {
    ...options,
    suppliers: loadEntities(),
    rubros: loadRubros(),
    areas: loadAreas(),
    metadata: metadataMap()
  });
}

// --- US5: notificaciones ----------------------------------------------------------------------------

export function loadNotificationReads(userId) {
  return loadNotificationReadsMap()[userId] || [];
}

export function markNotificationsRead(userId, ids = []) {
  if (!userId) return [];
  const map = loadNotificationReadsMap();
  const merged = [...new Set([...(map[userId] || []), ...ids])].slice(-500);
  map[userId] = merged;
  saveNotificationReadsMap(map);
  return merged;
}

export function getNotifications({ role, ownEmployeeId = '', today = new Date() } = {}) {
  const metadata = metadataMap();
  const orders = loadDocuments().map(order => ({ ...order, id_empleado: metadata.get(order.id)?.id_empleado || '', reference: orderReference(order) }));
  return notificationsFor(role, {
    orders,
    suppliers: loadEntities(),
    historyByOrder: historyByOrder(),
    ownEmployeeId,
    today,
    budgetAlerts: ['administrador', 'gerente'].includes(role || 'administrador') ? budgetAlerts(today) : []
  });
}

// --- US6: mejoras rápidas -------------------------------------------------------------------------

export function duplicatePurchaseOrder(orderId, header = {}) {
  assertPermissionFor(PERMISSIONS.DOCUMENTS_CREATE);
  const detail = getPurchaseOrderDetail(orderId);
  const supplier = detail.supplier;
  if (!supplier) throw validationError('El proveedor de la orden ya no existe.');
  if (!supplierIsActive(supplier)) throw createPurchasingError('SUPPLIER_INACTIVE');
  const prices = loadSupplierPrices().filter(entry => entry.entity_id === supplier.entity_id);
  const usesList = prices.length > 0;
  const kept = [];
  const omitted = [];
  for (const line of detail.lines) {
    const entry = prices.find(item => item.id_producto === line.id_producto);
    if (usesList && !entry) {
      omitted.push(line.producto?.nombre || line.id_producto);
      continue;
    }
    kept.push({
      id_producto: line.id_producto,
      cantidad: line.cantidad,
      costo_unitario: entry ? unitPriceFor(entry, line.cantidad).precio : line.costo_unitario
    });
  }
  if (!kept.length) throw validationError('Ninguna línea tiene precio vigente con el proveedor; no se puede duplicar.');
  const session = getSession();
  const employeeId = header.id_empleado || detail.metadata?.id_empleado || '';
  const order = savePurchaseOrder({
    entityId: supplier.entity_id,
    id_empleado: session?.role === 'comprador' ? '' : employeeId,
    id_area: header.id_area ?? detail.metadata?.id_area ?? '',
    endDate: defaultEndDate(),
    paymentTerms: detail.paymentTerms,
    currency: detail.currency,
    lines: kept
  });
  return { order, omitted };
}

export function setSupplierStatus(entityRecordId, estado) {
  assertPermissionFor(PERMISSIONS.ENTITIES_UPDATE);
  const entity = loadEntities().find(item => item.id === entityRecordId || item.entity_id === entityRecordId);
  if (!entity) throw validationError('El proveedor no existe.');
  return updateEntity(entity.id, { ...entity, estado: estado === 'inactivo' ? 'inactivo' : 'activo' });
}

export function ordersCountForSupplier(entityId) {
  return loadDocuments().filter(order => order.entity_id === entityId).length;
}

// --- Tramos (US7) en el mantenedor de productos --------------------------------------------------------

export function setSupplierPriceTiers(entityId, productId, tiers = []) {
  assertPermissionFor(PERMISSIONS.PRICELISTS_MANAGE);
  const check = validateTiers(tiers);
  if (!check.valid) throw validationError([...new Set(check.errors.map(error => error.message))].join(' '), 'PRICE_LIST_INVALID');
  const all = loadSupplierPrices();
  const index = all.findIndex(entry => entry.entity_id === entityId && entry.id_producto === productId);
  if (index < 0) throw validationError('No existe un precio acordado para ese proveedor y producto.', 'PRICE_LIST_INVALID');
  const normalized = normalizeTiers({ tramos: tiers });
  all[index] = { ...all[index], precio: normalized[0].precio, ...(normalized.length > 1 ? { tramos: normalized } : { tramos: undefined }), updatedAt: now() };
  if (normalized.length <= 1) delete all[index].tramos;
  saveSupplierPrices(all);
  return all[index];
}

export { loadAreas, loadBudgets, loadEmployees };
