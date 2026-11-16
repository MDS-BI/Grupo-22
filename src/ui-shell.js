import { brandPatternSvg } from './ui-charts.js';

export function ensureShellScaffold() {
  const gate = document.getElementById('auth-gate');
  if (gate && !gate.querySelector('.auth-brand-panel')) {
    const card = gate.querySelector('.auth-card');
    if (card) {
      const layout = document.createElement('div');
      layout.className = 'auth-layout';
      const brand = document.createElement('div');
      brand.className = 'auth-brand-panel';
      brand.innerHTML = `${brandPatternSvg()}<div class="auth-brand-copy"><span class="eyebrow">Adquisiciones y Compras</span><h2>Gestión de compras clara y confiable</h2><p>Solicitudes, órdenes, proveedores y productos en un solo lugar.</p></div>`;
      const formPanel = document.createElement('div');
      formPanel.className = 'auth-form-panel';
      layout.append(brand, formPanel);
      gate.insertBefore(layout, card);
      formPanel.appendChild(card);
    }
  }

  const topbar = document.querySelector('.topbar');
  if (topbar && !document.getElementById('topbar-center')) {
    const center = document.createElement('div');
    center.id = 'topbar-center';
    center.className = 'topbar-center';
    center.innerHTML = `<nav id="breadcrumbs" class="breadcrumbs" aria-label="Ruta"><ol><li id="breadcrumb-current">Panel</li></ol></nav>
      <form id="global-search-form" class="global-search" role="search">
        <label for="global-search-input" class="sr-only">Buscar en el sistema</label>
        <input id="global-search-input" type="search" placeholder="Buscar proveedores, productos u órdenes">
      </form>`;
    const actions = topbar.querySelector('.topbar-actions');
    topbar.insertBefore(center, actions || null);
    if (actions && !document.getElementById('notifications-placeholder')) {
      const bell = document.createElement('button');
      bell.type = 'button';
      bell.id = 'notifications-placeholder';
      bell.className = 'secondary icon-button';
      bell.setAttribute('aria-label', 'Notificaciones');
      bell.setAttribute('aria-disabled', 'true');
      bell.disabled = true;
      bell.hidden = true;
      bell.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10 20a2 2 0 0 0 4 0"></path></svg>';
      actions.insertBefore(bell, actions.firstChild);
    }
    if (actions && !document.getElementById('theme-toggle')) {
      const theme = document.createElement('button');
      theme.type = 'button';
      theme.id = 'theme-toggle';
      theme.className = 'secondary icon-button theme-toggle';
      theme.innerHTML = `${THEME_ICON_MOON}${THEME_ICON_SUN}`;
      theme.setAttribute('aria-label', 'Cambiar a modo oscuro');
      theme.title = 'Cambiar a modo oscuro';
      actions.insertBefore(theme, actions.querySelector('#sidebar-toggle') || null);
    }
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.querySelector('.nav-group')) {
    const get = id => document.getElementById(id);
    const makeGroup = (title, ids) => {
      const key = NAV_GROUP_KEYS[title];
      const section = document.createElement('div');
      section.className = 'nav-group';
      section.dataset.navGroup = key;
      section.setAttribute('role', 'group');
      section.setAttribute('aria-labelledby', `nav-group-${key}`);
      const h = document.createElement('p');
      h.className = 'nav-group-title';
      h.id = `nav-group-${key}`;
      h.textContent = title;
      section.appendChild(h);
      for (const id of ids) { const el = get(id); if (el) section.appendChild(el); }
      return section;
    };
    const ops = makeGroup('Operación', ['nav-dashboard', 'nav-documents']);
    const masters = makeGroup('Maestros', ['nav-entities', 'nav-products']);
    const tools = makeGroup('Herramientas', ['nav-search']);
    const reports = document.createElement('button');
    reports.type = 'button';
    reports.id = 'nav-reports';
    reports.className = 'nav-module nav-reserved';
    reports.disabled = true;
    reports.setAttribute('aria-disabled', 'true');
    reports.hidden = true;
    reports.innerHTML = '<span class="nav-label">Reportes</span>';
    tools.appendChild(reports);
    sidebar.innerHTML = '';
    sidebar.append(ops, masters, tools);
  }
}

const NAV_GROUP_KEYS = { 'Operación': 'operacion', 'Maestros': 'maestros', 'Herramientas': 'herramientas' };
const NAV_GROUP_BY_BUTTON = {
  'nav-dashboard': 'operacion',
  'nav-documents': 'operacion',
  'nav-entities': 'maestros',
  'nav-products': 'maestros',
  'nav-search': 'herramientas',
  'nav-reports': 'herramientas'
};

/** Grupo de la barra lateral al que pertenece cada botón de navegación. */
export function navGroupFor(buttonId) {
  return NAV_GROUP_BY_BUTTON[buttonId] || 'herramientas';
}

const THEME_ICON_MOON = '<svg class="theme-icon theme-icon-moon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';
const THEME_ICON_SUN = '<svg class="theme-icon theme-icon-sun" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';

/** Actualiza el nombre accesible del botón de tema según el tema activo. */
export function syncThemeToggle(theme) {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

export function updateBreadcrumb(label) {
  const el = document.getElementById('breadcrumb-current');
  if (el) el.textContent = label || 'Panel';
}

export function bindGlobalSearch(onNavigateToSearch) {
  const form = document.getElementById('global-search-form');
  const input = document.getElementById('global-search-input');
  if (!form || !input || form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value || '';
    onNavigateToSearch(q);
  });
}


/**
 * 005 · US5: en celular las tablas se muestran como tarjetas apiladas; cada celda recibe la
 * etiqueta de su columna (data-label) para no perder el contexto.
 */
export function applyStackedLabels(table) {
  if (!table) return;
  table.classList.add('stacked-table');
  const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
  for (const row of table.querySelectorAll('tbody tr')) {
    [...row.children].forEach((cell, index) => {
      if (cell.colSpan > 1) return;
      if (headers[index]) cell.dataset.label = headers[index];
    });
  }
}

/** Abre o cierra la barra lateral como menú desplegable en pantallas pequeñas. */
export function toggleMobileNav(force) {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (!sidebar) return false;
  const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', open);
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  return open;
}

export function isSmallScreen() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  } catch {
    return false;
  }
}
