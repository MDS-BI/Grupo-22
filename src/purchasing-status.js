export const STATUS_LABELS = Object.freeze({
  borrador: 'Solicitud de compra',
  pendiente: 'Solicitud de compra',
  aprobado: 'Orden de Compra emitida',
  recibido: 'Orden de Compra emitida',
  cancelado: 'Solicitud de compra'
});

const STATUS_CLASSES = Object.freeze({
  borrador: 'status-draft',
  pendiente: 'status-pending',
  aprobado: 'status-approved',
  recibido: 'status-received',
  cancelado: 'status-cancelled'
});

export function statusLabel(status) {
  const key = String(status ?? '').trim();
  return STATUS_LABELS[key] || key;
}

export function statusClass(status) {
  const key = String(status ?? '').trim();
  return `status-badge ${STATUS_CLASSES[key] || 'status-unknown'}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

// 005: nombre específico del estado junto a la denominación del documento (004), para que
// "Solicitud de compra" u "Orden de Compra emitida" no se repitan sin distinguir el estado.
export const STATUS_DETAIL_LABELS = Object.freeze({
  borrador: 'Borrador',
  pendiente: 'Pendiente de aprobación',
  aprobado: 'Aprobada',
  recibido: 'Recibida',
  cancelado: 'Cancelada'
});

export function renderStatusBadge(status, options = {}) {
  const key = String(status ?? '').trim();
  if (!key) return '';
  const className = [statusClass(key), options.className].filter(Boolean).join(' ');
  const badge = `<span class="${escapeHtml(className)}" data-status="${escapeHtml(key)}">${escapeHtml(statusLabel(key))}</span>`;
  const detail = STATUS_DETAIL_LABELS[key];
  if (!detail) return badge;
  return `<span class="status-stack status-stack-${escapeHtml(key)}">${badge}<span class="status-detail">${escapeHtml(detail)}</span></span>`;
}

export function isEmittedStatus(status) {
  return ['aprobado', 'recibido'].includes(String(status ?? '').trim());
}
