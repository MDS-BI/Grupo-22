let elements = null;
let triggerElement = null;
let currentForm = null;
let dirty = false;
let dirtyListener = null;
let dirtyHost = null;

function focusableElements(root) {
  return [...root.querySelectorAll(
    'a[href],button:not([disabled]):not([hidden]),input:not([type="hidden"]):not([disabled]):not([hidden]),select:not([disabled]):not([hidden]),textarea:not([disabled]):not([hidden]),[tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.closest('[hidden]'));
}

function handleKeydown(event) {
  if (!elements || elements.panel.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSidePanel();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusables = focusableElements(elements.panel);
  if (!focusables.length) {
    event.preventDefault();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function initSidePanel(container = document.getElementById('side-panel')) {
  if (!container) return null;
  if (elements && elements.root === container) return elements;
  container.innerHTML = `
    <div class="side-panel-backdrop" data-action="close-panel" hidden></div>
    <aside class="side-panel" id="side-panel-dialog" role="dialog" aria-modal="true" aria-labelledby="side-panel-title" hidden>
      <header class="side-panel-header">
        <h2 id="side-panel-title">Formulario</h2>
        <button type="button" class="secondary side-panel-close" data-action="close-panel" aria-label="Cerrar panel">×</button>
      </header>
      <div class="side-panel-body" id="side-panel-body"></div>
    </aside>`;
  elements = {
    root: container,
    panel: container.querySelector('.side-panel'),
    backdrop: container.querySelector('.side-panel-backdrop'),
    title: container.querySelector('#side-panel-title'),
    body: container.querySelector('#side-panel-body')
  };
  container.querySelectorAll('[data-action="close-panel"]').forEach(element => {
    element.addEventListener('click', () => closeSidePanel());
  });
  elements.panel.addEventListener('keydown', handleKeydown);
  return elements;
}

export function mountPanelForm(form, { append = true } = {}) {
  const initialized = initSidePanel();
  if (!initialized || !form) return form;
  form.dataset.panelForm = 'true';
  if (append && form.parentElement !== initialized.body) initialized.body.append(form);
  return form;
}

export function isPanelOpen() {
  return Boolean(elements && !elements.panel.hidden);
}

export function openSidePanel({ title = '', form = null, trigger = null, focus = null } = {}) {
  const initialized = initSidePanel();
  if (!initialized) return false;
  currentForm = form || null;
  if (form) {
    mountPanelForm(form);
    for (const candidate of initialized.body.querySelectorAll('[data-panel-form]')) {
      candidate.hidden = candidate !== form;
    }
    form.hidden = false;
  }
  initialized.title.textContent = title || form?.querySelector('h2')?.textContent?.trim() || 'Formulario';
  initialized.panel.hidden = false;
  initialized.backdrop.hidden = false;
  triggerElement = trigger || document.activeElement || null;
  setPanelDirty(false);
  if (dirtyHost) {
    dirtyHost.removeEventListener('input', dirtyListener);
    dirtyHost.removeEventListener('change', dirtyListener);
  }
  dirtyHost = form || initialized.body;
  dirtyListener = event => {
    if (!currentForm || currentForm.contains(event.target)) dirty = true;
  };
  dirtyHost.addEventListener('input', dirtyListener);
  dirtyHost.addEventListener('change', dirtyListener);
  const target = focus || focusableElements(form || initialized.panel)[0];
  target?.focus?.();
  return true;
}

export function closeSidePanel({ force = false } = {}) {
  if (!elements || elements.panel.hidden) return true;
  if (dirty && !force) {
    const message = 'Hay cambios sin guardar. ¿Deseas cerrar el panel?';
    const confirmed = typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true;
    if (!confirmed) return false;
  }
  elements.panel.hidden = true;
  elements.backdrop.hidden = true;
  if (dirtyHost && dirtyListener) {
    dirtyHost.removeEventListener('input', dirtyListener);
    dirtyHost.removeEventListener('change', dirtyListener);
  }
  dirtyHost = null;
  dirtyListener = null;
  currentForm = null;
  setPanelDirty(false);
  const target = triggerElement;
  triggerElement = null;
  target?.focus?.();
  return true;
}

export function setPanelDirty(value) {
  dirty = Boolean(value);
}

export function isPanelDirty() {
  return dirty;
}

export function getPanelForm() {
  return currentForm;
}
