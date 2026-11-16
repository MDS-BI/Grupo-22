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
      bell.innerHTML = '🔔';
      actions.insertBefore(bell, actions.firstChild);
    }
    if (actions && !document.getElementById('theme-toggle')) {
      const theme = document.createElement('button');
      theme.type = 'button';
      theme.id = 'theme-toggle';
      theme.className = 'secondary';
      theme.textContent = 'Tema';
      actions.insertBefore(theme, actions.querySelector('#sidebar-toggle') || null);
    }
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.querySelector('.nav-group')) {
    const get = id => document.getElementById(id);
    const makeGroup = (title, ids) => {
      const section = document.createElement('section');
      section.className = 'nav-group';
      const h = document.createElement('p');
      h.className = 'nav-group-title';
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

