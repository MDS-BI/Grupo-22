export const AUTH_USERS_KEY = 'erp_auth:users';
export const AUTH_SESSION_KEY = 'erp_auth:session';

export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  ENTITIES_VIEW: 'entities.view',
  ENTITIES_CREATE: 'entities.create',
  ENTITIES_UPDATE: 'entities.update',
  ENTITIES_DELETE: 'entities.delete',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_UPDATE: 'documents.update',
  DOCUMENTS_DELETE: 'documents.delete',
  ORDERS_SUBMIT: 'orders.submit',
  ORDERS_APPROVE: 'orders.approve',
  ORDERS_RECEIVE: 'orders.receive',
  ORDERS_CANCEL: 'orders.cancel',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  SEARCH_VIEW: 'search.view',
  ORDERS_PRINT: 'orders.print'
});

const P = PERMISSIONS;

const READ_ONLY_PERMISSIONS = [
  P.DASHBOARD_VIEW,
  P.ENTITIES_VIEW,
  P.DOCUMENTS_VIEW,
  P.PRODUCTS_VIEW,
  P.SEARCH_VIEW,
  P.ORDERS_PRINT
];

export const ROLE_DEFINITIONS = Object.freeze({
  administrador: {
    label: 'Administrador',
    permissions: Object.values(P)
  },
  gerente: {
    label: 'Gerente de Compras',
    permissions: [
      ...READ_ONLY_PERMISSIONS,
      P.ENTITIES_CREATE,
      P.ENTITIES_UPDATE,
      P.ENTITIES_DELETE,
      P.DOCUMENTS_CREATE,
      P.DOCUMENTS_UPDATE,
      P.DOCUMENTS_DELETE,
      P.ORDERS_SUBMIT,
      P.ORDERS_APPROVE,
      P.ORDERS_RECEIVE,
      P.ORDERS_CANCEL,
      P.PRODUCTS_MANAGE
    ]
  },
  comprador: {
    label: 'Comprador',
    permissions: [
      ...READ_ONLY_PERMISSIONS,
      P.ENTITIES_CREATE,
      P.ENTITIES_UPDATE,
      P.DOCUMENTS_CREATE,
      P.DOCUMENTS_UPDATE,
      P.DOCUMENTS_DELETE,
      P.ORDERS_SUBMIT,
      P.ORDERS_CANCEL
    ]
  },
  bodeguero: {
    label: 'Bodeguero',
    permissions: [
      P.DASHBOARD_VIEW,
      P.DOCUMENTS_VIEW,
      P.PRODUCTS_VIEW,
      P.SEARCH_VIEW,
      P.ORDERS_PRINT,
      P.ORDERS_RECEIVE,
      P.PRODUCTS_MANAGE
    ]
  },
  consulta: {
    label: 'Consulta',
    permissions: [...READ_ONLY_PERMISSIONS]
  }
});

export const DEFAULT_USERS = Object.freeze([
  { userId: 'ADMIN-001', nombre: 'Valentina Ríos', cargo: 'Administradora del sistema', role: 'administrador', activo: true },
  { userId: 'GER-001', nombre: 'Martín Soto', cargo: 'Gerente de Compras', role: 'gerente', activo: true },
  { userId: 'COMP-001', nombre: 'Camila Vega', cargo: 'Compradora', role: 'comprador', activo: true },
  { userId: 'BOD-001', nombre: 'Diego Fuentes', cargo: 'Jefe de Bodega', role: 'bodeguero', activo: true },
  { userId: 'CONS-001', nombre: 'Ana Pérez', cargo: 'Analista de Compras', role: 'consulta', activo: true }
]);

const TRANSITION_PERMISSIONS = Object.freeze({
  pendiente: P.ORDERS_SUBMIT,
  aprobado: P.ORDERS_APPROVE,
  recibido: P.ORDERS_RECEIVE,
  cancelado: P.ORDERS_CANCEL
});

