// 007 · US5 — avisos derivados del estado actual, por rol.
import { attentionItemsForRole } from '../ui-dashboard.js';

const DAY_MS = 86400000;

function recentChange(history, to, from, today, days = 30) {
  const record = [...history].reverse().find(item => item.to === to && (!from || item.from === from));
  if (!record) return null;
  const changed = new Date(record.changedAt);
  if (Number.isNaN(changed.getTime()) || today - changed > days * DAY_MS) return null;
  return record;
}

/**
 * context: { orders, suppliers, historyByOrder (Map), ownEmployeeId, today, budgetAlerts: [{ orderId, reference, excess }] }
 */
export function notificationsFor(role, context = {}) {
  const { orders = [], suppliers = [], historyByOrder = new Map(), ownEmployeeId = '', today = new Date(), budgetAlerts = [] } = context;
  const normalizedRole = String(role || 'administrador');
  const items = [];
  const attention = attentionItemsForRole(normalizedRole, orders, { suppliers, ownEmployeeId, today });
  if (normalizedRole === 'comprador') {
    const names = new Map(suppliers.map(supplier => [supplier.entity_id, supplier.name]));
    for (const order of orders) {
      if (!ownEmployeeId || String(order.id_empleado || '') !== ownEmployeeId) continue;
      const history = historyByOrder.get(order.id) || [];
      const approved = ['aprobado', 'recibido'].includes(order.status) ? recentChange(history, 'aprobado', 'pendiente', today) : null;
      const rejected = order.status === 'cancelado' ? recentChange(history, 'cancelado', 'pendiente', today) : null;
      const record = approved || rejected;
      if (!record) continue;
      const type = approved ? 'aprobada' : 'rechazada';
      items.push({
        id: `${type}:${order.id}:${order.status}`,
        tipo: type,
        orderId: order.id,
        referencia: order.reference || '',
        texto: `${approved ? 'Solicitud aprobada' : 'Solicitud rechazada'} · ${names.get(order.entity_id) || ''}`,
        fecha: record.changedAt
      });
    }
  }
  for (const item of attention) {
    const overdue = /atrasada/i.test(item.reason);
    let type = 'atrasada';
    if (item.status === 'pendiente') type = 'pendiente-aprobacion';
    else if (item.status === 'aprobado' && !overdue) type = 'por-recibir';
    items.push({ id: `${type}:${item.id}:${item.status}`, tipo: type, orderId: item.id, referencia: item.reference, texto: `${item.reason} · ${item.supplier}`, fecha: item.endDate });
  }
  if (normalizedRole === 'administrador' || normalizedRole === 'gerente') {
    for (const alert of budgetAlerts) {
      items.push({ id: `presupuesto-excedido:${alert.orderId}:${alert.month}`, tipo: 'presupuesto-excedido', orderId: alert.orderId, referencia: alert.reference, texto: `Excede el presupuesto de ${alert.area}`, fecha: alert.month });
    }
  }
  return items;
}

export function unreadCount(notifications = [], readIds = []) {
  const read = new Set(readIds);
  return notifications.filter(item => !read.has(item.id)).length;
}
