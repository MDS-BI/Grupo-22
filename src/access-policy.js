import {
  PERMISSIONS,
  PERMISSION_DENIED_MESSAGE,
  can,
  findUser,
  normalizeUserId
} from './auth.js';
import { emissionDateFor } from './domain/purchasing.js';

const EMITTED_STATUSES = ['aprobado', 'recibido'];

function permissionError() {
  const error = new Error(PERMISSION_DENIED_MESSAGE);
  error.code = 'PERMISSION_DENIED';
  return error;
}

function orderError(message) {
  const error = new Error(message);
  error.code = 'ORDER_INVALID';
  return error;
}

function sessionRole(sessionOrRole) {
  return typeof sessionOrRole === 'string' ? sessionOrRole : sessionOrRole?.role;
}

export function documentLabel(status) {
  return EMITTED_STATUSES.includes(String(status ?? '').trim())
    ? 'Orden de Compra emitida'
    : 'Solicitud de compra';
}

export function canCreateDocument(session) {
  return !session || can(PERMISSIONS.DOCUMENTS_CREATE, session);
}

export function canEditDocument(session) {
  return !session || can(PERMISSIONS.DOCUMENTS_UPDATE, session);
}

export function canApprove(session) {
  return !session || can(PERMISSIONS.ORDERS_APPROVE, session);
}

export function canReject(session) {
  return !session || can(PERMISSIONS.ORDERS_REJECT, session);
}

export function canCancel(session) {
  return !session || can(PERMISSIONS.ORDERS_CANCEL, session);
}

export function canViewCreditLimit(session) {
  return !session || sessionRole(session) !== 'comprador';
}

export function sanitizeEntityPayload(payload = {}, { session = null, existing = null } = {}) {
  const sanitized = { ...payload };
  if (canViewCreditLimit(session)) return sanitized;
  const requested = sanitized.creditLimit;
  const current = existing?.creditLimit;
  const hasValue = requested !== undefined && requested !== null && String(requested).trim() !== '';
  const changed = hasValue && Number(requested) !== Number(current);
  if (changed) throw permissionError();
  delete sanitized.creditLimit;
  return sanitized;
}

export function ensureRequesterEmployee({ session = null, employees = [], createEmployee = null } = {}) {
  if (!session || session.role !== 'comprador') return null;
  const userId = normalizeUserId(session.userId);
  if (!userId) return null;
  const existing = employees.find(employee => normalizeUserId(employee.userId ?? employee.user_id) === userId);
  if (existing) return existing;
  if (typeof createEmployee !== 'function') return null;
  const user = findUser(userId) || {};
  return createEmployee({
    nombre: String(user.nombre || session.nombre || userId).trim(),
    cargo: String(user.cargo || session.cargo || '').trim() || 'Comprador',
    userId,
    user_id: userId
  });
}

export function resolveRequesterForSave({
  session = null,
  requestedEmployeeId = '',
  existingEmployeeId = '',
  employees = [],
  createEmployee = null
} = {}) {
  if (!session) return requestedEmployeeId || existingEmployeeId || '';
  if (session.role === 'comprador') {
    const own = ensureRequesterEmployee({ session, employees, createEmployee });
    const ownId = own ? (own.id_empleado || own.id) : '';
    if (!ownId) throw orderError('No fue posible resolver el empleado solicitante del comprador.');
    if (requestedEmployeeId && requestedEmployeeId !== ownId) {
      const requested = employees.find(employee => (employee.id_empleado || employee.id) === requestedEmployeeId);
      const requestedUser = normalizeUserId(requested?.userId ?? requested?.user_id);
      if (requestedUser && requestedUser !== normalizeUserId(session.userId)) throw permissionError();
    }
    return ownId;
  }
  if (['administrador', 'gerente'].includes(session.role)) {
    const target = requestedEmployeeId || existingEmployeeId || '';
    if (!target) return '';
    const exists = employees.some(employee => (employee.id_empleado || employee.id) === target);
    if (!exists) throw orderError('Debe seleccionar un empleado solicitante registrado.');
    return target;
  }
  return requestedEmployeeId || existingEmployeeId || '';
}

export { emissionDateFor };
