import {
  addEntity,
  deleteEntity,
  loadEntities,
  loadDocuments,
  addRubro,
  loadRubros
} from './storage.js';
import {
  addCategory,
  addEmployee,
  addProduct,
  changeOrderStatus,
  deleteCategory,
  deleteEmployee,
  deleteProduct,
  deletePurchaseOrder,
  getPurchaseOrderDetail,
  loadCategories,
  loadEmployees,
  loadProducts,
  savePurchaseOrder
} from './purchasing-storage.js';
import {
  PERMISSIONS,
  can,
  canTransitionTo,
  getSession,
  loadUsers
} from './auth.js';

const DEMO_PREFIX = 'Demo';

function text(value) {
  return String(value ?? '').trim();
}

function addDays(base, days) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function rutVerifier(body) {
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  return remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
}

function formatRut(body) {
  return `${body}-${rutVerifier(body)}`;
}

function usedRuts() {
  return new Set(loadEntities().map(entity => text(entity.code).replace(/[.\s]/g, '').toUpperCase()));
}

function nextAvailableRut(seed = 20000000) {
  const used = usedRuts();
  let body = seed;
  while (body < seed + 10000) {
    const rut = formatRut(String(body));
    if (!used.has(rut)) return rut;
    body += 1;
  }
  throw new Error('No fue posible generar un RUT único para la demostración.');
}

