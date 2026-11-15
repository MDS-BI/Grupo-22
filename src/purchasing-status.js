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

export function renderStatusBadge(status, options = {}) {
  const key = String(status ?? '').trim();
  if (!key) return '';
  const className = [statusClass(key), options.className].filter(Boolean).join(' ');
  return `<span class="${escapeHtml(className)}" data-status="${escapeHtml(key)}">${escapeHtml(statusLabel(key))}</span>`;
}

export function isEmittedStatus(status) {
  return ['aprobado', 'recibido'].includes(String(status ?? '').trim());
}
