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
  upsertSupplierPrice,
  changeOrderStatus,
  clearPurchasingData,
  getPurchaseOrderDetail,
  loadCategories,
  loadEmployees,
  loadProducts,
  restorePurchasingData,
  savePurchaseOrder,
  snapshotPurchasingData,
  loadAreas,
  saveAreas,
  loadBudgets,
  saveBudgets,
  loadOrderMetadata
} from './purchasing-storage.js';
import { monthKey, areaSpend } from './domain/budget.js';
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

// [nombre, unidad, categoría, stock, stock mínimo (007 · US2)]. Quedan bajo el mínimo:
// Archivadores y Escritorio (ya en una solicitud abierta) y Lámpara, Guantes y Papel higiénico.
const PRODUCT_SEEDS = [
  ['Resma de papel A4', 'paquete', 'Papelería', 40, 20],
  ['Lápices grafito', 'caja', 'Papelería', 25, 10],
  ['Archivadores', 'unidad', 'Papelería', 12, 15],
  ['Monitor de 24 pulgadas', 'unidad', 'Tecnología', 8, 3],
  ['Teclado mecánico', 'unidad', 'Tecnología', 15, 5],
  ['Mouse inalámbrico', 'unidad', 'Tecnología', 30, 10],
  ['Silla ergonómica', 'unidad', 'Mobiliario', 4, 2],
  ['Escritorio plegable', 'unidad', 'Mobiliario', 0, 2],
  ['Lámpara de escritorio', 'unidad', 'Mobiliario', 6, 8],
  ['Servicio de aseo mensual', 'servicio', 'Servicios', 1, 0],
  ['Soporte técnico remoto', 'hora', 'Servicios', 20, 0],
  ['Licencia de respaldo', 'licencia', 'Tecnología', 2, 0],
  ['Guantes de nitrilo', 'caja', 'Insumos de aseo', 0, 5],
  ['Detergente industrial', 'bidón', 'Insumos de aseo', 9, 4],
  ['Papel higiénico', 'fardo', 'Insumos de aseo', 35, 40]
];

// 007 · US4: áreas solicitantes de la demostración y su presupuesto mensual en CLP.
// El de Tecnología se calcula al cargar para que la solicitud pendiente de Cobre y Cumbre lo exceda.
const AREA_SEEDS = [
  ['adm', 'Administración', 2500000],
  ['ops', 'Operaciones', 1500000],
  ['tec', 'Tecnología', null]
];

