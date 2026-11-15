import {
  addEntity,
  addRubro,
  clearAll,
  loadDocuments,
  loadEntities,
  loadRubros,
  restoreBaseData,
  snapshotBaseData
} from './storage.js';
import {
  addCategory,
  addEmployee,
  addProduct,
  changeOrderStatus,
  clearPurchasingData,
  getPurchaseOrderDetail,
  loadCategories,
  loadEmployees,
  loadProducts,
  restorePurchasingData,
  savePurchaseOrder,
  snapshotPurchasingData
} from './purchasing-storage.js';
import {
  PERMISSIONS,
  can,
  canTransitionTo,
  clearSession,
  getSession,
  isDemoUserId,
  loadDemoUsers,
  loadUsers,
  replaceDemoUsers,
  restoreAuthData,
  roleLabel,
  snapshotAuthData
} from './auth.js';

export const DEMO_PREFIX = 'Demo';

export const DEMO_USER_DEFINITIONS = Object.freeze([
  { userId: 'DEMO-ADMIN', role: 'administrador', nombre: 'Usuario de prueba Administrador' },
  { userId: 'DEMO-GERENTE', role: 'gerente', nombre: 'Usuario de prueba Gerente' },
  { userId: 'DEMO-COMPRADOR', role: 'comprador', nombre: 'Usuario de prueba Comprador' },
  { userId: 'DEMO-BODEGUERO', role: 'bodeguero', nombre: 'Usuario de prueba Bodeguero' },
  { userId: 'DEMO-CONSULTA', role: 'consulta', nombre: 'Usuario de prueba Consulta' }
]);

export const DEMO_USER_IDS = Object.freeze(DEMO_USER_DEFINITIONS.map(user => user.userId));

const RUBRO_SEEDS = ['Insumos de oficina', 'Tecnología', 'Servicios'];

const CATEGORY_SEEDS = ['Papelería', 'Tecnología', 'Mobiliario', 'Servicios', 'Insumos de aseo'];

const PRODUCT_SEEDS = [
  ['Resma de papel A4', 'paquete', 'Papelería', 40],
  ['Lápices grafito', 'caja', 'Papelería', 25],
  ['Archivadores', 'unidad', 'Papelería', 12],
  ['Monitor de 24 pulgadas', 'unidad', 'Tecnología', 8],
  ['Teclado mecánico', 'unidad', 'Tecnología', 15],
  ['Mouse inalámbrico', 'unidad', 'Tecnología', 30],
  ['Silla ergonómica', 'unidad', 'Mobiliario', 4],
  ['Escritorio plegable', 'unidad', 'Mobiliario', 0],
  ['Lámpara de escritorio', 'unidad', 'Mobiliario', 6],
  ['Servicio de aseo mensual', 'servicio', 'Servicios', 1],
  ['Soporte técnico remoto', 'hora', 'Servicios', 20],
  ['Licencia de respaldo', 'licencia', 'Tecnología', 2],
  ['Guantes de nitrilo', 'caja', 'Insumos de aseo', 0],
  ['Detergente industrial', 'bidón', 'Insumos de aseo', 9],
  ['Papel higiénico', 'fardo', 'Insumos de aseo', 35]
];

const SUPPLIER_SEEDS = [
  {
    name: 'Aurora Andina SpA',
    origin: 'Nacional',
    paymentTerms: 'Contado',
    rubros: ['Tecnología'],
    rutSeed: 22000000
  },
  {
    name: 'Bosque de Papel Ltda.',
    origin: 'Nacional',
    paymentTerms: '30 días',
    rubros: ['Insumos de oficina'],
    rutSeed: 22100000
  },
  {
    name: 'Cobre y Cumbre SpA',
    origin: 'Nacional',
    paymentTerms: '60 días',
    rubros: ['Tecnología', 'Insumos de oficina'],
    rutSeed: 22200000
  },
  {
    name: 'Duna Logística SpA',
    origin: 'Nacional',
    paymentTerms: '90 días',
    rubros: ['Servicios'],
    rutSeed: 22300000
  },
  {
    name: 'Estrella de Sal SpA',
    origin: 'Nacional',
    paymentTerms: 'Contado',
    rubros: ['Insumos de oficina', 'Servicios'],
    rutSeed: 22400000
  },
  {
    name: 'Fábrica de Ideas SpA',
    origin: 'Nacional',
    paymentTerms: '30 días',
    rubros: ['Tecnología'],
    rutSeed: 22500000
  },
  {
    name: 'Boreal Mercantil AB',
    origin: 'Extranjero',
    foreignTaxId: 'SE-DEMO-8831',
    paymentTerms: '60 días',
    rubros: ['Tecnología']
  },
  {
    name: 'Pacífico Lejano Trading Co.',
    origin: 'Extranjero',
    foreignTaxId: 'SG-DEMO-4417',
    paymentTerms: '90 días',
    rubros: ['Tecnología', 'Servicios']
  }
];