function uniqueName(base, existing) {
  const names = new Set(existing.map(item => text(item).toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let index = 2;
  while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
}

function uniqueFolio(existingDocuments) {
  const max = existingDocuments.reduce((highest, document) => {
    const value = Number(document.folio);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return max + 1;
}

function permissionAllowed(permission, session) {
  if (!session) return true;
  return can(permission, session);
}

function transitionAllowed(nextStatus, fromStatus, session) {
  if (!session) return true;
  return canTransitionTo(nextStatus, session, fromStatus);
}

function requiredCargos() {
  const cargos = new Set();
  for (const user of loadUsers()) {
    if (text(user.cargo)) cargos.add(text(user.cargo));
  }
  for (const employee of loadEmployees()) {
    if (text(employee.cargo)) cargos.add(text(employee.cargo));
  }
  return [...cargos];
}

export function hasDemoData() {
  return loadEntities().some(entity => text(entity.name).startsWith(`${DEMO_PREFIX} `))
    || loadProducts().some(product => text(product.nombre).startsWith(`${DEMO_PREFIX} `));
}

export function hasExistingPurchasingData() {
  return loadEntities().length > 0
    || loadDocuments().length > 0
    || loadEmployees().length > 0
    || loadProducts().length > 0
    || loadCategories().length > 0
    || loadRubros().length > 0;
}

export function loadDemoData({ today = new Date(), session = getSession() } = {}) {
  const created = {
    rubros: [],
    categories: [],
    products: [],
    employees: [],
    suppliers: [],
    orders: []
  };
  const limitations = [];
  try {
    if (!permissionAllowed(PERMISSIONS.ENTITIES_CREATE, session)
      || !permissionAllowed(PERMISSIONS.DOCUMENTS_CREATE, session)
      || !permissionAllowed(PERMISSIONS.PRODUCTS_MANAGE, session)) {
      return {
        ok: false,
        created,
        limitations,
        error: 'No tienes permisos para cargar datos de demostración.'
      };
    }

    const existingRubroNames = loadRubros().map(rubro => rubro.nombre || rubro.name || '');
    for (const base of ['Insumos de oficina', 'Tecnología', 'Servicios']) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingRubroNames);
      existingRubroNames.push(name);
      created.rubros.push(addRubro({ nombre: name }));
    }

    const existingCategoryNames = loadCategories().map(category => category.nombre || category.name || '');
    for (const base of ['Papelería', 'Equipos', 'Servicios']) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingCategoryNames);
      existingCategoryNames.push(name);
      created.categories.push(addCategory({ nombre: name }));
    }

    const productSeeds = [
      ['Lápices', 'caja', 25],
      ['Resmas', 'paquete', 40],
      ['Monitores', 'unidad', 8],
      ['Teclados', 'unidad', 15],
      ['Servicio de aseo', 'servicio', 1],
      ['Soporte técnico', 'hora', 10]
    ];
    const existingProductNames = loadProducts().map(product => product.nombre || product.name || '');
    productSeeds.forEach(([base, unit, stock], index) => {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingProductNames);
      existingProductNames.push(name);
      created.products.push(addProduct({
        nombre: name,
        unidad_medida: unit,
        stock,
        id_categoria: (created.categories[index % created.categories.length].id_categoria)
      }));
    });

    const existingEmployees = loadEmployees();
    for (const cargo of requiredCargos()) {
      const hasEmployee = existingEmployees.some(employee => text(employee.cargo).toLowerCase() === cargo.toLowerCase());
      if (hasEmployee) continue;
      const employee = addEmployee({
        nombre: `${DEMO_PREFIX} ${cargo}`,
        cargo
      });
      existingEmployees.push(employee);
      created.employees.push(employee);
    }

    const employee = created.employees[0]
      || existingEmployees.find(item => text(item.cargo)) 
      || existingEmployees[0];
    if (!employee) throw new Error('No fue posible preparar un empleado para la demostración.');

    const suppliers = [];
    const supplierSeeds = ['Suministros del Sur', 'Tecnología Andina', 'Servicios Centrales'];
    supplierSeeds.forEach((base, index) => {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, loadEntities().map(entity => entity.name || ''));
      const supplier = addEntity({
        name,
        code: nextAvailableRut(20000000 + index * 1000),
        origin: 'Nacional',
        rubro_ids: [created.rubros[index % created.rubros.length].id_rubro || created.rubros[index % created.rubros.length].id],
        paymentTerms: 'Contado'
      });
      suppliers.push(supplier);
      created.suppliers.push(supplier);
    });

    let folio = uniqueFolio(loadDocuments());
    const orderPlans = [
      { target: 'borrador', endDate: addDays(today, 12) },
      { target: 'pendiente', endDate: addDays(today, -5) },
      { target: 'pendiente', endDate: addDays(today, 15) },
      { target: 'aprobado', endDate: addDays(today, 20) },
      { target: 'recibido', endDate: addDays(today, -2) },
      { target: 'cancelado', endDate: addDays(today, 18) }
    ];

    orderPlans.forEach((plan, index) => {
      const product = created.products[index % created.products.length];
      const supplier = suppliers[index % suppliers.length];
      const detail = savePurchaseOrder({
        entityId: supplier.entity_id,
        id_empleado: employee.id_empleado || employee.id,
        folio: folio++,
        endDate: plan.endDate,
        paymentTerms: 'Contado',
        lines: [{
          id_producto: product.id_producto || product.id,
          cantidad: index + 1,
          costo_unitario: 1000 * (index + 1)
        }]
      });
      created.orders.push(detail.id);
      const path = plan.target === 'borrador'
        ? []
        : plan.target === 'pendiente'
          ? ['pendiente']
          : plan.target === 'aprobado'
            ? ['pendiente', 'aprobado']
            : plan.target === 'recibido'
              ? ['pendiente', 'aprobado', 'recibido']
              : ['cancelado'];
      let current = detail.status;
      for (const nextStatus of path) {
        if (!transitionAllowed(nextStatus, current, session)) {
          limitations.push(`El rol activo no puede ejecutar la transición a "${nextStatus}"; se conservó el estado "${current}".`);
          break;
        }
        changeOrderStatus(detail.id, nextStatus);
        current = getPurchaseOrderDetail(detail.id).status;
      }
    });

    return {
      ok: true,
      created,
      limitations,
      error: limitations.length ? limitations.join(' ') : null
    };
  } catch (error) {
    for (const orderId of [...created.orders].reverse()) {
      try { deletePurchaseOrder(orderId); } catch { /* best effort */ }
    }
    for (const supplier of [...created.suppliers].reverse()) {
      try { deleteEntity(supplier.id); } catch { /* best effort */ }
    }
    for (const employee of [...created.employees].reverse()) {
      try { deleteEmployee(employee.id_empleado || employee.id); } catch { /* best effort */ }
    }
    for (const product of [...created.products].reverse()) {
      try { deleteProduct(product.id_producto || product.id); } catch { /* best effort */ }
    }
    for (const category of [...created.categories].reverse()) {
      try { deleteCategory(category.id_categoria || category.id); } catch { /* best effort */ }
    }
    return {
      ok: false,
      created,
      limitations,
      error: error?.message || 'No fue posible cargar los datos de demostración.'
    };
  }
}
