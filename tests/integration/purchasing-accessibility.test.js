import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installDom, bootPurchasing, qs } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

afterEach(() => {
  dom.window.close();
});

function accessibleName(element) {
  const label = element.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  return String(element.textContent || '').replace(/\s+/g, ' ').trim();
}

function svgIcons(root = document) {
  return Array.from(root.querySelectorAll('svg'));
}

describe('Accesibilidad de iconos SVG', () => {
  it('renderiza iconos en la navegación y en las acciones rápidas con nombre accesible', async () => {
    await bootPurchasing(dom);

    for (const id of ['nav-dashboard', 'nav-entities', 'nav-documents', 'nav-products', 'nav-search']) {
      const button = qs(id);
      expect(button).not.toBeNull();
      expect(button.querySelector('svg')).not.toBeNull();
      expect(accessibleName(button).length).toBeGreaterThan(0);
    }

    const toggle = qs('sidebar-toggle');
    expect(toggle.querySelector('svg')).not.toBeNull();
    expect(accessibleName(toggle)).toBe('Contraer navegación');

    for (const id of ['action-new-entity', 'action-new-document', 'action-open-entities', 'action-find']) {
      const button = qs(id);
      expect(button.querySelector('svg')).not.toBeNull();
      expect(accessibleName(button).length).toBeGreaterThan(0);
    }
  });

  it('marca los iconos decorativos con aria-hidden y nombra las acciones de fila', async () => {
    await bootPurchasing(dom);
    qs('nav-entities').click();

    const editButton = qs('entity-table-body').querySelector('button[data-action="edit"]');
    const deleteButton = qs('entity-table-body').querySelector('button[data-action="delete"]');
    expect(editButton.querySelector('svg')).not.toBeNull();
    expect(deleteButton.querySelector('svg')).not.toBeNull();
    expect(accessibleName(editButton)).toContain('Editar');
    expect(accessibleName(deleteButton)).toContain('Eliminar');

    for (const svg of svgIcons(document)) {
      const hidden = svg.getAttribute('aria-hidden') === 'true';
      const labelled = Boolean(svg.getAttribute('aria-label') || svg.querySelector('title'));
      expect(hidden || labelled).toBe(true);
    }
  });
});