const ORDER_PLANS = [
  {
    target: 'borrador',
    supplier: 0,
    requester: 'comprador',
    endOffset: 10,
    lines: [[7, 1, 85000], [0, 2, 5500]]
  },
  {
    target: 'borrador',
    supplier: 1,
    requester: 'gerente',
    endOffset: 16,
    lines: [[2, 4, 3200]]
  },
  {
    target: 'pendiente',
    supplier: 2,
    requester: 'comprador',
    endOffset: -5,
    lines: [[3, 2, 145000], [5, 1, 28000]]
  },
  {
    target: 'pendiente',
    supplier: 3,
    requester: 'bodeguero',
    endOffset: -3,
    lines: [[1, 8, 1800], [13, 3, 12000]]
  },
  {
    target: 'aprobado',
    supplier: 4,
    requester: 'comprador',
    endOffset: 8,
    lines: [[6, 2, 74990]]
  },
  {
    target: 'aprobado',
    supplier: 5,
    requester: 'consulta',
    endOffset: 12,
    lines: [[4, 5, 23990], [2, 6, 3200]]
  },
  {
    target: 'aprobado',
    supplier: 6,
    requester: 'gerente',
    endOffset: 20,
    lines: [[11, 3, 120], [9, 2, 450]]
  },
  {
    target: 'recibido',
    supplier: 0,
    requester: 'comprador',
    endOffset: -6,
    lines: [[0, 4, 5500], [1, 3, 1800]]
  },
  {
    target: 'recibido',
    supplier: 2,
    requester: 'gerente',
    endOffset: -4,
    lines: [[3, 2, 145000], [5, 2, 28000]]
  },
  {
    target: 'recibido',
    supplier: 0,
    requester: 'bodeguero',
    endOffset: -2,
    lines: [[6, 1, 74990], [10, 4, 35000]]
  },
  {
    target: 'cancelado',
    cancelPath: 'direct',
    supplier: 1,
    requester: 'comprador',
    endOffset: 6,
    lines: [[12, 2, 7600]]
  },
  {
    target: 'cancelado',
    cancelPath: 'pending',
    supplier: 4,
    requester: 'consulta',
    endOffset: 9,
    lines: [[14, 10, 950]]
  }
];

function text(value) {
  return String(value ?? '').trim();
}

function addDays(base, days) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timestampFor(base, days = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 12, 0, 0).toISOString();
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

function transitionPath(plan) {
  if (plan.target === 'borrador') return [];
  if (plan.target === 'pendiente') return ['pendiente'];
  if (plan.target === 'aprobado') return ['pendiente', 'aprobado'];
  if (plan.target === 'recibido') return ['pendiente', 'aprobado', 'recibido'];
  if (plan.target === 'cancelado') {
    return plan.cancelPath === 'pending' ? ['pendiente', 'cancelado'] : ['cancelado'];
  }
  return [];
}

function existingCargos() {
  const cargos = new Set();
  for (const user of loadUsers()) {
    if (text(user.cargo)) cargos.add(text(user.cargo));
  }
  for (const employee of loadEmployees()) {
    if (text(employee.cargo)) cargos.add(text(employee.cargo));
  }
  for (const definition of DEMO_USER_DEFINITIONS) {
    cargos.add(roleLabel(definition.role));
  }
  return [...cargos];
}

export function hasDemoUsers() {
  return loadDemoUsers().length > 0;
}

export function hasDemoData() {
  return hasDemoUsers()
    || loadRubros().some(rubro => text(rubro.nombre).startsWith(`${DEMO_PREFIX} `))
    || loadEntities().some(entity => text(entity.name).startsWith(`${DEMO_PREFIX} `))
    || loadCategories().some(category => text(category.nombre).startsWith(`${DEMO_PREFIX} `))
    || loadProducts().some(product => text(product.nombre).startsWith(`${DEMO_PREFIX} `))
    || loadEmployees().some(employee => text(employee.nombre).startsWith(`${DEMO_PREFIX} `));
}