// 007 · US7: tramos por cantidad [proveedor, producto, [[desde, precio], ...]].
const TIER_SEEDS = [
  [0, 0, [[1, 5500], [10, 5100], [50, 4800]]],
  [2, 5, [[1, 28000], [5, 26500]]],
  [3, 1, [[1, 1800], [20, 1650]]]
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

// 006: precios acordados adicionales [proveedor, producto, precio] para que todo producto
// tenga al menos un proveedor y cada proveedor (incluido el extranjero sin órdenes) tenga lista.
const EXTRA_PRICE_SEEDS = [
  [4, 8, 18990],
  [7, 11, 110],
  [7, 10, 40],
  [1, 0, 5600],
  [5, 5, 27500]
];

const ORDER_PLANS = [
  {
    target: 'borrador',
    supplier: 0,
    area: 'tec',
    requester: 'comprador',
    endOffset: 10,
    lines: [[7, 1, 85000], [0, 2, 5500]]
  },
  {
    target: 'borrador',
    supplier: 1,
    area: 'adm',
    requester: 'gerente',
    endOffset: 16,
    lines: [[2, 4, 3200]]
  },
  {
    target: 'pendiente',
    supplier: 2,
    area: 'tec',
    requester: 'comprador',
    endOffset: -5,
    lines: [[3, 2, 145000], [5, 1, 28000]]
  },
  {
    target: 'pendiente',
    supplier: 3,
    area: 'ops',
    requester: 'bodeguero',
    endOffset: -3,
    lines: [[1, 8, 1800], [13, 3, 12000]]
  },
  {
    target: 'aprobado',
    supplier: 4,
    area: 'adm',
    requester: 'comprador',
    endOffset: 8,
    lines: [[6, 2, 74990]]
  },
  {
    target: 'aprobado',
    supplier: 5,
    area: 'tec',
    requester: 'consulta',
    endOffset: 12,
    lines: [[4, 5, 23990], [2, 6, 3200]]
  },
  {
    target: 'aprobado',
    supplier: 6,
    area: 'tec',
    requester: 'gerente',
    endOffset: 20,
    lines: [[11, 3, 120], [9, 2, 450]]
  },
  {
    target: 'recibido',
    supplier: 0,
    area: 'adm',
    requester: 'comprador',
    endOffset: -6,
    emitOffset: -12,
    receiveOffset: -7,
    lines: [[0, 4, 5500], [1, 3, 1800]]
  },
  {
    target: 'recibido',
    supplier: 2,
    area: 'tec',
    requester: 'gerente',
    endOffset: -4,
    emitOffset: -10,
    receiveOffset: -1,
    lines: [[3, 2, 145000], [5, 2, 28000]]
  },
  {
    target: 'recibido',
    supplier: 0,
    area: 'ops',
    requester: 'bodeguero',
    endOffset: -2,
    emitOffset: -9,
    receiveOffset: -3,
    lines: [[6, 1, 74990], [10, 4, 35000]]
  },
  // 007 · US1: historial de Fábrica de Ideas con 3 de 4 entregas a tiempo (calificación B).
  { target: 'recibido', supplier: 5, area: 'tec', requester: 'gerente', endOffset: -8, emitOffset: -14, receiveOffset: -9, lines: [[4, 2, 23990]] },
  { target: 'recibido', supplier: 5, area: 'tec', requester: 'bodeguero', endOffset: -5, emitOffset: -11, receiveOffset: -6, lines: [[5, 1, 27500]] },
  { target: 'recibido', supplier: 5, area: 'tec', requester: 'gerente', endOffset: -3, emitOffset: -9, receiveOffset: -4, lines: [[4, 1, 23990]] },
  { target: 'recibido', supplier: 5, area: 'ops', requester: 'bodeguero', endOffset: -7, emitOffset: -13, receiveOffset: -4, lines: [[5, 1, 27500]] },
  {
    target: 'cancelado',
    cancelPath: 'direct',
    supplier: 1,
    area: 'adm',
    requester: 'comprador',
    endOffset: 6,
    lines: [[12, 2, 7600]]
  },
  {
    target: 'cancelado',
    cancelPath: 'pending',
    supplier: 4,
    area: 'ops',
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
    supplierPrices: [],
    areas: [],
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
    for (const [base, unit, categoryName, stock, stockMinimo] of PRODUCT_SEEDS) {
      const name = uniqueName(`${DEMO_PREFIX} ${base}`, existingProductNames);
      existingProductNames.push(name);
      const category = categoriesByName.get(categoryName);
      if (!category) throw new Error(`No fue posible preparar la categoría "${categoryName}" de la demostración.`);
      created.products.push(addProduct({
        nombre: name,
        unidad_medida: unit,
        stock,
        ...(stockMinimo ? { stock_minimo: stockMinimo } : {}),
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

    // 006: lista de precios producto–proveedor coherente con los precios de las órdenes de ejemplo.
    const priceSeeds = [
      ...ORDER_PLANS.flatMap(plan => plan.lines.map(([productIndex, , price]) => [plan.supplier, productIndex, price])),
      ...EXTRA_PRICE_SEEDS
    ];
    const seenPrices = new Set();
    for (const [supplierIndex, productIndex, price] of priceSeeds) {
      const key = `${supplierIndex}:${productIndex}`;
      if (seenPrices.has(key)) continue;
      seenPrices.add(key);
      const supplier = suppliers[supplierIndex];
      const product = created.products[productIndex];
      const tiers = TIER_SEEDS.find(([tierSupplier, tierProduct]) => tierSupplier === supplierIndex && tierProduct === productIndex)?.[2];
      created.supplierPrices.push(upsertSupplierPrice({
        entity_id: supplier.entity_id,
        id_producto: product.id_producto || product.id,
        precio: tiers ? tiers[0][1] : price,
        ...(tiers ? { tramos: tiers.map(([desde, precio]) => ({ desde, precio })) } : {})
      }, { skipAccessCheck: true }));
    }

    // 007 · US4: áreas (se crean antes de las órdenes, porque con áreas activas el área es obligatoria).
    const existingAreas = loadAreas();
    const areaIds = new Map();
    const areaTimestamp = new Date().toISOString();
    const newAreas = AREA_SEEDS.map(([key, nombre]) => {
      const area = {
        id_area: `area-demo-${key}-${Date.now().toString(36)}`,
        nombre: uniqueName(nombre, existingAreas.map(item => item.nombre)),
        activa: true,
        createdAt: areaTimestamp,
        updatedAt: areaTimestamp
      };
      areaIds.set(key, area.id_area);
      return area;
    });
    saveAreas([...existingAreas, ...newAreas]);
    created.areas = newAreas;

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
        id_area: areaIds.get(plan.area) || '',
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
          // 007 · US1: fechas de emisión y recepción variadas para que la evaluación muestre A/B/C.
          const at = nextStatus === 'recibido' && plan.receiveOffset !== undefined
            ? timestampFor(today, plan.receiveOffset)
            : plan.emitOffset !== undefined ? timestampFor(today, plan.emitOffset) : transitionAt;
          changeOrderStatus(detail.id, nextStatus, at);
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

    // 007 · US4: presupuestos del mes en curso. Tecnología queda 150.000 por sobre lo ya emitido,
    // así la solicitud pendiente de Cobre y Cumbre lo excede (aviso en el detalle y en la campana).
    const month = monthKey(today);
    const metadataByOrder = new Map(loadOrderMetadata().map(item => [item.id_orden_compra, item]));
    const budgets = loadBudgets().filter(item => !newAreas.some(area => area.id_area === item.id_area));
    for (const [key, , amount] of AREA_SEEDS) {
      const areaId = areaIds.get(key);
      const spent = areaSpend(loadDocuments(), metadataByOrder, areaId, month).clp;
      const monto = amount ?? Math.ceil((spent + 150000) / 10000) * 10000;
      budgets.push({ id: `budget-demo-${key}-${month}`, id_area: areaId, mes: month, monto, createdAt: areaTimestamp, updatedAt: areaTimestamp });
    }
    saveBudgets(budgets);

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
