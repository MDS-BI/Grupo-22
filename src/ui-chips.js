// 005 · US4 — chips seleccionables sobre un <select multiple> que sigue en el DOM (oculto) y es
// la fuente de verdad: los chips solo reflejan y cambian su selección, y disparan `change`.

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function chipsFor(select) {
  return select.parentNode?.querySelector(`.chip-group[data-chips-for="${select.id}"]`) || null;
}

/** Vuelve a dibujar los chips con las opciones y la selección actuales del select. */
export function syncChips(select) {
  if (!select) return;
  const group = chipsFor(select);
  if (!group) return;
  const options = [...select.options];
  group.innerHTML = options.length
    ? options.map(option => `<button type="button" class="chip" data-value="${esc(option.value)}" aria-pressed="${option.selected ? 'true' : 'false'}">${option.selected ? '<span class="chip-check" aria-hidden="true">✓</span>' : ''}${esc(option.textContent)}</button>`).join('')
    : `<span class="chip-empty">${esc(group.dataset.emptyText || 'Sin opciones')}</span>`;
}

/**
 * Monta chips junto a un select múltiple. El select queda oculto visualmente y fuera del orden
 * de tabulación, pero conserva id, opciones, `selectedOptions` y eventos.
 */
export function mountChips(select, { labelId = '', emptyText = 'Sin opciones' } = {}) {
  if (!select || !select.multiple) return null;
  let group = chipsFor(select);
  if (!group) {
    group = document.createElement('div');
    group.className = 'chip-group';
    group.dataset.chipsFor = select.id;
    group.dataset.emptyText = emptyText;
    group.setAttribute('role', 'group');
    if (labelId) group.setAttribute('aria-labelledby', labelId);
    select.insertAdjacentElement('afterend', group);
    select.classList.add('chips-source');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    group.addEventListener('click', event => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      const option = [...select.options].find(item => item.value === chip.dataset.value);
      if (!option) return;
      option.selected = !option.selected;
      select.dispatchEvent(new select.ownerDocument.defaultView.Event('change', { bubbles: true }));
      syncChips(select);
      [...group.querySelectorAll('.chip')].find(item => item.dataset.value === option.value)?.focus();
    });
    select.addEventListener('change', () => syncChips(select));
  }
  syncChips(select);
  return group;
}