export function hasExistingPurchasingData() {
  return loadEntities().length > 0
    || loadDocuments().length > 0
    || loadEmployees().length > 0
    || loadProducts().length > 0
    || loadCategories().length > 0
    || loadRubros().length > 0;
}

export function requiresDemoReplacement() {
  return hasExistingPurchasingData() || hasDemoUsers();
}

function snapshotDemoState() {
  return {
    base: snapshotBaseData(),
    purchasing: snapshotPurchasingData(),
    auth: snapshotAuthData()
  };
}

function restoreDemoState(snapshot) {
  if (Array.isArray(snapshot?.base?.documents)) restoreBaseData(snapshot.base);
  if (snapshot?.purchasing) restorePurchasingData(snapshot.purchasing);
  if (snapshot?.auth) restoreAuthData(snapshot.auth);
}

function createDemoUsers(cargos = existingCargos()) {
  const definitions = [...DEMO_USER_DEFINITIONS];
  const employeesByName = loadEmployees().map(employee => employee.nombre || employee.name || '');
  const employeesByUser = new Map();

  for (const definition of definitions) {
    const cargo = roleLabel(definition.role);
    const employee = addEmployee({
      nombre: uniqueName(`${DEMO_PREFIX} Empleado ${cargo}`, employeesByName),
      cargo,
      userId: definition.userId,
      user_id: definition.userId
    });
    employeesByName.push(employee.nombre);
    employeesByUser.set(definition.userId, employee);
  }

  const coveredCargos = new Set(definitions.map(definition => roleLabel(definition.role).toLowerCase()));
  for (const cargo of cargos) {
    if (!cargo || coveredCargos.has(cargo.toLowerCase())) continue;
    const employee = addEmployee({
      nombre: uniqueName(`${DEMO_PREFIX} Empleado ${cargo}`, employeesByName),
      cargo
    });
    employeesByName.push(employee.nombre);
  }

  const users = definitions.map(definition => {
    const employee = employeesByUser.get(definition.userId);
    return {
      userId: definition.userId,
      nombre: definition.nombre,
      cargo: roleLabel(definition.role),
      role: definition.role,
      activo: true,
      id_empleado: employee.id_empleado || employee.id
    };
  });
  return { users, employees: [...employeesByUser.values()] };
}

