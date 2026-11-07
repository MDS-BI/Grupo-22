const KEYS = {
  employees: 'erp_purchasing:employees',
  categories: 'erp_purchasing:categories',
  products: 'erp_purchasing:products',
  lines: 'erp_purchasing:purchase-order-lines'
};

function read(key) {
  try { return JSON.parse(globalThis.localStorage?.getItem(key) || '[]'); }
  catch { return []; }
}
function write(key, value) { globalThis.localStorage?.setItem(key, JSON.stringify(value)); }
function now() { return new Date().toISOString(); }
function uid(prefix) { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random()}`; }
function record(listKey, data, prefix) {
  const timestamp = now();
  const item = { ...data, id: uid(prefix), createdAt: timestamp, updatedAt: timestamp };
  if (prefix === 'employee') item.id_empleado = item.id;
  if (prefix === 'category') item.id_categoria = item.id;
  if (prefix === 'product') item.id_producto = item.id;
  const records = read(KEYS[listKey]); records.push(item); write(KEYS[listKey], records); return item;
}

export const loadEmployees = () => read(KEYS.employees);
export const addEmployee = data => record('employees', data, 'employee');
export const loadCategories = () => read(KEYS.categories);
export const addCategory = data => record('categories', data, 'category');
export const loadProducts = () => read(KEYS.products);
export const addProduct = data => record('products', data, 'product');
export const loadPurchaseOrderLines = () => read(KEYS.lines);
export const savePurchaseOrderLines = lines => write(KEYS.lines, lines);
export const addPurchaseOrderLine = line => {
  const lines = loadPurchaseOrderLines();
  const duplicate = lines.find(item => item.id_orden_compra === line.id_orden_compra && item.id_producto === line.id_producto);
  if (duplicate) throw new Error('No se permiten dos líneas con el mismo producto');
  lines.push({ ...line });
  savePurchaseOrderLines(lines);
  return line;
};
export const deleteLinesForOrder = orderId => savePurchaseOrderLines(loadPurchaseOrderLines().filter(line => line.id_orden_compra !== orderId));
