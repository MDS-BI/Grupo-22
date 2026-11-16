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
