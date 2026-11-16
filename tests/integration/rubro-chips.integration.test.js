import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasingAs, installDom, installStyles, qs } from '../helpers/purchasing-app.js';

let dom;
beforeEach(() => { dom = installDom(); installStyles(dom); });
afterEach(() => { dom.window.close(); });

function chips(selectId) {
  return [...document.querySelector(`.chip-group[data-chips-for="${selectId}"]`).querySelectorAll('.chip')];
}

describe('Maestros y formularios (005 US4)', () => {
  it('selecciona rubros con chips sincronizados con el select múltiple oculto', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    const insumos = storage.addRubro({ nombre: 'Papelería' });
    storage.addRubro({ nombre: 'Aseo' });
    qs('nav-entities').click();
    qs('entity-list-new').click();

    const select = qs('supplier-rubros');
    expect(select.multiple).toBe(true);
    expect(select.classList.contains('chips-source')).toBe(true);
    expect(select.getAttribute('aria-hidden')).toBe('true');
    const group = document.querySelector('.chip-group[data-chips-for="supplier-rubros"]');
    expect(group.getAttribute('aria-labelledby')).toBe('supplier-rubros-label');

    const insumosChip = chips('supplier-rubros').find(chip => chip.textContent.includes('Papelería'));
    insumosChip.click();
    expect([...select.selectedOptions].map(option => option.value)).toEqual([insumos.id_rubro]);
    expect(chips('supplier-rubros').find(chip => chip.dataset.value === insumos.id_rubro).getAttribute('aria-pressed')).toBe('true');

    chips('supplier-rubros').find(chip => chip.dataset.value === insumos.id_rubro).click();
    expect(select.selectedOptions).toHaveLength(0);
  });

  it('filtra la búsqueda al activar un chip de rubro', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    const insumos = storage.addRubro({ nombre: 'Papelería' });
    const servicios = storage.addRubro({ nombre: 'Aseo' });
    storage.addEntity({ name: 'Papelera SA', code: '11.111.111-1', category: 'x', paymentTerms: 'Contado', rubro_ids: [insumos.id_rubro] });
    storage.addEntity({ name: 'Aseo SA', code: '22.222.222-2', category: 'x', paymentTerms: 'Contado', rubro_ids: [servicios.id_rubro] });
    qs('nav-search').click();
    chips('search-rubros').find(chip => chip.dataset.value === servicios.id_rubro).click();
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Aseo SA');
  });

  it('alterna proveedores entre tabla y tarjetas con avatar, chips y origen', async () => {
    const { storage } = await bootPurchasingAs(dom, 'ADMIN-001');
    const tech = storage.addRubro({ nombre: 'Tecnología' });
    storage.addEntity({ name: 'Foreign Trading Co.', origin: 'Extranjero', foreignTaxId: 'SG-1', category: 'x', paymentTerms: '30 días', rubro_ids: [tech.id_rubro] });
    qs('nav-entities').click();
    qs('entities-view-toggle').querySelector('[data-view-mode="cards"]').click();

    expect(qs('entity-cards').hidden).toBe(false);
    expect(qs('entity-table').closest('.table-wrapper').hidden).toBe(true);
    const card = [...qs('entity-cards').querySelectorAll('.supplier-card')].find(item => item.textContent.includes('Foreign'));
    expect(card.querySelector('.avatar').textContent).toBe('FT');
    expect(card.querySelector('.origin-tag').textContent).toBe('Extranjero');
    expect(card.querySelector('.chip-list').textContent).toContain('Tecnología');
    expect(card.textContent).toContain('ID tributario ext. SG-1');

    card.querySelector('[data-card-action="edit"]').click();
    expect(qs('name').value).toBe('Foreign Trading Co.');
  });

  it('muestra barra de nivel de stock y la etiqueta "Sin stock"', async () => {
    const { purchasing, seedData } = await bootPurchasingAs(dom, 'ADMIN-001');
    purchasing.updateProduct(seedData.other.id_producto, { stock: 0 });
    qs('nav-products').click();
    const rows = [...qs('product-table-body').querySelectorAll('tr')];
    const lapiz = rows.find(row => row.textContent.includes('Lápiz'));
    const papel = rows.find(row => row.textContent.includes('Papel'));
    expect(lapiz.querySelector('.stock-meter')).not.toBeNull();
    expect(lapiz.querySelector('.stock-value').textContent).toBe('5');
    expect(papel.querySelector('.stock-tag-empty').textContent).toBe('Sin stock');
    expect(papel.querySelector('.stock-meter')).toBeNull();
  });
});