export function loadDemoData({
  today = new Date(),
  session = getSession(),
  replaceExisting = false,
  onBeforeCreate = null
} = {}) {
  const created = {
    rubros: [],
    categories: [],
    products: [],
    employees: [],
    users: [],
    suppliers: [],
    orders: []
  };
  const limitations = [];

  if (!permissionAllowed(PERMISSIONS.ENTITIES_CREATE, session)
    || !permissionAllowed(PERMISSIONS.DOCUMENTS_CREATE, session)
    || !permissionAllowed(PERMISSIONS.PRODUCTS_MANAGE, session)) {
    return {
      ok: false,
      created,
      limitations,
      requiresConfirmation: false,
      error: 'No tienes permisos para cargar datos de demostración.'
    };
  }

  const replacing = requiresDemoReplacement();
  if (replacing && !replaceExisting) {
    return {
      ok: false,
      created,
      limitations,
      requiresConfirmation: true,
      error: 'Ya existen datos del módulo. Confirma el reemplazo por datos de demostración.'
    };
  }

  const storedSession = getSession();
  const sessionWasDemo = isDemoUserId(storedSession?.userId);
  const priorCargos = existingCargos();
  const snapshot = snapshotDemoState();

  try {
    if (replacing) {
      clearAll();
      clearPurchasingData();
    }
    replaceDemoUsers([]);

    const existingRubroNames = loadRubros().map(rubro => rubro.nombre || rubro.name || '');
    for (const base of RUBRO_SEEDS) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingRubroNames);
      existingRubroNames.push(name);
      created.rubros.push(addRubro({ nombre: name }));
    }
    const rubrosByName = new Map(created.rubros.map(rubro => [
      text(rubro.nombre).replace(`${DEMO_PREFIX} `, ''),
      rubro
    ]));

    const existingCategoryNames = loadCategories().map(category => category.nombre || category.name || '');
    for (const base of CATEGORY_SEEDS) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingCategoryNames);
      existingCategoryNames.push(name);
      created.categories.push(addCategory({ nombre: name }));
    }
    const categoriesByName = new Map(created.categories.map(category => [
      text(category.nombre).replace(`${DEMO_PREFIX} `, ''),
      category
    ]));

    const existingProductNames = loadProducts().map(product => product.nombre || product.name || '');
    for (const [base, unit, categoryName, stock] of PRODUCT_SEEDS) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingProductNames);
      existingProductNames.push(name);
      const category = categoriesByName.get(categoryName);
      if (!category) throw new Error(`No fue posible preparar la categoría "${categoryName}" de la demostración.`);
      created.products.push(addProduct({
        nombre: name,
        unidad_medida: unit,
        stock,
        id_categoria: category.id_categoria || category.id
      }));
    }

    const suppliers = [];
    for (const seed of SUPPLIER_SEEDS) {
      const rubroIds = seed.rubros
        .map(name => rubrosByName.get(name))
        .filter(Boolean)
        .map(rubro => rubro.id_rubro || rubro.id);
      const supplier = addEntity({
        name: uniqueName(`${DEMO_PREFIX} ${seed.name}`, loadEntities().map(entity => entity.name || '')),
        code: seed.origin === 'Nacional' ? nextAvailableRut(seed.rutSeed) : '',
        origin: seed.origin,
        paymentTerms: seed.paymentTerms,
        rubro_ids: rubroIds,
        ...(seed.foreignTaxId ? { foreignTaxId: seed.foreignTaxId } : {})
      });
      suppliers.push(supplier);
      created.suppliers.push(supplier);
    }

    const demoUsers = createDemoUsers(priorCargos);
    created.employees = demoUsers.employees;
    replaceDemoUsers(demoUsers.users);
    created.users = loadDemoUsers();
    const employeesByRole = new Map();
    for (const definition of DEMO_USER_DEFINITIONS) {
      const employee = created.employees.find(item =>
        text(item.userId ?? item.user_id) === definition.userId
      );
      if (employee) employeesByRole.set(definition.role, employee);
    }

    if (typeof onBeforeCreate === 'function') onBeforeCreate(created);

    let folio = uniqueFolio(loadDocuments());
    const transitionAt = timestampFor(today);
    for (const plan of ORDER_PLANS) {
      const supplier = suppliers[plan.supplier];
      const requester = employeesByRole.get(plan.requester) || created.employees[0];
      if (!supplier || !requester) throw new Error('No fue posible preparar los solicitantes de la demostración.');

      const detail = savePurchaseOrder({
        entityId: supplier.entity_id,
        id_empleado: requester.id_empleado || requester.id,
        folio: folio++,
        endDate: addDays(today, plan.endOffset),
        paymentTerms: supplier.paymentTerms,
        lines: plan.lines.map(([productIndex, cantidad, costoUnitario]) => ({
          id_producto: created.products[productIndex].id_producto || created.products[productIndex].id,
          cantidad,
          costo_unitario: costoUnitario
        }))
      });
      created.orders.push(detail.id);

      let current = detail.status;
      for (const nextStatus of transitionPath(plan)) {
        if (!transitionAllowed(nextStatus, current, session)) {
          limitations.push(`El rol activo no puede ejecutar la transición a "${nextStatus}"; se conservó el estado "${current}".`);
          break;
        }
        try {
          changeOrderStatus(detail.id, nextStatus, transitionAt);
        } catch (error) {
          if (error?.code === 'PERMISSION_DENIED') {
            limitations.push(`El rol activo no puede ejecutar la transición a "${nextStatus}"; se conservó el estado "${current}".`);
            break;
          }
          throw error;
        }
        current = getPurchaseOrderDetail(detail.id).status;
      }
    }

    let sessionInvalidated = false;
    if (sessionWasDemo) {
      clearSession();
      sessionInvalidated = true;
    }

    return {
      ok: true,
      created,
      limitations,
      requiresConfirmation: false,
      replaced: replacing,
      sessionInvalidated,
      error: limitations.length ? limitations.join(' ') : null
    };
  } catch (error) {
    restoreDemoState(snapshot);
    return {
      ok: false,
      created,
      limitations,
      requiresConfirmation: false,
      replaced: false,
      sessionInvalidated: false,
      error: error?.message || 'No fue posible cargar los datos de demostración.'
    };
  }
}