function now() {
  return new Date().toISOString();
}

function readJson(key, fallback) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the active session still works in memory.
  }
}

export function normalizeUserId(value) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeUser(input) {
  if (!input || typeof input !== 'object') return null;
  const userId = normalizeUserId(input.userId ?? input.user_id ?? input.id);
  if (!/^[A-Z0-9._@-]{2,40}$/.test(userId)) return null;
  const requestedRole = String(input.role ?? input.rol ?? '').trim().toLowerCase();
  const role = ROLE_DEFINITIONS[requestedRole] ? requestedRole : 'consulta';
  return {
    userId,
    nombre: String(input.nombre ?? input.name ?? userId).trim() || userId,
    cargo: String(input.cargo ?? input.position ?? '').trim(),
    role,
    activo: input.activo !== false && input.active !== false
  };
}

function defaultUsers() {
  return DEFAULT_USERS.map(user => ({ ...user }));
}

export function loadUsers() {
  const stored = readJson(AUTH_USERS_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) return defaultUsers();
  return stored.map(normalizeUser).filter(Boolean);
}

export function ensureDefaultUsers() {
  const stored = readJson(AUTH_USERS_KEY, null);
  const normalized = Array.isArray(stored) ? stored.map(normalizeUser).filter(Boolean) : [];
  if (normalized.length === 0) {
    const seeded = defaultUsers();
    writeJson(AUTH_USERS_KEY, seeded);
    return seeded;
  }
  return normalized;
}

export function saveUsers(users = []) {
  const normalized = users.map(normalizeUser).filter(Boolean);
  writeJson(AUTH_USERS_KEY, normalized);
  return normalized;
}

export function findUser(userId) {
  const normalized = normalizeUserId(userId);
  if (!normalized) return null;
  return loadUsers().find(user => user.userId === normalized) || null;
}

export function roleDefinition(role) {
  return ROLE_DEFINITIONS[String(role ?? '').trim().toLowerCase()] || null;
}

export function roleLabel(role) {
  return roleDefinition(role)?.label || String(role ?? '');
}

export function permissionsFor(role) {
  return new Set(roleDefinition(role)?.permissions || []);
}

export function can(permission, sessionOrRole) {
  const role = typeof sessionOrRole === 'string' ? sessionOrRole : sessionOrRole?.role;
  if (!role) return false;
  return permissionsFor(role).has(permission);
}

export function transitionPermission(nextStatus) {
  return TRANSITION_PERMISSIONS[nextStatus] || null;
}

export function canTransitionTo(nextStatus, sessionOrRole) {
  const permission = transitionPermission(nextStatus);
  return permission ? can(permission, sessionOrRole) : false;
}

export function login(userId) {
  ensureDefaultUsers();
  const normalized = normalizeUserId(userId);
  if (!normalized) throw new Error('Ingresa tu User ID para iniciar sesión.');
  const user = findUser(normalized);
  if (!user) throw new Error('El User ID no está registrado en el sistema.');
  if (!user.activo) throw new Error('El usuario está inactivo; contacta al administrador.');
  const session = {
    userId: user.userId,
    nombre: user.nombre,
    role: user.role,
    loginAt: now()
  };
  writeJson(AUTH_SESSION_KEY, session);
  return session;
}

export function getSession() {
  const stored = readJson(AUTH_SESSION_KEY, null);
  if (!stored || !stored.userId) return null;
  const user = findUser(stored.userId);
  if (!user || !user.activo) {
    clearSession();
    return null;
  }
  const session = {
    userId: user.userId,
    nombre: user.nombre,
    role: user.role,
    loginAt: stored.loginAt || now()
  };
  if (stored.role !== session.role || stored.nombre !== session.nombre) writeJson(AUTH_SESSION_KEY, session);
  return session;
}

export function clearSession() {
  try {
    globalThis.localStorage?.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export function isAuthenticated() {
  return getSession() !== null;
}
