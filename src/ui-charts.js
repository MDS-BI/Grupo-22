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

export function topSuppliersBarChartSvg(rows = [], currency = 'CLP', { formatMoney = value => String(value), title = 'Top proveedores por monto' } = {}) {
  const width = 520;
  const rowHeight = 44;
  const height = Math.max(84, rows.length * rowHeight + 16);
  const labelWidth = 158;
  const barMax = 215;
  const valueX = labelWidth + barMax + 10;
  const max = Math.max(1, ...rows.map(row => Number(row.total || 0)));
  const summary = rows.map(row => `${row.name}: ${formatMoney(row.total, currency)}`).join(', ');
  const grid = [0.25, 0.5, 0.75, 1].map(ratio => {
    const x = Math.round(labelWidth + barMax * ratio);
    return `<line x1="${x}" x2="${x}" y1="6" y2="${height - 10}" class="chart-grid chart-top-grid"></line>`;
  }).join('');
  const axis = `<line x1="${labelWidth}" x2="${labelWidth}" y1="6" y2="${height - 10}" class="chart-axis"></line>`;
  const bars = rows.map((row, index) => {
    const total = Number(row.total || 0);
    const barWidth = Math.max(6, Math.round((total / max) * barMax));
    const name = String(row.name || '');
    const label = name.length > 20 ? `${name.slice(0, 19)}…` : name;
    const amount = formatMoney(total, currency);
    const y = index * rowHeight + 10;
    return `<g>
      <title>${esc(name)}: ${esc(amount)}</title>
      <circle cx="12" cy="${y + 12}" r="11" class="chart-top-rank${index === 0 ? ' is-first' : ''}"></circle>
      <text x="12" y="${y + 16}" text-anchor="middle" class="chart-top-rank-label">${index + 1}</text>
      <text x="30" y="${y + 16}" class="chart-label chart-top-label">${esc(label)}</text>
      <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="24" rx="6" class="${index === 0 ? 'chart-bar-current' : 'chart-bar'}"></rect>
      <text x="${Math.min(labelWidth + barWidth + 8, valueX)}" y="${y + 17}" class="chart-value chart-top-value">${esc(amount)}</text>
    </g>`;
  }).join('');
  return `<svg class="chart chart-top" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)} en ${esc(currency)}: ${esc(summary)}">${grid}${axis}${bars}</svg>`;
}

export function stockEvolutionLineChartSvg(points = [], minimum = 0, { formatValue = value => String(value), title = 'Evolución del stock' } = {}) {
  if (!points.length) return '';
  const width = 520;
  const height = 224;
  const left = 48;
  const right = 504;
  const top = 22;
  const bottom = 172;
  const values = points.map(point => Math.max(0, Number(point.value) || 0));
  const floor = Math.max(0, Number(minimum) || 0);
  const rawMax = Math.max(1, floor, ...values);
  const ceiling = Math.ceil(rawMax * 1.18);
  const yFor = value => bottom - (value / ceiling) * (bottom - top);
  const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: Math.round(points.length === 1 ? (left + right) / 2 : left + index * step),
    y: Math.round(yFor(values[index]))
  }));
  const minimumY = Math.round(yFor(floor));
  const summary = points.map((point, index) => `${point.label}: ${formatValue(values[index])}`).join(', ');
  const ticks = [...new Set([0, Math.round(ceiling / 2), ceiling])];
  const grid = ticks.map(value => {
    const y = Math.round(yFor(value));
    return `<g>
      <line x1="${left}" x2="${right}" y1="${y}" y2="${y}" class="chart-grid"></line>
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" class="chart-axis-tick">${esc(formatValue(value))}</text>
    </g>`;
  }).join('');
  const axes = `<line x1="${left}" x2="${left}" y1="${top}" y2="${bottom}" class="chart-axis"></line>
    <line x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}" class="chart-axis"></line>`;
  const line = coords.length > 1
    ? `<polyline points="${coords.map(point => `${point.x},${point.y}`).join(' ')}" class="chart-line"></polyline>`
    : '';
  const dots = coords.map((point, index) => {
    const isAlert = values[index] <= floor;
    const refText = points[index].reference ? ` (${points[index].reference})` : '';
    return `<g>
      <title>${esc(points[index].label)}${esc(refText)}: ${esc(formatValue(values[index]))}</title>
      <circle cx="${point.x}" cy="${point.y}" r="5.5" class="chart-point${isAlert ? ' chart-point--alert' : ''}"></circle>
      <text x="${point.x}" y="${point.y - 11}" text-anchor="middle" class="chart-value">${esc(formatValue(values[index]))}</text>
      <text x="${point.x}" y="196" text-anchor="middle" class="chart-label">${esc(points[index].label)}</text>
    </g>`;
  }).join('');
  const reference = `<line x1="${left}" x2="${right}" y1="${minimumY}" y2="${minimumY}" class="chart-min-line"></line>
    <text x="${right}" y="${Math.max(13, minimumY - 6)}" text-anchor="end" class="chart-min-label">Mín. ${esc(formatValue(floor))}</text>`;
  return `<svg class="chart chart-stock" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}. Mínimo ${esc(formatValue(floor))}: ${esc(summary)}">${grid}${axes}${reference}${line}${dots}</svg>`;
}
