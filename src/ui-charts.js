export function brandMarkSvg(label = 'Compras') {
  const safe = String(label).replace(/[<>&"]/g, '');
  return `<svg class="brand-mark-svg" viewBox="0 0 120 36" role="img" aria-label="${safe}">
    <rect x="0" y="0" width="36" height="36" rx="8" fill="#0F2A3D"/>
    <path d="M8 24l6-10 5 6 4-4 5 8" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="14" cy="14" r="2.2" fill="#F59E0B"/>
    <text x="46" y="23" font-family="Space Grotesk, Segoe UI, sans-serif" font-size="14" font-weight="700" fill="currentColor">Compras</text>
  </svg>`;
}

export function brandPatternSvg() {
  return `<svg class="brand-pattern" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F2A3D"/>
        <stop offset="100%" stop-color="#123b55"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#brandGrad)"/>
    <g stroke="#F59E0B" stroke-opacity="0.18" fill="none">
      <path d="M-20 320 L120 200 L220 260 L420 80" stroke-width="2"/>
      <path d="M-20 360 L120 240 L220 300 L420 120" stroke-width="1"/>
      <circle cx="120" cy="200" r="6" fill="#F59E0B" fill-opacity="0.25" stroke="none"/>
      <circle cx="220" cy="260" r="5" fill="#F59E0B" fill-opacity="0.2" stroke="none"/>
      <rect x="40" y="40" width="80" height="80" rx="12" stroke-width="1"/>
      <rect x="260" y="260" width="100" height="100" rx="14" stroke-width="1"/>
    </g>
  </svg>`;
}

// 005 · US2 — gráficos del Panel en SVG propio, con tabla equivalente para lectores de pantalla.
const STATUS_COLOR_VARS = Object.freeze({
  borrador: '--status-draft',
  pendiente: '--status-pending',
  aprobado: '--status-approved',
  recibido: '--status-received',
  cancelado: '--status-cancelled'
});

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

/** Barras verticales de órdenes por estado. `items`: [{ status, label, count }]. */
export function statusBarChartSvg(items = [], { title = 'Órdenes por estado' } = {}) {
  const width = 520;
  const height = 220;
  const max = Math.max(1, ...items.map(item => item.count));
  const slot = width / Math.max(1, items.length);
  const barWidth = Math.min(64, slot * 0.55);
  const summary = items.map(item => `${item.label}: ${item.count}`).join(', ');
  const bars = items.map((item, index) => {
    const barHeight = Math.round((item.count / max) * 140);
    const x = Math.round(index * slot + (slot - barWidth) / 2);
    const y = 170 - barHeight;
    const color = STATUS_COLOR_VARS[item.status] || '--muted';
    return `<g data-status="${esc(item.status)}">
      <rect x="${x}" y="${y}" width="${Math.round(barWidth)}" height="${Math.max(barHeight, 2)}" rx="6" style="fill:var(${color})"></rect>
      <text x="${Math.round(x + barWidth / 2)}" y="${y - 8}" text-anchor="middle" class="chart-value">${item.count}</text>
      <text x="${Math.round(x + barWidth / 2)}" y="192" text-anchor="middle" class="chart-label">${esc(item.shortLabel || item.label)}</text>
    </g>`;
  }).join('');
  return `<svg class="chart chart-status" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}: ${esc(summary)}">${bars}</svg>`;
}

/** Columnas de gasto mensual para una moneda. `buckets`: [{ label, totals }]. */
export function spendColumnsSvg(buckets = [], currency = 'CLP', { formatMoney = value => String(value), title = 'Gasto mensual' } = {}) {
  const width = 520;
  const height = 220;
  const values = buckets.map(bucket => Number(bucket.totals?.[currency] || 0));
  const max = Math.max(1, ...values);
  const slot = width / Math.max(1, buckets.length);
  const barWidth = Math.min(48, slot * 0.5);
  const summary = buckets.map((bucket, index) => `${bucket.label}: ${formatMoney(values[index], currency)}`).join(', ');
  const grid = [40, 90, 140].map(y => `<line x1="0" x2="${width}" y1="${y}" y2="${y}" class="chart-grid"></line>`).join('');
  const columns = buckets.map((bucket, index) => {
    const value = values[index];
    const barHeight = Math.round((value / max) * 130);
    const x = Math.round(index * slot + (slot - barWidth) / 2);
    const y = 170 - barHeight;
    const last = index === buckets.length - 1;
    return `<g>
      <rect x="${x}" y="${y}" width="${Math.round(barWidth)}" height="${Math.max(barHeight, 2)}" rx="5" class="${last ? 'chart-bar-current' : 'chart-bar'}"></rect>
      <text x="${Math.round(x + barWidth / 2)}" y="192" text-anchor="middle" class="chart-label">${esc(bucket.label)}</text>
    </g>`;
  }).join('');
  return `<svg class="chart chart-spend" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)} en ${esc(currency)}: ${esc(summary)}">${grid}${columns}</svg>`;
}
