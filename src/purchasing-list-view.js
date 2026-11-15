function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function sortStateFor(sort, key) {
  if (!sort || sort.key !== key) return { direction: 'none', ariaSort: 'none' };
  return {
    direction: sort.direction === 'desc' ? 'desc' : 'asc',
    ariaSort: sort.direction === 'desc' ? 'descending' : 'ascending'
  };
}

export function sortableHeader(key, label, sort, options = {}) {
  const state = sortStateFor(sort, key);
  const indicator = state.direction === 'asc' ? ' ▲' : state.direction === 'desc' ? ' ▼' : '';
  return `<th scope="col" data-sort-key="${escapeHtml(key)}" aria-sort="${state.ariaSort}"${options.className ? ` class="${escapeHtml(options.className)}"` : ''}><button type="button" class="sort-button" data-sort="${escapeHtml(key)}">${escapeHtml(label)}<span aria-hidden="true">${indicator}</span></button></th>`;
}

export function applySortState(table, sort) {
  if (!table) return;
  for (const header of table.querySelectorAll('th[data-sort-key]')) {
    const key = header.dataset.sortKey;
    const state = sortStateFor(sort, key);
    header.setAttribute('aria-sort', state.ariaSort);
    const button = header.querySelector('button[data-sort]');
    if (!button) continue;
    let indicator = button.querySelector('.sort-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      button.append(indicator);
    }
    indicator.textContent = state.direction === 'asc' ? '▲' : state.direction === 'desc' ? '▼' : '';
  }
}

export function toggleSort(sort, key) {
  if (!key) return { key: null, direction: 'asc' };
  if (sort?.key === key) {
    return { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}

export function emptyStateRow({ colspan = 1, message = 'Sin registros.', action = '', actionLabel = '' } = {}) {
  return `<tr class="empty-row"><td colspan="${Number(colspan) || 1}"><span>${escapeHtml(message)}</span>${action ? ` <button type="button" class="secondary" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel || 'Crear')}</button>` : ''}</td></tr>`;
}

export function filterSummary(entries = []) {
  const active = entries
    .map(([label, value]) => {
      if (Array.isArray(value)) return value.length ? `${label}: ${value.join(', ')}` : '';
      if (typeof value === 'boolean') return value ? label : '';
      return value ? `${label}: ${value}` : '';
    })
    .filter(Boolean);
  return active.length ? `Filtros activos · ${active.join(' · ')}` : '';
}

export function renderFilterError(element, message = '') {
  if (!element) return;
  element.textContent = message;
  element.hidden = !message;
  element.setAttribute('role', message ? 'alert' : 'status');
}
